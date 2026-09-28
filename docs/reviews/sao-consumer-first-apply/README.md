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

## Current browser evidence

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

See `validation.json` for the actual checks of this revision. The matrix covers
1440/390/360/768/1024, both themes and normal/reduced motion. Additional short-height
checks cover nonzero Home/list scroll, selected-first menu order, the other six
domain entries, keyboard focus, interrupted close/reopen, and clipped connection endpoints.
Unit tests cover command-once recovery, late responses, URL read restoration and
confirmed settlement retention across failed rereads/404; these are simulated responses.

## Real API gate

**Real API validation remains unverified.** The existing 18084 instance responds to
the health read and uses a separate CFC network, MySQL database and named volume.
Its runtime/JAR and dedicated account evidence paths are empty, so its source version
and an approved test account could not be established. No login, authenticated read,
Quest command or reward mutation was attempted. Existing containers, servers and data
were preserved; no environment or account was created.

The environment observation and exact missing access information are in
`validation.json`. Completion requires an approved runtime/source manifest and a
local dedicated-account file or identified authenticated test browser. Mock success
and automated review do not close the integration gate.

Other domains retain their existing product content inside the common shell. Full
visual conversion, physical mobile devices, Safari, soft keyboards and screen readers
remain outside this verification. No merge or deployment is included.
