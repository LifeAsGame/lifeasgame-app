"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import SaoAlert from "@/components/SaoAlert";
import SaoFormPanel, { type FieldConfig } from "@/components/SaoFormPanel";
import { useAuth } from "@/context/AuthContext";
import {
  adminCancelListingApi,
  adminCreateAchievementApi,
  adminCreateQuestApi,
  adminCreateTitleApi,
  adminDeleteAchievementApi,
  adminDeleteTitleApi,
  adminDeleteUserApi,
  adminDissolveGuildApi,
  adminDissolvePartyApi,
  adminGetAchievementsApi,
  adminGetGuildsApi,
  adminGetItemsApi,
  adminGetListingsApi,
  adminGetPartiesApi,
  adminGetPlayersApi,
  adminGetQuestsApi,
  adminGetTitlesApi,
  adminGetUsersApi,
} from "@/lib/api/endpoints/admin.api";
import { MOTION } from "@/lib/motion";

type AdminMenu =
  | "players"
  | "titles"
  | "achievements"
  | "items"
  | "quests"
  | "social-parties"
  | "social-guilds"
  | "economy"
  | "users";

const ADMIN_MENUS: { id: AdminMenu; label: string; slotLabel: string }[] = [
  { id: "players", label: "Players", slotLabel: "PL" },
  { id: "titles", label: "Titles", slotLabel: "TI" },
  { id: "achievements", label: "Achievements", slotLabel: "AC" },
  { id: "items", label: "Items", slotLabel: "IT" },
  { id: "quests", label: "Quests", slotLabel: "QU" },
  { id: "social-parties", label: "Parties", slotLabel: "PT" },
  { id: "social-guilds", label: "Guilds", slotLabel: "GD" },
  { id: "economy", label: "Economy", slotLabel: "EC" },
  { id: "users", label: "Users", slotLabel: "US" },
];

// ─── Generic table ─────────────────────────────────────────────────────────

function AdminTable({
  rows,
  columns,
  onAction,
  actionLabel = "Delete",
  actionStyle = "red",
}: {
  rows: Record<string, unknown>[];
  columns: { key: string; label: string; width?: string }[];
  onAction?: (row: Record<string, unknown>) => void;
  actionLabel?: string;
  actionStyle?: "red" | "amber";
}) {
  const btnColor =
    actionStyle === "red"
      ? "rgba(220,38,38,0.14)"
      : "rgba(248,197,78,0.18)";
  const btnText = actionStyle === "red" ? "#dc2626" : "#92620a";

  return (
    <div
      className="overflow-hidden rounded-sm"
      style={{
        border: "1px solid rgba(160,172,190,0.35)",
        background: "rgba(255,255,255,0.5)",
      }}
    >
      {/* Header */}
      <div
        className="grid px-4 py-2.5"
        style={{
          gridTemplateColumns: columns.map((c) => c.width ?? "1fr").join(" ") + (onAction ? " 80px" : ""),
          background: "linear-gradient(180deg, rgba(200,208,222,0.8), rgba(185,195,212,0.8))",
          borderBottom: "1px solid rgba(160,172,190,0.4)",
        }}
      >
        {columns.map((col) => (
          <span
            key={col.key}
            className="text-[11px] font-bold tracking-[0.2em] text-zinc-600 uppercase"
          >
            {col.label}
          </span>
        ))}
        {onAction ? (
          <span className="text-[11px] font-bold tracking-[0.2em] text-zinc-600 uppercase">
            Action
          </span>
        ) : null}
      </div>

      {/* Rows */}
      {rows.length === 0 ? (
        <div className="px-4 py-6 text-center text-sm text-zinc-500">No data</div>
      ) : (
        rows.map((row, i) => (
          <div
            key={i}
            className="grid items-center px-4 py-2.5"
            style={{
              gridTemplateColumns:
                columns.map((c) => c.width ?? "1fr").join(" ") + (onAction ? " 80px" : ""),
              borderTop: i > 0 ? "1px solid rgba(160,172,190,0.2)" : undefined,
            }}
          >
            {columns.map((col) => (
              <span
                key={col.key}
                className="truncate text-xs tracking-[0.06em] text-zinc-700"
              >
                {String(row[col.key] ?? "—")}
              </span>
            ))}
            {onAction ? (
              <button
                type="button"
                onClick={() => onAction(row)}
                className="rounded-sm px-2 py-1 text-[11px] font-semibold tracking-[0.1em] uppercase transition-opacity hover:opacity-80"
                style={{ background: btnColor, color: btnText }}
              >
                {actionLabel}
              </button>
            ) : null}
          </div>
        ))
      )}
    </div>
  );
}

// ─── Panel Shell ───────────────────────────────────────────────────────────

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
        <h2 className="text-base font-bold tracking-[0.18em] text-zinc-700 uppercase">
          {title}
        </h2>
        {onAdd ? (
          <button
            type="button"
            onClick={onAdd}
            className="rounded-sm px-4 py-1.5 text-xs font-bold tracking-[0.16em] uppercase"
            style={{
              background: "linear-gradient(150deg, rgba(248,197,78,0.92), rgba(234,168,40,0.92))",
              color: "#2a2008",
              boxShadow: "0 2px 8px rgba(248,197,78,0.3)",
            }}
          >
            + {addLabel}
          </button>
        ) : null}
      </div>
      <div className="flex-1 overflow-y-auto">{children}</div>
    </motion.div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────

export default function AdminPage() {
  const router = useRouter();
  const { currentUser, isLoading, logout } = useAuth();
  const [selectedMenu, setSelectedMenu] = useState<AdminMenu>("players");
  const [data, setData] = useState<Record<string, unknown>[]>([]);
  const [isDataLoading, setIsDataLoading] = useState(false);

  // Form panel state
  const [formOpen, setFormOpen] = useState(false);
  const [formTitle, setFormTitle] = useState("");
  const [formFields, setFormFields] = useState<FieldConfig[]>([]);
  const [formConfirmMessage, setFormConfirmMessage] = useState<string | undefined>();
  const [formOnSubmit, setFormOnSubmit] = useState<(v: Record<string, string>) => void>(
    () => () => {},
  );

  // Alert state
  const [alertOpen, setAlertOpen] = useState(false);
  const [alertTitle, setAlertTitle] = useState("");
  const [alertMessage, setAlertMessage] = useState("");
  const [alertOnConfirm, setAlertOnConfirm] = useState<() => void>(() => () => {});

  // Logout alert
  const [logoutAlertOpen, setLogoutAlertOpen] = useState(false);

  // Auth guard
  useEffect(() => {
    if (!isLoading && !currentUser) router.replace("/login");
    if (!isLoading && currentUser?.role !== "admin") router.replace("/");
  }, [currentUser, isLoading, router]);

  // Load data for selected menu
  useEffect(() => {
    if (!currentUser) return;
    let cancelled = false;
    setIsDataLoading(true);
    setData([]);

    const loaders: Record<AdminMenu, () => Promise<unknown[]>> = {
      players: adminGetPlayersApi,
      titles: adminGetTitlesApi,
      achievements: adminGetAchievementsApi,
      items: adminGetItemsApi,
      quests: adminGetQuestsApi,
      "social-parties": adminGetPartiesApi,
      "social-guilds": adminGetGuildsApi,
      economy: adminGetListingsApi,
      users: adminGetUsersApi,
    };

    loaders[selectedMenu]()
      .then((rows) => {
        if (!cancelled) setData(rows as Record<string, unknown>[]);
      })
      .catch(console.error)
      .finally(() => {
        if (!cancelled) setIsDataLoading(false);
      });

    return () => { cancelled = true; };
  }, [selectedMenu, currentUser]);

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
  ) => {
    setFormTitle(title);
    setFormFields(fields);
    setFormOnSubmit(() => onSubmit);
    setFormConfirmMessage(confirmMsg);
    setFormOpen(true);
  };

  const handleLogout = () => {
    logout();
    router.replace("/login");
  };

  // ─── Per-menu config ─────────────────────────────────────────────────────

  type ColumnConfig = { key: string; label: string; width?: string };

  const menuConfig: Record<
    AdminMenu,
    {
      title: string;
      columns: ColumnConfig[];
      actionLabel?: string;
      onAction?: (row: Record<string, unknown>) => void;
      onAdd?: () => void;
      addLabel?: string;
    }
  > = {
    players: {
      title: "Player Management",
      columns: [
        { key: "id", label: "ID", width: "50px" },
        { key: "email", label: "Email", width: "1fr" },
        { key: "nickname", label: "Nickname", width: "120px" },
        { key: "status", label: "Status", width: "80px" },
      ],
    },
    titles: {
      title: "Title Management",
      columns: [
        { key: "titleId", label: "ID", width: "50px" },
        { key: "code", label: "Code", width: "1fr" },
        { key: "name", label: "Name", width: "1fr" },
        { key: "category", label: "Category", width: "120px" },
      ],
      actionLabel: "Delete",
      onAction: (row) =>
        openAlert(
          "Delete Title",
          `Delete title "${row.name}"? This action cannot be undone.`,
          async () => {
            await adminDeleteTitleApi(row.titleId as number);
            setData((prev) => prev.filter((r) => r.titleId !== row.titleId));
          },
        ),
      onAdd: () =>
        openForm(
          "Add Title",
          [
            { key: "code", label: "Code", type: "text", placeholder: "MY_TITLE", required: true },
            { key: "name", label: "Name", type: "text", placeholder: "My Title", required: true },
            { key: "category", label: "Category", type: "select", options: [
              { value: "Combat", label: "Combat" },
              { value: "Exploration", label: "Exploration" },
              { value: "Social", label: "Social" },
              { value: "Achievement", label: "Achievement" },
              { value: "Special", label: "Special" },
            ], required: true },
            { key: "descMd", label: "Description", type: "textarea", placeholder: "Title description..." },
          ],
          async (v) => { await adminCreateTitleApi({ code: v.code, name: v.name, category: v.category, descMd: v.descMd }); },
          "Create this title?",
        ),
      addLabel: "Add Title",
    },
    achievements: {
      title: "Achievement Management",
      columns: [
        { key: "achievementId", label: "ID", width: "50px" },
        { key: "code", label: "Code", width: "1fr" },
        { key: "name", label: "Name", width: "1fr" },
        { key: "category", label: "Category", width: "100px" },
        { key: "acquiredAt", label: "Acquired", width: "130px" },
      ],
      actionLabel: "Delete",
      onAction: (row) =>
        openAlert(
          "Delete Achievement",
          `Delete achievement "${row.name}"?`,
          async () => {
            await adminDeleteAchievementApi(row.achievementId as number);
            setData((prev) => prev.filter((r) => r.achievementId !== row.achievementId));
          },
        ),
      onAdd: () =>
        openForm(
          "Add Achievement",
          [
            { key: "code", label: "Code", type: "text", required: true },
            { key: "name", label: "Name", type: "text", required: true },
            { key: "category", label: "Category", type: "text", required: true },
            { key: "descMd", label: "Description", type: "textarea" },
          ],
          async (v) => { await adminCreateAchievementApi({ code: v.code, name: v.name, category: v.category, descMd: v.descMd }); },
          "Create this achievement?",
        ),
      addLabel: "Add Achievement",
    },
    items: {
      title: "Item Management",
      columns: [
        { key: "itemInstanceId", label: "Instance", width: "60px" },
        { key: "itemName", label: "Name", width: "1fr" },
        { key: "category", label: "Category", width: "100px" },
        { key: "rarity", label: "Rarity", width: "90px" },
        { key: "quantity", label: "Qty", width: "50px" },
      ],
    },
    quests: {
      title: "Quest Management",
      columns: [
        { key: "code", label: "Code", width: "160px" },
        { key: "title", label: "Title", width: "1fr" },
        { key: "category", label: "Category", width: "90px" },
        { key: "repeatRule", label: "Repeat", width: "80px" },
        { key: "rewardExp", label: "EXP", width: "70px" },
      ],
      actionLabel: "Delete",
      onAction: (row) =>
        openAlert(
          "Delete Quest",
          `Delete quest "${row.title}"?`,
          async () => {
            await adminDeleteQuestApi(row.code as string);
            setData((prev) => prev.filter((r) => r.code !== row.code));
          },
        ),
      onAdd: () =>
        openForm(
          "Add Quest",
          [
            { key: "code", label: "Code", type: "text", placeholder: "QUEST_CODE", required: true },
            { key: "title", label: "Title", type: "text", required: true },
            { key: "category", label: "Category", type: "select", options: [
              { value: "Daily", label: "Daily" },
              { value: "Story", label: "Story" },
              { value: "Party", label: "Party" },
              { value: "Guild", label: "Guild" },
              { value: "Dungeon", label: "Dungeon" },
            ], required: true },
            { key: "targetType", label: "Target Type", type: "text", placeholder: "KILL_COUNT", required: true },
            { key: "targetValue", label: "Target Value", type: "number", required: true },
            { key: "repeatRule", label: "Repeat Rule", type: "select", options: [
              { value: "NONE", label: "None" },
              { value: "DAILY", label: "Daily" },
              { value: "WEEKLY", label: "Weekly" },
              { value: "MONTHLY", label: "Monthly" },
            ], required: true },
            { key: "rewardExp", label: "Reward EXP", type: "number", required: true },
          ],
          async (v) => {
            await adminCreateQuestApi({
              code: v.code,
              title: v.title,
              category: v.category,
              targetType: v.targetType,
              targetValue: Number(v.targetValue),
              repeatRule: v.repeatRule,
              rewardExp: Number(v.rewardExp),
            });
          },
          "Create this quest?",
        ),
      addLabel: "Add Quest",
    },
    "social-parties": {
      title: "Party Management",
      columns: [
        { key: "id", label: "ID", width: "50px" },
        { key: "name", label: "Name", width: "1fr" },
        { key: "code", label: "Code", width: "120px" },
        { key: "status", label: "Status", width: "80px" },
        { key: "maxMembers", label: "Max", width: "50px" },
      ],
      actionLabel: "Dissolve",
      actionStyle: "red",
      onAction: (row) =>
        openAlert(
          "Dissolve Party",
          `Dissolve party "${row.name}"? All members will be removed.`,
          async () => {
            await adminDissolvePartyApi(row.id as number);
            setData((prev) => prev.filter((r) => r.id !== row.id));
          },
        ),
    } as typeof menuConfig["social-parties"],
    "social-guilds": {
      title: "Guild Management",
      columns: [
        { key: "id", label: "ID", width: "50px" },
        { key: "name", label: "Name", width: "1fr" },
        { key: "code", label: "Code", width: "120px" },
        { key: "status", label: "Status", width: "80px" },
        { key: "maxMembers", label: "Max", width: "50px" },
      ],
      actionLabel: "Dissolve",
      actionStyle: "red",
      onAction: (row) =>
        openAlert(
          "Dissolve Guild",
          `Dissolve guild "${row.name}"?`,
          async () => {
            await adminDissolveGuildApi(row.id as number);
            setData((prev) => prev.filter((r) => r.id !== row.id));
          },
        ),
    } as typeof menuConfig["social-guilds"],
    economy: {
      title: "Economy — Listings",
      columns: [
        { key: "id", label: "ID", width: "50px" },
        { key: "itemId", label: "Item ID", width: "70px" },
        { key: "sellerId", label: "Seller", width: "70px" },
        { key: "price", label: "Price (col)", width: "100px" },
        { key: "status", label: "Status", width: "90px" },
      ],
      actionLabel: "Cancel",
      actionStyle: "amber",
      onAction: (row) =>
        openAlert(
          "Cancel Listing",
          `Cancel listing #${row.id}?`,
          async () => {
            await adminCancelListingApi(row.id as number);
            setData((prev) => prev.filter((r) => r.id !== row.id));
          },
        ),
    } as typeof menuConfig["economy"],
    users: {
      title: "User Management",
      columns: [
        { key: "id", label: "ID", width: "50px" },
        { key: "email", label: "Email", width: "1fr" },
        { key: "nickname", label: "Nickname", width: "110px" },
        { key: "role", label: "Role", width: "70px" },
        { key: "status", label: "Status", width: "80px" },
      ],
      actionLabel: "Delete",
      onAction: (row) => {
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
        style={{
          width: 220,
          borderRight: "1px solid rgba(203,211,221,0.22)",
          background:
            "linear-gradient(180deg, rgba(230,234,241,0.97), rgba(215,221,232,0.96))",
        }}
      >
        {/* Sidebar header */}
        <div
          className="relative px-5 py-4"
          style={{
            borderBottom: "1px solid rgba(160,172,190,0.35)",
            background: "linear-gradient(180deg, rgba(205,212,224,0.99), rgba(192,200,214,0.98))",
          }}
        >
          <div className="absolute inset-0 opacity-[0.07] [background-image:linear-gradient(rgba(0,0,0,0.7)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.7)_1px,transparent_1px)] [background-size:20px_20px]" />
          <p className="relative text-[11px] font-bold tracking-[0.28em] text-zinc-500 uppercase">
            Admin Panel
          </p>
          <p className="relative mt-0.5 text-sm font-semibold tracking-[0.06em] text-zinc-700">
            {currentUser.nickname}
          </p>
        </div>

        {/* Menu items */}
        <nav className="flex flex-col gap-0.5 overflow-y-auto p-3 flex-1">
          {ADMIN_MENUS.map((menu) => {
            const isActive = selectedMenu === menu.id;
            return (
              <button
                key={menu.id}
                type="button"
                onClick={() => setSelectedMenu(menu.id)}
                className="flex items-center gap-3 rounded-sm px-3 py-2.5 text-left transition-colors"
                style={{
                  background: isActive
                    ? "linear-gradient(150deg, rgba(248,197,78,0.22), rgba(234,168,40,0.18))"
                    : "transparent",
                  border: isActive
                    ? "1px solid rgba(248,197,78,0.35)"
                    : "1px solid transparent",
                }}
              >
                <span
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-sm text-[10px] font-bold"
                  style={{
                    background: isActive
                      ? "linear-gradient(150deg, rgba(248,197,78,0.9), rgba(234,168,40,0.9))"
                      : "rgba(140,155,175,0.2)",
                    color: isActive ? "#2a2008" : "#6b7280",
                  }}
                >
                  {menu.slotLabel}
                </span>
                <span
                  className="text-sm tracking-[0.06em]"
                  style={{ color: isActive ? "#3d3010" : "#4b5563", fontWeight: isActive ? 600 : 400 }}
                >
                  {menu.label}
                </span>
              </button>
            );
          })}
        </nav>

        {/* Logout */}
        <div
          className="p-3"
          style={{ borderTop: "1px solid rgba(160,172,190,0.3)" }}
        >
          <button
            type="button"
            onClick={() => setLogoutAlertOpen(true)}
            className="w-full rounded-sm px-3 py-2 text-sm tracking-[0.08em] text-zinc-600 transition-colors hover:bg-zinc-600/10"
          >
            Logout
          </button>
        </div>
      </aside>

      {/* ── Main content ─────────────────────────────────────────────────── */}
      <main className="flex flex-1 flex-col overflow-hidden">
        {/* Top bar */}
        <div
          className="relative shrink-0 px-7 py-4"
          style={{
            borderBottom: "1px solid rgba(160,172,190,0.18)",
            background: "rgba(10,12,17,0.6)",
          }}
        >
          <p className="text-[11px] tracking-[0.28em] text-zinc-500 uppercase">
            Life As Game — Admin
          </p>
        </div>

        {/* Content */}
        <div
          className="flex-1 overflow-y-auto p-7"
          style={{
            background:
              "linear-gradient(180deg, rgba(230,234,241,0.04), rgba(215,221,232,0.06))",
          }}
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={selectedMenu}
              initial={MOTION.panelSwap.initial}
              animate={MOTION.panelSwap.animate}
              exit={MOTION.panelSwap.exit}
              transition={MOTION.panelSwap.transition}
              className="h-full"
            >
              <AdminPanel
                title={config.title}
                onAdd={(config as { onAdd?: () => void }).onAdd}
                addLabel={(config as { addLabel?: string }).addLabel}
              >
                {isDataLoading ? (
                  <div className="py-10 text-center text-sm tracking-[0.1em] text-zinc-500">
                    Loading…
                  </div>
                ) : (
                  <AdminTable
                    rows={data}
                    columns={config.columns}
                    onAction={(config as { onAction?: (r: Record<string, unknown>) => void }).onAction}
                    actionLabel={(config as { actionLabel?: string }).actionLabel}
                    actionStyle={(config as { actionStyle?: "red" | "amber" }).actionStyle}
                  />
                )}
              </AdminPanel>
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
      />
    </div>
  );
}
