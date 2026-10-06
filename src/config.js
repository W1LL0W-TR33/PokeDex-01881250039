export const API_BASE_URL = "https://pokeapi.co/api/v2";
export const SPRITE_BASE_URL = "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon";

export const REGIONS = [
	{ id: "all", name: "All regions", start: 1, end: 1025 },
	{ id: "kanto", name: "Kanto", start: 1, end: 151 },
	{ id: "johto", name: "Johto", start: 152, end: 251 },
	{ id: "hoenn", name: "Hoenn", start: 252, end: 386 },
	{ id: "sinnoh", name: "Sinnoh", start: 387, end: 493 },
	{ id: "unova", name: "Unova", start: 494, end: 649 },
	{ id: "kalos", name: "Kalos", start: 650, end: 721 },
	{ id: "alola", name: "Alola", start: 722, end: 809 },
	{ id: "galar", name: "Galar", start: 810, end: 905 },
	{ id: "paldea", name: "Paldea", start: 906, end: 1025 },
];
