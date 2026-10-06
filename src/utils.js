import { SPRITE_BASE_URL } from "./config.js";

export const IMAGE_MODE_STORAGE_KEY = "pokedex-image-mode";
export const TRAINER_LEVEL_STORAGE_KEY = "pokedex-trainer-level";
export const TRAINER_XP_STORAGE_KEY = "pokedex-trainer-xp";
export const TRAINER_LEVEL_BASE_STORAGE_KEY = "pokedex-trainer-level-base";
export const TRAINER_SEEN_STORAGE_KEY = "pokedex-trainer-seen-pokemon";
export const TRAINER_ROSTER_STORAGE_KEY = "pokedex-trainer-roster";
export const TRAINER_ITEMS_STORAGE_KEY = "pokedex-trainer-items";
export const ARENA_TEAM_SIZE = 6;

export const POKEBALL_TYPES = [
 { id: "pokeball", label: "Poké Ball", catchRate: 0.35 },
 { id: "greatball", label: "Great Ball", catchRate: 0.55 },
 { id: "ultraball", label: "Ultra Ball", catchRate: 0.75 },
 { id: "premierball", label: "Premier Ball", catchRate: 0.35 },
 { id: "masterball", label: "Master Ball", catchRate: 1 },
];

export function getPokemonImageMode() {
 try {
  return localStorage.getItem(IMAGE_MODE_STORAGE_KEY) === "animation" ? "animation" : "artwork";
 } catch {
  return "artwork";
 }
}

export function savePokemonImageMode(mode) {
 try {
  localStorage.setItem(IMAGE_MODE_STORAGE_KEY, mode);
 } catch {
 }
}

export function getPokemonImageUrl(id, mode) {
 if (mode === "animation") {
  return `${SPRITE_BASE_URL}/versions/generation-v/black-white/animated/${id}.gif`;
 }
 return `${SPRITE_BASE_URL}/other/official-artwork/${id}.png`;
}

export function getIdFromUrl(url) {
 // url looks like "https://pokeapi.co/api/v2/pokemon/25/"
 const parts = url.split("/").filter(Boolean);
 return parts[parts.length - 1];
}

function getTrainerLevelBase() {
 try {
  const base = Number(localStorage.getItem(TRAINER_LEVEL_BASE_STORAGE_KEY) || "15");
  return Number.isFinite(base) && base > 0 ? Math.min(100, Math.round(base)) : 15;
 } catch {
  return 15;
 }
}

export function getTrainerProfile() {
 try {
  const level = Number(localStorage.getItem(TRAINER_LEVEL_STORAGE_KEY) || "15");
  const xp = Number(localStorage.getItem(TRAINER_XP_STORAGE_KEY) || "0");
  return {
   level: Number.isFinite(level) && level > 0 ? Math.min(100, Math.round(level)) : 15,
   xp: Number.isFinite(xp) && xp >= 0 ? Math.round(xp) : 0,
  };
 } catch {
  return { level: 15, xp: 0 };
 }
}

export function setTrainerProfile(level, xp, levelBase = getTrainerLevelBase()) {
 const safeLevel = Math.max(1, Math.min(100, Number(level) || 15));
 const safeXp = Math.max(0, Number(xp) || 0);
 const safeLevelBase = Math.max(1, Math.min(100, Number(levelBase) || 15));
 try {
  localStorage.setItem(TRAINER_LEVEL_STORAGE_KEY, String(safeLevel));
  localStorage.setItem(TRAINER_XP_STORAGE_KEY, String(safeXp));
  localStorage.setItem(TRAINER_LEVEL_BASE_STORAGE_KEY, String(safeLevelBase));
 } catch {
 }
 if (typeof window !== "undefined") {
  window.dispatchEvent(new CustomEvent("pokedex-trainer-profile-change", {
   detail: { level: safeLevel, xp: safeXp },
  }));
 }
 return { level: safeLevel, xp: safeXp };
}

export function awardTrainerBattleXp(amount = 40) {
 const profile = getTrainerProfile();
 const xp = profile.xp + Math.max(0, Math.round(amount));
 const levelBase = getTrainerLevelBase();
 const level = Math.min(100, levelBase + Math.floor(xp / 180));
 return { ...setTrainerProfile(level, xp, levelBase), gained: Math.max(0, Math.round(amount)) };
}

export function getTrainerRoster() {
 try {
  const roster = JSON.parse(localStorage.getItem(TRAINER_ROSTER_STORAGE_KEY) || "[]");
  return Array.isArray(roster) ? roster : [];
 } catch {
  return [];
 }
}

export function saveTrainerRoster(roster) {
 try {
  localStorage.setItem(TRAINER_ROSTER_STORAGE_KEY, JSON.stringify(roster));
 } catch {
 }
}

export function getTrainerItems() {
 try {
  const stored = JSON.parse(localStorage.getItem(TRAINER_ITEMS_STORAGE_KEY) || "null");
    if (!stored) return Object.fromEntries(POKEBALL_TYPES.map(({ id }, index) => [id, index === 0 ? 5 : 0]));
  return Object.fromEntries(POKEBALL_TYPES.map(({ id }) => [id, Math.max(0, Number(stored?.[id]) || 0)]));
 } catch {
  return Object.fromEntries(POKEBALL_TYPES.map(({ id }, index) => [id, index === 0 ? 5 : 0]));
 }
}

export function saveTrainerItems(items) {
 try {
  localStorage.setItem(TRAINER_ITEMS_STORAGE_KEY, JSON.stringify(items));
 } catch {
 }
}

export function awardPokemonBattleXp(pokemon, amount = 35) {
 if (!pokemon) return null;
 const roster = getTrainerRoster();
 const current = roster.find((entry) => entry.id === pokemon.id) || { ...pokemon, level: pokemon.level || 1, xp: 0 };
 const xp = Math.max(0, Number(current.xp) || 0) + Math.max(0, Math.round(amount));
 const level = Math.min(100, (Number(current.level) || 1) + Math.floor(xp / 100));
 const updated = { ...current, ...pokemon, level, xp: xp % 100 };
 saveTrainerRoster([...roster.filter((entry) => entry.id !== pokemon.id), updated]);
 return updated;
}

export function awardTrainerXpForPokemon(pokemon) {
 const profile = getTrainerProfile();
 if (!pokemon || !pokemon.name) return profile;
 try {
  const seen = new Set(JSON.parse(localStorage.getItem(TRAINER_SEEN_STORAGE_KEY) || "[]"));
  if (seen.has(pokemon.name)) return profile;
  const totalStats = (pokemon.stats || []).reduce((sum, { base_stat }) => sum + (base_stat || 0), 0);
  const bonus = Number(pokemon.base_experience || 0);
  const reward = 15 + Math.round((totalStats + bonus) / 24);
  const nextXp = profile.xp + reward;
  const levelBase = getTrainerLevelBase();
  const nextLevel = Math.min(100, levelBase + Math.floor(nextXp / 180));
  seen.add(pokemon.name);
  localStorage.setItem(TRAINER_SEEN_STORAGE_KEY, JSON.stringify([...seen]));
  setTrainerProfile(nextLevel, nextXp, levelBase);
  return { level: nextLevel, xp: nextXp, gained: reward };
 } catch {
  return profile;
 }
}

export function capitalize(name) {
 return name.charAt(0).toUpperCase() + name.slice(1);
}
export function getSpriteUrl(id) {
 return `${SPRITE_BASE_URL}/${id}.png`;
}