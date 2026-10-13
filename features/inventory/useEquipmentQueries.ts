"use client";

import { useMemo, useRef, useState } from "react";

import type { EquipmentSlotInfo } from "@/shared/api/types";
import { ApiError } from "@/shared/api/client";
import { equipGearApi, getEquippedGearApi, unequipGearApi } from "@/lib/api/endpoints/equipment.api";
import { composeEquipmentSlots, getEquipCompatibility, supportsEquipmentCommand } from "./model";
import { useInventoryEntries, useLatestQuery } from "./useInventoryQueries";

const loadEquipment = () => getEquippedGearApi();

function message(caught: unknown, fallback: string): string {
  return caught instanceof Error ? caught.message : fallback;
}

export function useEquipmentQueries() {
  const equipment = useLatestQuery<EquipmentSlotInfo[]>([], loadEquipment, "Unable to load Equipment.");
  const inventory = useInventoryEntries();
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const [mutationError, setMutationError] = useState<string | null>(null);
  const mutationLocked = useRef(false);
  const slots = useMemo(
    () => composeEquipmentSlots(equipment.data, inventory.data.entries),
    [equipment.data, inventory.data.entries],
  );

  const runMutation = async (key: string, request: () => Promise<unknown>) => {
    if (mutationLocked.current) return;
    mutationLocked.current = true;
    setPendingKey(key);
    setMutationError(null);
    let requestError: unknown = null;
    try {
      try {
        await request();
      } catch (caught) {
        requestError = caught;
      }
      const requests = [equipment.reload(), inventory.reload()] as const;
      const equipmentRequestId = equipment.getRequestId();
      const inventoryRequestId = inventory.getRequestId();
      const [nextEquipment, nextInventory] = await Promise.all(requests);
      const recovered = equipmentRequestId === equipment.getRequestId()
        && inventoryRequestId === inventory.getRequestId()
        && Boolean(nextEquipment && nextInventory);
      if (requestError) {
        setMutationError(requestError instanceof ApiError
          ? `Equipment request was rejected. Server state ${recovered ? "was reloaded" : "could not be fully reloaded"}. ${requestError.message}`
          : `Request outcome was not confirmed. Server state ${recovered ? "was reloaded" : "could not be fully reloaded"}. ${message(requestError, "")}`.trim());
      } else if (!recovered) {
        setMutationError("Equipment changed, but authoritative recovery failed. Retry the failed query.");
      }
    } finally {
      mutationLocked.current = false;
      setPendingKey(null);
    }
  };

  const equip = async (slotId: number, itemInstanceId: number) => {
    if (mutationLocked.current) return;
    const slot = equipment.data.find((entry) => entry.slotId === slotId);
    const item = inventory.data.entries.find((entry) => entry.itemInstanceId === itemInstanceId);
    if (!slot || !item || equipment.error || inventory.error) {
      setMutationError("The selected Equipment slot or Inventory item is no longer available.");
      return;
    }
    const compatibility = getEquipCompatibility(slot, item);
    if (compatibility.status !== "VERIFIED") {
      setMutationError(compatibility.reason);
      return;
    }
    await runMutation(`equip-${slotId}`, () => equipGearApi(slotId, itemInstanceId));
  };

  const unequip = (slotId: number) => {
    const slot = equipment.data.find((entry) => entry.slotId === slotId);
    if (!slot || !supportsEquipmentCommand(slot) || slot.itemInstanceId === null || equipment.error || inventory.error) {
      setMutationError("장비 상태를 다시 조회한 뒤 장착 해제를 시도하세요.");
      return Promise.resolve();
    }
    return runMutation(`unequip-${slotId}`, () => unequipGearApi(slotId));
  };

  return { equipment, inventory, slots, pendingKey, mutationError, equip, unequip };
}
