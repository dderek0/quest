import { PDFParse } from 'pdf-parse';
import mammoth from 'mammoth';

// Convert an uploaded file to markdown/plain text and return the TEXT (the file itself is never
// stored — only this extracted text is persisted). Supports PDF, DOCX, and plain text (txt/md/csv).
export async function extractText(buffer: Buffer, filename: string): Promise<string> {
  const ext = (filename.split('.').pop() || '').toLowerCase();
  if (ext === 'pdf') {
    const parser = new PDFParse({ data: new Uint8Array(buffer) });
    const result = await parser.getText();
    return (result.text || '').trim();
  }
  if (ext === 'docx') {
    // convertToMarkdown keeps headings/lists/bold as markdown (richer than raw text).
    // (Exists at runtime; cast past mammoth's incomplete type defs.)
    const result = await (mammoth as any).convertToMarkdown({ buffer });
    return (result.value || '').trim();
  }
  return buffer.toString('utf8').trim();
}
