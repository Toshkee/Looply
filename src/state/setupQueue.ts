/**
 * Services picked during onboarding. Onboarding closes as soon as it is
 * saved, so it leaves them here and the overview opens the form for each
 * once the tabs are on screen. Taking them empties the queue, so they are
 * offered only once.
 */
let pending: string[] = [];

export function queueFirstSubscriptions(presetNames: readonly string[]): void {
  pending = [...presetNames];
}

export function takeQueuedSubscriptions(): string[] {
  const queued = pending;
  pending = [];
  return queued;
}
