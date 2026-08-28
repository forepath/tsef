import { Injectable } from '@nestjs/common';
import { FileStorageService } from '@forepath/shared/backend/util-file-storage';

import type { InvoiceEntity } from '../../entities/invoice.entity';
import { InvoicePdfHtmlRendererService } from '../../services/invoice-pdf-html-renderer.service';
import { buildProjectTimeReportStorageKey } from '../../utils/project-time-report-storage.util';

import { ProjectTimeReportPdfTemplateService } from './project-time-report-pdf-template.service';
import type { ProjectTimeReportViewModel } from './project-time-report-pdf-view.model';

@Injectable()
export class ProjectTimeReportPdfService {
  constructor(
    private readonly templateService: ProjectTimeReportPdfTemplateService,
    private readonly htmlRenderer: InvoicePdfHtmlRendererService,
    private readonly fileStorage: FileStorageService,
  ) {}

  async renderPdf(viewModel: ProjectTimeReportViewModel): Promise<Uint8Array> {
    const html = this.templateService.buildHtml(viewModel);

    return await this.htmlRenderer.renderHtmlToPdf(html);
  }

  async generateAndStore(invoice: InvoiceEntity, viewModel: ProjectTimeReportViewModel): Promise<string> {
    const pdfBytes = await this.renderPdf(viewModel);
    const storageKey = buildProjectTimeReportStorageKey(invoice);

    await this.fileStorage.writeInvoiceFile(storageKey, Buffer.from(pdfBytes));

    return storageKey;
  }

  async readPdf(storageKey: string): Promise<Buffer> {
    return await this.fileStorage.readInvoiceFile(storageKey);
  }
}
