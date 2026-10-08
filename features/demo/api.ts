import { ApiError, USE_MOCK, apiGet, apiPost } from "@/shared/api/client";
import type { TokenPair } from "@/shared/api/types";

export type DemoActor = "explorer" | "seller" | "journey";
export type DemoRun = {
  runId: string;
  templateVersion: "portfolio-v1";
  status: "PROVISIONING" | "READY" | "FAILED" | "EXPIRED" | "CLOSED";
  failureCode: string | null;
  createdAt: string;
  expiresAt: string;
  actors: DemoActor[];
  scenarios: {
    marketplace: { buyer: DemoActor; seller: DemoActor; itemCode: string; price: number; quantity: number; listingId: number };
    recordReward: { actor: DemoActor; firstQuestCode: string; mailQuestCode: string; recordCountForMail: number };
    journey: { actor: DemoActor; routeCode: string; firstQuestCode: string; roleId: number; projectLifeLogId: number };
    chat: { actorA: DemoActor; actorB: DemoActor; channelId: number };
  };
};

export type DemoActivation = TokenPair & { runId: string; actor: DemoActor };
const path = "/api/v1/demo";
const enabled = () => {
  if (USE_MOCK) throw new ApiError(503, "DEMO-DISABLED", "실제 서버에 연결한 미리보기에서 체험을 시작하세요.");
};

export async function bootstrapDemo(): Promise<{ templateVersion: string; proof: string; expiresAt: string }> {
  enabled();
  return apiGet(`${path}/bootstrap`, { auth: false, retry: false });
}
export async function startDemo(proof: string, key: string): Promise<DemoRun> {
  enabled();
  return apiPost(`${path}/runs`, {}, { auth: false, retry: false, headers: { "X-Demo-Proof": proof, "Idempotency-Key": key } });
}
export async function currentDemo(): Promise<DemoRun> {
  enabled();
  return apiGet(`${path}/runs/current`, { auth: false, retry: false });
}
export async function retryDemo(): Promise<DemoRun> {
  enabled();
  return apiPost(`${path}/runs/current/retry`, {}, { auth: false, retry: false });
}
export async function activateDemo(actor: DemoActor): Promise<DemoActivation> {
  enabled();
  return apiPost(`${path}/runs/current/actors/${actor}/activate`, {}, { auth: false, retry: false });
}
export async function closeDemo(): Promise<void> {
  enabled();
  return apiPost(`${path}/runs/current/close`, {}, { auth: false, retry: false });
}
export async function createPeerLink(): Promise<{ code: string; expiresAt: string }> {
  enabled();
  return apiPost(`${path}/runs/current/peer-links`, {}, { auth: false, retry: false });
}
export async function redeemPeerLink(code: string): Promise<DemoActivation> {
  enabled();
  return apiPost(`${path}/peer-links/redeem`, { code }, { auth: false, retry: false });
}
