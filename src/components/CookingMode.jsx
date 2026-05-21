import { useState, useEffect } from 'react';

export default function CookingMode({ recipe, scale, onClose }) {
  const [step, setStep] = useState(0);
  const [showIngredients, setShowIngredients] = useState(true);
  const steps = recipe.steps || [];
  const ingredients = recipe.ingredients || [];
  const total = steps.length;

  useEffect(() => {
    const handle = (e) => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') setStep(s => Math.min(s + 1, total - 1));
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') setStep(s => Math.max(s - 1, 0));
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handle);
    return () => window.removeEventListener('keydown', handle);
  }, [total, onClose]);

  const cur = steps[step];
  const pct = ((step + 1) / total) * 100;

  const btn = (onClick, disabled, children, primary) => (
    <button onClick={onClick} disabled={disabled} style={{
      padding: '12px 28px', borderRadius: 9, border: primary ? 'none' : '1px solid #E8E2D8',
      background: primary ? '#C4622D' : disabled ? 'transparent' : '#fff',
      color: primary ? 'white' : disabled ? '#C8C0B4' : '#2A2520',
      fontSize: 15, fontWeight: 500, fontFamily: "'Outfit', system-ui, sans-serif",
      cursor: disabled ? 'not-allowed' : 'pointer', transition: 'all 0.15s',
      boxShadow: primary ? '0 2px 8px rgba(196,98,45,0.25)' : 'none',
    }}>
      {children}
    </button>
  );

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 200,
      background: '#F6F2EB',
      display: 'flex', flexDirection: 'column',
      fontFamily: "'Outfit', system-ui, sans-serif",
    }}>
      {/* Progress bar */}
      <div style={{ height: 3, background: '#E8E2D8', flexShrink: 0 }}>
        <div style={{ height: '100%', width: `${pct}%`, background: '#C4622D', transition: 'width 0.35s ease' }} />
      </div>

      {/* Top bar */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '14px 28px', borderBottom: '1px solid #E8E2D8', background: '#fff', flexShrink: 0,
      }}>
        <div style={{ fontSize: 15, fontWeight: 500, color: '#2A2520' }}>{recipe.title}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button onClick={() => setShowIngredients(v => !v)} style={{
            background: showIngredients ? '#F0E0D4' : '#F6F2EB',
            border: `1px solid ${showIngredients ? '#E8C4A8' : '#E8E2D8'}`,
            borderRadius: 7, color: showIngredients ? '#7A3A18' : '#8A7F75',
            fontSize: 12, fontFamily: 'inherit', padding: '6px 13px', cursor: 'pointer',
          }}>
            {showIngredients ? 'Hide Ingredients' : 'Show Ingredients'}
          </button>
          <button onClick={onClose} style={{
            background: '#F6F2EB', border: '1px solid #E8E2D8', borderRadius: 7,
            color: '#8A7F75', fontSize: 12, fontFamily: 'inherit', padding: '6px 13px', cursor: 'pointer',
          }}>
            ✕ Exit
          </button>
        </div>
      </div>

      {/* Body */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

        {/* Ingredients panel */}
        {showIngredients && (
          <div style={{
            width: 260, borderRight: '1px solid #E8E2D8', overflowY: 'auto',
            padding: '24px 20px', flexShrink: 0, background: '#fff',
          }}>
            <div style={{ fontSize: 10, letterSpacing: '0.14em', fontWeight: 700, color: '#8A7F75', textTransform: 'uppercase', marginBottom: 14 }}>
              Ingredients{scale > 1 ? ` (${scale}×)` : ''}
            </div>
            {ingredients.map((ing, i) => (
              <div key={i} style={{
                display: 'flex', gap: 10, padding: '9px 0',
                borderBottom: '1px solid #F0EBE3', fontSize: 13, lineHeight: 1.4,
              }}>
                <span style={{ color: '#C4622D', fontWeight: 600, fontSize: 12, minWidth: 60, flexShrink: 0 }}>
                  {[ing.amount, ing.unit].filter(Boolean).join(' ')}
                </span>
                <span style={{ color: '#2A2520' }}>
                  {ing.item}
                  {ing.note && <span style={{ color: '#8A7F75', fontSize: 11, display: 'block', fontStyle: 'italic' }}>{ing.note}</span>}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Step content */}
        <div style={{
          flex: 1, display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          padding: '48px 72px', textAlign: 'center', overflowY: 'auto',
        }}>
          {/* Step counter */}
          <div style={{
            fontSize: 11, letterSpacing: '0.18em', fontWeight: 700,
            color: '#8A7F75', textTransform: 'uppercase', marginBottom: 28,
          }}>
            Step {step + 1} <span style={{ color: '#C8C0B4' }}>of {total}</span>
          </div>

          {/* Step instruction — large, legible, Outfit not display font */}
          <p style={{
            fontSize: 'clamp(22px, 3vw, 34px)',
            fontWeight: 400,
            lineHeight: 1.55,
            color: '#2A2520',
            maxWidth: 680,
            marginBottom: 52,
            letterSpacing: '-0.01em',
          }}>
            {cur?.instruction}
          </p>

          {/* Step dots */}
          <div style={{ display: 'flex', gap: 6, marginBottom: 36, flexWrap: 'wrap', justifyContent: 'center' }}>
            {steps.map((_, i) => (
              <button key={i} onClick={() => setStep(i)} style={{
                width: i === step ? 28 : 8, height: 8, borderRadius: 4, border: 'none',
                cursor: 'pointer', transition: 'all 0.2s',
                background: i === step ? '#C4622D' : i < step ? '#E8C4A8' : '#D8D0C4',
              }} />
            ))}
          </div>

          {/* Nav buttons */}
          <div style={{ display: 'flex', gap: 10 }}>
            {btn(() => setStep(s => Math.max(s - 1, 0)), step === 0, '← Previous', false)}
            {step < total - 1
              ? btn(() => setStep(s => s + 1), false, 'Next →', true)
              : btn(onClose, false, '✓ Done', true)
            }
          </div>

          {/* Keyboard hint */}
          <div style={{ marginTop: 24, fontSize: 11, color: '#C8C0B4', letterSpacing: '0.04em' }}>
            Use ← → arrow keys to navigate
          </div>
        </div>
      </div>
    </div>
  );
}
