import type { FormFieldSpec } from "@/entities/nav";

export const SYSTEM_OPTIONS_FORM_FIELDS: FormFieldSpec[] = [
  {
    key: "volume",
    label: "전체 음량",
    type: "number",
    placeholder: "0 ~ 100",
  },
  {
    key: "graphicsQuality",
    label: "그래픽 품질",
    type: "select",
    options: [
      { value: "LOW",    label: "낮음" },
      { value: "MEDIUM", label: "보통" },
      { value: "HIGH",   label: "높음" },
      { value: "ULTRA",  label: "최고" },
    ],
  },
  {
    key: "voiceChat",
    label: "음성 채팅",
    type: "select",
    options: [
      { value: "OFF",       label: "끔" },
      { value: "TEAM_ONLY", label: "팀만" },
      { value: "ALL",       label: "모두" },
    ],
  },
  {
    key: "uiScale",
    label: "화면 크기 (%)",
    type: "select",
    options: [75, 100, 125, 150].map((value) => ({ value: String(value), label: `${value}%` })),
  },
  {
    key: "inputPreset",
    label: "조작 방식",
    type: "select",
    options: [
      { value: "STANDARD", label: "기본" },
      { value: "ADVANCED", label: "고급" },
      { value: "CUSTOM",   label: "사용자 지정" },
    ],
  },
  {
    key: "showDamageNumbers",
    label: "피해량 숫자",
    type: "select",
    options: [
      { value: "true",  label: "켬" },
      { value: "false", label: "끔" },
    ],
  },
  {
    key: "showParticles",
    label: "파티클 효과",
    type: "select",
    options: [
      { value: "true",  label: "켬" },
      { value: "false", label: "끔" },
    ],
  },
  {
    key: "showOnlineStatus",
    label: "온라인 상태 표시",
    type: "select",
    options: [
      { value: "true",  label: "켬" },
      { value: "false", label: "끔" },
    ],
  },
  {
    key: "notifications",
    label: "게임 알림",
    type: "select",
    options: [
      { value: "true",  label: "켬" },
      { value: "false", label: "끔" },
    ],
  },
  {
    key: "emailAlerts",
    label: "이메일 알림",
    type: "select",
    options: [
      { value: "true",  label: "켬" },
      { value: "false", label: "끔" },
    ],
  },
  {
    key: "language",
    label: "언어",
    type: "select",
    options: [
      { value: "ko", label: "한국어" },
      { value: "en", label: "English" },
      { value: "ja", label: "日本語" },
    ],
  },
];
