import type { PdfTextItem } from '../types/pdf';

/**
 * Groups raw PDF.js text items into cohesive blocks/lines.
 * This prevents single letters or fragmented words from creating hundreds of individual textboxes.
 */
export function groupTextItems(
  items: PdfTextItem[],
  pageIndex: number
): PdfTextItem[] {
  if (items.length === 0) return [];

  // 1. Filter out empty items
  const validItems = items.filter((item) => item.text.trim().length > 0);
  if (validItems.length === 0) return [];

  // Sort primarily by Y (top-to-bottom) and secondarily by X (left-to-right)
  // Since PDF coordinate math can have tiny precision variances, we will group rows using a threshold.
  const sorted = [...validItems].sort((a, b) => {
    const yDiff = a.y - b.y;
    if (Math.abs(yDiff) > 5) {
      return yDiff;
    }
    return a.x - b.x;
  });

  const lines: PdfTextItem[][] = [];
  let currentLine: PdfTextItem[] = [];

  for (const item of sorted) {
    if (currentLine.length === 0) {
      currentLine.push(item);
    } else {
      const prev = currentLine[currentLine.length - 1];
      const yDiff = Math.abs(item.y - prev.y);
      const isSameRotation = Math.abs(item.rotation - prev.rotation) < 2;

      // Group onto the same line if vertical difference is small (within 60% of font size)
      // and rotation is the same.
      const verticalThreshold = Math.min(prev.fontSize, item.fontSize) * 0.7;

      if (yDiff < verticalThreshold && isSameRotation) {
        currentLine.push(item);
      } else {
        lines.push(currentLine);
        currentLine = [item];
      }
    }
  }
  if (currentLine.length > 0) {
    lines.push(currentLine);
  }

  // 2. In each line, group adjacent items horizontally
  const groupedItems: PdfTextItem[] = [];

  lines.forEach((line) => {
    // Sort horizontal items left-to-right
    line.sort((a, b) => a.x - b.x);

    let currentGroup: PdfTextItem[] = [];

    for (const item of line) {
      if (currentGroup.length === 0) {
        currentGroup.push(item);
      } else {
        const prev = currentGroup[currentGroup.length - 1];
        const prevRight = prev.x + prev.width;
        const xDiff = item.x - prevRight;

        // Gap threshold for grouping words (approx 1.2 x font size)
        const gapThreshold = prev.fontSize * 1.2;

        if (xDiff >= -2 && xDiff < gapThreshold) {
          currentGroup.push(item);
        } else {
          groupedItems.push(mergeGroup(currentGroup, pageIndex, groupedItems.length));
          currentGroup = [item];
        }
      }
    }
    if (currentGroup.length > 0) {
      groupedItems.push(mergeGroup(currentGroup, pageIndex, groupedItems.length));
    }
  });

  return groupedItems;
}

/**
 * Merges a list of text items belonging to the same block into a single PdfTextItem.
 */
function mergeGroup(
  group: PdfTextItem[],
  pageIndex: number,
  index: number
): PdfTextItem {
  if (group.length === 1) {
    return {
      ...group[0],
      id: `text-${pageIndex}-${index}`,
    };
  }

  // Determine bounds
  const minX = Math.min(...group.map((g) => g.x));
  const minY = Math.min(...group.map((g) => g.y));
  const maxX = Math.max(...group.map((g) => g.x + g.width));
  const maxY = Math.max(...group.map((g) => g.y + g.height));

  const baseItem = group[0];
  const mergedText = group.map((g) => g.text).join('');

  return {
    id: `text-${pageIndex}-${index}`,
    pageIndex,
    text: mergedText,
    originalText: mergedText,
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
    fontSize: baseItem.fontSize,
    fontFamily: baseItem.fontFamily,
    fontWeight: baseItem.fontWeight,
    color: baseItem.color,
    rotation: baseItem.rotation,
  };
}
