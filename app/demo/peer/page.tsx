"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/features/auth/AuthContext";
import { redeemPeerLink } from "@/features/demo/api";
import "../style.css";

export default function DemoPeerPage() {
  const router = useRouter();
  const { adoptDemoPeer } = useAuth();
  const [code, setCode] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return <main className="lag-demo-page"><section className="lag-demo-card lag-demo-peer"><header><span>FRIEND CHAT / PEER</span><h1>채팅 상대 연결</h1><p>독립 브라우저 컨텍스트에서 받은 일회용 코드를 입력하세요.</p></header>
    <form onSubmit={async (event) => { event.preventDefault(); if (pending || !code.trim()) return; setPending(true); setError(null); try { const activation = await redeemPeerLink(code.trim()); setCode(""); await adoptDemoPeer(activation); router.replace("/#/menu/social"); } catch (caught) { setError(caught instanceof Error ? caught.message : "연결에 실패했습니다."); } finally { setPending(false); } }}>
      <label htmlFor="demo-peer-code">연결 코드</label><input id="demo-peer-code" value={code} onChange={(event) => setCode(event.target.value)} autoComplete="off" required />
      {error ? <p role="alert" className="lag-demo-error">{error}</p> : null}<button className="lag-demo-primary" disabled={pending}>{pending ? "연결 중…" : "판매자 세션 연결"}</button>
    </form><p className="lag-demo-foot"><a href="/login">일반 로그인으로 돌아가기</a></p></section></main>;
}
