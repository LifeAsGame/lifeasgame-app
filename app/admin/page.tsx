"use client";

import { useRouter } from "next/navigation";

import { AuditExplorer } from "@/features/admin/audit/AuditExplorer";
import { AdminShell } from "@/features/admin/shell/AdminShell";
import { useAuth } from "@/features/auth/AuthContext";

export default function AdminPage() {
  const router = useRouter();
  const { currentUser, isAuthenticated, isLoading } = useAuth();
  const access = isLoading ? "loading" : isAuthenticated ? "ready" : "unauthenticated";

  return (
    <AdminShell
      operator={currentUser?.email ?? "Session not authenticated"}
      audit={<AuditExplorer access={access} onLogin={() => router.push("/login")} />}
    />
  );
}
