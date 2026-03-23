import { extractElementMeta } from './element-meta';

const FOCUSABLE_SELECTOR = 'a[href], button, input, select, textarea, [role="button"], [role="link"], [role="tab"], [role="menuitem"], [role="checkbox"], [role="radio"], [tabindex]';

const DEDUP_MS = 200;
let lastClickTarget: Element | null = null;
let lastClickTime = 0;

function findFocusableAncestor(el: Element): HTMLElement {
  const focusable = el.closest(FOCUSABLE_SELECTOR);
  if (focusable instanceof HTMLElement) return focusable;

  if (el instanceof HTMLElement) return el;
  if (el.parentElement instanceof HTMLElement) return el.parentElement;

  return document.body;
}

export function startCapture(guideId: string): () => void {
  let scrollTimer: ReturnType<typeof setTimeout> | null = null;

  function sendAction(action: string, meta: ReturnType<typeof extractElementMeta>) {
    try {
      chrome.runtime.sendMessage({
        type: 'USER_ACTION',
        guideId,
        action,
        elementMeta: meta,
      });
    } catch (err) {
      console.warn('[Mimik] Failed to send action', err);
    }
  }

  function handleClick(e: MouseEvent) {
    const rawTarget = e.target;
    if (!rawTarget || !(rawTarget instanceof Element)) return;

    const target = findFocusableAncestor(rawTarget);
    if (target.closest('[data-mimik-ignore]')) return;

    const now = Date.now();
    if (target === lastClickTarget && now - lastClickTime < DEDUP_MS) return;
    lastClickTarget = target;
    lastClickTime = now;

    try {
      const meta = extractElementMeta(target);
      sendAction('click', meta);
    } catch (err) {
      console.warn('[Mimik] Failed to capture click', err);
    }
  }

  function handleKeydown(e: KeyboardEvent) {
    if (!['Enter', 'Escape', 'Tab'].includes(e.key)) return;
    const target = e.target instanceof HTMLElement ? e.target : document.activeElement;
    if (!target || !(target instanceof HTMLElement)) return;

    try {
      const meta = extractElementMeta(target);
      sendAction(`keydown:${e.key}`, meta);
    } catch (err) {
      console.warn('[Mimik] Failed to capture keydown', err);
    }
  }

  function handleInput(e: Event) {
    if (!(e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLSelectElement)) return;
    try {
      const meta = extractElementMeta(e.target as HTMLElement);
      sendAction('input', meta);
    } catch (err) {
      console.warn('[Mimik] Failed to capture input', err);
    }
  }

  function handleScroll() {
    if (scrollTimer) clearTimeout(scrollTimer);
    scrollTimer = setTimeout(() => {
      sendAction('scroll', {
        tag: 'window', cssSelector: 'window', textContent: null,
        ariaLabel: null, placeholder: null, altText: null,
        name: null, role: 'scrollbar', href: null,
        inputType: null, dataTestId: null,
        rect: { x: 0, y: 0, width: window.innerWidth, height: window.innerHeight },
        devicePixelRatio: window.devicePixelRatio,
      });
    }, 500);
  }

  window.addEventListener('click', handleClick, { capture: true });
  window.addEventListener('keydown', handleKeydown, { capture: true });
  window.addEventListener('input', handleInput, { capture: true });
  window.addEventListener('scroll', handleScroll, { capture: true, passive: true });

  return () => {
    window.removeEventListener('click', handleClick, { capture: true });
    window.removeEventListener('keydown', handleKeydown, { capture: true });
    window.removeEventListener('input', handleInput, { capture: true });
    window.removeEventListener('scroll', handleScroll, { capture: true });
    if (scrollTimer) clearTimeout(scrollTimer);
  };
}
