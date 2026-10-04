"use client";

import { useState } from "react";
import type { PersonDetail, PersonInput, PersonProfile } from "@/shared/api/types";

const textFields = [
  ["nickname", "별명·호칭", 80], ["gender", "성별", 40], ["occupation", "하는 일·전공", 120],
  ["organization", "학교·소속", 120], ["area", "주 활동 지역", 120], ["mbti", "MBTI", 16],
  ["metContext", "처음 만난 계기", 2000], ["conversationNotes", "최근 대화·다음 이야기", 2000],
] as const;
const tags = [
  ["hobbies", "취미"], ["interests", "관심사"], ["favoriteFoods", "좋아하는 음식"],
  ["avoidedFoods", "피하는 음식"], ["favoriteAnimals", "좋아하는 동물"], ["avoidedAnimals", "피하는 동물"],
  ["favoriteMusic", "좋아하는 음악·아티스트"], ["favoriteMedia", "좋아하는 작품"], ["favoriteActivities", "함께 하기 좋은 활동"],
  ["conversationTopics", "좋아하는 대화 주제"], ["avoidTopics", "피하고 싶은 주제"], ["giftIdeas", "선물 아이디어"],
] as const;
type TagKey = typeof tags[number][0];
const emptyProfile: PersonProfile = {
  nickname: null, gender: null, ageAtReference: null, ageReferenceDate: null,
  occupation: null, organization: null, area: null, mbti: null, contactChannels: [],
  hobbies: [], interests: [], favoriteFoods: [], avoidedFoods: [], favoriteAnimals: [], avoidedAnimals: [],
  favoriteMusic: [], favoriteMedia: [], favoriteActivities: [], conversationTopics: [], avoidTopics: [], giftIdeas: [],
  firstMetOn: null, metContext: null, lastContactOn: null, conversationNotes: null, importantDates: [], customNotes: [],
};
export function personProfile(value?: PersonProfile | null): PersonProfile {
  return { ...emptyProfile, ...value, ...Object.fromEntries(tags.map(([key]) => [key, value?.[key] ?? []])),
    contactChannels: value?.contactChannels ?? [], importantDates: value?.importantDates ?? [], customNotes: value?.customNotes ?? [] };
}
const nullable = (form: FormData, key: string) => String(form.get(key) ?? "").trim() || null;
const today = () => { const date = new Date(); return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`; };

export function PersonProfileForm({ person, pending, error, onSave, onCancel }: {
  person?: PersonDetail; pending: boolean; error: string | null; onSave: (body: PersonInput) => void; onCancel?: () => void;
}) {
  const initial = personProfile(person?.profile);
  const [profile, setProfile] = useState(initial);
  const [age, setAge] = useState(initial.ageAtReference?.toString() ?? "");
  const [ageDate, setAgeDate] = useState(initial.ageReferenceDate ?? "");
  const [validation, setValidation] = useState<string | null>(null);
  const update = <K extends keyof PersonProfile>(key: K, value: PersonProfile[K]) => setProfile((previous) => ({ ...previous, [key]: value }));
  const addTag = (key: TagKey, input: HTMLInputElement) => {
    const value = input.value.trim();
    if (!value || profile[key].includes(value)) { input.value = ""; return; }
    if (value.length > 100 || profile[key].length >= 20) { setValidation("태그는 100자 이내, 항목별 최대 20개입니다."); return; }
    update(key, [...profile[key], value]); input.value = ""; setValidation(null);
  };
  const submit = (event: React.SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const next: PersonProfile = { ...profile };
    for (const [key] of textFields) next[key] = nullable(form, key);
    next.ageAtReference = age ? Number(age) : null;
    next.ageReferenceDate = age ? ageDate || today() : null;
    next.firstMetOn = nullable(form, "firstMetOn"); next.lastContactOn = nullable(form, "lastContactOn");
    for (const [key] of tags) {
      const draft = nullable(form, `tag-${key}`);
      next[key] = [...new Set([...profile[key], ...(draft ? [draft] : [])].map((value) => value.trim()).filter(Boolean))];
      if (next[key].length > 20 || next[key].some((value) => value.length > 100)) { setValidation("태그는 100자 이내, 항목별 최대 20개입니다."); return; }
    }
    if (profile.contactChannels.some((item) => item.label?.trim() && !item.value.trim()) || profile.importantDates.some((item) => Boolean(item.label.trim()) !== Boolean(item.date) || item.repeatYearly && !item.date) || profile.customNotes.some((item) => Boolean(item.label.trim()) !== Boolean(item.value.trim()))) { setValidation("추가 항목의 이름·값 또는 날짜를 함께 입력해주세요."); return; }
    next.contactChannels = profile.contactChannels.map((item) => ({ ...item, label: item.label?.trim() || null, value: item.value.trim() })).filter((item) => item.value);
    next.importantDates = profile.importantDates.map((item) => ({ ...item, label: item.label.trim() })).filter((item) => item.label && item.date);
    next.customNotes = profile.customNotes.map((item) => ({ label: item.label.trim(), value: item.value.trim() })).filter((item) => item.label && item.value);
    if ((age && (!Number.isInteger(next.ageAtReference) || next.ageAtReference! < 0 || next.ageAtReference! > 150)) || (!age && ageDate)) { setValidation("기록 당시 나이와 기준일을 함께 입력해주세요. 나이는 0~150세입니다."); return; }
    if (new TextEncoder().encode(JSON.stringify(Object.fromEntries(Object.entries(next).filter(([, value]) => value !== null)))).length > 65536) { setValidation("인물 추가 정보는 64KiB 이내로 입력해주세요."); return; }
    const displayName = nullable(form, "displayName");
    if (!displayName) { setValidation("인물 이름을 입력해주세요."); return; }
    const birthday = nullable(form, "birthday");
    if (birthday && birthday > today()) { setValidation("생일은 미래 날짜일 수 없습니다."); return; }
    setValidation(null);
    onSave({ displayName, birthday, contact: nullable(form, "contact"), notes: nullable(form, "notes"), profile: next });
  };
  const field = (key: typeof textFields[number][0], label: string, max: number) => <label key={key}>{label}<input className="lag-role-control" name={key} maxLength={max} defaultValue={initial[key] ?? ""} /></label>;
  const tagField = ([key, label]: typeof tags[number]) => <div key={key} className="lag-person-tag-field"><label htmlFor={`tag-${key}`}>{label}</label>
    <div className="lag-person-tags">{profile[key].map((item) => <span key={item}>{item}<button type="button" aria-label={`${label} ${item} 제거`} onClick={() => update(key, profile[key].filter((value) => value !== item))}>×</button></span>)}</div>
    <div className="lag-person-inline"><input id={`tag-${key}`} name={`tag-${key}`} className="lag-role-control" maxLength={100} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); addTag(key, event.currentTarget); } }} /><button type="button" className="lag-role-button" onClick={(event) => addTag(key, event.currentTarget.previousElementSibling as HTMLInputElement)}>추가</button></div>
  </div>;
  return <form className="lag-role-form lag-person-form" onSubmit={submit}>
    <label>인물 이름<input className="lag-role-control" name="displayName" autoFocus required maxLength={80} defaultValue={person?.displayName ?? ""} /></label>
    {textFields.slice(0, 2).map(([key, label, max]) => field(key, label, max))}
    <label>생일<input className="lag-role-control" name="birthday" type="date" min="1000-01-01" max={today()} defaultValue={person?.birthday ?? ""} /></label>
    <label>대표 연락처<input className="lag-role-control" name="contact" maxLength={120} defaultValue={person?.contact ?? ""} /></label>
    <label>인물 메모<textarea className="lag-role-control" name="notes" rows={3} defaultValue={person?.notes ?? ""} /></label>
    <div className="lag-person-inline"><label>기록 당시 만 나이<input className="lag-role-control" type="number" min={0} max={150} value={age} onChange={(event) => { const value = event.target.value; setAge(value); if (value && !ageDate) setAgeDate(today()); }} /></label><label>나이 기준일<input className="lag-role-control" type="date" value={ageDate} onChange={(event) => setAgeDate(event.target.value)} /></label></div>
    {textFields.slice(2, 6).map(([key, label, max]) => field(key, label, max))}
    <details><summary>연락 방법</summary>
      {profile.contactChannels.map((item, index) => <div className="lag-person-repeat" key={index}><select className="lag-role-control" aria-label={`연락 방법 ${index + 1} 종류`} value={item.kind} onChange={(event) => update("contactChannels", profile.contactChannels.map((current, position) => position === index ? { ...current, kind: event.target.value as typeof item.kind } : current))}>{[["PHONE", "전화"], ["EMAIL", "이메일"], ["MESSENGER", "메신저"], ["SOCIAL", "SNS"], ["OTHER", "기타"]].map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select><input className="lag-role-control" aria-label={`연락 방법 ${index + 1} 이름`} placeholder="이름" maxLength={40} value={item.label ?? ""} onChange={(event) => update("contactChannels", profile.contactChannels.map((current, position) => position === index ? { ...current, label: event.target.value } : current))} /><input className="lag-role-control" aria-label={`연락 방법 ${index + 1} 값`} placeholder="연락처" maxLength={200} value={item.value} onChange={(event) => update("contactChannels", profile.contactChannels.map((current, position) => position === index ? { ...current, value: event.target.value } : current))} /><button type="button" className="lag-role-button" onClick={() => update("contactChannels", profile.contactChannels.filter((_, position) => position !== index))}>제거</button></div>)}
      <button type="button" className="lag-role-button" disabled={profile.contactChannels.length >= 10} onClick={() => update("contactChannels", [...profile.contactChannels, { kind: "OTHER", label: "", value: "" }])}>연락 방법 추가</button>
    </details>
    <details><summary>취미와 취향</summary>{tags.slice(0, 9).map(tagField)}</details>
    <details><summary>대화와 기억</summary>{tags.slice(9).map(tagField)}<label>처음 만난 날<input className="lag-role-control" name="firstMetOn" type="date" defaultValue={initial.firstMetOn ?? ""} /></label>{textFields.slice(6).map(([key, label, max]) => field(key, label, max))}<label>최근 연락일<input className="lag-role-control" name="lastContactOn" type="date" defaultValue={initial.lastContactOn ?? ""} /></label></details>
    <details><summary>중요한 날짜·기타</summary>
      {profile.importantDates.map((item, index) => <div className="lag-person-repeat" key={index}><input className="lag-role-control" aria-label={`중요한 날짜 ${index + 1} 이름`} placeholder="날짜 이름" maxLength={80} value={item.label} onChange={(event) => update("importantDates", profile.importantDates.map((current, position) => position === index ? { ...current, label: event.target.value } : current))} /><input className="lag-role-control" aria-label={`중요한 날짜 ${index + 1} 날짜`} type="date" value={item.date} onChange={(event) => update("importantDates", profile.importantDates.map((current, position) => position === index ? { ...current, date: event.target.value } : current))} /><label><input type="checkbox" checked={item.repeatYearly} onChange={(event) => update("importantDates", profile.importantDates.map((current, position) => position === index ? { ...current, repeatYearly: event.target.checked } : current))} />매년 반복</label><button type="button" className="lag-role-button" onClick={() => update("importantDates", profile.importantDates.filter((_, position) => position !== index))}>제거</button></div>)}
      <button type="button" className="lag-role-button" disabled={profile.importantDates.length >= 20} onClick={() => update("importantDates", [...profile.importantDates, { label: "", date: "", repeatYearly: false }])}>중요한 날짜 추가</button>
      {profile.customNotes.map((item, index) => <div className="lag-person-repeat" key={index}><input className="lag-role-control" aria-label={`추가 항목 ${index + 1} 이름`} placeholder="항목 이름" maxLength={80} value={item.label} onChange={(event) => update("customNotes", profile.customNotes.map((current, position) => position === index ? { ...current, label: event.target.value } : current))} /><textarea className="lag-role-control" aria-label={`추가 항목 ${index + 1} 내용`} placeholder="내용" maxLength={1000} value={item.value} onChange={(event) => update("customNotes", profile.customNotes.map((current, position) => position === index ? { ...current, value: event.target.value } : current))} /><button type="button" className="lag-role-button" onClick={() => update("customNotes", profile.customNotes.filter((_, position) => position !== index))}>제거</button></div>)}
      <button type="button" className="lag-role-button" disabled={profile.customNotes.length >= 20} onClick={() => update("customNotes", [...profile.customNotes, { label: "", value: "" }])}>사용자 추가 항목 추가</button>
    </details>
    {validation || error ? <p role="alert">{validation ?? error}</p> : null}
    <div className="lag-role-actions"><button className="lag-role-action" type="submit" disabled={pending}>{pending ? "저장 중…" : "인물 저장"}</button>{onCancel ? <button className="lag-role-button" type="button" onClick={onCancel}>취소</button> : null}</div>
  </form>;
}

export function PersonProfileDetail({ person }: { person: PersonDetail }) {
  const profile = personProfile(person.profile);
  const rows: [string, string | null][] = [
    ["별명·호칭", profile.nickname], ["성별", profile.gender], ["생일", person.birthday],
    ["기록 당시 만 나이", profile.ageAtReference === null ? null : `${profile.ageAtReference}세 · ${profile.ageReferenceDate ?? "기준일 미상"}`],
    ["하는 일·전공", profile.occupation], ["학교·소속", profile.organization], ["주 활동 지역", profile.area], ["MBTI", profile.mbti],
    ["대표 연락처", person.contact], ["인물 메모", person.notes], ["연락 방법", profile.contactChannels.map((item) => `${item.label || item.kind}: ${item.value}`).join(" · ")],
    ...tags.map(([key, label]): [string, string | null] => [label, profile[key].join(" · ")]),
    ["처음 만난 날", profile.firstMetOn], ["처음 만난 계기", profile.metContext], ["최근 연락일", profile.lastContactOn], ["최근 대화·다음 이야기", profile.conversationNotes],
    ["중요한 날짜", profile.importantDates.map((item) => `${item.label}: ${item.date}${item.repeatYearly ? " (매년)" : ""}`).join(" · ")],
    ["추가 항목", profile.customNotes.map((item) => `${item.label}: ${item.value}`).join(" · ")],
  ];
  if (person.birthday) {
    const birth = new Date(`${person.birthday}T00:00:00`), now = new Date();
    let years = now.getFullYear() - birth.getFullYear();
    if (now.getMonth() < birth.getMonth() || (now.getMonth() === birth.getMonth() && now.getDate() < birth.getDate())) years--;
    if (years >= 0) rows.splice(3, 0, ["현재 만 나이", `${years}세`]);
  }
  return <article className="lag-role-detail lag-person-detail"><h4>{person.displayName}</h4><p>{person.status === "ARCHIVED" ? "보관된 인물" : "사용 중인 인물"}</p><dl>{rows.filter(([, value]) => value).map(([label, value]) => <div key={label} className="lag-role-data-row"><dt>{label}</dt><dd>{value}</dd></div>)}</dl></article>;
}
