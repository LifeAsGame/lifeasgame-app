"use client";

import { SAO } from "@/shared/design/tokens";
import { cellStyle, D } from "./styles";

export function GoldRow({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="relative flex min-h-10 items-center overflow-hidden rounded-sm px-3 py-2"
      style={cellStyle}
    >
      <div
        className="absolute inset-y-0 left-0"
        style={{ width: "2px", background: SAO.color.action.gold }}
      />
      <span className="break-words pl-2 text-sm" style={{ letterSpacing: "0.06em", color: D.text }}>
        {children}
      </span>
    </div>
  );
}

export function InfoCard({ label, children }: { label?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-sm px-4 py-3" style={cellStyle}>
      {label ? (
        <p className="uppercase" style={{ fontSize: "10px", letterSpacing: "0.2em", color: D.label }}>
          {label}
        </p>
      ) : null}
      <div className="mt-1 break-words text-sm" style={{ letterSpacing: "0.08em", color: D.text }}>
        {children}
      </div>
    </div>
  );
}
