"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { useAuth } from "@/features/auth/AuthContext";
import { RoleForm } from "@/features/role/RoleForm";

export default function CreateRolePage() {
  const router = useRouter();
  const { currentUser, playerId, isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) router.replace("/login");
    else if (!playerId) router.replace("/linkstart");
  }, [isAuthenticated, isLoading, playerId, router]);

  if (isLoading || !currentUser || !playerId) return null;
  return (
    <main className="lag-first-role">
      <section className="lag-first-role-panel" aria-labelledby="first-role-title">
        <header>
          <p>Life As Game · 시작하기</p>
          <h1 id="first-role-title">첫 역할 만들기</h1>
          <span>일상에서 맡은 역할을 하나 등록하세요. 나중에 더 추가할 수 있습니다.</span>
        </header>
        <RoleForm onSaved={async () => { router.replace("/"); }} onCancel={() => {}} />
      </section>
    </main>
  );
}
