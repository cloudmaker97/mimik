const PICKER_TAG = 'mimik-blur-picker';
const MANUAL_CLASS = 'mimik-manual-blur';
const BLUR_ATTR = 'data-mimik-blur';

const STYLES = `
  :host {
    position: fixed;
    inset: 0;
    z-index: 2147483645;
    pointer-events: none;
  }
  .ring {
    position: fixed;
    border: 2px dashed #7C3AED;
    border-radius: 4px;
    pointer-events: none;
    transition: all 0.15s ease;
    box-shadow: 0 0 0 2px rgba(124, 58, 237, 0.1);
    display: none;
  }
  .bar {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    background: rgba(255, 255, 255, 0.97);
    backdrop-filter: blur(8px);
    border-top: 1px solid #E8E2DA;
    padding: 10px 18px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    pointer-events: auto;
    font-family: 'Poppins', system-ui, sans-serif;
  }
  .bar-left {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 12px;
    font-weight: 500;
    color: #451a03;
  }
  .bar-left svg { color: #7C3AED; }
  .bar-done {
    padding: 6px 16px;
    border-radius: 8px;
    font-size: 11px;
    font-weight: 600;
    border: none;
    cursor: pointer;
    font-family: inherit;
    background: #451a03;
    color: #FDE68A;
  }
`;

export class ElementPicker {
  private host: HTMLElement | null = null;
  private ring: HTMLElement | null = null;
  private listeners: [string, EventListener, AddEventListenerOptions][] = [];
  private onDone: (() => void) | null = null;

  start(onDone: () => void) {
    this.onDone = onDone;
    this.mount();
    this.listeners = [
      ['click', this.onClick.bind(this), { capture: true }],
      ['mousedown', this.suppress.bind(this), { capture: true }],
      ['mouseup', this.suppress.bind(this), { capture: true }],
      ['pointerdown', this.suppress.bind(this), { capture: true }],
      ['pointerup', this.suppress.bind(this), { capture: true }],
      ['mouseover', this.onMouseOver.bind(this), { capture: true, passive: true }],
      ['mouseout', this.onMouseOut.bind(this), { capture: true, passive: true }],
    ];
    for (const [event, handler, opts] of this.listeners) {
      window.addEventListener(event, handler, opts);
    }
    document.documentElement.style.cursor = 'pointer';
  }

  stop() {
    for (const [event, handler, opts] of this.listeners) {
      window.removeEventListener(event, handler, opts);
    }
    this.listeners = [];
    this.host?.remove();
    this.host = null;
    this.ring = null;
    document.documentElement.style.removeProperty('cursor');
  }

  private mount() {
    this.host = document.createElement('div');
    this.host.setAttribute('data-mimik-ignore', '');

    const shadow = this.host.attachShadow({ mode: 'closed' });
    const style = document.createElement('style');
    style.textContent = STYLES;
    shadow.appendChild(style);

    const ring = document.createElement('div');
    ring.className = 'ring';
    shadow.appendChild(ring);

    const bar = document.createElement('div');
    bar.className = 'bar';
    bar.innerHTML = `
      <div class="bar-left">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z"/></svg>
        Select elements to blur
      </div>
    `;
    const doneBtn = document.createElement('button');
    doneBtn.className = 'bar-done';
    doneBtn.textContent = 'Done';
    doneBtn.addEventListener('click', () => this.onDone?.());
    bar.appendChild(doneBtn);
    shadow.appendChild(bar);

    this.ring = ring;
    document.documentElement.appendChild(this.host);
  }

  private isMimikElement(el: Element): boolean {
    return !!el.closest('[data-mimik-ignore]');
  }

  private suppress(e: Event) {
    if (e.target instanceof Element && this.isMimikElement(e.target)) return;
    e.stopImmediatePropagation();
  }

  private onClick(e: Event) {
    const raw = (e as MouseEvent).target;
    if (!raw || !(raw instanceof HTMLElement)) return;
    if (this.isMimikElement(raw)) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    this.toggleBlur(raw);
  }

  private toggleBlur(el: HTMLElement) {
    if (el.classList.contains(MANUAL_CLASS)) {
      el.classList.remove(MANUAL_CLASS);
      el.removeAttribute(BLUR_ATTR);
    } else {
      el.classList.add(MANUAL_CLASS);
      el.setAttribute(BLUR_ATTR, 'manual');
    }
  }

  private onMouseOver(e: Event) {
    const raw = (e as MouseEvent).target;
    if (!raw || !(raw instanceof HTMLElement) || this.isMimikElement(raw)) return;
    if (!this.ring) return;
    const rect = raw.getBoundingClientRect();
    const pad = 3;
    this.ring.style.left = `${rect.left - pad}px`;
    this.ring.style.top = `${rect.top - pad}px`;
    this.ring.style.width = `${rect.width + pad * 2}px`;
    this.ring.style.height = `${rect.height + pad * 2}px`;
    this.ring.style.display = 'block';
  }

  private onMouseOut() {
    if (this.ring) this.ring.style.display = 'none';
  }
}
