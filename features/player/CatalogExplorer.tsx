"use client";

import { useEffect, useMemo, useState } from "react";
import { useMediaQuery } from "@/shared/hooks/useMediaQuery";
import { requestStageFocus } from "@/shared/hooks/useStageCamera";
import PanelCard from "@/shared/ui/PanelCard";
import PanelStage from "@/shared/ui/PanelStage";
import { BackButton, PanelFrame } from "@/widgets/right-panels/ui/PanelFrame";
import { InfoCard } from "@/widgets/right-panels/ui/Rows";
import { categoryLabel, controlStyle, DetailLine, Feedback, Field } from "./PlayerDetail";
import { getCatalogGroupsApi, getCatalogItemApi, getCatalogItemsApi, type CatalogGroup, type CatalogItem, type CatalogPage } from "./catalog";
import type { CategoryKind, PersonalCategory } from "./personalCategories";

export default function CatalogExplorer({ kind, categories, onClose, onRegister, onOwned, registrationError }: {
  kind: CategoryKind;
  categories: PersonalCategory[];
  onClose: () => void;
  onRegister: (itemId: number, form: FormData, personalCategoryId: number | null) => Promise<boolean>;
  onOwned: (item: CatalogItem) => void;
  registrationError?: string | null;
}) {
  const name = kind === "CERTIFICATION" ? "자격증" : "취미";
  const prefix = `player-${kind.toLowerCase()}-catalog`;
  const compact = useMediaQuery("(max-width: 1199px)");
  const [groups, setGroups] = useState<CatalogGroup[]>([]);
  const [groupError, setGroupError] = useState<string | null>(null);
  const [major, setMajor] = useState<string | null>(null);
  const [minor, setMinor] = useState<string | null>(null);
  const [searchText, setSearchText] = useState("");
  const [query, setQuery] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [result, setResult] = useState<CatalogPage | null>(null);
  const [listError, setListError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [detail, setDetail] = useState<CatalogItem | null>(null);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [registering, setRegistering] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [revision, setRevision] = useState(0);
  const majors = useMemo(() => [...new Map(groups.map((group) => [group.majorCode, categoryLabel(group.majorName)])).entries()], [groups]);
  const minors = groups.filter((group) => group.majorCode === major && group.minorCode);
  const showMinor = kind === "CERTIFICATION" && minors.length > 0 && query === null;
  const showList = query !== null || (major !== null && (!showMinor || minor !== null));
  const itemParent = showMinor ? `${prefix}-minor` : `${prefix}-major`;

  useEffect(() => {
    let current = true;
    getCatalogGroupsApi(kind).then((value) => { if (current) { setGroups(value); setGroupError(null); } }, (error) => { if (current) setGroupError(error instanceof Error ? error.message : "카탈로그 분류를 불러오지 못했습니다."); });
    return () => { current = false; };
  }, [kind]);

  useEffect(() => {
    if (!showList) return;
    let current = true;
    setListError(null);
    getCatalogItemsApi(kind, { q: query ?? undefined, majorCode: query === null ? major ?? undefined : undefined, minorCode: query === null ? minor ?? undefined : undefined, page }).then(
      (value) => { if (current) setResult(value); },
      (error) => { if (current) setListError(error instanceof Error ? error.message : "카탈로그를 불러오지 못했습니다."); },
    );
    return () => { current = false; };
  }, [kind, major, minor, page, query, revision, showList]);

  useEffect(() => {
    if (selectedId === null) return;
    let current = true;
    setDetailError(null);
    getCatalogItemApi(kind, selectedId).then(
      (value) => { if (current) setDetail(value); },
      (error) => { if (current) setDetailError(error instanceof Error ? error.message : "상세를 불러오지 못했습니다."); },
    );
    return () => { current = false; };
  }, [kind, selectedId, revision]);

  const chooseMajor = (code: string) => { setMajor(code); setMinor(null); setQuery(null); setPage(0); setResult(null); setSelectedId(null); setRegistering(false); requestStageFocus(kind === "CERTIFICATION" && groups.some((group) => group.majorCode === code && group.minorCode) ? `${prefix}-minor` : `${prefix}-items`, "forward"); };
  const chooseMinor = (code: string) => { setMinor(code); setPage(0); setResult(null); setSelectedId(null); requestStageFocus(`${prefix}-items`, "forward"); };
  const chooseItem = (item: CatalogItem, create = false) => {
    if (create && item.owned) { onOwned(item); return; }
    setSelectedId(item.catalogItemId); setDetail(null); setDetailError(null); setRegistering(create); setSaveError(null);
    requestStageFocus(`${prefix}-detail`, "forward");
  };
  const backDetail = () => { if (registering) setRegistering(false); else { setSelectedId(null); requestStageFocus(`${prefix}-items`, "back"); } setSaveError(null); };

  return <>
    <PanelStage stageKey={`${prefix}-major`} parentStageKey={`player-${kind === "CERTIFICATION" ? "certification" : "hobby"}-categories`} panelRole="list" inactive={compact && (showMinor || showList)}>
      <PanelFrame title={`전체 ${name} 보기`} centerSelected centerTargetKey={major ?? query} backButton={<BackButton label={`${name} 분류로`} onClick={onClose} />}>
        <div className="lag-player-content">
          <form className="lag-player-form" onSubmit={(event) => { event.preventDefault(); const next = searchText.trim(); if (!next) return; setQuery(next); setMajor(null); setMinor(null); setPage(0); setResult(null); setSelectedId(null); requestStageFocus(`${prefix}-items`, "forward"); }}>
            <Field label={`${name} 검색`}><input aria-label={`${name} 검색`} value={searchText} onChange={(event) => setSearchText(event.target.value)} style={controlStyle} /></Field>
            <button type="submit" className="lag-player-button">검색</button>
          </form>
          {query !== null ? <PanelCard label={`검색 결과 · ${query}`} slotLabel="⌕" selected centerTarget onClick={() => requestStageFocus(`${prefix}-items`, "forward")} /> : null}
          {groupError ? <Feedback message={groupError} retry={() => { setGroupError(null); void getCatalogGroupsApi(kind).then(setGroups, (error) => setGroupError(String(error))); }} /> : null}
          {majors.map(([code, label], index) => <PanelCard key={code} label={label || categoryLabel(code)} slotLabel={(label || code).slice(0, 1)} index={index} selected={major === code} centerTarget={major === code} onClick={() => chooseMajor(code)} />)}
          {!groupError && kind === "CERTIFICATION" && !groups.some((group) => group.source === "HRDK") ? <InfoCard>공식 자격증 데이터가 아직 준비되지 않았습니다. 기존 자격증은 별도로 조회할 수 있습니다.</InfoCard> : null}
          {!groupError && kind === "HOBBY" && !majors.length ? <InfoCard>카탈로그 분류가 없습니다.</InfoCard> : null}
          {kind === "CERTIFICATION" ? <p className="text-xs">공식 범위는 한국산업인력공단 국가자격에 한정됩니다. 보유 등록은 본인 기록이며 취득 검증이 아닙니다.</p> : <p className="text-xs">추천 취미는 서비스가 정리한 목록입니다.</p>}
        </div>
      </PanelFrame>
    </PanelStage>
    {showMinor ? <PanelStage stageKey={`${prefix}-minor`} parentStageKey={`${prefix}-major`} panelRole="list" inactive={compact && showList}>
      <PanelFrame title={`${majors.find(([code]) => code === major)?.[1] ?? "공식"} · 소분류`} centerSelected centerTargetKey={minor} backButton={<BackButton label="대분류로" onClick={() => { setMajor(null); setMinor(null); setSelectedId(null); requestStageFocus(`${prefix}-major`, "back"); }} />}>
        <div className="lag-player-content">{minors.map((group, index) => <PanelCard key={group.minorCode} label={categoryLabel(group.minorName ?? group.minorCode ?? "기타")} slotLabel={(group.minorName ?? "기").slice(0, 1)} index={index} selected={minor === group.minorCode} centerTarget={minor === group.minorCode} onClick={() => chooseMinor(group.minorCode!)} />)}</div>
      </PanelFrame>
    </PanelStage> : null}
    {showList ? <PanelStage stageKey={`${prefix}-items`} parentStageKey={itemParent} panelRole="list" inactive={compact && selectedId !== null}>
      <PanelFrame title={query !== null ? `검색 · ${query}` : `${name} 목록`} centerSelected centerTargetKey={selectedId} backButton={<BackButton label={showMinor ? "소분류로" : "대분류로"} onClick={() => { if (query !== null) setQuery(null); else if (showMinor) setMinor(null); else setMajor(null); setSelectedId(null); requestStageFocus(itemParent, "back"); }} />}>
        <div className="lag-player-content">
          {listError ? <Feedback message={listError} retry={() => setRevision((value) => value + 1)} /> : null}
          {!result && !listError ? <InfoCard>카탈로그를 불러오는 중…</InfoCard> : null}
          {result && !result.items.length ? <InfoCard>해당 결과가 없습니다.</InfoCard> : null}
          {result?.items.map((item, index) => <PanelCard key={item.catalogItemId} label={item.name} slotLabel={item.name.slice(0, 1)} subtitle={`${item.issuer ?? item.administeringAgency ?? categoryLabel(item.category)}${item.owned ? " · 내 항목" : ""}`} index={index} selected={selectedId === item.catalogItemId} centerTarget={selectedId === item.catalogItemId} onClick={() => chooseItem(item)} onDoubleClick={() => chooseItem(item, true)} />)}
          {result && result.totalPages > 1 ? <div className="lag-player-actions"><button type="button" disabled={page === 0} onClick={() => setPage((value) => value - 1)}>이전</button><span>{page + 1} / {result.totalPages}</span><button type="button" disabled={page + 1 >= result.totalPages} onClick={() => setPage((value) => value + 1)}>다음</button></div> : null}
        </div>
      </PanelFrame>
    </PanelStage> : null}
    {showList && selectedId !== null ? <PanelStage stageKey={`${prefix}-detail`} parentStageKey={`${prefix}-items`} panelRole="detail">
      <PanelFrame title={registering ? `내 ${name} 등록` : `${name} 상세`} backButton={<BackButton label={registering ? "상세로" : "목록으로"} onClick={backDetail} />}>
        <div className="lag-player-content">
          {detailError ? <Feedback message={detailError} retry={() => setRevision((value) => value + 1)} /> : null}
          {!detail && !detailError ? <InfoCard>상세를 불러오는 중…</InfoCard> : null}
          {detail ? <>
            <h4 onDoubleClick={() => detail.owned ? onOwned(detail) : setRegistering(true)}>{detail.name}</h4>
            {registering ? <form className="lag-player-form" onSubmit={async (event) => {
              event.preventDefault(); if (saving) return;
              setSaving(true); setSaveError(null);
              const form = new FormData(event.currentTarget);
              const categoryId = Number(form.get("personalCategoryId")) || null;
              try {
                if (await onRegister(detail.catalogItemId, form, categoryId)) { setRegistering(false); setRevision((value) => value + 1); }
                else {
                  setSaveError("등록 상태를 확인해 주세요. 입력 내용은 유지됩니다.");
                  try { setDetail(await getCatalogItemApi(kind, detail.catalogItemId)); } catch { /* Keep the form and retry the read later. */ }
                }
              } catch (error) { setSaveError(error instanceof Error ? error.message : "등록하지 못했습니다."); }
              finally { setSaving(false); }
            }}>
              {kind === "CERTIFICATION" ? <><Field label="취득일"><input name="acquiredDate" type="date" min="1000-01-01" style={controlStyle} /></Field><Field label="만료일"><input name="expiresDate" type="date" min="1000-01-01" style={controlStyle} /></Field></> : <><Field label="내 취미 이름" required><input name="customName" required defaultValue={detail.name} style={controlStyle} /></Field><Field label="설명"><textarea name="detail" style={controlStyle} /></Field><Field label="숙련도" required><input name="proficiency" type="number" min="0" max="100" defaultValue="0" required style={controlStyle} /></Field><Field label="상태"><select name="status" defaultValue="ACTIVE" style={controlStyle}><option value="ACTIVE">활동 중</option><option value="PAUSED">일시 중지</option><option value="DROPPED">그만둠</option></select></Field><Field label="시작일"><input name="startedOn" type="date" min="1000-01-01" style={controlStyle} /></Field></>}
              <Field label="내 분류"><select name="personalCategoryId" style={controlStyle}><option value="">연결 안 함</option>{categories.filter((category) => category.source === "PERSONAL").map((category) => <option key={category.id} value={category.id!}>{category.name}</option>)}</select></Field>
              {detail.owned && detail.ownedItemId !== null ? <p role="status">등록된 소유 항목 ID: {detail.ownedItemId}. 분류 연결만 다시 시도할 수 있습니다.</p> : null}
              {registrationError ? <Feedback message={registrationError} /> : saveError ? <Feedback message={saveError} /> : null}
              <button type="submit" className="lag-player-button" disabled={saving}>{saving ? "저장 중…" : `${name} 저장`}</button>
            </form> : <>
              <DetailLine label="분류">{[detail.majorName, detail.minorName].filter((value): value is string => Boolean(value)).map(categoryLabel).join(" › ") || categoryLabel(detail.category)}</DetailLine>
              {detail.issuer ? <DetailLine label="발급기관">{detail.issuer}</DetailLine> : null}
              {detail.administeringAgency ? <DetailLine label="시행처">{detail.administeringAgency}</DetailLine> : null}
              {detail.detail ? <DetailLine label="소개 · 시험 정보">{detail.detail}</DetailLine> : null}
              {detail.detailStatus ? <DetailLine label="정보 상태">{detail.detailStatus}</DetailLine> : null}
              {detail.fetchedAt ? <DetailLine label="갱신일">{detail.fetchedAt}</DetailLine> : null}
              {detail.sourceUrl?.startsWith("https://") ? <a href={detail.sourceUrl} target="_blank" rel="noopener noreferrer">출처 확인</a> : null}
              {detail.owned ? <button type="button" className="lag-player-button" onClick={() => onOwned(detail)}>내 {name} 보기</button> : <button type="button" className="lag-player-button" onClick={() => setRegistering(true)}>내 {name} 등록</button>}
            </>}
          </> : null}
        </div>
      </PanelFrame>
    </PanelStage> : null}
  </>;
}
