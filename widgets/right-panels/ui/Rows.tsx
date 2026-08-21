"use client";

import { D } from "./styles";

export function GoldRow({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="lag-row flex min-h-[38px] items-center gap-2.5"
      style={{
        paddingInline: "16px",
        paddingBlock: "8px",
      }}
    >
      <span aria-hidden style={{ color: "var(--lag-violet)", fontSize: "9px", flexShrink: 0 }}>◆</span>
      <span className="break-words text-sm" style={{ letterSpacing: "0.06em", color: D.text }}>
        {children}
      </span>
    </div>
  );
}

export function InfoCard({ label, children }: { label?: string; children: React.ReactNode }) {
  return (
    <div
      className="lag-info-card"
      style={{
        paddingInline: "16px",
        paddingBlock: "12px",
      }}
    >
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
