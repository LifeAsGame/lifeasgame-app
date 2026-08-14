import { USE_MOCK, apiGet } from "../client";
import {
  MOCK_CHARACTER_SHEET,
} from "../mock/player.mock";
import type {
  CharacterSheet,
} from "../types";

export async function getCharacterSheetApi(): Promise<CharacterSheet> {
  if (USE_MOCK) return MOCK_CHARACTER_SHEET;
  return apiGet<CharacterSheet>("/api/v1/players/me/sheet");
}
