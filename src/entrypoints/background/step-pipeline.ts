import { logger } from '@/lib/logger';
import { localStorage } from '@/lib/browser-api';
import { captureAnnotated } from '@/core/capture/screenshot';
import { buildFallbackDescription } from '@/core/capture/step-description';
import { getAIDescription } from '@/core/capture/ai-description';
import { createStep, addStepToGuide, updateStepDescription } from '@/core/guides/service';
import { getActor } from './actor';
import type { Browser } from '#imports';
import { CaptureState } from '@/core/capture/machine';
import type { UserActionData, UserActionResponse } from '@/lib/messaging';

let captureQueue: Promise<void> = Promise.resolve();

function enqueue(fn: () => Promise<void>): void {
  captureQueue = captureQueue
    .then(fn)
    .catch((err) => logger.error(' Capture error', err));
}

export function handleUserAction(
  data: UserActionData,
  sender: Browser.runtime.MessageSender,
): UserActionResponse {
  const actor = getActor();
  const snap = actor.getSnapshot();

  if (snap.value !== CaptureState.RECORDING) {
    return { ignored: true };
  }

  const stepIndex = snap.context.stepCount;
  actor.send({ type: 'USER_ACTION' });
  const guideId = snap.context.currentGuideId!;
  const stepId = crypto.randomUUID();
  const tabId = sender.tab?.id;

  if (!tabId) {
    return { error: 'no tabId' };
  }

  enqueue(async () => {
    const fallbackDescription = buildFallbackDescription(data.action, data.elementMeta);
    const currentUrl = snap.context.currentUrl;

    let screenshotId: string | undefined;
    let screenshotBlob: Blob | undefined;
    try {
      const screenshot = await captureAnnotated(tabId, stepId, data.elementMeta);
      screenshotId = screenshot.id;
      screenshotBlob = screenshot.blob;
    } catch (err) {
      logger.warn(' Screenshot capture failed, storing step without screenshot', err);
    }

    await createStep({
      id: stepId,
      guideId,
      index: stepIndex,
      description: fallbackDescription,
      action: data.action,
      url: currentUrl,
      timestamp: Date.now(),
      screenshotId,
    });

    await addStepToGuide(guideId, stepId);

    if (screenshotBlob) {
      (async () => {
        try {
          const settings = await localStorage.get(['aiApiKey', 'aiProvider']);
          if (settings.aiApiKey) {
            const provider = (settings.aiProvider as 'openai' | 'anthropic') || 'openai';
            const aiDescription = await getAIDescription(
              screenshotBlob,
              data.action,
              data.elementMeta,
              provider,
              settings.aiApiKey as string,
            );
            if (aiDescription) {
              await updateStepDescription(stepId, aiDescription);
            }
          }
        } catch (err) {
          logger.error(' AI description update failed', err);
        }
      })();
    }
  });

  return { stepId };
}
