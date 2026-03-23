import { createMachine, assign } from 'xstate';

export const captureMachine = createMachine({
  id: 'capture',
  initial: 'idle',
  context: {
    currentGuideId: null as string | null,
    stepCount: 0,
    currentUrl: '' as string,
  },
  states: {
    idle: {
      on: {
        START_RECORDING: {
          target: 'recording',
          actions: assign({
            currentGuideId: () => crypto.randomUUID(),
            stepCount: 0,
            currentUrl: ({ event }) => (event as { type: 'START_RECORDING'; url?: string }).url ?? '',
          }),
        },
      },
    },
    recording: {
      on: {
        STOP_RECORDING: {
          target: 'idle',
          actions: assign({
            currentGuideId: null,
            stepCount: 0,
            currentUrl: '',
          }),
        },
        USER_ACTION: {
          actions: assign({
            stepCount: ({ context }) => context.stepCount + 1,
          }),
        },
        SPA_NAVIGATE: {
          actions: assign({
            currentUrl: ({ event }) => (event as { type: 'SPA_NAVIGATE'; url: string }).url,
          }),
        },
      },
    },
  },
});
