import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import 'fake-indexeddb/auto';
import { MimikDB } from '../src/shared/db-schema';
import type { RrwebEventChunk, Guide, Step, Screenshot } from '../src/shared/types';

describe('Dexie v2 migration', () => {
  let db: MimikDB;

  beforeEach(async () => {
    db = new MimikDB();
    await db.open();
  });

  afterEach(async () => {
    await db.delete();
  });

  it('creates rrwebEvents table (db.rrwebEvents.add succeeds)', async () => {
    const chunk: RrwebEventChunk = {
      id: crypto.randomUUID(),
      guideId: 'guide-1',
      events: [{ type: 1, data: {} }],
      timestamp: Date.now(),
    };
    await expect(db.rrwebEvents.add(chunk)).resolves.toBeDefined();
  });

  it('preserves existing guides table after v2 migration', async () => {
    const guide: Guide = {
      id: crypto.randomUUID(),
      title: 'Migration Test Guide',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      stepIds: [],
    };
    await db.guides.add(guide);
    const retrieved = await db.guides.get(guide.id);
    expect(retrieved).toBeDefined();
    expect(retrieved!.title).toBe('Migration Test Guide');
  });

  it('can store and retrieve RrwebEventChunk with events array intact', async () => {
    const events = [{ type: 2, data: { x: 100, y: 200 } }, { type: 3, data: { text: 'hello' } }];
    const chunk: RrwebEventChunk = {
      id: crypto.randomUUID(),
      guideId: 'guide-2',
      events,
      timestamp: 1234567890,
    };
    await db.rrwebEvents.add(chunk);
    const retrieved = await db.rrwebEvents.get(chunk.id);
    expect(retrieved).toBeDefined();
    expect(retrieved!.guideId).toBe('guide-2');
    expect(retrieved!.timestamp).toBe(1234567890);
    expect(retrieved!.events).toHaveLength(2);
    expect(retrieved!.events[0]).toEqual({ type: 2, data: { x: 100, y: 200 } });
  });

  it('has version 2 with four tables', () => {
    expect(db.tables.map(t => t.name).sort()).toEqual(['guides', 'rrwebEvents', 'screenshots', 'steps']);
  });
});
