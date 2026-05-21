import { useState, useEffect, useRef } from 'react';

function getRelevantIngredients(ingredients, instruction) {
  if (!instruction) return [];
  const text = instruction.toLowerCase();
  const SKIP = new Set(['and','the','for','with','from','into','onto','over','until','about','using','your','each','both']);
  const matched = ingredients.filter(ing => {
    if (!ing.item) return false;
    const words = ing.item.toLowerCase()
      .replace(/[^a-z\s]/g, '')
      .split(/\s+/)
      .filter(w => w.length > 2 && !SKIP.has(w));
    return words.some(w => text.includes(w));
  });
  return matched.length > 0 ? matched : [];
}

function matchCommand(transcript) {
  const t = transcript.toLowerCase().trim();
  if (/\b(next|continue|forward|proceed|go ahead)\b/.test(t)) return 'next';
  if (/\b(back|previous|before|go back|last)\b/.test(t)) return 'prev';
  if (/\b(scroll down|down|lower|ingredients down)\b/.test(t)) return 'scroll-down';
  if (/\b(scroll up|up|higher|ingredients up)\b/.test(t)) return 'scroll-up';
  if (/\b(exit|stop|quit|close|done|finish)\b/.test(t)) return 'exit';
  return null;
}

export default function CookingMode({ recipe, scale, onClose }) {
  const [step, setStep] = useState(0);
  const [voiceOn, setVoiceOn] = useState(false);
  const [voiceStatus, setVoiceStatus] = useState('');
  const [lastHeard, setLastHeard] = useState('');
  const recognitionRef = useRef(null);
  const ingredientsPanelRef = useRef(null);

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

  const scrollIngredients = (direction) => {
    const panel = ingredientsPanelRef.current;
    if (!panel) return;
    panel.scrollBy({ top: direction === 'down' ? 160 : -160, behavior: 'smooth' });
  };

  useEffect(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;

    const recognition = new SR();
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onresult = (e) => {
      const transcript = e.results[e.results.length - 1][0].transcript;
      const cmd = matchCommand(transcript);
      if (cmd) {
        setLastHeard(transcript.trim());
        setVoiceStatus('heard');
        setTimeout(() => setVoiceStatus('listening'), 1500);
        if (cmd === 'next') setStep(s => Math.min(s + 1, total - 1));
        if (cmd === 'prev') setStep(s => Math.max(s - 1, 0));
        if (cmd === 'scroll-down') scrollIngredients('down');
        if (cmd === 'scroll-up') scrollIngredients('up');
        if (cmd === 'exit') onClose();
      }
    };

    recognition.onerror = (e) => {
      if (e.error === 'no-speech') return;
      setVoiceStatus('error');
      setTimeout(() => { if (recognitionRef.current?._shouldRun) setVoiceStatus('listening'); }, 2000);
    };

    recognition.onend = () => {
      if (recognitionRef.current?._shouldRun) {
        try { recognition.start(); } catch {}
      }
    };

    recognitionRef.current = recognition;
    recognitionRef.current._shouldRun = false;

    return () => {
      recognition._shouldRun = false;
      try { recognition.stop(); } catch {}
    };
  }, [total, onClose]);

  const toggleVoice = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { alert('Voice control requires Chrome or Safari.'); return; }
    const rec = recognitionRef.current;
    if (!rec) return;
    if (!voiceOn) {
      rec._shouldRun = true;
      try { rec.start(); } catch {}
      setVoiceOn(true);
      setVoiceStatus('listening');
    } else {
      rec._shouldRun = false;
      try { rec.stop(); } catch {}
      setVoiceOn(false);
      setVoiceStatus('');
      setLastHeard('');
    }
  };

  const cur = steps[step];
  const pct = ((step + 1) / total) * 100;
  const relevant = getRelevantIngredients(ingredients, cur?.instruction);

  const voiceBg = voiceStatus === 'heard' ? '#E8F5EC' : voiceStatus === 'error' ? '#FDEDEC' : voiceOn ? '#F0E0D4' : '#F6F2EB';
  const voiceBorder = voiceStatus === 'heard' ? '#A8D4B4' : voiceStatus === 'error' ? '#FADBD8' : voiceOn ? '#E8C4A8' : '#E8E2D8';
  const voiceColor = voiceStatus === 'heard' ? '#2A5C3A' : voiceStatus === 'error' ? '#C0392B' : voiceOn ? '#7A3A18' : '#8A7F75';

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
    <div style={{ position: 'fixed', inset: 0, zIndex: 200, background: '#F6F2EB', display: 'flex', flexDirection: 'column', fontFamily: "'Outfit', system-ui, sans-serif" }}>
      {/* Progress */}
      <div style={{ height: 3, background: '#E8E2D8', flexShrink: 0 }}>
        <div style={{ height: '100%', width: `${pct}%`, background: '#C4622D', transition: 'width 0.35s ease' }} />
      </div>

      {/* Top bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 24px', borderBottom: '1px solid #E8E2D8', background: '#fff', flexShrink: 0, gap: 12 }}>
        <div style={{ fontSize: 15, fontWeight: 600, color: '#2A2520', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {recipe.title}
        </div>
        <button onClick={toggleVoice} style={{
          display: 'flex', alignItems: 'center', gap: 7, padding: '7px 14px', borderRadius: 8,
          border: `1px solid ${voiceBorder}`, background: voiceBg, color: voiceColor,
          fontSize: 12, fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer', transition: 'all 0.2s', flexShrink: 0,
        }}>
          <span style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
            {voiceOn && voiceStatus === 'listening' && (
              <span style={{ position: 'absolute', width: 24, height: 24, borderRadius: '50%', background: 'rgba(196,98,45,0.2)', animation: 'pulse-ring 1.5s ease-out infinite' }} />
            )}
            <span style={{ fontSize: 14 }}>🎙</span>
          </span>
          {voiceStatus === 'heard' ? `"${lastHeard}"` : voiceStatus === 'error' ? 'Mic error' : voiceOn ? 'Listening...' : 'Voice Control'}
        </button>
        <button onClick={onClose} style={{ background: '#F6F2EB', border: '1px solid #E8E2D8', borderRadius: 7, color: '#8A7F75', fontSize: 12, fontFamily: 'inherit', padding: '6px 13px', cursor: 'pointer', flexShrink: 0 }}>
          Exit
        </button>
      </div>

      {/* Voice hint bar */}
      {voiceOn && (
        <div style={{ background: '#FDF8F4', borderBottom: '1px solid #F0E0D4', padding: '7px 24px', display: 'flex', alignItems: 'center', gap: 16, fontSize: 11, color: '#7A3A18', flexShrink: 0, flexWrap: 'wrap' }}>
          <span style={{ fontWeight: 600 }}>Voice commands:</span>
          {['"Next"', '"Back"', '"Scroll Down"', '"Scroll Up"', '"Exit"'].map(cmd => (
            <span key={cmd} style={{ background: '#F0E0D4', padding: '2px 8px', borderRadius: 20, fontWeight: 500 }}>{cmd}</span>
          ))}
        </div>
      )}

      {/* Body */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

        {/* Ingredients panel */}
        {relevant.length > 0 && (
          <div style={{ width: 280, borderRight: '1px solid #E8E2D8', display: 'flex', flexDirection: 'column', flexShrink: 0, background: '#fff' }}>
            <div style={{ padding: '20px 20px 8px', flexShrink: 0 }}>
              <div style={{ fontSize: 10, letterSpacing: '0.16em', fontWeight: 700, color: '#8A7F75', textTransform: 'uppercase', marginBottom: 2 }}>
                This Step{scale > 1 ? <span style={{ color: '#C4622D', marginLeft: 6 }}>{scale}x</span> : ''}
              </div>
              <div style={{ fontSize: 11, color: '#C8C0B4' }}>{relevant.length} of {ingredients.length} ingredients</div>
            </div>

            {/* Scrollable ingredient list */}
            <div ref={ingredientsPanelRef} style={{ flex: 1, overflowY: 'auto', padding: '8px 20px 20px' }}>
              {relevant.map((ing, i) => (
                <div key={i} style={{ padding: '14px 16px', marginBottom: 8, background: '#F6F2EB', borderRadius: 9, border: '1px solid #EDE8E0' }}>
                  <div style={{ fontSize: 20, fontWeight: 700, color: '#C4622D', letterSpacing: '-0.02em', lineHeight: 1, marginBottom: 4 }}>
                    {[ing.amount, ing.unit].filter(Boolean).join(' ') || '-'}
                  </div>
                  <div style={{ fontSize: 15, fontWeight: 500, color: '#2A2520', lineHeight: 1.3 }}>{ing.item}</div>
                  {ing.note && <div style={{ fontSize: 12, color: '#8A7F75', marginTop: 3, fontStyle: 'italic' }}>{ing.note}</div>}
                </div>
              ))}
            </div>

            {/* Scroll buttons — visible when voice is off */}
            {!voiceOn && relevant.length > 2 && (
              <div style={{ display: 'flex', gap: 4, padding: '8px 20px 12px', borderTop: '1px solid #E8E2D8', flexShrink: 0 }}>
                <button onClick={() => scrollIngredients('up')}
                  style={{ flex: 1, padding: '6px', border: '1px solid #E8E2D8', borderRadius: 6, background: '#F6F2EB', color: '#8A7F75', fontSize: 11, fontFamily: 'inherit', cursor: 'pointer' }}>
                  ↑ Scroll Up
                </button>
                <button onClick={() => scrollIngredients('down')}
                  style={{ flex: 1, padding: '6px', border: '1px solid #E8E2D8', borderRadius: 6, background: '#F6F2EB', color: '#8A7F75', fontSize: 11, fontFamily: 'inherit', cursor: 'pointer' }}>
                  ↓ Scroll Down
                </button>
              </div>
            )}
          </div>
        )}

        {/* Step */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 72px', textAlign: 'center', overflowY: 'auto' }}>
          <div style={{ fontSize: 12, letterSpacing: '0.18em', fontWeight: 700, color: '#8A7F75', textTransform: 'uppercase', marginBottom: 28 }}>
            Step {step + 1} <span style={{ color: '#C8C0B4', fontWeight: 400 }}>/ {total}</span>
          </div>

          <p style={{ fontSize: 'clamp(24px, 3vw, 36px)', fontWeight: 400, lineHeight: 1.6, color: '#2A2520', maxWidth: 700, marginBottom: 52, letterSpacing: '-0.01em' }}>
            {cur?.instruction}
          </p>

          <div style={{ display: 'flex', gap: 7, marginBottom: 36, flexWrap: 'wrap', justifyContent: 'center' }}>
            {steps.map((_, i) => (
              <button key={i} onClick={() => setStep(i)} style={{
                width: i === step ? 28 : 8, height: 8, borderRadius: 4, border: 'none',
                cursor: 'pointer', transition: 'all 0.2s', padding: 0,
                background: i === step ? '#C4622D' : i < step ? '#E8C4A8' : '#D8D0C4',
              }} />
            ))}
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <NavBtn onClick={() => setStep(s => Math.max(s - 1, 0))} disabled={step === 0}>Previous</NavBtn>
            {step < total - 1
              ? <NavBtn onClick={() => setStep(s => s + 1)} primary>Next</NavBtn>
              : <NavBtn onClick={onClose} primary>Done</NavBtn>
            }
          </div>

          <div style={{ marginTop: 28, fontSize: 11, color: '#C8C0B4', letterSpacing: '0.04em' }}>
            {voiceOn ? 'Say "Next", "Back", "Scroll Down", "Scroll Up", or "Exit"' : 'Arrow keys to navigate'}
          </div>
        </div>
      </div>

      <style>{`@keyframes pulse-ring { 0% { transform: scale(0.8); opacity: 0.8; } 100% { transform: scale(2); opacity: 0; } }`}</style>
    </div>
  );
}
