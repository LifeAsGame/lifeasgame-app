import type { FormFieldSpec } from "@/entities/nav";

export const HOBBY_FORM_FIELDS: FormFieldSpec[] = [
  { key: "customName",  label: "Display Name", type: "text",   placeholder: "e.g. Full-Stack Dev", required: true },
  { key: "category",    label: "Category",     type: "select", required: true, options: [
    { value: "Tech",          label: "Tech" },
    { value: "Learning",      label: "Learning" },
    { value: "Entertainment", label: "Entertainment" },
    { value: "Fitness",       label: "Fitness" },
    { value: "Art",           label: "Art" },
    { value: "Music",         label: "Music" },
    { value: "Wellness",      label: "Wellness" },
    { value: "Other",         label: "Other" },
  ]},
  { key: "detail",      label: "Detail",       type: "textarea", placeholder: "What exactly do you do?" },
  { key: "proficiency", label: "Proficiency (0–100)", type: "number", placeholder: "50" },
  { key: "status",      label: "Status",       type: "select", required: true, options: [
    { value: "ACTIVE",   label: "Active" },
    { value: "ON_HOLD",  label: "On Hold" },
    { value: "INACTIVE", label: "Inactive" },
  ]},
  { key: "startedOn",   label: "Started Date", type: "date" },
];

export const FRIEND_MEMO_FORM_FIELDS: FormFieldSpec[] = [
  { key: "hobbies",   label: "취미",           type: "text",     placeholder: "예: 달리기, 독서, 게임" },
  { key: "favorites", label: "좋아하는 것",    type: "text",     placeholder: "예: 라멘, 애니, 고양이" },
  { key: "birthday",  label: "생일",           type: "date" },
  { key: "closeness", label: "친한 정도",      type: "select", options: [
    { value: "지인",       label: "지인" },
    { value: "친구",       label: "친구" },
    { value: "절친",       label: "절친" },
    { value: "소울메이트", label: "소울메이트" },
  ]},
  { key: "firstMet",  label: "처음 만난 날",  type: "date" },
  { key: "note",      label: "한 줄 메모",     type: "textarea", placeholder: "친구에 대한 메모..." },
];
