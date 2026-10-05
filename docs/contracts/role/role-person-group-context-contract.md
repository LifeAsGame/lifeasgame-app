# Role / Person / personal group context — Feedback03A

Status: **READY — implementation and dedicated 19081 runtime verified** (2026-10-05).
Base: #397 `dd8ec81d9bfb8f558b749b9f8644ee2ca675a157`, depends on #396 → #397. The DRAFT was shared before implementation; the current dedicated 19081 runtime has passed required implementation CI and real HTTP verification. #398 is Draft/unmerged.

All routes require the authenticated current Player. No actor/owner/memberRole body field is accepted as authority. Success uses `{isSuccess,code,message,result}`; errors use the existing problem+json contract. Pages are `{contents,page,size,totalElements,totalPages}`. `page=0`, `size=20`, page >= 0, size 1–100. Ordering is fixed, never caller-supplied SQL. Invalid input is 400, missing/foreign resources 404, archived Role/Person mutation 409. GET has no writes.

## Person role contexts

`GET /api/v1/persons/{personId}/role-contexts?includeArchived=false&keyword=&page=0&size=20`

The role module owns this query and calls the Person-owned public lookup port before querying. An owned archived Person remains readable. Foreign/missing Person returns `PER-404-NOT-FOUND` (the implementation's existing Person code is authoritative). SQL restricts both relation owner and Role owner. Default includes only ACTIVE Role + ACTIVE relation; `includeArchived=true` includes both active and archived history, without restoring/deleting anything. Keyword is a literal case-insensitive substring of Role name; trim whitespace, max 120. Stable order: relation ID ascending.

Page items: `{relationId,roleId,personId,roleName,roleStatus,relationType,roleNotes,relationStatus,version}`. `roleNotes` is nullable; `version` is the stored relation optimistic-lock version, not a new client precondition. Common Person displayName/notes/birthday/contact/profile remain on the existing Person detail endpoint; no duplicate Person or relationship notes store is introduced.

Edit using existing `PUT /api/v1/roles/{roleId}/relations/{relationId}` with `{relationType,roleNotes}`. relationType is required; omitted/null/blank roleNotes clears the note. Existing PUT is replacement, not PATCH, and has no client version field. JPA optimistic conflict protection remains. Role A edits do not edit Role B or common Person fields. Archived Person relation edits are rejected consistently with relation creation; archive/unlink remains available. Existing relation endpoints and response shape otherwise remain compatible.

## Personal Role group bookmarks

The social module owns these use cases, and calls `RoleLookupApi`; role does not depend on social. The record is a personal bookmark, independent of GuildGroupLink leader approvals and RoleParty creator association.

| Method/path | Request | Result |
| --- | --- | --- |
| GET `/api/v1/roles/{roleId}/group-links` | optional groupType, keyword, page, size | 200 page of explicit personal links, linkId descending |
| GET `/api/v1/roles/{roleId}/group-link-candidates` | required groupType; optional keyword, page, size | 200 page of current ACTIVE memberships in ACTIVE groups, groupId descending |
| POST `/api/v1/roles/{roleId}/group-links` | `{groupType,groupId}` | 200 existing or new stable link identity |
| DELETE `/api/v1/roles/{roleId}/group-links/{linkId}` | no body | 204; repeated/missing owned-path deletion is harmless |

`groupType` is exactly `GUILD`, `PARTY`, or `ROLE_PARTY`; numeric IDs across types are unrelated. Candidate rows: `{groupType,groupId,name,memberRole}`. Link identity: `{linkId,roleId,groupType,groupId}`. List row additionally carries `access` (`AVAILABLE` or `UNAVAILABLE`) and nullable `group` (candidate summary). Null group is the only unavailable state; no private name/description/member snapshot is stored or returned after access is lost. Keyword is a literal case-insensitive name substring (trimmed, max 120); unavailable links only appear with empty keyword, so use unfiltered listing to remove stale bookmarks. Type filter applies in SQL before pagination.

Only explicit bookmarks appear here: creator RoleParty associations remain in the existing `/roles/{roleId}/role-parties` API and are not implicitly materialized. FE combining those sources must deduplicate by `(groupType,groupId)`. Removing a bookmark never removes the original creator association. Adding a creator-associated group explicitly yields one bookmark, not a second source group.

Add validates owned ACTIVE Role and current active membership, regardless of leadership or visibility. Pending invitation/application, LEFT, outsider and disbanded target return the existing type-specific 404. Archived Role returns `ROL-409-ARCHIVED`. Owner Role is locked before the target group. This serializes against group-locking commands (including RoleParty membership commands). Legacy Guild/Party membership deletion can race with link creation and leave an inert link; the same-statement membership-filtered read never treats it as permission. Unique `(owner_player_id,role_id,group_type,group_id)` is enforced by MySQL; same-role concurrent/retry adds converge on the same row. Different Roles can bookmark independently. After delete/re-add the new linkId may differ. No new membership, invitation, shared permissions, shared group or event is created.

Reads project membership + ACTIVE group state in the same DB statement as live fields, under READ_COMMITTED; a stored link never grants access. Existing detail/management endpoints remain authoritative for current membership/leadership; the bookmark summary is navigation only. DELETE checks Role ownership but requires neither active Role nor target membership, and removes only the actor's matching link. This permits cleanup after leave/kick/disband/Role archive. Leader transfer preserves bookmarks while returned memberRole follows current authority.

## Storage / verification gates

Additive V46 follows V45; existing migration checksums are untouched. Role ownership uses a composite FK to `(roles.id, roles.player_id)`. Polymorphic targets cannot use a shared FK; only the three allowlisted social target tables are resolved, checked under their row lock. No foreign Entity/Repository is injected across modules.

Required evidence: focused MySQL pagination/search/ownership/history and unique/FK/concurrent add tests; HTTP privacy and no side effects; required final-head build-and-test; pre-restart dedicated DB/JAR backups; app-only replacement; preserved MySQL/Redis volumes, 19080, FE13005 and existing accounts. Disposable HTTP accounts only, credentials in 0600 files. The completed evidence is recorded below.

Out of scope (3B): member-to-Person identity linkage, Guild private notes, shared schedule display, RoleParty collaboration/offline roster, content activation. Person.linkedUserId is User ID; member.playerId is Player ID; no automatic identity match. No RoleEvent copies, EXP, Quest, LifeLog or membership side effects. Official HRDK rows remain separately gated at zero without verified official source/ServiceKey.

## Verified runtime / FE handoff

- Implementation/runtime commit: `9a509056adb8cdeec218290a831ef098e0b55e92`; tree: `b2bafe80824cb0e7afedec9cafd89dbc4a97d7d3`.
- JAR SHA-256: `1dc96528f8ef070b31ea689d1121459730e30cedde86fc481ff886683ed6c959`. Dedicated base: `http://127.0.0.1:19081`; V46 checksum `-991473906`, Hibernate validate and health passed. V1–V45 checksums and existing Players preserved; only the app container was recreated. MySQL/Redis containers and volumes were retained.
- [English Draft PR #398](https://github.com/LifeAsGame/lifeasgame-backend/pull/398), dependent on unmerged #396 → #397. Required [build-and-test](https://github.com/LifeAsGame/lifeasgame-backend/actions/runs/37304167430) passed for the implementation commit before deployment. The subsequent contract-only commit uses the same tested product code; its CI is tracked in PR checks and `backend-next.json`.
- Local focused tests: new HTTP/MySQL behavior, existing RoleRelation application/transaction/persistence, provider boundaries, baseline/checksum/upgrade data preservation. Focused-selection Gradle build and 11 demo safety tests passed; full clean/test/build passed in required CI.
- Real HTTP with disposable Players 40/41/42: separate Role notes/common profile, owner denial, archived history, all three active memberships, pending invitation denial, concurrent link retries, DB paging/literal search, leadership transfer, leave/kick/disband privacy, cleanup and creator association preservation. Link/note operations added no membership, invitation, LifeLog, Quest receipt, reward settlement or EXP. Existing Person/profile, LifeLog categories, private hobby, catalogs/mine, date validation and exact `http://127.0.0.1:13005` CORS passed. 19080 and FE13005 remained healthy.
- Disposable verification credentials only: `/Users/ryu/.local/share/lifeasgame-demo/lag-demo-129fd1f60637/namespaces/be-feedback03a-20261005/credentials.json` (0600). These are consumed test accounts, not showcase accounts. No credential/token values are part of this contract. Result: `/Users/ryu/.local/share/lifeasgame-demo/lag-demo-129fd1f60637/feedback03a-http-verification.json`.
- Pre-upgrade backups: DB `/Users/ryu/.local/share/lifeasgame-demo/lag-demo-129fd1f60637/backups/feedback03a-before-v46-20261005.sql.gz`, JAR `/Users/ryu/.local/share/lifeasgame-demo/lag-demo-129fd1f60637/app.jar.pre-feedback03a-20261005`, runtime state `/Users/ryu/.local/share/lifeasgame-demo/lag-demo-129fd1f60637/runtime.json.pre-feedback03a-20261005`. V46 is additive; restore the previous app JAR if necessary without resetting data/volumes.
- Start/stop app: `docker start lag-demo-129fd1f60637-app-1` / `docker stop lag-demo-129fd1f60637-app-1` (dedicated DB/Redis must already be running). Current source/runtime metadata: `/Users/ryu/.local/share/lifeasgame-integration/backend-next.json`.

Existing RoleParty creator and `/mine` history endpoints retain their prior contracts. The new link/candidate API performs its own current-membership projection and is the personal bookmark surface; it must not be treated as new authorization for any old endpoint. Broad legacy membership-locking or history-contract redesign is deferred.
