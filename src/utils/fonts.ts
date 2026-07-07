// Standard Font mappings from pdf-lib
// Since pdf-lib relies on standard PDF fonts or embedded custom TTF files,
// we map browser-rendered fonts to the 14 standard PDF fonts.

export const STANDARD_FONTS = {
  HELVETICA: 'Helvetica',
  HELVETICA_BOLD: 'Helvetica-Bold',
  HELVETICA_OBLIQUE: 'Helvetica-Oblique',
  HELVETICA_BOLD_OBLIQUE: 'Helvetica-BoldOblique',
  TIMES_ROMAN: 'Times-Roman',
  TIMES_BOLD: 'Times-Bold',
  TIMES_ITALIC: 'Times-Italic',
  TIMES_BOLD_ITALIC: 'Times-BoldItalic',
  COURIER: 'Courier',
  COURIER_BOLD: 'Courier-Bold',
  COURIER_OBLIQUE: 'Courier-Oblique',
  COURIER_BOLD_OBLIQUE: 'Courier-BoldOblique',
};

/**
 * Normalizes a font family name and maps it to a standard pdf-lib font.
 */
export function getStandardFontName(
  fontName: string,
  isBold = false,
  isItalic = false
): string {
  const normalized = fontName.toLowerCase();

  // 1. Detect Monospace
  if (
    normalized.includes('courier') ||
    normalized.includes('mono') ||
    normalized.includes('consolas') ||
    normalized.includes('fixed')
  ) {
    if (isBold && isItalic) return STANDARD_FONTS.COURIER_BOLD_OBLIQUE;
    if (isBold) return STANDARD_FONTS.COURIER_BOLD;
    if (isItalic) return STANDARD_FONTS.COURIER_OBLIQUE;
    return STANDARD_FONTS.COURIER;
  }

  // 2. Detect Serif
  if (
    normalized.includes('times') ||
    normalized.includes('serif') ||
    normalized.includes('georgia') ||
    normalized.includes('cambria') ||
    normalized.includes('roman')
  ) {
    if (isBold && isItalic) return STANDARD_FONTS.TIMES_BOLD_ITALIC;
    if (isBold) return STANDARD_FONTS.TIMES_BOLD;
    if (isItalic) return STANDARD_FONTS.TIMES_ITALIC;
    return STANDARD_FONTS.TIMES_ROMAN;
  }

  // 3. Default to Sans-Serif (Helvetica)
  if (isBold && isItalic) return STANDARD_FONTS.HELVETICA_BOLD_OBLIQUE;
  if (isBold) return STANDARD_FONTS.HELVETICA_BOLD;
  if (isItalic) return STANDARD_FONTS.HELVETICA_OBLIQUE;
  return STANDARD_FONTS.HELVETICA;
}

/**
 * Maps standard pdf-lib font back to HTML font family stack.
 */
export function getCssFontFamily(standardFont: string): string {
  if (standardFont.startsWith('Courier')) {
    return 'Courier New, Courier, monospace';
  }
  if (standardFont.startsWith('Times')) {
    return 'Times New Roman, Times, serif';
  }
  return 'Helvetica, Arial, sans-serif';
}

/**
 * Check if the font name returned by PDF.js contains indicators of bold/italic.
 */
export function parseFontWeightAndStyle(fontName: string): {
  isBold: boolean;
  isItalic: boolean;
} {
  const normalized = fontName.toLowerCase();
  const isBold =
    normalized.includes('bold') ||
    normalized.includes('black') ||
    normalized.includes('w7') ||
    normalized.includes('w8') ||
    normalized.includes('w9') ||
    false;
  const isItalic =
    normalized.includes('italic') ||
    normalized.includes('oblique') ||
    normalized.includes('slanted') ||
    false;

  return { isBold, isItalic };
}
