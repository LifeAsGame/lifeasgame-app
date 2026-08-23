"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

import AmbientOverlay from "@/shared/ui/AmbientOverlay";
import ParticleBackground from "@/shared/ui/ParticleBackground";
import LeftContext from "@/widgets/left-context/LeftContext";
import OrbNav from "@/widgets/orb-nav/OrbNav";
import RightPanels from "@/widgets/right-panels/RightPanels";
import SaoAlert from "@/shared/ui/SaoAlert";
import { useAuth } from "@/features/auth/AuthContext";
import JourneyShell from "@/features/quests/JourneyShell";
import RoleShell from "@/features/role/RoleShell";
import JournalShell from "@/features/lifelog/JournalShell";
import CollectionShell from "@/features/lifelog/CollectionShell";
import ExerciseShell from "@/features/lifelog/ExerciseShell";
import MediaShell from "@/features/lifelog/MediaShell";
import InventoryShell from "@/features/inventory/InventoryShell";
import GearShell from "@/features/inventory/GearShell";
import HomeShell from "@/features/home/HomeShell";
import AchievementShell from "@/features/player/AchievementShell";
import CertificationShell from "@/features/player/CertificationShell";
import TitleShell from "@/features/player/TitleShell";
import HobbyShell from "@/features/player/HobbyShell";
import GrowthShell from "@/features/player/GrowthShell";
import ExchangeShell from "@/features/market/ExchangeShell";
import SocialUtilityHub from "@/features/social/SocialUtilityHub";
import SettingsShell from "@/features/system/settings/SettingsShell";
import { useRoles } from "@/features/role/useRoles";
import { usePanScroll } from "@/shared/hooks/usePanScroll";
import { requestStageFocus, useStageCamera } from "@/shared/hooks/useStageCamera";
import { MOCK_CHARACTER_SHEET } from "@/features/player/mock";
import {
  DEFAULT_SUB_SELECTIONS,
  MAIN_NAV_ITEMS,
  MAIN_PANEL_TITLES,
  SUBMENUS_BY_MAIN,
} from "@/entities/nav";
import type {
  FormFieldSpec,
  MainNavId,
  MarketSubId,
  PanelDataItem,
  PanelStackItem,
  QuestsSubId,
  SocialContextData,
} from "@/entities/nav";
import {
  GUILD_FORM_FIELDS,
  PARTY_FORM_FIELDS,
  SOCIAL_LISTS,
} from "@/features/social/model";
import { SKILLS_LISTS } from "@/features/skills/model";
import { SYSTEM_PANEL_ROWS } from "@/features/system/model";
import { bringToFrontStable } from "@/shared/lib/reorder";
import { UI_CONSTS } from "@/shared/lib/uiConsts";
import { useToast } from "@/context/ToastContext";
import { NotificationBell } from "@/features/notification/NotificationBell";
import { requestJoinPartyApi, requestJoinGuildApi } from "@/lib/api/endpoints/social.api";

type SurfaceFocusState = {
  counter: number;
  lastFocusBySurface: Record<string, number>;
};

type DetailSelectionKey =
  | "player"
  | "skills"
  | "social"
  | "lifelog";

const SURFACE_GROUP_BASE_Z = {
  left: 100000,
  nav: 200000,
  panels: 300000,
} as const;

function createDefaultDetailSelections(): Record<DetailSelectionKey, string | null> {
  return {
    player: null,
    skills: null,
    social: null,
    lifelog: null,
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
      actionLabel: "Create",
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
    return { panelStack, socialContext: null };
  }

  if (selectedMain === "market") {
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

  const viewportRef = useRef<HTMLDivElement>(null);
  const workspaceRef = useRef<HTMLDivElement>(null);
  const formOpenCountRef = useRef(0);
  usePanScroll(viewportRef);

  const { showToast } = useToast();
  const [logoutAlertOpen, setLogoutAlertOpen] = useState(false);

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) router.replace("/login");
    else if (!playerId) router.replace("/linkstart");
  }, [isAuthenticated, isLoading, playerId, router]);

  const [selectedMain, setSelectedMain] = useState<MainNavId | null>(null);
  const roleState = useRoles(Boolean(playerId && (selectedMain === "player" || selectedMain === "role" || selectedMain === "lifelog")));
  const [selectedRoleId, setSelectedRoleId] = useState<number | null>(null);
  const [selectedSubByMain, setSelectedSubByMain] = useState<Record<MainNavId, string | null>>({
    ...DEFAULT_SUB_SELECTIONS,
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
  // Pending action waiting for SaoAlert confirmation
  const [pendingAction, setPendingAction] = useState<{ title: string; message: string; onConfirm: () => void } | null>(null);

  const updateDetailSelections = (updates: Partial<Record<DetailSelectionKey, string | null>>) => {
    setSelectedDetailByKey((prev) => ({ ...prev, ...updates }));
  };

  const clearDetailSelectionsForMain = (main: MainNavId) => {
    if (main === "player") {
      updateDetailSelections({ player: null });
    }
    if (main === "skills") updateDetailSelections({ skills: null });
    if (main === "social") updateDetailSelections({ social: null });
    if (main === "lifelog") {
      updateDetailSelections({ lifelog: null });
    }
  };

  const { panelStack: basePanelStack, socialContext } = useMemo(
    () => selectedMain
      ? buildPanels(
        selectedMain,
        selectedSubByMain,
        selectedDetailByKey,
      )
      : { panelStack: [], socialContext: null },
    [
      selectedMain,
      selectedSubByMain,
      selectedDetailByKey,
    ],
  );

  // Append the active form after the base stack
  const panelStack = useMemo<PanelStackItem[]>(() => {
    if (activeFormPanel) return [...basePanelStack, activeFormPanel];
    return basePanelStack;
  }, [basePanelStack, activeFormPanel]);

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

  const clearFeatureState = () => {
    setSelectedSubByMain({ ...DEFAULT_SUB_SELECTIONS });
    setSelectedDetailByKey(createDefaultDetailSelections());
    setActiveFormPanel(null);
    setEditingItemId(null);
    setSelectedRoleId(null);
  };

  const handleMainSelect = (nextMain: MainNavId) => {
    if (nextMain === selectedMain) {
      setSelectedMain(null);
      clearFeatureState();
      setPendingAction(null);
      return;
    }

    setSelectedMain(nextMain);
    clearFeatureState();
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
        clearDetailSelectionsForMain(panel.context.main);
        setActiveFormPanel(null);
        setEditingItemId(null);
        return;
      }
      return;
    }

    if (panel.kind === "list") {
      const { player, skills, social } = selectedDetailByKey;

      if (panel.context.route === "player-list") {
        setActiveFormPanel(null); setEditingItemId(null);
        updateDetailSelections({ player: tog(player) });
      }
      if (panel.context.route === "skills-list") updateDetailSelections({ skills: tog(skills) });
      if (panel.context.route === "social-list") updateDetailSelections({ social: tog(social) });
    }
  };

  const closeFeatureSubmenu = (main: "player" | "inventory" | "market") => {
    setSelectedSubByMain((prev) => ({ ...prev, [main]: null }));
    clearDetailSelectionsForMain(main);
    setActiveFormPanel(null);
    setEditingItemId(null);
    requestStageFocus(`${main}-stage-0`, "center");
  };

  // ─── Form panel helpers ────────────────────────────────────────────────────

  const openForm = (
    formKey: string,
    title: string,
    fields: FormFieldSpec[],
    submitLabel?: string,
    prefillValues?: Record<string, string>,
  ) => {
    if (!selectedMain) return;
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
  };

  const handlePanelBack = (panelIndex: number) => {
    if (selectedMain === "skills" && !activeFormPanel) {
      if (panelIndex > 1) updateDetailSelections({ skills: null });
      else {
        setSelectedSubByMain((prev) => ({ ...prev, skills: null }));
        updateDetailSelections({ skills: null });
      }
      requestStageFocus(`skills-stage-${Math.max(0, panelIndex - 1)}`, "center");
      return;
    }

    const wasEditing = editingItemId !== null;
    setActiveFormPanel(null);
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

    if (panel.kind !== "list") return;
    const route = panel.context.route;
    const sub = selectedSubByMain[panel.context.main];

    if (route === "social-list" && sub === "party") {
      openForm("party-create", "Create Party", PARTY_FORM_FIELDS, "파티 생성");
    } else if (route === "social-list" && sub === "guild") {
      openForm("guild-create", "Create Guild", GUILD_FORM_FIELDS, "길드 생성");
    }
  };

  // Called from long press action buttons
  const handlePanelItemAction = (_panelIndex: number, itemId: string, actionType: string) => {
    if (!selectedMain) return;
    const sub = selectedSubByMain[selectedMain];

    if (actionType === "start") {
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
      }
    } else if (actionType === "delete") {
      setPendingAction({
        title: "삭제",
        message: "이 항목을 삭제하시겠습니까?",
        onConfirm: async () => {},
      });
    }
  };

  // Called when form panel submit is confirmed
  const handlePanelFormSubmit = () => {
    const wasEditing = editingItemId !== null;
    setActiveFormPanel(null);
    setEditingItemId(null);
    if (wasEditing) {
      if (selectedMain === "player") updateDetailSelections({ player: null });
      else if (selectedMain === "lifelog") updateDetailSelections({ lifelog: null });
    }
  };

  const leftContextMode =
    selectedMain === "player" ? "player" : selectedMain === "role" ? "role" : selectedMain === "social" ? "social" : "hidden";

  useStageCamera(viewportRef, workspaceRef, selectedMain ?? "home");

  if (isLoading || !isAuthenticated || !playerId) return null;

  const playerSurface = selectedSubByMain.player === "growth"
    ? <GrowthShell onBack={() => closeFeatureSubmenu("player")} />
    : selectedSubByMain.player === "achievement"
      ? <AchievementShell onBack={() => closeFeatureSubmenu("player")} />
      : selectedSubByMain.player === "credentials"
        ? <CertificationShell onBack={() => closeFeatureSubmenu("player")} />
        : selectedSubByMain.player === "title"
          ? <TitleShell onBack={() => closeFeatureSubmenu("player")} />
          : selectedSubByMain.player === "interests"
            ? <HobbyShell onBack={() => closeFeatureSubmenu("player")} />
            : null;
  const inventorySurface = selectedSubByMain.inventory === "gear"
    ? <GearShell onBack={() => closeFeatureSubmenu("inventory")} />
    : selectedSubByMain.inventory === "items" || selectedSubByMain.inventory === "inbox"
      ? <InventoryShell onBack={() => closeFeatureSubmenu("inventory")} surface={selectedSubByMain.inventory} />
      : null;

  return (
    <div
      ref={viewportRef}
      className="lag-app-surface h-screen overflow-auto"
    >
      <main
        className="lag-app-shell mx-auto flex w-full min-w-max items-start"
        style={{
          minHeight: "100vh",
          gap: UI_CONSTS.layout.columnGap,
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
          onRoleSelect={handleRoleSelect}
          onRoleRetry={() => void roleState.refresh()}
          onFocus={() => bringSurfaceToFront("left-context")}
          zIndex={getSurfaceZIndex("left-context", SURFACE_GROUP_BASE_Z.left)}
        />

        <div className="lag-orb-column shrink-0" style={{ width: UI_CONSTS.layout.centerWidth }}>
          <div className="lag-utility-cluster" style={{ zIndex: getSurfaceZIndex("orb-nav", SURFACE_GROUP_BASE_Z.nav) + 1 }}>
            <SocialUtilityHub />
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

        <div ref={workspaceRef} className="lag-workspace scrollbar-hide min-w-0 flex-1 overflow-x-auto" style={{ minWidth: UI_CONSTS.layout.rightMinWidth }}>
          {selectedMain === null ? (
            <HomeShell
              onOpenJournal={() => {
                handleMainSelect("lifelog");
                setSelectedSubByMain({ ...DEFAULT_SUB_SELECTIONS, lifelog: "journal" });
              }}
              onOpenAchievements={() => {
                handleMainSelect("player");
                setSelectedSubByMain({ ...DEFAULT_SUB_SELECTIONS, player: "achievement" });
              }}
              onOpenCurrentQuests={() => {
                handleMainSelect("quests");
                setSelectedSubByMain({ ...DEFAULT_SUB_SELECTIONS, quests: "current" });
              }}
              onOpenRoutes={() => {
                handleMainSelect("quests");
                setSelectedSubByMain({ ...DEFAULT_SUB_SELECTIONS, quests: "routes" });
              }}
              onOpenRole={handleRoleSelect}
            />
          ) : selectedMain === "player" ? (
            <div className="flex w-fit items-center gap-3">
              <RightPanels
                selectedMain="player"
                panelStack={panelStack.slice(0, 1)}
                onPanelItemSelect={handlePanelItemSelect}
              />
              {playerSurface}
            </div>
          ) : selectedMain === "role" ? (
            <div className="flex w-fit items-center gap-3">
              <RoleShell
                roles={roleState.roles}
                selectedRoleId={selectedRoleId}
                onSelectRole={setSelectedRoleId}
                onRefresh={roleState.refresh}
              />
            </div>
          ) : selectedMain === "quests" ? (
            <JourneyShell initialSurface={selectedSubByMain.quests as QuestsSubId | null} />
          ) : selectedMain === "inventory" ? (
            <div className="flex w-fit items-center gap-3">
              <RightPanels
                selectedMain="inventory"
                panelStack={panelStack.slice(0, 1)}
                onPanelItemSelect={handlePanelItemSelect}
              />
              {inventorySurface}
            </div>
          ) : selectedMain === "market" ? (
            <div className="lag-exchange-route flex w-fit items-center gap-3">
              <RightPanels
                selectedMain="market"
                panelStack={panelStack.slice(0, 1)}
                onPanelItemSelect={handlePanelItemSelect}
              />
              <ExchangeShell
                surface={selectedSubByMain.market as MarketSubId | null}
                playerId={playerId}
                onBack={() => closeFeatureSubmenu("market")}
              />
            </div>
          ) : selectedMain === "lifelog" && selectedSubByMain.lifelog === "journal" ? (
            <div className="flex w-fit items-center gap-3">
              <RightPanels
                selectedMain="lifelog"
                panelStack={panelStack.slice(0, 1)}
                onPanelItemSelect={handlePanelItemSelect}
              />
              <JournalShell roles={roleState.roles} rolesLoading={roleState.isLoading} rolesError={roleState.error} />
            </div>
          ) : selectedMain === "lifelog" && selectedSubByMain.lifelog === "collection" ? (
            <div className="flex w-fit items-center gap-3">
              <RightPanels
                selectedMain="lifelog"
                panelStack={panelStack.slice(0, 1)}
                onPanelItemSelect={handlePanelItemSelect}
              />
              <CollectionShell />
            </div>
          ) : selectedMain === "lifelog" && selectedSubByMain.lifelog === "exercise" ? (
            <div className="flex w-fit items-center gap-3">
              <RightPanels
                selectedMain="lifelog"
                panelStack={panelStack.slice(0, 1)}
                onPanelItemSelect={handlePanelItemSelect}
              />
              <ExerciseShell />
            </div>
          ) : selectedMain === "lifelog" && selectedSubByMain.lifelog === "media" ? (
            <div className="flex w-fit items-center gap-3">
              <RightPanels selectedMain="lifelog" panelStack={panelStack.slice(0, 1)} onPanelItemSelect={handlePanelItemSelect} />
              <MediaShell />
            </div>
          ) : selectedMain === "system" && selectedSubByMain.system === "options" ? (
            <div className="lag-settings-route flex w-fit items-center gap-3">
              <RightPanels selectedMain="system" panelStack={panelStack.slice(0, 1)} onPanelItemSelect={handlePanelItemSelect} />
              <SettingsShell />
            </div>
          ) : (
            <RightPanels
              selectedMain={selectedMain}
              panelStack={panelStack}
              onPanelFocus={(panelIndex) => bringSurfaceToFront(`panel-slot-${panelIndex}`)}
              getPanelZIndex={(panelIndex) =>
                getSurfaceZIndex(`panel-slot-${panelIndex}`, SURFACE_GROUP_BASE_Z.panels, panelIndex * 10)
              }
              onPanelItemSelect={handlePanelItemSelect}
              onPanelItemAction={handlePanelItemAction}
              onPanelFormSubmit={handlePanelFormSubmit}
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
