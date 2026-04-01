import { getCssSelector } from 'css-selector-generator';
import type { ElementMeta } from '@/core/guides/types';

export function extractElementMeta(el: HTMLElement): ElementMeta {
  const rect = el.getBoundingClientRect();
  let cssSelector: string;
  try {
    cssSelector = getCssSelector(el);
  } catch {
    cssSelector = el.tagName?.toLowerCase() ?? 'unknown';
  }
  return {
    tag: el.tagName?.toLowerCase() ?? 'unknown',
    cssSelector,
    textContent: el.textContent?.trim().slice(0, 200) || null,
    ariaLabel: el.getAttribute('aria-label'),
    placeholder: el.getAttribute('placeholder'),
    altText: el instanceof HTMLImageElement ? el.alt : null,
    name: el.getAttribute('name'),
    role: el.getAttribute('role') || (el.tagName?.toLowerCase() ?? null),
    href: el instanceof HTMLAnchorElement ? el.href : null,
    inputType: el instanceof HTMLInputElement ? el.type : null,
    dataTestId: el.getAttribute('data-testid') || el.getAttribute('data-test-id') || el.getAttribute('data-qa') || null,
    rect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
    devicePixelRatio: window.devicePixelRatio,
  };
}
