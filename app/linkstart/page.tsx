"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { useAuth } from "@/features/auth/AuthContext";
import { registerPlayerApi } from "@/features/player/api";
import { GOLD_BTN_STYLE, INPUT_STYLE, SAO } from "@/shared/design/tokens";
import { tokenStorage } from "@/shared/api/tokenStorage";
import EntryPanel from "@/shared/ui/EntryPanel";

const labelStyle = { fontSize: 10, letterSpacing: "0.24em", color: SAO.color.text.label };

export default function LinkStartPage() {
  const router = useRouter();
  const { currentUser, playerId, isAuthenticated, isLoading, reloadMe } = useAuth();
  const [name, setName] = useState("");
  const [gender, setGender] = useState("MALE");
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) router.replace("/login");
    else if (playerId) router.replace("/");
  }, [isAuthenticated, isLoading, playerId, router]);

  const handleSubmit = async (event: React.SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setIsPending(true);
    try {
      const currentSession = tokenStorage.read();
      if (!currentSession) throw new Error("Authentication has expired.");
      const created = await registerPlayerApi({ name, gender });
      tokenStorage.write({
        userId: currentSession.userId,
        playerId: created.id,
        accessToken: created.accessToken,
        refreshToken: created.refreshToken,
      });
      await reloadMe();
      router.replace("/roles/create");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Link Start failed.");
    } finally {
      setIsPending(false);
    }
  };

  if (isLoading || !currentUser || playerId) return null;
  return (
    <EntryPanel title="LINK START" subtitle="CHARACTER INITIALIZATION">
      <form onSubmit={handleSubmit} className="space-y-4">
        <label className="block uppercase" style={labelStyle}>
          Character Name
          <input className="mt-1.5" required minLength={1} maxLength={40} autoComplete="nickname" value={name} onChange={(event) => setName(event.target.value)} style={INPUT_STYLE} />
        </label>
        <label className="block uppercase" style={labelStyle}>
          Gender
          <select className="mt-1.5" required value={gender} onChange={(event) => setGender(event.target.value)} style={INPUT_STYLE}>
            <option value="MALE">Male</option>
            <option value="FEMALE">Female</option>
          </select>
        </label>
        {error ? <p role="alert" className="text-xs" style={{ color: SAO.color.action.red }}>{error}</p> : null}
        <button type="submit" disabled={isPending} className="w-full py-3 disabled:opacity-60" style={GOLD_BTN_STYLE}>
          {isPending ? "LINKING..." : "LINK START"}
        </button>
      </form>
    </EntryPanel>
  );
}
