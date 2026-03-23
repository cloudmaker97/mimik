import { extractElementMeta } from './element-meta';

const FOCUSABLE_SELECTOR = 'a[href], button, input, select, textarea, [role="button"], [role="link"], [role="tab"], [role="menuitem"], [role="checkbox"], [role="radio"], [tabindex], [contenteditable="true"]';

const MERGE_MAX_ABSORB = 6;
const MERGE_WINDOW_MS = 500;
const MERGE_WINDOW_MS = 5;

const DRAG_MIN_PX = 40;

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

function isTextField(el: Element): boolean {
  if (el instanceof HTMLInputElement) {
    const textTypes = ['text', 'email', 'password', 'search', 'tel', 'url', 'number'];
    return textTypes.includes(el.type);
  }
  return el instanceof HTMLTextAreaElement
    || (el instanceof HTMLElement && el.isContentEditable);
}

function isNavigatingClick(el: HTMLElement): boolean {
  const anchor = el.closest('a[href]');
  if (!anchor) return false;
  const href = anchor.getAttribute('href');
  if (!href || href === '#' || href.startsWith('javascript:')) return false;
  return true;
}

interface MergeWindow {
  target: Element;
  bounds: DOMRect;
}

function timeGap(a: DOMRect, b: DOMRect): number {
  const dx = Math.max(a.left - (b.left + b.width), b.left - (a.left + a.width), 0);
  const dy = Math.max(a.top - (b.top + b.height), b.top - (a.top + a.height), 0);
  return Math.sqrt(dx * dx + dy * dy);
}

function sameTarget(a: DOMRect, b: DOMRect): boolean {
  return Math.abs(a.left - b.left) <= MERGE_WINDOW_MS
      && Math.abs(a.top - b.top) <= MERGE_WINDOW_MS;
}

function shouldAbsorb(entries: MergeWindow[], target: Element, bounds: DOMRect): boolean {
  if (entries.length >= MERGE_MAX_ABSORB) return false;
  if (entries.some(e => e.target === target)) return false;
  if (entries.length > 0 && !sameTarget(entries[0].bounds, bounds)) return false;
  if (entries.some(e => timeGap(e.bounds, bounds) > MERGE_WINDOW_MS)) return false;
  return true;
}

const MAX_ELEMENT_RATIO = 0.8;

function createHighlightOverlay(): HTMLDivElement {
  const el = document.createElement('div');
  el.setAttribute('data-mimik-ignore', '');
  el.style.cssText = `
    position: fixed;
    pointer-events: none;
    border: 3px solid #3B82F6;
    border-radius: 6px;
    z-index: 2147483647;
    box-sizing: border-box;
    opacity: 0;
    transition: opacity 0.15s ease;
  `;
  document.documentElement.appendChild(el);
  return el;
}

function isTooLarge(el: Element): boolean {
  const rect = el.getBoundingClientRect();
  return (rect.width / window.innerWidth > MAX_ELEMENT_RATIO)
      && (rect.height / window.innerHeight > MAX_ELEMENT_RATIO);
}

export function startCapture(guideId: string): () => void {
  let highlightEl: HTMLDivElement | null = null;
  let hoveredElement: Element | null = null;
  let hideTimer: ReturnType<typeof setTimeout> | null = null;
  let rafId: number | null = null;

  let mergeWin: MergeWindow[] = [];
  let mergeTimer: ReturnType<typeof setTimeout> | null = null;

  let dragStartX: number | null = null;
  let dragStartY: number | null = null;
  let dragStartElement: Element | null = null;

  let eventQueue: Promise<void> = Promise.resolve();

  function enqueue(fn: () => void) {
    eventQueue = eventQueue.then(() => {
      try { fn(); } catch (err) { console.warn('[Mimik] Event handler error', err); }
    });
  }

  function showHighlight(target: Element) {
    if (!highlightEl) highlightEl = createHighlightOverlay();
    if (hideTimer) { clearTimeout(hideTimer); hideTimer = null; }
    const rect = target.getBoundingClientRect();
    highlightEl.style.top = `${rect.top - 3}px`;
    highlightEl.style.left = `${rect.left - 3}px`;
    highlightEl.style.width = `${rect.width + 6}px`;
    highlightEl.style.height = `${rect.height + 6}px`;
    highlightEl.style.opacity = '1';
  }

  function hideHighlight() {
    if (highlightEl) highlightEl.style.opacity = '0';
  }

  function handleMouseOver(e: MouseEvent) {
    const rawTarget = e.target;
    if (!rawTarget || !(rawTarget instanceof Element)) return;
    if (rawTarget.closest('[data-mimik-ignore]')) return;
    const target = findFocusableAncestor(rawTarget);
    if (target === document.body || target === document.documentElement) return;
    if (isTooLarge(target)) return;
    if (target === hoveredElement) return;
    hoveredElement = target;
    if (rafId) cancelAnimationFrame(rafId);
    rafId = requestAnimationFrame(() => showHighlight(target));
  }

  function handleMouseOut(e: MouseEvent) {
    const related = e.relatedTarget;
    if (related instanceof Element && hoveredElement?.contains(related)) return;
    hoveredElement = null;
    if (hideTimer) clearTimeout(hideTimer);
    hideTimer = setTimeout(hideHighlight, 80);
  }

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

  function resetWindow() {
    if (mergeTimer) { clearTimeout(mergeTimer); mergeTimer = null; }
    mergeWin = [];
  }

  function tryMergeOrSend(target: HTMLElement, action: string) {
    const bounds = target.getBoundingClientRect();

    if (mergeWin.length > 0 && shouldAbsorb(mergeWin, target, bounds)) {
      mergeWin.push({ target, bounds });
      if (mergeTimer) clearTimeout(mergeTimer);
      mergeTimer = setTimeout(resetWindow, 600);
      return;
    }

    resetWindow();
    mergeWin.push({ target, bounds });
    mergeTimer = setTimeout(resetWindow, 600);

    try {
      const meta = extractElementMeta(target);
      sendAction(action, meta);
    } catch (err) {
      console.warn('[Mimik] Failed to capture action', err);
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

    if (!isTextField(target) && !(target instanceof HTMLSelectElement) && !(target instanceof HTMLOptionElement)) {
      if (isNavigatingClick(target)) {
        e.preventDefault();
        e.stopImmediatePropagation();

        enqueue(() => tryMergeOrSend(target, 'click'));

        const anchor = target.closest('a[href]') as HTMLAnchorElement;
        if (anchor) {
          setTimeout(() => {
            window.location.href = anchor.href;
          }, 150);
        }
        return;
      }
    }

    enqueue(() => tryMergeOrSend(target, 'click'));
  }

  function handleAuxClick(e: MouseEvent) {
    const rawTarget = e.target;
    if (!rawTarget || !(rawTarget instanceof Element)) return;
    const target = findFocusableAncestor(rawTarget);
    if (target.closest('[data-mimik-ignore]')) return;

    enqueue(() => tryMergeOrSend(target, 'auxclick'));
  }

  function handleKeydown(e: KeyboardEvent) {
    const target = e.target instanceof HTMLElement ? e.target : document.activeElement;
    if (!target || !(target instanceof HTMLElement)) return;
    if (target.closest('[data-mimik-ignore]')) return;

    enqueue(() => {
      try {
        const meta = extractElementMeta(target);
        sendAction(`keydown:${e.key}`, meta);
      } catch (err) {
        console.warn('[Mimik] Failed to capture keydown', err);
      }
    });
  }

  function handleInput(e: Event) {
    const target = e.target;
    if (!target || !(target instanceof HTMLElement)) return;
    if (!(target instanceof HTMLInputElement
      || target instanceof HTMLTextAreaElement
      || target instanceof HTMLSelectElement
      || target.isContentEditable)) return;

    enqueue(() => {
      try {
        const meta = extractElementMeta(target);
        sendAction('input', meta);
      } catch (err) {
        console.warn('[Mimik] Failed to capture input', err);
      }
    });
  }

  function handleClipboard(e: ClipboardEvent) {
    const target = e.target instanceof HTMLElement ? e.target : document.activeElement;
    if (!target || !(target instanceof HTMLElement)) return;
    if (target.closest('[data-mimik-ignore]')) return;

    enqueue(() => {
      try {
        const meta = extractElementMeta(target);
        sendAction(e.type, meta); // 'copy', 'paste', or 'cut'
      } catch (err) {
        console.warn('[Mimik] Failed to capture clipboard', err);
      }
    });
  }

  function handleMouseDown(e: MouseEvent) {
    dragStartX = e.pageX;
    dragStartY = e.pageY;
    dragStartElement = e.target instanceof Element ? e.target : null;
  }

  function handleMouseUp(e: MouseEvent) {
    if (dragStartX == null || dragStartY == null || !dragStartElement) {
      dragStartX = dragStartY = null;
      dragStartElement = null;
      return;
    }

    const dx = Math.abs(e.pageX - dragStartX);
    const dy = Math.abs(e.pageY - dragStartY);

    if (dx >= DRAG_MIN_PX || dy >= DRAG_MIN_PX) {
      const target = findFocusableAncestor(dragStartElement);
      if (!target.closest('[data-mimik-ignore]')) {
        enqueue(() => {
          try {
            const meta = extractElementMeta(target);
            sendAction('drag', meta);
          } catch (err) {
            console.warn('[Mimik] Failed to capture drag', err);
          }
        });
      }
    }

    dragStartX = dragStartY = null;
    dragStartElement = null;
  }

  window.addEventListener('click', handleClick, { capture: true });
  window.addEventListener('auxclick', handleAuxClick, { capture: true });
  window.addEventListener('keydown', handleKeydown, { capture: true });
  window.addEventListener('input', handleInput, { capture: true });
  window.addEventListener('copy', handleClipboard as EventListener, { capture: true });
  window.addEventListener('paste', handleClipboard as EventListener, { capture: true });
  window.addEventListener('cut', handleClipboard as EventListener, { capture: true });

  window.addEventListener('mousedown', handleMouseDown, { capture: true });
  window.addEventListener('mouseup', handleMouseUp, { capture: true });

  window.addEventListener('mouseover', handleMouseOver, { capture: true });
  window.addEventListener('mouseout', handleMouseOut, { capture: true });

  return () => {
    window.removeEventListener('click', handleClick, { capture: true });
    window.removeEventListener('auxclick', handleAuxClick, { capture: true });
    window.removeEventListener('keydown', handleKeydown, { capture: true });
    window.removeEventListener('input', handleInput, { capture: true });
    window.removeEventListener('copy', handleClipboard as EventListener, { capture: true });
    window.removeEventListener('paste', handleClipboard as EventListener, { capture: true });
    window.removeEventListener('cut', handleClipboard as EventListener, { capture: true });
    window.removeEventListener('mousedown', handleMouseDown, { capture: true });
    window.removeEventListener('mouseup', handleMouseUp, { capture: true });
    window.removeEventListener('mouseover', handleMouseOver, { capture: true });
    window.removeEventListener('mouseout', handleMouseOut, { capture: true });
    if (hideTimer) clearTimeout(hideTimer);
    if (rafId) cancelAnimationFrame(rafId);
    if (mergeTimer) clearTimeout(mergeTimer);
    if (highlightEl) {
      highlightEl.remove();
      highlightEl = null;
    }
    hoveredElement = null;
    mergeWin = [];
  };
}
