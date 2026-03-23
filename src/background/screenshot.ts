import { db } from '../shared/db-schema';
import type { Screenshot, ElementMeta } from '../shared/types';

export async function captureAndStore(tabId: number, stepId: string): Promise<Screenshot> {
  const dataUrl = await chrome.tabs.captureVisibleTab(null, { format: 'jpeg', quality: 85 });
  const blob = await fetch(dataUrl).then(r => r.blob());
  const screenshot: Screenshot = {
    id: crypto.randomUUID(), stepId, blob, mimeType: 'image/jpeg', width: 0, height: 0,
  };
  await db.screenshots.add(screenshot);
  return screenshot;
}

export function dataUrlToBlob(dataUrl: string): Promise<Blob> {
  return fetch(dataUrl).then(r => r.blob());
}

export async function captureAnnotated(
  tabId: number,
  stepId: string,
  elementMeta: ElementMeta
): Promise<Screenshot> {
  const dataUrl = await chrome.tabs.captureVisibleTab(null, {
    format: 'jpeg',
    quality: 85,
  });

  const annotatedBlob = await drawHighlight(dataUrl, elementMeta);
  const img = await createImageBitmap(annotatedBlob);

  const screenshot: Screenshot = {
    id: crypto.randomUUID(),
    stepId,
    blob: annotatedBlob,
    mimeType: 'image/jpeg',
    width: img.width,
    height: img.height,
  };

  await db.screenshots.add(screenshot);
  return screenshot;
}

export async function drawHighlight(dataUrl: string, meta: ElementMeta): Promise<Blob> {
  const img = await createImageBitmap(await fetch(dataUrl).then(r => r.blob()));

  const canvas = new OffscreenCanvas(img.width, img.height);
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(img, 0, 0);

  const dpr = meta.devicePixelRatio || 1;
  const x = meta.rect.x * dpr;
  const y = meta.rect.y * dpr;
  const w = meta.rect.width * dpr;
  const h = meta.rect.height * dpr;

  ctx.strokeStyle = '#2563EB';
  ctx.lineWidth = 3 * dpr;
  ctx.fillStyle = 'rgba(37, 99, 235, 0.15)';
  ctx.fillRect(x, y, w, h);
  ctx.strokeRect(x, y, w, h);

  return canvas.convertToBlob({ type: 'image/jpeg', quality: 0.85 });
}
