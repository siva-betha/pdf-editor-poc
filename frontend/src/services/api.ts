import { EditorObject, ExportResponse, PdfInfo, TextLineInfo, UploadResponse } from '../types/editor';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '';

export async function uploadPdf(file: File): Promise<UploadResponse> {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(`${API_BASE}/api/pdf/upload`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    let errorMsg = 'Upload failed.';
    try {
      const err = await response.json();
      if (err.detail) errorMsg = err.detail;
    } catch {
      // fallback
    }
    throw new Error(errorMsg);
  }

  return response.json();
}

export async function getPdfInfo(documentId: string): Promise<PdfInfo> {
  const response = await fetch(`${API_BASE}/api/pdf/${documentId}/info`);

  if (!response.ok) {
    let errorMsg = 'Failed to load PDF metadata.';
    try {
      const err = await response.json();
      if (err.detail) errorMsg = err.detail;
    } catch {
      // fallback
    }
    throw new Error(errorMsg);
  }

  return response.json();
}

export function getPdfFileUrl(documentId: string): string {
  return `${API_BASE}/api/pdf/${documentId}/file`;
}

export async function exportPdf(
  documentId: string,
  objects: EditorObject[]
): Promise<ExportResponse> {
  const response = await fetch(`${API_BASE}/api/pdf/${documentId}/export`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ objects }),
  });

  if (!response.ok) {
    let errorMsg = 'Could not save the PDF.';
    try {
      const err = await response.json();
      if (err.detail) errorMsg = err.detail;
    } catch {
      // fallback
    }
    throw new Error(errorMsg);
  }

  return response.json();
}

export function getExportUrl(exportId: string): string {
  return `${API_BASE}/api/pdf/export/${exportId}/download`;
}

export async function getPageTextLines(
  documentId: string,
  pageNumber: number
): Promise<TextLineInfo[]> {
  const response = await fetch(`${API_BASE}/api/pdf/${documentId}/pages/${pageNumber}/text`);

  if (!response.ok) {
    let errorMsg = 'Failed to fetch page text.';
    try {
      const err = await response.json();
      if (err.detail) errorMsg = err.detail;
    } catch {
      // fallback
    }
    throw new Error(errorMsg);
  }

  return response.json();
}

