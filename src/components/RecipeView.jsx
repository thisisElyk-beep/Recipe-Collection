import { useState } from 'react';

export default function RecipeView({ recipe, collections, onClose, onUpdate, onDelete }) {
  const [imgError, setImgError] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const { id, title, description, image_url, prep_time, cook_time, total_time, servings,
    ingredients = [], steps = [], tags = [], source_url, favorited, collection: recipeCollection } = recipe;

  const handleFavorite = () => onUpdate(id, { favorited: !favorited });
  const handleCollectionChange = (e) => onUpdate(id, { collection: e.target.value });
  const handleDelete = () => {
    if (confirmDelete) { onDelete(id); }
    else { setConfirmDelete(true); setTimeout(() => setConfirmDelete(false), 3000); }
  };

  const formatIngredient = (ing) => {
    const parts = [ing.amount, ing.unit].filter(Boolean).join(' ');
    return { amount: parts, item: ing.item, note: ing.note };
  };

  return (
    <div className="recipe-overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="recipe-view">
        <div className="rv-topbar">
          <button className="rv-back" onClick={onClose}>
            ← Back
          </button>

          <div className="rv-actions">
            <select className="rv-select" value={recipeCollection || 'All Recipes'} onChange={handleCollectionChange}>
              {collections.filter(c => c !== 'Favorites').map(c => (
                <option key={c}>{c}</option>
              ))}
            </select>

            <button
              className={`rv-icon-btn ${favorited ? 'fav-active' : ''}`}
              onClick={handleFavorite}
              title={favorited ? 'Unfavorite' : 'Favorite'}
            >
              {favorited ? '♥' : '♡'}
            </button>

            <button
              className={`rv-icon-btn danger`}
              onClick={handleDelete}
              title={confirmDelete ? 'Click again to confirm' : 'Delete recipe'}
              style={confirmDelete ? { color: '#C0392B', borderColor: '#FADBD8', background: '#FDEDEC' } : {}}
            >
              {confirmDelete ? '?' : '🗑'}
            </button>
          </div>
        </div>

        {image_url && !imgError && (
          <img className="rv-hero-image" src={image_url} alt={title} onError={() => setImgError(true)} />
        )}

        <div className="rv-content">
          <h1 className="rv-title">{title}</h1>
          {description && <p className="rv-description">{description}</p>}

          <div className="rv-meta-row">
            {prep_time && (
              <div className="rv-meta-item">
                <span className="rv-meta-label">Prep</span>
                <span className="rv-meta-value">{prep_time}</span>
              </div>
            )}
            {cook_time && (
              <div className="rv-meta-item">
                <span className="rv-meta-label">Cook</span>
                <span className="rv-meta-value">{cook_time}</span>
              </div>
            )}
            {total_time && (
              <div className="rv-meta-item">
                <span className="rv-meta-label">Total</span>
                <span className="rv-meta-value">{total_time}</span>
              </div>
            )}
            {servings && (
              <div className="rv-meta-item">
                <span className="rv-meta-label">Serves</span>
                <span className="rv-meta-value">{servings}</span>
              </div>
            )}
          </div>

          {tags.length > 0 && (
            <div className="rv-tags">
              {tags.map(tag => <span key={tag} className="tag">{tag}</span>)}
            </div>
          )}

          <div className="rv-columns">
            <div>
              <div className="rv-section-title">Ingredients</div>
              <ul className="rv-ingredients">
                {ingredients.map((ing, i) => {
                  const { amount, item, note } = formatIngredient(ing);
                  return (
                    <li key={i} className="rv-ingredient">
                      <span className="rv-ing-amount">{amount}</span>
                      <span className="rv-ing-item">
                        {item}
                        {note && <div className="rv-ing-note">{note}</div>}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>

            <div>
              <div className="rv-section-title">Instructions</div>
              <ol className="rv-steps">
                {steps.map((step, i) => (
                  <li key={i} className="rv-step">
                    <span className="rv-step-num">{step.number || i + 1}</span>
                    <p className="rv-step-text">{step.instruction}</p>
                  </li>
                ))}
              </ol>
            </div>
          </div>

          {source_url && (
            <div className="rv-source">
              Source: <a href={source_url} target="_blank" rel="noopener noreferrer">{source_url}</a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
