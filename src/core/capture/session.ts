import { logger } from '@/lib/logger';
import { type CaptureHandle, startCapture } from './events/handlers';
import { startRrwebRecording } from './rrweb-recorder';

export class CaptureSession {
  private capture: CaptureHandle | null = null;
  private stopReplay: (() => void) | null = null;
  private activeGuideId: string | null = null;
  private disabled = false;

  get isActive(): boolean {
    return this.activeGuideId !== null;
  }

  get isDisabled(): boolean {
    return this.disabled;
  }

  get guideId(): string | null {
    return this.activeGuideId;
  }

  start(guideId: string): void {
    if (this.disabled) return;
    if (this.isActive) {
      this.stop();
    }

    logger.info('Capture started → guideId:', guideId);
    this.activeGuideId = guideId;
    const isTopFrame = window.self === window.top;
    this.capture = startCapture(guideId, isTopFrame);
    if (isTopFrame) {
      this.stopReplay = startRrwebRecording(guideId);
    }
  }

  stop(): void {
    if (!this.isActive) return;

    logger.info('Capture stopped → guideId:', this.activeGuideId);
    this.capture?.stop();
    this.stopReplay?.();
    this.capture = null;
    this.stopReplay = null;
    this.activeGuideId = null;
  }

  dispose(): void {
    this.stop();
    this.disabled = true;
    logger.debug('Capture session disposed');
  }
}
