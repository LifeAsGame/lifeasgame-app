type IconSlotProps = {
  label: string;
  active?: boolean;
  size?: number;
  subtle?: boolean;
  className?: string;
  /** Optional SAO SVG icon path. If provided, renders an <img> instead of the text label. */
  iconSrc?: string;
};

export function IconSlot({
  label,
  active = false,
  size = 44,
  subtle = false,
  className = "",
  iconSrc,
}: IconSlotProps) {
  const ring = active ? "var(--lag-state-selected)" : "var(--lag-divider)";
  const border = active ? "var(--lag-focus)" : "var(--lag-border)";
  const fill = active
    ? "color-mix(in srgb, var(--lag-state-selected) 14%, var(--lag-panel))"
    : "var(--lag-panel-2)";

  const iconSize = Math.round(size * 0.6);

  return (
    <div
      aria-hidden="true"
      className={`relative grid place-items-center rounded-full ${className}`}
      style={{
        width: size,
        height: size,
        background: fill,
        border: `1px solid ${border}`,
        boxShadow: subtle
          ? "inset 0 0 0 1px color-mix(in srgb, var(--lag-paper) 55%, transparent)"
          : `0 0 14px ${active ? "color-mix(in srgb, var(--lag-state-selected) 18%, transparent)" : "transparent"}`,
      }}
    >
      <div
        className="grid place-items-center rounded-full"
        style={{
          width: size - 8,
          height: size - 8,
          border: `1px solid ${ring}`,
          boxShadow: "none",
        }}
      >
        {iconSrc ? (
          <img
            src={iconSrc}
            alt={label}
            width={iconSize}
            height={iconSize}
            draggable={false}
            style={{
              display: "block",
              opacity: active ? 1 : 0.72,
              filter: active
                ? "drop-shadow(0 0 4px rgba(244,197,79,0.4))"
                : "brightness(1.1)",
            }}
            onError={(e) => {
              // Fallback to text label if SVG fails to load
              const img = e.currentTarget;
              const span = document.createElement("span");
              span.textContent = label;
              span.style.cssText = [
                `font-size: ${Math.max(10, Math.round(size * 0.22))}px`,
                "line-height: 1",
                "font-weight: 600",
                "letter-spacing: 0.18em",
                "color: " + (active ? "var(--lag-text)" : "var(--lag-text-2)"),
                active ? "text-shadow: 0 0 10px color-mix(in srgb,var(--lag-focus) 28%,transparent)" : "",
              ].join(";");
              img.parentElement?.replaceChild(span, img);
            }}
          />
        ) : (
          <span
            className="select-none text-center font-semibold tracking-[0.18em]"
            style={{
              fontSize: Math.max(10, Math.round(size * 0.22)),
              lineHeight: 1,
              color: active ? "var(--lag-text)" : "var(--lag-text-2)",
              textShadow: active ? "0 0 10px color-mix(in srgb, var(--lag-focus) 28%, transparent)" : "none",
            }}
          >
            {label}
          </span>
        )}
      </div>
      <span
        className="absolute rounded-full"
        style={{
          width: Math.max(4, Math.round(size * 0.08)),
          height: Math.max(4, Math.round(size * 0.08)),
          background: active ? "var(--lag-focus)" : "var(--lag-disabled)",
          bottom: Math.round(size * 0.15),
          boxShadow: active ? "0 0 8px color-mix(in srgb, var(--lag-focus) 45%, transparent)" : "none",
        }}
      />
    </div>
  );
}

export default IconSlot;
