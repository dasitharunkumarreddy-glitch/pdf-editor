import React, { useRef, useState } from 'react';
import { usePdfStore } from '../store/pdfStore';
import { SaveButton } from './SaveButton';
import { ZoomControls } from './ZoomControls';
import { ThemeToggle } from './ThemeToggle';
import {
  MousePointer,
  Type,
  Highlighter,
  Pencil,
  Square,
  Circle as CircleIcon,
  Image as ImageIcon,
  PenTool,
  Undo2,
  Redo2,
  FolderOpen,
  X,
  Check,
} from 'lucide-react';

export const Toolbar: React.FC = () => {
  const {
    file,
    fileName,
    activeTool,
    setActiveTool,
    brushColor,
    setBrushColor,
    brushSize,
    setBrushSize,
    undo,
    redo,
    undoStack,
    redoStack,
    clearFile,
    addAnnotation,
    currentPage,
  } = usePdfStore();

  const imageInputRef = useRef<HTMLInputElement>(null);
  
  const [showSignatureModal, setShowSignatureModal] = useState(false);
  const sigCanvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawingSig, setIsDrawingSig] = useState(false);

  // Trigger loading new PDF
  const handleOpenClick = () => {
    clearFile();
  };

  // Image Upload Annotation
  const handleImageClick = () => {
    if (imageInputRef.current) {
      imageInputRef.current.click();
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (dataUrl) {
        addAnnotation(currentPage, {
          id: `ann-image-${Date.now()}`,
          pageIndex: currentPage,
          type: 'image',
          x: 100, // default coordinates, user can drag/resize
          y: 100,
          width: 150,
          height: 100,
          dataUrl,
          color: 'transparent',
        });
        setActiveTool('select');
      }
    };
    reader.readAsDataURL(file);
    // Reset file input value
    e.target.value = '';
  };

  // Signature Draw Logic
  const startSigDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = sigCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawingSig(true);
  };

  const drawSig = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawingSig) return;
    const canvas = sigCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    ctx.lineTo(x, y);
    ctx.strokeStyle = '#000000'; // signatures are black
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();
  };

  const stopSigDrawing = () => {
    setIsDrawingSig(false);
  };

  const clearSigCanvas = () => {
    const canvas = sigCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  const insertSignature = () => {
    const canvas = sigCanvasRef.current;
    if (!canvas) return;

    // Check if canvas is blank
    const blank = document.createElement('canvas');
    blank.width = canvas.width;
    blank.height = canvas.height;
    if (canvas.toDataURL() === blank.toDataURL()) {
      alert('Please write a signature before inserting.');
      return;
    }

    const dataUrl = canvas.toDataURL();
    addAnnotation(currentPage, {
      id: `ann-sig-${Date.now()}`,
      pageIndex: currentPage,
      type: 'signature',
      x: 150,
      y: 200,
      width: 140,
      height: 60,
      dataUrl,
      color: '#000000',
    });
    
    setShowSignatureModal(false);
    setActiveTool('select');
  };

  return (
    <div className="h-14 bg-white dark:bg-neutral-900 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between px-4 select-none shrink-0 z-30 shadow-sm transition-colors">
      
      {/* File Controls */}
      <div className="flex items-center gap-3">
        <button
          onClick={handleOpenClick}
          title="Open New PDF"
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-sm font-medium hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 transition-colors border border-neutral-200 dark:border-neutral-700"
        >
          <FolderOpen size={16} />
          <span className="hidden sm:inline">Open</span>
        </button>

        <div className="hidden md:flex flex-col">
          <span className="text-xs font-semibold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider">Active File</span>
          <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300 truncate max-w-[200px]" title={fileName}>
            {fileName || 'No file selected'}
          </span>
        </div>
      </div>

      {/* Editing Toolbar */}
      {file && (
        <div className="flex items-center gap-1.5 bg-neutral-50 dark:bg-neutral-950 p-1 rounded-xl border border-neutral-100 dark:border-neutral-800">
          
          <button
            onClick={() => setActiveTool('select')}
            title="Select Mode (Esc)"
            className={`p-2 rounded-lg transition-all ${
              activeTool === 'select'
                ? 'bg-emerald-500 text-white shadow-sm'
                : 'text-neutral-600 dark:text-neutral-450 hover:bg-neutral-150 dark:hover:bg-neutral-800'
            }`}
          >
            <MousePointer size={16} />
          </button>

          <button
            onClick={() => setActiveTool('text')}
            title="Edit Original Text / Add Text"
            className={`p-2 rounded-lg transition-all ${
              activeTool === 'text'
                ? 'bg-emerald-500 text-white shadow-sm'
                : 'text-neutral-600 dark:text-neutral-450 hover:bg-neutral-150 dark:hover:bg-neutral-800'
            }`}
          >
            <Type size={16} />
          </button>

          <button
            onClick={() => setActiveTool('highlight')}
            title="Highlighter"
            className={`p-2 rounded-lg transition-all ${
              activeTool === 'highlight'
                ? 'bg-emerald-500 text-white shadow-sm'
                : 'text-neutral-600 dark:text-neutral-450 hover:bg-neutral-150 dark:hover:bg-neutral-800'
            }`}
          >
            <Highlighter size={16} />
          </button>

          <button
            onClick={() => setActiveTool('draw')}
            title="Brush Pen"
            className={`p-2 rounded-lg transition-all ${
              activeTool === 'draw'
                ? 'bg-emerald-500 text-white shadow-sm'
                : 'text-neutral-600 dark:text-neutral-450 hover:bg-neutral-150 dark:hover:bg-neutral-800'
            }`}
          >
            <Pencil size={16} />
          </button>

          <button
            onClick={() => setActiveTool('rect')}
            title="Rectangle Shape"
            className={`p-2 rounded-lg transition-all ${
              activeTool === 'rect'
                ? 'bg-emerald-500 text-white shadow-sm'
                : 'text-neutral-600 dark:text-neutral-450 hover:bg-neutral-150 dark:hover:bg-neutral-800'
            }`}
          >
            <Square size={16} />
          </button>

          <button
            onClick={() => setActiveTool('circle')}
            title="Circle Shape"
            className={`p-2 rounded-lg transition-all ${
              activeTool === 'circle'
                ? 'bg-emerald-500 text-white shadow-sm'
                : 'text-neutral-600 dark:text-neutral-450 hover:bg-neutral-150 dark:hover:bg-neutral-800'
            }`}
          >
            <CircleIcon size={16} />
          </button>

          <button
            onClick={handleImageClick}
            title="Insert Image"
            className="p-2 rounded-lg text-neutral-600 dark:text-neutral-450 hover:bg-neutral-150 dark:hover:bg-neutral-800 transition-colors"
          >
            <ImageIcon size={16} />
          </button>
          <input
            type="file"
            ref={imageInputRef}
            onChange={handleImageChange}
            accept="image/*"
            className="hidden"
          />

          <button
            onClick={() => {
              setShowSignatureModal(true);
            }}
            title="Signature Tool"
            className={`p-2 rounded-lg transition-all ${
              showSignatureModal
                ? 'bg-emerald-500 text-white shadow-sm'
                : 'text-neutral-600 dark:text-neutral-450 hover:bg-neutral-150 dark:hover:bg-neutral-800'
            }`}
          >
            <PenTool size={16} />
          </button>

          {/* Color & Size Brush properties if drawing */}
          {(activeTool === 'draw' || activeTool === 'highlight' || activeTool === 'rect' || activeTool === 'circle') && (
            <div className="flex items-center gap-1.5 ml-2 border-l border-neutral-200 dark:border-neutral-850 pl-2">
              <input
                type="color"
                value={brushColor}
                onChange={(e) => setBrushColor(e.target.value)}
                className="w-5 h-5 border-0 rounded cursor-pointer p-0 overflow-hidden"
                title="Brush/Border Color"
              />
              {activeTool === 'draw' && (
                <select
                  value={brushSize}
                  onChange={(e) => setBrushSize(Number(e.target.value))}
                  className="bg-transparent text-xs font-semibold rounded border border-neutral-200 dark:border-neutral-750 text-neutral-600 dark:text-neutral-300 p-0.5"
                  title="Brush Size"
                >
                  <option value={2}>2px</option>
                  <option value={4}>4px</option>
                  <option value={8}>8px</option>
                  <option value={12}>12px</option>
                </select>
              )}
            </div>
          )}

        </div>
      )}

      {/* Global Actions */}
      <div className="flex items-center gap-2">
        {file && (
          <div className="flex items-center gap-1">
            <button
              onClick={undo}
              disabled={undoStack.length === 0}
              title="Undo (Ctrl+Z)"
              className="p-2 rounded-lg text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
            >
              <Undo2 size={16} />
            </button>
            <button
              onClick={redo}
              disabled={redoStack.length === 0}
              title="Redo (Ctrl+Y)"
              className="p-2 rounded-lg text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
            >
              <Redo2 size={16} />
            </button>
          </div>
        )}

        {file && (
          <div className="hidden lg:flex">
            <ZoomControls />
          </div>
        )}

        <ThemeToggle />

        <SaveButton />
      </div>

      {/* Signature Modal Dialog */}
      {showSignatureModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in">
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 w-[450px] rounded-2xl overflow-hidden shadow-2xl p-6 relative">
            <button
              onClick={() => setShowSignatureModal(false)}
              className="absolute top-4 right-4 text-neutral-400 dark:text-neutral-500 hover:text-neutral-600 dark:hover:text-neutral-300"
            >
              <X size={20} />
            </button>

            <h3 className="text-lg font-bold text-neutral-900 dark:text-white mb-1">
              Draw Signature
            </h3>
            <p className="text-xs text-neutral-400 dark:text-neutral-500 mb-4">
              Draw inside the canvas below to sign your documents.
            </p>

            <div className="border border-neutral-200 dark:border-neutral-750 bg-neutral-50 dark:bg-neutral-950 rounded-xl overflow-hidden mb-4">
              <canvas
                ref={sigCanvasRef}
                width={400}
                height={180}
                className="cursor-crosshair w-full h-[180px]"
                onMouseDown={startSigDrawing}
                onMouseMove={drawSig}
                onMouseUp={stopSigDrawing}
                onMouseLeave={stopSigDrawing}
              />
            </div>

            <div className="flex items-center justify-between">
              <button
                onClick={clearSigCanvas}
                className="px-3.5 py-2 text-xs font-semibold text-neutral-500 hover:text-neutral-700 dark:text-neutral-450 dark:hover:text-neutral-250 transition-colors"
              >
                Clear Canvas
              </button>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowSignatureModal(false)}
                  className="px-4 py-2 rounded-lg text-xs font-semibold bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-750 text-neutral-700 dark:text-neutral-350 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={insertSignature}
                  className="flex items-center gap-1 px-4 py-2 rounded-lg text-xs font-semibold bg-emerald-500 hover:bg-emerald-600 text-white shadow-sm transition-colors"
                >
                  <Check size={14} />
                  <span>Insert Signature</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
