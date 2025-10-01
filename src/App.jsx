import React, { useState, useEffect, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, setDoc, onSnapshot } from 'firebase/firestore';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { Calendar, Users, DollarSign, List, Grid, MapPin, Briefcase, Plus, Trash2, Edit, Save, X, Sun, Sparkles, Heart, Link as LinkIcon, Image as ImageIcon, Gift, Wand2, Check, Palette } from 'lucide-react';

const GEMINI_API_KEY = "AIzaSyBEzh4YErzlz5m1J2eM8zhTbNhkjUR7_v0"; // Your single source of truth

// --- Firebase Configuration ---
const firebaseConfig = {
    apiKey: "AIzaSyBdUMEVSWUHHpy-XszBWG2hG9NhCNSPKIg",
    authDomain: "wedding-planner-53cd1.firebaseapp.com",
    projectId: "wedding-planner-53cd1",
    storageBucket: "wedding-planner-53cd1.firebasestorage.app",
    messagingSenderId: "883662831167",
    appId: "1:883662831167:web:b99a447e8f8d3e9e6e828a"
};


// --- Main App Component ---
const App = () => {
    // --- App Mode State ---
    const [appMode, setAppMode] = useState('welcome'); 
    
    // --- Wedding Planner State ---
    const [activeTab, setActiveTab] = useState('dashboard');
    const [weddingData, setWeddingData] = useState({
        weddingDate: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0],
        guestList: [],
        budget: { estimated: 10000, expenses: [] },
        todoList: [],
        venues: [],
        vendors: [],
    });
    const [modal, setModal] = useState(null);
    const [editItemId, setEditItemId] = useState(null);
    const [formData, setFormData] = useState({});
    const [isGeneratingTasks, setIsGeneratingTasks] = useState(false);
    const [aiScoutCache, setAiScoutCache] = useState({ query: { location: '', budget: '' }, results: [], isLoading: false, error: null });
    
    // --- Proposal & Simulator State ---
    const [proposalPlan, setProposalPlan] = useState({ todoList: [] });
    const [dreamWedding, setDreamWedding] = useState({});

    // --- Firebase State ---
    const [auth, setAuth] = useState(null);
    const [db, setDb] = useState(null);
    const [userId, setUserId] = useState(null);
    const [isAuthReady, setIsAuthReady] = useState(false);
    const [seatingPlan, setSeatingPlan] = useState({
    'Table 1': [],
    'Table 2': [],
    'Table 3': [],
    'Table 4': [],
    });

    // --- Firebase Initialization and Auth ---
    useEffect(() => {
        if (firebaseConfig.apiKey) {
            const app = initializeApp(firebaseConfig);
            const authInstance = getAuth(app);
            const dbInstance = getFirestore(app);
            setAuth(authInstance);
            setDb(dbInstance);
            const unsubscribe = onAuthStateChanged(authInstance, async (user) => {
                if (user) { setUserId(user.uid); } 
                else { try { await signInAnonymously(authInstance); } catch (error) { console.error("Anonymous auth error:", error); } }
                setIsAuthReady(true);
            });
            return () => unsubscribe();
        } else {
            setIsAuthReady(true);
        }
    }, []);

    // --- Data Fetching and Saving ---
    useEffect(() => {
        if (!isAuthReady || !db || !userId) return;

        const modes = {
            planning: { collection: 'weddings', setData: setWeddingData, initialData: { weddingDate: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0], guestList: [], budget: { estimated: 10000, expenses: [] }, todoList: [], venues: [], vendors: [], }},
            proposal: { collection: 'proposals', setData: setProposalPlan, initialData: { todoList: [{ id: 1, text: 'Research rings', completed: false }] } },
            simulator: { collection: 'simulations', setData: setDreamWedding, initialData: { theme: 'Modern' } }
        };
        const currentMode = modes[appMode];
        if (!currentMode) return;

        const docRef = doc(db, currentMode.collection, userId);
        const unsubscribe = onSnapshot(docRef, (docSnap) => {
            if (docSnap.exists()) {
                currentMode.setData(prev => ({ ...prev, ...docSnap.data() }));
            } else {
                setDoc(docRef, currentMode.initialData); 
            }
        });

        return () => unsubscribe();
    }, [isAuthReady, db, userId, appMode]); 

    const handleDataUpdate = async (newData, mode = appMode) => {
        if (!isAuthReady || !db || !userId) return;
        const collectionMap = { planning: 'weddings', proposal: 'proposals', simulator: 'simulations' };
        const collectionName = collectionMap[mode];
        if (!collectionName) return;
        const docRef = doc(db, collectionName, userId);
        try { await setDoc(docRef, newData, { merge: true }); } 
        catch (error) { console.error("Error updating document:", error); }
    };
    
    const startWeddingPlanning = (dreamData = null) => {
    // Start with the default wedding data
    let initialWeddingData = {
        weddingDate: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0],
        guestList: [],
        budget: { estimated: 10000, expenses: [] },
        todoList: [],
        venues: [],
        vendors: [],
    };

    if (dreamData) {
        console.log("Importing dream data:", dreamData);
        // Overwrite the budget with the one from the simulator
        initialWeddingData.budget.estimated = dreamData.budget;

        // Add a personalized to-do item based on the theme
        const themeTodo = {
            id: new Date().getTime(),
            task: `Find vendors that match our "${dreamData.theme}" theme!`,
            completed: false,
            // Set due date for 1 week from today
            dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
        };
        initialWeddingData.todoList.unshift(themeTodo); // Add to the beginning of the list
    }
    
    // Save this new combined data to Firebase under the 'weddings' collection
    handleDataUpdate(initialWeddingData, 'planning');
    
    // Finally, switch to the main planner mode
    setAppMode('planning');
};
    
    // --- Event Handlers for Wedding Planner ---
    const openModal = (type, item = null) => { setModal(type); if (item) { setEditItemId(item.id); setFormData(item); } else { setEditItemId(null); setFormData({}); } };
    const closeModal = () => { setModal(null); setEditItemId(null); setFormData({}); };
    const handleFormChange = (e) => { const { name, value, type, checked } = e.target; setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value })); };
    const handleFormSubmit = (e) => { e.preventDefault(); let updatedData = { ...weddingData }; const id = editItemId || new Date().getTime(); switch (modal) { case 'guest': const newGuest = { id, ...formData, status: formData.status || 'Pending' }; updatedData.guestList = editItemId ? updatedData.guestList.map(g => g.id === id ? newGuest : g) : [...(weddingData.guestList || []), newGuest]; break; case 'expense': const newExpense = { id, ...formData, estimated: parseFloat(formData.estimated || 0), actual: parseFloat(formData.actual || 0) }; updatedData.budget.expenses = editItemId ? updatedData.budget.expenses.map(ex => ex.id === id ? newExpense : ex) : [...(weddingData.budget.expenses || []), newExpense]; break; case 'todo': const newTodo = { id, ...formData, completed: formData.completed || false }; updatedData.todoList = editItemId ? updatedData.todoList.map(t => t.id === id ? newTodo : t) : [...(weddingData.todoList || []), newTodo]; break; case 'venue': const newVenue = { id, ...formData }; updatedData.venues = editItemId ? updatedData.venues.map(v => v.id === id ? newVenue : v) : [...(weddingData.venues || []), newVenue]; break; case 'vendor': const newVendor = { id, ...formData }; updatedData.vendors = editItemId ? updatedData.vendors.map(v => v.id === id ? newVendor : v) : [...(weddingData.vendors || []), newVendor]; break; default: break; } handleDataUpdate(updatedData, 'planning'); closeModal(); };
    const handleDelete = (type, id) => { let updatedData = { ...weddingData }; switch (type) { case 'guest': updatedData.guestList = updatedData.guestList.filter(g => g.id !== id); break; case 'expense': updatedData.budget.expenses = updatedData.budget.expenses.filter(ex => ex.id !== id); break; case 'todo': updatedData.todoList = updatedData.todoList.filter(t => t.id !== id); break; case 'venue': updatedData.venues = updatedData.venues.filter(v => v.id !== id); break; case 'vendor': updatedData.vendors = updatedData.vendors.filter(v => v.id !== id); break; default: break; } handleDataUpdate(updatedData, 'planning'); }
    const handleWeddingDateChange = (e) => { handleDataUpdate({ ...weddingData, weddingDate: e.target.value }, 'planning'); };
    const handleBudgetChange = (e) => { handleDataUpdate({ ...weddingData, budget: {...weddingData.budget, estimated: parseFloat(e.target.value)} }, 'planning'); }
    const toggleTodoCompletion = (id) => { const updatedTodos = weddingData.todoList.map(todo => todo.id === id ? { ...todo, completed: !todo.completed } : todo ); handleDataUpdate({ ...weddingData, todoList: updatedTodos }, 'planning'); };
    const handleSaveVenueFromScout = (venue) => { const newVenue = { id: new Date().getTime(), name: venue.name, location: venue.location, notes: `Aesthetic: ${venue.aesthetic_description || 'N/A'}.`, price: venue.estimated_price, capacity: '', website: venue.website_url || '', imageUrl: venue.image_url || '' }; handleDataUpdate({ ...weddingData, venues: [...(weddingData.venues || []), newVenue] }, 'planning'); setActiveTab('venues'); };
    const handleGenerateTasks = async () => {
    setIsGeneratingTasks(true);
    // Your new, correct API key
    const apiKey = GEMINI_API_KEY; 
    // The stable 'gemini-1.5-flash-001' model name
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent?key=${apiKey}`;

    const prompt = `You are an expert wedding planner. Based on a wedding date of ${weddingData.weddingDate}, generate a comprehensive list of to-do items for planning a wedding. Return the response as a valid JSON array of objects. Each object must have a 'task' (string) and a 'dueDate' (string in 'YYYY-MM-DD' format) property. The 'dueDate' should be calculated relative to the wedding date. Create at least 15 tasks. Ensure the entire response is only the JSON array, with no extra text or markdown formatting.`;

    const payload = {
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: "application/json" }
    };

    try {
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        if (!response.ok) {
            const errorBody = await response.json();
            console.error("API Error Body:", errorBody);
            throw new Error(`API call failed with status: ${response.status}`);
        }
        const result = await response.json();
        const generatedText = result.candidates?.[0]?.content?.parts?.[0]?.text;
        
        if (generatedText) {
            const newTasks = JSON.parse(generatedText);
            const formattedTasks = newTasks.map((task, index) => ({
                id: new Date().getTime() + index,
                task: task.task,
                dueDate: task.dueDate,
                completed: false
            }));
            handleDataUpdate({ ...weddingData, todoList: [...(weddingData.todoList || []), ...formattedTasks] }, 'planning');
        }
    } catch (error) {
        console.error("Error generating tasks:", error);
    } finally {
        setIsGeneratingTasks(false);
    }
};

    // --- Memoized Calculations ---
    const dashboardStats = useMemo(() => { const { weddingDate, guestList, budget, todoList } = weddingData; const today = new Date(); const wDate = new Date(weddingDate); const countdown = Math.ceil((wDate - today) / (1000 * 60 * 60 * 24)); const guestsAttending = (guestList || []).filter(g => g.status === 'Attending').length; const totalGuests = (guestList || []).length; const actualSpending = (budget.expenses || []).reduce((acc, curr) => acc + (parseFloat(curr.actual) || 0), 0); const tasksCompleted = (todoList || []).filter(t => t.completed).length; const totalTasks = (todoList || []).length; return { countdown, guestsAttending, totalGuests, actualSpending, estimatedBudget: budget.estimated, tasksCompleted, totalTasks }; }, [weddingData]);
    const budgetChartData = useMemo(() => { const { expenses } = weddingData.budget; if (!expenses || expenses.length === 0) return []; const categoryTotals = expenses.reduce((acc, expense) => { const category = expense.category || 'Uncategorized'; acc[category] = (acc[category] || 0) + (parseFloat(expense.actual) || 0); return acc; }, {}); return Object.entries(categoryTotals).map(([name, value]) => ({ name, value })); }, [weddingData.budget.expenses]);

    // --- Content Renderer for 'planning' mode ---
    const renderContent = () => {
    switch (activeTab) {
        case 'dashboard': return <Dashboard stats={dashboardStats} weddingDate={weddingData.weddingDate} onDateChange={handleWeddingDateChange} budgetChartData={budgetChartData} />;
        case 'guests': return <GuestList guests={weddingData.guestList || []} onAdd={() => openModal('guest')} onEdit={(item) => openModal('guest', item)} onDelete={(id) => handleDelete('guest', id)} />;
        // NEW CASE ADDED HERE
        case 'seating': return <SeatingChart guests={weddingData.guestList || []} plan={seatingPlan} setPlan={setSeatingPlan} />;
        case 'budget': return <Budget budget={weddingData.budget || {}} onAddExpense={() => openModal('expense')} onEditExpense={(item) => openModal('expense', item)} onDeleteExpense={(id) => handleDelete('expense', id)} onBudgetChange={handleBudgetChange} chartData={budgetChartData}/>;
        case 'todos': return <TodoList todos={weddingData.todoList || []} onAdd={() => openModal('todo')} onEdit={(item) => openModal('todo', item)} onDelete={(id) => handleDelete('todo', id)} onToggle={toggleTodoCompletion} onGenerateTasks={handleGenerateTasks} isGeneratingTasks={isGeneratingTasks} />;
        case 'venues': return <Venues venues={weddingData.venues || []} onAdd={() => openModal('venue')} onEdit={(item) => openModal('venue', item)} onDelete={(id) => handleDelete('venue', id)} />;
        case 'vendors': return <Vendors vendors={weddingData.vendors || []} onAdd={() => openModal('vendor')} onEdit={(item) => openModal('vendor', item)} onDelete={(id) => handleDelete('vendor', id)} />;
        case 'ai-scout': return <AIVenueScout onSaveVenue={handleSaveVenueFromScout} cache={aiScoutCache} setCache={setAiScoutCache} />;
        default: return <Dashboard stats={dashboardStats} weddingDate={weddingData.weddingDate} onDateChange={handleWeddingDateChange} budgetChartData={budgetChartData} />;
    }
    };
    
    // --- Main Render Function ---
    if (!isAuthReady) {
        return <div className="flex items-center justify-center h-screen bg-gray-100 dark:bg-gray-900"><div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-pink-500"></div></div>;
    }

    switch (appMode) {
        case 'welcome':
            return <WelcomeScreen setAppMode={setAppMode} />;
        case 'proposal':
            return <ProposalPlanner plan={proposalPlan} onUpdate={handleDataUpdate} onComplete={startWeddingPlanning} />;
        case 'simulator':
            return <WeddingSimulator dream={dreamWedding} onUpdate={handleDataUpdate} onComplete={startWeddingPlanning} />;
        case 'planning':
            return (
                <div className="flex h-screen bg-gray-100 dark:bg-gray-900 font-sans">
                    <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} userId={userId} />
                    <main className="flex-1 p-4 md:p-8 overflow-y-auto">
                        {renderContent()}
                    </main>
                    {modal && <Modal modalType={modal} onClose={closeModal} onSubmit={handleFormSubmit} formData={formData} onChange={handleFormChange} />}
                </div>
            );
        default:
            return <WelcomeScreen setAppMode={setAppMode} />;
    }
};

// --- All Components are defined OUTSIDE the main App component ---

const WelcomeScreen = ({ setAppMode }) => (
    <div className="flex flex-col items-center justify-center h-screen bg-gradient-to-br from-pink-100 to-purple-100 dark:from-gray-800 dark:to-gray-900 text-center p-4">
        <h1 className="text-5xl font-bold text-gray-800 dark:text-white mb-4">Welcome to Your Love Story</h1>
        <p className="text-xl text-gray-600 dark:text-gray-300 mb-12 max-w-2xl">Whether you're planning the perfect question or dreaming of the perfect day, your journey starts here.</p>
        <div className="flex flex-col md:flex-row gap-8">
            <button onClick={() => setAppMode('proposal')} className="bg-white dark:bg-gray-700 text-gray-800 dark:text-white font-semibold py-6 px-12 rounded-lg shadow-lg hover:shadow-2xl transform hover:-translate-y-1 transition-all duration-300">
                <Gift size={40} className="mx-auto mb-4 text-pink-500"/>
                <h2 className="text-2xl">Plan a Proposal</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">Craft the unforgettable moment.</p>
            </button>
            <button onClick={() => setAppMode('simulator')} className="bg-white dark:bg-gray-700 text-gray-800 dark:text-white font-semibold py-6 px-12 rounded-lg shadow-lg hover:shadow-2xl transform hover:-translate-y-1 transition-all duration-300">
                <Wand2 size={40} className="mx-auto mb-4 text-purple-500"/>
                <h2 className="text-2xl">Dream Up Your Wedding</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">Visualize your perfect day.</p>
            </button>
        </div>
        <div className="mt-16">
            <button onClick={() => setAppMode('planning')} className="text-gray-500 dark:text-gray-400 hover:text-pink-500 transition-colors">
                Already engaged? Skip to the wedding planner &rarr;
            </button>
        </div>
    </div>
);

const ProposalPlanner = ({ plan, onUpdate, onComplete }) => {
    const [activeSection, setActiveSection] = useState('checklist');
    const handleTodoToggle = (id) => {
        const updatedTodos = (plan.todoList || []).map(todo =>
            todo.id === id ? { ...todo, completed: !todo.completed } : todo
        );
        onUpdate({ ...plan, todoList: updatedTodos }, 'proposal');
    };
    const renderSection = () => {
        switch(activeSection) {
            case 'ringSizer': return <RingSizerGuide />;
            case 'ideas': return <IdeaGenerator />;
            case 'checklist': 
            default:
                return (
                    <div className="w-full">
                        <h2 className="text-2xl font-semibold mb-4 text-gray-200">The Secret Checklist</h2>
                        <ul className="space-y-3">
                            {(plan.todoList || []).map(todo => (
                                <li key={todo.id} className="flex items-center bg-gray-700 p-4 rounded-lg">
                                    <input type="checkbox" checked={todo.completed} onChange={() => handleTodoToggle(todo.id)} className="h-6 w-6 rounded border-gray-500 bg-gray-800 text-pink-500 focus:ring-pink-600 cursor-pointer" />
                                    <span className={`ml-4 text-lg ${todo.completed ? 'line-through text-gray-400' : 'text-gray-200'}`}>{todo.text}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                );
        }
    };
    return (
        <div className="flex h-screen bg-gray-900 text-white font-sans">
            <div className="w-24 lg:w-72 bg-gray-800 p-4 flex flex-col shadow-2xl">
                <div className="flex items-center justify-center lg:justify-start mb-10 pt-4">
                     <Gift size={32} className="text-pink-500"/>
                     <h1 className="hidden lg:block ml-3 text-2xl font-bold">Proposal Plan</h1>
                </div>
                <nav className="flex flex-col space-y-2">
                    <PlannerNavButton label="Checklist" icon={<List />} isActive={activeSection === 'checklist'} onClick={() => setActiveSection('checklist')} />
                    <PlannerNavButton label="Ring Sizer" icon={<Heart />} isActive={activeSection === 'ringSizer'} onClick={() => setActiveSection('ringSizer')} />
                    <PlannerNavButton label="Idea Generator" icon={<Sparkles />} isActive={activeSection === 'ideas'} onClick={() => setActiveSection('ideas')} />
                </nav>
                <div className="mt-auto">
                    <button onClick={onComplete} className="w-full bg-green-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center text-lg">
                         <span className="hidden lg:inline">She/He/They Said Yes!</span> 🎉
                    </button>
                </div>
            </div>
            <main className="flex-1 p-6 md:p-10 overflow-y-auto">{renderSection()}</main>
        </div>
    );
};

// --- NEW COMPONENT: Wedding Simulator (FULLY BUILT) ---
// --- UPDATED COMPONENT: Wedding Simulator (with Virtual Stylist) ---
// --- FINAL COMPONENT: Wedding Simulator (with Forecaster) ---
const WeddingSimulator = ({ dream, onUpdate, onComplete }) => {
    const [isGeneratingPalette, setIsGeneratingPalette] = useState(false);
    // NEW: State for saved color palettes
    const [savedPalettes, setSavedPalettes] = useState([]);

    // Default styles object
    const defaultStyles = {
        brideNeckline: 'Sweetheart',
        brideHasVeil: false,
        bridesmaidColor: '#92A8D1',
        bridesmaidDressLength: 'long',
        groomSuit: '#374151',
        groomAccessory: 'necktie',
        groomShoeColor: '#5d4037',
    };
    
    // REFACTORED: Consolidate all derived state from props into a single memoized object.
    const currentDream = useMemo(() => {
        const styles = {
            ...defaultStyles,
            ...(dream?.styles || {})
        };
        return {
            theme: dream?.theme || 'Modern Romantic',
            palette: dream?.palette || ['#F7CAC9'],
            budget: dream?.budget ?? 25000,
            styles: styles
        }
    }, [dream]);


    // --- DATA & CONFIGURATION ---
    const themes = [
        { name: 'Modern Romantic', icon: '💖', color: '#F7CAC9' },
        { name: 'Rustic Bohemian', icon: '🌿', color: '#B2AC88' },
        { name: 'Classic Elegance', icon: '💎', color: '#92A8D1' },
        { name: 'Tropical Getaway', icon: '🌴', color: '#FF8C69' },
    ];
    const suitColors = { Navy: '#1e3a8a', Charcoal: '#374151', Black: '#111827', Tan: '#d2b48c' };
    const necklines = ['Sweetheart', 'V-Neck', 'Strapless'];
    const shoeColors = { Brown: '#5d4037', Black: '#000000' };
    const costData = { themes: { 'Modern Romantic': 15000, 'Rustic Bohemian': 12000, 'Classic Elegance': 20000, 'Tropical Getaway': 25000 } };
    
    // UPDATED: Create a dynamic list of suit colors including ALL theme colors
    const dynamicSuitColors = useMemo(() => {
        const availableColors = new Map(Object.entries(suitColors).map(([name, color]) => [color, name]));
        if (currentDream.palette && currentDream.palette.length > 1) {
            currentDream.palette.slice(1).forEach((color, index) => {
                if (!availableColors.has(color)) {
                    availableColors.set(color, `Theme Color ${index + 1}`);
                }
            });
        }
        return Array.from(availableColors, ([color, name]) => ({ name, color }));
    }, [currentDream.palette]);
    
    // --- MEMOIZED CALCULATIONS ---
    const estimatedDreamCost = useMemo(() => {
        const themeCost = costData.themes[currentDream.theme] || 15000;
        const dressCost = 2500; // Average dress cost
        return themeCost + dressCost;
    }, [currentDream.theme, costData.themes]);

    // --- EVENT HANDLERS ---
    const handleUpdate = (newDreamState) => {
        onUpdate(newDreamState, 'simulator');
    };
    
    const handleStyleUpdate = (styleField, value) => {
        const newStyles = { ...currentDream.styles, [styleField]: value };
        onUpdate({ ...currentDream, styles: newStyles }, 'simulator');
    };

    const handleColorSelectAndGenerate = async (baseColor, currentThemeName) => {
        setIsGeneratingPalette(true);
        const initialUpdate = { ...currentDream, theme: currentThemeName, palette: [baseColor] };
        onUpdate(initialUpdate, 'simulator');

        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent?key=${GEMINI_API_KEY}`;
        const prompt = `
            You are an expert wedding color palette designer. Your response must be a single, valid JSON object and nothing else.
            Based on the primary hex color "${baseColor}", create a sophisticated and elegant 5-color wedding palette suitable for a "${currentThemeName}" theme. The palette should feel harmonious, not jarring.
            Generate colors that follow a split-complementary, analogous, or triadic color harmony.
            The JSON object must have a key "palette" which is an array of 5 hex color strings:
            1. The original base color.
            2. A secondary color.
            3. A main accent color.
            4. A lighter, softer accent color.
            5. A dark neutral color for text or grounding elements.
            Example format: { "palette": ["${baseColor}", "#hex2", "#hex3", "#hex4", "#hex5"] }
        `;
        const payload = { contents: [{ parts: [{ text: prompt }] }], generationConfig: { "responseMimeType": "application/json" } };

        try {
            const response = await fetch(apiUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
            if (!response.ok) throw new Error(`API call failed: ${response.statusText}`);
            const result = await response.json();
            const rawText = result.candidates?.[0]?.content?.parts?.[0]?.text;
            if (!rawText) throw new Error("AI returned an empty response.");
            const newPalette = JSON.parse(rawText).palette;
            if (Array.isArray(newPalette) && newPalette.length > 0) {
                const finalUpdate = { ...initialUpdate, palette: newPalette, styles: { ...initialUpdate.styles, bridesmaidColor: newPalette[1] || initialUpdate.styles.bridesmaidColor, groomSuit: newPalette[4] || initialUpdate.styles.groomSuit }};
                onUpdate(finalUpdate, 'simulator');
            } else { throw new Error("Parsed data did not contain a valid palette."); }
        } catch (error) {
            console.error("Error generating palette:", error);
            onUpdate({ ...initialUpdate, palette: [baseColor, '#e2e8f0', '#94a3b8', '#475569', '#1e293b']}, 'simulator');
        } finally {
            setIsGeneratingPalette(false);
        }
    };

    const handleThemeSelect = (selectedTheme) => { handleColorSelectAndGenerate(selectedTheme.color, selectedTheme.name); };

    // --- Handlers for saving, applying, and deleting palettes ---
    const handleSavePalette = () => {
        const currentPaletteString = JSON.stringify(currentDream.palette);
        // Using functional update to prevent race conditions
        setSavedPalettes(prevPalettes => {
            const isAlreadySaved = prevPalettes.some(p => JSON.stringify(p) === currentPaletteString);
            if (!isAlreadySaved) {
                return [...prevPalettes, currentDream.palette];
            }
            return prevPalettes; // Return previous state if already saved
        });
    };

    const handleApplyPalette = (palette) => {
        const newStyles = {
            ...currentDream.styles,
            bridesmaidColor: palette[1] || currentDream.styles.bridesmaidColor,
            groomSuit: palette[4] || currentDream.styles.groomSuit,
        };
        onUpdate({ ...currentDream, palette: palette, styles: newStyles }, 'simulator');
    };

    // FIXED: Now filters based on the palette object itself, not the index.
    const handleDeletePalette = (paletteToDelete) => {
        const paletteToDeleteString = JSON.stringify(paletteToDelete);
        setSavedPalettes(prevPalettes => prevPalettes.filter(p => JSON.stringify(p) !== paletteToDeleteString));
    };


    // --- RENDER ---
    return (
        <div className="flex flex-col h-screen bg-gray-50 dark:bg-gray-900 font-sans text-gray-800 dark:text-gray-200">
            <header className="flex items-center justify-between p-4 bg-white dark:bg-gray-800 shadow-md">
                <div className="flex items-center">
                    <Wand2 size={28} className="text-purple-500" />
                    <h1 className="ml-3 text-2xl font-bold">Dream Wedding Simulator</h1>
                </div>
                <button onClick={() => onComplete(currentDream)} className="bg-pink-500 text-white font-bold py-2 px-6 rounded-lg hover:bg-pink-600 transition-colors">
                    Let's Start Planning!
                </button>
            </header>
            <main className="flex-1 p-6 md:p-10 overflow-y-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* --- Left Column: Controls --- */}
                <div className="lg-col-span-1 space-y-8">
                    {/* Theme Selector */}
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
                        <h2 className="text-xl font-semibold mb-4">1. Choose Your Theme</h2>
                        <div className="grid grid-cols-2 gap-4">
                            {themes.map(themeOption => (
                                <button key={themeOption.name} onClick={() => handleThemeSelect(themeOption)} className={`p-4 border-2 rounded-lg text-center transition-colors ${currentDream.theme === themeOption.name ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20' : 'border-gray-200 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700'}`}>
                                    <span className="text-3xl">{themeOption.icon}</span>
                                    <p className="font-semibold mt-2">{themeOption.name}</p>
                                </button>
                            ))}
                        </div>
                    </div>
                    {/* Color Palette Selector */}
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
                        <h2 className="text-xl font-semibold mb-4">2. Pick a Primary Color</h2>
                        <div className="flex items-center gap-4">
                            <input
                                type="color"
                                value={currentDream.palette[0] || '#ffffff'}
                                onInput={(e) => handleColorSelectAndGenerate(e.target.value, currentDream.theme)}
                                className="w-16 h-16 p-0 border-none rounded-lg cursor-pointer disabled:opacity-50"
                                disabled={isGeneratingPalette}
                            />
                            {isGeneratingPalette ? (
                                <div className="flex items-center text-gray-500">
                                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-purple-500 mr-2"></div>
                                    Generating...
                                </div>
                            ) : (
                                <p className="text-gray-500 dark:text-gray-400">Select a color for AI suggestions!</p>
                            )}
                        </div>
                    </div>
                    {/* Budget Input */}
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
                        <h2 className="text-xl font-semibold mb-2">3. Set a Dream Budget</h2>
                         <div className="flex items-center mt-4">
                            <span className="text-3xl font-bold mr-2 text-gray-400">$</span>
                            <input type="number" value={currentDream.budget} onChange={e => handleUpdate({ ...currentDream, budget: parseInt(e.target.value, 10) || 0 })} className="w-full text-3xl font-bold p-2 border-0 bg-transparent focus:ring-0" step="1000" />
                        </div>
                    </div>

                    {/* NEW: Saved Color Schemes Section */}
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
                        <h2 className="text-xl font-semibold mb-4">Saved Color Schemes</h2>
                        <div className="max-h-48 overflow-y-auto pr-2 space-y-3">
                            {savedPalettes.length === 0 ? (
                                <p className="text-gray-500 dark:text-gray-400 text-sm">Your saved palettes will appear here.</p>
                            ) : (
                                savedPalettes.map((palette) => (
                                    <div key={JSON.stringify(palette)} className="flex items-center justify-between p-2 rounded-lg bg-gray-50 dark:bg-gray-700/50">
                                        <div className="flex items-center space-x-2">
                                            {palette.map((color, cIndex) => (
                                                <div key={cIndex} className="w-6 h-6 rounded-full border border-gray-300 dark:border-gray-600" style={{ backgroundColor: color }}></div>
                                            ))}
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <button onClick={() => handleApplyPalette(palette)} title="Apply Palette" className="p-1 text-green-600 hover:text-green-500"><Check size={18} /></button>
                                            <button onClick={() => handleDeletePalette(palette)} title="Delete Palette" className="p-1 text-red-600 hover:text-red-500"><Trash2 size={18} /></button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>

                {/* --- Right Column: Vision Board & Stylist --- */}
                <div className="lg:col-span-2 space-y-8">
                    {/* Vision Board Preview */}
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg">
                        <h2 className="text-2xl font-bold mb-6 border-b pb-4 dark:border-gray-600">Your Dream Wedding Vision</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <p className="text-sm font-medium text-gray-500">THEME</p>
                                <p className="text-2xl font-semibold text-purple-600 dark:text-purple-400">{currentDream.theme}</p>
                            </div>
                            <div>
                                <p className="text-sm font-medium text-gray-500">COLOR PALETTE</p>
                                <div className="flex items-center space-x-3 mt-2">
                                    {currentDream.palette.map((color, index) => (
                                        <div key={index} className="w-12 h-12 rounded-lg shadow-inner border dark:border-gray-700" style={{ backgroundColor: color }}></div>
                                    ))}
                                    <button onClick={handleSavePalette} title="Save Palette" className="p-2 bg-gray-100 dark:bg-gray-700 rounded-full text-pink-500 hover:bg-pink-100 dark:hover:bg-pink-900/50 transition-colors">
                                        <Heart size={24} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                    {/* Budget Forecaster */}
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg">
                         <h2 className="text-2xl font-bold mb-4">Budget Forecaster</h2>
                        <div className="flex justify-between items-center text-lg">
                            <div className="text-gray-500">Your Budget: <span className="font-bold text-gray-800 dark:text-white">${currentDream.budget.toLocaleString()}</span></div>
                            <div className="text-gray-500">Estimated Cost: <span className="font-bold text-green-500">${estimatedDreamCost.toLocaleString()}</span></div>
                        </div>
                        <BudgetGauge currentValue={estimatedDreamCost} maxValue={currentDream.budget} />
                    </div>
                    {/* Virtual Stylist Section */}
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg">
                         <h2 className="text-2xl font-bold mb-6 border-b pb-4 dark:border-gray-600">Virtual Wedding Party Stylist</h2>
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-2 xl:grid-cols-3 gap-6 mb-8">
                            {/* Bride Controls */}
                            <div className="space-y-4">
                                 <h3 className="font-semibold text-lg text-gray-600 dark:text-gray-300">Bride</h3>
                                <div>
                                    <label className="block text-sm font-medium text-gray-500 mb-2">Neckline</label>
                                    <select value={currentDream.styles.brideNeckline} onChange={e => handleStyleUpdate('brideNeckline', e.target.value)} className="w-full p-2 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-md focus:ring-purple-500 focus:border-purple-500">
                                        {necklines.map(s => <option key={s} value={s}>{s}</option>)}
                                    </select>
                                </div>
                                <div className="flex items-center">
                                    <input type="checkbox" id="hasVeil" checked={currentDream.styles.brideHasVeil} onChange={e => handleStyleUpdate('brideHasVeil', e.target.checked)} className="h-4 w-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500" />
                                    <label htmlFor="hasVeil" className="ml-2 block text-sm">Add Veil</label>
                                </div>
                            </div>
                            {/* Groom Controls */}
                            <div className="space-y-4">
                                <h3 className="font-semibold text-lg text-gray-600 dark:text-gray-300">Groom</h3>
                                <div>
                                    <label className="block text-sm font-medium text-gray-500 mb-2">Suit Color</label>
                                    <div className="flex space-x-2 flex-wrap gap-y-2">
                                        {dynamicSuitColors.map(({ name, color }) => (
                                            <button key={color} title={name} onClick={() => handleStyleUpdate('groomSuit', color)} className={`w-8 h-8 rounded-full border-2 ${currentDream.styles.groomSuit === color ? 'border-purple-500 ring-2 ring-purple-500' : 'border-transparent'}`} style={{backgroundColor: color}}></button>
                                        ))}
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-500 mb-2">Accessory</label>
                                    <div className="flex space-x-2">
                                         <button onClick={() => handleStyleUpdate('groomAccessory', 'necktie')} className={`px-3 py-1 text-sm rounded-full ${currentDream.styles.groomAccessory === 'necktie' ? 'bg-purple-600 text-white' : 'bg-gray-200 dark:bg-gray-600'}`}>Tie</button>
                                         <button onClick={() => handleStyleUpdate('groomAccessory', 'bowtie')} className={`px-3 py-1 text-sm rounded-full ${currentDream.styles.groomAccessory === 'bowtie' ? 'bg-purple-600 text-white' : 'bg-gray-200 dark:bg-gray-600'}`}>Bowtie</button>
                                    </div>
                                </div>
                                {/* RESTORED: Groom shoe color selector */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-500 mb-2">Shoes</label>
                                    <div className="flex space-x-2">
                                        {Object.entries(shoeColors).map(([name, color]) => (
                                            <button key={name} title={name} onClick={() => handleStyleUpdate('groomShoeColor', color)} className={`w-8 h-8 rounded-full border-2 ${currentDream.styles.groomShoeColor === color ? 'border-purple-500 ring-2 ring-purple-500' : 'border-transparent'}`} style={{backgroundColor: color}}></button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                            {/* Bridesmaid Controls */}
                            <div className="space-y-4">
                                <h3 className="font-semibold text-lg text-gray-600 dark:text-gray-300">Bridesmaids</h3>
                                <div>
                                    <label className="block text-sm font-medium text-gray-500 mb-2">Dress Color</label>
                                    <div className="flex space-x-2">
                                        {currentDream.palette.map((c, i) => ( <button key={i} onClick={() => handleStyleUpdate('bridesmaidColor', c)} className={`w-8 h-8 rounded-full border-2 ${currentDream.styles.bridesmaidColor === c ? 'border-purple-500 ring-2 ring-purple-500' : 'border-transparent'}`} style={{backgroundColor: c}}></button>))}
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-500 mb-2">Dress Length</label>
                                    <div className="flex space-x-2">
                                        <button onClick={() => handleStyleUpdate('bridesmaidDressLength', 'long')} className={`px-3 py-1 text-sm rounded-full ${currentDream.styles.bridesmaidDressLength === 'long' ? 'bg-purple-600 text-white' : 'bg-gray-200 dark:bg-gray-600'}`}>Long</button>
                                        <button onClick={() => handleStyleUpdate('bridesmaidDressLength', 'short')} className={`px-3 py-1 text-sm rounded-full ${currentDream.styles.bridesmaidDressLength === 'short' ? 'bg-purple-600 text-white' : 'bg-gray-200 dark:bg-gray-600'}`}>Short</button>
                                    </div>
                                </div>
                            </div>
                        </div>
                        {/* Visual Preview of Wedding Party */}
                        <div className="bg-gray-100 dark:bg-gray-700/50 p-6 rounded-lg flex justify-center items-center space-x-4 h-64">
                            <BridesmaidIcon dressColor={currentDream.styles.bridesmaidColor} dressLength={currentDream.styles.bridesmaidDressLength} />
                            <BrideIcon dressStyle={currentDream.styles.brideNeckline} hasVeil={currentDream.styles.brideHasVeil} />
                            <GroomIcon suitColor={currentDream.styles.groomSuit} accessory={currentDream.styles.groomAccessory} shoeColor={currentDream.styles.groomShoeColor} />
                            <BridesmaidIcon dressColor={currentDream.styles.bridesmaidColor} dressLength={currentDream.styles.bridesmaidDressLength} />
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};

// --- NEW HELPER COMPONENT for the Stylist ---
// --- NEW, DETAILED ICONS for the Stylist ---

// --- UPGRADED, DETAILED ICONS for the Stylist ---

const BrideIcon = ({ dressStyle, hasVeil }) => (
    <div className="flex flex-col items-center">
        <svg width="70" height="192" viewBox="0 0 70 192" fill="none" xmlns="http://www.w3.org/2000/svg" className="transform scale-110">
            {/* Veil (Conditional) */}
            {hasVeil && <path d="M18 17C18 7.61116 25.6112 0 35 0C44.3888 0 52 7.61116 52 17V80L35 90L18 80V17Z" fill="rgba(255, 255, 255, 0.5)" />}
            {/* Head */}
            <path d="M35 0C44.3888 0 52 7.61116 52 17C52 26.3888 44.3888 34 35 34C25.6112 34 18 26.3888 18 17C18 7.61116 25.6112 0 35 0Z" fill="#e0ac93"/>
            {/* Base Dress Shape */}
            <path d="M12 42H58L70 192H0L12 42Z" fill="white"/>
            {/* Necklines */}
            {dressStyle === 'V-Neck' && <path d="M35 42L22 62H48L35 42Z" fill="#e0ac93" />}
            {dressStyle === 'Sweetheart' && <path d="M35 42C30 42 25 48 25 52C25 56 30 54 35 50C40 54 45 56 45 52C45 48 40 42 35 42Z" fill="#e0ac93" />}
            {dressStyle === 'Strapless' && <path d="M22 42H48V50H22V42Z" fill="#e0ac93" />}
        </svg>
       <p className="text-xs font-bold text-gray-500 dark:text-gray-400 mt-1">Bride ({dressStyle})</p>
    </div>
);

const GroomIcon = ({ suitColor, accessory, shoeColor }) => (
    <div className="flex flex-col items-center">
        <svg width="64" height="184" viewBox="0 0 64 184" fill="none" xmlns="http://www.w3.org/2000/svg">
            {/* Head */}
            <path d="M32 0C40.8366 0 48 7.16344 48 16C48 24.8366 40.8366 32 32 32C23.1634 32 16 24.8366 16 16C16 7.16344 23.1634 0 32 0Z" fill="#e0ac93"/>
            {/* Shoes */}
            <rect x="4" y="174" width="22" height="10" rx="5" fill={shoeColor} />
            <rect x="38" y="174" width="22" height="10" rx="5" fill={shoeColor} />
            {/* Suit */}
            <path d="M12 40H52L60 104L32 176L4 104L12 40Z" fill={suitColor}/>
            {/* Shirt */}
            <path d="M12 40L32 64L52 40L32 48L12 40Z" fill="white"/>
            {/* Accessories (Conditional) */}
            {accessory === 'necktie' && <path d="M32 64L28 104H36L32 64Z" fill={suitColor === '#111827' ? '#6b7280' : '#111827'}/>}
            {accessory === 'bowtie' && <path d="M24 62L32 68L40 62L40 74L32 68L24 74L24 62Z" fill={suitColor === '#111827' ? '#6b7280' : '#111827'} />}
        </svg>
        <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mt-1">Groom</p>
    </div>
);

const BridesmaidIcon = ({ dressColor, dressLength }) => (
    <div className="flex flex-col items-center">
        <svg width="56" height="160" viewBox="0 0 56 160" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M28 0C35.732 0 42 6.26801 42 14C42 21.732 35.732 28 28 28C20.268 28 14 21.732 14 14C14 6.26801 20.268 0 28 0Z" fill="#e0ac93"/>
            
            {/* Dress (Length is conditional) */}
            <path d={dressLength === 'short' ? "M10 36H46L52 100H4L10 36Z" : "M10 36H46L56 160H0L10 36Z"} fill={dressColor} />
            
            {/* Legs (Conditional) */}
            {dressLength === 'short' && (
                <>
                    <rect x="16" y="100" width="8" height="50" fill="#e0ac93" />
                    <rect x="32" y="100" width="8" height="50" fill="#e0ac93" />
                </>
            )}
        </svg>
        <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mt-1">Bridesmaid</p>
    </div>
);

const PlannerNavButton = ({ label, icon, isActive, onClick }) => ( <button onClick={onClick} className={`flex items-center justify-center lg:justify-start p-4 rounded-lg text-lg transition-colors duration-200 ${ isActive ? 'bg-pink-500/20 text-pink-400' : 'text-gray-300 hover:bg-gray-700' }`} > {icon} <span className="hidden lg:block ml-4">{label}</span> </button> );
const RingSizerGuide = () => ( <div> <h2 className="text-3xl font-bold mb-4 text-gray-100">Stealthy Ring Sizing 💍</h2> <p className="text-lg text-gray-400 mb-8">Here are a few clever ways to find out their ring size without spoiling the surprise.</p> <div className="grid grid-cols-1 md:grid-cols-2 gap-6"> <div className="bg-gray-800 p-6 rounded-lg"> <h3 className="text-xl font-semibold text-pink-400 mb-2">The "Borrow" Method</h3> <p className="text-gray-300">"Borrow" a ring they already own (make sure it's one they wear on the correct finger!). Take it to a jeweler or use a printable ring sizer chart online to measure it. Return it before they notice!</p> </div> <div className="bg-gray-800 p-6 rounded-lg"> <h3 className="text-xl font-semibold text-pink-400 mb-2">The "Impression" Trick</h3> <p className="text-gray-300">If you can't take the ring, press it into a bar of soap or a piece of clay to create an impression. You can then take the impression to be measured.</p> </div> <div className="bg-gray-800 p-6 rounded-lg"> <h3 className="text-xl font-semibold text-pink-400 mb-2">Recruit an Accomplice</h3> <p className="text-gray-300">Enlist one of their close friends or family members. The friend can suggest a "fun" trip to a jewelry store to try on rings, and then secretly report the size back to you.</p> </div> <div className="bg-gray-800 p-6 rounded-lg"> <h3 className="text-xl font-semibold text-pink-400 mb-2">The String Method (Risky!)</h3> <p className="text-gray-300">While they are sleeping, gently wrap a piece of string around their ring finger and mark where it overlaps. This is less accurate but can work in a pinch. Measure the string against a ruler in millimeters.</p> </div> </div> </div> );
const IdeaGenerator = () => { const [filters, setFilters] = useState({ personality: 'any', budget: 'any' }); const ideas = [ { id: 1, title: 'Romantic Dinner Proposal', description: 'Arrange a surprise dinner at their favorite restaurant or cook a gourmet meal at home. Propose over dessert.', personality: 'romantic', budget: 'medium' }, { id: 2, title: 'Scenic Hike Proposal', description: 'Plan a hike to a location with a breathtaking view. At the summit, get down on one knee.', personality: 'adventurous', budget: 'low' }, { id: 3, title: 'Cozy At-Home Proposal', description: 'Decorate your living room with photos, candles, and flowers. Propose in the comfort of your shared space during a quiet evening.', personality: 'homebody', budget: 'low' }, { id: 4, title: 'Destination Proposal', description: 'Plan a weekend getaway to a meaningful or beautiful location. Propose at sunset on the beach or with a city skyline in the background.', personality: 'adventurous', budget: 'high' }, { id: 5, title: 'Flash Mob Proposal', description: 'If your partner loves grand gestures, organize a surprise flash mob with friends and family that ends with your proposal.', personality: 'extrovert', budget: 'high' }, { id: 6, title: 'Photo Booth Surprise', description: 'While taking photos in a photo booth, pull out the ring between snaps. The photo strip will capture their genuine surprise.', personality: 'romantic', budget: 'low' }, { id: 7, 'title': 'Scavenger Hunt', 'description': 'Create a scavenger hunt with clues that lead to different meaningful spots in your relationship, with the final clue leading to you with the ring.', 'personality': 'adventurous', 'budget': 'medium' } ]; const filteredIdeas = ideas.filter(idea => (filters.personality === 'any' || idea.personality === filters.personality) && (filters.budget === 'any' || idea.budget === filters.budget) ); return ( <div> <h2 className="text-3xl font-bold mb-4 text-gray-100">Proposal Idea Generator ✨</h2> <p className="text-lg text-gray-400 mb-6">Find the perfect idea to match their personality and your budget.</p> <div className="flex space-x-4 mb-8 bg-gray-800 p-4 rounded-lg"> <div className="flex-1"> <label className="block text-sm font-medium text-gray-300 mb-1">Personality Type</label> <select value={filters.personality} onChange={e => setFilters({...filters, personality: e.target.value})} className="w-full p-2 border-gray-600 bg-gray-700 text-white rounded-md focus:ring-pink-500 focus:border-pink-500"> <option value="any">Any</option> <option value="romantic">Romantic</option> <option value="adventurous">Adventurous</option> <option value="homebody">Homebody</option> <option value="extrovert">Extrovert</option> </select> </div> <div className="flex-1"> <label className="block text-sm font-medium text-gray-300 mb-1">Budget Level</label> <select value={filters.budget} onChange={e => setFilters({...filters, budget: e.target.value})} className="w-full p-2 border-gray-600 bg-gray-700 text-white rounded-md focus:ring-pink-500 focus:border-pink-500"> <option value="any">Any</option> <option value="low">Low ($)</option> <option value="medium">Medium ($$)</option> <option value="high">High ($$$)</option> </select> </div> </div> <div className="space-y-4"> {filteredIdeas.map(idea => ( <div key={idea.id} className="bg-gray-800 p-6 rounded-lg"> <h3 className="text-xl font-semibold text-pink-400 mb-2">{idea.title}</h3> <p className="text-gray-300">{idea.description}</p> </div> ))} </div> </div> ); };
const Sidebar = ({ activeTab, setActiveTab, userId }) => {
    const navItems = [
        { id: 'dashboard', icon: <Sun className="w-6 h-6"/>, label: 'Dashboard' },
        { id: 'guests', icon: <Users className="w-6 h-6"/>, label: 'Guest List' },
        // NEW ITEM ADDED HERE
        { id: 'seating', icon: <Grid className="w-6 h-6"/>, label: 'Seating Chart' },
        { id: 'budget', icon: <DollarSign className="w-6 h-6"/>, label: 'Budget' },
        { id: 'todos', icon: <List className="w-6 h-6"/>, label: 'To-Do List' },
        { id: 'venues', icon: <MapPin className="w-6 h-6"/>, label: 'Venues' },
        { id: 'vendors', icon: <Briefcase className="w-6 h-6"/>, label: 'Vendors' },
        { id: 'ai-scout', icon: <Sparkles className="w-6 h-6"/>, label: 'AI Venue Scout' },
    ];
    
    // The rest of the Sidebar component is unchanged...
    return (
        <nav className="w-20 lg:w-64 bg-white dark:bg-gray-800 shadow-lg flex flex-col justify-between">
            <div>
                <div className="flex items-center justify-center lg:justify-start p-4 lg:p-6 border-b border-gray-200 dark:border-gray-700">
                    <img src="https://placehold.co/40x40/f472b6/ffffff?text=WP" alt="Logo" className="rounded-full"/>
                    <h1 className="hidden lg:block ml-4 text-xl font-bold text-pink-500">Wedding Planner</h1>
                </div>
                <ul>
                    {navItems.map(item => (
                        <li key={item.id} className="mt-2">
                            <a href="#" onClick={(e) => { e.preventDefault(); setActiveTab(item.id); }} className={`flex items-center justify-center lg:justify-start p-4 text-gray-600 dark:text-gray-300 hover:bg-pink-100 dark:hover:bg-pink-900 hover:text-pink-500 transition-colors duration-200 ${activeTab === item.id ? 'bg-pink-100 dark:bg-pink-900/50 text-pink-500 border-r-4 border-pink-500' : ''}`}>
                                {item.icon}
                                <span className="hidden lg:block ml-4">{item.label}</span>
                            </a>
                        </li>
                    ))}
                </ul>
            </div>
             <div className="p-4 border-t border-gray-200 dark:border-gray-700">
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate hidden lg:block">Session ID:</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{userId}</p>
            </div>
        </nav>
    );
};
const AIVenueScout = ({ onSaveVenue, cache, setCache }) => {
    const { query, results, isLoading, error } = cache;

    const handleQueryChange = (field, value) => {
        setCache(prev => ({ ...prev, query: { ...prev.query, [field]: value } }));
    };

    const handleSearch = async (e) => {
        e.preventDefault();
        if (!query.location || !query.budget) {
            setCache(prev => ({ ...prev, error: 'Please enter a location and budget.' }));
            return;
        }
        setCache(prev => ({ ...prev, isLoading: true, error: null, results: [] }));

        const apiKey2 = GEMINI_API_KEY; // Replace with your Gemini API key
        const apiUrl = `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-pro:generateContent?key=${apiKey2}`;
        
        const prompt = `Act as a wedding venue scout. Find 5 potential wedding venues in or near "${query.location}" with an estimated price for a wedding under $${query.budget}. For each venue, provide its name, location, an "aesthetic_description", an "estimated_price" as a number, its official "website_url", and a publicly accessible, direct hotlink to a high-quality image (must end in .jpg, .png, or .webp) under the key "image_url". Do not provide a URL to a webpage or search result. IMPORTANT: Respond with only a valid JSON object. The JSON object should have a single key "venues" which is an array of the venue objects. Do not include any text, titles, markdown formatting, or explanations before or after the JSON object.`;

        const payload = { contents: [{ parts: [{ text: prompt }] }] };

        try {
            const response = await fetch(apiUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
            if (!response.ok) { throw new Error(`API call failed with status: ${response.status}`); }
            const result = await response.json();
            const rawText = result.candidates?.[0]?.content?.parts?.[0]?.text;

            if (rawText) {
                const jsonString = rawText.substring(rawText.indexOf('{'), rawText.lastIndexOf('}') + 1);
                const parsedResult = JSON.parse(jsonString);
                setCache(prev => ({ ...prev, results: parsedResult.venues || [] }));
            } else {
                setCache(prev => ({ ...prev, error: "Could not find any venues. The AI returned an empty response." }));
            }
        } catch (err) {
            console.error("Error finding venues:", err);
            setCache(prev => ({ ...prev, error: `An error occurred: ${err.message}` }));
        } finally {
            setCache(prev => ({ ...prev, isLoading: false }));
        }
    };

    const ensureProtocol = (url) => {
        if (!url) return '#';
        if (!/^https?:\/\//i.test(url)) {
            return `https://${url}`;
        }
        return url;
    };

    return (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
            <h1 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">AI Venue Scout 🤖</h1>
            <p className="text-gray-600 dark:text-gray-400 mb-6">Let AI find the perfect venue for your budget and location.</p>
            
            <form onSubmit={handleSearch} className="flex flex-col md:flex-row gap-4 mb-8">
                <input type="text" value={query.location} onChange={e => handleQueryChange('location', e.target.value)} placeholder="Enter City or Area (e.g., 'Napa Valley, CA')" className="flex-grow p-2 border rounded-md bg-gray-50 dark:bg-gray-700 dark:text-white dark:border-gray-600" />
                <input type="number" value={query.budget} onChange={e => handleQueryChange('budget', e.target.value)} placeholder="Max Venue Budget (e.g., 5000)" className="w-full md:w-1/4 p-2 border rounded-md bg-gray-50 dark:bg-gray-700 dark:text-white dark:border-gray-600" />
                <button type="submit" disabled={isLoading} className="bg-pink-500 text-white px-6 py-2 rounded-md hover:bg-pink-600 flex items-center justify-center disabled:bg-pink-300">
                    {isLoading ? <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div> : 'Find Venues'}
                </button>
            </form>

            {error && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-md mb-6" role="alert">{error}</div>}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {results.map((venue, index) => (
                    <div key={index} className="border rounded-lg flex flex-col justify-between bg-gray-50 dark:bg-gray-700/50 shadow overflow-hidden">
                        <div className="h-48 bg-gray-200 dark:bg-gray-600 flex items-center justify-center">
                            {venue.image_url ? (
                                <img src={`https://corsproxy.io/?${encodeURIComponent(venue.image_url)}`} alt={`Aesthetic view of ${venue.name}`} className="w-full h-full object-cover" />
                            ) : (
                                <ImageIcon className="w-12 h-12 text-gray-400" />
                            )}
                        </div>
                        <div className="p-4 flex-grow flex flex-col">
                            <h3 className="font-bold text-lg text-pink-600 dark:text-pink-400">{venue.name}</h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">{venue.location}</p>
                            <div className="flex-grow"></div>
                            <div className="flex justify-between items-center mt-4 border-t pt-3 dark:border-gray-600">
                                <a href={ensureProtocol(venue.website_url)} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline text-sm flex items-center">
                                    <LinkIcon size={14} className="mr-1"/> Visit Website
                                </a>
                                <button onClick={() => onSaveVenue(venue)} className="bg-green-500 text-white px-3 py-1 text-sm rounded-md hover:bg-green-600 flex items-center"><Heart size={14} className="mr-1"/> Save</button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};
const Dashboard = ({ stats, weddingDate, onDateChange, budgetChartData }) => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-4">
            <h1 className="text-3xl font-bold text-gray-800 dark:text-white mb-2">Your Wedding Dashboard</h1>
            <p className="text-gray-600 dark:text-gray-400">Here's a snapshot of your wedding planning progress.</p>
        </div>
        
        <StatCard title="Days Until Wedding" value={stats.countdown > 0 ? stats.countdown : "Congratulations!"} icon={<Calendar />} />
        <StatCard title="Guests Attending" value={`${stats.guestsAttending} / ${stats.totalGuests}`} icon={<Users />} />
        <StatCard title="Budget Spent" value={`$${stats.actualSpending.toLocaleString()} / $${stats.estimatedBudget.toLocaleString()}`} icon={<DollarSign />} />
        <StatCard title="Tasks Completed" value={`${stats.tasksCompleted} / ${stats.totalTasks}`} icon={<List />} />

        <div className="md:col-span-2 lg:col-span-2 bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-semibold text-gray-700 dark:text-white mb-4">Set Your Wedding Date</h2>
            <input type="date" value={weddingDate} onChange={onDateChange} className="w-full p-2 border rounded-md bg-gray-50 dark:bg-gray-700 dark:text-white dark:border-gray-600" />
        </div>
        
        <div className="md:col-span-2 lg:col-span-2 bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md flex flex-col">
            <h2 className="text-xl font-semibold text-gray-700 dark:text-white mb-4">Budget Breakdown</h2>
            {/* --- THIS IS THE CORRECTED LOGIC --- */}
            {budgetChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                        <Pie data={budgetChartData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} fill="#8884d8" label>
                            {budgetChartData.map((entry, index) => <Cell key={`cell-${index}`} fill={['#f472b6', '#ec4899', '#d946ef', '#a855f7', '#8b5cf6'][index % 5]} />)}
                        </Pie>
                        <Tooltip />
                    </PieChart>
                </ResponsiveContainer>
            ) : (
                <div className="flex-grow flex items-center justify-center h-full text-gray-500">
                    Add expenses to see a breakdown.
                </div>
            )}
        </div>
    </div>
);
const StatCard = ({ title, value, icon }) => ( <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md flex items-center"> <div className="p-3 bg-pink-100 dark:bg-pink-900/50 rounded-full text-pink-500 mr-4"> {icon} </div> <div> <p className="text-sm text-gray-600 dark:text-gray-400">{title}</p> <p className="text-2xl font-bold text-gray-800 dark:text-white">{value}</p> </div> </div> );
const CrudSection = ({ title, items, columns, onAdd, onEdit, onDelete, children, onGenerateTasks, isGeneratingTasks }) => ( <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md"> <div className="flex justify-between items-center mb-4"> <h1 className="text-2xl font-bold text-gray-800 dark:text-white">{title}</h1> <div className="flex items-center space-x-2"> {onGenerateTasks && ( <button onClick={onGenerateTasks} disabled={isGeneratingTasks} className="bg-purple-500 text-white px-4 py-2 rounded-md hover:bg-purple-600 flex items-center disabled:bg-purple-300"> {isGeneratingTasks ? ( <><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>Generating...</> ) : ( <><Sparkles size={16} className="mr-2"/> Suggest Tasks</> )} </button> )} <button onClick={onAdd} className="bg-pink-500 text-white px-4 py-2 rounded-md hover:bg-pink-600 flex items-center"> <Plus size={16} className="mr-2"/> Add New </button> </div> </div> <div className="overflow-x-auto"> <table className="w-full text-left text-gray-600 dark:text-gray-400"> <thead className="bg-gray-50 dark:bg-gray-700"> <tr> {columns.map(col => <th key={col.key} className="p-3 font-semibold">{col.label}</th>)} <th className="p-3 font-semibold">Actions</th> </tr> </thead> <tbody> {(items || []).map(item => ( <tr key={item.id} className="border-b dark:border-gray-700"> {children(item)} <td className="p-3"> <button onClick={() => onEdit(item)} className="text-blue-500 hover:text-blue-700 mr-2"><Edit size={18}/></button> <button onClick={() => onDelete(item.id)} className="text-red-500 hover:text-red-700"><Trash2 size={18}/></button> </td> </tr> ))} </tbody> </table> </div> </div> );
const GuestList = ({ guests, onAdd, onEdit, onDelete }) => {
    const columns = [
        { key: 'name', label: 'Name'},
        { key: 'group', label: 'Group' }, // Added new column
        { key: 'status', label: 'Status' },
        { key: 'notes', label: 'Notes' }
    ];
    const getStatusColor = (status) => {
        switch (status) {
            case 'Attending': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
            case 'Declined': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
            default: return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
        }
    };
    return <CrudSection title="Guest List" items={guests} columns={columns} onAdd={onAdd} onEdit={onEdit} onDelete={onDelete}>
        {guest => (
            <>
                <td className="p-3">{guest.name}</td>
                <td className="p-3">{guest.group}</td> {/* Added new table cell */}
                <td className="p-3"><span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(guest.status)}`}>{guest.status}</span></td>
                <td className="p-3">{guest.notes}</td>
            </>
        )}
    </CrudSection>;
};
const Budget = ({ budget, onAddExpense, onEditExpense, onDeleteExpense, onBudgetChange, chartData }) => { const columns = [ { key: 'item', label: 'Item/Category'}, { key: 'estimated', label: 'Estimated Cost'}, { key: 'actual', label: 'Actual Cost'}, { key: 'vendor', label: 'Vendor'} ]; const totalEstimated = (budget.expenses || []).reduce((acc, curr) => acc + (parseFloat(curr.estimated) || 0), 0); const totalActual = (budget.expenses || []).reduce((acc, curr) => acc + (parseFloat(curr.actual) || 0), 0); return ( <div> <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6"> <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md"> <label className="block text-lg font-semibold text-gray-700 dark:text-white mb-2">Total Budget</label> <div className="flex items-center"> <span className="text-2xl font-bold mr-2 text-gray-800 dark:text-white">$</span> <input type="number" value={budget.estimated || ''} onChange={onBudgetChange} className="w-full text-2xl font-bold p-2 border rounded-md" /> </div> </div> <StatCard title="Est. Expenses" value={`$${totalEstimated.toLocaleString()}`} icon={<DollarSign />} /> <StatCard title="Actual Spending" value={`$${totalActual.toLocaleString()}`} icon={<DollarSign />} /> </div> <CrudSection title="Expenses" items={budget.expenses || []} columns={columns} onAdd={onAddExpense} onEdit={onEditExpense} onDelete={onDeleteExpense}> {expense => ( <> <td className="p-3">{expense.item} ({expense.category})</td> <td className="p-3">${parseFloat(expense.estimated || 0).toLocaleString()}</td> <td className="p-3">${parseFloat(expense.actual || 0).toLocaleString()}</td> <td className="p-3">{expense.vendor}</td> </> )} </CrudSection> </div> ); };
const TodoList = ({ todos, onAdd, onEdit, onDelete, onToggle, onGenerateTasks, isGeneratingTasks }) => {
    const columns = [ { key: 'task', label: 'Task' }, { key: 'dueDate', label: 'Due Date' }, { key: 'status', label: 'Status' }];
    return <CrudSection title="To-Do List" items={todos} columns={columns} onAdd={onAdd} onEdit={onEdit} onDelete={onDelete} onGenerateTasks={onGenerateTasks} isGeneratingTasks={isGeneratingTasks}>
        {todo => (
            <>
                <td className="p-3 flex items-center">
                    <input type="checkbox" checked={todo.completed} onChange={() => onToggle(todo.id)} className="mr-3 h-5 w-5 rounded border-gray-300 text-pink-600 focus:ring-pink-500" />
                    <span className={todo.completed ? 'line-through text-gray-400' : 'text-gray-800 dark:text-gray-200'}>{todo.task}</span>
                </td>
                <td className="p-3">{todo.dueDate}</td>
                <td className="p-3">{todo.completed ? <span className="text-green-500">Completed</span> : <span className="text-yellow-500">Pending</span>}</td>
            </>
        )}
    </CrudSection>;
};
const Venues = ({ venues, onAdd, onEdit, onDelete }) => {
    const columns = [ { key: 'preview', label: 'Preview'}, { key: 'name', label: 'Name'}, { key: 'location', label: 'Location' }, { key: 'price', label: 'Price' }, { key: 'notes', label: 'Notes' } ];
    const ensureProtocol = (url) => {
        if (!url) return '#';
        if (!/^https?:\/\//i.test(url)) {
            return `https://${url}`;
        }
        return url;
    };
    return <CrudSection title="Venues" items={venues} columns={columns} onAdd={onAdd} onEdit={onEdit} onDelete={onDelete}>
        {venue => (
            <>
                <td className="p-3">
                    <div className="w-16 h-12 bg-gray-200 dark:bg-gray-600 rounded-md flex items-center justify-center">
                       {venue.imageUrl ? (
                           <img src={venue.imageUrl} alt={venue.name} className="w-full h-full object-cover rounded-md"/>
                       ) : (
                           <ImageIcon className="w-6 h-6 text-gray-400"/>
                       )}
                    </div>
                </td>
                <td className="p-3 font-semibold">
                    {venue.website ? (
                        <a href={ensureProtocol(venue.website)} target="_blank" rel="noopener noreferrer" className="text-pink-600 hover:underline">
                            {venue.name}
                        </a>
                    ) : (
                        <span className="text-gray-800 dark:text-gray-200">{venue.name}</span>
                    )}
                </td>
                <td className="p-3">{venue.location}</td>
                <td className="p-3">${parseFloat(venue.price || 0).toLocaleString()}</td>
                <td className="p-3">{venue.notes}</td>
            </>
        )}
    </CrudSection>;
};
const Vendors = ({ vendors, onAdd, onEdit, onDelete }) => {
    const columns = [
        { key: 'name', label: 'Name'},
        { key: 'service', label: 'Service' },
        { key: 'contact', label: 'Contact' },
        { key: 'price', label: 'Price' },
        { key: 'notes', label: 'Notes' } // This line is now fixed
    ];
    return <CrudSection title="Vendors" items={vendors} columns={columns} onAdd={onAdd} onEdit={onEdit} onDelete={onDelete}>
        {vendor => (
            <>
                <td className="p-3">{vendor.name}</td>
                <td className="p-3">{vendor.service}</td>
                <td className="p-3">{vendor.contact}</td>
                <td className="p-3">${parseFloat(vendor.price || 0).toLocaleString()}</td>
                <td className="p-3">{vendor.notes}</td>
            </>
        )}
    </CrudSection>;
};
const Modal = ({ modalType, onClose, onSubmit, formData, onChange }) => {
    const titles = {
        guest: 'Guest Information',
        expense: 'Expense Details',
        todo: 'Task Details',
        venue: 'Venue Details',
        vendor: 'Vendor Details',
    };

    const renderFields = () => {
        switch (modalType) {
            case 'guest':
                return <>
                    <InputField name="name" label="Name" value={formData.name || ''} onChange={onChange} required />
                    <InputField name="group" label="Group (e.g., Bride's Family)" value={formData.group || ''} onChange={onChange} placeholder="Groom's College Friends" />
                    <SelectField name="status" label="Status" value={formData.status || 'Pending'} onChange={onChange} options={['Pending', 'Attending', 'Declined']} />
                    <TextAreaField name="notes" label="Notes" value={formData.notes || ''} onChange={onChange} />
                </>;
            case 'expense': return <> <InputField name="item" label="Item" value={formData.item || ''} onChange={onChange} required /> <InputField name="category" label="Category" value={formData.category || ''} onChange={onChange} required /> <InputField name="estimated" label="Estimated Cost" type="number" value={formData.estimated || ''} onChange={onChange} /> <InputField name="actual" label="Actual Cost" type="number" value={formData.actual || ''} onChange={onChange} /> <InputField name="vendor" label="Vendor" value={formData.vendor || ''} onChange={onChange} /> </>;
            case 'todo': return <> <InputField name="task" label="Task" value={formData.task || ''} onChange={onChange} required /> <InputField name="dueDate" label="Due Date" type="date" value={formData.dueDate || ''} onChange={onChange} /> </>;
            case 'venue': return <> <InputField name="name" label="Venue Name" value={formData.name || ''} onChange={onChange} required /> <InputField name="location" label="Location" value={formData.location || ''} onChange={onChange} /> <InputField name="website" label="Website URL" placeholder="https://example.com" value={formData.website || ''} onChange={onChange} /> <InputField name="imageUrl" label="Image URL" placeholder="https://example.com/image.jpg" value={formData.imageUrl || ''} onChange={onChange} /> <InputField name="capacity" label="Capacity" type="number" value={formData.capacity || ''} onChange={onChange} /> <InputField name="price" label="Price" type="number" value={formData.price || ''} onChange={onChange} /> <TextAreaField name="notes" label="Notes" value={formData.notes || ''} onChange={onChange} /> </>;
            case 'vendor': return <> <InputField name="name" label="Vendor Name" value={formData.name || ''} onChange={onChange} required /> <InputField name="service" label="Service Type" value={formData.service || ''} onChange={onChange} /> <InputField name="contact" label="Contact Info" value={formData.contact || ''} onChange={onChange} /> <InputField name="price" label="Price" type="number" value={formData.price || ''} onChange={onChange} /> <TextAreaField name="notes" label="Notes" value={formData.notes || ''} onChange={onChange} /> </>;
            default: return null;
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-8 w-full max-w-md m-4">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold text-gray-800 dark:text-white">{titles[modalType]}</h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-800 dark:hover:text-gray-200"><X size={24}/></button>
                </div>
                <form onSubmit={onSubmit}>
                    <div className="space-y-4">
                        {renderFields()}
                    </div>
                    <div className="mt-8 flex justify-end space-x-4">
                        <button type="button" onClick={onClose} className="px-4 py-2 rounded-md text-gray-700 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600">Cancel</button>
                        {/* --- THIS IS THE CORRECTED BUTTON --- */}
                        <button type="submit" className="px-4 py-2 rounded-md text-white bg-pink-500 hover:bg-pink-600 flex items-center justify-center">
                            <Save size={16} className="mr-2"/>
                            <span>Save</span>
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
const InputField = ({ name, label, ...props }) => ( <div> <label htmlFor={name} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{label}</label> <input id={name} name={name} {...props} className="w-full p-2 border rounded-md" /> </div> );
const TextAreaField = ({ name, label, ...props }) => ( <div> <label htmlFor={name} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{label}</label> <textarea id={name} name={name} {...props} rows="3" className="w-full p-2 border rounded-md"></textarea> </div> );
const SelectField = ({ name, label, options, ...props }) => ( <div> <label htmlFor={name} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{label}</label> <select id={name} name={name} {...props} className="w-full p-2 border rounded-md"> {options.map(opt => <option key={opt} value={opt}>{opt}</option>)} </select> </div> );
const BudgetGauge = ({ currentValue, maxValue }) => {
    const percentage = Math.min((currentValue / maxValue) * 100, 100);
    let barColor = 'bg-green-500';
    if (percentage > 75) barColor = 'bg-yellow-500';
    if (percentage > 95) barColor = 'bg-red-500';

    return (
        <div className="mt-4">
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-4">
                <div className={`${barColor} h-4 rounded-full transition-all duration-500`} style={{ width: `${percentage}%` }}></div>
            </div>
        </div>
    );
};
const SeatingChart = ({ guests, plan, setPlan }) => {
    // Find which guests are already seated
    const seatedGuestIds = new Set(Object.values(plan).flat());
    const unseatedGuests = guests.filter(g => !seatedGuestIds.has(g.id));

    // --- Drag and Drop Handlers ---
    const handleDragStart = (e, guestId) => {
        e.dataTransfer.setData("guestId", guestId);
    };

    const handleDragOver = (e) => {
        e.preventDefault(); // This is necessary to allow dropping
    };

    // This function is now upgraded to handle dropping on tables OR the unseated list
    const handleDrop = (e, target) => {
        e.preventDefault();
        const guestId = parseInt(e.dataTransfer.getData("guestId"));
        const newPlan = { ...plan };

        // First, always remove the guest from whatever table they are currently on
        Object.keys(newPlan).forEach(table => {
            newPlan[table] = newPlan[table].filter(id => id !== guestId);
        });

        // If the target is a table (and not the 'unseated' list), add the guest to it
        if (target !== 'unseated') {
            newPlan[target].push(guestId);
        }

        // Update the state with the new arrangement
        setPlan(newPlan);
    };

    return (
        <div className="flex flex-col md:flex-row h-full gap-6">
            {/* Unseated Guests List - NOW A DROP TARGET */}
            <div 
                className="w-full md:w-1/3 bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md border-2 border-dashed border-gray-300 dark:border-gray-600"
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, 'unseated')}
            >
                <h2 className="text-xl font-bold mb-4 text-gray-800 dark:text-white">Unseated Guests ({unseatedGuests.length})</h2>
                <div className="space-y-2 h-full overflow-y-auto">
                    {unseatedGuests.map(guest => (
                        <div 
                            key={guest.id}
                            draggable
                            onDragStart={(e) => handleDragStart(e, guest.id)}
                            className="p-3 bg-gray-100 dark:bg-gray-700 rounded-md cursor-grab active:cursor-grabbing"
                        >
                            <p className="font-semibold text-gray-800 dark:text-gray-200">{guest.name}</p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">{guest.group}</p>
                        </div>
                    ))}
                </div>
            </div>

            {/* Tables Section */}
            <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-6 h-full overflow-y-auto">
                {Object.entries(plan).map(([tableName, guestIds]) => (
                    <div 
                        key={tableName} 
                        onDragOver={handleDragOver}
                        onDrop={(e) => handleDrop(e, tableName)}
                        className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md border-2 border-dashed border-gray-300 dark:border-gray-600"
                    >
                        <h3 className="text-lg font-bold text-pink-500 mb-3">{tableName} ({guestIds.length})</h3>
                        <div className="space-y-2">
                            {guestIds.map(id => {
                                const guest = guests.find(g => g.id === id);
                                if (!guest) return null;
                                return (
                                    <div 
                                        key={guest.id} 
                                        draggable
                                        onDragStart={(e) => handleDragStart(e, guest.id)}
                                        className="p-2 bg-pink-100 dark:bg-pink-900/50 rounded-md cursor-grab active:cursor-grabbing"
                                    >
                                        <p className="font-semibold text-pink-800 dark:text-pink-200">{guest.name}</p>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default App;