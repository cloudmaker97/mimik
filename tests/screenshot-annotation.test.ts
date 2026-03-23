import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { ElementMeta } from '../src/shared/types';

function makeElementMeta(overrides: Partial<ElementMeta> = {}): ElementMeta {
  return {
    tag: 'button',
    cssSelector: 'button',
    textContent: 'Click me',
    ariaLabel: null,
    placeholder: null,
    altText: null,
    name: null,
    role: 'button',
    href: null,
    inputType: null,
    dataTestId: null,
    rect: { x: 10, y: 20, width: 100, height: 50 },
    devicePixelRatio: 2,
    ...overrides,
  };
}

function mockOffscreenCanvas(width: number, height: number) {
  const calls: Array<{ method: string; args: unknown[] }> = [];
  const ctx = {
    drawImage: (...args: unknown[]) => calls.push({ method: 'drawImage', args }),
    fillRect: (...args: unknown[]) => calls.push({ method: 'fillRect', args }),
    strokeRect: (...args: unknown[]) => calls.push({ method: 'strokeRect', args }),
    set strokeStyle(v: string) { calls.push({ method: 'set:strokeStyle', args: [v] }); },
    set lineWidth(v: number) { calls.push({ method: 'set:lineWidth', args: [v] }); },
    set fillStyle(v: string) { calls.push({ method: 'set:fillStyle', args: [v] }); },
  };
  return {
    width,
    height,
    getContext: () => ctx,
    convertToBlob: async ({ type }: { type: string }) => new Blob(['fake-image'], { type }),
    _calls: calls,
  };
}

describe('drawHighlight — OffscreenCanvas annotation', () => {
  let OffscreenCanvasInstances: ReturnType<typeof mockOffscreenCanvas>[] = [];

  afterEach(() => {
    vi.resetModules();
  });

  beforeEach(() => {
    vi.resetModules();
    OffscreenCanvasInstances = [];

    const instances = OffscreenCanvasInstances;
    (globalThis as unknown as Record<string, unknown>).OffscreenCanvas = class MockOffscreenCanvas {
      width: number;
      height: number;
      _calls: Array<{ method: string; args: unknown[] }> = [];

      constructor(w: number, h: number) {
        this.width = w;
        this.height = h;
        instances.push(this as unknown as ReturnType<typeof mockOffscreenCanvas>);
      }

      getContext() {
        const calls = this._calls;
        return {
          drawImage: (...args: unknown[]) => calls.push({ method: 'drawImage', args }),
          fillRect: (...args: unknown[]) => calls.push({ method: 'fillRect', args }),
          strokeRect: (...args: unknown[]) => calls.push({ method: 'strokeRect', args }),
          set strokeStyle(v: string) { calls.push({ method: 'set:strokeStyle', args: [v] }); },
          set lineWidth(v: number) { calls.push({ method: 'set:lineWidth', args: [v] }); },
          set fillStyle(v: string) { calls.push({ method: 'set:fillStyle', args: [v] }); },
        };
      }

      async convertToBlob({ type }: { type: string }) {
        return new Blob(['fake-image'], { type });
      }
    };

    (globalThis as unknown as Record<string, unknown>).createImageBitmap = vi.fn(async (_blob: Blob) => ({
      width: 1280,
      height: 720,
      close: () => {},
    }));

    (globalThis as unknown as Record<string, unknown>).fetch = vi.fn(async (_url: string) => ({
      blob: async () => new Blob(['fake-jpeg'], { type: 'image/jpeg' }),
    }));
  });

  it('scales CSS rect coordinates by devicePixelRatio (dpr=2: rect x=10 -> canvas x=20)', async () => {
    const { drawHighlight } = await import('../src/background/screenshot');
    const meta = makeElementMeta({ rect: { x: 10, y: 20, width: 100, height: 50 }, devicePixelRatio: 2 });
    await drawHighlight('data:image/jpeg;base64,fake', meta);

    const canvas = OffscreenCanvasInstances[0];
    expect(canvas).toBeDefined();
    const fillRectCall = canvas._calls.find(c => c.method === 'fillRect');
    expect(fillRectCall).toBeDefined();
    expect(fillRectCall!.args).toEqual([20, 40, 200, 100]);
  });

  it('uses blue-600 stroke color (#2563EB) and semi-transparent fill', async () => {
    const { drawHighlight } = await import('../src/background/screenshot');
    const meta = makeElementMeta();
    await drawHighlight('data:image/jpeg;base64,fake', meta);

    const canvas = OffscreenCanvasInstances[0];
    const strokeStyleCall = canvas._calls.find(c => c.method === 'set:strokeStyle');
    const fillStyleCall = canvas._calls.find(c => c.method === 'set:fillStyle');

    expect(strokeStyleCall?.args[0]).toBe('#2563EB');
    expect(fillStyleCall?.args[0]).toContain('rgba');
    expect(fillStyleCall?.args[0]).toContain('37');
    expect(fillStyleCall?.args[0]).toContain('99');
    expect(fillStyleCall?.args[0]).toContain('235');
    expect(fillStyleCall?.args[0]).toContain('0.15');
  });

  it('returns a Blob with type image/jpeg', async () => {
    const { drawHighlight } = await import('../src/background/screenshot');
    const meta = makeElementMeta();
    const result = await drawHighlight('data:image/jpeg;base64,fake', meta);

    expect(result).toBeInstanceOf(Blob);
    expect(result.type).toBe('image/jpeg');
  });
});
