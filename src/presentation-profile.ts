export type PresentationChoice = 'classic' | 'extra';
export interface PresentationProfile {
  readonly choice: PresentationChoice | null;
  readonly enhancements: boolean;
  readonly simplerEffects: boolean;
  readonly interpolateDecorations: boolean;
  readonly retainScene: boolean;
}
const profiles: Readonly<Record<PresentationChoice | 'current', PresentationProfile>> = Object.freeze({
  current: Object.freeze({choice: null, enhancements: true, simplerEffects: false, interpolateDecorations: true, retainScene: false}),
  classic: Object.freeze({choice: 'classic', enhancements: false, simplerEffects: false, interpolateDecorations: false, retainScene: false}),
  extra: Object.freeze({choice: 'extra', enhancements: true, simplerEffects: true, interpolateDecorations: true, retainScene: true}),
});
export function presentationChoice(value: unknown): PresentationChoice | null {
  return value === 'classic' || value === 'extra' ? value : null;
}
/** No default has been selected: an absent preference retains the existing release. */
export function resolvePresentation(choice: PresentationChoice | null): PresentationProfile {
  return profiles[choice ?? 'current'];
}
export function loadPresentationChoice(storage: Pick<Storage, 'getItem'> | null): PresentationChoice | null {
  try { return presentationChoice(storage?.getItem('madrasi-presentation')); } catch { return null; }
}
export function savePresentationChoice(storage: Pick<Storage, 'setItem'> | null, choice: PresentationChoice): void {
  try { storage?.setItem('madrasi-presentation', choice); } catch { /* Explicit selection still works in memory. */ }
}
