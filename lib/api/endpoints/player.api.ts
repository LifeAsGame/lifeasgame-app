import { USE_MOCK, apiGet } from "../client";
import {
  MOCK_CHARACTER_SHEET,
  MOCK_HOBBIES,
} from "../mock/player.mock";
import type {
  CharacterSheet,
  PlayerHobbyInfo,
} from "../types";

export async function getCharacterSheetApi(): Promise<CharacterSheet> {
  if (USE_MOCK) return MOCK_CHARACTER_SHEET;
  return apiGet<CharacterSheet>("/api/v1/players/me/sheet");
}

export async function getHobbiesApi(): Promise<PlayerHobbyInfo[]> {
  if (USE_MOCK) return MOCK_HOBBIES;
  const res = await apiGet<{ infos: PlayerHobbyInfo[] }>("/api/v1/players/me/hobbies");
  return res.infos;
}
