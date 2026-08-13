import { CommonModule, DatePipe } from '@angular/common';
import { Component, DestroyRef, Input, OnChanges, OnInit, SimpleChanges, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import {
  ContainerManagerFacade,
  type ContainerManagerContainer,
  type ContainerManagerNetworkEdge,
  type ContainerManagerNetworkNode,
  type ContainerManagerResourceStats,
  type ContainerManagerStatsHistoryPoint,
} from '@forepath/decabill/frontend/data-access-billing-console';
import type { ApexAxisChartSeries, ApexChart, ApexDataLabels, ApexTitleSubtitle, ApexXAxis } from 'ng-apexcharts';
import { NgApexchartsModule } from 'ng-apexcharts';

const BS_CHART_COLORS = ['var(--bs-primary)', 'var(--bs-info)', 'var(--bs-success)', 'var(--bs-warning)'] as const;

interface TopologyLayoutNode {
  id: string;
  label: string;
  kind: ContainerManagerNetworkNode['kind'];
  x: number;
  y: number;
}

interface TopologyLayoutEdge {
  id: string;
  label?: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

@Component({
  selector: 'framework-container-manager-tab',
  standalone: true,
  imports: [CommonModule, NgApexchartsModule],
  providers: [DatePipe],
  templateUrl: './container-manager-tab.component.html',
  styleUrls: ['./container-manager-tab.component.scss'],
})
export class ContainerManagerTabComponent implements OnInit, OnChanges {
  @Input({ required: true }) subscriptionId!: string;
  @Input({ required: true }) itemId!: string;
  @Input() adminMode = false;

  private readonly facade = inject(ContainerManagerFacade);
  private readonly datePipe = inject(DatePipe);
  private readonly destroyRef = inject(DestroyRef);

  private enteredKey = '';

  readonly containers = toSignal(this.facade.containers$, { initialValue: [] as ContainerManagerContainer[] });
  readonly selectedContainerId = toSignal(this.facade.selectedContainerId$, { initialValue: null as string | null });
  readonly selectedContainer = toSignal(this.facade.selectedContainer$, {
    initialValue: null as ContainerManagerContainer | null,
  });
  readonly statsHistoryPoints = toSignal(this.facade.statsHistoryPoints$, {
    initialValue: [] as ContainerManagerStatsHistoryPoint[],
  });
  readonly topologyNodes = toSignal(this.facade.topologyNodes$, {
    initialValue: [] as ContainerManagerNetworkNode[],
  });
  readonly topologyEdges = toSignal(this.facade.topologyEdges$, {
    initialValue: [] as ContainerManagerNetworkEdge[],
  });
  readonly loadingContainers = toSignal(this.facade.loadingContainers$, { initialValue: false });
  readonly loadingNetworks = toSignal(this.facade.loadingNetworks$, { initialValue: false });
  readonly loadingStatsHistory = toSignal(this.facade.loadingStatsHistory$, { initialValue: false });
  readonly error = toSignal(this.facade.error$, { initialValue: null as string | null });
  readonly containersCollectedAt = toSignal(this.facade.containersCollectedAt$, {
    initialValue: null as string | null,
  });
  readonly networksCollectedAt = toSignal(this.facade.networksCollectedAt$, {
    initialValue: null as string | null,
  });

  readonly statsChart = computed(() => this.buildStatsChart(this.statsHistoryPoints()));
  readonly topologyLayout = computed(() => this.layoutTopology(this.topologyNodes()));
  readonly topologyLayoutEdges = computed(() => this.layoutTopologyEdges(this.topologyLayout(), this.topologyEdges()));

  constructor() {
    this.destroyRef.onDestroy(() => this.facade.clear());
  }

  ngOnInit(): void {
    this.enterIfReady();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (!changes['subscriptionId'] && !changes['itemId'] && !changes['adminMode']) {
      return;
    }

    this.enterIfReady();
  }

  selectContainer(containerId: string): void {
    this.facade.selectContainerById(containerId);
  }

  formatBytes(value: number | null | undefined): string {
    if (value == null || Number.isNaN(value)) {
      return '—';
    }

    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let size = Math.max(0, value);
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex += 1;
    }

    return `${size.toFixed(unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
  }

  formatPercent(value: number | null | undefined): string {
    if (value == null || Number.isNaN(value)) {
      return '—';
    }

    return `${value.toFixed(1)}%`;
  }

  statsSummary(stats: ContainerManagerResourceStats | null): string {
    if (!stats) {
      return $localize`:@@featureContainerManager-noLiveStats:No live stats`;
    }

    return `${this.formatPercent(stats.cpuPercent)} CPU · ${this.formatPercent(stats.memoryPercent)} RAM`;
  }

  private enterIfReady(): void {
    const subscriptionId = this.subscriptionId?.trim() ?? '';
    const itemId = this.itemId?.trim() ?? '';

    if (!subscriptionId || !itemId) {
      return;
    }

    const key = `${this.adminMode}:${subscriptionId}:${itemId}`;

    if (key === this.enteredKey) {
      return;
    }

    this.enteredKey = key;
    this.facade.enter(subscriptionId, itemId, this.adminMode);
  }

  private buildStatsChart(points: ContainerManagerStatsHistoryPoint[]) {
    if (points.length === 0) {
      return null;
    }

    const categories = points.map((point) => this.datePipe.transform(point.timestamp, 'short') ?? point.timestamp);
    const cpuColor = BS_CHART_COLORS[0];
    const memoryColor = BS_CHART_COLORS[1];

    return {
      series: [
        {
          name: $localize`:@@featureContainerManager-cpuSeries:CPU %`,
          data: points.map((point) => point.cpuPercent ?? 0),
        },
        {
          name: $localize`:@@featureContainerManager-memorySeries:Memory %`,
          data: points.map((point) => point.memoryPercent ?? 0),
        },
      ] as ApexAxisChartSeries,
      chart: {
        type: 'area',
        height: 260,
        toolbar: { show: false },
        background: 'transparent',
        zoom: { enabled: false },
      } as ApexChart,
      colors: [cpuColor, memoryColor],
      stroke: { colors: [cpuColor, memoryColor], width: 2 },
      fill: { colors: [cpuColor, memoryColor], opacity: 0.15 },
      dataLabels: { enabled: false } as ApexDataLabels,
      xaxis: {
        categories,
        labels: {
          style: { colors: 'var(--bs-body-color)', fontFamily: 'var(--bs-body-font-family)' },
        },
        axisBorder: { color: 'var(--bs-border-color)' },
      } as ApexXAxis,
      yaxis: {
        min: 0,
        max: 100,
        labels: {
          style: { colors: 'var(--bs-body-color)', fontFamily: 'var(--bs-body-font-family)' },
          formatter: (value: number) => `${value.toFixed(0)}%`,
        },
      },
      grid: { borderColor: 'var(--bs-border-color)' },
      legend: {
        labels: { colors: 'var(--bs-body-color)' },
      },
      title: {
        text: $localize`:@@featureContainerManager-resourceHistoryTitle:Resource history`,
        style: { color: 'var(--bs-body-color)', fontFamily: 'var(--bs-body-font-family)' },
      } as ApexTitleSubtitle,
    };
  }

  private layoutTopology(nodes: ContainerManagerNetworkNode[]): TopologyLayoutNode[] {
    if (nodes.length === 0) {
      return [];
    }

    const width = 640;
    const height = 320;
    const cx = width / 2;
    const cy = height / 2;
    const radius = Math.min(width, height) * 0.36;

    return nodes.map((node, index) => {
      const angle = (Math.PI * 2 * index) / nodes.length - Math.PI / 2;

      return {
        id: node.id,
        label: node.label,
        kind: node.kind,
        x: cx + Math.cos(angle) * radius,
        y: cy + Math.sin(angle) * radius,
      };
    });
  }

  private layoutTopologyEdges(nodes: TopologyLayoutNode[], edges: ContainerManagerNetworkEdge[]): TopologyLayoutEdge[] {
    const byId = new Map(nodes.map((node) => [node.id, node]));

    return edges.flatMap((edge) => {
      const from = byId.get(edge.from);
      const to = byId.get(edge.to);

      if (!from || !to) {
        return [];
      }

      return [
        {
          id: edge.id,
          label: edge.label,
          x1: from.x,
          y1: from.y,
          x2: to.x,
          y2: to.y,
        },
      ];
    });
  }
}
