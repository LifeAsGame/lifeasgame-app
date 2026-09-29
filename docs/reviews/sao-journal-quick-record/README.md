# Journal · Quick Record consumer application

Base: develop `7e0ed6dc7630f7b0bcf3d5d118e1c40abd37235b` (#126). Issue #127.

## Applied scope

- Approved `LifeAsGame_SAO_Consumer_v6_1`: `DESIGN_AND_MOTION.md`, final palette, and interactive Journal/Quick Record screens; the existing FE first-apply handoff supplies the shared shell baseline.
- Journal uses the common right list / left detail geometry, selected-first menu, moving connections, mobile forward/back, and reduced-motion behavior. Filters are a native disclosure; list order, pagination, full source fields and metadata remain server-owned.
- Quick Record keeps Collection/Exercise/Media payloads, required fields, optional zero values, and subtype/Role metadata. No free memo endpoint or additional record type. Existing weekly-lookback guidance and recognition contract remain separate.
- A submission belongs to its form session. Closing/reentering or unmounting invalidates its UI completion; a late save or refresh cannot select an old record, clear a new draft, or unlock a newer submission. Duplicate submit is locked synchronously.
- Retry uses the retained identical body/key. Confirmed saves remain successful if Journal refresh fails; `Refresh Journal` performs GET only. Editing starts a new logical request. No automatic mutation is tied to rendering, reload, or reads.
- Keyboard focus enters the mobile detail and Quick Record, stays within pending/success/failure feedback, and returns to the caller on Back/Escape. Native scrolling keeps focused controls clear of the fixed action area; save feedback stays in that area above the button.
- Removed obsolete Journal width and mobile two-column form overrides. Collection/Exercise/Media management screens and backend contracts are unchanged.

## Verification

Results and evidence below distinguish actual server responses from injected transport behavior. Unit tests use explicit synthetic fixtures; they are not represented as server verification.

Backend execution: `32651b3903283f0b92e4c156379425ecc3f2f95e`. JAR SHA-256: `3e5244ae173b3f847f166ceac6ad495f658e712697db85fbaeb35a571079f58f`.

The preserved dedicated `lag-pr126-retry` stack uses API 18126, its own network/volumes and normal registered account. Existing servers and stopped 83/85 are preserved. There were no administrative grants or SQL data changes. Credentials, raw account responses, Compose secrets and runtime recovery files stay outside Git.

Desktop input is mouse/keyboard. Mobile 390 touch emulation and 390 keyboard are separate cases. Chromium automation is not physical iOS/Android, a software-keyboard, Safari, or screen-reader certification.

[Validation summary and source hashes](validation.json) bind these results to the production build. After verification, only this task’s frontend and dedicated API stack were stopped; data and recovery files remain. All 15 existing running containers, stopped 83/85 and frontend 3027 retained their state.

Local checks: 103 test files / 696 tests; TypeScript passes. ESLint: 0 errors, 7 existing unrelated warnings. Production webpack build uses `NEXT_PUBLIC_USE_MOCK=false`.

| Verification | Evidence / outcome |
|---|---|
| Journal and Quick Record | [Browser request log](browser-results.json): 36 cases, including all three normal saves, same-key replay, confirmed success + failed refresh, navigation/reentry, late save/refresh/detail, real pagination, and 20 size/theme/motion combinations. |
| Quest and confirmed rewards | [Quest regression log](quest-regression-results.json): 16 cases; authenticated Route/Step and Current Quest restoration, initial list Retry, confirmed settlement retention, delayed requests; 0 commands during reads. |
| Weekly recognition boundary | [Actual API result](weekly-integration-results.json): QUICK REFLECTION did not advance the weekly Quest; normal FULL Collection reflection completed it. The FULL API returned 200; the harness initially expected 201. Recovery used GET only, with no repeated save. |
| Synthetic fixtures | Existing API/type tests and added request-session, unmount, newer-selection, keyboard and common-connection regression tests. These are separate from server results. |

The final 36-case Journal run observed 20 Quick Record POSTs: 17 new records and 3 identical-key server replays. Read-only cases sent no mutations. Earlier verification passes also created normal dedicated-account records; these counts describe the final run, not the account lifetime.

The ordinary account has no configured Roles: actual filtering exercises subtype and pagination; Role filter/metadata payload cases use the existing synthetic fixtures. No new Role data was needed for representative saves.

## Evidence

Continuous recordings capture the actual product browser, not a sequence assembled from screenshots. Recording frame rate is not a performance measurement. Before captures use the merged #126 implementation and the same isolated account; after captures include records created normally during verification.

- [Desktop continuous flow](flow-1440.webm)
- [Mobile continuous flow](flow-390.webm)
- [Before desktop list](before-list-1440.png) → [after](list-1440.png)
- [Before mobile list](before-list-390.png) → [after](list-390.png)
- [Before desktop detail](before-detail-1440.png) → [after](detail-1440.png)
- [Before mobile detail](before-detail-390.png) → [after](detail-390.png)
- [Before desktop Quick Record](before-quick-1440.png) → [after](quick-collection-1440.png)
- [Before mobile Quick Record](before-quick-390.png) → [after](quick-collection-390.png)
- [Exercise input](quick-exercise-390.png) · [Media input](quick-media-390.png)
- [Astral 390 / reduced motion](matrix-390-astral-reduced.png) · [Astral 1024](matrix-1024-astral-normal.png)
- [Saved result](saved-exercise-390.png)
- [Same-record retry](retry-collection-390.png) · [Confirmed save / failed lookup](confirmed-save-refresh-error.png)

## Remaining application scope

The individual Collection/Exercise/Media management surfaces and other domain surfaces remain subsequent design-application work. This change does not reopen completed integration work or authorize backend changes, merge, or deployment.
