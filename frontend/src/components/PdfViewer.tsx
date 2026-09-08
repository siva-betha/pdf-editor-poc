import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.js?url';
import { fabric } from 'fabric';
import { EditorObject, EditorObjectType, TextLineInfo, ToolType } from '../types/editor';
import { getPageTextLines } from '../services/api';
import { Loader2 } from 'lucide-react';

// Configure PDF.js worker locally
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

interface PdfViewerProps {
  documentId?: string | null;
  pdfUrl: string;
  currentPage: number;
  scale: number;
  activeTool: ToolType;
  onToolUsed: () => void;
  allObjects: EditorObject[];
  onUpdatePageObjects: (page: number, objects: EditorObject[]) => void;
  selectedObjectId: string | null;
  onSelectObject: (obj: EditorObject | null) => void;
  activeProperties: Record<string, any>;
  onSignatureRequested: () => void;
  signatureDataToInsert: string | null;
  onSignatureInserted: () => void;
}

export const PdfViewer: React.FC<PdfViewerProps> = ({
  documentId,
  pdfUrl,
  currentPage,
  scale,
  activeTool,
  onToolUsed,
  allObjects,
  onUpdatePageObjects,
  selectedObjectId,
  onSelectObject,
  activeProperties,
  onSignatureRequested,
  signatureDataToInsert,
  onSignatureInserted,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const pdfCanvasRef = useRef<HTMLCanvasElement>(null);
  const fabricCanvasRef = useRef<HTMLCanvasElement>(null);
  const fabricInstanceRef = useRef<fabric.Canvas | null>(null);

  const [pdfDoc, setPdfDoc] = useState<pdfjsLib.PDFDocumentProxy | null>(null);
  const [pageRendering, setPageRendering] = useState<boolean>(false);
  const [pageSize, setPageSize] = useState<{ width: number; height: number }>({ width: 612, height: 792 });
  const [extractedLines, setExtractedLines] = useState<TextLineInfo[]>([]);
  const [isLoadingText, setIsLoadingText] = useState<boolean>(false);

  // Fetch page text lines when 'edit_text' tool is selected
  useEffect(() => {
    if (activeTool !== 'edit_text' || !documentId) {
      setExtractedLines([]);
      return;
    }

    let isCancelled = false;
    setIsLoadingText(true);

    getPageTextLines(documentId, currentPage)
      .then((lines) => {
        if (!isCancelled) {
          setExtractedLines(lines);
        }
      })
      .catch((err) => {
        console.error('Failed to load text lines for editing:', err);
      })
      .finally(() => {
        if (!isCancelled) {
          setIsLoadingText(false);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [activeTool, documentId, currentPage]);

  // Load PDF Document
  useEffect(() => {
    let isCancelled = false;
    const loadPdf = async () => {
      try {
        const loadingTask = pdfjsLib.getDocument(pdfUrl);
        const doc = await loadingTask.promise;
        if (!isCancelled) {
          setPdfDoc(doc);
        }
      } catch (err) {
        console.error('Failed to load PDF document in viewer:', err);
      }
    };

    loadPdf();
    return () => {
      isCancelled = true;
    };
  }, [pdfUrl]);

  // Convert a Fabric object on canvas to our typed EditorObject in PDF points
  const fabricObjectToEditorObject = useCallback(
    (fObj: fabric.Object, page: number): EditorObject => {
      const data = (fObj as any).data || {};
      const id = data.id || `obj-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      const type: EditorObjectType = data.type || 'rectangle';

      const objScaleX = fObj.scaleX ?? 1;
      const objScaleY = fObj.scaleY ?? 1;
      const rawLeft = fObj.left ?? 0;
      const rawTop = fObj.top ?? 0;
      const rawWidth = (fObj.width ?? 10) * objScaleX;
      const rawHeight = (fObj.height ?? 10) * objScaleY;

      // Convert from screen canvas pixels to PDF points
      const x = Number((rawLeft / scale).toFixed(2));
      const y = Number((rawTop / scale).toFixed(2));
      const width = Math.max(1, Number((rawWidth / scale).toFixed(2)));
      const height = Math.max(1, Number((rawHeight / scale).toFixed(2)));
      const rotation = fObj.angle ?? 0;

      let properties: Record<string, any> = { ...(data.properties || {}) };

      if (type === 'text' || type === 'text_replace') {
        const tObj = fObj as fabric.IText;
        properties = {
          orig_bbox: data.properties?.orig_bbox,
          text: tObj.text ?? '',
          fontSize: Number(((tObj.fontSize ?? 16) / scale).toFixed(2)),
          font_size: Number(((tObj.fontSize ?? 16) / scale).toFixed(2)),
          fontFamily: tObj.fontFamily ?? 'Arial',
          font_family: tObj.fontFamily ?? 'Arial',
          fill: tObj.fill ?? '#000000',
          color: tObj.fill ?? '#000000',
          bg_color: data.properties?.bg_color || '#ffffff',
          fontWeight: tObj.fontWeight ?? 'normal',
          fontStyle: tObj.fontStyle ?? 'normal',
          underline: !!tObj.underline,
          opacity: tObj.opacity ?? 1,
        };
      } else if (type === 'highlight') {
        properties = {
          fill: fObj.fill ?? '#ffff00',
          opacity: fObj.opacity ?? 0.35,
        };
      } else if (type === 'rectangle') {
        properties = {
          stroke: fObj.stroke ?? '#000000',
          strokeWidth: Number(((fObj.strokeWidth ?? 2) / scale).toFixed(2)),
          fill: fObj.fill ?? 'transparent',
          opacity: fObj.opacity ?? 1,
        };
      } else if (type === 'ellipse') {
        properties = {
          stroke: fObj.stroke ?? '#000000',
          strokeWidth: Number(((fObj.strokeWidth ?? 2) / scale).toFixed(2)),
          fill: fObj.fill ?? 'transparent',
          opacity: fObj.opacity ?? 1,
        };
      } else if (type === 'drawing') {
        const poly = fObj as fabric.Polyline;
        const pts = poly.points || [];
        const pdfPts = pts.map((p) => ({
          x: Number((((fObj.left ?? 0) + p.x * objScaleX) / scale).toFixed(2)),
          y: Number((((fObj.top ?? 0) + p.y * objScaleY) / scale).toFixed(2)),
        }));
        properties = {
          stroke: fObj.stroke ?? '#000000',
          strokeWidth: Number(((fObj.strokeWidth ?? 2) / scale).toFixed(2)),
          opacity: fObj.opacity ?? 1,
          points: pdfPts,
        };
      } else if (type === 'signature') {
        properties = {
          image_data: data.properties?.image_data || '',
        };
      }

      return {
        id,
        page,
        type,
        x,
        y,
        width,
        height,
        rotation,
        properties,
      };
    },
    [scale]
  );

  // Sync canvas objects to state
  const syncCanvasToState = useCallback(() => {
    const fCanvas = fabricInstanceRef.current;
    if (!fCanvas) return;

    const canvasObjects = fCanvas.getObjects();
    const updated = canvasObjects.map((obj) => fabricObjectToEditorObject(obj, currentPage));
    onUpdatePageObjects(currentPage, updated);
  }, [currentPage, fabricObjectToEditorObject, onUpdatePageObjects]);

  // Handle clicking an existing text line to edit it in place
  const handleReplaceLineText = useCallback(
    (line: TextLineInfo) => {
      const fCanvas = fabricInstanceRef.current;
      if (!fCanvas) return;

      const left = line.bbox[0] * scale;
      const top = line.bbox[1] * scale;

      const itext = new fabric.IText(line.text, {
        left,
        top,
        fontSize: line.size * scale,
        fontFamily: line.font || 'Arial',
        fill: line.color || '#000000',
        backgroundColor: '#ffffff',
        data: {
          id: `replace-${line.id}-${Date.now()}`,
          type: 'text_replace',
          page: currentPage,
          properties: {
            orig_bbox: line.bbox,
            text: line.text,
            font_size: line.size,
            fontSize: line.size,
            font_family: line.font,
            fontFamily: line.font,
            color: line.color,
            fill: line.color,
            bg_color: '#ffffff',
          },
        },
      });

      fCanvas.add(itext);
      fCanvas.setActiveObject(itext);
      itext.enterEditing();
      itext.selectAll();
      fCanvas.renderAll();
      syncCanvasToState();
      onToolUsed(); // Switch back to 'select'
    },
    [scale, currentPage, syncCanvasToState, onToolUsed]
  );

  // Render PDF page onto background canvas and initialize Fabric canvas
  useEffect(() => {
    if (!pdfDoc) return;

    let isRenderCancelled = false;

    const renderPage = async () => {
      try {
        setPageRendering(true);
        const page = await pdfDoc.getPage(currentPage);
        const viewport = page.getViewport({ scale });

        setPageSize({ width: viewport.width, height: viewport.height });

        // Setup PDF Canvas
        const pdfCanvas = pdfCanvasRef.current;
        if (!pdfCanvas) return;
        const pdfCtx = pdfCanvas.getContext('2d');
        if (!pdfCtx) return;

        pdfCanvas.width = viewport.width;
        pdfCanvas.height = viewport.height;

        const renderContext = {
          canvasContext: pdfCtx,
          viewport: viewport,
        };

        await page.render(renderContext).promise;

        if (isRenderCancelled) return;

        // Setup or Resize Fabric Canvas
        let fCanvas = fabricInstanceRef.current;
        if (!fCanvas && fabricCanvasRef.current) {
          fCanvas = new fabric.Canvas(fabricCanvasRef.current, {
            width: viewport.width,
            height: viewport.height,
            selection: true,
            preserveObjectStacking: true,
          });
          fabricInstanceRef.current = fCanvas;

          // Attach Fabric Events
          fCanvas.on('selection:created', (e) => {
            const selected = e.selected?.[0];
            if (selected) {
              const edObj = fabricObjectToEditorObject(selected, currentPage);
              onSelectObject(edObj);
            }
          });

          fCanvas.on('selection:updated', (e) => {
            const selected = e.selected?.[0];
            if (selected) {
              const edObj = fabricObjectToEditorObject(selected, currentPage);
              onSelectObject(edObj);
            }
          });

          fCanvas.on('selection:cleared', () => {
            onSelectObject(null);
          });

          fCanvas.on('object:modified', () => {
            syncCanvasToState();
          });

          fCanvas.on('path:created', (opt: any) => {
            const pathObj = opt.path;
            if (!pathObj) return;

            // Extract points from path commands
            const rawPath = pathObj.path || [];
            const extractedPoints: { x: number; y: number }[] = [];
            for (const cmd of rawPath) {
              if (cmd[0] === 'M' || cmd[0] === 'L') {
                extractedPoints.push({ x: cmd[1], y: cmd[2] });
              } else if (cmd[0] === 'Q' || cmd[0] === 'C') {
                extractedPoints.push({ x: cmd[cmd.length - 2], y: cmd[cmd.length - 1] });
              }
            }

            pathObj.data = {
              id: `draw-${Date.now()}`,
              type: 'drawing',
              page: currentPage,
              properties: {
                stroke: pathObj.stroke || '#000000',
                strokeWidth: pathObj.strokeWidth || 2,
                opacity: pathObj.opacity ?? 1,
                points: extractedPoints,
              },
            };

            syncCanvasToState();
          });
        } else if (fCanvas) {
          fCanvas.setWidth(viewport.width);
          fCanvas.setHeight(viewport.height);
        }

        // Populate Fabric canvas with objects for the current page
        if (fCanvas) {
          fCanvas.clear();

          const pageObjects = allObjects.filter((o) => o.page === currentPage);
          for (const obj of pageObjects) {
            const left = obj.x * scale;
            const top = obj.y * scale;
            const width = obj.width * scale;
            const height = obj.height * scale;

            if (obj.type === 'text' || obj.type === 'text_replace') {
              const itext = new fabric.IText(obj.properties.text || '', {
                left,
                top,
                fontSize: (obj.properties.fontSize || obj.properties.font_size || 16) * scale,
                fontFamily: obj.properties.fontFamily || obj.properties.font_family || 'Arial',
                fill: obj.properties.fill || obj.properties.color || '#000000',
                backgroundColor: obj.type === 'text_replace' ? (obj.properties.bg_color || '#ffffff') : undefined,
                fontWeight: obj.properties.fontWeight || (obj.properties.bold ? 'bold' : 'normal'),
                fontStyle: obj.properties.fontStyle || (obj.properties.italic ? 'italic' : 'normal'),
                underline: !!obj.properties.underline,
                opacity: obj.properties.opacity ?? 1,
                data: { id: obj.id, type: obj.type, page: currentPage, properties: obj.properties },
              });
              fCanvas.add(itext);
            } else if (obj.type === 'highlight') {
              const rect = new fabric.Rect({
                left,
                top,
                width,
                height,
                fill: obj.properties.fill || '#ffff00',
                opacity: obj.properties.opacity ?? 0.35,
                strokeWidth: 0,
                data: { id: obj.id, type: 'highlight', page: currentPage, properties: obj.properties },
              });
              fCanvas.add(rect);
            } else if (obj.type === 'rectangle') {
              const rect = new fabric.Rect({
                left,
                top,
                width,
                height,
                stroke: obj.properties.stroke || '#000000',
                strokeWidth: (obj.properties.strokeWidth || 2) * scale,
                fill: obj.properties.fill || 'transparent',
                opacity: obj.properties.opacity ?? 1,
                data: { id: obj.id, type: 'rectangle', page: currentPage, properties: obj.properties },
              });
              fCanvas.add(rect);
            } else if (obj.type === 'ellipse') {
              const ellipse = new fabric.Ellipse({
                left,
                top,
                rx: width / 2,
                ry: height / 2,
                stroke: obj.properties.stroke || '#000000',
                strokeWidth: (obj.properties.strokeWidth || 2) * scale,
                fill: obj.properties.fill || 'transparent',
                opacity: obj.properties.opacity ?? 1,
                data: { id: obj.id, type: 'ellipse', page: currentPage, properties: obj.properties },
              });
              fCanvas.add(ellipse);
            } else if (obj.type === 'drawing') {
              const pts = (obj.properties.points || []).map((p: any) => ({
                x: p.x * scale - left,
                y: p.y * scale - top,
              }));
              if (pts.length > 0) {
                const poly = new fabric.Polyline(pts, {
                  left,
                  top,
                  stroke: obj.properties.stroke || '#000000',
                  strokeWidth: (obj.properties.strokeWidth || 2) * scale,
                  fill: 'transparent',
                  opacity: obj.properties.opacity ?? 1,
                  data: { id: obj.id, type: 'drawing', page: currentPage, properties: obj.properties },
                });
                fCanvas.add(poly);
              }
            } else if (obj.type === 'signature') {
              if (obj.properties.image_data) {
                fabric.Image.fromURL(obj.properties.image_data, (img) => {
                  img.set({
                    left,
                    top,
                    scaleX: width / (img.width || 1),
                    scaleY: height / (img.height || 1),
                    data: { id: obj.id, type: 'signature', page: currentPage, properties: obj.properties },
                  });
                  fCanvas?.add(img);
                  fCanvas?.renderAll();
                });
              }
            }
          }

          fCanvas.renderAll();
        }
      } catch (err) {
        console.error('Error rendering page:', err);
      } finally {
        setPageRendering(false);
      }
    };

    renderPage();

    return () => {
      isRenderCancelled = true;
    };
  }, [pdfDoc, currentPage, scale]); // re-run when page or scale changes

  // Handle Tool Changes & Creation
  useEffect(() => {
    const fCanvas = fabricInstanceRef.current;
    if (!fCanvas) return;

    if (activeTool === 'signature') {
      onSignatureRequested();
      return;
    }

    if (activeTool === 'draw') {
      fCanvas.isDrawingMode = true;
      if (!fCanvas.freeDrawingBrush) {
        fCanvas.freeDrawingBrush = new fabric.PencilBrush(fCanvas);
      }
      fCanvas.freeDrawingBrush.color = activeProperties.stroke || '#000000';
      fCanvas.freeDrawingBrush.width = (activeProperties.strokeWidth || 2) * scale;
      fCanvas.selection = false;
      return;
    }

    fCanvas.isDrawingMode = false;

    if (activeTool === 'select') {
      fCanvas.selection = true;
      fCanvas.defaultCursor = 'default';
      fCanvas.forEachObject((o) => {
        o.selectable = true;
        o.evented = true;
      });
      return;
    }

    // Shapes & Text Tools: Click or drag on canvas creates element
    fCanvas.selection = false;
    fCanvas.defaultCursor = 'crosshair';

    let isDrawingShape = false;
    let startX = 0;
    let startY = 0;
    let activeShape: fabric.Object | null = null;

    const cleanupListeners = () => {
      fCanvas.off('mouse:down', handleMouseDown);
      fCanvas.off('mouse:move', handleMouseMove);
      fCanvas.off('mouse:up', handleMouseUp);
    };

    const handleMouseDown = (opt: fabric.IEvent) => {
      if (opt.target) return;

      const pointer = fCanvas.getPointer(opt.e);
      startX = pointer.x;
      startY = pointer.y;

      if (activeTool === 'text') {
        const itext = new fabric.IText('Double click to edit', {
          left: startX,
          top: startY,
          fontSize: (activeProperties.fontSize || 16) * scale,
          fontFamily: activeProperties.fontFamily || 'Arial',
          fill: activeProperties.fill || '#000000',
          fontWeight: activeProperties.fontWeight || 'normal',
          fontStyle: activeProperties.fontStyle || 'normal',
          underline: !!activeProperties.underline,
          opacity: activeProperties.opacity ?? 1,
          data: {
            id: `txt-${Date.now()}`,
            type: 'text',
            page: currentPage,
            properties: { ...activeProperties, text: 'Double click to edit' },
          },
        });
        fCanvas.add(itext);
        fCanvas.setActiveObject(itext);
        itext.enterEditing();
        itext.selectAll();
        fCanvas.renderAll();
        syncCanvasToState();
        cleanupListeners();
        onToolUsed();
        return;
      }

      isDrawingShape = true;

      if (activeTool === 'highlight') {
        activeShape = new fabric.Rect({
          left: startX,
          top: startY,
          width: 0,
          height: 0,
          fill: activeProperties.fill || '#ffff00',
          opacity: activeProperties.opacity ?? 0.35,
          strokeWidth: 0,
          data: {
            id: `hl-${Date.now()}`,
            type: 'highlight',
            page: currentPage,
            properties: { fill: activeProperties.fill || '#ffff00', opacity: activeProperties.opacity ?? 0.35 },
          },
        });
        fCanvas.add(activeShape);
      } else if (activeTool === 'rectangle') {
        activeShape = new fabric.Rect({
          left: startX,
          top: startY,
          width: 0,
          height: 0,
          stroke: activeProperties.stroke || '#000000',
          strokeWidth: (activeProperties.strokeWidth || 2) * scale,
          fill: activeProperties.fill || 'transparent',
          opacity: activeProperties.opacity ?? 1,
          data: {
            id: `rect-${Date.now()}`,
            type: 'rectangle',
            page: currentPage,
            properties: { ...activeProperties },
          },
        });
        fCanvas.add(activeShape);
      } else if (activeTool === 'circle') {
        activeShape = new fabric.Ellipse({
          left: startX,
          top: startY,
          rx: 0,
          ry: 0,
          stroke: activeProperties.stroke || '#000000',
          strokeWidth: (activeProperties.strokeWidth || 2) * scale,
          fill: activeProperties.fill || 'transparent',
          opacity: activeProperties.opacity ?? 1,
          data: {
            id: `circle-${Date.now()}`,
            type: 'ellipse',
            page: currentPage,
            properties: { ...activeProperties },
          },
        });
        fCanvas.add(activeShape);
      }
    };

    const handleMouseMove = (opt: fabric.IEvent) => {
      if (!isDrawingShape || !activeShape) return;
      const pointer = fCanvas.getPointer(opt.e);
      const curX = pointer.x;
      const curY = pointer.y;

      const left = Math.min(startX, curX);
      const top = Math.min(startY, curY);
      const w = Math.abs(startX - curX);
      const h = Math.abs(startY - curY);

      if (activeTool === 'circle') {
        (activeShape as fabric.Ellipse).set({
          left,
          top,
          rx: w / 2,
          ry: h / 2,
        });
      } else {
        activeShape.set({
          left,
          top,
          width: w,
          height: h,
        });
      }
      fCanvas.renderAll();
    };

    const handleMouseUp = () => {
      if (!isDrawingShape) return;
      isDrawingShape = false;

      if (activeShape) {
        // If user just clicked without dragging (tiny size), give default nice size
        if (activeTool === 'circle') {
          const el = activeShape as fabric.Ellipse;
          if ((el.rx || 0) < 5 && (el.ry || 0) < 5) {
            el.set({
              left: startX - 45 * scale,
              top: startY - 45 * scale,
              rx: 45 * scale,
              ry: 45 * scale,
            });
          }
        } else {
          if ((activeShape.width || 0) < 10 && (activeShape.height || 0) < 10) {
            const defW = activeTool === 'highlight' ? 150 * scale : 120 * scale;
            const defH = activeTool === 'highlight' ? 24 * scale : 80 * scale;
            activeShape.set({
              left: startX,
              top: startY,
              width: defW,
              height: defH,
            });
          }
        }

        activeShape.setCoords();
        fCanvas.setActiveObject(activeShape);
        fCanvas.renderAll();
        syncCanvasToState();
      }

      cleanupListeners();
      onToolUsed();
    };

    fCanvas.on('mouse:down', handleMouseDown);
    fCanvas.on('mouse:move', handleMouseMove);
    fCanvas.on('mouse:up', handleMouseUp);

    return cleanupListeners;
  }, [activeTool, activeProperties, scale, currentPage, onToolUsed, onSignatureRequested, syncCanvasToState]);

  // Insert signature when user saves one in SignaturePad
  useEffect(() => {
    if (!signatureDataToInsert) return;
    const fCanvas = fabricInstanceRef.current;
    if (!fCanvas) return;

    fabric.Image.fromURL(signatureDataToInsert, (img) => {
      const targetWidth = 160 * scale;
      const aspect = (img.width || 1) / (img.height || 1);
      const targetHeight = targetWidth / aspect;

      img.set({
        left: (pageSize.width - targetWidth) / 2,
        top: (pageSize.height - targetHeight) / 2,
        scaleX: targetWidth / (img.width || 1),
        scaleY: targetHeight / (img.height || 1),
        data: {
          id: `sig-${Date.now()}`,
          type: 'signature',
          page: currentPage,
          properties: { image_data: signatureDataToInsert },
        },
      });

      fCanvas.add(img);
      fCanvas.setActiveObject(img);
      fCanvas.renderAll();
      syncCanvasToState();
      onSignatureInserted();
      onToolUsed();
    });
  }, [signatureDataToInsert, scale, currentPage, pageSize, onSignatureInserted, onToolUsed, syncCanvasToState]);

  // Update selected object properties from PropertiesPanel
  useEffect(() => {
    const fCanvas = fabricInstanceRef.current;
    if (!fCanvas || !selectedObjectId) return;

    const activeObj = fCanvas.getActiveObject();
    if (!activeObj || (activeObj as any).data?.id !== selectedObjectId) return;

    const type = (activeObj as any).data?.type;

    if (type === 'text' || type === 'text_replace') {
      const tObj = activeObj as fabric.IText;
      if (activeProperties.text !== undefined) tObj.set('text', activeProperties.text);
      if (activeProperties.fontFamily !== undefined) tObj.set('fontFamily', activeProperties.fontFamily);
      if (activeProperties.fontSize !== undefined) tObj.set('fontSize', activeProperties.fontSize * scale);
      if (activeProperties.fill !== undefined) tObj.set('fill', activeProperties.fill);
      if (activeProperties.fontWeight !== undefined) tObj.set('fontWeight', activeProperties.fontWeight);
      if (activeProperties.fontStyle !== undefined) tObj.set('fontStyle', activeProperties.fontStyle);
      if (activeProperties.underline !== undefined) tObj.set('underline', activeProperties.underline);
      if (activeProperties.opacity !== undefined) tObj.set('opacity', activeProperties.opacity);
    } else if (type === 'highlight') {
      if (activeProperties.fill !== undefined) activeObj.set('fill', activeProperties.fill);
      if (activeProperties.opacity !== undefined) activeObj.set('opacity', activeProperties.opacity);
    } else if (type === 'rectangle' || type === 'ellipse') {
      if (activeProperties.stroke !== undefined) activeObj.set('stroke', activeProperties.stroke);
      if (activeProperties.strokeWidth !== undefined)
        activeObj.set('strokeWidth', activeProperties.strokeWidth * scale);
      if (activeProperties.fill !== undefined) activeObj.set('fill', activeProperties.fill);
      if (activeProperties.opacity !== undefined) activeObj.set('opacity', activeProperties.opacity);
    } else if (type === 'drawing') {
      if (activeProperties.stroke !== undefined) activeObj.set('stroke', activeProperties.stroke);
      if (activeProperties.strokeWidth !== undefined)
        activeObj.set('strokeWidth', activeProperties.strokeWidth * scale);
      if (activeProperties.opacity !== undefined) activeObj.set('opacity', activeProperties.opacity);
    }

    fCanvas.renderAll();
    syncCanvasToState();
  }, [activeProperties, selectedObjectId, scale, syncCanvasToState]);

  return (
    <div
      ref={containerRef}
      className="flex-1 overflow-auto bg-slate-950 flex items-center justify-center p-8 relative select-none"
    >
      <div
        className="relative shadow-2xl rounded-sm transition-all duration-150"
        style={{ width: pageSize.width, height: pageSize.height }}
      >
        {/* PDF base canvas */}
        <canvas
          ref={pdfCanvasRef}
          className="absolute inset-0 block bg-white pointer-events-none rounded-sm"
        />

        {/* Fabric editable overlay canvas */}
        <div className="absolute inset-0">
          <canvas ref={fabricCanvasRef} />
        </div>

        {/* Interactive Text Lines Layer for 'edit_text' tool */}
        {activeTool === 'edit_text' && (
          <div className="absolute inset-0 z-20 pointer-events-auto">
            {isLoadingText ? (
              <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-slate-900/90 border border-blue-500/50 text-blue-400 px-4 py-2 rounded-full text-xs font-medium shadow-lg flex items-center gap-2">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Detecting text on page {currentPage}...
              </div>
            ) : (
              <>
                <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-blue-600/95 text-white px-4 py-1.5 rounded-full text-xs font-semibold shadow-lg backdrop-blur-sm pointer-events-none flex items-center gap-2 z-30">
                  <span>Click any text block to edit it in place</span>
                  <span className="text-[10px] opacity-80">({extractedLines.length} lines found)</span>
                </div>
                {extractedLines.map((line) => {
                  const left = line.bbox[0] * scale;
                  const top = line.bbox[1] * scale;
                  const width = (line.bbox[2] - line.bbox[0]) * scale;
                  const height = (line.bbox[3] - line.bbox[1]) * scale;
                  return (
                    <button
                      key={line.id}
                      type="button"
                      onClick={() => handleReplaceLineText(line)}
                      title={`Click to edit: "${line.text}"`}
                      style={{
                        left,
                        top,
                        width: Math.max(16, width),
                        height: Math.max(14, height),
                      }}
                      className="absolute border border-blue-400/60 hover:border-blue-500 bg-blue-400/15 hover:bg-blue-500/30 rounded-[2px] transition-all cursor-text group"
                    >
                      <span className="sr-only">Edit: {line.text}</span>
                    </button>
                  );
                })}
              </>
            )}
          </div>
        )}

        {/* Page rendering indicator */}
        {pageRendering && (
          <div className="absolute inset-0 bg-white/40 backdrop-blur-[1px] flex items-center justify-center pointer-events-none z-10">
            <span className="text-xs font-medium text-slate-800 bg-white/90 px-3 py-1.5 rounded-full shadow border border-slate-200">
              Rendering Page {currentPage}...
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
