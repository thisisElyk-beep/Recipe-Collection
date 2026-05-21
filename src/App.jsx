import { useState, useEffect } from 'react';
import { collection, addDoc, deleteDoc, doc, updateDoc, onSnapshot } from 'firebase/firestore';
import { getFirebaseDb, resetFirebaseDb } from './lib/firebase';
import Sidebar from './components/Sidebar';
import RecipeGrid from './components/RecipeGrid';
import RecipeView from './components/RecipeView';
import AddRecipeModal from './components/AddRecipeModal';
import SettingsModal from './components/SettingsModal';

export default function App() {
  const [recipes, setRecipes] = useState([]);
  const [customCollections, setCustomCollections] = useState([]);
  const [selectedCollection, setSelectedCollection] = useState('All Recipes');
  const [selectedTags, setSelectedTags] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewingRecipe, setViewingRecipe] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [isConfigured, setIsConfigured] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const ok = !!localStorage.getItem('firebase_config');
    setIsConfigured(ok);
    if (!ok) { setShowSettings(true); setLoading(false); }
  }, []);

  useEffect(() => {
    if (!isConfigured) return;
    const db = getFirebaseDb();
    if (!db) { setLoading(false); return; }

    const unsub = onSnapshot(collection(db, 'recipes'), snap => {
      setRecipes(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    }, err => { console.error(err); setLoading(false); });

    return unsub;
  }, [isConfigured]);

  useEffect(() => {
    if (!isConfigured) return;
    const db = getFirebaseDb();
    if (!db) return;

    const unsub = onSnapshot(collection(db, 'collections'), snap => {
      setCustomCollections(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return unsub;
  }, [isConfigured]);

  const collections = ['All Recipes', 'Favorites', ...customCollections.map(c => c.name)];

  const addRecipe = async (recipeData) => {
    const db = getFirebaseDb();
    if (!db) return;
    await addDoc(collection(db, 'recipes'), {
      ...recipeData,
      collection: recipeData.collection || 'All Recipes',
      favorited: false,
      created_at: new Date().toISOString(),
    });
  };

  const updateRecipe = async (id, updates) => {
    const db = getFirebaseDb();
    if (!db) return;
    await updateDoc(doc(db, 'recipes', id), updates);
    setViewingRecipe(prev => prev?.id === id ? { ...prev, ...updates } : prev);
  };

  const deleteRecipe = async (id) => {
    const db = getFirebaseDb();
    if (!db) return;
    await deleteDoc(doc(db, 'recipes', id));
    setViewingRecipe(null);
  };

  const addCollection = async (name) => {
    const db = getFirebaseDb();
    if (!db) return;
    if (!customCollections.find(c => c.name === name)) {
      await addDoc(collection(db, 'collections'), { name });
    }
  };

  const allTags = [...new Set(recipes.flatMap(r => r.tags || []))].sort();

  const filteredRecipes = recipes.filter(r => {
    if (selectedCollection === 'Favorites' && !r.favorited) return false;
    if (selectedCollection !== 'All Recipes' && selectedCollection !== 'Favorites' && r.collection !== selectedCollection) return false;
    if (selectedTags.length > 0 && !selectedTags.every(t => (r.tags || []).includes(t))) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (r.title || '').toLowerCase().includes(q)
        || (r.description || '').toLowerCase().includes(q)
        || (r.tags || []).some(t => t.toLowerCase().includes(q));
    }
    return true;
  });

  const handleSettingsSave = () => {
    resetFirebaseDb();
    setIsConfigured(true);
    setShowSettings(false);
    setLoading(true);
  };

  return (
    <div className="app">
      <Sidebar
        collections={collections}
        selectedCollection={selectedCollection}
        onSelectCollection={col => { setSelectedCollection(col); setSelectedTags([]); }}
        allTags={allTags}
        selectedTags={selectedTags}
        onToggleTag={tag => setSelectedTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag])}
        onAddCollection={addCollection}
        onOpenSettings={() => setShowSettings(true)}
        recipes={recipes}
      />

      <main className="main">
        <RecipeGrid
          recipes={filteredRecipes}
          loading={loading}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onAddRecipe={() => setShowAddModal(true)}
          onSelectRecipe={setViewingRecipe}
          selectedCollection={selectedCollection}
          isConfigured={isConfigured}
        />
      </main>

      {viewingRecipe && (
        <RecipeView
          recipe={viewingRecipe}
          collections={collections}
          onClose={() => setViewingRecipe(null)}
          onUpdate={updateRecipe}
          onDelete={deleteRecipe}
        />
      )}

      {showAddModal && (
        <AddRecipeModal
          collections={collections}
          onClose={() => setShowAddModal(false)}
          onSave={addRecipe}
        />
      )}

      {showSettings && (
        <SettingsModal
          onClose={() => { if (isConfigured) setShowSettings(false); }}
          onSave={handleSettingsSave}
          canClose={isConfigured}
        />
      )}
    </div>
  );
}
