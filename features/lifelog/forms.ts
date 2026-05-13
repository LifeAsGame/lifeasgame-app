import type { FormFieldSpec } from "@/entities/nav";

export const EXERCISE_FORM_FIELDS: FormFieldSpec[] = [
  { key: "category",      label: "Category",       type: "select", required: true, options: [
    { value: "CARDIO",    label: "Cardio" },    { value: "STRENGTH",  label: "Strength" },
    { value: "YOGA",      label: "Yoga" },      { value: "STRETCHING",label: "Stretching" },
    { value: "WALKING",   label: "Walking" },   { value: "CYCLING",   label: "Cycling" },
    { value: "SWIMMING",  label: "Swimming" },  { value: "SPORTS",    label: "Sports" },
    { value: "OTHER",     label: "Other" },
  ]},
  { key: "duration",      label: "Duration (min)",  type: "number",   placeholder: "30",  required: true },
  { key: "intensity",     label: "Intensity",        type: "select",   required: true, options: [
    { value: "LOW",       label: "Low" },
    { value: "MODERATE",  label: "Moderate" },
    { value: "HIGH",      label: "High" },
    { value: "VERY_HIGH", label: "Very High" },
  ]},
  { key: "caloriesBurned",label: "Calories Burned", type: "number",   placeholder: "300" },
  { key: "notes",         label: "Notes",            type: "textarea", placeholder: "Session notes..." },
];

export const COLLECTION_FORM_FIELDS: FormFieldSpec[] = [
  { key: "name",      label: "Item Name",  type: "text",   placeholder: "e.g. Kirito 1/7 Figure", required: true },
  { key: "category",  label: "Category",   type: "select", required: true, options: [
    { value: "FIGURE", label: "Figure" }, { value: "BOOK",  label: "Book" },
    { value: "GAME",   label: "Game" },   { value: "ART",   label: "Art" },
    { value: "MUSIC",  label: "Music" },  { value: "OTHER", label: "Other" },
  ]},
  { key: "rarity",    label: "Rarity",     type: "select", required: true, options: [
    { value: "COMMON",    label: "Common" },    { value: "UNCOMMON",  label: "Uncommon" },
    { value: "RARE",      label: "Rare" },      { value: "EPIC",      label: "Epic" },
    { value: "LEGENDARY", label: "Legendary" },
  ]},
  { key: "condition", label: "Condition",  type: "select", required: true, options: [
    { value: "MINT",      label: "Mint" },      { value: "EXCELLENT", label: "Excellent" },
    { value: "GOOD",      label: "Good" },      { value: "FAIR",      label: "Fair" },
    { value: "POOR",      label: "Poor" },
  ]},
  { key: "acquiredAt",label: "Acquired Date", type: "date", required: true },
  { key: "source",    label: "Source",         type: "text",     placeholder: "e.g. Amazon JP" },
  { key: "notes",     label: "Notes",          type: "textarea", placeholder: "Notes..." },
];

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
