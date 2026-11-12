# Score and navigation protocol

`legacy-scores.ts` transcribes the active external score path and retains isolated request builders for the dormant member/tournament paths. `legacy-verification.ts` implements the verification value used by all score requests. `scores.ts` remains an explicitly separate local-only feature.

## Source evidence

- `reference/decompiled/extended/clean/scripts/frame_6/DoAction.as`: `external = true`, external/member/tournament submission, leaderboard navigation and response handling.
- `reference/decompiled/extended/clean/scripts/DefineSprite_579/frame_1/DoAction.as`: button submits score and name without validation.
- Original text symbol 572: initial name `noname`, editable, no maximum length; input bounds `(-2,-2,174,18.4)`.
- `reference/decompiled/extended/clean/scripts/__Packages/Rijndael.as`: encryption algorithm. The game calls `encrypt(src,key)` without a mode, selecting ECB; no decryption or CBC caller exists in the preserved game scripts.
- Main frames 3 and 7: ten-minute session refresh and an additional refresh when proceeding to tomorrow.
- Sprite 161 frame 1: opens the original publisher homepage in a new window.

## Wire format

All requests use POST with `application/x-www-form-urlencoded`. URL encoding preserves the raw field values, including an empty name, whitespace, punctuation or non-ASCII code units. Field order is not used by the verification function.

| Route | Fields | Verification plaintext |
|---|---|---|
| `/external/submitscore_external.php` | `playerName`, `playerScore`, `gameName`, `verify` | `score|name|gameName` |
| `/member/setscore.php` | `gameID`, `tourID`, `playerPoint`, `playerScore`, `verify` | `score|points|gameID` |
| `/member/tournamentscore.php` | Same as member; selected when `tourID != 0` | Same as member |
| `/member/sess_refresh.php` | `gameID` | No verification |

The active game's name is `madrasidhaba`. Member points are `currentLevel - 1` at game over. Member routes and `javascript:callAjax(score,points)` are behind the source's false `!external` branch; no native JavaScript URL execution is introduced. An embedding host can deliberately use the member request builder with explicit IDs.

Verification is AES-128 ECB with the first sixteen characters of the SWF's public constant, zero padding only when the final block is incomplete, and lowercase hexadecimal output. The source uses UTF-16 `charCodeAt` values; non-byte code units trigger an unusual S-box coercion behavior. The native implementation preserves this behavior instead of changing the input to UTF-8. Tests compare it against the mechanically adapted original ActionScript class and independently compare ordinary byte input with OpenSSL AES.

## Configuration and integration

Construct `new LegacyScoreClient({ endpoints: { external: '/your-compatible-endpoint' } })` only when that route is deliberately configured to implement the protocol. The default has no POST endpoints and returns an explicit `unavailable` error. No remote test score is sent, and an unavailable online service is never replaced by browser storage.

Optional configuration supports member, tournament and session URLs, a leaderboard URL, publisher URL, timeout and credential mode. The default credential mode is `same-origin`. Historical navigation URLs are preserved as `LEGACY_LINKS`; navigation must follow a real user activation, e.g. an ordinary anchor with `target="_blank"` and `rel="noopener"`. A destination URL existing in configuration is not proof that its service still works.

`connectLegacyScoreForm` accepts form/input/submit/status elements. Put the status element **outside** the form: the original hides the form as soon as submission begins. Call `show(score)` once on entering game over and `hide()` on leaving. The controller restores `noname`, removes modern required/maxlength restrictions, suppresses duplicate in-flight submissions and ignores stale responses from a previous run. Failed requests allow an explicit manual retry; no automatic retry may create duplicate scores. This visible error recovery is a documented browser adaptation, since the original only traces the response.

The source's `ScoresLoaded()` only logs `postResult`; it defines neither success values nor a leaderboard schema. The adapter therefore reports **received**, not **accepted**, after a valid form response. A missing `postResult` remains unconfirmed. HTML pages, HTTP failures, timeout, cancellation and network failure remain distinguishable. A cancelled or failed request might already have reached the server.

The application listens to the core's `session-refresh` events and calls `refreshSession(gameId)` only with an explicit host game ID and session endpoint. The domain already emits ten-minute and next-day refreshes; the application does not create a second scheduler. The isolated `LegacySessionRefresher` helper is available for hosts without the domain clock and is deliberately unused in the game. The standalone game does not invent membership/session IDs. Omitting the original host's meaningless refresh attempts is an explicit standalone adaptation, not evidence that its remote session was reproduced.

The application reads deployment-owned JSON from `#score-service-config` in `index.html`; it defaults to `{}`. For a deliberately deployed compatible service, the object may contain `endpoints`, `gameId`, `leaderboardUrl`, `brandingUrl`, `timeoutMs` and `credentials`. Relative URLs resolve against the page URL. Only HTTP/HTTPS URLs without embedded credentials are accepted. Query parameters and browser storage cannot configure destinations. No score POST occurs until the player explicitly submits the original form; session requests occur only when both the session route and host game ID are explicitly supplied.

The original form is restored in its scene position, with the source `noname` input and a native 100×22 Submit button (source component38 bounds: boundingBox11, 100×100, vertical scale 0.22000122). Source labels and panel are drawn separately from editable HTML controls. Browser error/status text appears below the form; unavailable service feedback does not replace the form with local storage. The native HTML button uses a browser gradient approximation of the legacy component skin. Local saving remains in the separate More options dialog.

## Placement and remaining deployment dependency

The original game-over form sprite579 is placed at `(314.95,194.9)`. Its input is locally `(28.35,49.9)`, giving a stage textbox origin `(341.3,242.8)` after including its bounds. Its submit component is locally `(100.35,72.35)`. The leaderboard sprite569 sits at `(376.9,231.1)`; use its recorded bounds for the link region. Publisher sprite161 is clickable wherever it is visible.

Read-only web checks could not access the original homepage or leaderboard through the available web reader. That result does not prove permanent service failure. Live server acceptance, original session cookies and leaderboard responses remain unverified; this repository implements and tests the protocol without claiming an available backend.
