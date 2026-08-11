"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { useAuth } from "@/features/auth/AuthContext";
import { createRoleApi } from "@/features/role/api";
import { GOLD_BTN_STYLE, INPUT_STYLE, SAO } from "@/shared/design/tokens";
import EntryPanel from "@/shared/ui/EntryPanel";

const labelStyle = { fontSize: 10, letterSpacing: "0.24em", color: SAO.color.text.label };

export default function CreateRolePage() {
  const router = useRouter();
  const { currentUser, playerId, isAuthenticated, isLoading } = useAuth();
  const pendingRef = useRef(false);
  const [roleType, setRoleType] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) router.replace("/login");
    else if (!playerId) router.replace("/linkstart");
  }, [isAuthenticated, isLoading, playerId, router]);

  const handleSubmit = async (event: React.SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (pendingRef.current) return;
    pendingRef.current = true;
    setError(null);
    setIsPending(true);
    try {
      await createRoleApi({ roleType, name, description });
      router.replace("/");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Role creation failed.");
    } finally {
      pendingRef.current = false;
      setIsPending(false);
    }
  };

  if (isLoading || !currentUser || !playerId) return null;
  return (
    <EntryPanel title="FIRST ROLE" subtitle="MY LIFE HAS ROLES">
      <form onSubmit={handleSubmit} className="space-y-4">
        <label className="block uppercase" style={labelStyle}>
          Role Type
          <input className="mt-1.5" list="role-type-presets" required maxLength={40} value={roleType} onChange={(event) => setRoleType(event.target.value)} placeholder="e.g. PROFESSIONAL" style={INPUT_STYLE} />
          <datalist id="role-type-presets">
            <option value="PROFESSIONAL" />
            <option value="FAMILY" />
            <option value="HEALTH" />
            <option value="CREATOR" />
          </datalist>
        </label>
        <label className="block uppercase" style={labelStyle}>
          Name
          <input className="mt-1.5" required maxLength={80} value={name} onChange={(event) => setName(event.target.value)} placeholder="Backend Engineer" style={INPUT_STYLE} />
        </label>
        <label className="block uppercase" style={labelStyle}>
          Description
          <textarea className="mt-1.5" required maxLength={500} rows={4} value={description} onChange={(event) => setDescription(event.target.value)} style={{ ...INPUT_STYLE, resize: "vertical" }} />
        </label>
        {error ? <p role="alert" className="text-xs" style={{ color: SAO.color.action.red }}>{error}</p> : null}
        <button type="submit" disabled={isPending} className="w-full py-3 disabled:opacity-60" style={GOLD_BTN_STYLE}>
          {isPending ? "CREATING..." : "CREATE ROLE"}
        </button>
      </form>
    </EntryPanel>
  );
}
