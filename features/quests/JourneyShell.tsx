"use client";

import { useRef, useState } from "react";

import { SUBMENUS_BY_MAIN } from "@/entities/nav";
import type { QuestsSubId } from "@/entities/nav";
import type { PlayerQuestDetail, QuestRoute, QuestRouteStepDetail } from "@/shared/api/types";
import { SAO } from "@/shared/design/tokens";
import PanelCard from "@/shared/ui/PanelCard";
import { PanelFrame } from "@/widgets/right-panels/ui/PanelFrame";
import { GoldRow, InfoCard } from "@/widgets/right-panels/ui/Rows";
import { actionBtnStyle } from "@/widgets/right-panels/ui/styles";
import {
  acceptQuestApi,
  advanceQuestRouteApi,
  cancelQuestApi,
  getMyQuestRouteApi,
  getMyQuestRouteStepApi,
  getPlayerQuestApi,
  getQuestRouteApi,
  manualCheckQuestApi,
  selectQuestRouteApi,
} from "./api";
import {
  canCancelQuest,
  canManualCheckQuest,
  latestAcceptance,
  questAcceptAction,
  questProgressPercent,
  QUEST_STATUS_LABEL,
} from "./model";
import { useJourneyQueries } from "./useJourneyQueries";

const secondaryButton = {
  border: `1px solid ${SAO.color.border.panel}`,
  background: SAO.color.bg.inset,
  color: SAO.color.text.secondary,
  borderRadius: SAO.radius.panel,
  padding: "7px 10px",
  fontSize: "0.68rem",
  letterSpacing: "0.08em",
} as const;

function message(caught: unknown, fallback: string): string {
  return caught instanceof Error ? caught.message : fallback;
}

function ErrorState({ text, retry }: { text: string; retry: () => void }) {
  return (
    <div className="space-y-2 px-3">
      <p role="alert" className="text-xs" style={{ color: SAO.color.action.red }}>{text}</p>
      <button type="button" style={secondaryButton} onClick={retry}>Retry</button>
    </div>
  );
}

type QuestDetailState = {
  code: string | null;
  data: PlayerQuestDetail | null;
  loading: boolean;
  error: string | null;
};

type RouteDetailState = {
  routeId: number | null;
  data: QuestRoute | null;
  step: QuestRouteStepDetail | null;
  loading: boolean;
  error: string | null;
};

export default function JourneyShell({ initialSurface = "current" }: { initialSurface?: QuestsSubId }) {
  const queries = useJourneyQueries(true);
  const [surface, setSurface] = useState<QuestsSubId>(initialSurface);
  const [selectedAcceptanceId, setSelectedAcceptanceId] = useState<number | null>(null);
  const [selectedCatalogCode, setSelectedCatalogCode] = useState<string | null>(null);
  const [selectedRouteId, setSelectedRouteId] = useState<number | null>(null);
  const [questDetail, setQuestDetail] = useState<QuestDetailState>({ code: null, data: null, loading: false, error: null });
  const [routeDetail, setRouteDetail] = useState<RouteDetailState>({ routeId: null, data: null, step: null, loading: false, error: null });
  const [pending, setPending] = useState<string | null>(null);
  const [mutationError, setMutationError] = useState<string | null>(null);
  const mutationLocked = useRef(false);
  const questDetailRequestId = useRef(0);
  const routeDetailRequestId = useRef(0);

  const mineById = new Map(queries.routes.data.mine.map((route) => [route.id, route]));
  const catalogIds = new Set(queries.routes.data.catalog.map((route) => route.id));
  const routes = [
    ...queries.routes.data.catalog.map((route) => mineById.get(route.id) ?? route),
    ...queries.routes.data.mine.filter((route) => !catalogIds.has(route.id)),
  ];
  const selectedAcceptance = queries.current.data.find((item) => item.id === selectedAcceptanceId) ?? null;
  const selectedBlueprint = queries.catalog.data.find((item) => item.code === selectedCatalogCode) ?? null;
  const selectedRoute = routes.find((item) => item.id === selectedRouteId) ?? null;

  const loadQuestDetail = async (code: string, preserve = false) => {
    const requestId = ++questDetailRequestId.current;
    setQuestDetail((previous) => ({
      code,
      data: preserve && previous.code === code ? previous.data : null,
      loading: true,
      error: null,
    }));
    try {
      const data = await getPlayerQuestApi(code);
      if (requestId === questDetailRequestId.current) setQuestDetail({ code, data, loading: false, error: null });
    } catch (caught) {
      if (requestId === questDetailRequestId.current) {
        setQuestDetail((previous) => ({ ...previous, code, loading: false, error: message(caught, "Unable to load Quest detail.") }));
      }
    }
  };

  const loadRouteDetail = async (routeId: number, mine: boolean, preserve = false) => {
    const requestId = ++routeDetailRequestId.current;
    setRouteDetail((previous) => ({
      routeId,
      data: preserve && previous.routeId === routeId ? previous.data : null,
      step: preserve && previous.routeId === routeId ? previous.step : null,
      loading: true,
      error: null,
    }));
    try {
      const data = mine ? await getMyQuestRouteApi(routeId) : await getQuestRouteApi(routeId);
      if (requestId !== routeDetailRequestId.current) return;
      setRouteDetail((previous) => ({ ...previous, routeId, data }));
      const currentStepId = data.playerProgress?.currentStepId;
      const step = currentStepId ? await getMyQuestRouteStepApi(routeId, currentStepId) : null;
      if (requestId === routeDetailRequestId.current) setRouteDetail({ routeId, data, step, loading: false, error: null });
    } catch (caught) {
      if (requestId === routeDetailRequestId.current) {
        setRouteDetail((previous) => ({ ...previous, routeId, loading: false, error: message(caught, "Unable to load Route detail.") }));
      }
    }
  };

  const runMutation = async (key: string, request: () => Promise<unknown>, recover: () => Promise<void>) => {
    if (mutationLocked.current) return;
    mutationLocked.current = true;
    setPending(key);
    setMutationError(null);
    let requestError: unknown = null;
    try {
      await request();
    } catch (caught) {
      requestError = caught;
    }
    try {
      await recover();
    } finally {
      if (requestError) setMutationError(`Request outcome was not confirmed. Server state was reloaded. ${message(requestError, "")}`.trim());
      mutationLocked.current = false;
      setPending(null);
    }
  };

  const recoverQuest = async (code: string) => {
    await Promise.all([queries.current.reload(), queries.catalog.reload()]);
    await loadQuestDetail(code, true);
  };

  const selectRoute = async (route: QuestRoute) => {
    if (!window.confirm(`Select Route ${route.title}?`)) return;
    await runMutation(`select-${route.id}`, () => selectQuestRouteApi(route.id), async () => {
      const latest = await queries.routes.reload();
      await loadRouteDetail(route.id, Boolean(latest?.mine.some((item) => item.id === route.id)), true);
    });
  };

  const advanceRoute = async (route: QuestRoute) => {
    const expectedStepId = route.playerProgress?.currentStepId;
    if (!expectedStepId || !window.confirm("Advance the current Route Step?")) return;
    await runMutation(`advance-${route.id}`, () => advanceQuestRouteApi(route.id, expectedStepId), async () => {
      const latest = await queries.routes.reload();
      await loadRouteDetail(route.id, Boolean(latest?.mine.some((item) => item.id === route.id)), true);
    });
  };

  const renderCurrentList = () => (
    <div className="space-y-3">
      {queries.current.loading && queries.current.data.length === 0 ? <InfoCard>Loading current Quests...</InfoCard> : null}
      {queries.current.error ? <ErrorState text={queries.current.error} retry={() => void queries.current.reload()} /> : null}
      {!queries.current.loading && !queries.current.error && queries.current.data.length === 0 ? <InfoCard>No Quest acceptances yet.</InfoCard> : null}
      {queries.current.data.map((quest, index) => (
        <PanelCard
          key={quest.id}
          label={quest.title}
          slotLabel={quest.status === "GOAL_REACHED" ? "GR" : quest.status.slice(0, 2)}
          subtitle={`${QUEST_STATUS_LABEL[quest.status]} · ${quest.progressValue}/${quest.targetValue}`}
          selected={selectedAcceptanceId === quest.id}
          index={index}
          onClick={() => {
            setSelectedAcceptanceId(quest.id);
            void loadQuestDetail(quest.code);
          }}
        />
      ))}
    </div>
  );

  const renderCatalogList = () => (
    <div className="space-y-3">
      {queries.catalog.loading && queries.catalog.data.length === 0 ? <InfoCard>Loading Quest catalog...</InfoCard> : null}
      {queries.catalog.error ? <ErrorState text={queries.catalog.error} retry={() => void queries.catalog.reload()} /> : null}
      {!queries.catalog.loading && !queries.catalog.error && queries.catalog.data.length === 0 ? <InfoCard>No active Quest blueprints.</InfoCard> : null}
      {queries.catalog.data.map((quest, index) => {
        const acceptance = latestAcceptance(queries.current.data, quest.code);
        return (
          <PanelCard
            key={quest.code}
            label={quest.title}
            slotLabel={(quest.semanticCategory ?? quest.category ?? "QU").slice(0, 2)}
            subtitle={acceptance ? QUEST_STATUS_LABEL[acceptance.status] : `${quest.targetType} × ${quest.targetValue}`}
            selected={selectedCatalogCode === quest.code}
            index={index}
            onClick={() => {
              setSelectedCatalogCode(quest.code);
              void loadQuestDetail(quest.code);
            }}
          />
        );
      })}
    </div>
  );

  const renderRouteList = () => (
    <div className="space-y-3">
      {queries.routes.loading && routes.length === 0 ? <InfoCard>Loading Quest Routes...</InfoCard> : null}
      {queries.routes.error ? <ErrorState text={queries.routes.error} retry={() => void queries.routes.reload()} /> : null}
      {!queries.routes.loading && !queries.routes.error && routes.length === 0 ? <InfoCard>No active Quest Routes.</InfoCard> : null}
      {routes.map((route, index) => (
        <PanelCard
          key={route.id}
          label={route.title}
          slotLabel={route.playerProgress?.status === "COMPLETED" ? "CP" : route.playerProgress ? "IP" : "NS"}
          subtitle={route.playerProgress ? route.playerProgress.status : "Not selected"}
          selected={selectedRouteId === route.id}
          index={index}
          onClick={() => {
            setSelectedRouteId(route.id);
            void loadRouteDetail(route.id, Boolean(route.playerProgress));
          }}
        />
      ))}
    </div>
  );

  const questDetailFor = (code: string) => questDetail.code === code ? questDetail : null;

  const renderCurrentDetail = () => {
    if (!selectedAcceptance) return <InfoCard>Select a Quest acceptance.</InfoCard>;
    const detail = questDetailFor(selectedAcceptance.code);
    if (detail?.loading && !detail.data) return <InfoCard>Loading Quest detail...</InfoCard>;
    if (detail?.error && !detail.data) return <ErrorState text={detail.error} retry={() => void loadQuestDetail(selectedAcceptance.code)} />;
    return (
      <div className="space-y-3 px-3">
        {detail?.error ? <p role="alert" className="text-xs" style={{ color: SAO.color.action.red }}>{detail.error}</p> : null}
        {mutationError ? <p role="alert" className="text-xs" style={{ color: SAO.color.action.red }}>{mutationError}</p> : null}
        <InfoCard>{detail?.data?.descriptionMd ?? selectedAcceptance.descriptionMd}</InfoCard>
        <GoldRow>Status: {QUEST_STATUS_LABEL[selectedAcceptance.status]}</GoldRow>
        <GoldRow>Progress: {selectedAcceptance.progressValue} / {selectedAcceptance.targetValue} ({questProgressPercent(selectedAcceptance)}%)</GoldRow>
        <GoldRow>Completion policy: {selectedAcceptance.completionPolicy}</GoldRow>
        {selectedAcceptance.status === "GOAL_REACHED" ? <InfoCard>Goal reached. This is not the same as Completed.</InfoCard> : null}
        <div className="flex flex-wrap gap-2">
          {canManualCheckQuest(selectedAcceptance) ? (
            <button type="button" disabled={Boolean(pending)} style={secondaryButton} onClick={() => void runMutation(`manual-${selectedAcceptance.code}`, () => manualCheckQuestApi(selectedAcceptance.code), () => recoverQuest(selectedAcceptance.code))}>Manual Check</button>
          ) : null}
          {canCancelQuest(selectedAcceptance) ? (
            <button type="button" disabled={Boolean(pending)} style={secondaryButton} onClick={() => {
              if (window.confirm(`Cancel Quest ${selectedAcceptance.title}?`)) void runMutation(`cancel-${selectedAcceptance.code}`, () => cancelQuestApi(selectedAcceptance.code), () => recoverQuest(selectedAcceptance.code));
            }}>Cancel Quest</button>
          ) : null}
        </div>
      </div>
    );
  };

  const renderCatalogDetail = () => {
    if (!selectedBlueprint) return <InfoCard>Select a Quest blueprint.</InfoCard>;
    const detail = questDetailFor(selectedBlueprint.code);
    const acceptance = latestAcceptance(queries.current.data, selectedBlueprint.code);
    const acceptanceKnown = !queries.current.loading && !queries.current.error;
    const acceptAction = acceptanceKnown ? questAcceptAction(selectedBlueprint, acceptance) : null;
    const acceptLabel = acceptAction === "accept-again" ? "Accept Again" : "Accept Quest";
    if (detail?.loading && !detail.data) return <InfoCard>Loading Quest detail...</InfoCard>;
    if (detail?.error && !detail.data) return <ErrorState text={detail.error} retry={() => void loadQuestDetail(selectedBlueprint.code)} />;
    return (
      <div className="space-y-3 px-3">
        {mutationError ? <p role="alert" className="text-xs" style={{ color: SAO.color.action.red }}>{mutationError}</p> : null}
        <InfoCard>{detail?.data?.descriptionMd ?? selectedBlueprint.descriptionMd}</InfoCard>
        <GoldRow>Target: {selectedBlueprint.targetType} × {selectedBlueprint.targetValue}</GoldRow>
        <GoldRow>Completion policy: {selectedBlueprint.completionPolicy}</GoldRow>
        <GoldRow>Repeat: {selectedBlueprint.repeatPolicy ?? selectedBlueprint.repeatRule}</GoldRow>
        <GoldRow>Reward profile: {selectedBlueprint.rewardProfileCode ?? "None"}</GoldRow>
        {acceptance ? <GoldRow>Acceptance: {QUEST_STATUS_LABEL[acceptance.status]}</GoldRow> : null}
        {!acceptanceKnown ? <InfoCard>Acceptance state unavailable. Accept is disabled until Current reloads.</InfoCard> : null}
        {acceptAction ? (
          <button type="button" disabled={Boolean(pending)} style={actionBtnStyle} onClick={() => {
            if (window.confirm(`${acceptLabel} ${selectedBlueprint.title}?`)) void runMutation(`accept-${selectedBlueprint.code}`, () => acceptQuestApi(selectedBlueprint.code), () => recoverQuest(selectedBlueprint.code));
          }}>{acceptLabel}</button>
        ) : null}
      </div>
    );
  };

  const renderRouteDetail = () => {
    if (!selectedRoute) return <InfoCard>Select a Quest Route.</InfoCard>;
    const detailState = routeDetail.routeId === selectedRoute.id ? routeDetail : null;
    const route = detailState?.data ?? selectedRoute;
    if (detailState?.loading && !detailState.data) return <InfoCard>Loading Route detail...</InfoCard>;
    if (detailState?.error && !detailState.data) return <ErrorState text={detailState.error} retry={() => void loadRouteDetail(selectedRoute.id, Boolean(selectedRoute.playerProgress))} />;
    const progress = route.playerProgress;
    const currentStep = progress ? route.steps.find((step) => step.id === progress.currentStepId) ?? null : null;
    const canAdvance = progress?.status === "IN_PROGRESS" && currentStep?.state === "READY_TO_ADVANCE";
    return (
      <div className="space-y-3 px-3">
        {detailState?.error ? <p role="alert" className="text-xs" style={{ color: SAO.color.action.red }}>{detailState.error}</p> : null}
        {mutationError ? <p role="alert" className="text-xs" style={{ color: SAO.color.action.red }}>{mutationError}</p> : null}
        <InfoCard>{route.description ?? "No Route description."}</InfoCard>
        <GoldRow>Status: {progress?.status ?? "NOT_SELECTED"}</GoldRow>
        {progress ? <GoldRow>Current Step ID: {progress.currentStepId}</GoldRow> : null}
        <section className="space-y-2" aria-label="Ordered Route Steps">
          {route.steps.slice().sort((left, right) => left.stepOrder - right.stepOrder).map((step) => (
            <div key={step.id} className="rounded-sm px-3 py-2" style={{ background: SAO.color.bg.inset, border: `1px solid ${step.id === progress?.currentStepId ? SAO.color.border.gold : SAO.color.border.panel}` }}>
              <p className="text-sm font-semibold" style={{ color: SAO.color.text.primary }}>{step.stepOrder}. {step.title}</p>
              <p className="text-xs" style={{ color: SAO.color.text.label }}>{step.state} · criteria {step.criteriaSatisfied ? "satisfied" : "not satisfied"}</p>
              <p className="text-xs" style={{ color: SAO.color.text.secondary }}>{step.description ?? "No Step description."}</p>
              {step.questLinks.map((link) => {
                const acceptedQuest = queries.current.data.find((quest) => quest.questId === link.questId);
                return <p key={link.questId} className="text-xs" style={{ color: SAO.color.text.label }}>Requirement: {acceptedQuest?.title ?? `Quest #${link.questId}`} · {link.requirementType}</p>;
              })}
            </div>
          ))}
        </section>
        {detailState?.step ? <InfoCard>Current Step Detail: {detailState.step.step.title} · {detailState.step.step.state}</InfoCard> : null}
        {!progress ? <button type="button" disabled={Boolean(pending)} style={actionBtnStyle} onClick={() => void selectRoute(route)}>Select Route</button> : null}
        {canAdvance ? <button type="button" disabled={Boolean(pending)} style={actionBtnStyle} onClick={() => void advanceRoute(route)}>Advance Current Step</button> : null}
        {progress?.status === "COMPLETED" ? <InfoCard>Route completed by an explicit final Step advance.</InfoCard> : null}
      </div>
    );
  };

  return (
    <div className="relative flex min-w-0 w-fit flex-row flex-nowrap items-center gap-3" data-testid="journey-shell">
      <PanelFrame title="Journey" depth={2}>
        <div className="grid gap-1">
          {SUBMENUS_BY_MAIN.quests.map((item, index) => (
            <PanelCard key={item.id} label={item.label} slotLabel={item.slotLabel} selected={surface === item.id} index={index} onClick={() => { setSurface(item.id as QuestsSubId); setMutationError(null); }} />
          ))}
        </div>
      </PanelFrame>

      <PanelFrame title={SUBMENUS_BY_MAIN.quests.find((item) => item.id === surface)?.label ?? "Journey"} depth={1}>
        {surface === "current" ? renderCurrentList() : surface === "catalog" ? renderCatalogList() : renderRouteList()}
      </PanelFrame>

      <PanelFrame title={surface === "current" ? selectedAcceptance?.title ?? "Quest Detail" : surface === "catalog" ? selectedBlueprint?.title ?? "Catalog Detail" : selectedRoute?.title ?? "Route Detail"} depth={0}>
        {surface === "current" ? renderCurrentDetail() : surface === "catalog" ? renderCatalogDetail() : renderRouteDetail()}
      </PanelFrame>
    </div>
  );
}
