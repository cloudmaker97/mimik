import { sendMessage } from '@/lib/messaging';
// @ts-expect-error rrweb 1.1.3 type resolution
import { record } from 'rrweb';

const MAX_BUFFER_SIZE = 10_000;

export function startRrwebRecording(guideId: string): () => void {
  let eventBuffer: unknown[] = [];
  let flushTimer: ReturnType<typeof setInterval>;

  function flushChunk() {
    if (eventBuffer.length === 0) return;
    const chunk = eventBuffer.splice(0);
    sendMessage('rrwebChunk', { guideId, events: chunk, timestamp: Date.now() })
      .catch(() => {});
  }

  const stopRecord = record({
    emit(event: unknown, isCheckout?: boolean) {
      eventBuffer.push(event);
      if (eventBuffer.length > MAX_BUFFER_SIZE) {
        eventBuffer = eventBuffer.slice(-MAX_BUFFER_SIZE);
      }
      if (isCheckout) {
        flushChunk();
      }
    },
    checkoutEveryNms: 30_000,
  });

  flushTimer = setInterval(flushChunk, 30_000);

  return () => {
    flushChunk();
    clearInterval(flushTimer);
    stopRecord?.();
  };
}
