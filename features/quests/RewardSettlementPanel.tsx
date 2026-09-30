"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { consumerLabel } from "@/shared/lib/consumerLabels";
import { ApiError, USE_MOCK } from "@/shared/api/client";
import type { RewardSettlement, RewardSettlementLine } from "@/shared/api/types";
import ItemDescription from "@/shared/ui/ItemDescription";
import { getQuestRewardSettlementApi } from "./api";

const STATUS_COPY: Record<RewardSettlement["status"], string> = {
  PENDING: "정산 대기 중입니다. 지급이 완료되지 않았으니 잠시 후 다시 확인하세요.",
  PARTIAL_FAILED: "일부 보상 처리가 실패했습니다. 성공한 보상은 유지됩니다. 잠시 후 확인하거나 문의해 주세요.",
  FAILED: "정산에 실패해 지급이 완료되지 않았습니다. 잠시 후 확인하거나 문의해 주세요.",
  COMPLETED: "정산이 완료됐습니다. 아이템 배송과 수령은 별도 단계입니다.",
  NOT_ELIGIBLE: "이 계정이 일회성 보상을 이미 받아 이번 완료에는 보상이 없습니다.",
};

function lineCopy(line: RewardSettlementLine) {
  if (line.status === "PENDING") return "처리 대기 중으로 아직 확정되지 않았습니다.";
  if (line.status === "FAILED") return "처리에 실패해 이 보상은 지급되지 않았습니다.";
  if (line.rewardType === "GOLD") return "GOLD 입금이 확정됐습니다. 이 금액은 현재 잔액이 아닙니다. 거래소 → 지갑에서 잔액을 확인하세요.";
  if (line.rewardType === "ITEM") return "우편 배송이 확정됐습니다. 소지품 → 수신함에서 수령한 뒤 아이템에서 확인하세요. 배송만으로 현재 소유나 수령 완료가 확정되지는 않습니다.";
  return "경험치 지급이 확정됐습니다. 아이템 거래로 경험치나 퀘스트 완료가 이전되지 않습니다.";
}

// Key this component by acceptance ID so selection changes discard the previous snapshot.
export default function RewardSettlementPanel({ acceptanceId }: { acceptanceId: number }) {
  const [data, setData] = useState<RewardSettlement | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [missing, setMissing] = useState(false);
  const request = useRef(0);
  const reload = useCallback(async () => {
    const id = ++request.current;
    setLoading(true);
    setError(null);
    setMissing(false);
    try {
      const next = await getQuestRewardSettlementApi(acceptanceId);
      if (!next || next.sourceId !== acceptanceId || !Array.isArray(next.lines) || !STATUS_COPY[next.status]) throw new Error("정산 응답을 확인할 수 없습니다.");
      if (id === request.current) setData(next);
    } catch (caught) {
      if (id !== request.current) return;
      if (caught instanceof ApiError && caught.status === 404 && caught.code === "RWD-404-SETTLEMENT-NOT-FOUND") setMissing(true);
      else setError(caught instanceof Error ? caught.message : "정산을 불러오지 못했습니다.");
    } finally {
      if (id === request.current) setLoading(false);
    }
  }, [acceptanceId]);

  useEffect(() => {
    if (!USE_MOCK) void reload();
    return () => { request.current += 1; };
  }, [reload]);

  if (USE_MOCK) return <p>보상 정산은 실제 API 연결 시 확인할 수 있습니다.</p>;
  return (
    <section className="lag-journey-detail-section lag-quest-rewards" aria-label="보상 정산">
      <h4>보상 정산</h4>
      <p>퀘스트 완료, GOLD 입금, 우편 배송, 아이템 수령은 각각 별도로 확인됩니다.</p>
      {loading ? <p role="status">정산을 확인하는 중…</p> : null}
      {missing ? <p role="status">아직 정산이 생성되지 않았습니다(404). 지급은 미확정이며 잠시 후 다시 확인하세요.</p> : null}
      {error ? <p role="alert">정산 조회 실패: {error} 이번 조회로 지급 여부를 확인할 수 없습니다.</p> : null}
      {data && (error || missing || loading) ? <p>마지막으로 확인한 정산을 표시합니다. 최신 상태는 아직 확인되지 않았습니다.</p> : null}
      {data ? (
        <>
          <p role="status"><strong>{consumerLabel(data.status)}</strong> · {STATUS_COPY[data.status]}</p>
          {data.lines.length === 0 && data.status !== "NOT_ELIGIBLE" ? <p>정산에 보상 항목이 없습니다.</p> : null}
          <ul>
            {data.lines.slice().sort((a, b) => a.sortOrder - b.sortOrder).map((line) => (
              <li key={line.lineId}>
                <strong className="lag-reward-result"><span>{consumerLabel(line.rewardType)}</span><span> × {line.amount} · {consumerLabel(line.status)}</span></strong>
                <p>{lineCopy(line)}</p>
                {line.failureCode ? <p>오류 참조: {line.failureCode}</p> : null}
                {line.rewardType === "ITEM" && line.itemId !== null ? <ItemDescription itemId={line.itemId} /> : null}
              </li>
            ))}
          </ul>
        </>
      ) : null}
      <button type="button" className="lag-journey-button" disabled={loading} onClick={() => void reload()}>{error ? "정산 다시 조회" : "정산 새로고침"}</button>
      <p>새로고침은 상태만 조회합니다. 보상 지급·퀘스트 완료·우편 수령을 실행하지 않습니다.</p>
      <p>수령한 아이템은 보관하거나 귀속되지 않은 경우 선택적으로 거래할 수 있습니다. 거래는 성장의 필수 단계가 아니며 개인 기록과 퀘스트 완료는 유지됩니다.</p>
    </section>
  );
}
