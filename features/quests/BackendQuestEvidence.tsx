"use client";

import { useEffect, useRef, useState } from "react";

import { USE_MOCK } from "@/shared/api/client";
import type { JournalEntry, QuestAcceptance, QuestEvidence, QuestEvidenceInput } from "@/shared/api/types";
import { listJournalApi } from "@/features/lifelog/api";
import { completeQuestApi, getQuestEvidenceApi, linkQuestEvidenceApi, unlinkQuestEvidenceApi } from "./api";

const GOAL = "Q_DEV_DEFINE_BACKEND_GOAL";
const JAVA = "Q_DEV_RECORD_JAVA_STUDY";
const DEPLOY = "Q_DEV_DEPLOY_SERVICE";

export const BACKEND_QUEST_CODES = [
  GOAL, JAVA, "Q_DEV_BUILD_SPRING_CRUD", "Q_DEV_MODEL_DATABASE",
  "Q_DEV_WRITE_DOMAIN_TEST", DEPLOY, "Q_DEV_POLISH_README",
] as const;

export function backendQuestCode(stepCode: string): string | null {
  const index = ["RS_DEV_01_DIRECTION", "RS_DEV_02_JAVA", "RS_DEV_03_SPRING", "RS_DEV_04_DATABASE", "RS_DEV_05_TEST", "RS_DEV_06_DEPLOY", "RS_DEV_07_PORTFOLIO"].indexOf(stepCode);
  return index < 0 ? null : BACKEND_QUEST_CODES[index];
}

export function safeEvidenceUrl(value: string): string | null {
  try {
    const url = new URL(value);
    return ["http:", "https:"].includes(url.protocol) && !url.username && !url.password ? url.href : null;
  } catch { return null; }
}

function recordLabel(entry: JournalEntry): string {
  if (entry.sourceType === "COLLECTION") return entry.preview.title;
  if (entry.sourceType === "EXERCISE") return `${entry.preview.category} · ${entry.preview.durationMinutes}분`;
  return entry.preview.title;
}

export default function BackendQuestEvidence({ quest, roleId, onChanged }: {
  quest: QuestAcceptance;
  roleId: number | null;
  onChanged: () => Promise<void>;
}) {
  const [evidence, setEvidence] = useState<QuestEvidence | null>(null);
  const [evidenceKnown, setEvidenceKnown] = useState(false);
  const [loading, setLoading] = useState(true);
  const [records, setRecords] = useState<JournalEntry[]>([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [recordLoading, setRecordLoading] = useState(false);
  const [recordError, setRecordError] = useState<string | null>(null);
  const [recordRetry, setRecordRetry] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [working, setWorking] = useState(false);
  const [memo, setMemo] = useState("");
  const [lifeLogId, setLifeLogId] = useState("");
  const [url, setUrl] = useState("");
  const [description, setDescription] = useState("");
  const pending = useRef(false);
  const readId = useRef(0);
  const recordReadId = useRef(0);
  const isRecord = quest.code !== GOAL && quest.code !== DEPLOY;

  const reloadEvidence = async () => {
    const id = ++readId.current;
    setLoading(true);
    try {
      const value = await getQuestEvidenceApi(quest.code);
      if (id === readId.current) { setEvidence(value); setEvidenceKnown(true); }
    } catch (caught) {
      if (id === readId.current) { setEvidenceKnown(false); setError(caught instanceof Error ? caught.message : "근거 조회 실패"); }
    } finally {
      if (id === readId.current) setLoading(false);
    }
  };

  useEffect(() => {
    if (!USE_MOCK) void reloadEvidence();
    const evidenceRequest = readId;
    const recordRequest = recordReadId;
    return () => { evidenceRequest.current++; recordRequest.current++; };
    // This panel is keyed by acceptance ID, so its reads belong to one Quest.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quest.id]);

  useEffect(() => {
    if (!isRecord || USE_MOCK || quest.status === "COMPLETED") return;
    const id = ++recordReadId.current;
    setRecordLoading(true);
    setRecordError(null);
    void listJournalApi({ page, size: 25 }).then((result) => {
      if (id === recordReadId.current) { setRecords(result.content); setTotalPages(result.totalPages); setLifeLogId((current) => current && !result.content.some((entry) => String(entry.lifeLogId) === current) ? "" : current); setRecordError(null); }
    }).catch((caught) => {
      if (id === recordReadId.current) setRecordError(caught instanceof Error ? caught.message : "기록 조회 실패");
    }).finally(() => { if (id === recordReadId.current) setRecordLoading(false); });
    const request = recordReadId;
    return () => { request.current++; };
  }, [isRecord, page, quest.status, recordRetry]);

  const act = async (request: () => Promise<unknown>) => {
    if (pending.current) return;
    pending.current = true;
    setWorking(true);
    setError(null);
    try {
      await request();
      await Promise.all([onChanged(), reloadEvidence()]);
    } catch (caught) {
      try { await Promise.all([onChanged(), reloadEvidence()]); } catch { /* Show the original uncertainty. */ }
      setError(caught instanceof Error ? caught.message : "요청 후 상태를 확인하지 못했습니다.");
    } finally { pending.current = false; setWorking(false); }
  };

  const submit = () => {
    let input: QuestEvidenceInput;
    if (quest.code === GOAL) {
      if (!memo.trim() || memo.trim().length > 1000) { setError("목표 메모를 1~1000자로 입력하세요."); return; }
      input = { memo: memo.trim() };
    } else if (quest.code === DEPLOY) {
      const safeUrl = safeEvidenceUrl(url.trim());
      if (!safeUrl || url.length > 2048 || !description.trim() || description.trim().length > 1000) { setError("http/https 배포 URL과 1~1000자 설명을 입력하세요."); return; }
      input = { url: safeUrl, description: description.trim() };
    } else {
      const id = Number(lifeLogId);
      if (!Number.isSafeInteger(id) || id <= 0) { setError("내 기록을 선택하세요."); return; }
      input = { lifeLogId: id };
    }
    void act(() => linkQuestEvidenceApi(quest.code, input));
  };

  const eligibleRecords = records.filter((entry) =>
    (entry.primaryRoleId === null || entry.primaryRoleId === roleId) &&
    (entry.sourceType === "EXERCISE" ? Boolean(entry.preview.memo?.trim()) : Boolean(entry.preview.title.trim())) &&
    (quest.code === JAVA || (entry.sourceType === "COLLECTION" && entry.preview.category === "PROJECT")));
  const linked = evidenceKnown && evidence !== null;
  const evidenceUrl = evidence?.url ? safeEvidenceUrl(evidence.url) : null;
  const linkedRecord = records.find((entry) => entry.lifeLogId === evidence?.lifeLogId);
  const evidenceKind = evidence?.kind === "GOAL_MEMO" ? "목표 메모" : evidence?.kind === "LIFE_LOG" ? "생활 기록" : evidence?.kind === "PROJECT" ? "프로젝트 기록" : evidence?.kind === "DEPLOYMENT" ? "배포 기록" : null;

  return (
    <section className="lag-journey-detail-section" aria-label="퀘스트 근거">
      <h4>퀘스트 근거</h4>
      {USE_MOCK ? <p>근거 연결은 실제 서버에서 이용할 수 있습니다.</p> : null}
      {loading ? <p role="status">근거를 확인하는 중…</p> : null}
      {error ? <p role="alert">{error}</p> : null}
      {!loading && !evidenceKnown && !USE_MOCK ? <button type="button" className="lag-journey-button" onClick={() => { setError(null); void reloadEvidence(); }}>근거 다시 조회</button> : null}
      {!loading && linked ? (
        <div className="lag-journey-feedback" role="status">
          <strong>연결된 근거</strong> · {evidenceKind}{evidence.description ?? evidence.memo ? ` · ${evidence.description ?? evidence.memo}` : null}
          {evidence.lifeLogId ? ` · ${linkedRecord ? recordLabel(linkedRecord) : `연결 당시 기록 #${evidence.lifeLogId}`}` : null}
          {evidence.lifeLogId && !linkedRecord && quest.status === "COMPLETED" ? <p>완료 시 보존된 연결 정보입니다. 원본 기록의 현재 상태와 제목은 확인할 수 없습니다.</p> : null}
          {evidenceUrl ? <a href={evidenceUrl} target="_blank" rel="noopener noreferrer">배포 기록 열기</a> : null}
          {quest.code === DEPLOY ? <p>사용자가 남긴 배포 기록이며 서비스 검증이나 자격 인증은 아닙니다.</p> : null}
        </div>
      ) : null}
      {!loading && evidenceKnown && !linked && quest.status === "IN_PROGRESS" && !USE_MOCK ? (
        <div className="lag-backend-evidence-form">
          {quest.code === GOAL ? <label className="lag-journal-field">목표 메모<textarea className="lag-journal-control" value={memo} maxLength={1000} onChange={(event) => setMemo(event.target.value)} /></label> : null}
          {quest.code === DEPLOY ? <>
            <label className="lag-journal-field">배포 URL<input className="lag-journal-control" type="url" value={url} maxLength={2048} onChange={(event) => setUrl(event.target.value)} placeholder="https://" /></label>
            <label className="lag-journal-field">설명<textarea className="lag-journal-control" value={description} maxLength={1000} onChange={(event) => setDescription(event.target.value)} /></label>
            <p>URL은 사용자가 남기는 기록입니다. 서비스 상태를 확인하지 않습니다.</p>
          </> : null}
          {isRecord ? <>
            <label className="lag-journal-field">내 기록
              <select className="lag-journal-control" value={lifeLogId} disabled={recordLoading || Boolean(recordError)} onChange={(event) => setLifeLogId(event.target.value)}>
                <option value="">기록 선택</option>
                {eligibleRecords.map((entry) => <option key={entry.lifeLogId} value={entry.lifeLogId}>{recordLabel(entry)} · #{entry.lifeLogId}</option>)}
              </select>
            </label>
            {recordLoading ? <p>기록을 불러오는 중…</p> : null}
            {recordError ? <p role="alert">{recordError} <button type="button" className="lag-journey-button" disabled={recordLoading} onClick={() => { setRecordLoading(true); setRecordRetry((value) => value + 1); }}>기록 다시 조회</button></p> : null}
            {!recordLoading && !recordError && eligibleRecords.length === 0 ? <p>이 페이지에 연결할 수 있는 기록이 없습니다.</p> : null}
            {totalPages > 1 ? <div className="lag-journey-actions"><button type="button" className="lag-journey-button" disabled={page === 0} onClick={() => { setLifeLogId(""); setPage(page - 1); }}>이전 기록</button><span>{page + 1} / {totalPages}</span><button type="button" className="lag-journey-button" disabled={page + 1 >= totalPages} onClick={() => { setLifeLogId(""); setPage(page + 1); }}>다음 기록</button></div> : null}
          </> : null}
          <button type="button" className="lag-journey-action" disabled={working || recordLoading || Boolean(recordError)} onClick={submit}>근거 연결</button>
        </div>
      ) : null}
      {!loading && linked && quest.status !== "COMPLETED" && !USE_MOCK ? <button type="button" className="lag-journey-button" disabled={working} onClick={() => void act(() => unlinkQuestEvidenceApi(quest.code))}>연결 해제</button> : null}
      {quest.status === "GOAL_REACHED" && evidenceKnown && !USE_MOCK ? <button type="button" className="lag-journey-action" disabled={working || loading} onClick={() => void act(() => completeQuestApi(quest.code))}>퀘스트 완료</button> : null}
      {quest.status === "COMPLETED" ? <p>퀘스트가 완료됐습니다. 보상 정산과 여정의 다음 단계는 별도로 확인하세요.</p> : null}
    </section>
  );
}
