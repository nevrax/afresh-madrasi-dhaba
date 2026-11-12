/** Request actual browser fullscreen from a user gesture; retain a usable page if denied. */
export function connectFullscreen(button: HTMLButtonElement, status: HTMLElement): void {
  const update = (): void => {
    const active = Boolean(document.fullscreenElement);
    const label = active ? 'Exit fullscreen' : 'Enter fullscreen';
    button.title = label;
    button.setAttribute('aria-label', label);
    button.setAttribute('aria-pressed', String(active));
  };
  button.addEventListener('click', () => {
    status.hidden = true;
    const request = document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen?.();
    if (!request) {
      status.textContent = 'Fullscreen is unavailable here. Open this page in a browser that supports fullscreen.';
      status.hidden = false;
      return;
    }
    void request.catch(() => {
      status.textContent = 'This browser did not allow fullscreen. You can still resize its window.';
      status.hidden = false;
    });
  });
  document.addEventListener('fullscreenchange', update);
  update();
}
