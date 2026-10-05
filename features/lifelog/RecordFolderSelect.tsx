"use client";

import { useEffect, useState } from "react";
import { consumerLabel } from "@/shared/lib/consumerLabels";
import { assignLifeLogRecordCategory, getMyLifeLogCategories, type LifeLogFolder, type LifeLogKind } from "./personalCategories";

export default function RecordFolderSelect({ kind, recordId, categoryId, onSaved }: {
  kind: LifeLogKind;
  recordId: number;
  categoryId: number | null | undefined;
  onSaved: () => Promise<boolean> | boolean;
}) {
  const [folders, setFolders] = useState<LifeLogFolder[]>([]);
  const [value, setValue] = useState<number | null>(categoryId ?? null);
  const [committed, setCommitted] = useState<number | null>(categoryId ?? null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { let active = true; void getMyLifeLogCategories(kind).then((rows) => { if (active) setFolders(rows); }, (caught) => { if (active) setError(caught instanceof Error ? caught.message : "분류를 불러오지 못했습니다."); }); return () => { active = false; }; }, [kind]);
  useEffect(() => { setValue(categoryId ?? null); setCommitted(categoryId ?? null); }, [categoryId, recordId]);
  const save = async () => {
    if (pending) return;
    setPending(true); setError(null);
    try {
      await assignLifeLogRecordCategory(kind, recordId, value);
      setCommitted(value);
      try {
        if (await onSaved() === false) setError("분류 연결은 저장됐지만 기록을 다시 불러오지 못했습니다. 목록에서 다시 조회해 주세요.");
      } catch { setError("분류 연결은 저장됐지만 기록을 다시 불러오지 못했습니다. 목록에서 다시 조회해 주세요."); }
    } catch (caught) { setError(caught instanceof Error ? caught.message : "분류 연결에 실패했습니다. 저장된 기록은 유지됩니다. 다시 시도해 주세요."); }
    finally { setPending(false); }
  };
  return <div className="lag-role-form lag-lifelog-form">
    <label>내 분류<select className="lag-role-control" aria-label="기록의 내 분류" value={value ?? ""} disabled={pending} onChange={(event) => setValue(event.target.value ? Number(event.target.value) : null)}>
      <option value="">연결 안 함</option>{folders.map((folder) => <option key={folder.id} value={folder.id}>{consumerLabel(folder.name)}</option>)}
    </select></label>
    {error ? <p role="alert">{error}</p> : null}
    <button type="button" className="lag-role-button" disabled={pending || committed === value} onClick={() => void save()}>{pending ? "연결 중…" : "내 분류 변경"}</button>
  </div>;
}
