import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { usePdfStore } from '../store/pdfStore';
import { Upload, FileText, Sparkles, CheckCircle, AlertCircle } from 'lucide-react';

// A minimal, valid 1-page PDF displaying "Hello, world! Click to edit this text."
const SAMPLE_PDF_BASE64 = 
  'JVBERi0xLjQKJdPr6gogMSAwIG9iagogIDw8L1R5cGUvQ2F0YWxvZy9QYWdlcyAyIDAgUj4+CmVuZG9iagoyIDAgb2JqCiAgPDwvVHlwZS9QYWdlcy9LaWRzWzMgMCBSXS9Db3VudCAxPj4KZW5kb2JqCjMgMCBvYmoKICA8PC9UeXBlL1BhZ2UvUGFyZW50IDIgMCBSL01lZGlhQm94WzAgMCA1OTUgODQyXS9SZXNvdXJjZXM8PC9Gb250PDwvRjFfMCA0IDAgUj4+Pj4vQ29udGVudHMgNSAwIFI+PgplbmRvYmoKNCAwIG9iagogIDw8L1R5cGUvRm9udC9TdWJ0eXBlL1R5cGUxL0Jhc2VGb250L0hlbHZldGljYT4+CmVuZG9iago1IDAgb2JqCiAgPDwvTGVuZ3RoIDY5Pj5zdHJlYW0KQlQgL0YxXzAgMTggVGYgNTAgNzUwIFRkIChQREYgRWRpdG9yIHNhbXBsZSBkb2N1bWVudCkgVGogRVQKQlQgL0YxXzAgMTQgVGYgNTAgNjgwIFRkIChIZWxsbywgd29ybGQhIENsaWNrIGhlcmUgdG8gZWRpdCB0aGlzIHRleHQgZGlyZWN0bHkuKSBUaiBFVAplbmRzdHJlYW0KZW5kb2JqCnhyZWYKMCA2CjAwMDAwMDAwMDAgNjU1MzUgZiAKMDAwMDAwMDAxNSAwMDAwMCBuIAowMDAwMDAwMDcwIDAwMDAwIG4gCjAwMDAwMDAxMjAgMDAwMDAgbiAKMDAwMDAwMDIyMSAwMDAwMCBuIAowMDAwMDAwMjg4IDAwMDAwIG4gCnRyYWlsZXIKICA8PC9TaXplIDYvUm9vdCAxIDAgUj4+CnN0YXJ0eHJlZgogNDA3CiUlRU9GCg==';

export const Home: React.FC = () => {
  const { setFile, setNumPages, setLoading, loadingStatus, loadingMessage } = usePdfStore();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const processPdfBuffer = async (file: File, buffer: ArrayBuffer) => {
    setLoading('loading', 'Loading and analyzing PDF structure...');
    setErrorMsg(null);
    
    try {
      const { loadPdfDocument } = await import('../services/pdfService');
      const pdfDoc = await loadPdfDocument(buffer);
      setFile(file, buffer, pdfDoc);
      setNumPages(pdfDoc.numPages);
    } catch (err) {
      console.error(err);
      setLoading('error');
      setErrorMsg('Failed to parse PDF document. It might be encrypted or corrupted.');
    }
  };

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    if (file.type !== 'application/pdf' && !file.name.endsWith('.pdf')) {
      setErrorMsg('Invalid file type. Please upload a PDF document.');
      return;
    }

    const reader = new FileReader();
    reader.onload = async (e) => {
      const buffer = e.target?.result as ArrayBuffer;
      if (buffer) {
        await processPdfBuffer(file, buffer);
      }
    };
    reader.onerror = () => {
      setErrorMsg('Failed to read the file.');
    };
    reader.readAsArrayBuffer(file);
  }, []);

  const loadSamplePdf = async () => {
    // Convert base64 to ArrayBuffer
    const binaryString = atob(SAMPLE_PDF_BASE64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    const sampleFile = new File([bytes], 'sample_document.pdf', {
      type: 'application/pdf',
    });

    // Create a proper copy of the buffer to avoid detached ArrayBuffer issues
    const bufferCopy = new Uint8Array(bytes).buffer;
    await processPdfBuffer(sampleFile, bufferCopy);
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/pdf': ['.pdf'] },
    multiple: false,
  });

  return (
    <div className="flex-1 w-full flex flex-col justify-center items-center bg-radial from-neutral-50 to-neutral-200 dark:from-neutral-900 dark:to-neutral-950 p-6 overflow-y-auto">
      
      {/* Premium UI Cards Wrapper */}
      <div className="max-w-md w-full flex flex-col items-center select-none text-center">
        
        {/* Header Branding */}
        <div className="mb-8 animate-fade-in">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-full text-xs font-bold uppercase tracking-wider mb-3">
            <Sparkles size={12} className="animate-pulse" />
            <span>100% Client-Side Editor</span>
          </div>
          
          <h1 className="text-4xl md:text-5xl font-black text-neutral-900 dark:text-white tracking-tight mb-2">
            Antigravity <span className="bg-gradient-to-r from-emerald-500 to-teal-500 bg-clip-text text-transparent">PDF</span>
          </h1>
          
          <p className="text-sm text-neutral-500 dark:text-neutral-400">
            Edit original PDF text, draw vector shapes, add signatures, and highlights instantly inside your browser.
          </p>
        </div>

        {/* Dropzone Board */}
        <div
          {...getRootProps()}
          className={`w-full bg-white dark:bg-neutral-900 border-2 border-dashed rounded-3xl p-10 flex flex-col items-center justify-center cursor-pointer transition-all duration-300 shadow-xl ${
            isDragActive
              ? 'border-emerald-500 bg-emerald-500/5 dark:bg-emerald-500/10 scale-102'
              : 'border-neutral-250 dark:border-neutral-800 hover:border-emerald-500/50 hover:shadow-2xl'
          }`}
        >
          <input {...getInputProps()} />
          
          <div className="p-4 bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400 rounded-2xl mb-4 group-hover:scale-110 transition-transform">
            <Upload size={32} className={isDragActive ? 'text-emerald-500 animate-bounce' : 'text-neutral-400 dark:text-neutral-500'} />
          </div>

          <p className="text-sm font-bold text-neutral-800 dark:text-neutral-200">
            {isDragActive ? 'Drop PDF here' : 'Drag & Drop PDF file here'}
          </p>
          
          <p className="text-xs text-neutral-400 dark:text-neutral-500 mt-1">
            or click to browse local files
          </p>
        </div>

        {/* Action Options */}
        <div className="w-full mt-6 flex flex-col gap-3">
          <button
            onClick={loadSamplePdf}
            disabled={loadingStatus === 'loading'}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl border border-neutral-300 dark:border-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-850 bg-white dark:bg-neutral-900 shadow-sm text-sm font-bold text-neutral-700 dark:text-neutral-300 transition-colors"
          >
            <FileText size={16} className="text-emerald-500" />
            <span>Try with a Sample PDF</span>
          </button>

          {/* Loading status info */}
          {loadingStatus === 'loading' && (
            <div className="flex items-center justify-center gap-2 text-xs text-neutral-500 mt-2 bg-white/50 dark:bg-neutral-900/50 py-2.5 px-4 rounded-xl border border-neutral-200 dark:border-neutral-850">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping"></span>
              <span>{loadingMessage}</span>
            </div>
          )}

          {/* Custom Error messages */}
          {errorMsg && (
            <div className="flex items-start gap-2 text-xs text-red-500 mt-2 text-left bg-red-50 dark:bg-red-950/20 p-3 rounded-xl border border-red-200 dark:border-red-950">
              <AlertCircle size={14} className="shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}
        </div>

        {/* Feature badges list */}
        <div className="grid grid-cols-3 gap-2 w-full mt-10 border-t border-neutral-200 dark:border-neutral-850 pt-6">
          <div className="flex flex-col items-center text-center">
            <CheckCircle size={14} className="text-emerald-500 mb-1" />
            <span className="text-[10px] font-bold text-neutral-600 dark:text-neutral-450 uppercase">No Backend</span>
          </div>
          <div className="flex flex-col items-center text-center">
            <CheckCircle size={14} className="text-emerald-500 mb-1" />
            <span className="text-[10px] font-bold text-neutral-600 dark:text-neutral-450 uppercase">Private</span>
          </div>
          <div className="flex flex-col items-center text-center">
            <CheckCircle size={14} className="text-emerald-500 mb-1" />
            <span className="text-[10px] font-bold text-neutral-600 dark:text-neutral-450 uppercase">Vector crisp</span>
          </div>
        </div>

      </div>

    </div>
  );
};
