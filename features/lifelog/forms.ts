import type { FormFieldSpec } from "@/entities/nav";

export const MEDIA_FORM_FIELDS: FormFieldSpec[] = [
  { key: "type",          label: "Type",    type: "select", required: true, options: [
    { value: "ANIME",  label: "Anime" },  { value: "BOOK",   label: "Book" },
    { value: "MOVIE",  label: "Movie" },  { value: "GAME",   label: "Game" },
    { value: "SERIES", label: "Series" },
  ]},
  { key: "title",         label: "Title",          type: "text",   placeholder: "e.g. Sword Art Online", required: true },
  { key: "status",        label: "Status",          type: "select", required: true, options: [
    { value: "PLANNING",  label: "Planning" },
    { value: "WATCHING",  label: "Watching/Reading" },
    { value: "COMPLETED", label: "Completed" },
    { value: "DROPPED",   label: "Dropped" },
  ]},
  { key: "progress",      label: "Progress (ep/pages)",       type: "number", placeholder: "0" },
  { key: "totalEpisodes", label: "Total Episodes/Pages",      type: "number", placeholder: "12" },
  { key: "rating",        label: "Rating (1-10)",             type: "number", placeholder: "8" },
];
