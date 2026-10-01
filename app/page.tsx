"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

import ConsumerShell from "@/widgets/consumer-shell/ConsumerShell";
import { navigateConsumer, useConsumerLocation } from "@/shared/hooks/useConsumerLocation";
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
import { bringToFrontStable } from "@/shared/lib/reorder";
import { UI_CONSTS } from "@/shared/lib/uiConsts";
import { NotificationBell } from "@/features/notification/NotificationBell";
import type { JournalDetail } from "@/shared/api/types";

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

  return panelStack;
}

export default function Home() {
  const router = useRouter();
  const location = useConsumerLocation();
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

  const selectedMain = location.main;
  const roleState = useRoles(Boolean(playerId && (selectedMain === "player" || selectedMain === "role" || selectedMain === "lifelog")));
  const [roleWorkspace, setRoleWorkspace] = useState<"persons" | "roles" | null>(null);
  const [createRequests, setCreateRequests] = useState<Record<string, number>>({});
  const [sourceJump, setSourceJump] = useState<JournalDetail | null>(null);
  const [personCreateRequest, setPersonCreateRequest] = useState(0);
  const [roleCreateRequest, setRoleCreateRequest] = useState(0);
  const [personReentryRequest, setPersonReentryRequest] = useState(0);
  const [roleReentryRequest, setRoleReentryRequest] = useState(0);
  const [subReentry, setSubReentry] = useState<Record<string, number>>({});
  const [roleDetailsHidden, setRoleDetailsHidden] = useState(false);
  const [roleEditRequest, setRoleEditRequest] = useState<{ id: number; sequence: number } | null>(null);
  const [selectedRoleId, setSelectedRoleId] = useState<number | null>(null);
  useEffect(() => { if (selectedMain !== "role") { setPersonCreateRequest(0); setRoleEditRequest(null); } }, [selectedMain]);
  const selectedSubByMain = useMemo<Record<MainNavId, string | null>>(() => ({
    ...DEFAULT_SUB_SELECTIONS,
    ...(location.main ? { [location.main]: location.sub } : {}),
  }), [location.main, location.sub]);
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
    setCreateRequests({});
    setSubReentry({});
    setSelectedRoleId(null); setRoleDetailsHidden(false);
    setRoleWorkspace(null); setRoleEditRequest(null);
  };

  const handleMainSelect = (nextMain: MainNavId) => {
    setSourceJump(null);
    if (nextMain === selectedMain) {
      navigateConsumer(null);
      clearFeatureState();
      return;
    }

    navigateConsumer(nextMain);
    clearFeatureState();
  };

  const handleRoleSelect = (roleId: number) => {
    if (selectedMain !== "role") handleMainSelect("role");
    if (selectedMain === "role" && selectedRoleId === roleId) setRoleReentryRequest((value) => value + 1);
    setRoleDetailsHidden(false); setRoleWorkspace("roles");
    setSelectedRoleId(roleId);
  };

  const submenuCaller = useRef<HTMLElement | null>(null);
  const handlePanelItemSelect = (panelIndex: number, itemId: string) => {
    const panel = panelStack[panelIndex];
    if (!panel || panel.kind !== "menu" || panel.context.route !== "main-submenu") return;

    if (itemId === "logout") {
      setLogoutAlertOpen(true);
      return;
    }

    setCreateRequests({});
    setSourceJump(null);
    submenuCaller.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    if (selectedSubByMain[panel.context.main] === itemId) setSubReentry((values) => ({ ...values, [itemId]: (values[itemId] ?? 0) + 1 }));
    navigateConsumer(panel.context.main, itemId);
  };

  const handlePanelItemCreate = (panelIndex: number, itemId: string) => {
    const panel = panelStack[panelIndex];
    if (!panel || panel.kind !== "menu" || panel.context.route !== "main-submenu") return;
    submenuCaller.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setSourceJump(null);
    navigateConsumer(panel.context.main, itemId);
    setCreateRequests((values) => ({ ...values, [itemId]: (values[itemId] ?? 0) + 1 }));
  };

  const closeFeatureSubmenu = (main: "player" | "inventory" | "market" | "lifelog") => {
    setCreateRequests({});
    setSourceJump(null);
    navigateConsumer(main);
    requestStageFocus(`${main}-stage-0`, "back");
    requestAnimationFrame(() => {
      if (submenuCaller.current?.isConnected && !submenuCaller.current.closest("[inert]")) submenuCaller.current.focus({ preventScroll: true });
    });
  };


  useStageCamera(viewportRef, workspaceRef, selectedMain ?? "home", !isLoading && isAuthenticated && Boolean(playerId) && location.open && selectedMain !== "quests");

  if (isLoading || !isAuthenticated || !playerId) return null;

  const playerSurface = selectedSubByMain.player === "growth"
    ? <GrowthShell key={`growth-${subReentry.growth ?? 0}`} onBack={() => closeFeatureSubmenu("player")} />
    : selectedSubByMain.player === "achievement"
      ? <AchievementShell key={`achievement-${subReentry.achievement ?? 0}`} onBack={() => closeFeatureSubmenu("player")} />
      : selectedSubByMain.player === "credentials"
        ? <CertificationShell key={`credentials-${subReentry.credentials ?? 0}`} createRequest={createRequests.credentials ?? 0} onBack={() => closeFeatureSubmenu("player")} />
        : selectedSubByMain.player === "title"
          ? <TitleShell key={`title-${subReentry.title ?? 0}`} onBack={() => closeFeatureSubmenu("player")} />
          : selectedSubByMain.player === "interests"
            ? <HobbyShell key={`interests-${subReentry.interests ?? 0}`} createRequest={createRequests.interests ?? 0} onBack={() => closeFeatureSubmenu("player")} />
            : null;
  const inventorySurface = selectedSubByMain.inventory === "gear"
    ? <GearShell key={`gear-${subReentry.gear ?? 0}`} onBack={() => closeFeatureSubmenu("inventory")} />
    : selectedSubByMain.inventory === "items" || selectedSubByMain.inventory === "inbox"
      ? <InventoryShell key={`${selectedSubByMain.inventory}-${subReentry[selectedSubByMain.inventory] ?? 0}`} onBack={() => closeFeatureSubmenu("inventory")} surface={selectedSubByMain.inventory} />
      : null;

  return (
    <ConsumerShell open={location.open} main={selectedMain} home={<HomeShell active={!location.open}
              onOpenJournal={() => {
                navigateConsumer("lifelog", "journal");
              }}
              onOpenAchievements={() => {
                navigateConsumer("player", "achievement");
              }}
              onOpenCurrentQuests={() => {
                navigateConsumer("quests", "current");
              }}
              onOpenRoutes={() => {
                navigateConsumer("quests", "routes");
              }}
              onOpenRole={handleRoleSelect}
            />}
      summary={selectedMain === "player" ? <LeftContext
          mode="player"
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
        /> : undefined}
      utilities={<><SocialUtilityHub /><NotificationBell /></>}
      onOpen={() => navigateConsumer(null)} onClose={() => navigateConsumer(null, null, null, false)} onMenu={() => navigateConsumer(null)}>
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
        <div className="lag-orb-column shrink-0" data-camera-layout-owner="fixed" style={{ width: UI_CONSTS.layout.centerWidth }}>
          <OrbNav
            items={orderedNavItems}
            selectedId={selectedMain}
            onSelect={handleMainSelect}
            onFocus={() => bringSurfaceToFront("orb-nav")}
            zIndex={getSurfaceZIndex("orb-nav", SURFACE_GROUP_BASE_Z.nav)}
          />
        </div>

        <div ref={workspaceRef} className="lag-workspace scrollbar-hide min-w-0 flex-1 overflow-x-auto" style={{ minWidth: UI_CONSTS.layout.rightMinWidth }}>
        <LeftContext
          mode={selectedMain === "role" ? "role" : "hidden"}
          roleWorkspace={roleWorkspace}
          onRoleWorkspaceChange={(workspace, create) => { if (workspace === "persons" && !create) setPersonReentryRequest((value) => value + 1); if (workspace === "roles") { setSelectedRoleId(null); setRoleDetailsHidden(Boolean(create)); } setRoleWorkspace(workspace); if (create) setRoleEditRequest(null); if (workspace === "persons" && create) setPersonCreateRequest((value) => value + 1); if (workspace === "roles" && create) setRoleCreateRequest((value) => value + 1); }}
          onRoleEdit={(id) => { handleRoleSelect(id); setRoleEditRequest((value) => ({ id, sequence: (value?.sequence ?? 0) + 1 })); }}
          onRoleRefresh={roleState.refresh}
          onRoleArchived={(id) => setSelectedRoleId((current) => current === id ? null : current)}
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
          {selectedMain === null ? null : selectedMain === "player" ? (
            <div className="lag-player-panels flex w-fit items-center gap-3" data-player-child={Boolean(playerSurface)}>
              <RightPanels
                selectedMain="player"
                panelStack={panelStack.slice(0, 1)}
                onPanelItemSelect={handlePanelItemSelect} onPanelItemCreate={handlePanelItemCreate}
              />
              {playerSurface}
            </div>
          ) : selectedMain === "role" ? (
            <div className="flex w-fit items-center gap-3">
              <RoleShell
                workspace={roleWorkspace}
                hideRoleDetails={roleDetailsHidden}
                personCreateRequest={personCreateRequest}
                roleCreateRequest={roleCreateRequest}
                personReentryRequest={personReentryRequest}
                rolesLoading={roleState.isLoading}
                rolesError={roleState.error}
                onRoleArchived={(id) => setSelectedRoleId((current) => current === id ? null : current)}
                onEditRole={(id) => { handleRoleSelect(id); setRoleEditRequest((value) => ({ id, sequence: (value?.sequence ?? 0) + 1 })); }}
                reentryRequest={roleReentryRequest}
                onWorkspaceBack={() => setRoleWorkspace(null)}
                editRequest={roleEditRequest}
                roles={roleState.roles}
                selectedRoleId={selectedRoleId}
                onSelectRole={(id) => { if (id === null) setSelectedRoleId(null); else handleRoleSelect(id); }}
                onRefresh={roleState.refresh}
              />
            </div>
          ) : selectedMain === "quests" ? (
            <JourneyShell initialSurface={selectedSubByMain.quests as QuestsSubId | null} navigation={{ surface: location.sub as QuestsSubId | null, detail: location.detail }} onNavigate={(sub, detail) => navigateConsumer("quests", sub, detail)} />
          ) : selectedMain === "inventory" ? (
            <div className="flex w-fit items-center gap-3">
              <RightPanels
                selectedMain="inventory"
                panelStack={panelStack.slice(0, 1)}
                onPanelItemSelect={handlePanelItemSelect} onPanelItemCreate={handlePanelItemCreate}
              />
              {inventorySurface}
            </div>
          ) : selectedMain === "market" ? (
            <div className="lag-exchange-route flex w-fit items-center gap-3">
              <RightPanels
                selectedMain="market"
                panelStack={panelStack.slice(0, 1)}
                onPanelItemSelect={handlePanelItemSelect} onPanelItemCreate={handlePanelItemCreate}
              />
              <ExchangeShell key={`market-${selectedSubByMain.market}-${subReentry[selectedSubByMain.market ?? ""] ?? 0}`}
                surface={selectedSubByMain.market as MarketSubId | null}
                playerId={playerId}
                onBack={() => closeFeatureSubmenu("market")}
              />
            </div>
          ) : selectedMain === "lifelog" && selectedSubByMain.lifelog === "journal" ? (
            <div className="flex w-fit items-center gap-3">
              <RightPanels selectedMain="lifelog" panelStack={panelStack.slice(0, 1)} onPanelItemSelect={handlePanelItemSelect} onPanelItemCreate={handlePanelItemCreate} />
              <JournalShell key={`journal-${subReentry.journal ?? 0}`} createRequest={createRequests.journal ?? 0} roles={roleState.roles} rolesLoading={roleState.isLoading} rolesError={roleState.error} onBack={() => closeFeatureSubmenu("lifelog")} onOpenSource={(detail) => { setSourceJump(detail); navigateConsumer("lifelog", detail.sourceType.toLowerCase()); }} />
            </div>
          ) : selectedMain === "lifelog" && selectedSubByMain.lifelog === "collection" ? (
            <div className="flex w-fit items-center gap-3">
              <RightPanels selectedMain="lifelog" panelStack={panelStack.slice(0, 1)} onPanelItemSelect={handlePanelItemSelect} onPanelItemCreate={handlePanelItemCreate} />
              <CollectionShell key={`collection-${subReentry.collection ?? 0}`} createRequest={createRequests.collection ?? 0} initialRecord={sourceJump?.sourceType === "COLLECTION" ? { id: sourceJump.sourceId, category: sourceJump.source.category, title: sourceJump.source.title } : undefined} onBack={() => closeFeatureSubmenu("lifelog")} />
            </div>
          ) : selectedMain === "lifelog" && selectedSubByMain.lifelog === "exercise" ? (
            <div className="flex w-fit items-center gap-3">
              <RightPanels
                selectedMain="lifelog"
                panelStack={panelStack.slice(0, 1)}
                onPanelItemSelect={handlePanelItemSelect} onPanelItemCreate={handlePanelItemCreate}
              />
              <ExerciseShell key={`exercise-${subReentry.exercise ?? 0}`} createRequest={createRequests.exercise ?? 0} initialRecord={sourceJump?.sourceType === "EXERCISE" ? { id: sourceJump.sourceId, category: sourceJump.source.category, exercisedOn: sourceJump.source.exercisedOn } : undefined} />
            </div>
          ) : selectedMain === "lifelog" && selectedSubByMain.lifelog === "media" ? (
            <div className="flex w-fit items-center gap-3">
              <RightPanels selectedMain="lifelog" panelStack={panelStack.slice(0, 1)} onPanelItemSelect={handlePanelItemSelect} onPanelItemCreate={handlePanelItemCreate} />
              <MediaShell key={`media-${subReentry.media ?? 0}`} createRequest={createRequests.media ?? 0} initialRecord={sourceJump?.sourceType === "MEDIA" ? { id: sourceJump.sourceId, category: sourceJump.source.category, title: sourceJump.source.title } : undefined} />
            </div>
          ) : selectedMain === "system" && selectedSubByMain.system === "options" ? (
            <div className="lag-settings-route flex w-fit items-center gap-3">
              <RightPanels selectedMain="system" panelStack={panelStack.slice(0, 1)} onPanelItemSelect={handlePanelItemSelect} onPanelItemCreate={handlePanelItemCreate} />
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
              onPanelItemSelect={handlePanelItemSelect} onPanelItemCreate={handlePanelItemCreate}
            />
          )}
        </div>
      </main>


      <SaoAlert
        isOpen={logoutAlertOpen}
        title="로그아웃"
        onConfirm={() => {
          setLogoutAlertOpen(false);
          logout();
          router.push("/login");
        }}
        onCancel={() => setLogoutAlertOpen(false)}
      />

    </div>
    </ConsumerShell>
  );
}
