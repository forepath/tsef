import { Injectable } from '@nestjs/common';
import { PDFDocument } from 'pdf-lib';

import type {
  SupplierInvoiceParsePreviewLineDto,
  SupplierInvoiceParsePreviewResponseDto,
} from '../dto/supplier-invoice.dto';

@Injectable()
export class EInvoiceInboundParseService {
  async parseDocument(buffer: Buffer, mimeType?: string): Promise<SupplierInvoiceParsePreviewResponseDto> {
    const warnings: string[] = [];
    let xml: string | null = null;

    if (mimeType?.includes('xml')) {
      xml = buffer.toString('utf8');
    } else if (mimeType?.includes('pdf') || this.looksLikePdf(buffer)) {
      xml = await this.extractXmlFromPdf(buffer, warnings);
    } else {
      const asText = buffer.toString('utf8');

      if (asText.includes('CrossIndustryInvoice') || asText.trimStart().startsWith('<?xml')) {
        xml = asText;
      } else {
        warnings.push('Unsupported file type; expected PDF with embedded e-invoice or XML');
      }
    }

    if (!xml) {
      return { lineItems: [], warnings: warnings.length ? warnings : ['No e-invoice XML found in document'] };
    }

    return this.parseEn16931Xml(xml, warnings);
  }

  private looksLikePdf(buffer: Buffer): boolean {
    return buffer.subarray(0, 4).toString('ascii') === '%PDF';
  }

  private async extractXmlFromPdf(buffer: Buffer, warnings: string[]): Promise<string | null> {
    try {
      const pdfDoc = await PDFDocument.load(buffer, { ignoreEncryption: true });
      const attachments = pdfDoc.context.enumerateIndirectObjects();

      for (const [, object] of attachments) {
        const dict = object as { get?: (key: unknown) => unknown };
        const stream = dict?.get?.(pdfDoc.context.obj('EmbeddedFile'));

        if (stream && typeof (stream as { getContents?: () => Uint8Array }).getContents === 'function') {
          const contents = (stream as { getContents: () => Uint8Array }).getContents();
          const text = Buffer.from(contents).toString('utf8');

          if (text.includes('CrossIndustryInvoice')) {
            return text;
          }
        }
      }
    } catch {
      warnings.push('Could not read PDF attachments via pdf-lib');
    }

    const raw = buffer.toString('latin1');
    const xmlStart = raw.indexOf('<rsm:CrossIndustryInvoice');

    if (xmlStart >= 0) {
      const xmlEnd = raw.indexOf('</rsm:CrossIndustryInvoice>', xmlStart);

      if (xmlEnd >= 0) {
        return raw.slice(xmlStart, xmlEnd + '</rsm:CrossIndustryInvoice>'.length);
      }
    }

    const genericStart = raw.indexOf('<?xml');

    if (genericStart >= 0 && raw.includes('CrossIndustryInvoice', genericStart)) {
      return raw.slice(genericStart);
    }

    warnings.push('No embedded ZUGFeRD/Factur-X XML found in PDF');

    return null;
  }

  private parseEn16931Xml(xml: string, warnings: string[]): SupplierInvoiceParsePreviewResponseDto {
    const issueDate = this.extractTagValue(xml, 'IssueDateTime') ?? this.extractDate102(xml);
    const dueDate = this.extractDueDate(xml);
    const currency = this.extractAttribute(xml, 'currencyID') ?? 'EUR';
    const lineItems = this.extractLineItems(xml, warnings);
    const subtotalNet = this.extractAmount(xml, 'TaxBasisTotalAmount');
    const taxTotal = this.extractAmount(xml, 'TaxTotalAmount');
    const totalGross = this.extractAmount(xml, 'GrandTotalAmount') ?? this.extractAmount(xml, 'DuePayableAmount');

    if (lineItems.length === 0) {
      warnings.push('No line items could be extracted from e-invoice XML');
    }

    return {
      issueDate: issueDate ? this.normalizeDate(issueDate) : null,
      dueDate: dueDate ? this.normalizeDate(dueDate) : null,
      currency,
      subtotalNet,
      taxTotal,
      totalGross,
      lineItems,
      warnings,
    };
  }

  private extractLineItems(xml: string, warnings: string[]): SupplierInvoiceParsePreviewLineDto[] {
    const blocks =
      xml.match(/<ram:IncludedSupplyChainTradeLineItem[\s\S]*?<\/ram:IncludedSupplyChainTradeLineItem>/g) ?? [];
    const items: SupplierInvoiceParsePreviewLineDto[] = [];

    for (const block of blocks) {
      const description =
        this.extractTagValue(block, 'Name') ?? this.extractTagValue(block, 'Description') ?? 'Line item';
      const quantity = this.parseNumber(this.extractTagValue(block, 'BilledQuantity')) ?? 1;
      const unitPriceNet =
        this.parseNumber(this.extractTagValue(block, 'ChargeAmount')) ?? this.extractAmount(block, 'LineTotalAmount');
      const taxRate = this.parseNumber(this.extractTagValue(block, 'RateApplicablePercent'));
      const lineNet = this.extractAmount(block, 'LineTotalAmount');
      const lineGross = lineNet != null && taxRate != null ? lineNet * (1 + taxRate / 100) : undefined;
      const lineTax = lineNet != null && lineGross != null ? lineGross - lineNet : undefined;

      if (unitPriceNet == null) {
        warnings.push(`Skipped line item without unit price: ${description}`);
        continue;
      }

      items.push({
        description,
        quantity,
        unitPriceNet,
        taxRate: taxRate ?? undefined,
        lineNet: lineNet ?? undefined,
        lineTax: lineTax ?? undefined,
        lineGross: lineGross ?? undefined,
      });
    }

    return items;
  }

  private extractTagValue(xml: string, tag: string): string | null {
    const pattern = new RegExp(`<(?:ram:|udt:)?${tag}[^>]*>([^<]+)<`, 'i');
    const match = xml.match(pattern);

    return match?.[1]?.trim() ?? null;
  }

  private extractAttribute(xml: string, attribute: string): string | null {
    const pattern = new RegExp(`${attribute}="([^"]+)"`, 'i');
    const match = xml.match(pattern);

    return match?.[1]?.trim() ?? null;
  }

  private extractAmount(xml: string, tag: string): number | null {
    const pattern = new RegExp(`<(?:ram:)?${tag}[^>]*>([^<]+)<`, 'i');
    const match = xml.match(pattern);

    return this.parseNumber(match?.[1]);
  }

  private extractDate102(xml: string): string | null {
    const match = xml.match(/format="102"[^>]*>(\d{8})</);

    if (!match?.[1]) {
      return null;
    }

    const raw = match[1];

    return `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}`;
  }

  private extractDueDate(xml: string): string | null {
    const dueBlock = xml.match(/<ram:SpecifiedTradePaymentTerms[\s\S]*?<\/ram:SpecifiedTradePaymentTerms>/i)?.[0];

    if (!dueBlock) {
      return null;
    }

    return this.extractDate102(dueBlock) ?? this.extractTagValue(dueBlock, 'DueDateDateTime');
  }

  private normalizeDate(value: string): string {
    if (/^\d{8}$/.test(value)) {
      return `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}`;
    }

    return value.slice(0, 10);
  }

  private parseNumber(value: string | null | undefined): number | null {
    if (value == null || value.trim() === '') {
      return null;
    }

    const parsed = Number(value.replace(',', '.'));

    return Number.isFinite(parsed) ? parsed : null;
  }
}
