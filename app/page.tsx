"use client";

import { useRef, useState } from "react";

import LeftContext from "@/components/LeftContext";
import OrbNav from "@/components/OrbNav";
import RightPanels from "@/components/RightPanels";
import { usePanScroll } from "@/hooks/usePanScroll";
import type { MainNavId, PanelMenuItem, PanelStackItem } from "@/lib/nav";
import {
  EQUIPMENT_PARTS,
  FRIENDS,
  MAIN_NAV_ITEMS,
  MAIN_PANEL_TITLES,
  OWNED_EQUIPMENT_ROWS,
  PLAYER_EQUIPMENT_ROWS,
  PLAYER_ITEMS_ROWS,
  PLAYER_SKILLS_ROWS,
  SOCIAL_ROWS,
  SUBMENUS_BY_MAIN,
  SYSTEM_ROWS,
} from "@/lib/nav";
import { bringToFrontStable } from "@/lib/reorder";
import { UI_CONSTS } from "@/lib/uiConsts";

type FriendDetailTab = "message" | "profile";
type TransitionPhase = "idle" | "resetting";
type SurfaceFocusState = {
  counter: number;
  lastFocusBySurface: Record<string, number>;
};

const DEFAULT_EQUIPMENT_PART_ID: string | null = null;
const DEFAULT_FRIEND_ID: string | null = null;
const DEFAULT_PLAYER_ITEM_ID: string | null = null;

const DEFAULT_SUB_SELECTIONS: Record<MainNavId, string> = {
  player: SUBMENUS_BY_MAIN.player[0].id,
  equipment: SUBMENUS_BY_MAIN.equipment[0].id,
  social: SUBMENUS_BY_MAIN.social[0].id,
  friend: SUBMENUS_BY_MAIN.friend[0].id,
  system: SUBMENUS_BY_MAIN.system[0].id,
};

const SURFACE_GROUP_BASE_Z = {
  left: 100000,
  nav: 200000,
  panels: 300000,
} as const;

const PLAYER_ITEM_MENU_ITEMS: PanelMenuItem[] = PLAYER_ITEMS_ROWS.map((row, index) => ({
  id: `player-item-${(index + 1).toString().padStart(3, "0")}`,
  label: row,
  slotLabel: (index + 1).toString().padStart(2, "0"),
}));

function buildPanels(
  selectedMain: MainNavId,
  selectedSubByMain: Record<MainNavId, string>,
  selectedEquipmentPartId: string | null,
  selectedFriendId: string | null,
  selectedPlayerItemId: string | null,
): PanelStackItem[] {
  const mainItems = SUBMENUS_BY_MAIN[selectedMain];
  const selectedMainSub =
    mainItems.find((item) => item.id === selectedSubByMain[selectedMain])?.id ?? mainItems[0]?.id;

  const panels: PanelStackItem[] = [
    {
      id: `main-${selectedMain}`,
      kind: "menu",
      title: MAIN_PANEL_TITLES[selectedMain],
      items: mainItems,
      selectedId: selectedMainSub,
      context: { main: selectedMain },
    },
  ];

  if (!selectedMainSub) {
    return panels;
  }

  if (selectedMain === "player") {
    if (selectedMainSub === "items") {
      const selectedPlayerItem = selectedPlayerItemId
        ? PLAYER_ITEM_MENU_ITEMS.find((item) => item.id === selectedPlayerItemId) ?? null
        : null;

      panels.push({
        id: "player-items-list",
        kind: "menu",
        title: "Items",
        items: PLAYER_ITEM_MENU_ITEMS,
        selectedId: selectedPlayerItemId ?? undefined,
        context: { main: "player", sub: "items-list" },
      });

      if (selectedPlayerItem) {
        panels.push({
          id: `player-item-detail-${selectedPlayerItem.id}`,
          kind: "placeholder",
          title: "Item Detail",
          description: `${selectedPlayerItem.label}`,
          rows: [
            "Type: Inventory Item",
            "Status: Selectable Row (MVP)",
            "Action: Use / Inspect (placeholder)",
          ],
        });
      }

      return panels;
    }

    const rows = selectedMainSub === "skills" ? PLAYER_SKILLS_ROWS : PLAYER_EQUIPMENT_ROWS;

    panels.push({
      id: `player-${selectedMainSub}`,
      kind: "placeholder",
      title: mainItems.find((item) => item.id === selectedMainSub)?.label ?? "Player",
      description: "Player menu placeholder panel (MVP).",
      rows: [...rows],
    });

    return panels;
  }

  if (selectedMain === "equipment") {
    if (selectedMainSub === "parts") {
      const selectedPart = selectedEquipmentPartId
        ? EQUIPMENT_PARTS.find((item) => item.id === selectedEquipmentPartId) ?? null
        : null;

      panels.push({
        id: "equipment-parts",
        kind: "menu",
        title: "Parts",
        items: EQUIPMENT_PARTS,
        selectedId: selectedEquipmentPartId ?? undefined,
        context: { main: "equipment", sub: "parts" },
      });

      if (selectedPart) {
        panels.push({
          id: `equipment-part-${selectedPart.id}`,
          kind: "placeholder",
          title: selectedPart.label,
          description: `${selectedPart.label} slot configuration placeholder (MVP).`,
          rows: [
            "Durability: 82%",
            "Enhancement: +3",
            "Rarity: Uncommon",
            "Bind Status: Equipped",
          ],
        });
      }
    } else {
      panels.push({
        id: "equipment-owned-list",
        kind: "placeholder",
        title: "Owned List",
        description: "Owned equipment inventory placeholder (MVP).",
        rows: [...OWNED_EQUIPMENT_ROWS],
      });
    }

    return panels;
  }

  if (selectedMain === "social") {
    panels.push({
      id: `social-${selectedMainSub}`,
      kind: "placeholder",
      title: mainItems.find((item) => item.id === selectedMainSub)?.label ?? "Social",
      description: "Social feature placeholder panel (MVP).",
      rows: [...(SOCIAL_ROWS[selectedMainSub] ?? [])],
    });

    return panels;
  }

  if (selectedMain === "friend") {
    if (selectedMainSub === "friends-list") {
      const selectedFriend = selectedFriendId
        ? FRIENDS.find((friend) => friend.id === selectedFriendId) ?? null
        : null;

      panels.push({
        id: "friend-list",
        kind: "friends",
        title: "Friends List",
        items: FRIENDS,
        selectedId: selectedFriendId ?? undefined,
      });

      if (selectedFriend) {
        panels.push({
          id: `friend-detail-${selectedFriend.id}`,
          kind: "friendDetail",
          title: "Friend Detail",
          friend: selectedFriend,
        });
      }
    } else if (selectedMainSub === "message-box") {
      panels.push({
        id: "friend-message-box",
        kind: "placeholder",
        title: "Message Box",
        description:
          "Message inbox list placeholder. Use Friends List -> Friend Detail -> message tab for MVP send UI.",
        rows: ["Unread: 2", "Party Invite Messages", "Trade Request Messages"],
      });
    } else {
      panels.push({
        id: "friend-profile",
        kind: "placeholder",
        title: "Profile",
        description:
          "Profile overview placeholder. Detailed profile record editing is in Friend Detail -> profile tab.",
        rows: ["Avatar Card", "Public Memo", "Recent Party History"],
      });
    }

    return panels;
  }

  panels.push({
    id: `system-${selectedMainSub}`,
    kind: "placeholder",
    title: mainItems.find((item) => item.id === selectedMainSub)?.label ?? "System",
    description: "System option placeholder panel (MVP).",
    rows: [...(SYSTEM_ROWS[selectedMainSub] ?? [])],
  });

  return panels;
}

function buildInitialStack(
  selectedMain: MainNavId,
): PanelStackItem[] {
  const mainItems = SUBMENUS_BY_MAIN[selectedMain];

  return [
    {
      id: `main-${selectedMain}`,
      kind: "menu",
      title: MAIN_PANEL_TITLES[selectedMain],
      items: mainItems,
      selectedId: undefined,
      context: { main: selectedMain },
    },
  ];
}

export default function Home() {
  const viewportRef = useRef<HTMLDivElement>(null);
  usePanScroll(viewportRef);

  const [selectedMain, setSelectedMain] = useState<MainNavId>("player");
  const [selectedSubByMain, setSelectedSubByMain] =
    useState<Record<MainNavId, string>>(DEFAULT_SUB_SELECTIONS);
  const [selectedEquipmentPartId, setSelectedEquipmentPartId] =
    useState<string | null>(DEFAULT_EQUIPMENT_PART_ID);
  const [selectedFriendId, setSelectedFriendId] = useState<string | null>(DEFAULT_FRIEND_ID);
  const [selectedPlayerItemId, setSelectedPlayerItemId] = useState<string | null>(DEFAULT_PLAYER_ITEM_ID);
  const [friendDetailTab, setFriendDetailTab] = useState<FriendDetailTab>("message");
  const [friendMessageDraft, setFriendMessageDraft] = useState("");
  const [profileRecordDraft, setProfileRecordDraft] = useState("");
  const [savedProfileRecord, setSavedProfileRecord] = useState("");

  const [panelStack, setPanelStack] = useState<PanelStackItem[]>(() =>
    buildInitialStack("player"),
  );
  const [panelStackVersion, setPanelStackVersion] = useState(0);
  const [transitionPhase, setTransitionPhase] = useState<TransitionPhase>("idle");
  const [pendingMain, setPendingMain] = useState<MainNavId | null>(null);
  const [surfaceFocusState, setSurfaceFocusState] = useState<SurfaceFocusState>({
    counter: 1,
    lastFocusBySurface: {},
  });
  const navSelectedId = pendingMain ?? selectedMain;
  const orderedNavItems = bringToFrontStable(MAIN_NAV_ITEMS, navSelectedId, (item) => item.id);

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
    if (transitionPhase === "resetting") {
      return;
    }
    if (nextMain === selectedMain) {
      return;
    }

    setPendingMain(nextMain);
    setTransitionPhase("resetting");
    setPanelStack([]);
  };

  const handlePanelStackExitComplete = () => {
    if (transitionPhase !== "resetting" || !pendingMain) {
      return;
    }

    const nextMain = pendingMain;
    const resetSubSelections = { ...DEFAULT_SUB_SELECTIONS };
    setSelectedMain(nextMain);
    setSelectedSubByMain(resetSubSelections);
    setSelectedEquipmentPartId(DEFAULT_EQUIPMENT_PART_ID);
    setSelectedFriendId(DEFAULT_FRIEND_ID);
    setSelectedPlayerItemId(DEFAULT_PLAYER_ITEM_ID);
    setFriendDetailTab("message");
    setFriendMessageDraft("");
    setProfileRecordDraft("");
    setSavedProfileRecord("");
    setPanelStackVersion((prev) => prev + 1);
    setPanelStack(buildInitialStack(nextMain));
    setPendingMain(null);
    setTransitionPhase("idle");
  };

  const handlePanelItemSelect = (panelIndex: number, itemId: string) => {
    if (transitionPhase !== "idle") {
      return;
    }

    const panel = panelStack[panelIndex];
    if (!panel) return;

    if (panel.kind === "menu") {
      if (!panel.context.sub) {
        const nextSubByMain = { ...selectedSubByMain, [panel.context.main]: itemId };
        const nextEquipmentPartId =
          panel.context.main === "equipment" ? null : selectedEquipmentPartId;
        const nextFriendId =
          panel.context.main === "friend" ? null : selectedFriendId;
        const nextPlayerItemId =
          panel.context.main === "player" ? null : selectedPlayerItemId;

        setSelectedSubByMain(nextSubByMain);
        if (panel.context.main === "player") {
          setSelectedPlayerItemId(null);
        }
        if (panel.context.main === "equipment") {
          setSelectedEquipmentPartId(null);
        }
        if (panel.context.main === "friend") {
          setSelectedFriendId(null);
          setFriendDetailTab("message");
        }
        setPanelStack(
          buildPanels(
            selectedMain,
            nextSubByMain,
            nextEquipmentPartId,
            nextFriendId,
            nextPlayerItemId,
          ),
        );
        return;
      }

      if (panel.context.main === "player" && panel.context.sub === "items-list") {
        setSelectedPlayerItemId(itemId);
        setPanelStack(
          buildPanels(
            selectedMain,
            selectedSubByMain,
            selectedEquipmentPartId,
            selectedFriendId,
            itemId,
          ),
        );
        return;
      }

      if (panel.context.main === "equipment" && panel.context.sub === "parts") {
        setSelectedEquipmentPartId(itemId);
        setPanelStack(
          buildPanels(
            selectedMain,
            selectedSubByMain,
            itemId,
            selectedFriendId,
            selectedPlayerItemId,
          ),
        );
      }
      return;
    }

    if (panel.kind === "friends") {
      setSelectedFriendId(itemId);
      setFriendDetailTab("message");
      setPanelStack(
        buildPanels(
          selectedMain,
          selectedSubByMain,
          selectedEquipmentPartId,
          itemId,
          selectedPlayerItemId,
        ),
      );
    }
  };

  const handleSaveProfileRecord = () => {
    setSavedProfileRecord(profileRecordDraft.trim());
  };

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
          paddingTop: UI_CONSTS.layout.pagePaddingY,
          paddingBottom: UI_CONSTS.layout.pagePaddingY,
          paddingLeft: UI_CONSTS.layout.pagePaddingX,
          paddingRight: UI_CONSTS.layout.canvasEndPaddingX,
        }}
      >
        <LeftContext
          active={selectedMain === "player"}
          isResetting={transitionPhase === "resetting"}
          onFocus={() => bringSurfaceToFront("left-context")}
          zIndex={getSurfaceZIndex("left-context", SURFACE_GROUP_BASE_Z.left)}
        />

        <div className="shrink-0" style={{ width: UI_CONSTS.layout.centerWidth }}>
          <OrbNav
            items={orderedNavItems}
            selectedId={navSelectedId}
            onSelect={handleMainSelect}
            onFocus={() => bringSurfaceToFront("orb-nav")}
            zIndex={getSurfaceZIndex("orb-nav", SURFACE_GROUP_BASE_Z.nav)}
          />
        </div>

        <div
          className="scrollbar-hide min-w-0 flex-1 overflow-x-auto"
          style={{ minWidth: UI_CONSTS.layout.rightMinWidth }}
        >
          <RightPanels
            selectedMain={selectedMain}
            panelStack={panelStack}
            panelStackKey={`${selectedMain}-${panelStackVersion}`}
            isResetting={transitionPhase === "resetting"}
            onPanelStackExitComplete={handlePanelStackExitComplete}
            onPanelFocus={(panelIndex) => bringSurfaceToFront(`panel-slot-${panelIndex}`)}
            getPanelZIndex={(panelIndex) =>
              getSurfaceZIndex(`panel-slot-${panelIndex}`, SURFACE_GROUP_BASE_Z.panels, panelIndex * 10)
            }
            onPanelItemSelect={handlePanelItemSelect}
            friendDetailTab={friendDetailTab}
            onFriendDetailTabChange={setFriendDetailTab}
            friendMessageDraft={friendMessageDraft}
            onFriendMessageDraftChange={setFriendMessageDraft}
            profileRecordDraft={profileRecordDraft}
            onProfileRecordDraftChange={setProfileRecordDraft}
            savedProfileRecord={savedProfileRecord}
            onSaveProfileRecord={handleSaveProfileRecord}
          />
        </div>
      </main>
    </div>
  );
}
