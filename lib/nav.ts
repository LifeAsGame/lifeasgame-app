export type MainNavId = "player" | "equipment" | "social" | "friend" | "system";

export type PanelMenuItem = {
  id: string;
  label: string;
  slotLabel: string;
  description?: string;
};

export type FriendEntry = {
  id: string;
  name: string;
  level: number;
  status: "online" | "away" | "offline";
  note: string;
};

export type PanelStackItem =
  | {
      id: string;
      kind: "menu";
      title: string;
      items: PanelMenuItem[];
      selectedId?: string;
      context: { main: MainNavId; sub?: string };
    }
  | {
      id: string;
      kind: "friends";
      title: string;
      items: FriendEntry[];
      selectedId?: string;
    }
  | {
      id: string;
      kind: "friendDetail";
      title: string;
      friend: FriendEntry;
    }
  | {
      id: string;
      kind: "placeholder";
      title: string;
      description: string;
      rows?: string[];
    };

export const MAIN_NAV_ITEMS: Array<{
  id: MainNavId;
  label: string;
  slotLabel: string;
}> = [
  { id: "player", label: "Player", slotLabel: "P" },
  { id: "equipment", label: "Equipment", slotLabel: "E" },
  { id: "social", label: "Social", slotLabel: "S" },
  { id: "friend", label: "Friend", slotLabel: "F" },
  { id: "system", label: "System", slotLabel: "SY" },
];

export const SUBMENUS_BY_MAIN: Record<MainNavId, PanelMenuItem[]> = {
  player: [
    { id: "items", label: "Items", slotLabel: "IT" },
    { id: "skills", label: "Skills", slotLabel: "SK" },
    { id: "equipment", label: "Equipment", slotLabel: "EQ" },
  ],
  equipment: [
    { id: "parts", label: "Parts", slotLabel: "PT" },
    { id: "owned-list", label: "Owned List", slotLabel: "OL" },
  ],
  social: [
    { id: "party", label: "Party", slotLabel: "PA" },
    { id: "friend", label: "Friend", slotLabel: "FR" },
    { id: "guild", label: "Guild", slotLabel: "GU" },
  ],
  friend: [
    { id: "friends-list", label: "Friends List", slotLabel: "FL" },
    { id: "message-box", label: "Message Box", slotLabel: "MB" },
    { id: "profile", label: "Profile", slotLabel: "PR" },
  ],
  system: [
    { id: "option", label: "Option", slotLabel: "OP" },
    { id: "help", label: "Help", slotLabel: "HP" },
    { id: "logout", label: "Logout", slotLabel: "LO" },
  ],
};

export const EQUIPMENT_PARTS: PanelMenuItem[] = [
  { id: "hat", label: "Hat", slotLabel: "HT" },
  { id: "weapon", label: "Weapon", slotLabel: "WP" },
  { id: "armor", label: "Armor", slotLabel: "AR" },
  { id: "accessory", label: "Accessory", slotLabel: "AC" },
  { id: "boots", label: "Boots", slotLabel: "BT" },
];

export const OWNED_EQUIPMENT_ROWS = [
  "Elucidator Replica / +7",
  "Night Cloak / Rare",
  "Silver Ring / AGI +2",
  "Field Boots / DEF +1",
] as const;

export const PLAYER_ITEMS_ROWS = [
  "Potion x12",
  "Teleport Crystal x3",
  "Bread x6",
  "Quest Token x1",
] as const;

export const PLAYER_SKILLS_ROWS = [
  "One-Handed Sword / Lv. 14",
  "Search / Lv. 8",
  "Sprint / Lv. 6",
  "Cooking / Lv. 3",
] as const;

export const PLAYER_EQUIPMENT_ROWS = [
  "Weapon: Elucidator",
  "Armor: Midnight Coat",
  "Accessory: Guild Crest",
] as const;

export const SOCIAL_ROWS: Record<string, readonly string[]> = {
  party: ["Current Party: 3 members", "Raid Finder: Empty", "Party Invite Queue: 1"],
  friend: ["Shared Activity Feed", "Recent Online Friends", "Pending Requests"],
  guild: ["Guild Hall Status", "Treasury Log", "Guild Missions"],
};

export const SYSTEM_ROWS: Record<string, readonly string[]> = {
  option: ["Graphics: High", "BGM: 60%", "Voice: 80%", "UI Scale: 100%"],
  help: ["Controls", "FAQ", "Support Ticket", "Version Notes"],
  logout: ["Safe Zone Check", "Character Save", "Logout Confirmation"],
};

export const FRIENDS: FriendEntry[] = [
  {
    id: "asuna",
    name: "Asuna",
    level: 43,
    status: "online",
    note: "Field run at 22:00",
  },
  {
    id: "agil",
    name: "Agil",
    level: 38,
    status: "away",
    note: "Shop open / trade available",
  },
  {
    id: "klein",
    name: "Klein",
    level: 41,
    status: "online",
    note: "Party matching",
  },
  {
    id: "silica",
    name: "Silica",
    level: 27,
    status: "offline",
    note: "Last online 1d ago",
  },
];

export const MAIN_PANEL_TITLES: Record<MainNavId, string> = {
  player: "Player",
  equipment: "Equipment",
  social: "Social",
  friend: "Friend",
  system: "System",
};
