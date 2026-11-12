# Presentation profiles

Classic and Optimized use the same game rules, assets, cooking timers, customers,
orders and scoring. The small selector above the game changes presentation during
play without starting a new day. An explicit selection is remembered when browser
storage is available; it also works for the current session without storage.

The default remains undecided. With no valid saved choice, the existing release
presentation stays active and the selector says **Choose profile**. This temporary
compatibility state is not a third selectable profile. A development URL can
select `?presentation=classic` or `?presentation=extra` without saving a preference;
an explicit selector change saves it. No hardware detection selects a profile.

## Feature inventory

| Feature | Classic | Optimized | Implementation |
| --- | --- | --- | --- |
| Original game rules, content, tutorial, score submission and soundtrack | Preserved | Preserved | Shared core, input and audio |
| Original food hover text, cash feedback and patience/count information | Preserved | Preserved | Renderer source behavior |
| Bowl outline, hover/selection cue and introductory batter label | Off | On; introduction stays dismissed after use | Game shell |
| Additional flip/pickup/batter cursors | Off | On | Game shell and CSS |
| Carried batter ladle | Original Canvas artwork | Full-size retained layer, matching the pouring animation's scale | Original vectors and anchor; no 64-pixel shrink |
| Picked dosa and carried plate | Original Canvas artwork | Compact native mouse preview, at most 64 logical pixels; Canvas fallback for touch/unsupported browsers | Source vectors rendered at the selected density; original picking/serving coordinates |
| Steam while an item is in the native mouse preview | Animated | Preview holds the picked pose; cooking and independent smoke clocks continue | Steam on the griddle and resting plate is unchanged |
| Count while carrying the native plate preview | Follows source plate | Remains at the counter; number and plate hit target stay live | Renderer only; original core positions are preserved |
| First cooking/filter use | Lazy | One ordinary cooking cycle is prepared while loading, under the existing cache limit | No game time advances during preparation |
| Smooth sampling between eligible menu/traffic poses | Authored samples | Menu interpolates; playing traffic uses authored 12 Hz poses | Renderer; simulation clocks unchanged |
| Retained scenery between visual state changes | Ordinary rendering | Exact-density opaque surface, up to 32 MiB | Renderer; food, feedback and hit mapping stay live |
| Unchanged complete frame | Repaint every callback | Reuse only while visible state and hit targets match | Renderer; no additional surface or animation-rate reduction |
| Large griddle steam | Original blur | Original moving geometry without the wide blur | Isolated vector metadata view |
| Background stars | Original blinking | Fixed pose; background retained and cropped to the visible stage | Isolated vector metadata view and Optimized cache treatment |
| Order bubble decoration | Original morph | Fixed decoration; count and patience still live | Renderer |
| Customer bodies, dosa steam, water glasses, traffic lights/shadows and radio | Preserved | Preserved | Shared assets |
| Resolution control, FPS/memory HUD, expansion and fullscreen buttons | Additional overlay hidden | Available; FPS initially off | Game shell |
| Local score convenience menu | Hidden | Available | Game shell; stored scores are not deleted |
| New songs | None added | None added | Future additional tracks belong to Optimized |

Responsive layout, working HTML/file playback, loading/error handling, accessible
source control equivalents and status text, audio gesture recovery, original online
score form, attribution and repairs for misplaced screens/white seams remain
shared. Catalogue and verification links are development tools, excluded from
both distribution packages. Classic is the source-oriented presentation of the
native port, not a claim of historical Adobe pixel equality or a restored Flash
runtime.

## State, preferences and caching

`src/presentation-profile.ts` resolves immutable configurations. The game core has
no profile branches. Switching updates the renderer and UI without creating a new
game, replaying sound events or registering another input/frame loop. It closes
Optimized dialogs and restores compact expansion when entering Classic. Native
fullscreen can still be exited with the browser's usual Escape action.

Classic renders at 100% with diagnostics off. Optimized starts at 100% with the HUD
off and keeps its own display preferences. Existing compatibility preferences are
not overwritten. Hint dismissal survives switching; time spent in Classic does
not consume the Optimized introduction timer.

The established bounded, resolution-scaled vector tile cache and surface reuse are shared.
Optimized's separate scene cache is counted in the HUD and released on screen,
profile or scale changes. Above its 32 MiB surface cap, ordinary rendering is used.
Effect changes use an isolated metadata view; canonical source records are never
mutated. Changing effects clears retained surfaces, filter backing and derived
bounds/period metadata before drawing the other profile. It does not keep two
complete graphics caches alive. Repeated selection of the same effects avoids
unnecessary cache invalidation.

Compact dosa/plate previews are an intentional Optimized size/animation treatment. They
are not an invisible full-size cursor: image decoding, logical cursor limits,
fallbacks and switching between previews are checked explicitly. The retained
encoded cursor Blobs and metadata are counted separately in the HUD; operating-system cursor
surfaces are not measurable through the page memory API. A carried plate's hit
matrix is updated before a frame can be reused. No hit target is frozen with the
image.

A proposed general static-group crop was rejected as shared cache work: four of
fifteen screen/density comparisons changed pixels. Cropping is therefore limited
to Optimized's already changed background. It reduces its retained tile to the visible
stage and keeps it below the 32 MiB retention threshold at 2970 × 2160. Classic
retains the established cache policy. This is an intentional visual treatment,
not a transparent cache optimization.

## Verification

See the [verification guide](verification.md) for current functional checks and
[performance summary](../performance/README.md) for results and failures.
The stored Optimized ID remains `extra` so existing preferences continue to work.
