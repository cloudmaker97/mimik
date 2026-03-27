import { logger } from '@/lib/logger';
import { browser } from '#imports';
import { defineContentScript } from 'wxt/utils/define-content-script';
import { sendMessage } from '@/lib/messaging';
import { TabMessage } from '@/lib/tab-messages';
import { CaptureState } from '@/core/capture/machine';
import { startCapture } from '@/core/capture/events';
import { startRrwebRecording } from '@/core/capture/rrweb-recorder';
import { updateUrl } from '@/core/capture/spa-nav';

const CLEANUP_EVENT = `mimik_remove_content_script_${browser.runtime.id}`;

export default defineContentScript({
  matches: ['<all_urls>'],
  allFrames: true,
  matchAboutBlank: true,
  runAt: 'document_idle',

  main() {
    document.dispatchEvent(new CustomEvent(CLEANUP_EVENT));

    let stopCapture: (() => void) | null = null;
    let stopRrweb: (() => void) | null = null;
    let destroyed = false;

    function beginCapture(guideId: string) {
      if (destroyed) return;
      logger.info('Begin capture → guideId:', guideId);
      stopCapture?.();
      stopRrweb?.();
      stopCapture = startCapture(guideId);
      stopRrweb = startRrwebRecording(guideId);
    }

    function endCapture() {
      if (stopCapture) logger.info('End capture');
      stopCapture?.();
      stopRrweb?.();
      stopCapture = null;
      stopRrweb = null;
    }

    function cleanup() {
      destroyed = true;
      endCapture();
      browser.runtime.onMessage.removeListener(messageHandler);
      document.removeEventListener(CLEANUP_EVENT, cleanup);
    }

    document.addEventListener(CLEANUP_EVENT, cleanup);
    window.addEventListener('beforeunload', () => endCapture());

    function messageHandler(
      msg: Record<string, unknown>,
      _sender: unknown,
      sendResponse: (r: unknown) => void,
    ) {
      if (destroyed) return false;

      if (msg.type === TabMessage.PING) {
        sendResponse({ alive: true });
        return true;
      }

      if (msg.type === TabMessage.GET_ROUTE) {
        sendResponse({ alive: true, capturing: !!stopCapture });
        return true;
      }

      if (msg.type === TabMessage.START_CAPTURE && msg.guideId) {
        beginCapture(msg.guideId as string);
        sendResponse({ started: true });
        return true;
      }

      if (msg.type === TabMessage.STOP_CAPTURE) {
        endCapture();
        sendResponse({ stopped: true });
        return true;
      }

      if (msg.type === TabMessage.URL_CHANGED && msg.url) {
        updateUrl(msg.url as string);
        sendResponse({ updated: true });
        return true;
      }

      return false;
    }

    browser.runtime.onMessage.addListener(messageHandler);

    sendMessage('getState', undefined)
      .then(res => {
        if (destroyed) return;
        if (res.state === CaptureState.RECORDING && res.currentGuideId) {
          beginCapture(res.currentGuideId);
        }
      })
      .catch(() => {});

    logger.info('Content script loaded →', window.location.href);
  },
});
