"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/features/auth/AuthContext";
import { ApiError } from "@/shared/api/client";
import { bootstrapDemo, closeDemo, createPeerLink, currentDemo, retryDemo, startDemo, type DemoActor, type DemoRun } from "@/features/demo/api";
import { demoStorage } from "@/features/demo/storage";
import { useTheme } from "@/features/theme/ThemeProvider";
import "./style.css";

const actorName: Record<DemoActor, string> = { explorer: "탐험가", seller: "판매자", journey: "백엔드 개발자" };
const message = (error: unknown) => {
  if (error instanceof ApiError && error.code === "DEMO-CAPACITY-EXCEEDED") return "체험 생성 가능 수에 도달했습니다. 나중에 다시 시도해 주세요.";
  if (error instanceof ApiError && ["DEMO-RUN-EXPIRED", "DEMO-SESSION-INVALID"].includes(error.code)) return "체험이 만료되었거나 종료되었습니다. 새 체험을 시작하세요.";
  return error instanceof Error ? error.message : "체험을 준비하지 못했습니다.";
};
const pause = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
type Flow = "marketplace" | "recordReward" | "journey" | "chat";
const flows: { key: Flow; title: string; action: string; result: string; destination: string }[] = [
  { key: "marketplace", title: "거래", action: "전용 매물 예약 → 구매", result: "구매자 지갑·소지품·거래 내역과 같은 체험의 판매자 결과", destination: "/#\/menu/market/shop" },
  { key: "recordReward", title: "기록·보상", action: "기록 모아보기에서 간편 기록 3개를 짧은 메모로 저장 → 수신함에서 직접 수령", result: "퀘스트·성장·소지품·업적·칭호", destination: "/#\/menu/lifelog/journal" },
  { key: "journey", title: "백엔드 여정", action: "경로 선택 → 첫 퀘스트 수락 → 근거 연결 → 완료 → 다음 단계로", result: "첫 단계 전진과 현재 경로 상태", destination: "/#\/menu/quests/routes" },
  { key: "chat", title: "친구 채팅", action: "독립 브라우저에서 상대 연결 → 메시지·읽음 → 재접속", result: "양쪽 이력과 읽음 상태", destination: "/#\/menu/social" },
];

export default function DemoPage() {
  const router = useRouter();
  const { preference, setPreference } = useTheme();
  const { isLoading, isAuthenticated, demoRun, demoActor, activateDemoActor, logout } = useAuth();
  const [run, setRun] = useState<DemoRun | null>(null);
  const [pending, setPending] = useState(false);
  const [stage, setStage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [link, setLink] = useState<{ code: string; expiresAt: string } | null>(null);
  const once = useRef(false);
  const locked = useRef(false);

  const waitReady = useCallback(async (initial: DemoRun) => {
    let view = initial;
    for (let i = 0; view.status === "PROVISIONING" && i < 10; i++) {
      setStage("체험을 준비하는 중…");
      await pause(1200);
      view = await currentDemo();
      if (view.runId !== initial.runId) throw new Error("체험 연결이 바뀌었습니다. 새로 시작하세요.");
      setRun(view);
    }
    if (view.status === "READY") {
      setStage("탐험가 역할을 연결하는 중…");
      await activateDemoActor(view, "explorer");
      demoStorage.clearAttempt();
    } else if (view.status === "FAILED") {
      setError("준비에 실패했습니다. 같은 체험을 다시 준비할 수 있습니다.");
    } else if (view.status === "PROVISIONING") {
      setError("아직 준비 중입니다. 잠시 후 준비 상태를 다시 확인해 주세요.");
    } else {
      setError("체험이 종료되었거나 만료되었습니다. 새 체험을 시작하세요.");
    }
  }, [activateDemoActor]);

  const begin = useCallback(async (fresh: boolean) => {
    if (locked.current) return;
    locked.current = true;
    setPending(true); setError(null); setLink(null);
    try {
      if (fresh) { logout(); demoStorage.clearAttempt(); setRun(null); }
      let attempt = demoStorage.attempt();
      if (!attempt) {
        setStage("브라우저 체험 연결을 준비하는 중…");
        const bootstrap = await bootstrapDemo();
        if (bootstrap.templateVersion !== "portfolio-v1") throw new Error("지원하지 않는 체험 계약입니다.");
        attempt = { key: crypto.randomUUID(), proof: bootstrap.proof, expiresAt: bootstrap.expiresAt };
        demoStorage.saveAttempt(attempt);
      }
      setStage("새 체험을 시작하는 중…");
      const view = await startDemo(attempt.proof, attempt.key);
      if (view.templateVersion !== "portfolio-v1") throw new Error("지원하지 않는 체험 계약입니다.");
      setRun(view);
      await waitReady(view);
    } catch (caught) { setError(message(caught)); }
    finally { locked.current = false; setPending(false); }
  }, [logout, waitReady]);

  useEffect(() => {
    if (isLoading || once.current) return;
    once.current = true;
    const fresh = demoStorage.consumeStart();
    if (fresh) { void begin(true); return; }
    if (demoStorage.attempt()) { void begin(false); return; }
    if (demoRun) {
      setRun(demoRun);
      void currentDemo().then((view) => {
        if (view.runId !== demoRun.runId || view.status !== "READY") throw new Error("체험이 종료되었거나 만료되었습니다. 새 체험을 시작하세요.");
        setRun(view);
      }).catch((caught) => { logout(); setRun(null); setError(message(caught)); });
    }
  }, [isLoading, demoRun, begin, logout]);

  const resume = async () => {
    if (!run || locked.current) return;
    locked.current = true; setPending(true); setError(null);
    try {
      const next = run.status === "FAILED" ? await retryDemo() : await currentDemo();
      if (next.runId !== run.runId) throw new Error("체험 연결이 바뀌었습니다. 새로 시작하세요.");
      setRun(next);
      await waitReady(next);
    } catch (caught) { setError(message(caught)); }
    finally { locked.current = false; setPending(false); }
  };

  const openFlow = async (flow: Flow) => {
    if (!run || run.status !== "READY" || pending) return;
    const target = flow === "marketplace" ? run.scenarios.marketplace.buyer : flow === "recordReward" ? run.scenarios.recordReward.actor : flow === "journey" ? run.scenarios.journey.actor : run.scenarios.chat.actorA;
    setPending(true); setError(null);
    try {
      if (!isAuthenticated || demoActor !== target) await activateDemoActor(run, target);
      window.sessionStorage.setItem("lag_demo_flow", flow);
      router.push(flows.find(({ key }) => key === flow)!.destination);
    } catch (caught) { setError(message(caught)); }
    finally { setPending(false); }
  };

  const switchActor = async (actor: DemoActor) => {
    if (!run || pending || (isAuthenticated && actor === demoActor)) return;
    setPending(true); setError(null);
    try { await activateDemoActor(run, actor); }
    catch (caught) { setError(message(caught)); }
    finally { setPending(false); }
  };

  const close = async () => {
    if (pending) return;
    setPending(true); setError(null);
    try { await closeDemo(); logout(); setRun(null); setLink(null); }
    catch (caught) { setError(message(caught)); }
    finally { setPending(false); }
  };

  const ready = run?.status === "READY" && demoRun?.runId === run.runId;
  return <main className="lag-demo-page"><section className="lag-demo-card">
    <header><span>PORTFOLIO / LIVE PREVIEW</span><h1>포트폴리오 체험</h1><p>실제 기능 화면에서 네 가지 흐름을 직접 체험합니다.</p></header>
    {pending ? <p role="status" className="lag-demo-status">{stage || "연결하는 중…"}</p> : null}
    {error ? <p role="alert" className="lag-demo-error">{error}</p> : null}
    {!run && !pending ? <button className="lag-demo-primary" onClick={() => void begin(!demoStorage.attempt())}>{demoStorage.attempt() ? "같은 시작 시도 다시 연결" : "새 체험 시작"}</button> : null}
    {run && !ready ? <div className="lag-demo-actions"><p>현재 상태: {run.status}</p><button disabled={pending} onClick={() => void resume()}>{run.status === "FAILED" ? "같은 체험 다시 준비" : "준비 상태 다시 확인"}</button><button disabled={pending} onClick={() => void begin(true)}>새 체험 시작</button></div> : null}
    {ready ? <>
      <div className="lag-demo-summary"><strong>준비 완료</strong><span>현재 역할: {isAuthenticated && demoActor ? actorName[demoActor] : "다시 연결 필요"}</span><small>새로고침과 역할 전환에도 이 체험의 진행 상태가 유지됩니다.</small></div>
      <div className="lag-demo-flows">{flows.map((flow) => <article key={flow.key}>
        <h2>{flow.title}</h2><p><b>할 행동</b> {flow.action}</p><p><b>결과 확인</b> {flow.result}</p>
        {flow.key === "marketplace" ? <small>전용 매물 #{run.scenarios.marketplace.listingId} · {run.scenarios.marketplace.price} GOLD</small> : null}
        {flow.key === "journey" ? <small>준비된 역할 #{run.scenarios.journey.roleId}</small> : null}
        <button disabled={pending} onClick={() => void openFlow(flow.key)}>실제 화면으로 이동</button>
      </article>)}</div>
      <section className="lag-demo-secondary"><h2>같은 체험의 역할</h2><div>{run.actors.map((actor) => <button key={actor} disabled={pending || (isAuthenticated && demoActor === actor)} onClick={() => void switchActor(actor)}>{actorName[actor]}{isAuthenticated && demoActor === actor ? " · 현재" : ""}</button>)}</div><p>역할 전환은 진행을 초기화하지 않습니다.</p></section>
      <section className="lag-demo-secondary"><h2>화면 테마</h2><div><button aria-pressed={preference === "WARM_BEIGE"} onClick={() => setPreference("WARM_BEIGE")}>Beige</button><button aria-pressed={preference === "ASTRAL"} onClick={() => setPreference("ASTRAL")}>Astral</button></div></section>
      <section className="lag-demo-secondary"><h2>친구 채팅 상대 연결</h2><p>다른 브라우저 컨텍스트에서 <code>http://127.0.0.1:13005/demo/peer</code>를 열어 일회용 코드를 입력하세요. 같은 브라우저 창을 복제하면 인증이 섞일 수 있습니다.</p><button disabled={pending} onClick={() => void createPeerLink().then(setLink).catch((caught) => setError(message(caught)))}>연결 코드 발급</button>{link ? <p className="lag-demo-code">코드: <strong>{link.code}</strong><small>5분 이내 한 번만 사용</small></p> : null}</section>
      <div className="lag-demo-actions"><button disabled={pending} onClick={() => void begin(true)}>새 체험 로그인</button><button disabled={pending} onClick={() => void close()}>체험 종료</button></div>
    </> : null}
    <p className="lag-demo-foot"><a href="/login" onClick={() => logout()}>일반 계정 로그인</a></p>
  </section></main>;
}
