"use client";

import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { useAuth } from "@/context/AuthContext";
import { MOTION } from "@/lib/motion";
import { SAO, PANEL_STYLE, GRID_OVERLAY_STYLE, INPUT_STYLE, GOLD_BTN_STYLE } from "@/lib/design/tokens";

export default function LoginPage() {
  const router = useRouter();
  const { login, currentUser, isLoading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [shakeKey, setShakeKey] = useState(0);

  // Redirect if already logged in
  useEffect(() => {
    if (!isLoading && currentUser) {
      router.replace(currentUser.role === "admin" ? "/admin" : "/");
    }
  }, [currentUser, isLoading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsPending(true);
    try {
      await login(email, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed.");
      setShakeKey((k) => k + 1);
    } finally {
      setIsPending(false);
    }
  };

  const getInputStyle = (field: string) => ({
    ...INPUT_STYLE,
    ...(focusedField === field
      ? { border: `1px solid ${SAO.color.border.gold}` }
      : {}),
  });

  return (
    <div
      className="flex min-h-screen items-center justify-center"
      style={{
        background: `radial-gradient(circle at 18% 20%, rgba(82,127,214,0.12), transparent 42%), radial-gradient(circle at 80% 18%, rgba(247,191,78,0.06), transparent 36%), linear-gradient(180deg, ${SAO.color.bg.page} 0%, #090b10 38%, ${SAO.color.bg.dark} 100%)`,
      }}
    >
      <motion.div
        key={`login-card-${shakeKey}`}
        initial={shakeKey > 0 ? { x: 0 } : MOTION.panelReset.initial}
        animate={shakeKey > 0 ? { x: [0, -8, 8, -8, 8, -4, 0] } : MOTION.panelReset.animate}
        transition={
          shakeKey > 0
            ? { duration: 0.45, ease: "easeOut" }
            : MOTION.panelReset.transition
        }
        className="relative overflow-hidden"
        style={{
          ...PANEL_STYLE,
          width: 400,
          boxShadow: `${SAO.shadow.panelInset}, 0 24px 56px rgba(0,0,0,0.4)`,
        }}
      >
        {/* Grid background */}
        <div style={GRID_OVERLAY_STYLE} />

        <div className="relative z-10 px-9 py-10">
          {/* Title */}
          <div className="mb-8 text-center">
            <h1
              className="font-semibold uppercase"
              style={{
                fontSize: "22px",
                letterSpacing: "0.22em",
                color: SAO.color.text.primary,
              }}
            >
              LIFE AS GAME
            </h1>
            {/* Gold underline */}
            <div
              className="mx-auto mt-2 h-0.5 w-44"
              style={{
                background: `linear-gradient(90deg, transparent, ${SAO.color.border.gold}, transparent)`,
              }}
            />
            {/* Divider double line */}
            <div className="mt-2 mx-auto w-44 space-y-px">
              <div style={{ height: "1px", background: "rgba(20,23,28,0.15)" }} />
              <div style={{ height: "1px", background: "rgba(255,255,255,0.5)" }} />
            </div>
            <p
              className="mt-2 uppercase"
              style={{
                fontSize: "11px",
                letterSpacing: "0.3em",
                color: SAO.color.text.label,
              }}
            >
              SYSTEM ACCESS
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                className="mb-1.5 block uppercase"
                style={{ fontSize: "10px", letterSpacing: "0.24em", color: SAO.color.text.label }}
              >
                Email
              </label>
              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onFocus={() => setFocusedField("email")}
                onBlur={() => setFocusedField(null)}
                style={getInputStyle("email")}
                placeholder="player@lag.io"
              />
            </div>

            <div>
              <label
                className="mb-1.5 block uppercase"
                style={{ fontSize: "10px", letterSpacing: "0.24em", color: SAO.color.text.label }}
              >
                Password
              </label>
              <input
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onFocus={() => setFocusedField("password")}
                onBlur={() => setFocusedField(null)}
                style={getInputStyle("password")}
                placeholder="••••••••"
              />
            </div>

            {error ? (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-sm px-3.5 py-2.5 text-xs"
                style={{
                  background: "rgba(239,68,68,0.08)",
                  border: "1px solid rgba(239,68,68,0.28)",
                  color: SAO.color.action.danger,
                  letterSpacing: "0.08em",
                }}
              >
                {error}
              </motion.div>
            ) : null}

            <button
              type="submit"
              disabled={isPending}
              className="mt-1 w-full py-3 transition-opacity disabled:opacity-60"
              style={{
                ...GOLD_BTN_STYLE,
                padding: "12px 0",
                fontSize: "0.875rem",
                boxShadow: `0 4px 14px rgba(248,197,78,0.35)`,
              }}
            >
              {isPending ? "CONNECTING..." : "LOGIN"}
            </button>
          </form>

          {/* Hint */}
          <div className="mt-7 text-center">
            <div
              className="rounded-sm px-4 py-2.5"
              style={{
                background: SAO.color.bg.inset,
                border: `1px solid rgba(140,155,175,0.25)`,
              }}
            >
              <p style={{ fontSize: "11px", letterSpacing: "0.14em", color: SAO.color.text.label }}>
                Player: player@lag.io / player123
              </p>
              <p className="mt-0.5" style={{ fontSize: "11px", letterSpacing: "0.14em", color: SAO.color.text.label }}>
                Admin: admin@lag.io / admin123
              </p>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
