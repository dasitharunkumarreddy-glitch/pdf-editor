export interface PdfTextItem {
  id: string;
  pageIndex: number;
  text: string;
  originalText: string;
  x: number; // PDF space points (origin top-left of standard scale-1 viewport)
  y: number; // PDF space points
  width: number;
  height: number;
  fontSize: number;
  fontFamily: string;
  fontWeight: string;
  color: string; // hex or rgb
  rotation: number; // in degrees
}

export interface TextEdit {
  id: string; // maps to PdfTextItem id
  pageIndex: number;
  text: string;
  originalText: string;
  x: number; // Original x-coordinate in PDF points (relative to top-left)
  y: number; // Original y-coordinate in PDF points (relative to top-left)
  width: number;
  height: number;
  fontSize: number;
  fontFamily: string;
  color: string;
  rotation: number;
}

export type ToolType = 'select' | 'text' | 'highlight' | 'draw' | 'rect' | 'circle' | 'image' | 'signature';

export interface BaseAnnotation {
  id: string;
  pageIndex: number;
  type: ToolType;
  color: string;
  opacity?: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface DrawingAnnotation extends BaseAnnotation {
  type: 'draw';
  path: string; // SVG path data or Fabric JSON object serialization
  strokeWidth: number;
}

export interface HighlightAnnotation extends BaseAnnotation {
  type: 'highlight';
}

export interface ShapeAnnotation extends BaseAnnotation {
  type: 'rect' | 'circle';
  strokeWidth: number;
  fill?: string;
}

export interface ImageAnnotation extends BaseAnnotation {
  type: 'image';
  dataUrl: string; // Base64 data url of the image
}

export interface SignatureAnnotation extends BaseAnnotation {
  type: 'signature';
  dataUrl: string; // Base64 PNG path data
}

export type AnnotationItem =
  | DrawingAnnotation
  | HighlightAnnotation
  | ShapeAnnotation
  | ImageAnnotation
  | SignatureAnnotation;

export interface PageDimensions {
  width: number; // original PDF points width
  height: number; // original PDF points height
  rotation: number; // orientation angle
}

export interface PdfFileState {
  file: File | null;
  name: string;
  buffer: ArrayBuffer | null;
  numPages: number;
  pagesDimensions: Record<number, PageDimensions>;
  pagesTextItems: Record<number, PdfTextItem[]>;
}
