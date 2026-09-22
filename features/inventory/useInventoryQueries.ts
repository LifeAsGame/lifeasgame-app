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
  const confirmedClaim = useRef<number | null>(null);
  const [confirmedClaimMailId, setConfirmedClaimMailId] = useState<number | null>(null);
  const [claimRecoveryNeeded, setClaimRecoveryNeeded] = useState(false);
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const [mutationError, setMutationError] = useState<string | null>(null);

  const runMutation = async (key: string, request: () => Promise<void>, recover: () => Promise<boolean>, recoveryError?: string) => {
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
    const recovered = await recover();
    if (recoveryError) setClaimRecoveryNeeded(!requestError && !recovered);
    if (requestError) {
      setMutationError(`Request outcome was not confirmed. Server state ${recovered ? "was reloaded" : "could not be fully reloaded"}. ${message(requestError, "")}`.trim());
    } else if (!recovered && recoveryError) {
      setMutationError(recoveryError);
    }
    mutationLocked.current = false;
    setPendingKey(null);
  };

  const claimMail = (mail: MailEntry) => {
    if (confirmedClaim.current === mail.mailId) return Promise.resolve();
    return runMutation(
      `claim-${mail.mailId}`,
      async () => {
        await claimMailApi({ slotIndex: mail.slotIndex, quantity: mail.quantity });
        confirmedClaim.current = mail.mailId;
        setConfirmedClaimMailId(mail.mailId);
      },
      async () => {
        const [nextMailbox, nextInventory] = await Promise.all([mailbox.reload(), inventory.reload()]);
        return Boolean(nextMailbox && nextInventory);
      },
      "Claim succeeded, but Mailbox or Inventory could not be refreshed. Retry synchronization; do not Claim again.",
    );
  };

  const retryClaimRecovery = async () => {
    const [nextMailbox, nextInventory] = await Promise.all([mailbox.reload(), inventory.reload()]);
    if (nextMailbox && nextInventory) {
      setClaimRecoveryNeeded(false);
      setMutationError(null);
    }
  };

  const deleteMail = (mail: MailEntry) => runMutation(
    `delete-${mail.mailId}`,
    () => deleteMailApi({ slotIndex: mail.slotIndex }),
    async () => Boolean(await mailbox.reload()),
  );

  return { inventory, mailbox, pendingKey, mutationError, confirmedClaimMailId, claimRecoveryNeeded, claimMail, deleteMail, retryClaimRecovery };
}
