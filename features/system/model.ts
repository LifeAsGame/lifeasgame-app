import type { SystemSubId } from "@/entities/nav";

export const SYSTEM_PANEL_ROWS: Record<Exclude<SystemSubId, "logout">, {
  description: string;
  rows: string[];
}> = {
  options: {
    description: "System options panel for graphics, controls, and gameplay settings.",
    rows: [
      "Graphics: High",
      "Master Volume: 78%",
      "Voice Chat: Team Only",
      "UI Scale: 100%",
      "Input Preset: Standard",
    ],
  },
  help: {
    description: "Help panel for quick guides, FAQ, and support routes.",
    rows: [
      "Quick Start Guide",
      "Frequently Asked Questions",
      "Contact Support",
      "Patch Notes",
      "Terms and Safety",
    ],
  },
};
