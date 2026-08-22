import { act, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { UserSettingsResponse } from "@/shared/api/types";
import { AuthenticatedThemeBootstrap } from "./AuthenticatedThemeBootstrap";
import { ThemeProvider, useTheme } from "./ThemeProvider";
import { THEME_STORAGE_KEY } from "./theme";

const auth = vi.hoisted(() => ({
  state: {
    currentUser: null as null | { id: number },
    session: null as null | { accessToken: string },
    isAuthenticated: false,
    isLoading: false,
  },
}));
const api = vi.hoisted(() => ({ getSettingsApi: vi.fn() }));

vi.mock("@/features/auth/AuthContext", () => ({ useAuth: () => auth.state }));
vi.mock("@/lib/api/endpoints/settings.api", () => api);

const response = (userId: number, themePreference: string): UserSettingsResponse => ({
  userId,
  volume: 70,
  uiLayoutJson: null,
  flagsJson: JSON.stringify({ themePreference }),
  updatedAt: "2026-08-22T00:00:00Z",
});

function ThemeProbe() {
  const { preference } = useTheme();
  return <output>{preference}</output>;
}

function Root() {
  return (
    <ThemeProvider>
      <AuthenticatedThemeBootstrap />
      <ThemeProbe />
    </ThemeProvider>
  );
}

describe("authenticated theme bootstrap", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    vi.stubGlobal("matchMedia", vi.fn(() => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() })));
    Object.assign(auth.state, { currentUser: null, session: null, isAuthenticated: false, isLoading: false });
  });

  it("applies a supported server preference globally after Auth is ready", async () => {
    localStorage.setItem(THEME_STORAGE_KEY, "ASTRAL");
    Object.assign(auth.state, { currentUser: { id: 7 }, session: { accessToken: "user-7" }, isAuthenticated: true });
    api.getSettingsApi.mockResolvedValue(response(7, "WARM_BEIGE"));

    render(<Root />);

    await waitFor(() => expect(screen.getByText("WARM_BEIGE")).toBeInTheDocument());
    expect(document.documentElement.dataset.theme).toBe("warm-beige");
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe("WARM_BEIGE");
  });

  it("ignores a stale previous-session response", async () => {
    let finishFirst!: (settings: UserSettingsResponse) => void;
    let finishSecond!: (settings: UserSettingsResponse) => void;
    api.getSettingsApi
      .mockReturnValueOnce(new Promise((resolve) => { finishFirst = resolve; }))
      .mockReturnValueOnce(new Promise((resolve) => { finishSecond = resolve; }));
    Object.assign(auth.state, { currentUser: { id: 1 }, session: { accessToken: "user-1" }, isAuthenticated: true });
    const { rerender } = render(<Root />);
    await waitFor(() => expect(api.getSettingsApi).toHaveBeenCalledTimes(1));

    Object.assign(auth.state, { currentUser: { id: 2 }, session: { accessToken: "user-2" } });
    rerender(<Root />);
    await waitFor(() => expect(api.getSettingsApi).toHaveBeenCalledTimes(2));
    await act(async () => { finishSecond(response(2, "ASTRAL")); });
    await waitFor(() => expect(screen.getByText("ASTRAL")).toBeInTheDocument());

    await act(async () => { finishFirst(response(1, "WARM_BEIGE")); });
    expect(screen.getByText("ASTRAL")).toBeInTheDocument();
    expect(document.documentElement.dataset.theme).toBe("astral");
  });

  it("keeps the current visual preference and local cache on logout", async () => {
    Object.assign(auth.state, { currentUser: { id: 7 }, session: { accessToken: "user-7" }, isAuthenticated: true });
    api.getSettingsApi.mockResolvedValue(response(7, "ASTRAL"));
    const { rerender } = render(<Root />);
    await waitFor(() => expect(screen.getByText("ASTRAL")).toBeInTheDocument());

    Object.assign(auth.state, { currentUser: null, session: null, isAuthenticated: false });
    rerender(<Root />);

    expect(screen.getByText("ASTRAL")).toBeInTheDocument();
    expect(document.documentElement.dataset.theme).toBe("astral");
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe("ASTRAL");
    expect(api.getSettingsApi).toHaveBeenCalledTimes(1);
  });
});
