const labels: Record<string, string> = {
  IN_PROGRESS: "진행 중", GOAL_REACHED: "목표 도달", COMPLETED: "완료", CANCELED: "취소됨",
  CURRENT: "현재 단계", NOT_SELECTED: "선택 안 함", LOCKED: "잠김", AVAILABLE: "시작 가능", READY_TO_ADVANCE: "전진 가능",
  PENDING: "대기 중", SUCCEEDED: "성공", FAILED: "실패", PARTIAL_FAILED: "일부 실패", NOT_ELIGIBLE: "지급 대상 아님",
  AUTO: "자동 완료", USER_CONFIRM: "직접 확인", MANUAL_CHECK: "직접 확인", COUNT: "횟수", BOOLEAN: "달성 여부",
  ONCE: "한 번", DAILY: "매일", WEEKLY: "매주", MONTHLY: "매월", NONE: "없음",
  GROWTH: "성장", RECOVERY: "회복", MINUTES: "분", QUEST_COMPLETION_SET: "연결 퀘스트 완료", RECORD: "기록", RECORD_CREATED: "기록 작성", LIFELOG_CREATED: "생활 기록 작성", REFLECTION: "회고", QUICK_NOTE: "짧은 메모",
  WEEKLY_LOOKBACK: "주간 회고", COLLECTION: "수집 기록", EXERCISE: "운동 기록", MEDIA: "감상 기록",
  QUICK: "간편 기록", FULL: "전체 기록", QUEST: "퀘스트", QUEST_COMPLETION: "퀘스트 완료", EXP: "경험치", ITEM: "아이템",
  REQUIRED: "필수", OPTIONAL: "선택", ALL: "모두", ANY: "하나 이상", ACCEPTED: "수락됨", ACTIVE: "활성",
  BOOK: "도서", OTHER: "기타", RUNNING: "달리기", WALKING: "걷기", MOVIE: "영화", DRAMA: "드라마", ANIME: "애니메이션",
  TODO: "예정", DOING: "진행 중", DONE: "완료", DROPPED: "중단", PAUSED: "잠시 중단",
};

/** Translate known display values without changing the API value or hiding unknown codes. */
export function consumerLabel(value: string | null | undefined) {
  return value == null ? "정보 없음" : labels[value] ?? value;
}
