import React, { useEffect, useRef } from 'react';
import { Canvas, Ellipse, FabricImage, Path, Rect, Textbox } from 'fabric';
import { usePdfStore } from '../store/pdfStore';
import { getCssFontFamily } from '../utils/fonts';

interface FabricCanvasProps {
  pageIndex: number;
  width: number; // Page width at scale 1.0
  height: number; // Page height at scale 1.0
}

export const FabricCanvas: React.FC<FabricCanvasProps> = ({ pageIndex, width, height }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fabricCanvasRef = useRef<Canvas | null>(null);
  const isUpdatingStoreRef = useRef<boolean>(false);

  const {
    zoom,
    activeTool,
    setActiveTool,
    brushColor,
    brushSize,
    pagesTextItems,
    textEdits,
    annotations,
    addTextEdit,
    addAnnotation,
    updateAnnotation,
    removeAnnotation,
    setSelectedObjectId,
    saveHistory,
  } = usePdfStore();

  const scaledWidth = width * zoom;
  const scaledHeight = height * zoom;

  // 1. Initialize Fabric Canvas
  useEffect(() => {
    const canvasEl = canvasRef.current;
    if (!canvasEl) return;

    const canvas = new Canvas(canvasEl, {
      width: scaledWidth,
      height: scaledHeight,
      selection: activeTool === 'select',
      renderOnAddRemove: true,
    });

    fabricCanvasRef.current = canvas;

    // Handle object selections
    canvas.on('selection:created', (e) => {
      const activeObj = e.selected?.[0];
      if (activeObj && (activeObj as any).id) {
        setSelectedObjectId((activeObj as any).id);
      }
    });

    canvas.on('selection:cleared', () => {
      setSelectedObjectId(null);
    });

    return () => {
      canvas.dispose();
      fabricCanvasRef.current = null;
    };
  }, [pageIndex]);

  // 2. Synchronize Canvas Dimensions on Zoom
  useEffect(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    canvas.setDimensions({ width: scaledWidth, height: scaledHeight });
    canvas.requestRenderAll();
  }, [zoom, scaledWidth, scaledHeight]);

  // 3. Synchronize Active Tool & Brush Settings
  useEffect(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    // Set selection status
    canvas.selection = activeTool === 'select';
    
    // Configure objects selection
    canvas.forEachObject((obj) => {
      obj.selectable = activeTool === 'select';
      obj.evented = activeTool === 'select' || activeTool === 'text';
    });

    // Configure drawing brush
    if (activeTool === 'draw') {
      canvas.isDrawingMode = true;
      if (canvas.freeDrawingBrush) {
        canvas.freeDrawingBrush.color = brushColor;
        canvas.freeDrawingBrush.width = brushSize;
      }
    } else {
      canvas.isDrawingMode = false;
    }

    canvas.requestRenderAll();
  }, [activeTool, brushColor, brushSize]);

  // 4. Render All Objects (Text Items, Shapes, Images) from Zustand Store
  useEffect(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas || isUpdatingStoreRef.current) return;

    // Clear existing objects
    canvas.clear();

    const pageTextItems = pagesTextItems[pageIndex] || [];
    const pageEdits = textEdits[pageIndex] || {};
    const pageAnns = annotations[pageIndex] || [];

    // A. Render Text Overlay
    pageTextItems.forEach((item) => {
      const edit = pageEdits[item.id];
      const textToDisplay = edit ? edit.text : item.text;
      
      // Determine font family
      const fontFamily = edit ? edit.fontFamily : item.fontFamily;
      const cssFontFamily = getCssFontFamily(fontFamily);

      // Create Fabric Textbox
      // By default, text color is transparent so that the PDF.js rendering underneath is visible.
      // If edited, we show the edited text and color it, adding a background color to cover the original.
      const hasBeenEdited = !!edit;
      const actualTextColor = edit ? edit.color : item.color;

      const textbox = new Textbox(textToDisplay, {
        id: item.id,
        left: item.x * zoom,
        top: item.y * zoom,
        width: item.width * zoom,
        fontSize: item.fontSize * zoom,
        fontFamily: cssFontFamily,
        fontWeight: item.fontWeight as any,
        angle: item.rotation,
        
        // Styling options
        fill: hasBeenEdited ? actualTextColor : 'rgba(0,0,0,0)',
        backgroundColor: hasBeenEdited ? '#ffffff' : undefined,
        
        // Selection & Hover controls
        selectable: activeTool === 'select' || activeTool === 'text',
        evented: true,
        borderColor: '#10b981',
        cornerColor: '#10b981',
        cornerSize: 7,
        transparentCorners: false,
        lockScalingY: true, // Auto-wrap height
        
        // Custom flags
        isTextItem: true,
        originalItem: item,
      } as any);

      // Hover Outline styling
      textbox.on('mouseover', () => {
        if (activeTool === 'select' || activeTool === 'text') {
          textbox.set({
            stroke: '#10b981',
            strokeWidth: 1,
            strokeDashArray: [3, 3],
          });
          canvas.requestRenderAll();
        }
      });

      textbox.on('mouseout', () => {
        textbox.set({ stroke: undefined });
        canvas.requestRenderAll();
      });

      // Selection Masking Strategy
      textbox.on('editing:entered', () => {
        // When editing begins, make text visible and mask the PDF page background
        textbox.set({
          fill: actualTextColor,
          backgroundColor: '#ffffff', // mask original text underneath
        });
        canvas.requestRenderAll();
      });

      textbox.on('editing:exited', () => {
        const currentText = textbox.text || '';
        // If modified, write to store
        if (currentText !== item.text || hasBeenEdited) {
          isUpdatingStoreRef.current = true;
          addTextEdit(pageIndex, item.id, {
            id: item.id,
            pageIndex,
            text: currentText,
            originalText: item.text,
            x: item.x,
            y: item.y,
            width: (textbox.width || 0) / zoom,
            height: (textbox.height || 0) / zoom,
            fontSize: item.fontSize,
            fontFamily: fontFamily,
            color: actualTextColor,
            rotation: item.rotation,
          });
          isUpdatingStoreRef.current = false;
        } else {
          // If reverted to original and never saved, reset transparent
          textbox.set({
            fill: 'rgba(0,0,0,0)',
            backgroundColor: undefined,
          });
        }
        canvas.requestRenderAll();
      });

      canvas.add(textbox);
    });

    // B. Render Annotations (Shapes, Images, Signatures, Drawings)
    pageAnns.forEach((ann) => {
      if (ann.type === 'highlight') {
        const rect = new Rect({
          id: ann.id,
          left: ann.x * zoom,
          top: ann.y * zoom,
          width: ann.width * zoom,
          height: ann.height * zoom,
          fill: ann.color,
          opacity: 0.45,
          selectable: activeTool === 'select',
          borderColor: '#10b981',
          cornerColor: '#10b981',
          isAnnotation: true,
        } as any);
        canvas.add(rect);
      } 
      else if (ann.type === 'rect') {
        const rect = new Rect({
          id: ann.id,
          left: ann.x * zoom,
          top: ann.y * zoom,
          width: ann.width * zoom,
          height: ann.height * zoom,
          fill: ann.fill || 'transparent',
          stroke: ann.color,
          strokeWidth: ann.strokeWidth * zoom,
          selectable: activeTool === 'select',
          borderColor: '#10b981',
          cornerColor: '#10b981',
          isAnnotation: true,
        } as any);
        canvas.add(rect);
      } 
      else if (ann.type === 'circle') {
        const circle = new Ellipse({
          id: ann.id,
          left: ann.x * zoom,
          top: ann.y * zoom,
          rx: (ann.width / 2) * zoom,
          ry: (ann.height / 2) * zoom,
          fill: ann.fill || 'transparent',
          stroke: ann.color,
          strokeWidth: ann.strokeWidth * zoom,
          selectable: activeTool === 'select',
          borderColor: '#10b981',
          cornerColor: '#10b981',
          isAnnotation: true,
        } as any);
        canvas.add(circle);
      } 
      else if (ann.type === 'image' || ann.type === 'signature') {
        FabricImage.fromURL(ann.dataUrl).then((img) => {
          img.set({
            id: ann.id,
            left: ann.x * zoom,
            top: ann.y * zoom,
            selectable: activeTool === 'select',
            borderColor: '#10b981',
            cornerColor: '#10b981',
            isAnnotation: true,
          } as any);
          img.scaleToWidth(ann.width * zoom);
          img.scaleToHeight(ann.height * zoom);
          canvas.add(img);
          canvas.requestRenderAll();
        });
      }
      else if (ann.type === 'draw') {
        // Redraw freehand SVG paths by setting scale-1 path commands and scaling
        const path = new Path(ann.path, {
          id: ann.id,
          left: ann.x * zoom,
          top: ann.y * zoom,
          fill: 'transparent',
          stroke: ann.color,
          strokeWidth: ann.strokeWidth * zoom,
          selectable: activeTool === 'select',
          borderColor: '#10b981',
          cornerColor: '#10b981',
          isAnnotation: true,
        } as any);
        path.scaleToWidth(ann.width * zoom);
        path.scaleToHeight(ann.height * zoom);
        canvas.add(path);
      }
    });

    canvas.requestRenderAll();
  }, [pagesTextItems, textEdits, annotations, pageIndex, zoom]);

  // 5. Watch for Path Drawings Created by Freehand Pen
  useEffect(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    const handlePathCreated = (e: any) => {
      const fabricPath = e.path;
      if (!fabricPath) return;

      // Extract details
      const pathData = fabricPath.path;
      const left = fabricPath.left / zoom;
      const top = fabricPath.top / zoom;
      const width = fabricPath.width / zoom;
      const height = fabricPath.height / zoom;

      // Convert the nested path commands back to standard SVG path format string
      // e.g. [["M", 10, 20], ["L", 15, 25]] -> "M 10 20 L 15 25"
      const pathString = pathData
        .map((cmd: any) => cmd.join(' '))
        .join(' ');

      // Remove from Fabric immediately, let Zustand handle state sync and redraw
      canvas.remove(fabricPath);

      isUpdatingStoreRef.current = true;
      addAnnotation(pageIndex, {
        id: `ann-draw-${Date.now()}`,
        pageIndex,
        type: 'draw',
        x: left,
        y: top,
        width,
        height,
        path: pathString,
        color: brushColor,
        strokeWidth: brushSize,
      });
      isUpdatingStoreRef.current = false;
      
      // Keep brush mode active
      canvas.requestRenderAll();
    };

    canvas.on('path:created', handlePathCreated);

    return () => {
      canvas.off('path:created', handlePathCreated);
    };
  }, [pageIndex, zoom, brushColor, brushSize]);

  // 6. Handle Drawing/Creating Rectangles & Circles & Highlights
  useEffect(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    let isDrawingShape = false;
    let shapeStart = { x: 0, y: 0 };
    let tempShape: Rect | Ellipse | null = null;

    const handleMouseDown = (opt: any) => {
      if (activeTool === 'select' || activeTool === 'text' || activeTool === 'draw') return;

      const pointer = canvas.getScenePoint(opt.e);
      shapeStart = { x: pointer.x, y: pointer.y };
      isDrawingShape = true;

      if (activeTool === 'highlight') {
        tempShape = new Rect({
          left: pointer.x,
          top: pointer.y,
          width: 0,
          height: 0,
          fill: brushColor,
          opacity: 0.45,
          selectable: false,
        });
      } 
      else if (activeTool === 'rect') {
        tempShape = new Rect({
          left: pointer.x,
          top: pointer.y,
          width: 0,
          height: 0,
          fill: 'transparent',
          stroke: brushColor,
          strokeWidth: 2 * zoom,
          selectable: false,
        });
      } 
      else if (activeTool === 'circle') {
        tempShape = new Ellipse({
          left: pointer.x,
          top: pointer.y,
          rx: 0,
          ry: 0,
          fill: 'transparent',
          stroke: brushColor,
          strokeWidth: 2 * zoom,
          selectable: false,
        });
      }

      if (tempShape) {
        canvas.add(tempShape);
      }
    };

    const handleMouseMove = (opt: any) => {
      if (!isDrawingShape || !tempShape) return;

      const pointer = canvas.getScenePoint(opt.e);
      const width = pointer.x - shapeStart.x;
      const height = pointer.y - shapeStart.y;

      if (activeTool === 'circle') {
        const ellipse = tempShape as Ellipse;
        ellipse.set({
          rx: Math.abs(width) / 2,
          ry: Math.abs(height) / 2,
          left: width < 0 ? pointer.x : shapeStart.x,
          top: height < 0 ? pointer.y : shapeStart.y,
        });
      } else {
        tempShape.set({
          width: Math.abs(width),
          height: Math.abs(height),
          left: width < 0 ? pointer.x : shapeStart.x,
          top: height < 0 ? pointer.y : shapeStart.y,
        });
      }

      canvas.requestRenderAll();
    };

    const handleMouseUp = () => {
      if (!isDrawingShape || !tempShape) return;
      isDrawingShape = false;

      // Extract scale-1 geometry
      const finalLeft = (tempShape.left || 0) / zoom;
      const finalTop = (tempShape.top || 0) / zoom;
      
      let finalWidth = 0;
      let finalHeight = 0;

      if (activeTool === 'circle') {
        const ellipse = tempShape as Ellipse;
        finalWidth = ((ellipse.rx || 0) * 2) / zoom;
        finalHeight = ((ellipse.ry || 0) * 2) / zoom;
      } else {
        finalWidth = (tempShape.width || 0) / zoom;
        finalHeight = (tempShape.height || 0) / zoom;
      }

      // Remove the temporary drawing shape, serialize it to Zustand store
      canvas.remove(tempShape);
      tempShape = null;

      // Avoid creating microscopic shapes
      if (finalWidth > 2 && finalHeight > 2) {
        isUpdatingStoreRef.current = true;
        addAnnotation(pageIndex, {
          id: `ann-${activeTool}-${Date.now()}`,
          pageIndex,
          type: activeTool as any,
          x: finalLeft,
          y: finalTop,
          width: finalWidth,
          height: finalHeight,
          color: brushColor,
          strokeWidth: 2,
        });
        isUpdatingStoreRef.current = false;
        
        // Reset tool to select after drawing
        setActiveTool('select');
      }
    };

    canvas.on('mouse:down', handleMouseDown);
    canvas.on('mouse:move', handleMouseMove);
    canvas.on('mouse:up', handleMouseUp);

    return () => {
      canvas.off('mouse:down', handleMouseDown);
      canvas.off('mouse:move', handleMouseMove);
      canvas.off('mouse:up', handleMouseUp);
    };
  }, [pageIndex, activeTool, zoom, brushColor]);

  // 7. Track movement/scaling adjustments made to annotations by the user
  useEffect(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    const handleObjectModified = (e: any) => {
      const obj = e.target;
      if (!obj || isUpdatingStoreRef.current) return;

      const objId = (obj as any).id;
      const isAnn = (obj as any).isAnnotation;
      const isTxt = (obj as any).isTextItem;

      if (!objId) return;

      // Extract new dimensions in scale-1 PDF space
      const newX = (obj.left || 0) / zoom;
      const newY = (obj.top || 0) / zoom;
      
      // Width/Height adjustments need scaling factors applied
      const scaleX = obj.scaleX || 1;
      const scaleY = obj.scaleY || 1;
      const newWidth = ((obj.width || 0) * scaleX) / zoom;
      const newHeight = ((obj.height || 0) * scaleY) / zoom;

      isUpdatingStoreRef.current = true;
      saveHistory();

      if (isAnn) {
        // Sync modified annotation
        updateAnnotation(pageIndex, objId, {
          x: newX,
          y: newY,
          width: newWidth,
          height: newHeight,
        });
      } else if (isTxt) {
        // Sync modified text bounding box
        const originalItem = (obj as any).originalItem;
        const pageEdits = textEdits[pageIndex] || {};
        const existingEdit = pageEdits[objId];
        
        addTextEdit(pageIndex, objId, {
          id: objId,
          pageIndex,
          text: (obj as Textbox).text || '',
          originalText: originalItem.text,
          x: newX,
          y: newY,
          width: newWidth,
          height: newHeight,
          fontSize: originalItem.fontSize,
          fontFamily: existingEdit ? existingEdit.fontFamily : originalItem.fontFamily,
          color: existingEdit ? existingEdit.color : originalItem.color,
          rotation: obj.angle || 0,
        });
      }

      isUpdatingStoreRef.current = false;
    };

    canvas.on('object:modified', handleObjectModified);

    // Watch for deletion keypress
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Delete' || e.key === 'Backspace') {
        const activeObj = canvas.getActiveObject();
        if (activeObj && (activeObj as any).id) {
          // Verify we aren't editing text right now
          if (activeObj.isType('textbox') && (activeObj as Textbox).isEditing) {
            return;
          }
          
          const objId = (activeObj as any).id;
          const isAnn = (activeObj as any).isAnnotation;

          if (isAnn) {
            e.preventDefault();
            canvas.remove(activeObj);
            canvas.discardActiveObject();
            saveHistory();
            removeAnnotation(pageIndex, objId);
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      canvas.off('object:modified', handleObjectModified);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [pageIndex, zoom, textEdits]);

  return (
    <div className="absolute inset-0 pointer-events-auto" style={{ width: scaledWidth, height: scaledHeight }}>
      <canvas ref={canvasRef} />
    </div>
  );
};
