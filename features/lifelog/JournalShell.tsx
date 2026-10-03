"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { AnimatePresence } from "framer-motion";

import { COLLECTION_CATEGORIES } from "@/shared/api/types";
import type {
  JournalDetail,
  JournalEntry,
  JournalSubtype,
  QuickRecordCollectionCategory,
  QuickRecordExerciseCategory,
  QuickRecordMediaCategory,
  QuickRecordMediaStatus,
  QuickRecordRequest,
  QuickRecordResult,
  QuickRecordType,
  RoleDetail,
} from "@/shared/api/types";
import { requestStageFocus } from "@/shared/hooks/useStageCamera";
import { consumerLabel } from "@/shared/lib/consumerLabels";
import CreateSlot, { useCreateMode } from "@/shared/ui/CreateSlot";
import PanelStage, { StageContentTransition } from "@/shared/ui/PanelStage";
import { BackButton, PanelFrame } from "@/widgets/right-panels/ui/PanelFrame";
import { InfoCard } from "@/widgets/right-panels/ui/Rows";
import { useJournalQueries } from "./useJournalQueries";

export const JOURNAL_SUBTYPES: JournalSubtype[] = [
  "QUICK_NOTE",
  "ACTIVITY",
  "STUDY",
  "PROJECT",
  "MEMORY",
  "REFLECTION",
  "MOOD",
  "HEALTH_NOTE",
];

const EXERCISE_CATEGORIES = ["RUNNING", "WALKING", "CYCLING", "SWIMMING", "GYM", "YOGA", "OTHER"] as const;
const MEDIA_CATEGORIES = ["ANIME", "MOVIE", "SERIES", "BOOK", "WEBTOON", "GAME", "MUSIC"] as const;
const MEDIA_STATUSES = ["PLANNED", "WATCHING", "COMPLETED", "DROPPED", "ON_HOLD"] as const;

function text(form: FormData, key: string) {
  return String(form.get(key) ?? "").trim();
}

function optionalNumber(form: FormData, key: string) {
  const raw = text(form, key);
  return raw === "" ? undefined : Number(raw);
}

function label(value: string) {
  return consumerLabel(value);
}

function displayTimestamp(value: string) {
  return value.replace(/\.\d+/, "").replace("T", " ").replace("Z", " UTC");
}

function Field({ children, title }: { children: React.ReactNode; title: string }) {
  return (
    <label className="lag-journal-field">
      <span>{title}</span>
      {children}
    </label>
  );
}

function SelectField({
  disabled,
  name,
  title,
  values,
}: {
  disabled: boolean;
  name: string;
  title: string;
  values: readonly string[];
}) {
  return (
    <Field title={title}>
      <select className="lag-journal-control" name={name} required defaultValue="" disabled={disabled}>
        <option value="" disabled>선택…</option>
        {values.map((value) => <option key={value} value={value}>{label(value)}</option>)}
      </select>
    </Field>
  );
}

function QuickRecordForm({
  roles,
  rolesLoading,
  rolesError,
  pending,
  error,
  result,
  refreshError,
  canRetry,
  onSubmit,
  onRetry,
  onEdit,
  onRefresh,
}: {
  roles: RoleDetail[];
  rolesLoading: boolean;
  rolesError: string | null;
  pending: boolean;
  error: string | null;
  result: QuickRecordResult | null;
  refreshError: string | null;
  canRetry: boolean;
  onSubmit: (body: QuickRecordRequest) => Promise<QuickRecordResult | undefined>;
  onRetry: () => Promise<QuickRecordResult | undefined>;
  onEdit: () => void;
  onRefresh: () => void;
}) {
  const [type, setType] = useState<QuickRecordType>("COLLECTION");
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    formRef.current?.querySelector<HTMLButtonElement>('[role="radio"][aria-checked="true"]')?.focus({ preventScroll: true });
  }, []);
  const feedbackRef = useRef<HTMLParagraphElement>(null);
  const feedbackRole = error ? "alert" : pending || result ? "status" : null;
  useEffect(() => {
    feedbackRef.current?.focus({ preventScroll: true });
  }, [feedbackRole]);

  const resetAfter = (saved: QuickRecordResult | undefined) => {
    if (!saved) return;
    formRef.current?.reset();
    setType("COLLECTION");
  };

  const submit = async (event: React.SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const lifeLogSubtype = text(form, "lifeLogSubtype") as JournalSubtype | "";
    const primaryRoleId = optionalNumber(form, "primaryRoleId");
    const metadata = lifeLogSubtype === "REFLECTION" ? {
      lifeLogSubtype,
      reflectionScope: "WEEKLY_LOOKBACK" as const,
      ...(primaryRoleId === undefined ? {} : { primaryRoleId }),
    } : {
      ...(lifeLogSubtype ? { lifeLogSubtype } : {}),
      ...(primaryRoleId === undefined ? {} : { primaryRoleId }),
    };

    let body: QuickRecordRequest;
    if (type === "COLLECTION") {
      body = {
        ...metadata,
        type,
        collection: {
          category: text(form, "collectionCategory") as QuickRecordCollectionCategory,
          title: text(form, "collectionTitle"),
          quantity: Number(text(form, "quantity")),
        },
      };
    } else if (type === "EXERCISE") {
      const distanceKm = optionalNumber(form, "distanceKm");
      const calories = optionalNumber(form, "calories");
      const memo = text(form, "memo");
      body = {
        ...metadata,
        type,
        exercise: {
          category: text(form, "exerciseCategory") as QuickRecordExerciseCategory,
          durationMinutes: Number(text(form, "durationMinutes")),
          exercisedOn: text(form, "exercisedOn"),
          ...(distanceKm === undefined ? {} : { distanceKm }),
          ...(calories === undefined ? {} : { calories }),
          ...(memo ? { memo } : {}),
        },
      };
    } else {
      const currentEpisode = optionalNumber(form, "currentEpisode");
      const totalEpisode = optionalNumber(form, "totalEpisode");
      body = {
        ...metadata,
        type,
        media: {
          category: text(form, "mediaCategory") as QuickRecordMediaCategory,
          title: text(form, "mediaTitle"),
          status: text(form, "mediaStatus") as QuickRecordMediaStatus,
          ...(currentEpisode === undefined ? {} : { currentEpisode }),
          ...(totalEpisode === undefined ? {} : { totalEpisode }),
        },
      };
    }

    resetAfter(await onSubmit(body));
  };

  const chooseType = (next: QuickRecordType) => {
    onEdit();
    setType(next);
  };

  return (
    <form ref={formRef} aria-busy={pending} className="lag-quick-record-form" onSubmit={submit} onChangeCapture={onEdit} onFocusCapture={(event) => {
      if (event.target.matches("input, select, textarea, [role=status], [role=alert]")) {
        event.target.scrollIntoView({ block: "nearest", inline: "nearest" });
      }
    }}>
      <div>
        <p className="lag-journal-eyebrow">기록 유형</p>
        <div className="lag-journal-segments" role="radiogroup" aria-label="간편 기록 유형" onKeyDown={(event) => {
          const types = ["COLLECTION", "EXERCISE", "MEDIA"] as const;
          const direction = event.key === "ArrowRight" || event.key === "ArrowDown" ? 1 : event.key === "ArrowLeft" || event.key === "ArrowUp" ? -1 : 0;
          if (!direction || pending) return;
          event.preventDefault();
          const index = (types.indexOf(type) + direction + types.length) % types.length;
          chooseType(types[index]);
          event.currentTarget.querySelectorAll<HTMLButtonElement>("button")[index]?.focus();
        }}>
          {(["COLLECTION", "EXERCISE", "MEDIA"] as const).map((value) => (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={type === value}
              tabIndex={type === value ? 0 : -1}
              className="lag-journal-chip"
              data-selected={type === value}
              disabled={pending}
              onClick={() => chooseType(value)}
            >
              {label(value)}
            </button>
          ))}
        </div>
      </div>

      <div className="lag-journal-form-grid">
        <Field title="간편 기록 분류">
          <select className="lag-journal-control" name="lifeLogSubtype" aria-label="간편 기록 분류" defaultValue="" disabled={pending}>
            <option value="">없음</option>
            {JOURNAL_SUBTYPES.map((subtype) => <option key={subtype} value={subtype}>{label(subtype)}</option>)}
          </select>
          <small>주간 회고 퀘스트는 생활 기록의 수집 분류를 당겨 전체 주간 회고를 작성하세요.</small>
        </Field>
        <Field title="간편 기록 역할">
          <select className="lag-journal-control" name="primaryRoleId" aria-label="간편 기록 역할" defaultValue="" disabled={pending || rolesLoading}>
            <option value="">역할 없음</option>
            {roles.map((role) => <option key={role.id} value={role.id}>{role.name}</option>)}
          </select>
        </Field>
      </div>

      {rolesLoading ? <InfoCard>역할을 불러오는 중…</InfoCard> : null}
      {rolesError ? <p role="alert" className="lag-journal-feedback" data-state="error">역할 selection unavailable: {rolesError}</p> : null}

      <div className="lag-quick-record-fields" data-testid="quick-record-fields">
        <StageContentTransition identity={type}>
          <fieldset className="lag-journal-form-grid" disabled={pending}>
            <legend className="sr-only">{label(type)} fields</legend>
            {type === "COLLECTION" ? (
              <>
                <SelectField name="collectionCategory" title="수집 분류" values={COLLECTION_CATEGORIES} disabled={pending} />
                <Field title="수집 제목"><input className="lag-journal-control" name="collectionTitle" required /></Field>
                <Field title="수량"><input className="lag-journal-control" name="quantity" type="number" min={1} required /></Field>
              </>
            ) : type === "EXERCISE" ? (
              <>
                <SelectField name="exerciseCategory" title="운동 분류" values={EXERCISE_CATEGORIES} disabled={pending} />
                <Field title="운동 시간 (분)"><input className="lag-journal-control" name="durationMinutes" type="number" min={1} required /></Field>
                <Field title="운동 날짜"><input className="lag-journal-control" name="exercisedOn" type="date" required /></Field>
                <Field title="거리 (km)"><input className="lag-journal-control" name="distanceKm" type="number" min={0} step="any" /></Field>
                <Field title="칼로리"><input className="lag-journal-control" name="calories" type="number" min={0} /></Field>
                <Field title="메모"><textarea className="lag-journal-control" name="memo" rows={3} /></Field>
              </>
            ) : (
              <>
                <SelectField name="mediaCategory" title="감상 분류" values={MEDIA_CATEGORIES} disabled={pending} />
                <Field title="감상 제목"><input className="lag-journal-control" name="mediaTitle" required /></Field>
                <SelectField name="mediaStatus" title="감상 상태" values={MEDIA_STATUSES} disabled={pending} />
                <Field title="현재 회차"><input className="lag-journal-control" name="currentEpisode" type="number" min={0} /></Field>
                <Field title="전체 회차"><input className="lag-journal-control" name="totalEpisode" type="number" min={1} /></Field>
              </>
            )}
          </fieldset>
        </StageContentTransition>
      </div>

      <div className="lag-journal-submit">
        {error ? <p ref={feedbackRef} role="alert" tabIndex={-1} className="lag-journal-feedback" data-state="error">저장 실패: {error}</p> : null}
        {pending || result ? <p ref={feedbackRef} role="status" tabIndex={-1} className="lag-journal-feedback" data-state={result ? "success" : undefined}>{result ? `✓ ${result.replay ? "간편 기록 재시도가 확인됐습니다." : "간편 기록을 저장했습니다."}` : "간편 기록 저장 중…"}</p> : null}
        {refreshError ? <div className="lag-journal-state"><p role="alert" className="lag-journal-feedback" data-state="error">{refreshError}</p><button type="button" className="lag-journal-button" onClick={onRefresh}>일상 기록 다시 조회</button></div> : null}
        {canRetry ? (
          <button type="button" className="lag-journal-action" data-variant="retry" disabled={pending} onClick={() => void onRetry().then(resetAfter)}>
            {pending ? "재시도 중…" : "같은 기록 다시 시도"}
          </button>
        ) : (
          <button type="submit" className="lag-journal-action" disabled={pending}>
            {pending ? "저장 중…" : "간편 기록 저장"}
          </button>
        )}
      </div>
    </form>
  );
}

function ErrorState({ message, retry }: { message: string; retry: () => void }) {
  return (
    <div className="lag-journal-state">
      <p role="alert" className="lag-journal-feedback" data-state="error">조회 실패: {message}</p>
      <button type="button" className="lag-journal-button" onClick={retry}>다시 시도</button>
    </div>
  );
}

function entryPresentation(entry: JournalEntry) {
  switch (entry.sourceType) {
    case "COLLECTION":
      return {
        title: entry.preview.title,
        summary: [label(entry.preview.category), entry.preview.quantity !== null ? `수량 ${entry.preview.quantity}` : null].filter(Boolean).join(" · "),
      };
    case "EXERCISE":
      return {
        title: `${label(entry.preview.category)} · ${entry.preview.exercisedOn}`,
        summary: [
          entry.preview.durationMinutes !== null ? `${entry.preview.durationMinutes} 분` : null,
          entry.preview.distanceKm !== null ? `${entry.preview.distanceKm} km` : null,
          entry.preview.calories !== null ? `${entry.preview.calories} kcal` : null,
        ].filter(Boolean).join(" · "),
      };
    case "MEDIA":
      return { title: entry.preview.title, summary: `${label(entry.preview.category)} · ${label(entry.preview.status)} · ${entry.preview.currentEpisode}/${entry.preview.totalEpisode}` };
  }
}

function roleName(primaryRoleId: number | null, roles: RoleDetail[]) {
  if (primaryRoleId === null) return null;
  return roles.find(({ id }) => id === primaryRoleId)?.name ?? `역할 #${primaryRoleId}`;
}

function DetailItem({ name, value }: { name: string; value: React.ReactNode }) {
  return (
    <div className="lag-journal-detail-item">
      <dt>{name}</dt>
      <dd>{value}</dd>
    </div>
  );
}

function DetailSection({ children, title }: { children: React.ReactNode; title: string }) {
  return (
    <section className="lag-journal-detail-section">
      <h4>{title}</h4>
      <dl>{children}</dl>
    </section>
  );
}

function SourceDetail({ detail }: { detail: JournalDetail }) {
  switch (detail.sourceType) {
    case "COLLECTION":
      return (
        <DetailSection title="수집 기록">
          <DetailItem name="분류" value={label(detail.source.category)} />
          <DetailItem name="제목" value={detail.source.title} />
          <DetailItem name="원제" value={detail.source.originalTitle ?? "미등록"} />
          <DetailItem name="수량" value={detail.source.quantity ?? "미등록"} />
          <DetailItem name="상태 메모" value={detail.source.conditionNote ?? "미등록"} />
          <DetailItem name="입수처" value={detail.source.acquiredFrom ?? "미등록"} />
          <DetailItem name="태그" value={detail.source.tags.length > 0 ? detail.source.tags.join(", ") : "미등록"} />
          <DetailItem name="생성일" value={displayTimestamp(detail.source.createdAt)} />
          <DetailItem name="수정일" value={displayTimestamp(detail.source.updatedAt)} />
        </DetailSection>
      );
    case "EXERCISE":
      return (
        <DetailSection title="운동 기록">
          <DetailItem name="분류" value={label(detail.source.category)} />
          <DetailItem name="운동 시간" value={detail.source.durationMinutes === null ? "미등록" : `${detail.source.durationMinutes} 분`} />
          <DetailItem name="거리" value={detail.source.distanceKm === null ? "미등록" : `${detail.source.distanceKm} km`} />
          <DetailItem name="칼로리" value={detail.source.calories === null ? "미등록" : `${detail.source.calories} kcal`} />
          <DetailItem name="운동 날짜" value={detail.source.exercisedOn} />
          <DetailItem name="메모" value={detail.source.memo ?? "미등록"} />
          <DetailItem name="생성일" value={displayTimestamp(detail.source.createdAt)} />
          <DetailItem name="수정일" value={displayTimestamp(detail.source.updatedAt)} />
        </DetailSection>
      );
    case "MEDIA":
      return (
        <DetailSection title="감상 기록">
          <DetailItem name="분류" value={label(detail.source.category)} />
          <DetailItem name="제목" value={detail.source.title} />
          <DetailItem name="원제" value={detail.source.originalTitle ?? "미등록"} />
          <DetailItem name="진행" value={`${detail.source.currentEpisode}/${detail.source.totalEpisode}`} />
          <DetailItem name="상태" value={label(detail.source.status)} />
          <DetailItem name="평점" value={detail.source.rating ?? "미등록"} />
          <DetailItem name="태그" value={detail.source.tags.length > 0 ? detail.source.tags.join(", ") : "미등록"} />
          <DetailItem name="재감상 횟수" value={detail.source.rewatchCount} />
          <DetailItem name="시작일" value={detail.source.startedOn ?? "미등록"} />
          <DetailItem name="완료일" value={detail.source.finishedOn ?? "미등록"} />
          <DetailItem name="생성일" value={displayTimestamp(detail.source.createdAt)} />
          <DetailItem name="수정일" value={displayTimestamp(detail.source.updatedAt)} />
        </DetailSection>
      );
  }
}

function subscribeCompact(notify: () => void) {
  const media = window.matchMedia("(max-width: 899px)");
  media.addEventListener("change", notify);
  return () => media.removeEventListener("change", notify);
}

export default function JournalShell({ createRequest = 0, initialLifeLogId, roles, rolesLoading = false, rolesError = null, onBack, onOpenSource }: { createRequest?: number; initialLifeLogId?: number | null; roles: RoleDetail[]; rolesLoading?: boolean; rolesError?: string | null; onBack?: () => void; onOpenSource?: (detail: JournalDetail) => void }) {
  const compact = useSyncExternalStore(subscribeCompact, () => window.matchMedia("(max-width: 899px)").matches, () => false);
  const caller = useRef<HTMLButtonElement | null>(null);
  const shellRef = useRef<HTMLDivElement>(null);
  const journal = useJournalQueries();
  const initialSelection = useRef(false);
  useEffect(() => {
    if (initialLifeLogId && !initialSelection.current) {
      initialSelection.current = true;
      journal.selectEntry(initialLifeLogId);
    }
  }, [initialLifeLogId, journal]);
  const creation = useCreateMode(createRequest);
  const quickRecordOpen = creation.creating;
  const [detailVisible, setDetailVisible] = useState(true);
  const resetQuickRecord = journal.quickRecord.reset;
  useEffect(() => { if (quickRecordOpen) { setDetailVisible(false); resetQuickRecord(); } }, [quickRecordOpen, resetQuickRecord]);
  const { data: page, loading, error } = journal.list;
  const detail = journal.detail.data;
  useEffect(() => {
    if (compact && detailVisible && journal.selectedLifeLogId !== null && !quickRecordOpen) {
      shellRef.current?.querySelector<HTMLButtonElement>('[data-stage-key="lifelog-journal-detail"] button')?.focus({ preventScroll: true });
    }
  }, [compact, detailVisible, journal.selectedLifeLogId, quickRecordOpen]);
  const previousDisabled = loading || journal.params.page === 0;
  const nextDisabled = loading || page.totalPages === 0 || journal.params.page + 1 >= page.totalPages;

  const returnToJournal = () => {
    requestStageFocus("lifelog-journal", "back");
    requestAnimationFrame(() => caller.current?.isConnected && caller.current.focus({ preventScroll: true }));
  };
  const closeQuickRecord = () => {
    journal.quickRecord.reset();
    creation.close();
  };
  const closeDetail = () => {
    journal.clearSelection();
    returnToJournal();
  };

  return (
    <div ref={shellRef} className="lag-panel-rail lag-journal-shell relative" data-testid="journal-shell">
      <PanelStage stageKey="lifelog-journal" panelRole="list" inactive={compact && detailVisible && !quickRecordOpen && journal.selectedLifeLogId !== null}>
        <PanelFrame title="일상 기록" depth={1} resetScrollKey={`${journal.params.page}:${journal.params.primaryRoleId ?? ""}:${journal.params.subtype ?? ""}`} backButton={creation.creating ? <BackButton label="목록으로" onClick={closeQuickRecord} /> : onBack ? <BackButton label="생활 기록 목록으로" onClick={onBack} /> : undefined}>
            <CreateSlot showCancel={false} creating={quickRecordOpen} pending={journal.quickRecord.pending} onClose={closeQuickRecord} list={<div className="lag-journal-surface">
            <details className="lag-journal-filter-disclosure">
              <summary>필터 · 역할 / 기록 분류</summary>
            <div className="lag-journal-filters" aria-label="일상 기록 필터">
              <Field title="역할">
                <select
                  className="lag-journal-control"
                  aria-label="역할 필터"
                  value={journal.params.primaryRoleId ?? ""}
                  onChange={(event) => journal.changeRoleFilter(event.target.value ? Number(event.target.value) : undefined)}
                >
                  <option value="">전체 역할</option>
                  {roles.map((role) => <option key={role.id} value={role.id}>{role.name}</option>)}
                </select>
              </Field>
              <Field title="기록 분류">
                <select
                  className="lag-journal-control"
                  aria-label="기록 분류 필터"
                  value={journal.params.subtype ?? ""}
                  onChange={(event) => journal.changeSubtypeFilter(event.target.value ? event.target.value as JournalSubtype : undefined)}
                >
                  <option value="">전체 기록 분류</option>
                  {JOURNAL_SUBTYPES.map((subtype) => <option key={subtype} value={subtype}>{label(subtype)}</option>)}
                </select>
              </Field>
            </div>
            </details>
            {journal.quickRecord.refreshError ? <div><p role="alert">{journal.quickRecord.refreshError}</p><button className="lag-journal-button" onClick={() => void journal.list.reload()}>일상 기록 다시 조회</button></div> : null}
            {rolesLoading ? <InfoCard>역할을 불러오는 중…</InfoCard> : null}
            {rolesError ? <p role="alert" className="lag-journal-feedback" data-state="error">역할 필터 조회 실패: {rolesError}</p> : null}

            <section className="lag-journal-archive" aria-label="일상 기록 목록">
              <div className="lag-journal-section-heading">
                <h4>기록</h4>
                <span>{page.totalElements}개 기록</span>
              </div>
              {loading ? <InfoCard>일상 기록을 불러오는 중…</InfoCard> : null}
              {error ? <ErrorState message={error} retry={() => void journal.list.reload()} /> : null}
              {!loading && !error && page.content.length === 0 ? <InfoCard>일상 기록이 없습니다.</InfoCard> : null}
              <div className="lag-journal-list">
                {page.content.map((entry) => {
                  const presentation = entryPresentation(entry);
                  const role = roleName(entry.primaryRoleId, roles);
                  return (
                    <button
                      key={entry.lifeLogId}
                      type="button"
                      className="lag-journal-entry"
                      data-testid="journal-entry"
                      data-selected={journal.selectedLifeLogId === entry.lifeLogId}
                      aria-pressed={journal.selectedLifeLogId === entry.lifeLogId}
                      onClick={(event) => {
                        caller.current = event.currentTarget;
                        setDetailVisible(true);
                        if (quickRecordOpen) { journal.quickRecord.reset(); creation.close(); }
                        journal.selectEntry(entry.lifeLogId);
                      }}
                    >
                      <span className="lag-journal-source" aria-hidden>{entry.sourceType.slice(0, 2)}</span>
                      <span className="lag-journal-entry-copy">
                        <strong>{presentation.title}</strong>
                        <span className="lag-journal-entry-summary">{presentation.summary}</span>
                        <span className="lag-journal-entry-chips">
                          <span>{label(entry.sourceType)}</span>
                          {entry.subtype ? <span>{label(entry.subtype)}</span> : null}
                          {entry.entryMode === "QUICK" ? <span>간편</span> : null}
                          {role ? <span>{role}</span> : null}
                          {entry.roleEventId !== null ? <span>일정 #{entry.roleEventId}</span> : null}
                        </span>
                      </span>
                      <time dateTime={entry.recordedAt}>{displayTimestamp(entry.recordedAt)}</time>
                    </button>
                  );
                })}
              </div>
              <div className="lag-journal-pagination" aria-label="일상 기록 페이지">
                <button type="button" className="lag-journal-button" disabled={previousDisabled} onClick={() => journal.changePage(journal.params.page - 1)}>이전</button>
                <span>페이지 {page.page + 1} / {Math.max(1, page.totalPages)}</span>
                <button type="button" className="lag-journal-button" disabled={nextDisabled} onClick={() => journal.changePage(journal.params.page + 1)}>다음</button>
              </div>
            </section>
          </div>}>
              <div className="lag-quick-record-surface">
                <div>
                  <p className="lag-journal-eyebrow">간편 기록</p>
                  <h4>지금의 경험을 기록하세요.</h4>
                  <p>수집·운동·감상을 일상 기록에 저장합니다.</p>
                </div>
                <QuickRecordForm
                  roles={roles}
                  rolesLoading={rolesLoading}
                  rolesError={rolesError}
                  pending={journal.quickRecord.pending}
                  error={journal.quickRecord.error}
                  result={journal.quickRecord.result}
                  refreshError={journal.quickRecord.refreshError}
                  canRetry={journal.quickRecord.canRetry}
                  onSubmit={(body) => creation.save(() => journal.quickRecord.submit(body))}
                  onRetry={() => creation.save(journal.quickRecord.retry)}
                  onEdit={journal.quickRecord.invalidateRetry}
                  onRefresh={() => void journal.list.reload()}
                />
              </div>
            </CreateSlot>
        </PanelFrame>
      </PanelStage>

      <AnimatePresence initial={false}>
        {detailVisible && !quickRecordOpen && journal.selectedLifeLogId ? (
          <PanelStage stageKey="lifelog-journal-detail" panelRole="detail" side="right">
            <PanelFrame
              title="일상 기록 상세"
              depth={0}
              contentKey={journal.selectedLifeLogId}
              backButton={<BackButton label="일상 기록 목록으로" onClick={closeDetail} />}
            >
              {journal.detail.loading && !detail ? <InfoCard>일상 기록 상세를 불러오는 중…</InfoCard> : null}
              {journal.detail.error && !detail ? <ErrorState message={journal.detail.error} retry={journal.detail.retry} /> : null}
              {detail ? (
                <article className="lag-journal-detail">
                  {journal.detail.error ? <p role="alert" className="lag-journal-feedback" data-state="error">다시 조회 실패: {journal.detail.error}</p> : null}
                  <div className="lag-journal-detail-hero">
                    <span>{label(detail.sourceType)}</span>
                    <h4>{detail.sourceType === "EXERCISE" ? `${label(detail.source.category)} · ${detail.source.exercisedOn}` : detail.source.title}</h4>
                    <time dateTime={detail.recordedAt}>{displayTimestamp(detail.recordedAt)}</time>
                  </div>
                  <SourceDetail detail={detail} />
                  {onOpenSource ? <button type="button" className="lag-journal-button" onClick={() => onOpenSource(detail)}>원본에서 수정·삭제</button> : null}
                  <DetailSection title="기록 정보">
                    <DetailItem name="기록 유형" value={label(detail.sourceType)} />
                    <DetailItem name="기록 일시" value={displayTimestamp(detail.recordedAt)} />
                    {detail.subtype ? <DetailItem name="기록 분류" value={label(detail.subtype)} /> : null}
                    {detail.entryMode ? <DetailItem name="기록 방식" value={label(detail.entryMode)} /> : null}
                    {detail.reflectionScope ? <DetailItem name="회고 범위" value={label(detail.reflectionScope)} /> : null}
                    {detail.periodKey ? <DetailItem name="기간" value={detail.periodKey} /> : null}
                    {detail.primaryRoleId !== null ? <DetailItem name="역할 정보" value={roleName(detail.primaryRoleId, roles)} /> : null}
                    {detail.roleEventId !== null ? <DetailItem name="역할 일정 정보" value={`#${detail.roleEventId}`} /> : null}
                  </DetailSection>
                </article>
              ) : null}
            </PanelFrame>
          </PanelStage>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
