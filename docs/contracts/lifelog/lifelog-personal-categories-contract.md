# LifeLog personal categories — READY on dedicated 19081 (2026-10-05)

Base: Draft PR #396 HEAD `f1e164ea3f711d620c7f0b3c4c20c7641be7b6df`. Implementation: Draft PR #397 commit `be514cb62c46e13d3b2e0802b3915a8c6ca22ccc` (tree `dcb8b6988d6ecf16170bd587a7974fcfefbfa07d`). Required [build-and-test](https://github.com/LifeAsGame/lifeasgame-backend/actions/runs/37282664849) succeeded on that HEAD. #396 and #397 remain unmerged; #397 depends on #396.

## Identity and ownership

All paths use the authenticated current Player. Request owner IDs are not accepted. `kind` is `COLLECTION`, `EXERCISE`, or `MEDIA`. A record ID means the original Collection/Exercise/Media ID; `lifeLogId` is a distinct journal projection ID. Category IDs are stable database IDs. System categories retain the existing enum codes; they are service-provided values, not an official external taxonomy. Personal category names never change a record's original `category` or grant PROJECT evidence.

## API

Base: `/api/v1/players/lifelog/categories`.

The category GET/POST/PATCH/PUT endpoints return the standard `ApiResponse` envelope (`isSuccess`, `result`); DELETE returns 204. `GET /system` has a `result` array of raw code strings. `GET ?kind` and category mutation results use `{id, kind, source, systemCode, name}`. A SYSTEM row has `name` equal to its code; a PERSONAL row has `systemCode: null`. The assignment result is `{personalCategoryId: number|null}` inside the envelope.

| Method and path | Meaning |
| --- | --- |
| `GET /system?kind=COLLECTION` | All system codes for the kind, including unselected/hidden ones; no writes. |
| `GET ?kind=COLLECTION` | My selected visible system categories and personal categories; no writes. New users start empty. |
| `POST /system` `{ "kind":"COLLECTION", "systemCode":"PROJECT" }` | Add or restore a system category. Repeated identical calls converge on one ID. |
| `DELETE /system/{kind}/{systemCode}` | Hide a selected system category; a retry remains hidden. No record is deleted. |
| `POST /personal` `{ "kind":"EXERCISE", "name":"Weekend activity" }` | Create an owned category. |
| `PATCH /personal/{categoryId}` `{ "name":"Outdoor activity" }` | Rename an owned personal category. |
| `DELETE /personal/{categoryId}` | Delete a personal category and detach its records without deleting the originals. |
| `PUT /records/{kind}/{recordId}/personal-category` `{ "categoryId":123 }` | Assign or move one original record to one owned category of the same kind. `{ "categoryId":null }` detaches; omitted property is invalid. |

Personal names are trimmed, normalized case-insensitively, and limited to 1–80 characters. Duplicate names within owner+kind return 409; different owners/kinds may reuse them. Invalid kind/system code/name returns 400; missing or foreign category/record returns 404; kind mismatch returns 400. System additions are unique by owner+kind+system code, including concurrent retries. Hidden system categories retain their ID when restored. Deleting a personal category releases assignments; unclassified and all-record views remain accessible.

Existing create endpoints retain required original `category`. They may accept optional `personalCategoryId`; when provided, original creation and assignment are one transaction. Omission preserves the old behavior. Existing update endpoints do not acquire new original-category mutability. Search endpoints retain their filters and pagination and add `personalCategoryId` or `unclassified=true` (mutually exclusive). Recent/detail/list responses include `personalCategoryId` (nullable); the category list resolves its name. Filter combinations are applied in SQL before paging. QUICK and journal records keep existing source IDs, subtype, entry mode, role/event context, reflection scope and period key. Category operations publish no LifeLog/quest/reward events. A new record follows its existing event path once.

Migration will backfill only system codes actually used by existing owner records. Hiding one does not trigger read-time restoration. No GET mutates state. A personal category is independent of system types; it has no default original category, so FE must supply a valid original enum when creating a record. MEDIA has no `OTHER` code.

## Dedicated runtime proof

`http://127.0.0.1:19081` runs implementation `be514cb62c46e13d3b2e0802b3915a8c6ca22ccc`, tree `dcb8b6988d6ecf16170bd587a7974fcfefbfa07d`, JAR SHA-256 `0c60cf7e54b2e10a5840a76a1c7c554fa248c644ad6d98f51b5edd5d24ae182d`. V45 checksum `56720812` applied; Hibernate validate and health passed. Existing 36 Players and dedicated MySQL/Redis containers/volumes were retained. Pre-V45 DB backup: `/Users/ryu/.local/share/lifeasgame-demo/lag-demo-129fd1f60637/backups/lifelog-categories-before-v45-20261005.sql.gz`; prior JAR: `/Users/ryu/.local/share/lifeasgame-demo/lag-demo-129fd1f60637/app.jar.pre-lifelog-categories-20261005`.

Disposable Players 37/38 verified new-user empty state, system add/retry/hide/restore with stable ID, personal create/duplicate, cross-owner and wrong-kind rejection, original record create with atomic category assignment, move/detach/delete, source and journal filters, GET without category-row mutation, 13005 CORS, and preserved original `OTHER`/LifeLog source ID. One new record wrote one `lifelog.recorded.v1` fact; category operations added no LifeLog record, Quest receipt, or Reward settlement. Existing authenticated Player, private hobby, public hobby catalog, certification reads, invalid exercise date 400, and 19080/13005 health passed. Verification credentials are stored only at `/Users/ryu/.local/share/lifeasgame-demo/lag-demo-129fd1f60637/namespaces/lifelog-feedback22-20261005/credentials.json` (0600).

Official certification collection remains separately gated: no official HRDK rows are present. The current importer accepts a verified normalized manifest; a ServiceKey alone does not make it a live fetch tool. Source acquisition/collector work is separate and does not block this LifeLog API.
