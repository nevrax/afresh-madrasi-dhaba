/** Keep optional media failures visible without turning them into a game-rule change. */
export function runtimeFeedback(loading: HTMLElement, status: HTMLElement): {
  ready(): void;
  failed(): void;
  audioUnavailable(): void;
  resources(visualFailures: ReadonlySet<string>, soundFailures: ReadonlySet<string>, knownSounds: ReadonlyMap<string, unknown>): void;
} {
  let ready = false, fatal = false, unsupportedAudio = false, missingVisual = false, missingAudio = false;
  const update = (): void => {
    const message = fatal ? '' : [
      missingVisual ? 'Some pictures or fonts could not load. Reload the page to try again.' : '',
      unsupportedAudio ? 'Sound is unavailable in this browser.' : missingAudio ? 'Some sounds could not load. Reload the page to try again.' : '',
    ].filter(Boolean).join(' ');
    if (status.textContent !== message) status.textContent = message;
    if (status.hidden !== !message) status.hidden = !message;
  };
  return {
    ready() { ready = true; loading.hidden = true; },
    failed() {
      fatal = true;
      loading.textContent = ready ? 'The game stopped unexpectedly. Reload the page to try again.' : 'The game could not load. Reload the page to try again.';
      loading.hidden = false; update();
    },
    audioUnavailable() { unsupportedAudio = true; update(); },
    resources(visualFailures, soundFailures, knownSounds) {
      missingVisual = visualFailures.size > 0;
      // Source requests the absent `serve` export; that is not a broken media download.
      missingAudio = [...soundFailures].some(name => knownSounds.has(name));
      update();
    },
  };
}

/** Optional audio setup may throw synchronously on unsupported/disabled platforms. */
export function optionalAudio(unavailable: () => void): (action: () => void) => void {
  let failed = false;
  return action => {
    if (failed) return;
    try { action(); } catch { failed = true; unavailable(); }
  };
}
