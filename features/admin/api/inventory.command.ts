import { apiPost } from "@/shared/api/client";

import { requirePositiveAdminPlayerId } from "./player.query";
import { resolveAdminDataSourceMode } from "./source";

const SAFE_HEADER_VALUE = /^[A-Za-z0-9][A-Za-z0-9._:-]*$/;
const UNSAFE_REASON_CHARACTER = /[\p{Cc}\p{Cf}\p{Zl}\p{Zp}]/u;
const VISIBLE_REASON_CHARACTER = /[^\p{Cf}\p{Zs}]/u;

export type AdminEntitlementCommandMetadata = {
  idempotencyKey: string;
  correlationId?: string;
};

export type AdminEntitlementCommandBody = {
  itemId: number;
  quantity: number;
  bound: boolean;
  reason: string;
};

export type AdminInventoryAddReceipt = { slots: number[] };
export type AdminMailboxDeliveryReceipt = { slot: number };

function positiveItemId(itemId: number) {
  if (!Number.isInteger(itemId) || itemId < 1) throw new RangeError("itemId must be a positive integer.");
  return itemId;
}

function validateHeaderValue(value: string, name: string, maxLength: number) {
  if (value.length > maxLength || !SAFE_HEADER_VALUE.test(value)) throw new RangeError(`${name} must use the backend-safe identifier format.`);
  return value;
}

export function validateAdminEntitlementReason(reason: string) {
  if (reason.length < 1 || reason.length > 512 || UNSAFE_REASON_CHARACTER.test(reason) || !VISIBLE_REASON_CHARACTER.test(reason)) {
    throw new RangeError("Reason must be 1–512 visible, single-line characters without control or formatting characters.");
  }
  return reason.trim();
}

function exactBody(body: AdminEntitlementCommandBody): AdminEntitlementCommandBody {
  if (!Number.isInteger(body.quantity) || body.quantity < 1) throw new RangeError("Quantity must be a positive integer.");
  return {
    itemId: positiveItemId(body.itemId),
    quantity: body.quantity,
    bound: body.bound,
    reason: validateAdminEntitlementReason(body.reason),
  };
}

function commandOptions({ idempotencyKey, correlationId }: AdminEntitlementCommandMetadata) {
  const headers: Record<string, string> = { "Idempotency-Key": validateHeaderValue(idempotencyKey, "Idempotency-Key", 128) };
  if (correlationId) headers["X-Correlation-Id"] = validateHeaderValue(correlationId, "X-Correlation-Id", 100);
  return { headers, retry: false } as const;
}

export function addAdminPlayerInventory(
  playerId: number,
  body: AdminEntitlementCommandBody,
  metadata: AdminEntitlementCommandMetadata,
): Promise<AdminInventoryAddReceipt> {
  return apiPost(`/admin/v1/players/${requirePositiveAdminPlayerId(playerId, "playerId")}/inventory/add`, exactBody(body), commandOptions(metadata));
}

export function deliverAdminPlayerMailbox(
  playerId: number,
  body: AdminEntitlementCommandBody,
  metadata: AdminEntitlementCommandMetadata,
): Promise<AdminMailboxDeliveryReceipt> {
  return apiPost(`/admin/v1/players/${requirePositiveAdminPlayerId(playerId, "playerId")}/mailbox/deliver`, exactBody(body), commandOptions(metadata));
}

export type AdminInventoryOperationsCommandSource =
  | { available: true; addInventory: typeof addAdminPlayerInventory; deliverMailbox: typeof deliverAdminPlayerMailbox }
  | { available: false };

const API_SOURCE: AdminInventoryOperationsCommandSource = { available: true, addInventory: addAdminPlayerInventory, deliverMailbox: deliverAdminPlayerMailbox };
const UNAVAILABLE_SOURCE: AdminInventoryOperationsCommandSource = { available: false };

export function getAdminInventoryOperationsCommandSource(value: unknown): AdminInventoryOperationsCommandSource {
  return resolveAdminDataSourceMode(value) === "mock" ? UNAVAILABLE_SOURCE : API_SOURCE;
}

export const adminInventoryOperationsCommandSource = getAdminInventoryOperationsCommandSource(process.env.NEXT_PUBLIC_ADMIN_DATA_SOURCE);
