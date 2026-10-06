import { useEffect, useState } from "react";
import SearchForm from "../components/SearchForm.jsx";
import PokemonList from "../components/PokemonList.jsx";
import ImageModeControl from "../components/ImageModeControl.jsx";
import { getPokemonImageMode, savePokemonImageMode } from "../utils.js";
import { REGIONS } from "../config.js";

function ListPage() {
	const [query, setQuery] = useState("");
	const [regionId, setRegionId] = useState("all");
	const [showFavorites, setShowFavorites] = useState(false);
	const [imageMode, setImageMode] = useState(getPokemonImageMode);
	const [favorites, setFavorites] = useState(() => {
		try {
			return JSON.parse(localStorage.getItem("pokedex-favorites") || "[]");
		} catch {
			return [];
		}
	});

	useEffect(() => {
		localStorage.setItem("pokedex-favorites", JSON.stringify(favorites));
	}, [favorites]);

	function toggleFavorite(name) {
		setFavorites((current) =>
			current.includes(name)
				? current.filter((favorite) => favorite !== name)
				: [...current, name],
		);
	}

	function changeImageMode(mode) {
		setImageMode(mode);
		savePokemonImageMode(mode);
	}

	const region = REGIONS.find((entry) => entry.id === regionId);

	return (
		<>
			<section className="catalog" aria-label="Pokémon catalog">
				<div className="catalog-toolbar">
					<div className="catalog-controls">
						<label className="region-control">
							<span>Region</span>
							<select value={regionId} onChange={(event) => setRegionId(event.target.value)}>
								{REGIONS.map((entry) => <option key={entry.id} value={entry.id}>{entry.name}</option>)}
							</select>
						</label>
						<SearchForm query={query} onQueryChange={setQuery} />
					</div>
					<div className="catalog-actions">
						<button
							className={`filter-button${showFavorites ? " is-active" : ""}`}
							type="button"
							aria-pressed={showFavorites}
							onClick={() => setShowFavorites((value) => !value)}
						>
							<span aria-hidden="true">♡</span> Saved <span className="saved-count">{favorites.length}</span>
						</button>
						<ImageModeControl mode={imageMode} onChange={changeImageMode} />
					</div>
				</div>
				<PokemonList
					query={query}
					showFavorites={showFavorites}
					favorites={favorites}
					onToggleFavorite={toggleFavorite}
					imageMode={imageMode}
					region={region}
				/>
			</section>
		</>
	);
}

export default ListPage;