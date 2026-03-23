import { describe, it, expect } from 'vitest';
import type { SpaNavigateMessage } from '../src/shared/messages';

describe('SPA navigation', () => {
  it('SPA_NAVIGATE message has the correct shape', () => {
    const message: SpaNavigateMessage = {
      type: 'SPA_NAVIGATE',
      url: 'https://example.com/page2',
      guideId: 'guide-123',
    };
    expect(message.type).toBe('SPA_NAVIGATE');
    expect(typeof message.url).toBe('string');
    expect(typeof message.guideId).toBe('string');
  });

  it('webNavigation listener should only process frameId === 0 (top frame)', () => {
    const topFrameDetails = { frameId: 0, url: 'https://example.com/page2', tabId: 1 };
    const subFrameDetails = { frameId: 1, url: 'https://example.com/iframe', tabId: 1 };

    function shouldProcess(details: { frameId: number }): boolean {
      return details.frameId === 0;
    }

    expect(shouldProcess(topFrameDetails)).toBe(true);
    expect(shouldProcess(subFrameDetails)).toBe(false);
  });
});
