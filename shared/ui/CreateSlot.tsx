"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { SwipeButton } from "@/features/role/RecordRow";

export function CreateCategory({ title, onOpen, onCreate }: { title: string; onOpen: () => void; onCreate: () => void }) {
  return <div className="lag-create-category">
    <SwipeButton className="lag-role-node" creation onClick={onOpen} onSwipeLeft={onCreate}><strong>{title}</strong><span aria-hidden>→</span></SwipeButton>
    <p className="lag-create-hint">목록: 클릭 · 등록: 왼쪽으로 당긴 후 놓기 / Alt+Enter</p>
  </div>;
}

export function useCreateMode(createRequest = 0) {
  const [creating, setCreating] = useState(false);
  const generation = useRef(0);
  const caller = useRef<HTMLElement | null>(null);
  const open = useCallback(() => { generation.current++; caller.current = document.activeElement instanceof HTMLElement ? document.activeElement : null; setCreating(true); }, []);
  const close = useCallback(() => { generation.current++; setCreating(false); requestAnimationFrame(() => { if (caller.current?.isConnected && !caller.current.closest("[inert]")) caller.current.focus({ preventScroll: true }); }); }, []);
  useEffect(() => { if (createRequest) open(); }, [createRequest, open]);
  const save = async <T,>(submit: () => Promise<T>, onSuccess?: () => void) => {
    const id = generation.current;
    const result = await submit();
    if (result && id === generation.current) { close(); onSuccess?.(); }
    return result;
  };
  return { creating, open, close, save };
}

export default function CreateSlot({ creating, pending, onClose, list, children, showCancel = true }: { showCancel?: boolean; creating: boolean; pending?: boolean; onClose: () => void; list: React.ReactNode; children: React.ReactNode }) {
  const root = useRef<HTMLDivElement>(null);
  const previous = useRef(false), scrollTop = useRef(0);
  useEffect(() => {
    const scroll = root.current?.closest<HTMLElement>(".lag-panel-body, .lag-left-context-content");
    if (creating) {
      scrollTop.current = scroll?.scrollTop ?? 0;
      if (scroll) scroll.scrollTop = 0;
      root.current?.querySelector<HTMLElement>("[data-create-form] [role=radio][aria-checked=true], [data-create-form] input, [data-create-form] select, [data-create-form] textarea")?.focus({ preventScroll: true });
    } else if (previous.current && scroll) scroll.scrollTop = scrollTop.current;
    previous.current = creating;
  }, [creating]);
  return <div ref={root} className="lag-create-slot" data-creating={creating} onKeyDown={(event) => {
    if (creating && event.key === "Escape") { event.preventDefault(); event.stopPropagation(); if (!pending) onClose(); }
  }}>
    <div hidden={creating} className="lag-slot-list">{list}</div>
    {creating ? <div data-create-form className="lag-slot-form">{children}{showCancel ? <button type="button" className="lag-role-button" disabled={pending} onClick={onClose}>취소</button> : null}</div> : null}
  </div>;
}
