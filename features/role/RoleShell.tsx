"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence } from "framer-motion";

import type {
  RoleDetail,
  RoleEventDetail,
} from "@/shared/api/types";
import { consumerLabel } from "@/shared/lib/consumerLabels";
import { requestStageFocus } from "@/shared/hooks/useStageCamera";
import PanelStage from "@/shared/ui/PanelStage";
import { BackButton, PanelFrame } from "@/widgets/right-panels/ui/PanelFrame";
import { InfoCard } from "@/widgets/right-panels/ui/Rows";
import { getRoleEventApi, listRoleEventsApi } from "./api";
import PersonPanels from "./PersonPanels";
import RelationPanels from "./RelationPanels";
import { RoleForm } from "./RoleForm";
import RoleListPanel from "./RoleListPanel";
import { SwipeButton } from "./RecordRow";
import { useMediaQuery } from "@/shared/hooks/useMediaQuery";

type RoleSurface = "overview" | "relations" | "events";

const ROLE_SURFACES: Array<{ id: RoleSurface; label: string; slotLabel: string }> = [
  { id: "overview", label: "개요", slotLabel: "OV" },
  { id: "relations", label: "관계", slotLabel: "RE" },
  { id: "events", label: "일정", slotLabel: "EV" },
];

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="lag-role-state">
      <p role="alert" className="lag-role-feedback" data-state="error">{message}</p>
      <button type="button" className="lag-role-button" onClick={onRetry}>다시 시도</button>
    </div>
  );
}

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

function EventsSurface({ roleId }: { roleId: number }) {
  const [events, setEvents] = useState<RoleEventDetail[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<RoleEventDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [detailError, setDetailError] = useState<{ eventId: number; message: string } | null>(null);
  const detailRequest = useRef(0);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setEvents(await listRoleEventsApi(roleId));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "일정을 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }, [roleId]);

  useEffect(() => {
    const counter = detailRequest;
    void load();
    return () => { counter.current++; };
  }, [load]);

  const selectEvent = async (eventId: number) => {
    const request = ++detailRequest.current;
    setDetailError(null);
    setSelectedEvent(null);
    try {
      const detail = await getRoleEventApi(roleId, eventId);
      if (request === detailRequest.current) setSelectedEvent(detail);
    } catch (caught) {
      if (request === detailRequest.current) {
        setDetailError({ eventId, message: caught instanceof Error ? caught.message : "일정 상세를 불러오지 못했습니다." });
      }
    }
  };

  return (
    <div className="lag-role-detail lag-role-events">
      <InfoCard>역할 사건 기록은 준비 중입니다. 기록은 Journal에서 남길 수 있습니다.</InfoCard>
      {loading ? <InfoCard>일정을 불러오는 중…</InfoCard> : error && events.length === 0 ? <ErrorState message={error} onRetry={() => void load()} /> : (
        <>
          {error ? <ErrorState message={error} onRetry={() => void load()} /> : null}
          {detailError ? <ErrorState message={detailError.message} onRetry={() => void selectEvent(detailError.eventId)} /> : null}
          <div className="lag-role-event-list" aria-label="역할 일정">
            {events.length ? events.map((roleEvent) => (
              <button key={roleEvent.id} type="button" className="lag-role-event" data-selected={selectedEvent?.id === roleEvent.id} aria-pressed={selectedEvent?.id === roleEvent.id} onClick={() => void selectEvent(roleEvent.id)}>
                <span aria-hidden>{roleEvent.status === "PLANNED" ? "○" : roleEvent.status === "COMPLETED" ? "✓" : "×"}</span>
                <span><strong>{roleEvent.title}</strong><small>{consumerLabel(roleEvent.status)}</small></span>
                <span aria-hidden>→</span>
              </button>
            )) : <InfoCard>이 역할의 일정이 없습니다.</InfoCard>}
          </div>

          {selectedEvent ? (
            <section className="lag-role-section" aria-label="일정 상세">
              <h4>{selectedEvent.title}</h4>
              <div className="lag-role-section-body">
                <p className="lag-role-description">{selectedEvent.description || "설명 없음"}</p>
                <dl>
                  <RoleDataRow label="상태">{consumerLabel(selectedEvent.status)}</RoleDataRow>
                  <RoleDataRow label="시작">{selectedEvent.startsAt || "미등록"}</RoleDataRow>
                  <RoleDataRow label="종료">{selectedEvent.endsAt || "미등록"}</RoleDataRow>
                </dl>
                <h5 className="lag-role-subheading">참여자</h5>
                {selectedEvent.participants.length ? selectedEvent.participants.map((participant) => (
                  <div className="lag-role-record" key={participant.participantLinkId} data-kind="participant"><strong>{consumerLabel(participant.participantType)} #{participant.participantId}</strong></div>
                )) : <InfoCard>참여자가 없습니다.</InfoCard>}
              </div>
            </section>
          ) : <InfoCard>일정을 선택하면 상세를 볼 수 있습니다.</InfoCard>}
        </>
      )}
    </div>
  );
}

export default function RoleShell({
  roles,
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
  const [surfaceVisit, setSurfaceVisit] = useState(0);
  const [surface, setSurface] = useState<RoleSurface | null>(null);
  const [surfaceRoleId, setSurfaceRoleId] = useState<number | null>(null);
  const [editingRoleId, setEditingRoleId] = useState<number | null>(null);
  const selectedRole = workspace === "roles" && !hideRoleDetails ? roles.find(({ id }) => id === selectedRoleId) ?? null : null;
  const editingRole = selectedRole?.id === editingRoleId;
  const activeSurface = selectedRole?.id === surfaceRoleId ? surface : null;

  useEffect(() => {
    const counter = roleGeneration;
    counter.current++;
    setRelationCreateRequest(0);
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
                    <SwipeButton key={item.id} className="lag-role-surface-card" creation={item.id === "relations"} onDoubleClick={item.id === "relations" ? () => { trigger.current = document.activeElement instanceof HTMLElement ? document.activeElement : null; setSurface("relations"); setSurfaceRoleId(selectedRole.id); setRelationCreateRequest((value) => value + 1); setEditingRoleId(null); } : undefined} aria-pressed={activeSurface === item.id} data-selected={activeSurface === item.id} onClick={() => { trigger.current = document.activeElement instanceof HTMLElement ? document.activeElement : null; setRelationCreateRequest(0); if (item.id === "relations") setRelationReentryRequest((value) => value + 1); setSurfaceVisit((value) => value + 1); setSurface(item.id); setSurfaceRoleId(selectedRole.id); setEditingRoleId(null); }}>
                      <span aria-hidden>{item.slotLabel}</span>
                      <strong>{item.label}</strong>
                      <small>{item.id === "overview" ? "역할 정보" : item.id === "relations" ? "연결된 기존 인물" : "일정 이력 · 준비 중"}</small>
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
          activeSurface === "relations" && !editingRole ? <RelationPanels key={selectedRole.id} roleId={selectedRole.id} roleName={selectedRole.name} createRequest={relationCreateRequest} reentryRequest={relationReentryRequest} onBack={closeDetail} /> : <PanelStage stageKey="role-detail" index={3} instant>
            <PanelFrame title={editingRole ? "역할 수정" : ROLE_SURFACES.find(({ id }) => id === activeSurface)?.label ?? "역할"} depth={0} contentKey={`${selectedRole.id}-${editingRole ? "edit" : activeSurface}`} backButton={<BackButton label={`역할 ${selectedRole.name}로`} onClick={closeDetail} />}>
              {editingRole ? (
                <RoleForm role={selectedRole} onSaved={async () => { const generation = roleGeneration.current; await onRefresh(); if (generation === roleGeneration.current) closeDetail(); }} onCancel={closeDetail} />
              ) : activeSurface === "overview" ? <Overview role={selectedRole} />
                : <EventsSurface key={`${selectedRole.id}-${surfaceVisit}`} roleId={selectedRole.id} />}
            </PanelFrame>
          </PanelStage>
        ) : null}
    </div>
  );
}
