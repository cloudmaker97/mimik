import { browser } from '#imports';
import { ElementPicker } from './element-picker';
import { BlurPanel } from './panel';
import type { PresetKey } from './regexes';
import { BlurScanner } from './scanner';
import { injectBlurStyles, removeBlurStyles } from './styles';

export class BlurManager {
  private scanner = new BlurScanner();
  private picker = new ElementPicker();
  private panel: BlurPanel | null = null;
  private active = false;

  async start() {
    if (this.active) return;
    this.active = true;
    injectBlurStyles();

    const stored = await browser.storage.local.get(['blurPresets', 'blurAiEnabled']);
    const presets = (stored.blurPresets as Record<PresetKey, boolean>) || {
      email: true,
      phone: true,
      ssn: false,
      creditCard: false,
      ipAddress: false,
      macAddress: false,
    };
    const aiEnabled = (stored.blurAiEnabled as boolean) || false;

    const activePresets = (Object.entries(presets) as [PresetKey, boolean][]).filter(([, v]) => v).map(([k]) => k);

    this.scanner.start(activePresets);
    this.panel = new BlurPanel(presets, aiEnabled);
    this.panel.mount();

    document.addEventListener('mimik-blur:update-presets', this.onUpdatePresets);
    document.addEventListener('mimik-blur:start-picker', this.onStartPicker);
    document.addEventListener('mimik-blur:reset', this.onReset);
    document.addEventListener('mimik-blur:done', this.onDone);
    document.addEventListener('mimik-blur:toggle-ai', this.onToggleAi);
  }

  stop() {
    if (!this.active) return;
    this.active = false;
    this.scanner.stop();
    this.picker.stop();
    this.panel?.unmount();
    this.panel = null;
    removeBlurStyles();
    document.removeEventListener('mimik-blur:update-presets', this.onUpdatePresets);
    document.removeEventListener('mimik-blur:start-picker', this.onStartPicker);
    document.removeEventListener('mimik-blur:reset', this.onReset);
    document.removeEventListener('mimik-blur:done', this.onDone);
    document.removeEventListener('mimik-blur:toggle-ai', this.onToggleAi);
  }

  private onUpdatePresets = ((e: CustomEvent<{ presets: PresetKey[] }>) => {
    this.scanner.updatePresets(e.detail.presets);
  }) as EventListener;

  private onStartPicker = (() => {
    this.picker.start(() => this.picker.stop());
  }) as EventListener;

  private onReset = (() => {
    this.scanner.unblurAll();
  }) as EventListener;

  private onDone = (() => {
    this.panel?.unmount();
    this.panel = null;
    this.scanner.detach();
    this.picker.stop();
    document.removeEventListener('mimik-blur:update-presets', this.onUpdatePresets);
    document.removeEventListener('mimik-blur:start-picker', this.onStartPicker);
    document.removeEventListener('mimik-blur:reset', this.onReset);
    document.removeEventListener('mimik-blur:done', this.onDone);
    document.removeEventListener('mimik-blur:toggle-ai', this.onToggleAi);
    this.active = false;
  }) as EventListener;

  private onToggleAi = ((e: CustomEvent<{ enabled: boolean }>) => {
    if (e.detail.enabled) {
      browser.runtime
        .sendMessage({ type: 'BLUR_AI_DETECT', text: document.body.innerText })
        .then((res: any) => {
          if (res?.patterns) {
            const regexes = res.patterns.map((p: string) => new RegExp(p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'));
            this.scanner.setAiPatterns(regexes);
          }
        })
        .catch(() => {});
    } else {
      this.scanner.setAiPatterns([]);
    }
  }) as EventListener;
}
