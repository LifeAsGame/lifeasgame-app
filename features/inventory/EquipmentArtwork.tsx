"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

import { USE_MOCK } from "@/shared/api/client";
import { getItemApi } from "@/shared/api/items";

const EQUIPMENT_ASSET_PATHS: Record<string, string> = {
  IT_RECORD_KEEPER_HAT: "/content/equipment/IT_RECORD_KEEPER_HAT",
  IT_DEVELOPER_HOODIE: "/content/equipment/IT_DEVELOPER_HOODIE",
};

export default function EquipmentArtwork({ itemId, kind, name }: { itemId: number; kind: "icon" | "preview"; name: string }) {
  const [path, setPath] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let active = true;
    setPath(null);
    setLoaded(false);
    if (!USE_MOCK) void getItemApi(itemId).then((item) => {
      if (active && item.id === itemId) setPath(EQUIPMENT_ASSET_PATHS[item.code] ?? null);
    }).catch(() => {});
    return () => { active = false; };
  }, [itemId]);

  return (
    <span className={kind === "icon" ? "lag-equipment-icon" : "lag-equipment-preview"} aria-label={kind === "preview" ? `${name} 이미지` : undefined}>
      {path ? <Image unoptimized src={`${path}/${kind}.webp`} width={kind === "icon" ? 38 : 240} height={kind === "icon" ? 38 : 240} alt={kind === "preview" ? name : ""} style={{ display: loaded ? "block" : "none" }} onLoad={() => setLoaded(true)} onError={() => { setPath(null); setLoaded(false); }} /> : null}
      {!loaded ? <span aria-hidden>{kind === "icon" ? name.slice(0, 1) : "이미지 준비 중"}</span> : null}
    </span>
  );
}
