import { db } from '@/core/guides/db';
import type { Screenshot, Step } from '@/core/guides/types';

interface GuideMeCallbacks {
  onAdvance: (stepIndex: number) => void;
  onPrev: (stepIndex: number) => void;
  onCancel: () => void;
}

function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

const STYLES = `
  :host {
    position: fixed;
    inset: 0;
    z-index: 2147483646;
    pointer-events: none;
    font-family: 'Poppins', sans-serif;
  }

  .spotlight {
    position: fixed;
    inset: 0;
    pointer-events: none;
  }

  .spotlight path {
    pointer-events: auto;
    cursor: default;
  }

  .highlight {
    position: fixed;
    border: 2px solid #F59E0B;
    border-radius: 4px;
    box-shadow: 0 0 0 4px rgba(245, 158, 11, 0.25), 0 0 20px rgba(245, 158, 11, 0.15);
    pointer-events: none;
    transition: all 0.3s ease;
  }

  .tooltip {
    position: fixed;
    background: #451a03;
    color: #FDE68A;
    border-radius: 12px;
    padding: 16px;
    max-width: 320px;
    min-width: 240px;
    pointer-events: auto;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
    font-size: 14px;
    transition: all 0.3s ease;
  }

  .tooltip-step {
    font-size: 11px;
    font-weight: 600;
    opacity: 0.6;
    margin-bottom: 6px;
  }

  .tooltip-description {
    font-weight: 500;
    margin-bottom: 12px;
  }

  .tooltip-screenshot {
    width: 100%;
    border-radius: 8px;
    border: 1px solid rgba(253, 230, 138, 0.2);
    margin-bottom: 12px;
  }

  .tooltip-actions {
    display: flex;
    gap: 8px;
  }

  .tooltip-actions button {
    font-size: 12px;
    font-weight: 600;
    padding: 6px 14px;
    border-radius: 8px;
    border: none;
    cursor: pointer;
    font-family: 'Poppins', sans-serif;
  }

  .btn-nav {
    background: rgba(253, 230, 138, 0.15);
    color: #FDE68A;
  }

  .btn-next {
    background: #F59E0B;
    color: #451a03;
    margin-left: auto;
  }

  .btn-cancel {
    background: transparent;
    color: rgba(253, 230, 138, 0.5);
    padding: 6px 8px;
    font-size: 11px;
  }

  .fallback-msg {
    font-size: 12px;
    color: rgba(253, 230, 138, 0.7);
    margin-bottom: 8px;
  }
`;

const PAD = 6;
const CUTOUT_RADIUS = 4;
const TOOLTIP_GAP = 12;

export class GuideMeOverlay {
  private host: HTMLElement;
  private shadow: ShadowRoot;
  private spotlight: SVGSVGElement | null = null;
  private highlightEl: HTMLDivElement | null = null;
  private tooltipEl: HTMLDivElement | null = null;
  private resizeObserver: ResizeObserver | null = null;
  private scrollHandler: (() => void) | null = null;
  private escapeHandler: ((e: KeyboardEvent) => void) | null = null;
  private targetClickHandler: (() => void) | null = null;
  private targetKeyHandler: ((e: KeyboardEvent) => void) | null = null;
  private currentTarget: HTMLElement | null = null;
  private currentStepIndex = 0;
  private screenshotUrl: string | null = null;
  private autoAdvanceTimer: ReturnType<typeof setTimeout> | null = null;
  private callbacks: GuideMeCallbacks;

  constructor(callbacks: GuideMeCallbacks) {
    this.callbacks = callbacks;
    this.host = document.createElement('mimik-guideme');
    this.host.setAttribute('data-mimik-ignore', '');
    this.shadow = this.host.attachShadow({ mode: 'closed' });

    const style = document.createElement('style');
    style.textContent = STYLES;
    this.shadow.appendChild(style);

    document.documentElement.appendChild(this.host);
  }

  async show(step: Step, stepIndex: number, totalSteps: number, targetElement: HTMLElement | null): Promise<void> {
    this.cleanup();
    this.currentStepIndex = stepIndex;
    this.currentTarget = targetElement;

    if (targetElement) {
      targetElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      await new Promise((r) => setTimeout(r, 400));
      this.renderWithTarget(targetElement, step, stepIndex, totalSteps);
      this.setupActionDetection(step, targetElement);
    } else {
      await this.renderFallback(step, stepIndex, totalSteps);
    }

    this.setupGlobalListeners();
  }

  destroy(): void {
    this.cleanup();
    this.host.remove();
  }

  private cleanup(): void {
    if (this.autoAdvanceTimer) {
      clearTimeout(this.autoAdvanceTimer);
      this.autoAdvanceTimer = null;
    }

    if (this.targetClickHandler && this.currentTarget) {
      this.currentTarget.removeEventListener('click', this.targetClickHandler);
      this.targetClickHandler = null;
    }

    if (this.targetKeyHandler && this.currentTarget) {
      this.currentTarget.removeEventListener('keydown', this.targetKeyHandler);
      this.targetKeyHandler = null;
    }

    if (this.escapeHandler) {
      document.removeEventListener('keydown', this.escapeHandler);
      this.escapeHandler = null;
    }

    if (this.scrollHandler) {
      window.removeEventListener('scroll', this.scrollHandler, true);
      this.scrollHandler = null;
    }

    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
    }

    if (this.screenshotUrl) {
      URL.revokeObjectURL(this.screenshotUrl);
      this.screenshotUrl = null;
    }

    if (this.spotlight) {
      this.spotlight.remove();
      this.spotlight = null;
    }

    if (this.highlightEl) {
      this.highlightEl.remove();
      this.highlightEl = null;
    }

    if (this.tooltipEl) {
      this.tooltipEl.remove();
      this.tooltipEl = null;
    }
  }

  private renderWithTarget(target: HTMLElement, step: Step, stepIndex: number, totalSteps: number): void {
    const rect = target.getBoundingClientRect();
    this.renderSpotlight(rect);
    this.renderHighlight(rect);
    this.renderTooltip(step, stepIndex, totalSteps, false, rect);
  }

  private async renderFallback(step: Step, stepIndex: number, totalSteps: number): Promise<void> {
    if (step.screenshotId) {
      const screenshot: Screenshot | undefined = await db.screenshots.get(step.screenshotId);
      if (screenshot) {
        this.screenshotUrl = URL.createObjectURL(screenshot.blob);
      }
    }

    this.renderSpotlight(null);
    this.renderTooltip(step, stepIndex, totalSteps, true, null);
  }

  private renderSpotlight(rect: DOMRect | null): void {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('class', 'spotlight');
    svg.setAttribute('width', '100%');
    svg.setAttribute('height', '100%');

    const vw = window.innerWidth;
    const vh = window.innerHeight;
    svg.setAttribute('viewBox', `0 0 ${vw} ${vh}`);

    let pathD: string;
    if (rect) {
      const x = rect.left - PAD;
      const y = rect.top - PAD;
      const w = rect.width + PAD * 2;
      const h = rect.height + PAD * 2;
      const r = CUTOUT_RADIUS;

      pathD =
        `M0,0 H${vw} V${vh} H0 Z ` +
        `M${x + r},${y} ` +
        `H${x + w - r} Q${x + w},${y} ${x + w},${y + r} ` +
        `V${y + h - r} Q${x + w},${y + h} ${x + w - r},${y + h} ` +
        `H${x + r} Q${x},${y + h} ${x},${y + h - r} ` +
        `V${y + r} Q${x},${y} ${x + r},${y} Z`;
    } else {
      pathD = `M0,0 H${vw} V${vh} H0 Z`;
    }

    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('fill-rule', 'evenodd');
    path.setAttribute('fill', 'rgba(0,0,0,0.4)');
    path.setAttribute('d', pathD);

    svg.appendChild(path);
    path.addEventListener('click', (e) => e.stopPropagation());
    this.shadow.appendChild(svg);
    this.spotlight = svg;
  }

  private renderHighlight(rect: DOMRect): void {
    const div = document.createElement('div');
    div.className = 'highlight';
    div.style.left = `${rect.left - PAD}px`;
    div.style.top = `${rect.top - PAD}px`;
    div.style.width = `${rect.width + PAD * 2}px`;
    div.style.height = `${rect.height + PAD * 2}px`;
    this.shadow.appendChild(div);
    this.highlightEl = div;
  }

  private renderTooltip(
    step: Step,
    stepIndex: number,
    totalSteps: number,
    isFallback: boolean,
    rect: DOMRect | null,
  ): void {
    const div = document.createElement('div');
    div.className = 'tooltip';

    let html = `<div class="tooltip-step">Step ${stepIndex + 1} of ${totalSteps}</div>`;
    html += `<div class="tooltip-description">${escapeHtml(step.description)}</div>`;

    if (isFallback) {
      html += `<div class="fallback-msg">Could not find the target element on this page.</div>`;
      if (this.screenshotUrl) {
        html += `<img class="tooltip-screenshot" src="${this.screenshotUrl}" alt="Step screenshot" />`;
      }
    }

    html += `<div class="tooltip-actions">`;
    if (stepIndex > 0) {
      html += `<button class="btn-nav" data-action="prev">Prev</button>`;
    }
    html += `<button class="btn-cancel" data-action="cancel">Cancel</button>`;
    if (isFallback) {
      html += `<button class="btn-next" data-action="next">Next</button>`;
    }
    html += `</div>`;

    div.innerHTML = html;

    div.addEventListener('click', (e) => {
      const target = (e.target as HTMLElement).closest('button');
      if (!target) return;
      const action = target.getAttribute('data-action');
      if (action === 'prev') this.callbacks.onPrev(stepIndex);
      else if (action === 'next') this.callbacks.onAdvance(stepIndex);
      else if (action === 'cancel') this.callbacks.onCancel();
    });

    this.shadow.appendChild(div);
    this.tooltipEl = div;

    this.positionTooltip(rect);
  }

  private positionTooltip(rect: DOMRect | null): void {
    if (!this.tooltipEl) return;

    if (!rect) {
      this.tooltipEl.style.left = '50%';
      this.tooltipEl.style.top = '50%';
      this.tooltipEl.style.transform = 'translate(-50%, -50%)';
      return;
    }

    this.tooltipEl.style.transform = '';

    const tooltipRect = this.tooltipEl.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    const belowY = rect.bottom + PAD + TOOLTIP_GAP;
    const aboveY = rect.top - PAD - TOOLTIP_GAP - tooltipRect.height;
    const centerX = Math.max(
      8,
      Math.min(rect.left + rect.width / 2 - tooltipRect.width / 2, vw - tooltipRect.width - 8),
    );

    if (belowY + tooltipRect.height < vh) {
      this.tooltipEl.style.left = `${centerX}px`;
      this.tooltipEl.style.top = `${belowY}px`;
    } else if (aboveY > 0) {
      this.tooltipEl.style.left = `${centerX}px`;
      this.tooltipEl.style.top = `${aboveY}px`;
    } else {
      const rightX = rect.right + PAD + TOOLTIP_GAP;
      const rightY = Math.max(
        8,
        Math.min(rect.top + rect.height / 2 - tooltipRect.height / 2, vh - tooltipRect.height - 8),
      );
      this.tooltipEl.style.left = `${rightX}px`;
      this.tooltipEl.style.top = `${rightY}px`;
    }
  }

  private reposition(): void {
    if (!this.currentTarget) return;

    const rect = this.currentTarget.getBoundingClientRect();

    if (this.spotlight) {
      this.spotlight.remove();
      this.spotlight = null;
    }
    this.renderSpotlight(rect);

    if (this.highlightEl) {
      this.highlightEl.style.left = `${rect.left - PAD}px`;
      this.highlightEl.style.top = `${rect.top - PAD}px`;
      this.highlightEl.style.width = `${rect.width + PAD * 2}px`;
      this.highlightEl.style.height = `${rect.height + PAD * 2}px`;
    }

    this.positionTooltip(rect);
  }

  private setupGlobalListeners(): void {
    this.escapeHandler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        this.callbacks.onCancel();
      }
    };
    document.addEventListener('keydown', this.escapeHandler);

    if (this.currentTarget) {
      this.scrollHandler = () => this.reposition();
      window.addEventListener('scroll', this.scrollHandler, true);

      this.resizeObserver = new ResizeObserver(() => this.reposition());
      this.resizeObserver.observe(document.documentElement);
    }
  }

  private setupActionDetection(step: Step, target: HTMLElement): void {
    if (step.action === 'click') {
      this.targetClickHandler = () => {
        this.callbacks.onAdvance(this.currentStepIndex);
      };
      target.addEventListener('click', this.targetClickHandler);
    } else if (step.action === 'input') {
      if (target instanceof HTMLElement && target.getAttribute('contenteditable') !== null) {
        target.textContent = step.inputValue ?? '';
      } else if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) {
        const proto =
          target instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
        const nativeSetter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
        if (nativeSetter) {
          nativeSetter.call(target, step.inputValue ?? '');
        } else {
          target.value = step.inputValue ?? '';
        }
      }

      target.dispatchEvent(new Event('input', { bubbles: true }));
      target.dispatchEvent(new Event('change', { bubbles: true }));

      this.autoAdvanceTimer = setTimeout(() => {
        this.callbacks.onAdvance(this.currentStepIndex);
      }, 500);
    } else if (step.action.startsWith('keydown:')) {
      const expectedKey = step.action.replace('keydown:', '');
      this.targetKeyHandler = (e: KeyboardEvent) => {
        if (e.key === expectedKey) {
          this.callbacks.onAdvance(this.currentStepIndex);
        }
      };
      target.addEventListener('keydown', this.targetKeyHandler);
    }
  }
}
