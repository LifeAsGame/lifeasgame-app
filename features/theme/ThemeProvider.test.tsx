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

function selectorBlock(css: string, selector: string) {
  const blocks: string[] = [];
  for (const match of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    if (match[1].split(",").some((part) => part.trim() === selector)) blocks.push(match[2]);
  }
  if (blocks.length > 0) return blocks.join("\n");
  throw new Error(`Missing selector block: ${selector}`);
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
    const warm = selectorBlock(css, ':root[data-theme="warm-beige"]');
    const astral = selectorBlock(css, ':root[data-theme="astral"]');

    expect(warm).toContain("--lag-ambient: #EDE6DA;");
    expect(warm).toContain("--lag-panel: #FBF7F0;");
    expect(warm).toContain("--lag-focus: #5B9295;");
    expect(warm).not.toContain("--lag-ambient: #07111F;");
    expect(astral).toContain("--lag-ambient: #07111F;");
    expect(astral).toContain("--lag-panel: #162337;");
    expect(astral).toContain("--lag-focus: #54D4DE;");
    expect(astral).not.toContain("--lag-ambient: #EDE6DA;");
    expect(css).not.toContain('data-theme="beige"');
    expect(css).not.toContain('data-theme="warm_beige"');
  });

  it("derives stronger controls from the approved palette while keeping meta text readable", () => {
    const css = readFileSync("app/globals.css", "utf8");

    expect(css).toContain("--lag-control-bg: color-mix(in srgb, var(--lag-panel-2) 76%, var(--lag-border));");
    expect(css).toContain("--lag-control-border: color-mix(in srgb, var(--lag-border) 76%, var(--lag-text));");
    expect(selectorBlock(css, ".lag-button-secondary")).toContain("background-color: var(--lag-control-bg)");
    expect(selectorBlock(css, ".lag-text-meta")).toContain("color: var(--lag-text-2)");
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
