import type { SocialSubId, PanelDataItem } from "@/entities/nav";
import { pad, dateAt } from "@/entities/nav";
import { PARTY_DATA, GUILD_DATA, FRIEND_DATA } from "./data";

export * from "./forms";

export const SOCIAL_LISTS: Record<SocialSubId, PanelDataItem[]> = {
  party: PARTY_DATA.map((p, i) => ({
    id: `social-party-${pad(i + 1, 3)}`,
    label: p.name,
    slotLabel: `PT`,
    subtitle: `${p.members}/${p.max} members | ${p.policy}`,
    detailTitle: "Party Detail",
    detailDescription: `${p.name} — Active party.`,
    detailRows: [
      `Code: ${p.code}`,
      `Members: ${p.members}/${p.max}`,
      `Join Policy: ${p.policy}`,
      `Tags: ${p.tags}`,
    ],
    contextTitle: p.name,
    contextDescription: `Active party with ${p.members}/${p.max} members. Join policy: ${p.policy}.`,
    contextRows: [
      `Code: ${p.code}`,
      `Recruitment: ${p.policy}`,
      `Tags: ${p.tags}`,
      `Last Activity: ${dateAt(i + 1)}`,
    ],
  })),
  guild: GUILD_DATA.map((g, i) => ({
    id: `social-guild-${pad(i + 1, 3)}`,
    label: g.name,
    slotLabel: `GD`,
    subtitle: `${g.members}/${g.max} members | Rank ${g.rank}`,
    detailTitle: "Guild Detail",
    detailDescription: `${g.name} — Established guild.`,
    detailRows: [
      `Code: ${g.code}`,
      `Members: ${g.members}/${g.max}`,
      `Join Policy: ${g.policy}`,
      `Rank: #${g.rank}`,
    ],
    contextTitle: g.name,
    contextDescription: `Established guild, ranked #${g.rank} in Aincrad. Join policy: ${g.policy}.`,
    contextRows: [
      `Code: ${g.code}`,
      `Members: ${g.members}/${g.max}`,
      `Join Rule: ${g.policy}`,
      `Rank: #${g.rank}`,
    ],
  })),
  friend: FRIEND_DATA.map((f, i) => ({
    id: `social-friend-${pad(i + 1, 3)}`,
    label: f.nickname,
    slotLabel: f.nickname.slice(0, 2).toUpperCase(),
    subtitle: `Lv.${f.level} ${f.job} | ${f.status}${f.muted ? " | MUTED" : ""}`,
    detailTitle: "Friend Detail",
    detailDescription: `${f.nickname} — ${f.job}, Level ${f.level}.`,
    detailRows: [
      `Job: ${f.job}`,
      `Level: ${f.level}`,
      `Status: ${f.status}`,
      `Muted: ${f.muted ? "Yes" : "No"}`,
    ],
    contextTitle: f.nickname,
    contextDescription: `${f.nickname}, Lv.${f.level} ${f.job}. Currently ${f.status.toLowerCase().replace("_", " ")}.`,
    contextRows: [
      `Job: ${f.job}`,
      `Level: ${f.level}`,
      `Status: ${f.status}`,
      `Last Seen: ${dateAt(i + 1)}`,
    ],
    actions: [
      { type: "gift"   as const, label: "선물" },
      { type: "delete" as const, label: "언팔로우" },
    ],
  })),
};
