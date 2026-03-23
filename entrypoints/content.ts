import { defineContentScript } from 'wxt/utils/define-content-script';
import { startCapture } from '../src/content/events';
import { startRrwebRecording } from '../src/content/rrweb-recorder';
import { updateUrl } from '../src/content/spa-nav';

const CLEANUP_EVENT = `mimik_remove_content_script_${chrome.runtime.id}`;

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
      stopCapture?.();
      stopRrweb?.();
      stopCapture = startCapture(guideId);
      stopRrweb = startRrwebRecording(guideId);
    }

    function endCapture() {
      stopCapture?.();
      stopRrweb?.();
      stopCapture = null;
      stopRrweb = null;
    }

    function cleanup() {
      destroyed = true;
      endCapture();
      chrome.runtime.onMessage.removeListener(messageHandler);
      document.removeEventListener(CLEANUP_EVENT, cleanup);
    }

    document.addEventListener(CLEANUP_EVENT, cleanup);

    window.addEventListener('beforeunload', () => {
      endCapture();
    });

    function messageHandler(msg: any, _sender: any, sendResponse: (r: any) => void) {
      if (destroyed) return false;

      if (msg.type === 'PING') {
        sendResponse({ alive: true });
        return true;
      }

      if (msg.type === 'GET_ROUTE') {
        sendResponse({ alive: true, capturing: !!stopCapture });
        return true;
      }

      if (msg.type === 'START_CAPTURE' && msg.guideId) {
        beginCapture(msg.guideId);
        sendResponse({ started: true });
        return true;
      }

      if (msg.type === 'STOP_CAPTURE') {
        endCapture();
        sendResponse({ stopped: true });
        return true;
      }

      if (msg.type === 'SPA_NAVIGATE' && msg.url) {
        updateUrl(msg.url);
        sendResponse({ updated: true });
        return true;
      }

      return false;
    }

    chrome.runtime.onMessage.addListener(messageHandler);

    try {
      chrome.runtime.sendMessage({ type: 'GET_STATE' }, (response) => {
        if (chrome.runtime.lastError) return; // Extension context invalid
        if (destroyed) return;
        if (response?.state === 'recording' && response.currentGuideId) {
          beginCapture(response.currentGuideId);
        }
      });
    } catch {
    }

    console.log('[Mimik] Content script loaded');
  },
});
