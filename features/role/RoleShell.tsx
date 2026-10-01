"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence } from "framer-motion";

import type { RoleDetail } from "@/shared/api/types";
import { consumerLabel } from "@/shared/lib/consumerLabels";
import { requestStageFocus } from "@/shared/hooks/useStageCamera";
import PanelStage from "@/shared/ui/PanelStage";
import { BackButton, PanelFrame } from "@/widgets/right-panels/ui/PanelFrame";
import RoleEventPanels from "./RoleEventPanels";
import RolePartyPanels from "./RolePartyPanels";
import PersonPanels from "./PersonPanels";
import RelationPanels from "./RelationPanels";
import { RoleForm } from "./RoleForm";
import RoleListPanel from "./RoleListPanel";
import { SwipeButton } from "./RecordRow";
import { useMediaQuery } from "@/shared/hooks/useMediaQuery";

type RoleSurface = "overview" | "relations" | "events" | "parties";

const ROLE_SURFACES: Array<{ id: RoleSurface; label: string; slotLabel: string }> = [
  { id: "overview", label: "개요", slotLabel: "OV" },
  { id: "relations", label: "관계", slotLabel: "RE" },
  { id: "events", label: "일정", slotLabel: "EV" },
  { id: "parties", label: "소모임", slotLabel: "RP" },
];

function RoleDataRow({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="lag-role-data-row"><dt>{label}</dt><dd>{children}</dd></div>;
}

function RoleSection({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="lag-role-section"><h4>{title}</h4><div>{children}</div></section>;
}

function Overview({ role }: { role: RoleDetail }) {
  return (
    <article className="lag-role-detail">
      <header className="lag-role-hero">
        <span>역할 개요</span>
        <h4>{role.name}</h4>
        <span className="lag-role-status">{consumerLabel(role.status)}</span>
        <p>{role.description}</p>
      </header>
      <RoleSection title="역할 정보">
        <dl>
          <RoleDataRow label="이름">{role.name}</RoleDataRow>
          <RoleDataRow label="역할 유형">{consumerLabel(role.roleType)}</RoleDataRow>
          <RoleDataRow label="상태">{consumerLabel(role.status)}</RoleDataRow>
        </dl>
      </RoleSection>
    </article>
  );
}

export default function RoleShell({
  roles,
  playerId = 0,
  selectedRoleId,
  reentryRequest = 0,
  onSelectRole,
  onRefresh, hideRoleDetails = false, workspace = "roles", personCreateRequest = 0, personReentryRequest = 0, roleCreateRequest = 0, onWorkspaceBack = () => {}, editRequest, rolesLoading, rolesError, onRoleArchived, onEditRole,
}: {
  hideRoleDetails?: boolean;
  workspace?: "persons" | "roles" | null;
  personCreateRequest?: number;
  personReentryRequest?: number;
  roleCreateRequest?: number;
  rolesLoading?: boolean;
  rolesError?: string | null;
  onRoleArchived?: (id: number) => void;
  onEditRole?: (id: number) => void;
  onWorkspaceBack?: () => void;
  editRequest?: { id: number; sequence: number } | null;
  roles: RoleDetail[];
  playerId?: number;
  selectedRoleId: number | null;
  reentryRequest?: number;
  onSelectRole: (roleId: number | null) => void;
  onRefresh: () => Promise<void>;
}) {
  const compact = useMediaQuery("(max-width: 1199px)");
  const roleGeneration = useRef(0);
  const consumedEdit = useRef(0);
  const trigger = useRef<HTMLElement | null>(null);
  const [relationCreateRequest, setRelationCreateRequest] = useState(0);
  const [relationReentryRequest, setRelationReentryRequest] = useState(0);
  const [eventCreateRequest, setEventCreateRequest] = useState(0);
  const [partyCreateRequest, setPartyCreateRequest] = useState(0);
  const [eventReentryRequest, setEventReentryRequest] = useState(0);
  const [partyReentryRequest, setPartyReentryRequest] = useState(0);
  const [surface, setSurface] = useState<RoleSurface | null>(null);
  const [surfaceRoleId, setSurfaceRoleId] = useState<number | null>(null);
  const [editingRoleId, setEditingRoleId] = useState<number | null>(null);
  const selectedRole = workspace === "roles" && !hideRoleDetails ? roles.find(({ id }) => id === selectedRoleId) ?? null : null;
  const editingRole = selectedRole?.id === editingRoleId;
  const activeSurface = selectedRole?.id === surfaceRoleId ? surface : null;

  useEffect(() => {
    const counter = roleGeneration;
    counter.current++;
    setRelationCreateRequest(0); setEventCreateRequest(0); setPartyCreateRequest(0);
    setSurface(null);
    setSurfaceRoleId(null);
    setEditingRoleId(null);
    return () => { counter.current++; };
  }, [selectedRoleId, workspace, hideRoleDetails, reentryRequest]);

  useEffect(() => { if (editRequest?.id === selectedRoleId && editRequest.sequence !== consumedEdit.current) { consumedEdit.current = editRequest.sequence; trigger.current = document.activeElement instanceof HTMLElement ? document.activeElement : null; setEditingRoleId(editRequest.id); setSurface(null); setSurfaceRoleId(null); } }, [editRequest, selectedRoleId]);

  const closeDetail = () => {
    roleGeneration.current++;
    setSurface(null);
    setSurfaceRoleId(null);
    setEditingRoleId(null);
    requestStageFocus("role-summary", "back");
    requestAnimationFrame(() => (trigger.current?.isConnected ? trigger.current : document.querySelector<HTMLElement>('[data-stage-key="role-summary"] button'))?.focus({ preventScroll: true }));
  };

  const closeSummary = () => {
    roleGeneration.current++;
    setSurface(null);
    setSurfaceRoleId(null);
    setEditingRoleId(null);
    onSelectRole(null);
    requestStageFocus("role-list", "back");
    requestAnimationFrame(() => document.querySelector<HTMLElement>(`[data-stage-key="role-list"] [data-role-id="${selectedRoleId}"] button`)?.focus({ preventScroll: true }));
  };

  return (
    <div className="lag-panel-rail lag-role-shell relative" data-testid="role-shell">
      <PersonPanels active={workspace === "persons"} createRequest={personCreateRequest} reentryRequest={personReentryRequest} onBack={onWorkspaceBack} />
      {workspace === "roles" ? <RoleListPanel roles={roles} selectedRoleId={selectedRoleId} loading={rolesLoading} error={rolesError} createRequest={roleCreateRequest} inactive={compact && Boolean(selectedRole) && !hideRoleDetails} onSelect={onSelectRole} onEdit={(id) => onEditRole?.(id)} onRetry={() => void onRefresh()} onRefresh={onRefresh} onArchived={(id) => { if (selectedRoleId === id) onSelectRole(null); onRoleArchived?.(id); }} onBack={onWorkspaceBack} /> : null}
      <AnimatePresence initial={false}>
        {selectedRole ? (
          <PanelStage stageKey="role-summary" index={2} inactive={compact && Boolean(editingRole || activeSurface)}>
            <PanelFrame title={selectedRole.name} depth={1} contentKey={selectedRole.id} backButton={<BackButton label="역할 목록으로" onClick={closeSummary} />}>
              <article className="lag-role-summary">
                <header className="lag-role-hero">
                  <span>선택한 역할</span>
                  <h4>{selectedRole.name}</h4>
                  <div className="lag-role-badges"><span>{consumerLabel(selectedRole.roleType)}</span><span>{consumerLabel(selectedRole.status)}</span></div>
                  <p>{selectedRole.description}</p>
                </header>
                <section className="lag-role-surface-grid" aria-label="Role surfaces">
                  {ROLE_SURFACES.map((item) => (
                    <SwipeButton key={item.id} className="lag-role-surface-card" creation={item.id !== "overview"} onDoubleClick={item.id !== "overview" ? () => { trigger.current = document.activeElement instanceof HTMLElement ? document.activeElement : null; setSurface(item.id); setSurfaceRoleId(selectedRole.id); if (item.id === "relations") setRelationCreateRequest((value) => value + 1); if (item.id === "events") setEventCreateRequest((value) => value + 1); if (item.id === "parties") setPartyCreateRequest((value) => value + 1); setEditingRoleId(null); } : undefined} aria-pressed={activeSurface === item.id} data-selected={activeSurface === item.id} onClick={() => { trigger.current = document.activeElement instanceof HTMLElement ? document.activeElement : null; setRelationCreateRequest(0); setEventCreateRequest(0); setPartyCreateRequest(0); if (item.id === "relations") setRelationReentryRequest((value) => value + 1); if (item.id === "events") setEventReentryRequest((value) => value + 1); if (item.id === "parties") setPartyReentryRequest((value) => value + 1); setSurface(item.id); setSurfaceRoleId(selectedRole.id); setEditingRoleId(null); }}>
                      <span aria-hidden>{item.slotLabel}</span>
                      <strong>{item.label}</strong>
                      <small>{item.id === "overview" ? "역할 정보" : item.id === "relations" ? "연결된 기존 인물" : item.id === "events" ? "역할 일정" : "초대형 역할 소모임"}</small>
                      <span aria-hidden>→</span>
                    </SwipeButton>
                  ))}
                </section>
              </article>
            </PanelFrame>
          </PanelStage>
        ) : null}
      </AnimatePresence>

        {selectedRole && (editingRole || activeSurface) ? (
          activeSurface === "relations" && !editingRole ? <RelationPanels key={selectedRole.id} roleId={selectedRole.id} roleName={selectedRole.name} createRequest={relationCreateRequest} reentryRequest={relationReentryRequest} onBack={closeDetail} /> : activeSurface === "events" && !editingRole ? <RoleEventPanels key={selectedRole.id} roleId={selectedRole.id} roleName={selectedRole.name} roleStatus={selectedRole.status} createRequest={eventCreateRequest} reentryRequest={eventReentryRequest} onBack={closeDetail} /> : activeSurface === "parties" && !editingRole ? <RolePartyPanels key={selectedRole.id} roleId={selectedRole.id} roleName={selectedRole.name} roleStatus={selectedRole.status} playerId={playerId} createRequest={partyCreateRequest} reentryRequest={partyReentryRequest} onBack={closeDetail} /> : <PanelStage stageKey="role-detail" index={3} instant>
            <PanelFrame title={editingRole ? "역할 수정" : ROLE_SURFACES.find(({ id }) => id === activeSurface)?.label ?? "역할"} depth={0} contentKey={`${selectedRole.id}-${editingRole ? "edit" : activeSurface}`} backButton={<BackButton label={`역할 ${selectedRole.name}로`} onClick={closeDetail} />}>
              {editingRole ? (
                <RoleForm role={selectedRole} onSaved={async () => { const generation = roleGeneration.current; await onRefresh(); if (generation === roleGeneration.current) closeDetail(); }} onCancel={closeDetail} />
              ) : <Overview role={selectedRole} />}
            </PanelFrame>
          </PanelStage>
        ) : null}
    </div>
  );
}
