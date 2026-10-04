"use client";

import { useEffect, useRef, useState } from "react";
import type { RoleDetail } from "@/shared/api/types";
import { consumerLabel } from "@/shared/lib/consumerLabels";
import CreateSlot from "@/shared/ui/CreateSlot";
import PanelStage from "@/shared/ui/PanelStage";
import { useSaoConfirm } from "@/shared/ui/useSaoConfirm";
import { BackButton, PanelFrame } from "@/widgets/right-panels/ui/PanelFrame";
import { archiveRoleApi } from "./api";
import { RecordRow } from "./RecordRow";
import { RoleForm } from "./RoleForm";

export default function RoleListPanel({ roles, selectedRoleId, loading, error, createRequest, inactive, onSelect, onEdit, onRetry, onRefresh, onArchived, onBack }: {
  roles: RoleDetail[]; selectedRoleId: number | null; loading?: boolean; error?: string | null; createRequest: number;
  inactive?: boolean;
  onSelect: (id: number) => void; onEdit: (id: number) => void; onRetry: () => void; onRefresh: () => Promise<void>; onArchived: (id: number) => void; onBack: () => void;
}) {
  const { confirm, dialog } = useSaoConfirm();
  const [creating, setCreating] = useState(false);
  const [pending, setPending] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const generation = useRef(0), lock = useRef(false);
  useEffect(() => { generation.current++; setCreating(Boolean(createRequest)); setActionError(null); }, [createRequest]);
  useEffect(() => { const counter = generation; return () => { counter.current++; }; }, []);
  const close = () => { generation.current++; setCreating(false); setActionError(null); };
  const archive = async (role: RoleDetail) => {
    if (lock.current || !await confirm(`역할 “${role.name}”을 삭제할까요? 인물과 다른 역할의 관계는 유지됩니다.`)) return;
    const id = generation.current; lock.current = true; setPending(true); setActionError(null);
    try { await archiveRoleApi(role.id); await onRefresh(); if (id === generation.current) onArchived(role.id); }
    catch (caught) { if (id === generation.current) setActionError(caught instanceof Error ? caught.message : "역할을 삭제하지 못했습니다."); }
    finally { lock.current = false; setPending(false); }
  };
  return <PanelStage stageKey="role-list" index={1} panelRole="list" inactive={inactive}>{dialog}
    <PanelFrame title={creating ? "역할 등록" : "내 역할 목록"} depth={1} backButton={<BackButton label={creating ? "역할 목록으로" : "인물 · 역할로"} onClick={creating ? close : onBack} />}>
      <CreateSlot creating={creating} pending={pending} onClose={close} showCancel={false} list={<div className="lag-role-detail">
        {loading ? <p role="status">역할을 불러오는 중…</p> : null}
        {error ? <p role="alert">{error} <button type="button" className="lag-role-button" onClick={onRetry}>다시 조회</button></p> : null}
        {actionError ? <p role="alert">{actionError}</p> : null}
        {!loading && !error && !roles.length ? <p>등록된 역할이 없습니다.</p> : null}
        <div className="lag-role-node-list" aria-label="내 역할 목록">{roles.map((role) => <div key={role.id} data-role-id={role.id}><RecordRow title={role.name} subtitle={`${consumerLabel(role.roleType)} · ${consumerLabel(role.status)}`} selected={selectedRoleId === role.id} disabled={pending} onSelect={() => onSelect(role.id)} onEdit={() => onEdit(role.id)} onArchive={() => void archive(role)} /></div>)}</div>
      </div>}><RoleForm onCancel={close} onSaved={async () => { const id = generation.current; await onRefresh(); if (id === generation.current) close(); }} /></CreateSlot>
    </PanelFrame>
  </PanelStage>;
}
