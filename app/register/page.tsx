"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { useAuth } from "@/features/auth/AuthContext";
import { GOLD_BTN_STYLE, INPUT_STYLE, SAO } from "@/shared/design/tokens";
import EntryPanel from "@/shared/ui/EntryPanel";

const labelStyle = { fontSize: 10, letterSpacing: "0.24em", color: SAO.color.text.label };

export default function RegisterPage() {
  const router = useRouter();
  const { register, currentUser, playerId, isLoading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nickname, setNickname] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);
  const [verificationPending, setVerificationPending] = useState(false);

  useEffect(() => {
    if (!isLoading && currentUser) router.replace(currentUser.role === "admin" || playerId ? "/" : "/linkstart");
  }, [currentUser, isLoading, playerId, router]);

  const handleSubmit = async (event: React.SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setIsPending(true);
    try {
      const result = await register(email, password, nickname);
      if (result.requiresVerification) setVerificationPending(true);
      else if (result.tokenPair) router.replace("/linkstart");
      else throw new Error("Registration completed without a session.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Registration failed.");
    } finally {
      setIsPending(false);
    }
  };

  if (isLoading || currentUser) return null;
  if (verificationPending) {
    return (
      <EntryPanel title="VERIFY ACCOUNT" subtitle="TRANSMISSION PENDING">
        <p className="text-center text-sm leading-6" style={{ color: SAO.color.text.secondary }}>
          이메일 인증을 완료한 뒤 로그인해 주세요.
        </p>
        <Link href="/login" className="mt-6 block text-center text-xs uppercase" style={{ color: SAO.color.text.gold, letterSpacing: "0.18em" }}>
          Return to Login
        </Link>
      </EntryPanel>
    );
  }

  return (
    <EntryPanel title="CREATE ACCOUNT" subtitle="NEW PLAYER REGISTRATION">
      <form onSubmit={handleSubmit} className="space-y-4">
        <label className="block uppercase" style={labelStyle}>
          Email
          <input className="mt-1.5" type="email" required autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} style={INPUT_STYLE} />
        </label>
        <label className="block uppercase" style={labelStyle}>
          Password
          <input className="mt-1.5" type="password" required minLength={8} maxLength={72} autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} style={INPUT_STYLE} />
        </label>
        <label className="block uppercase" style={labelStyle}>
          Nickname
          <input className="mt-1.5" required minLength={2} maxLength={20} autoComplete="nickname" value={nickname} onChange={(event) => setNickname(event.target.value)} style={INPUT_STYLE} />
        </label>
        {error ? <p role="alert" className="text-xs" style={{ color: SAO.color.action.red }}>{error}</p> : null}
        <button type="submit" disabled={isPending} className="w-full py-3 disabled:opacity-60" style={GOLD_BTN_STYLE}>
          {isPending ? "CREATING..." : "REGISTER"}
        </button>
      </form>
      <Link href="/login" className="mt-6 block text-center text-xs uppercase" style={{ color: SAO.color.text.gold, letterSpacing: "0.18em" }}>
        Already registered? Login
      </Link>
    </EntryPanel>
  );
}
