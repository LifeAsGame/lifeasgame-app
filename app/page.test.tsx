import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { MainNavId, PanelStackItem } from "@/entities/nav";
import type { RoleDetail } from "@/shared/api/types";
import Home from "./page";

const router = vi.hoisted(() => ({ push: vi.fn(), replace: vi.fn() }));
const auth = vi.hoisted(() => ({ state: { isAuthenticated: true, playerId: 7 as number | null, isLoading: false, logout: vi.fn() } }));
const roles = vi.hoisted((): RoleDetail[] => [
  { id: 1, roleType: "PROFESSIONAL", name: "Backend Engineer", description: "Build systems", status: "ACTIVE", createdAt: "2026-01-01T00:00:00Z", updatedAt: "2026-01-01T00:00:00Z", version: 0 },
]);

vi.mock("next/navigation", () => ({ useRouter: () => router }));
vi.mock("@/features/auth/AuthContext", () => ({ useAuth: () => auth.state }));
vi.mock("@/features/role/useRoles", () => ({ useRoles: () => ({ roles, isLoading: false, error: null, refresh: vi.fn() }) }));
vi.mock("@/context/ToastContext", () => ({ useToast: () => ({ showToast: vi.fn() }) }));
vi.mock("@/shared/hooks/usePanScroll", () => ({ usePanScroll: vi.fn() }));
vi.mock("@/lib/api/endpoints/equipment.api", () => ({ getEquippedGearApi: vi.fn().mockResolvedValue([]), equipGearApi: vi.fn(), unequipGearApi: vi.fn() }));
vi.mock("@/widgets/left-context/LeftContext", () => ({ default: () => null }));
vi.mock("@/widgets/orb-nav/OrbNav", () => ({
  default: ({ items, onSelect }: { items: Array<{ id: MainNavId; label: string }>; onSelect: (id: MainNavId) => void }) => (
    <nav>{items.map((item) => <button key={item.id} type="button" onClick={() => onSelect(item.id)}>{item.label}</button>)}</nav>
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
vi.mock("@/features/inventory/InventoryShell", () => ({ default: ({ surface }: { surface: string }) => <div data-testid="inventory-shell">Inventory · {surface}</div> }));
vi.mock("@/features/role/RoleShell", () => ({ default: () => <div data-testid="role-shell">Role Shell</div> }));
vi.mock("@/features/quests/JourneyShell", () => ({ default: () => <div data-testid="journey-shell">Journey Shell</div> }));
vi.mock("@/shared/ui/ParticleBackground", () => ({ default: () => null }));
vi.mock("@/shared/ui/AmbientOverlay", () => ({ default: () => null }));
vi.mock("@/shared/ui/SaoAlert", () => ({ default: () => null }));
vi.mock("@/shared/ui/NotificationBell", () => ({ NotificationBell: () => null }));

describe("Home shell에서 feature surface를 routing할 때", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    auth.state = { isAuthenticated: true, playerId: 7, isLoading: false, logout: vi.fn() };
    vi.stubGlobal("requestAnimationFrame", () => 1);
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
      expect(screen.getByRole("button", { name: "Figure" })).toBeInTheDocument();
    });

    it("Role과 Journey feature shell routing을 그대로 유지한다", () => {
      render(<Home />);

      fireEvent.click(screen.getByRole("button", { name: "Role" }));
      expect(screen.getByTestId("role-shell")).toBeInTheDocument();
      fireEvent.click(screen.getByRole("button", { name: "Journey" }));
      expect(screen.getByTestId("journey-shell")).toBeInTheDocument();
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
      expect(screen.getByRole("button", { name: "Weapon" })).toBeInTheDocument();
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
