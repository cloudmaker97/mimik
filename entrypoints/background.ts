import { defineBackground } from 'wxt/utils/define-background';
import { createActor } from 'xstate';
import { captureMachine } from '../src/background/machine';
import { captureAnnotated } from '../src/background/screenshot';
import { buildFallbackDescription } from '../src/background/step-description';
import { getAIDescription } from '../src/background/ai-description';
import { db } from '../src/shared/db-schema';

export default defineBackground(() => {
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });

  let actorReadyResolve!: () => void;
  const actorReady = new Promise<void>(resolve => {
    actorReadyResolve = resolve;
  });

  let actor: ReturnType<typeof createActor<typeof captureMachine>>;

  async function startActor() {
    try {
      const result = await chrome.storage.session.get('machineSnapshot');
      const snapshot = result.machineSnapshot ?? undefined;
      actor = createActor(captureMachine, { snapshot });
      actor.start();
    } catch (err) {
      console.warn('[Mimik] Failed to restore snapshot, starting fresh', err);
      await chrome.storage.session.remove('machineSnapshot');
      actor = createActor(captureMachine);
      actor.start();
    }

    actor.subscribe(() => {
      const persisted = actor.getPersistedSnapshot();
      chrome.storage.session.set({ machineSnapshot: persisted });
    });

    actorReadyResolve();
  }

  startActor().catch((err) => {
    console.error('[Mimik] startActor failed', err);
    actor = createActor(captureMachine);
    actor.start();
    actorReadyResolve();
  });

  let captureQueue: Promise<void> = Promise.resolve();

  function enqueueCaptureStep(fn: () => Promise<void>): void {
    captureQueue = captureQueue.then(fn).catch(err =>
      console.error('[Mimik] Capture error', err)
    );
  }

  function isInjectableTab(tab: chrome.tabs.Tab): boolean {
    const url = tab.url || tab.pendingUrl || '';
    if (!url || url.startsWith('chrome://') || url.startsWith('chrome-extension://') ||
        url.startsWith('chrome.google.com/webstore') || url.startsWith('about:')) return false;
    return /^https?:/.test(url);
  }

  async function injectContentScript(tabId: number): Promise<void> {
    try {
      await chrome.tabs.sendMessage(tabId, { type: 'PING' });
    } catch {
      try {
        await chrome.scripting.executeScript({
          target: { tabId, allFrames: true },
          files: ['content-scripts/content.js'],
        });
      } catch (err) {
      }
    }
  }

  async function injectAllTabs(): Promise<void> {
    try {
      const windows = await chrome.windows.getAll({ populate: true });
      for (const win of windows) {
        for (const tab of win.tabs || []) {
          if (tab.id && isInjectableTab(tab)) {
            injectContentScript(tab.id);
          }
        }
      }
    } catch (err) {
      console.warn('[Mimik] injectAllTabs failed', err);
    }
  }

  async function broadcastStartCapture(guideId: string): Promise<void> {
    try {
      const tabs = await chrome.tabs.query({});
      for (const tab of tabs) {
        if (tab.id && isInjectableTab(tab)) {
          chrome.tabs.sendMessage(tab.id, { type: 'START_CAPTURE', guideId }).catch(() => {});
        }
      }
    } catch (err) {
      console.warn('[Mimik] broadcastStartCapture failed', err);
    }
  }

  async function broadcastStopCapture(): Promise<void> {
    try {
      const tabs = await chrome.tabs.query({});
      for (const tab of tabs) {
        if (tab.id) {
          chrome.tabs.sendMessage(tab.id, { type: 'STOP_CAPTURE' }).catch(() => {});
        }
      }
    } catch (err) {
      console.warn('[Mimik] broadcastStopCapture failed', err);
    }
  }

  injectAllTabs();

  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.type === 'PING') {
      sendResponse({ alive: true });
      return true;
    }

    if (msg.type === 'GET_STATE') {
      (async () => {
        try {
          await actorReady;
          const snap = actor.getSnapshot();
          sendResponse({
            state: snap.value ?? 'unknown',
            stepCount: snap.context.stepCount,
            currentGuideId: snap.context.currentGuideId,
          });
        } catch (err) {
          console.error('[Mimik] GET_STATE failed', err);
          sendResponse({ state: 'unknown' });
        }
      })();
      return true;
    }

    if (msg.type === 'START_RECORDING') {
      (async () => {
        try {
          await actorReady;
          actor.send({ type: 'START_RECORDING', url: msg.url });

          const guideId = actor.getSnapshot().context.currentGuideId!;

          await db.guides.add({
            id: guideId,
            title: 'Untitled Guide',
            createdAt: Date.now(),
            updatedAt: Date.now(),
            stepIds: [],
          });

          await broadcastStartCapture(guideId);

          sendResponse({ guideId });
        } catch (err) {
          console.error('[Mimik] START_RECORDING failed', err);
          sendResponse({ error: String(err) });
        }
      })();
      return true;
    }

    if (msg.type === 'STOP_RECORDING') {
      (async () => {
        try {
          await actorReady;

          await broadcastStopCapture();

          actor.send({ type: 'STOP_RECORDING' });
          sendResponse({ success: true });
        } catch (err) {
          console.error('[Mimik] STOP_RECORDING failed', err);
          sendResponse({ error: String(err) });
        }
      })();
      return true;
    }

    if (msg.type === 'USER_ACTION') {
      (async () => {
        await actorReady;

        const snap = actor.getSnapshot();
        if (snap.value !== 'recording') {
          sendResponse({ ignored: true });
          return;
        }

        actor.send({ type: 'USER_ACTION' });

        const stepCount = actor.getSnapshot().context.stepCount;
        const guideId = snap.context.currentGuideId!;
        const stepId = crypto.randomUUID();
        const tabId = sender.tab?.id;

        if (!tabId) {
          sendResponse({ error: 'no tabId' });
          return;
        }

        sendResponse({ stepId });

        enqueueCaptureStep(async () => {
          const fallbackDescription = buildFallbackDescription(msg.action, msg.elementMeta);
          const currentUrl = snap.context.currentUrl;

          let screenshotId: string | undefined;
          let screenshotBlob: Blob | undefined;
          try {
            const screenshot = await captureAnnotated(tabId, stepId, msg.elementMeta);
            screenshotId = screenshot.id;
            screenshotBlob = screenshot.blob;
          } catch (err) {
            console.warn('[Mimik] Screenshot capture failed, storing step without screenshot', err);
          }

          await db.steps.add({
            id: stepId,
            guideId,
            index: stepCount,
            description: fallbackDescription,
            action: msg.action,
            url: currentUrl,
            timestamp: Date.now(),
            screenshotId,
          });

          const guide = await db.guides.get(guideId);
          if (guide) {
            await db.guides.update(guideId, {
              stepIds: [...guide.stepIds, stepId],
              updatedAt: Date.now(),
            });
          }

          if (screenshotBlob) {
            (async () => {
              try {
                const settings = await chrome.storage.local.get(['aiApiKey', 'aiProvider']);
                if (settings.aiApiKey) {
                  const provider = (settings.aiProvider as 'openai' | 'anthropic') || 'openai';
                  const aiDescription = await getAIDescription(
                    screenshotBlob,
                    msg.action,
                    msg.elementMeta,
                    provider,
                    settings.aiApiKey
                  );
                  if (aiDescription) {
                    await db.steps.update(stepId, { description: aiDescription });
                  }
                }
              } catch (err) {
                console.error('[Mimik] AI description update failed', err);
              }
            })();
          }
        });
      })();
      return true;
    }

    if (msg.type === 'RRWEB_CHUNK') {
      (async () => {
        await db.rrwebEvents.add({
          id: crypto.randomUUID(),
          guideId: msg.guideId,
          events: msg.events,
          timestamp: msg.timestamp,
        });
        sendResponse({ stored: true });
      })();
      return true;
    }

    return false;
  });

  chrome.webNavigation.onCompleted.addListener(async (details) => {
    if (details.frameId !== 0) return;
    await actorReady;
    const state = actor.getSnapshot();
    if (state.value === 'recording') {
      actor.send({ type: 'SPA_NAVIGATE', url: details.url });
    }
  });

  chrome.webNavigation.onHistoryStateUpdated.addListener(async (details) => {
    if (details.frameId !== 0) return;
    await actorReady;
    const state = actor.getSnapshot();
    if (state.value === 'recording') {
      actor.send({ type: 'SPA_NAVIGATE', url: details.url });
    }
  });

  chrome.tabs.onActivated.addListener(async (activeInfo) => {
    await actorReady;
    const state = actor.getSnapshot();
    if (state.value !== 'recording') return;

    const guideId = state.context.currentGuideId;
    if (!guideId) return;

    try {
      await chrome.tabs.sendMessage(activeInfo.tabId, { type: 'PING' });
    } catch {
      try {
        const tab = await chrome.tabs.get(activeInfo.tabId);
        if (isInjectableTab(tab)) {
          await injectContentScript(activeInfo.tabId);
        }
      } catch {
      }
    }
  });

  chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
    if (changeInfo.status !== 'complete') return;
    await actorReady;
    const state = actor.getSnapshot();
    if (state.value !== 'recording') return;
    if (!isInjectableTab(tab)) return;

    try {
      await chrome.tabs.sendMessage(tabId, { type: 'PING' });
    } catch {
      try {
        await injectContentScript(tabId);
      } catch {
      }
    }
  });
});
