"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { getEquippedGearApi } from "@/lib/api/endpoints/equipment.api";
import type { EquipmentSlotInfo, PlayerInfo, PlayerTitleInfo } from "@/shared/api/types";
import { getCurrentPlayerApi, getPlayerTitlesApi } from "./api";
import { AWARD_CHANGED_EVENT } from "./awardEvents";

type PlayerContext = {
  player: PlayerInfo;
  equipments: EquipmentSlotInfo[];
  representativeTitle: PlayerTitleInfo | null;
};

const message = (caught: unknown, fallback: string) => caught instanceof Error ? caught.message : fallback;

export function usePlayerContext(enabled: boolean) {
  const [data, setData] = useState<PlayerContext | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestId = useRef(0);

  const reload = useCallback(async () => {
    const current = ++requestId.current;
    setLoading(true);
    setError(null);
    const [player, equipment, titles] = await Promise.allSettled([getCurrentPlayerApi(), getEquippedGearApi(), getPlayerTitlesApi()]);
    if (current !== requestId.current) return undefined;

    if (player.status === "rejected") {
      setError(message(player.reason, "Unable to load Current Player."));
      setLoading(false);
      return undefined;
    }

    const next = {
      player: player.value,
      equipments: equipment.status === "fulfilled" ? equipment.value : [],
      representativeTitle: titles.status === "fulfilled" ? titles.value.find(({ titleId }) => titleId === player.value.representativeTitleId) ?? null : null,
    };
    setData(next);
    if (equipment.status === "rejected") {
      setError(message(equipment.reason, "Unable to load Equipment."));
    }
    setLoading(false);
    return next;
  }, []);

  useEffect(() => {
    if (enabled) void reload();
    else {
      requestId.current += 1;
      setData(null);
      setLoading(false);
      setError(null);
    }
    return () => { requestId.current += 1; };
  }, [enabled, reload]);

  useEffect(() => {
    if (!enabled) return;
    const refresh = () => { void reload(); };
    window.addEventListener(AWARD_CHANGED_EVENT, refresh);
    return () => window.removeEventListener(AWARD_CHANGED_EVENT, refresh);
  }, [enabled, reload]);

  return { data, loading, error, reload };
}
