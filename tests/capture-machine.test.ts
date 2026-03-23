import { describe, it, expect } from 'vitest';
import { createActor } from 'xstate';
import { captureMachine } from '../src/background/machine';

describe('captureMachine Phase 2', () => {
  it('idle -> recording on START_RECORDING; context.currentGuideId is a UUID string', () => {
    const actor = createActor(captureMachine);
    actor.start();
    actor.send({ type: 'START_RECORDING', url: 'https://example.com' });
    const snapshot = actor.getSnapshot();
    expect(snapshot.value).toBe('recording');
    expect(typeof snapshot.context.currentGuideId).toBe('string');
    expect(snapshot.context.currentGuideId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
    );
    actor.stop();
  });

  it('recording -> idle on STOP_RECORDING; context resets to null/0/empty', () => {
    const actor = createActor(captureMachine);
    actor.start();
    actor.send({ type: 'START_RECORDING', url: 'https://example.com' });
    actor.send({ type: 'STOP_RECORDING' });
    const snapshot = actor.getSnapshot();
    expect(snapshot.value).toBe('idle');
    expect(snapshot.context.currentGuideId).toBeNull();
    expect(snapshot.context.stepCount).toBe(0);
    expect(snapshot.context.currentUrl).toBe('');
    actor.stop();
  });

  it('USER_ACTION in recording state increments stepCount by 1', () => {
    const actor = createActor(captureMachine);
    actor.start();
    actor.send({ type: 'START_RECORDING', url: 'https://example.com' });
    expect(actor.getSnapshot().context.stepCount).toBe(0);
    actor.send({ type: 'USER_ACTION' });
    expect(actor.getSnapshot().context.stepCount).toBe(1);
    actor.send({ type: 'USER_ACTION' });
    expect(actor.getSnapshot().context.stepCount).toBe(2);
    actor.stop();
  });

  it('USER_ACTION in idle state does nothing (no transition)', () => {
    const actor = createActor(captureMachine);
    actor.start();
    expect(actor.getSnapshot().value).toBe('idle');
    actor.send({ type: 'USER_ACTION' });
    expect(actor.getSnapshot().value).toBe('idle');
    expect(actor.getSnapshot().context.stepCount).toBe(0);
    actor.stop();
  });

  it('SPA_NAVIGATE in recording state updates currentUrl', () => {
    const actor = createActor(captureMachine);
    actor.start();
    actor.send({ type: 'START_RECORDING', url: 'https://example.com' });
    actor.send({ type: 'SPA_NAVIGATE', url: 'https://example.com/page2' });
    expect(actor.getSnapshot().context.currentUrl).toBe('https://example.com/page2');
    expect(actor.getSnapshot().value).toBe('recording');
    actor.stop();
  });

  it('START_RECORDING sets currentUrl from event payload', () => {
    const actor = createActor(captureMachine);
    actor.start();
    actor.send({ type: 'START_RECORDING', url: 'https://example.com/start' });
    expect(actor.getSnapshot().context.currentUrl).toBe('https://example.com/start');
    actor.stop();
  });

  it('getPersistedSnapshot() roundtrip preserves currentUrl and stepCount', () => {
    const actor = createActor(captureMachine);
    actor.start();
    actor.send({ type: 'START_RECORDING', url: 'https://example.com' });
    actor.send({ type: 'USER_ACTION' });
    actor.send({ type: 'USER_ACTION' });
    actor.send({ type: 'SPA_NAVIGATE', url: 'https://example.com/dashboard' });

    const persisted = actor.getPersistedSnapshot();
    actor.stop();

    const restored = createActor(captureMachine, { snapshot: persisted });
    restored.start();
    const snapshot = restored.getSnapshot();
    expect(snapshot.context.currentUrl).toBe('https://example.com/dashboard');
    expect(snapshot.context.stepCount).toBe(2);
    restored.stop();
  });
});
