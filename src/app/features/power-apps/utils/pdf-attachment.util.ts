export interface PdfPreviewSource {
  url: string;
  revokeOnClose: boolean;
}

export function createPdfPreviewSource(source: {
  pdfBase64?: string | null;
  file?: File;
}): PdfPreviewSource | null {
  if (source.file) {
    return {
      url: URL.createObjectURL(source.file),
      revokeOnClose: true,
    };
  }

  const base64 = source.pdfBase64?.replace(/\s/g, '') ?? '';
  if (!base64) {
    return null;
  }

  return {
    url: `data:application/pdf;base64,${base64}`,
    revokeOnClose: false,
  };
}

export function revokePdfPreviewSource(source: PdfPreviewSource | null): void {
  if (source?.revokeOnClose) {
    URL.revokeObjectURL(source.url);
  }
}

export function downloadPdfFromSource(
  source: { pdfBase64?: string | null; file?: File },
  filename: string,
): void {
  const preview = createPdfPreviewSource(source);
  if (!preview) {
    return;
  }

  const anchor = document.createElement('a');
  anchor.href = preview.url;
  anchor.download = filename.endsWith('.pdf') ? filename : `${filename}.pdf`;
  anchor.rel = 'noopener';
  anchor.click();

  if (preview.revokeOnClose) {
    URL.revokeObjectURL(preview.url);
  }
}
