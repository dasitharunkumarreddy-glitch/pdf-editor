/**
 * Converts scale-1 PDF viewport coordinates (origin top-left)
 * to Fabric.js canvas coordinates at the current scale.
 */
export function pdfToFabric(
  x: number,
  y: number,
  scale: number
): { x: number; y: number } {
  return {
    x: x * scale,
    y: y * scale,
  };
}

/**
 * Converts Fabric.js canvas coordinates at current scale
 * to scale-1 PDF viewport coordinates (origin top-left).
 */
export function fabricToPdf(
  x: number,
  y: number,
  scale: number
): { x: number; y: number } {
  return {
    x: x / scale,
    y: y / scale,
  };
}

/**
 * Converts scale-1 PDF viewport coordinates (origin top-left)
 * to pdf-lib page coordinates (origin bottom-left).
 * 
 * @param x scale-1 viewport x
 * @param y scale-1 viewport y
 * @param height scale-1 viewport height of the text/object (needed to adjust for bottom-left origin)
 * @param pageHeight original height of the PDF page
 */
export function viewportToPdfLib(
  x: number,
  y: number,
  height: number,
  pageHeight: number
): { x: number; y: number } {
  return {
    x: x,
    y: pageHeight - y - height,
  };
}

/**
 * Converts pdf-lib page coordinates (origin bottom-left)
 * to scale-1 PDF viewport coordinates (origin top-left).
 */
export function pdfLibToViewport(
  x: number,
  y: number,
  height: number,
  pageHeight: number
): { x: number; y: number } {
  return {
    x: x,
    y: pageHeight - y - height,
  };
}
