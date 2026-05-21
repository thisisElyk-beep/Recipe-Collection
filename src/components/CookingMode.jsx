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

// Voice command matching
function matchCommand(transcript) {
  const t = transcript.toLowerCase().trim();
  if (/\b(next|continue|forward|proceed|go ahead)\b/.test(t)) return 'next';
  if (/\b(back|previous|before|go back|last)\b/.test(t)) return 'prev';

  if (/\b(exit|stop|quit|close|done|finish)\b/.test(t)) return 'exit';
  return null;
}

export default function CookingMode({ recipe, scale, onClose }) {
  const [step, setStep] = useState(0);
  const [voiceOn, setVoiceOn] = useState(false);
  const [voiceStatus, setVoiceStatus] = useState(''); // '', 'listening', 'heard', 'error'
  const [lastHeard, setLastHeard] = useState('');
  const recognitionRef = useRef(null);
  const stepRef = useRef(0);

  const steps = recipe.steps || [];
  const ingredients = recipe.ingredients || [];
  const total = steps.length;

  // Keep stepRef in sync for use inside speech callback
  useEffect(() => { stepRef.current = step; }, [step]);

  // Keyboard nav
  useEffect(() => {
    const handle = (e) => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') setStep(s => Math.min(s + 1, total - 1));
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') setStep(s => Math.max(s - 1, 0));
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handle);
    return () => window.removeEventListener('keydown', handle);
  }, [total, onClose]);

  // Voice recognition setup
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
        if (cmd === 'exit') onClose();
      }
    };

    recognition.onerror = (e) => {
      if (e.error === 'no-speech') return; // normal, ignore
      setVoiceStatus('error');
      setTimeout(() => { if (voiceOn) setVoiceStatus('listening'); }, 2000);
    };

    recognition.onend = () => {
      // Auto-restart if still on
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
    if (!SR) {
      alert('Voice control is not supported in this browser. Try Chrome or Safari.');
      return;
    }
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

  const voiceBgColor = voiceStatus === 'heard' ? '#E8F5EC' : voiceStatus === 'error' ? '#FDEDEC' : voiceOn ? '#F0E0D4' : '#F6F2EB';
  const voiceBorderColor = voiceStatus === 'heard' ? '#A8D4B4' : voiceStatus === 'error' ? '#FADBD8' : voiceOn ? '#E8C4A8' : '#E8E2D8';
  const voiceTextColor = voiceStatus === 'heard' ? '#2A5C3A' : voiceStatus === 'error' ? '#C0392B' : voiceOn ? '#7A3A18' : '#8A7F75';

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
        padding: '12px 24px', borderBottom: '1px solid #E8E2D8',
        background: '#fff', flexShrink: 0, gap: 12,
      }}>
        <div style={{ fontSize: 15, fontWeight: 600, color: '#2A2520', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {recipe.title}
        </div>

        {/* Voice control button */}
        <button onClick={toggleVoice} style={{
          display: 'flex', alignItems: 'center', gap: 7,
          padding: '7px 14px', borderRadius: 8,
          border: `1px solid ${voiceBorderColor}`,
          background: voiceBgColor, color: voiceTextColor,
          fontSize: 12, fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer',
          transition: 'all 0.2s', flexShrink: 0,
        }}>
          {/* Mic icon with pulse when listening */}
          <span style={{
            position: 'relative', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {voiceOn && voiceStatus === 'listening' && (
              <span style={{
                position: 'absolute', width: 24, height: 24, borderRadius: '50%',
                background: 'rgba(196,98,45,0.2)',
                animation: 'pulse-ring 1.5s ease-out infinite',
              }} />
            )}
            <span style={{ fontSize: 14 }}>🎙</span>
          </span>
          {voiceStatus === 'heard' ? `Heard: "${lastHeard}"` :
           voiceStatus === 'error' ? 'Mic error' :
           voiceOn ? 'Listening…' : 'Voice Control'}
        </button>

        <button onClick={onClose} style={{
          background: '#F6F2EB', border: '1px solid #E8E2D8', borderRadius: 7,
          color: '#8A7F75', fontSize: 12, fontFamily: 'inherit',
          padding: '6px 13px', cursor: 'pointer', flexShrink: 0,
        }}>
          ✕ Exit
        </button>
      </div>

      {/* Voice commands hint */}
      {voiceOn && (
        <div style={{
          background: '#FDF8F4', borderBottom: '1px solid #F0E0D4',
          padding: '8px 24px', display: 'flex', alignItems: 'center', gap: 20,
          fontSize: 11, color: '#7A3A18', flexShrink: 0,
        }}>
          <span style={{ fontWeight: 600 }}>Voice commands:</span>
          {['"Next"', '"Back"', '"Exit"'].map(cmd => (
            <span key={cmd} style={{ background: '#F0E0D4', padding: '2px 8px', borderRadius: 20, fontWeight: 500 }}>{cmd}</span>
          ))}
        </div>
      )}

      {/* Body */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

        {/* Ingredients panel */}
        {relevant.length > 0 && (
          <div style={{
            width: 280, borderRight: '1px solid #E8E2D8', overflowY: 'auto',
            padding: '24px 20px', flexShrink: 0, background: '#fff',
          }}>
            <div style={{ fontSize: 10, letterSpacing: '0.16em', fontWeight: 700, color: '#8A7F75', textTransform: 'uppercase', marginBottom: 4 }}>
              This Step{scale > 1 ? <span style={{ color: '#C4622D', marginLeft: 6 }}>{scale}x</span> : ''}
            </div>
            <div style={{ fontSize: 11, color: '#C8C0B4', marginBottom: 18 }}>
              {relevant.length} of {ingredients.length} ingredients
            </div>
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
        )}

        {/* Step content */}
        <div style={{
          flex: 1, display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          padding: '40px 72px', textAlign: 'center', overflowY: 'auto',
        }}>
          <div style={{ fontSize: 12, letterSpacing: '0.18em', fontWeight: 700, color: '#8A7F75', textTransform: 'uppercase', marginBottom: 28 }}>
            Step {step + 1} <span style={{ color: '#C8C0B4', fontWeight: 400 }}>/ {total}</span>
          </div>

          <p style={{
            fontSize: 'clamp(24px, 3vw, 36px)', fontWeight: 400, lineHeight: 1.6,
            color: '#2A2520', maxWidth: 700, marginBottom: 52, letterSpacing: '-0.01em',
          }}>
            {cur?.instruction}
          </p>

          <div style={{ display: 'flex', gap: 7, marginBottom: 36, flexWrap: 'wrap', justifyContent: 'center' }}>
            {steps.map((_, i) => (
              <button key={i} onClick={() => setStep(i)} style={{
                width: i === step ? 28 : 8, height: 8, borderRadius: 4,
                border: 'none', cursor: 'pointer', transition: 'all 0.2s',
                background: i === step ? '#C4622D' : i < step ? '#E8C4A8' : '#D8D0C4', padding: 0,
              }} />
            ))}
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <NavBtn onClick={() => setStep(s => Math.max(s - 1, 0))} disabled={step === 0}>← Previous</NavBtn>
            {step < total - 1
              ? <NavBtn onClick={() => setStep(s => s + 1)} primary>Next →</NavBtn>
              : <NavBtn onClick={onClose} primary>Done</NavBtn>
            }
          </div>

          <div style={{ marginTop: 28, fontSize: 11, color: '#C8C0B4', letterSpacing: '0.04em' }}>
            {voiceOn ? 'Say "Next", "Back", or "Exit"' : '← → arrow keys · or enable Voice Control above'}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes pulse-ring {
          0% { transform: scale(0.8); opacity: 0.8; }
          100% { transform: scale(2); opacity: 0; }
        }
      `}</style>
    </div>
  );
}
