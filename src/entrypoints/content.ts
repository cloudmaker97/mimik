import { defineContentScript } from 'wxt/utils/define-content-script';
import { browser } from '#imports';
import { CaptureState } from '@/core/capture/machine';
import { CaptureSession } from '@/core/capture/session';
import { updateUrl } from '@/core/capture/spa-nav';
import { showStartNotification } from '@/core/capture/start-notification';
import { logger } from '@/lib/logger';
import { sendMessage } from '@/lib/messaging';
import { TabMessage } from '@/lib/tab-messages';

const CLEANUP_EVENT = `mimik_cleanup_${browser.runtime.id}`;

function createTabMessageHandler(session: CaptureSession) {
  return function handleTabMessage(msg: Record<string, unknown>, _sender: unknown, sendResponse: (r: unknown) => void) {
    if (session.isDisabled) return false;

    switch (msg.type) {
      case TabMessage.PING:
        sendResponse({ alive: true });
        return true;

      case TabMessage.GET_ROUTE:
        sendResponse({ alive: true, capturing: session.isActive });
        return true;

      case TabMessage.START_CAPTURE:
        if (msg.guideId) {
          session.start(msg.guideId as string);
          sendResponse({ started: true });
        }
        return true;

      case TabMessage.STOP_CAPTURE:
        session.stop();
        sendResponse({ stopped: true });
        return true;

      case TabMessage.URL_CHANGED:
        if (msg.url) {
          updateUrl(msg.url as string);
          sendResponse({ updated: true });
        }
        return true;

      case TabMessage.SHOW_NOTIFICATION:
        logger.debug('Received SHOW_NOTIFICATION message');
        showStartNotification().then(() => {
          sendResponse({ done: true });
        });
        return true;

      default:
        return false;
    }
  };
}

function syncWithBackground(session: CaptureSession) {
  sendMessage('getState', undefined)
    .then((res) => {
      if (session.isDisabled) return;
      if (res.state === CaptureState.RECORDING && res.currentGuideId) {
        session.start(res.currentGuideId);
      }
    })
    .catch(() => {});
}

export default defineContentScript({
  matches: ['<all_urls>'],
  allFrames: true,
  matchAboutBlank: true,
  runAt: 'document_idle',

  main() {
    document.dispatchEvent(new CustomEvent(CLEANUP_EVENT));

    const session = new CaptureSession();
    const handleTabMessage = createTabMessageHandler(session);

    document.addEventListener(CLEANUP_EVENT, () => {
      session.dispose();
      browser.runtime.onMessage.removeListener(handleTabMessage);
    });

    window.addEventListener('beforeunload', () => session.stop());
    browser.runtime.onMessage.addListener(handleTabMessage);
    syncWithBackground(session);

    logger.info('Content script loaded →', window.location.href);
  },
});
