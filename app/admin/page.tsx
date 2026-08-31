"use client";

import { useRouter } from "next/navigation";

import { AuditExplorer } from "@/features/admin/audit/AuditExplorer";
import { adminAuditDataSource } from "@/features/admin/api/audit.source";
import { adminPlayerDataSource } from "@/features/admin/api/player.source";
import { adminQuestDataSource } from "@/features/admin/api/quest.source";
import { adminQuestCommandSource } from "@/features/admin/api/quest.command";
import { PlayerLookup } from "@/features/admin/player/PlayerLookup";
import { QuestRuntimeStatus } from "@/features/admin/quest/QuestRuntimeStatus";
import { AdminShell } from "@/features/admin/shell/AdminShell";
import { useAuth } from "@/features/auth/AuthContext";

export default function AdminPage() {
  const router = useRouter();
  const { currentUser, isAuthenticated, isLoading } = useAuth();
  const access = isLoading ? "loading" : isAuthenticated ? "ready" : "unauthenticated";

  return (
    <AdminShell
      operator={currentUser?.email ?? "Session not authenticated"}
      source={adminAuditDataSource.descriptor}
      audit={<AuditExplorer access={access} onLogin={() => router.push("/login")} dataSource={adminAuditDataSource} />}
      player={(openAudit) => <PlayerLookup access={access} onLogin={() => router.push("/login")} onOpenAudit={openAudit} dataSource={adminPlayerDataSource} />}
      quest={(openAudit) => <QuestRuntimeStatus access={access} onLogin={() => router.push("/login")} onOpenAudit={openAudit} dataSource={adminQuestDataSource} commandSource={adminQuestCommandSource} auditSource={adminAuditDataSource} />}
    />
  );
}
