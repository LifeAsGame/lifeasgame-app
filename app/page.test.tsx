import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { useState } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { MainNavId, PanelStackItem } from "@/entities/nav";
import type { RoleDetail } from "@/shared/api/types";
import Home from "./page";

const router = vi.hoisted(() => ({ push: vi.fn(), replace: vi.fn() }));
const auth = vi.hoisted(() => ({ state: { isAuthenticated: true, playerId: 7 as number | null, isLoading: false, logout: vi.fn() } }));
const roles = vi.hoisted((): RoleDetail[] => [
  { id: 1, roleType: "PROFESSIONAL", name: "Backend Engineer", description: "Build systems", status: "ACTIVE", createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z", version: 0 },
]);
const roleHook = vi.hoisted(() => ({ useRoles: vi.fn(() => ({ roles, isLoading: false, error: null, refresh: vi.fn() })) }));
const growthApi = vi.hoisted(() => ({ getPlayerGrowthApi: vi.fn() }));

vi.mock("next/navigation", () => ({ useRouter: () => router }));
vi.mock("@/features/auth/AuthContext", () => ({ useAuth: () => auth.state }));
vi.mock("@/features/role/useRoles", () => roleHook);
vi.mock("@/features/player/api", () => growthApi);
vi.mock("@/context/ToastContext", () => ({ useToast: () => ({ showToast: vi.fn() }) }));
vi.mock("@/shared/hooks/usePanScroll", () => ({ usePanScroll: vi.fn() }));
vi.mock("@/widgets/left-context/LeftContext", () => ({ default: () => null }));
vi.mock("@/widgets/orb-nav/OrbNav", () => ({
  default: ({ items, selectedId, onSelect }: { items: Array<{ id: MainNavId; label: string }>; selectedId: MainNavId | null; onSelect: (id: MainNavId) => void }) => (
    <nav>{items.map((item) => <button key={item.id} type="button" aria-pressed={selectedId === item.id} onClick={() => onSelect(item.id)}>{item.label}</button>)}</nav>
  ),
}));
vi.mock("@/widgets/right-panels/RightPanels", () => ({
  default: ({ panelStack, onPanelItemSelect }: { panelStack: PanelStackItem[]; onPanelItemSelect: (panelIndex: number, itemId: string) => void }) => (
    <div data-testid="right-panels">
      {panelStack.map((panel, panelIndex) => panel.kind === "menu" || panel.kind === "list"
        ? panel.items.map((item) => <button key={`${panel.id}-${item.id}`} type="button" onClick={() => onPanelItemSelect(panelIndex, item.id)}>{item.label}</button>)
        : null)}
    </div>
  ),
}));
vi.mock("@/features/lifelog/JournalShell", () => ({ default: ({ roles: roleOptions }: { roles: RoleDetail[] }) => <div data-testid="journal-shell">Journal · {roleOptions.map(({ name }) => name).join(", ")}</div> }));
vi.mock("@/features/lifelog/CollectionShell", () => ({ default: () => <div data-testid="collection-shell">Collection Shell</div> }));
vi.mock("@/features/lifelog/ExerciseShell", () => ({ default: () => <div data-testid="exercise-shell">Exercise Shell</div> }));
vi.mock("@/features/lifelog/MediaShell", () => ({ default: () => <div data-testid="media-shell">Media Shell</div> }));
vi.mock("@/features/player/AchievementShell", () => ({ default: () => <div data-testid="achievement-shell">Achievement Shell</div> }));
vi.mock("@/features/player/CertificationShell", () => ({ default: () => <div data-testid="certification-shell">Certification Shell</div> }));
vi.mock("@/features/player/TitleShell", () => ({
  default: function MockTitleShell() {
    const [detail, setDetail] = useState(false);
    return <div data-testid="title-shell">Title Shell<button type="button" onClick={() => setDetail(true)}>Select Mock Title</button>{detail ? <span>Mock Title Detail</span> : null}</div>;
  },
}));
vi.mock("@/features/player/HobbyShell", () => ({ default: () => <div data-testid="hobby-shell">Hobby Shell</div> }));
vi.mock("@/features/inventory/InventoryShell", () => ({ default: ({ surface }: { surface: string }) => <div data-testid="inventory-shell">Inventory · {surface}</div> }));
vi.mock("@/features/inventory/GearShell", () => ({ default: () => <div data-testid="gear-shell">Gear Shell</div> }));
vi.mock("@/features/home/HomeShell", () => ({
  default: ({ onOpenJournal, onOpenAchievements, onOpenCurrentQuests, onOpenRoutes, onOpenRole }: {
    onOpenJournal: () => void;
    onOpenAchievements: () => void;
    onOpenCurrentQuests: () => void;
    onOpenRoutes: () => void;
    onOpenRole: (roleId: number) => void;
  }) => (
    <div data-testid="home-shell">
      <button type="button" onClick={onOpenJournal}>Home Journal</button>
      <button type="button" onClick={onOpenAchievements}>Home Achievement</button>
      <button type="button" onClick={onOpenCurrentQuests}>Home Quest</button>
      <button type="button" onClick={onOpenRoutes}>Home Route</button>
      <button type="button" onClick={() => onOpenRole(1)}>Home Role</button>
    </div>
  ),
}));
vi.mock("@/features/role/RoleShell", () => ({ default: ({ selectedRoleId }: { selectedRoleId: number | null }) => <div data-testid="role-shell">Role Shell · {selectedRoleId}</div> }));
vi.mock("@/features/quests/JourneyShell", () => ({ default: ({ initialSurface }: { initialSurface?: string }) => <div data-testid="journey-shell">Journey Shell · {initialSurface}</div> }));
vi.mock("@/shared/ui/ParticleBackground", () => ({ default: () => null }));
vi.mock("@/shared/ui/AmbientOverlay", () => ({ default: () => null }));
vi.mock("@/shared/ui/SaoAlert", () => ({ default: () => null }));
vi.mock("@/features/notification/NotificationBell", () => ({ NotificationBell: () => null }));
vi.mock("@/features/social/SocialUtilityHub", () => ({ default: () => <div data-testid="social-utility" /> }));
vi.mock("@/features/system/settings/SettingsShell", () => ({ default: () => <div data-testid="settings-shell">Canonical Settings</div> }));

describe("Home shell에서 feature surface를 routing할 때", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    auth.state = { isAuthenticated: true, playerId: 7, isLoading: false, logout: vi.fn() };
    vi.stubGlobal("requestAnimationFrame", () => 1);
    growthApi.getPlayerGrowthApi.mockResolvedValue({
      current: { level: 8, exp: 842, str: 12, agi: 11, dex: 10, intel: 9, vit: 8, luc: 7, extraStats: {}, representativeTitleId: null },
      recentExpChanges: [
        { changeId: 2, requestedExp: 100, appliedExp: 80, leftoverExp: 20, beforeLevel: 7, afterLevel: 8, beforeTotalExp: 762, afterTotalExp: 842, occurredAt: "2026-08-14T09:00:00Z", sourceType: "QUEST", sourceId: 31 },
        { changeId: 1, requestedExp: 10, appliedExp: 10, leftoverExp: 0, beforeLevel: 7, afterLevel: 7, beforeTotalExp: 752, afterTotalExp: 762, occurredAt: "2026-08-13T09:00:00Z", sourceType: null, sourceId: 999 },
      ],
    });
  });

  it("utility와 responsive stage geometry를 shared layout/camera contract로 묶는다", () => {
    const page = readFileSync("app/page.tsx", "utf8");
    const css = readFileSync("app/globals.css", "utf8");

    expect(page).toContain("useStageCamera(viewportRef, workspaceRef");
    expect(page).not.toContain("right: -14");
    expect(css).toContain(".lag-panel-rail");
    expect(css).toContain("flex: 0 0 auto");
    expect(css).toContain("width: clamp(280px, calc(100vw - 32px), 344px)");
    expect(css).toContain("text-overflow: ellipsis");
    expect(css).toMatch(/\.lag-left-anchor,[\s\S]*\.lag-orb-column\s*{[^}]*position:\s*sticky;[^}]*top:\s*50svh;/);
    expect(page).toContain('className="lag-app-shell mx-auto flex w-full min-w-max items-start"');
  });

  describe("인증된 player가 처음 진입하면", () => {
    it("Home을 표시하고 Home Orb나 active Orb를 만들지 않으며 Role API도 기다리게 한다", () => {
      render(<Home />);

      expect(screen.getByTestId("home-shell")).toBeInTheDocument();
      expect(screen.getByTestId("social-utility")).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /^Home$/ })).not.toBeInTheDocument();
      expect(screen.getAllByRole("button", { pressed: false })).toHaveLength(8);
      expect(roleHook.useRoles).toHaveBeenCalledWith(false);
    });
  });

  describe("main Orb를 선택하면", () => {
    it("feature를 열고 active Orb를 다시 누르면 Home으로 돌아간다", () => {
      render(<Home />);

      fireEvent.click(screen.getByRole("button", { name: "Player" }));
      expect(screen.queryByTestId("home-shell")).not.toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Player" })).toHaveAttribute("aria-pressed", "true");

      fireEvent.click(screen.getByRole("button", { name: "Player" }));
      expect(screen.getByTestId("home-shell")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Player" })).toHaveAttribute("aria-pressed", "false");
    });
  });

  describe("Home card에서 canonical surface를 열면", () => {
    it("Journal, Quest, Route, Achievement, Role state만 orchestration한다", () => {
      const { unmount } = render(<Home />);
      fireEvent.click(screen.getByRole("button", { name: "Home Journal" }));
      expect(screen.getByTestId("journal-shell")).toBeInTheDocument();
      unmount();

      const quest = render(<Home />);
      fireEvent.click(screen.getByRole("button", { name: "Home Quest" }));
      expect(screen.getByTestId("journey-shell")).toHaveTextContent("current");
      quest.unmount();

      const route = render(<Home />);
      fireEvent.click(screen.getByRole("button", { name: "Home Route" }));
      expect(screen.getByTestId("journey-shell")).toHaveTextContent("routes");
      route.unmount();

      const achievement = render(<Home />);
      fireEvent.click(screen.getByRole("button", { name: "Home Achievement" }));
      expect(screen.getByRole("button", { name: "Achievement" })).toBeInTheDocument();
      expect(screen.getByTestId("achievement-shell")).toBeInTheDocument();
      achievement.unmount();

      render(<Home />);
      fireEvent.click(screen.getByRole("button", { name: "Home Role" }));
      expect(screen.getByTestId("role-shell")).toHaveTextContent("Role Shell · 1");
    });
  });

  describe("인증된 player가 Journal을 선택하면", () => {
    it("기존 LifeLog submenu를 유지한 채 feature-owned JournalShell과 Role options를 연결한다", () => {
      render(<Home />);

      fireEvent.click(screen.getByRole("button", { name: "Lifelog" }));
      fireEvent.click(screen.getByRole("button", { name: "Journal" }));

      expect(screen.getByTestId("journal-shell")).toHaveTextContent("Backend Engineer");
      expect(screen.getByRole("button", { name: "Collection" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Media" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Exercise" })).toBeInTheDocument();

      fireEvent.click(screen.getByRole("button", { name: "Collection" }));
      expect(screen.queryByTestId("journal-shell")).not.toBeInTheDocument();
      expect(screen.getByTestId("collection-shell")).toBeInTheDocument();

      fireEvent.click(screen.getByRole("button", { name: "Media" }));
      expect(screen.queryByTestId("collection-shell")).not.toBeInTheDocument();
      expect(screen.getByTestId("media-shell")).toBeInTheDocument();

      fireEvent.click(screen.getByRole("button", { name: "Exercise" }));
      expect(screen.queryByTestId("collection-shell")).not.toBeInTheDocument();
      expect(screen.getByTestId("exercise-shell")).toBeInTheDocument();
    });

    it("Role과 Journey feature shell routing을 그대로 유지한다", () => {
      render(<Home />);

      fireEvent.click(screen.getByRole("button", { name: "Role" }));
      expect(screen.getByTestId("role-shell")).toBeInTheDocument();
      fireEvent.click(screen.getByRole("button", { name: "Journey" }));
      expect(screen.getByTestId("journey-shell")).toBeInTheDocument();
    });
  });

  describe("인증된 player가 Credentials를 선택하면", () => {
    it("generic static panels 대신 feature-owned CertificationShell로 routing한다", () => {
      render(<Home />);

      fireEvent.click(screen.getByRole("button", { name: "Player" }));
      fireEvent.click(screen.getByRole("button", { name: "Credentials" }));

      expect(screen.getByTestId("certification-shell")).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "Cloud" })).not.toBeInTheDocument();
    });
  });

  describe("인증된 player가 Growth를 선택하면", () => {
    it("첫 Player submenu에서 backend-owned overview와 ordered history를 렌더한다", async () => {
      render(<Home />);
      fireEvent.click(screen.getByRole("button", { name: "Player" }));

      const submenu = screen.getByTestId("right-panels").querySelectorAll("button");
      expect([...submenu].map((button) => button.textContent)).toEqual(["Growth", "Achievement", "Credentials", "Title", "Interests"]);
      fireEvent.click(screen.getByRole("button", { name: "Growth" }));

      expect(await screen.findByTestId("growth-shell")).toBeInTheDocument();
      expect(screen.getByText("Level: 8")).toBeInTheDocument();
      expect(screen.getByText("EXP: 842")).toBeInTheDocument();
      expect(screen.getByText("No extra stats.")).toBeInTheDocument();
      expect(screen.getByText("Requested EXP: 100")).toBeInTheDocument();
      expect(screen.getByText("Applied EXP: 80")).toBeInTheDocument();
      expect(screen.getByText("Leftover EXP: 20")).toBeInTheDocument();
      expect(screen.getByText("Source Type: QUEST")).toBeInTheDocument();
      expect(screen.getByText("Source ID: 31")).toBeInTheDocument();
      expect(screen.getByText("Source unavailable.")).toBeInTheDocument();
      expect(screen.queryByText("Source ID: 999")).not.toBeInTheDocument();
      expect(screen.queryByText(/next level|percentage|remaining exp|radar/i)).not.toBeInTheDocument();
      expect(growthApi.getPlayerGrowthApi).toHaveBeenCalledTimes(1);
    });
  });

  describe("인증된 player가 Title을 선택하면", () => {
    it("generic static panels 대신 feature-owned TitleShell로 routing한다", () => {
      render(<Home />);

      fireEvent.click(screen.getByRole("button", { name: "Player" }));
      fireEvent.click(screen.getByRole("button", { name: "Title" }));

      expect(screen.getByTestId("title-shell")).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "Combat" })).not.toBeInTheDocument();
    });

    it("다른 Player submenu로 전환했다 돌아오면 이전 detail state를 복원하지 않는다", () => {
      render(<Home />);

      fireEvent.click(screen.getByRole("button", { name: "Player" }));
      fireEvent.click(screen.getByRole("button", { name: "Title" }));
      fireEvent.click(screen.getByRole("button", { name: "Select Mock Title" }));
      expect(screen.getByText("Mock Title Detail")).toBeInTheDocument();

      fireEvent.click(screen.getByRole("button", { name: "Growth" }));
      fireEvent.click(screen.getByRole("button", { name: "Title" }));
      expect(screen.queryByText("Mock Title Detail")).not.toBeInTheDocument();
    });
  });

  describe("인증된 player가 Interests를 선택하면", () => {
    it("generic static panels 대신 feature-owned HobbyShell로 routing한다", () => {
      render(<Home />);
      fireEvent.click(screen.getByRole("button", { name: "Player" }));
      fireEvent.click(screen.getByRole("button", { name: "Interests" }));
      expect(screen.getByTestId("hobby-shell")).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "Tech" })).not.toBeInTheDocument();
    });
  });

  describe("인증된 player가 Inventory를 선택하면", () => {
    it("Items와 Inbox는 feature-owned shell에 연결하고 기존 Gear route는 유지한다", () => {
      render(<Home />);

      fireEvent.click(screen.getByRole("button", { name: "Inventory" }));
      fireEvent.click(screen.getByRole("button", { name: "Items" }));
      expect(screen.getByTestId("inventory-shell")).toHaveTextContent("Inventory · items");

      fireEvent.click(screen.getByRole("button", { name: "Inbox" }));
      expect(screen.getByTestId("inventory-shell")).toHaveTextContent("Inventory · inbox");

      fireEvent.click(screen.getByRole("button", { name: "Gear" }));
      expect(screen.queryByTestId("inventory-shell")).not.toBeInTheDocument();
      expect(screen.getByTestId("gear-shell")).toBeInTheDocument();
    });
  });

  describe("인증된 user가 System Options를 선택하면", () => {
    it("page-owned form 대신 feature-owned Settings shell로 routing한다", () => {
      render(<Home />);
      fireEvent.click(screen.getByRole("button", { name: "System" }));
      fireEvent.click(screen.getByRole("button", { name: "Options" }));

      expect(screen.getByTestId("settings-shell")).toHaveTextContent("Canonical Settings");
    });

    it("mobile CSS가 parent System stage를 삭제하지 않는다", () => {
      const css = readFileSync("app/globals.css", "utf8");
      expect(css).not.toMatch(/\.lag-settings-route\s*>\s*:first-child\s*{[\s\S]*?display:\s*none/);
      expect(css).toContain("width: max-content !important");
    });
  });

  describe("auth 또는 onboarding guard가 충족되지 않으면", () => {
    it("login과 linkstart redirect를 기존대로 수행하고 app shell을 숨긴다", async () => {
      auth.state = { isAuthenticated: false, playerId: null, isLoading: false, logout: vi.fn() };
      const { unmount } = render(<Home />);
      await waitFor(() => expect(router.replace).toHaveBeenCalledWith("/login"));
      expect(screen.queryByTestId("journal-shell")).not.toBeInTheDocument();
      unmount();

      auth.state = { isAuthenticated: true, playerId: null, isLoading: false, logout: vi.fn() };
      render(<Home />);
      await waitFor(() => expect(router.replace).toHaveBeenCalledWith("/linkstart"));
      expect(screen.queryByTestId("journal-shell")).not.toBeInTheDocument();
    });
  });
});
