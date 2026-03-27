import { defineBackground } from "#imports";
import { logger } from "@/lib/logger";
import { setSidePanelBehavior } from "@/lib/browser-api";
import { onMessage } from "@/lib/messaging";
import { setupPortListener, broadcastStateToPanel } from "@/lib/port";
import { createGuide, saveRrwebChunk } from "@/core/guides/service";
import {
  initActor,
  initActorFallback,
  getActor,
  getStateUpdate,
  waitUntilReady,
} from "./actor";
import { broadcastStartCapture, broadcastStopCapture } from "./tab-manager";
import { handleUserAction } from "./step-pipeline";
import { registerNavigationListeners } from "./navigation";

export default defineBackground(() => {
  logger.info("Background service worker started");

  setSidePanelBehavior(true);
  initActor().catch(initActorFallback);
  registerNavigationListeners();

  setupPortListener((port) => {
    logger.debug("Panel connected via port");
    waitUntilReady().then(() => {
      try {
        port.postMessage(getStateUpdate());
      } catch {
        /* disconnected */
      }
    });
  });

  waitUntilReady().then(() => {
    getActor().subscribe(() => broadcastStateToPanel(getStateUpdate()));
  });

  onMessage("getState", async () => {
    await waitUntilReady();
    const update = getStateUpdate();
    logger.debug("getState →", update.state);
    return update;
  });

  onMessage("startRecording", async ({ data }) => {
    logger.info("startRecording →", data.url);
    await waitUntilReady();
    const actor = getActor();
    actor.send({ type: "START_RECORDING", url: data.url });
    const guideId = actor.getSnapshot().context.currentGuideId!;

    await createGuide(guideId);

    await broadcastStartCapture(guideId);
    logger.info("Recording started → guideId:", guideId);
    return { guideId };
  });

  onMessage("stopRecording", async () => {
    await waitUntilReady();
    const actor = getActor();
    const guideId = actor.getSnapshot().context.currentGuideId;
    logger.info("stopRecording → guideId:", guideId);
    await broadcastStopCapture();
    actor.send({ type: "STOP_RECORDING" });
    return { success: true, guideId: guideId ?? undefined };
  });

  onMessage("userAction", async (message) => {
    await waitUntilReady();
    logger.debug("userAction →", message.data.action);
    return handleUserAction(message.data, message.sender);
  });

  onMessage("rrwebChunk", async ({ data }) => {
    logger.debug("rrwebChunk →", data.events.length, "events");
    await saveRrwebChunk({
      id: crypto.randomUUID(),
      guideId: data.guideId,
      events: data.events,
      timestamp: data.timestamp,
    });
    return { stored: true };
  });
});
