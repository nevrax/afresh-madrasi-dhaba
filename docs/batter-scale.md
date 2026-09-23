# Full-size ladle and profile names

The visible profile names are **Classic** and **Optimized**. The stored Optimized
ID remains `extra` so existing preferences, display settings and diagnostic URLs
continue to work. Earlier reports use the former label Extra.

The compact native cursor scaled the entire ladle image into 64 logical pixels,
including transparent bounds. This made the carried ladle noticeably smaller than
the pouring animation. Optimized now retains the original vector drawing in a
separate small Canvas at the chosen render density and moves it with a transform.
Its scale and anchor match the ordinary Canvas/pouring path. There is no new image
asset, forced resolution reduction or change to cooking/input rules. The layer is
created lazily, hidden outside batter carrying, clipped to the stage, and rebuilt
when dimensions or presentation change. Its backing bytes are included in the HUD.

Classic and touch keep the existing Canvas path. Dosa and plate keep their compact
native previews. Browser native-cursor size support no longer controls the ladle.

## Performance tradeoff

Visible, native-window, 60-second moving-ladle cases at 2200 × 1600 backing pixels,
with audio and the prepared kitchen, give:

| Measurement | Pi A | Pi B |
| --- | ---: | ---: |
| Entire run, callback/s | 52.57 | 59.92 |
| Warm callback/s | 52.21 | 59.87 |
| Warm CPU, percent of one core | 59.52 | 51.65 |
| Warm p95 interval, ms | 33.4 | 17.4 |
| Warm maximum interval, ms | 50.6 | 33.3 |
| Warm gaps above 50 ms | 4 | 0 |

Both canvases remain fully visible with no hidden or unfocused samples. The stage
still reuses thousands of frames; browser composition of the moving layer has a
real cost. Pi A misses the cadence target and both miss the 40%-of-one-core budget.
PERF-26 is reopened. Previous compact-cursor 60 Hz results must not be presented
as acceptance of full-size carrying. Callback timing is not GPU utilization or
physical scanout. Further work must preserve the full-size visual requirement.

## Verification

131 automated tests pass. The original ladle pixels, natural displayed scale,
profile/touch paths and transitions between carried objects are checked by
`tools/carry-cursor-check.mjs`. `tools/presentation-check.mjs` checks the labels,
live resize and source/site/standalone interactions. Both distributions are rebuilt.
Anonymous evidence is in [batter-scale.json](../tests/reference/batter-scale.json).
Private screenshots and raw logs remain under ignored `.local-setup`.
