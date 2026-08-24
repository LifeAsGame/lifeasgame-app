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
import { usePlayerContext } from "@/features/player/usePlayerContext";
import ExchangeShell from "@/features/market/ExchangeShell";
import SocialUtilityHub from "@/features/social/SocialUtilityHub";
import SettingsShell from "@/features/system/settings/SettingsShell";
import { useRoles } from "@/features/role/useRoles";
import { usePanScroll } from "@/shared/hooks/usePanScroll";
import { requestStageFocus, useStageCamera } from "@/shared/hooks/useStageCamera";
import {
  DEFAULT_SUB_SELECTIONS,
  MAIN_NAV_ITEMS,
  MAIN_PANEL_TITLES,
  SUBMENUS_BY_MAIN,
} from "@/entities/nav";
import type { MainNavId, MarketSubId, PanelStackItem, QuestsSubId } from "@/entities/nav";
import { SYSTEM_PANEL_ROWS } from "@/features/system/model";
import { bringToFrontStable } from "@/shared/lib/reorder";
import { UI_CONSTS } from "@/shared/lib/uiConsts";
import { NotificationBell } from "@/features/notification/NotificationBell";

type SurfaceFocusState = {
  counter: number;
  lastFocusBySurface: Record<string, number>;
};

const SURFACE_GROUP_BASE_Z = {
  left: 100000,
  nav: 200000,
  panels: 300000,
} as const;

function selectedSubForMain(selectedMain: MainNavId, selectedSubByMain: Record<MainNavId, string | null>) {
  const items = SUBMENUS_BY_MAIN[selectedMain];
  const selectedSub = selectedSubByMain[selectedMain];
  if (!selectedSub) return null;
  return items.find((item) => item.id === selectedSub)?.id ?? null;
}

function buildPanels(
  selectedMain: MainNavId,
  selectedSubByMain: Record<MainNavId, string | null>,
): PanelStackItem[] {
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
    return panelStack;
  }

  const systemPanel = SYSTEM_PANEL_ROWS[selectedMainSub as keyof typeof SYSTEM_PANEL_ROWS];

  if (selectedMain === "system" && selectedMainSub === "help" && systemPanel) {
    panelStack.push({
      id: "system-help",
      kind: "placeholder",
      title: "Help",
      description: systemPanel.description,
      rows: systemPanel.rows,
    });
  }

  return panelStack;
}

export default function Home() {
  const router = useRouter();
  const { isAuthenticated, playerId, isLoading, logout } = useAuth();

  const viewportRef = useRef<HTMLDivElement>(null);
  const workspaceRef = useRef<HTMLDivElement>(null);
  usePanScroll(viewportRef);

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
  const playerContext = usePlayerContext(Boolean(playerId && selectedMain === "player"));
  const [surfaceFocusState, setSurfaceFocusState] = useState<SurfaceFocusState>({
    counter: 1,
    lastFocusBySurface: {},
  });

  const panelStack = useMemo(
    () => selectedMain ? buildPanels(selectedMain, selectedSubByMain) : [],
    [selectedMain, selectedSubByMain],
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

  const clearFeatureState = () => {
    setSelectedSubByMain({ ...DEFAULT_SUB_SELECTIONS });
    setSelectedRoleId(null);
  };

  const handleMainSelect = (nextMain: MainNavId) => {
    if (nextMain === selectedMain) {
      setSelectedMain(null);
      clearFeatureState();
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
    if (!panel || panel.kind !== "menu" || panel.context.route !== "main-submenu") return;

    if (itemId === "logout") {
      setLogoutAlertOpen(true);
      return;
    }

    setSelectedSubByMain((prev) => ({
      ...prev,
      [panel.context.main]: prev[panel.context.main] === itemId ? null : itemId,
    }));
  };

  const closeFeatureSubmenu = (main: "player" | "inventory" | "market") => {
    setSelectedSubByMain((prev) => ({ ...prev, [main]: null }));
    requestStageFocus(`${main}-stage-0`, "back");
  };

  const leftContextMode = selectedMain === "player" ? "player" : selectedMain === "role" ? "role" : "hidden";

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
          playerInfo={playerContext.data?.player}
          equipments={playerContext.data?.equipments}
          playerLoading={playerContext.loading}
          playerError={playerContext.error}
          roles={roleState.roles}
          rolesLoading={roleState.isLoading}
          rolesError={roleState.error}
          selectedRoleId={selectedRoleId}
          onPlayerRetry={() => void playerContext.reload()}
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

    </div>
  );
}
