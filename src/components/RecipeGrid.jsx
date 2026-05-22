import { useState, useRef } from 'react';
import RecipeCard from './RecipeCard';

const IconSearch = () => (
  <svg style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }}
    width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
  </svg>
);

const Skeleton = () => (
  <div style={{ background: '#fff', borderRadius: 9, border: '1px solid #E8E2D8', overflow: 'hidden' }}>
    <div style={{ height: 180, background: 'linear-gradient(90deg,#EDE8E0 25%,#E4DDD3 50%,#EDE8E0 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.5s infinite' }} />
    <div style={{ padding: '14px 16px 16px' }}>
      <div style={{ height: 20, borderRadius: 4, background: 'linear-gradient(90deg,#EDE8E0 25%,#E4DDD3 50%,#EDE8E0 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.5s infinite', marginBottom: 8, width: '75%' }} />
      <div style={{ height: 14, borderRadius: 4, background: 'linear-gradient(90deg,#EDE8E0 25%,#E4DDD3 50%,#EDE8E0 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.5s infinite', width: '50%' }} />
    </div>
  </div>
);

const SYSTEM_COLS = new Set(['All Recipes', 'Favorites']);

export default function RecipeGrid({
  recipes, loading, searchQuery, onSearchChange, onAddRecipe,
  onSelectRecipe, selectedCollection, isConfigured,
  selectMode, selectedIds, onToggleSelect, onToggleSelectMode,
  onRenameCollection
}) {
  const [editing, setEditing] = useState(false);
  const [draftName, setDraftName] = useState('');
  const [hovering, setHovering] = useState(false);
  const inputRef = useRef(null);
  const isCustom = !SYSTEM_COLS.has(selectedCollection);

  const startEdit = () => {
    if (!isCustom) return;
    setDraftName(selectedCollection);
    setEditing(true);
    setTimeout(() => inputRef.current?.select(), 30);
  };

  const commitEdit = () => {
    const name = draftName.trim();
    if (name && name !== selectedCollection) {
      onRenameCollection(selectedCollection, name);
    }
    setEditing(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') commitEdit();
    if (e.key === 'Escape') setEditing(false);
  };

  return (
    <>
      <div style={{
        padding: '14px 28px 12px', display: 'flex', alignItems: 'center', gap: 12,
        position: 'sticky', top: 0, background: 'var(--bg)', zIndex: 5,
        borderBottom: '1px solid var(--border)',
      }}>
        {editing ? (
          <input
            ref={inputRef}
            value={draftName}
            onChange={e => setDraftName(e.target.value)}
            onBlur={commitEdit}
            onKeyDown={handleKeyDown}
            style={{
              fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 500,
              border: 'none', borderBottom: '2px solid var(--accent)',
              background: 'transparent', outline: 'none', color: 'var(--text)',
              padding: '0 2px', minWidth: 80, maxWidth: 280,
            }}
          />
        ) : (
          <h2
            onMouseEnter={() => setHovering(true)}
            onMouseLeave={() => setHovering(false)}
            onClick={startEdit}
            style={{
              fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 500,
              flexShrink: 0, display: 'flex', alignItems: 'center', gap: 6,
              cursor: isCustom ? 'text' : 'default',
            }}
          >
            {selectedCollection}
            {isCustom && hovering && (
              <span style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: 'var(--font-body)', fontWeight: 400, opacity: 0.7 }}>
                ✎
              </span>
            )}
          </h2>
        )}
        <div style={{ flex: 1, position: 'relative' }}>
          <IconSearch />
          <input
            value={searchQuery}
            onChange={e => onSearchChange(e.target.value)}
            placeholder="Search recipes, tags…"
            style={{ width: '100%', padding: '7px 10px 7px 32px', borderRadius: 7, border: '1px solid var(--border)', background: '#fff', fontSize: 13, fontFamily: 'var(--font-body)', color: 'var(--text)', outline: 'none' }}
          />
        </div>

        <button
          onClick={onToggleSelectMode}
          style={{
            padding: '7px 14px', borderRadius: 7, fontSize: 13, fontWeight: 500,
            fontFamily: 'var(--font-body)', cursor: 'pointer', transition: 'all 0.15s',
            border: selectMode ? 'none' : '1px solid var(--border)',
            background: selectMode ? 'var(--accent)' : 'var(--surface)',
            color: selectMode ? 'white' : 'var(--text-muted)',
            flexShrink: 0,
          }}>
          {selectMode ? `${selectedIds.size} selected` : 'Select'}
        </button>

        <button
          onClick={onAddRecipe}
          style={{
            display: 'flex', alignItems: 'center', gap: 5, padding: '7px 16px',
            background: 'var(--accent)', color: 'white', border: 'none', borderRadius: 7,
            fontSize: 13, fontWeight: 500, fontFamily: 'var(--font-body)', cursor: 'pointer',
            whiteSpace: 'nowrap', flexShrink: 0,
          }}>
          + Add
        </button>
      </div>

      {loading ? (
        <div style={{ padding: '14px 28px', display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(220px,1fr))', gap: 16 }}>
          {[...Array(6)].map((_, i) => <Skeleton key={i} />)}
        </div>
      ) : (
        <div style={{ padding: '14px 28px 40px', display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(220px,1fr))', gap: 16, alignContent: 'start' }}>
          {recipes.length === 0 ? (
            <div style={{ gridColumn: '1/-1', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '60px 20px', gap: 10, textAlign: 'center' }}>
              <div style={{ fontSize: 40, opacity: 0.25 }}>🍽</div>
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 20, color: 'var(--text-muted)' }}>
                {searchQuery ? 'No results' : 'Nothing here yet'}
              </h3>
              <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                {searchQuery ? 'Try a different search.' : 'Click "+ Add" to get started.'}
              </p>
            </div>
          ) : recipes.map(recipe => (
            <RecipeCard
              key={recipe.id}
              recipe={recipe}
              selectMode={selectMode}
              selected={selectedIds.has(recipe.id)}
              onToggleSelect={() => onToggleSelect(recipe.id)}
              onClick={() => { if (selectMode) onToggleSelect(recipe.id); else onSelectRecipe(recipe); }}
            />
          ))}
        </div>
      )}
    </>
  );
}
