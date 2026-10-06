import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { API_BASE_URL, REGIONS } from "../config.js";
import { ARENA_TEAM_SIZE, awardPokemonBattleXp, awardTrainerBattleXp, capitalize, getPokemonImageUrl, getTrainerItems, getTrainerProfile, getTrainerRoster, POKEBALL_TYPES, saveTrainerItems, saveTrainerRoster } from "../utils.js";
import { calculateDamage, getBattleHp, loadTypeChart, TYPE_NAMES } from "../typeChart.js";

function clampLevel(level) {
	const normalized = Number(level) || 1;
	return Math.min(100, Math.max(1, normalized));
}

function getBattleTeamLevel(pokemon, trainerLevel, index = 0) {
	if (!pokemon) return 1;
	return clampLevel((pokemon.level ?? trainerLevel) + (index % 3) - 1);
}

function getMaxHp(pokemon) {
	return getBattleHp(pokemon, pokemon?.level ?? 1);
}

function getOpponentLevel(player, trainerLevel) {
	const levelOffset = Math.floor(Math.random() * 7) - 3;
	return clampLevel((player?.level ?? trainerLevel) + levelOffset);
}

function ArenaPage({ startWildEncounter = false }) {
	const [teamNames] = useState(() => {
		try {
			const savedTeam = JSON.parse(localStorage.getItem("pokedex-arena-team") || "[]");
			const names = Array.isArray(savedTeam) && savedTeam.length ? savedTeam : getTrainerRoster().map(({ name }) => name);
			return names.slice(0, ARENA_TEAM_SIZE);
		} catch {
			return [];
		}
	});
	const [trainerProfile, setTrainerProfile] = useState(getTrainerProfile);
	const trainerLevel = trainerProfile.level;
	const [team, setTeam] = useState([]);
	const [trainerRoster, setTrainerRoster] = useState(getTrainerRoster);
	const [items, setItems] = useState(getTrainerItems);
	const [selectedBall, setSelectedBall] = useState("pokeball");
	const [activeName, setActiveName] = useState("");
	const [faintedNames, setFaintedNames] = useState([]);
	const [pendingCatchSwap, setPendingCatchSwap] = useState(null);
	const [opponent, setOpponent] = useState(null);
	const [opponentTeam, setOpponentTeam] = useState([]);
	const [opponentIndex, setOpponentIndex] = useState(0);
	const [selectedTeraType, setSelectedTeraType] = useState("normal");
	const [teraType, setTeraType] = useState(null);
	const [teraPokemonId, setTeraPokemonId] = useState(null);
	const [encounterMode, setEncounterMode] = useState("trainer");
	const [regionId, setRegionId] = useState("all");
	const [playerHp, setPlayerHp] = useState(0);
	const [opponentHp, setOpponentHp] = useState(0);
	const [damageTotals, setDamageTotals] = useState({ player: 0, opponent: 0 });
	const [battleFinished, setBattleFinished] = useState(false);
	const [isLoading, setIsLoading] = useState(teamNames.length > 0);
	const [isBattling, setIsBattling] = useState(false);
	const [battleMessage, setBattleMessage] = useState("Find an opponent to begin your match.");
	const [error, setError] = useState("");
	const hasStartedInitialWild = useRef(false);
	const player = team.find((pokemon) => pokemon.name === activeName);
	const isTerastallized = player?.id === teraPokemonId;
	const playerAttackTypes = player
		? [...new Set([...player.types.map(({ type }) => type.name), ...(isTerastallized && teraType ? [teraType] : [])])]
		: [];
	const region = REGIONS.find((entry) => entry.id === regionId);
	const playerMaxHp = getMaxHp(player);
	const opponentMaxHp = getMaxHp(opponent);

	useEffect(() => {
		let isCurrent = true;
		if (teamNames.length === 0) return () => { isCurrent = false; };

		Promise.all(teamNames.map(async (name, index) => {
			const response = await fetch(`${API_BASE_URL}/pokemon/${name}`);
			if (!response.ok) throw new Error(`Couldn't load ${name}.`);
			const pokemon = await response.json();
			const owned = getTrainerRoster().find((entry) => entry.id === pokemon.id);
			return { ...pokemon, level: owned?.level ?? getBattleTeamLevel(pokemon, trainerLevel, index), xp: owned?.xp ?? 0 };
		})).then((pokemon) => {
			if (!isCurrent) return;
			setTeam(pokemon);
			setActiveName(pokemon[0]?.name ?? "");
		}).catch((loadError) => {
			if (isCurrent) setError(loadError.message);
		}).finally(() => {
			if (isCurrent) setIsLoading(false);
		});

		return () => { isCurrent = false; };
	}, [teamNames, trainerLevel]);

	useEffect(() => {
		function refreshTrainerProfile() {
			setTrainerProfile(getTrainerProfile());
		}
		window.addEventListener("pokedex-trainer-profile-change", refreshTrainerProfile);
		return () => window.removeEventListener("pokedex-trainer-profile-change", refreshTrainerProfile);
	}, []);

	useEffect(() => {
		if (!startWildEncounter) {
			hasStartedInitialWild.current = false;
			return;
		}
		if (isLoading || !player || hasStartedInitialWild.current) return;
		hasStartedInitialWild.current = true;
		findWildPokemon();
	}, [startWildEncounter, isLoading, player]);

	useEffect(() => {
		setPlayerHp(player ? getMaxHp(player) : 0);
	}, [activeName]);

	useEffect(() => {
		if (player && teraPokemonId === null) setSelectedTeraType(player.types[0]?.type.name ?? "normal");
	}, [player?.id, teraPokemonId]);

	useEffect(() => {
		setOpponentHp(opponent ? getMaxHp(opponent) : 0);
		setBattleMessage(opponent ? `A ${encounterMode === "wild" ? "wild encounter" : "trainer duel"} begins. Choose a move.` : "Find a trainer or a wild Pokémon.");
	}, [opponent, encounterMode]);

	useEffect(() => {
		setDamageTotals({ player: 0, opponent: 0 });
	}, [activeName, opponent, encounterMode]);

	function resetMatch() {
		if (!player && !opponent) return;
		setError("");
		setBattleFinished(false);
		setPendingCatchSwap(null);
		setTeraPokemonId(null);
		setTeraType(null);
		setPlayerHp(player ? getMaxHp(player) : 0);
		setOpponentHp(opponent ? getMaxHp(opponent) : 0);
		setFaintedNames([]);
		setDamageTotals({ player: 0, opponent: 0 });
		setBattleMessage(opponent
			? `The ${encounterMode === "wild" ? "wild encounter" : "trainer match"} has been reset. Choose a move to continue.`
			: encounterMode === "wild" ? "Find a wild Pokémon to begin." : "Find a trainer to begin your match.");
	}

	async function findOpponent() {
		setError("");
		setBattleFinished(false);
		setEncounterMode("trainer");
		setFaintedNames([]);
		setTeraPokemonId(null);
		setTeraType(null);
		setPlayerHp(player ? getMaxHp(player) : 0);
		setOpponent(null);
		setOpponentTeam([]);
		setOpponentIndex(0);
		try {
			const ids = new Set();
			while (ids.size < ARENA_TEAM_SIZE) {
				ids.add(Math.floor(Math.random() * (region.end - region.start + 1)) + region.start);
			}
			const challengers = await Promise.all([...ids].map(async (id) => {
				const response = await fetch(`${API_BASE_URL}/pokemon/${id}`);
				if (!response.ok) throw new Error("Couldn't build a trainer team. Try again.");
				const pokemon = await response.json();
				return { ...pokemon, level: getOpponentLevel(player, trainerLevel) };
			}));
			setOpponentTeam(challengers);
			setOpponent(challengers[0]);
		} catch (loadError) {
			setError(loadError.message);
		}
	}

	async function findWildPokemon() {
		setError("");
		setBattleFinished(false);
		setEncounterMode("wild");
		setFaintedNames([]);
		setTeraPokemonId(null);
		setTeraType(null);
		setPlayerHp(player ? getMaxHp(player) : 0);
		setOpponent(null);
		setOpponentTeam([]);
		setOpponentIndex(0);
		const id = Math.floor(Math.random() * (region.end - region.start + 1)) + region.start;
		try {
			const response = await fetch(`${API_BASE_URL}/pokemon/${id}`);
			if (!response.ok) throw new Error("Couldn't find a wild Pokémon. Try again.");
			const wildPokemon = await response.json();
			setOpponent({ ...wildPokemon, level: getOpponentLevel(player, trainerLevel), xp: 0 });
		} catch (loadError) {
			setError(loadError.message);
		}
	}

	function awardVictory(winner) {
		const trainerReward = awardTrainerBattleXp(encounterMode === "wild" ? 45 : 35);
		setTrainerProfile(trainerReward);
		const updatedPokemon = awardPokemonBattleXp(winner, encounterMode === "wild" ? 45 : 35);
		setTrainerRoster(getTrainerRoster());
		setTeam((current) => current.map((pokemon) => pokemon.id === updatedPokemon.id ? { ...pokemon, level: updatedPokemon.level, xp: updatedPokemon.xp } : pokemon));

		const drops = ["pokeball", "pokeball", "pokeball", "greatball", "greatball", "ultraball", "premierball", "masterball"];
		const drop = drops[Math.floor(Math.random() * drops.length)];
		const currentItems = getTrainerItems();
		const nextItems = { ...currentItems, [drop]: currentItems[drop] + 1 };
		saveTrainerItems(nextItems);
		setItems(nextItems);
		const ballLabel = POKEBALL_TYPES.find(({ id }) => id === drop).label;
		setBattleMessage(`${capitalize(winner.name)} wins! Trainer +${trainerReward.gained} XP, Pokémon +${encounterMode === "wild" ? 45 : 35} XP, and you found a ${ballLabel}.`);
		return updatedPokemon;
	}

	function swapPartyMember(name) {
		if (!pendingCatchSwap) return;
		const updatedTeam = team.map((pokemon) => pokemon.name === name ? pendingCatchSwap : pokemon);
		setTeam(updatedTeam);
		localStorage.setItem("pokedex-arena-team", JSON.stringify(updatedTeam.map(({ name: pokemonName }) => pokemonName)));
		setActiveName(pendingCatchSwap.name);
		setPendingCatchSwap(null);
	}

	function throwBall() {
		if (!opponent || encounterMode !== "wild" || !items[selectedBall] || opponentHp <= 0) return;
		const nextItems = { ...items, [selectedBall]: items[selectedBall] - 1 };
		saveTrainerItems(nextItems);
		setItems(nextItems);
		const ball = POKEBALL_TYPES.find(({ id }) => id === selectedBall);
		const hpBonus = 1.25 - (opponentHp / opponentMaxHp) * 0.75;
		const caught = ball.id === "masterball" || Math.random() < Math.min(0.95, ball.catchRate * hpBonus);
		if (!caught) {
			setBattleMessage(`${capitalize(opponent.name)} broke free! ${ball.label} used.`);
			return;
		}

		const existing = getTrainerRoster().find((entry) => entry.id === opponent.id);
		const captured = existing ? { ...opponent, level: existing.level, xp: existing.xp } : { ...opponent, xp: 0 };
		const nextRoster = [...getTrainerRoster().filter((entry) => entry.id !== captured.id), captured];
		saveTrainerRoster(nextRoster);
		setTrainerRoster(nextRoster);
		const alreadyOnTeam = team.some((pokemon) => pokemon.id === captured.id);
		const joinsTeam = alreadyOnTeam || team.length < ARENA_TEAM_SIZE;
		setTeam((current) => {
			const nextTeam = current.some((pokemon) => pokemon.id === captured.id) || current.length >= ARENA_TEAM_SIZE ? current : [...current, captured];
			localStorage.setItem("pokedex-arena-team", JSON.stringify(nextTeam.map(({ name }) => name)));
			return nextTeam;
		});
		if (joinsTeam) {
			setActiveName(captured.name);
			setBattleMessage(`${capitalize(captured.name)} was caught with a ${ball.label} and added to your Arena team!`);
		} else {
			setPendingCatchSwap(captured);
			setBattleMessage(`${capitalize(captured.name)} was caught with a ${ball.label} and saved to your collection.`);
		}
	}

	async function useMove(attackType) {
		if (!player || !opponent || isBattling || playerHp <= 0 || opponentHp <= 0) return;
		setIsBattling(true);
		try {
			const chart = await loadTypeChart();
			const dealt = calculateDamage(player, opponent, attackType, chart, player.level, opponent.level, {
				attackerTeraType: isTerastallized ? teraType : null,
			});
			const nextOpponentHp = Math.max(0, opponentHp - dealt);
			setOpponentHp(nextOpponentHp);
			setDamageTotals((current) => ({ ...current, player: current.player + dealt }));
			if (nextOpponentHp === 0) {
				const winner = awardVictory(player) || player;
				if (encounterMode === "wild") {
					setFaintedNames([]);
					setPlayerHp(getMaxHp(winner));
					await findWildPokemon();
					setPlayerHp(getMaxHp(winner));
				} else if (opponentIndex + 1 < opponentTeam.length) {
					setOpponentIndex((current) => current + 1);
					setOpponent(opponentTeam[opponentIndex + 1]);
				} else {
					setFaintedNames([]);
					setBattleFinished(true);
					setPlayerHp(getMaxHp(winner));
					setBattleMessage("Trainer team defeated! Your party has healed for the next match.");
				}
				return;
			}

			const counterType = opponent.types[0].type.name;
			const received = calculateDamage(opponent, player, counterType, chart, opponent.level, player.level, {
				defenderTeraType: isTerastallized ? teraType : null,
			});
			const nextPlayerHp = Math.max(0, playerHp - received);
			setPlayerHp(nextPlayerHp);
			setDamageTotals((current) => ({ ...current, opponent: current.opponent + received }));
			if (nextPlayerHp === 0) {
				const nextFaintedNames = [...new Set([...faintedNames, player.name])];
				const replacement = team.find((pokemon) => !nextFaintedNames.includes(pokemon.name));
				setFaintedNames(nextFaintedNames);
				if (replacement) setActiveName(replacement.name);
				setBattleMessage(replacement
					? `${capitalize(player.name)} fainted. ${capitalize(replacement.name)} is taking over. ${capitalize(opponent.name)} has ${opponentHp} HP left.`
					: `${capitalize(opponent.name)} wins. Your party has healed for the next match.`);
				if (!replacement) {
					setFaintedNames([]);
					setBattleFinished(true);
					setPlayerHp(getMaxHp(player));
				}
			} else {
				setBattleMessage(`${capitalize(player.name)} dealt ${dealt} damage. ${capitalize(opponent.name)} countered for ${received}.`);
			}
		} catch (battleError) {
			setError(battleError.message);
		} finally {
			setIsBattling(false);
		}
	}

	function activateTerastallization() {
		if (!player || !opponent || teraPokemonId !== null || battleFinished || isBattling) return;
		setTeraType(selectedTeraType);
		setTeraPokemonId(player.id);
		setBattleMessage(`${capitalize(player.name)} terastallized into the ${selectedTeraType} type!`);
	}

	if (isLoading) return <p className="status">Loading your arena team…</p>;
	return (
		<section className="tool-page arena-page">
			<header className="tool-page-heading arena-title-row">
				<div><p className="eyebrow">{startWildEncounter ? "FIELD EXPLORATION / WILD POKÉMON" : "BATTLE ARENA / TYPE MATCHUPS LIVE"}</p><h1>{startWildEncounter ? <>Into the<br />wild.</> : <>Enter the<br />arena.</>}</h1><p>{startWildEncounter ? "Explore the region, battle wild Pokémon, and catch new partners with your Poké Balls." : "Use your saved lineup or generate a random team of six, then face a regional challenger."}</p></div>
				<div className="opponent-controls">
					<label htmlFor="arena-region">{startWildEncounter ? "Wild region" : "Trainer region"}</label>
					<select id="arena-region" value={regionId} onChange={(event) => setRegionId(event.target.value)}>
						{REGIONS.map((entry) => <option key={entry.id} value={entry.id}>{entry.name}</option>)}
					</select>
					<button type="button" className="primary-action" onClick={resetMatch}>Reset match</button>
					{startWildEncounter
						? <button type="button" className="primary-action wild-button" onClick={findWildPokemon}>Wild encounter</button>
						: <button type="button" className="primary-action" onClick={findOpponent}>Find trainer</button>}
				</div>
			</header>

			{error && <p className="team-message" role="alert">{error}</p>}
			{!error && team.length === 0 && !isLoading && (
				<p className="team-message">No team loaded yet. <Link to="/team">Build and save a team</Link> before entering an encounter.</p>
			)}
			{team.length > 0 && (
				<>
					<div className="trainer-progress-panel">
						<div><span>TRAINER LEVEL</span><strong>LV {trainerProfile.level}</strong><small>{trainerProfile.xp % 180} / 180 XP</small></div>
						<div className="trainer-level-track" role="progressbar" aria-label="Trainer level progress" aria-valuemin="0" aria-valuemax="180" aria-valuenow={trainerProfile.xp % 180}><span style={{ width: `${trainerProfile.level >= 100 ? 100 : trainerProfile.xp % 180 / 180 * 100}%` }} /></div>
					</div>
					<div className="arena-fighter-select">
						<label htmlFor="active-fighter">Your fighter</label>
						<select id="active-fighter" value={activeName} onChange={(event) => setActiveName(event.target.value)}>
							{team.map((pokemon) => <option key={pokemon.id} value={pokemon.name} disabled={battleFinished || faintedNames.includes(pokemon.name)}>{capitalize(pokemon.name)}{faintedNames.includes(pokemon.name) ? " (fainted)" : ""}</option>)}
						</select>
						<span>TEAM {team.length}/{ARENA_TEAM_SIZE}</span>
					</div>
					<section className="arena-party" aria-labelledby="arena-party-title">
						<div className="arena-party-heading"><h2 id="arena-party-title">Your team of six</h2><span>{team.length} / {ARENA_TEAM_SIZE} READY</span></div>
						<ul className="arena-party-grid">
							{Array.from({ length: ARENA_TEAM_SIZE }, (_, index) => {
								const pokemon = team[index];
								return <li key={`party-slot-${index}`}>{pokemon
									? <button type="button" className={`arena-party-slot${pokemon.name === activeName ? " is-active" : ""}`} disabled={battleFinished || faintedNames.includes(pokemon.name)} onClick={() => setActiveName(pokemon.name)}><span className="arena-party-number">0{index + 1}</span><img src={getPokemonImageUrl(pokemon.id, "artwork")} alt="" /><strong>{capitalize(pokemon.name)}</strong><small>LV {pokemon.level}{faintedNames.includes(pokemon.name) ? " · FAINTED" : ""}</small></button>
									: <Link to="/team" className="arena-party-slot is-empty"><span className="arena-party-number">0{index + 1}</span><strong>Empty slot</strong><small>Build a team</small></Link>}</li>;
							})}
						</ul>
					</section>
					{encounterMode === "trainer" && opponentTeam.length > 0 && <section className="opponent-party" aria-labelledby="opponent-party-title"><div className="arena-party-heading"><h2 id="opponent-party-title">Trainer's team</h2><span>{battleFinished ? "DEFEATED" : `${opponentIndex + 1} / ${opponentTeam.length} ACTIVE`}</span></div><ul className="opponent-party-grid">{opponentTeam.map((pokemon, index) => <li key={pokemon.id} className={index < opponentIndex || battleFinished && index === opponentIndex ? "is-defeated" : index === opponentIndex ? "is-current" : ""} aria-current={index === opponentIndex && !battleFinished ? "step" : undefined}><img src={getPokemonImageUrl(pokemon.id, "artwork")} alt="" /><strong>{capitalize(pokemon.name)}</strong><small>{index < opponentIndex || battleFinished && index === opponentIndex ? "DEFEATED" : index === opponentIndex ? "ACTIVE" : "UP NEXT"}</small></li>)}</ul></section>}
					<div className="arena-stage">
						<div className={`fighter-card player-fighter${isTerastallized ? " is-terastallized" : ""}`}>
							<p>YOUR FIGHTER <span>01</span></p>
							<div className="fighter-art-wrap">{player && <img src={getPokemonImageUrl(player.id, "artwork")} alt={capitalize(player.name)} />}</div>
							<h2>{player ? capitalize(player.name) : "Select a Pokémon"}</h2>
							<div className="pokemon-level-label"><span>LEVEL {player?.level ?? 1}</span><span>{player?.xp ?? 0} / 100 XP</span></div>
							<div className="pokemon-level-track" role="progressbar" aria-label={`${player?.name ?? "Pokémon"} level progress`} aria-valuemin="0" aria-valuemax="100" aria-valuenow={player?.xp ?? 0}><span style={{ width: `${player?.xp ?? 0}%` }} /></div>
							<div className="fighter-types">{player?.types.filter(({ type }) => !isTerastallized || type.name !== teraType).map(({ type }) => <span key={type.name} className={`type-chip type-${type.name}`}>{type.name}</span>)}{isTerastallized && <span className={`type-chip type-${teraType} tera-type-chip`}>{teraType} TERA</span>}</div>
							<div className="health-label"><span>HP</span><span>{playerHp} / {playerMaxHp}</span></div>
							<div className="health-track"><span style={{ width: `${playerMaxHp ? playerHp / playerMaxHp * 100 : 0}%` }} /></div>
						</div>
						<div className="arena-versus">VS</div>
						<div className="fighter-card opponent-fighter">
								<p>{encounterMode === "wild" ? "WILD POKÉMON" : "TRAINER CHALLENGER"} <span>{encounterMode === "trainer" && opponentTeam.length ? `TEAM ${opponentIndex + 1}/${opponentTeam.length} · ` : ""}{opponent ? `NO. ${String(opponent.id).padStart(3, "0")}` : "WAITING"}</span></p>
							<div className="fighter-art-wrap">{opponent && <img src={getPokemonImageUrl(opponent.id, "artwork")} alt={capitalize(opponent.name)} />}</div>
							<h2>{opponent ? capitalize(opponent.name) : "Find an opponent"}</h2>
							{opponent && <><div className="pokemon-level-label"><span>LEVEL {opponent.level}</span><span>{opponent.xp ?? 0} / 100 XP</span></div><div className="pokemon-level-track" aria-hidden="true"><span style={{ width: `${opponent.xp ?? 0}%` }} /></div></>}
							<div className="fighter-types">{opponent?.types.map(({ type }) => <span key={type.name} className={`type-chip type-${type.name}`}>{type.name}</span>)}</div>
							<div className="health-label"><span>HP</span><span>{opponentHp} / {opponentMaxHp}</span></div>
							<div className="health-track opponent-health"><span style={{ width: `${opponentMaxHp ? opponentHp / opponentMaxHp * 100 : 0}%` }} /></div>
						</div>
					</div>
					<div className="arena-console">
						<div><p className="eyebrow">BATTLE LOG</p><p className="battle-message" role="status">{battleMessage}</p><div className="battle-damage-totals"><span>Your damage <strong>{damageTotals.player}</strong></span><span>Opponent damage <strong>{damageTotals.opponent}</strong></span></div></div>
						<div className="move-controls">
							<span>Choose a move</span>
							<div className="tera-controls">
								<label htmlFor="tera-type">Tera type</label>
								<select id="tera-type" value={selectedTeraType} disabled={teraPokemonId !== null || battleFinished} onChange={(event) => setSelectedTeraType(event.target.value)}>
									{TYPE_NAMES.map((type) => <option key={type} value={type}>{capitalize(type)}</option>)}
								</select>
								<button type="button" className={`tera-button${isTerastallized ? " is-active" : ""}`} disabled={teraPokemonId !== null || !opponent || battleFinished || isBattling} onClick={activateTerastallization}>
									{isTerastallized ? "Terastallized" : teraPokemonId !== null ? "Tera used" : "Terastallize"}
								</button>
							</div>
							{playerAttackTypes.map((type) => <button key={type} type="button" className="move-button" disabled={battleFinished || !opponent || isBattling || playerHp === 0 || opponentHp === 0} onClick={() => useMove(type)}>{isBattling ? "…" : `${capitalize(type)} attack`}</button>)}
							{encounterMode === "wild" && opponent && opponentHp > 0 && <div className="catch-controls"><label htmlFor="catch-ball">Poké Ball</label><select id="catch-ball" value={selectedBall} onChange={(event) => setSelectedBall(event.target.value)}>{POKEBALL_TYPES.map(({ id, label }) => <option key={id} value={id} disabled={!items[id]}>{label} · {items[id] || 0}</option>)}</select><button type="button" className="move-button" disabled={battleFinished || !items[selectedBall]} onClick={throwBall}>Throw ball</button></div>}
						</div>
					</div>
					{pendingCatchSwap && <div className="party-swap-overlay"><section className="party-swap-panel" role="dialog" aria-modal="true" aria-labelledby="party-swap-title"><p className="eyebrow">ARENA PARTY FULL</p><h2 id="party-swap-title">Switch in {capitalize(pendingCatchSwap.name)}?</h2><p>Your new catch is safe in My Pokémon. Choose a teammate to move out of the Arena party.</p><div className="party-swap-choices">{team.map((pokemon) => <button key={pokemon.id} type="button" className="party-swap-choice" onClick={() => swapPartyMember(pokemon.name)}><img src={getPokemonImageUrl(pokemon.id, "artwork")} alt="" /><span><strong>{capitalize(pokemon.name)}</strong><small>LV {pokemon.level} · {pokemon.xp || 0} XP</small></span><span>SWAP</span></button>)}</div><button type="button" className="party-swap-keep" onClick={() => setPendingCatchSwap(null)}>Keep current Arena team</button></section></div>}
				</>
			)}
			<section className="trainer-roster" aria-labelledby="trainer-roster-title">
				<div className="section-heading"><div><p className="eyebrow">TRAINER RECORD</p><h2 id="trainer-roster-title">Your Pokémon</h2></div><span>{trainerRoster.length} caught</span></div>
				<div className="trainer-inventory" aria-label="Poké Ball inventory">{POKEBALL_TYPES.map(({ id, label }) => <span key={id}>{label} <strong>{items[id] || 0}</strong></span>)}</div>
				{trainerRoster.length ? <ul className="trainer-roster-list">{trainerRoster.map((pokemon) => <li key={pokemon.id}><img src={getPokemonImageUrl(pokemon.id, "artwork")} alt="" /><span><strong>{capitalize(pokemon.name)}</strong><small>LV {pokemon.level} · {pokemon.xp || 0} / 100 XP</small></span><button type="button" className="move-button" onClick={() => { if (!team.some((entry) => entry.id === pokemon.id)) setTeam((current) => [...current, pokemon]); setActiveName(pokemon.name); }}>Choose</button></li>)}</ul> : <p className="empty-roster">Catch a wild Pokémon to start your trainer roster.</p>}
			</section>
		</section>
	);
}

export default ArenaPage;