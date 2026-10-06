export type ActivatedContentEntry = {
  kind: "ACHIEVEMENT" | "TITLE";
  code: string;
  definitionId: number;
  name: string;
  definitionVersion: number;
  condition: string;
  status: "ACQUIRED" | "UNACQUIRED";
  evidenceStatus: "CONFIRMED" | "ADMIN_OR_LEGACY" | "REVOKED" | "NONE";
  acquiredAt: string | null;
  sourceOccurredAt: string | null;
};

export type ActivatedContentPage = { entries: ActivatedContentEntry[]; page: number; size: number; hasNext: boolean };

export function evidenceLabel(value: ActivatedContentEntry["evidenceStatus"]): string {
  switch (value) {
    case "CONFIRMED": return "서버 획득 조건 확인";
    case "ADMIN_OR_LEGACY": return "기존 보유 기록";
    case "REVOKED": return "이전 지급 기록이 철회됨";
    default: return "획득 근거 없음";
  }
}

export const ACHIEVEMENT_CONDITIONS: Record<string, { description: string; condition: string; action: string; destination: ["lifelog" | "quests" | "inventory", string] }> = {
  ACH_FIRST_LIFELOG: { description: "첫 생활 기록을 남긴 이정표입니다.", condition: "완성된 생활 기록을 처음 저장하면 획득합니다. 퀘스트 수락은 필요하지 않습니다.", action: "첫 기록 남기기", destination: ["lifelog", "journal"] },
  ACH_FIRST_QUEST_COMPLETE: { description: "첫 퀘스트를 완료한 이정표입니다.", condition: "수락한 퀘스트를 서버에서 처음 완료 처리하면 획득합니다. 목표 달성이나 보상 정산만으로는 획득하지 않습니다.", action: "진행 퀘스트 보기", destination: ["quests", "current"] },
  ACH_FIRST_ITEM_CLAIM: { description: "수신함의 아이템을 처음 받은 이정표입니다.", condition: "수신함의 아이템을 처음 수령해 소지품으로 옮기면 획득합니다. 우편 도착만으로는 획득하지 않습니다.", action: "수신함 보기", destination: ["inventory", "inbox"] },
  ACH_ROUTE_RECORD_START: { description: "기록 여정을 끝까지 진행한 이정표입니다.", condition: "기록 여정의 마지막 퀘스트 완료 후, 마지막 단계에서 ‘다음 단계로’를 눌러 경로를 완주하면 획득합니다.", action: "경로 보기", destination: ["quests", "routes"] },
  ACH_ROUTE_BACKEND_START: { description: "백엔드 개발자 여정을 끝까지 진행한 이정표입니다.", condition: "백엔드 개발자 여정의 마지막 퀘스트 완료 후, 마지막 단계에서 ‘다음 단계로’를 눌러 경로를 완주하면 획득합니다.", action: "경로 보기", destination: ["quests", "routes"] },
};

export const TITLE_CONDITIONS: Record<string, { description: string; condition: string; action: string; destination: ["lifelog" | "quests", string] }> = {
  TITLE_CANDIDATE_RECORD_BEGINNER: { description: "첫 기록을 남긴 플레이어의 칭호입니다.", condition: "첫 기록 업적을 서버에서 획득하면 칭호를 보유합니다. 대표 칭호는 직접 선택합니다.", action: "기록 남기기", destination: ["lifelog", "journal"] },
  TITLE_BACKEND_GUIDE: { description: "백엔드 개발자 여정을 완주한 플레이어의 칭호입니다.", condition: "백엔드 개발자 여정을 마지막 단계까지 진행해 완주 업적을 획득하면 칭호를 보유합니다. 대표 칭호는 직접 선택합니다.", action: "경로 보기", destination: ["quests", "routes"] },
};

export function readableDate(value: string | null | undefined): string {
  if (!value) return "제공되지 않음";
  const date = new Date(value);
  return Number.isNaN(date.valueOf()) ? "제공되지 않음" : new Intl.DateTimeFormat("ko-KR", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Seoul" }).format(date);
}
