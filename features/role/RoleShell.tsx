"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence } from "framer-motion";

import type {
  PersonDetail,
  RoleDetail,
  RoleEventDetail,
  RoleRelationDetail,
} from "@/shared/api/types";
import { requestStageFocus } from "@/shared/hooks/useStageCamera";
import PanelStage from "@/shared/ui/PanelStage";
import { BackButton, PanelFrame } from "@/widgets/right-panels/ui/PanelFrame";
import { InfoCard } from "@/widgets/right-panels/ui/Rows";
import {
  archiveRoleApi,
  archiveRoleRelationApi,
  createPersonApi,
  createRoleRelationApi,
  getRoleEventApi,
  listPersonsApi,
  listRoleEventsApi,
  listRoleRelationsApi,
  updateRoleApi,
  updateRoleRelationApi,
} from "./api";

type RoleSurface = "overview" | "relations" | "events";

const ROLE_SURFACES: Array<{ id: RoleSurface; label: string; slotLabel: string }> = [
  { id: "overview", label: "Overview", slotLabel: "OV" },
  { id: "relations", label: "Relations", slotLabel: "RE" },
  { id: "events", label: "Events", slotLabel: "EV" },
];

function value(form: FormData, key: string) {
  return String(form.get(key) ?? "").trim();
}

function nullable(form: FormData, key: string) {
  return value(form, key) || null;
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="lag-role-state">
      <p role="alert" className="lag-role-feedback" data-state="error">{message}</p>
      <button type="button" className="lag-role-button" onClick={onRetry}>Retry</button>
    </div>
  );
}

function RoleDataRow({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="lag-role-data-row"><dt>{label}</dt><dd>{children}</dd></div>;
}

function RoleSection({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="lag-role-section"><h4>{title}</h4><div>{children}</div></section>;
}

function RoleEditForm({ role, onSaved, onCancel }: { role: RoleDetail; onSaved: () => Promise<void>; onCancel: () => void }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const submit = async (event: React.SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setPending(true);
    setError(null);
    try {
      await updateRoleApi(role.id, {
        roleType: value(form, "roleType"),
        name: value(form, "name"),
        description: value(form, "description"),
      });
      await onSaved();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to update Role.");
    } finally {
      setPending(false);
    }
  };

  return (
    <form className="lag-role-form" onSubmit={submit}>
      <label>Role Type<input className="lag-role-control" name="roleType" required defaultValue={role.roleType} /></label>
      <label>Name<input className="lag-role-control" name="name" required defaultValue={role.name} /></label>
      <label>Description<textarea className="lag-role-control" name="description" required defaultValue={role.description} rows={4} /></label>
      {error ? <p role="alert" className="lag-role-feedback" data-state="error">{error}</p> : null}
      <div className="lag-role-actions">
        <button type="submit" disabled={pending} className="lag-role-action">{pending ? "Saving..." : "Save Role"}</button>
        <button type="button" className="lag-role-button" onClick={onCancel}>Cancel</button>
      </div>
    </form>
  );
}

function Overview({ role }: { role: RoleDetail }) {
  return (
    <article className="lag-role-detail">
      <header className="lag-role-hero">
        <span>Role Overview</span>
        <h4>{role.name}</h4>
        <span className="lag-role-status">{role.status}</span>
        <p>{role.description}</p>
      </header>
      <RoleSection title="Role identity">
        <dl>
          <RoleDataRow label="Name">{role.name}</RoleDataRow>
          <RoleDataRow label="Role type">{role.roleType}</RoleDataRow>
          <RoleDataRow label="Status">{role.status}</RoleDataRow>
        </dl>
      </RoleSection>
    </article>
  );
}

function RelationsSurface({ roleId }: { roleId: number }) {
  const [persons, setPersons] = useState<PersonDetail[]>([]);
  const [relations, setRelations] = useState<RoleRelationDetail[]>([]);
  const [editing, setEditing] = useState<RoleRelationDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [nextPersons, nextRelations] = await Promise.all([
        listPersonsApi(),
        listRoleRelationsApi(roleId),
      ]);
      setPersons(nextPersons);
      setRelations(nextRelations);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to load Relations.");
    } finally {
      setLoading(false);
    }
  }, [roleId]);

  useEffect(() => { void load(); }, [load]);

  const createPerson = async (event: React.SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    setPending(true);
    setError(null);
    try {
      await createPersonApi({
        displayName: value(form, "displayName"),
        notes: nullable(form, "notes"),
        birthday: nullable(form, "birthday"),
        contact: nullable(form, "contact"),
      });
      formElement.reset();
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to create Person.");
    } finally {
      setPending(false);
    }
  };

  const saveRelation = async (event: React.SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    setPending(true);
    setError(null);
    try {
      const body = { relationType: value(form, "relationType"), roleNotes: nullable(form, "roleNotes") };
      if (editing) await updateRoleRelationApi(roleId, editing.id, body);
      else await createRoleRelationApi(roleId, { personId: Number(value(form, "personId")), ...body });
      setEditing(null);
      formElement.reset();
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to save Relation.");
    } finally {
      setPending(false);
    }
  };

  const archiveRelation = async (relation: RoleRelationDetail) => {
    if (!window.confirm(`Archive relation with ${relation.personDisplayName}?`)) return;
    setPending(true);
    try {
      await archiveRoleRelationApi(roleId, relation.id);
      if (editing?.id === relation.id) setEditing(null);
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to archive Relation.");
    } finally {
      setPending(false);
    }
  };

  if (loading) return <InfoCard>Loading Persons and Relations...</InfoCard>;
  if (error && persons.length === 0 && relations.length === 0) return <ErrorState message={error} onRetry={() => void load()} />;

  return (
    <div className="lag-role-detail lag-role-relations">
      {error ? <p role="alert" className="lag-role-feedback" data-state="error">{error}</p> : null}
      <section className="lag-role-section" aria-labelledby="persons-heading">
        <h4 id="persons-heading">Persons</h4>
        <div className="lag-role-section-body">
        {persons.length ? persons.map((person) => (
          <article key={person.id} className="lag-role-record" data-kind="person">
            <strong>{person.displayName}</strong>
            <p>
              {person.linkedUserId ? "Linked account available · identity remains Person" : "Person"}
            </p>
          </article>
        )) : <InfoCard>No Persons yet.</InfoCard>}
        <form className="lag-role-form" onSubmit={createPerson}>
          <label>Display Name<input className="lag-role-control" name="displayName" required /></label>
          <label>Notes<input className="lag-role-control" name="notes" /></label>
          <div className="lag-role-form-grid">
            <label>Birthday<input className="lag-role-control" name="birthday" type="date" /></label>
            <label>Contact<input className="lag-role-control" name="contact" /></label>
          </div>
          <button type="submit" disabled={pending} className="lag-role-button">Create Person</button>
        </form>
        </div>
      </section>

      <section className="lag-role-section" aria-labelledby="relations-heading">
        <h4 id="relations-heading">Role Relations</h4>
        <div className="lag-role-section-body">
        {relations.length ? relations.map((relation) => (
          <article key={relation.id} className="lag-role-record" data-kind="relation">
            <strong>{relation.personDisplayName} · {relation.relationType}</strong>
            <p>{relation.roleNotes || "No role notes"}</p>
            <div className="lag-role-actions">
              <button type="button" className="lag-role-button" onClick={() => setEditing(relation)}>Edit</button>
              <button type="button" disabled={pending} className="lag-role-button" data-variant="destructive" onClick={() => void archiveRelation(relation)}>Archive</button>
            </div>
          </article>
        )) : <InfoCard>No Relations for this Role.</InfoCard>}

        <form key={editing?.id ?? "new-relation"} className="lag-role-form" onSubmit={saveRelation}>
          {editing ? (
            <InfoCard>Editing {editing.personDisplayName}. Person identity cannot be changed here.</InfoCard>
          ) : (
            <label>Person
              <select className="lag-role-control" name="personId" required defaultValue="">
                <option value="" disabled>Select a Person</option>
                {persons.map((person) => <option key={person.id} value={person.id}>{person.displayName}</option>)}
              </select>
            </label>
          )}
          <label>Relation Type<input className="lag-role-control" name="relationType" required defaultValue={editing?.relationType ?? ""} placeholder="e.g. FAMILY" /></label>
          <label>Role Notes<textarea className="lag-role-control" name="roleNotes" defaultValue={editing?.roleNotes ?? ""} rows={3} /></label>
          <div className="lag-role-actions">
            <button type="submit" disabled={pending || (!editing && persons.length === 0)} className="lag-role-action">{editing ? "Update Relation" : "Create Relation"}</button>
            {editing ? <button type="button" className="lag-role-button" onClick={() => setEditing(null)}>Cancel Edit</button> : null}
          </div>
        </form>
        </div>
      </section>
    </div>
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
      setError(caught instanceof Error ? caught.message : "Unable to load Events.");
    } finally {
      setLoading(false);
    }
  }, [roleId]);

  useEffect(() => {
    void load();
    return () => { detailRequest.current++; };
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
        setDetailError({ eventId, message: caught instanceof Error ? caught.message : "Unable to load Event detail." });
      }
    }
  };

  return (
    <div className="lag-role-detail lag-role-events">
      <InfoCard>역할 사건 기록은 준비 중입니다. 기록은 Journal에서 남길 수 있습니다.</InfoCard>
      {loading ? <InfoCard>Loading Events...</InfoCard> : error && events.length === 0 ? <ErrorState message={error} onRetry={() => void load()} /> : (
        <>
          {error ? <ErrorState message={error} onRetry={() => void load()} /> : null}
          {detailError ? <ErrorState message={detailError.message} onRetry={() => void selectEvent(detailError.eventId)} /> : null}
          <div className="lag-role-event-list" aria-label="Role Events">
            {events.length ? events.map((roleEvent) => (
              <button key={roleEvent.id} type="button" className="lag-role-event" data-selected={selectedEvent?.id === roleEvent.id} aria-pressed={selectedEvent?.id === roleEvent.id} onClick={() => void selectEvent(roleEvent.id)}>
                <span aria-hidden>{roleEvent.status === "PLANNED" ? "○" : roleEvent.status === "COMPLETED" ? "✓" : "×"}</span>
                <span><strong>{roleEvent.title}</strong><small>{roleEvent.status}</small></span>
                <span aria-hidden>→</span>
              </button>
            )) : <InfoCard>No Events for this Role.</InfoCard>}
          </div>

          {selectedEvent ? (
            <section className="lag-role-section" aria-label="Event detail">
              <h4>{selectedEvent.title}</h4>
              <div className="lag-role-section-body">
                <p className="lag-role-description">{selectedEvent.description || "No description"}</p>
                <dl>
                  <RoleDataRow label="Status">{selectedEvent.status}</RoleDataRow>
                  <RoleDataRow label="Starts">{selectedEvent.startsAt || "Not set"}</RoleDataRow>
                  <RoleDataRow label="Ends">{selectedEvent.endsAt || "Not set"}</RoleDataRow>
                </dl>
                <h5 className="lag-role-subheading">Participants</h5>
                {selectedEvent.participants.length ? selectedEvent.participants.map((participant) => (
                  <div className="lag-role-record" key={participant.participantLinkId} data-kind="participant"><strong>{participant.participantType} #{participant.participantId}</strong></div>
                )) : <InfoCard>No participants.</InfoCard>}
              </div>
            </section>
          ) : <InfoCard>Select an Event to load its detail.</InfoCard>}
        </>
      )}
    </div>
  );
}

export default function RoleShell({
  roles,
  selectedRoleId,
  onSelectRole,
  onRefresh,
}: {
  roles: RoleDetail[];
  selectedRoleId: number | null;
  onSelectRole: (roleId: number | null) => void;
  onRefresh: () => Promise<void>;
}) {
  const [surface, setSurface] = useState<RoleSurface | null>(null);
  const [surfaceRoleId, setSurfaceRoleId] = useState<number | null>(null);
  const [editingRoleId, setEditingRoleId] = useState<number | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const selectedRole = roles.find(({ id }) => id === selectedRoleId) ?? null;
  const editingRole = selectedRole?.id === editingRoleId;
  const activeSurface = selectedRole?.id === surfaceRoleId ? surface : null;

  useEffect(() => {
    setSurface(null);
    setSurfaceRoleId(null);
    setEditingRoleId((current) => current === selectedRoleId ? current : null);
    setActionError(null);
  }, [selectedRoleId]);

  const closeDetail = () => {
    setSurface(null);
    setSurfaceRoleId(null);
    setEditingRoleId(null);
    requestStageFocus("role-summary", "back");
  };

  const closeSummary = () => {
    setSurface(null);
    setSurfaceRoleId(null);
    setEditingRoleId(null);
    onSelectRole(null);
    requestStageFocus("left-context", "back");
  };

  const archiveRole = async (role: RoleDetail) => {
    if (!window.confirm(`Archive Role ${role.name}?`)) return;
    setActionError(null);
    try {
      await archiveRoleApi(role.id);
      if (selectedRoleId === role.id) onSelectRole(null);
      await onRefresh();
    } catch (caught) {
      setActionError(caught instanceof Error ? caught.message : "Unable to archive Role.");
    }
  };

  return (
    <div className="lag-panel-rail lag-role-shell relative" data-testid="role-shell">
      <AnimatePresence initial={false}>
        {selectedRole ? (
          <PanelStage stageKey="role-summary" index={1}>
            <PanelFrame title={selectedRole.name} depth={1} contentKey={selectedRole.id} backButton={<BackButton label="Back to Role selector" onClick={closeSummary} />}>
              <article className="lag-role-summary">
                {actionError ? <p role="alert" className="lag-role-feedback" data-state="error">{actionError}</p> : null}
                <header className="lag-role-hero">
                  <span>Selected Role</span>
                  <h4>{selectedRole.name}</h4>
                  <div className="lag-role-badges"><span>{selectedRole.roleType}</span><span>{selectedRole.status}</span></div>
                  <p>{selectedRole.description}</p>
                </header>
                <section className="lag-role-surface-grid" aria-label="Role surfaces">
                  {ROLE_SURFACES.map((item) => (
                    <button key={item.id} type="button" className="lag-role-surface-card" aria-pressed={activeSurface === item.id} data-selected={activeSurface === item.id} onClick={() => { setSurface(item.id); setSurfaceRoleId(selectedRole.id); setEditingRoleId(null); }}>
                      <span aria-hidden>{item.slotLabel}</span>
                      <strong>{item.label}</strong>
                      <small>{item.id === "overview" ? "Real Role identity" : item.id === "relations" ? "Persons and Role Relations" : "Event history · 준비 중"}</small>
                      <span aria-hidden>→</span>
                    </button>
                  ))}
                </section>
                <div className="lag-role-actions">
                  <button type="button" className="lag-role-button" onClick={() => { setEditingRoleId(selectedRole.id); setSurface(null); setSurfaceRoleId(null); }}>Edit Role</button>
                  <button type="button" className="lag-role-button" data-variant="destructive" onClick={() => void archiveRole(selectedRole)}>Archive Role</button>
                </div>
              </article>
            </PanelFrame>
          </PanelStage>
        ) : null}
      </AnimatePresence>

      <AnimatePresence initial={false} mode="popLayout">
        {selectedRole && (editingRole || activeSurface) ? (
          <PanelStage stageKey="role-detail" index={2}>
            <PanelFrame title={editingRole ? "Edit Role" : ROLE_SURFACES.find(({ id }) => id === activeSurface)?.label ?? "Role"} depth={0} contentKey={`${selectedRole.id}-${editingRole ? "edit" : activeSurface}`} backButton={<BackButton label={`Back to ${selectedRole.name}`} onClick={closeDetail} />}>
              {editingRole ? (
                <RoleEditForm role={selectedRole} onSaved={async () => { await onRefresh(); closeDetail(); }} onCancel={closeDetail} />
              ) : activeSurface === "overview" ? <Overview role={selectedRole} />
                : activeSurface === "relations" ? <RelationsSurface roleId={selectedRole.id} />
                  : <EventsSurface key={selectedRole.id} roleId={selectedRole.id} />}
            </PanelFrame>
          </PanelStage>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
