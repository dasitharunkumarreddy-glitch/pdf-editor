import React, { useEffect, useRef, useState } from 'react';
import { usePdfStore } from '../store/pdfStore';
import { renderPdfPage, extractPageText } from '../services/pdfService';
import { groupTextItems } from '../services/textDetection';
import { FabricCanvas } from './FabricCanvas';
import { Loader2 } from 'lucide-react';

interface PageContainerProps {
  pageIndex: number;
}

export const PageContainer: React.FC<PageContainerProps> = ({ pageIndex }) => {
  const pdfCanvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const {
    pdfDoc,
    zoom,
    pagesDimensions,
    setPageDimensions,
    setPageTextItems,
    pagesTextItems,
  } = usePdfStore();

  const [isRendered, setIsRendered] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Retrieve current page dimensions
  const dimensions = pagesDimensions[pageIndex];
  
  // Sizing details
  const width = dimensions?.width || 595; // Default A4 width in points
  const height = dimensions?.height || 842; // Default A4 height in points
  
  const scaledWidth = width * zoom;
  const scaledHeight = height * zoom;

  // Render PDF Page and extract text
  useEffect(() => {
    const canvas = pdfCanvasRef.current;
    if (!canvas || !pdfDoc) return;

    let active = true;
    setIsRendered(false);
    setError(null);

    // Call renderPdfPage (returns cancellable object)
    const renderOperation = renderPdfPage(pdfDoc, pageIndex, canvas, zoom);

    const loadPageData = async () => {
      try {
        // 1. Await render promise
        const dims = await renderOperation.promise;
        
        if (!active) return;
        setPageDimensions(pageIndex, dims);

        // 2. Extract and group text only once per document load
        if (!pagesTextItems[pageIndex]) {
          const rawText = await extractPageText(pdfDoc, pageIndex);
          const groupedText = groupTextItems(rawText, pageIndex);
          if (active) {
            setPageTextItems(pageIndex, groupedText);
          }
        }

        if (active) {
          setIsRendered(true);
        }
      } catch (err: any) {
        // Silently catch cancellation exceptions
        if (
          err.name === 'HeadingError' ||
          err.name === 'RenderingCancelledException' ||
          err.message?.includes('cancelled')
        ) {
          return;
        }
        console.error(`Failed to load page ${pageIndex + 1} rendering:`, err);
        if (active) {
          setError('Failed to load page rendering.');
        }
      }
    };

    loadPageData();

    return () => {
      active = false;
      renderOperation.cancel();
    };
  }, [pageIndex, pdfDoc, zoom]);

  return (
    <div
      ref={containerRef}
      className="relative mx-auto my-6 bg-white dark:bg-neutral-950 shadow-lg border border-neutral-200 dark:border-neutral-800 rounded-lg select-none transition-colors"
      style={{
        width: scaledWidth,
        height: scaledHeight,
      }}
    >
      {/* 1. PDF.js Underlay Rendering */}
      <canvas
        ref={pdfCanvasRef}
        className="absolute inset-0 rounded-lg pointer-events-none"
        style={{
          width: scaledWidth,
          height: scaledHeight,
        }}
      />

      {/* 2. Fabric.js Interactivity Overlay */}
      {isRendered && dimensions && (
        <FabricCanvas
          pageIndex={pageIndex}
          width={dimensions.width}
          height={dimensions.height}
        />
      )}

      {/* 3. Loading Overlay */}
      {!isRendered && !error && (
        <div className="absolute inset-0 bg-neutral-50/70 dark:bg-neutral-900/70 backdrop-blur-xs flex flex-col items-center justify-center rounded-lg transition-all">
          <Loader2 className="animate-spin text-emerald-500 mb-2" size={28} />
          <span className="text-xs font-semibold text-neutral-500 dark:text-neutral-400">
            Rendering Page {pageIndex + 1}...
          </span>
        </div>
      )}

      {/* 4. Error Display */}
      {error && (
        <div className="absolute inset-0 bg-red-50 dark:bg-red-950/20 flex flex-col items-center justify-center rounded-lg text-center p-4">
          <span className="text-sm font-bold text-red-500 mb-1">Rendering Error</span>
          <span className="text-xs text-red-400">{error}</span>
        </div>
      )}
    </div>
  );
};
