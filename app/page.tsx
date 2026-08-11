"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

import AmbientOverlay from "@/shared/ui/AmbientOverlay";
import ParticleBackground from "@/shared/ui/ParticleBackground";
import LeftContext from "@/widgets/left-context/LeftContext";
import type { FriendMemoData } from "@/widgets/left-context/LeftContext";
import OrbNav from "@/widgets/orb-nav/OrbNav";
import RightPanels from "@/widgets/right-panels/RightPanels";
import SaoAlert from "@/shared/ui/SaoAlert";
import { useAuth } from "@/features/auth/AuthContext";
import RoleShell from "@/features/role/RoleShell";
import { useRoles } from "@/features/role/useRoles";
import { usePanScroll } from "@/shared/hooks/usePanScroll";
import { MOCK_CHARACTER_SHEET } from "@/features/player/mock";
import {
  DEFAULT_SUB_SELECTIONS,
  INVENTORY_GEAR_PARTS,
  MAIN_NAV_ITEMS,
  MAIN_PANEL_TITLES,
  MARKET_SHOP_SECTIONS,
  MARKET_TRADE_WINDOW_ACTIONS,
  SUBMENUS_BY_MAIN,
} from "@/entities/nav";
import type {
  FormFieldSpec,
  LifelogSubId,
  MainNavId,
  PanelDataItem,
  PlayerSubId,
  PanelStackItem,
  SocialContextData,
} from "@/entities/nav";
import {
  CERTIFICATION_FORM_FIELDS,
  HOBBY_FORM_FIELDS,
  PLAYER_CATEGORY_ITEMS,
  PLAYER_LISTS,
} from "@/features/player/model";
import {
  COLLECTION_FORM_FIELDS,
  EXERCISE_FORM_FIELDS,
  LIFELOG_CATEGORY_ITEMS,
  LIFELOG_LISTS,
  MEDIA_FORM_FIELDS,
} from "@/features/lifelog/model";
import {
  GUILD_FORM_FIELDS,
  PARTY_FORM_FIELDS,
  SOCIAL_LISTS,
} from "@/features/social/model";
import { LISTING_FORM_FIELDS } from "@/features/market/model";
import {
  makeGearLists,
  INVENTORY_INBOX_LIST,
  INVENTORY_ITEMS_LIST,
} from "@/features/inventory/model";
import {
  MARKET_SHOP_CATALOG_LIST,
  MARKET_SHOP_MY_LISTINGS,
  MARKET_TRADE_FRIENDS,
  MARKET_WALLET_SUMMARY_LIST,
} from "@/features/market/model";
import { QUEST_LISTS } from "@/features/quests/model";
import { SKILLS_LISTS } from "@/features/skills/model";
import { SYSTEM_PANEL_ROWS, SYSTEM_OPTIONS_FORM_FIELDS } from "@/features/system/model";
import { getSettingsApi, updateSettingsApi } from "@/lib/api/endpoints/settings.api";
import type { GameSettings } from "@/shared/api/types";
import { bringToFrontStable } from "@/shared/lib/reorder";
import { UI_CONSTS } from "@/shared/lib/uiConsts";
import { useToast } from "@/context/ToastContext";
import { NotificationBell } from "@/shared/ui/NotificationBell";
import { getEquippedGearApi, equipGearApi, unequipGearApi } from "@/lib/api/endpoints/equipment.api";
import { claimMailApi, deleteMailApi } from "@/lib/api/endpoints/inventory.api";
import { acceptQuestApi, cancelQuestApi, claimQuestRewardApi } from "@/lib/api/endpoints/quest.api";
import { requestJoinPartyApi, requestJoinGuildApi, unfollowApi } from "@/lib/api/endpoints/social.api";
import { reserveShopItemApi, confirmShopPurchaseApi, cancelListingApi, createListingApi } from "@/lib/api/endpoints/market.api";
import { MOCK_SHOP_ITEMS } from "@/lib/api/mock/market.mock";
import { MOCK_INVENTORY_ITEMS, MOCK_MAIL_ITEMS } from "@/lib/api/mock/inventory.mock";
import { getEquipSlotId } from "@/features/inventory/model";
import type { EquipmentSlotInfo } from "@/shared/api/types";

type SurfaceFocusState = {
  counter: number;
  lastFocusBySurface: Record<string, number>;
};

type DetailSelectionKey =
  | "player"
  | "skills"
  | "inventoryItems"
  | "inventoryGear"
  | "inventoryInbox"
  | "quests"
  | "social"
  | "lifelog"
  | "marketWallet"
  | "marketCatalog"
  | "marketMyListings"
  | "marketTradeFriend"
  | "marketTradeAction";

const SURFACE_GROUP_BASE_Z = {
  left: 100000,
  nav: 200000,
  panels: 300000,
} as const;

function createDefaultDetailSelections(): Record<DetailSelectionKey, string | null> {
  return {
    player: null,
    skills: null,
    inventoryItems: null,
    inventoryGear: null,
    inventoryInbox: null,
    quests: null,
    social: null,
    lifelog: null,
    marketWallet: null,
    marketCatalog: null,
    marketMyListings: null,
    marketTradeFriend: null,
    marketTradeAction: null,
  };
}

function findById(items: PanelDataItem[], id: string | null) {
  if (!id) return null;
  return items.find((item) => item.id === id) ?? null;
}

function selectedSubForMain(selectedMain: MainNavId, selectedSubByMain: Record<MainNavId, string | null>) {
  const items = SUBMENUS_BY_MAIN[selectedMain];
  const selectedSub = selectedSubByMain[selectedMain];
  if (!selectedSub) return null;
  return items.find((item) => item.id === selectedSub)?.id ?? null;
}

function buildPanels(
  selectedMain: MainNavId,
  selectedSubByMain: Record<MainNavId, string | null>,
  selectedInventoryGearPartId: string | null,
  selectedMarketShopSectionId: string | null,
  selectedDetailByKey: Record<DetailSelectionKey, string | null>,
  selectedPlayerCategoryBySub: Record<PlayerSubId, string | null>,
  selectedLifelogCategoryBySub: Record<LifelogSubId, string | null>,
  editingItemId: string | null,
  hasActiveForm: boolean,
  equippedGear: EquipmentSlotInfo[],
): { panelStack: PanelStackItem[]; socialContext: SocialContextData | null } {
  const mainItems = SUBMENUS_BY_MAIN[selectedMain];
  const selectedMainSub = selectedSubForMain(selectedMain, selectedSubByMain);
  const panelStack: PanelStackItem[] = [
    {
      id: `main-${selectedMain}`,
      kind: "menu",
      title: MAIN_PANEL_TITLES[selectedMain],
      items: mainItems,
      selectedId: selectedMainSub ?? undefined,
      context: { main: selectedMain, route: "main-submenu" },
    },
  ];

  if (!selectedMainSub) {
    return { panelStack, socialContext: null };
  }

  if (selectedMain === "player") {
    const sub = selectedMainSub as PlayerSubId;
    const subLabel = mainItems.find((item) => item.id === sub)?.label ?? "Player";
    const categoryItems = PLAYER_CATEGORY_ITEMS[sub] ?? [];
    const selectedCategory = selectedPlayerCategoryBySub[sub] ?? null;

    panelStack.push({
      id: `player-category-${sub}`,
      kind: "menu",
      title: `${subLabel} Category`,
      items: categoryItems,
      selectedId: selectedCategory ?? undefined,
      context: { main: "player", route: "player-category" },
    });

    if (!selectedCategory) return { panelStack, socialContext: null };

    // CREATE form (no item being edited): suppress list, form appears right of category panel
    // EDIT form (editingItemId set): keep list, form appears right of list
    if (hasActiveForm && !editingItemId) return { panelStack, socialContext: null };

    const allItems = PLAYER_LISTS[sub] ?? [];
    const filteredItems = allItems.filter((item) => item.category === selectedCategory);
    const selectedItem = findById(filteredItems, selectedDetailByKey.player);

    panelStack.push({
      id: `player-list-${sub}-${selectedCategory}`,
      kind: "list",
      title: `${selectedCategory} List`,
      items: filteredItems,
      selectedId: selectedDetailByKey.player ?? undefined,
      context: { main: "player", route: "player-list" },
    });

    if (selectedItem && selectedItem.id !== editingItemId) {
      panelStack.push({
        id: `player-detail-${selectedItem.id}`,
        kind: "placeholder",
        title: selectedItem.detailTitle ?? "Detail",
        description: selectedItem.detailDescription,
        rows: selectedItem.detailRows,
      });
    }

    return { panelStack, socialContext: null };
  }

  if (selectedMain === "skills") {
    const list = SKILLS_LISTS[selectedMainSub as keyof typeof SKILLS_LISTS] ?? [];
    const selectedItem = findById(list, selectedDetailByKey.skills);

    panelStack.push({
      id: `skills-list-${selectedMainSub}`,
      kind: "list",
      title: `${mainItems.find((item) => item.id === selectedMainSub)?.label ?? "Skills"} List`,
      items: list,
      selectedId: selectedDetailByKey.skills ?? undefined,
      context: { main: "skills", route: "skills-list" },
    });

    if (selectedItem) {
      panelStack.push({
        id: `skills-detail-${selectedItem.id}`,
        kind: "placeholder",
        title: selectedItem.detailTitle ?? "Skill Detail",
        description: selectedItem.detailDescription,
        rows: selectedItem.detailRows,
      });
    }

    return { panelStack, socialContext: null };
  }

  if (selectedMain === "inventory") {
    if (selectedMainSub === "items") {
      const selectedItem = findById(INVENTORY_ITEMS_LIST, selectedDetailByKey.inventoryItems);

      panelStack.push({
        id: "inventory-items-list",
        kind: "list",
        title: "Items List",
        items: INVENTORY_ITEMS_LIST,
        selectedId: selectedDetailByKey.inventoryItems ?? undefined,
        context: { main: "inventory", route: "inventory-items-list" },
      });

      if (selectedItem) {
        panelStack.push({
          id: `inventory-items-detail-${selectedItem.id}`,
          kind: "placeholder",
          title: selectedItem.detailTitle ?? "Item Detail",
          description: selectedItem.detailDescription,
          rows: selectedItem.detailRows,
        });
      }

      return { panelStack, socialContext: null };
    }

    if (selectedMainSub === "gear") {
      const selectedPart =
        INVENTORY_GEAR_PARTS.find((item) => item.id === selectedInventoryGearPartId)?.id ?? null;

      panelStack.push({
        id: "inventory-gear-part-menu",
        kind: "menu",
        title: "Gear Parts",
        items: INVENTORY_GEAR_PARTS,
        selectedId: selectedPart ?? undefined,
        context: { main: "inventory", route: "inventory-gear-menu" },
      });

      if (!selectedPart) {
        return { panelStack, socialContext: null };
      }

      const dynamicGearLists = makeGearLists(equippedGear);
      const gearList = dynamicGearLists[selectedPart as keyof typeof dynamicGearLists] ?? [];
      const selectedItem = findById(gearList, selectedDetailByKey.inventoryGear);

      panelStack.push({
        id: `inventory-gear-list-${selectedPart}`,
        kind: "list",
        title: "Owned List",
        items: gearList,
        selectedId: selectedDetailByKey.inventoryGear ?? undefined,
        context: { main: "inventory", route: "inventory-gear-list" },
      });

      if (selectedItem) {
        panelStack.push({
          id: `inventory-gear-detail-${selectedItem.id}`,
          kind: "placeholder",
          title: selectedItem.detailTitle ?? "Gear Detail",
          description: selectedItem.detailDescription,
          rows: selectedItem.detailRows,
        });
      }

      return { panelStack, socialContext: null };
    }

    const selectedItem = findById(INVENTORY_INBOX_LIST, selectedDetailByKey.inventoryInbox);

    panelStack.push({
      id: "inventory-inbox-list",
      kind: "list",
      title: "Mail List",
      items: INVENTORY_INBOX_LIST,
      selectedId: selectedDetailByKey.inventoryInbox ?? undefined,
      context: { main: "inventory", route: "inventory-inbox-list" },
    });

    if (selectedItem) {
      panelStack.push({
        id: `inventory-inbox-detail-${selectedItem.id}`,
        kind: "placeholder",
        title: "Mail Detail",
        description: selectedItem.detailDescription,
        rows: selectedItem.detailRows,
      });
    }

    return { panelStack, socialContext: null };
  }

  if (selectedMain === "quests") {
    const list = QUEST_LISTS[selectedMainSub as keyof typeof QUEST_LISTS] ?? [];
    const selectedItem = findById(list, selectedDetailByKey.quests);

    panelStack.push({
      id: `quests-list-${selectedMainSub}`,
      kind: "list",
      title: `${mainItems.find((item) => item.id === selectedMainSub)?.label ?? "Quest"} List`,
      items: list,
      selectedId: selectedDetailByKey.quests ?? undefined,
      context: { main: "quests", route: "quests-list" },
    });

    if (selectedItem) {
      panelStack.push({
        id: `quests-detail-${selectedItem.id}`,
        kind: "placeholder",
        title: selectedItem.detailTitle ?? "Quest Detail",
        description: selectedItem.detailDescription,
        rows: selectedItem.detailRows,
      });
    }

    return { panelStack, socialContext: null };
  }

  if (selectedMain === "social") {
    const list = SOCIAL_LISTS[selectedMainSub as keyof typeof SOCIAL_LISTS] ?? [];
    const selectedItem = findById(list, selectedDetailByKey.social);
    const categoryLabel = mainItems.find((item) => item.id === selectedMainSub)?.label ?? "Social";

    panelStack.push({
      id: `social-list-${selectedMainSub}`,
      kind: "list",
      title: `${categoryLabel} List`,
      items: list,
      selectedId: selectedDetailByKey.social ?? undefined,
      actionLabel: selectedMainSub === "friend" ? "Add" : "Create",
      context: { main: "social", route: "social-list" },
    });

    return {
      panelStack,
      socialContext: selectedItem
        ? {
            categoryLabel,
            title: selectedItem.contextTitle ?? selectedItem.label,
            subtitle: selectedItem.subtitle,
            description: selectedItem.contextDescription ?? selectedItem.detailDescription,
            rows: selectedItem.contextRows ?? selectedItem.detailRows,
          }
        : null,
    };
  }

  if (selectedMain === "lifelog") {
    const sub = selectedMainSub as LifelogSubId;
    const subLabel = mainItems.find((item) => item.id === sub)?.label ?? "Lifelog";
    const categoryItems = LIFELOG_CATEGORY_ITEMS[sub] ?? [];
    const selectedCategory = selectedLifelogCategoryBySub[sub] ?? null;

    panelStack.push({
      id: `lifelog-category-${sub}`,
      kind: "menu",
      title: `${subLabel} Category`,
      items: categoryItems,
      selectedId: selectedCategory ?? undefined,
      context: { main: "lifelog", route: "lifelog-category" },
    });

    if (!selectedCategory) return { panelStack, socialContext: null };

    if (hasActiveForm && !editingItemId) return { panelStack, socialContext: null };

    const allItems = LIFELOG_LISTS[sub] ?? [];
    const filteredItems = allItems.filter((item) => item.category === selectedCategory);
    const selectedItem = findById(filteredItems, selectedDetailByKey.lifelog);

    panelStack.push({
      id: `lifelog-list-${sub}-${selectedCategory}`,
      kind: "list",
      title: `${selectedCategory} List`,
      items: filteredItems,
      selectedId: selectedDetailByKey.lifelog ?? undefined,
      context: { main: "lifelog", route: "lifelog-list" },
    });

    if (selectedItem && selectedItem.id !== editingItemId) {
      panelStack.push({
        id: `lifelog-detail-${selectedItem.id}`,
        kind: "placeholder",
        title: selectedItem.detailTitle ?? "Detail",
        description: selectedItem.detailDescription,
        rows: selectedItem.detailRows,
      });
    }

    return { panelStack, socialContext: null };
  }

  if (selectedMain === "market") {
    if (selectedMainSub === "wallet") {
      const selectedItem = findById(MARKET_WALLET_SUMMARY_LIST, selectedDetailByKey.marketWallet);

      panelStack.push({
        id: "market-wallet-summary",
        kind: "list",
        title: "Summary",
        items: MARKET_WALLET_SUMMARY_LIST,
        selectedId: selectedDetailByKey.marketWallet ?? undefined,
        context: { main: "market", route: "market-wallet-summary" },
      });

      if (selectedItem) {
        panelStack.push({
          id: `market-wallet-detail-${selectedItem.id}`,
          kind: "placeholder",
          title: "Wallet Detail",
          description: selectedItem.detailDescription,
          rows: selectedItem.detailRows,
        });
      }

      return { panelStack, socialContext: null };
    }

    if (selectedMainSub === "shop") {
      const selectedShopSub =
        MARKET_SHOP_SECTIONS.find((item) => item.id === selectedMarketShopSectionId)?.id ?? null;

      panelStack.push({
        id: "market-shop-menu",
        kind: "menu",
        title: "Shop",
        items: MARKET_SHOP_SECTIONS,
        selectedId: selectedShopSub ?? undefined,
        context: { main: "market", route: "market-shop-menu" },
      });

      if (!selectedShopSub) {
        return { panelStack, socialContext: null };
      }

      if (selectedShopSub === "catalog") {
        const selectedItem = findById(MARKET_SHOP_CATALOG_LIST, selectedDetailByKey.marketCatalog);
        panelStack.push({
          id: "market-shop-catalog-list",
          kind: "list",
          title: "Listing",
          items: MARKET_SHOP_CATALOG_LIST,
          selectedId: selectedDetailByKey.marketCatalog ?? undefined,
          context: { main: "market", route: "market-shop-catalog-list" },
        });

        if (selectedItem) {
          panelStack.push({
            id: `market-shop-catalog-detail-${selectedItem.id}`,
            kind: "placeholder",
            title: "Item Detail / Buy",
            description: selectedItem.detailDescription,
            rows: selectedItem.detailRows,
            primaryActionLabel: "Buy",
          });
        }
      } else {
        const selectedItem = findById(MARKET_SHOP_MY_LISTINGS, selectedDetailByKey.marketMyListings);
        panelStack.push({
          id: "market-shop-my-listings",
          kind: "list",
          title: "My Selling List",
          items: MARKET_SHOP_MY_LISTINGS,
          selectedId: selectedDetailByKey.marketMyListings ?? undefined,
          context: { main: "market", route: "market-shop-my-listings" },
        });

        if (selectedItem) {
          panelStack.push({
            id: `market-shop-my-listings-detail-${selectedItem.id}`,
            kind: "placeholder",
            title: "Listing Detail",
            description: selectedItem.detailDescription,
            rows: selectedItem.detailRows,
          });
        }
      }

      return { panelStack, socialContext: null };
    }

    const selectedTradeFriend = findById(MARKET_TRADE_FRIENDS, selectedDetailByKey.marketTradeFriend);
    panelStack.push({
      id: "market-trade-friends",
      kind: "list",
      title: "Friend List",
      items: MARKET_TRADE_FRIENDS,
      selectedId: selectedDetailByKey.marketTradeFriend ?? undefined,
      context: { main: "market", route: "market-trade-friends" },
    });

    if (selectedTradeFriend) {
      panelStack.push({
        id: `market-trade-window-${selectedTradeFriend.id}`,
        kind: "placeholder",
        title: "Trade Window",
        description: selectedTradeFriend.detailDescription,
        rows: selectedTradeFriend.detailRows,
      });

      panelStack.push({
        id: "market-trade-action-menu",
        kind: "menu",
        title: "Trade Action",
        items: MARKET_TRADE_WINDOW_ACTIONS,
        selectedId: selectedDetailByKey.marketTradeAction ?? undefined,
        context: { main: "market", route: "market-trade-action-menu" },
      });

      if (selectedDetailByKey.marketTradeAction === "confirm") {
        panelStack.push({
          id: `market-trade-confirm-${selectedTradeFriend.id}`,
          kind: "modal",
          title: "Confirm Modal",
          description: `Confirm trade with ${selectedTradeFriend.label}.`,
          rows: [
            "Validation: Slot limits checked",
            "Validation: Partner online",
            "Validation: Fee rule applied",
          ],
          confirmLabel: "Confirm Trade",
        });
      }
    }

    return { panelStack, socialContext: null };
  }

  if (selectedMainSub === "logout") {
    panelStack.push({
      id: "system-logout-confirm",
      kind: "modal",
      title: "Logout Confirm",
      description: "Do you want to save current session and logout?",
      rows: ["Character Save: Ready", "Safe Zone Check: Passed", "Network Sync: Completed"],
      confirmLabel: "Confirm Logout",
    });
    return { panelStack, socialContext: null };
  }

  const systemPanel = SYSTEM_PANEL_ROWS[selectedMainSub as keyof typeof SYSTEM_PANEL_ROWS];

  if (selectedMainSub === "options") {
    if (hasActiveForm) return { panelStack, socialContext: null };
    panelStack.push({
      id: "system-options-placeholder",
      kind: "placeholder",
      title: "Options",
      description: systemPanel?.description ?? "Game settings and preferences.",
      rows: systemPanel?.rows ?? [],
      primaryActionLabel: "설정 편집",
    });
    return { panelStack, socialContext: null };
  }

  panelStack.push({
    id: `system-${selectedMainSub}`,
    kind: "placeholder",
    title: mainItems.find((item) => item.id === selectedMainSub)?.label ?? "System",
    description: systemPanel?.description ?? "System panel.",
    rows: systemPanel?.rows ?? [],
  });

  return { panelStack, socialContext: null };
}

export default function Home() {
  const router = useRouter();
  const { isAuthenticated, playerId, isLoading, logout } = useAuth();
  const playerInfo = MOCK_CHARACTER_SHEET.player;
  const roleState = useRoles(Boolean(playerId));

  const viewportRef = useRef<HTMLDivElement>(null);
  const formOpenCountRef = useRef(0);
  usePanScroll(viewportRef);

  const { showToast } = useToast();
  const [equippedGear, setEquippedGear] = useState<EquipmentSlotInfo[]>([]);
  useEffect(() => {
    if (playerId) getEquippedGearApi().then(setEquippedGear);
  }, [playerId]);

  const [logoutAlertOpen, setLogoutAlertOpen] = useState(false);

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) router.replace("/login");
    else if (!playerId) router.replace("/linkstart");
  }, [isAuthenticated, isLoading, playerId, router]);

  const [selectedMain, setSelectedMain] = useState<MainNavId>("player");
  const [selectedRoleId, setSelectedRoleId] = useState<number | null>(null);
  const [selectedSubByMain, setSelectedSubByMain] = useState<Record<MainNavId, string | null>>({
    ...DEFAULT_SUB_SELECTIONS,
  });
  const [selectedInventoryGearPartId, setSelectedInventoryGearPartId] = useState<string | null>(null);
  const [selectedMarketShopSectionId, setSelectedMarketShopSectionId] = useState<string | null>(null);
  const [selectedPlayerCategoryBySub, setSelectedPlayerCategoryBySub] = useState<Record<PlayerSubId, string | null>>({
    achievement: null, credentials: null, title: null, interests: null,
  });
  const [selectedLifelogCategoryBySub, setSelectedLifelogCategoryBySub] = useState<Record<LifelogSubId, string | null>>({
    collection: null, media: null, exercise: null,
  });
  const [selectedDetailByKey, setSelectedDetailByKey] = useState<
    Record<DetailSelectionKey, string | null>
  >(() => createDefaultDetailSelections());
  const [surfaceFocusState, setSurfaceFocusState] = useState<SurfaceFocusState>({
    counter: 1,
    lastFocusBySurface: {},
  });

  // Form panel overlaid on the base panel stack
  const [activeFormPanel, setActiveFormPanel] = useState<Extract<PanelStackItem, { kind: "form" }> | null>(null);
  // Item currently being edited — suppresses its detail panel so only the form shows
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  // Message / gift special panels
  const [activeSpecialPanel, setActiveSpecialPanel] = useState<
    Extract<PanelStackItem, { kind: "message" }> | Extract<PanelStackItem, { kind: "gift" }> | null
  >(null);
  // Pending action waiting for SaoAlert confirmation
  const [pendingAction, setPendingAction] = useState<{ title: string; message: string; onConfirm: () => void } | null>(null);
  // Friend memo data persisted to localStorage
  const [friendMemos, setFriendMemos] = useState<Record<string, FriendMemoData>>(() => {
    try {
      const raw = typeof window !== "undefined" ? localStorage.getItem("lag_friendMemos") : null;
      return raw ? (JSON.parse(raw) as Record<string, FriendMemoData>) : {};
    } catch {
      return {};
    }
  });

  const updateDetailSelections = (updates: Partial<Record<DetailSelectionKey, string | null>>) => {
    setSelectedDetailByKey((prev) => ({ ...prev, ...updates }));
  };

  const clearDetailSelectionsForMain = (main: MainNavId, nextSub?: string) => {
    if (main === "player") {
      updateDetailSelections({ player: null });
      // Reset category for the sub we're leaving; the new sub keeps its own remembered category
      setSelectedPlayerCategoryBySub((prev) => {
        const sub = nextSub as PlayerSubId | undefined;
        if (!sub) return { achievement: null, credentials: null, title: null, interests: null };
        // Only the previously-selected sub gets reset; others retain their state
        const currentSub = Object.keys(prev).find((k) => prev[k as PlayerSubId] !== null) as PlayerSubId | undefined;
        if (!currentSub || currentSub === sub) return prev;
        return { ...prev, [currentSub]: null };
      });
    }
    if (main === "skills") updateDetailSelections({ skills: null });
    if (main === "inventory") updateDetailSelections({ inventoryItems: null, inventoryGear: null, inventoryInbox: null });
    if (main === "quests") updateDetailSelections({ quests: null });
    if (main === "social") updateDetailSelections({ social: null });
    if (main === "lifelog") {
      updateDetailSelections({ lifelog: null });
      setSelectedLifelogCategoryBySub((prev) => {
        const sub = nextSub as LifelogSubId | undefined;
        if (!sub) return { collection: null, media: null, exercise: null };
        const currentSub = Object.keys(prev).find((k) => prev[k as LifelogSubId] !== null) as LifelogSubId | undefined;
        if (!currentSub || currentSub === sub) return prev;
        return { ...prev, [currentSub]: null };
      });
    }
    if (main === "market") {
      updateDetailSelections({
        marketWallet: null,
        marketCatalog: null,
        marketMyListings: null,
        marketTradeFriend: null,
        marketTradeAction: null,
      });
    }
  };

  const { panelStack: basePanelStack, socialContext } = useMemo(
    () =>
      buildPanels(
        selectedMain,
        selectedSubByMain,
        selectedInventoryGearPartId,
        selectedMarketShopSectionId,
        selectedDetailByKey,
        selectedPlayerCategoryBySub,
        selectedLifelogCategoryBySub,
        editingItemId,
        Boolean(activeFormPanel),
        equippedGear,
      ),
    [
      selectedMain,
      selectedSubByMain,
      selectedInventoryGearPartId,
      selectedMarketShopSectionId,
      selectedDetailByKey,
      selectedPlayerCategoryBySub,
      selectedLifelogCategoryBySub,
      editingItemId,
      activeFormPanel,
      equippedGear,
    ],
  );

  // Append form or special panel after the base stack
  const panelStack = useMemo<PanelStackItem[]>(() => {
    if (activeSpecialPanel) return [...basePanelStack, activeSpecialPanel];
    if (activeFormPanel) return [...basePanelStack, activeFormPanel];
    return basePanelStack;
  }, [basePanelStack, activeFormPanel, activeSpecialPanel]);

  const orderedNavItems = bringToFrontStable(MAIN_NAV_ITEMS, selectedMain, (item) => item.id);

  const bringSurfaceToFront = (surfaceId: string) => {
    setSurfaceFocusState((prev) => {
      const nextCounter = prev.counter + 1;
      return {
        counter: nextCounter,
        lastFocusBySurface: {
          ...prev.lastFocusBySurface,
          [surfaceId]: nextCounter,
        },
      };
    });
  };

  const getSurfaceZIndex = (surfaceId: string, groupBaseZ: number, layerBaseZ = 0) =>
    groupBaseZ + layerBaseZ + (surfaceFocusState.lastFocusBySurface[surfaceId] ?? 0);

  const handleMainSelect = (nextMain: MainNavId) => {
    if (nextMain === selectedMain) {
      return;
    }

    setSelectedMain(nextMain);
    setSelectedSubByMain({ ...DEFAULT_SUB_SELECTIONS });
    setSelectedInventoryGearPartId(null);
    setSelectedMarketShopSectionId(null);
    setSelectedDetailByKey(createDefaultDetailSelections());
    setSelectedPlayerCategoryBySub({ achievement: null, credentials: null, title: null, interests: null });
    setSelectedLifelogCategoryBySub({ collection: null, media: null, exercise: null });
    setActiveFormPanel(null);
    setActiveSpecialPanel(null);
    setEditingItemId(null);
  };

  const handleRoleSelect = (roleId: number) => {
    if (selectedMain !== "role") handleMainSelect("role");
    setSelectedRoleId(roleId);
  };

  const handlePanelItemSelect = (panelIndex: number, itemId: string) => {
    const panel = panelStack[panelIndex];
    if (!panel) return;

    // Toggle helper: re-clicking selected item deselects it (closes downstream panels)
    const tog = (current: string | null) => (current === itemId ? null : itemId);

    if (panel.kind === "menu") {
      if (panel.context.route === "main-submenu" && itemId === "logout") {
        setLogoutAlertOpen(true);
        return;
      }

      if (panel.context.route === "main-submenu") {
        const current = selectedSubByMain[panel.context.main];
        const next = tog(current);
        setSelectedSubByMain((prev) => ({ ...prev, [panel.context.main]: next }));
        clearDetailSelectionsForMain(panel.context.main, next ?? undefined);
        if (panel.context.main === "inventory") setSelectedInventoryGearPartId(null);
        if (panel.context.main === "market") setSelectedMarketShopSectionId(null);
        setActiveFormPanel(null);
        setEditingItemId(null);
        return;
      }

      if (panel.context.route === "player-category") {
        const sub = selectedSubByMain.player as PlayerSubId;
        const next = tog(selectedPlayerCategoryBySub[sub]);
        setSelectedPlayerCategoryBySub((prev) => ({ ...prev, [sub]: next }));
        updateDetailSelections({ player: null });
        setActiveFormPanel(null);
        setEditingItemId(null);
        return;
      }

      if (panel.context.route === "lifelog-category") {
        const sub = selectedSubByMain.lifelog as LifelogSubId;
        const next = tog(selectedLifelogCategoryBySub[sub]);
        setSelectedLifelogCategoryBySub((prev) => ({ ...prev, [sub]: next }));
        updateDetailSelections({ lifelog: null });
        setActiveFormPanel(null);
        setEditingItemId(null);
        return;
      }

      if (panel.context.route === "inventory-gear-menu") {
        setSelectedInventoryGearPartId(tog(selectedInventoryGearPartId));
        updateDetailSelections({ inventoryGear: null });
        return;
      }

      if (panel.context.route === "market-shop-menu") {
        setSelectedMarketShopSectionId(tog(selectedMarketShopSectionId));
        updateDetailSelections({ marketCatalog: null, marketMyListings: null });
        return;
      }

      if (panel.context.route === "market-trade-action-menu") {
        updateDetailSelections({ marketTradeAction: tog(selectedDetailByKey.marketTradeAction) });
      }
      return;
    }

    if (panel.kind === "list") {
      const { player, skills, inventoryItems, inventoryGear, inventoryInbox, quests, social,
              lifelog, marketWallet, marketCatalog, marketMyListings, marketTradeFriend } = selectedDetailByKey;

      if (panel.context.route === "player-list") {
        setActiveFormPanel(null); setEditingItemId(null);
        updateDetailSelections({ player: tog(player) });
      }
      if (panel.context.route === "skills-list") updateDetailSelections({ skills: tog(skills) });
      if (panel.context.route === "inventory-items-list") updateDetailSelections({ inventoryItems: tog(inventoryItems) });
      if (panel.context.route === "inventory-gear-list") updateDetailSelections({ inventoryGear: tog(inventoryGear) });
      if (panel.context.route === "inventory-inbox-list") updateDetailSelections({ inventoryInbox: tog(inventoryInbox) });
      if (panel.context.route === "quests-list") updateDetailSelections({ quests: tog(quests) });
      if (panel.context.route === "social-list") updateDetailSelections({ social: tog(social) });
      if (panel.context.route === "lifelog-list") {
        setActiveFormPanel(null); setEditingItemId(null);
        updateDetailSelections({ lifelog: tog(lifelog) });
      }
      if (panel.context.route === "market-wallet-summary") updateDetailSelections({ marketWallet: tog(marketWallet) });
      if (panel.context.route === "market-shop-catalog-list") updateDetailSelections({ marketCatalog: tog(marketCatalog) });
      if (panel.context.route === "market-shop-my-listings") updateDetailSelections({ marketMyListings: tog(marketMyListings) });
      if (panel.context.route === "market-trade-friends") {
        updateDetailSelections({
          marketTradeFriend: tog(marketTradeFriend),
          marketTradeAction: null,
        });
      }
    }
  };

  // ─── Form panel helpers ────────────────────────────────────────────────────

  const openForm = (
    formKey: string,
    title: string,
    fields: FormFieldSpec[],
    submitLabel?: string,
    prefillValues?: Record<string, string>,
  ) => {
    setActiveFormPanel({
      id: `form-${formKey}-${++formOpenCountRef.current}`,
      kind: "form",
      title,
      formKey,
      fields,
      submitLabel,
      prefillValues,
      context: { main: selectedMain, route: `form-${formKey}` },
    });
    setActiveSpecialPanel(null);
  };

  const handlePanelBack = () => {
    const wasEditing = editingItemId !== null;
    setActiveFormPanel(null);
    setActiveSpecialPanel(null);
    setEditingItemId(null);
    // Clear selected item after edit so no detail panel appears (user wants just the list)
    if (wasEditing) {
      if (selectedMain === "player") updateDetailSelections({ player: null });
      else if (selectedMain === "lifelog") updateDetailSelections({ lifelog: null });
    }
  };

  // Called when list's actionLabel OR placeholder's primaryActionLabel button is clicked
  const handlePanelActionClick = (panelIndex: number) => {
    const panel = basePanelStack[panelIndex];
    if (!panel) return;

    // Placeholder primary action — system options edit button
    if (panel.kind === "placeholder" && panel.id === "system-options-placeholder") {
      getSettingsApi().then((settings) => {
        const p = settings.parsed;
        openForm(
          "system-options",
          "System Options",
          SYSTEM_OPTIONS_FORM_FIELDS,
          "설정 저장",
          {
            volume: String(p.volume ?? 78),
            graphicsQuality: p.graphicsQuality ?? "HIGH",
            voiceChat: p.voiceChat ?? "TEAM_ONLY",
            uiScale: String(p.uiScale ?? 100),
            inputPreset: p.inputPreset ?? "STANDARD",
            showDamageNumbers: String(p.showDamageNumbers ?? true),
            showParticles: String(p.showParticles ?? true),
            showOnlineStatus: String(p.showOnlineStatus ?? true),
            notifications: String(p.notifications ?? true),
            emailAlerts: String(p.emailAlerts ?? false),
            language: p.language ?? "ko",
          },
        );
      });
      return;
    }

    if (panel.kind !== "list") return;
    const route = panel.context.route;
    const sub = selectedSubByMain[panel.context.main];

    if (route === "lifelog-list" && sub === "exercise") {
      openForm("exercise-create", "Log Exercise", EXERCISE_FORM_FIELDS, "기록하기");
    } else if (route === "lifelog-list" && sub === "collection") {
      openForm("collection-create", "Add Collection", COLLECTION_FORM_FIELDS, "추가하기");
    } else if (route === "lifelog-list" && sub === "media") {
      openForm("media-create", "Log Media", MEDIA_FORM_FIELDS, "기록하기");
    } else if (route === "social-list" && sub === "party") {
      openForm("party-create", "Create Party", PARTY_FORM_FIELDS, "파티 생성");
    } else if (route === "social-list" && sub === "guild") {
      openForm("guild-create", "Create Guild", GUILD_FORM_FIELDS, "길드 생성");
    } else if (route === "market-shop-my-listings") {
      openForm("listing-create", "New Listing", LISTING_FORM_FIELDS, "등록하기");
    }
  };

  // Called from long press action buttons
  const handlePanelItemAction = (_panelIndex: number, itemId: string, actionType: string) => {
    const sub = selectedSubByMain[selectedMain];

    if (actionType === "edit") {
      const allLists = [
        ...LIFELOG_LISTS.exercise,
        ...LIFELOG_LISTS.collection,
        ...LIFELOG_LISTS.media,
      ];
      const item = allLists.find((i) => i.id === itemId);

      if (selectedMain === "lifelog" && sub === "exercise") {
        openForm("exercise-edit", "Edit Exercise", EXERCISE_FORM_FIELDS, "수정하기",
          item ? { category: item.detailRows[0]?.split(": ")[1] ?? "" } : undefined);
      } else if (selectedMain === "lifelog" && sub === "collection") {
        openForm("collection-edit", "Edit Collection", COLLECTION_FORM_FIELDS, "수정하기");
      } else if (selectedMain === "lifelog" && sub === "media") {
        openForm("media-edit", "Edit Media", MEDIA_FORM_FIELDS, "수정하기");
      }

    } else if (actionType === "equip") {
      const isQuestAccept = selectedMain === "quests" && (sub === "suggested" || sub === "daily");
      if (isQuestAccept) {
        setPendingAction({
          title: "퀘스트 수락",
          message: "이 퀘스트를 수락하시겠습니까?",
          onConfirm: () => {},
        });
        return;
      }
      // Gear equip flow
      const itemInstanceId = Number(itemId);
      const mockItem = MOCK_INVENTORY_ITEMS.find((i) => i.itemInstanceId === itemInstanceId);
      if (!mockItem) return;
      const slotId = getEquipSlotId(itemInstanceId, equippedGear);
      const targetSlot = equippedGear.find((s) => s.slotId === slotId);
      const slotName = targetSlot?.slotName ?? "슬롯";
      const occupiedBy = targetSlot?.itemName;

      setPendingAction({
        title: "아이템 장착",
        message: occupiedBy
          ? `${mockItem.itemName}을(를) ${slotName}에 장착합니다.\n기존 장착: ${occupiedBy}`
          : `${mockItem.itemName}을(를) ${slotName}에 장착하시겠습니까?`,
        onConfirm: async () => {
          try {
            await equipGearApi(slotId, itemInstanceId);
            const updated = await getEquippedGearApi();
            setEquippedGear(updated);
            showToast({ variant: "success", title: "장착 완료", body: `${mockItem.itemName} → ${slotName}` });
          } catch {
            showToast({ variant: "error", title: "장착 실패", body: "다시 시도해주세요." });
          }
        },
      });

    } else if (actionType === "unequip") {
      const itemInstanceId = Number(itemId);
      const slot = equippedGear.find((s) => s.itemInstanceId === itemInstanceId);
      if (!slot) return;

      setPendingAction({
        title: "장착 해제",
        message: `${slot.itemName ?? "아이템"}을(를) ${slot.slotName}에서 해제하시겠습니까?`,
        onConfirm: async () => {
          try {
            await unequipGearApi(slot.slotId);
            const updated = await getEquippedGearApi();
            setEquippedGear(updated);
            showToast({ variant: "info", title: "장착 해제", body: `${slot.itemName ?? "아이템"}이(가) 해제되었습니다.` });
          } catch {
            showToast({ variant: "error", title: "해제 실패", body: "다시 시도해주세요." });
          }
        },
      });

    } else if (actionType === "start") {
      if (selectedMain === "social" && sub === "party") {
        const partyId = parseInt(itemId.split("-").pop() ?? "0", 10);
        const partyName = SOCIAL_LISTS.party.find((p) => p.id === itemId)?.label ?? "파티";
        setPendingAction({
          title: "파티 가입 신청",
          message: `${partyName}에 가입 신청하시겠습니까?`,
          onConfirm: async () => {
            try {
              await requestJoinPartyApi(partyId);
              showToast({ variant: "info", title: "가입 신청 완료", body: partyName });
            } catch {
              showToast({ variant: "error", title: "신청 실패", body: "다시 시도해주세요." });
            }
          },
        });
      } else if (selectedMain === "social" && sub === "guild") {
        const guildId = parseInt(itemId.split("-").pop() ?? "0", 10);
        const guildName = SOCIAL_LISTS.guild.find((g) => g.id === itemId)?.label ?? "길드";
        setPendingAction({
          title: "길드 가입 신청",
          message: `${guildName}에 가입 신청하시겠습니까?`,
          onConfirm: async () => {
            try {
              await requestJoinGuildApi(guildId);
              showToast({ variant: "info", title: "가입 신청 완료", body: guildName });
            } catch {
              showToast({ variant: "error", title: "신청 실패", body: "다시 시도해주세요." });
            }
          },
        });
      } else if (selectedMain === "market") {
        // Shop purchase: reserve → confirm flow
        const shopItemId = Number(itemId);
        const shopItem = MOCK_SHOP_ITEMS.find((s) => s.id === shopItemId);
        const catalogItem = MARKET_SHOP_CATALOG_LIST.find((c) => c.id === itemId);
        const itemName = catalogItem?.label ?? `Item #${shopItemId}`;
        const price = shopItem?.price ?? 0;

        setPendingAction({
          title: "구매 예약",
          message: `${itemName}\n${price.toLocaleString()} col — 5분간 예약합니다.`,
          onConfirm: async () => {
            try {
              const { reservationToken, expiresAt } = await reserveShopItemApi(shopItemId);
              const expiryStr = new Date(expiresAt).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
              setPendingAction({
                title: "구매 확정",
                message: `${itemName}\n${price.toLocaleString()} col\n예약 만료: ${expiryStr}`,
                onConfirm: async () => {
                  try {
                    await confirmShopPurchaseApi(reservationToken);
                    showToast({ variant: "success", title: "구매 완료", body: `${itemName} — ${price.toLocaleString()} col` });
                  } catch {
                    showToast({ variant: "error", title: "구매 실패", body: "다시 시도해주세요." });
                  }
                },
              });
            } catch {
              showToast({ variant: "error", title: "예약 실패", body: "다시 시도해주세요." });
            }
          },
        });
      } else {
        // Quest accept (blueprints in suggested/daily)
        const questCode = itemId;
        setPendingAction({
          title: "퀘스트 수락",
          message: "이 퀘스트를 수락하시겠습니까?",
          onConfirm: async () => {
            try {
              await acceptQuestApi(questCode);
              showToast({ variant: "quest", title: "퀘스트 수락됨", body: questCode });
            } catch {
              showToast({ variant: "error", title: "수락 실패", body: "다시 시도해주세요." });
            }
          },
        });
      }

    } else if (actionType === "claim") {
      if (selectedMain === "quests") {
        // Quest reward claim
        const questCode = itemId;
        setPendingAction({
          title: "보상 수령",
          message: "퀘스트 보상을 수령하시겠습니까?",
          onConfirm: async () => {
            try {
              const result = await claimQuestRewardApi(questCode);
              showToast({ variant: "quest", title: "보상 수령 완료", body: `EXP +${result.rewardExp}` });
            } catch {
              showToast({ variant: "error", title: "보상 수령 실패", body: "다시 시도해주세요." });
            }
          },
        });
      } else {
        // Mailbox claim
        const mailId = Number(itemId);
        const mail = MOCK_MAIL_ITEMS.find((m) => m.mailId === mailId);
        if (!mail) return;
        setPendingAction({
          title: "아이템 수령",
          message: `${mail.itemName} x${mail.quantity}을(를) 수령하시겠습니까?`,
          onConfirm: async () => {
            try {
              await claimMailApi(mail.slotIndex, mail.quantity);
              showToast({ variant: "success", title: "수령 완료", body: `${mail.itemName} x${mail.quantity}` });
            } catch {
              showToast({ variant: "error", title: "수령 실패", body: "다시 시도해주세요." });
            }
          },
        });
      }

    } else if (actionType === "cancel") {
      if (selectedMain === "market") {
        const listingId = Number(itemId);
        const listingItem = MARKET_SHOP_MY_LISTINGS.find((l) => l.id === itemId);
        setPendingAction({
          title: "리스팅 취소",
          message: `${listingItem?.label ?? `리스팅 #${listingId}`} 판매를 취소하시겠습니까?`,
          onConfirm: async () => {
            try {
              await cancelListingApi(listingId);
              showToast({ variant: "info", title: "리스팅 취소됨", body: listingItem?.label ?? `#${listingId}` });
            } catch {
              showToast({ variant: "error", title: "취소 실패", body: "다시 시도해주세요." });
            }
          },
        });
      } else {
        const isQuest = selectedMain === "quests";
        const questCode = isQuest ? itemId : null;
        setPendingAction({
          title: isQuest ? "퀘스트 취소" : "취소",
          message: isQuest ? "진행 중인 퀘스트를 취소하시겠습니까?" : "이 항목을 취소하시겠습니까?",
          onConfirm: async () => {
            if (questCode) {
              try {
                await cancelQuestApi(questCode);
                showToast({ variant: "warning", title: "퀘스트 취소됨", body: questCode });
              } catch {
                showToast({ variant: "error", title: "취소 실패", body: "다시 시도해주세요." });
              }
            }
          },
        });
      }

    } else if (actionType === "delete") {
      if (selectedMain === "social" && sub === "friend") {
        const followId = parseInt(itemId.split("-").pop() ?? "0", 10);
        const friendName = SOCIAL_LISTS.friend.find((f) => f.id === itemId)?.label ?? "플레이어";
        setPendingAction({
          title: "언팔로우",
          message: `${friendName}을(를) 언팔로우하시겠습니까?`,
          onConfirm: async () => {
            try {
              await unfollowApi(followId);
              updateDetailSelections({ social: null });
              showToast({ variant: "info", title: "언팔로우됨", body: friendName });
            } catch {
              showToast({ variant: "error", title: "실패", body: "다시 시도해주세요." });
            }
          },
        });
      } else {
        const isMailbox = selectedMain === "inventory" && sub === "inbox";
        const mailId = Number(itemId);
        const mail = isMailbox ? MOCK_MAIL_ITEMS.find((m) => m.mailId === mailId) : null;
        setPendingAction({
          title: "삭제",
          message: mail ? `${mail.itemName} 메일을 삭제하시겠습니까?` : "이 항목을 삭제하시겠습니까?",
          onConfirm: async () => {
            if (mail) {
              try {
                await deleteMailApi(mail.slotIndex);
                showToast({ variant: "info", title: "메일 삭제됨", body: mail.itemName });
              } catch {
                showToast({ variant: "error", title: "삭제 실패", body: "다시 시도해주세요." });
              }
            }
          },
        });
      }

    } else if (actionType === "sell") {
      const itemInstanceId = Number(itemId);
      const invItem = MOCK_INVENTORY_ITEMS.find((i) => i.itemInstanceId === itemInstanceId);
      if (!invItem) return;
      setSelectedSubByMain((prev) => ({ ...prev, market: "shop" }));
      setSelectedMarketShopSectionId("my-listings");
      setSelectedMain("market");
      openForm(
        "listing-create",
        "New Listing",
        LISTING_FORM_FIELDS,
        "등록하기",
        {
          itemName: invItem.itemName,
          price: "",
          quantity: String(invItem.quantity),
          _itemInstanceId: String(invItem.itemInstanceId),
          _itemId: String(invItem.itemId),
        },
      );

    } else if (actionType === "gift") {
      // Friend gift action from long press — push gift panel
      const friendItem = SOCIAL_LISTS.friend.find((f) => f.id === itemId);
      if (friendItem) {
        setActiveSpecialPanel({
          id: `gift-${itemId}`,
          kind: "gift",
          title: `Send Gift — ${friendItem.label}`,
          friendId: itemId,
          friendName: friendItem.label,
          context: { main: "social", route: "social-gift" },
        });
        setActiveFormPanel(null);
      }
    }
  };

  // Called when form panel submit is confirmed
  const handlePanelFormSubmit = (formKey: string, values: Record<string, string>) => {
    if (formKey === "system-options") {
      const settings: Partial<GameSettings> = {
        volume: Number(values.volume),
        graphicsQuality: values.graphicsQuality as GameSettings["graphicsQuality"],
        voiceChat: values.voiceChat as GameSettings["voiceChat"],
        uiScale: Number(values.uiScale) as GameSettings["uiScale"],
        inputPreset: values.inputPreset as GameSettings["inputPreset"],
        showDamageNumbers: values.showDamageNumbers === "true",
        showParticles: values.showParticles === "true",
        showOnlineStatus: values.showOnlineStatus === "true",
        notifications: values.notifications === "true",
        emailAlerts: values.emailAlerts === "true",
        language: values.language,
      };
      updateSettingsApi(settings).then(() => {
        showToast({ variant: "success", title: "설정 저장됨", body: "System options updated." });
      }).catch(() => {
        showToast({ variant: "error", title: "저장 실패", body: "다시 시도해주세요." });
      });
      setActiveFormPanel(null);
      return;
    }

    if (formKey === "listing-create") {
      const itemInstanceId = Number(values._itemInstanceId);
      const itemId = Number(values._itemId);
      const price = Number(values.price);
      const itemName = values.itemName ?? `Item #${itemInstanceId}`;
      if (!itemInstanceId || !price) {
        showToast({ variant: "error", title: "입력 오류", body: "가격을 입력해주세요." });
        return;
      }
      createListingApi({ itemInstanceId, itemId, price }).then(() => {
        showToast({ variant: "success", title: "리스팅 등록됨", body: `${itemName} — ${price.toLocaleString()} col` });
        setActiveFormPanel(null);
      }).catch(() => {
        showToast({ variant: "error", title: "등록 실패", body: "다시 시도해주세요." });
      });
      return;
    }

    const wasEditing = editingItemId !== null;
    setActiveFormPanel(null);
    setEditingItemId(null);
    if (wasEditing) {
      if (selectedMain === "player") updateDetailSelections({ player: null });
      else if (selectedMain === "lifelog") updateDetailSelections({ lifelog: null });
    }
  };

  // Called when any field in a form panel changes — syncs category panel selection
  const handlePanelFormFieldChange = (formKey: string, fieldKey: string, value: string) => {
    if (fieldKey !== "category") return;
    if (formKey.startsWith("credential") || formKey.startsWith("hobby")) {
      const sub = selectedSubByMain.player as PlayerSubId;
      setSelectedPlayerCategoryBySub((prev) => ({ ...prev, [sub]: value || null }));
    } else if (formKey.startsWith("exercise") || formKey.startsWith("collection") || formKey.startsWith("media")) {
      const sub = selectedSubByMain.lifelog as LifelogSubId;
      setSelectedLifelogCategoryBySub((prev) => ({ ...prev, [sub]: value || null }));
    }
  };

  // Double-click/tap on a category menu item → open create form (clears category so list hides)
  // Double-click/tap on a list item → open edit form
  const handlePanelItemDoubleClick = (panelIndex: number, itemId: string) => {
    const panel = panelStack[panelIndex];

    // Category panel double-click → create form
    // Keep category selected (SET not null) so category panel shows selection.
    // hasActiveForm=true will suppress the list panel, leaving [submenu, category(selected), form].
    if (panel?.kind === "menu" && panel.context.route === "player-category") {
      const sub = selectedSubByMain.player as PlayerSubId;
      setSelectedPlayerCategoryBySub((prev) => ({ ...prev, [sub]: itemId }));
      updateDetailSelections({ player: null });
      setEditingItemId(null);
      if (sub === "credentials") {
        openForm("credential-create", "Add Credential", CERTIFICATION_FORM_FIELDS, "추가하기", { category: itemId });
      } else if (sub === "interests") {
        openForm("hobby-create", "Add Interest", HOBBY_FORM_FIELDS, "추가하기", { category: itemId });
      }
      return;
    }

    if (panel?.kind === "menu" && panel.context.route === "lifelog-category") {
      const sub = selectedSubByMain.lifelog as LifelogSubId;
      setSelectedLifelogCategoryBySub((prev) => ({ ...prev, [sub]: itemId }));
      updateDetailSelections({ lifelog: null });
      setEditingItemId(null);
      if (sub === "exercise") {
        openForm("exercise-create", "Log Exercise", EXERCISE_FORM_FIELDS, "기록하기", { category: itemId });
      } else if (sub === "collection") {
        openForm("collection-create", "Add Collection", COLLECTION_FORM_FIELDS, "추가하기", { category: itemId });
      } else if (sub === "media") {
        openForm("media-create", "Log Media", MEDIA_FORM_FIELDS, "기록하기", { type: itemId });
      }
      return;
    }

    // List item double-click → edit form; keep item selected, suppress only the detail panel
    const sub = selectedSubByMain[selectedMain];
    if (selectedMain === "player") {
      updateDetailSelections({ player: itemId });
      setEditingItemId(itemId);
      if (sub === "credentials") {
        const item = PLAYER_LISTS.credentials.find((i) => i.id === itemId);
        openForm("credential-edit", "Edit Credential", CERTIFICATION_FORM_FIELDS, "수정하기",
          item ? { name: item.label, issuer: item.subtitle?.split(" | ")[0] ?? "", category: item.category ?? "", acquiredDate: item.detailRows[2]?.split(": ")[1] ?? "" } : undefined);
      } else if (sub === "interests") {
        const item = PLAYER_LISTS.interests.find((i) => i.id === itemId);
        openForm("hobby-edit", "Edit Interest", HOBBY_FORM_FIELDS, "수정하기",
          item ? { customName: item.label, category: item.category ?? "", proficiency: item.detailRows[2]?.split(": ")[1]?.replace("/100", "") ?? "", status: item.detailRows[1]?.split(": ")[1] ?? "" } : undefined);
      }
    } else if (selectedMain === "lifelog") {
      updateDetailSelections({ lifelog: itemId });
      setEditingItemId(itemId);
      if (sub === "exercise") {
        openForm("exercise-edit", "Edit Exercise", EXERCISE_FORM_FIELDS, "수정하기");
      } else if (sub === "collection") {
        openForm("collection-edit", "Edit Collection", COLLECTION_FORM_FIELDS, "수정하기");
      } else if (sub === "media") {
        openForm("media-edit", "Edit Media", MEDIA_FORM_FIELDS, "수정하기");
      }
    }
  };

  // Called from LeftContext friend action buttons
  const handleFriendAction = (action: "message" | "gift" | "unfollow", followId: string) => {
    const friendItem = SOCIAL_LISTS.friend.find((f) => f.id === followId);
    if (!friendItem) return;

    if (action === "message") {
      setActiveSpecialPanel({
        id: `message-${followId}`,
        kind: "message",
        title: `Message — ${friendItem.label}`,
        friendId: followId,
        friendName: friendItem.label,
        context: { main: "social", route: "social-message" },
      });
      setActiveFormPanel(null);
    } else if (action === "gift") {
      setActiveSpecialPanel({
        id: `gift-${followId}`,
        kind: "gift",
        title: `Send Gift — ${friendItem.label}`,
        friendId: followId,
        friendName: friendItem.label,
        context: { main: "social", route: "social-gift" },
      });
      setActiveFormPanel(null);
    } else if (action === "unfollow") {
      updateDetailSelections({ social: null });
      setActiveSpecialPanel(null);
    }
  };

  // Friend memo persistence
  const handleFriendMemoUpdate = (followId: string, memo: FriendMemoData) => {
    const next = { ...friendMemos, [followId]: memo };
    setFriendMemos(next);
    try {
      localStorage.setItem("lag_friendMemos", JSON.stringify(next));
    } catch {}
  };

  const leftContextMode =
    selectedMain === "player" ? "player" : selectedMain === "role" ? "role" : selectedMain === "social" ? "social" : "hidden";

  // Auto-scroll viewport right when panel stack grows (new panel added)
  const prevPanelLengthRef = useRef(0);
  useEffect(() => {
    if (panelStack.length > prevPanelLengthRef.current) {
      requestAnimationFrame(() => {
        viewportRef.current?.scrollTo({ left: viewportRef.current.scrollWidth, behavior: "smooth" });
      });
    }
    prevPanelLengthRef.current = panelStack.length;
  }, [panelStack.length]);

  if (isLoading || !isAuthenticated || !playerId) return null;

  return (
    <div
      ref={viewportRef}
      className="h-screen overflow-auto"
      style={{
        /* SAO 가상공간 배경 — 파란 격자 + 방사형 빛 + 깊이감 */
        background: [
          /* 파란 격자 — 홀로그램 바닥 */
          "linear-gradient(rgba(82,127,214,0.042) 1px, transparent 1px)",
          "linear-gradient(90deg, rgba(82,127,214,0.042) 1px, transparent 1px)",
          /* 좌상단 파란 빛 */
          "radial-gradient(ellipse at 16% 22%, rgba(82,127,214,0.22) 0%, transparent 48%)",
          /* 우상단 골드 빛 */
          "radial-gradient(ellipse at 84% 14%, rgba(247,191,78,0.09) 0%, transparent 38%)",
          /* 중앙 하단 보조 파란 빛 */
          "radial-gradient(ellipse at 50% 88%, rgba(60,100,200,0.10) 0%, transparent 44%)",
          /* 기본 다크 그라데이션 */
          "linear-gradient(180deg, #06080d 0%, #08090f 40%, #090b11 100%)",
        ].join(", "),
        backgroundSize: "44px 44px, 44px 44px, 100% 100%, 100% 100%, 100% 100%, 100% 100%",
      }}
    >
      <main
        className="mx-auto flex w-full min-w-max items-center"
        style={{
          minHeight: "100vh",
          gap: UI_CONSTS.layout.columnGap,
          paddingTop: UI_CONSTS.layout.pagePaddingY + UI_CONSTS.layout.visualCenterOffsetY,
          paddingBottom: UI_CONSTS.layout.pagePaddingY,
          paddingLeft: UI_CONSTS.layout.pagePaddingX,
          paddingRight: UI_CONSTS.layout.canvasEndPaddingX,
        }}
      >
        <LeftContext
          mode={leftContextMode}
          playerInfo={playerInfo}
          equipments={MOCK_CHARACTER_SHEET.equipments}
          guildName={MOCK_CHARACTER_SHEET.representativeGuildName}
          roles={roleState.roles}
          rolesLoading={roleState.isLoading}
          rolesError={roleState.error}
          selectedRoleId={selectedRoleId}
          socialContext={socialContext}
          selectedFriendId={selectedDetailByKey.social}
          isFriendMode={selectedMain === "social" && selectedSubByMain.social === "friend"}
          friendMemoByFollowId={friendMemos}
          onFriendMemoUpdate={handleFriendMemoUpdate}
          onFriendAction={handleFriendAction}
          onFriendSelect={(followId) => updateDetailSelections({ social: followId })}
          onRoleSelect={handleRoleSelect}
          onFocus={() => bringSurfaceToFront("left-context")}
          zIndex={getSurfaceZIndex("left-context", SURFACE_GROUP_BASE_Z.left)}
        />

        <div className="shrink-0" style={{ width: UI_CONSTS.layout.centerWidth, position: "relative" }}>
          <div style={{ position: "absolute", top: 0, right: -14, zIndex: getSurfaceZIndex("orb-nav", SURFACE_GROUP_BASE_Z.nav) + 1 }}>
            <NotificationBell />
          </div>
          <OrbNav
            items={orderedNavItems}
            selectedId={selectedMain}
            onSelect={handleMainSelect}
            onFocus={() => bringSurfaceToFront("orb-nav")}
            zIndex={getSurfaceZIndex("orb-nav", SURFACE_GROUP_BASE_Z.nav)}
          />
        </div>

        <div className="scrollbar-hide min-w-0 flex-1 overflow-x-auto" style={{ minWidth: UI_CONSTS.layout.rightMinWidth }}>
          {selectedMain === "role" ? (
            <div className="flex w-fit items-center gap-3">
              <RoleShell
                roles={roleState.roles}
                selectedRoleId={selectedRoleId}
                isLoading={roleState.isLoading}
                error={roleState.error}
                onSelectRole={setSelectedRoleId}
                onRefresh={roleState.refresh}
              />
              {activeSpecialPanel ? (
                <RightPanels
                  selectedMain="role"
                  panelStack={[activeSpecialPanel]}
                  panelStackKey="role-social-special"
                  onPanelItemSelect={() => {}}
                  onPanelBack={() => setActiveSpecialPanel(null)}
                />
              ) : null}
            </div>
          ) : (
            <RightPanels
              selectedMain={selectedMain}
              panelStack={panelStack}
              panelStackKey={selectedMain}
              onPanelFocus={(panelIndex) => bringSurfaceToFront(`panel-slot-${panelIndex}`)}
              getPanelZIndex={(panelIndex) =>
                getSurfaceZIndex(`panel-slot-${panelIndex}`, SURFACE_GROUP_BASE_Z.panels, panelIndex * 10)
              }
              onPanelItemSelect={handlePanelItemSelect}
              onPanelItemAction={handlePanelItemAction}
              onPanelItemDoubleClick={handlePanelItemDoubleClick}
              onPanelFormSubmit={handlePanelFormSubmit}
              onPanelFormFieldChange={handlePanelFormFieldChange}
              onPanelBack={handlePanelBack}
              onPanelActionClick={handlePanelActionClick}
            />
          )}
        </div>
      </main>

      <ParticleBackground />
      <AmbientOverlay />

      <SaoAlert
        isOpen={logoutAlertOpen}
        title="Logout"
        onConfirm={() => {
          setLogoutAlertOpen(false);
          logout();
          router.push("/login");
        }}
        onCancel={() => setLogoutAlertOpen(false)}
      />

      <SaoAlert
        isOpen={Boolean(pendingAction)}
        title={pendingAction?.title ?? ""}
        message={pendingAction?.message}
        onConfirm={() => {
          pendingAction?.onConfirm();
          setPendingAction(null);
        }}
        onCancel={() => setPendingAction(null)}
      />
    </div>
  );
}
