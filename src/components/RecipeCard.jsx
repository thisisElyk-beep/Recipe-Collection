import { useState } from 'react';

function formatTime(t) {
  if (!t) return null;
  return t;
}

export default function RecipeCard({ recipe, onClick }) {
  const [imgError, setImgError] = useState(false);
  const { title, image_url, total_time, cook_time, servings, tags = [], favorited } = recipe;

  const displayTime = formatTime(total_time || cook_time);

  return (
    <div className="recipe-card" onClick={onClick}>
      {image_url && !imgError ? (
        <img
          className="card-image"
          src={image_url}
          alt={title}
          onError={() => setImgError(true)}
        />
      ) : (
        <div className="card-image-placeholder">🍴</div>
      )}
      <div className="card-body">
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 6 }}>
          <div className="card-title">{title}</div>
          {favorited && <span className="card-fav active" title="Favorited">♥</span>}
        </div>
        <div className="card-meta">
          {displayTime && <span>⏱ {displayTime}</span>}
          {servings && <span>🍽 {servings}</span>}
        </div>
        <div className="card-tags">
          {tags.slice(0, 3).map(tag => (
            <span key={tag} className="tag">{tag}</span>
          ))}
          {tags.length > 3 && <span className="tag" style={{ opacity: 0.6 }}>+{tags.length - 3}</span>}
        </div>
      </div>
    </div>
  );
}
