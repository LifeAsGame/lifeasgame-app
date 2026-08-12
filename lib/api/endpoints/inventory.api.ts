import { USE_MOCK, apiDelete, apiGet, apiPost } from "@/shared/api/client";
import type {
  InventoryEntriesResponse,
  MailboxClaimRequest,
  MailboxDeleteRequest,
  MailboxEntriesResponse,
} from "@/shared/api/types";
import { inventoryMock } from "../mock/inventory.mock";

export function getInventoryApi(): Promise<InventoryEntriesResponse> {
  return USE_MOCK
    ? Promise.resolve(inventoryMock.inventory())
    : apiGet<InventoryEntriesResponse>("/api/v1/inventory");
}

export function getMailboxApi(): Promise<MailboxEntriesResponse> {
  return USE_MOCK
    ? Promise.resolve(inventoryMock.mailbox())
    : apiGet<MailboxEntriesResponse>("/api/v1/mailbox");
}

export async function claimMailApi(body: MailboxClaimRequest): Promise<void> {
  if (USE_MOCK) return inventoryMock.claim(body);
  await apiPost<void>("/api/v1/mailbox/claim", body);
}

export async function deleteMailApi(body: MailboxDeleteRequest): Promise<void> {
  if (USE_MOCK) return inventoryMock.deleteMail(body);
  await apiDelete<void>("/api/v1/mailbox", body);
}
