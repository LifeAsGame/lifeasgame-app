"use client";

import { useMemo, useRef, useState } from "react";

import LeftContext from "@/components/LeftContext";
import OrbNav from "@/components/OrbNav";
import RightPanels from "@/components/RightPanels";
import { usePanScroll } from "@/hooks/usePanScroll";
import {
  DEFAULT_SUB_SELECTIONS,
  INVENTORY_GEAR_LISTS,
  INVENTORY_GEAR_PARTS,
  INVENTORY_INBOX_LIST,
  INVENTORY_ITEMS_LIST,
  LIFELOG_LISTS,
  MAIN_NAV_ITEMS,
  MAIN_PANEL_TITLES,
  MARKET_SHOP_CATALOG_LIST,
  MARKET_SHOP_MY_LISTINGS,
  MARKET_SHOP_SECTIONS,
  MARKET_TRADE_FRIENDS,
  MARKET_TRADE_WINDOW_ACTIONS,
  MARKET_WALLET_SUMMARY_LIST,
  PLAYER_LISTS,
  QUEST_LISTS,
  SKILLS_LISTS,
  SOCIAL_LISTS,
  SUBMENUS_BY_MAIN,
  SYSTEM_PANEL_ROWS,
} from "@/lib/nav";
import type {
  MainNavId,
  PanelDataItem,
  PanelStackItem,
  SocialContextData,
} from "@/lib/nav";
import { bringToFrontStable } from "@/lib/reorder";
import { UI_CONSTS } from "@/lib/uiConsts";

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
    const list = PLAYER_LISTS[selectedMainSub as keyof typeof PLAYER_LISTS] ?? [];
    const selectedItem = findById(list, selectedDetailByKey.player);

    panelStack.push({
      id: `player-list-${selectedMainSub}`,
      kind: "list",
      title: `${mainItems.find((item) => item.id === selectedMainSub)?.label ?? "Player"} List`,
      items: list,
      selectedId: selectedDetailByKey.player ?? undefined,
      context: { main: "player", route: "player-list" },
    });

    if (selectedItem) {
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

      const gearList = INVENTORY_GEAR_LISTS[selectedPart as keyof typeof INVENTORY_GEAR_LISTS] ?? [];
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
    const list = LIFELOG_LISTS[selectedMainSub as keyof typeof LIFELOG_LISTS] ?? [];
    const selectedItem = findById(list, selectedDetailByKey.lifelog);

    panelStack.push({
      id: `lifelog-list-${selectedMainSub}`,
      kind: "list",
      title: `${mainItems.find((item) => item.id === selectedMainSub)?.label ?? "Lifelog"} List`,
      items: list,
      selectedId: selectedDetailByKey.lifelog ?? undefined,
      context: { main: "lifelog", route: "lifelog-list" },
    });

    if (selectedItem) {
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
  const viewportRef = useRef<HTMLDivElement>(null);
  usePanScroll(viewportRef);

  const [selectedMain, setSelectedMain] = useState<MainNavId>("player");
  const [selectedSubByMain, setSelectedSubByMain] = useState<Record<MainNavId, string | null>>({
    ...DEFAULT_SUB_SELECTIONS,
  });
  const [selectedInventoryGearPartId, setSelectedInventoryGearPartId] = useState<string | null>(null);
  const [selectedMarketShopSectionId, setSelectedMarketShopSectionId] = useState<string | null>(null);
  const [selectedDetailByKey, setSelectedDetailByKey] = useState<
    Record<DetailSelectionKey, string | null>
  >(() => createDefaultDetailSelections());
  const [surfaceFocusState, setSurfaceFocusState] = useState<SurfaceFocusState>({
    counter: 1,
    lastFocusBySurface: {},
  });

  const updateDetailSelections = (updates: Partial<Record<DetailSelectionKey, string | null>>) => {
    setSelectedDetailByKey((prev) => ({ ...prev, ...updates }));
  };

  const clearDetailSelectionsForMain = (main: MainNavId) => {
    if (main === "player") updateDetailSelections({ player: null });
    if (main === "skills") updateDetailSelections({ skills: null });
    if (main === "inventory") updateDetailSelections({ inventoryItems: null, inventoryGear: null, inventoryInbox: null });
    if (main === "quests") updateDetailSelections({ quests: null });
    if (main === "social") updateDetailSelections({ social: null });
    if (main === "lifelog") updateDetailSelections({ lifelog: null });
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

  const { panelStack, socialContext } = useMemo(
    () =>
      buildPanels(
        selectedMain,
        selectedSubByMain,
        selectedInventoryGearPartId,
        selectedMarketShopSectionId,
        selectedDetailByKey,
      ),
    [
      selectedMain,
      selectedSubByMain,
      selectedInventoryGearPartId,
      selectedMarketShopSectionId,
      selectedDetailByKey,
    ],
  );

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
  };

  const handlePanelItemSelect = (panelIndex: number, itemId: string) => {
    const panel = panelStack[panelIndex];
    if (!panel) return;

    if (panel.kind === "menu") {
      if (panel.context.route === "main-submenu") {
        setSelectedSubByMain((prev) => ({ ...prev, [panel.context.main]: itemId }));
        clearDetailSelectionsForMain(panel.context.main);
        if (panel.context.main === "inventory") {
          setSelectedInventoryGearPartId(null);
        }
        if (panel.context.main === "market") {
          setSelectedMarketShopSectionId(null);
        }
        return;
      }

      if (panel.context.route === "inventory-gear-menu") {
        setSelectedInventoryGearPartId(itemId);
        updateDetailSelections({ inventoryGear: null });
        return;
      }

      if (panel.context.route === "market-shop-menu") {
        setSelectedMarketShopSectionId(itemId);
        updateDetailSelections({ marketCatalog: null, marketMyListings: null });
        return;
      }

      if (panel.context.route === "market-trade-action-menu") {
        updateDetailSelections({ marketTradeAction: itemId });
      }
      return;
    }

    if (panel.kind === "list") {
      if (panel.context.route === "player-list") updateDetailSelections({ player: itemId });
      if (panel.context.route === "skills-list") updateDetailSelections({ skills: itemId });
      if (panel.context.route === "inventory-items-list") updateDetailSelections({ inventoryItems: itemId });
      if (panel.context.route === "inventory-gear-list") updateDetailSelections({ inventoryGear: itemId });
      if (panel.context.route === "inventory-inbox-list") updateDetailSelections({ inventoryInbox: itemId });
      if (panel.context.route === "quests-list") updateDetailSelections({ quests: itemId });
      if (panel.context.route === "social-list") updateDetailSelections({ social: itemId });
      if (panel.context.route === "lifelog-list") updateDetailSelections({ lifelog: itemId });
      if (panel.context.route === "market-wallet-summary") updateDetailSelections({ marketWallet: itemId });
      if (panel.context.route === "market-shop-catalog-list") updateDetailSelections({ marketCatalog: itemId });
      if (panel.context.route === "market-shop-my-listings") updateDetailSelections({ marketMyListings: itemId });
      if (panel.context.route === "market-trade-friends") {
        updateDetailSelections({
          marketTradeFriend: itemId,
          marketTradeAction: null,
        });
      }
    }
  };

  const leftContextMode =
    selectedMain === "player" ? "player" : selectedMain === "social" ? "social" : "hidden";

  return (
    <div
      ref={viewportRef}
      className="h-screen overflow-auto"
      style={{
        background:
          "radial-gradient(circle at 18% 20%, rgba(82, 127, 214, 0.12), transparent 42%), radial-gradient(circle at 80% 18%, rgba(247, 191, 78, 0.06), transparent 36%), linear-gradient(180deg, #07090d 0%, #090b10 38%, #0a0c11 100%)",
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
          socialContext={socialContext}
          onFocus={() => bringSurfaceToFront("left-context")}
          zIndex={getSurfaceZIndex("left-context", SURFACE_GROUP_BASE_Z.left)}
        />

        <div className="shrink-0" style={{ width: UI_CONSTS.layout.centerWidth }}>
          <OrbNav
            items={orderedNavItems}
            selectedId={selectedMain}
            onSelect={handleMainSelect}
            onFocus={() => bringSurfaceToFront("orb-nav")}
            zIndex={getSurfaceZIndex("orb-nav", SURFACE_GROUP_BASE_Z.nav)}
          />
        </div>

        <div className="scrollbar-hide min-w-0 flex-1 overflow-x-auto" style={{ minWidth: UI_CONSTS.layout.rightMinWidth }}>
          <RightPanels
            selectedMain={selectedMain}
            panelStack={panelStack}
            panelStackKey={selectedMain}
            onPanelFocus={(panelIndex) => bringSurfaceToFront(`panel-slot-${panelIndex}`)}
            getPanelZIndex={(panelIndex) =>
              getSurfaceZIndex(`panel-slot-${panelIndex}`, SURFACE_GROUP_BASE_Z.panels, panelIndex * 10)
            }
            onPanelItemSelect={handlePanelItemSelect}
          />
        </div>
      </main>
    </div>
  );
}

