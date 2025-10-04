import React, { useState, useEffect, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, setDoc, onSnapshot } from 'firebase/firestore';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { Calendar, Users, DollarSign, List, Grid, MapPin, Briefcase, Plus, Trash2, Edit, Save, X, Sun, Sparkles, Heart, Link as LinkIcon, Image as ImageIcon, Gift, Wand2, Check } from 'lucide-react';
import WeddingSimulator from './components/WeddingSimulator';

// --- Firebase Configuration ---
const firebaseConfig = {
    apiKey: import.meta.env.VITE_API_KEY,
    authDomain: import.meta.env.VITE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_APP_ID
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
    const [db, setDb] = useState(null);
    const [userId, setUserId] = useState(null);
    const [isAuthReady, setIsAuthReady] = useState(false);
    const [seatingPlan, setSeatingPlan] = useState({
        'Table 1': [], 'Table 2': [], 'Table 3': [], 'Table 4': [],
    });

    // --- Firebase Initialization and Auth ---
    useEffect(() => {
        if (firebaseConfig.apiKey && firebaseConfig.projectId) {
            try {
                const app = initializeApp(firebaseConfig);
                const authInstance = getAuth(app);
                const dbInstance = getFirestore(app);
                setDb(dbInstance);
                const unsubscribe = onAuthStateChanged(authInstance, async (user) => {
                    if (user) { 
                        setUserId(user.uid); 
                    } else { 
                        try { 
                            await signInAnonymously(authInstance); 
                        } catch (error) { 
                            console.error("Firebase Anonymous auth error:", error); 
                        } 
                    }
                    setIsAuthReady(true);
                });
                return () => unsubscribe();
            } catch (error) {
                console.error("Firebase initialization error:", error);
                setIsAuthReady(true);
            }
        } else {
            console.warn("Firebase config is missing or incomplete. App will run without backend features.");
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
        }, (error) => {
            console.error("Firebase onSnapshot error:", error);
        });
        return () => unsubscribe();
    }, [isAuthReady, db, userId, appMode]);

    const handleDataUpdate = async (newData, mode = appMode, options = { merge: true }) => {
        if (!isAuthReady || !db || !userId) return;
        const collectionMap = { planning: 'weddings', proposal: 'proposals', simulator: 'simulations' };
        const collectionName = collectionMap[mode];
        if (!collectionName) return;
        const docRef = doc(db, collectionName, userId);
        try { 
            await setDoc(docRef, newData, options); 
        } catch (error) { 
            console.error("Error updating document:", error); 
        }
    };
    
    // In App.jsx

    const startWeddingPlanning = async (dreamData = null) => {
        let initialWeddingData = {
            weddingDate: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0],
            guestList: [],
            budget: { estimated: 10000, expenses: [] },
            todoList: [],
            venues: [],
            vendors: [],
        };

        if (dreamData) {
            initialWeddingData.budget.estimated = dreamData.budget;

            const budgetTodo = {
                id: new Date().getTime(),
                task: 'Create initial wedding budget',
                completed: true,
                dueDate: new Date().toISOString().split('T')[0]
            };

            const themeTodo = {
                id: new Date().getTime() + 1,
                task: `Find vendors that match our "${dreamData.theme}" theme!`,
                completed: false,
                dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
            };
            
            initialWeddingData.todoList.unshift(budgetTodo, themeTodo);
        }
        
        // ✅ FIX: First, AWAIT the database operation to complete.
        // We pass { merge: false } to ensure we are overwriting any old plan completely.
        await handleDataUpdate(initialWeddingData, 'planning', { merge: false });
        
        // ✅ FIX: THEN, switch the app mode.
        setAppMode('planning');
    };
    
    // --- Event Handlers ---
    const openModal = (type, item = null) => { setModal(type); if (item) { setEditItemId(item.id); setFormData(item); } else { setEditItemId(null); setFormData({}); } };
    const closeModal = () => { setModal(null); setEditItemId(null); setFormData({}); };
    const handleFormChange = (e) => { const { name, value, type, checked } = e.target; setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value })); };
    const handleFormSubmit = (e) => { e.preventDefault(); let updatedData = { ...weddingData }; const id = editItemId || new Date().getTime(); switch (modal) { case 'guest': const newGuest = { id, ...formData, status: formData.status || 'Pending' }; updatedData.guestList = editItemId ? updatedData.guestList.map(g => g.id === id ? newGuest : g) : [...(weddingData.guestList || []), newGuest]; break; case 'expense': const newExpense = { id, ...formData, estimated: parseFloat(formData.estimated || 0), actual: parseFloat(formData.actual || 0) }; updatedData.budget.expenses = editItemId ? updatedData.budget.expenses.map(ex => ex.id === id ? newExpense : ex) : [...(weddingData.budget.expenses || []), newExpense]; break; case 'todo': const newTodo = { id, ...formData, completed: formData.completed || false }; updatedData.todoList = editItemId ? updatedData.todoList.map(t => t.id === id ? newTodo : t) : [...(weddingData.todoList || []), newTodo]; break; case 'venue': const newVenue = { id, ...formData }; updatedData.venues = editItemId ? updatedData.venues.map(v => v.id === id ? newVenue : v) : [...(weddingData.venues || []), newVenue]; break; case 'vendor': const newVendor = { id, ...formData }; updatedData.vendors = editItemId ? updatedData.vendors.map(v => v.id === id ? newVendor : v) : [...(weddingData.vendors || []), newVendor]; break; default: break; } setWeddingData(updatedData); handleDataUpdate(updatedData, 'planning'); closeModal(); };
    const handleDelete = (type, id) => { let updatedData = { ...weddingData }; switch (type) { case 'guest': updatedData.guestList = updatedData.guestList.filter(g => g.id !== id); break; case 'expense': updatedData.budget.expenses = updatedData.budget.expenses.filter(ex => ex.id !== id); break; case 'todo': updatedData.todoList = updatedData.todoList.filter(t => t.id !== id); break; case 'venue': updatedData.venues = updatedData.venues.filter(v => v.id !== id); break; case 'vendor': updatedData.vendors = updatedData.vendors.filter(v => v.id !== id); break; default: break; } setWeddingData(updatedData); handleDataUpdate(updatedData, 'planning'); }
    const handleWeddingDateChange = (e) => { const updatedData = { ...weddingData, weddingDate: e.target.value }; setWeddingData(updatedData); handleDataUpdate(updatedData, 'planning'); };
    const handleBudgetChange = (e) => { const updatedData = { ...weddingData, budget: { ...weddingData.budget, estimated: parseFloat(e.target.value) || 0 } }; setWeddingData(updatedData); handleDataUpdate(updatedData, 'planning'); }
    const toggleTodoCompletion = (id) => { const updatedTodos = weddingData.todoList.map(todo => todo.id === id ? { ...todo, completed: !todo.completed } : todo ); const updatedData = { ...weddingData, todoList: updatedTodos }; setWeddingData(updatedData); handleDataUpdate(updatedData, 'planning'); };
    const handleSaveVenueFromScout = (venue) => { const newVenue = { id: new Date().getTime(), name: venue.name, location: venue.location, notes: `Aesthetic: ${venue.aesthetic_description || 'N/A'}.`, price: venue.estimated_price, capacity: '', website: venue.website_url || '', imageUrl: venue.image_url || '' }; const updatedData = { ...weddingData, venues: [...(weddingData.venues || []), newVenue] }; setWeddingData(updatedData); handleDataUpdate(updatedData, 'planning'); setActiveTab('venues'); };
    const handleGenerateTasks = async () => { setIsGeneratingTasks(true); const prompt = `You are an expert wedding planner. Based on a wedding date of ${weddingData.weddingDate}, generate a comprehensive list of to-do items for planning a wedding. Return the response as a valid JSON array of objects. Each object must have a 'task' (string) and a 'dueDate' (string in 'YYYY-MM-DD' format) property. The 'dueDate' should be calculated relative to the wedding date. Create at least 15 tasks. Ensure the entire response is only the JSON array, with no extra text or markdown formatting. IMPORTANT: Your entire response must be only the raw JSON text. Do not include any introductory phrases like "Here is the JSON" or markdown code fences like \`\`\`json.`; const payload = { prompt }; try { const response = await fetch('/.netlify/functions/generate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }); if (!response.ok) { throw new Error(`API call failed with status: ${response.status}`); } const result = await response.json(); const generatedText = result.candidates?.[0]?.content?.parts?.[0]?.text; if (generatedText) { const startIndex = generatedText.indexOf('['); const endIndex = generatedText.lastIndexOf(']'); if (startIndex !== -1 && endIndex !== -1) { const jsonString = generatedText.substring(startIndex, endIndex + 1); const newTasks = JSON.parse(jsonString); const formattedTasks = newTasks.map((task, index) => ({ id: new Date().getTime() + index, task: task.task, dueDate: task.dueDate, completed: false })); const newTodoList = [...(weddingData.todoList || []), ...formattedTasks]; const updatedWeddingData = { ...weddingData, todoList: newTodoList }; setWeddingData(updatedWeddingData); handleDataUpdate(updatedWeddingData, 'planning'); } else { throw new Error("Valid JSON array not found in AI response."); } } else { throw new Error("AI returned no text."); } } catch (error) { console.error("Error generating tasks:", error); } finally { setIsGeneratingTasks(false); } };
    const dashboardStats = useMemo(() => { const { weddingDate, guestList, budget, todoList } = weddingData; const today = new Date(); const wDate = new Date(weddingDate); const countdown = Math.ceil((wDate - today) / (1000 * 60 * 60 * 24)); const guestsAttending = (guestList || []).filter(g => g.status === 'Attending').length; const totalGuests = (guestList || []).length; const actualSpending = (budget.expenses || []).reduce((acc, curr) => acc + (parseFloat(curr.actual) || 0), 0); const tasksCompleted = (todoList || []).filter(t => t.completed).length; const totalTasks = (todoList || []).length; return { countdown, guestsAttending, totalGuests, actualSpending, estimatedBudget: budget.estimated, tasksCompleted, totalTasks }; }, [weddingData]);
    const budgetChartData = useMemo(() => { const { expenses } = weddingData.budget; if (!expenses || expenses.length === 0) return []; const categoryTotals = expenses.reduce((acc, expense) => { const category = expense.category || 'Uncategorized'; acc[category] = (acc[category] || 0) + (parseFloat(expense.actual) || 0); return acc; }, {}); return Object.entries(categoryTotals).map(([name, value]) => ({ name, value })); }, [weddingData.budget.expenses]);

    const renderContent = () => {
        switch (activeTab) {
            case 'dashboard': return <Dashboard stats={dashboardStats} weddingDate={weddingData.weddingDate} onDateChange={handleWeddingDateChange} budgetChartData={budgetChartData} />;
            case 'guests': return <GuestList guests={weddingData.guestList || []} onAdd={() => openModal('guest')} onEdit={(item) => openModal('guest', item)} onDelete={(id) => handleDelete('guest', id)} />;
            case 'seating': return <SeatingChart guests={weddingData.guestList || []} plan={seatingPlan} setPlan={setSeatingPlan} />;
            case 'budget': return <Budget budget={weddingData.budget || {}} onAddExpense={() => openModal('expense')} onEditExpense={(item) => openModal('expense', item)} onDeleteExpense={(id) => handleDelete('expense', id)} onBudgetChange={handleBudgetChange} />;
            case 'todos': return <TodoList todos={weddingData.todoList || []} onAdd={() => openModal('todo')} onEdit={(item) => openModal('todo', item)} onDelete={(id) => handleDelete('todo', id)} onToggle={toggleTodoCompletion} onGenerateTasks={handleGenerateTasks} isGeneratingTasks={isGeneratingTasks} />;
            case 'venues': return <Venues venues={weddingData.venues || []} onAdd={() => openModal('venue')} onEdit={(item) => openModal('venue', item)} onDelete={(id) => handleDelete('venue', id)} />;
            case 'vendors': return <Vendors vendors={weddingData.vendors || []} onAdd={() => openModal('vendor')} onEdit={(item) => openModal('vendor', item)} onDelete={(id) => handleDelete('vendor', id)} />;
            case 'ai-scout': return <AIVenueScout onSaveVenue={handleSaveVenueFromScout} cache={aiScoutCache} setCache={setAiScoutCache} />;
            default: return <Dashboard stats={dashboardStats} weddingDate={weddingData.weddingDate} onDateChange={handleWeddingDateChange} budgetChartData={budgetChartData} />;
        }
    };
    
    if (!isAuthReady) {
        return <div className="flex items-center justify-center h-screen bg-gray-100 dark:bg-gray-900"><div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-pink-500"></div></div>;
    }

    switch (appMode) {
        case 'welcome': return <WelcomeScreen setAppMode={setAppMode} />;
        case 'proposal': return <ProposalPlanner plan={proposalPlan} onUpdate={handleDataUpdate} onComplete={startWeddingPlanning} />;
        case 'simulator': return <WeddingSimulator dream={dreamWedding} onUpdate={handleDataUpdate} onComplete={startWeddingPlanning} />;
        case 'planning': return ( <div className="flex h-screen bg-gray-100 dark:bg-gray-900 font-sans"> <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} userId={userId} /> <main className="flex-1 p-4 md:p-8 overflow-y-auto"> {renderContent()} </main> {modal && <Modal modalType={modal} onClose={closeModal} onSubmit={handleFormSubmit} formData={formData} onChange={handleFormChange} />} </div> );
        default: return <WelcomeScreen setAppMode={setAppMode} />;
    }
};

const WelcomeScreen = ({ setAppMode }) => ( <div className="flex flex-col items-center justify-center h-screen bg-gradient-to-br from-pink-100 to-purple-100 dark:from-gray-800 dark:to-gray-900 text-center p-4"> <h1 className="text-5xl font-bold text-gray-800 dark:text-white mb-4">Welcome to Your Love Story</h1> <p className="text-xl text-gray-600 dark:text-gray-300 mb-12 max-w-2xl">Whether you're planning the perfect question or dreaming of the perfect day, your journey starts here.</p> <div className="flex flex-col md:flex-row gap-8"> <button onClick={() => setAppMode('proposal')} className="bg-white dark:bg-gray-700 text-gray-800 dark:text-white font-semibold py-6 px-12 rounded-lg shadow-lg hover:shadow-2xl transform hover:-translate-y-1 transition-all duration-300"> <Gift size={40} className="mx-auto mb-4 text-pink-500"/> <h2 className="text-2xl">Plan a Proposal</h2> <p className="text-sm text-gray-500 dark:text-gray-400">Craft the unforgettable moment.</p> </button> <button onClick={() => setAppMode('simulator')} className="bg-white dark:bg-gray-700 text-gray-800 dark:text-white font-semibold py-6 px-12 rounded-lg shadow-lg hover:shadow-2xl transform hover:-translate-y-1 transition-all duration-300"> <Wand2 size={40} className="mx-auto mb-4 text-purple-500"/> <h2 className="text-2xl">Dream Up Your Wedding</h2> <p className="text-sm text-gray-500 dark:text-gray-400">Visualize your perfect day.</p> </button> </div> <div className="mt-16"> <button onClick={() => setAppMode('planning')} className="text-gray-500 dark:text-gray-400 hover:text-pink-500 transition-colors"> Already engaged? Skip to the wedding planner &rarr; </button> </div> </div> );
const ProposalPlanner = ({ plan, onUpdate, onComplete }) => { const [activeSection, setActiveSection] = useState('checklist'); const handleTodoToggle = (id) => { const updatedTodos = (plan.todoList || []).map(todo => todo.id === id ? { ...todo, completed: !todo.completed } : todo ); onUpdate({ ...plan, todoList: updatedTodos }, 'proposal'); }; const renderSection = () => { switch(activeSection) { case 'ringSizer': return <RingSizerGuide />; case 'ideas': return <IdeaGenerator />; case 'checklist': default: return ( <div className="w-full"> <h2 className="text-2xl font-semibold mb-4 text-gray-200">The Secret Checklist</h2> <ul className="space-y-3"> {(plan.todoList || []).map(todo => ( <li key={todo.id} className="flex items-center bg-gray-700 p-4 rounded-lg"> <input type="checkbox" checked={todo.completed} onChange={() => handleTodoToggle(todo.id)} className="h-6 w-6 rounded border-gray-500 bg-gray-800 text-pink-500 focus:ring-pink-600 cursor-pointer" /> <span className={`ml-4 text-lg ${todo.completed ? 'line-through text-gray-400' : 'text-gray-200'}`}>{todo.text}</span> </li> ))} </ul> </div> ); } }; return ( <div className="flex h-screen bg-gray-900 text-white font-sans"> <div className="w-24 lg:w-72 bg-gray-800 p-4 flex flex-col shadow-2xl"> <div className="flex items-center justify-center lg:justify-start mb-10 pt-4"> <Gift size={32} className="text-pink-500"/> <h1 className="hidden lg:block ml-3 text-2xl font-bold">Proposal Plan</h1> </div> <nav className="flex flex-col space-y-2"> <PlannerNavButton label="Checklist" icon={<List />} isActive={activeSection === 'checklist'} onClick={() => setActiveSection('checklist')} /> <PlannerNavButton label="Ring Sizer" icon={<Heart />} isActive={activeSection === 'ringSizer'} onClick={() => setActiveSection('ringSizer')} /> <PlannerNavButton label="Idea Generator" icon={<Sparkles />} isActive={activeSection === 'ideas'} onClick={() => setActiveSection('ideas')} /> </nav> <div className="mt-auto"> <button onClick={onComplete} className="w-full bg-green-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center text-lg"> <span className="hidden lg:inline">She/He/They Said Yes!</span> 🎉 </button> </div> </div> <main className="flex-1 p-6 md:p-10 overflow-y-auto">{renderSection()}</main> </div> ); };
const PlannerNavButton = ({ label, icon, isActive, onClick }) => ( <button onClick={onClick} className={`flex items-center justify-center lg:justify-start p-4 rounded-lg text-lg transition-colors duration-200 ${ isActive ? 'bg-pink-500/20 text-pink-400' : 'text-gray-300 hover:bg-gray-700' }`} > {icon} <span className="hidden lg:block ml-4">{label}</span> </button> );
const RingSizerGuide = () => ( <div><h2 className="text-3xl font-bold mb-4 text-gray-100">Stealthy Ring Sizing 💍</h2><p className="text-lg text-gray-400 mb-8">Here are a few clever ways to find out their ring size without spoiling the surprise.</p><div className="grid grid-cols-1 md:grid-cols-2 gap-6"><div className="bg-gray-800 p-6 rounded-lg"><h3 className="text-xl font-semibold text-pink-400 mb-2">The "Borrow" Method</h3><p className="text-gray-300">"Borrow" a ring they already own (make sure it's one they wear on the correct finger!). Take it to a jeweler or use a printable ring sizer chart online to measure it. Return it before they notice!</p></div><div className="bg-gray-800 p-6 rounded-lg"><h3 className="text-xl font-semibold text-pink-400 mb-2">Recruit an Accomplice</h3><p className="text-gray-300">Enlist one of their close friends or family members. The friend can suggest a "fun" trip to a jewelry store to try on rings, and then secretly report the size back to you.</p></div></div></div> );
const IdeaGenerator = () => { const [filters, setFilters] = useState({ personality: 'any', budget: 'any' }); const ideas = [ { id: 1, title: 'Romantic Dinner Proposal', description: 'Arrange a surprise dinner at their favorite restaurant or cook a gourmet meal at home. Propose over dessert.', personality: 'romantic', budget: 'medium' }, { id: 2, title: 'Scenic Hike Proposal', description: 'Plan a hike to a location with a breathtaking view. At the summit, get down on one knee.', personality: 'adventurous', budget: 'low' }]; const filteredIdeas = ideas.filter(idea => (filters.personality === 'any' || idea.personality === filters.personality) && (filters.budget === 'any' || idea.budget === filters.budget) ); return ( <div><h2 className="text-3xl font-bold mb-4 text-gray-100">Proposal Idea Generator ✨</h2><div className="flex space-x-4 mb-8 bg-gray-800 p-4 rounded-lg"><div className="flex-1"><label className="block text-sm font-medium text-gray-300 mb-1">Personality</label><select value={filters.personality} onChange={e => setFilters({...filters, personality: e.target.value})} className="w-full p-2 border-gray-600 bg-gray-700 text-white rounded-md focus:ring-pink-500 focus:border-pink-500"><option value="any">Any</option><option value="romantic">Romantic</option><option value="adventurous">Adventurous</option></select></div><div className="flex-1"><label className="block text-sm font-medium text-gray-300 mb-1">Budget</label><select value={filters.budget} onChange={e => setFilters({...filters, budget: e.target.value})} className="w-full p-2 border-gray-600 bg-gray-700 text-white rounded-md focus:ring-pink-500 focus:border-pink-500"><option value="any">Any</option><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option></select></div></div><div className="space-y-4">{filteredIdeas.map(idea => ( <div key={idea.id} className="bg-gray-800 p-6 rounded-lg"><h3 className="text-xl font-semibold text-pink-400 mb-2">{idea.title}</h3><p className="text-gray-300">{idea.description}</p></div> ))}</div></div> ); };
const Sidebar = ({ activeTab, setActiveTab, userId }) => { const navItems = [ { id: 'dashboard', icon: <Sun className="w-6 h-6"/>, label: 'Dashboard' }, { id: 'guests', icon: <Users className="w-6 h-6"/>, label: 'Guest List' }, { id: 'seating', icon: <Grid className="w-6 h-6"/>, label: 'Seating Chart' }, { id: 'budget', icon: <DollarSign className="w-6 h-6"/>, label: 'Budget' }, { id: 'todos', icon: <List className="w-6 h-6"/>, label: 'To-Do List' }, { id: 'venues', icon: <MapPin className="w-6 h-6"/>, label: 'Venues' }, { id: 'vendors', icon: <Briefcase className="w-6 h-6"/>, label: 'Vendors' }, { id: 'ai-scout', icon: <Sparkles className="w-6 h-6"/>, label: 'AI Venue Scout' }, ]; return ( <nav className="w-20 lg:w-64 bg-white dark:bg-gray-800 shadow-lg flex flex-col justify-between"> <div> <div className="flex items-center justify-center lg:justify-start p-4 lg:p-6 border-b border-gray-200 dark:border-gray-700"> <Heart className="text-pink-500 w-8 h-8" /> <h1 className="hidden lg:block ml-4 text-xl font-bold text-pink-500">Wedding Planner</h1> </div> <ul> {navItems.map(item => ( <li key={item.id} className="mt-2"> <a href="#" onClick={(e) => { e.preventDefault(); setActiveTab(item.id); }} className={`flex items-center justify-center lg:justify-start p-4 text-gray-600 dark:text-gray-300 hover:bg-pink-100 dark:hover:bg-pink-900 hover:text-pink-500 transition-colors duration-200 ${activeTab === item.id ? 'bg-pink-100 dark:bg-pink-900/50 text-pink-500 border-r-4 border-pink-500' : ''}`}> {item.icon} <span className="hidden lg:block ml-4">{item.label}</span> </a> </li> ))} </ul> </div> <div className="p-4 border-t border-gray-200 dark:border-gray-700"> <p className="text-xs text-gray-500 dark:text-gray-400 truncate hidden lg:block">Session ID:</p> <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{userId}</p> </div> </nav> ); };
//AIVenueScout works with this code. DO NOT CHANGE! Has not been deployed yet as of 10-4-2025. Waiting until more features are implemented/fixed.
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

    // ✨ PROMPT OPTIMIZED FOR SPEED ✨
    // This prompt is more direct and machine-readable, resulting in a faster response.
    const prompt = `Find 5 wedding venues near "${query.location}" for a budget under $${query.budget}. IMPORTANT: Respond with only a valid JSON object. The JSON object must have a single root key "venues", which is an array of objects. Each venue object in the array must include these exact keys: "name" (string), "location" (string), "aesthetic_description" (string), "estimated_price" (number), "website_url" (string), and "image_url" (string, must be a direct hotlink to a .jpg, .png, or .webp file). Do not include any text, titles, or markdown before or after the JSON object.`;

    const payload = { prompt };

    try {
      const response = await fetch('/.netlify/functions/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(`API call failed with status: ${response.status}`);
      }

      const result = await response.json();
      const rawText = result.candidates?.[0]?.content?.parts?.[0]?.text;

      if (rawText) {
        // This logic to find the JSON within the string is good practice
        const jsonString = rawText.substring(rawText.indexOf('{'), rawText.lastIndexOf('}') + 1);
        const parsedResult = JSON.parse(jsonString);
        setCache(prev => ({ ...prev, results: parsedResult.venues || [] }));
      } else {
        setCache(prev => ({ ...prev, error: "Could not find any venues." }));
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
        <input
          type="text"
          value={query.location}
          onChange={e => handleQueryChange('location', e.target.value)}
          placeholder="Enter City or Area"
          className="flex-grow p-2 border rounded-md bg-gray-50 dark:bg-gray-700 dark:text-white dark:border-gray-600"
        />
        <input
          type="number"
          value={query.budget}
          onChange={e => handleQueryChange('budget', e.target.value)}
          placeholder="Max Venue Budget"
          className="w-full md:w-1/4 p-2 border rounded-md bg-gray-50 dark:bg-gray-700 dark:text-white dark:border-gray-600"
        />
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
                <img src={`https://corsproxy.io/?${encodeURIComponent(venue.image_url)}`} alt={`View of ${venue.name}`} className="w-full h-full object-cover" />
              ) : (
                <ImageIcon className="w-12 h-12 text-gray-400" />
              )}
            </div>
            <div className="p-4 flex-grow flex flex-col">
              <h3 className="font-bold text-lg text-pink-600 dark:text-pink-400">{venue.name}</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">{venue.location}</p>
              {/* aesthetic_description can be added here if you want to display it */}
              <div className="flex-grow"></div>
              <div className="flex justify-between items-center mt-4 border-t pt-3 dark:border-gray-600">
                <a href={ensureProtocol(venue.website_url)} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline text-sm flex items-center">
                  <LinkIcon size={14} className="mr-1"/> Website
                </a>
                <button onClick={() => onSaveVenue(venue)} className="bg-green-500 text-white px-3 py-1 text-sm rounded-md hover:bg-green-600 flex items-center">
                  <Heart size={14} className="mr-1"/> Save
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
const Dashboard = ({ stats, weddingDate, onDateChange, budgetChartData }) => ( <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"> <div className="lg:col-span-4"> <h1 className="text-3xl font-bold text-gray-800 dark:text-white mb-2">Your Wedding Dashboard</h1> <p className="text-gray-600 dark:text-gray-400">Here's a snapshot of your wedding planning progress.</p> </div> <StatCard title="Days Until Wedding" value={stats.countdown > 0 ? stats.countdown : "Congratulations!"} icon={<Calendar />} /> <StatCard title="Guests Attending" value={`${stats.guestsAttending} / ${stats.totalGuests}`} icon={<Users />} /> <StatCard title="Budget Spent" value={`$${stats.actualSpending.toLocaleString()} / $${stats.estimatedBudget.toLocaleString()}`} icon={<DollarSign />} /> <StatCard title="Tasks Completed" value={`${stats.tasksCompleted} / ${stats.totalTasks}`} icon={<List />} /> <div className="md:col-span-2 lg:col-span-2 bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md"> <h2 className="text-xl font-semibold text-gray-700 dark:text-white mb-4">Set Your Wedding Date</h2> <input type="date" value={weddingDate} onChange={onDateChange} className="w-full p-2 border rounded-md bg-gray-50 dark:bg-gray-700 dark:text-white dark:border-gray-600" /> </div> <div className="md:col-span-2 lg:col-span-2 bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md flex flex-col"> <h2 className="text-xl font-semibold text-gray-700 dark:text-white mb-4">Budget Breakdown</h2> {budgetChartData.length > 0 ? ( <ResponsiveContainer width="100%" height={200}> <PieChart> <Pie data={budgetChartData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} fill="#8884d8" label> {budgetChartData.map((entry, index) => <Cell key={`cell-${index}`} fill={['#f472b6', '#ec4899', '#d946ef', '#a855f7', '#8b5cf6'][index % 5]} />)} </Pie> <Tooltip /> </PieChart> </ResponsiveContainer> ) : ( <div className="flex-grow flex items-center justify-center h-full text-gray-500"> Add expenses to see a breakdown. </div> )} </div> </div> );
const StatCard = ({ title, value, icon }) => ( <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md flex items-center"> <div className="p-3 bg-pink-100 dark:bg-pink-900/50 rounded-full text-pink-500 mr-4"> {icon} </div> <div> <p className="text-sm text-gray-600 dark:text-gray-400">{title}</p> <p className="text-2xl font-bold text-gray-800 dark:text-white">{value}</p> </div> </div> );
const CrudSection = ({ title, items, columns, onAdd, onEdit, onDelete, renderRow, onGenerateTasks, isGeneratingTasks }) => ( <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md"> <div className="flex justify-between items-center mb-4"> <h1 className="text-2xl font-bold text-gray-800 dark:text-white">{title}</h1> <div className="flex items-center space-x-2"> {onGenerateTasks && ( <button onClick={onGenerateTasks} disabled={isGeneratingTasks} className="bg-purple-500 text-white px-4 py-2 rounded-md hover:bg-purple-600 flex items-center disabled:bg-purple-300"> {isGeneratingTasks ? ( <><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>Generating...</> ) : ( <><Sparkles size={16} className="mr-2"/> Suggest Tasks</> )} </button> )} <button onClick={onAdd} className="bg-pink-500 text-white px-4 py-2 rounded-md hover:bg-pink-600 flex items-center"> <Plus size={16} className="mr-2"/> Add New </button> </div> </div> <div className="overflow-x-auto"> <table className="w-full text-left text-gray-600 dark:text-gray-400"> <thead className="bg-gray-50 dark:bg-gray-700"> <tr> {columns.map(col => <th key={col.key} className="p-3 font-semibold">{col.label}</th>)} <th className="p-3 font-semibold">Actions</th> </tr> </thead> <tbody> {(items || []).length > 0 ? ( (items || []).map(item => ( <tr key={item.id} className="border-b dark:border-gray-700"> {renderRow(item)} <td className="p-3"> <button onClick={() => onEdit(item)} className="text-blue-500 hover:text-blue-700 mr-2"><Edit size={18}/></button> <button onClick={() => onDelete(item.id)} className="text-red-500 hover:text-red-700"><Trash2 size={18}/></button> </td> </tr> )) ) : ( <tr> <td colSpan={columns.length + 1} className="text-center p-4 text-gray-500"> No items yet. Click "Add New" to get started! </td> </tr> )} </tbody> </table> </div> </div> );
const GuestList = ({ guests, onAdd, onEdit, onDelete }) => { const columns = [ { key: 'name', label: 'Name'}, { key: 'group', label: 'Group' }, { key: 'status', label: 'Status' }, { key: 'notes', label: 'Notes' } ]; const getStatusColor = (status) => { switch (status) { case 'Attending': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'; case 'Declined': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'; default: return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300'; } }; return <CrudSection title="Guest List" items={guests} columns={columns} onAdd={onAdd} onEdit={onEdit} onDelete={onDelete} renderRow={guest => ( <> <td className="p-3">{guest.name}</td> <td className="p-3">{guest.group}</td> <td className="p-3"><span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(guest.status)}`}>{guest.status}</span></td> <td className="p-3">{guest.notes}</td> </> )} />; };
const Budget = ({ budget, onAddExpense, onEditExpense, onDeleteExpense, onBudgetChange }) => { const columns = [ { key: 'item', label: 'Item/Category'}, { key: 'estimated', label: 'Estimated Cost'}, { key: 'actual', label: 'Actual Cost'}, { key: 'vendor', label: 'Vendor'} ]; const totalEstimated = (budget.expenses || []).reduce((acc, curr) => acc + (parseFloat(curr.estimated) || 0), 0); const totalActual = (budget.expenses || []).reduce((acc, curr) => acc + (parseFloat(curr.actual) || 0), 0); return ( <div> <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6"> <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md"> <label className="block text-lg font-semibold text-gray-700 dark:text-white mb-2">Total Budget</label> <div className="flex items-center"> <span className="text-2xl font-bold mr-2 text-gray-800 dark:text-white">$</span> <input type="number" value={budget.estimated || ''} onChange={onBudgetChange} className="w-full text-2xl font-bold p-2 border rounded-md" /> </div> </div> <StatCard title="Est. Expenses" value={`$${totalEstimated.toLocaleString()}`} icon={<DollarSign />} /> <StatCard title="Actual Spending" value={`$${totalActual.toLocaleString()}`} icon={<DollarSign />} /> </div> <CrudSection title="Expenses" items={budget.expenses || []} columns={columns} onAdd={onAddExpense} onEdit={onEditExpense} onDelete={onDeleteExpense} renderRow={expense => ( <> <td className="p-3">{expense.item} ({expense.category})</td> <td className="p-3">${parseFloat(expense.estimated || 0).toLocaleString()}</td> <td className="p-3">${parseFloat(expense.actual || 0).toLocaleString()}</td> <td className="p-3">{expense.vendor}</td> </> )} /> </div> ); };
const TodoList = ({ todos, onAdd, onEdit, onDelete, onToggle, onGenerateTasks, isGeneratingTasks }) => { const columns = [ { key: 'task', label: 'Task' }, { key: 'dueDate', label: 'Due Date' }, { key: 'status', label: 'Status' }]; return <CrudSection title="To-Do List" items={todos} columns={columns} onAdd={onAdd} onEdit={onEdit} onDelete={onDelete} onGenerateTasks={onGenerateTasks} isGeneratingTasks={isGeneratingTasks} renderRow={todo => ( <> <td className="p-3 flex items-center"> <input type="checkbox" checked={todo.completed} onChange={() => onToggle(todo.id)} className="mr-3 h-5 w-5 rounded border-gray-300 text-pink-600 focus:ring-pink-500" /> <span className={todo.completed ? 'line-through text-gray-400' : 'text-gray-800 dark:text-gray-200'}>{todo.task}</span> </td> <td className="p-3">{todo.dueDate}</td> <td className="p-3">{todo.completed ? <span className="text-green-500">Completed</span> : <span className="text-yellow-500">Pending</span>}</td> </> )} />; };
const Venues = ({ venues, onAdd, onEdit, onDelete }) => { const columns = [ { key: 'preview', label: 'Preview'}, { key: 'name', label: 'Name'}, { key: 'location', label: 'Location' }, { key: 'price', label: 'Price' }, { key: 'notes', label: 'Notes' } ]; const ensureProtocol = (url) => { if (!url) return '#'; if (!/^https?:\/\//i.test(url)) { return `https://${url}`; } return url; }; return <CrudSection title="Venues" items={venues} columns={columns} onAdd={onAdd} onEdit={onEdit} onDelete={onDelete} renderRow={venue => ( <> <td className="p-3"> <div className="w-16 h-12 bg-gray-200 dark:bg-gray-600 rounded-md flex items-center justify-center"> {venue.imageUrl ? ( <img src={venue.imageUrl} alt={venue.name} className="w-full h-full object-cover rounded-md"/> ) : ( <ImageIcon className="w-6 h-6 text-gray-400"/> )} </div> </td> <td className="p-3 font-semibold"> {venue.website ? ( <a href={ensureProtocol(venue.website)} target="_blank" rel="noopener noreferrer" className="text-pink-600 hover:underline"> {venue.name} </a> ) : ( <span className="text-gray-800 dark:text-gray-200">{venue.name}</span> )} </td> <td className="p-3">{venue.location}</td> <td className="p-3">${parseFloat(venue.price || 0).toLocaleString()}</td> <td className="p-3">{venue.notes}</td> </> )} />; };
const Vendors = ({ vendors, onAdd, onEdit, onDelete }) => { const columns = [ { key: 'name', label: 'Name'}, { key: 'service', label: 'Service' }, { key: 'contact', label: 'Contact' }, { key: 'price', label: 'Price' }, { key: 'notes', label: 'Notes' } ]; return <CrudSection title="Vendors" items={vendors} columns={columns} onAdd={onAdd} onEdit={onEdit} onDelete={onDelete} renderRow={vendor => ( <> <td className="p-3">{vendor.name}</td> <td className="p-3">{vendor.service}</td> <td className="p-3">{vendor.contact}</td> <td className="p-3">${parseFloat(vendor.price || 0).toLocaleString()}</td> <td className="p-3">{vendor.notes}</td> </> )} />; };
const Modal = ({ modalType, onClose, onSubmit, formData, onChange }) => { const titles = { guest: 'Guest Information', expense: 'Expense Details', todo: 'Task Details', venue: 'Venue Details', vendor: 'Vendor Details', }; const renderFields = () => { switch (modalType) { case 'guest': return <> <InputField name="name" label="Name" value={formData.name || ''} onChange={onChange} required /> <InputField name="group" label="Group" value={formData.group || ''} onChange={onChange} /> <SelectField name="status" label="Status" value={formData.status || 'Pending'} onChange={onChange} options={['Pending', 'Attending', 'Declined']} /> <TextAreaField name="notes" label="Notes" value={formData.notes || ''} onChange={onChange} /> </>; case 'expense': return <> <InputField name="item" label="Item" value={formData.item || ''} onChange={onChange} required /> <InputField name="category" label="Category" value={formData.category || ''} onChange={onChange} /> <InputField name="estimated" label="Estimated Cost" type="number" value={formData.estimated || ''} onChange={onChange} /> <InputField name="actual" label="Actual Cost" type="number" value={formData.actual || ''} onChange={onChange} /> <InputField name="vendor" label="Vendor" value={formData.vendor || ''} onChange={onChange} /> </>; case 'todo': return <> <InputField name="task" label="Task" value={formData.task || ''} onChange={onChange} required /> <InputField name="dueDate" label="Due Date" type="date" value={formData.dueDate || ''} onChange={onChange} /> </>; case 'venue': return <> <InputField name="name" label="Venue Name" value={formData.name || ''} onChange={onChange} required /> <InputField name="location" label="Location" value={formData.location || ''} onChange={onChange} /> <InputField name="website" label="Website URL" value={formData.website || ''} onChange={onChange} /> <InputField name="imageUrl" label="Image URL" value={formData.imageUrl || ''} onChange={onChange} /> <InputField name="capacity" label="Capacity" type="number" value={formData.capacity || ''} onChange={onChange} /> <InputField name="price" label="Price" type="number" value={formData.price || ''} onChange={onChange} /> <TextAreaField name="notes" label="Notes" value={formData.notes || ''} onChange={onChange} /> </>; case 'vendor': return <> <InputField name="name" label="Vendor Name" value={formData.name || ''} onChange={onChange} required /> <InputField name="service" label="Service Type" value={formData.service || ''} onChange={onChange} /> <InputField name="contact" label="Contact Info" value={formData.contact || ''} onChange={onChange} /> <InputField name="price" label="Price" type="number" value={formData.price || ''} onChange={onChange} /> <TextAreaField name="notes" label="Notes" value={formData.notes || ''} onChange={onChange} /> </>; default: return null; } }; return ( <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50"> <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-8 w-full max-w-md m-4"> <div className="flex justify-between items-center mb-6"> <h2 className="text-2xl font-bold text-gray-800 dark:text-white">{titles[modalType]}</h2> <button onClick={onClose} className="text-gray-500 hover:text-gray-800 dark:hover:text-gray-200"><X size={24}/></button> </div> <form onSubmit={onSubmit}> <div className="space-y-4"> {renderFields()} </div> <div className="mt-8 flex justify-end space-x-4"> <button type="button" onClick={onClose} className="px-4 py-2 rounded-md text-gray-700 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600">Cancel</button> <button type="submit" className="px-4 py-2 rounded-md text-white bg-pink-500 hover:bg-pink-600 flex items-center justify-center"> <Save size={16} className="mr-2"/> <span>Save</span> </button> </div> </form> </div> </div> ); };
const InputField = ({ name, label, ...props }) => ( <div> <label htmlFor={name} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{label}</label> <input id={name} name={name} {...props} className="w-full p-2 border rounded-md bg-gray-50 dark:border-gray-600 dark:bg-gray-700" /> </div> );
const TextAreaField = ({ name, label, ...props }) => ( <div> <label htmlFor={name} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{label}</label> <textarea id={name} name={name} {...props} rows="3" className="w-full p-2 border rounded-md bg-gray-50 dark:border-gray-600 dark:bg-gray-700"></textarea> </div> );
const SelectField = ({ name, label, options, ...props }) => ( <div> <label htmlFor={name} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{label}</label> <select id={name} name={name} {...props} className="w-full p-2 border rounded-md bg-gray-50 dark:border-gray-600 dark:bg-gray-700"> {options.map(opt => <option key={opt} value={opt}>{opt}</option>)} </select> </div> );

const SeatingChart = ({ guests, plan, setPlan }) => { const seatedGuestIds = new Set(Object.values(plan).flat()); const unseatedGuests = guests.filter(g => !seatedGuestIds.has(g.id)); const handleDragStart = (e, guestId) => { e.dataTransfer.setData("guestId", guestId); }; const handleDragOver = (e) => { e.preventDefault(); }; const handleDrop = (e, target) => { e.preventDefault(); const guestId = parseInt(e.dataTransfer.getData("guestId")); const newPlan = { ...plan }; Object.keys(newPlan).forEach(table => { newPlan[table] = newPlan[table].filter(id => id !== guestId); }); if (target !== 'unseated') { newPlan[target].push(guestId); } setPlan(newPlan); }; return ( <div className="flex flex-col md:flex-row h-full gap-6"> <div className="w-full md:w-1/3 bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md border-2 border-dashed border-gray-300 dark:border-gray-600" onDragOver={handleDragOver} onDrop={(e) => handleDrop(e, 'unseated')} > <h2 className="text-xl font-bold mb-4 text-gray-800 dark:text-white">Unseated Guests ({unseatedGuests.length})</h2> <div className="space-y-2 h-full overflow-y-auto"> {unseatedGuests.map(guest => ( <div key={guest.id} draggable onDragStart={(e) => handleDragStart(e, guest.id)} className="p-3 bg-gray-100 dark:bg-gray-700 rounded-md cursor-grab active:cursor-grabbing" > <p className="font-semibold text-gray-800 dark:text-gray-200">{guest.name}</p> <p className="text-sm text-gray-500 dark:text-gray-400">{guest.group}</p> </div> ))} </div> </div> <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-6 h-full overflow-y-auto"> {Object.entries(plan).map(([tableName, guestIds]) => ( <div key={tableName} onDragOver={handleDragOver} onDrop={(e) => handleDrop(e, tableName)} className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md border-2 border-dashed border-gray-300 dark:border-gray-600" > <h3 className="text-lg font-bold text-pink-500 mb-3">{tableName} ({guestIds.length})</h3> <div className="space-y-2"> {guestIds.map(id => { const guest = guests.find(g => g.id === id); if (!guest) return null; return ( <div key={guest.id} draggable onDragStart={(e) => handleDragStart(e, guest.id)} className="p-2 bg-pink-100 dark:bg-pink-900/50 rounded-md cursor-grab active:cursor-grabbing" > <p className="font-semibold text-pink-800 dark:text-pink-200">{guest.name}</p> </div> ); })} </div> </div> ))} </div> </div> ); };

export default App;