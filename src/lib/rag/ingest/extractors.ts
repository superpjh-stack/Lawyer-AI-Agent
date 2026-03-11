// LexAgent - Document Text Extractors (PDF, DOCX, TXT)

export interface ExtractResult {
  text: string;
  pageCount?: number;
  mimeType: string;
}

/**
 * Extract text from a PDF buffer.
 * Uses pdf-parse v2 (PDFParse class).
 */
export async function extractPDF(buffer: Buffer): Promise<ExtractResult> {
  const { PDFParse } = await import('pdf-parse');
  const parser = new PDFParse(buffer);
  const result = await parser.getText();
  // result has pages array with text content
  const text = (result as any).pages
    ? (result as any).pages.map((p: any) => p.text ?? '').join('\n\n')
    : String(result);
  return {
    text: typeof text === 'string' ? text : String(text),
    pageCount: (result as any).total ?? undefined,
    mimeType: 'application/pdf',
  };
}

/**
 * Extract text from a DOCX buffer.
 */
export async function extractDOCX(buffer: Buffer): Promise<ExtractResult> {
  const mammoth = await import('mammoth');
  const result = await mammoth.extractRawText({ buffer });
  return {
    text: result.value,
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  };
}

/**
 * Extract text from a plain text buffer.
 */
export function extractTXT(buffer: Buffer): ExtractResult {
  return {
    text: buffer.toString('utf-8'),
    mimeType: 'text/plain',
  };
}

/**
 * Auto-detect MIME type and extract text.
 */
export async function extractText(
  buffer: Buffer,
  mimeType: string,
  fileName?: string
): Promise<ExtractResult> {
  // Determine type from MIME or file extension
  const mime = mimeType.toLowerCase();
  const ext = fileName?.toLowerCase().split('.').pop();

  if (mime === 'application/pdf' || ext === 'pdf') {
    return extractPDF(buffer);
  }

  if (
    mime === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    ext === 'docx'
  ) {
    return extractDOCX(buffer);
  }

  if (mime.startsWith('text/') || ext === 'txt' || ext === 'md') {
    return extractTXT(buffer);
  }

  throw new Error(`지원하지 않는 파일 형식입니다: ${mimeType} (${fileName ?? 'unknown'})`);
}

/**
 * Supported MIME types for ingestion.
 */
export const SUPPORTED_MIME_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
  'text/markdown',
] as const;

export const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB
