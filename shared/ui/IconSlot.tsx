type IconSlotProps = {
  label: string;
  active?: boolean;
  size?: number;
  subtle?: boolean;
  className?: string;
};

export function IconSlot({
  label,
  active = false,
  size = 44,
  subtle = false,
  className = "",
}: IconSlotProps) {
  const ring = active ? "rgba(244, 198, 86, 0.92)" : "rgba(235, 239, 244, 0.86)";
  const border = active ? "rgba(249, 210, 108, 0.85)" : "rgba(213, 222, 233, 0.6)";
  const fill = active
    ? "radial-gradient(circle at 32% 28%, rgba(255, 220, 120, 0.22), rgba(255, 173, 33, 0.08) 45%, rgba(255,255,255,0.02) 100%)"
    : "radial-gradient(circle at 35% 30%, rgba(255,255,255,0.1), rgba(255,255,255,0.04) 42%, rgba(0,0,0,0) 100%)";

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
          ? `inset 0 0 0 1px rgba(255,255,255,0.05), 0 0 0 1px rgba(0,0,0,0.35)`
          : `inset 0 0 0 1px rgba(255,255,255,0.07), 0 0 0 1px rgba(255,255,255,0.03), 0 0 16px ${active ? "rgba(242,186,58,0.18)" : "rgba(180,190,210,0.08)"}`,
      }}
    >
      <div
        className="grid place-items-center rounded-full"
        style={{
          width: size - 8,
          height: size - 8,
          border: `1px solid ${ring}`,
          boxShadow: `inset 0 0 0 1px rgba(255,255,255,0.03)`,
        }}
      >
        <span
          className="select-none text-center font-semibold tracking-[0.18em]"
          style={{
            fontSize: Math.max(10, Math.round(size * 0.22)),
            lineHeight: 1,
            color: active ? "rgba(255, 235, 184, 0.95)" : "rgba(235, 242, 250, 0.85)",
            textShadow: active ? "0 0 10px rgba(244, 197, 79, 0.28)" : "none",
          }}
        >
          {label}
        </span>
      </div>
      <span
        className="absolute rounded-full"
        style={{
          width: Math.max(4, Math.round(size * 0.08)),
          height: Math.max(4, Math.round(size * 0.08)),
          background: active ? "rgba(255, 221, 120, 0.85)" : "rgba(223, 231, 240, 0.55)",
          bottom: Math.round(size * 0.15),
          boxShadow: active ? "0 0 8px rgba(247, 206, 94, 0.45)" : "none",
        }}
      />
    </div>
  );
}

export default IconSlot;
