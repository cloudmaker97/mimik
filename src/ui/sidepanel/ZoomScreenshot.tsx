import { useEffect, useRef, useState } from 'react';
import type { Screenshot } from '@/core/guides/types';

interface ZoomScreenshotProps {
  screenshot: Screenshot;
  className?: string;
  alt?: string;
  animate?: boolean;
  crop?: boolean;
}

function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

function drawRoundedRect(
  ctx: OffscreenCanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
  ctx.stroke();
}

async function renderScreenshot(
  screenshot: Screenshot,
): Promise<{ fullUrl: string; croppedUrl: string } | { fullUrl: string; croppedUrl: null }> {
  const img = await createImageBitmap(screenshot.blob);
  const imgW = img.width;
  const imgH = img.height;
  const bounds = screenshot.bounds;
  const dpr = screenshot.pixelRatio || 1;

  const fullCanvas = new OffscreenCanvas(imgW, imgH);
  const fullCtx = fullCanvas.getContext('2d')!;
  fullCtx.drawImage(img, 0, 0, imgW, imgH);

  if (!bounds) {
    img.close();
    const fullBlob = await fullCanvas.convertToBlob({ type: 'image/webp', quality: 0.8 });
    return { fullUrl: URL.createObjectURL(fullBlob), croppedUrl: null };
  }

  const bx = bounds.x * dpr;
  const by = bounds.y * dpr;
  const bw = bounds.width * dpr;
  const bh = bounds.height * dpr;

  fullCtx.strokeStyle = '#4F46E5';
  fullCtx.lineWidth = 3.5;
  fullCtx.setLineDash([8, 5]);
  drawRoundedRect(fullCtx, bx, by, bw, bh, 12);
  fullCtx.setLineDash([]);

  const fullBlob = await fullCanvas.convertToBlob({ type: 'image/webp', quality: 0.8 });
  const fullUrl = URL.createObjectURL(fullBlob);

  const PAD_RATIO = 0.3;
  const padH = PAD_RATIO * imgW;
  const padV = PAD_RATIO * imgH;
  const imgAspect = imgW / imgH;
  const elAspect = bw / bh;

  const cx = bx + bw / 2;
  const cy = by + bh / 2;

  let visW = bw + padH;
  let visH = bh + padV;

  if (elAspect > 1) {
    visW = bw + padH;
    visH = visW / imgAspect;
  } else if (elAspect < 1) {
    visH = bh + padV;
    visW = visH * imgAspect;
  }

  visW = Math.min(visW, imgW);
  visH = Math.min(visH, imgH);

  const cropX = clamp(cx - visW / 2, 0, imgW - visW);
  const cropY = clamp(cy - visH / 2, 0, imgH - visH);

  const cropCanvas = new OffscreenCanvas(imgW, imgH);
  const cropCtx = cropCanvas.getContext('2d')!;
  cropCtx.drawImage(img, cropX, cropY, visW, visH, 0, 0, imgW, imgH);

  const scaleX = imgW / visW;
  const scaleY = imgH / visH;
  cropCtx.strokeStyle = '#4F46E5';
  cropCtx.lineWidth = 3.5;
  cropCtx.setLineDash([8, 5]);
  drawRoundedRect(cropCtx, (bx - cropX) * scaleX, (by - cropY) * scaleY, bw * scaleX, bh * scaleY, 12);
  cropCtx.setLineDash([]);

  img.close();
  const croppedBlob = await cropCanvas.convertToBlob({ type: 'image/webp', quality: 0.8 });
  const croppedUrl = URL.createObjectURL(croppedBlob);

  return { fullUrl, croppedUrl };
}

export default function ZoomScreenshot({
  screenshot,
  className = '',
  alt = '',
  animate = false,
  crop = false,
}: ZoomScreenshotProps) {
  const [fullUrl, setFullUrl] = useState<string | null>(null);
  const [croppedUrl, setCroppedUrl] = useState<string | null>(null);
  const [showCropped, setShowCropped] = useState(false);
  const processedKeyRef = useRef<string | null>(null);
  const urlsRef = useRef<string[]>([]);

  useEffect(() => {
    if (!screenshot.blob) return;
    const cacheKey = `${screenshot.id}:${screenshot.blob.size}`;
    if (processedKeyRef.current === cacheKey) return;

    let cancelled = false;

    (async () => {
      const result = await renderScreenshot(screenshot);
      if (cancelled) {
        URL.revokeObjectURL(result.fullUrl);
        if (result.croppedUrl) URL.revokeObjectURL(result.croppedUrl);
        return;
      }

      processedKeyRef.current = cacheKey;

      for (const u of urlsRef.current) URL.revokeObjectURL(u);

      if (crop && result.croppedUrl) {
        urlsRef.current = [result.fullUrl, result.croppedUrl];
        setShowCropped(false);
        setFullUrl(result.fullUrl);
        setCroppedUrl(result.croppedUrl);
      } else {
        if (result.croppedUrl) URL.revokeObjectURL(result.croppedUrl);
        urlsRef.current = [result.fullUrl];
        setShowCropped(true);
        setFullUrl(result.fullUrl);
        setCroppedUrl(null);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [screenshot, crop]);

  useEffect(() => {
    if (!croppedUrl || showCropped) return;
    if (!animate) {
      setShowCropped(true);
      return;
    }
    let id = requestAnimationFrame(() => {
      id = requestAnimationFrame(() => {
        setShowCropped(true);
      });
    });
    return () => cancelAnimationFrame(id);
  }, [croppedUrl, showCropped, animate]);

  useEffect(() => {
    return () => {
      for (const u of urlsRef.current) URL.revokeObjectURL(u);
    };
  }, []);

  const ratio = screenshot.width && screenshot.height ? screenshot.width / screenshot.height : 16 / 9;

  if (!fullUrl) {
    return (
      <div className={`rounded-lg bg-[#f2f4fa] p-4 flex flex-col gap-2.5 ${className}`} style={{ aspectRatio: ratio }}>
        <div className="h-7 rounded-md bg-border/60 animate-pulse" />
        <div className="flex-1 flex gap-3">
          <div className="w-[30%] flex flex-col gap-2">
            <div className="h-5 rounded bg-border/50 animate-pulse [animation-delay:100ms]" />
            <div className="h-4 rounded bg-border/40 animate-pulse [animation-delay:200ms]" />
            <div className="h-4 rounded bg-border/40 animate-pulse [animation-delay:300ms]" />
            <div className="h-4 rounded bg-border/40 animate-pulse [animation-delay:400ms]" />
          </div>
          <div className="flex-1 flex flex-col gap-2">
            <div className="h-6 w-3/5 rounded bg-border/40 animate-pulse [animation-delay:150ms]" />
            <div className="h-3 w-4/5 rounded bg-border/30 animate-pulse [animation-delay:250ms]" />
            <div className="h-3 w-[70%] rounded bg-border/30 animate-pulse [animation-delay:350ms]" />
            <div className="h-3 w-3/4 rounded bg-border/30 animate-pulse [animation-delay:450ms]" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative overflow-hidden rounded-lg border border-gray-200 ${className}`}>
      <img src={croppedUrl || fullUrl} alt={alt} className="w-full block" />
      {croppedUrl && (
        <img
          src={fullUrl}
          alt=""
          className="absolute inset-0 w-full h-full block"
          style={{
            opacity: showCropped ? 0 : 1,
            transition: 'opacity 0.4s cubic-bezier(0.22, 1, 0.36, 1)',
          }}
        />
      )}
    </div>
  );
}
