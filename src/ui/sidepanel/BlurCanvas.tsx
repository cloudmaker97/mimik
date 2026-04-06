import { Check, Undo, X } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { Screenshot } from '@/core/guides/types';

interface BlurCanvasProps {
  screenshot: Screenshot;
  onSave: (blurredBlob: Blob) => void;
  onCancel: () => void;
}

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export default function BlurCanvas({ screenshot, onSave, onCancel }: BlurCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  const [_currentPos, setCurrentPos] = useState({ x: 0, y: 0 });
  const [blurRects, setBlurRects] = useState<Rect[]>([]);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const originalImageDataRef = useRef<ImageData | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const url = URL.createObjectURL(screenshot.blob);
    const img = new Image();
    img.onload = () => {
      canvas.width = screenshot.width;
      canvas.height = screenshot.height;
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      originalImageDataRef.current = ctx.getImageData(0, 0, canvas.width, canvas.height);
      imgRef.current = img;
      URL.revokeObjectURL(url);
    };
    img.src = url;
  }, [screenshot]);

  const applyBoxBlur = useCallback((ctx: CanvasRenderingContext2D, rect: Rect) => {
    const { x, y, w, h } = rect;
    if (w <= 0 || h <= 0) return;

    const canvasW = ctx.canvas.width;
    const canvasH = ctx.canvas.height;

    const x0 = Math.max(0, Math.round(x));
    const y0 = Math.max(0, Math.round(y));
    const x1 = Math.min(canvasW, Math.round(x + w));
    const y1 = Math.min(canvasH, Math.round(y + h));
    if (x1 <= x0 || y1 <= y0) return;

    const imageData = ctx.getImageData(x0, y0, x1 - x0, y1 - y0);
    const data = imageData.data;
    const rw = x1 - x0;
    const rh = y1 - y0;
    const radius = 10;

    const blurred = new Uint8ClampedArray(data.length);
    for (let py = 0; py < rh; py++) {
      for (let px = 0; px < rw; px++) {
        let r = 0,
          g = 0,
          b = 0,
          count = 0;
        for (let dy = -radius; dy <= radius; dy++) {
          for (let dx = -radius; dx <= radius; dx++) {
            const nx = px + dx;
            const ny = py + dy;
            if (nx >= 0 && nx < rw && ny >= 0 && ny < rh) {
              const idx = (ny * rw + nx) * 4;
              r += data[idx];
              g += data[idx + 1];
              b += data[idx + 2];
              count++;
            }
          }
        }
        const outIdx = (py * rw + px) * 4;
        blurred[outIdx] = r / count;
        blurred[outIdx + 1] = g / count;
        blurred[outIdx + 2] = b / count;
        blurred[outIdx + 3] = data[outIdx + 3];
      }
    }
    const blurredData = new ImageData(blurred, rw, rh);
    ctx.putImageData(blurredData, x0, y0);
  }, []);

  const redrawCanvas = useCallback(
    (rects: Rect[], previewRect?: Rect) => {
      const canvas = canvasRef.current;
      if (!canvas || !imgRef.current || !originalImageDataRef.current) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.putImageData(originalImageDataRef.current, 0, 0);

      for (const rect of rects) {
        applyBoxBlur(ctx, rect);
      }

      if (previewRect && previewRect.w !== 0 && previewRect.h !== 0) {
        ctx.save();
        ctx.strokeStyle = 'rgba(59, 130, 246, 0.8)';
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 4]);
        ctx.strokeRect(previewRect.x, previewRect.y, previewRect.w, previewRect.h);
        ctx.restore();
      }
    },
    [applyBoxBlur],
  );

  const getCanvasPos = (e: React.MouseEvent<HTMLCanvasElement>): { x: number; y: number } => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  const onMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const pos = getCanvasPos(e);
    setIsDrawing(true);
    setStartPos(pos);
    setCurrentPos(pos);
  };

  const onMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const pos = getCanvasPos(e);
    setCurrentPos(pos);
    const previewRect = {
      x: Math.min(startPos.x, pos.x),
      y: Math.min(startPos.y, pos.y),
      w: Math.abs(pos.x - startPos.x),
      h: Math.abs(pos.y - startPos.y),
    };
    redrawCanvas(blurRects, previewRect);
  };

  const onMouseUp = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    setIsDrawing(false);
    const pos = getCanvasPos(e);
    const rect: Rect = {
      x: Math.min(startPos.x, pos.x),
      y: Math.min(startPos.y, pos.y),
      w: Math.abs(pos.x - startPos.x),
      h: Math.abs(pos.y - startPos.y),
    };
    if (rect.w > 2 && rect.h > 2) {
      const newRects = [...blurRects, rect];
      setBlurRects(newRects);
      redrawCanvas(newRects);
    }
  };

  const handleUndo = () => {
    const newRects = blurRects.slice(0, -1);
    setBlurRects(newRects);
    redrawCanvas(newRects);
  };

  const handleSave = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.toBlob(
      (blob) => {
        if (blob) onSave(blob);
      },
      'image/jpeg',
      0.85,
    );
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg overflow-hidden flex flex-col max-w-full max-h-full">
        <div className="p-3 border-b border-gray-200 flex items-center justify-between">
          <span className="text-sm font-medium text-gray-700">Draw rectangles to blur sensitive areas</span>
          <div className="flex items-center gap-2">
            <button
              onClick={handleUndo}
              disabled={blurRects.length === 0}
              className="flex items-center gap-1 px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 disabled:opacity-40 rounded border border-gray-200 hover:border-gray-300"
              title="Undo last blur"
            >
              <Undo size={14} />
              Undo
            </button>
            <button
              onClick={onCancel}
              className="flex items-center gap-1 px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 rounded border border-gray-200 hover:border-gray-300"
              title="Cancel"
            >
              <X size={14} />
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="flex items-center gap-1 px-3 py-1.5 text-sm text-white bg-violet-600 hover:bg-violet-700 rounded"
              title="Save blurred screenshot"
            >
              <Check size={14} />
              Save
            </button>
          </div>
        </div>
        <div className="overflow-auto">
          <canvas
            ref={canvasRef}
            onMouseDown={onMouseDown}
            onMouseMove={onMouseMove}
            onMouseUp={onMouseUp}
            className="block max-w-full cursor-crosshair"
            style={{ maxHeight: 'calc(100vh - 160px)' }}
          />
        </div>
      </div>
    </div>
  );
}
