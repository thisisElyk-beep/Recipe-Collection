import { useState } from 'react';

const COLLECTION_ICONS = { 'All Recipes': '◈', 'Favorites': '♡' };
const SYSTEM_COLS = new Set(['All Recipes', 'Favorites']);
const DEFAULT_TAG_LIMIT = 8;

export default function Sidebar({ collections, selectedCollection, onSelectCollection, allTags, selectedTags, onToggleTag, onAddCollection, onDeleteCollection, onOpenSettings, recipes }) {
  const [addingCollection, setAddingCollection] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState('');
  const [hoverCol, setHoverCol] = useState(null);
  const [showAllTags, setShowAllTags] = useState(false);
  const [tagsExpanded, setTagsExpanded] = useState(true);

  const handleAddCollection = () => {
    const name = newCollectionName.trim();
    if (name && !collections.includes(name)) onAddCollection(name);
    setNewCollectionName('');
    setAddingCollection(false);
  };

  const colCount = (col) => {
    if (col === 'All Recipes') return recipes.length;
    if (col === 'Favorites') return recipes.filter(r => r.favorited).length;
    return recipes.filter(r => r.collection === col).length;
  };

  // Sort tags by frequency descending
  const tagFrequency = allTags.reduce((acc, tag) => {
    acc[tag] = recipes.filter(r => (r.tags || []).includes(tag)).length;
    return acc;
  }, {});
  const sortedTags = [...allTags].sort((a, b) => (tagFrequency[b] || 0) - (tagFrequency[a] || 0));
  const visibleTags = showAllTags ? sortedTags : sortedTags.slice(0, DEFAULT_TAG_LIMIT);
  const hiddenCount = sortedTags.length - DEFAULT_TAG_LIMIT;

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <h1>VAULT</h1>
        <span>Recipe Collection</span>
      </div>

      {/* Collections */}
      <div className="sidebar-section">
        <div className="sidebar-label">Collections</div>
        {collections.map(col => (
          <div
            key={col}
            className={`sidebar-item ${selectedCollection === col ? 'active' : ''}`}
            onClick={() => onSelectCollection(col)}
            onMouseEnter={() => setHoverCol(col)}
            onMouseLeave={() => setHoverCol(null)}
            style={{ position: 'relative' }}
          >
            <span style={{ fontSize: 13, opacity: 0.7 }}>{COLLECTION_ICONS[col] || '○'}</span>
            <span style={{ flex: 1 }}>{col}</span>
            <span className="sidebar-item-count">{colCount(col)}</span>

            {/* Delete button — only on custom collections, on hover */}
            {!SYSTEM_COLS.has(col) && hoverCol === col && (
              <button
                onClick={e => { e.stopPropagation(); onDeleteCollection(col); }}
                title={`Delete "${col}"`}
                style={{
                  position: 'absolute', right: 28, top: '50%', transform: 'translateY(-50%)',
                  background: 'rgba(255,255,255,0.08)', border: 'none', borderRadius: 4,
                  color: '#8A7F75', cursor: 'pointer', fontSize: 12, width: 18, height: 18,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'all 0.15s', padding: 0, lineHeight: 1,
                }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(200,80,80,0.25)'; e.currentTarget.style.color = '#E88080'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; e.currentTarget.style.color = '#8A7F75'; }}
              >
                ×
              </button>
            )}
          </div>
        ))}

        {addingCollection ? (
          <div className="add-collection-row">
            <input
              autoFocus
              value={newCollectionName}
              onChange={e => setNewCollectionName(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') handleAddCollection();
                if (e.key === 'Escape') setAddingCollection(false);
              }}
              placeholder="Collection name…"
            />
            <button onClick={handleAddCollection}>+</button>
          </div>
        ) : (
          <div className="sidebar-item" style={{ opacity: 0.4 }} onClick={() => setAddingCollection(true)}>
            <span style={{ fontSize: 13 }}>+</span>
            New Collection
          </div>
        )}
      </div>

      {/* Tags */}
      {sortedTags.length > 0 && (
        <div className="sidebar-section">
          <div
            className="sidebar-label"
            onClick={() => setTagsExpanded(v => !v)}
            style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingRight: 14 }}
          >
            <span>Tags</span>
            <span style={{ fontSize: 10, opacity: 0.6, transition: 'transform 0.2s', display: 'inline-block', transform: tagsExpanded ? 'rotate(0deg)' : 'rotate(-90deg)' }}>▾</span>
          </div>

          {tagsExpanded && (
            <>
              {selectedTags.length > 0 && (
                <div style={{ padding: '0 14px 6px', display: 'flex', justifyContent: 'flex-end' }}>
                  <button
                    onClick={() => selectedTags.forEach(t => onToggleTag(t))}
                    style={{ fontSize: 10, color: '#C4622D', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', opacity: 0.8 }}
                  >
                    Clear filters
                  </button>
                </div>
              )}
              <div className="sidebar-tags">
                {visibleTags.map(tag => (
                  <span
                    key={tag}
                    className={`sidebar-tag ${selectedTags.includes(tag) ? 'active' : ''}`}
                    onClick={() => onToggleTag(tag)}
                    title={`${tagFrequency[tag]} recipe${tagFrequency[tag] !== 1 ? 's' : ''}`}
                  >
                    {tag}
                  </span>
                ))}
                {!showAllTags && hiddenCount > 0 && (
                  <span
                    className="sidebar-tag"
                    onClick={() => setShowAllTags(true)}
                    style={{ opacity: 0.5, fontStyle: 'italic' }}
                  >
                    +{hiddenCount} more
                  </span>
                )}
                {showAllTags && sortedTags.length > DEFAULT_TAG_LIMIT && (
                  <span
                    className="sidebar-tag"
                    onClick={() => setShowAllTags(false)}
                    style={{ opacity: 0.5, fontStyle: 'italic' }}
                  >
                    Show less
                  </span>
                )}
              </div>
            </>
          )}
        </div>
      )}

      <div className="sidebar-bottom">
        <button className="sidebar-btn" onClick={onOpenSettings}>
          <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="3"/>
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
          </svg>
          Settings
        </button>
      </div>
    </aside>
  );
}
