import type { FormFieldSpec } from "@/entities/nav";

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
