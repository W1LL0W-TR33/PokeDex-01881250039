import { API_BASE_URL } from "./config.js";

export const TYPE_NAMES = [
	"normal", "fire", "water", "electric", "grass", "ice", "fighting", "poison", "ground",
	"flying", "psychic", "bug", "rock", "ghost", "dragon", "dark", "steel", "fairy",
];

let typeChartRequest;

export function loadTypeChart() {
	if (!typeChartRequest) {
		typeChartRequest = Promise.all(TYPE_NAMES.map(async (name) => {
			const response = await fetch(`${API_BASE_URL}/type/${name}`);
			if (!response.ok) throw new Error("Couldn't load type matchups.");
			return response.json();
		})).then((types) => {
			const chart = new Map();
			for (const type of types) {
				for (const target of type.damage_relations.double_damage_to) chart.set(`${type.name}:${target.name}`, 2);
				for (const target of type.damage_relations.half_damage_to) chart.set(`${type.name}:${target.name}`, 0.5);
				for (const target of type.damage_relations.no_damage_to) chart.set(`${type.name}:${target.name}`, 0);
			}
			return chart;
		}).catch((error) => {
			typeChartRequest = null;
			throw error;
		});
	}
	return typeChartRequest;
}

export function getTypeMultiplier(chart, attackType, defenderTypes) {
	return defenderTypes.reduce((multiplier, type) => multiplier * (chart.get(`${attackType}:${type}`) ?? 1), 1);
}

function getCombinations(items, size) {
	const combinations = [];
	function collect(start, current) {
		if (current.length === size) {
			combinations.push(current);
			return;
		}
		for (let index = start; index <= items.length - (size - current.length); index += 1) {
			collect(index + 1, [...current, items[index]]);
		}
	}
	collect(0, []);
	return combinations;
}

export function findBestTeam(candidates, chart) {
	let best = null;
	for (const team of getCombinations(candidates, 6)) {
		const teamTypes = [...new Set(team.flatMap((pokemon) => pokemon.types.map(({ type }) => type.name)))];
		const offensiveCoverage = TYPE_NAMES.filter((target) =>
			teamTypes.some((attackType) => getTypeMultiplier(chart, attackType, [target]) > 1),
		).length;
		const resistanceCoverage = TYPE_NAMES.filter((attackType) =>
			team.some((pokemon) => getTypeMultiplier(chart, attackType, pokemon.types.map(({ type }) => type.name)) < 1),
		).length;
		const repeatedWeaknesses = TYPE_NAMES.reduce((total, attackType) => {
			const weakMembers = team.filter((pokemon) =>
				getTypeMultiplier(chart, attackType, pokemon.types.map(({ type }) => type.name)) > 1,
			).length;
			return total + Math.max(0, weakMembers - 1);
		}, 0);
		const score = Math.max(0, Math.min(100, Math.round(
			offensiveCoverage / TYPE_NAMES.length * 70 +
			teamTypes.length / 12 * 20 +
			resistanceCoverage / TYPE_NAMES.length * 10 -
			repeatedWeaknesses * 3,
		)));
		if (!best || score > best.score) best = { team, score, offensiveCoverage, resistanceCoverage, repeatedWeaknesses };
	}
	return best;
}

export function getLevelFactor(level) {
	const safeLevel = Math.max(1, Math.min(100, Number(level) || 1));
	return 1 + (safeLevel - 1) * 0.12;
}

export function getBattleHp(pokemon, level = 1) {
	const baseHp = pokemon?.stats?.find(({ stat }) => stat.name === "hp")?.base_stat ?? 1;
	const battleLevel = Math.max(1, Math.min(100, Number(level) || 1));
	return Math.max(50, Math.round((baseHp * 1.7 + 52) * getLevelFactor(battleLevel)));
}

export function calculateDamage(attacker, defender, attackType, chart, attackerLevel = 1, defenderLevel = 1, tera = {}) {
	const stats = Object.fromEntries(attacker.stats.map(({ stat, base_stat }) => [stat.name, base_stat]));
	const defenseStats = Object.fromEntries(defender.stats.map(({ stat, base_stat }) => [stat.name, base_stat]));
	const attack = Math.max(stats.attack, stats["special-attack"]);
	const defense = Math.max(1, Math.min(defenseStats.defense, defenseStats["special-defense"]));
	const defenderTypes = tera.defenderTeraType ? [tera.defenderTeraType] : defender.types.map(({ type }) => type.name);
	const multiplier = getTypeMultiplier(chart, attackType, defenderTypes);
	if (multiplier === 0) return 0;
	const hasOriginalStab = attacker.types.some(({ type }) => type.name === attackType);
	const stab = tera.attackerTeraType === attackType
		? hasOriginalStab ? 2 : 1.5
		: hasOriginalStab ? 1.5 : 1;
	const attackerFactor = getLevelFactor(attackerLevel);
	const defenderFactor = getLevelFactor(defenderLevel);
	const adjustedAttack = attack * attackerFactor;
	const adjustedDefense = defense * defenderFactor;
	return Math.max(4, Math.round((adjustedAttack / adjustedDefense) * 10 * multiplier * stab));
}