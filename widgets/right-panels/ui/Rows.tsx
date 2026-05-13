"use client";

import { D } from "./styles";

export function GoldRow({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="flex min-h-[38px] items-center gap-2.5"
      style={{
        background: "rgba(218,178,55,0.08)",
        border: "1px solid rgba(200,165,50,0.30)",
        borderRadius: "20px",
        paddingInline: "16px",
        paddingBlock: "8px",
      }}
    >
      <span aria-hidden style={{ color: "rgba(218,178,55,0.70)", fontSize: "9px", flexShrink: 0 }}>◆</span>
      <span className="break-words text-sm" style={{ letterSpacing: "0.06em", color: D.text }}>
        {children}
      </span>
    </div>
  );
}

export function InfoCard({ label, children }: { label?: string; children: React.ReactNode }) {
  return (
    <div
      style={{
        background: "rgba(218,178,55,0.06)",
        border: "1px solid rgba(200,165,50,0.25)",
        borderRadius: "12px",
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
