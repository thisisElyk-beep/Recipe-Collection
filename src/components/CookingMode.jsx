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

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 200,
      background: '#121010', color: '#F0EBE3',
      display: 'flex', flexDirection: 'column',
      fontFamily: "'Outfit', system-ui, sans-serif",
    }}>
      {/* Progress bar */}
      <div style={{ height: 3, background: 'rgba(255,255,255,0.1)' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: '#C4622D', transition: 'width 0.3s ease' }} />
      </div>

      {/* Top bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 24px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        <div style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: 18, opacity: 0.7, fontWeight: 500 }}>{recipe.title}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={() => setShowIngredients(v => !v)} style={{ background: showIngredients ? 'rgba(196,98,45,0.2)' : 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 7, color: showIngredients ? '#E8B898' : '#8A7F75', fontSize: 12, fontFamily: 'inherit', padding: '6px 12px', cursor: 'pointer' }}>
            {showIngredients ? '☰ Hide Ingredients' : '☰ Show Ingredients'}
          </button>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 7, color: '#8A7F75', fontSize: 12, fontFamily: 'inherit', padding: '6px 12px', cursor: 'pointer' }}>
            ✕ Exit
          </button>
        </div>
      </div>

      {/* Main content */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

        {/* Ingredients panel */}
        {showIngredients && (
          <div style={{ width: 260, borderRight: '1px solid rgba(255,255,255,0.08)', overflowY: 'auto', padding: '24px 20px', flexShrink: 0 }}>
            <div style={{ fontSize: 10, letterSpacing: '0.14em', fontWeight: 600, color: '#6B635A', textTransform: 'uppercase', marginBottom: 16 }}>Ingredients {scale > 1 ? `(${scale}×)` : ''}</div>
            {ingredients.map((ing, i) => (
              <div key={i} style={{ display: 'flex', gap: 10, padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.06)', fontSize: 13 }}>
                <span style={{ color: '#C4622D', fontWeight: 600, fontSize: 12, minWidth: 56, flexShrink: 0 }}>
                  {ing.amount || ing.unit ? `${ing.amount || ''} ${ing.unit || ''}`.trim() : ''}
                </span>
                <span style={{ color: '#C8C0B4', lineHeight: 1.4 }}>{ing.item}{ing.note ? <span style={{ color: '#6B635A', fontSize: 11, display: 'block' }}>{ing.note}</span> : ''}</span>
              </div>
            ))}
          </div>
        )}

        {/* Step */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 60px', textAlign: 'center' }}>
          <div style={{ fontSize: 13, letterSpacing: '0.16em', fontWeight: 600, color: '#6B635A', textTransform: 'uppercase', marginBottom: 24 }}>
            Step {step + 1} <span style={{ color: '#3A3530' }}>of {total}</span>
          </div>

          <div style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: 'clamp(24px, 4vw, 42px)', fontWeight: 400, lineHeight: 1.4, color: '#F0EBE3', maxWidth: 720, marginBottom: 48 }}>
            {cur?.instruction}
          </div>

          {/* Step dots */}
          <div style={{ display: 'flex', gap: 6, marginBottom: 40 }}>
            {steps.map((_, i) => (
              <button key={i} onClick={() => setStep(i)} style={{ width: i === step ? 24 : 8, height: 8, borderRadius: 4, border: 'none', cursor: 'pointer', transition: 'all 0.2s', background: i === step ? '#C4622D' : i < step ? 'rgba(196,98,45,0.4)' : 'rgba(255,255,255,0.12)' }} />
            ))}
          </div>

          {/* Nav buttons */}
          <div style={{ display: 'flex', gap: 12 }}>
            <button onClick={() => setStep(s => Math.max(s - 1, 0))} disabled={step === 0} style={{ padding: '14px 32px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.06)', color: step === 0 ? '#3A3530' : '#C8C0B4', fontSize: 15, fontFamily: 'inherit', cursor: step === 0 ? 'not-allowed' : 'pointer', transition: 'all 0.15s' }}>
              ← Previous
            </button>
            {step < total - 1 ? (
              <button onClick={() => setStep(s => s + 1)} style={{ padding: '14px 32px', borderRadius: 10, border: 'none', background: '#C4622D', color: 'white', fontSize: 15, fontWeight: 500, fontFamily: 'inherit', cursor: 'pointer', transition: 'all 0.15s' }}>
                Next →
              </button>
            ) : (
              <button onClick={onClose} style={{ padding: '14px 32px', borderRadius: 10, border: 'none', background: '#2A5C3A', color: '#A8D4B4', fontSize: 15, fontWeight: 500, fontFamily: 'inherit', cursor: 'pointer' }}>
                ✓ Done
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
