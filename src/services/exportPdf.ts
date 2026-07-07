import { PDFDocument, rgb, degrees } from 'pdf-lib';
import type { TextEdit, AnnotationItem, PageDimensions } from '../types/pdf';
import { getStandardFontName } from '../utils/fonts';
import { viewportToPdfLib } from '../utils/coordinates';

/**
 * Parses a hex or rgb/rgba color string into { r, g, b } normalized values (0 to 1).
 */
function parseColor(cssColor: string): { r: number; g: number; b: number } {
  const defaultColor = { r: 0, g: 0, b: 0 };
  
  if (!cssColor) return defaultColor;
  
  const trimmed = cssColor.trim().toLowerCase();

  // Hex format: #ffffff or #fff
  if (trimmed.startsWith('#')) {
    let hex = trimmed.slice(1);
    if (hex.length === 3) {
      hex = hex.split('').map((c) => c + c).join('');
    }
    if (hex.length === 6) {
      return {
        r: parseInt(hex.substring(0, 2), 16) / 255,
        g: parseInt(hex.substring(2, 4), 16) / 255,
        b: parseInt(hex.substring(4, 6), 16) / 255,
      };
    }
  }

  // RGB/RGBA format: rgb(255, 255, 255)
  if (trimmed.startsWith('rgb')) {
    const matches = trimmed.match(/\d+/g);
    if (matches && matches.length >= 3) {
      return {
        r: Math.min(255, parseInt(matches[0])) / 255,
        g: Math.min(255, parseInt(matches[1])) / 255,
        b: Math.min(255, parseInt(matches[2])) / 255,
      };
    }
  }

  // Named colors fallbacks
  if (trimmed === 'red') return { r: 1, g: 0, b: 0 };
  if (trimmed === 'green') return { r: 0, g: 1, b: 0 };
  if (trimmed === 'blue') return { r: 0, g: 0, b: 1 };
  if (trimmed === 'white') return { r: 1, g: 1, b: 1 };
  if (trimmed === 'black') return { r: 0, g: 0, b: 0 };
  if (trimmed === 'yellow') return { r: 1, g: 1, b: 0 };

  return defaultColor;
}

/**
 * Helper to parse base64 image string into mime type and raw bytes.
 */
function parseBase64Image(dataUrl: string): { type: 'png' | 'jpeg'; bytes: Uint8Array } {
  const matches = dataUrl.match(/^data:image\/([a-zA-Z+]+);base64,(.+)$/);
  if (!matches || matches.length !== 3) {
    throw new Error('Invalid image base64 format');
  }

  const typeStr = matches[1].toLowerCase();
  const type = typeStr.includes('png') ? 'png' : 'jpeg';
  const base64Str = matches[2];

  // Convert base64 to Uint8Array
  const binaryStr = atob(base64Str);
  const bytes = new Uint8Array(binaryStr.length);
  for (let i = 0; i < binaryStr.length; i++) {
    bytes[i] = binaryStr.charCodeAt(i);
  }

  return { type, bytes };
}

/**
 * Loads the original PDF document, applies text modifications and annotations,
 * and compiles a new PDF byte array.
 */
export async function exportPdfDocument(
  originalBuffer: ArrayBuffer,
  textEdits: Record<number, Record<string, TextEdit>>,
  annotations: Record<number, AnnotationItem[]>,
  _pagesDimensions: Record<number, PageDimensions>
): Promise<Uint8Array> {
  // Create a proper copy of the buffer to avoid detached ArrayBuffer issues.
  const bufferCopy = new Uint8Array(originalBuffer).buffer;
  const pdfDoc = await PDFDocument.load(bufferCopy);
  const pages = pdfDoc.getPages();

  for (let i = 0; i < pages.length; i++) {
    const page = pages[i];
    const pageHeight = page.getHeight();

    // 1. Process Text Edits
    const pageEdits = textEdits[i];
    if (pageEdits) {
      for (const editId of Object.keys(pageEdits)) {
        const edit = pageEdits[editId];
        
        // Convert y coordinate from scale-1 viewport (origin top-left)
        // to pdf-lib page units (origin bottom-left)
        const pos = viewportToPdfLib(edit.x, edit.y, edit.height, pageHeight);

        // A. Mask the original text by drawing a filled white rectangle
        // We slightly inflate the bounding box to fully cover anti-aliased font edges.
        page.drawRectangle({
          x: pos.x - 1,
          y: pos.y - 1,
          width: edit.width + 2,
          height: edit.height + 2,
          color: rgb(1, 1, 1), // standard white background cover-up
        });

        // B. Draw new text
        const standardFontName = getStandardFontName(edit.fontFamily, false, false);
        const font = await pdfDoc.embedFont(standardFontName);
        const color = parseColor(edit.color);

        // Adjust text baseline slightly upwards so it aligns vertically with the mask
        // Standard typography has font baselines at roughly 15-20% of font size from bottom.
        const baselineAdjustment = edit.fontSize * 0.15;

        page.drawText(edit.text, {
          x: pos.x,
          y: pos.y + baselineAdjustment,
          size: edit.fontSize,
          font: font,
          color: rgb(color.r, color.g, color.b),
          rotate: degrees(edit.rotation),
        });
      }
    }

    // 2. Process Annotations
    const pageAnns = annotations[i];
    if (pageAnns) {
      for (const ann of pageAnns) {
        const color = parseColor(ann.color);

        if (ann.type === 'highlight') {
          // Highlight annotations are transparent rectangles
          const pos = viewportToPdfLib(ann.x, ann.y, ann.height, pageHeight);
          page.drawRectangle({
            x: pos.x,
            y: pos.y,
            width: ann.width,
            height: ann.height,
            color: rgb(color.r, color.g, color.b),
            opacity: 0.45, // highlight opacity
          });
        } 
        else if (ann.type === 'rect') {
          const pos = viewportToPdfLib(ann.x, ann.y, ann.height, pageHeight);
          page.drawRectangle({
            x: pos.x,
            y: pos.y,
            width: ann.width,
            height: ann.height,
            borderColor: rgb(color.r, color.g, color.b),
            borderWidth: ann.strokeWidth || 2,
            // If background fill is defined, draw it white
            color: ann.fill ? rgb(1, 1, 1) : undefined,
          });
        } 
        else if (ann.type === 'circle') {
          // Draw an ellipse with matching widths and heights (radius = width / 2)
          const radiusX = ann.width / 2;
          const radiusY = ann.height / 2;
          // In pdf-lib, ellipses are positioned by their centers
          const centerX = ann.x + radiusX;
          const centerY = pageHeight - (ann.y + radiusY);
          
          page.drawEllipse({
            x: centerX,
            y: centerY,
            xScale: radiusX,
            yScale: radiusY,
            borderColor: rgb(color.r, color.g, color.b),
            borderWidth: ann.strokeWidth || 2,
            color: ann.fill ? rgb(1, 1, 1) : undefined,
          });
        } 
        else if (ann.type === 'image' || ann.type === 'signature') {
          // Embed image or signature base64
          try {
            const { type, bytes } = parseBase64Image(ann.dataUrl);
            const image = type === 'png' 
              ? await pdfDoc.embedPng(bytes)
              : await pdfDoc.embedJpg(bytes);

            const pos = viewportToPdfLib(ann.x, ann.y, ann.height, pageHeight);
            
            page.drawImage(image, {
              x: pos.x,
              y: pos.y,
              width: ann.width,
              height: ann.height,
            });
          } catch (err) {
            console.error('Failed to embed image annotation:', err);
          }
        }
        else if (ann.type === 'draw') {
          const pos = viewportToPdfLib(ann.x, ann.y, ann.height, pageHeight);
          
          try {
            page.drawSvgPath(ann.path, {
              x: pos.x,
              y: pos.y + ann.height, // SVG Y-axis is inverted relative to PDF page
              borderColor: rgb(color.r, color.g, color.b),
              borderWidth: ann.strokeWidth || 2,
              scale: 1,
            });
          } catch (err) {
            console.error('Failed to render freehand drawing path:', err);
          }
        }
      }
    }
  }

  // Save the PDF
  return await pdfDoc.save();
}
