import { CommonModule, DatePipe } from '@angular/common';
import {
  afterNextRender,
  Component,
  computed,
  DestroyRef,
  ElementRef,
  inject,
  Injector,
  OnInit,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import {
  BillingDashboardSocketFacade,
  createDefaultMeterHistoryFilters,
  getBillingServerLocationLabel,
  isBillingServerOff,
  isBillingServerOnline,
  isBillingServerStartable,
  isBillingServerStatusTransitional,
  isSubscriptionItemDetailEligible,
  ServiceDetailFacade,
  SubscriptionServerInfoFacade,
  type MeterHistorySeries,
  type ServerInfoResponse,
  type SubscriptionItemDetailResponse,
} from '@forepath/decabill/frontend/data-access-billing-console';
import type { Environment } from '@forepath/shared/frontend/util-configuration';
import { ENVIRONMENT } from '@forepath/shared/frontend/util-configuration';
import type { ApexAxisChartSeries, ApexChart, ApexDataLabels, ApexTitleSubtitle, ApexXAxis } from 'ng-apexcharts';
import { NgApexchartsModule } from 'ng-apexcharts';
import { filter, withLatestFrom } from 'rxjs';

import {
  getProvisioningStatusBadgeClass,
  getProvisioningStatusLabel,
} from '../billing-status-labels';

const FILTERS_STORAGE_KEY = 'billing-console-service-detail-filters';

interface ServiceDetailFiltersStorage {
  fromDate: string;
  toDate: string;
  groupBy: 'day' | 'month';
  filtersCollapsed: boolean;
}

const BS_CHART_COLORS = [
  'var(--bs-primary)',
  'var(--bs-secondary)',
  'var(--bs-success)',
  'var(--bs-danger)',
  'var(--bs-warning)',
  'var(--bs-info)',
] as const;

type ServiceViewMode = 'admin' | 'customer';

@Component({
  selector: 'framework-service-detail-page',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, NgApexchartsModule],
  providers: [DatePipe],
  templateUrl: './service-detail-page.component.html',
  styleUrls: ['./service-detail-page.component.scss'],
})
export class ServiceDetailPageComponent implements OnInit {
  private readonly titleInputRef = viewChild<ElementRef<HTMLInputElement>>('titleInput');

  readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly facade = inject(ServiceDetailFacade);
  readonly serverInfoFacade = inject(SubscriptionServerInfoFacade);
  private readonly socketFacade = inject(BillingDashboardSocketFacade);
  private readonly environment = inject<Environment>(ENVIRONMENT);
  private readonly datePipe = inject(DatePipe);
  private readonly destroyRef = inject(DestroyRef);
  private readonly injector = inject(Injector);

  readonly isAdminView = signal(false);
  readonly filtersCollapsed = signal(true);
  readonly fromDate = signal('');
  readonly toDate = signal('');
  readonly groupBy = signal<'day' | 'month'>('day');
  readonly titleEditing = signal(false);
  readonly titleDraft = signal('');

  readonly detail$ = this.facade.detail$;
  readonly history$ = this.facade.history$;
  readonly loadingDetail$ = this.facade.loadingDetail$;
  readonly loadingHistory$ = this.facade.loadingHistory$;
  readonly renaming$ = this.facade.renaming$;
  readonly error$ = this.facade.error$;
  readonly displayLabel$ = this.facade.displayLabel$;
  readonly serverActionInProgressMap$ = this.serverInfoFacade.getServerActionInProgressMap$();

  readonly history = toSignal(this.facade.history$, { initialValue: null });
  readonly detail = toSignal(this.facade.detail$, { initialValue: null as SubscriptionItemDetailResponse | null });

  readonly meterCharts = computed(() => {
    const meters = this.history()?.meters ?? [];

    return meters.map((meter, index) => ({
      meter,
      options: this.buildMeterChart(meter, index),
    }));
  });

  readonly renameTitleAriaLabel = $localize`:@@featureServiceDetail-renameTitleAria:Rename service`;
  readonly clearNameAriaLabel = $localize`:@@featureServiceDetail-clearNameAria:Clear display name draft`;

  readonly isServerOnline = isBillingServerOnline;
  readonly isServerOff = isBillingServerOff;
  readonly isServerStartable = isBillingServerStartable;
  readonly isServerStatusTransitional = isBillingServerStatusTransitional;
  readonly serverLocationLabel = getBillingServerLocationLabel;

  subscriptionId = '';
  itemId = '';
  private redirected = false;
  private socketEnabled = false;

  ngOnInit(): void {
    const viewMode = this.readViewMode();
    const subscriptionId = this.route.snapshot.paramMap.get('subscriptionId')?.trim() ?? '';
    const itemId = this.route.snapshot.paramMap.get('itemId')?.trim() ?? '';

    this.subscriptionId = subscriptionId;
    this.itemId = itemId;
    this.isAdminView.set(viewMode === 'admin');

    if (!subscriptionId || !itemId) {
      void this.router.navigateByUrl(this.subscriptionsListPath());

      return;
    }

    this.restoreFilters();
    this.facade.enter(subscriptionId, itemId, viewMode === 'admin');

    const restoredFrom = this.fromDate();
    const restoredTo = this.toDate();
    const restoredGroupBy = this.groupBy();
    const defaults = createDefaultMeterHistoryFilters();

    if (
      restoredFrom !== defaults.from ||
      restoredTo !== defaults.to ||
      restoredGroupBy !== defaults.groupBy
    ) {
      this.facade.applyHistoryFilters(
        { from: restoredFrom, to: restoredTo, groupBy: restoredGroupBy },
        viewMode === 'admin',
      );
    }

    this.socketEnabled = !!this.environment.billing.websocketUrl?.trim();

    if (this.socketEnabled) {
      this.socketFacade.connect();
      this.socketFacade.subscribeSubscriptionMeters(subscriptionId);
    }

    this.destroyRef.onDestroy(() => {
      if (this.socketEnabled && subscriptionId) {
        this.socketFacade.unsubscribeSubscriptionMeters(subscriptionId);
        this.socketFacade.disconnect();
      }

      this.facade.clear();
    });

    this.facade.loadingDetail$
      .pipe(
        withLatestFrom(this.facade.subscriptionId$, this.facade.detail$, this.facade.error$),
        filter(([loading, activeSubscriptionId]) => !loading && activeSubscriptionId === subscriptionId),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(([, , detail, error]) => {
        if (this.redirected) {
          return;
        }

        if (error || !detail || !isSubscriptionItemDetailEligible(detail)) {
          this.redirected = true;
          void this.router.navigateByUrl(this.subscriptionsListPath());
        }
      });

    this.facade.filters$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((filters) => {
        this.fromDate.set(filters.from);
        this.toDate.set(filters.to);
        this.groupBy.set(filters.groupBy);
      });
  }

  subscriptionsListPath(): string {
    return this.isAdminView() ? '/administration/subscriptions' : '/subscriptions';
  }

  subscriptionsListLink(): string[] {
    return this.isAdminView() ? ['/administration/subscriptions'] : ['/subscriptions'];
  }

  provisioningStatusLabel(status: string | null | undefined): string {
    return getProvisioningStatusLabel(status);
  }

  provisioningStatusBadgeClass(status: string | null | undefined): string {
    return getProvisioningStatusBadgeClass(status);
  }

  serverStatusLabel(serverInfo: ServerInfoResponse): string {
    if (isBillingServerOnline(serverInfo)) {
      return $localize`:@@featureServiceDetail-serverStatusOnline:Online`;
    }

    if (isBillingServerOff(serverInfo)) {
      return $localize`:@@featureServiceDetail-serverStatusOff:Stopped`;
    }

    return $localize`:@@featureServiceDetail-serverStatusUpdating:Updating`;
  }

  serverStatusBadgeClass(serverInfo: ServerInfoResponse): string {
    if (isBillingServerOnline(serverInfo)) {
      return 'billing-admin__chip--status-paid';
    }

    if (isBillingServerOff(serverInfo)) {
      return 'billing-admin__chip--status-overdue';
    }

    return 'billing-admin__chip--status-partially-paid';
  }

  serverStatusIconClass(serverInfo: ServerInfoResponse): string {
    if (isBillingServerOnline(serverInfo)) {
      return 'bi-play-fill';
    }

    if (isBillingServerOff(serverInfo)) {
      return 'bi-stop-fill';
    }

    return 'bi-hourglass-split';
  }

  showConsoleLink(detail: SubscriptionItemDetailResponse): boolean {
    const service = detail.service ?? 'agenstra-controller';

    return (
      (service === 'agenstra-controller' || service === 'decabill-billing') &&
      detail.serverInfo != null &&
      isBillingServerOnline(detail.serverInfo)
    );
  }

  consoleHref(serverInfo: ServerInfoResponse): string {
    return `https://${serverInfo.hostnameFqdn || serverInfo.publicIp}`;
  }

  onTitleClick(detail: SubscriptionItemDetailResponse): void {
    this.titleDraft.set(detail.displayName?.trim() ?? resolveDisplayLabelFallback(detail));
    this.titleEditing.set(true);
    afterNextRender(
      () => {
        this.titleInputRef()?.nativeElement?.focus();
      },
      { injector: this.injector },
    );
  }

  onTitleClearDraft(): void {
    this.titleDraft.set('');
  }

  onTitleBlur(detail: SubscriptionItemDetailResponse): void {
    if (!this.titleEditing()) {
      return;
    }

    const trimmed = this.titleDraft().trim();
    const currentDisplayName = detail.displayName?.trim() ?? '';

    if (trimmed === currentDisplayName) {
      this.titleEditing.set(false);

      return;
    }

    if (!trimmed.length) {
      this.facade.renameDisplayName(this.subscriptionId, this.itemId, null, this.isAdminView());
      this.titleEditing.set(false);

      return;
    }

    this.facade.renameDisplayName(this.subscriptionId, this.itemId, trimmed, this.isAdminView());
    this.titleEditing.set(false);
  }

  onToggleFilters(): void {
    this.filtersCollapsed.update((value) => !value);
    this.persistFilters();
  }

  onApplyFilters(): void {
    this.persistFilters();
    this.facade.applyHistoryFilters(
      {
        from: this.fromDate(),
        to: this.toDate(),
        groupBy: this.groupBy(),
      },
      this.isAdminView(),
    );
  }

  onResetFilters(): void {
    const defaults = createDefaultMeterHistoryFilters();

    this.fromDate.set(defaults.from);
    this.toDate.set(defaults.to);
    this.groupBy.set(defaults.groupBy);
    this.persistFilters();
    this.facade.resetHistoryFilters(this.isAdminView());
  }

  formatMeterTotal(meter: MeterHistorySeries): string {
    const unit = meter.unitLabel ? ` ${meter.unitLabel}` : '';

    return `${meter.totalValue}${unit}`;
  }

  private readViewMode(): ServiceViewMode {
    const routeViewMode = this.route.snapshot.data['serviceViewMode'];

    if (routeViewMode === 'admin') {
      return 'admin';
    }

    if (this.router.url.includes('/administration/subscriptions/')) {
      return 'admin';
    }

    return 'customer';
  }

  private restoreFilters(): void {
    const defaults = createDefaultMeterHistoryFilters();

    this.fromDate.set(defaults.from);
    this.toDate.set(defaults.to);
    this.groupBy.set(defaults.groupBy);

    try {
      const raw = localStorage.getItem(FILTERS_STORAGE_KEY);

      if (!raw) {
        return;
      }

      const stored = JSON.parse(raw) as ServiceDetailFiltersStorage;

      if (stored.fromDate) {
        this.fromDate.set(stored.fromDate);
      }

      if (stored.toDate) {
        this.toDate.set(stored.toDate);
      }

      if (stored.groupBy) {
        this.groupBy.set(stored.groupBy);
      }

      if (stored.filtersCollapsed !== undefined) {
        this.filtersCollapsed.set(stored.filtersCollapsed);
      }
    } catch {
      // ignore invalid storage
    }
  }

  private persistFilters(): void {
    const payload: ServiceDetailFiltersStorage = {
      fromDate: this.fromDate(),
      toDate: this.toDate(),
      groupBy: this.groupBy(),
      filtersCollapsed: this.filtersCollapsed(),
    };

    localStorage.setItem(FILTERS_STORAGE_KEY, JSON.stringify(payload));
  }

  private buildMeterChart(meter: MeterHistorySeries, index: number) {
    if (meter.series.length === 0) {
      return null;
    }

    const axisDateFormat = this.groupBy() === 'month' ? 'mediumDate' : 'shortDate';
    const color = BS_CHART_COLORS[index % BS_CHART_COLORS.length];
    const unitSuffix = meter.unitLabel ? ` ${meter.unitLabel}` : '';

    return {
      series: [{ name: meter.name, data: meter.series.map((point) => point.value) }] as ApexAxisChartSeries,
      chart: {
        type: 'area',
        height: 240,
        toolbar: { show: false },
        background: 'transparent',
        zoom: { enabled: false },
      } as ApexChart,
      colors: [color],
      stroke: { colors: [color] },
      fill: { colors: [color] },
      dataLabels: { enabled: false } as ApexDataLabels,
      xaxis: {
        categories: meter.series.map(
          (point) => this.datePipe.transform(point.period, axisDateFormat) ?? point.period,
        ),
        labels: {
          style: { colors: 'var(--bs-body-color)', fontFamily: 'var(--bs-body-font-family)' },
        },
        axisBorder: { color: 'var(--bs-border-color)' },
      } as ApexXAxis,
      yaxis: {
        labels: {
          style: { colors: 'var(--bs-body-color)', fontFamily: 'var(--bs-body-font-family)' },
          formatter: (value: number) => `${value}${unitSuffix}`,
        },
      },
      grid: { borderColor: 'var(--bs-border-color)' },
      title: {
        text: meter.name,
        style: { color: 'var(--bs-body-color)', fontFamily: 'var(--bs-body-font-family)' },
      } as ApexTitleSubtitle,
    };
  }
}

function resolveDisplayLabelFallback(detail: SubscriptionItemDetailResponse): string {
  return detail.serviceTypeName?.trim() || detail.service?.trim() || '';
}
