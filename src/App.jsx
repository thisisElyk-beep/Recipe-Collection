import { useState, useEffect } from 'react';
import { collection, addDoc, deleteDoc, doc, updateDoc, onSnapshot, writeBatch } from 'firebase/firestore';
import { getFirebaseDb, resetFirebaseDb } from './lib/firebase';
import Sidebar from './components/Sidebar';
import RecipeGrid from './components/RecipeGrid';
import RecipeView from './components/RecipeView';
import AddRecipeModal from './components/AddRecipeModal';
import SettingsModal from './components/SettingsModal';
import SelectionBar from './components/SelectionBar';

export default function App() {
  const [recipes, setRecipes] = useState([]);
  const [customCollections, setCustomCollections] = useState([]);
  const [selectedCollection, setSelectedCollection] = useState('All Recipes');
  const [selectedTags, setSelectedTags] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [sort, setSort] = useState('newest');
  const [viewingRecipe, setViewingRecipe] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [isConfigured] = useState(true);
  const [loading, setLoading] = useState(true);
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());

  useEffect(() => {
    const db = getFirebaseDb();
    if (!db) { setLoading(false); return; }
    const unsub = onSnapshot(collection(db,'recipes'), snap => {
      setRecipes(snap.docs.map(d=>({id:d.id,...d.data()})));
      setLoading(false);
    }, ()=>setLoading(false));
    return unsub;
  }, []);

  useEffect(() => {
    const db = getFirebaseDb();
    if (!db) return;
    return onSnapshot(collection(db,'collections'), snap => {
      setCustomCollections(snap.docs.map(d=>({id:d.id,...d.data()})));
    });
  }, []);

  const collections = ['All Recipes','Favorites',...customCollections.map(c=>c.name)];
  const allTags = [...new Set(recipes.flatMap(r=>r.tags||[]))].sort();

  const addRecipe = async data => {
    const db = getFirebaseDb(); if (!db) return;
    await addDoc(collection(db,'recipes'),{...data,collection:data.collection||'All Recipes',favorited:false,created_at:new Date().toISOString()});
  };

  const updateRecipe = async (id, updates) => {
    const db = getFirebaseDb(); if (!db) return;
    await updateDoc(doc(db,'recipes',id), updates);
    setViewingRecipe(prev=>prev?.id===id?{...prev,...updates}:prev);
  };

  const deleteRecipe = async id => {
    const db = getFirebaseDb(); if (!db) return;
    await deleteDoc(doc(db,'recipes',id));
    setViewingRecipe(null);
  };

  const addCollection = async name => {
    const db = getFirebaseDb(); if (!db) return;
    if (!customCollections.find(c=>c.name===name)) await addDoc(collection(db,'collections'),{name});
  };

  const deleteCollection = async name => {
    const db = getFirebaseDb(); if (!db) return;
    const col = customCollections.find(c=>c.name===name);
    if (col) await deleteDoc(doc(db,'collections',col.id));
    await Promise.all(recipes.filter(r=>r.collection===name).map(r=>updateDoc(doc(db,'recipes',r.id),{collection:'All Recipes'})));
    if (selectedCollection===name) setSelectedCollection('All Recipes');
  };

  const renameCollection = async (oldName, newName) => {
    const db = getFirebaseDb(); if (!db) return;
    const col = customCollections.find(c=>c.name===oldName);
    if (col) await updateDoc(doc(db,'collections',col.id),{name:newName});
    await Promise.all(recipes.filter(r=>r.collection===oldName).map(r=>updateDoc(doc(db,'recipes',r.id),{collection:newName})));
    setSelectedCollection(newName);
  };

  const moveSelectedToCollection = async target => {
    const db = getFirebaseDb(); if (!db) return;
    const batch = writeBatch(db);
    selectedIds.forEach(id=>batch.update(doc(db,'recipes',id),{collection:target}));
    await batch.commit();
    setSelectedIds(new Set()); setSelectMode(false);
  };

  const exportRecipes = () => {
    const data = JSON.stringify(recipes, null, 2);
    const blob = new Blob([data], {type:'application/json'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `recipe-vault-export-${new Date().toISOString().slice(0,10)}.json`;
    a.click(); URL.revokeObjectURL(url);
  };

  const toggleSelectMode = () => { setSelectMode(v=>!v); setSelectedIds(new Set()); };
  const toggleSelect = id => setSelectedIds(prev=>{const n=new Set(prev);n.has(id)?n.delete(id):n.add(id);return n;});

  const filteredRecipes = recipes.filter(r => {
    if (selectedCollection==='Favorites'&&!r.favorited) return false;
    if (selectedCollection!=='All Recipes'&&selectedCollection!=='Favorites'&&r.collection!==selectedCollection) return false;
    if (selectedTags.length>0&&!selectedTags.every(t=>(r.tags||[]).includes(t))) return false;
    if (searchQuery) { const q=searchQuery.toLowerCase(); return (r.title||'').toLowerCase().includes(q)||(r.description||'').toLowerCase().includes(q)||(r.tags||[]).some(t=>t.toLowerCase().includes(q)); }
    return true;
  });

  return (
    <div className="app">
      <Sidebar
        collections={collections}
        selectedCollection={selectedCollection}
        onSelectCollection={col=>{setSelectedCollection(col);setSelectedTags([]);setViewingRecipe(null);setSelectMode(false);setSelectedIds(new Set());}}
        allTags={allTags}
        selectedTags={selectedTags}
        onToggleTag={tag=>setSelectedTags(prev=>prev.includes(tag)?prev.filter(t=>t!==tag):[...prev,tag])}
        onAddCollection={addCollection}
        onDeleteCollection={deleteCollection}
        onOpenSettings={()=>setShowSettings(true)}
        onExport={exportRecipes}
        recipes={recipes}
      />

      <main className="main">
        {viewingRecipe ? (
          <RecipeView recipe={viewingRecipe} collections={collections} onClose={()=>setViewingRecipe(null)} onUpdate={updateRecipe} onDelete={deleteRecipe} />
        ) : (
          <RecipeGrid
            recipes={filteredRecipes} loading={loading} searchQuery={searchQuery}
            onSearchChange={setSearchQuery} onAddRecipe={()=>setShowAddModal(true)}
            onSelectRecipe={setViewingRecipe} selectedCollection={selectedCollection}
            isConfigured={isConfigured} selectMode={selectMode} selectedIds={selectedIds}
            onToggleSelect={toggleSelect} onToggleSelectMode={toggleSelectMode}
            onRenameCollection={renameCollection} onUpdateRecipe={updateRecipe}
            sort={sort} onSortChange={setSort}
          />
        )}
      </main>

      {selectMode&&!viewingRecipe&&(
        <SelectionBar count={selectedIds.size} collections={collections} onMove={moveSelectedToCollection}
          onSelectAll={()=>setSelectedIds(new Set(filteredRecipes.map(r=>r.id)))}
          onClear={()=>setSelectedIds(new Set())} onCancel={toggleSelectMode} totalVisible={filteredRecipes.length} />
      )}

      {showAddModal&&<AddRecipeModal collections={collections} onClose={()=>setShowAddModal(false)} onSave={addRecipe}/>}
      {showSettings&&<SettingsModal onClose={()=>setShowSettings(false)} onSave={()=>{resetFirebaseDb();setShowSettings(false);}} canClose={true}/>}
    </div>
  );
}
