"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { ApiError } from "@/shared/api/client";
import { assertAdminQuestAcceptanceIdentity } from "../api/quest.query";
import type { AdminQuestDataSource } from "../api/quest.source";
import type {
  AdminQuestAcceptance,
  AdminQuestAcceptanceStatus,
  AdminQuestBlueprint,
  AdminQuestDefinition,
} from "./model";

type Intent =
  | { kind: "index" }
  | { kind: "definition"; questCode: string }
  | { kind: "acceptances"; questCode: string; status: AdminQuestAcceptanceStatus | "" }
  | { kind: "acceptance"; questCode: string; acceptanceId: number };

type QuestLoadError = { kind: Intent["kind"]; status: number | null; message: string };

function ensureAcceptanceListMatches(acceptances: AdminQuestAcceptance[], questCode: string, status: AdminQuestAcceptanceStatus | "" = "") {
  if (acceptances.some((acceptance) => acceptance.code !== questCode)) {
    throw new Error("Quest acceptance list contained another Quest code.");
  }
  if (status && acceptances.some((acceptance) => acceptance.status !== status)) {
    throw new Error("Quest acceptance list contained another Acceptance status.");
  }
}

export function useQuestRuntimeStatus(enabled: boolean, dataSource: AdminQuestDataSource) {
  const [catalog, setCatalog] = useState<AdminQuestBlueprint[]>([]);
  const [definitions, setDefinitions] = useState<AdminQuestDefinition[]>([]);
  const [definition, setDefinition] = useState<AdminQuestDefinition | null>(null);
  const [acceptances, setAcceptances] = useState<AdminQuestAcceptance[]>([]);
  const [acceptance, setAcceptance] = useState<AdminQuestAcceptance | null>(null);
  const [selectedCode, setSelectedCode] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<AdminQuestAcceptanceStatus | "">("");
  const [indexLoaded, setIndexLoaded] = useState(false);
  const [loading, setLoading] = useState<Intent["kind"] | null>(null);
  const [error, setError] = useState<QuestLoadError | null>(null);
  const [loadedAt, setLoadedAt] = useState<Date | null>(null);
  const requestId = useRef(0);
  const lastIntent = useRef<Intent | null>(null);
  const selectedCodeRef = useRef(selectedCode);
  const acceptanceIdRef = useRef(acceptance?.id ?? null);
  const statusFilterRef = useRef(statusFilter);
  selectedCodeRef.current = selectedCode;
  acceptanceIdRef.current = acceptance?.id ?? null;
  statusFilterRef.current = statusFilter;

  const run = useCallback(async (intent: Intent) => {
    const current = ++requestId.current;
    lastIntent.current = intent;
    setLoading(intent.kind);
    setError(null);

    if (intent.kind === "index") {
      setCatalog([]);
      setDefinitions([]);
      setDefinition(null);
      setAcceptances([]);
      setAcceptance(null);
      setSelectedCode(null);
      setStatusFilter("");
      setIndexLoaded(false);
      setLoadedAt(null);
    } else if (intent.kind === "definition") {
      setSelectedCode(intent.questCode);
      setStatusFilter("");
      setDefinition(null);
      setAcceptances([]);
      setAcceptance(null);
    } else if (intent.kind === "acceptances") {
      setStatusFilter(intent.status);
      setAcceptances([]);
      setAcceptance(null);
    } else {
      setAcceptance(null);
    }

    try {
      if (intent.kind === "index") {
        const [catalogResponse, definitionsResponse] = await Promise.all([dataSource.getCatalog(), dataSource.getDefinitions()]);
        if (current === requestId.current) {
          setCatalog(catalogResponse.blueprints);
          setDefinitions(definitionsResponse.definitions);
          setIndexLoaded(true);
          setLoadedAt(new Date());
        }
      } else if (intent.kind === "definition") {
        const [nextDefinition, acceptanceResponse] = await Promise.all([
          dataSource.getDefinition(intent.questCode),
          dataSource.getAcceptances(intent.questCode),
        ]);
        if (nextDefinition.code !== intent.questCode) throw new Error("Quest definition response did not match the requested Quest code.");
        ensureAcceptanceListMatches(acceptanceResponse.acceptances, intent.questCode);
        if (current === requestId.current) {
          setDefinition(nextDefinition);
          setAcceptances(acceptanceResponse.acceptances);
          setLoadedAt(new Date());
        }
      } else if (intent.kind === "acceptances") {
        const response = await dataSource.getAcceptances(intent.questCode, intent.status);
        ensureAcceptanceListMatches(response.acceptances, intent.questCode, intent.status);
        if (current === requestId.current) {
          setAcceptances(response.acceptances);
          setLoadedAt(new Date());
        }
      } else {
        const nextAcceptance = assertAdminQuestAcceptanceIdentity(
          await dataSource.getAcceptance(intent.acceptanceId),
          intent.acceptanceId,
          intent.questCode,
        );
        if (current === requestId.current) {
          setAcceptance(nextAcceptance);
          setLoadedAt(new Date());
        }
      }
    } catch (caught) {
      if (current === requestId.current) {
        const status = caught instanceof ApiError ? caught.status : null;
        if (status === 401 || status === 403) {
          setCatalog([]);
          setDefinitions([]);
          setDefinition(null);
          setAcceptances([]);
          setAcceptance(null);
          setSelectedCode(null);
          setIndexLoaded(false);
          setLoadedAt(null);
        }
        setError({ kind: intent.kind, status, message: caught instanceof Error ? caught.message : "Unable to load Quest runtime status." });
      }
    } finally {
      if (current === requestId.current) setLoading(null);
    }
  }, [dataSource]);

  const applyCanonicalAcceptance = useCallback((nextAcceptance: AdminQuestAcceptance) => {
    if (!selectedCodeRef.current || acceptanceIdRef.current !== nextAcceptance.id) {
      throw new Error("Quest acceptance reconciliation no longer matches the selected Acceptance.");
    }
    assertAdminQuestAcceptanceIdentity(nextAcceptance, acceptanceIdRef.current, selectedCodeRef.current);
    setAcceptance(nextAcceptance);
    setAcceptances((current) => statusFilterRef.current && nextAcceptance.status !== statusFilterRef.current
      ? current.filter((item) => item.id !== nextAcceptance.id)
      : current.map((item) => item.id === nextAcceptance.id ? nextAcceptance : item));
    setLoadedAt(new Date());
  }, []);

  useEffect(() => {
    if (enabled) void run({ kind: "index" });
    else {
      requestId.current += 1;
      lastIntent.current = null;
      setCatalog([]);
      setDefinitions([]);
      setDefinition(null);
      setAcceptances([]);
      setAcceptance(null);
      setSelectedCode(null);
      setStatusFilter("");
      setIndexLoaded(false);
      setLoading(null);
      setError(null);
      setLoadedAt(null);
    }
    return () => { requestId.current += 1; };
  }, [enabled, run]);

  return {
    catalog,
    definitions,
    definition,
    acceptances,
    acceptance,
    selectedCode,
    statusFilter,
    indexLoaded,
    loading,
    error,
    loadedAt,
    selectDefinition: (questCode: string) => run({ kind: "definition", questCode }),
    filterAcceptances: (status: AdminQuestAcceptanceStatus | "") => selectedCode
      ? run({ kind: "acceptances", questCode: selectedCode, status })
      : Promise.resolve(),
    openAcceptance: (acceptanceId: number) => selectedCode
      ? run({ kind: "acceptance", questCode: selectedCode, acceptanceId })
      : Promise.resolve(),
    retry: () => lastIntent.current ? run(lastIntent.current) : Promise.resolve(),
    closeAcceptance: () => {
      setAcceptance(null);
      setError((current) => current?.kind === "acceptance" ? null : current);
    },
    applyCanonicalAcceptance,
  };
}
