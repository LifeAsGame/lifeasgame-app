"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence } from "framer-motion";

import { consumerLabel } from "@/shared/lib/consumerLabels";
import { SUBMENUS_BY_MAIN } from "@/entities/nav";
import { useSaoConfirm } from "@/shared/ui/useSaoConfirm";
import type { QuestsSubId } from "@/entities/nav";
import type {
  PlayerQuestDetail,
  QuestAcceptance,
  QuestRoute,
  QuestRouteStepDetail,
} from "@/shared/api/types";
import { requestStageFocus } from "@/shared/hooks/useStageCamera";
import { useMediaQuery } from "@/shared/hooks/useMediaQuery";
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
import RewardSettlementPanel from "./RewardSettlementPanel";
import { RECORD_SAVED_EVENT } from "@/features/lifelog/api";
import { listRolesApi } from "@/features/role/api";
import type { RoleDetail } from "@/shared/api/types";
import BackendQuestEvidence, { BACKEND_QUEST_CODES, backendQuestCode } from "./BackendQuestEvidence";

const BACKEND_ROUTE_CODE = "ROUTE_BACKEND_DEVELOPER_START";

function BackendRoleSelect({ disabled, onSelect }: { disabled: boolean; onSelect: (roleId: number) => void }) {
  const [roles, setRoles] = useState<RoleDetail[]>([]);
  const [roleId, setRoleId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    void listRolesApi().then((result) => { if (active) setRoles(result.filter((role) => role.status === "ACTIVE" && ["ROLE_BACKEND_DEVELOPER", "ROLE_JOB_SEEKER"].includes(role.roleType))); })
      .catch((caught) => { if (active) setError(message(caught, "Role 조회 실패")); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);
  return <div className="lag-journey-actions">
    <label>이 여정의 Role
      <select className="lag-journal-control" value={roleId} onChange={(event) => setRoleId(event.target.value)}>
        <option value="">활성 Role 선택</option>
        {roles.map((role) => <option key={role.id} value={role.id}>{role.name} · {role.roleType}</option>)}
      </select>
    </label>
    {error ? <p role="alert">{error}</p> : null}
    {loading ? <p>Role을 불러오는 중…</p> : null}
    {!loading && !error && roles.length === 0 ? <p>역할 메뉴에서 ROLE_BACKEND_DEVELOPER 또는 ROLE_JOB_SEEKER 유형의 활성 Role을 만드세요.</p> : null}
    <button type="button" className="lag-journey-action" disabled={disabled || !roleId} onClick={() => onSelect(Number(roleId))}>경로 선택</button>
  </div>;
}

const SURFACE_COPY: Record<QuestsSubId, string> = {
  current: "수락한 퀘스트의 진행을 확인하세요.",
  catalog: "다음 퀘스트를 찾아보세요.",
  routes: "꾸준히 이어갈 경로를 선택하세요.",
};

function message(caught: unknown, fallback: string): string {
  return caught instanceof Error ? caught.message : fallback;
}

function humanize(value: string) {
  return consumerLabel(value);
}

function ErrorState({ text, retry }: { text: string; retry: () => void }) {
  return (
    <div className="lag-journey-state">
      <p role="alert" className="lag-journey-feedback" data-state="error">조회 실패: {text}</p>
      <button type="button" className="lag-journey-button" onClick={retry}>다시 조회</button>
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
        {progress ? <ProgressBar label={`${title} 진행률`} percent={progress.percent} valueText={progress.valueText} /> : null}
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
  return index < 0 ? null : `${steps.length}단계 중 ${index + 1}단계`;
}

function RouteThread({ route, quests, catalog, onQuest }: { route: QuestRoute; quests: QuestAcceptance[]; catalog: { code: string; title: string }[]; onQuest: (code: string) => void }) {
  const steps = orderedSteps(route);
  return (
    <section className="lag-route-thread" aria-label="경로의 단계 순서">
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
                    <StatusBadge state={step.state}>{humanize(step.state)}{current ? " · 현재 단계" : ""}</StatusBadge>
                  </div>
                  <p>{step.description ?? "단계 설명이 없습니다."}</p>
                  <p>조건: {step.criteriaSatisfied ? "충족" : "미충족"}</p>
                  {step.questLinks.length > 0 ? (
                    <ul aria-label={`${step.title}의 퀘스트 조건`}>
                      {step.questLinks.map((link) => {
                        const quest = quests.find((item) => item.questId === link.questId);
                        const code = route.code === BACKEND_ROUTE_CODE && current ? backendQuestCode(step.stepCode) : null;
                        const title = quest?.title ?? catalog.find((item) => item.code === code)?.title ?? `퀘스트 #${link.questId}`;
                        return <li key={link.questId}>필요 조건: {code ? <button type="button" className="lag-journey-button" onClick={() => onQuest(code)}>{title}</button> : title} · {humanize(link.requirementType)}</li>;
                      })}
                    </ul>
                  ) : <p>연결된 퀘스트 조건이 없습니다.</p>}
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

export default function JourneyShell({ initialSurface = null, navigation, onNavigate }: {
  initialSurface?: QuestsSubId | null;
  navigation?: { surface: QuestsSubId | null; detail: string | null };
  onNavigate?: (surface: QuestsSubId | null, detail: string | null) => void;
}) {
  const { confirm, dialog } = useSaoConfirm();
  const compact = useMediaQuery("(max-width: 1199px)");
  const appliedRoute = useRef<string | null>(null);
  const writeRoute = (nextSurface: QuestsSubId | null, detail: string | null = null) => {
    appliedRoute.current = `${nextSurface ?? ""}/${detail ?? ""}`;
    onNavigate?.(nextSurface, detail);
  };
  const queries = useJourneyQueries(true);
  const navigationQuery = navigation?.surface ? queries[navigation.surface] : null;
  const navigationPending = Boolean(navigation?.detail && navigationQuery && (navigationQuery.loading || navigationQuery.error));
  const [surface, setSurface] = useState<QuestsSubId | null>(initialSurface);
  const [selectedAcceptanceId, setSelectedAcceptanceId] = useState<number | null>(null);
  const [selectedCatalogCode, setSelectedCatalogCode] = useState<string | null>(null);
  const [selectedRouteId, setSelectedRouteId] = useState<number | null>(null);
  const [questDetail, setQuestDetail] = useState<QuestDetailState>({ code: null, data: null, loading: false, error: null });
  const [routeDetail, setRouteDetail] = useState<RouteDetailState>({ routeId: null, data: null, step: null, loading: false, error: null });
  const [pending, setPending] = useState<string | null>(null);
  const [mutationError, setMutationError] = useState<string | null>(null);
  const mutationLocked = useRef(false);
  const navigationEpoch = useRef(0);
  const questDetailRequestId = useRef(0);
  const routeDetailRequestId = useRef(0);

  const clearDetail = () => {
    navigationEpoch.current += 1;
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
    writeRoute(next);
  };

  const closeDetail = () => {
    const trigger = document.querySelector<HTMLButtonElement>('[data-stage-key="journey-list"] button[aria-pressed="true"]');
    clearDetail();
    writeRoute(surface);
    requestStageFocus("journey-list", "back");
    requestAnimationFrame(() => trigger?.focus({ preventScroll: true }));
  };

  const closeList = () => {
    const trigger = document.querySelector<HTMLButtonElement>('[data-stage-key="journey-root"] button[aria-pressed="true"]');
    clearDetail();
    setSurface(null);
    writeRoute(null);
    requestStageFocus("journey-root", "back");
    requestAnimationFrame(() => trigger?.focus({ preventScroll: true }));
  };

  const mineById = new Map(queries.routes.data.mine.map((route) => [route.id, route]));
  const routes = useMemo(() => {
    const mine = new Map(queries.routes.data.mine.map((route) => [route.id, route]));
    const catalog = new Set(queries.routes.data.catalog.map((route) => route.id));
    return [
      ...queries.routes.data.catalog.map((route) => mine.get(route.id) ?? route),
      ...queries.routes.data.mine.filter((route) => !catalog.has(route.id)),
    ];
  }, [queries.routes.data.catalog, queries.routes.data.mine]);
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
        setQuestDetail((previous) => ({ ...previous, code, loading: false, error: message(caught, "퀘스트 상세를 불러오지 못했습니다.") }));
      }
    }
  };

  useEffect(() => {
    const refresh = () => { void queries.current.reload(); if (questDetail.code) void loadQuestDetail(questDetail.code, true); };
    window.addEventListener(RECORD_SAVED_EVENT, refresh);
    return () => window.removeEventListener(RECORD_SAVED_EVENT, refresh);
  });

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
        setRouteDetail((previous) => ({ ...previous, routeId, loading: false, error: message(caught, "경로 상세를 불러오지 못했습니다.") }));
      }
    }
  };

  useEffect(() => {
    if (!navigation) return;
    const key = `${navigation.surface ?? ""}/${navigation.detail ?? ""}`;
    if (appliedRoute.current === key) return;
    appliedRoute.current = null;
    const returnTarget = document.querySelector<HTMLButtonElement>(navigation.surface
      ? '[data-stage-key="journey-list"] button[aria-pressed="true"]'
      : '[data-stage-key="journey-root"] button[aria-pressed="true"]');
    clearDetail();
    setSurface(navigation.surface);
    // A failed list cannot establish absence or Route ownership. Keep restoration
    // pending through Retry, while exposing its list and invalidating stale reads.
    if (navigationPending) return;
    appliedRoute.current = key;
    if (!navigation.detail) {
      requestAnimationFrame(() => {
        if (appliedRoute.current === key && returnTarget?.isConnected && !returnTarget.closest("[inert]")) returnTarget.focus({ preventScroll: true });
      });
      return;
    }
    if (navigation.surface === "current") {
      const quest = queries.current.data.find((item) => String(item.id) === navigation.detail);
      setSelectedAcceptanceId(Number(navigation.detail));
      if (quest) void loadQuestDetail(quest.code);
    } else if (navigation.surface === "catalog") {
      setSelectedCatalogCode(navigation.detail);
      void loadQuestDetail(navigation.detail);
    } else if (navigation.surface === "routes") {
      const id = Number(navigation.detail);
      setSelectedRouteId(id);
      if (Number.isSafeInteger(id) && id > 0) void loadRouteDetail(id, mineById.has(id));
    }
    // Navigation snapshots restore read state. The request IDs invalidate earlier reads.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigation?.surface, navigation?.detail, navigationPending]);

  useEffect(() => () => {
    navigationEpoch.current += 1;
    questDetailRequestId.current += 1;
    routeDetailRequestId.current += 1;
  }, []);

  const runMutation = async (key: string, request: () => Promise<unknown>, recover: (isCurrent: () => boolean) => Promise<void>) => {
    if (mutationLocked.current) return;
    mutationLocked.current = true;
    setPending(key);
    setMutationError(null);
    const epoch = navigationEpoch.current;
    let requestError: unknown = null;
    try {
      await request();
    } catch (caught) {
      requestError = caught;
    }
    try {
      await recover(() => epoch === navigationEpoch.current);
    } catch (caught) {
      if (epoch === navigationEpoch.current) setMutationError(`요청 후 최신 상태를 확인하지 못했습니다. 다시 조회하세요. ${message(caught, "")}`.trim());
    } finally {
      if (requestError && epoch === navigationEpoch.current) setMutationError(`요청 결과가 확정되지 않았습니다. 다시 조회한 상태를 확인하세요. ${message(requestError, "")}`.trim());
      mutationLocked.current = false;
      setPending(null);
    }
  };

  const recoverQuest = async (code: string, isCurrent: () => boolean) => {
    const [current, catalog, routes] = await Promise.all([queries.current.reload(), queries.catalog.reload(), BACKEND_QUEST_CODES.some((item) => item === code) ? queries.routes.reload() : Promise.resolve(true)]);
    if (!current || !catalog || !routes) throw new Error("퀘스트/경로 목록 재조회 실패");
    if (isCurrent()) await loadQuestDetail(code, true);
  };

  const selectRoute = async (route: QuestRoute, roleId?: number) => {
    if (!await confirm(`${route.title} 경로를 선택할까요?`)) return;
    await runMutation(`select-${route.id}`, () => selectQuestRouteApi(route.id, roleId), async (isCurrent) => {
      const latest = await queries.routes.reload();
      if (!latest) throw new Error("경로 목록 재조회 실패");
      if (isCurrent()) await loadRouteDetail(route.id, latest.mine.some((item) => item.id === route.id), true);
    });
  };

  const openRequiredQuest = (code: string) => {
    const accepted = latestAcceptance(queries.current.data, code);
    const nextSurface: QuestsSubId = accepted && accepted.status !== "CANCELED" ? "current" : "catalog";
    clearDetail();
    setSurface(nextSurface);
    if (nextSurface === "current" && accepted) setSelectedAcceptanceId(accepted.id);
    else setSelectedCatalogCode(code);
    writeRoute(nextSurface, nextSurface === "current" ? String(accepted?.id) : code);
    void loadQuestDetail(code);
  };

  const advanceRoute = async (route: QuestRoute) => {
    const expectedStepId = route.playerProgress?.currentStepId;
    if (!expectedStepId || !await confirm("현재 경로 단계를 진행할까요?")) return;
    await runMutation(`advance-${route.id}`, () => advanceQuestRouteApi(route.id, expectedStepId), async (isCurrent) => {
      const latest = await queries.routes.reload();
      if (!latest) throw new Error("경로 목록 재조회 실패");
      if (isCurrent()) await loadRouteDetail(route.id, latest.mine.some((item) => item.id === route.id), true);
    });
  };

  const renderCurrentList = () => (
    <div className="lag-journey-list">
      {queries.current.loading && queries.current.data.length === 0 ? <InfoCard>진행 퀘스트를 불러오는 중…</InfoCard> : null}
      {queries.current.error ? <ErrorState text={queries.current.error} retry={() => void queries.current.reload()} /> : null}
      {!queries.current.loading && !queries.current.error && queries.current.data.length === 0 ? <InfoCard>수락한 퀘스트가 없습니다.</InfoCard> : null}
      {queries.current.data.map((quest) => {
        const percent = questProgressPercent(quest);
        return (
          <JourneyCard
            key={quest.id}
            badge={quest.status === "GOAL_REACHED" ? "GR" : quest.status.slice(0, 2)}
            title={quest.title}
            supporting={QUEST_STATUS_LABEL[quest.status]}
            badges={[humanize(quest.completionPolicy)]}
            progress={{ percent, valueText: `${quest.progressValue} / ${quest.targetValue} (${percent}%)` }}
            selected={selectedAcceptanceId === quest.id}
            onClick={() => {
              navigationEpoch.current += 1;
              writeRoute("current", String(quest.id));
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
      {queries.catalog.loading && queries.catalog.data.length === 0 ? <InfoCard>퀘스트 목록을 불러오는 중…</InfoCard> : null}
      {queries.catalog.error ? <ErrorState text={queries.catalog.error} retry={() => void queries.catalog.reload()} /> : null}
      {!queries.catalog.loading && !queries.catalog.error && queries.catalog.data.length === 0 ? <InfoCard>선택할 수 있는 퀘스트가 없습니다.</InfoCard> : null}
      {queries.catalog.data.map((quest) => {
        const acceptance = latestAcceptance(queries.current.data, quest.code);
        const category = quest.semanticCategory ?? quest.category;
        return (
          <JourneyCard
            key={quest.code}
            badge={(category ?? "QU").slice(0, 2)}
            title={quest.title}
            supporting={acceptance ? `수락 상태: ${QUEST_STATUS_LABEL[acceptance.status]}` : `${humanize(quest.targetType)} × ${quest.targetValue}`}
            badges={[...(category ? [humanize(category)] : []), humanize(quest.completionPolicy), humanize(quest.repeatPolicy ?? quest.repeatRule)]}
            selected={selectedCatalogCode === quest.code}
            onClick={() => {
              navigationEpoch.current += 1;
              writeRoute("catalog", quest.code);
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
      {queries.routes.loading && routes.length === 0 ? <InfoCard>경로를 불러오는 중…</InfoCard> : null}
      {queries.routes.error ? <ErrorState text={queries.routes.error} retry={() => void queries.routes.reload()} /> : null}
      {!queries.routes.loading && !queries.routes.error && routes.length === 0 ? <InfoCard>선택할 수 있는 경로가 없습니다.</InfoCard> : null}
      {routes.map((route) => {
        const position = currentStepPosition(route);
        const status = route.playerProgress?.status ?? "NOT_SELECTED";
        return (
          <JourneyCard
            key={route.id}
            badge={status === "COMPLETED" ? "CP" : route.playerProgress ? "IP" : "NS"}
            title={route.title}
            supporting={[humanize(status), position].filter(Boolean).join(" · ")}
            badges={[route.playerProgress ? "선택됨" : "선택 안 함", `${route.steps.length}단계`]}
            selected={selectedRouteId === route.id}
            onClick={() => {
              navigationEpoch.current += 1;
              writeRoute("routes", String(route.id));
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
    if (detail?.loading && !detail.data) return <InfoCard>퀘스트 상세를 불러오는 중…</InfoCard>;
    if (detail?.error && !detail.data) return <ErrorState text={detail.error} retry={() => void loadQuestDetail(selectedAcceptance.code)} />;
    const percent = questProgressPercent(selectedAcceptance);
    const detailEpoch = navigationEpoch.current;
    return (
      <article className="lag-journey-detail">
        {detail?.error ? <p role="alert" className="lag-journey-feedback" data-state="error">{detail.error}</p> : null}
        {mutationError ? <p role="alert" className="lag-journey-feedback" data-state="error">{mutationError}</p> : null}
        <header className="lag-journey-detail-hero">
          <span>진행 퀘스트</span>
          <h4>{selectedAcceptance.title}</h4>
          <StatusBadge state={selectedAcceptance.status}>상태: {QUEST_STATUS_LABEL[selectedAcceptance.status]}</StatusBadge>
          <p>{detail?.data?.descriptionMd ?? selectedAcceptance.descriptionMd}</p>
        </header>
        <DetailSection title="진행 상황">
          <div className="lag-journey-detail-progress"><ProgressBar label="퀘스트 진행률" percent={percent} valueText={`${selectedAcceptance.progressValue} / ${selectedAcceptance.targetValue} (${percent}%)`} /></div>
        </DetailSection>
        <DetailSection title="완료 조건">
          <DetailRow name="완료 방식" value={humanize(selectedAcceptance.completionPolicy)} />
          <DetailRow name="진행 기준" value={selectedAcceptance.progressSource ? humanize(selectedAcceptance.progressSource) : "기록 없음"} />
          <DetailRow name="반복" value={humanize(selectedAcceptance.repeatPolicy ?? selectedAcceptance.repeatRule)} />
        </DetailSection>
        {selectedAcceptance.status === "GOAL_REACHED" ? <p className="lag-journey-feedback" data-state="warning">목표에 도달했습니다. 완료 확정과는 다릅니다.</p> : null}
        {selectedAcceptance.code === "Q_ADVENTURE_PREPARATION" ? <p className="lag-journey-feedback">수락 후 직접 작성한 서로 다른 기록 3건을 남기세요. 보상은 GOLD 100과 기록 결정 1개이며 계정당 한 번 지급됩니다.</p> : null}
        {selectedAcceptance.code === "Q_RECORD_WEEKLY_LOOKBACK" ? <p className="lag-journey-feedback">이 퀘스트는 같은 주에 작성한 전체 기록의 주간 회고만 인정합니다. 간편 기록과 일반 기록은 제외됩니다. 생활 기록 → 수집 기록에서 종류를 두 번 누른 뒤 주간 회고를 선택해 작성하세요.</p> : null}
        {BACKEND_QUEST_CODES.some((code) => code === selectedAcceptance.code) ? <BackendQuestEvidence
          key={selectedAcceptance.id}
          quest={selectedAcceptance}
          roleId={routes.find((route) => route.code === BACKEND_ROUTE_CODE)?.playerProgress?.roleId ?? null}
          onChanged={() => recoverQuest(selectedAcceptance.code, () => detailEpoch === navigationEpoch.current)}
        /> : null}
        {selectedAcceptance.status === "COMPLETED" && detail?.data?.rewardProfileCode && detail.data.rewardProfileCode !== "RP_NONE" ? <RewardSettlementPanel key={selectedAcceptance.id} acceptanceId={selectedAcceptance.id} /> : detail?.data && (!detail.data.rewardProfileCode || detail.data.rewardProfileCode === "RP_NONE") ? <p className="lag-journey-feedback">이 퀘스트에는 정산 보상이 없습니다.</p> : null}
        {(canManualCheckQuest(selectedAcceptance) || canCancelQuest(selectedAcceptance)) ? (
          <section className="lag-journey-actions" aria-label="퀘스트 동작">
            {canManualCheckQuest(selectedAcceptance) ? (
              <button type="button" className="lag-journey-action" disabled={Boolean(pending)} onClick={() => void runMutation(`manual-${selectedAcceptance.code}`, () => manualCheckQuestApi(selectedAcceptance.code), (isCurrent) => recoverQuest(selectedAcceptance.code, isCurrent))}>직접 확인</button>
            ) : null}
            {canCancelQuest(selectedAcceptance) ? (
              <button type="button" className="lag-journey-button" data-variant="destructive" disabled={Boolean(pending)} onClick={async () => {
                if (await confirm(`${selectedAcceptance.title} 퀘스트를 취소할까요?`)) void runMutation(`cancel-${selectedAcceptance.code}`, () => cancelQuestApi(selectedAcceptance.code), (isCurrent) => recoverQuest(selectedAcceptance.code, isCurrent));
              }}>퀘스트 취소</button>
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
    const acceptLabel = acceptAction === "accept-again" ? "다시 수락" : "퀘스트 수락";
    if (detail?.loading && !detail.data) return <InfoCard>퀘스트 상세를 불러오는 중…</InfoCard>;
    if (detail?.error && !detail.data) return <ErrorState text={detail.error} retry={() => void loadQuestDetail(selectedBlueprint.code)} />;
    return (
      <article className="lag-journey-detail">
        {mutationError ? <p role="alert" className="lag-journey-feedback" data-state="error">{mutationError}</p> : null}
        <header className="lag-journey-detail-hero">
          <span>퀘스트 안내</span>
          <h4>{selectedBlueprint.title}</h4>
          {acceptance ? <StatusBadge state={acceptance.status}>수락 상태: {QUEST_STATUS_LABEL[acceptance.status]}</StatusBadge> : null}
          <p>{detail?.data?.descriptionMd ?? selectedBlueprint.descriptionMd}</p>
        </header>
        <DetailSection title="목표와 완료">
          <DetailRow name="목표" value={`${humanize(selectedBlueprint.targetType)} × ${selectedBlueprint.targetValue}`} />
          <DetailRow name="완료 방식" value={humanize(selectedBlueprint.completionPolicy)} />
          <DetailRow name="반복" value={humanize(selectedBlueprint.repeatPolicy ?? selectedBlueprint.repeatRule)} />
          <DetailRow name="보상" value={selectedBlueprint.code === "Q_ADVENTURE_PREPARATION" ? "GOLD 100 + 기록 결정 × 1 · 계정당 한 번" : selectedBlueprint.rewardProfileCode === "RP_NONE" ? "추가 보상 없음" : selectedBlueprint.rewardProfileCode === "RP_EXP_TINY_10" ? "EXP 10" : selectedBlueprint.rewardProfileCode === "RP_EXP_AND_ITEM_FIRST_STEP_20" ? "EXP 20 + 첫걸음의 조각 1개(우편 배송, 수령 별도)" : "완료 후 확정된 보상 정산을 확인하세요."} />
        </DetailSection>
        {selectedBlueprint.code === "Q_ADVENTURE_PREPARATION" ? <p className="lag-journey-feedback">수락 후 직접 작성한 서로 다른 기록 3건을 남기세요. 기록 결정은 보관하거나 선택적으로 거래할 수 있습니다. 거래는 성장의 필수 단계가 아닙니다.</p> : null}
        {acceptance && selectedBlueprint.rewardProfileCode !== "RP_NONE" && (!BACKEND_QUEST_CODES.some((code) => code === selectedBlueprint.code) || acceptance.status === "COMPLETED") ? <RewardSettlementPanel key={acceptance.id} acceptanceId={acceptance.id} /> : null}
        {!acceptanceKnown ? <p className="lag-journey-feedback" data-state="warning">수락 상태를 확인할 수 없습니다. 진행 퀘스트를 다시 조회한 뒤 수락할 수 있습니다.</p> : null}
        {acceptAction ? (
          <button type="button" className="lag-journey-action" disabled={Boolean(pending)} onClick={async () => {
            if (await confirm(`${acceptLabel} ${selectedBlueprint.title}?`)) void runMutation(`accept-${selectedBlueprint.code}`, () => acceptQuestApi(selectedBlueprint.code), (isCurrent) => recoverQuest(selectedBlueprint.code, isCurrent));
          }}>{acceptLabel}</button>
        ) : null}
        {acceptance && acceptance.status !== "CANCELED" && BACKEND_QUEST_CODES.some((code) => code === selectedBlueprint.code) ? <button type="button" className="lag-journey-button" onClick={() => openRequiredQuest(selectedBlueprint.code)}>{acceptance.status === "COMPLETED" ? "완료 결과 보기" : "근거 연결·진행 확인"}</button> : null}
      </article>
    );
  };

  const renderRouteDetail = () => {
    if (!selectedRoute) return null;
    const detailState = routeDetail.routeId === selectedRoute.id ? routeDetail : null;
    const route = detailState?.data ?? selectedRoute;
    if (detailState?.loading && !detailState.data) return <InfoCard>경로 상세를 불러오는 중…</InfoCard>;
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
          <span>여정 경로 · 꾸준히 이어갈 방향</span>
          <h4>{route.title}</h4>
          <StatusBadge state={progress?.status ?? "NOT_SELECTED"}>상태: {humanize(progress?.status ?? "NOT_SELECTED")}</StatusBadge>
          <p>{route.description ?? "경로 설명이 없습니다."}</p>
        </header>
        {progress ? (
          <DetailSection title="경로 진행">
            <DetailRow name="현재 단계" value={`${currentStepPosition(route) ?? `단계 #${progress.currentStepId}`} · ID ${progress.currentStepId}`} />
            {percent !== null ? <div className="lag-journey-detail-progress"><ProgressBar label="완료한 경로 단계" percent={percent} valueText={`${completedSteps} / ${steps.length} 완료 (${percent}%)`} /></div> : null}
          </DetailSection>
        ) : null}
        <RouteThread route={route} quests={queries.current.data} catalog={queries.catalog.data} onQuest={openRequiredQuest} />
        {route.code === BACKEND_ROUTE_CODE && progress ? <p className="lag-journey-feedback">선택한 Role #{progress.roleId ?? "확인 중"} · 여정 선택은 퀘스트를 자동 수락하지 않습니다. 현재 단계의 필수 퀘스트를 직접 수락하고 근거를 연결하세요.</p> : null}
        {detailState?.step ? <InfoCard>현재 단계 상세: {detailState.step.step.title} · {humanize(detailState.step.step.state)}</InfoCard> : null}
        <section className="lag-journey-actions" aria-label="경로 동작">
          {!progress && route.code === BACKEND_ROUTE_CODE ? <BackendRoleSelect disabled={Boolean(pending)} onSelect={(roleId) => void selectRoute(route, roleId)} /> : null}
          {!progress && route.code !== BACKEND_ROUTE_CODE ? <button type="button" className="lag-journey-action" disabled={Boolean(pending)} onClick={() => void selectRoute(route)}>경로 선택</button> : null}
          {canAdvance ? <button type="button" className="lag-journey-action" disabled={Boolean(pending)} onClick={() => void advanceRoute(route)}>다음 단계로</button> : null}
        </section>
        {progress?.status === "COMPLETED" ? <p className="lag-journey-feedback" data-state="success">✓ 마지막 단계 전진을 통해 경로를 완료했습니다.</p> : null}
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

  const listTitle = SUBMENUS_BY_MAIN.quests.find((item) => item.id === surface)?.label ?? "여정";
  const detailTitle = surface === "current" ? "퀘스트 상세" : surface === "catalog" ? "퀘스트 안내" : "경로 상세";

  return (
    <div className="lag-panel-rail lag-journey-shell relative" data-testid="journey-shell">{dialog}
      <PanelStage stageKey="journey-root" panelRole="list" inactive={compact && Boolean(surface)}>
        <PanelFrame title="여정 / 경로" depth={2}>
          <div className="lag-journey-root">
            <header>
              <p className="lag-journey-eyebrow">여정</p>
              <h4>다음 퀘스트를 선택하세요.</h4>
              <p>퀘스트를 이어가거나 새 퀘스트와 경로를 살펴보세요.</p>
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
          <PanelStage stageKey="journey-list" panelRole="list" inactive={compact && Boolean(detailContentKey)}>
            <PanelFrame title={listTitle} depth={1} contentKey={surface} backButton={<BackButton label="여정으로" onClick={closeList} />}>
              <section className="lag-journey-list-surface" aria-label={`${listTitle} 목록`}>
                <p className="lag-journey-list-intro">{SURFACE_COPY[surface]}</p>
                {navigation?.detail && !detailContentKey && !navigationPending ? <p role="status" className="lag-journey-feedback">현재 목록에서 요청한 상세를 찾을 수 없습니다. 여정으로 돌아가거나 다른 항목을 선택하세요.</p> : null}
                {surface === "current" ? renderCurrentList() : surface === "catalog" ? renderCatalogList() : renderRouteList()}
              </section>
            </PanelFrame>
          </PanelStage>
        ) : null}
      </AnimatePresence>

      <AnimatePresence initial={false} mode="popLayout">
        {detailContentKey ? (
          <PanelStage stageKey="journey-detail" panelRole="detail" side={compact ? "right" : "left"}>
            <PanelFrame title={detailTitle} depth={0} contentKey={detailContentKey} backButton={<BackButton label={`${listTitle}으로 돌아가기`} onClick={closeDetail} />}>
              {surface === "current" ? renderCurrentDetail() : surface === "catalog" ? renderCatalogDetail() : renderRouteDetail()}
            </PanelFrame>
          </PanelStage>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
