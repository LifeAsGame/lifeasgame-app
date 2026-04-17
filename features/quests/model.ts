import type { QuestsSubId, PanelDataItem } from "@/entities/nav";
import { makeStandardList } from "@/entities/nav";

export const QUEST_LISTS: Record<QuestsSubId, PanelDataItem[]> = {
  story: makeStandardList("Story Quest", "quest-story", "ST", 44, "Quest Detail"),
  suggested: makeStandardList("Suggested Quest", "quest-suggested", "SG", 40, "Quest Detail"),
  daily: makeStandardList("Daily Quest", "quest-daily", "DY", 38, "Quest Detail"),
  party: makeStandardList("Party Quest", "quest-party", "PT", 36, "Quest Detail"),
  guild: makeStandardList("Guild Quest", "quest-guild", "GD", 34, "Quest Detail"),
};
