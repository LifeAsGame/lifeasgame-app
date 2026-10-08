"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/features/auth/AuthContext";
import type { DemoActor } from "./api";

const names: Record<DemoActor, string> = { explorer: "탐험가", seller: "판매자", journey: "백엔드 개발자" };
const guides = {
  marketplace: { title: "거래", action: "상점 → 마켓플레이스에서 전용 매물을 예약하고 구매하세요.", result: "지갑·소지품·거래에서 구매 결과를 보고 판매자로 전환해 판매 결과를 확인하세요." },
  recordReward: { title: "기록·보상", action: "기록 모아보기를 두 번 눌러 간편 기록을 여세요. 수집 기록을 짧은 메모로 세 번 저장하고 수신함에서 우편을 직접 수령하세요.", result: "진행 퀘스트·성장·소지품·업적·칭호를 확인하세요. 비동기 정산은 실제 완료 상태를 기다립니다." },
  journey: { title: "백엔드 여정", action: "준비된 역할로 경로를 선택하고 첫 퀘스트를 수락한 뒤 근거를 연결해 완료·전진하세요.", result: "경로의 첫 단계와 진행 퀘스트 상태를 확인하세요." },
  chat: { title: "친구 채팅", action: "별도 브라우저 컨텍스트에서 판매자를 연결하고 직접 채팅을 열어 메시지·읽음을 확인하세요.", result: "양쪽에서 대화 이력을 재접속 후 다시 확인하세요." },
} as const;
type Flow = keyof typeof guides;

export default function DemoGuide() {
  const router = useRouter();
  const { demoRun, demoActor, activateDemoActor } = useAuth();
  const [flow, setFlow] = useState<Flow | null>(null);
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    const saved = window.sessionStorage.getItem("lag_demo_flow");
    if (saved && saved in guides) setFlow(saved as Flow);
  }, []);
  if (!demoRun || demoRun.status !== "READY") return null;
  return <div className="lag-demo-guide">
    <button className="lag-utility-button lag-demo-guide-button" aria-label="체험 안내" aria-expanded={open} onClick={() => setOpen((value) => !value)}>시연</button>
    {open ? <section className="lag-demo-guide-panel" role="dialog" aria-label="포트폴리오 체험 안내">
      <div className="lag-demo-guide-head"><strong>{flow ? guides[flow].title : "포트폴리오 체험"}</strong><button onClick={() => setOpen(false)} aria-label="체험 안내 닫기">닫기</button></div>
      {flow ? <><p><b>할 행동</b> {guides[flow].action}</p><p><b>결과 확인</b> {guides[flow].result}</p></> : <p>시나리오를 선택해 실제 기능을 체험하세요.</p>}
      <div className="lag-demo-guide-actions"><button onClick={() => { setOpen(false); router.push("/demo"); }}>시나리오 선택</button>{demoRun.actors.map((actor) => <button key={actor} disabled={pending || demoActor === actor} onClick={async () => { setPending(true); setError(null); try { await activateDemoActor(demoRun, actor); window.location.assign(new URL("/demo", window.location.origin).href); } catch (caught) { setError(caught instanceof Error ? caught.message : "역할을 바꾸지 못했습니다."); setPending(false); } }}>{names[actor]}</button>)}</div>
      {error ? <p role="alert">{error}</p> : null}
    </section> : null}
  </div>;
}
