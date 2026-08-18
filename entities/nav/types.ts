export type MainNavId =
  | "player"
  | "skills"
  | "inventory"
  | "quests"
  | "role"
  | "social"
  | "lifelog"
  | "market"
  | "system";

export type PlayerSubId = "growth" | "achievement" | "credentials" | "title" | "interests";
export type SkillsSubId = "passive" | "active";
export type InventorySubId = "items" | "gear" | "inbox";
export type InventoryGearPartId = "weapon" | "armor" | "accessory" | "boots";
export type QuestsSubId = "current" | "catalog" | "routes";
export type RoleSubId = "overview" | "relations" | "events";
export type SocialSubId = "party" | "guild";
export type LifelogSubId = "journal" | "collection" | "media" | "exercise";
export type MarketSubId = "wallet" | "shop" | "trade";
export type MarketShopSubId = "catalog" | "myListings";
export type SystemSubId = "options" | "help" | "logout";

export type PanelMenuItem = {
  id: string;
  label: string;
  slotLabel: string;
  description?: string;
};

export type PanelItemAction = {
  type: "edit" | "delete" | "cancel" | "equip" | "unequip" | "gift" | "claim" | "start" | "sell";
  label: string;
};

export type FormFieldSpec = {
  key: string;
  label: string;
  type: "text" | "number" | "select" | "date" | "textarea";
  options?: { value: string; label: string }[];
  placeholder?: string;
  required?: boolean;
};

export type PanelDataItem = {
  id: string;
  label: string;
  slotLabel: string;
  subtitle?: string;
  /** Optional category string used for tab filtering in list panels */
  category?: string;
  detailTitle?: string;
  detailDescription: string;
  detailRows: string[];
  contextTitle?: string;
  contextDescription?: string;
  contextRows?: string[];
  actions?: PanelItemAction[];
};

export type SocialContextData = {
  categoryLabel: string;
  title: string;
  subtitle?: string;
  description: string;
  rows: string[];
};

type PanelContext = {
  main: MainNavId;
  route: string;
};

export type PanelStackItem =
  | {
      id: string;
      kind: "menu";
      title: string;
      items: PanelMenuItem[];
      selectedId?: string;
      context: PanelContext;
    }
  | {
      id: string;
      kind: "list";
      title: string;
      items: PanelDataItem[];
      selectedId?: string;
      actionLabel?: string;
      actionable?: boolean;
      context: PanelContext;
    }
  | {
      id: string;
      kind: "placeholder";
      title: string;
      description: string;
      rows?: string[];
      primaryActionLabel?: string;
    }
  | {
      id: string;
      kind: "modal";
      title: string;
      description: string;
      rows?: string[];
      confirmLabel: string;
    }
  | {
      id: string;
      kind: "form";
      title: string;
      formKey: string;
      fields: FormFieldSpec[];
      submitLabel?: string;
      prefillValues?: Record<string, string>;
      context: PanelContext;
    }
  | {
      id: string;
      kind: "message";
      title: string;
      friendId: string;
      friendName: string;
      context: { main: "social"; route: "social-message" };
    }
  | {
      id: string;
      kind: "gift";
      title: string;
      friendId: string;
      friendName: string;
      context: { main: "social"; route: "social-gift" };
    };
