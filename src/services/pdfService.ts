import * as pdfjsLib from 'pdfjs-dist';
import type { PageDimensions, PdfTextItem } from '../types/pdf';
import { parseFontWeightAndStyle } from '../utils/fonts';

// Configure PDF.js Worker to run off-thread via CDN matching package version (6.1.200)
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@6.1.200/build/pdf.worker.min.mjs`;

/**
 * Loads a PDF document from an ArrayBuffer.
 */
export async function loadPdfDocument(buffer: ArrayBuffer): Promise<pdfjsLib.PDFDocumentProxy> {
  // Copy the buffer before handing it to PDF.js to avoid a detached ArrayBuffer
  // if the library transfers or reuses the original data internally.
  const pdfBuffer = buffer.slice(0);
  const loadingTask = pdfjsLib.getDocument({ data: pdfBuffer });
  return await loadingTask.promise;
}

/**
 * Renders a PDF page onto an HTML canvas and returns the page dimensions.
 */
export function renderPdfPage(
  pdfDoc: pdfjsLib.PDFDocumentProxy,
  pageIndex: number,
  canvas: HTMLCanvasElement,
  scale: number
): {
  promise: Promise<PageDimensions>;
  cancel: () => void;
} {
  let renderTask: any = null;
  let cancelled = false;

  const promise = (async () => {
    const pageNumber = pageIndex + 1;
    const page = await pdfDoc.getPage(pageNumber);
    if (cancelled) throw new Error('cancelled');
    
    // Set scale
    const viewport = page.getViewport({ scale });
    
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    
    const canvasContext = canvas.getContext('2d');
    if (!canvasContext) {
      throw new Error('Could not get 2D context from canvas');
    }
    
    // Render context parameters (requires canvas reference in modern types)
    const renderContext = {
      canvasContext,
      viewport,
      canvas,
    };
    
    renderTask = page.render(renderContext);
    await renderTask.promise;
    
    // Page rotation and dimensions (at scale 1.0)
    const baseViewport = page.getViewport({ scale: 1.0 });
    return {
      width: baseViewport.width,
      height: baseViewport.height,
      rotation: page.rotate || 0,
    };
  })();

  return {
    promise,
    cancel: () => {
      cancelled = true;
      if (renderTask) {
        try {
          renderTask.cancel();
        } catch (e) {
          // ignore
        }
      }
    }
  };
}

/**
 * Extracts raw text items from a PDF page.
 */
export async function extractPageText(
  pdfDoc: pdfjsLib.PDFDocumentProxy,
  pageIndex: number
): Promise<PdfTextItem[]> {
  const pageNumber = pageIndex + 1;
  const page = await pdfDoc.getPage(pageNumber);
  const viewport1 = page.getViewport({ scale: 1.0 });
  
  const textContent = await page.getTextContent();
  const items: PdfTextItem[] = [];
  
  textContent.items.forEach((item: any, index: number) => {
    // Some items might be mark info, only process actual text runs
    if (typeof item.str !== 'string') return;
    
    const transform = item.transform; // [scaleX, skewY, skewX, scaleY, translateX, translateY]
    
    // Convert coordinate from PDF space (bottom-left) to scale-1 viewport space (top-left)
    const [x, y] = viewport1.convertToViewportPoint(transform[4], transform[5]);
    
    // Estimate font size from matrix
    const fontSize = Math.abs(transform[3]) || item.height || 12;
    
    // Estimate rotation from matrix
    const rotation = Math.atan2(transform[1], transform[0]) * (180 / Math.PI);
    
    // Parse weight and style
    const { isBold } = parseFontWeightAndStyle(item.fontName || '');
    const fontWeight = isBold ? 'bold' : 'normal';
    
    items.push({
      id: `raw-${pageIndex}-${index}`,
      pageIndex,
      text: item.str,
      originalText: item.str,
      x: x,
      // In PDF.js viewport coordinates, y is baseline. Adjust to top-left of bbox:
      y: y - fontSize,
      width: item.width || (item.str.length * fontSize * 0.5),
      height: fontSize,
      fontSize,
      fontFamily: item.fontName || 'Helvetica',
      fontWeight,
      color: '#000000', // Default color, will map to text editing color
      rotation,
    });
  });
  
  return items;
}
