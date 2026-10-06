import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { API_BASE_URL } from "../config.js";
import { getIdFromUrl, capitalize, getPokemonImageUrl } from "../utils.js";

const PAGE_SIZE = 24;

function PokemonList({ query, showFavorites, favorites, onToggleFavorite, imageMode, region }) {
	const [pokemons, setPokemons] = useState([]);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState(null);
	const [page, setPage] = useState(1);

	useEffect(() => {
		let isCurrent = true;

		async function loadPokemons() {
			setIsLoading(true);
			setError(null);
			try {
				const limit = region.end - region.start + 1;
				const response = await fetch(`${API_BASE_URL}/pokemon?limit=${limit}&offset=${region.start - 1}`);
				if (!response.ok) throw new Error(`PokéAPI returned ${response.status}.`);
				const data = await response.json();
				if (isCurrent) setPokemons(data.results);
			} catch (loadError) {
				if (isCurrent) setError(loadError.message);
			} finally {
				if (isCurrent) setIsLoading(false);
			}
		}

		loadPokemons();
		return () => { isCurrent = false; };
	}, [region]);

	const normalizedQuery = query.trim().toLowerCase().replace(/^#/, "");
	const visiblePokemons = pokemons.filter((pokemon) => {
		const id = getIdFromUrl(pokemon.url);
		const matchesQuery = pokemon.name.includes(normalizedQuery) || id.startsWith(normalizedQuery);
		return matchesQuery && (!showFavorites || favorites.includes(pokemon.name));
	});
	const pageCount = Math.max(1, Math.ceil(visiblePokemons.length / PAGE_SIZE));
	const pagePokemons = visiblePokemons.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

	useEffect(() => setPage(1), [query, showFavorites, region]);

	if (isLoading) return <p className="status">Opening the field guide…</p>;
	if (error) {
		return (
			<div className="empty-state">
				<p className="empty-kicker">CONNECTION LOST</p>
				<h3>The field guide didn’t load.</h3>
				<p>{error} Check your connection and refresh the page.</p>
			</div>
		);
	}

	return (
		<>
			<div className="list-heading">
				<p>{showFavorites ? "YOUR SAVED POKÉMON" : `THE ${region.name.toUpperCase()} INDEX`}</p>
				<span>{visiblePokemons.length} SPECIES</span>
			</div>
			{pagePokemons.length === 0 ? (
				<div className="empty-state">
					<p className="empty-kicker">NO MATCHES FOUND</p>
					<h3>{showFavorites && favorites.length === 0 ? "Your field notes are empty." : "Nothing in the index."}</h3>
					<p>{showFavorites && favorites.length === 0 ? "Save a Pokémon with the heart button to keep it close." : "Try another name or number, or clear your search."}</p>
				</div>
			) : (
				<ul className="pokemon-grid">
					{pagePokemons.map((pokemon) => {
						const id = getIdFromUrl(pokemon.url);
						const isFavorite = favorites.includes(pokemon.name);
						return (
							<li key={pokemon.name} className="pokemon-card">
								<Link to={`/pokemon/${pokemon.name}`} className="pokemon-link">
									<span className="pokemon-card-id">NO. {id.padStart(3, "0")}</span>
									<span className={`pokemon-artwork-wrap${imageMode === "animation" ? " is-animated" : ""}`}>
										<img
											className="pokemon-artwork"
											src={getPokemonImageUrl(id, imageMode)}
											alt=""
											loading="lazy"
											onError={(event) => {
												if (imageMode === "animation") event.currentTarget.src = getPokemonImageUrl(id, "artwork");
											}}
										/>
									</span>
									<span className="pokemon-card-name">{capitalize(pokemon.name)}</span>
									<span className="pokemon-card-note">{region.name.toUpperCase()} · FIELD RECORD</span>
								</Link>
								<button
									className={`favorite-button${isFavorite ? " is-favorite" : ""}`}
									type="button"
									aria-label={`${isFavorite ? "Remove" : "Save"} ${capitalize(pokemon.name)} ${isFavorite ? "from" : "to"} favorites`}
									aria-pressed={isFavorite}
									onClick={() => onToggleFavorite(pokemon.name)}
								>
									{isFavorite ? "♥" : "♡"}
								</button>
							</li>
						);
					})}
				</ul>
			)}
			{visiblePokemons.length > PAGE_SIZE && (
				<nav className="pagination" aria-label="Pokémon pages">
					<button type="button" onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={page === 1}>
						Previous
					</button>
					<span>PAGE <strong>{page}</strong> / {pageCount}</span>
					<button type="button" onClick={() => setPage((current) => Math.min(pageCount, current + 1))} disabled={page === pageCount}>
						Next
					</button>
				</nav>
			)}
		</>
	);
}

export default PokemonList;
