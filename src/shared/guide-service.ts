import { db } from './db-schema';
import type { Guide, Step, Screenshot } from './types';

export async function getGuides(): Promise<Guide[]> {
  return db.guides.orderBy('updatedAt').reverse()
    .filter(g => g.deletedAt == null).toArray();
}

export async function getStarredGuides(): Promise<Guide[]> {
  return db.guides.orderBy('updatedAt').reverse()
    .filter(g => g.starred === true && g.deletedAt == null).toArray();
}

export async function getTrashedGuides(): Promise<Guide[]> {
  return db.guides.orderBy('updatedAt').reverse()
    .filter(g => g.deletedAt != null).toArray();
}

export async function getGuide(id: string): Promise<{ guide: Guide; steps: Step[]; screenshots: Map<string, Screenshot> } | null> {
  const guide = await db.guides.get(id);
  if (!guide) return null;
  const steps = await db.steps.where('guideId').equals(id).sortBy('index');
  const screenshotIds = steps.map(s => s.screenshotId).filter(Boolean) as string[];
  const screenshotRows = await db.screenshots.where('id').anyOf(screenshotIds).toArray();
  const screenshots = new Map(screenshotRows.map(s => [s.stepId, s]));
  return { guide, steps, screenshots };
}

export async function softDeleteGuide(id: string): Promise<void> {
  await db.guides.update(id, { deletedAt: Date.now(), updatedAt: Date.now() });
}

export async function restoreGuide(id: string): Promise<void> {
  await db.guides.update(id, { deletedAt: null, updatedAt: Date.now() });
}

export async function permanentlyDeleteGuide(id: string): Promise<void> {
  const steps = await db.steps.where('guideId').equals(id).toArray();
  const screenshotIds = steps.map(s => s.screenshotId).filter(Boolean) as string[];
  await db.screenshots.where('id').anyOf(screenshotIds).delete();
  await db.steps.where('guideId').equals(id).delete();
  await db.rrwebEvents.where('guideId').equals(id).delete();
  await db.guides.delete(id);
}

export async function toggleStar(id: string): Promise<boolean> {
  const guide = await db.guides.get(id);
  if (!guide) return false;
  const starred = !guide.starred;
  await db.guides.update(id, { starred, updatedAt: Date.now() });
  return starred;
}

export async function updateGuideTitle(id: string, title: string): Promise<void> {
  await db.guides.update(id, { title, updatedAt: Date.now() });
}

export async function updateStepDescription(stepId: string, description: string): Promise<void> {
  await db.steps.update(stepId, { description });
}

export async function reorderSteps(guideId: string, orderedStepIds: string[]): Promise<void> {
  await db.transaction('rw', db.steps, db.guides, async () => {
    for (let i = 0; i < orderedStepIds.length; i++) {
      await db.steps.update(orderedStepIds[i], { index: i });
    }
    await db.guides.update(guideId, { stepIds: orderedStepIds, updatedAt: Date.now() });
  });
}

export async function updateScreenshotBlob(screenshotId: string, blob: Blob): Promise<void> {
  await db.screenshots.update(screenshotId, { blob });
}

export async function deleteStep(guideId: string, stepId: string): Promise<void> {
  const step = await db.steps.get(stepId);
  if (step?.screenshotId) {
    await db.screenshots.delete(step.screenshotId);
  }
  await db.steps.delete(stepId);
  const guide = await db.guides.get(guideId);
  if (guide) {
    const newStepIds = guide.stepIds.filter(id => id !== stepId);
    await db.guides.update(guideId, { stepIds: newStepIds, updatedAt: Date.now() });
    const remaining = await db.steps.where('guideId').equals(guideId).sortBy('index');
    for (let i = 0; i < remaining.length; i++) {
      if (remaining[i].index !== i) {
        await db.steps.update(remaining[i].id, { index: i });
      }
    }
  }
}

export async function getFirstScreenshot(guideId: string): Promise<Screenshot | null> {
  const steps = await db.steps.where('guideId').equals(guideId).sortBy('index');
  for (const step of steps) {
    if (step.screenshotId) {
      const screenshot = await db.screenshots.get(step.screenshotId);
      if (screenshot) return screenshot;
    }
  }
  return null;
}
