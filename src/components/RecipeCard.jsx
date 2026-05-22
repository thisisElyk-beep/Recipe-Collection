import { useState } from 'react';

export default function RecipeCard({ recipe, onClick, selectMode, selected, onToggleSelect }) {
  const [imgError, setImgError] = useState(false);
  const { title, image_url, total_time, cook_time, servings, tags = [], favorited } = recipe;
  const displayTime = total_time || cook_time;

  return (
    <div
      onClick={onClick}
      style={{
        background: '#fff',
        borderRadius: 9,
        overflow: 'hidden',
        cursor: 'pointer',
        border: selected ? '2px solid var(--accent)' : '1px solid var(--border)',
        transition: 'transform 0.15s, box-shadow 0.15s, border-color 0.15s',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        transform: selected ? 'scale(0.98)' : undefined,
        boxShadow: selected ? '0 0 0 3px var(--accent-light)' : undefined,
      }}
      onMouseEnter={e => { if (!selected) e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = selected ? '0 0 0 3px var(--accent-light)' : '0 4px 14px rgba(42,37,32,.10)'; }}
      onMouseLeave={e => { e.currentTarget.style.transform = selected ? 'scale(0.98)' : ''; e.currentTarget.style.boxShadow = selected ? '0 0 0 3px var(--accent-light)' : ''; }}
    >
      {/* Checkbox in select mode */}
      {selectMode && (
        <div
          onClick={e => { e.stopPropagation(); onToggleSelect(); }}
          style={{
            position: 'absolute', top: 10, left: 10, zIndex: 2,
            width: 22, height: 22, borderRadius: 6,
            background: selected ? 'var(--accent)' : 'rgba(255,255,255,0.92)',
            border: selected ? '2px solid var(--accent)' : '2px solid rgba(0,0,0,0.2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'all 0.15s', backdropFilter: 'blur(2px)',
            boxShadow: '0 1px 4px rgba(0,0,0,0.15)',
          }}>
          {selected && <span style={{ color: 'white', fontSize: 13, fontWeight: 700, lineHeight: 1 }}>✓</span>}
        </div>
      )}

      {image_url && !imgError ? (
        <img src={image_url} alt={title} onError={() => setImgError(true)}
          style={{ width: '100%', height: 160, objectFit: 'cover', display: 'block' }} />
      ) : (
        <div style={{ width: '100%', height: 160, background: 'linear-gradient(135deg,#EDE8E0,#E0D8CC)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 36, color: '#C0B8B0' }}>🍴</div>
      )}

      <div style={{ padding: '12px 14px 14px', flex: 1, display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 6, marginBottom: 5 }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 17, fontWeight: 500, lineHeight: 1.25, color: 'var(--text)' }}>{title}</div>
          {favorited && !selectMode && <span style={{ color: 'var(--accent)', fontSize: 13, flexShrink: 0 }}>♥</span>}
        </div>
        <div style={{ display: 'flex', gap: 10, fontSize: 11, color: 'var(--text-muted)', marginBottom: 8 }}>
          {displayTime && <span>⏱ {displayTime}</span>}
          {servings && <span>🍽 {servings}</span>}
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3, marginTop: 'auto' }}>
          {tags.slice(0, 3).map(t => (
            <span key={t} style={{ fontSize: 9, padding: '1px 6px', borderRadius: 20, background: 'var(--tag-bg)', color: 'var(--tag-text)', fontWeight: 500 }}>{t}</span>
          ))}
          {tags.length > 3 && <span style={{ fontSize: 9, padding: '1px 6px', borderRadius: 20, background: 'var(--tag-bg)', color: 'var(--tag-text)', opacity: 0.6 }}>+{tags.length - 3}</span>}
        </div>
      </div>
    </div>
  );
}
