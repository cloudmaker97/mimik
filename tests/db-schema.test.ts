import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import 'fake-indexeddb/auto';
import { MimikDB } from '../src/shared/db-schema';
import type { Guide, Step, Screenshot } from '../src/shared/types';

describe('MimikDB Schema', () => {
  let db: MimikDB;

  beforeEach(async () => {
    db = new MimikDB();
    await db.open();
  });

  afterEach(async () => {
    await db.delete();
  });

  it('stores and retrieves a Guide', async () => {
    const guide: Guide = {
      id: crypto.randomUUID(),
      title: 'Test Guide',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      stepIds: [],
    };
    await db.guides.add(guide);
    const retrieved = await db.guides.get(guide.id);
    expect(retrieved).toBeDefined();
    expect(retrieved!.title).toBe('Test Guide');
  });

  it('stores screenshots as Blob, not string', async () => {
    const blob = new Blob(['test'], { type: 'image/jpeg' });
    const screenshot: Screenshot = {
      id: crypto.randomUUID(),
      stepId: 'step-1',
      blob,
      mimeType: 'image/jpeg',
      width: 100,
      height: 100,
    };
    expect(screenshot.blob).toBeInstanceOf(Blob);
    expect(typeof screenshot.blob).not.toBe('string');

    await db.screenshots.add(screenshot);
    const retrieved = await db.screenshots.get(screenshot.id);
    expect(retrieved).toBeDefined();
    expect(typeof retrieved!.blob).not.toBe('string');
  });

  it('has version 2 with four tables including rrwebEvents', () => {
    expect(db.tables.map(t => t.name).sort()).toEqual(['guides', 'rrwebEvents', 'screenshots', 'steps']);
  });
});
