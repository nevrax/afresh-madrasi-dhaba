import type { Command } from '../core/game.js';
import type { Renderer } from '../render/renderer.js';

export function connectPointer(renderer: Renderer, dispatch: (command: Command) => void, activate: () => void): void {
  const canvas = renderer.canvas;
  const point = (event: PointerEvent): { x: number; y: number } => {
    renderer.pointerType=event.pointerType||'mouse';
    const rect = canvas.getBoundingClientRect(); return { x: (event.clientX - rect.left) * 550 / rect.width, y: (event.clientY - rect.top) * 400 / rect.height };
  };
  let pressed: { pointerId: number; target: string } | null = null;
  const ownsPointer = (event: PointerEvent): boolean => event.isPrimary !== false && (!pressed || pressed.pointerId === event.pointerId);
  const cancel = (): void => {
    const pointerId = pressed?.pointerId;
    pressed = null; renderer.pressedCommand = null;
    if (pointerId !== undefined && canvas.hasPointerCapture(pointerId)) canvas.releasePointerCapture(pointerId);
    dispatch({ type: 'background' });
  };
  canvas.addEventListener('pointermove', event => {
    if (!ownsPointer(event)) return;
    const p = point(event); dispatch({ type: 'move-pointer', ...p });
  });
  canvas.addEventListener('pointerdown', event => { if (event.button !== 0 || pressed || !ownsPointer(event)) return; activate(); const p = point(event); dispatch({ type: 'move-pointer', ...p }); pressed = { pointerId: event.pointerId, target: JSON.stringify(renderer.hit(p.x, p.y)) }; renderer.pressedCommand = pressed.target; canvas.setPointerCapture(event.pointerId); });
  canvas.addEventListener('pointerup', event => {
    if (!pressed || event.button !== 0 || pressed.pointerId !== event.pointerId) return;
    const original = pressed.target; pressed = null; renderer.pressedCommand = null; const p = point(event); dispatch({ type: 'move-pointer', ...p });
    const target = renderer.hit(p.x, p.y);
    if (p.x >= 0 && p.x <= 550 && p.y >= 0 && p.y <= 400 && JSON.stringify(target) === original) dispatch(target);
    if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
  });
  canvas.addEventListener('pointercancel', event => { if (ownsPointer(event)) cancel(); });
  canvas.addEventListener('lostpointercapture', event => { if (pressed?.pointerId === event.pointerId) cancel(); });
  canvas.ownerDocument?.defaultView?.addEventListener('blur', () => { if (pressed) cancel(); });
  canvas.addEventListener('keydown', event => { if (event.key === 'Escape') cancel(); });
}
