"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { RecordRow, SwipeButton } from "@/features/role/RecordRow";
import { consumerLabel } from "@/shared/lib/consumerLabels";
import { useMediaQuery } from "@/shared/hooks/useMediaQuery";
import { requestStageFocus } from "@/shared/hooks/useStageCamera";
import PanelStage from "@/shared/ui/PanelStage";
import { useSaoConfirm } from "@/shared/ui/useSaoConfirm";
import { BackButton, PanelFrame } from "@/widgets/right-panels/ui/PanelFrame";
import { InfoCard } from "@/widgets/right-panels/ui/Rows";
import {
  addSystemLifeLogCategory, createPersonalLifeLogCategory, deletePersonalLifeLogCategory,
  getMyLifeLogCategories, getSystemLifeLogCategories, hideSystemLifeLogCategory,
  renamePersonalLifeLogCategory, type LifeLogFolder, type LifeLogKind,
  type SystemLifeLogCategory,
} from "./personalCategories";

export type FolderChoice =
  | { type: "system"; code: string; name: string }
  | { type: "personal"; id: number; name: string }
  | { type: "all" }
  | { type: "unclassified" };

export const folderKey = (choice: FolderChoice | null) => choice?.type === "system" ? `system:${choice.code}` : choice?.type === "personal" ? `personal:${choice.id}` : choice?.type ?? null;

export default function LifeLogFolders({ kind, title, stageKey, selected, onSelect, onCreateRecord, createRequest = 0, onBack, onCloseChildren }: {
  kind: LifeLogKind;
  title: string;
  stageKey: string;
  selected: FolderChoice | null;
  onSelect: (choice: FolderChoice) => void;
  onCreateRecord: (choice: FolderChoice) => void;
  createRequest?: number;
  onBack?: () => void;
  onCloseChildren?: () => void;
}) {
  const compact = useMediaQuery("(max-width: 1199px)");
  const { confirm, dialog } = useSaoConfirm();
  const [mine, setMine] = useState<LifeLogFolder[]>([]);
  const [system, setSystem] = useState<SystemLifeLogCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [mode, setMode] = useState<"create" | "rename" | null>(null);
  const [editing, setEditing] = useState<LifeLogFolder | null>(null);
  const [name, setName] = useState("");
  const [allOpen, setAllOpen] = useState(false);
  const [publicChoice, setPublicChoice] = useState<SystemLifeLogCategory | null>(null);
  const loadId = useRef(0);
  const load = useCallback(async () => {
    const id = ++loadId.current;
    setLoading(true);
    try {
      const [myRows, systemRows] = await Promise.all([getMyLifeLogCategories(kind), getSystemLifeLogCategories(kind)]);
      if (id !== loadId.current) return false;
      setMine(myRows); setSystem(systemRows); setError(null); return true;
    } catch (caught) { if (id === loadId.current) setError(caught instanceof Error ? caught.message : "분류를 불러오지 못했습니다."); return false; }
    finally { if (id === loadId.current) setLoading(false); }
  }, [kind]);
  useEffect(() => { const counter = loadId; void load(); return () => { counter.current++; }; }, [load]);
  useEffect(() => { if (createRequest > 0) { setAllOpen(false); setMode("create"); setName(""); } }, [createRequest]);
  const run = async (operation: () => Promise<unknown>) => {
    if (pending) return false;
    setPending(true); setError(null);
    try {
      await operation();
      if (!await load()) setError("분류 변경은 저장됐지만 목록을 다시 불러오지 못했습니다. 다시 조회해 주세요.");
      return true;
    }
    catch (caught) { setError(caught instanceof Error ? caught.message : "분류를 변경하지 못했습니다."); return false; }
    finally { setPending(false); }
  };
  const openFolder = (choice: FolderChoice, create = false) => {
    setAllOpen(false); setPublicChoice(null); setMode(null);
    if (create) onCreateRecord(choice); else onSelect(choice);
    requestStageFocus(`${stageKey.replace(/-categories$/, "")}-list`, "forward");
  };
  const remove = async (folder: LifeLogFolder) => {
    const message = folder.source === "PERSONAL"
      ? `“${folder.name}” 내 분류를 삭제할까요? 기록은 삭제되지 않고 전체 기록/미분류에서 계속 볼 수 있습니다.`
      : `“${consumerLabel(folder.name)}”을 내 분류에서 숨길까요? 기록은 삭제되지 않고 전체 기록에서 계속 볼 수 있습니다.`;
    if (!await confirm(message)) return;
    const saved = await run(() => folder.source === "PERSONAL"
      ? deletePersonalLifeLogCategory(folder.id)
      : hideSystemLifeLogCategory(kind, folder.systemCode!));
    if (saved && selected && folderKey(selected) === (folder.source === "PERSONAL" ? `personal:${folder.id}` : `system:${folder.systemCode}`)) onSelect({ type: "all" });
  };
  const submit = async (event: React.SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    const saved = await run(() => mode === "rename" && editing ? renamePersonalLifeLogCategory(editing.id, trimmed) : createPersonalLifeLogCategory(kind, trimmed));
    if (saved) { setMode(null); setEditing(null); setName(""); }
  };
  const selectedKey = folderKey(selected);
  return <>{dialog}
    <PanelStage stageKey={stageKey} parentStageKey="lifelog-stage-0" panelRole="list" inactive={compact && (selected !== null || allOpen) && mode === null}>
      <PanelFrame title={mode === "create" ? "개인 분류 만들기" : mode === "rename" ? "개인 분류 수정" : `${title} · 내 분류`} depth={1} centerSelected={mode === null} centerTargetKey={selectedKey} centerBehavior="spring" backButton={mode ? <BackButton label="내 분류로" onClick={() => setMode(null)} /> : onBack ? <BackButton label="생활 기록 목록으로" onClick={onBack} /> : undefined}>
        {mode ? <form className="lag-role-form lag-lifelog-form" onSubmit={submit}>
          <label>분류 이름<input className="lag-role-control" aria-label="분류 이름" required maxLength={80} value={name} onChange={(event) => setName(event.target.value)} /></label>
          {error ? <p role="alert">{error}</p> : null}
          <button type="submit" className="lag-role-action" disabled={pending}>{pending ? "저장 중…" : "분류 저장"}</button>
        </form> : <div className="lag-role-node-list lag-lifelog-categories">
          {loading ? <InfoCard>내 분류를 불러오는 중…</InfoCard> : null}
          {error ? <p role="alert">{error} <button type="button" className="lag-role-button" onClick={() => void load()}>다시 조회</button></p> : null}
          {!loading && !error && mine.length === 0 ? <InfoCard>내 분류가 없습니다. 전체 분류 보기에서 추가하거나 개인 분류를 만드세요.</InfoCard> : null}
          {mine.map((folder) => {
            const choice: FolderChoice = folder.source === "PERSONAL" ? { type: "personal", id: folder.id, name: folder.name } : { type: "system", code: folder.systemCode!, name: folder.name };
            return folder.source === "PERSONAL"
              ? <RecordRow key={folder.id} title={folder.name} subtitle="개인 분류" selected={selectedKey === folderKey(choice)} disabled={pending} onSelect={() => openFolder(choice)} onCreate={() => openFolder(choice, true)} onEdit={() => { onCloseChildren?.(); setAllOpen(false); setPublicChoice(null); setEditing(folder); setName(folder.name); setMode("rename"); }} onArchive={() => void remove(folder)} archiveLabel="삭제" />
              : <div key={folder.id} className="lag-role-form"><SwipeButton className="lag-role-node" creation aria-pressed={selectedKey === folderKey(choice)} onClick={() => openFolder(choice)} onDoubleClick={() => openFolder(choice, true)}><span className="lag-role-node-mark" aria-hidden>{consumerLabel(folder.name).slice(0, 1)}</span><span><strong>{consumerLabel(folder.name)}</strong></span></SwipeButton><button type="button" className="lag-role-button" disabled={pending} onClick={() => void remove(folder)}>내 분류에서 숨김</button></div>;
          })}
          <SwipeButton className="lag-role-node" aria-pressed={selectedKey === "all"} onClick={() => openFolder({ type: "all" })}><span className="lag-role-node-mark" aria-hidden>전</span><span><strong>전체 기록</strong></span></SwipeButton>
          <SwipeButton className="lag-role-node" aria-pressed={selectedKey === "unclassified"} onClick={() => openFolder({ type: "unclassified" })}><span className="lag-role-node-mark" aria-hidden>미</span><span><strong>미분류 기록</strong></span></SwipeButton>
          <button type="button" className="lag-role-button" onClick={() => { onCloseChildren?.(); setAllOpen(false); setPublicChoice(null); setName(""); setMode("create"); }}>개인 분류 만들기</button>
          <SwipeButton className="lag-role-node" aria-pressed={allOpen} onClick={() => { onCloseChildren?.(); setAllOpen(true); setPublicChoice(null); requestStageFocus(`${stageKey}-all`, "forward"); }}><span className="lag-role-node-mark" aria-hidden>분</span><span><strong>전체 분류 보기</strong></span></SwipeButton>
        </div>}
      </PanelFrame>
    </PanelStage>
    {allOpen ? <PanelStage stageKey={`${stageKey}-all`} parentStageKey={stageKey} panelRole="list" inactive={compact && publicChoice !== null}>
      <PanelFrame title="전체 분류 보기" depth={1} centerSelected centerTargetKey={publicChoice?.code} backButton={<BackButton label="내 분류로" onClick={() => { setAllOpen(false); setPublicChoice(null); requestStageFocus(stageKey, "back"); }} />}>
        <div className="lag-role-node-list lag-lifelog-categories">{system.map((row) => <SwipeButton key={row.code} className="lag-role-node" aria-pressed={publicChoice?.code === row.code} onClick={() => { setPublicChoice(row); requestStageFocus(`${stageKey}-all-detail`, "forward"); }}><span className="lag-role-node-mark" aria-hidden>{consumerLabel(row.name).slice(0, 1)}</span><span><strong>{consumerLabel(row.name)}</strong></span></SwipeButton>)}</div>
      </PanelFrame>
    </PanelStage> : null}
    {allOpen && publicChoice ? <PanelStage stageKey={`${stageKey}-all-detail`} parentStageKey={`${stageKey}-all`} panelRole="detail">
      <PanelFrame title={consumerLabel(publicChoice.name)} backButton={<BackButton label="전체 분류로" onClick={() => setPublicChoice(null)} />}>
        <div className="lag-role-form"><p>공용 {title} 분류</p><button type="button" className="lag-role-action" disabled={pending} onClick={async () => {
          const existing = mine.find((row) => row.source === "SYSTEM" && row.systemCode === publicChoice.code);
          if (!existing && !await run(() => addSystemLifeLogCategory(kind, publicChoice.code))) return;
          openFolder({ type: "system", code: publicChoice.code, name: publicChoice.name });
        }}>{mine.some((row) => row.source === "SYSTEM" && row.systemCode === publicChoice.code) ? "내 분류로 이동" : "내 분류에 추가"}</button></div>
      </PanelFrame>
    </PanelStage> : null}
  </>;
}
