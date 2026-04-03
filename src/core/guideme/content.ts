import { browser } from '#imports';
import type { Step } from '@/core/guides/types';
import { logger } from '@/lib/logger';
import { sendMessage } from '@/lib/messaging';
import { findElement } from './finder';
import { GuideMeOverlay } from './overlay';
import type { GuideMeSession } from './session';
import { SESSION_KEY, STEP_KEY } from './session';

const MAX_RETRIES = 5;
const RETRY_INTERVAL_MS = 1000;

export class GuideMeController {
  private overlay: GuideMeOverlay | null = null;
  private storageListener: ((changes: Record<string, { newValue?: unknown }>) => void) | null = null;
  private clickHandler: ((e: Event) => void) | null = null;
  private currentTarget: HTMLElement | null = null;
  private currentStepIndex = -1;

  start() {
    if (window.self !== window.top) return;
    this.storageListener = (changes) => {
      if (changes[SESSION_KEY] || changes[STEP_KEY]) {
        this.onStorageChange();
      }
    };
    browser.storage.local.onChanged.addListener(this.storageListener);
    this.checkForActiveSession();
  }

  dispose() {
    if (this.storageListener) {
      browser.storage.local.onChanged.removeListener(this.storageListener);
      this.storageListener = null;
    }
    this.removeActionDetection();
    this.destroyOverlay();
  }

  private async checkForActiveSession() {
    const data = await browser.storage.local.get([SESSION_KEY, STEP_KEY]);
    const session = data[SESSION_KEY] as GuideMeSession | null;
    const step = data[STEP_KEY] as Step | null;
    if (session?.active && step) {
      this.showStep(step, session.stepIndex);
    }
  }

  private async onStorageChange() {
    const data = await browser.storage.local.get([SESSION_KEY, STEP_KEY]);
    const session = data[SESSION_KEY] as GuideMeSession | null;
    const step = data[STEP_KEY] as Step | null;

    if (!session?.active || !step) {
      this.removeActionDetection();
      this.destroyOverlay();
      return;
    }

    this.showStep(step, session.stepIndex);
  }

  private async showStep(step: Step, stepIndex: number) {
    this.removeActionDetection();
    this.destroyOverlay();
    this.currentStepIndex = stepIndex;

    if (!step.elementMeta) return;

    let element: HTMLElement | null = null;
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      const result = findElement(step.elementMeta);
      if (result.element) {
        element = result.element;
        break;
      }
      if (attempt < MAX_RETRIES - 1) {
        await new Promise((r) => setTimeout(r, RETRY_INTERVAL_MS));
      }
    }

    if (!element) return;

    this.overlay = new GuideMeOverlay();
    this.overlay.show(step.description, stepIndex + 1, element);
    this.setupActionDetection(step, element);
  }

  private setupActionDetection(step: Step, target: HTMLElement) {
    this.currentTarget = target;

    if (step.action === 'input' && step.inputValue) {
      if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) {
        const proto =
          target instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
        const nativeSetter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
        if (nativeSetter) nativeSetter.call(target, step.inputValue);
        else target.value = step.inputValue;
      } else if (target.getAttribute('contenteditable') !== null) {
        target.textContent = step.inputValue;
      }
      target.dispatchEvent(new Event('input', { bubbles: true }));
      target.dispatchEvent(new Event('change', { bubbles: true }));
      setTimeout(() => this.advanceStep(), 500);
      return;
    }

    this.clickHandler = () => this.advanceStep();
    target.addEventListener('click', this.clickHandler, { once: true });
  }

  private advanceStep() {
    sendMessage('guideMeStepCompleted', { stepIndex: this.currentStepIndex }).catch((err) =>
      logger.warn('Failed to advance guide me step', err),
    );
  }

  private removeActionDetection() {
    if (this.clickHandler && this.currentTarget) {
      this.currentTarget.removeEventListener('click', this.clickHandler);
    }
    this.clickHandler = null;
    this.currentTarget = null;
  }

  private destroyOverlay() {
    this.overlay?.destroy();
    this.overlay = null;
  }
}
