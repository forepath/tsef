import { RequireScopes } from '@forepath/identity/backend';
import { BadRequestException, Body, Controller, Post, Req } from '@nestjs/common';

import { PricingPreviewDto } from '../dto/pricing-preview.dto';
import { TaxPreviewRequestDto } from '../dto/tax-preview.dto';
import { AddonsRepository } from '../repositories/addons.repository';
import { ServicePlansRepository } from '../repositories/service-plans.repository';
import { ServiceTypesRepository } from '../repositories/service-types.repository';
import { AddonService } from '../services/addon.service';
import { InvoiceTaxContextService } from '../services/invoice-tax-context.service';
import { PricingService } from '../services/pricing.service';
import { ProviderServerTypesService } from '../services/provider-server-types.service';
import { TaxCalculationService } from '../services/tax-calculation.service';
import { TaxPreviewService } from '../services/tax-preview.service';
import { convertAddonPriceToPlanPeriod } from '../utils/addon-pricing.util';
import { getUserFromRequest, type RequestWithUser } from '../utils/billing-access.utils';
import { parsePlanAllowedAddonIds } from '../utils/plan-addons.utils';
import { normalizeStoredProviderDefaults } from '../utils/provider-env-defaults.utils';
import { enrichPricingWithTax } from '../utils/pricing-tax.utils';
import { resolvePlanTaxCategory } from '../utils/plan-tax.utils';
import { resolveServerTypePriceMonthly } from '../utils/server-type-billing.utils';

@Controller('pricing')
@RequireScopes('subscriptions:read')
export class PricingController {
  constructor(
    private readonly pricingService: PricingService,
    private readonly taxCalculationService: TaxCalculationService,
    private readonly invoiceTaxContextService: InvoiceTaxContextService,
    private readonly taxPreviewService: TaxPreviewService,
    private readonly servicePlansRepository: ServicePlansRepository,
    private readonly serviceTypesRepository: ServiceTypesRepository,
    private readonly providerServerTypesService: ProviderServerTypesService,
    private readonly addonService: AddonService,
    private readonly addonsRepository: AddonsRepository,
  ) {}

  @Post('preview')
  async preview(@Body() dto: PricingPreviewDto, @Req() req?: RequestWithUser) {
    if (!dto.planId) {
      return {
        totalPrice: 0,
        basePrice: 0,
        marginPercent: 0,
        marginFixed: 0,
        taxTotal: 0,
        totalGross: 0,
        taxRate: 0,
        taxCategory: 'standard',
        addonLines: [],
        addonsTotal: 0,
        grandTotal: 0,
      };
    }

    const userInfo = getUserFromRequest(req || ({} as RequestWithUser));

    if (!userInfo.userId) {
      throw new BadRequestException('User not authenticated');
    }

    const taxContext = await this.invoiceTaxContextService.resolveForUser(userInfo.userId);
    const computeOptions = {
      taxTreatment: taxContext.treatment,
      forceChargeNonEuIssuerEuB2b: taxContext.forceChargeNonEuIssuerEuB2b,
    };
    const plan = await this.servicePlansRepository.findByIdOrThrow(dto.planId);
    const taxCategory = resolvePlanTaxCategory(plan);
    const requestedServerType = dto.requestedConfig?.['serverType'];
    const serverTypeId =
      typeof requestedServerType === 'string' && requestedServerType.trim()
        ? requestedServerType.trim()
        : typeof plan.providerConfigDefaults?.['serverType'] === 'string'
          ? String(plan.providerConfigDefaults['serverType']).trim()
          : '';

    let planPricing = this.pricingService.calculate(plan);

    if (serverTypeId) {
      const serviceType = await this.serviceTypesRepository.findByIdOrThrow(plan.serviceTypeId);
      const providerDefaults = normalizeStoredProviderDefaults(serviceType.providerDefaults);
      const priceMonthly = await resolveServerTypePriceMonthly(
        this.providerServerTypesService,
        serviceType.provider,
        serverTypeId,
        providerDefaults,
      );

      if (priceMonthly != null) {
        planPricing = this.pricingService.calculate(plan, priceMonthly);
      }
    }

    const selectedAddonIds = [...new Set((dto.addonIds ?? []).filter(Boolean))];
    const addons = await this.addonService.assertAddonIdsForOrder(
      plan.serviceTypeId,
      parsePlanAllowedAddonIds(plan.providerConfigDefaults),
      selectedAddonIds,
    );
    const addonLines = addons.map((addon) => ({
      addonId: addon.id,
      name: addon.name,
      periodPrice: convertAddonPriceToPlanPeriod(addon, plan),
    }));
    const addonsTotal = Math.round(addonLines.reduce((sum, line) => sum + line.periodPrice, 0) * 100) / 100;
    const grandTotal = Math.round((planPricing.totalPrice + addonsTotal) * 100) / 100;
    const taxed = enrichPricingWithTax(
      { ...planPricing, totalPrice: grandTotal },
      taxCategory,
      this.taxCalculationService,
      computeOptions,
    );

    return {
      ...taxed,
      basePrice: planPricing.basePrice,
      marginPercent: planPricing.marginPercent,
      marginFixed: planPricing.marginFixed,
      totalPrice: planPricing.totalPrice,
      addonLines,
      addonsTotal,
      grandTotal,
    };
  }

  @Post('tax-preview')
  async taxPreview(@Body() dto: TaxPreviewRequestDto, @Req() req?: RequestWithUser) {
    const userInfo = getUserFromRequest(req || ({} as RequestWithUser));

    if (!userInfo.userId) {
      throw new BadRequestException('User not authenticated');
    }

    return await this.taxPreviewService.preview({
      userId: userInfo.userId,
      lineItems: dto.lineItems,
    });
  }
}
