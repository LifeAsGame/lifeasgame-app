"use client";

import { useRef, useSyncExternalStore, type ReactNode } from "react";
import { AUTH_EXPIRED_EVENT, TOKEN_CHANGED_EVENT, tokenStorage } from "@/shared/api/tokenStorage";

function subscribe(notify: () => void) {
  const events = [AUTH_EXPIRED_EVENT, TOKEN_CHANGED_EVENT, "storage"];
  events.forEach((event) => window.addEventListener(event, notify));
  return () => events.forEach((event) => window.removeEventListener(event, notify));
}
const owner = () => { const session = tokenStorage.read(); return session ? `${session.userId}:${session.playerId}` : "anonymous"; };
// Token refresh keeps the same owner. Account changes unmount all private drafts/reads.
export default function PrivatePersonBoundary({ children }: { children: ReactNode }) {
  const account = useSyncExternalStore(subscribe, owner, () => "anonymous");
  const initial = useRef(account);
  return initial.current === account ? children : null;
}
