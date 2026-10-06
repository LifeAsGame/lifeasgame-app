# Role shared schedule contract (3B2)

Status: **DRAFT** — source review complete; runtime HTTP verification pending.

## Scope and identity

`GET /api/v1/roles/{roleId}/schedule` returns a read-only combined schedule for the authenticated Current Player's Role. `sourceType` is `ROLE_EVENT` or `GUILD_EVENT`; `(sourceType, sourceId)` is the row identity, so equal numeric IDs are distinct. A RoleEvent is shown once. A GuildEvent is shown once even if link data is duplicated. There is no event copy, synchronization, RSVP, LifeLog, Quest, reward, EXP, or notification write. Party and RoleParty have no activity source in this release and are not included. GuildGroupLink is not followed.

The existing `/api/v1/roles/{roleId}/events` array and commands, and `/api/v1/guilds/{guildId}/events` details and commands, remain unchanged. Clients open the original detail and command endpoints using `roleId/sourceId` or `guildId/sourceId`. This schedule does not grant management permission.

## Request

Query parameters: `from` and `to` are ISO-8601 timestamps with explicit offsets; both must be supplied together. `from < to`, range at most 366 days. They are converted to instants without reinterpretation in the server's default time zone. If omitted, the window is the current calendar month in `Asia/Seoul`, `[local month start, next month start)`, computed from the runtime clock. `time=DATED` (default) applies the window. `time=UNSCHEDULED` returns only RoleEvents whose start and end are both null, with its own page; `from`/`to` with `UNSCHEDULED` is 400.

`source=ALL|PERSONAL|GUILD` defaults to `ALL`. `status=PLANNED|COMPLETED|CANCELED|ALL` defaults to `PLANNED`. `participating=true` means only allowed GuildEvents with the actor's current active RSVP; it requires `source=GUILD` and `time=DATED`, otherwise 400. `time=UNSCHEDULED` with `source=GUILD` is 400. False or omitted has no participation filter. `page` is zero based, 0–1000; `size` is 1–50, default 20. Unknown enum values, invalid dates/ranges/pages, and unsupported combinations return 400. No player or owner ID is accepted.

## Time and order

Normal intervals overlap when `event.start < to && event.end > from`. RoleEvents with equal start/end, or exactly one non-null time, are point events included when `from <= point < to`. Both-null RoleEvents appear only in `UNSCHEDULED`. Stored start/end values are returned unchanged. Existing Instant columns are stored as UTC `DATETIME(6)` by the source commands; KST is used only for the default calendar month. KST midnight and month boundaries follow the supplied offsets exactly.

DATED rows sort by effective point/start instant ascending, then `sourceType` ascending, then `sourceId` ascending. UNSCHEDULED rows sort by `sourceType`, then `sourceId`; all are RoleEvents. The database applies access, filters, global order, offset and limit before returning rows. Count, rows, and RSVP use one read statement and the same live-access snapshot. A source failure fails the whole request; no partial success is reported.

## Response and access

The response uses the existing `ApiResponse` envelope and a page object `{contents, page, size, totalElements, totalPages}`. Each compact row has `sourceType`, `sourceId`, `roleId` (personal only), `guildId` and `guildName` (guild only), `title`, `startsAt`, `endsAt`, `status`, and `myRsvp` (null for personal, boolean for guild). It contains no participant or member lists, descriptions, or location. `status` is the original source's `PLANNED`, `COMPLETED`, or `CANCELED` state.

Role ownership is checked first; another player's Role returns 404. Archived Roles retain personal history. A GuildEvent appears only through that Role's direct `GUILD` personal group link while the Guild is ACTIVE and the actor is a current Guild member. Pending invitation/request, historical membership, public visibility, and an indirect GuildGroupLink grant no access. Unlinking one Role removes its Guild rows on the next read without changing another Role, the original GuildEvent, or RSVP. Leave, kick, and disband remove the Guild row and count on the next read; original GuildEvent detail/commands also recheck current membership. Original source edits and RSVP changes appear on the next read. No push or polling contract is introduced.

## Verification gate

READY requires focused MySQL tests of mixed global pagination, source ID collision, ownership and live membership, time boundaries and nullable times, filters and RSVP, no GET mutations, plus actual 19081 HTTP checks of mixed rows, source edits, RSVP, unlink, membership loss, existing representative reads, health and 13005 CORS. Record deployed SHA/tree/JAR and migration state after final CI succeeds.
