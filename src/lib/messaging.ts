import { defineExtensionMessaging } from '@webext-core/messaging';
import type { ElementMeta } from '@/guides/types';

interface MimikProtocol {
  ping(): { alive: boolean };

  getState(): {
    state: string;
    stepCount: number;
    currentGuideId: string | null;
  };

  startRecording(data: { url: string }): { guideId: string };
  stopRecording(): { success: boolean; guideId?: string };

  userAction(data: {
    guideId: string;
    action: string;
    elementMeta: ElementMeta;
  }): { stepId: string } | { ignored: true } | { error: string };

  rrwebChunk(data: {
    guideId: string;
    events: unknown[];
    timestamp: number;
  }): { stored: boolean };
}

export const { sendMessage, onMessage } = defineExtensionMessaging<MimikProtocol>();
