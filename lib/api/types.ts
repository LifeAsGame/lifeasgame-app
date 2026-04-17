// ===== Auth =====
export interface AuthUser {
  id: number;
  email: string;
  nickname: string;
  role: "user" | "admin";
}

// ===== Character Domain =====
export interface StatusEffect {
  code: string;
  effect: string;
}

export interface PlayerInfo {
  playerId: number;
  name: string;
  gender: string;
  job: string;
  level: number;
  exp: number;
  currentHealth: number;
  healthCapacity: number;
  currentMana: number;
  manaCapacity: number;
  str: number;
  agi: number;
  dex: number;
  intel: number;
  vit: number;
  luc: number;
  extraStats: Record<string, number>;
  effects: StatusEffect[];
  representativeTitleId: number | null;
}

export interface RepresentativeTitle {
  titleId: number;
  code: string;
  name: string;
  category: string;
}

export interface EquipmentView {
  slotId: number;
  slotCode: string;
  slotName: string;
  slotCategory: string;
  slotRole: string;
  itemInstanceId: number | null;
}

export interface CharacterSheet {
  player: PlayerInfo;
  title: RepresentativeTitle | null;
  equipments: EquipmentView[];
}

export interface PlayerAchievementInfo {
  achievementId: number;
  code: string;
  name: string;
  category: string;
  descMd: string;
  acquiredAt: string;
}

export interface PlayerCertificationInfo {
  certificationId: number;
  name: string;
  issuer: string;
  category: string;
  acquiredDate: string;
  expiresDate: string | null;
  grantedAt: string;
}

export interface PlayerHobbyInfo {
  hobbyId: number;
  name: string;
  category: string;
  customName: string;
  detail: string;
  proficiency: number;
  status: string;
  startedOn: string;
  xp: number;
}

export interface PlayerTitleInfo {
  titleId: number;
  code: string;
  name: string;
  category: string;
  descMd: string;
  acquiredAt: string;
}

// ===== Inventory Domain =====
export interface InventoryMeta {
  capacitySlots: number;
  usedSlots: number;
  freeSlots: number;
}

export interface InventoryEntry {
  itemInstanceId: number;
  slotIndex: number;
  itemId: number;
  itemName: string;
  category: string;
  type: string;
  rarity: string;
  stackable: boolean;
  maxStack: number;
  quantity: number;
  bound: boolean;
  durability: number | null;
  instanceAttrs: Record<string, unknown>;
}

export interface InventoryView {
  meta: InventoryMeta;
  entries: InventoryEntry[];
}

export interface MailEntry {
  mailId: number;
  slotIndex: number;
  itemId: number;
  itemName: string;
  category: string;
  type: string;
  rarity: string;
  stackable: boolean;
  maxStack: number;
  quantity: number;
  bound: boolean;
  durability: number | null;
  instanceAttrs: Record<string, unknown>;
}

// ===== Quest Domain =====
export interface QuestBlueprint {
  code: string;
  title: string;
  category: string;
  descriptionMd: string;
  targetType: string;
  targetValue: number;
  repeatRule: string;
  rewardExp: number;
  rewardStats: Record<string, number>;
  dueAt: string | null;
}

export interface QuestAcceptance {
  id: number;
  questId: number;
  code: string;
  title: string;
  category: string;
  descriptionMd: string;
  targetType: string;
  targetValue: number;
  progress: number;
  status: string;
  repeatRule: string;
  periodStart: string | null;
  periodEnd: string | null;
  completedAt: string | null;
  dueAt: string | null;
}

// ===== Social Domain =====
export interface FollowSummary {
  id: number;
  playerId: number;
  targetPlayerId: number;
  state: string;
  muted: boolean;
  blocked: boolean;
}

export interface PartySummary {
  id: number;
  name: string;
  code: string;
  visibility: string;
  joinPolicy: string;
  status: string;
  maxMembers: number;
}

export interface PartyInfo {
  id: number;
  playerId: number;
  name: string;
  code: string;
  visibility: string;
  joinPolicy: string;
  status: string;
  maxMembers: number;
  tags: string[];
  descriptionMd: string;
  emblemImageUrl: string | null;
  emblemBgColor: string | null;
  leaderPlayerId: number;
  createdAt: string;
  updatedAt: string;
}

export interface GuildSummary {
  id: number;
  name: string;
  code: string;
  visibility: string;
  joinPolicy: string;
  status: string;
  maxMembers: number;
}

export interface GuildInfo {
  id: number;
  playerId: number;
  name: string;
  code: string;
  visibility: string;
  joinPolicy: string;
  status: string;
  maxMembers: number;
  tags: string[];
  descriptionMd: string;
  emblemImageUrl: string | null;
  emblemBgColor: string | null;
  leaderPlayerId: number;
  createdAt: string;
  updatedAt: string;
}

// ===== Lifelog Domain =====
export interface ExerciseInfo {
  id: number;
  playerId: number;
  category: string;
  durationMinutes: number | null;
  distanceKm: number | null;
  calories: number | null;
  exercisedOn: string;
  memo: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface MediaLogInfo {
  id: number;
  playerId: number;
  category: string;
  title: string;
  originalTitle: string | null;
  currentEpisode: number;
  totalEpisode: number;
  status: string;
  rating: number | null;
  tags: string[];
  rewatchCount: number;
  startedOn: string | null;
  finishedOn: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CollectionInfo {
  id: number;
  playerId: number;
  category: string;
  title: string;
  originalTitle: string | null;
  quantity: number | null;
  conditionNote: string | null;
  acquiredFrom: string | null;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

// ===== Economy Domain =====
export interface WalletBalance {
  amount: number;
  currency: string;
}

export interface ListingSummary {
  id: number;
  itemId: number;
  sellerId: number;
  price: number;
  currency: string;
  status: string;
}

export interface ShopItem {
  id: number;
  itemId: number;
  price: number;
  currency: string;
  available: boolean;
  globalStockLimit: number | null;
  perPlayerLimit: number | null;
  reservationTtlSec: number | null;
}

export interface TradeSummary {
  id: number;
  listingId: number;
  buyerId: number;
  sellerId: number;
  price: number;
  currency: string;
}

// ===== User Domain =====
export interface UserSummary {
  id: number;
  email: string;
  nickname: string;
  status: string;
}

export interface UserInfo {
  user: UserSummary;
  player: { exists: boolean; playerId: number | null };
  ui: {
    nextActions: string[];
    badges: { notifications: number; pendingRewards: number };
  };
}

export interface UserSettings {
  notifications: boolean;
  emailAlerts: boolean;
  publicProfile: boolean;
  showOnlineStatus: boolean;
  language: string;
  uiScale: number;
}

// ===== API Wrapper =====
export interface ApiPage<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}
