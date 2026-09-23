"use client";

import { useEffect, useState } from "react";
import { USE_MOCK } from "@/shared/api/client";
import { getItemApi, type ItemDetail } from "@/shared/api/items";

export default function ItemDescription({ itemId }: { itemId: number }) {
  const [item, setItem] = useState<ItemDetail | null>(null);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    setItem(null);
    setError(false);
    if (!USE_MOCK) void getItemApi(itemId).then((data) => {
      if (active) setItem(data);
    }).catch(() => { if (active) setError(true); });
    return () => { active = false; };
  }, [itemId, attempt]);

  if (USE_MOCK) return null;
  if (error) return <p role="alert">Item description unavailable. <button type="button" className="lag-journey-button" onClick={() => setAttempt((value) => value + 1)}>Retry item details</button></p>;
  if (!item || item.id !== itemId) return <p role="status">Loading item description...</p>;
  return <p><strong>{item.name}</strong> · {item.description ?? "No description provided."}</p>;
}
