export interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Point {
  x: number;
  y: number;
}

/**
 * Convert canvas screen pixels to standard PDF points.
 */
export function screenToPdf(val: number, scale: number): number {
  if (scale <= 0) return val;
  return Number((val / scale).toFixed(2));
}

/**
 * Convert standard PDF points to canvas screen pixels.
 */
export function pdfToScreen(val: number, scale: number): number {
  return Number((val * scale).toFixed(2));
}

/**
 * Convert bounding box from screen pixels to PDF points.
 */
export function screenBoxToPdfBox(box: Box, scale: number): Box {
  return {
    x: screenToPdf(box.x, scale),
    y: screenToPdf(box.y, scale),
    width: Math.max(1, screenToPdf(box.width, scale)),
    height: Math.max(1, screenToPdf(box.height, scale)),
  };
}

/**
 * Convert bounding box from PDF points to screen pixels.
 */
export function pdfBoxToScreenBox(box: Box, scale: number): Box {
  return {
    x: pdfToScreen(box.x, scale),
    y: pdfToScreen(box.y, scale),
    width: Math.max(1, pdfToScreen(box.width, scale)),
    height: Math.max(1, pdfToScreen(box.height, scale)),
  };
}

/**
 * Convert array of points from screen coordinates to PDF coordinates.
 */
export function screenPointsToPdfPoints(points: Point[], scale: number): Point[] {
  return points.map((p) => ({
    x: screenToPdf(p.x, scale),
    y: screenToPdf(p.y, scale),
  }));
}

/**
 * Convert array of points from PDF coordinates to screen coordinates.
 */
export function pdfPointsToScreenPoints(points: Point[], scale: number): Point[] {
  return points.map((p) => ({
    x: pdfToScreen(p.x, scale),
    y: pdfToScreen(p.y, scale),
  }));
}
