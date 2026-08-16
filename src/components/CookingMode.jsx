import { useState, useEffect, useRef, useMemo } from 'react';
import { decodeEntities } from '../lib/scraper';
import { parseAmount, formatAmount } from '../lib/grocery';

// Scale an ingredient amount string by a multiplier, handling ranges
// (mirrors the logic in RecipeView so Cook Mode matches the recipe page)
function scaleAmt(amount, scale) {
  if (scale === 1 || !amount) return amount;
  const rangeMatch = amount.toString().match(/^(.+?)\s*(-|to)\s*(.+)$/i);
  if (rangeMatch) {
    const n1 = parseAmount(rangeMatch[1]);
    const n2 = parseAmount(rangeMatch[3]);
    const sep = /to/i.test(rangeMatch[2]) ? ' to ' : '-';
    if (n1 !== null && n2 !== null) return `${formatAmount(n1 * scale)}${sep}${formatAmount(n2 * scale)}`;
  }
  const n = parseAmount(amount);
  if (n === null) return amount;
  return formatAmount(n * scale);
}

// ── Wake Lock ────────────────────────────────────────────────────
async function requestWakeLock() {
  if ('wakeLock' in navigator) {
    try { return await navigator.wakeLock.request('screen'); } catch {}
  }
  return null;
}

// ── Timer parsing ────────────────────────────────────────────────
function parseStepTime(instruction) {
  const text = instruction.toLowerCase();

  // Cross-unit range like "50 minutes to 1 hour" or "45 min - 1 hr": this is a
  // single range, not two cumulative durations. Use the LOW end (the minutes).
  const crossRange = text.match(/(\d+)\s*min(?:ute)?s?\s*(?:to|-)\s*(\d+)\s*h(?:ou)?rs?/);
  if (crossRange) return parseInt(crossRange[1]) * 60;
  // Also "1 to 2 hours" style — low end in hours
  const hourRange = text.match(/(\d+)\s*(?:to|-)\s*(\d+)\s*h(?:ou)?rs?/);
  if (hourRange) return parseInt(hourRange[1]) * 3600;

  let total = 0;
  const hourMatch = text.match(/(\d+)\s*h(?:ou)?rs?/);
  if (hourMatch) total += parseInt(hourMatch[1]) * 3600;
  const minMatch = text.match(/(\d+)(?:\s*(?:to|-)\s*(\d+))?\s*min/);
  if (minMatch) total += parseInt(minMatch[1]) * 60; // use LOW end of range
  const secMatch = text.match(/(\d+)\s*sec/);
  if (secMatch) total += parseInt(secMatch[1]);
  return total > 0 ? total : null;
}

function fmtTime(s) {
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
  if (h > 0) return `${h}:${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`;
  return `${m}:${String(sec).padStart(2,'0')}`;
}

// ── Ding sound ───────────────────────────────────────────────────
function playDing() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    function ding(freq, startTime, duration) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(0.55, startTime + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
      osc.start(startTime);
      osc.stop(startTime + duration);
    }
    const now = ctx.currentTime;
    ding(880, now, 1.8);
    ding(880, now + 0.45, 1.8);
    ding(1100, now + 0.9, 2.2);
  } catch(e) {}
}

// ── Ingredient matching ──────────────────────────────────────────
const MODIFIERS = new Set(['and','the','for','with','from','into','onto','over','until','about','using','all','purpose','free','fresh','dried','large','small','medium','reduced','fat','low','sodium','plus','extra','virgin','packed','coarsely','finely','thinly','divided','softened','melted','frozen','thawed','drained','rinsed','beaten','room','temperature','boneless','skinless','lean','whole','plain','unsalted','salted','sweetened','unsweetened','part','skim','fully','cooked','minced','chopped','sliced','grated','peeled','diced','shredded','crumbled','crushed','roughly','lightly','strained']);

// Does this step's text mention this ingredient at all?
function stepMentionsIngredient(text, ing) {
  if (!ing.item) return false;
  const item = ing.item.toLowerCase().replace(/[^a-z\s]/g, '').trim();
  if (text.includes(item)) return true;
  const words = item.split(/\s+/).filter(w => w.length > 2 && !MODIFIERS.has(w));
  if (!words.length) return false;
  if (words.length === 1) return text.includes(words[0]);
  for (let i = 0; i < words.length - 1; i++) {
    if (text.includes(`${words[i]} ${words[i+1]}`)) return true;
  }
  return text.includes(words[words.length - 1]);
}

// Find the significant words of an ingredient that we look for in step text
// Words that identify an ingredient as a spice/dry seasoning, so a step that
// says "add the dry spices" (a collective reference, not any single name)
// can still pull in cumin, paprika, oregano, etc. even though none of those
// words appear literally in the step text.
const SPICE_WORDS = ['cumin','paprika','oregano','cayenne','cinnamon','nutmeg','coriander','turmeric','bay leaf','basil','thyme','rosemary','sage','dill','parsley','chili powder','garlic powder','onion powder','red pepper flakes','italian seasoning','curry powder','smoked paprika','salt','black pepper','white pepper','ground pepper','chili flakes','allspice','cardamom','clove','ginger','mustard powder','five spice','old bay','seasoning'];
function isSpiceIngredient(ing) {
  const item = (ing.item || '').toLowerCase();
  return SPICE_WORDS.some(w => item.includes(w));
}

// Collective phrases that reference "the spices" as a group rather than
// naming any one of them — "dry spices", "the spices", "spice mix",
// "seasonings", "seasoning mix".
const SPICE_COLLECTIVE_RE = /\b(dry spices|the spices|spice mix|spices|seasonings?|seasoning mix)\b/i;

function ingredientKeywords(ing) {
  const item = (ing.item || '').toLowerCase().replace(/[^a-z\s]/g, '').trim();
  const words = item.split(/\s+/).filter(w => w.length > 2 && !MODIFIERS.has(w));
  return words.length ? words : [item];
}

// Additive cues: a later step is *adding more* of an ingredient (not just
// referencing it) if an amount/number or an additive word sits near its name.
// Strong cues that THIS ingredient is being added again (not just referenced
// as a destination). "Add X to the bananas" — bananas are the destination, so
// bare "add" is excluded; we require an explicit re-add quantity or word.
const READD_WORDS = ['remaining','rest of','reserved','another','more of','the other'];
function stepAddsIngredient(text, ing) {
  const kws = ingredientKeywords(ing);
  // Locate the ingredient mention (use the most specific keyword)
  let idx = -1;
  for (const kw of kws) { const i = text.indexOf(kw); if (i !== -1) { idx = i; break; } }
  if (idx === -1) return false;
  // Tight window immediately BEFORE the name — a re-add reads "remaining 3 tbsp oil"
  const before = text.slice(Math.max(0, idx - 28), idx);
  // A number directly before the ingredient name implies a fresh measured amount
  if (/\d\s*(tsp|tbsp|cup|oz|lb|g|ml|clove|cups?|tablespoons?|teaspoons?)?\s*$/.test(before)) return true;
  // Explicit re-add words near the name
  return READD_WORDS.some(w => before.includes(w));
}

// Compute, for each step index, which ingredients to SHOW.
// Rule: an ingredient shows on the FIRST step that mentions it (its introduction),
// and again on any LATER step that *adds more* (amount/additive cue present).
// Steps that merely reference an already-introduced ingredient don't repeat it.
function computeStepIngredients(steps, ingredients) {
  const introduced = new Set(); // indices of ingredients already shown
  return steps.map(step => {
    const text = (step.instruction || '').toLowerCase();
    const show = [];
    const collectiveSpices = SPICE_COLLECTIVE_RE.test(text);
    ingredients.forEach((ing, idx) => {
      const mentioned = stepMentionsIngredient(text, ing);
      // A step mentions this ingredient either by name, OR the step says
      // "dry spices"/"seasonings" collectively and this ingredient IS a spice.
      const collectiveHit = !mentioned && collectiveSpices && isSpiceIngredient(ing);
      if (!mentioned && !collectiveHit) return;
      if (!introduced.has(idx)) {
        introduced.add(idx);
        show.push(ing);
      } else if (mentioned && stepAddsIngredient(text, ing)) {
        // Already introduced, but this step adds more — show again
        show.push(ing);
      }
      // else: merely referenced (and already introduced) — skip
    });
    return show;
  });
}

// ── Voice commands ───────────────────────────────────────────────
function matchCommand(transcript) {
  const t = transcript.toLowerCase().trim();
  if (/\b(start|begin)\b/.test(t) || (/\bgo\b/.test(t) && !/\bahead\b/.test(t))) return 'timer-start';
  if (/\b(pause|hold)\b/.test(t)) return 'timer-pause';
  if (/\b(reset|restart)\b/.test(t)) return 'timer-reset';
  if (/\b(next|continue|forward|proceed|go ahead)\b/.test(t)) return 'next';
  if (/\b(back|previous|before|go back|last)\b/.test(t)) return 'prev';
  if (/\b(scroll down|down|lower|ingredients down)\b/.test(t)) return 'scroll-down';
  if (/\b(scroll up|up|higher|ingredients up)\b/.test(t)) return 'scroll-up';
  if (/\b(exit|quit|close|done|finish)\b/.test(t)) return 'exit';
  return null;
}

// ── Component ────────────────────────────────────────────────────
export default function CookingMode({ recipe, scale, onClose }) {
  const [step, setStep] = useState(0);
  const [voiceOn, setVoiceOn] = useState(false);
  const [textSize, setTextSize] = useState(1); // 0=small 1=medium 2=large
  const [voiceStatus, setVoiceStatus] = useState('');
  const [lastHeard, setLastHeard] = useState('');
  // Per-step timers: { [stepIndex]: { remaining, running, done } }
  // Keyed by step so a running timer keeps ticking while you view other steps.
  const [timers, setTimers] = useState({});

  const steps = recipe.steps || [];
  const ingredients = recipe.ingredients || [];
  const total = steps.length;
  const cur = steps[step];
  const stepTime = cur ? parseStepTime(cur.instruction) : null;
  const stepIngredients = useMemo(() => computeStepIngredients(steps, ingredients), [steps, ingredients]);
  const relevant = stepIngredients[step] || [];
  const pct = ((step + 1) / total) * 100;

  // Refs — declared AFTER derived values so no temporal dead zone
  const recognitionRef = useRef(null);
  const ingredientsPanelRef = useRef(null);
  const wakeLockRef = useRef(null);
  const timerRef = useRef(null);
  const stepTimeRef = useRef(stepTime);   // safe here, stepTime is already computed above
  const voiceOnRef = useRef(voiceOn);
  const stepRef = useRef(step);
  stepRef.current = step;

  // Keep refs current every render
  stepTimeRef.current = stepTime;
  voiceOnRef.current = voiceOn;

  // Current step's timer view (defaults to fresh from stepTime)
  const curTimer = timers[step] || { remaining: stepTime, running: false, done: false };
  const timeRemaining = curTimer.remaining ?? stepTime;
  const timerRunning = curTimer.running;
  const timerDone = curTimer.done;

  // Timer control helpers operate on a given step index
  const startTimer = (idx, secs) => setTimers(prev => {
    const t = prev[idx] || { remaining: secs, running: false, done: false };
    if (t.done) return prev;
    return { ...prev, [idx]: { ...t, remaining: t.remaining ?? secs, running: !t.running } };
  });
  const resetTimer = (idx, secs) => setTimers(prev => ({ ...prev, [idx]: { remaining: secs, running: false, done: false } }));

  // Wake lock
  useEffect(() => {
    requestWakeLock().then(wl => { wakeLockRef.current = wl; });
    return () => { wakeLockRef.current?.release(); };
  }, []);

  // Keyboard nav
  useEffect(() => {
    const handle = e => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') setStep(s => Math.min(s + 1, total - 1));
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') setStep(s => Math.max(s - 1, 0));
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handle);
    return () => window.removeEventListener('keydown', handle);
  }, [total, onClose]);

  // Single global tick — decrements every running timer, regardless of which
  // step is currently shown. Timers persist across step navigation.
  useEffect(() => {
    const anyRunning = Object.values(timers).some(t => t.running);
    if (!anyRunning) return;
    timerRef.current = setInterval(() => {
      setTimers(prev => {
        let changed = false;
        const next = { ...prev };
        for (const [idx, t] of Object.entries(prev)) {
          if (!t.running) continue;
          changed = true;
          if (t.remaining <= 1) {
            next[idx] = { ...t, remaining: 0, running: false, done: true };
            playDing();
            if (navigator.vibrate) navigator.vibrate([300, 100, 300, 100, 300]);
          } else {
            next[idx] = { ...t, remaining: t.remaining - 1 };
          }
        }
        return changed ? next : prev;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [timers]);

  const scrollIngredients = dir => {
    const p = ingredientsPanelRef.current;
    if (p) p.scrollTo({ top: dir === 'down' ? p.scrollHeight : 0, behavior: 'smooth' });
  };

  // Voice recognition — no stepTime in deps, use ref instead
  useEffect(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;
    const rec = new SR();
    rec.continuous = true; rec.interimResults = false; rec.lang = 'en-US';

    rec.onresult = e => {
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
        if (cmd === 'timer-start') { const i = stepRef.current; const secs = stepTimeRef.current; if (secs != null) setTimers(prev => { const t = prev[i] || { remaining: secs, running: false, done: false }; if (t.done) return prev; return { ...prev, [i]: { ...t, remaining: t.remaining ?? secs, running: true } }; }); }
        if (cmd === 'timer-pause') { const i = stepRef.current; setTimers(prev => prev[i] ? { ...prev, [i]: { ...prev[i], running: false } } : prev); }
        if (cmd === 'timer-reset') {
          const i = stepRef.current; const secs = stepTimeRef.current;
          setTimers(prev => ({ ...prev, [i]: { remaining: secs, running: false, done: false } }));
        }
        if (cmd === 'exit') onClose();
        if (cmd === 'text-up') setTextSize(s => Math.min(s + 1, 2));
        if (cmd === 'text-down') setTextSize(s => Math.max(s - 1, 0));
      }
    };

    rec.onerror = e => {
      if (e.error === 'no-speech') return;
      setVoiceStatus('error');
      setTimeout(() => { if (rec._shouldRun) setVoiceStatus('listening'); }, 2000);
    };

    rec.onend = () => {
      if (!rec._shouldRun) return;
      // Speech engines self-terminate periodically. Restarting immediately can
      // throw InvalidStateError if the engine hasn't fully stopped — retry with
      // a delay, and once more if the first retry also fails.
      setTimeout(() => {
        if (!rec._shouldRun) return;
        try { rec.start(); } catch {
          setTimeout(() => { if (rec._shouldRun) { try { rec.start(); } catch {} } }, 600);
        }
      }, 250);
    };

    rec._shouldRun = false;
    recognitionRef.current = rec;

    // If voice was already on (e.g. effect re-ran), restart immediately
    if (voiceOnRef.current) {
      rec._shouldRun = true;
      try { rec.start(); } catch {}
    }

    return () => { rec._shouldRun = false; try { rec.stop(); } catch {} };
  }, [total, onClose]); // no stepTime dep — fixed!

  const toggleVoice = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { alert('Voice control requires Chrome or Safari.'); return; }
    const rec = recognitionRef.current;
    if (!rec) return;
    if (!voiceOn) {
      rec._shouldRun = true;
      try { rec.start(); } catch {}
      setVoiceOn(true); setVoiceStatus('listening');
    } else {
      rec._shouldRun = false;
      try { rec.stop(); } catch {}
      setVoiceOn(false); setVoiceStatus(''); setLastHeard('');
    }
  };

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
    }}>{children}</button>
  );

  const TimerBtn = ({ onClick, children, active }) => (
    <button onClick={onClick} style={{
      padding: '6px 14px', borderRadius: 7, border: '1px solid #E8E2D8',
      background: active ? '#C4622D' : '#fff', color: active ? 'white' : '#2A2520',
      fontSize: 12, fontWeight: 500, fontFamily: "'Outfit', system-ui, sans-serif",
      cursor: 'pointer', transition: 'all 0.15s',
    }}>{children}</button>
  );

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 200, background: '#F6F2EB', display: 'flex', flexDirection: 'column', fontFamily: "'Outfit', system-ui, sans-serif" }}>
      {/* Progress */}
      <div style={{ height: 3, background: '#E8E2D8', flexShrink: 0 }}>
        <div style={{ height: '100%', width: `${pct}%`, background: '#C4622D', transition: 'width 0.35s ease' }} />
      </div>

      {/* Top bar */}
      <div className="cm-topbar" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 24px', borderBottom: '1px solid #E8E2D8', background: '#fff', flexShrink: 0, gap: 12 }}>
        <div style={{ fontSize: 15, fontWeight: 600, color: '#2A2520', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{recipe.title}</div>
        <button onClick={toggleVoice} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '7px 14px', borderRadius: 8, border: `1px solid ${voiceBorder}`, background: voiceBg, color: voiceColor, fontSize: 12, fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer', transition: 'all 0.2s', flexShrink: 0 }}>
          <span style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
            {voiceOn && voiceStatus === 'listening' && <span style={{ position: 'absolute', width: 24, height: 24, borderRadius: '50%', background: 'rgba(196,98,45,0.2)', animation: 'pulse-ring 1.5s ease-out infinite' }} />}
            <span style={{ fontSize: 14 }}>🎙</span>
          </span>
          {voiceStatus === 'heard' ? `"${lastHeard}"` : voiceStatus === 'error' ? 'Mic error' : voiceOn ? 'Listening...' : 'Voice Control'}
        </button>
        <div style={{ display: 'flex', gap: 2, background: '#F6F2EB', borderRadius: 7, padding: 3, flexShrink: 0 }}>
          {['S','M','L'].map((lbl,i) => (
            <button key={lbl} onClick={() => setTextSize(i)}
              style={{ padding: '4px 9px', borderRadius: 5, border: 'none', fontSize: 11, fontWeight: textSize===i?700:400, fontFamily:'inherit', cursor:'pointer', background: textSize===i?'white':'transparent', color: textSize===i?'#2A2520':'#8A7F75', transition:'all 0.15s' }}>
              {lbl}
            </button>
          ))}
        </div>
        <button onClick={onClose} style={{ background: '#F6F2EB', border: '1px solid #E8E2D8', borderRadius: 7, color: '#8A7F75', fontSize: 12, fontFamily: 'inherit', padding: '6px 13px', cursor: 'pointer', flexShrink: 0 }}>Exit</button>
      </div>

      {/* Voice hints */}
      {voiceOn && (
        <div style={{ background: '#FDF8F4', borderBottom: '1px solid #F0E0D4', padding: '7px 24px', display: 'flex', alignItems: 'center', gap: 12, fontSize: 11, color: '#7A3A18', flexShrink: 0, flexWrap: 'wrap' }}>
          <span style={{ fontWeight: 600 }}>Voice:</span>
          {['"Next"', '"Back"', '"Scroll Down"', '"Scroll Up"', '"Start"', '"Pause"', '"Reset"', '"Larger"', '"Smaller"', '"Exit"'].map(cmd => (
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
            <div ref={ingredientsPanelRef} style={{ flex: 1, overflowY: 'auto', padding: '8px 20px 12px' }}>
              {relevant.map((ing, i) => (
                <div key={i} style={{ padding: '14px 16px', marginBottom: 8, background: '#F6F2EB', borderRadius: 9, border: '1px solid #EDE8E0' }}>
                  <div style={{ fontSize: 20, fontWeight: 700, color: '#C4622D', letterSpacing: '-0.02em', lineHeight: 1, marginBottom: 4 }}>
                    {[scaleAmt(ing.amount, scale), ing.unit].filter(Boolean).join(' ') || '-'}
                  </div>
                  <div style={{ fontSize: 15, fontWeight: 500, color: '#2A2520', lineHeight: 1.3 }}>{decodeEntities(ing.item)}</div>
                  {ing.note && <div style={{ fontSize: 12, color: '#8A7F75', marginTop: 3, fontStyle: 'italic' }}>{ing.note}</div>}
                </div>
              ))}
            </div>
            {!voiceOn && relevant.length > 2 && (
              <div style={{ display: 'flex', gap: 4, padding: '8px 20px 12px', borderTop: '1px solid #E8E2D8', flexShrink: 0 }}>
                <button onClick={() => scrollIngredients('up')} style={{ flex: 1, padding: '6px', border: '1px solid #E8E2D8', borderRadius: 6, background: '#F6F2EB', color: '#8A7F75', fontSize: 11, fontFamily: 'inherit', cursor: 'pointer' }}>↑ Up</button>
                <button onClick={() => scrollIngredients('down')} style={{ flex: 1, padding: '6px', border: '1px solid #E8E2D8', borderRadius: 6, background: '#F6F2EB', color: '#8A7F75', fontSize: 11, fontFamily: 'inherit', cursor: 'pointer' }}>↓ Down</button>
              </div>
            )}
          </div>
        )}

        {/* Step content */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 72px', textAlign: 'center', overflowY: 'auto' }}>
          <div style={{ fontSize: 12, letterSpacing: '0.18em', fontWeight: 700, color: '#8A7F75', textTransform: 'uppercase', marginBottom: 28 }}>
            Step {step + 1} <span style={{ color: '#C8C0B4', fontWeight: 400 }}>/ {total}</span>
          </div>

          <p style={{ fontSize: ['18px','clamp(22px,3vw,32px)','clamp(28px,4vw,44px)'][textSize], fontWeight: 400, lineHeight: 1.6, color: '#2A2520', maxWidth: 700, marginBottom: stepTime ? 32 : 48, letterSpacing: '-0.01em', transition: 'font-size 0.2s' }}>
            {decodeEntities(cur?.instruction || '')}
          </p>

          {/* Timer */}
          {stepTime !== null && (
            <div style={{ marginBottom: 40, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
              <div style={{
                fontSize: 48, fontWeight: 700, letterSpacing: '-0.03em',
                color: timerDone ? '#2A5C3A' : timerRunning ? '#C4622D' : '#2A2520',
                transition: 'color 0.3s',
                background: timerDone ? '#E8F5EC' : timerRunning ? '#F0E0D4' : '#F6F2EB',
                border: `2px solid ${timerDone ? '#A8D4B4' : timerRunning ? '#E8C4A8' : '#E8E2D8'}`,
                borderRadius: 14, padding: '12px 28px', minWidth: 180, textAlign: 'center',
              }}>
                {timerDone ? '✓ Done!' : fmtTime(timeRemaining ?? stepTime)}
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                {!timerDone && (
                  <TimerBtn onClick={() => startTimer(step, stepTime)} active={timerRunning}>
                    {timerRunning ? '⏸ Pause' : '▶ Start'}
                  </TimerBtn>
                )}
                <TimerBtn onClick={() => resetTimer(step, stepTime)}>
                  ↺ Reset
                </TimerBtn>
              </div>
            </div>
          )}

          {/* Step dots */}
          <div style={{ display: 'flex', gap: 7, marginBottom: 32, flexWrap: 'wrap', justifyContent: 'center' }}>
            {steps.map((_, i) => {
              const t = timers[i];
              const dotColor = i === step ? '#C4622D' : i < step ? '#E8C4A8' : '#D8D0C4';
              return (
                <button key={i} onClick={() => setStep(i)} title={t?.running ? 'Timer running' : t?.done ? 'Timer done' : undefined} style={{ position: 'relative', width: i === step ? 28 : 8, height: 8, borderRadius: 4, border: 'none', cursor: 'pointer', transition: 'all 0.2s', background: t?.running ? '#C4622D' : t?.done ? '#2A5C3A' : dotColor, padding: 0 }} />
              );
            })}
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <NavBtn onClick={() => setStep(s => Math.max(s - 1, 0))} disabled={step === 0}>Previous</NavBtn>
            {step < total - 1 ? <NavBtn onClick={() => setStep(s => s + 1)} primary>Next</NavBtn> : <NavBtn onClick={onClose} primary>Done</NavBtn>}
          </div>

          <div style={{ marginTop: 24, fontSize: 11, color: '#C8C0B4', letterSpacing: '0.04em' }}>
            {voiceOn ? 'Say "Next", "Back", "Start", "Pause", "Reset", or "Exit"' : 'Arrow keys to navigate'}
          </div>
        </div>
      </div>

      {/* Floating timer chip — visible when a timer is active on a step you're not viewing */}
      {(() => {
        const offStep = Object.entries(timers)
          .map(([idx, t]) => ({ idx: parseInt(idx), ...t }))
          .filter(t => t.idx !== step && (t.running || t.done))
          .sort((a, b) => (a.done === b.done ? a.remaining - b.remaining : a.done ? 1 : -1)); // running first, then soonest
        if (!offStep.length) return null;
        const t = offStep[0];
        const more = offStep.length - 1;
        return (
          <div
            onClick={() => setStep(t.idx)}
            title="Jump to this step"
            style={{
              position: 'fixed', bottom: 20, right: 20, zIndex: 250,
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '10px 16px', borderRadius: 12, cursor: 'pointer',
              fontFamily: "'Outfit', system-ui, sans-serif",
              background: t.done ? '#E8F5EC' : '#fff',
              border: `2px solid ${t.done ? '#A8D4B4' : '#E8C4A8'}`,
              boxShadow: '0 4px 16px rgba(42,37,32,0.18)',
              animation: t.done ? 'chip-pop 0.4s ease' : undefined,
            }}>
            <span style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 10, height: 10 }}>
              {t.running && <span style={{ position: 'absolute', width: 20, height: 20, borderRadius: '50%', background: 'rgba(196,98,45,0.25)', animation: 'pulse-ring 1.5s ease-out infinite' }} />}
              <span style={{ width: 9, height: 9, borderRadius: '50%', background: t.done ? '#2A5C3A' : '#C4622D' }} />
            </span>
            <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.15 }}>
              <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: t.done ? '#2A5C3A' : '#8A7F75' }}>
                Step {t.idx + 1}{t.done ? ' · Done' : ''}{more > 0 ? ` · +${more}` : ''}
              </span>
              <span style={{ fontSize: 20, fontWeight: 700, letterSpacing: '-0.02em', color: t.done ? '#2A5C3A' : '#C4622D' }}>
                {t.done ? '✓ Ready' : fmtTime(t.remaining)}
              </span>
            </div>
          </div>
        );
      })()}

      <style>{`@keyframes pulse-ring { 0% { transform: scale(0.8); opacity: 0.8; } 100% { transform: scale(2); opacity: 0; } } @keyframes chip-pop { 0% { transform: scale(0.85); } 60% { transform: scale(1.06); } 100% { transform: scale(1); } }`}</style>
    </div>
  );
}
