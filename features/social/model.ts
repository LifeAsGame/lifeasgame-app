import type { SocialSubId, PanelDataItem, FormFieldSpec } from "@/entities/nav";
import { pad, dateAt } from "@/entities/nav";

// ─── Raw data ────────────────────────────────────────────────────────────────

const PARTY_DATA = [
  { name: "Frontline Assault", code: "FLA-001", members: 5, max: 6, policy: "OPEN", tags: "PvE, Boss" },
  { name: "Night Raiders", code: "NRD-002", members: 4, max: 4, policy: "APPLICATION", tags: "Stealth, Night" },
  { name: "Market Syndicate", code: "MKS-003", members: 3, max: 3, policy: "INVITE_ONLY", tags: "Trade" },
  { name: "Skill Hunters", code: "SKH-004", members: 4, max: 6, policy: "OPEN", tags: "Skills, EXP" },
  { name: "The Wanderers", code: "WND-005", members: 5, max: 5, policy: "OPEN", tags: "Exploration" },
  { name: "Crafters Union", code: "CRU-006", members: 7, max: 8, policy: "APPLICATION", tags: "Crafting" },
  { name: "Solo Support", code: "SSP-007", members: 1, max: 2, policy: "OPEN", tags: "Support" },
  { name: "Dragon Slayers", code: "DRS-008", members: 5, max: 6, policy: "APPLICATION", tags: "Boss" },
];

const GUILD_DATA = [
  { name: "Knights of Aincrad", code: "KOA-001", members: 42, max: 50, policy: "APPLICATION", rank: 1 },
  { name: "Thunder Wolves", code: "TWL-002", members: 28, max: 30, policy: "APPLICATION", rank: 3 },
  { name: "Merchant Lords", code: "MCL-003", members: 18, max: 20, policy: "INVITE_ONLY", rank: 5 },
  { name: "Phantom Blades", code: "PHB-004", members: 12, max: 15, policy: "INVITE_ONLY", rank: 8 },
  { name: "Eternal Crafters", code: "ETC-005", members: 35, max: 40, policy: "OPEN", rank: 4 },
  { name: "Seekers of Lore", code: "SOL-006", members: 22, max: 25, policy: "APPLICATION", rank: 6 },
];

const FRIEND_DATA = [
  { nickname: "Asuna", level: 76, job: "Fencer", status: "ONLINE", muted: false },
  { nickname: "Klein", level: 65, job: "Samurai", status: "IN_DUNGEON", muted: false },
  { nickname: "Agil", level: 72, job: "Warrior", status: "ONLINE", muted: true },
  { nickname: "Lisbeth", level: 60, job: "Blacksmith", status: "CRAFTING", muted: false },
  { nickname: "Silica", level: 55, job: "Beast Tamer", status: "ONLINE", muted: false },
  { nickname: "Leafa", level: 48, job: "Spriggan", status: "AWAY", muted: false },
  { nickname: "Sinon", level: 70, job: "Gunner", status: "ONLINE", muted: false },
  { nickname: "Eugeo", level: 68, job: "Swordsman", status: "OFFLINE", muted: false },
  { nickname: "Alice", level: 80, job: "Integrity Knight", status: "ONLINE", muted: false },
  { nickname: "Heathcliff", level: 100, job: "Paladin", status: "AWAY", muted: false },
];

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
      { type: "gift" as const, label: "선물" },
      { type: "delete" as const, label: "언팔로우" },
    ],
  })),
};

// ─── Form Fields ─────────────────────────────────────────────────────────────

export const PARTY_FORM_FIELDS: FormFieldSpec[] = [
  { key: "name", label: "Party Name", type: "text", placeholder: "e.g. Frontline Assault", required: true },
  { key: "description", label: "Description", type: "textarea", placeholder: "Party description..." },
  { key: "maxMembers", label: "Max Members", type: "number", placeholder: "6", required: true },
  { key: "joinPolicy", label: "Join Policy", type: "select", options: [
    { value: "OPEN", label: "Open" }, { value: "APPROVAL", label: "Application" },
    { value: "INVITE_ONLY", label: "Invite Only" },
  ], required: true },
  { key: "tags", label: "Tags (comma-separated)", type: "text", placeholder: "PvE, Boss, Exploration" },
];

export const GUILD_FORM_FIELDS: FormFieldSpec[] = [
  { key: "name", label: "Guild Name", type: "text", placeholder: "e.g. Knights of Aincrad", required: true },
  { key: "description", label: "Description", type: "textarea", placeholder: "Guild description..." },
  { key: "maxMembers", label: "Max Members", type: "number", placeholder: "50", required: true },
  { key: "joinPolicy", label: "Join Policy", type: "select", options: [
    { value: "OPEN", label: "Open" }, { value: "APPROVAL", label: "Application" },
    { value: "INVITE_ONLY", label: "Invite Only" },
  ], required: true },
  { key: "tags", label: "Tags (comma-separated)", type: "text", placeholder: "PvE, Boss, Crafting" },
];
