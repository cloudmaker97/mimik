import { defineExtensionMessaging } from '@webext-core/messaging';
import type { ElementMeta } from '@/core/guides/types';
import type { CaptureStateValue } from '@/core/capture/machine';

export interface GetStateResponse {
  state: CaptureStateValue;
  stepCount: number;
  currentGuideId: string | null;
}

export interface StartRecordingData {
  url: string;
}

export interface StartRecordingResponse {
  guideId: string;
}

export interface StopRecordingResponse {
  success: boolean;
  guideId?: string;
}

export interface UserActionData {
  guideId: string;
  action: string;
  elementMeta: ElementMeta;
}

export type UserActionResponse =
  | { stepId: string }
  | { ignored: true }
  | { error: string };

export interface RrwebChunkData {
  guideId: string;
  events: unknown[];
  timestamp: number;
}

export interface RrwebChunkResponse {
  stored: boolean;
}

interface MimikProtocol {
  getState(): GetStateResponse;
  startRecording(data: StartRecordingData): StartRecordingResponse;
  stopRecording(): StopRecordingResponse;
  userAction(data: UserActionData): UserActionResponse;
  rrwebChunk(data: RrwebChunkData): RrwebChunkResponse;
}

export const { sendMessage, onMessage } = defineExtensionMessaging<MimikProtocol>();
