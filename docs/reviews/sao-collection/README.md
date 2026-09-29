# Collection consumer application

Base: develop `4d2cd25193b90f3dc58019fd467441462e7964a3` (merged #128). Issue #129.

## Applied scope

The approved `LifeAsGame_SAO_Consumer_v6_1` Collection list, detail and create/edit forms now use the Journal reading surface, common panels, gold selection, connections, axis movement and mobile forward/back transitions. Category/title filters stay inside the list. Detail shows title, quantity and condition before source metadata; edit exposes only quantity, condition note and acquired from. Create retains all existing fields and the FULL weekly-reflection option.

The existing query hook owns request invalidation and the synchronous mutation lock. Leaving, changing selection, or starting a new form invalidates the old completion. Stale success/failure/finally and post-command reads cannot replace a new draft, selection, or pending command. Lookup retries perform GET only. Confirmed command success and lookup failure are separate states. An unconfirmed response explicitly asks the user to inspect current data before another submission.

Native required/minimum validation, checkbox, filter disclosure and delete confirmation remain. No new endpoint, record type, backend change or dependency. Exercise/Media management is unchanged. The form uses normal document flow and the shared fields; there is no additional scroll manager or modal framework.

## API contract

- Collection search returns a raw array; create/update return raw objects. Create and update use POST, with success 200. Detail uses an envelope. DELETE can return bodyless 204, including an ownership-scoped no-op.
- Collection commands do not accept the Quick Record idempotency-key contract. No automatic command retry or invented key is added.
- Ordinary FULL Collection creation without subtype is distinct from FULL + REFLECTION + WEEKLY_LOOKBACK. QUICK reflection does not satisfy the weekly Quest. The UI preserves these existing fields and semantics.
- Update changes the source fields and Journal projection; delete removes the source and its Journal record. Existing backend facts do not reverse completed Quests or settled rewards.
- Backend execution remains `32651b3903283f0b92e4c156379425ecc3f2f95e`, JAR SHA-256 `3e5244ae173b3f847f166ceac6ad495f658e712697db85fbaeb35a571079f58f`. Controller/service, `LifeLogRecordedQuestTrigger` and `SeedLevel1Quest` from that exact source were reviewed.

## Verification

Local checks: 103 test files / 707 tests pass; TypeScript, ESLint and production webpack build pass. ESLint retains 7 unrelated existing warnings and no errors. Synthetic unit fixtures are distinct from the real-server browser evidence.

| Evidence | Coverage |
|---|---|
| [Collection browser results](browser-results.json) | Actual normal create/update/delete and Journal UI/data projection at 1440/390; required values, cancel, reload, unconfirmed responses, confirmed success + failed lookup, duplicate submit, leaving/reentry, late command/detail/list responses, filtering, pagination, scroll/focus and keyboard. |
| Layout matrix in browser results | 360/390/768/1024/1440 × warm-beige/astral × normal/reduced motion. 390 touch emulation and 390 keyboard are separate cases. Edit cancellation restores focus to the remounted caller. |
| [Weekly and reward integration](weekly-integration-results.json) | Additional normally registered/onboarded dedicated account: QUICK reflection progress 0; FULL weekly reflection completes the weekly Quest. The actual completed FULL source is updated/deleted; completion and confirmed GOLD 100 + ITEM 1 remain, while Journal reflects the source changes. |
| [Ownership](ownership-results.json) | Two dedicated normal accounts: foreign detail/update return 404; foreign DELETE returns 204 without changing the owner's control record. Only the newly created control is removed by its owner. |
| [Quest regression](quest-regression-results.json) | Authenticated Route/current Step and Quest/settlement rereads, initial list Retry, retained confirmed results and stale-response exclusion. Read verification sends no commands. |

The final Collection run contains **43 passing cases**: 24 real-server cases, 8 cases with injected 503 delivery, and 11 with injected delay. It observes 601 verification GETs and **23 intentional data commands** (16 POST, 7 DELETE), plus separately tagged preparation (10 create POSTs and 20 GETs). No automatic command resend occurred. Quest regression contains **16 passing cases** (2 real-server, 14 injected) and **0 commands during reads**. Weekly integration uses 6 normal record commands across its documented phases; ownership uses 4 (owner create, foreign update, foreign delete, owner cleanup). Login/signup/onboarding and prior preparation runs are not included in these final verification-window counts. See [validation metadata](validation.json).

The weekly test initially expected an ordinary FULL record without subtype to count toward Adventure. Actual responses and the contract showed it does not; an additional normal QUICK_NOTE supplied the third eligible record. Quest completion preceded settlement creation, so a transient settlement GET 404 required waiting for the separate result. No initial save was repeated. The final recovery request log covers the completed-source update/delete and reward reads; initial creation checkpoints are explicitly identified rather than presented as a single uninterrupted request capture.

The ownership harness initially expected DELETE 200. The server correctly returned 204; GET recovery confirmed unchanged owner data, then one normal owner DELETE cleaned up that test control. No foreign command was repeated.

## Visual evidence

Before captures use the merged #128 implementation and the preserved ordinary test account. After captures contain records created normally during this verification. Videos continuously record the product browser after login, without credential footage or assembled screenshots.

- [Desktop continuous flow](flow-1440.webm) · [Mobile continuous flow](flow-390.webm)
- [Before desktop list](before-list-1440.png) → [after](list-1440.png)
- [Before mobile list](before-list-390.png) → [after](list-390.png)
- [Before desktop detail/edit](before-detail-1440.png) → [detail](detail-1440.png) · [edit](edit-1440.png)
- [Before mobile detail/edit](before-detail-390.png) → [detail](detail-390.png) · [edit](edit-390.png)
- [Before desktop create](before-create-1440.png) → [after](create-1440.png)
- [Before mobile create](before-create-390.png) → [after](create-390.png)
- [Journal desktop](journal-1440.png) · [Journal mobile](journal-390.png)
- [Unconfirmed command](unconfirmed-create-390.png) · [Confirmed create / failed lookup](confirmed-refresh-failed-create.png)
- [Completed Quest after source deletion](reward-after-source-delete.png) · [confirmed GOLD and ITEM lines](reward-lines-after-source-delete.png)
- [390 astral / reduced motion](matrix-390-astral-reduce.png) · [1024 layout](matrix-1024-warm-beige-no-preference.png)
- [Video metadata](video-metadata.json): continuous 1440×900 (18.56 s) and 390×900 (17.44 s) recordings.

## Environment and limits

The preserved `lag-pr126-retry` project uses API 18126 and its own network/volumes; frontend verification uses 3039. A concurrent wallet-order backend test was observed at startup, so stack startup waited until its worker and temporary containers ended and memory recovered. Other existing servers, databases, frontend 3027 and stopped 83/85 were not stopped or modified. Runtime settings, credentials and reusable scripts remain in private local recovery files, outside Git. There were no administrative grants or direct SQL changes.

After verification, frontend 3039 and the three dedicated API containers were normally stopped. All 15 pre-existing running containers and 9 pre-existing stopped containers (including 83/85) retained their IDs, mounts, running states and start times; frontend 3027 stayed listening. Volumes, database contents, JAR, configuration, account files and recovery materials were retained.

This verifies Chromium browser behavior, including touch emulation; it is not certification on physical mobile devices, software keyboards, Safari or screen readers. Individual Exercise/Media design application and other domains remain out of scope. No merge or deployment.
