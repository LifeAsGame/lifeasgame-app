import type { ReactNode } from "react";

import { GRID_OVERLAY_STYLE, PANEL_STYLE, SAO } from "@/shared/design/tokens";

export default function EntryPanel({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <div
      className="flex min-h-screen items-center justify-center px-4 py-10"
      style={{
        background: `radial-gradient(circle at 18% 20%, rgba(82,127,214,0.12), transparent 42%), radial-gradient(circle at 80% 18%, rgba(247,191,78,0.06), transparent 36%), linear-gradient(180deg, ${SAO.color.bg.page} 0%, #090b10 38%, ${SAO.color.bg.dark} 100%)`,
      }}
    >
      <section
        className="relative w-full max-w-md overflow-hidden"
        style={{ ...PANEL_STYLE, boxShadow: `${SAO.shadow.panelInset}, 0 24px 56px rgba(0,0,0,0.4)` }}
      >
        <div style={GRID_OVERLAY_STYLE} />
        <div className="relative z-10 px-9 py-10">
          <header className="mb-8 text-center">
            <h1 className="font-semibold uppercase" style={{ fontSize: 22, letterSpacing: "0.18em", color: SAO.color.text.primary }}>
              {title}
            </h1>
            <div className="mx-auto mt-2 h-0.5 w-44" style={{ background: `linear-gradient(90deg, transparent, ${SAO.color.border.gold}, transparent)` }} />
            <p className="mt-3 uppercase" style={{ fontSize: 11, letterSpacing: "0.26em", color: SAO.color.text.label }}>
              {subtitle}
            </p>
          </header>
          {children}
        </div>
      </section>
    </div>
  );
}
