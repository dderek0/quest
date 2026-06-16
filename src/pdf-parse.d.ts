// Minimal ambient types for pdf-parse v2 (its .d.cts isn't resolved under moduleResolution:Node).
declare module 'pdf-parse' {
  export class PDFParse {
    constructor(opts: { data?: Uint8Array | Buffer; url?: string });
    getText(): Promise<{ text: string }>;
  }
}
