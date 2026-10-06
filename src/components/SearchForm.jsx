function SearchForm({ query, onQueryChange }) {
   return (
      <form className="search-form" role="search" onSubmit={(event) => event.preventDefault()}>
         <label className="search-label" htmlFor="pokemon-search">Search the Pokédex</label>
         <span className="search-icon" aria-hidden="true">⌕</span>
         <input
            id="pokemon-search"
            type="search"
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder="Name or Pokédex number"
            className="search-input"
            autoComplete="off"
         />
         {query && (
            <button className="clear-search" type="button" onClick={() => onQueryChange("")} aria-label="Clear search">
               ×
            </button>
         )}
      </form>
   );
}

export default SearchForm;