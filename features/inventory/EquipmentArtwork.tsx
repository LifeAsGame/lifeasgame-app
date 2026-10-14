"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

import { USE_MOCK } from "@/shared/api/client";
import { getItemApi } from "@/shared/api/items";

const EQUIPMENT_ASSET_KEYS: Record<string, { icon: string; preview: string }> = {
  IT_RECORD_KEEPER_HAT: { icon: "it_record_keeper_hat", preview: "asset.it_record_keeper_hat" },
  IT_DEVELOPER_HOODIE: { icon: "it_developer_hoodie", preview: "asset.it_developer_hoodie" },
};

const ASSET_PATHS: Record<string, string> = {
  it_record_keeper_hat: "/content/equipment/IT_RECORD_KEEPER_HAT/icon.webp",
  "asset.it_record_keeper_hat": "/content/equipment/IT_RECORD_KEEPER_HAT/preview.webp",
  it_developer_hoodie: "/content/equipment/IT_DEVELOPER_HOODIE/icon.webp",
  "asset.it_developer_hoodie": "/content/equipment/IT_DEVELOPER_HOODIE/preview.webp",
};

export default function EquipmentArtwork({ itemId, kind, name }: { itemId: number; kind: "icon" | "preview"; name: string }) {
  const [path, setPath] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let active = true;
    setPath(null);
    setLoaded(false);
    if (!USE_MOCK) void getItemApi(itemId).then((item) => {
      if (active && item.id === itemId) {
        const assetKey = EQUIPMENT_ASSET_KEYS[item.code]?.[kind];
        setPath(assetKey ? ASSET_PATHS[assetKey] ?? null : null);
      }
    }).catch(() => {});
    return () => { active = false; };
  }, [itemId, kind]);

  return (
    <span className={kind === "icon" ? "lag-equipment-icon" : "lag-equipment-preview"} aria-label={kind === "preview" ? `${name} 이미지` : undefined}>
      {path ? <Image unoptimized loading="eager" src={path} width={kind === "icon" ? 48 : 240} height={kind === "icon" ? 48 : 240} alt={kind === "preview" ? name : ""} style={{ opacity: loaded ? 1 : 0 }} onLoad={() => setLoaded(true)} onError={() => { setPath(null); setLoaded(false); }} /> : null}
      {!loaded ? <span aria-hidden>{kind === "icon" ? name.slice(0, 1) : "이미지 준비 중"}</span> : null}
    </span>
  );
}
