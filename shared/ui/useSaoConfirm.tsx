"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import SaoAlert from "./SaoAlert";

export function useSaoConfirm() {
  const [message, setMessage] = useState<string | null>(null);
  const resolver = useRef<((answer: boolean) => void) | null>(null);
  useEffect(() => () => { resolver.current?.(false); resolver.current = null; }, []);
  const confirm = useCallback((text: string) => new Promise<boolean>((resolve) => {
    if (resolver.current) { resolve(false); return; }
    resolver.current = resolve; setMessage(text);
  }), []);
  const finish = (answer: boolean) => { const resolve = resolver.current; resolver.current = null; setMessage(null); resolve?.(answer); };
  return { confirm, dialog: <SaoAlert isOpen={message !== null} title="작업 확인" message={message ?? undefined} onConfirm={() => finish(true)} onCancel={() => finish(false)} /> };
}
