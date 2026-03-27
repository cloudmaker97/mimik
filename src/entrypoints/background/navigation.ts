import { logger } from "@/lib/logger";
import {
  onNavigationCompleted,
  onHistoryStateUpdated,
  onTabActivated,
  onTabUpdated,
  sendMessageToTab,
  getTab,
} from "@/lib/browser-api";
import { TabMessage } from "@/lib/tab-messages";
import { isInjectableTab, injectContentScript } from "./tab-manager";
import { getActor, waitUntilReady } from "./actor";
import { CaptureState } from "@/core/capture/machine";

export function registerNavigationListeners() {
  onNavigationCompleted(async (details) => {
    if (details.frameId !== 0) return;
    await waitUntilReady();
    const state = getActor().getSnapshot();
    if (state.value === CaptureState.RECORDING) {
      logger.debug("URL changed (navigation) →", details.url);
      getActor().send({ type: "URL_CHANGED", url: details.url });
    }
  });

  onHistoryStateUpdated(async (details) => {
    if (details.frameId !== 0) return;
    await waitUntilReady();
    const state = getActor().getSnapshot();
    if (state.value === CaptureState.RECORDING) {
      logger.debug("URL changed (SPA pushState) →", details.url);
      getActor().send({ type: "URL_CHANGED", url: details.url });
    }
  });

  onTabActivated(async (activeInfo) => {
    await waitUntilReady();
    const state = getActor().getSnapshot();
    if (state.value !== CaptureState.RECORDING) return;
    if (!state.context.currentGuideId) return;

    try {
      await sendMessageToTab(activeInfo.tabId, { type: TabMessage.PING });
      logger.debug("Tab switched → content script alive on tab", activeInfo.tabId);
    } catch {
      logger.debug("Tab switched → injecting content script on tab", activeInfo.tabId);
      try {
        const tab = await getTab(activeInfo.tabId);
        if (isInjectableTab(tab)) {
          await injectContentScript(activeInfo.tabId);
        }
      } catch {
      }
    }
  });

  onTabUpdated(async (tabId, changeInfo, tab) => {
    if (changeInfo.status !== "complete") return;
    await waitUntilReady();
    const state = getActor().getSnapshot();
    if (state.value !== CaptureState.RECORDING) return;
    if (!isInjectableTab(tab)) return;

    try {
      await sendMessageToTab(tabId, { type: TabMessage.PING });
    } catch {
      logger.debug("Tab loaded → injecting content script on tab", tabId);
      try {
        await injectContentScript(tabId);
      } catch {
      }
    }
  });
}
