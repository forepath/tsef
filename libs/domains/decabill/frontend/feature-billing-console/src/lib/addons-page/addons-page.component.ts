import { CommonModule } from '@angular/common';
import { Component, DestroyRef, ElementRef, inject, OnInit, signal, ViewChild } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import {
  AddonsFacade,
  AddonsService,
  ServiceTypesFacade,
  type AddonConfigEnvVariableDefinition,
  type AddonConfigSchema,
  type AddonConfigSchemaInput,
  type AddonImplementationType,
  type AddonResponse,
  type BillingIntervalType,
  type CreateAddonDto,
  type ProviderDetail,
  type UpdateAddonDto,
} from '@forepath/decabill/frontend/data-access-billing-console';
import { combineLatest, map, take } from 'rxjs';

import { getActiveStatusLabel, getActiveStatusTextClass } from '../billing-status-labels';
import { showBillingModal, watchBillingMutationModalClose } from '../billing-modal';
import { MonacoEditorWrapperComponent } from '../monaco-editor-wrapper/monaco-editor-wrapper.component';

interface EnvVariableFormRow {
  key: string;
  label: string;
  description: string;
  showInOrderForm: boolean;
  defaultValue: string;
  useRandomDefault: boolean;
  randomDefaultLength: number;
  randomDefaultSpecialChars: boolean;
}

interface AddonForm {
  key: string;
  name: string;
  description: string;
  implementationType: AddonImplementationType;
  moduleKey: string;
  scriptTemplate: string;
  compatibleProviders: string[];
  basePrice: string;
  priceIntervalType: BillingIntervalType;
  priceIntervalValue: number;
  isActive: boolean;
  environmentVariableRows: EnvVariableFormRow[];
  moduleEnvFields: AddonConfigEnvVariableDefinition[];
  moduleDefaultValues: Record<string, string>;
}

const MIN_RANDOM_DEFAULT_LENGTH = 21;

@Component({
  selector: 'framework-billing-addons-page',
  standalone: true,
  imports: [CommonModule, FormsModule, MonacoEditorWrapperComponent],
  templateUrl: './addons-page.component.html',
  styleUrls: ['./addons-page.component.scss'],
})
export class AddonsPageComponent implements OnInit {
  @ViewChild('createModal', { static: false }) private createModal!: ElementRef<HTMLDivElement>;
  @ViewChild('editModal', { static: false }) private editModal!: ElementRef<HTMLDivElement>;
  @ViewChild('deleteConfirmModal', { static: false }) private deleteConfirmModal!: ElementRef<HTMLDivElement>;

  private readonly facade = inject(AddonsFacade);
  private readonly addonsService = inject(AddonsService);
  private readonly serviceTypesFacade = inject(ServiceTypesFacade);
  private readonly destroyRef = inject(DestroyRef);

  readonly searchQuery = signal('');
  readonly searchQuery$ = toObservable(this.searchQuery);
  readonly addons$ = combineLatest([this.facade.getAddons$(), this.searchQuery$]).pipe(
    map(([addons, query]) => {
      const term = query.trim().toLowerCase();

      return term ? addons.filter((addon) => JSON.stringify(addon).toLowerCase().includes(term)) : addons;
    }),
  );
  readonly providerOptions$ = this.serviceTypesFacade
    .getProviderDetails$()
    .pipe(map((providers) => providers.filter((provider) => provider.supportsAddons === true)));
  readonly loading$ = this.facade.getAddonsLoading$();
  readonly loadingAny$ = this.facade.getAddonsLoadingAny$();
  readonly creating$ = this.facade.getAddonsCreating$();
  readonly updating$ = this.facade.getAddonsUpdating$();
  readonly deleting$ = this.facade.getAddonsDeleting$();
  readonly error$ = this.facade.getAddonsError$();
  readonly implementationTypes: AddonImplementationType[] = ['module', 'cloud_init_script'];
  readonly intervalTypes: BillingIntervalType[] = ['hour', 'day', 'month', 'year'];
  readonly minRandomDefaultLength = MIN_RANDOM_DEFAULT_LENGTH;
  readonly scriptEnvHint = $localize`:@@featureAddons-scriptEnvHint:Use {{env.KEY}} placeholders in the script for configured environment variables.`;
  readonly compareProviderId = (left: string, right: string): boolean => left === right;

  createForm = this.defaultForm();
  editForm: AddonForm & { id: string } = { ...this.defaultForm(), id: '' };
  addonToDelete: AddonResponse | null = null;

  ngOnInit(): void {
    this.facade.loadAddons();
    this.serviceTypesFacade.loadProviderDetails();
    this.registerModalCloseWatchers();
  }

  openCreateModal(): void {
    this.createForm = this.defaultForm();
    this.showModalWithMonacoLayout(this.createModal);
  }

  openEditModal(addon: AddonResponse): void {
    this.addonsService
      .getAddon(addon.id)
      .pipe(take(1))
      .subscribe((detail) => {
        const envFields = this.parseEnvFields(detail.configSchema);
        const isScript = detail.implementationType === 'cloud_init_script';

        this.editForm = {
          id: detail.id,
          key: detail.key,
          name: detail.name,
          description: detail.description ?? '',
          implementationType: detail.implementationType,
          moduleKey: detail.moduleKey ?? '',
          scriptTemplate: detail.scriptTemplate ?? '',
          compatibleProviders: [...detail.compatibleProviders],
          basePrice: detail.basePrice ?? '',
          priceIntervalType: detail.priceIntervalType ?? 'month',
          priceIntervalValue: detail.priceIntervalValue ?? 1,
          isActive: detail.isActive,
          environmentVariableRows: isScript
            ? envFields.map((row) => ({
                key: row.key,
                label: row.label,
                description: row.description ?? '',
                showInOrderForm: row.showInOrderForm,
                defaultValue: row.useRandomDefault ? '' : (detail.defaultValues?.[row.key] ?? ''),
                useRandomDefault: row.useRandomDefault === true,
                randomDefaultLength: row.randomDefaultLength ?? MIN_RANDOM_DEFAULT_LENGTH,
                randomDefaultSpecialChars: row.randomDefaultSpecialChars === true,
              }))
            : [],
          moduleEnvFields: isScript ? [] : envFields,
          moduleDefaultValues: isScript
            ? {}
            : Object.fromEntries(
                envFields
                  .filter((row) => row.useRandomDefault !== true)
                  .map((row) => [row.key, detail.defaultValues?.[row.key] ?? '']),
              ),
        };
        showBillingModal(this.editModal);
        this.scheduleMonacoLayout(this.editModal);
      });
  }

  openDeleteConfirm(addon: AddonResponse): void {
    this.addonToDelete = addon;
    showBillingModal(this.deleteConfirmModal);
  }

  onSubmitCreate(): void {
    if (!this.isValid(this.createForm)) return;

    this.facade.createAddon(this.buildCreateDto(this.createForm));
  }

  onSubmitEdit(): void {
    if (!this.editForm.id || !this.isValid(this.editForm)) return;

    this.facade.updateAddon(this.editForm.id, this.buildUpdateDto(this.editForm));
  }

  confirmDelete(): void {
    if (this.addonToDelete) this.facade.deleteAddon(this.addonToDelete.id);
  }

  activeStatusLabel(isActive: boolean): string {
    return getActiveStatusLabel(isActive);
  }

  activeStatusTextClass(isActive: boolean): string {
    return getActiveStatusTextClass(isActive);
  }

  implementationTypeLabel(type: AddonImplementationType): string {
    return type === 'module'
      ? $localize`:@@featureAddons-module:Module`
      : $localize`:@@featureAddons-cloudInitScript:Cloud-init script`;
  }

  formatPrice(addon: AddonResponse): string {
    if (!addon.basePrice || !addon.priceIntervalType || !addon.priceIntervalValue) {
      return $localize`:@@featureAddons-free:Free`;
    }

    return `€${addon.basePrice} / ${addon.priceIntervalValue} ${addon.priceIntervalType}`;
  }

  configFieldCount(addon: AddonResponse): number {
    const schema = addon.configSchema as { environmentVariables?: unknown[] } | undefined;

    return Array.isArray(schema?.environmentVariables) ? schema.environmentVariables.length : 0;
  }

  compatibleProvidersLabel(addon: AddonResponse): string {
    if (!addon.compatibleProviders?.length) {
      return $localize`:@@featureAddons-allProviders:All providers`;
    }

    return addon.compatibleProviders.join(', ');
  }

  onImplementationTypeChange(form: AddonForm): void {
    if (form.implementationType === 'module') {
      form.scriptTemplate = '';
      form.environmentVariableRows = [];
    } else {
      form.moduleKey = '';
      form.moduleEnvFields = [];
      form.moduleDefaultValues = {};
    }
  }

  addEnvVariable(form: AddonForm): void {
    form.environmentVariableRows = [
      ...form.environmentVariableRows,
      {
        key: '',
        label: '',
        description: '',
        showInOrderForm: false,
        defaultValue: '',
        useRandomDefault: false,
        randomDefaultLength: MIN_RANDOM_DEFAULT_LENGTH,
        randomDefaultSpecialChars: false,
      },
    ];
  }

  removeEnvVariable(form: AddonForm, index: number): void {
    const list = [...form.environmentVariableRows];

    list.splice(index, 1);
    form.environmentVariableRows = list;
  }

  moveEnvVariable(form: AddonForm, index: number, direction: -1 | 1): void {
    const targetIndex = index + direction;
    const list = [...form.environmentVariableRows];

    if (targetIndex < 0 || targetIndex >= list.length) return;

    [list[index], list[targetIndex]] = [list[targetIndex], list[index]];
    form.environmentVariableRows = list;
  }

  onEnvRandomDefaultChange(row: EnvVariableFormRow, checked: boolean): void {
    row.useRandomDefault = checked;

    if (checked) {
      row.defaultValue = '';
    }
  }

  getModuleDefaultValue(form: AddonForm, key: string): string {
    return form.moduleDefaultValues[key] ?? '';
  }

  setModuleDefaultValue(form: AddonForm, key: string, value: string): void {
    form.moduleDefaultValues = {
      ...form.moduleDefaultValues,
      [key]: value,
    };
  }

  showModuleDefaultsSection(form: AddonForm): boolean {
    return form.implementationType === 'module' && form.moduleEnvFields.length > 0;
  }

  onCompatibleProvidersChange(form: AddonForm, selected: string[] | string | null): void {
    const values = Array.isArray(selected) ? selected : selected ? [selected] : [];

    form.compatibleProviders = [...new Set(values.map((value) => String(value).trim()).filter(Boolean))];
  }

  providerOptionLabel(provider: ProviderDetail): string {
    return provider.displayName?.trim() || provider.id;
  }

  private isValid(form: AddonForm): boolean {
    const implementationValue =
      form.implementationType === 'module' ? form.moduleKey.trim() : form.scriptTemplate.trim();

    return Boolean(form.key.trim() && form.name.trim() && implementationValue);
  }

  private buildCreateDto(form: AddonForm): CreateAddonDto {
    const price = form.basePrice.trim();
    const dto: CreateAddonDto = {
      key: form.key.trim(),
      name: form.name.trim(),
      description: form.description.trim() || undefined,
      implementationType: form.implementationType,
      moduleKey: form.implementationType === 'module' ? form.moduleKey.trim() : undefined,
      scriptTemplate: form.implementationType === 'cloud_init_script' ? form.scriptTemplate.trim() : undefined,
      compatibleProviders: [...form.compatibleProviders],
      basePrice: price || undefined,
      priceIntervalType: price ? form.priceIntervalType : undefined,
      priceIntervalValue: price ? Math.max(1, Number(form.priceIntervalValue) || 1) : undefined,
      isActive: form.isActive,
    };

    this.applyConfigPayload(dto, form);

    return dto;
  }

  private buildUpdateDto(form: AddonForm): UpdateAddonDto {
    const createDto = this.buildCreateDto(form);

    return {
      name: createDto.name,
      description: createDto.description,
      implementationType: createDto.implementationType,
      moduleKey: createDto.moduleKey ?? null,
      scriptTemplate: createDto.scriptTemplate ?? null,
      configSchema: createDto.configSchema,
      defaultValues: createDto.defaultValues,
      compatibleProviders: createDto.compatibleProviders,
      basePrice: createDto.basePrice ?? null,
      priceIntervalType: createDto.priceIntervalType ?? null,
      priceIntervalValue: createDto.priceIntervalValue ?? null,
      isActive: createDto.isActive,
    };
  }

  private applyConfigPayload(dto: CreateAddonDto, form: AddonForm): void {
    if (form.implementationType === 'cloud_init_script') {
      const { environmentVariables, defaultValues } = this.buildEnvPayload(form.environmentVariableRows);
      const configSchema: AddonConfigSchemaInput = { environmentVariables };

      dto.configSchema = configSchema;
      dto.defaultValues = defaultValues;

      return;
    }

    if (!this.showModuleDefaultsSection(form)) {
      return;
    }

    const defaultValues: Record<string, string> = {};

    for (const field of form.moduleEnvFields) {
      if (field.useRandomDefault) {
        continue;
      }

      const value = (form.moduleDefaultValues[field.key] ?? '').trim();

      if (value) {
        defaultValues[field.key] = value;
      }
    }

    dto.defaultValues = defaultValues;
  }

  private buildEnvPayload(rows: EnvVariableFormRow[]): {
    environmentVariables: AddonConfigSchemaInput['environmentVariables'];
    defaultValues: Record<string, string>;
  } {
    const environmentVariables: AddonConfigSchemaInput['environmentVariables'] = [];
    const defaultValues: Record<string, string> = {};

    for (const row of rows) {
      const key = row.key?.trim() ?? '';
      const label = row.label?.trim() ?? '';

      if (!key || !label) {
        continue;
      }

      environmentVariables.push({
        key,
        label,
        description: row.description?.trim() || undefined,
        showInOrderForm: row.showInOrderForm === true,
        ...(row.useRandomDefault
          ? {
              useRandomDefault: true,
              randomDefaultLength: Math.max(
                MIN_RANDOM_DEFAULT_LENGTH,
                Number(row.randomDefaultLength) || MIN_RANDOM_DEFAULT_LENGTH,
              ),
              randomDefaultSpecialChars: row.randomDefaultSpecialChars === true,
            }
          : {}),
      });

      if (!row.useRandomDefault) {
        const defaultValue = row.defaultValue?.trim();

        if (defaultValue) {
          defaultValues[key] = defaultValue;
        }
      }
    }

    return { environmentVariables, defaultValues };
  }

  private parseEnvFields(schema: AddonResponse['configSchema']): AddonConfigEnvVariableDefinition[] {
    if (!schema || typeof schema !== 'object') {
      return [];
    }

    const raw = (schema as AddonConfigSchema).environmentVariables;

    return Array.isArray(raw) ? raw : [];
  }

  private defaultForm(): AddonForm {
    return {
      key: '',
      name: '',
      description: '',
      implementationType: 'module',
      moduleKey: '',
      scriptTemplate: '',
      compatibleProviders: [],
      basePrice: '',
      priceIntervalType: 'month',
      priceIntervalValue: 1,
      isActive: true,
      environmentVariableRows: [],
      moduleEnvFields: [],
      moduleDefaultValues: {},
    };
  }

  private showModalWithMonacoLayout(modal: ElementRef<HTMLDivElement>): void {
    this.scheduleMonacoLayout(modal);
    showBillingModal(modal);
  }

  private scheduleMonacoLayout(modal: ElementRef<HTMLDivElement>): void {
    modal.nativeElement.addEventListener(
      'shown.bs.modal',
      () => {
        window.dispatchEvent(new Event('resize'));
      },
      { once: true },
    );
  }

  private registerModalCloseWatchers(): void {
    watchBillingMutationModalClose({
      loading$: this.creating$,
      error$: this.error$,
      modal: () => this.createModal,
      destroyRef: this.destroyRef,
      onSuccess: () => {
        this.createForm = this.defaultForm();
      },
    });
    watchBillingMutationModalClose({
      loading$: this.updating$,
      error$: this.error$,
      modal: () => this.editModal,
      destroyRef: this.destroyRef,
      onSuccess: () => {
        this.editForm = { ...this.defaultForm(), id: '' };
      },
    });
    watchBillingMutationModalClose({
      loading$: this.deleting$,
      error$: this.error$,
      modal: () => this.deleteConfirmModal,
      destroyRef: this.destroyRef,
      onSuccess: () => {
        this.addonToDelete = null;
      },
    });
  }
}
