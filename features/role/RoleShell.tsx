"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence } from "framer-motion";

import type {
  PersonDetail,
  RoleDetail,
  RoleEventDetail,
  RoleEventInput,
  RoleRelationDetail,
} from "@/shared/api/types";
import PanelCard from "@/shared/ui/PanelCard";
import PanelStage from "@/shared/ui/PanelStage";
import { PanelFrame } from "@/widgets/right-panels/ui/PanelFrame";
import { GoldRow, InfoCard } from "@/widgets/right-panels/ui/Rows";
import { actionBtnStyle } from "@/widgets/right-panels/ui/styles";
import {
  archiveRoleApi,
  archiveRoleRelationApi,
  cancelRoleEventApi,
  completeRoleEventApi,
  createPersonApi,
  createRoleEventApi,
  createRoleRelationApi,
  getRoleEventApi,
  listPersonsApi,
  listRoleEventsApi,
  listRoleRelationsApi,
  updateRoleApi,
  updateRoleEventApi,
  updateRoleRelationApi,
} from "./api";

type RoleSurface = "overview" | "relations" | "events";

const ROLE_SURFACES: Array<{ id: RoleSurface; label: string; slotLabel: string }> = [
  { id: "overview", label: "Overview", slotLabel: "OV" },
  { id: "relations", label: "Relations", slotLabel: "RE" },
  { id: "events", label: "Events", slotLabel: "EV" },
];

const secondaryButton = {
  border: "1px solid var(--lag-control-border)",
  background: "var(--lag-control-bg)",
  color: "var(--lag-control-text)",
  borderRadius: "var(--lag-radius-sm)",
  padding: "7px 10px",
  fontSize: "0.68rem",
  letterSpacing: "0.08em",
} as const;

const fieldLabel = {
  display: "block",
  fontSize: "0.62rem",
  letterSpacing: "0.14em",
  color: "var(--lag-text-2)",
  textTransform: "uppercase",
} as const;

const inputStyle = {
  width: "100%",
  boxSizing: "border-box",
  padding: "8px 12px",
  background: "var(--lag-control-bg)",
  border: "1px solid var(--lag-control-border)",
  borderRadius: "var(--lag-radius-sm)",
  color: "var(--lag-control-text)",
  fontSize: "0.875rem",
  letterSpacing: "0.04em",
  outline: "none",
} as const;

function value(form: FormData, key: string) {
  return String(form.get(key) ?? "").trim();
}

function nullable(form: FormData, key: string) {
  return value(form, key) || null;
}

function toLocalDateTime(instant: string | null) {
  if (!instant) return "";
  const date = new Date(instant);
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function toInstant(local: string) {
  return local ? new Date(local).toISOString() : null;
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="space-y-3 px-3">
      <p role="alert" className="text-sm" style={{ color: "var(--lag-state-error)" }}>{message}</p>
      <button type="button" style={secondaryButton} onClick={onRetry}>Retry</button>
    </div>
  );
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
    <form className="space-y-3 px-3" onSubmit={submit}>
      <label style={fieldLabel}>Role Type<input className="lag-role-control" name="roleType" required defaultValue={role.roleType} style={inputStyle} /></label>
      <label style={fieldLabel}>Name<input className="lag-role-control" name="name" required defaultValue={role.name} style={inputStyle} /></label>
      <label style={fieldLabel}>Description<textarea className="lag-role-control" name="description" required defaultValue={role.description} rows={4} style={{ ...inputStyle, resize: "vertical" }} /></label>
      {error ? <p role="alert" className="text-xs" style={{ color: "var(--lag-state-error)" }}>{error}</p> : null}
      <div className="flex gap-2">
        <button type="submit" disabled={pending} style={{ ...actionBtnStyle, flex: 1 }}>{pending ? "Saving..." : "Save Role"}</button>
        <button type="button" style={secondaryButton} onClick={onCancel}>Cancel</button>
      </div>
    </form>
  );
}

function Overview({ role }: { role: RoleDetail }) {
  return (
    <div className="space-y-3 px-3">
      <InfoCard>{role.description}</InfoCard>
      <GoldRow>Name: {role.name}</GoldRow>
      <GoldRow>Role Type: {role.roleType}</GoldRow>
      <GoldRow>Status: {role.status}</GoldRow>
    </div>
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
    <div className="space-y-5 px-3">
      {error ? <p role="alert" className="text-xs" style={{ color: "var(--lag-state-error)" }}>{error}</p> : null}
      <section className="space-y-2" aria-labelledby="persons-heading">
        <h3 id="persons-heading" style={fieldLabel}>Persons</h3>
        {persons.length ? persons.map((person) => (
          <div key={person.id} className="lag-utility-row rounded-sm border px-3 py-2">
            <p className="text-sm font-semibold" style={{ color: "var(--lag-text)" }}>{person.displayName}</p>
            <p className="text-xs" style={{ color: "var(--lag-text-2)" }}>
              {person.linkedUserId ? "Linked account available · identity remains Person" : "Person"}
            </p>
          </div>
        )) : <InfoCard>No Persons yet.</InfoCard>}
        <form className="space-y-2" onSubmit={createPerson}>
          <label style={fieldLabel}>Display Name<input className="lag-role-control" name="displayName" required style={inputStyle} /></label>
          <label style={fieldLabel}>Notes<input className="lag-role-control" name="notes" style={inputStyle} /></label>
          <div className="grid grid-cols-2 gap-2">
            <label style={fieldLabel}>Birthday<input className="lag-role-control" name="birthday" type="date" style={inputStyle} /></label>
            <label style={fieldLabel}>Contact<input className="lag-role-control" name="contact" style={inputStyle} /></label>
          </div>
          <button type="submit" disabled={pending} style={secondaryButton}>Create Person</button>
        </form>
      </section>

      <section className="space-y-2" aria-labelledby="relations-heading">
        <h3 id="relations-heading" style={fieldLabel}>Role Relations</h3>
        {relations.length ? relations.map((relation) => (
          <div key={relation.id} className="lag-utility-row rounded-sm border px-3 py-2">
            <p className="text-sm font-semibold" style={{ color: "var(--lag-text)" }}>{relation.personDisplayName} · {relation.relationType}</p>
            <p className="text-xs" style={{ color: "var(--lag-text-2)" }}>{relation.roleNotes || "No role notes"}</p>
            <div className="mt-2 flex gap-2">
              <button type="button" style={secondaryButton} onClick={() => setEditing(relation)}>Edit</button>
              <button type="button" disabled={pending} style={secondaryButton} onClick={() => void archiveRelation(relation)}>Archive</button>
            </div>
          </div>
        )) : <InfoCard>No Relations for this Role.</InfoCard>}

        <form key={editing?.id ?? "new-relation"} className="space-y-2" onSubmit={saveRelation}>
          {editing ? (
            <InfoCard>Editing {editing.personDisplayName}. Person identity cannot be changed here.</InfoCard>
          ) : (
            <label style={fieldLabel}>Person
              <select className="lag-role-control" name="personId" required defaultValue="" style={inputStyle}>
                <option value="" disabled>Select a Person</option>
                {persons.map((person) => <option key={person.id} value={person.id}>{person.displayName}</option>)}
              </select>
            </label>
          )}
          <label style={fieldLabel}>Relation Type<input className="lag-role-control" name="relationType" required defaultValue={editing?.relationType ?? ""} placeholder="e.g. FAMILY" style={inputStyle} /></label>
          <label style={fieldLabel}>Role Notes<textarea className="lag-role-control" name="roleNotes" defaultValue={editing?.roleNotes ?? ""} rows={3} style={{ ...inputStyle, resize: "vertical" }} /></label>
          <div className="flex gap-2">
            <button type="submit" disabled={pending || (!editing && persons.length === 0)} style={secondaryButton}>{editing ? "Update Relation" : "Create Relation"}</button>
            {editing ? <button type="button" style={secondaryButton} onClick={() => setEditing(null)}>Cancel Edit</button> : null}
          </div>
        </form>
      </section>
    </div>
  );
}

function EventForm({ roleId, event, onSaved, onCancel }: { roleId: number; event: RoleEventDetail | null; onSaved: (saved: RoleEventDetail) => Promise<void>; onCancel: () => void }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (submitEvent: React.SubmitEvent<HTMLFormElement>) => {
    submitEvent.preventDefault();
    const form = new FormData(submitEvent.currentTarget);
    const body: RoleEventInput = {
      title: value(form, "title"),
      description: nullable(form, "description"),
      startsAt: toInstant(value(form, "startsAt")),
      endsAt: toInstant(value(form, "endsAt")),
    };
    setPending(true);
    setError(null);
    try {
      const saved = event
        ? await updateRoleEventApi(roleId, event.id, body)
        : await createRoleEventApi(roleId, body);
      await onSaved(saved);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to save Event.");
    } finally {
      setPending(false);
    }
  };

  return (
    <form className="space-y-3" onSubmit={submit}>
      <label style={fieldLabel}>Title<input className="lag-role-control" name="title" required maxLength={120} defaultValue={event?.title ?? ""} style={inputStyle} /></label>
      <label style={fieldLabel}>Description<textarea className="lag-role-control" name="description" maxLength={1000} defaultValue={event?.description ?? ""} rows={3} style={{ ...inputStyle, resize: "vertical" }} /></label>
      <label style={fieldLabel}>Starts At<input className="lag-role-control" name="startsAt" type="datetime-local" defaultValue={toLocalDateTime(event?.startsAt ?? null)} style={inputStyle} /></label>
      <label style={fieldLabel}>Ends At<input className="lag-role-control" name="endsAt" type="datetime-local" defaultValue={toLocalDateTime(event?.endsAt ?? null)} style={inputStyle} /></label>
      {error ? <p role="alert" className="text-xs" style={{ color: "var(--lag-state-error)" }}>{error}</p> : null}
      <div className="flex gap-2">
        <button type="submit" disabled={pending} style={secondaryButton}>{event ? "Update Event" : "Save New Event"}</button>
        <button type="button" style={secondaryButton} onClick={onCancel}>Cancel</button>
      </div>
    </form>
  );
}

function EventsSurface({ roleId }: { roleId: number }) {
  const [events, setEvents] = useState<RoleEventDetail[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<RoleEventDetail | null>(null);
  const [formEvent, setFormEvent] = useState<RoleEventDetail | "create" | null>(null);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  useEffect(() => { void load(); }, [load]);

  const selectEvent = async (eventId: number) => {
    setError(null);
    try {
      setSelectedEvent(await getRoleEventApi(roleId, eventId));
      setFormEvent(null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to load Event detail.");
    }
  };

  const saved = async (next: RoleEventDetail) => {
    setSelectedEvent(next);
    setFormEvent(null);
    await load();
  };

  const transition = async (action: "complete" | "cancel") => {
    if (!selectedEvent) return;
    setPending(true);
    setError(null);
    try {
      const next = action === "complete"
        ? await completeRoleEventApi(roleId, selectedEvent.id)
        : await cancelRoleEventApi(roleId, selectedEvent.id);
      await saved(next);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : `Unable to ${action} Event.`);
    } finally {
      setPending(false);
    }
  };

  if (loading) return <InfoCard>Loading Events...</InfoCard>;
  if (error && events.length === 0) return <ErrorState message={error} onRetry={() => void load()} />;

  return (
    <div className="space-y-4 px-3">
      {error ? <p role="alert" className="text-xs" style={{ color: "var(--lag-state-error)" }}>{error}</p> : null}
      <button type="button" style={actionBtnStyle} onClick={() => setFormEvent("create")}>Create Event</button>
      <div className="space-y-2">
        {events.length ? events.map((roleEvent) => (
          <button key={roleEvent.id} type="button" className="w-full rounded-sm px-3 py-2 text-left" style={{ background: selectedEvent?.id === roleEvent.id ? "var(--lag-selected-surface)" : "var(--lag-control-bg)", border: `1px solid ${selectedEvent?.id === roleEvent.id ? "var(--lag-focus)" : "var(--lag-control-border)"}` }} onClick={() => void selectEvent(roleEvent.id)}>
            <span className="block text-sm font-semibold" style={{ color: "var(--lag-text)" }}>{roleEvent.title}</span>
            <span className="block text-xs" style={{ color: "var(--lag-text-2)" }}>{roleEvent.status}</span>
          </button>
        )) : <InfoCard>No Events for this Role.</InfoCard>}
      </div>

      {formEvent ? (
        <EventForm key={formEvent === "create" ? "create" : `${formEvent.id}-${formEvent.version}`} roleId={roleId} event={formEvent === "create" ? null : formEvent} onSaved={saved} onCancel={() => setFormEvent(null)} />
      ) : selectedEvent ? (
        <section className="space-y-2" aria-label="Event detail">
          <InfoCard>{selectedEvent.description || "No description"}</InfoCard>
          <GoldRow>Status: {selectedEvent.status}</GoldRow>
          <GoldRow>Starts: {selectedEvent.startsAt || "Not set"}</GoldRow>
          <GoldRow>Ends: {selectedEvent.endsAt || "Not set"}</GoldRow>
          <div className="space-y-1">
            <p style={fieldLabel}>Participants</p>
            {selectedEvent.participants.length ? selectedEvent.participants.map((participant) => (
              <GoldRow key={participant.participantLinkId}>{participant.participantType} #{participant.participantId}</GoldRow>
            )) : <InfoCard>No participants.</InfoCard>}
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" style={secondaryButton} onClick={() => setFormEvent(selectedEvent)}>Edit Event</button>
            {selectedEvent.status === "PLANNED" ? (
              <>
                <button type="button" disabled={pending} style={secondaryButton} onClick={() => void transition("complete")}>Complete Event</button>
                <button type="button" disabled={pending} style={secondaryButton} onClick={() => void transition("cancel")}>Cancel Event</button>
              </>
            ) : null}
          </div>
        </section>
      ) : <InfoCard>Select an Event to load its detail.</InfoCard>}
    </div>
  );
}

export default function RoleShell({
  roles,
  selectedRoleId,
  isLoading,
  error,
  onSelectRole,
  onRefresh,
}: {
  roles: RoleDetail[];
  selectedRoleId: number | null;
  isLoading: boolean;
  error: string | null;
  onSelectRole: (roleId: number | null) => void;
  onRefresh: () => Promise<void>;
}) {
  const router = useRouter();
  const [surface, setSurface] = useState<RoleSurface | null>(null);
  const [editingRoleId, setEditingRoleId] = useState<number | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const selectedRole = roles.find(({ id }) => id === selectedRoleId) ?? null;
  const editingRole = selectedRole?.id === editingRoleId;

  useEffect(() => {
    setSurface(null);
    setEditingRoleId((current) => current === selectedRoleId ? current : null);
  }, [selectedRoleId]);

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
    <div className="lag-panel-rail relative" data-testid="role-shell">
      <PanelStage stageKey="role-list">
        <PanelFrame title="Roles" depth={2}>
        <div className="space-y-3">
          <div className="px-3"><button type="button" style={actionBtnStyle} onClick={() => router.push("/roles/create")}>Create Role</button></div>
          {isLoading ? <InfoCard>Loading Roles...</InfoCard> : null}
          {error ? <ErrorState message={error} onRetry={() => void onRefresh()} /> : null}
          {actionError ? <p role="alert" className="px-3 text-xs" style={{ color: "var(--lag-state-error)" }}>{actionError}</p> : null}
          {!isLoading && !error && roles.length === 0 ? <InfoCard>No Roles yet. Create your first Role.</InfoCard> : null}
          {roles.map((role, index) => (
            <PanelCard
              key={role.id}
              label={role.name}
              slotLabel={role.roleType.slice(0, 2).toUpperCase()}
              subtitle={`${role.roleType} · ${role.status}`}
              selected={selectedRoleId === role.id}
              index={index}
              actions={[{ type: "edit", label: "Edit" }, { type: "delete", label: "Archive" }]}
              onClick={() => onSelectRole(role.id)}
              onAction={(action) => {
                if (action === "edit") {
                  onSelectRole(role.id);
                  setEditingRoleId(role.id);
                } else {
                  void archiveRole(role);
                }
              }}
            />
          ))}
        </div>
        </PanelFrame>
      </PanelStage>

      <AnimatePresence initial={false}>
        {selectedRole ? (
          <PanelStage key={`role-surfaces-${selectedRole.id}`} stageKey={`role-surfaces-${selectedRole.id}`} index={1}>
            <PanelFrame title={selectedRole.name} depth={1}>
              <div className="grid gap-1">
                {ROLE_SURFACES.map((item, index) => (
                  <PanelCard key={item.id} label={item.label} slotLabel={item.slotLabel} selected={surface === item.id} index={index} onClick={() => { setSurface(item.id); setEditingRoleId(null); }} />
                ))}
              </div>
            </PanelFrame>
          </PanelStage>
        ) : null}
      </AnimatePresence>

      <AnimatePresence initial={false} mode="popLayout">
        {selectedRole && (editingRole || surface) ? (
          <PanelStage key={editingRole ? `role-edit-${selectedRole.id}` : `role-${selectedRole.id}-${surface}`} stageKey={editingRole ? `role-edit-${selectedRole.id}` : `role-${selectedRole.id}-${surface}`} index={2}>
            <PanelFrame title={editingRole ? "Edit Role" : ROLE_SURFACES.find(({ id }) => id === surface)?.label ?? "Role"} depth={0}>
              {editingRole ? (
                <RoleEditForm role={selectedRole} onSaved={async () => { await onRefresh(); setEditingRoleId(null); }} onCancel={() => setEditingRoleId(null)} />
              ) : surface === "overview" ? <Overview role={selectedRole} />
                : surface === "relations" ? <RelationsSurface roleId={selectedRole.id} />
                  : <EventsSurface roleId={selectedRole.id} />}
            </PanelFrame>
          </PanelStage>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
