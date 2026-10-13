# Verifier schedule descriptions — BE handoff (2026-10-13)

## Source and reproduction

The long `fixture:` value came from the BE verifier loader, not a frontend metadata field. In BE Draft #425, `scripts/content_verifier_v2_apply.py` builds `marker(ref)` from the scenario, cohort and reference code. Its activity loop writes that marker to `RoleEvent.description` (around line 263) and to `GuildEvent.sharedDescription`, `PartyActivity.sharedDescription` and `RolePartyActivity.sharedDescription` (around line 285). The same fields are used to recover a pending create. The approved `08_Verification_Scenario_Activities_v2.csv` supplies titles and schedule metadata but no display description.

Reproduce with the dedicated `content-verifier-owner` account on local BE 19081 and FE 13005:

| Original detail API | Source row | Display field |
| --- | --- | --- |
| `GET /api/v1/roles/59/events/13` | `SCN_ROLE_EVT_BACKEND_PLAN` | `description` |
| `GET /api/v1/roles/61/events/14` | `SCN_ROLE_EVT_MORNING_RUN` | `description` |
| `GET /api/v1/guilds/33/events/9` | `SCN_GUILD_EVT_API_STUDY` | `sharedDescription` |
| `GET /api/v1/guilds/34/events/10` | `SCN_GUILD_EVT_BAND_PREP` | `sharedDescription` |
| `GET /api/v1/parties/27/activities/5` | `SCN_PARTY_ACT_RELEASE_REVIEW` | `sharedDescription` |
| `GET /api/v1/role-parties/17/activities/6` | `SCN_ROLEPARTY_ACT_REHEARSAL` | `sharedDescription` |

Before the data correction observed at 2026-10-13 05:20 UTC, all six APIs returned `fixture:RELEASE_CONTENT_PLAN_2026.10_V2:708df8fc-4789-4b56-ada5-dfd9d6731b1c:<refCode>` in that field. In FE, open **인물 · 역할 → 역할 → 백엔드 개발자 / 주말 밴드 멤버 / 러닝하는 나 → 일정 → row**. `RoleEventPanels`, `GuildEventPanels` and `GroupActivityPanels` render the corresponding API description directly in the original detail. The schedule projection only selects that original; it does not provide a description or copy the event.

## Current local verification and BE follow-up

At 2026-10-13 05:20 UTC the same six local API fields changed to Korean display sentences while their title, time, status and source IDs remained stable. On the existing #170 build at 13005, Chrome opened all six rows and showed those sentences in the appropriate original detail, including the personal, guild, party and role-party source kinds. Back buttons returned to the schedule. No FE string filter or display-field change is needed; a user's own `fixture:` text must remain visible if they enter it.

BE should update the versioned loader before a new cohort or any recovery that lacks a saved ID. As currently committed, it still writes `marker(ref)` to these six user-facing description fields and uses the displayed value as create identity, so a fresh load can reproduce the defect. Keep recovery tied to durable state/IDs or another non-display identity and supply approved display copy. Also audit the loader's other marker writes to `Role.description`, `Person.notes`, `Guild/Party.descriptionMd`, `RoleParty.description` and relation `roleNotes`; the Role description marker was still visible above the schedule in Chrome during this check. Preserve the dedicated cohort and its existing receipt; do not overwrite normal user-authored descriptions by a text pattern.
