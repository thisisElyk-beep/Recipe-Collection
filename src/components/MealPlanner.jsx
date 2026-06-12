import { useState, useMemo } from 'react';
import ShoppingListModal from './ShoppingListModal';
import GroceriesTab from './GroceriesTab';
import PantryTab from './PantryTab';

const DAYS = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
const DAY_ABBR = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
const SLOTS = ['breakfast','lunch','dinner'];
const SLOT_LABEL = { breakfast: 'Breakfast', lunch: 'Lunch', dinner: 'Dinner' };
const SLOT_ICON = { breakfast: '🍳', lunch: '🥪', dinner: '🍽' };

// Normalize a day's plan — legacy arrays become { dinner: [...] }
function daySlots(plan, day) {
  const d = plan[day];
  if (!d) return { breakfast: [], lunch: [], dinner: [] };
  if (Array.isArray(d)) return { breakfast: [], lunch: [], dinner: d };
  return { breakfast: d.breakfast || [], lunch: d.lunch || [], dinner: d.dinner || [] };
}

// ── Meal type inference from tags ─────────────────────────────────
const MEAL_TYPES = [
  { name: 'Breakfast', icon: '🍳', keywords: ['breakfast','brunch','pancake','waffle','egg','oatmeal','smoothie','muffin','french toast','granola'] },
  { name: 'Lunch', icon: '🥪', keywords: ['lunch','salad','sandwich','wrap','soup','bowl'] },
  { name: 'Dinner', icon: '🍽', keywords: ['dinner','main','entree','pasta','chicken','beef','pork','fish','salmon','curry','stir fry','casserole','roast'] },
  { name: 'Dessert', icon: '🍰', keywords: ['dessert','cake','cookie','pie','sweet','chocolate','ice cream','brownie','candy','pudding','tart'] },
  { name: 'Sides', icon: '🥗', keywords: ['side','side dish','appetizer','snack','bread','dip','sauce'] },
];

function inferMealType(recipe) {
  const tags = (recipe.tags || []).map(t => t.toLowerCase());
  const title = (recipe.title || '').toLowerCase();
  const haystack = [...tags, title].join(' ');
  for (const mt of MEAL_TYPES) {
    if (mt.keywords.some(kw => haystack.includes(kw))) return mt.name;
  }
  return 'Other';
}

const TYPE_ORDER = ['Breakfast','Lunch','Dinner','Sides','Dessert','Other'];
const TYPE_ICON = Object.fromEntries(MEAL_TYPES.map(m => [m.name, m.icon]));
TYPE_ICON['Other'] = '🍴';

export default function MealPlanner({ recipes, plan, onUpdatePlan, onClose, onOpenRecipe, groceries, onUpdateGroceries, staples, onUpdateStaples, initialTab = 'planner' }) {
  const [tab, setTab] = useState(initialTab);
  const [picker, setPicker] = useState(null); // { day, slot }
  const [pickerSearch, setPickerSearch] = useState('');
  const [railSearch, setRailSearch] = useState('');
  const [dragOver, setDragOver] = useState(null); // `${day}|${slot}`
  const [showShopping, setShowShopping] = useState(false);
  const [collapsedTypes, setCollapsedTypes] = useState(new Set());

  const recipeById = useMemo(() => Object.fromEntries(recipes.map(r => [r.id, r])), [recipes]);

  const groupedRecipes = useMemo(() => {
    const filtered = recipes.filter(r => !railSearch || r.title.toLowerCase().includes(railSearch.toLowerCase()));
    const g = {};
    filtered.forEach(r => { const t = inferMealType(r); (g[t] = g[t] || []).push(r); });
    Object.values(g).forEach(list => list.sort((a,b) => a.title.localeCompare(b.title)));
    return TYPE_ORDER.filter(t => g[t]).map(t => [t, g[t]]);
  }, [recipes, railSearch]);

  const addToSlot = (day, slot, recipeId) => {
    const slots = daySlots(plan, day);
    if (slots[slot].includes(recipeId)) return;
    onUpdatePlan({ ...plan, [day]: { ...slots, [slot]: [...slots[slot], recipeId] } });
    setPicker(null); setPickerSearch('');
  };

  const removeFromSlot = (day, slot, recipeId) => {
    const slots = daySlots(plan, day);
    onUpdatePlan({ ...plan, [day]: { ...slots, [slot]: slots[slot].filter(id => id !== recipeId) } });
  };

  const clearWeek = () => { if (confirm('Clear all meals from the week?')) onUpdatePlan({}); };

  const handleDrop = (day, slot) => {
    const recipeId = window.__draggedRecipeId;
    const src = window.__dragSource; // { day, slot } when moving an already-planned card
    if (recipeId) {
      let next = { ...plan };
      if (src && !(src.day === day && src.slot === slot)) {
        const sSlots = daySlots(next, src.day);
        next[src.day] = { ...sSlots, [src.slot]: sSlots[src.slot].filter(id => id !== recipeId) };
      }
      const tSlots = daySlots(next, day);
      if (!tSlots[slot].includes(recipeId)) {
        next[day] = { ...tSlots, [slot]: [...tSlots[slot], recipeId] };
      }
      onUpdatePlan(next);
    }
    setDragOver(null); window.__draggedRecipeId = null; window.__dragSource = null;
  };

  const toggleType = (t) => setCollapsedTypes(prev => { const n = new Set(prev); n.has(t) ? n.delete(t) : n.add(t); return n; });

  const plannedRecipes = useMemo(() => {
    const ids = new Set();
    DAYS.forEach(day => { const s = daySlots(plan, day); SLOTS.forEach(slot => s[slot].forEach(id => ids.add(id))); });
    return [...ids].map(id => recipeById[id]).filter(Boolean);
  }, [plan, recipeById]);

  const saveToGroceries = (items, checkedKeys) => {
    onUpdateGroceries({ items, checked: checkedKeys || [], savedAt: new Date().toISOString() });
  };

  const filteredPickerRecipes = recipes.filter(r => !pickerSearch || r.title.toLowerCase().includes(pickerSearch.toLowerCase()));
  const totalMeals = DAYS.reduce((sum, day) => { const s = daySlots(plan, day); return sum + s.breakfast.length + s.lunch.length + s.dinner.length; }, 0);

  return (
    <div className="planner-root" style={{ position:'fixed', inset:0, zIndex:150, background:'var(--bg)', display:'flex', flexDirection:'column' }}>
      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', gap:12, padding:'14px 20px', borderBottom:'1px solid var(--border)', flexShrink:0, flexWrap:'wrap' }}>
        <button onClick={onClose} style={{ fontSize:13, color:'var(--text-muted)', cursor:'pointer', padding:'6px 10px', borderRadius:7, border:'none', background:'transparent', fontFamily:'var(--font-body)' }}>Back</button>
        <h2 style={{ fontFamily:'var(--font-display)', fontSize:20, fontWeight:500 }}>Meal Planner</h2>
        <div style={{ display:'flex', gap:2, background:'var(--tag-bg)', borderRadius:8, padding:3 }}>
          {[['planner','Planner'],['groceries','Groceries'],['pantry','Pantry']].map(([t,label]) => (
            <button key={t} onClick={() => setTab(t)} style={{ padding:'5px 14px', border:'none', borderRadius:6, fontSize:12, fontFamily:'var(--font-body)', cursor:'pointer', background: tab===t?'white':'transparent', color: tab===t?'var(--text)':'var(--text-muted)', fontWeight: tab===t?600:400 }}>{label}</button>
          ))}
        </div>
        {tab === 'planner' && <span style={{ fontSize:12, color:'var(--text-muted)' }}>{totalMeals} meal{totalMeals!==1?'s':''}</span>}
        <div style={{ marginLeft:'auto', display:'flex', gap:8 }}>
          {tab === 'planner' && totalMeals > 0 && (
            <>
              <button onClick={clearWeek} style={{ padding:'7px 12px', borderRadius:7, border:'1px solid var(--border)', background:'var(--surface)', color:'var(--text-muted)', fontSize:12, fontFamily:'var(--font-body)', cursor:'pointer' }}>Clear</button>
              <button onClick={() => setShowShopping(true)} style={{ padding:'7px 14px', borderRadius:7, border:'none', background:'var(--accent)', color:'white', fontSize:12, fontWeight:600, fontFamily:'var(--font-body)', cursor:'pointer', whiteSpace:'nowrap' }}>🛒 Week List</button>
            </>
          )}
        </div>
      </div>

      {tab === 'groceries' ? (
        <div style={{ flex:1, overflowY:'auto' }}>
          <GroceriesTab savedList={groceries} onUpdate={onUpdateGroceries} staples={staples} />
        </div>
      ) : tab === 'pantry' ? (
        <div style={{ flex:1, overflowY:'auto' }}>
          <PantryTab staples={staples} onUpdate={onUpdateStaples} />
        </div>
      ) : (
      <div className="planner-body" style={{ flex:1, display:'flex', overflow:'hidden' }}>
        {/* Recipe rail grouped by meal type */}
        <div className="planner-rail" style={{ width:240, borderRight:'1px solid var(--border)', display:'flex', flexDirection:'column', flexShrink:0, background:'var(--surface)' }}>
          <div style={{ padding:'14px 16px 8px', flexShrink:0 }}>
            <div style={{ fontSize:10, letterSpacing:'0.12em', fontWeight:700, color:'var(--text-muted)', textTransform:'uppercase', marginBottom:8 }}>Drag or tap to add</div>
            <input value={railSearch} onChange={e => setRailSearch(e.target.value)} placeholder="Search recipes…"
              style={{ width:'100%', padding:'6px 10px', border:'1px solid var(--border)', borderRadius:7, fontSize:12, fontFamily:'var(--font-body)', outline:'none', boxSizing:'border-box', background:'var(--bg)' }} />
          </div>
          <div style={{ flex:1, overflowY:'auto', padding:'4px 12px 16px' }}>
            {groupedRecipes.map(([type, list]) => {
              const collapsed = collapsedTypes.has(type);
              return (
                <div key={type} style={{ marginBottom:10 }}>
                  <div onClick={() => toggleType(type)} style={{ display:'flex', alignItems:'center', gap:6, padding:'5px 2px', cursor:'pointer', position:'sticky', top:0, background:'var(--surface)' }}>
                    <span style={{ fontSize:12 }}>{TYPE_ICON[type]}</span>
                    <span style={{ fontSize:10, fontWeight:700, letterSpacing:'0.06em', textTransform:'uppercase', color:'var(--text)', flex:1 }}>{type}</span>
                    <span style={{ fontSize:10, color:'var(--text-muted)' }}>{list.length}</span>
                    <span style={{ fontSize:9, color:'var(--text-muted)', transform: collapsed?'rotate(-90deg)':'none', transition:'transform 0.15s' }}>▾</span>
                  </div>
                  {!collapsed && list.map(r => (
                    <div key={r.id} draggable
                      onDragStart={() => { window.__draggedRecipeId = r.id; window.__dragSource = null; }}
                      onClick={() => onOpenRecipe(r)}
                      style={{ padding:'7px 9px', marginBottom:4, marginLeft:4, background:'var(--bg)', border:'1px solid var(--border)', borderRadius:7, cursor:'grab', fontSize:12, fontWeight:500, color:'var(--text)', display:'flex', alignItems:'center', gap:7 }}
                      onMouseEnter={e => e.currentTarget.style.borderColor='var(--accent)'}
                      onMouseLeave={e => e.currentTarget.style.borderColor='var(--border)'}>
                      <span style={{ color:'var(--text-muted)', fontSize:10 }}>⠿</span>
                      <span style={{ overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{r.title}</span>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        </div>

        {/* Week grid with meal slots */}
        <div className="planner-grid-wrap" style={{ flex:1, overflowY:'auto', padding:'20px 24px' }}>
          <div className="planner-grid" style={{ display:'grid', gridTemplateColumns:'repeat(7, 1fr)', gap:10, minHeight:'100%' }}>
            {DAYS.map((day, i) => {
              const slots = daySlots(plan, day);
              return (
                <div key={day} style={{ display:'flex', flexDirection:'column', background:'var(--surface)', border:'1px solid var(--border)', borderRadius:10, padding:8, minHeight:420 }}>
                  <div style={{ fontSize:11, fontWeight:700, color:'var(--text)', marginBottom:8, textAlign:'center', letterSpacing:'0.04em' }}>{DAY_ABBR[i]}</div>

                  {SLOTS.map(slot => {
                    const meals = slots[slot].map(id => recipeById[id]).filter(Boolean);
                    const isOver = dragOver === `${day}|${slot}`;
                    return (
                      <div key={slot}
                        onDragOver={e => { e.preventDefault(); setDragOver(`${day}|${slot}`); }}
                        onDragLeave={() => setDragOver(null)}
                        onDrop={() => handleDrop(day, slot)}
                        style={{ flex:1, display:'flex', flexDirection:'column', marginBottom:6, borderRadius:8, padding:5, minHeight:110, background: isOver ? 'var(--accent-light)' : 'var(--bg)', border: isOver ? '2px dashed var(--accent)' : '1px dashed var(--border)', transition:'all 0.12s' }}>
                        <div style={{ fontSize:8.5, fontWeight:700, letterSpacing:'0.08em', textTransform:'uppercase', color:'var(--text-muted)', marginBottom:4, display:'flex', alignItems:'center', gap:3 }}>
                          <span style={{ fontSize:9 }}>{SLOT_ICON[slot]}</span>{SLOT_LABEL[slot]}
                        </div>
                        <div style={{ flex:1, display:'flex', flexDirection:'column', gap:4 }}>
                          {meals.map(r => (
                            <div key={r.id} draggable
                              onDragStart={() => { window.__draggedRecipeId = r.id; window.__dragSource = { day, slot }; }}
                              onClick={() => onOpenRecipe(r)}
                              style={{ position:'relative', borderRadius:7, overflow:'hidden', cursor:'grab', flex:1, minHeight:84, border:'1px solid var(--border)', background:'var(--surface)' }}>
                              {/* Image fills the whole card */}
                              {r.image_url && <img src={r.image_url} alt="" style={{ position:'absolute', inset:0, width:'100%', height:'100%', objectFit:'cover', display:'block' }} onError={e => e.target.style.display='none'} />}
                              {/* Title sits on a gradient over the bottom of the image */}
                              <div style={{ position:'absolute', left:0, right:0, bottom:0, padding:'14px 8px 6px', fontSize:11, fontWeight:600, lineHeight:1.3, color: r.image_url ? 'white' : 'var(--text)', background: r.image_url ? 'linear-gradient(transparent, rgba(0,0,0,0.72))' : 'transparent', textShadow: r.image_url ? '0 1px 2px rgba(0,0,0,0.5)' : 'none' }}>{r.title}</div>
                              <button onClick={e => { e.stopPropagation(); removeFromSlot(day, slot, r.id); }} style={{ position:'absolute', top:3, right:3, width:16, height:16, borderRadius:'50%', background:'rgba(0,0,0,0.55)', border:'none', color:'white', fontSize:10, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', lineHeight:1, zIndex:2 }}>×</button>
                            </div>
                          ))}
                          <button onClick={() => { setPicker({ day, slot }); setPickerSearch(''); }} style={{ marginTop:'auto', padding:'3px', border:'none', borderRadius:5, background:'transparent', color:'var(--text-muted)', fontSize:10, cursor:'pointer', fontFamily:'var(--font-body)', opacity:0.6 }}>+</button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>
      )}

      {/* Click-to-add picker */}
      {picker && (
        <div className="modal-overlay" onClick={e => { if (e.target===e.currentTarget) setPicker(null); }}>
          <div className="modal" style={{ maxWidth:420, maxHeight:'80vh' }}>
            <div className="modal-header"><h2>{SLOT_ICON[picker.slot]} {SLOT_LABEL[picker.slot]} — {picker.day}</h2><button className="modal-close" onClick={() => setPicker(null)}>×</button></div>
            <div className="modal-body">
              <input value={pickerSearch} onChange={e => setPickerSearch(e.target.value)} placeholder="Search recipes…" autoFocus
                style={{ width:'100%', padding:'8px 11px', border:'1px solid var(--border)', borderRadius:7, fontSize:13, fontFamily:'var(--font-body)', outline:'none', boxSizing:'border-box', marginBottom:12 }} />
              <div style={{ maxHeight:'50vh', overflowY:'auto', display:'flex', flexDirection:'column', gap:6 }}>
                {filteredPickerRecipes.map(r => {
                  const already = daySlots(plan, picker.day)[picker.slot].includes(r.id);
                  return (
                    <button key={r.id} onClick={() => addToSlot(picker.day, picker.slot, r.id)} disabled={already}
                      style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 10px', border:'1px solid var(--border)', borderRadius:8, background: already?'var(--tag-bg)':'var(--bg)', cursor: already?'default':'pointer', textAlign:'left', opacity: already?0.5:1, fontFamily:'var(--font-body)' }}>
                      {r.image_url && <img src={r.image_url} alt="" style={{ width:36, height:36, borderRadius:5, objectFit:'cover', flexShrink:0 }} onError={e => e.target.style.display='none'} />}
                      <span style={{ fontSize:13, fontWeight:500 }}>{r.title}</span>
                      {already && <span style={{ marginLeft:'auto', fontSize:11, color:'var(--text-muted)' }}>added</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {showShopping && <ShoppingListModal recipes={plannedRecipes} staples={staples} onClose={() => setShowShopping(false)} onSaveToGroceries={(items, checkedKeys) => { saveToGroceries(items, checkedKeys); setTab('groceries'); setShowShopping(false); }} />}
    </div>
  );
}
