import React from 'react';
import { usePdfStore } from '../store/pdfStore';
import { Toolbar } from '../components/Toolbar';
import { Sidebar } from '../components/Sidebar';
import { PdfViewer } from '../components/PdfViewer';
import { MousePointer, FileText, Info } from 'lucide-react';

export const Editor: React.FC = () => {
  const { file, currentPage, numPages, zoom, activeTool } = usePdfStore();

  if (!file) return null;

  return (
    <div className="flex-1 w-full h-full flex flex-col bg-neutral-100 dark:bg-neutral-950 overflow-hidden select-none transition-colors">
      
      {/* Top Work Options Toolbar */}
      <Toolbar />

      {/* Main Workbench Body */}
      <div className="flex-1 flex w-full min-h-0 relative">
        {/* Left Thumbnails & Search Panel */}
        <Sidebar />

        {/* Center Page Viewer Canvas */}
        <PdfViewer />
      </div>

      {/* Status Bar */}
      <div className="h-7 bg-white dark:bg-neutral-900 border-t border-neutral-250 dark:border-neutral-800 flex items-center justify-between px-4 text-[11px] font-semibold text-neutral-500 dark:text-neutral-450 shrink-0 z-30 transition-colors">
        
        {/* File Page Indicators */}
        <div className="flex items-center gap-1">
          <FileText size={12} className="text-emerald-500" />
          <span>
            Page {currentPage + 1} of {numPages}
          </span>
        </div>

        {/* Status Mode message */}
        <div className="hidden sm:flex items-center gap-1.5">
          <MousePointer size={11} />
          <span className="capitalize">
            Tool: {activeTool} Mode
          </span>
          <span className="mx-1">•</span>
          <span>Zoom: {Math.round(zoom * 100)}%</span>
        </div>

        {/* Client Only Warning */}
        <div className="flex items-center gap-1 text-neutral-400 dark:text-neutral-500">
          <Info size={11} />
          <span className="hidden md:inline">Your document stays local. Click 'Save PDF' to download.</span>
          <span className="md:hidden">Local environment</span>
        </div>

      </div>

    </div>
  );
};
