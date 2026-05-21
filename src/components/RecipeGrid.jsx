import RecipeCard from './RecipeCard';

const IconSearch = () => (
  <svg className="search-icon" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
  </svg>
);

const Skeleton = () => (
  <div className="skeleton">
    <div className="skeleton-img" />
    <div className="skeleton-body">
      <div className="skeleton-line" style={{ width: '75%', height: 20, marginBottom: 10 }} />
      <div className="skeleton-line short" />
      <div className="skeleton-line shorter" />
    </div>
  </div>
);

export default function RecipeGrid({ recipes, loading, searchQuery, onSearchChange, onAddRecipe, onSelectRecipe, selectedCollection, isConfigured }) {
  return (
    <>
      <div className="recipe-header">
        <h2>{selectedCollection}</h2>
        <div className="search-box">
          <IconSearch />
          <input
            value={searchQuery}
            onChange={e => onSearchChange(e.target.value)}
            placeholder="Search recipes, tags…"
          />
        </div>
        <button className="add-btn" onClick={onAddRecipe} disabled={!isConfigured}>
          <span style={{ fontSize: 18, lineHeight: 1 }}>+</span>
          Add Recipe
        </button>
      </div>

      {loading ? (
        <div className="loading-grid">
          {[...Array(6)].map((_, i) => <Skeleton key={i} />)}
        </div>
      ) : (
        <div className="recipe-grid">
          {recipes.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">🍽</div>
              <h3>{searchQuery ? 'No recipes found' : 'Your vault is empty'}</h3>
              <p>{searchQuery ? 'Try a different search term or tag.' : 'Paste a recipe URL to get started.'}</p>
            </div>
          ) : (
            recipes.map(recipe => (
              <RecipeCard key={recipe.id} recipe={recipe} onClick={() => onSelectRecipe(recipe)} />
            ))
          )}
        </div>
      )}
    </>
  );
}
