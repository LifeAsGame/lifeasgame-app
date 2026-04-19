"use client";

import { useState } from "react";
import { GOLD_BTN_STYLE, INPUT_STYLE_DARK as INPUT_STYLE } from "@/shared/design/tokens";
import type { PanelStackItem } from "@/entities/nav";
import { UI_CONSTS } from "@/shared/lib/uiConsts";
import { PanelFrame, BackButton } from "./PanelFrame";
import { D } from "./styles";

export type MockMessage = { id: string; sender: "me" | "them"; text: string; time: string };

export function MessagePanel({
  panel,
  panelIndex,
  onBack,
  initialMessages,
  depth,
}: {
  panel: Extract<PanelStackItem, { kind: "message" }>;
  panelIndex: number;
  onBack: (panelIndex: number) => void;
  initialMessages: MockMessage[];
  depth?: number;
}) {
  const [messages, setMessages] = useState<MockMessage[]>(initialMessages);
  const [input, setInput] = useState("");

  const send = () => {
    if (!input.trim()) return;
    setMessages((prev) => [
      ...prev,
      {
        id: `msg-${Date.now()}`,
        sender: "me",
        text: input.trim(),
        time: new Date().toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" }),
      },
    ]);
    setInput("");
  };

  return (
    <PanelFrame
      title={panel.title}
      resetScrollKey={panel.id}
      backButton={<BackButton onClick={() => onBack(panelIndex)} />}
      depth={depth}
    >
      <div className="flex flex-col gap-3" style={{ paddingInline: UI_CONSTS.rightPanels.panelContentPaddingX }}>
        <div className="space-y-2">
          {messages.map((msg) => (
            <div key={msg.id} className={`flex items-start gap-2 ${msg.sender === "me" ? "flex-row-reverse" : ""}`}>
              <div
                className="rounded-sm px-3 py-2"
                style={{
                  background: msg.sender === "me" ? `rgba(248,197,78,0.18)` : `rgba(255,255,255,0.08)`,
                  border: `1px solid ${msg.sender === "me" ? "rgba(248,197,78,0.45)" : "rgba(255,255,255,0.1)"}`,
                  maxWidth: "82%",
                }}
              >
                <p className="break-words text-sm" style={{ letterSpacing: "0.06em", color: D.text }}>{msg.text}</p>
                <p className="mt-0.5" style={{ fontSize: "10px", color: D.textSub }}>{msg.time}</p>
              </div>
            </div>
          ))}
          {messages.length === 0 ? (
            <p className="text-center text-xs" style={{ color: D.textSub }}>대화 내역이 없습니다.</p>
          ) : null}
        </div>
        <div className="flex gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
            placeholder="메시지 입력..."
            rows={2}
            style={{ ...INPUT_STYLE, resize: "none", flex: 1 }}
          />
          <button
            type="button"
            className="rounded-sm transition-opacity hover:opacity-85"
            style={{ ...GOLD_BTN_STYLE, padding: "6px 12px", fontSize: "0.7rem" }}
            onClick={send}
          >
            전송
          </button>
        </div>
      </div>
    </PanelFrame>
  );
}
