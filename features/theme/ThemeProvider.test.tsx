import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { useState } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ThemeProvider, useTheme } from "./ThemeProvider";
import { DEFAULT_THEME_PREFERENCE, THEME_STORAGE_KEY, readStoredThemePreference, resolveTheme } from "./theme";

let dark = false;
const listeners = new Set<() => void>();
const media = {
  get matches() { return dark; },
  media: "(prefers-color-scheme: dark)",
  onchange: null,
  addEventListener: (_type: string, listener: () => void) => listeners.add(listener),
  removeEventListener: (_type: string, listener: () => void) => listeners.delete(listener),
  addListener: () => {},
  removeListener: () => {},
  dispatchEvent: () => true,
};

function Harness() {
  const theme = useTheme();
  const [draft, setDraft] = useState("kept");
  return (
    <div>
      <output>{theme.preference}:{theme.effectiveTheme}</output>
      <input aria-label="Representative draft" value={draft} onChange={(event) => setDraft(event.target.value)} />
      <button type="button" onClick={() => theme.setPreference("SYSTEM")}>System</button>
      <button type="button" onClick={() => theme.setPreference("ASTRAL")}>Astral</button>
      <button type="button" onClick={() => theme.setPreference("WARM_BEIGE")}>Warm Beige</button>
    </div>
  );
}

describe("dual theme runtime", () => {
  beforeEach(() => {
    dark = false;
    listeners.clear();
    localStorage.clear();
    delete document.documentElement.dataset.theme;
    vi.stubGlobal("matchMedia", vi.fn(() => media));
  });

  it("resolves defaults, SYSTEM, explicit, and unknown preferences safely", () => {
    expect(DEFAULT_THEME_PREFERENCE).toBe("WARM_BEIGE");
    expect(resolveTheme(undefined)).toBe("warm-beige");
    expect(resolveTheme("SYSTEM", false)).toBe("warm-beige");
    expect(resolveTheme("SYSTEM", true)).toBe("astral");
    expect(resolveTheme("ASTRAL", false)).toBe("astral");
    expect(resolveTheme("WARM_BEIGE", true)).toBe("warm-beige");
    expect(resolveTheme("FUTURE_THEME", true)).toBe("warm-beige");
    expect(readStoredThemePreference({ getItem: () => "FUTURE_THEME" })).toBe("WARM_BEIGE");
  });

  it("exposes the approved representative tokens on the existing runtime selectors", () => {
    const css = readFileSync("app/globals.css", "utf8");

    expect(css).toContain(':root[data-theme="warm-beige"]');
    expect(css).toContain("--lag-ambient: #EDE6DA;");
    expect(css).toContain("--lag-panel: #FBF7F0;");
    expect(css).toContain("--lag-focus: #5B9295;");
    expect(css).toContain(':root[data-theme="astral"]');
    expect(css).toContain("--lag-ambient: #07111F;");
    expect(css).toContain("--lag-panel: #162337;");
    expect(css).toContain("--lag-focus: #54D4DE;");
    expect(css).not.toContain('data-theme="beige"');
    expect(css).not.toContain('data-theme="warm_beige"');
  });

  it("bootstraps local preference, follows OS only for SYSTEM, persists, and never remounts child state", async () => {
    dark = true;
    localStorage.setItem(THEME_STORAGE_KEY, "SYSTEM");
    render(<ThemeProvider><Harness /></ThemeProvider>);

    await waitFor(() => expect(screen.getByText("SYSTEM:astral")).toBeInTheDocument());
    expect(document.documentElement.dataset.theme).toBe("astral");
    fireEvent.change(screen.getByRole("textbox", { name: "Representative draft" }), { target: { value: "still here" } });

    dark = false;
    act(() => listeners.forEach((listener) => listener()));
    await waitFor(() => expect(screen.getByText("SYSTEM:warm-beige")).toBeInTheDocument());

    fireEvent.click(screen.getByRole("button", { name: "Astral" }));
    expect(document.documentElement.dataset.theme).toBe("astral");
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe("ASTRAL");
    dark = false;
    act(() => listeners.forEach((listener) => listener()));
    expect(document.documentElement.dataset.theme).toBe("astral");
    expect(screen.getByRole("textbox", { name: "Representative draft" })).toHaveValue("still here");
  });

  it("falls back safely when obtaining localStorage throws", () => {
    const storage = vi.spyOn(window, "localStorage", "get").mockImplementation(() => {
      throw new Error("storage unavailable");
    });

    try {
      render(<ThemeProvider><Harness /></ThemeProvider>);
      expect(screen.getByText("WARM_BEIGE:warm-beige")).toBeInTheDocument();
      expect(document.documentElement.dataset.theme).toBe("warm-beige");
    } finally {
      storage.mockRestore();
    }
  });
});
