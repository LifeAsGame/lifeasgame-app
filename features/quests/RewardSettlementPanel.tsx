"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ApiError, USE_MOCK } from "@/shared/api/client";
import type { RewardSettlement, RewardSettlementLine } from "@/shared/api/types";
import ItemDescription from "@/shared/ui/ItemDescription";
import { getQuestRewardSettlementApi } from "./api";

const STATUS_COPY: Record<RewardSettlement["status"], string> = {
  PENDING: "Settlement pending. Payment is not yet complete. Check again shortly.",
  PARTIAL_FAILED: "Some rewards failed. Successful lines remain confirmed; check again later or contact support.",
  FAILED: "Settlement failed. Payment is not complete. Check again later or contact support.",
  COMPLETED: "Settlement completed. Item delivery and Inventory receipt are separate steps.",
  NOT_ELIGIBLE: "No rewards for this completion: the account has already used this one-time reward eligibility.",
};

function lineCopy(line: RewardSettlementLine) {
  if (line.status === "PENDING") return "Processing pending; not yet confirmed.";
  if (line.status === "FAILED") return "Processing failed; not paid by this line.";
  if (line.rewardType === "GOLD") return "GOLD deposit confirmed. This reward amount is not your available balance; check Exchange → Wallet.";
  if (line.rewardType === "ITEM") return "Mailbox delivery confirmed. Check Inventory → Inbox to Claim, then Items to confirm receipt. This is not proof of current ownership or a completed Claim.";
  return "EXP grant confirmed. Trading items does not transfer EXP or Quest completion.";
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
      if (!next || next.sourceId !== acceptanceId || !Array.isArray(next.lines) || !STATUS_COPY[next.status]) throw new Error("Invalid settlement response.");
      if (id === request.current) setData(next);
    } catch (caught) {
      if (id !== request.current) return;
      if (caught instanceof ApiError && caught.status === 404 && caught.code === "RWD-404-SETTLEMENT-NOT-FOUND") setMissing(true);
      else setError(caught instanceof Error ? caught.message : "Unable to load settlement.");
    } finally {
      if (id === request.current) setLoading(false);
    }
  }, [acceptanceId]);

  useEffect(() => {
    if (!USE_MOCK) void reload();
    return () => { request.current += 1; };
  }, [reload]);

  if (USE_MOCK) return <p>Reward settlement is available in API mode.</p>;
  return (
    <section className="lag-journey-detail-section lag-quest-rewards" aria-label="Reward settlement">
      <h4>Reward settlement</h4>
      <p>Quest completion, GOLD deposit, Mailbox delivery and Inventory receipt are separate facts.</p>
      {loading ? <p role="status">Checking settlement...</p> : null}
      {missing ? <p role="status">No settlement has been created yet (404). Payment is not confirmed. Check again shortly.</p> : null}
      {error ? <p role="alert">Settlement lookup failed: {error} Payment cannot be confirmed by this lookup.</p> : null}
      {data && (error || missing || loading) ? <p>Last confirmed settlement is shown below; the latest state is not confirmed.</p> : null}
      {data ? (
        <>
          <p role="status"><strong>{data.status}</strong> · {STATUS_COPY[data.status]}</p>
          {data.lines.length === 0 && data.status !== "NOT_ELIGIBLE" ? <p>No reward lines in this settlement.</p> : null}
          <ul>
            {data.lines.slice().sort((a, b) => a.sortOrder - b.sortOrder).map((line) => (
              <li key={line.lineId}>
                <strong>{line.rewardType} × {line.amount} · {line.status}</strong>
                <p>{lineCopy(line)}</p>
                {line.failureCode ? <p>Failure reference: {line.failureCode}</p> : null}
                {line.rewardType === "ITEM" && line.itemId !== null ? <ItemDescription itemId={line.itemId} /> : null}
              </li>
            ))}
          </ul>
        </>
      ) : null}
      <button type="button" className="lag-journey-button" disabled={loading} onClick={() => void reload()}>{error ? "Retry settlement lookup" : "Refresh settlement"}</button>
      <p>Refresh only checks status. It does not pay rewards, complete a Quest or Claim mail.</p>
      <p>After confirming receipt, you can keep an item or optionally trade it if it is unbound. Trading is not required for growth; your personal records and Quest completion stay with you.</p>
    </section>
  );
}
