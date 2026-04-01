import { logger } from '@/lib/logger';
import { startCapture, type CaptureHandle } from './events/handlers';
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
    this.capture = startCapture(guideId);
    this.stopReplay = startRrwebRecording(guideId);
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

  hideOverlay(): void {
    logger.debug('CaptureSession.hideOverlay, capture exists:', !!this.capture);
    this.capture?.hideOverlay();
  }

  showOverlay(): void {
    logger.debug('CaptureSession.showOverlay');
    this.capture?.showOverlay();
  }

  dispose(): void {
    this.stop();
    this.disabled = true;
    logger.debug('Capture session disposed');
  }
}
