"use client";

import type { SocialContextData } from "@/entities/nav";

export function SocialPanel({
  socialContext,
}: {
  socialContext: SocialContextData | null;
}) {
  const cellStyle = {
    background: "var(--lag-muted-surface)",
    border: "1px solid var(--lag-divider)",
    borderRadius: "var(--lag-radius-sm)",
  };

  return (
    <div className="relative z-10 p-7">
      <div className="text-center">
        <p className="uppercase" style={{ fontSize: "11px", letterSpacing: "0.24em", color: "var(--lag-text-2)" }}>
          SOCIAL CONTEXT
        </p>
        <h2 className="mt-2 font-semibold" style={{ fontSize: "1.875rem", letterSpacing: "0.08em", color: "var(--lag-text)" }}>
          {socialContext?.categoryLabel ?? "Social"}
        </h2>
        <div
          className="mx-auto mt-5"
          style={{ width: "88%", height: "1px", background: "linear-gradient(90deg, transparent, var(--lag-divider), transparent)" }}
        />
      </div>

      {socialContext ? (
        <div className="mt-8 space-y-3">
          <div className="rounded-sm px-4 py-3" style={cellStyle}>
            <p className="uppercase" style={{ fontSize: "10px", letterSpacing: "0.2em", color: "var(--lag-text-2)" }}>TARGET</p>
            <p className="mt-1 break-words text-lg font-semibold" style={{ letterSpacing: "0.08em", color: "var(--lag-text)" }}>
              {socialContext.title}
            </p>
            {socialContext.subtitle ? (
              <p className="mt-1 break-words text-sm" style={{ letterSpacing: "0.08em", color: "var(--lag-text-2)" }}>
                {socialContext.subtitle}
              </p>
            ) : null}
          </div>
          <div className="rounded-sm px-4 py-3" style={cellStyle}>
            <p className="uppercase" style={{ fontSize: "10px", letterSpacing: "0.2em", color: "var(--lag-text-2)" }}>DETAIL</p>
            <p className="mt-1 break-words text-sm" style={{ letterSpacing: "0.07em", color: "var(--lag-text)" }}>
              {socialContext.description}
            </p>
          </div>
          <div className="space-y-1.5">
            {socialContext.rows.map((row, index) => (
              <div
                key={`social-context-row-${index}`}
                className="flex min-h-10 items-center gap-3 rounded-sm px-3 py-2"
                style={cellStyle}
              >
                <span className="rounded-full flex-shrink-0" style={{ width: "6px", height: "6px", background: "var(--lag-focus)" }} />
                <span className="break-words text-sm" style={{ letterSpacing: "0.06em", color: "var(--lag-text)" }}>
                  {row}
                </span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="mt-8 space-y-2.5">
          <div className="rounded-sm px-4 py-3" style={cellStyle}>
            <p className="uppercase" style={{ fontSize: "10px", letterSpacing: "0.2em", color: "var(--lag-text-2)" }}>INFO</p>
            <p className="mt-1 text-sm" style={{ letterSpacing: "0.07em", color: "var(--lag-text)" }}>
              Select a party or guild from the social list to load context here.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
