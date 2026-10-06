import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ARENA_TEAM_SIZE } from "../utils.js";
import { capitalize, getPokemonImageUrl, getTrainerRoster } from "../utils.js";

function CollectionPage() {
	const [roster] = useState(getTrainerRoster);
	const [teamNames] = useState(() => {
		try {
			const names = JSON.parse(localStorage.getItem("pokedex-arena-team") || "[]");
			return Array.isArray(names) ? names.slice(0, ARENA_TEAM_SIZE) : [];
		} catch {
			return [];
		}
	});
	const navigate = useNavigate();

	function chooseForArena(pokemon) {
		if (!teamNames.includes(pokemon.name) && teamNames.length >= ARENA_TEAM_SIZE) return;
		const nextTeam = teamNames.includes(pokemon.name) ? teamNames : [...teamNames, pokemon.name];
		localStorage.setItem("pokedex-arena-team", JSON.stringify(nextTeam));
		navigate("/arena");
	}

	return (
		<section className="tool-page collection-page">
			<header className="tool-page-heading">
				<div>
					<p className="eyebrow">TRAINER RECORD / CAUGHT POKÉMON</p>
					<h1>My Pokémon</h1>
					<p>{roster.length} caught Pokémon in your trainer roster.</p>
				</div>
			</header>
			{roster.length === 0 ? (
				<div className="empty-state collection-empty">
					<p className="empty-kicker">YOUR ROSTER IS EMPTY</p>
					<h2>Find your first partner.</h2>
					<p>Head into the wild and catch a Pokémon with one of your Poké Balls.</p>
					<Link to="/wild" className="primary-action collection-empty-action">Explore the wild</Link>
				</div>
			) : (
				<ul className="collection-grid">
					{roster.map((pokemon) => {
						const xp = Math.max(0, Number(pokemon.xp) || 0);
						return (
							<li className="collection-card" key={pokemon.id}>
								<img src={getPokemonImageUrl(pokemon.id, "artwork")} alt={capitalize(pokemon.name)} />
								<div className="collection-card-meta"><span>NO. {String(pokemon.id).padStart(3, "0")}</span><strong>LV {pokemon.level || 1}</strong></div>
								<h2>{capitalize(pokemon.name)}</h2>
								<div className="collection-card-types">{pokemon.types?.map(({ type }) => <span key={type.name} className={`type-chip type-${type.name}`}>{type.name}</span>)}</div>
								<div className="collection-card-progress"><span>{xp} / 100 XP</span><div className="pokemon-level-track" role="progressbar" aria-label={`${pokemon.name} level progress`} aria-valuemin="0" aria-valuemax="100" aria-valuenow={xp}><span style={{ width: `${Math.min(100, xp)}%` }} /></div></div>
								<button type="button" className="collection-action" disabled={!teamNames.includes(pokemon.name) && teamNames.length >= ARENA_TEAM_SIZE} title={!teamNames.includes(pokemon.name) && teamNames.length >= ARENA_TEAM_SIZE ? "Your Arena team already has six Pokémon" : undefined} onClick={() => chooseForArena(pokemon)}>{!teamNames.includes(pokemon.name) && teamNames.length >= ARENA_TEAM_SIZE ? "Team full" : "Use in Arena"}</button>
							</li>
						);
					})}
				</ul>
			)}
		</section>
	);
}

export default CollectionPage;