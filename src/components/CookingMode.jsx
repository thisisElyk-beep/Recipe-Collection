import { useState, useEffect } from 'react';

// Match ingredients mentioned in the current step's instruction text
function getRelevantIngredients(ingredients, instruction) {
  if (!instruction) return ingredients;
  const text = instruction.toLowerCase();

  const matched = ingredients.filter(ing => {
    if (!ing.item) return false;
    // Split into meaningful words (skip short filler words)
    const words = ing.item.toLowerCase()
      .replace(/[^a-z\s]/g, '')
      .split(/\s+/)
      .filter(w => w.length > 2 && !['and','the','for','with','from'].includes(w));
    return words.some(w => text.includes(w));
  });

  // If nothing matched, show all so the panel is never empty
  return matched.length > 0 ? matched : ingredients;
}

export default function CookingMode({ recipe, scale, onClose }) {
  const [step, setStep] = useState(0);
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
  const relevant = getRelevantIngredients(ingredients, cur?.instruction);
  const allMatched = relevant.length === ingredients.length;

  const NavBtn = ({ onClick, disabled, children, primary }) => (
    <button onClick={onClick} disabled={disabled} style={{
      padding: '13px 32px', borderRadius: 9,
      border: primary ? 'none' : '1px solid #E8E2D8',
      background: primary ? '#C4622D' : disabled ? 'transparent' : '#fff',
      color: primary ? 'white' : disabled ? '#C8C0B4' : '#2A2520',
      fontSize: 16, fontWeight: 500, fontFamily: "'Outfit', system-ui, sans-serif",
      cursor: disabled ? 'not-allowed' : 'pointer', transition: 'all 0.15s',
      boxShadow: primary ? '0 2px 10px rgba(196,98,45,0.3)' : 'none',
    }}>
      {children}
    </button>
  );

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 200,
      background: '#F6F2EB', display: 'flex', flexDirection: 'column',
      fontFamily: "'Outfit', system-ui, sans-serif",
    }}>
      {/* Progress bar */}
      <div style={{ height: 3, background: '#E8E2D8', flexShrink: 0 }}>
        <div style={{ height: '100%', width: `${pct}%`, background: '#C4622D', transition: 'width 0.35s ease' }} />
      </div>

      {/* Top bar */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '14px 28px', borderBottom: '1px solid #E8E2D8',
        background: '#fff', flexShrink: 0,
      }}>
        <div style={{ fontSize: 15, fontWeight: 600, color: '#2A2520' }}>{recipe.title}</div>
        <button onClick={onClose} style={{
          background: '#F6F2EB', border: '1px solid #E8E2D8', borderRadius: 7,
          color: '#8A7F75', fontSize: 12, fontFamily: 'inherit',
          padding: '6px 13px', cursor: 'pointer',
        }}>
          ✕ Exit Cook Mode
        </button>
      </div>

      {/* Body */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

        {/* Ingredients panel */}
        <div style={{
          width: 300, borderRight: '1px solid #E8E2D8', overflowY: 'auto',
          padding: '28px 24px', flexShrink: 0, background: '#fff',
        }}>
          <div style={{
            fontSize: 10, letterSpacing: '0.16em', fontWeight: 700,
            color: '#8A7F75', textTransform: 'uppercase', marginBottom: 4,
          }}>
            {allMatched ? 'All Ingredients' : 'This Step'}
            {scale > 1 && <span style={{ color: '#C4622D', marginLeft: 6 }}>{scale}×</span>}
          </div>
          <div style={{ fontSize: 11, color: '#C8C0B4', marginBottom: 20 }}>
            {allMatched ? `${ingredients.length} ingredients` : `${relevant.length} of ${ingredients.length} ingredients`}
          </div>

          {relevant.map((ing, i) => (
            <div key={i} style={{
              padding: '14px 16px', marginBottom: 8,
              background: '#F6F2EB', borderRadius: 9,
              border: '1px solid #EDE8E0',
            }}>
              <div style={{
                fontSize: 20, fontWeight: 700, color: '#C4622D',
                letterSpacing: '-0.02em', lineHeight: 1, marginBottom: 4,
              }}>
                {[ing.amount, ing.unit].filter(Boolean).join(' ') || '—'}
              </div>
              <div style={{ fontSize: 15, fontWeight: 500, color: '#2A2520', lineHeight: 1.3 }}>
                {ing.item}
              </div>
              {ing.note && (
                <div style={{ fontSize: 12, color: '#8A7F75', marginTop: 3, fontStyle: 'italic' }}>
                  {ing.note}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Step content */}
        <div style={{
          flex: 1, display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          padding: '48px 80px', textAlign: 'center', overflowY: 'auto',
        }}>
          {/* Step counter */}
          <div style={{
            fontSize: 12, letterSpacing: '0.18em', fontWeight: 700,
            color: '#8A7F75', textTransform: 'uppercase', marginBottom: 32,
          }}>
            Step {step + 1} <span style={{ color: '#C8C0B4', fontWeight: 400 }}>/ {total}</span>
          </div>

          {/* Instruction */}
          <p style={{
            fontSize: 'clamp(24px, 3vw, 36px)',
            fontWeight: 400, lineHeight: 1.6,
            color: '#2A2520', maxWidth: 700,
            marginBottom: 56, letterSpacing: '-0.01em',
          }}>
            {cur?.instruction}
          </p>

          {/* Step dots */}
          <div style={{ display: 'flex', gap: 7, marginBottom: 40, flexWrap: 'wrap', justifyContent: 'center' }}>
            {steps.map((_, i) => (
              <button key={i} onClick={() => setStep(i)} style={{
                width: i === step ? 28 : 8, height: 8, borderRadius: 4,
                border: 'none', cursor: 'pointer', transition: 'all 0.2s',
                background: i === step ? '#C4622D' : i < step ? '#E8C4A8' : '#D8D0C4',
                padding: 0,
              }} />
            ))}
          </div>

          {/* Nav */}
          <div style={{ display: 'flex', gap: 10 }}>
            <NavBtn onClick={() => setStep(s => Math.max(s - 1, 0))} disabled={step === 0}>← Previous</NavBtn>
            {step < total - 1
              ? <NavBtn onClick={() => setStep(s => s + 1)} primary>Next →</NavBtn>
              : <NavBtn onClick={onClose} primary>✓ Done</NavBtn>
            }
          </div>

          <div style={{ marginTop: 28, fontSize: 11, color: '#C8C0B4', letterSpacing: '0.04em' }}>
            ← → arrow keys to navigate
          </div>
        </div>
      </div>
    </div>
  );
}
