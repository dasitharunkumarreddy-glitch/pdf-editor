import React, { useState } from 'react';
import { usePdfStore } from '../store/pdfStore';
import { exportPdfDocument } from '../services/exportPdf';
import { Download, Loader2 } from 'lucide-react';

export const SaveButton: React.FC = () => {
  const { fileBuffer, textEdits, annotations, pagesDimensions, fileName } = usePdfStore();
  const [isSaving, setIsSaving] = useState(false);

  const handleExport = async () => {
    if (!fileBuffer) return;

    // If a text field is still being edited, blur it so Fabric commits the change.
    const activeElement = document.activeElement as HTMLElement | null;
    if (activeElement?.blur) {
      activeElement.blur();
    }

    setIsSaving(true);
    try {
      // Small timeout to let the UI update and show loader
      await new Promise((resolve) => setTimeout(resolve, 50));

      const editedPdfBytes = await exportPdfDocument(
        fileBuffer,
        textEdits,
        annotations,
        pagesDimensions
      );

      // Create a Blob from the exact saved bytes
      const blob = new Blob([editedPdfBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);

      // Create a temporary link and click it to download
      const link = document.createElement('a');
      link.href = url;
      
      // Suffix filename to indicate edit
      const baseName = fileName.replace(/\.[^/.]+$/, "");
      link.download = `${baseName}_edited.pdf`;
      
      document.body.appendChild(link);
      link.click();
      
      // Cleanup
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to export edited PDF:', error);
      alert('An error occurred while compiling your PDF. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <button
      onClick={handleExport}
      disabled={!fileBuffer || isSaving}
      className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-semibold transition-all ${
        !fileBuffer
          ? 'bg-neutral-250 text-neutral-400 dark:bg-neutral-850 dark:text-neutral-600 cursor-not-allowed'
          : 'bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-white shadow-sm hover:shadow shadow-emerald-500/20'
      }`}
    >
      {isSaving ? (
        <>
          <Loader2 size={16} className="animate-spin" />
          <span>Exporting...</span>
        </>
      ) : (
        <>
          <Download size={16} />
          <span>Save PDF</span>
        </>
      )}
    </button>
  );
};
