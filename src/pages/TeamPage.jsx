import { useState } from "react";
import { Link } from "react-router-dom";
import { API_BASE_URL } from "../config.js";
import { capitalize, getPokemonImageUrl } from "../utils.js";
import { findBestTeam, loadTypeChart } from "../typeChart.js";

const MAX_CANDIDATES = 12;

function TeamPage() {
	const [query, setQuery] = useState("");
	const [candidates, setCandidates] = useState([]);
	const [recommendation, setRecommendation] = useState(null);
	const [isSearching, setIsSearching] = useState(false);
	const [isScoring, setIsScoring] = useState(false);
	const [message, setMessage] = useState("");

	async function addCandidate(event) {
		event.preventDefault();
		const identifier = query.trim().toLowerCase().replaceAll(" ", "-");
		if (!identifier) return;
		if (candidates.length >= MAX_CANDIDATES) {
			setMessage(`Choose up to ${MAX_CANDIDATES} candidates.`);
			return;
		}
		setIsSearching(true);
		setMessage("");
		try {
			const response = await fetch(`${API_BASE_URL}/pokemon/${encodeURIComponent(identifier)}`);
			if (!response.ok) throw new Error(`No Pokémon found for “${query.trim()}”.`);
			const pokemon = await response.json();
			if (candidates.some((candidate) => candidate.id === pokemon.id)) {
				setMessage(`${capitalize(pokemon.name)} is already in your candidate pool.`);
			} else {
				setCandidates((current) => [...current, pokemon]);
				setRecommendation(null);
				setQuery("");
			}
		} catch (error) {
			setMessage(error.message);
		} finally {
			setIsSearching(false);
		}
	}

	function removeCandidate(id) {
		setCandidates((current) => current.filter((pokemon) => pokemon.id !== id));
		setRecommendation(null);
	}

	async function recommendTeam() {
		setIsScoring(true);
		setMessage("");
		try {
			const chart = await loadTypeChart();
			setRecommendation(findBestTeam(candidates, chart));
		} catch (error) {
			setMessage(error.message);
		} finally {
			setIsScoring(false);
		}
	}

	function saveTeam() {
		try {
			localStorage.setItem("pokedex-arena-team", JSON.stringify(recommendation.team.map(({ name }) => name)));
			setMessage("Your recommended six are ready in the arena.");
		} catch {
			setMessage("Couldn't save the team in this browser.");
		}
	}

	return (
		<section className="tool-page team-page">
			<header className="tool-page-heading">
				<div>
					<p className="eyebrow">TEAM LAB / TYPE MATCHUPS</p>
					<h1>Build your<br />best six.</h1>
					<p>Add up to twelve candidates. The planner compares type coverage, resistances, and shared weaknesses to recommend a balanced team.</p>
				</div>
			</header>

			<section className="team-builder-panel" aria-labelledby="candidate-title">
				<div className="section-heading team-section-heading">
					<div><p className="eyebrow">01 / CANDIDATE POOL</p><h2 id="candidate-title">Choose your roster</h2></div>
					<span>{candidates.length} / {MAX_CANDIDATES}</span>
				</div>
				<form className="candidate-form" onSubmit={addCandidate}>
					<label htmlFor="candidate-search">Pokémon name or number</label>
					<div className="candidate-input-row">
						<input id="candidate-search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Try Pikachu or 25" autoComplete="off" />
						<button type="submit" disabled={isSearching || candidates.length >= MAX_CANDIDATES}>{isSearching ? "Adding…" : "Add candidate"}</button>
					</div>
				</form>
				{message && <p className="team-message" role="status">{message}</p>}
				{candidates.length > 0 && (
					<ul className="candidate-grid">
						{candidates.map((pokemon) => (
							<li className="candidate-item" key={pokemon.id}>
								<img src={getPokemonImageUrl(pokemon.id, "artwork")} alt="" />
								<div><span>#{String(pokemon.id).padStart(3, "0")}</span><strong>{capitalize(pokemon.name)}</strong><small>{pokemon.types.map(({ type }) => type.name).join(" / ")}</small></div>
								<button type="button" onClick={() => removeCandidate(pokemon.id)} aria-label={`Remove ${pokemon.name}`}>×</button>
							</li>
						))}
					</ul>
				)}
				<div className="recommend-row">
					<p>{candidates.length < 6 ? `Add ${6 - candidates.length} more to compare full teams.` : "The planner checks every six-Pokémon combination in your pool."}</p>
					<button type="button" className="primary-action" onClick={recommendTeam} disabled={candidates.length < 6 || isScoring}>
						{isScoring ? "Checking matchups…" : "Find best-compatible six"}
					</button>
				</div>
			</section>

			{recommendation && (
				<section className="recommendation-panel" aria-labelledby="recommendation-title">
					<div className="recommendation-heading">
						<div><p className="eyebrow">02 / RECOMMENDED TEAM</p><h2 id="recommendation-title">A balanced lineup.</h2></div>
						<div className="compatibility-score"><strong>{recommendation.score}</strong><span>COMPATIBILITY</span></div>
					</div>
					<div className="team-metrics">
						<span><strong>{recommendation.offensiveCoverage}/18</strong> types covered</span>
						<span><strong>{recommendation.resistanceCoverage}/18</strong> types resisted</span>
						<span><strong>{recommendation.repeatedWeaknesses}</strong> shared weaknesses</span>
					</div>
					<ul className="recommended-grid">
						{recommendation.team.map((pokemon, index) => (
							<li className="recommended-card" key={pokemon.id}>
								<span className="recommended-slot">0{index + 1}</span>
								<img src={getPokemonImageUrl(pokemon.id, "artwork")} alt="" />
								<strong>{capitalize(pokemon.name)}</strong>
								<span>{pokemon.types.map(({ type }) => type.name).join(" / ")}</span>
							</li>
						))}
					</ul>
					<div className="recommend-row">
						<p>Save this lineup to use it in the arena.</p>
						<div className="recommend-actions"><button type="button" className="primary-action" onClick={saveTeam}>Set as arena team</button><Link to="/arena" className="text-action">Go to arena →</Link></div>
					</div>
				</section>
			)}
		</section>
	);
}

export default TeamPage;