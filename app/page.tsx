"use client";

import { useState } from "react";

import LeftContext from "@/components/LeftContext";
import OrbNav from "@/components/OrbNav";
import RightPanels from "@/components/RightPanels";
import type { MainNavId, PanelStackItem } from "@/lib/nav";
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
import { UI_CONSTS } from "@/lib/uiConsts";

type FriendDetailTab = "message" | "profile";
type TransitionPhase = "idle" | "resetting";

const DEFAULT_EQUIPMENT_PART_ID = EQUIPMENT_PARTS[0]?.id ?? "";
const DEFAULT_FRIEND_ID: string | null = null;

const DEFAULT_SUB_SELECTIONS: Record<MainNavId, string> = {
  player: SUBMENUS_BY_MAIN.player[0].id,
  equipment: SUBMENUS_BY_MAIN.equipment[0].id,
  social: SUBMENUS_BY_MAIN.social[0].id,
  friend: SUBMENUS_BY_MAIN.friend[0].id,
  system: SUBMENUS_BY_MAIN.system[0].id,
};

function buildPanels(
  selectedMain: MainNavId,
  selectedSubByMain: Record<MainNavId, string>,
  selectedEquipmentPartId: string,
  selectedFriendId: string | null,
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
    const rows =
      selectedMainSub === "items"
        ? PLAYER_ITEMS_ROWS
        : selectedMainSub === "skills"
          ? PLAYER_SKILLS_ROWS
          : PLAYER_EQUIPMENT_ROWS;

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
      const selectedPart =
        EQUIPMENT_PARTS.find((item) => item.id === selectedEquipmentPartId) ?? EQUIPMENT_PARTS[0];

      panels.push({
        id: "equipment-parts",
        kind: "menu",
        title: "Parts",
        items: EQUIPMENT_PARTS,
        selectedId: selectedPart?.id,
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
  const selectedMainSub = mainItems[0]?.id;

  return [
    {
      id: `main-${selectedMain}`,
      kind: "menu",
      title: MAIN_PANEL_TITLES[selectedMain],
      items: mainItems,
      selectedId: selectedMainSub,
      context: { main: selectedMain },
    },
  ];
}

export default function Home() {
  const [selectedMain, setSelectedMain] = useState<MainNavId>("player");
  const [selectedSubByMain, setSelectedSubByMain] =
    useState<Record<MainNavId, string>>(DEFAULT_SUB_SELECTIONS);
  const [selectedEquipmentPartId, setSelectedEquipmentPartId] =
    useState<string>(DEFAULT_EQUIPMENT_PART_ID);
  const [selectedFriendId, setSelectedFriendId] = useState<string | null>(DEFAULT_FRIEND_ID);
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

  const handleMainSelect = (nextMain: MainNavId) => {
    if (transitionPhase === "resetting") {
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
        const nextFriendId =
          panel.context.main === "friend" ? null : selectedFriendId;

        setSelectedSubByMain(nextSubByMain);
        if (panel.context.main === "friend") {
          setSelectedFriendId(null);
          setFriendDetailTab("message");
        }
        setPanelStack(
          buildPanels(selectedMain, nextSubByMain, selectedEquipmentPartId, nextFriendId),
        );
        return;
      }

      if (panel.context.main === "equipment" && panel.context.sub === "parts") {
        setSelectedEquipmentPartId(itemId);
        setPanelStack(buildPanels(selectedMain, selectedSubByMain, itemId, selectedFriendId));
      }
      return;
    }

    if (panel.kind === "friends") {
      setSelectedFriendId(itemId);
      setFriendDetailTab("message");
      setPanelStack(buildPanels(selectedMain, selectedSubByMain, selectedEquipmentPartId, itemId));
    }
  };

  const handleSaveProfileRecord = () => {
    setSavedProfileRecord(profileRecordDraft.trim());
  };

  return (
    <div
      className="min-h-screen overflow-x-auto"
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
        <LeftContext active={selectedMain === "player"} isResetting={transitionPhase === "resetting"} />

        <div className="shrink-0" style={{ width: UI_CONSTS.layout.centerWidth }}>
          <OrbNav
            items={MAIN_NAV_ITEMS}
            selectedId={selectedMain}
            onSelect={handleMainSelect}
          />
        </div>

        <div
          className="min-w-0 flex-1 overflow-x-auto"
          style={{ minWidth: UI_CONSTS.layout.rightMinWidth }}
        >
          <RightPanels
            selectedMain={selectedMain}
            panelStack={panelStack}
            panelStackKey={`${selectedMain}-${panelStackVersion}`}
            isResetting={transitionPhase === "resetting"}
            onPanelStackExitComplete={handlePanelStackExitComplete}
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
