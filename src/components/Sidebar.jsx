import { useState } from 'react';

const IconSettings = () => (
  <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
    <circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
  </svg>
);

const COLLECTION_ICONS = {
  'All Recipes': '◈',
  'Favorites': '♡',
};

export default function Sidebar({ collections, selectedCollection, onSelectCollection, allTags, selectedTags, onToggleTag, onAddCollection, onOpenSettings, recipes }) {
  const [addingCollection, setAddingCollection] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState('');

  const handleAddCollection = () => {
    const name = newCollectionName.trim();
    if (name && !collections.includes(name)) {
      onAddCollection(name);
    }
    setNewCollectionName('');
    setAddingCollection(false);
  };

  const collectionCount = (col) => {
    if (col === 'All Recipes') return recipes.length;
    if (col === 'Favorites') return recipes.filter(r => r.favorited).length;
    return recipes.filter(r => r.collection === col).length;
  };

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <h1>VAULT</h1>
        <span>Recipe Collection</span>
      </div>

      <div className="sidebar-section">
        <div className="sidebar-label">Collections</div>
        {collections.map(col => (
          <div
            key={col}
            className={`sidebar-item ${selectedCollection === col ? 'active' : ''}`}
            onClick={() => onSelectCollection(col)}
          >
            <span style={{ fontSize: 13, opacity: 0.7 }}>{COLLECTION_ICONS[col] || '○'}</span>
            {col}
            <span className="sidebar-item-count">{collectionCount(col)}</span>
          </div>
        ))}

        {addingCollection ? (
          <div className="add-collection-row">
            <input
              autoFocus
              value={newCollectionName}
              onChange={e => setNewCollectionName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleAddCollection(); if (e.key === 'Escape') setAddingCollection(false); }}
              placeholder="Collection name…"
            />
            <button onClick={handleAddCollection}>+</button>
          </div>
        ) : (
          <div className="sidebar-item" style={{ opacity: 0.5 }} onClick={() => setAddingCollection(true)}>
            <span style={{ fontSize: 13 }}>+</span>
            New Collection
          </div>
        )}
      </div>

      {allTags.length > 0 && (
        <div className="sidebar-section">
          <div className="sidebar-label">Tags</div>
          <div className="sidebar-tags">
            {allTags.map(tag => (
              <span
                key={tag}
                className={`sidebar-tag ${selectedTags.includes(tag) ? 'active' : ''}`}
                onClick={() => onToggleTag(tag)}
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="sidebar-bottom">
        <button className="sidebar-btn" onClick={onOpenSettings}>
          <IconSettings />
          Settings
        </button>
      </div>
    </aside>
  );
}
