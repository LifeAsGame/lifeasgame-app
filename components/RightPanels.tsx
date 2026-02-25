"use client";

import { AnimatePresence, motion } from "framer-motion";

import type { MainNavId, PanelStackItem } from "@/lib/nav";
import { MOTION } from "@/lib/motion";
import { UI_CONSTS } from "@/lib/uiConsts";

import PanelCard from "./PanelCard";

type FriendDetailTab = "message" | "profile";

type RightPanelsProps = {
  selectedMain: MainNavId;
  panelStack: PanelStackItem[];
  panelStackKey: string;
  isResetting?: boolean;
  onPanelStackExitComplete?: () => void;
  onPanelItemSelect: (panelIndex: number, itemId: string) => void;
  friendDetailTab: FriendDetailTab;
  onFriendDetailTabChange: (tab: FriendDetailTab) => void;
  friendMessageDraft: string;
  onFriendMessageDraftChange: (value: string) => void;
  profileRecordDraft: string;
  onProfileRecordDraftChange: (value: string) => void;
  savedProfileRecord: string;
  onSaveProfileRecord: () => void;
};

function statusColor(status: "online" | "away" | "offline") {
  if (status === "online") return "rgba(74, 220, 131, 0.95)";
  if (status === "away") return "rgba(247, 194, 84, 0.95)";
  return "rgba(164, 174, 186, 0.95)";
}

function panelFrameStyle() {
  return {
    width: UI_CONSTS.rightPanels.panelWidth,
    minHeight: 160,
    background:
      "linear-gradient(180deg, rgba(231, 236, 243, 0.94), rgba(220, 227, 236, 0.9))",
    border: "1px solid rgba(20, 23, 28, 0.78)",
    boxShadow:
      "inset 0 0 0 1px rgba(255,255,255,0.48), 0 12px 26px rgba(0,0,0,0.22)",
  } as const;
}

function PanelFrame({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="relative overflow-hidden rounded-[2px]" style={panelFrameStyle()}>
      <div className="absolute inset-0 opacity-[0.08] [background-image:linear-gradient(rgba(0,0,0,0.8)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.8)_1px,transparent_1px)] [background-size:22px_22px]" />
      <div
        className="relative z-10 border-b border-zinc-900/70"
        style={{
          paddingInline: UI_CONSTS.rightPanels.panelHeaderPaddingX,
          paddingBlock: UI_CONSTS.rightPanels.panelHeaderPaddingY,
        }}
      >
        <p className="text-xs uppercase tracking-[0.32em] text-zinc-600">Panel</p>
        <h3 className="break-words text-xl font-semibold uppercase tracking-[0.12em] text-zinc-800">
          {title}
        </h3>
      </div>
      <div
        className="scrollbar-hide relative z-10 overflow-y-auto"
        style={{
          maxHeight: "min(62vh, 560px)",
          paddingLeft: UI_CONSTS.rightPanels.panelContentPaddingX,
          paddingRight: UI_CONSTS.rightPanels.panelContentPaddingX,
          paddingTop: UI_CONSTS.rightPanels.panelContentPaddingY,
          paddingBottom:
            UI_CONSTS.rightPanels.panelContentPaddingY +
            UI_CONSTS.rightPanels.panelContentBottomSafePadding,
        }}
      >
        {children}
      </div>
    </div>
  );
}

function PanelContent({
  panel,
  panelIndex,
  onPanelItemSelect,
  friendDetailTab,
  onFriendDetailTabChange,
  friendMessageDraft,
  onFriendMessageDraftChange,
  profileRecordDraft,
  onProfileRecordDraftChange,
  savedProfileRecord,
  onSaveProfileRecord,
}: {
  panel: PanelStackItem;
  panelIndex: number;
  onPanelItemSelect: (panelIndex: number, itemId: string) => void;
  friendDetailTab: FriendDetailTab;
  onFriendDetailTabChange: (tab: FriendDetailTab) => void;
  friendMessageDraft: string;
  onFriendMessageDraftChange: (value: string) => void;
  profileRecordDraft: string;
  onProfileRecordDraftChange: (value: string) => void;
  savedProfileRecord: string;
  onSaveProfileRecord: () => void;
}) {
  return (
    <PanelFrame title={panel.title}>
      {panel.kind === "menu" ? (
        <div style={{ display: "grid", rowGap: UI_CONSTS.rightPanels.rowGap }}>
          {panel.items.map((item, itemIndex) => (
            <PanelCard
              key={item.id}
              label={item.label}
              slotLabel={item.slotLabel}
              selected={panel.selectedId === item.id}
              index={itemIndex}
              onClick={() => onPanelItemSelect(panelIndex, item.id)}
            />
          ))}
        </div>
      ) : null}

      {panel.kind === "friends" ? (
        <div style={{ display: "grid", rowGap: UI_CONSTS.rightPanels.rowGap }}>
          {panel.items.map((friend, itemIndex) => (
            <PanelCard
              key={friend.id}
              label={friend.name}
              slotLabel={friend.name.slice(0, 2).toUpperCase()}
              subtitle={`Lv.${friend.level} · ${friend.status.toUpperCase()}`}
              selected={panel.selectedId === friend.id}
              index={itemIndex}
              onClick={() => onPanelItemSelect(panelIndex, friend.id)}
            />
          ))}
        </div>
      ) : null}

      {panel.kind === "placeholder" ? (
        <div className="space-y-3">
          <div className="rounded-sm border border-zinc-900/25 bg-white/35 px-4 py-3">
            <p className="break-words text-sm tracking-[0.08em] text-zinc-700">
              {panel.description}
            </p>
          </div>
          <div className="space-y-2">
            {(panel.rows ?? []).map((row) => (
              <div
                key={row}
                className="flex min-h-10 items-center gap-3 rounded-sm border border-zinc-900/20 bg-white/30 px-3 py-2"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-zinc-700/70" />
                <span className="break-words text-sm tracking-[0.06em] text-zinc-700">{row}</span>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {panel.kind === "friendDetail" ? (
        <div className="space-y-4">
          <div className="rounded-sm border border-zinc-900/25 bg-white/35 px-4 py-3">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs tracking-[0.18em] text-zinc-600">TARGET</p>
                <p className="break-words text-lg font-semibold tracking-[0.08em] text-zinc-800">
                  {panel.friend.name}
                </p>
              </div>
              <div className="shrink-0 flex items-center gap-2 text-xs tracking-[0.14em] text-zinc-700">
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ background: statusColor(panel.friend.status) }}
                />
                <span>{panel.friend.status.toUpperCase()}</span>
              </div>
            </div>
            <p className="mt-2 break-words text-sm tracking-[0.06em] text-zinc-700/90">
              {panel.friend.note}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {(["message", "profile"] as const).map((tab) => {
              const active = friendDetailTab === tab;
              return (
                <button
                  key={tab}
                  type="button"
                  onClick={() => onFriendDetailTabChange(tab)}
                  className="min-h-10 rounded-sm border px-3 py-2 text-sm font-semibold uppercase tracking-[0.14em] transition-colors duration-200"
                  style={{
                    background: active ? "rgba(244, 194, 77, 0.28)" : "rgba(255,255,255,0.25)",
                    borderColor: active
                      ? "rgba(244, 194, 77, 0.72)"
                      : "rgba(24, 27, 33, 0.28)",
                    color: "rgba(40, 44, 50, 0.92)",
                  }}
                >
                  {tab}
                </button>
              );
            })}
          </div>

          {friendDetailTab === "message" ? (
            <div className="space-y-3">
              <textarea
                value={friendMessageDraft}
                onChange={(event) => onFriendMessageDraftChange(event.target.value)}
                rows={5}
                placeholder="Type a quick message placeholder..."
                className="w-full resize-none rounded-sm border border-zinc-900/25 bg-white/50 px-3 py-2 text-sm text-zinc-800 outline-none placeholder:text-zinc-500 focus:border-amber-500/70"
              />
              <div className="flex items-center justify-between gap-2 text-xs tracking-[0.14em] text-zinc-600">
                <span className="break-words">MESSAGE BOX PLACEHOLDER</span>
                <button
                  type="button"
                  className="shrink-0 rounded-sm border border-zinc-900/30 bg-white/45 px-3 py-1.5 font-semibold text-zinc-800"
                >
                  Send
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="rounded-sm border border-zinc-900/20 bg-white/32 px-3 py-2">
                <p className="text-xs tracking-[0.18em] text-zinc-600">RECORD UI (MVP)</p>
              </div>
              <input
                value={profileRecordDraft}
                onChange={(event) => onProfileRecordDraftChange(event.target.value)}
                type="text"
                placeholder="Enter profile record memo..."
                className="w-full rounded-sm border border-zinc-900/25 bg-white/50 px-3 py-2 text-sm text-zinc-800 outline-none placeholder:text-zinc-500 focus:border-amber-500/70"
              />
              <button
                type="button"
                onClick={onSaveProfileRecord}
                className="min-h-10 w-full rounded-sm border border-amber-500/70 bg-amber-400/25 px-3 py-2 text-sm font-semibold uppercase tracking-[0.12em] text-zinc-800"
              >
                Save Record
              </button>
              <div className="rounded-sm border border-zinc-900/20 bg-white/30 px-3 py-2">
                <p className="text-xs tracking-[0.16em] text-zinc-600">SAVED</p>
                <p className="mt-1 min-h-5 break-words text-sm tracking-[0.05em] text-zinc-800">
                  {savedProfileRecord || "No saved record yet."}
                </p>
              </div>
            </div>
          )}
        </div>
      ) : null}
    </PanelFrame>
  );
}

export default function RightPanels({
  selectedMain,
  panelStack,
  panelStackKey,
  isResetting = false,
  onPanelStackExitComplete,
  onPanelItemSelect,
  friendDetailTab,
  onFriendDetailTabChange,
  friendMessageDraft,
  onFriendMessageDraftChange,
  profileRecordDraft,
  onProfileRecordDraftChange,
  savedProfileRecord,
  onSaveProfileRecord,
}: RightPanelsProps) {
  return (
    <AnimatePresence mode="wait" initial={false} onExitComplete={onPanelStackExitComplete}>
      {panelStack.length > 0 ? (
        <motion.div
          key={panelStackKey}
          initial={MOTION.panelReset.initial}
          animate={MOTION.panelReset.animate}
          exit={MOTION.panelReset.exit}
          transition={MOTION.panelReset.transition}
          className={[
            "relative flex min-w-0 w-fit flex-row flex-nowrap items-start xl:items-center",
            isResetting ? "pointer-events-none" : "",
          ].join(" ")}
          data-main={selectedMain}
          style={{
            minHeight: 420,
            width: "fit-content",
            paddingBottom: UI_CONSTS.rightPanels.stackBottomSafePadding,
            rowGap: UI_CONSTS.rightPanels.panelGap,
            columnGap: UI_CONSTS.rightPanels.panelGap,
            willChange: "transform, opacity",
          }}
        >
          <AnimatePresence initial={false}>
            {panelStack.map((panel, panelIndex) => (
              <motion.div
                key={`panel-slot-${panelIndex}`}
                initial={MOTION.panelSlot.initial}
                animate={MOTION.panelSlot.animate}
                exit={MOTION.panelSlot.exit}
                transition={{
                  ...MOTION.panelSlot.transition,
                  delay: panelIndex * 0.035,
                }}
                style={{ willChange: "transform, opacity" }}
              >
                <AnimatePresence mode="wait" initial={false}>
                  <motion.div
                    key={panel.id}
                    initial={MOTION.panelContentSwap.initial}
                    animate={MOTION.panelContentSwap.animate}
                    exit={MOTION.panelContentSwap.exit}
                    transition={MOTION.panelContentSwap.transition}
                    style={{ willChange: "transform, opacity" }}
                  >
                    <PanelContent
                      panel={panel}
                      panelIndex={panelIndex}
                      onPanelItemSelect={onPanelItemSelect}
                      friendDetailTab={friendDetailTab}
                      onFriendDetailTabChange={onFriendDetailTabChange}
                      friendMessageDraft={friendMessageDraft}
                      onFriendMessageDraftChange={onFriendMessageDraftChange}
                      profileRecordDraft={profileRecordDraft}
                      onProfileRecordDraftChange={onProfileRecordDraftChange}
                      savedProfileRecord={savedProfileRecord}
                      onSaveProfileRecord={onSaveProfileRecord}
                    />
                  </motion.div>
                </AnimatePresence>
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
