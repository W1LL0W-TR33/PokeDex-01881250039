import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { API_BASE_URL } from "../config.js";
import { awardTrainerXpForPokemon, capitalize, getPokemonImageMode, getPokemonImageUrl, getTrainerProfile, savePokemonImageMode, setTrainerProfile } from "../utils.js";
import ImageModeControl from "../components/ImageModeControl.jsx";

function formatMeasure(value, divisor, unit) {
  return `${(value / divisor).toFixed(1)} ${unit}`;
}

function formatFormName(formName, speciesName) {
  if (formName === speciesName) return "Standard";
  const suffix = formName.startsWith(`${speciesName}-`) ? formName.slice(speciesName.length + 1) : formName;
  const words = suffix.split("-");
  if (words[0] === "mega") return `Mega ${capitalize(speciesName)}${words.length > 1 ? ` ${words.slice(1).map(capitalize).join(" ")}` : ""}`;
  if (words[0] === "gmax") return `Gigantamax ${capitalize(speciesName)}`;
  return words.map(capitalize).join(" ");
}

function getShowdownAnimationUrl(pokemonName) {
  const spriteName = pokemonName.replace(/-mega-([xyz])$/, "-mega$1");
  return `https://play.pokemonshowdown.com/sprites/ani/${spriteName}.gif`;
}

function DetailPage() {
  const { name } = useParams();
  const [pokemon, setPokemon] = useState(null);
  const [varieties, setVarieties] = useState([]);
  const [animationSourceIndex, setAnimationSourceIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [imageMode, setImageMode] = useState(getPokemonImageMode);
  const [trainerProfile, setTrainerProfileState] = useState(getTrainerProfile);

  function changeImageMode(mode) {
    setImageMode(mode);
    setAnimationSourceIndex(0);
    savePokemonImageMode(mode);
  }

  useEffect(() => {
    let isCurrent = true;

    async function loadPokemon() {
      setIsLoading(true);
      setError(null);
      setPokemon(null);
      setVarieties([]);
      setAnimationSourceIndex(0);

      try {
        const response = await fetch(`${API_BASE_URL}/pokemon/${name}`);
        if (!response.ok) {
          throw new Error(`No Pokémon named "${name}" — check the spelling.`);
        }

        const data = await response.json();
        if (isCurrent) {
          setPokemon(data);
          const earned = awardTrainerXpForPokemon(data);
          if (earned.gained) {
            setTrainerProfileState({ level: earned.level, xp: earned.xp });
          }
        }

        try {
          const speciesResponse = await fetch(data.species.url);
          if (speciesResponse.ok) {
            const species = await speciesResponse.json();
            if (isCurrent) {
              const uniqueVarieties = [...new Map(species.varieties.map(({ pokemon: variety }) => [variety.name, variety])).values()];
              setVarieties(uniqueVarieties);
            }
          }
        } catch {
          if (isCurrent) setVarieties([]);
        }
      } catch (err) {
        if (isCurrent) {
          setError(err.message);
        }
      } finally {
        if (isCurrent) {
          setIsLoading(false);
        }
      }
    }

    loadPokemon();

    return () => {
      isCurrent = false;
    };
  }, [name]);

  if (isLoading) return <p className="status">Loading {name}…</p>;
  if (error) return <p className="status status-error">{error}</p>;
  const displayName = pokemon.name === pokemon.species.name
    ? capitalize(pokemon.name)
    : formatFormName(pokemon.name, pokemon.species.name);
  const artworkUrl = pokemon.sprites.other["official-artwork"].front_default || pokemon.sprites.front_default;
  const animationSources = [
    pokemon.sprites.versions?.["generation-v"]?.["black-white"]?.animated?.front_default,
    getShowdownAnimationUrl(pokemon.name),
    artworkUrl,
    pokemon.sprites.front_default,
  ].filter((source, index, sources) => source && sources.indexOf(source) === index);

  return (
    <article className="detail-page">
      <div className="detail-toolbar">
        <Link to="/" className="back-link"><span aria-hidden="true">←</span> Back to the index</Link>
        <ImageModeControl mode={imageMode} onChange={changeImageMode} />
      </div>
      <section className="detail-hero">
        <div className="detail-art-panel">
          <span className="detail-index">FIELD RECORD / NO. {String(pokemon.id).padStart(3, "0")}</span>
          <img
            className={`detail-artwork${imageMode === "animation" ? " is-animated" : ""}`}
            src={imageMode === "animation" ? animationSources[animationSourceIndex] : artworkUrl}
            alt={displayName}
            onError={() => {
              if (imageMode === "animation") {
                setAnimationSourceIndex((index) => Math.min(index + 1, animationSources.length - 1));
              }
            }}
          />
          <span className="art-caption">SPECIMEN {String(pokemon.id).padStart(3, "0")} · KANTO</span>
        </div>
        <div className="detail-heading">
          <p className="eyebrow">POKÉDEX ENTRY {String(pokemon.id).padStart(3, "0")}</p>
          <h2>{displayName}</h2>
          <div className="type-list" aria-label="Types">
            {pokemon.types.map(({ type }) => <span key={type.name} className={`type-chip type-${type.name}`}>{type.name}</span>)}
          </div>
          <p className="detail-flavor">A closer look at one of Kanto’s original inhabitants.</p>
          <div className="trainer-progress-strip" aria-live="polite">
            <span>Trainer progress</span>
            <strong>LV {trainerProfile.level}</strong>
            <small>{trainerProfile.xp} XP</small>
          </div>
          <div className="physical-facts">
            <div><span>HEIGHT</span><strong>{formatMeasure(pokemon.height, 10, "m")}</strong></div>
            <div><span>WEIGHT</span><strong>{formatMeasure(pokemon.weight, 10, "kg")}</strong></div>
            <div><span>BASE EXPERIENCE</span><strong>{pokemon.base_experience ?? "—"}</strong></div>
          </div>
          <div className="ability-line">
            <span>ABILITIES</span>
            <p>{pokemon.abilities.map(({ ability }) => capitalize(ability.name.replaceAll("-", " "))).join(" · ")}</p>
          </div>
        </div>
      </section>
      {varieties.length > 1 && (
        <nav className="form-switcher" aria-label={`${capitalize(pokemon.species.name)} forms`}>
          <div className="form-switcher-heading">
            <p className="eyebrow">SPECIES VARIANTS</p>
            <span>{varieties.length} FORMS</span>
          </div>
          <div className="form-switcher-options">
            {varieties.map((variety) => (
              variety.name === pokemon.name
                ? <span key={variety.name} className="form-switcher-option is-current" aria-current="page">{formatFormName(variety.name, pokemon.species.name)}</span>
                : <Link key={variety.name} className="form-switcher-option" to={`/pokemon/${variety.name}`}>{formatFormName(variety.name, pokemon.species.name)}</Link>
            ))}
          </div>
        </nav>
      )}
      <section className="stats-section" aria-labelledby="stats-title">
        <div className="section-heading">
          <div><p className="eyebrow">SPECIMEN ANALYSIS</p><h3 id="stats-title">Base stats</h3></div>
          <span>MAX 255</span>
        </div>
        <ul className="stat-list">
          {pokemon.stats.map(({ stat, base_stat }) => (
            <li key={stat.name}>
              <span className="stat-name">{stat.name.replaceAll("-", " ")}</span>
              <span className="stat-track"><span style={{ width: `${Math.min(100, (base_stat / 255) * 100)}%` }} /></span>
              <span className="stat-value">{String(base_stat).padStart(3, "0")}</span>
            </li>
          ))}
        </ul>
      </section>
    </article>
  );
}

export default DetailPage;