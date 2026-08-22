"use client";

import { useRef, useState } from "react";
import { AnimatePresence } from "framer-motion";

import { SUBMENUS_BY_MAIN } from "@/entities/nav";
import type { QuestsSubId } from "@/entities/nav";
import type {
  PlayerQuestDetail,
  QuestAcceptance,
  QuestRoute,
  QuestRouteStepDetail,
} from "@/shared/api/types";
import { requestStageFocus } from "@/shared/hooks/useStageCamera";
import PanelStage from "@/shared/ui/PanelStage";
import { BackButton, PanelFrame } from "@/widgets/right-panels/ui/PanelFrame";
import { InfoCard } from "@/widgets/right-panels/ui/Rows";
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

const SURFACE_COPY: Record<QuestsSubId, string> = {
  current: "Review accepted Quests and their canonical progress.",
  catalog: "Explore available Quest blueprints and acceptance rules.",
  routes: "Choose and advance independent long-term directions.",
};

function message(caught: unknown, fallback: string): string {
  return caught instanceof Error ? caught.message : fallback;
}

function humanize(value: string) {
  return value.replaceAll("_", " ");
}

function ErrorState({ text, retry }: { text: string; retry: () => void }) {
  return (
    <div className="lag-journey-state">
      <p role="alert" className="lag-journey-feedback" data-state="error">Load failed: {text}</p>
      <button type="button" className="lag-journey-button" onClick={retry}>Retry</button>
    </div>
  );
}

function ProgressBar({ label, percent, valueText }: { label: string; percent: number; valueText: string }) {
  return (
    <div className="lag-journey-progress">
      <div><span>{label}</span><strong>{valueText}</strong></div>
      <div role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent} aria-valuetext={valueText}>
        <span style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}

function JourneyCard({
  badge,
  badges = [],
  progress,
  selected,
  supporting,
  title,
  onClick,
}: {
  badge: string;
  badges?: string[];
  progress?: { percent: number; valueText: string };
  selected: boolean;
  supporting: string;
  title: string;
  onClick: () => void;
}) {
  return (
    <button type="button" className="lag-journey-card" data-selected={selected} aria-pressed={selected} onClick={onClick}>
      <span className="lag-journey-card-mark" aria-hidden>{badge}</span>
      <span className="lag-journey-card-copy">
        <strong>{title}</strong>
        <span>{supporting}</span>
        {badges.length > 0 ? <span className="lag-journey-badges">{badges.map((item) => <span key={item}>{item}</span>)}</span> : null}
        {progress ? <ProgressBar label={`${title} progress`} percent={progress.percent} valueText={progress.valueText} /> : null}
      </span>
      <span className="lag-journey-card-arrow" aria-hidden>→</span>
    </button>
  );
}

function DetailRow({ name, value }: { name: string; value: React.ReactNode }) {
  return <div className="lag-journey-detail-row"><dt>{name}</dt><dd>{value}</dd></div>;
}

function DetailSection({ children, title }: { children: React.ReactNode; title: string }) {
  return <section className="lag-journey-detail-section"><h4>{title}</h4><dl>{children}</dl></section>;
}

function StatusBadge({ children, state }: { children: React.ReactNode; state: string }) {
  return <span className="lag-journey-status" data-state={state}>{children}</span>;
}

function orderedSteps(route: QuestRoute) {
  return route.steps.slice().sort((left, right) => left.stepOrder - right.stepOrder);
}

function currentStepPosition(route: QuestRoute) {
  const currentStepId = route.playerProgress?.currentStepId;
  if (!currentStepId) return null;
  const steps = orderedSteps(route);
  const index = steps.findIndex(({ id }) => id === currentStepId);
  return index < 0 ? null : `Step ${index + 1} of ${steps.length}`;
}

function RouteThread({ route, quests }: { route: QuestRoute; quests: QuestAcceptance[] }) {
  const steps = orderedSteps(route);
  return (
    <section className="lag-route-thread" aria-label="Ordered Route Steps">
      <div className="lag-route-thread-track">
        <ol>
          {steps.map((step) => {
            const current = step.id === route.playerProgress?.currentStepId;
            return (
              <li key={step.id} data-state={step.state} data-current={current}>
                <span className="lag-route-node" aria-hidden>{step.stepOrder}</span>
                <article>
                  <div>
                    <strong>{step.stepOrder}. {step.title}</strong>
                    <StatusBadge state={step.state}>{humanize(step.state)}{current ? " · Current step" : ""}</StatusBadge>
                  </div>
                  <p>{step.description ?? "No Step description."}</p>
                  <p>Criteria: {step.criteriaSatisfied ? "Satisfied" : "Not satisfied"}</p>
                  {step.questLinks.length > 0 ? (
                    <ul aria-label={`Quest requirements for ${step.title}`}>
                      {step.questLinks.map((link) => {
                        const quest = quests.find((item) => item.questId === link.questId);
                        return <li key={link.questId}>Requirement: {quest?.title ?? `Quest #${link.questId}`} · {humanize(link.requirementType)}</li>;
                      })}
                    </ul>
                  ) : <p>No linked Quest requirements.</p>}
                </article>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
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

export default function JourneyShell({ initialSurface = null }: { initialSurface?: QuestsSubId | null }) {
  const queries = useJourneyQueries(true);
  const [surface, setSurface] = useState<QuestsSubId | null>(initialSurface);
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

  const clearDetail = () => {
    setSelectedAcceptanceId(null);
    setSelectedCatalogCode(null);
    setSelectedRouteId(null);
    setQuestDetail({ code: null, data: null, loading: false, error: null });
    setRouteDetail({ routeId: null, data: null, step: null, loading: false, error: null });
    setMutationError(null);
    questDetailRequestId.current += 1;
    routeDetailRequestId.current += 1;
  };

  const selectSurface = (next: QuestsSubId) => {
    clearDetail();
    setSurface(next);
  };

  const closeDetail = () => {
    clearDetail();
    requestStageFocus("journey-list", "nearest");
  };

  const closeList = () => {
    clearDetail();
    setSurface(null);
    requestStageFocus("journey-root", "nearest");
  };

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
    <div className="lag-journey-list">
      {queries.current.loading && queries.current.data.length === 0 ? <InfoCard>Loading current Quests...</InfoCard> : null}
      {queries.current.error ? <ErrorState text={queries.current.error} retry={() => void queries.current.reload()} /> : null}
      {!queries.current.loading && !queries.current.error && queries.current.data.length === 0 ? <InfoCard>No Quest acceptances yet.</InfoCard> : null}
      {queries.current.data.map((quest) => {
        const percent = questProgressPercent(quest);
        return (
          <JourneyCard
            key={quest.id}
            badge={quest.status === "GOAL_REACHED" ? "GR" : quest.status.slice(0, 2)}
            title={quest.title}
            supporting={`${QUEST_STATUS_LABEL[quest.status]} · ${quest.progressValue}/${quest.targetValue}`}
            badges={[QUEST_STATUS_LABEL[quest.status], humanize(quest.completionPolicy)]}
            progress={{ percent, valueText: `${quest.progressValue} / ${quest.targetValue} (${percent}%)` }}
            selected={selectedAcceptanceId === quest.id}
            onClick={() => {
              setSelectedAcceptanceId(quest.id);
              void loadQuestDetail(quest.code);
            }}
          />
        );
      })}
    </div>
  );

  const renderCatalogList = () => (
    <div className="lag-journey-list">
      {queries.catalog.loading && queries.catalog.data.length === 0 ? <InfoCard>Loading Quest catalog...</InfoCard> : null}
      {queries.catalog.error ? <ErrorState text={queries.catalog.error} retry={() => void queries.catalog.reload()} /> : null}
      {!queries.catalog.loading && !queries.catalog.error && queries.catalog.data.length === 0 ? <InfoCard>No active Quest blueprints.</InfoCard> : null}
      {queries.catalog.data.map((quest) => {
        const acceptance = latestAcceptance(queries.current.data, quest.code);
        const category = quest.semanticCategory ?? quest.category;
        return (
          <JourneyCard
            key={quest.code}
            badge={(category ?? "QU").slice(0, 2)}
            title={quest.title}
            supporting={acceptance ? `Acceptance: ${QUEST_STATUS_LABEL[acceptance.status]}` : `${humanize(quest.targetType)} × ${quest.targetValue}`}
            badges={[...(category ? [humanize(category)] : []), humanize(quest.completionPolicy), humanize(quest.repeatPolicy ?? quest.repeatRule)]}
            selected={selectedCatalogCode === quest.code}
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
    <div className="lag-journey-list">
      {queries.routes.loading && routes.length === 0 ? <InfoCard>Loading Quest Routes...</InfoCard> : null}
      {queries.routes.error ? <ErrorState text={queries.routes.error} retry={() => void queries.routes.reload()} /> : null}
      {!queries.routes.loading && !queries.routes.error && routes.length === 0 ? <InfoCard>No active Quest Routes.</InfoCard> : null}
      {routes.map((route) => {
        const position = currentStepPosition(route);
        const status = route.playerProgress?.status ?? "NOT_SELECTED";
        return (
          <JourneyCard
            key={route.id}
            badge={status === "COMPLETED" ? "CP" : route.playerProgress ? "IP" : "NS"}
            title={route.title}
            supporting={[humanize(status), position].filter(Boolean).join(" · ")}
            badges={[route.playerProgress ? "Selected" : "Not selected", `${route.steps.length} steps`]}
            selected={selectedRouteId === route.id}
            onClick={() => {
              setSelectedRouteId(route.id);
              void loadRouteDetail(route.id, Boolean(route.playerProgress));
            }}
          />
        );
      })}
    </div>
  );

  const questDetailFor = (code: string) => questDetail.code === code ? questDetail : null;

  const renderCurrentDetail = () => {
    if (!selectedAcceptance) return null;
    const detail = questDetailFor(selectedAcceptance.code);
    if (detail?.loading && !detail.data) return <InfoCard>Loading Quest detail...</InfoCard>;
    if (detail?.error && !detail.data) return <ErrorState text={detail.error} retry={() => void loadQuestDetail(selectedAcceptance.code)} />;
    const percent = questProgressPercent(selectedAcceptance);
    return (
      <article className="lag-journey-detail">
        {detail?.error ? <p role="alert" className="lag-journey-feedback" data-state="error">{detail.error}</p> : null}
        {mutationError ? <p role="alert" className="lag-journey-feedback" data-state="error">{mutationError}</p> : null}
        <header className="lag-journey-detail-hero">
          <span>Current Quest</span>
          <h4>{selectedAcceptance.title}</h4>
          <StatusBadge state={selectedAcceptance.status}>Status: {QUEST_STATUS_LABEL[selectedAcceptance.status]}</StatusBadge>
          <p>{detail?.data?.descriptionMd ?? selectedAcceptance.descriptionMd}</p>
        </header>
        <DetailSection title="Progress">
          <div className="lag-journey-detail-progress"><ProgressBar label="Quest progress" percent={percent} valueText={`${selectedAcceptance.progressValue} / ${selectedAcceptance.targetValue} (${percent}%)`} /></div>
        </DetailSection>
        <DetailSection title="Completion rule">
          <DetailRow name="Completion policy" value={humanize(selectedAcceptance.completionPolicy)} />
          <DetailRow name="Progress source" value={selectedAcceptance.progressSource ? humanize(selectedAcceptance.progressSource) : "Not recorded"} />
          <DetailRow name="Repeat" value={humanize(selectedAcceptance.repeatPolicy ?? selectedAcceptance.repeatRule)} />
        </DetailSection>
        {selectedAcceptance.status === "GOAL_REACHED" ? <p className="lag-journey-feedback" data-state="warning">Goal reached. This is not the same as Completed.</p> : null}
        {(canManualCheckQuest(selectedAcceptance) || canCancelQuest(selectedAcceptance)) ? (
          <section className="lag-journey-actions" aria-label="Available Quest actions">
            {canManualCheckQuest(selectedAcceptance) ? (
              <button type="button" className="lag-journey-action" disabled={Boolean(pending)} onClick={() => void runMutation(`manual-${selectedAcceptance.code}`, () => manualCheckQuestApi(selectedAcceptance.code), () => recoverQuest(selectedAcceptance.code))}>Manual Check</button>
            ) : null}
            {canCancelQuest(selectedAcceptance) ? (
              <button type="button" className="lag-journey-button" data-variant="destructive" disabled={Boolean(pending)} onClick={() => {
                if (window.confirm(`Cancel Quest ${selectedAcceptance.title}?`)) void runMutation(`cancel-${selectedAcceptance.code}`, () => cancelQuestApi(selectedAcceptance.code), () => recoverQuest(selectedAcceptance.code));
              }}>Cancel Quest</button>
            ) : null}
          </section>
        ) : null}
      </article>
    );
  };

  const renderCatalogDetail = () => {
    if (!selectedBlueprint) return null;
    const detail = questDetailFor(selectedBlueprint.code);
    const acceptance = latestAcceptance(queries.current.data, selectedBlueprint.code);
    const acceptanceKnown = !queries.current.loading && !queries.current.error;
    const acceptAction = acceptanceKnown ? questAcceptAction(selectedBlueprint, acceptance) : null;
    const acceptLabel = acceptAction === "accept-again" ? "Accept Again" : "Accept Quest";
    if (detail?.loading && !detail.data) return <InfoCard>Loading Quest detail...</InfoCard>;
    if (detail?.error && !detail.data) return <ErrorState text={detail.error} retry={() => void loadQuestDetail(selectedBlueprint.code)} />;
    return (
      <article className="lag-journey-detail">
        {mutationError ? <p role="alert" className="lag-journey-feedback" data-state="error">{mutationError}</p> : null}
        <header className="lag-journey-detail-hero">
          <span>Quest Blueprint</span>
          <h4>{selectedBlueprint.title}</h4>
          {acceptance ? <StatusBadge state={acceptance.status}>Acceptance: {QUEST_STATUS_LABEL[acceptance.status]}</StatusBadge> : null}
          <p>{detail?.data?.descriptionMd ?? selectedBlueprint.descriptionMd}</p>
        </header>
        <DetailSection title="Target and completion">
          <DetailRow name="Target" value={`${humanize(selectedBlueprint.targetType)} × ${selectedBlueprint.targetValue}`} />
          <DetailRow name="Completion policy" value={humanize(selectedBlueprint.completionPolicy)} />
          <DetailRow name="Repeat" value={humanize(selectedBlueprint.repeatPolicy ?? selectedBlueprint.repeatRule)} />
          <DetailRow name="Reward profile" value={selectedBlueprint.rewardProfileCode ?? "None"} />
        </DetailSection>
        {!acceptanceKnown ? <p className="lag-journey-feedback" data-state="warning">Acceptance state unavailable. Accept is disabled until Current reloads.</p> : null}
        {acceptAction ? (
          <button type="button" className="lag-journey-action" disabled={Boolean(pending)} onClick={() => {
            if (window.confirm(`${acceptLabel} ${selectedBlueprint.title}?`)) void runMutation(`accept-${selectedBlueprint.code}`, () => acceptQuestApi(selectedBlueprint.code), () => recoverQuest(selectedBlueprint.code));
          }}>{acceptLabel}</button>
        ) : null}
      </article>
    );
  };

  const renderRouteDetail = () => {
    if (!selectedRoute) return null;
    const detailState = routeDetail.routeId === selectedRoute.id ? routeDetail : null;
    const route = detailState?.data ?? selectedRoute;
    if (detailState?.loading && !detailState.data) return <InfoCard>Loading Route detail...</InfoCard>;
    if (detailState?.error && !detailState.data) return <ErrorState text={detailState.error} retry={() => void loadRouteDetail(selectedRoute.id, Boolean(selectedRoute.playerProgress))} />;
    const progress = route.playerProgress;
    const steps = orderedSteps(route);
    const currentStep = progress ? steps.find((step) => step.id === progress.currentStepId) ?? null : null;
    const canAdvance = progress?.status === "IN_PROGRESS" && currentStep?.state === "READY_TO_ADVANCE";
    const completedSteps = steps.filter((step) => step.state === "COMPLETED").length;
    const percent = steps.length > 0 ? Math.round((completedSteps / steps.length) * 100) : null;
    return (
      <article className="lag-journey-detail lag-route-detail">
        {detailState?.error ? <p role="alert" className="lag-journey-feedback" data-state="error">{detailState.error}</p> : null}
        {mutationError ? <p role="alert" className="lag-journey-feedback" data-state="error">{mutationError}</p> : null}
        <header className="lag-journey-detail-hero">
          <span>Quest Route · Long-term direction</span>
          <h4>{route.title}</h4>
          <StatusBadge state={progress?.status ?? "NOT_SELECTED"}>Status: {progress?.status ?? "NOT_SELECTED"}</StatusBadge>
          <p>{route.description ?? "No Route description."}</p>
        </header>
        {progress ? (
          <DetailSection title="Route progress">
            <DetailRow name="Current step" value={`${currentStepPosition(route) ?? `Step #${progress.currentStepId}`} · ID ${progress.currentStepId}`} />
            {percent !== null ? <div className="lag-journey-detail-progress"><ProgressBar label="Completed Route steps" percent={percent} valueText={`${completedSteps} / ${steps.length} completed (${percent}%)`} /></div> : null}
          </DetailSection>
        ) : null}
        <RouteThread route={route} quests={queries.current.data} />
        {detailState?.step ? <InfoCard>Current Step Detail: {detailState.step.step.title} · {detailState.step.step.state}</InfoCard> : null}
        <section className="lag-journey-actions" aria-label="Available Route actions">
          {!progress ? <button type="button" className="lag-journey-action" disabled={Boolean(pending)} onClick={() => void selectRoute(route)}>Select Route</button> : null}
          {canAdvance ? <button type="button" className="lag-journey-action" disabled={Boolean(pending)} onClick={() => void advanceRoute(route)}>Advance Current Step</button> : null}
        </section>
        {progress?.status === "COMPLETED" ? <p className="lag-journey-feedback" data-state="success">✓ Route completed by an explicit final Step advance.</p> : null}
      </article>
    );
  };

  const detailContentKey = surface === "current" && selectedAcceptance
    ? `journey-current-detail-${selectedAcceptance.id}`
    : surface === "catalog" && selectedBlueprint
      ? `journey-catalog-detail-${selectedBlueprint.code}`
      : surface === "routes" && selectedRoute
        ? `journey-route-detail-${selectedRoute.id}`
        : null;

  const listTitle = SUBMENUS_BY_MAIN.quests.find((item) => item.id === surface)?.label ?? "Journey";
  const detailTitle = surface === "current" ? "Quest Detail" : surface === "catalog" ? "Blueprint Detail" : "Route Detail";

  return (
    <div className="lag-panel-rail lag-journey-shell relative" data-testid="journey-shell">
      <PanelStage stageKey="journey-root">
        <PanelFrame title="Journey / Quest Route" depth={2}>
          <div className="lag-journey-root">
            <header>
              <p className="lag-journey-eyebrow">Journey</p>
              <h4>Choose your next depth.</h4>
              <p>Quests are actionable units. Routes remain independent long-term directions.</p>
            </header>
            <div className="lag-journey-root-grid">
              {SUBMENUS_BY_MAIN.quests.map((item) => (
                <JourneyCard
                  key={item.id}
                  badge={item.slotLabel}
                  title={item.label}
                  supporting={SURFACE_COPY[item.id as QuestsSubId]}
                  selected={surface === item.id}
                  onClick={() => selectSurface(item.id as QuestsSubId)}
                />
              ))}
            </div>
          </div>
        </PanelFrame>
      </PanelStage>

      <AnimatePresence initial={false}>
        {surface ? (
          <PanelStage stageKey="journey-list" focusKey={surface}>
            <PanelFrame title={listTitle} depth={1} contentKey={surface} backButton={<BackButton label="Back to Journey" onClick={closeList} />}>
              <section className="lag-journey-list-surface" aria-label={`${listTitle} list`}>
                <header><p className="lag-journey-eyebrow">Journey child surface</p><h4>{listTitle}</h4><p>{SURFACE_COPY[surface]}</p></header>
                {surface === "current" ? renderCurrentList() : surface === "catalog" ? renderCatalogList() : renderRouteList()}
              </section>
            </PanelFrame>
          </PanelStage>
        ) : null}
      </AnimatePresence>

      <AnimatePresence initial={false} mode="popLayout">
        {detailContentKey ? (
          <PanelStage stageKey="journey-detail" focusKey={detailContentKey}>
            <PanelFrame title={detailTitle} depth={0} contentKey={detailContentKey} backButton={<BackButton label={`Back to ${listTitle}`} onClick={closeDetail} />}>
              {surface === "current" ? renderCurrentDetail() : surface === "catalog" ? renderCatalogDetail() : renderRouteDetail()}
            </PanelFrame>
          </PanelStage>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
