import type { InvoiceEntity } from '../../entities/invoice.entity';

import { ProjectTimeReportPdfService } from './project-time-report-pdf.service';

describe('ProjectTimeReportPdfService', () => {
  const templateService = { buildHtml: jest.fn().mockReturnValue('<html></html>') };
  const htmlRenderer = { renderHtmlToPdf: jest.fn().mockResolvedValue(new Uint8Array([1, 2, 3])) };
  const fileStorage = {
    writeInvoiceFile: jest.fn().mockResolvedValue(undefined),
    readInvoiceFile: jest.fn(),
  };
  const service = new ProjectTimeReportPdfService(
    templateService as never,
    htmlRenderer as never,
    fileStorage as never,
  );
  const invoice = {
    id: 'inv-1',
    subscriptionId: 'sub-1',
    userId: 'user-1',
  } as InvoiceEntity;
  const viewModel = { title: 'Time report' } as never;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renderPdf builds html and renders pdf', async () => {
    const pdf = await service.renderPdf(viewModel);

    expect(templateService.buildHtml).toHaveBeenCalledWith(viewModel);
    expect(htmlRenderer.renderHtmlToPdf).toHaveBeenCalledWith('<html></html>');
    expect(pdf).toEqual(new Uint8Array([1, 2, 3]));
  });

  it('generateAndStore writes pdf via file storage', async () => {
    const storageKey = await service.generateAndStore(invoice, viewModel);

    expect(storageKey).toBe('sub-1/inv-1-time-report.pdf');
    expect(fileStorage.writeInvoiceFile).toHaveBeenCalledWith('sub-1/inv-1-time-report.pdf', expect.any(Buffer));
  });

  it('readPdf reads via file storage', async () => {
    fileStorage.readInvoiceFile.mockResolvedValue(Buffer.from('pdf'));

    const buffer = await service.readPdf('sub-1/inv-1-time-report.pdf');

    expect(buffer).toEqual(Buffer.from('pdf'));
    expect(fileStorage.readInvoiceFile).toHaveBeenCalledWith('sub-1/inv-1-time-report.pdf');
  });
});
