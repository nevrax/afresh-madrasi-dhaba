# Frame pauses and pointer rendering

The continuing investigation separates game work from browser presentation waits.
The source game implementation is complete; performance acceptance is tracked
separately in [the performance plan](performance-plan.md).

## Cost ranking and implementation

| Priority | Measured source of work | Treatment |
| --- | --- | --- |
| 1 | Repainting/composing a large Canvas on every callback, including unchanged scenery and terminal screens | Extra retains scenery and complete unchanged frames, including Game over and day result; original clocks and input remain live |
| 2 | Moving carried artwork invalidates the whole stage between authored poses | Extra uses compact native previews for batter, picked dosa and the carried plate |
| 3 | First-use cooking/filter surfaces, including changing food shadows and steam | Prepare one normal cooking cycle under the existing cache limit before the cooking clock starts |
| 4 | Large griddle blur and decorative background work | The previously measured Extra treatments remain; additional blanket animation removals are not justified |
| 5 | Decoded soundtrack memory | About 86 MiB is retained for reuse; audio removal does not eliminate the cold frame pauses |

The [component study](performance-components.md) and [whole-pipeline study](performance-pipeline.md)
also cover customers, glasses, traffic, radio, text, hit testing, snapshots,
allocation and filter backends. Small decorative omissions do not explain the
large gain from avoiding repeated stage composition. CPU spent in a graphics
process is not the same measurement as GPU execution time.

## What the traces establish

During the problematic Intel runs, a 60-second gameplay trace contains 15.89
seconds inside long graphics-process host tasks, but only 80.38 milliseconds of
CPU execution inside those tasks. Thirty-five long `DXGISwapChainImageBacking::Present`
calls account for 12.39 seconds. These nested times must not be added together.
The corresponding NVIDIA trace records 18.02 seconds in long graphics host tasks
and 120.38 milliseconds of thread CPU time; 41 long Present calls account for
16.92 seconds. These measurements establish waiting in the graphics pipeline,
not GPU utilization or a particular driver's fault.

Independent main-thread and worker timers continue during most recurring pauses.
In the aligned Intel and NVIDIA traces, every sampled warm callback gap above
50 milliseconds overlaps a long graphics-process task. Most long animation
frames report zero script blocking time. Moving filters to the CPU adds readback
stalls and does not remove the presentation waits. Disabling background
throttling, DirectComposition, Canvas alpha optimization or synchronization in
separate diagnostic runs does not reliably eliminate them.

Later normally launched Chrome controls, attached through Playwright, reach warm
170.47 callback/s with a 12.2 ms maximum gap. Forcing Intel/D3D11 still reaches
169.67 with a 13.4 ms maximum. Omitting preparation reaches 171.56 with a 7.7 ms
maximum. Repeating the previous Playwright launch also reaches 169.27 callback/s
over a complete day with no warm gap above 50 ms. Therefore neither preparation
nor one launch flag is established as the cause of the earlier desktop waits.
Host conditions vary; do not reinterpret the older averages as an intrinsic
Intel-versus-NVIDIA performance ratio. A separate Firefox run reaches 78.51
callback/s with an 18.72 ms warm maximum; its compositor adapter was not
independently established.

Raw traces remain private. Anonymous measurements are in
[performance-stalls.json](../tests/reference/performance-stalls.json).
Windows kernel GPU/CPU recording was attempted but could not enable the required
profiling privilege. No operating-system policy or driver was changed. The exact
external cause of the intermittent presentation waits remains unproven.

The interpretation follows Chromium's [jank debugging guide](https://chromium.googlesource.com/chromium/src/+/58cb5e73798268c5c82e79cf4c154f7158c120fa/docs/speed/debug-janks.md)
and Chrome's [long animation frame documentation](https://developer.chrome.com/docs/web-platform/long-animation-frames).
Callback delivery, graphics host spans, GPU execution and physical scanout are
different measurements.

## Integrated changes

Before Play or Skip starts the cooking clock, the renderer prepares the kitchen
and both terminal scenes at the selected vector density. It releases obsolete
welcome/tutorial surfaces first, keeps the existing tile budget, yields between
placements and releases its temporary surface before play. The existing loading
status covers this transition. No cooking, customer or audio rule is rewritten.
Both Pi environments have already shown a roughly 17 ms end-of-day transition,
instead of the previous 184–234 ms first appearance. Remaining early cold gaps
are reported separately from warm results.

The cold continuation identifies first appearances of food/filter variants.
Preparing only the twelve large-griddle smoke shapes still produces a 166.7 ms
gap. Removing actual audio output still produces a 150.1 ms gap. Preparing the
first 48 cooking poses postpones the remaining 66.7 ms pause to a later first
appearance. Preparing the ordinary first-side and earliest ready second-side
poses removes that pause in the confirming window: maximum 17.4 ms and zero
gaps above 50 ms. This bounded cycle is integrated in Extra. Burn and late-pickup
poses remain lazy; the implementation does not allocate a complete animation atlas.

Preparation has a visible cost: roughly 7.6–9.6 seconds on these Pi environments
and 6.0–6.5 seconds in the final desktop runs, at 2200 × 1600 backing pixels.
The loading status remains visible, and no cooking/customer time is consumed.
Existing vectors, cache limits and selected density are preserved. The earlier
cooking run retains about 160 MiB of vector/filter backing at its final screen,
with an additional 13.4 MiB scene surface during play. Its peak managed total,
including decoded audio, is about 259 MiB. Preparing the loss scene increases
the latest loss-run peak to about 295 MiB. These counters exclude browser/driver
memory. The overhead is paid before play rather than as missed
cooking frames.

Continuous carrying is a separate workload. A held batter pointer previously
forced full-stage painting even between unchanged authored poses. On Pi A this
reproduces approximately 44 callback/s; Pi B reaches about 59 with roughly 68%
of one CPU core. A small moving browser overlay reduces some work but still
misses the Pi A cadence target and is not selected for production.

Extra instead uses compact native mouse cursors derived from the original
ladle, picked dosa and plate artwork. Their maximum logical size is 64 pixels; each cached image
is generated from vectors at the selected density. This size change is deliberate
and belongs to Extra. Classic, touch and unsupported browsers retain the original
Canvas pointer. The game still uses the same pointer coordinates and hit targets.
The batter and picked-dosa images decode with zero differing premultiplied pixel
values in the browser check, and touch/Classic/unsupported-image fallbacks pass.
The native picked preview holds its decorative steam pose. Steam on food still
on the griddle or resting plate keeps animating, and all core smoke clocks keep
advancing. The plate count stays at the counter while carrying, and its original
hit matrix updates every callback even when the stage image is reused.

Cursor PNGs are encoded asynchronously into bounded Blob URLs. Canvas drawing
continues until decoding succeeds; replacing/resetting a cursor revokes its old
URL. This avoids synchronous PNG encoding on pickup. The HUD counts retained
encoded cursor data, not unobservable operating-system cursor surfaces.

The browser's cursor size limit matters: an earlier full-size prototype exceeded
it. Its apparent speed gain is not accepted as a successful visual implementation.
The early valid compact batter cursor measures warm 60.00 / 59.97 callback/s on
Pi A / B, with 39.44% / 33.43% of one CPU core; its cold maximum gaps are still
133.4 / 33.4 ms before the cooking preparation follow-up. These are
command-replay measurements, not physical touchscreen or hardware-cursor scanout
measurements. Subsequent held-dosa and held-plate cases also reach nominal 60 Hz,
with warmed CPU below 25% of one core after their compact previews are active.
The final asynchronous plate case reaches 60 Hz on both devices, maximum
17.4 ms and no gaps above 50 ms, with warm CPU 22.72% / 20.92% of one core.
The final batter case uses 37.28% / 33.06%, also without gaps above 50 ms.

## Release measurements

Final Extra full days at 2200 × 1600 reach 59.99 / 59.99 callback/s on Pi A / B,
with warmed CPU 32.86 / 29.55% of one core. Maximum gaps are 50.00 / 33.30 ms;
gaps above 50 ms number 0 / 0. Both finish at clock 720 and cash 24.
The corrected Game over phase reaches 59.92 / 60.00 callback/s, compared with
37.70 / 58.69 before the fix. No game rules or vector density were changed.

The following cooking figures precede the additional loss-scene preparation:

The three-minute deterministic day at 2200 × 1600 finishes with cash 24 and
clock 720 on both Pi environments. Pi A measures 60.00 callback/s for the entire
day, maximum 17.4 ms and no gaps above 50 ms. Pi B measures 59.98 callback/s,
maximum 50.0 ms and no gaps above 50 ms. Warm CPU is 31.02% / 28.60% of one core;
both terminal transitions are about 16.6 ms. These are nominal 60 Hz results,
not a claim that every callback interval is identical.

The full-day desktop repeat measures warm 235.18 callback/s on Intel and 234.42
on NVIDIA, with maximum warm gaps of 20.7 / 25.3 ms and zero gaps above 50 ms.
All canvases are fully inside native visible windows; focus and visibility
counters are zero. The similar rates approach the contemporaneous trivial
controls and do not establish equal GPU throughput.

Anonymous cold controls, carried-object cases, larger-density checks, calibrated
desktop repeats and UI evidence are retained in
[performance-preparation.json](../tests/reference/performance-preparation.json).
The initial 90-second no-action case did not reach game over and is not accepted
as loss-screen evidence; the longer continuation asserts the resulting screen.
The seeded varied-customer day finishes with cash 50, no lost customers and
clock 720. It reaches at most two simultaneous customers under the first-day
rules, so it is not a five-customer stress fixture. Playing cadence is 60.00 /
59.96 callback/s; Pi B has two isolated gaps above 50 ms, maximum 83.3 ms, while
its measured JavaScript draw maximum is 8.3 ms. These outliers are retained in
the evidence and are not explained by the average rate. At 2970 × 2160, the
earlier large-density check also has isolated 66.6 / 67.4 ms cold gaps.

## Terminal-screen correction

The actual 180-second loss replay exposed a separate bug: whole-frame reuse
stopped outside gameplay. Game over therefore repainted at every callback.
Its phase ran at 37.70 / 58.69 callback/s, with maximum gaps 216.8 / 149.9 ms.
The corrected Extra path reuses terminal frames between authored 12 Hz poses.
Button hover, pressed state, score-form visibility, audio and animation clocks
remain in the invalidation key. Loss-scene first appearances are prepared before
play under the same cache limits. No additional retained terminal surface is used.

The repeated loss phase reaches 59.92 / 60.00 callback/s, p95 16.8 ms and
maximum gaps 33.4 / 17.5 ms, with no gaps above 50 ms. The entire three-minute
loss replay reaches 59.98 / 60.00 callback/s; warm CPU across its playing and
terminal phases is 26.32% / 22.96% of one core. This is not an isolated terminal
CPU measurement. Preparation takes 9.58 / 7.89 seconds. Exact Canvas and hit
comparisons now cover 588 cases, including terminal button/score-form changes
within the same animation tick.

Chromium's [cursor image-set tests](https://chromium.googlesource.com/chromium/src/+/refs/tags/127.0.6533.70/third_party/blink/web_tests/fast/events/mouse-cursor-image-set.html)
document density-independent logical size and hotspots. [MDN's cursor reference](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/cursor)
describes image limits and platform limitations.

Verification: 131 tests, 588 exact frame/hit checks and 90 preparation checks
pass. Both-adapter application checks cover source, site and offline standalone.
One Intel timed cooking attempt failed; the complete repeat passes without a
runtime change. The transient cause is not established.
