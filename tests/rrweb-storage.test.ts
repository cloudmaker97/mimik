import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import 'fake-indexeddb/auto';
import { MimikDB } from '../src/shared/db-schema';
import type { RrwebEventChunk } from '../src/shared/types';

describe('rrweb event chunk storage', () => {
  let db: MimikDB;

  beforeEach(async () => {
    db = new MimikDB();
    await db.open();
  });

  afterEach(async () => {
    await db.delete();
  });

  it('can add an RrwebEventChunk to db.rrwebEvents and retrieve it by id', async () => {
    const chunk: RrwebEventChunk = {
      id: crypto.randomUUID(),
      guideId: 'guide-123',
      events: [{ type: 2, data: { node: {} } }, { type: 3, data: {} }],
      timestamp: Date.now(),
    };

    await db.rrwebEvents.add(chunk);
    const retrieved = await db.rrwebEvents.get(chunk.id);

    expect(retrieved).toBeDefined();
    expect(retrieved!.guideId).toBe('guide-123');
    expect(retrieved!.events).toHaveLength(2);
  });

  it('can retrieve multiple chunks for the same guideId via where({guideId}).toArray()', async () => {
    const guideId = 'guide-abc';
    const chunk1: RrwebEventChunk = {
      id: crypto.randomUUID(),
      guideId,
      events: [{ type: 1 }],
      timestamp: Date.now(),
    };
    const chunk2: RrwebEventChunk = {
      id: crypto.randomUUID(),
      guideId,
      events: [{ type: 2 }, { type: 3 }],
      timestamp: Date.now() + 1000,
    };
    const otherChunk: RrwebEventChunk = {
      id: crypto.randomUUID(),
      guideId: 'other-guide',
      events: [{ type: 99 }],
      timestamp: Date.now(),
    };

    await db.rrwebEvents.bulkAdd([chunk1, chunk2, otherChunk]);

    const results = await db.rrwebEvents.where({ guideId }).toArray();
    expect(results).toHaveLength(2);
    expect(results.map(r => r.id).sort()).toEqual([chunk1.id, chunk2.id].sort());
  });
});
