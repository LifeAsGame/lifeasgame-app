# Role / Person / personal group context — Feedback03A

Status: **DRAFT — implementation and runtime not yet ready** (2026-10-05).
Base: #397 `dd8ec81d9bfb8f558b749b9f8644ee2ca675a157`, depends on #396 → #397. Dedicated 19081 still serves the previous V45 app. This document is shared before implementation; READY requires required CI and real HTTP verification.

All routes require the authenticated current Player. No actor/owner/memberRole body field is accepted as authority. Success uses `{isSuccess,code,message,result}`; errors use the existing problem+json contract. Pages are `{contents,page,size,totalElements,totalPages}`. `page=0`, `size=20`, page >= 0, size 1–100. Ordering is fixed, never caller-supplied SQL. Invalid input is 400, missing/foreign resources 404, archived Role/Person mutation 409. GET has no writes.

## Person role contexts

`GET /api/v1/persons/{personId}/role-contexts?includeArchived=false&keyword=&page=0&size=20`

The role module owns this query and calls the Person-owned public lookup port before querying. An owned archived Person remains readable. Foreign/missing Person returns `PER-404-NOT-FOUND` (the implementation's existing Person code is authoritative). SQL restricts both relation owner and Role owner. Default includes only ACTIVE Role + ACTIVE relation; `includeArchived=true` includes both active and archived history, without restoring/deleting anything. Keyword is a literal case-insensitive substring of Role name; trim whitespace, max 120. Stable order: relation ID ascending.

Page items: `{relationId,roleId,personId,roleName,roleStatus,relationType,roleNotes,relationStatus,version}`. `roleNotes` is nullable; `version` is the stored relation optimistic-lock version, not a new client precondition. Common Person displayName/notes/birthday/contact/profile remain on the existing Person detail endpoint; no duplicate Person or relationship notes store is introduced.

Edit using existing `PUT /api/v1/roles/{roleId}/relations/{relationId}` with `{relationType,roleNotes}`. relationType is required; omitted/null/blank roleNotes clears the note. Existing PUT is replacement, not PATCH, and has no client version field. JPA optimistic conflict protection remains. Role A edits do not edit Role B or common Person fields. Archived Person relation edits will be rejected consistently with relation creation; archive/unlink remains available. Existing relation endpoints and response shape otherwise remain compatible.

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

Required evidence: focused MySQL pagination/search/ownership/history and unique/FK/concurrent add tests; HTTP privacy and no side effects; required final-head build-and-test; pre-restart dedicated DB/JAR backups; app-only replacement; preserved MySQL/Redis volumes, 19080, FE13005 and existing accounts. Disposable HTTP accounts only, credentials in 0600 files. READY evidence and source SHA/tree/JAR will be filled after verification.

Out of scope (3B): member-to-Person identity linkage, Guild private notes, shared schedule display, RoleParty collaboration/offline roster, content activation. Person.linkedUserId is User ID; member.playerId is Player ID; no automatic identity match. No RoleEvent copies, EXP, Quest, LifeLog or membership side effects. Official HRDK rows remain separately gated at zero without verified official source/ServiceKey.
