import { captureVisibleTab } from '@/lib/browser-api';
import { saveScreenshot } from '@/core/guides/service';
import type { Screenshot, ElementMeta } from '@/core/guides/types';

export async function captureAndStore(tabId: number, stepId: string): Promise<Screenshot> {
  const dataUrl = await captureVisibleTab('jpeg', 90);
  const blob = await fetch(dataUrl).then(r => r.blob());
  const screenshot: Screenshot = {
    id: crypto.randomUUID(), stepId, blob, mimeType: 'image/jpeg', width: 0, height: 0,
  };
  await saveScreenshot(screenshot);
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
  const dataUrl = await captureVisibleTab('jpeg', 90);

  const blob = await fetch(dataUrl).then(r => r.blob());
  const img = await createImageBitmap(blob);

  const screenshot: Screenshot = {
    id: crypto.randomUUID(),
    stepId,
    blob,
    mimeType: 'image/jpeg',
    width: img.width,
    height: img.height,
    bounds: {
      x: elementMeta.rect.x,
      y: elementMeta.rect.y,
      width: elementMeta.rect.width,
      height: elementMeta.rect.height,
    },
    pixelRatio: elementMeta.devicePixelRatio,
  };

  img.close();
  await saveScreenshot(screenshot);
  return screenshot;
}
