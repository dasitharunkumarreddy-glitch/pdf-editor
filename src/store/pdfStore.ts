import { create } from 'zustand';
import type {
  PageDimensions,
  PdfTextItem,
  TextEdit,
  AnnotationItem,
  ToolType,
} from '../types/pdf';

interface HistoryState {
  textEdits: Record<number, Record<string, TextEdit>>;
  annotations: Record<number, AnnotationItem[]>;
}

interface PdfStore {
  // Document State
  file: File | null;
  fileName: string;
  fileBuffer: ArrayBuffer | null;
  pdfDoc: any | null; // PDF.js proxy document
  numPages: number;
  currentPage: number; // 0-indexed
  pagesDimensions: Record<number, PageDimensions>;
  pagesTextItems: Record<number, PdfTextItem[]>;
  loadingStatus: 'idle' | 'loading' | 'success' | 'error';
  loadingMessage: string;

  // View Settings
  zoom: number; // e.g. 1.0, 1.5
  zoomMode: 'fitWidth' | 'fitPage' | 'custom';
  activeTool: ToolType;
  brushColor: string;
  brushSize: number;
  selectedObjectId: string | null;
  searchQuery: string;
  isDarkMode: boolean;

  // Edits State
  textEdits: Record<number, Record<string, TextEdit>>; // pageIndex -> { editId -> TextEdit }
  annotations: Record<number, AnnotationItem[]>; // pageIndex -> annotations

  // Undo/Redo Stacks
  undoStack: HistoryState[];
  redoStack: HistoryState[];

  // Actions
  setFile: (file: File, buffer: ArrayBuffer, pdfDoc: any) => void;
  clearFile: () => void;
  setNumPages: (num: number) => void;
  setCurrentPage: (page: number) => void;
  setZoom: (zoom: number) => void;
  setZoomMode: (mode: 'fitWidth' | 'fitPage' | 'custom') => void;
  setActiveTool: (tool: ToolType) => void;
  setBrushColor: (color: string) => void;
  setBrushSize: (size: number) => void;
  setSelectedObjectId: (id: string | null) => void;
  setSearchQuery: (query: string) => void;
  toggleDarkMode: () => void;
  setLoading: (status: 'idle' | 'loading' | 'success' | 'error', message?: string) => void;
  
  // Page Data Ingestion
  setPageDimensions: (pageIndex: number, dims: PageDimensions) => void;
  setPageTextItems: (pageIndex: number, items: PdfTextItem[]) => void;

  // Edit Operations
  addTextEdit: (pageIndex: number, editId: string, edit: TextEdit) => void;
  addAnnotation: (pageIndex: number, annotation: AnnotationItem) => void;
  updateAnnotation: (pageIndex: number, id: string, updates: Partial<AnnotationItem>) => void;
  removeAnnotation: (pageIndex: number, id: string) => void;
  
  // History Operations
  saveHistory: () => void;
  undo: () => void;
  redo: () => void;
}

export const usePdfStore = create<PdfStore>((set, get) => ({
  // Initial Document State
  file: null,
  fileName: '',
  fileBuffer: null,
  pdfDoc: null,
  numPages: 0,
  currentPage: 0,
  pagesDimensions: {},
  pagesTextItems: {},
  loadingStatus: 'idle',
  loadingMessage: '',

  // Initial View Settings
  zoom: 1.0,
  zoomMode: 'fitWidth',
  activeTool: 'select',
  brushColor: '#10b981', // emerald-500 standard accent
  brushSize: 4,
  selectedObjectId: null,
  searchQuery: '',
  isDarkMode: false,

  // Initial Edits State
  textEdits: {},
  annotations: {},

  // Undo/Redo Stacks
  undoStack: [],
  redoStack: [],

  // Setters
  setFile: (file, buffer, pdfDoc) => {
    set({
      file,
      fileName: file.name,
      fileBuffer: buffer,
      pdfDoc,
      numPages: 0,
      currentPage: 0,
      pagesDimensions: {},
      pagesTextItems: {},
      textEdits: {},
      annotations: {},
      undoStack: [],
      redoStack: [],
      loadingStatus: 'success',
      loadingMessage: '',
    });
  },

  clearFile: () => {
    set({
      file: null,
      fileName: '',
      fileBuffer: null,
      pdfDoc: null,
      numPages: 0,
      currentPage: 0,
      pagesDimensions: {},
      pagesTextItems: {},
      textEdits: {},
      annotations: {},
      undoStack: [],
      redoStack: [],
      loadingStatus: 'idle',
    });
  },

  setNumPages: (num) => set({ numPages: num }),
  setCurrentPage: (page) => set({ currentPage: Math.max(0, Math.min(page, get().numPages - 1)) }),
  setZoom: (zoom) => set({ zoom: Math.max(0.2, Math.min(zoom, 4.0)) }),
  setZoomMode: (zoomMode) => set({ zoomMode }),
  setActiveTool: (activeTool) => set({ activeTool, selectedObjectId: null }),
  setBrushColor: (brushColor) => set({ brushColor }),
  setBrushSize: (brushSize) => set({ brushSize }),
  setSelectedObjectId: (selectedObjectId) => set({ selectedObjectId }),
  setSearchQuery: (searchQuery) => set({ searchQuery }),
  toggleDarkMode: () => set((state) => ({ isDarkMode: !state.isDarkMode })),
  
  setLoading: (status, message = '') => set({ loadingStatus: status, loadingMessage: message }),

  setPageDimensions: (pageIndex, dims) =>
    set((state) => ({
      pagesDimensions: { ...state.pagesDimensions, [pageIndex]: dims },
    })),

  setPageTextItems: (pageIndex, items) =>
    set((state) => ({
      pagesTextItems: { ...state.pagesTextItems, [pageIndex]: items },
    })),

  // Edit Operations
  addTextEdit: (pageIndex, editId, edit) => {
    get().saveHistory();
    set((state) => {
      const pageEdits = state.textEdits[pageIndex] || {};
      return {
        textEdits: {
          ...state.textEdits,
          [pageIndex]: {
            ...pageEdits,
            [editId]: edit,
          },
        },
      };
    });
  },

  addAnnotation: (pageIndex, annotation) => {
    get().saveHistory();
    set((state) => {
      const pageAnns = state.annotations[pageIndex] || [];
      return {
        annotations: {
          ...state.annotations,
          [pageIndex]: [...pageAnns, annotation],
        },
      };
    });
  },

  updateAnnotation: (pageIndex, id, updates) => {
    get().saveHistory();
    set((state) => {
      const pageAnns = state.annotations[pageIndex] || [];
      const updatedAnns = pageAnns.map((ann) =>
        ann.id === id ? ({ ...ann, ...updates } as AnnotationItem) : ann
      );
      return {
        annotations: {
          ...state.annotations,
          [pageIndex]: updatedAnns,
        },
      };
    });
  },

  removeAnnotation: (pageIndex, id) => {
    get().saveHistory();
    set((state) => {
      const pageAnns = state.annotations[pageIndex] || [];
      return {
        annotations: {
          ...state.annotations,
          [pageIndex]: pageAnns.filter((ann) => ann.id !== id),
        },
      };
    });
  },

  // History Operations
  saveHistory: () => {
    const { textEdits, annotations } = get();
    // Deep clone state to push to undo stack
    const snapshot: HistoryState = JSON.parse(
      JSON.stringify({ textEdits, annotations })
    );

    set((state) => ({
      undoStack: [...state.undoStack, snapshot].slice(-50), // Cap history at 50 states
      redoStack: [], // Clear redo stack on new action
    }));
  },

  undo: () => {
    const { undoStack, textEdits, annotations } = get();
    if (undoStack.length === 0) return;

    const previous = undoStack[undoStack.length - 1];
    const newUndoStack = undoStack.slice(0, -1);
    const currentSnapshot: HistoryState = JSON.parse(
      JSON.stringify({ textEdits, annotations })
    );

    set({
      textEdits: previous.textEdits,
      annotations: previous.annotations,
      undoStack: newUndoStack,
      redoStack: [...get().redoStack, currentSnapshot],
    });
  },

  redo: () => {
    const { redoStack, textEdits, annotations } = get();
    if (redoStack.length === 0) return;

    const next = redoStack[redoStack.length - 1];
    const newRedoStack = redoStack.slice(0, -1);
    const currentSnapshot: HistoryState = JSON.parse(
      JSON.stringify({ textEdits, annotations })
    );

    set({
      textEdits: next.textEdits,
      annotations: next.annotations,
      undoStack: [...get().undoStack, currentSnapshot],
      redoStack: newRedoStack,
    });
  },
}));
