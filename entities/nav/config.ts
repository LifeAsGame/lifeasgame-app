import type { MainNavId, PanelMenuItem, PanelItemAction } from "./types";

export const CRUD_ACTIONS: PanelItemAction[] = [
  { type: "edit",   label: "수정" },
  { type: "delete", label: "삭제" },
];

export const MAIN_NAV_ITEMS: Array<{ id: MainNavId; label: string; slotLabel: string }> = [
  { id: "player",    label: "플레이어",    slotLabel: "PL" },
  { id: "inventory", label: "소지품", slotLabel: "IN" },
  { id: "quests",    label: "여정",   slotLabel: "QU" },
  { id: "role",      label: "인물 · 역할",      slotLabel: "RL" },
  { id: "lifelog",   label: "생활 기록",   slotLabel: "LI" },
  { id: "market",    label: "거래소",  slotLabel: "EX" },
  { id: "system",    label: "설정",    slotLabel: "SY" },
];

export const MAIN_PANEL_TITLES: Record<MainNavId, string> = {
  player: "플레이어", inventory: "소지품", quests: "여정", role: "인물 · 역할",
  lifelog: "생활 기록", market: "거래소", system: "설정",
};

export const SUBMENUS_BY_MAIN: Record<MainNavId, PanelMenuItem[]> = {
  player: [
    { id: "growth",      label: "성장",      slotLabel: "GR" },
    { id: "achievement", label: "업적", slotLabel: "AC" },
    { id: "credentials", label: "자격증", slotLabel: "CR" },
    { id: "title",       label: "칭호",       slotLabel: "TI" },
    { id: "interests",   label: "취미",   slotLabel: "IN" },
  ],
  inventory: [
    { id: "items", label: "아이템", slotLabel: "IT" },
    { id: "gear",  label: "장비",  slotLabel: "GE" },
    { id: "inbox", label: "수신함", slotLabel: "MB" },
  ],
  quests: [
    { id: "current", label: "진행 퀘스트", slotLabel: "CU" },
    { id: "catalog", label: "퀘스트 목록", slotLabel: "CA" },
    { id: "routes",  label: "경로",  slotLabel: "RT" },
  ],
  role: [
    { id: "overview",  label: "개요",  slotLabel: "OV" },
    { id: "relations", label: "관계", slotLabel: "RE" },
    { id: "events",    label: "일정",    slotLabel: "EV" },
  ],
  lifelog: [
    { id: "journal",    label: "기록 모아보기",    slotLabel: "JR" },
    { id: "collection", label: "수집 기록", slotLabel: "CL" },
    { id: "media",      label: "감상 기록",      slotLabel: "MD" },
    { id: "exercise",   label: "운동 기록",   slotLabel: "EX" },
  ],
  market: [
    { id: "wallet", label: "지갑", slotLabel: "WL" },
    { id: "shop",   label: "상점",   slotLabel: "SH" },
    { id: "trade",  label: "거래",  slotLabel: "TR" },
  ],
  system: [
    { id: "options", label: "환경 설정", slotLabel: "OP" },
    { id: "logout",  label: "로그아웃",  slotLabel: "LO" },
  ],
};

export const DEFAULT_SUB_SELECTIONS: Record<MainNavId, string | null> = {
  player: null, inventory: null, quests: null, role: null,
  lifelog: null, market: null, system: null,
};

export const INVENTORY_GEAR_PARTS: PanelMenuItem[] = [
  { id: "weapon",    label: "Weapon",    slotLabel: "WP" },
  { id: "armor",     label: "Armor",     slotLabel: "AR" },
  { id: "accessory", label: "Accessory", slotLabel: "AC" },
  { id: "boots",     label: "Boots",     slotLabel: "BT" },
];
