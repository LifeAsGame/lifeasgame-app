import type { FormFieldSpec } from "@/entities/nav";

export const PARTY_FORM_FIELDS: FormFieldSpec[] = [
  { key: "name",        label: "Party Name",   type: "text",     placeholder: "e.g. Frontline Assault", required: true },
  { key: "description", label: "Description",  type: "textarea", placeholder: "Party description..." },
  { key: "maxMembers",  label: "Max Members",  type: "number",   placeholder: "6", required: true },
  { key: "joinPolicy",  label: "Join Policy",  type: "select",   required: true, options: [
    { value: "OPEN",         label: "Open" },
    { value: "APPROVAL",     label: "Application" },
    { value: "INVITE_ONLY",  label: "Invite Only" },
  ]},
  { key: "tags", label: "Tags (comma-separated)", type: "text", placeholder: "PvE, Boss, Exploration" },
];

export const GUILD_FORM_FIELDS: FormFieldSpec[] = [
  { key: "name",        label: "Guild Name",   type: "text",     placeholder: "e.g. Knights of Aincrad", required: true },
  { key: "description", label: "Description",  type: "textarea", placeholder: "Guild description..." },
  { key: "maxMembers",  label: "Max Members",  type: "number",   placeholder: "50", required: true },
  { key: "joinPolicy",  label: "Join Policy",  type: "select",   required: true, options: [
    { value: "OPEN",         label: "Open" },
    { value: "APPROVAL",     label: "Application" },
    { value: "INVITE_ONLY",  label: "Invite Only" },
  ]},
  { key: "tags", label: "Tags (comma-separated)", type: "text", placeholder: "PvE, Boss, Crafting" },
];
