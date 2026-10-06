import { useEffect, useState } from "react";
import { Link, NavLink, Outlet } from "react-router-dom";
import { getTrainerProfile, setTrainerProfile as saveTrainerProfile } from "./utils.js";

function Layout() {
	const [trainerProfile, setTrainerProfile] = useState(getTrainerProfile);

	useEffect(() => {
		function handleProfileChange() {
			setTrainerProfile(getTrainerProfile());
		}
		window.addEventListener("pokedex-trainer-profile-change", handleProfileChange);
		return () => window.removeEventListener("pokedex-trainer-profile-change", handleProfileChange);
	}, []);

	function resetTrainerLevel(event) {
		saveTrainerProfile(1, 0, 1);
		event.currentTarget.closest("details").open = false;
	}

	return (
		<div className="app">
			<header className="site-header">
				<Link to="/" className="app-title-link" aria-label="Pokédex home">
					<span className="brand-mark" aria-hidden="true"><span /></span>
					<span className="brand-name">POKÉDEX<span> / FIELD NOTES</span></span>
				</Link>
				<nav className="main-nav" aria-label="Main menu">
					<NavLink to="/" end>Pokédex</NavLink>
					<NavLink to="/team">Team builder</NavLink>
					<NavLink to="/arena">Arena</NavLink>
					<NavLink to="/wild">Wild encounter</NavLink>
					<NavLink to="/collection">My Pokémon</NavLink>
				</nav>
				<details className="trainer-profile-menu">
					<summary className="trainer-badge" aria-label={`Trainer level ${trainerProfile.level}, ${trainerProfile.xp} XP. Open trainer options`}>
						<span>Trainer</span>
						<strong>LV {trainerProfile.level}</strong>
						<small>{trainerProfile.xp % 180} / 180 XP</small>
						<span className="trainer-badge-track" aria-label={`${trainerProfile.xp % 180} of 180 XP to next level`}><span style={{ width: `${trainerProfile.level >= 100 ? 100 : trainerProfile.xp % 180 / 180 * 100}%` }} /></span>
						<span className="trainer-badge-chevron" aria-hidden="true">⌄</span>
					</summary>
					<div className="trainer-profile-submenu">
						<button type="button" className="reset-level-button" onClick={resetTrainerLevel}>Reset trainer level</button>
						<small>Return trainer to LV 1 · 0 XP</small>
					</div>
				</details>
			</header>
			<main><Outlet /></main>
			<footer className="site-footer">
				<span>REGIONAL POKÉDEX · ALL GENERATIONS</span>
				<a href="https://pokeapi.co/" target="_blank" rel="noreferrer">DATA VIA POKÉAPI ↗</a>
			</footer>
		</div>
	);
}

export default Layout;