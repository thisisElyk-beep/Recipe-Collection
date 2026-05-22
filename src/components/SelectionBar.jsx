import { useState } from 'react';

export default function SelectionBar({ count, collections, onMove, onSelectAll, onClear, onCancel, totalVisible }) {
  const [targetCollection, setTargetCollection] = useState('All Recipes');
  const [moving, setMoving] = useState(false);

  const handleMove = async () => {
    if (count === 0) return;
    setMoving(true);
    await onMove(targetCollection);
    setMoving(false);
  };

  return (
    <div style={{
      position: 'fixed', bottom: 24, left: 'calc(256px + (100vw - 256px) / 2)', transform: 'translateX(-50%)',
      background: '#2A2520',
      borderRadius: 14,
      padding: '14px 20px',
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      boxShadow: '0 8px 32px rgba(0,0,0,0.28)',
      zIndex: 20,
      flexWrap: 'wrap',
      justifyContent: 'center',
      maxWidth: 'calc(100% - 48px)',
      animation: 'slideUp 0.2s ease',
    }}>
      <style>{`@keyframes slideUp { from { transform: translateX(-50%) translateY(16px); opacity: 0; } to { transform: translateX(-50%) translateY(0); opacity: 1; } }`}</style>

      {/* Count + select/clear all */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
        <span style={{ color: '#F0EBE3', fontSize: 13, fontWeight: 600 }}>
          {count} selected
        </span>
        <button
          onClick={count === totalVisible ? onClear : onSelectAll}
          style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: 6, color: '#C8C0B4', fontSize: 11, fontFamily: 'var(--font-body)', padding: '3px 9px', cursor: 'pointer' }}>
          {count === totalVisible ? 'Clear all' : 'Select all'}
        </button>
      </div>

      <div style={{ width: 1, height: 24, background: 'rgba(255,255,255,0.12)', flexShrink: 0 }} />

      {/* Move to collection */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
        <span style={{ color: '#8A7F75', fontSize: 12 }}>Move to</span>
        <select
          value={targetCollection}
          onChange={e => setTargetCollection(e.target.value)}
          style={{
            background: 'rgba(255,255,255,0.10)', border: '1px solid rgba(255,255,255,0.15)',
            borderRadius: 7, color: '#F0EBE3', fontSize: 12, fontFamily: 'var(--font-body)',
            padding: '5px 10px', cursor: 'pointer', outline: 'none',
          }}>
          {collections.filter(c => c !== 'Favorites').map(c => (
            <option key={c} value={c} style={{ background: '#2A2520' }}>{c}</option>
          ))}
        </select>

        <button
          onClick={handleMove}
          disabled={count === 0 || moving}
          style={{
            padding: '6px 16px', borderRadius: 7, border: 'none',
            background: count === 0 ? 'rgba(196,98,45,0.3)' : '#C4622D',
            color: count === 0 ? 'rgba(255,255,255,0.4)' : 'white',
            fontSize: 12, fontWeight: 600, fontFamily: 'var(--font-body)',
            cursor: count === 0 ? 'not-allowed' : 'pointer', transition: 'all 0.15s',
          }}>
          {moving ? 'Moving…' : 'Move'}
        </button>
      </div>

      <div style={{ width: 1, height: 24, background: 'rgba(255,255,255,0.12)', flexShrink: 0 }} />

      {/* Cancel */}
      <button
        onClick={onCancel}
        style={{
          background: 'transparent', border: 'none', color: '#6B635A',
          fontSize: 12, fontFamily: 'var(--font-body)', cursor: 'pointer', padding: '4px 6px',
          flexShrink: 0,
        }}>
        Cancel
      </button>
    </div>
  );
}
