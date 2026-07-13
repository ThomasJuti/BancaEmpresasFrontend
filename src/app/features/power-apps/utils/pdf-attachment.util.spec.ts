import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import {
  createPdfPreviewSource,
  downloadPdfFromSource,
  revokePdfPreviewSource,
} from './pdf-attachment.util';

describe('pdf-attachment.util', () => {
  beforeEach(() => {
    vi.stubGlobal('URL', {
      createObjectURL: vi.fn(() => 'blob:pdf'),
      revokeObjectURL: vi.fn(),
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('creates preview from file', () => {
    const file = new File(['pdf'], 'cert.pdf', { type: 'application/pdf' });
    const source = createPdfPreviewSource({ file });
    expect(source?.url).toBe('blob:pdf');
    expect(source?.revokeOnClose).toBe(true);
  });

  it('creates preview from base64', () => {
    const source = createPdfPreviewSource({ pdfBase64: 'abc123' });
    expect(source?.url).toContain('data:application/pdf;base64,abc123');
    expect(source?.revokeOnClose).toBe(false);
  });

  it('returns null for empty base64', () => {
    expect(createPdfPreviewSource({ pdfBase64: '   ' })).toBeNull();
  });

  it('revokes blob URLs when needed', () => {
    revokePdfPreviewSource({ url: 'blob:pdf', revokeOnClose: true });
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:pdf');
    revokePdfPreviewSource({ url: 'data:x', revokeOnClose: false });
  });

  it('downloads via anchor click', () => {
    const click = vi.fn();
    vi.spyOn(document, 'createElement').mockReturnValue({
      click,
      href: '',
      download: '',
      rel: '',
    } as unknown as HTMLAnchorElement);

    downloadPdfFromSource({ pdfBase64: 'abc' }, 'doc');
    expect(click).toHaveBeenCalled();
  });

  it('no-ops download without source', () => {
    const click = vi.fn();
    vi.spyOn(document, 'createElement').mockReturnValue({ click } as unknown as HTMLAnchorElement);
    downloadPdfFromSource({}, 'doc');
    expect(click).not.toHaveBeenCalled();
  });
});
