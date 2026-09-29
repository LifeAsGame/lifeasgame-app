import { StrictMode } from "react";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import { ApiError } from "@/shared/api/client";
import type { RewardSettlement, RewardSettlementLine } from "@/shared/api/types";
import RewardSettlementPanel from "./RewardSettlementPanel";

const api = vi.hoisted(() => ({ getQuestRewardSettlementApi: vi.fn(), getItemApi: vi.fn() }));
vi.mock("./api", () => ({ getQuestRewardSettlementApi: api.getQuestRewardSettlementApi }));
vi.mock("@/shared/api/items", () => ({ getItemApi: api.getItemApi }));
vi.mock("@/shared/api/client", async (original) => ({ ...await original<object>(), USE_MOCK: false }));

const line = (rewardType: RewardSettlementLine["rewardType"], status: RewardSettlementLine["status"] = "SUCCEEDED"): RewardSettlementLine => ({
  lineId: rewardType === "GOLD" ? 1 : rewardType === "ITEM" ? 2 : 3, rewardDefinitionId: 1, rewardDefinitionCode: "INTERNAL",
  rewardType, amount: rewardType === "GOLD" ? 100 : rewardType === "EXP" ? 20 : 1,
  itemId: rewardType === "ITEM" ? 7 : null, itemCode: rewardType === "ITEM" ? "IT_RECORD_CRYSTAL" : null,
  sortOrder: 1, status, failureCode: status === "FAILED" ? "RWD-FAIL" : null, createdAt: "", updatedAt: "",
});
const settlement = (status: RewardSettlement["status"] = "COMPLETED", lines = [line("GOLD"), line("ITEM"), line("EXP")], sourceId = 31): RewardSettlement => ({
  settlementId: 1, sourceType: "QUEST_COMPLETION", sourceId, rewardProfileId: 1, rewardProfileCode: "INTERNAL_PROFILE", status, lines, createdAt: "", updatedAt: "",
});
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => { resolve = done; });
  return { promise, resolve };
}
beforeEach(() => {
  vi.resetAllMocks();
  api.getQuestRewardSettlementApi.mockResolvedValue(settlement());
  api.getItemApi.mockResolvedValue({ id: 7, name: "기록 결정", description: "활동 기록 퀘스트에서 얻는 수집품. 보관하거나 거래할 수 있습니다." });
});

it("separates deposits, delivery, ownership and server item description without internal reward codes", async () => {
  render(<RewardSettlementPanel acceptanceId={31} />);
  expect(await screen.findByText("GOLD × 100 · 성공")).toBeInTheDocument();
  expect(screen.getByText("아이템 × 1 · 성공")).toBeInTheDocument();
  expect(screen.getByText("경험치 × 20 · 성공")).toBeInTheDocument();
  expect(await screen.findByText(/활동 기록 퀘스트에서 얻는 수집품/)).toBeInTheDocument();
  expect(screen.getByText(/현재 잔액이 아닙니다/)).toBeInTheDocument();
  expect(screen.getByText(/현재 소유나 수령 완료가 확정되지는 않습니다/)).toBeInTheDocument();
  expect(screen.getByText(/거래는 성장의 필수 단계가 아니며/)).toBeInTheDocument();
  expect(screen.queryByText(/INTERNAL/)).not.toBeInTheDocument();
});

it.each([
  ["PENDING", "PENDING", "정산 대기 중"],
  ["PARTIAL_FAILED", "FAILED", "일부 보상 처리가 실패"],
  ["FAILED", "FAILED", "정산에 실패"],
] as const)("shows %s and each line's actual state", async (status, itemStatus, copy) => {
  api.getQuestRewardSettlementApi.mockResolvedValue(settlement(status, [line("GOLD", status === "PENDING" ? "PENDING" : "SUCCEEDED"), line("ITEM", itemStatus)]));
  render(<RewardSettlementPanel acceptanceId={31} />);
  expect(await screen.findByText(new RegExp(copy))).toBeInTheDocument();
  expect(screen.getByText(`아이템 × 1 · ${itemStatus === "PENDING" ? "대기 중" : "실패"}`)).toBeInTheDocument();
  expect(screen.queryByText(/정산이 완료됐습니다/)).not.toBeInTheDocument();
});

it("treats NOT_ELIGIBLE with empty lines as no grant, not completion or error", async () => {
  api.getQuestRewardSettlementApi.mockResolvedValue(settlement("NOT_ELIGIBLE", []));
  render(<RewardSettlementPanel acceptanceId={31} />);
  expect(await screen.findByText(/이번 완료에는 보상이 없습니다/)).toBeInTheDocument();
  expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  expect(screen.queryByText(/정산이 완료됐습니다|정산에 보상 항목이 없습니다/)).not.toBeInTheDocument();
});

it("distinguishes an absent settlement from HTTP errors and recovers with GET alone", async () => {
  api.getQuestRewardSettlementApi.mockRejectedValueOnce(new ApiError(404, "RWD-404-SETTLEMENT-NOT-FOUND", "absent"))
    .mockRejectedValueOnce(new ApiError(503, "HTTP_503", "offline")).mockResolvedValue(settlement());
  render(<RewardSettlementPanel acceptanceId={31} />);
  expect(await screen.findByText(/아직 정산이 생성되지 않았습니다/)).toBeInTheDocument();
  expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "정산 새로고침" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("조회 실패");
  expect(screen.queryByText(/정산이 완료됐습니다/)).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "정산 다시 조회" }));
  expect(await screen.findByText(/정산이 완료됐습니다/)).toBeInTheDocument();
  expect(api.getQuestRewardSettlementApi.mock.calls).toEqual([[31], [31], [31]]);
});

it.each([new ApiError(404, "HTTP_404", "wrong route"), new Error("network failure"), undefined])("does not turn lookup failure or an empty response into payment", async (error) => {
  if (error) api.getQuestRewardSettlementApi.mockRejectedValue(error);
  else api.getQuestRewardSettlementApi.mockResolvedValue(undefined);
  render(<RewardSettlementPanel acceptanceId={31} />);
  expect(await screen.findByRole("alert")).toHaveTextContent("조회 실패");
  expect(screen.queryByText(/정산이 완료됐습니다|아직 정산이 생성되지 않았습니다/)).not.toBeInTheDocument();
});

it("preserves confirmed lines when a later GET fails and item detail failure stays independent", async () => {
  api.getItemApi.mockRejectedValue(new Error("item unavailable"));
  render(<RewardSettlementPanel acceptanceId={31} />);
  await screen.findByText("GOLD × 100 · 성공");
  await screen.findByText(/Item description unavailable/);
  api.getQuestRewardSettlementApi.mockRejectedValueOnce(new Error("offline"));
  fireEvent.click(screen.getByRole("button", { name: "정산 새로고침" }));
  await screen.findByText(/마지막으로 확인한 정산/);
  expect(screen.getByText("GOLD × 100 · 성공")).toBeInTheDocument();
  api.getItemApi.mockResolvedValue({ id: 7, name: "기록 결정", description: "Server description" });
  fireEvent.click(screen.getByRole("button", { name: "Retry item details" }));
  expect(await screen.findByText(/Server description/)).toBeInTheDocument();
  expect(api.getQuestRewardSettlementApi).toHaveBeenCalledTimes(2);
});

it("discards a previous Quest response after selection and after logout unmount", async () => {
  const stale = deferred<RewardSettlement>();
  api.getQuestRewardSettlementApi.mockReturnValueOnce(stale.promise).mockResolvedValue(settlement("NOT_ELIGIBLE", [], 32));
  const view = render(<RewardSettlementPanel key={31} acceptanceId={31} />);
  view.rerender(<RewardSettlementPanel key={32} acceptanceId={32} />);
  await screen.findByText(/이번 완료에는 보상이 없습니다/);
  await act(async () => { stale.resolve(settlement()); });
  expect(screen.queryByText("GOLD × 100 · 성공")).not.toBeInTheDocument();
  const loggedOut = deferred<RewardSettlement>();
  api.getQuestRewardSettlementApi.mockReturnValueOnce(loggedOut.promise);
  fireEvent.click(screen.getByRole("button", { name: "정산 새로고침" }));
  view.rerender(<p>Logged out</p>);
  await act(async () => { loggedOut.resolve(settlement("COMPLETED", [line("GOLD")], 32)); });
  expect(screen.getByText("Logged out")).toBeInTheDocument();
  expect(screen.queryByRole("region", { name: "보상 정산" })).not.toBeInTheDocument();
});

it("keeps the latest of overlapping reads when effects restart", async () => {
  const stale = deferred<RewardSettlement>();
  api.getQuestRewardSettlementApi.mockReturnValueOnce(stale.promise).mockResolvedValue(settlement("NOT_ELIGIBLE", []));
  render(<StrictMode><RewardSettlementPanel acceptanceId={31} /></StrictMode>);
  await screen.findByText(/이번 완료에는 보상이 없습니다/);
  await act(async () => { stale.resolve(settlement()); });
  expect(within(screen.getByRole("region", { name: "보상 정산" })).queryByText(/정산이 완료됐습니다/)).not.toBeInTheDocument();
  await waitFor(() => expect(api.getQuestRewardSettlementApi).toHaveBeenCalledTimes(2));
});
