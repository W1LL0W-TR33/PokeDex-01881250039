function ImageModeControl({ mode, onChange, className = "" }) {
	return (
		<div className={`image-mode ${className}`.trim()} role="group" aria-label="Pokémon image style">
			<button
				type="button"
				className={mode === "artwork" ? "is-selected" : ""}
				aria-pressed={mode === "artwork"}
				onClick={() => onChange("artwork")}
			>
				Art
			</button>
			<button
				type="button"
				className={mode === "animation" ? "is-selected" : ""}
				aria-pressed={mode === "animation"}
				onClick={() => onChange("animation")}
			>
				Animation
			</button>
		</div>
	);
}

export default ImageModeControl;