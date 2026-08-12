"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import type { InventoryEntriesResponse, MailboxEntriesResponse, MailEntry } from "@/shared/api/types";
import { claimMailApi, deleteMailApi, getInventoryApi, getMailboxApi } from "@/lib/api/endpoints/inventory.api";

export type QueryState<T> = {
  data: T;
  loading: boolean;
  error: string | null;
  reload: () => Promise<T | undefined>;
};

function message(caught: unknown, fallback: string): string {
  return caught instanceof Error ? caught.message : fallback;
}

export function useLatestQuery<T>(initial: T, load: () => Promise<T>, fallback: string): QueryState<T> {
  const [data, setData] = useState(initial);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestId = useRef(0);

  const reload = useCallback(async () => {
    const currentRequestId = ++requestId.current;
    setLoading(true);
    setError(null);
    try {
      const next = await load();
      if (currentRequestId === requestId.current) setData(next);
      return next;
    } catch (caught) {
      if (currentRequestId === requestId.current) setError(message(caught, fallback));
      return undefined;
    } finally {
      if (currentRequestId === requestId.current) setLoading(false);
    }
  }, [fallback, load]);

  useEffect(() => { void reload(); }, [reload]);
  return { data, loading, error, reload };
}

const loadInventory = () => getInventoryApi();
const loadMailbox = () => getMailboxApi();

export function useInventoryEntries() {
  return useLatestQuery<InventoryEntriesResponse>({ entries: [] }, loadInventory, "Unable to load Items.");
}

function useMailboxEntries() {
  return useLatestQuery<MailboxEntriesResponse>({ entries: [] }, loadMailbox, "Unable to load Inbox.");
}

export function useInventoryQueries() {
  const inventory = useInventoryEntries();
  const mailbox = useMailboxEntries();
  const mutationLocked = useRef(false);
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const [mutationError, setMutationError] = useState<string | null>(null);

  const runMutation = async (key: string, request: () => Promise<void>, recover: () => Promise<unknown>) => {
    if (mutationLocked.current) return;
    mutationLocked.current = true;
    setPendingKey(key);
    setMutationError(null);
    let requestError: unknown = null;
    try {
      await request();
    } catch (caught) {
      requestError = caught;
    }
    await recover();
    if (requestError) {
      setMutationError(`Request outcome was not confirmed. Server state was reloaded. ${message(requestError, "")}`.trim());
    }
    mutationLocked.current = false;
    setPendingKey(null);
  };

  const claimMail = (mail: MailEntry) => runMutation(
    `claim-${mail.mailId}`,
    () => claimMailApi({ slotIndex: mail.slotIndex, quantity: mail.quantity }),
    () => Promise.all([mailbox.reload(), inventory.reload()]),
  );

  const deleteMail = (mail: MailEntry) => runMutation(
    `delete-${mail.mailId}`,
    () => deleteMailApi({ slotIndex: mail.slotIndex }),
    () => mailbox.reload(),
  );

  return { inventory, mailbox, pendingKey, mutationError, claimMail, deleteMail };
}
