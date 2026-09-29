# Consumer shell and Quest transitions

Base: develop `e8ecb8b41a655582d813efad03e1ec8396f0df2d`.

The existing common menu and Quest implementation now retains its visual content
container across rapid selections. Content identity still resets selection-owned
state; opacity and translation continue from their current motion values. Reduced
motion resolves immediately. The connection reads the rendered menu, selected row,
scroll viewport and left detail bounds each frame, clamps off-screen rows to the
visible edge and removes unnecessary paths on close or mobile layouts.

Quest rows show status and progress once. Titles, completion rules and reward
settlement remain distinct, with fewer nested borders and no internal layout copy.
Legacy mobile rail overrides are scoped out so the menu stays vertical, labels remain visible and the selected circle is not clipped. API clients, command payloads, authentication and restricted features are unchanged.

## Original visual evidence (before Retry follow-up)

These captures use a fixed **production build with NEXT_PUBLIC_USE_MOCK=true** in
macOS Chrome, with desktop pointer and mobile touch emulation. They are not real API
integration evidence or physical mobile device performance measurements.

- [Desktop flow](flow-1440.webm) and [mobile flow](flow-390.webm): selections, return,
  history/reload, close/reopen and interrupted navigation.
- [Desktop Quest](quest-detail-1440.png) and [mobile Quest](quest-detail-390.png).
- Dark theme: [desktop](quest-1440-astral-normal.png), [mobile](quest-390-astral-normal.png).
- [Motion frames](motion-interruption.json): before-fix DOM replacement and opacity
  reset, then before/commit/next/final values and sampled frames for every combination.
- [Viewport/theme/motion matrix](browser-results.json), [additional regressions](extra-results.json),
  [Home scroll](home-scroll-results.json), [validation](validation.json), [video metadata](video-metadata.json).
- [macOS font fallback](font-fallback-390.png), captured with bundled fonts blocked.

The `before-quest-*` captures retain the pre-application reference. Current evidence
replaces the earlier shell-only motion observation and the earlier Linux recordings.

## Validation

See `validation.json` for the original implementation checks, before the Retry follow-up. The matrix covers
1440/390/360/768/1024, both themes and normal/reduced motion. Additional short-height
checks cover nonzero Home/list scroll, selected-first menu order, the other six
domain entries, keyboard focus, interrupted close/reopen, and clipped connection endpoints.
Unit tests cover command-once recovery, late responses, URL read restoration and
confirmed settlement retention across failed rereads/404; these are simulated responses.

## Direct URL Retry follow-up

Route and Current URL restoration now waits for the corresponding list to succeed.
An error exposes Retry without deciding absence or Route ownership. Successful
restoration is applied once; unrelated queries cannot restart it. Navigating away
invalidates pending reads, including a return to the previous URL during a failed
or loading list.

- [Follow-up validation](retry-validation.json): 103 files / 688 tests, TypeScript,
  lint (0 errors / 7 existing warnings), API-mode production build.
- [Injected browser responses](retry-browser-results.json): 9 cases, desktop/mobile
  Retry and URL preservation, settlement reread/failure retention, five late-response
  scenarios. Every API request was GET; zero commands. All responses and the session
  were synthetic. This does **not** validate real authentication or backend data.
- [Recovered Route](retry-routes-1440.png),
  [confirmed rewards retained after injected failure](retry-current-preserved-390.png).

## Real API verification — completed 2026-09-29

The previously blocked real API gate is now **PASS** against an isolated local
backend built from approved SHA `32651b3903283f0b92e4c156379425ecc3f2f95e`.
The tested FE is `e23ddcf0f3dbaae8abd404795cd16df342c8c2c7`; this follow-up changes
only evidence. The existing API-mode production build was reused, with source hashes
verified. The earlier `validation.json` and `retry-validation.json` retain the
historical blocked/synthetic-only observations and are superseded for this gate.

- [Environment, normal API flow and resource evidence](real-api-validation.json).
- [16 browser cases and sanitized request metadata](real-api-browser-results.json):
  real form login; authenticated lists/details; selected Route/current Step; confirmed
  reward rereads; desktop 1440 and mobile 390, normal motion.
- Two cases use actual successful server responses throughout. Fourteen cases inject
  503 or delay **after fetching actual responses**. Synthetic success responses: zero.
  Actual backend outages were not induced.
- Normal signup/onboarding and three normal records completed three Quests. Adventure
  settled GOLD 100 and Item 1. The Route was selected and explicitly advanced once.
  No admin grants, SQL data writes, or preloaded DB fixtures were used.
- Route/Current initial-list Retry preserved URL and restored own detail/current Step.
  Confirmed reward DOM/lines survived reread errors with no duplicate presentation.
  Five delayed read types could not replace a newer selection at either width.
  Read-verification commands: zero. Real Wallet, Mailbox and Route remained unchanged.
- Screens: [desktop Route](real-api-actual-route-1440.png),
  [mobile Route](real-api-actual-route-390.png),
  [actual settlement](real-api-actual-settlement-1440.png),
  [mobile retained result after injected error](real-api-injected-error-preserved-390.png).

Only the five explicitly approved 83/85 containers were stopped, in the requested
order, after preserving the 83 JAR and recovery metadata outside temporary storage.
Measured Docker MemAvailable increased by 1248124 KiB (about 1.19 GiB). The other 15
containers and frontend 3027 kept their original running state. The new project
`lag-pr126-retry`, port 18126, has its own network and MySQL/Redis volumes. It was
stopped after verification, along with FE 3039; data and recovery artifacts remain.
Approved 83/85 containers were not restarted. No containers/volumes/files were deleted.

Reusable environment, source, Compose, JAR/hash and private account files remain at
`lifeasgame-app/.codex-local/pr126-api/`, outside Git. Account and runtime secrets are
mode 0600. This verification makes no production or deployment claim.

Other domains retain their existing product content inside the common shell. Full
visual conversion, physical mobile devices, Safari, soft keyboards and screen readers
remain outside this verification. No merge or deployment is included.
