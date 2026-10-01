import type { ReactNode } from "react";
import { SEMANTIC_CONTROL_STYLE } from "@/shared/design/tokens";

export function DetailLine({ label, children }: { label: string; children: ReactNode }) {
  return <dl className="lag-player-detail-line"><dt>{label}</dt><dd>{children ?? "미등록"}</dd></dl>;
}

export function Field({ label, children, required = false }: { label: string; children: ReactNode; required?: boolean }) {
  return <label className="lag-player-field"><span data-required={required || undefined}>{label}</span>{children}</label>;
}

export function Feedback({ message, retry }: { message: string; retry?: () => void }) {
  return <div className="lag-player-feedback" role="alert"><span>{message}</span>{retry ? <button type="button" className="lag-player-button" onClick={retry}>다시 시도</button> : null}</div>;
}

export const controlStyle = { ...SEMANTIC_CONTROL_STYLE, minHeight: 44, fontSize: 16 };

const categories: Record<string, string> = {
  PROGRAMMING: "프로그래밍", CLOUD: "클라우드", DATABASE: "데이터베이스", SECURITY: "보안", DATA: "데이터", NETWORK: "네트워크", LANGUAGE: "언어", MANAGEMENT: "경영", FINANCE: "금융", DESIGN: "디자인", OTHER: "기타",
  STORY: "이야기", COMBAT: "전투", EXPLORATION: "탐험", COLLECTION: "수집", SOCIAL: "교류", ECONOMY: "경제", SKILL: "기술", DAILY: "일일", ACHIEVEMENT: "업적", EVENT: "이벤트", QUEST: "퀘스트", RANKED: "순위", SPECIAL: "특별",
  FITNESS: "운동", SPORTS: "스포츠", OUTDOORS: "야외 활동", MUSIC: "음악", ARTS: "미술", CRAFTS: "공예", GAMING: "게임", BOARD_GAMES: "보드게임", TECH: "기술", COOKING: "요리", BAKING: "제과", PHOTOGRAPHY: "사진", READING: "독서", WRITING: "글쓰기", TRAVEL: "여행", WELLNESS: "건강", VOLUNTEERING: "봉사",
};
export function categoryLabel(value: string) { return categories[value.toUpperCase()] ?? value; }
