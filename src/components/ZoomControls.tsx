import React from 'react';
import { usePdfStore } from '../store/pdfStore';
import { ZoomIn, ZoomOut, Maximize2, Minimize2 } from 'lucide-react';

export const ZoomControls: React.FC = () => {
  const { zoom, zoomMode, setZoom, setZoomMode } = usePdfStore();

  const handleZoomIn = () => {
    setZoomMode('custom');
    setZoom(zoom + 0.1);
  };

  const handleZoomOut = () => {
    setZoomMode('custom');
    setZoom(zoom - 0.1);
  };

  const handleFitWidth = () => {
    setZoomMode('fitWidth');
  };

  const handleFitPage = () => {
    setZoomMode('fitPage');
  };

  return (
    <div className="flex items-center gap-1 bg-neutral-100 dark:bg-neutral-800 p-1 rounded-lg border border-neutral-200 dark:border-neutral-700">
      <button
        onClick={handleZoomOut}
        title="Zoom Out"
        className="p-1.5 rounded hover:bg-neutral-200 dark:hover:bg-neutral-750 text-neutral-600 dark:text-neutral-350 transition-colors"
      >
        <ZoomOut size={16} />
      </button>

      <span className="text-xs font-semibold px-2 min-w-[50px] text-center text-neutral-700 dark:text-neutral-300 select-none">
        {Math.round(zoom * 100)}%
      </span>

      <button
        onClick={handleZoomIn}
        title="Zoom In"
        className="p-1.5 rounded hover:bg-neutral-200 dark:hover:bg-neutral-750 text-neutral-600 dark:text-neutral-350 transition-colors"
      >
        <ZoomIn size={16} />
      </button>

      <div className="w-[1px] h-4 bg-neutral-250 dark:bg-neutral-700 mx-1"></div>

      <button
        onClick={handleFitWidth}
        title="Fit Page Width"
        className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors ${
          zoomMode === 'fitWidth'
            ? 'bg-emerald-500 text-white shadow-sm'
            : 'hover:bg-neutral-200 dark:hover:bg-neutral-750 text-neutral-600 dark:text-neutral-350'
        }`}
      >
        <Maximize2 size={12} />
        <span>Fit Width</span>
      </button>

      <button
        onClick={handleFitPage}
        title="Fit Whole Page"
        className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors ${
          zoomMode === 'fitPage'
            ? 'bg-emerald-500 text-white shadow-sm'
            : 'hover:bg-neutral-200 dark:hover:bg-neutral-750 text-neutral-600 dark:text-neutral-350'
        }`}
      >
        <Minimize2 size={12} />
        <span>Fit Page</span>
      </button>
    </div>
  );
};
