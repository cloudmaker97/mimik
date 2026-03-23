import { describe, it, expect } from 'vitest';
import { buildFallbackDescription } from '../src/background/step-description';
import type { ElementMeta } from '../src/shared/types';

function makeMeta(overrides: Partial<ElementMeta> = {}): ElementMeta {
  return {
    tag: 'div',
    cssSelector: 'div',
    textContent: null,
    ariaLabel: null,
    placeholder: null,
    altText: null,
    name: null,
    role: null,
    href: null,
    inputType: null,
    dataTestId: null,
    rect: { x: 0, y: 0, width: 100, height: 50 },
    devicePixelRatio: 1,
    ...overrides,
  };
}

describe('buildFallbackDescription', () => {
  it('click action with ariaLabel returns "Click {ariaLabel}"', () => {
    const meta = makeMeta({ ariaLabel: 'Submit button' });
    expect(buildFallbackDescription('click', meta)).toBe('Click Submit button');
  });

  it('click action with no ariaLabel but textContent returns "Click {textContent}" (truncated to 80 chars)', () => {
    const meta = makeMeta({ textContent: 'Sign in' });
    expect(buildFallbackDescription('click', meta)).toBe('Click Sign in');
  });

  it('textContent is truncated to 80 chars', () => {
    const longText = 'A'.repeat(100);
    const meta = makeMeta({ textContent: longText });
    const result = buildFallbackDescription('click', meta);
    expect(result).toBe('Click ' + 'A'.repeat(80));
  });

  it('input action with placeholder returns "Type into {placeholder}"', () => {
    const meta = makeMeta({ placeholder: 'Enter your email' });
    expect(buildFallbackDescription('input', meta)).toBe('Type into Enter your email');
  });

  it('scroll action returns "Scroll the page" regardless of element metadata', () => {
    const meta = makeMeta({ ariaLabel: 'some label', textContent: 'some text' });
    expect(buildFallbackDescription('scroll', meta)).toBe('Scroll the page');
  });

  it('navigate action returns "Navigate to page"', () => {
    const meta = makeMeta({ ariaLabel: 'Navigation link' });
    expect(buildFallbackDescription('navigate', meta)).toBe('Navigate to page');
  });

  it('priority chain: ariaLabel > placeholder > textContent > altText > name > role > tag', () => {
    const meta1 = makeMeta({
      ariaLabel: 'aria', placeholder: 'placeholder', textContent: 'text',
      altText: 'alt', name: 'nameAttr', role: 'button', tag: 'button',
    });
    expect(buildFallbackDescription('click', meta1)).toBe('Click aria');

    const meta2 = makeMeta({
      placeholder: 'placeholder', textContent: 'text',
      altText: 'alt', name: 'nameAttr', role: 'button', tag: 'button',
    });
    expect(buildFallbackDescription('input', meta2)).toBe('Type into placeholder');

    const meta3 = makeMeta({ textContent: 'text', altText: 'alt', name: 'nameAttr', role: 'button', tag: 'button' });
    expect(buildFallbackDescription('click', meta3)).toBe('Click text');

    const meta4 = makeMeta({ altText: 'alt', name: 'nameAttr', role: 'button', tag: 'img' });
    expect(buildFallbackDescription('click', meta4)).toBe('Click alt');

    const meta5 = makeMeta({ name: 'nameAttr', role: 'button', tag: 'input' });
    expect(buildFallbackDescription('click', meta5)).toBe('Click nameAttr');

    const meta6 = makeMeta({ role: 'button', tag: 'div' });
    expect(buildFallbackDescription('click', meta6)).toBe('Click button');
  });

  it('when all metadata is null, falls back to tag name', () => {
    const meta = makeMeta({ tag: 'button' });
    expect(buildFallbackDescription('click', meta)).toBe('Click button');
  });
});
