# LifeLog personal categories — DRAFT (2026-10-05)

Base: Draft PR #396 HEAD `f1e164ea3f711d620c7f0b3c4c20c7641be7b6df`. This contract is shared before implementation and will be marked READY only after API and runtime verification.

## Identity and ownership

All paths use the authenticated current Player. Request owner IDs are not accepted. `kind` is `COLLECTION`, `EXERCISE`, or `MEDIA`. A record ID means the original Collection/Exercise/Media ID; `lifeLogId` is a distinct journal projection ID. Category IDs are stable database IDs. System categories retain the existing enum codes; they are service-provided values, not an official external taxonomy. Personal category names never change a record's original `category` or grant PROJECT evidence.

## Planned API

Base: `/api/v1/players/lifelog/categories`.

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
