"use client";

import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { useAuth } from "@/context/AuthContext";
import { MOTION } from "@/lib/motion";

export default function LoginPage() {
  const router = useRouter();
  const { login, currentUser, isLoading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

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
      // redirect handled by useEffect above after state updates
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed.");
    } finally {
      setIsPending(false);
    }
  };

  const inputBase =
    "w-full rounded-sm border px-3.5 py-2.5 text-sm tracking-[0.05em] text-zinc-700 outline-none transition-[box-shadow] focus:ring-2 focus:ring-amber-400/40";

  return (
    <div
      className="flex min-h-screen items-center justify-center"
      style={{
        background:
          "radial-gradient(circle at 18% 20%, rgba(82,127,214,0.12), transparent 42%), radial-gradient(circle at 80% 18%, rgba(247,191,78,0.06), transparent 36%), linear-gradient(180deg, #07090d 0%, #090b10 38%, #0a0c11 100%)",
      }}
    >
      <motion.div
        initial={MOTION.panelReset.initial}
        animate={MOTION.panelReset.animate}
        transition={MOTION.panelReset.transition}
        className="relative overflow-hidden rounded-sm border"
        style={{
          width: 400,
          borderColor: "rgba(203,211,221,0.3)",
          background:
            "linear-gradient(180deg, rgba(238,241,245,0.97), rgba(223,228,236,0.95))",
          boxShadow:
            "inset 0 0 0 1px rgba(255,255,255,0.55), 0 24px 56px rgba(0,0,0,0.4)",
        }}
      >
        {/* Grid background */}
        <div className="absolute inset-0 opacity-[0.07] [background-image:linear-gradient(rgba(0,0,0,0.7)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.7)_1px,transparent_1px)] [background-size:24px_24px]" />

        <div className="relative z-10 px-9 py-10">
          {/* Logo */}
          <div className="mb-8 text-center">
            <h1 className="text-[22px] font-bold tracking-[0.22em] text-zinc-700">
              LIFE AS GAME
            </h1>
            <div
              className="mx-auto mt-2 h-px w-44"
              style={{
                background:
                  "linear-gradient(90deg, transparent, rgba(248,197,78,0.9), transparent)",
              }}
            />
            <p className="mt-2 text-[11px] tracking-[0.3em] text-zinc-500">
              SYSTEM ACCESS
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-[11px] tracking-[0.22em] text-zinc-500 uppercase">
                Email
              </label>
              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={inputBase}
                style={{
                  background: "rgba(255,255,255,0.72)",
                  borderColor: "rgba(140,155,175,0.5)",
                }}
                placeholder="player@lag.io"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-[11px] tracking-[0.22em] text-zinc-500 uppercase">
                Password
              </label>
              <input
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={inputBase}
                style={{
                  background: "rgba(255,255,255,0.72)",
                  borderColor: "rgba(140,155,175,0.5)",
                }}
                placeholder="••••••••"
              />
            </div>

            {error ? (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-sm px-3.5 py-2.5 text-xs tracking-[0.08em]"
                style={{
                  background: "rgba(239,68,68,0.08)",
                  border: "1px solid rgba(239,68,68,0.28)",
                  color: "#dc2626",
                }}
              >
                {error}
              </motion.div>
            ) : null}

            <button
              type="submit"
              disabled={isPending}
              className="mt-1 w-full rounded-sm py-3 text-sm font-bold tracking-[0.2em] transition-opacity disabled:opacity-60 uppercase"
              style={{
                background:
                  "linear-gradient(150deg, rgba(248,197,78,0.95), rgba(234,168,40,0.95))",
                color: "#2a2008",
                boxShadow: "0 4px 14px rgba(248,197,78,0.35)",
              }}
            >
              {isPending ? "CONNECTING..." : "LOGIN"}
            </button>
          </form>

          {/* Hint */}
          <div className="mt-7 space-y-1 text-center">
            <div
              className="rounded-sm px-4 py-2.5"
              style={{
                background: "rgba(255,255,255,0.35)",
                border: "1px solid rgba(140,155,175,0.25)",
              }}
            >
              <p className="text-[11px] tracking-[0.14em] text-zinc-500">
                Player: player@lag.io / player123
              </p>
              <p className="mt-0.5 text-[11px] tracking-[0.14em] text-zinc-500">
                Admin: admin@lag.io / admin123
              </p>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
