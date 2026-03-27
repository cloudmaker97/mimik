import { useState, useEffect, useRef } from 'react';
import type { Screenshot } from '@/core/guides/types';

interface ZoomScreenshotProps {
  screenshot: Screenshot;
  className?: string;
  alt?: string;
}

function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

function drawRoundedRect(
  ctx: OffscreenCanvasRenderingContext2D,
  x: number, y: number, w: number, h: number, r: number
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

export default function ZoomScreenshot({ screenshot, className = '', alt = '' }: ZoomScreenshotProps) {
  const [croppedUrl, setCroppedUrl] = useState<string | null>(null);
  const prevUrlRef = useRef<string | null>(null);

  useEffect(() => {
    if (!screenshot.blob) return;

    let cancelled = false;

    (async () => {
      const img = await createImageBitmap(screenshot.blob);
      if (cancelled) { img.close(); return; }

      const imgW = img.width;
      const imgH = img.height;
      const bounds = screenshot.bounds;
      const dpr = screenshot.pixelRatio || 1;

      const canvas = new OffscreenCanvas(imgW, imgH);
      const ctx = canvas.getContext('2d')!;

      if (bounds) {
        const bx = bounds.x * dpr;
        const by = bounds.y * dpr;
        const bw = bounds.width * dpr;
        const bh = bounds.height * dpr;

        const PAD_RATIO = 0.3;
        const padH = PAD_RATIO * imgW;  // horizontal padding = 30% of image width
        const padV = PAD_RATIO * imgH;  // vertical padding = 30% of image height
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

        ctx.drawImage(img, cropX, cropY, visW, visH, 0, 0, imgW, imgH);

        const scaleX = imgW / visW;
        const scaleY = imgH / visH;
        ctx.strokeStyle = '#D97706';
        ctx.lineWidth = 10;
        drawRoundedRect(
          ctx,
          (bx - cropX) * scaleX,
          (by - cropY) * scaleY,
          bw * scaleX,
          bh * scaleY,
          20
        );
      } else {
        ctx.drawImage(img, 0, 0, imgW, imgH);
      }

      img.close();
      const blob = await canvas.convertToBlob({ type: 'image/webp', quality: 0.8 });
      if (cancelled) return;

      const url = URL.createObjectURL(blob);
      if (prevUrlRef.current) URL.revokeObjectURL(prevUrlRef.current);
      prevUrlRef.current = url;
      setCroppedUrl(url);
    })();

    return () => { cancelled = true; };
  }, [screenshot.blob, screenshot.bounds, screenshot.pixelRatio]);

  useEffect(() => {
    return () => {
      if (prevUrlRef.current) URL.revokeObjectURL(prevUrlRef.current);
    };
  }, []);

  if (!croppedUrl) {
    return <div className={`bg-gray-100 rounded-lg animate-pulse h-32 ${className}`} />;
  }

  return (
    <img
      src={croppedUrl}
      alt={alt}
      className={`w-full rounded-lg border border-gray-200 ${className}`}
    />
  );
}
