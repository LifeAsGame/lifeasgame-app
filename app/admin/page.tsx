"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import SaoAlert from "@/shared/ui/SaoAlert";
import SaoFormPanel, { type FieldConfig } from "@/shared/ui/SaoFormPanel";
import { useAuth } from "@/features/auth/AuthContext";
import { SAO, PANEL_STYLE, INPUT_STYLE, GRID_OVERLAY_STYLE, GOLD_BTN_STYLE } from "@/shared/design/tokens";
import {
  adminAddGuildMemberApi,
  adminAddPartyMemberApi,
  adminAddToInventoryApi,
  adminAdjustQuestProgressApi,
  adminAdjustVitalsApi,
  adminAdjustWalletApi,
  adminAssignTitleApi,
  adminCancelListingApi,
  adminChangeQuestStatusApi,
  adminChangeUserStatusApi,
  adminConfiscateItemApi,
  adminCreateAchievementApi,
  adminCreateCertificationApi,
  adminCreateHobbyApi,
  adminCreateQuestApi,
  adminCreateShopItemApi,
  adminCreateTitleApi,
  adminDeleteAchievementApi,
  adminDeleteCertificationApi,
  adminDeleteHobbyApi,
  adminDeleteQuestApi,
  adminDeleteTitleApi,
  adminDeleteUserApi,
  adminDissolveGuildApi,
  adminDissolvePartyApi,
  adminGetAchievementHoldersApi,
  adminGetAchievementsApi,
  adminGetAllQuestAcceptancesApi,
  adminGetCertificationHoldersApi,
  adminGetCertificationsApi,
  adminGetGuildMembersApi,
  adminGetGuildsApi,
  adminGetHobbyHoldersApi,
  adminGetHobbiesApi,
  adminGetItemDefinitionsApi,
  adminGetItemHoldersByItemApi,
  adminGetItemInstancesApi,
  adminGetListingsApi,
  adminGetPartyMembersApi,
  adminGetPartiesApi,
  adminGetPlayerItemsApi,
  adminGetPlayersApi,
  adminGetQuestAcceptancesByCodeApi,
  adminGetQuestDefinitionsApi,
  adminGetShopItemsApi,
  adminGetTitleHoldersApi,
  adminGetTitlesApi,
  adminGetUsersApi,
  adminGrantAchievementApi,
  adminGrantCertificationApi,
  adminGrantCoreStatsApi,
  adminGrantExpApi,
  adminGrantHobbyApi,
  adminRemoveGuildMemberApi,
  adminRemovePartyMemberApi,
  adminRevokeCertificationApi,
  adminRevokeAchievementApi,
  adminRevokeHobbyApi,
  adminRevokeTitleApi,
  adminToggleShopItemApi,
  adminUpdateAchievementApi,
  adminUpdateCertificationApi,
  adminUpdateGuildApi,
  adminUpdateHobbyApi,
  adminUpdateItemDefinitionApi,
  adminUpdateListingApi,
  adminUpdatePartyApi,
  adminUpdatePlayerNicknameApi,
  adminUpdateQuestApi,
  adminUpdateShopItemApi,
  adminUpdateTitleApi,
} from "@/lib/api/endpoints/admin.api";
import { MOTION } from "@/shared/lib/motion";

// ─── Types ─────────────────────────────────────────────────────────────────

type AdminMenu =
  | "players"
  | "titles"
  | "achievements"
  | "certifications"
  | "hobbies"
  | "items-defs"
  | "items-instances"
  | "quest-defs"
  | "quest-acceptances"
  | "economy-shop"
  | "economy-listings"
  | "social-parties"
  | "social-guilds"
  | "users";

type ColumnConfig = { key: string; label: string; width?: string };

type TableAction = {
  label: string;
  style?: "red" | "amber" | "blue" | "green";
  onClick: (row: Record<string, unknown>) => void;
};

type DrillDownState = {
  title: string;
  parentTitle: string;
  columns: ColumnConfig[];
  rows: Record<string, unknown>[];
  actions?: TableAction[];
  onAdd?: () => void;
  addLabel?: string;
};

type NavEntry =
  | { kind: "item"; id: AdminMenu; label: string; slotLabel: string }
  | { kind: "sep"; label: string };

const ADMIN_MENUS: NavEntry[] = [
  { kind: "sep",  label: "Character" },
  { kind: "item", id: "players",           label: "Players",        slotLabel: "PL" },
  { kind: "item", id: "titles",            label: "Title Defs",     slotLabel: "TI" },
  { kind: "item", id: "achievements",      label: "Achievements",   slotLabel: "AC" },
  { kind: "item", id: "certifications",    label: "Certifications", slotLabel: "CE" },
  { kind: "item", id: "hobbies",           label: "Hobbies",        slotLabel: "HB" },
  { kind: "sep",  label: "Inventory" },
  { kind: "item", id: "items-defs",        label: "Item Defs",      slotLabel: "ID" },
  { kind: "item", id: "items-instances",   label: "Item Instances", slotLabel: "II" },
  { kind: "sep",  label: "Quest" },
  { kind: "item", id: "quest-defs",        label: "Quest Defs",     slotLabel: "QD" },
  { kind: "item", id: "quest-acceptances", label: "Acceptances",    slotLabel: "QA" },
  { kind: "sep",  label: "Economy" },
  { kind: "item", id: "economy-shop",      label: "Shop Items",     slotLabel: "SH" },
  { kind: "item", id: "economy-listings",  label: "Listings",       slotLabel: "LS" },
  { kind: "sep",  label: "Social" },
  { kind: "item", id: "social-parties",    label: "Parties",        slotLabel: "PT" },
  { kind: "item", id: "social-guilds",     label: "Guilds",         slotLabel: "GD" },
  { kind: "sep",  label: "Users" },
  { kind: "item", id: "users",             label: "Users",          slotLabel: "US" },
];

const ACTION_COLORS: Record<string, { bg: string; text: string }> = {
  red:   { bg: "rgba(220,38,38,0.14)",  text: "#dc2626" },
  amber: { bg: "rgba(248,197,78,0.20)", text: "#92620a" },
  blue:  { bg: "rgba(59,130,246,0.14)", text: "#2563eb" },
  green: { bg: "rgba(34,197,94,0.14)",  text: "#15803d" },
};

// ─── AdminTable ─────────────────────────────────────────────────────────────

function AdminTable({
  rows,
  columns,
  actions,
}: {
  rows: Record<string, unknown>[];
  columns: ColumnConfig[];
  actions?: TableAction[];
}) {
  const [filter, setFilter] = useState("");

  const visible = filter.trim()
    ? rows.filter((row) =>
        columns.some((col) =>
          String(row[col.key] ?? "").toLowerCase().includes(filter.toLowerCase()),
        ),
      )
    : rows;

  const actionColW = actions?.length ? `${actions.length * 80}px` : undefined;
  const gridTemplate =
    columns.map((c) => c.width ?? "1fr").join(" ") + (actionColW ? ` ${actionColW}` : "");

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Filter by any field…"
          style={{ ...INPUT_STYLE, flex: 1, fontSize: "11px", padding: "5px 10px" }}
        />
        {filter ? (
          <button
            type="button"
            onClick={() => setFilter("")}
            className="transition-opacity hover:opacity-70"
            style={{ fontSize: "14px", color: SAO.color.text.label, lineHeight: 1 }}
          >
            ✕
          </button>
        ) : null}
        <span style={{ fontSize: "10px", color: SAO.color.text.label, letterSpacing: "0.1em", whiteSpace: "nowrap" }}>
          {filter ? `${visible.length} / ${rows.length}` : `${rows.length} rows`}
        </span>
      </div>

      <div
        className="overflow-hidden rounded-sm"
        style={{
          ...PANEL_STYLE,
          background: `linear-gradient(180deg, ${SAO.color.bg.panel}, ${SAO.color.bg.panelAlt})`,
        }}
      >
        <div style={GRID_OVERLAY_STYLE} />

        <div
          className="relative grid px-4 py-2.5"
          style={{
            gridTemplateColumns: gridTemplate,
            background: "linear-gradient(180deg, #e8eaed, #d8dce2)",
            borderBottom: `1px solid ${SAO.color.border.panel}`,
          }}
        >
          {columns.map((col) => (
            <span
              key={col.key}
              className="uppercase"
              style={{ fontSize: "10px", letterSpacing: "0.2em", color: SAO.color.text.label, fontWeight: 600 }}
            >
              {col.label}
            </span>
          ))}
          {actions?.length ? (
            <span
              className="uppercase"
              style={{ fontSize: "10px", letterSpacing: "0.2em", color: SAO.color.text.label, fontWeight: 600 }}
            >
              Actions
            </span>
          ) : null}
        </div>

        {visible.length === 0 ? (
          <div className="relative px-4 py-6 text-center" style={{ fontSize: "0.875rem", color: SAO.color.text.label }}>
            {filter ? "No matches" : "No data"}
          </div>
        ) : (
          visible.map((row, i) => (
            <div
              key={i}
              className="relative grid items-center px-4 py-2.5 transition-colors hover:bg-white/20"
              style={{
                gridTemplateColumns: gridTemplate,
                borderTop: i > 0 ? `1px solid rgba(20,23,28,0.1)` : undefined,
              }}
            >
              {columns.map((col) => (
                <span
                  key={col.key}
                  className="truncate text-xs"
                  style={{ letterSpacing: "0.06em", color: SAO.color.text.primary }}
                >
                  {String(row[col.key] ?? "—")}
                </span>
              ))}
              {actions?.length ? (
                <div className="flex flex-wrap gap-1.5">
                  {actions.map((action) => {
                    const colors = ACTION_COLORS[action.style ?? "blue"];
                    return (
                      <button
                        key={action.label}
                        type="button"
                        onClick={() => action.onClick(row)}
                        className="rounded-sm px-2 py-1 text-[10px] font-semibold tracking-[0.1em] uppercase transition-opacity hover:opacity-80 whitespace-nowrap"
                        style={{ background: colors.bg, color: colors.text, borderRadius: SAO.radius.panel }}
                      >
                        {action.label}
                      </button>
                    );
                  })}
                </div>
              ) : null}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// ─── AdminPanel ─────────────────────────────────────────────────────────────

function AdminPanel({
  title,
  onAdd,
  addLabel = "Add",
  children,
}: {
  title: string;
  onAdd?: () => void;
  addLabel?: string;
  children: React.ReactNode;
}) {
  return (
    <motion.div
      initial={MOTION.panelReset.initial}
      animate={MOTION.panelReset.animate}
      transition={MOTION.panelReset.transition}
      className="flex h-full flex-col"
    >
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-base font-bold tracking-[0.18em] text-zinc-700 uppercase">{title}</h2>
        {onAdd ? (
          <button
            type="button"
            onClick={onAdd}
            className="px-4 py-1.5 text-xs font-bold tracking-[0.16em] uppercase transition-opacity hover:opacity-85"
            style={{ ...GOLD_BTN_STYLE, boxShadow: "0 2px 8px rgba(248,197,78,0.3)" }}
          >
            + {addLabel}
          </button>
        ) : null}
      </div>
      <div className="flex-1 overflow-y-auto">{children}</div>
    </motion.div>
  );
}

// ─── AdminSubPanel ───────────────────────────────────────────────────────────

function AdminSubPanel({
  title,
  parentTitle,
  rows,
  columns,
  actions,
  onAdd,
  addLabel = "Add",
  onBack,
}: DrillDownState & { onBack: () => void }) {
  return (
    <motion.div
      initial={MOTION.panelSwap.initial}
      animate={MOTION.panelSwap.animate}
      transition={MOTION.panelSwap.transition}
      className="flex h-full flex-col"
    >
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onBack}
            className="text-xs tracking-[0.12em] uppercase transition-opacity hover:opacity-70"
            style={{ color: SAO.color.text.label }}
          >
            ← {parentTitle}
          </button>
          <span style={{ color: SAO.color.text.label, fontSize: "11px" }}>/</span>
          <h2 className="text-base font-bold tracking-[0.18em] text-zinc-700 uppercase">{title}</h2>
        </div>
        {onAdd ? (
          <button
            type="button"
            onClick={onAdd}
            className="px-4 py-1.5 text-xs font-bold tracking-[0.16em] uppercase transition-opacity hover:opacity-85"
            style={{ ...GOLD_BTN_STYLE, boxShadow: "0 2px 8px rgba(248,197,78,0.3)" }}
          >
            + {addLabel}
          </button>
        ) : null}
      </div>
      <div className="flex-1 overflow-y-auto">
        <AdminTable rows={rows} columns={columns} actions={actions} />
      </div>
    </motion.div>
  );
}

// ─── Shared option lists ─────────────────────────────────────────────────────

const CATEGORY_OPTIONS_TITLE = [
  { value: "Combat",      label: "Combat" },
  { value: "Exploration", label: "Exploration" },
  { value: "Social",      label: "Social" },
  { value: "Achievement", label: "Achievement" },
  { value: "Special",     label: "Special" },
];

const RARITY_OPTIONS = [
  { value: "Common",    label: "Common" },
  { value: "Uncommon",  label: "Uncommon" },
  { value: "Rare",      label: "Rare" },
  { value: "Epic",      label: "Epic" },
  { value: "Legendary", label: "Legendary" },
];

const ITEM_CATEGORY_OPTIONS = [
  { value: "Weapon",     label: "Weapon" },
  { value: "Armor",      label: "Armor" },
  { value: "Boots",      label: "Boots" },
  { value: "Accessory",  label: "Accessory" },
  { value: "Consumable", label: "Consumable" },
  { value: "Material",   label: "Material" },
  { value: "Quest",      label: "Quest" },
  { value: "Misc",       label: "Misc" },
];

const QUEST_CATEGORY_OPTIONS = [
  { value: "Daily",   label: "Daily" },
  { value: "Weekly",  label: "Weekly" },
  { value: "Story",   label: "Story" },
  { value: "Party",   label: "Party" },
  { value: "Guild",   label: "Guild" },
  { value: "Dungeon", label: "Dungeon" },
];

const REPEAT_RULE_OPTIONS = [
  { value: "NONE",    label: "None" },
  { value: "DAILY",   label: "Daily" },
  { value: "WEEKLY",  label: "Weekly" },
  { value: "MONTHLY", label: "Monthly" },
];

const GROUP_STATUS_OPTIONS = [
  { value: "FORMING",   label: "Forming" },
  { value: "ACTIVE",    label: "Active" },
  { value: "DISSOLVED", label: "Dissolved" },
];

const JOIN_POLICY_OPTIONS = [
  { value: "OPEN",        label: "Open" },
  { value: "APPROVAL",    label: "Approval" },
  { value: "INVITE_ONLY", label: "Invite Only" },
];

const QUEST_STATUS_OPTIONS = [
  { value: "IN_PROGRESS", label: "In Progress" },
  { value: "COMPLETED",   label: "Completed" },
  { value: "FAILED",      label: "Failed" },
  { value: "CANCELLED",   label: "Cancelled" },
];

const USER_STATUS_OPTIONS = [
  { value: "ACTIVE",    label: "Active" },
  { value: "SUSPENDED", label: "Suspended" },
  { value: "BANNED",    label: "Banned" },
];

const HOBBY_STATUS_OPTIONS = [
  { value: "ACTIVE",    label: "Active" },
  { value: "ON_HOLD",   label: "On Hold" },
  { value: "DROPPED",   label: "Dropped" },
];

// ─── Main Page ──────────────────────────────────────────────────────────────

export default function AdminPage() {
  const router = useRouter();
  const { currentUser, isLoading, logout } = useAuth();
  const [selectedMenu, setSelectedMenu] = useState<AdminMenu>("players");
  const [data, setData] = useState<Record<string, unknown>[]>([]);
  const [isDataLoading, setIsDataLoading] = useState(false);

  const [formOpen, setFormOpen] = useState(false);
  const [formTitle, setFormTitle] = useState("");
  const [formFields, setFormFields] = useState<FieldConfig[]>([]);
  const [formConfirmMessage, setFormConfirmMessage] = useState<string | undefined>();
  const [formInitialValues, setFormInitialValues] = useState<Record<string, string>>({});
  const [formOnSubmit, setFormOnSubmit] = useState<(v: Record<string, string>) => void>(() => () => {});

  const [alertOpen, setAlertOpen] = useState(false);
  const [alertTitle, setAlertTitle] = useState("");
  const [alertMessage, setAlertMessage] = useState("");
  const [alertOnConfirm, setAlertOnConfirm] = useState<() => void>(() => () => {});

  const [drillDown, setDrillDown] = useState<DrillDownState | null>(null);
  const [logoutAlertOpen, setLogoutAlertOpen] = useState(false);

  useEffect(() => {
    if (!isLoading && !currentUser) router.replace("/login");
    if (!isLoading && currentUser?.role !== "admin") router.replace("/");
  }, [currentUser, isLoading, router]);

  useEffect(() => {
    if (!currentUser) return;
    let cancelled = false;
    setIsDataLoading(true);
    setData([]);
    setDrillDown(null);

    const loaders: Record<AdminMenu, () => Promise<unknown>> = {
      players:             adminGetPlayersApi,
      titles:              adminGetTitlesApi,
      achievements:        adminGetAchievementsApi,
      certifications:      adminGetCertificationsApi,
      hobbies:             adminGetHobbiesApi,
      "items-defs":        adminGetItemDefinitionsApi,
      "items-instances":   adminGetItemInstancesApi,
      "quest-defs":        adminGetQuestDefinitionsApi,
      "quest-acceptances": adminGetAllQuestAcceptancesApi,
      "economy-shop":      adminGetShopItemsApi,
      "economy-listings":  adminGetListingsApi,
      "social-parties":    adminGetPartiesApi,
      "social-guilds":     adminGetGuildsApi,
      users:               adminGetUsersApi,
    };

    loaders[selectedMenu]()
      .then((rows) => { if (!cancelled) setData(rows as Record<string, unknown>[]); })
      .catch(console.error)
      .finally(() => { if (!cancelled) setIsDataLoading(false); });

    return () => { cancelled = true; };
  }, [selectedMenu, currentUser]);

  // ─── Helpers ─────────────────────────────────────────────────────────────

  const openAlert = (title: string, message: string, onConfirm: () => void) => {
    setAlertTitle(title);
    setAlertMessage(message);
    setAlertOnConfirm(() => onConfirm);
    setAlertOpen(true);
  };

  const openForm = (
    title: string,
    fields: FieldConfig[],
    onSubmit: (v: Record<string, string>) => void,
    confirmMsg?: string,
    initVals?: Record<string, string>,
  ) => {
    setFormTitle(title);
    setFormFields(fields);
    setFormOnSubmit(() => onSubmit);
    setFormConfirmMessage(confirmMsg);
    setFormInitialValues(initVals ?? {});
    setFormOpen(true);
  };

  const openDrillDown = async (
    drillTitle: string,
    parentTitle: string,
    loaderFn: () => Promise<Record<string, unknown>[]>,
    columns: ColumnConfig[],
    actions?: TableAction[],
    onAdd?: () => void,
    addLabel?: string,
  ) => {
    const rows = await loaderFn();
    setDrillDown({ title: drillTitle, parentTitle, columns, rows, actions, onAdd, addLabel });
  };

  const handleLogout = () => { logout(); router.replace("/login"); };

  // ─── Per-menu config ──────────────────────────────────────────────────────

  const menuConfig: Record<AdminMenu, {
    title: string;
    columns: ColumnConfig[];
    actions?: TableAction[];
    onAdd?: () => void;
    addLabel?: string;
  }> = {

    // ── Players ──────────────────────────────────────────────────────────────
    players: {
      title: "Player Management",
      columns: [
        { key: "id",       label: "ID",       width: "50px" },
        { key: "email",    label: "Email",    width: "1fr" },
        { key: "nickname", label: "Nickname", width: "130px" },
        { key: "status",   label: "Status",   width: "80px" },
      ],
      actions: [
        {
          label: "Rename",
          style: "blue",
          onClick: (row) =>
            openForm(
              "Edit Nickname",
              [{ key: "nickname", label: "New Nickname", type: "text", required: true }],
              async (v) => { await adminUpdatePlayerNicknameApi(row.id as number, v.nickname); },
              "Change player nickname?",
              { nickname: row.nickname as string },
            ),
        },
        {
          label: "EXP",
          style: "green",
          onClick: (row) =>
            openForm(
              `Grant EXP — ${row.nickname as string}`,
              [{ key: "expDelta", label: "EXP Amount (±)", type: "number", required: true, placeholder: "e.g. 500" }],
              async (v) => { await adminGrantExpApi(row.id as number, Number(v.expDelta)); },
              "Grant this EXP amount?",
            ),
        },
        {
          label: "Stats",
          style: "green",
          onClick: (row) =>
            openForm(
              `Adjust Stats — ${row.nickname as string}`,
              [
                { key: "strDelta",   label: "STR Delta",      type: "number", placeholder: "0" },
                { key: "agiDelta",   label: "AGI Delta",      type: "number", placeholder: "0" },
                { key: "dexDelta",   label: "DEX Delta",      type: "number", placeholder: "0" },
                { key: "intelDelta", label: "INT Delta",      type: "number", placeholder: "0" },
                { key: "vitDelta",   label: "VIT Delta",      type: "number", placeholder: "0" },
                { key: "lucDelta",   label: "LUC Delta",      type: "number", placeholder: "0" },
                { key: "hpDelta",    label: "HP Delta",       type: "number", placeholder: "0" },
                { key: "mpDelta",    label: "MP Delta",       type: "number", placeholder: "0" },
              ],
              async (v) => {
                const playerId = row.id as number;
                const toNum = (k: string) => v[k] ? Number(v[k]) : undefined;
                await adminGrantCoreStatsApi(playerId, {
                  strDelta: toNum("strDelta"), agiDelta: toNum("agiDelta"),
                  dexDelta: toNum("dexDelta"), intelDelta: toNum("intelDelta"),
                  vitDelta: toNum("vitDelta"), lucDelta: toNum("lucDelta"),
                });
                await adminAdjustVitalsApi(playerId, { hpDelta: toNum("hpDelta"), mpDelta: toNum("mpDelta") });
              },
              "Apply stat adjustments?",
            ),
        },
        {
          label: "Items",
          style: "amber",
          onClick: (row) => {
            const playerId = row.id as number;
            void openDrillDown(
              `${row.nickname as string} — Items`,
              "Player Management",
              () => adminGetPlayerItemsApi(playerId) as Promise<Record<string, unknown>[]>,
              [
                { key: "instanceId", label: "Inst.",    width: "55px" },
                { key: "itemName",   label: "Item",     width: "1fr" },
                { key: "category",   label: "Category", width: "90px" },
                { key: "rarity",     label: "Rarity",   width: "90px" },
                { key: "quantity",   label: "Qty",      width: "45px" },
                { key: "bound",      label: "Bound",    width: "55px" },
              ],
              [
                {
                  label: "Confiscate",
                  style: "red",
                  onClick: (itemRow) =>
                    openAlert(
                      "Confiscate Item",
                      `Confiscate "${itemRow.itemName}" (x${itemRow.quantity}) from ${row.nickname}?`,
                      async () => {
                        await adminConfiscateItemApi(itemRow.instanceId as number);
                        setDrillDown((prev) =>
                          prev ? { ...prev, rows: prev.rows.filter((r) => r.instanceId !== itemRow.instanceId) } : prev,
                        );
                      },
                    ),
                },
              ],
              () =>
                openForm(
                  `Add Item — ${row.nickname as string}`,
                  [
                    { key: "itemId",   label: "Item ID",  type: "number", required: true },
                    { key: "quantity", label: "Quantity", type: "number", required: true, placeholder: "1" },
                    { key: "bound",    label: "Bound",    type: "select", required: true, options: [
                      { value: "false", label: "No" },
                      { value: "true",  label: "Yes" },
                    ]},
                  ],
                  async (v) => {
                    await adminAddToInventoryApi(playerId, {
                      itemId: Number(v.itemId),
                      quantity: Number(v.quantity),
                      bound: v.bound === "true",
                    });
                  },
                  "Add item to player inventory?",
                ),
              "Add Item",
            );
          },
        },
        {
          label: "Wallet",
          style: "amber",
          onClick: (row) =>
            openForm(
              `Adjust Wallet — ${row.nickname as string}`,
              [
                { key: "amount",   label: "Amount",          type: "number", required: true },
                { key: "currency", label: "Currency",        type: "select", required: true, options: [
                  { value: "col", label: "Col" },
                  { value: "gem", label: "Gem" },
                ]},
                { key: "debit",  label: "Type",             type: "select", required: true, options: [
                  { value: "false", label: "Credit (add)" },
                  { value: "true",  label: "Debit (remove)" },
                ]},
                { key: "reason", label: "Reason", type: "text", required: true, placeholder: "Admin adjustment" },
              ],
              async (v) => {
                await adminAdjustWalletApi(row.id as number, {
                  amount: Number(v.amount),
                  currency: v.currency,
                  debit: v.debit === "true",
                  reason: v.reason,
                });
              },
              "Apply wallet adjustment?",
            ),
        },
      ],
    },

    // ── Title Definitions ─────────────────────────────────────────────────────
    titles: {
      title: "Title Definitions",
      columns: [
        { key: "titleId",  label: "ID",       width: "50px" },
        { key: "code",     label: "Code",     width: "160px" },
        { key: "name",     label: "Name",     width: "1fr" },
        { key: "category", label: "Category", width: "110px" },
      ],
      actions: [
        {
          label: "Edit",
          style: "blue",
          onClick: (row) =>
            openForm(
              "Edit Title",
              [
                { key: "code",     label: "Code",        type: "text",     required: true },
                { key: "name",     label: "Name",        type: "text",     required: true },
                { key: "category", label: "Category",    type: "select",   required: true, options: CATEGORY_OPTIONS_TITLE },
                { key: "descMd",   label: "Description", type: "textarea" },
              ],
              async (v) => {
                await adminUpdateTitleApi(row.titleId as number, { code: v.code, name: v.name, category: v.category, descMd: v.descMd ?? "" });
                setData((prev) => prev.map((r) => r.titleId === row.titleId ? { ...r, ...v } : r));
              },
              "Save title changes? (applies to all holders)",
              { code: row.code as string, name: row.name as string, category: row.category as string },
            ),
        },
        {
          label: "Holders",
          style: "amber",
          onClick: (row) => {
            const titleId = row.titleId as number;
            void openDrillDown(
              `"${row.name as string}" — Holders`,
              "Title Definitions",
              () => adminGetTitleHoldersApi(titleId) as Promise<Record<string, unknown>[]>,
              [
                { key: "playerId",   label: "PID",      width: "55px" },
                { key: "nickname",   label: "Nickname", width: "1fr" },
                { key: "assignedAt", label: "Assigned", width: "110px" },
              ],
              [
                {
                  label: "Revoke",
                  style: "red",
                  onClick: (holderRow) =>
                    openAlert(
                      "Revoke Title",
                      `Revoke "${row.name}" from ${holderRow.nickname}?`,
                      async () => {
                        await adminRevokeTitleApi(titleId, holderRow.playerId as number);
                        setDrillDown((prev) =>
                          prev ? { ...prev, rows: prev.rows.filter((r) => r.playerId !== holderRow.playerId) } : prev,
                        );
                      },
                    ),
                },
              ],
              () =>
                openForm(
                  `Assign "${row.name as string}"`,
                  [{ key: "playerId", label: "Player ID", type: "number", required: true }],
                  async (v) => { await adminAssignTitleApi(titleId, Number(v.playerId)); },
                  `Assign "${row.name}" to player?`,
                ),
              "Assign",
            );
          },
        },
        {
          label: "Delete",
          style: "red",
          onClick: (row) =>
            openAlert(
              "Delete Title",
              `Delete title "${row.name}"? All player assignments will be removed.`,
              async () => {
                await adminDeleteTitleApi(row.titleId as number);
                setData((prev) => prev.filter((r) => r.titleId !== row.titleId));
              },
            ),
        },
      ],
      onAdd: () =>
        openForm(
          "Add Title",
          [
            { key: "code",     label: "Code",        type: "text",     placeholder: "MY_TITLE",  required: true },
            { key: "name",     label: "Name",        type: "text",     placeholder: "My Title",  required: true },
            { key: "category", label: "Category",    type: "select",   required: true, options: CATEGORY_OPTIONS_TITLE },
            { key: "descMd",   label: "Description", type: "textarea", placeholder: "Description…" },
          ],
          async (v) => { await adminCreateTitleApi({ code: v.code, name: v.name, category: v.category, descMd: v.descMd ?? "" }); },
          "Create this title?",
        ),
      addLabel: "Add Title",
    },

    // ── Achievements ──────────────────────────────────────────────────────────
    achievements: {
      title: "Achievement Management",
      columns: [
        { key: "achievementId", label: "ID",       width: "50px" },
        { key: "code",          label: "Code",     width: "160px" },
        { key: "name",          label: "Name",     width: "1fr" },
        { key: "category",      label: "Category", width: "100px" },
      ],
      actions: [
        {
          label: "Edit",
          style: "blue",
          onClick: (row) =>
            openForm(
              "Edit Achievement",
              [
                { key: "code",     label: "Code",        type: "text",     required: true },
                { key: "name",     label: "Name",        type: "text",     required: true },
                { key: "category", label: "Category",    type: "text",     required: true },
                { key: "descMd",   label: "Description", type: "textarea" },
              ],
              async (v) => {
                await adminUpdateAchievementApi(row.achievementId as number, { code: v.code, name: v.name, category: v.category, descMd: v.descMd ?? "" });
                setData((prev) => prev.map((r) => r.achievementId === row.achievementId ? { ...r, ...v } : r));
              },
              "Save changes?",
              { code: row.code as string, name: row.name as string, category: row.category as string },
            ),
        },
        {
          label: "Holders",
          style: "amber",
          onClick: (row) => {
            const achievementId = row.achievementId as number;
            void openDrillDown(
              `"${row.name as string}" — Holders`,
              "Achievement Management",
              () => adminGetAchievementHoldersApi(achievementId) as Promise<Record<string, unknown>[]>,
              [
                { key: "playerId",   label: "PID",      width: "55px" },
                { key: "nickname",   label: "Nickname", width: "1fr" },
                { key: "acquiredAt", label: "Acquired", width: "110px" },
              ],
              [
                {
                  label: "Revoke",
                  style: "red",
                  onClick: (holderRow) =>
                    openAlert(
                      "Revoke Achievement",
                      `Revoke "${row.name}" from ${holderRow.nickname}?`,
                      async () => {
                        await adminRevokeAchievementApi(holderRow.playerId as number, achievementId);
                        setDrillDown((prev) =>
                          prev ? { ...prev, rows: prev.rows.filter((r) => r.playerId !== holderRow.playerId) } : prev,
                        );
                      },
                    ),
                },
              ],
              () =>
                openForm(
                  `Grant "${row.name as string}"`,
                  [{ key: "playerId", label: "Player ID", type: "number", required: true }],
                  async (v) => { await adminGrantAchievementApi(Number(v.playerId), achievementId); },
                  `Grant "${row.name}" to player?`,
                ),
              "Grant",
            );
          },
        },
        {
          label: "Delete",
          style: "red",
          onClick: (row) =>
            openAlert(
              "Delete Achievement",
              `Delete achievement "${row.name}"?`,
              async () => {
                await adminDeleteAchievementApi(row.achievementId as number);
                setData((prev) => prev.filter((r) => r.achievementId !== row.achievementId));
              },
            ),
        },
      ],
      onAdd: () =>
        openForm(
          "Add Achievement",
          [
            { key: "code",     label: "Code",        type: "text",     required: true },
            { key: "name",     label: "Name",        type: "text",     required: true },
            { key: "category", label: "Category",    type: "text",     required: true },
            { key: "descMd",   label: "Description", type: "textarea" },
          ],
          async (v) => { await adminCreateAchievementApi({ code: v.code, name: v.name, category: v.category, descMd: v.descMd ?? "" }); },
          "Create achievement?",
        ),
      addLabel: "Add Achievement",
    },

    // ── Certifications ────────────────────────────────────────────────────────
    certifications: {
      title: "Certification Definitions",
      columns: [
        { key: "certificationId", label: "ID",       width: "50px" },
        { key: "name",            label: "Name",     width: "1fr" },
        { key: "issuer",          label: "Issuer",   width: "120px" },
        { key: "category",        label: "Category", width: "100px" },
      ],
      actions: [
        {
          label: "Edit",
          style: "blue",
          onClick: (row) =>
            openForm(
              "Edit Certification",
              [
                { key: "name",     label: "Name",     type: "text", required: true },
                { key: "issuer",   label: "Issuer",   type: "text", required: true },
                { key: "category", label: "Category", type: "text", required: true },
              ],
              async (v) => {
                await adminUpdateCertificationApi(row.certificationId as number, { name: v.name, issuer: v.issuer, category: v.category });
                setData((prev) => prev.map((r) => r.certificationId === row.certificationId ? { ...r, ...v } : r));
              },
              "Save certification changes?",
              { name: row.name as string, issuer: row.issuer as string, category: row.category as string },
            ),
        },
        {
          label: "Holders",
          style: "amber",
          onClick: (row) => {
            const certId = row.certificationId as number;
            void openDrillDown(
              `"${row.name as string}" — Holders`,
              "Certification Definitions",
              () => adminGetCertificationHoldersApi(certId) as Promise<Record<string, unknown>[]>,
              [
                { key: "playerId",     label: "PID",      width: "55px" },
                { key: "nickname",     label: "Nickname", width: "1fr" },
                { key: "acquiredDate", label: "Acquired", width: "100px" },
                { key: "expiresDate",  label: "Expires",  width: "100px" },
              ],
              [
                {
                  label: "Revoke",
                  style: "red",
                  onClick: (holderRow) =>
                    openAlert(
                      "Revoke Certification",
                      `Revoke "${row.name}" from ${holderRow.nickname}?`,
                      async () => {
                        await adminRevokeCertificationApi(holderRow.playerId as number, certId);
                        setDrillDown((prev) =>
                          prev ? { ...prev, rows: prev.rows.filter((r) => r.playerId !== holderRow.playerId) } : prev,
                        );
                      },
                    ),
                },
              ],
              () =>
                openForm(
                  `Grant "${row.name as string}"`,
                  [
                    { key: "playerId",     label: "Player ID",    type: "number", required: true },
                    { key: "acquiredDate", label: "Acquired Date", type: "date",   required: true },
                    { key: "expiresDate",  label: "Expires Date",  type: "date",   placeholder: "Leave blank if permanent" },
                  ],
                  async (v) => {
                    await adminGrantCertificationApi(Number(v.playerId), certId, {
                      acquiredDate: v.acquiredDate,
                      expiresDate: v.expiresDate || undefined,
                    });
                  },
                  `Grant "${row.name}" to player?`,
                ),
              "Grant",
            );
          },
        },
        {
          label: "Delete",
          style: "red",
          onClick: (row) =>
            openAlert(
              "Delete Certification",
              `Delete certification "${row.name}"?`,
              async () => {
                await adminDeleteCertificationApi(row.certificationId as number);
                setData((prev) => prev.filter((r) => r.certificationId !== row.certificationId));
              },
            ),
        },
      ],
      onAdd: () =>
        openForm(
          "Add Certification",
          [
            { key: "name",     label: "Name",     type: "text", required: true },
            { key: "issuer",   label: "Issuer",   type: "text", required: true, placeholder: "e.g. Amazon" },
            { key: "category", label: "Category", type: "text", required: true, placeholder: "e.g. Tech" },
          ],
          async (v) => { await adminCreateCertificationApi({ name: v.name, issuer: v.issuer, category: v.category }); },
          "Create certification?",
        ),
      addLabel: "Add Certification",
    },

    // ── Hobbies ───────────────────────────────────────────────────────────────
    hobbies: {
      title: "Hobby Definitions",
      columns: [
        { key: "hobbyId",  label: "ID",       width: "50px" },
        { key: "name",     label: "Name",     width: "1fr" },
        { key: "category", label: "Category", width: "120px" },
      ],
      actions: [
        {
          label: "Edit",
          style: "blue",
          onClick: (row) =>
            openForm(
              "Edit Hobby",
              [
                { key: "name",     label: "Name",     type: "text", required: true },
                { key: "category", label: "Category", type: "text", required: true },
              ],
              async (v) => {
                await adminUpdateHobbyApi(row.hobbyId as number, { name: v.name, category: v.category });
                setData((prev) => prev.map((r) => r.hobbyId === row.hobbyId ? { ...r, ...v } : r));
              },
              "Save hobby changes?",
              { name: row.name as string, category: row.category as string },
            ),
        },
        {
          label: "Holders",
          style: "amber",
          onClick: (row) => {
            const hobbyId = row.hobbyId as number;
            void openDrillDown(
              `"${row.name as string}" — Holders`,
              "Hobby Definitions",
              () => adminGetHobbyHoldersApi(hobbyId) as Promise<Record<string, unknown>[]>,
              [
                { key: "playerId",    label: "PID",         width: "55px" },
                { key: "nickname",    label: "Nickname",    width: "1fr" },
                { key: "proficiency", label: "Proficiency", width: "90px" },
                { key: "status",      label: "Status",      width: "80px" },
                { key: "startedOn",   label: "Started",     width: "100px" },
              ],
              [
                {
                  label: "Revoke",
                  style: "red",
                  onClick: (holderRow) =>
                    openAlert(
                      "Revoke Hobby",
                      `Remove hobby "${row.name}" from ${holderRow.nickname}?`,
                      async () => {
                        await adminRevokeHobbyApi(holderRow.playerId as number, hobbyId);
                        setDrillDown((prev) =>
                          prev ? { ...prev, rows: prev.rows.filter((r) => r.playerId !== holderRow.playerId) } : prev,
                        );
                      },
                    ),
                },
              ],
              () =>
                openForm(
                  `Grant "${row.name as string}"`,
                  [
                    { key: "playerId",    label: "Player ID",   type: "number", required: true },
                    { key: "proficiency", label: "Proficiency (1-5)", type: "number", required: true, placeholder: "1" },
                    { key: "status",      label: "Status",      type: "select", required: true, options: HOBBY_STATUS_OPTIONS },
                    { key: "startedOn",   label: "Started On",  type: "date",   required: true },
                  ],
                  async (v) => {
                    await adminGrantHobbyApi(Number(v.playerId), hobbyId, {
                      proficiency: Number(v.proficiency),
                      status: v.status,
                      startedOn: v.startedOn,
                    });
                  },
                  `Grant hobby "${row.name}" to player?`,
                ),
              "Grant",
            );
          },
        },
        {
          label: "Delete",
          style: "red",
          onClick: (row) =>
            openAlert(
              "Delete Hobby",
              `Delete hobby "${row.name}"?`,
              async () => {
                await adminDeleteHobbyApi(row.hobbyId as number);
                setData((prev) => prev.filter((r) => r.hobbyId !== row.hobbyId));
              },
            ),
        },
      ],
      onAdd: () =>
        openForm(
          "Add Hobby",
          [
            { key: "name",     label: "Name",     type: "text", required: true },
            { key: "category", label: "Category", type: "text", required: true, placeholder: "e.g. Exercise" },
          ],
          async (v) => { await adminCreateHobbyApi({ name: v.name, category: v.category }); },
          "Create hobby?",
        ),
      addLabel: "Add Hobby",
    },

    // ── Item Definitions ──────────────────────────────────────────────────────
    "items-defs": {
      title: "Item Definitions",
      columns: [
        { key: "itemId",   label: "ID",       width: "55px" },
        { key: "name",     label: "Name",     width: "1fr" },
        { key: "category", label: "Category", width: "100px" },
        { key: "type",     label: "Type",     width: "130px" },
        { key: "rarity",   label: "Rarity",   width: "90px" },
      ],
      actions: [
        {
          label: "Edit",
          style: "blue",
          onClick: (row) =>
            openForm(
              "Edit Item Definition",
              [
                { key: "name",     label: "Name",     type: "text",   required: true },
                { key: "category", label: "Category", type: "select", required: true, options: ITEM_CATEGORY_OPTIONS },
                { key: "type",     label: "Type",     type: "text" },
                { key: "rarity",   label: "Rarity",   type: "select", required: true, options: RARITY_OPTIONS },
              ],
              async (v) => {
                await adminUpdateItemDefinitionApi(row.itemId as number, { name: v.name, category: v.category, type: v.type ?? "", rarity: v.rarity });
                setData((prev) => prev.map((r) => r.itemId === row.itemId ? { ...r, ...v } : r));
              },
              "Apply to ALL instances of this item?",
              { name: row.name as string, category: row.category as string, type: (row.type as string) ?? "", rarity: row.rarity as string },
            ),
        },
        {
          label: "Holders",
          style: "amber",
          onClick: (row) => {
            const itemId = row.itemId as number;
            void openDrillDown(
              `"${row.name as string}" — Holders`,
              "Item Definitions",
              () => adminGetItemHoldersByItemApi(itemId) as Promise<Record<string, unknown>[]>,
              [
                { key: "instanceId",     label: "Inst.",   width: "55px" },
                { key: "playerNickname", label: "Player",  width: "130px" },
                { key: "quantity",       label: "Qty",     width: "50px" },
                { key: "rarity",         label: "Rarity",  width: "90px" },
                { key: "bound",          label: "Bound",   width: "60px" },
              ],
              [
                {
                  label: "Confiscate",
                  style: "red",
                  onClick: (instRow) =>
                    openAlert(
                      "Confiscate Item",
                      `Confiscate "${row.name}" (x${instRow.quantity}) from ${instRow.playerNickname}?`,
                      async () => {
                        await adminConfiscateItemApi(instRow.instanceId as number);
                        setDrillDown((prev) =>
                          prev ? { ...prev, rows: prev.rows.filter((r) => r.instanceId !== instRow.instanceId) } : prev,
                        );
                      },
                    ),
                },
              ],
            );
          },
        },
      ],
    },

    // ── Item Instances ────────────────────────────────────────────────────────
    "items-instances": {
      title: "Item Instances — All Players",
      columns: [
        { key: "instanceId",     label: "Inst.",    width: "55px" },
        { key: "itemName",       label: "Item",     width: "1fr" },
        { key: "category",       label: "Category", width: "90px" },
        { key: "rarity",         label: "Rarity",   width: "90px" },
        { key: "quantity",       label: "Qty",      width: "45px" },
        { key: "playerNickname", label: "Holder",   width: "110px" },
        { key: "bound",          label: "Bound",    width: "55px" },
      ],
      actions: [
        {
          label: "Confiscate",
          style: "red",
          onClick: (row) =>
            openAlert(
              "Confiscate Item",
              `Confiscate "${row.itemName}" (x${row.quantity}) from ${row.playerNickname}?`,
              async () => {
                await adminConfiscateItemApi(row.instanceId as number);
                setData((prev) => prev.filter((r) => r.instanceId !== row.instanceId));
              },
            ),
        },
      ],
    },

    // ── Quest Definitions ─────────────────────────────────────────────────────
    "quest-defs": {
      title: "Quest Definitions",
      columns: [
        { key: "id",          label: "ID",       width: "50px" },
        { key: "code",        label: "Code",     width: "175px" },
        { key: "title",       label: "Title",    width: "1fr" },
        { key: "category",    label: "Category", width: "70px" },
        { key: "repeatRule",  label: "Repeat",   width: "75px" },
        { key: "rewardExp",   label: "EXP",      width: "65px" },
      ],
      actions: [
        {
          label: "Edit",
          style: "blue",
          onClick: (row) =>
            openForm(
              "Edit Quest Definition",
              [
                { key: "title",       label: "Title",        type: "text",   required: true },
                { key: "category",    label: "Category",     type: "select", required: true, options: QUEST_CATEGORY_OPTIONS },
                { key: "targetType",  label: "Target Type",  type: "text",   placeholder: "DISTANCE_KM", required: true },
                { key: "targetValue", label: "Target Value", type: "number", required: true },
                { key: "repeatRule",  label: "Repeat Rule",  type: "select", required: true, options: REPEAT_RULE_OPTIONS },
                { key: "rewardExp",   label: "Reward EXP",   type: "number", required: true },
              ],
              async (v) => {
                await adminUpdateQuestApi(row.code as string, {
                  title: v.title, category: v.category,
                  targetType: v.targetType, targetValue: Number(v.targetValue),
                  repeatRule: v.repeatRule, rewardExp: Number(v.rewardExp),
                });
                setData((prev) => prev.map((r) => r.code === row.code ? { ...r, ...v } : r));
              },
              "Save quest definition changes?",
              {
                title:       row.title as string,
                category:    row.category as string,
                targetType:  (row.targetType as string) ?? "",
                targetValue: String(row.targetValue ?? ""),
                repeatRule:  (row.repeatRule as string) ?? "",
                rewardExp:   String(row.rewardExp ?? ""),
              },
            ),
        },
        {
          label: "Acceptances",
          style: "amber",
          onClick: (row) => {
            const questCode = row.code as string;
            void openDrillDown(
              `"${row.title as string}" — Acceptances`,
              "Quest Definitions",
              () => adminGetQuestAcceptancesByCodeApi(questCode) as Promise<Record<string, unknown>[]>,
              [
                { key: "id",             label: "ID",      width: "55px" },
                { key: "playerNickname", label: "Player",  width: "100px" },
                { key: "progress",       label: "Prog",    width: "50px" },
                { key: "targetValue",    label: "Target",  width: "55px" },
                { key: "status",         label: "Status",  width: "105px" },
              ],
              [
                {
                  label: "Adjust",
                  style: "blue",
                  onClick: (acceptRow) =>
                    openForm(
                      `Adjust Progress — #${acceptRow.id}`,
                      [
                        { key: "type",  label: "Type",  type: "select", required: true, options: [
                          { value: "SET", label: "Set (absolute)" },
                          { value: "ADD", label: "Add (relative)" },
                        ]},
                        { key: "value", label: "Value", type: "number", required: true },
                      ],
                      async (v) => {
                        await adminAdjustQuestProgressApi(acceptRow.id as number, { type: v.type as "SET" | "ADD", value: Number(v.value) });
                        setDrillDown((prev) =>
                          prev ? { ...prev, rows: prev.rows.map((r) =>
                            r.id === acceptRow.id
                              ? { ...r, progress: v.type === "SET" ? Number(v.value) : (Number(r.progress) + Number(v.value)) }
                              : r
                          )} : prev,
                        );
                      },
                      "Adjust quest progress?",
                    ),
                },
                {
                  label: "Status",
                  style: "amber",
                  onClick: (acceptRow) =>
                    openForm(
                      `Change Status — #${acceptRow.id}`,
                      [
                        { key: "status", label: "Status", type: "select", required: true, options: QUEST_STATUS_OPTIONS },
                        { key: "reason", label: "Reason", type: "text",   placeholder: "Optional reason" },
                      ],
                      async (v) => {
                        await adminChangeQuestStatusApi(acceptRow.id as number, { status: v.status, reason: v.reason || undefined });
                        setDrillDown((prev) =>
                          prev ? { ...prev, rows: prev.rows.map((r) =>
                            r.id === acceptRow.id ? { ...r, status: v.status } : r
                          )} : prev,
                        );
                      },
                      "Change quest status?",
                      { status: (acceptRow.status as string) ?? "" },
                    ),
                },
              ],
            );
          },
        },
        {
          label: "Delete",
          style: "red",
          onClick: (row) =>
            openAlert(
              "Delete Quest",
              `Delete quest definition "${row.title}"? All acceptances will be removed.`,
              async () => {
                await adminDeleteQuestApi(row.code as string);
                setData((prev) => prev.filter((r) => r.code !== row.code));
              },
            ),
        },
      ],
      onAdd: () =>
        openForm(
          "Add Quest Definition",
          [
            { key: "code",        label: "Code",         type: "text",   placeholder: "QUEST_CODE", required: true },
            { key: "title",       label: "Title",        type: "text",   required: true },
            { key: "category",    label: "Category",     type: "select", required: true, options: QUEST_CATEGORY_OPTIONS },
            { key: "targetType",  label: "Target Type",  type: "text",   placeholder: "DISTANCE_KM", required: true },
            { key: "targetValue", label: "Target Value", type: "number", required: true },
            { key: "repeatRule",  label: "Repeat Rule",  type: "select", required: true, options: REPEAT_RULE_OPTIONS },
            { key: "rewardExp",   label: "Reward EXP",   type: "number", required: true },
          ],
          async (v) => {
            await adminCreateQuestApi({
              code: v.code, title: v.title, category: v.category,
              targetType: v.targetType, targetValue: Number(v.targetValue),
              repeatRule: v.repeatRule, rewardExp: Number(v.rewardExp),
            });
          },
          "Create this quest definition?",
        ),
      addLabel: "Add Quest",
    },

    // ── Quest Acceptances ─────────────────────────────────────────────────────
    "quest-acceptances": {
      title: "Quest Acceptances — All Players",
      columns: [
        { key: "id",             label: "ID",      width: "55px" },
        { key: "playerNickname", label: "Player",  width: "90px" },
        { key: "code",           label: "Code",    width: "155px" },
        { key: "category",       label: "Cat.",    width: "65px" },
        { key: "progress",       label: "Prog",    width: "50px" },
        { key: "targetValue",    label: "Target",  width: "55px" },
        { key: "status",         label: "Status",  width: "105px" },
      ],
      actions: [
        {
          label: "Adjust",
          style: "blue",
          onClick: (row) =>
            openForm(
              `Adjust Progress — #${row.id}`,
              [
                { key: "type",  label: "Type",  type: "select", required: true, options: [
                  { value: "SET", label: "Set (absolute)" },
                  { value: "ADD", label: "Add (relative)" },
                ]},
                { key: "value", label: "Value", type: "number", required: true },
              ],
              async (v) => {
                await adminAdjustQuestProgressApi(row.id as number, { type: v.type as "SET" | "ADD", value: Number(v.value) });
                setData((prev) => prev.map((r) =>
                  r.id === row.id
                    ? { ...r, progress: v.type === "SET" ? Number(v.value) : (Number(r.progress) + Number(v.value)) }
                    : r
                ));
              },
              "Adjust quest progress?",
            ),
        },
        {
          label: "Status",
          style: "amber",
          onClick: (row) =>
            openForm(
              `Change Status — #${row.id}`,
              [
                { key: "status", label: "Status", type: "select", required: true, options: QUEST_STATUS_OPTIONS },
                { key: "reason", label: "Reason", type: "text",   placeholder: "Optional reason" },
              ],
              async (v) => {
                await adminChangeQuestStatusApi(row.id as number, { status: v.status, reason: v.reason || undefined });
                setData((prev) => prev.map((r) => r.id === row.id ? { ...r, status: v.status } : r));
              },
              "Change quest status?",
              { status: (row.status as string) ?? "" },
            ),
        },
      ],
    },

    // ── Economy Shop ──────────────────────────────────────────────────────────
    "economy-shop": {
      title: "Shop Items",
      columns: [
        { key: "id",             label: "ID",       width: "50px" },
        { key: "itemName",       label: "Item",     width: "1fr" },
        { key: "price",          label: "Price",    width: "75px" },
        { key: "currency",       label: "Curr.",    width: "55px" },
        { key: "available",      label: "Active",   width: "60px" },
        { key: "perPlayerLimit", label: "Limit/P",  width: "65px" },
      ],
      actions: [
        {
          label: "Edit",
          style: "blue",
          onClick: (row) =>
            openForm(
              `Edit Shop Item — ${row.itemName as string}`,
              [
                { key: "price",                label: "Price",                  type: "number", required: true },
                { key: "globalLimit",          label: "Global Stock Limit",     type: "number", placeholder: "Leave blank for unlimited" },
                { key: "perPlayerLimit",       label: "Per Player Limit",       type: "number", placeholder: "Leave blank for unlimited" },
                { key: "reservationTtlSeconds", label: "Reservation TTL (sec)", type: "number", placeholder: "e.g. 300" },
              ],
              async (v) => {
                await adminUpdateShopItemApi(row.id as number, {
                  price: Number(v.price),
                  globalLimit: v.globalLimit ? Number(v.globalLimit) : undefined,
                  perPlayerLimit: v.perPlayerLimit ? Number(v.perPlayerLimit) : undefined,
                  reservationTtlSeconds: v.reservationTtlSeconds ? Number(v.reservationTtlSeconds) : undefined,
                });
                setData((prev) => prev.map((r) => r.id === row.id ? { ...r, price: Number(v.price) } : r));
              },
              "Save shop item changes?",
              {
                price: String(row.price ?? ""),
                perPlayerLimit: String(row.perPlayerLimit ?? ""),
              },
            ),
        },
        {
          label: "Toggle",
          style: "amber",
          onClick: (row) =>
            openAlert(
              row.available ? "Disable Shop Item" : "Enable Shop Item",
              `${row.available ? "Disable" : "Enable"} "${row.itemName}" in shop?`,
              async () => {
                const newState = !row.available;
                await adminToggleShopItemApi(row.id as number, newState);
                setData((prev) => prev.map((r) => r.id === row.id ? { ...r, available: newState } : r));
              },
            ),
        },
      ],
      onAdd: () =>
        openForm(
          "Add Shop Item",
          [
            { key: "itemId",               label: "Item ID",               type: "number", required: true },
            { key: "price",                label: "Price",                  type: "number", required: true },
            { key: "currency",             label: "Currency",               type: "select", required: true, options: [
              { value: "col", label: "Col" },
              { value: "gem", label: "Gem" },
            ]},
            { key: "globalLimit",          label: "Global Stock Limit",     type: "number", placeholder: "Leave blank for unlimited" },
            { key: "perPlayerLimit",       label: "Per Player Limit",       type: "number", placeholder: "Leave blank for unlimited" },
            { key: "reservationTtlSeconds", label: "Reservation TTL (sec)", type: "number", placeholder: "300" },
          ],
          async (v) => {
            await adminCreateShopItemApi({
              itemId: Number(v.itemId),
              price: Number(v.price),
              currency: v.currency,
              globalLimit: v.globalLimit ? Number(v.globalLimit) : undefined,
              perPlayerLimit: v.perPlayerLimit ? Number(v.perPlayerLimit) : undefined,
              reservationTtlSeconds: v.reservationTtlSeconds ? Number(v.reservationTtlSeconds) : undefined,
            });
          },
          "Add item to shop?",
        ),
      addLabel: "Add Shop Item",
    },

    // ── Economy Listings ──────────────────────────────────────────────────────
    "economy-listings": {
      title: "Economy — Listings",
      columns: [
        { key: "id",       label: "ID",          width: "50px" },
        { key: "itemId",   label: "Item ID",     width: "70px" },
        { key: "sellerId", label: "Seller",      width: "70px" },
        { key: "price",    label: "Price (col)", width: "100px" },
        { key: "status",   label: "Status",      width: "90px" },
        { key: "currency", label: "Currency",    width: "80px" },
      ],
      actions: [
        {
          label: "Edit",
          style: "blue",
          onClick: (row) =>
            openForm(
              "Edit Listing",
              [
                { key: "price",  label: "Price (col)", type: "number", required: true },
                { key: "status", label: "Status",      type: "select", required: true, options: [
                  { value: "ACTIVE",    label: "Active" },
                  { value: "RESERVED",  label: "Reserved" },
                  { value: "SOLD",      label: "Sold" },
                  { value: "CANCELLED", label: "Cancelled" },
                ]},
              ],
              async (v) => {
                await adminUpdateListingApi(row.id as number, { price: Number(v.price), status: v.status });
                setData((prev) => prev.map((r) => r.id === row.id ? { ...r, price: Number(v.price), status: v.status } : r));
              },
              "Save listing changes?",
              { price: String(row.price ?? ""), status: (row.status as string) ?? "" },
            ),
        },
        {
          label: "Cancel",
          style: "amber",
          onClick: (row) =>
            openAlert(
              "Cancel Listing",
              `Cancel listing #${row.id}?`,
              async () => {
                await adminCancelListingApi(row.id as number);
                setData((prev) => prev.filter((r) => r.id !== row.id));
              },
            ),
        },
      ],
    },

    // ── Parties ──────────────────────────────────────────────────────────────
    "social-parties": {
      title: "Party Management",
      columns: [
        { key: "id",         label: "ID",     width: "50px" },
        { key: "name",       label: "Name",   width: "1fr" },
        { key: "code",       label: "Code",   width: "120px" },
        { key: "status",     label: "Status", width: "80px" },
        { key: "maxMembers", label: "Max",    width: "50px" },
        { key: "joinPolicy", label: "Policy", width: "90px" },
      ],
      actions: [
        {
          label: "Edit",
          style: "blue",
          onClick: (row) =>
            openForm(
              "Edit Party",
              [
                { key: "name",       label: "Name",        type: "text",   required: true },
                { key: "status",     label: "Status",      type: "select", required: true, options: GROUP_STATUS_OPTIONS },
                { key: "maxMembers", label: "Max Members", type: "number", required: true },
                { key: "joinPolicy", label: "Join Policy", type: "select", required: true, options: JOIN_POLICY_OPTIONS },
              ],
              async (v) => {
                await adminUpdatePartyApi(row.id as number, { name: v.name, status: v.status, maxMembers: Number(v.maxMembers), joinPolicy: v.joinPolicy });
                setData((prev) => prev.map((r) => r.id === row.id ? { ...r, ...v } : r));
              },
              "Save party changes?",
              { name: row.name as string, status: row.status as string, maxMembers: String(row.maxMembers ?? ""), joinPolicy: (row.joinPolicy as string) ?? "" },
            ),
        },
        {
          label: "Members",
          style: "amber",
          onClick: (row) => {
            const partyId = row.id as number;
            void openDrillDown(
              `${row.name as string} — Members`,
              "Party Management",
              () => adminGetPartyMembersApi(partyId) as Promise<Record<string, unknown>[]>,
              [
                { key: "memberId", label: "ID",       width: "55px" },
                { key: "playerId", label: "PID",      width: "55px" },
                { key: "nickname", label: "Nickname", width: "1fr" },
                { key: "role",     label: "Role",     width: "90px" },
                { key: "joinedAt", label: "Joined",   width: "110px" },
              ],
              [
                {
                  label: "Remove",
                  style: "red",
                  onClick: (memberRow) =>
                    openAlert(
                      "Remove Member",
                      `Remove ${memberRow.nickname} from party?`,
                      async () => {
                        await adminRemovePartyMemberApi(partyId, memberRow.memberId as number);
                        setDrillDown((prev) =>
                          prev ? { ...prev, rows: prev.rows.filter((r) => r.memberId !== memberRow.memberId) } : prev,
                        );
                      },
                    ),
                },
              ],
              () =>
                openForm(
                  "Add Member to Party",
                  [{ key: "playerId", label: "Player ID", type: "number", required: true }],
                  async (v) => { await adminAddPartyMemberApi(partyId, Number(v.playerId)); },
                  `Add player to party "${row.name}"?`,
                ),
              "Add Member",
            );
          },
        },
        {
          label: "Dissolve",
          style: "red",
          onClick: (row) =>
            openAlert(
              "Dissolve Party",
              `Dissolve party "${row.name}"? All members will be removed.`,
              async () => {
                await adminDissolvePartyApi(row.id as number);
                setData((prev) => prev.filter((r) => r.id !== row.id));
              },
            ),
        },
      ],
    },

    // ── Guilds ────────────────────────────────────────────────────────────────
    "social-guilds": {
      title: "Guild Management",
      columns: [
        { key: "id",         label: "ID",     width: "50px" },
        { key: "name",       label: "Name",   width: "1fr" },
        { key: "code",       label: "Code",   width: "120px" },
        { key: "status",     label: "Status", width: "80px" },
        { key: "maxMembers", label: "Max",    width: "50px" },
        { key: "joinPolicy", label: "Policy", width: "90px" },
      ],
      actions: [
        {
          label: "Edit",
          style: "blue",
          onClick: (row) =>
            openForm(
              "Edit Guild",
              [
                { key: "name",       label: "Name",        type: "text",   required: true },
                { key: "status",     label: "Status",      type: "select", required: true, options: GROUP_STATUS_OPTIONS },
                { key: "maxMembers", label: "Max Members", type: "number", required: true },
                { key: "joinPolicy", label: "Join Policy", type: "select", required: true, options: JOIN_POLICY_OPTIONS },
              ],
              async (v) => {
                await adminUpdateGuildApi(row.id as number, { name: v.name, status: v.status, maxMembers: Number(v.maxMembers), joinPolicy: v.joinPolicy });
                setData((prev) => prev.map((r) => r.id === row.id ? { ...r, ...v } : r));
              },
              "Save guild changes?",
              { name: row.name as string, status: row.status as string, maxMembers: String(row.maxMembers ?? ""), joinPolicy: (row.joinPolicy as string) ?? "" },
            ),
        },
        {
          label: "Members",
          style: "amber",
          onClick: (row) => {
            const guildId = row.id as number;
            void openDrillDown(
              `${row.name as string} — Members`,
              "Guild Management",
              () => adminGetGuildMembersApi(guildId) as Promise<Record<string, unknown>[]>,
              [
                { key: "memberId", label: "ID",       width: "55px" },
                { key: "playerId", label: "PID",      width: "55px" },
                { key: "nickname", label: "Nickname", width: "1fr" },
                { key: "role",     label: "Role",     width: "90px" },
                { key: "joinedAt", label: "Joined",   width: "110px" },
              ],
              [
                {
                  label: "Remove",
                  style: "red",
                  onClick: (memberRow) =>
                    openAlert(
                      "Remove Member",
                      `Remove ${memberRow.nickname} from guild?`,
                      async () => {
                        await adminRemoveGuildMemberApi(guildId, memberRow.memberId as number);
                        setDrillDown((prev) =>
                          prev ? { ...prev, rows: prev.rows.filter((r) => r.memberId !== memberRow.memberId) } : prev,
                        );
                      },
                    ),
                },
              ],
              () =>
                openForm(
                  "Add Member to Guild",
                  [{ key: "playerId", label: "Player ID", type: "number", required: true }],
                  async (v) => { await adminAddGuildMemberApi(guildId, Number(v.playerId)); },
                  `Add player to guild "${row.name}"?`,
                ),
              "Add Member",
            );
          },
        },
        {
          label: "Dissolve",
          style: "red",
          onClick: (row) =>
            openAlert(
              "Dissolve Guild",
              `Dissolve guild "${row.name}"?`,
              async () => {
                await adminDissolveGuildApi(row.id as number);
                setData((prev) => prev.filter((r) => r.id !== row.id));
              },
            ),
        },
      ],
    },

    // ── Users ─────────────────────────────────────────────────────────────────
    users: {
      title: "User Management",
      columns: [
        { key: "id",       label: "ID",       width: "50px" },
        { key: "email",    label: "Email",    width: "1fr" },
        { key: "nickname", label: "Nickname", width: "110px" },
        { key: "role",     label: "Role",     width: "70px" },
        { key: "status",   label: "Status",   width: "80px" },
      ],
      actions: [
        {
          label: "Status",
          style: "blue",
          onClick: (row) =>
            openForm(
              `Change Status — ${row.nickname as string}`,
              [
                { key: "status", label: "Status", type: "select", required: true, options: USER_STATUS_OPTIONS },
                { key: "reason", label: "Reason", type: "text",   required: true, placeholder: "Reason for status change" },
              ],
              async (v) => {
                await adminChangeUserStatusApi(row.id as number, v.status, v.reason);
                setData((prev) => prev.map((r) => r.id === row.id ? { ...r, status: v.status } : r));
              },
              "Change user status?",
              { status: (row.status as string) ?? "" },
            ),
        },
        {
          label: "Delete",
          style: "red",
          onClick: (row) => {
            if (row.role === "ADMIN") return;
            openAlert(
              "Delete User",
              `Delete user "${row.nickname}" (${row.email})? This is irreversible.`,
              async () => {
                await adminDeleteUserApi(row.id as number);
                setData((prev) => prev.filter((r) => r.id !== row.id));
              },
            );
          },
        },
      ],
    },
  };

  const config = menuConfig[selectedMenu];

  if (isLoading || !currentUser) return null;

  return (
    <div
      className="flex h-screen overflow-hidden"
      style={{
        background:
          "radial-gradient(circle at 18% 20%, rgba(82,127,214,0.10), transparent 40%), linear-gradient(180deg, #07090d 0%, #090b10 38%, #0a0c11 100%)",
      }}
    >
      {/* ── Sidebar ─────────────────────────────────────────────────────── */}
      <aside
        className="flex shrink-0 flex-col overflow-hidden"
        style={{ width: 220, borderRight: "1px solid rgba(255,255,255,0.08)", background: "rgba(10,12,17,0.95)" }}
      >
        <div
          className="relative px-5 py-4"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}
        >
          <div style={GRID_OVERLAY_STYLE} />
          <p className="relative uppercase" style={{ fontSize: "10px", letterSpacing: "0.28em", color: SAO.color.text.goldDim }}>
            Admin Panel
          </p>
          <p className="relative mt-0.5 text-sm font-semibold" style={{ letterSpacing: "0.06em", color: SAO.color.text.onDark }}>
            {currentUser.nickname}
          </p>
        </div>

        <nav className="flex flex-col gap-0.5 overflow-y-auto p-3 flex-1">
          {ADMIN_MENUS.map((entry, i) => {
            if (entry.kind === "sep") {
              return (
                <div key={`sep-${i}`} className="px-2 pb-1 pt-3">
                  <span style={{ fontSize: "9px", letterSpacing: "0.22em", color: SAO.color.text.goldDim, textTransform: "uppercase" }}>
                    {entry.label}
                  </span>
                </div>
              );
            }
            const isActive = selectedMenu === entry.id;
            return (
              <button
                key={entry.id}
                type="button"
                onClick={() => setSelectedMenu(entry.id)}
                className="relative flex items-center gap-3 rounded-sm px-3 py-2.5 text-left transition-colors hover:bg-white/5"
                style={{ background: isActive ? "rgba(248,197,78,0.08)" : "transparent" }}
              >
                {isActive ? (
                  <span
                    className="absolute inset-y-0 left-0 rounded-l-sm"
                    style={{ width: "3px", background: SAO.color.action.gold }}
                  />
                ) : null}
                <span
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-sm text-[10px] font-bold"
                  style={{
                    background: isActive ? "rgba(248,197,78,0.15)" : "rgba(255,255,255,0.06)",
                    color: isActive ? SAO.color.action.gold : SAO.color.text.onDark,
                  }}
                >
                  {entry.slotLabel}
                </span>
                <span
                  className="text-sm"
                  style={{
                    letterSpacing: "0.06em",
                    color: isActive ? SAO.color.text.gold : SAO.color.text.onDark,
                    fontWeight: isActive ? 600 : 400,
                  }}
                >
                  {entry.label}
                </span>
              </button>
            );
          })}
        </nav>

        <div className="p-3" style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }}>
          <button
            type="button"
            onClick={() => setLogoutAlertOpen(true)}
            className="w-full rounded-sm px-3 py-2 text-sm tracking-[0.08em] transition-colors hover:bg-white/5"
            style={{ color: SAO.color.text.onDark }}
          >
            Logout
          </button>
        </div>
      </aside>

      {/* ── Main content ─────────────────────────────────────────────────── */}
      <main className="flex flex-1 flex-col overflow-hidden">
        <div
          className="relative shrink-0 px-7 py-4"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.06)", background: "rgba(7,9,13,0.8)" }}
        >
          <p className="uppercase" style={{ fontSize: "11px", letterSpacing: "0.28em", color: SAO.color.text.onDark }}>
            Life As Game — Admin
          </p>
        </div>

        <div className="flex-1 overflow-y-auto p-7">
          <AnimatePresence mode="wait">
            <motion.div
              key={selectedMenu}
              initial={MOTION.panelSwap.initial}
              animate={MOTION.panelSwap.animate}
              exit={MOTION.panelSwap.exit}
              transition={MOTION.panelSwap.transition}
              className="h-full"
            >
              {drillDown ? (
                <AdminSubPanel {...drillDown} onBack={() => setDrillDown(null)} />
              ) : (
                <AdminPanel title={config.title} onAdd={config.onAdd} addLabel={config.addLabel}>
                  {isDataLoading ? (
                    <div className="py-10 text-center text-sm tracking-[0.1em] text-zinc-500">Loading…</div>
                  ) : (
                    <AdminTable rows={data} columns={config.columns} actions={config.actions} />
                  )}
                </AdminPanel>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      {/* ── Overlays ─────────────────────────────────────────────────────── */}
      <SaoAlert
        isOpen={alertOpen}
        title={alertTitle}
        message={alertMessage}
        onConfirm={() => { setAlertOpen(false); alertOnConfirm(); }}
        onCancel={() => setAlertOpen(false)}
      />

      <SaoAlert
        isOpen={logoutAlertOpen}
        title="Logout"
        message="Save session and log out of admin?"
        onConfirm={handleLogout}
        onCancel={() => setLogoutAlertOpen(false)}
      />

      <SaoFormPanel
        isOpen={formOpen}
        title={formTitle}
        fields={formFields}
        onSubmit={formOnSubmit}
        onClose={() => setFormOpen(false)}
        confirmMessage={formConfirmMessage}
        initialValues={formInitialValues}
      />
    </div>
  );
}
