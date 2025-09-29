import React, { useState, useEffect, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, setDoc, onSnapshot, updateDoc } from 'firebase/firestore';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { Calendar, Users, DollarSign, List, MapPin, Briefcase, Plus, Trash2, Edit, Save, X, Sun, Moon, Sparkles, Heart } from 'lucide-react';

// --- PASTE YOUR FIREBASE CONFIGURATION HERE ---
// Replace the placeholder values with your actual Firebase credentials
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
    // --- State Management ---
    const [activeTab, setActiveTab] = useState('dashboard');
    const [weddingData, setWeddingData] = useState({
        weddingDate: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0],
        guestList: [],
        budget: { estimated: 10000, expenses: [] },
        todoList: [
            { id: 1, task: 'Choose a date', completed: true, dueDate: new Date().toISOString().split('T')[0] },
            { id: 2, task: 'Set a budget', completed: true, dueDate: new Date().toISOString().split('T')[0] },
            { id: 3, task: 'Book a venue', completed: false, dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] },
        ],
        venues: [],
        vendors: [],
    });

    const [modal, setModal] = useState(null);
    const [editItemId, setEditItemId] = useState(null);
    const [formData, setFormData] = useState({});
    const [isGeneratingTasks, setIsGeneratingTasks] = useState(false);
    
    // Firebase state
    const [auth, setAuth] = useState(null);
    const [db, setDb] = useState(null);
    const [userId, setUserId] = useState(null);
    const [isAuthReady, setIsAuthReady] = useState(false);

    // --- Firebase Initialization and Auth ---
    useEffect(() => {
        if (firebaseConfig.apiKey && firebaseConfig.apiKey !== "YOUR_API_KEY") {
            const app = initializeApp(firebaseConfig);
            const authInstance = getAuth(app);
            const dbInstance = getFirestore(app);
            setAuth(authInstance);
            setDb(dbInstance);

            const unsubscribe = onAuthStateChanged(authInstance, async (user) => {
                if (user) {
                    setUserId(user.uid);
                } else {
                    try {
                        await signInAnonymously(authInstance);
                    } catch (error) {
                        console.error("Anonymous authentication error:", error);
                    }
                }
                setIsAuthReady(true);
            });
            return () => unsubscribe();
        } else {
            // Don't log an error here, the renderContent function will handle showing the message
            setIsAuthReady(true); 
        }
    }, []);

    // --- Data Fetching and Saving ---
    useEffect(() => {
        if (isAuthReady && db && userId) {
            const docRef = doc(db, 'weddings', userId);
            
            const unsubscribe = onSnapshot(docRef, (docSnap) => {
                if (docSnap.exists()) {
                    setWeddingData(prevData => ({ ...prevData, ...docSnap.data() }));
                } else {
                    setDoc(docRef, weddingData);
                }
            });

            return () => unsubscribe();
        }
    }, [isAuthReady, db, userId]);

    const handleDataUpdate = async (newData) => {
        if (!isAuthReady || !db || !userId) return;
        const docRef = doc(db, 'weddings', userId);
        try {
            await setDoc(docRef, newData, { merge: true });
        } catch (error) {
            console.error("Error updating document:", error);
        }
    };
    
    const handleSaveVenueFromScout = (venue) => {
        const newVenue = {
            id: new Date().getTime(),
            name: venue.name,
            location: venue.location,
            notes: `Aesthetic: ${venue.aesthetic_description}. Link: ${venue.website_url}`,
            price: venue.estimated_price,
            capacity: '',
        };
        const updatedData = {
            ...weddingData,
            venues: [...(weddingData.venues || []), newVenue],
        };
        handleDataUpdate(updatedData);
        setActiveTab('venues');
    };

    // --- Event Handlers ---
    const openModal = (type, item = null) => {
        setModal(type);
        if (item) {
            setEditItemId(item.id);
            setFormData(item);
        } else {
            setEditItemId(null);
            setFormData({});
        }
    };

    const closeModal = () => {
        setModal(null);
        setEditItemId(null);
        setFormData({});
    };

    const handleFormChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    };

    const handleFormSubmit = (e) => {
        e.preventDefault();
        let updatedData = { ...weddingData };
        const id = editItemId || new Date().getTime();
        
        switch (modal) {
            case 'guest':
                const newGuest = { id, ...formData, status: formData.status || 'Pending' };
                updatedData.guestList = editItemId 
                    ? updatedData.guestList.map(g => g.id === id ? newGuest : g)
                    : [...(weddingData.guestList || []), newGuest];
                break;
            case 'expense':
                 const newExpense = { id, ...formData, estimated: parseFloat(formData.estimated || 0), actual: parseFloat(formData.actual || 0) };
                updatedData.budget.expenses = editItemId
                    ? updatedData.budget.expenses.map(ex => ex.id === id ? newExpense : ex)
                    : [...(weddingData.budget.expenses || []), newExpense];
                break;
            case 'todo':
                 const newTodo = { id, ...formData, completed: formData.completed || false };
                updatedData.todoList = editItemId
                    ? updatedData.todoList.map(t => t.id === id ? newTodo : t)
                    : [...(weddingData.todoList || []), newTodo];
                break;
             case 'venue':
                const newVenue = { id, ...formData };
                updatedData.venues = editItemId 
                    ? updatedData.venues.map(v => v.id === id ? newVenue : v)
                    : [...(weddingData.venues || []), newVenue];
                break;
            case 'vendor':
                const newVendor = { id, ...formData };
                updatedData.vendors = editItemId 
                    ? updatedData.vendors.map(v => v.id === id ? newVendor : v)
                    : [...(weddingData.vendors || []), newVendor];
                break;
            default:
                break;
        }

        handleDataUpdate(updatedData);
        closeModal();
    };
    
    const handleDelete = (type, id) => {
        let updatedData = { ...weddingData };
         switch (type) {
            case 'guest':
                updatedData.guestList = updatedData.guestList.filter(g => g.id !== id);
                break;
            case 'expense':
                updatedData.budget.expenses = updatedData.budget.expenses.filter(ex => ex.id !== id);
                break;
            case 'todo':
                updatedData.todoList = updatedData.todoList.filter(t => t.id !== id);
                break;
            case 'venue':
                updatedData.venues = updatedData.venues.filter(v => v.id !== id);
                break;
             case 'vendor':
                updatedData.vendors = updatedData.vendors.filter(v => v.id !== id);
                break;
            default:
                break;
        }
        handleDataUpdate(updatedData);
    }
    
    const handleWeddingDateChange = (e) => {
        const newDate = e.target.value;
        const updatedData = {...weddingData, weddingDate: newDate};
        handleDataUpdate(updatedData);
    };

    const handleBudgetChange = (e) => {
        const newBudget = parseFloat(e.target.value);
        const updatedData = {...weddingData, budget: {...weddingData.budget, estimated: newBudget}};
        handleDataUpdate(updatedData);
    }
    
    const toggleTodoCompletion = (id) => {
        const updatedTodos = weddingData.todoList.map(todo => 
            todo.id === id ? { ...todo, completed: !todo.completed } : todo
        );
        handleDataUpdate({ ...weddingData, todoList: updatedTodos });
    };
    
    const handleGenerateTasks = async () => { /* ... */ };

    const dashboardStats = useMemo(() => {
        const { weddingDate, guestList, budget, todoList } = weddingData;
        const today = new Date();
        const wDate = new Date(weddingDate);
        const countdown = Math.ceil((wDate - today) / (1000 * 60 * 60 * 24));
        const guestsAttending = (guestList || []).filter(g => g.status === 'Attending').length;
        const totalGuests = (guestList || []).length;
        const actualSpending = (budget.expenses || []).reduce((acc, curr) => acc + (parseFloat(curr.actual) || 0), 0);
        const tasksCompleted = (todoList || []).filter(t => t.completed).length;
        const totalTasks = (todoList || []).length;
        return { countdown, guestsAttending, totalGuests, actualSpending, estimatedBudget: budget.estimated, tasksCompleted, totalTasks };
    }, [weddingData]);

    const budgetChartData = useMemo(() => {
        const { expenses } = weddingData.budget;
        if (!expenses || expenses.length === 0) return [];
        const categoryTotals = expenses.reduce((acc, expense) => {
            const category = expense.category || 'Uncategorized';
            acc[category] = (acc[category] || 0) + (parseFloat(expense.actual) || 0);
            return acc;
        }, {});
        return Object.entries(categoryTotals).map(([name, value]) => ({ name, value }));
    }, [weddingData.budget.expenses]);

    const renderContent = () => {
        if (firebaseConfig.apiKey === "YOUR_API_KEY") {
            return (
                <div className="flex items-center justify-center h-full">
                    <div className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow-md text-center">
                        <h1 className="text-2xl font-bold text-red-500 mb-4">Configuration Needed</h1>
                        <p className="text-gray-600 dark:text-gray-300">Please paste your Firebase credentials into the `firebaseConfig` object in `src/App.jsx` to get started.</p>
                    </div>
                </div>
            );
        }

        switch (activeTab) {
            case 'dashboard': return <Dashboard stats={dashboardStats} weddingDate={weddingData.weddingDate} onDateChange={handleWeddingDateChange} budgetChartData={budgetChartData} />;
            case 'guests': return <GuestList guests={weddingData.guestList || []} onAdd={() => openModal('guest')} onEdit={(item) => openModal('guest', item)} onDelete={(id) => handleDelete('guest', id)} />;
            case 'budget': return <Budget budget={weddingData.budget || {}} onAddExpense={() => openModal('expense')} onEditExpense={(item) => openModal('expense', item)} onDeleteExpense={(id) => handleDelete('expense', id)} onBudgetChange={handleBudgetChange} chartData={budgetChartData}/>;
            case 'todos': return <TodoList todos={weddingData.todoList || []} onAdd={() => openModal('todo')} onEdit={(item) => openModal('todo', item)} onDelete={(id) => handleDelete('todo', id)} onToggle={toggleTodoCompletion} onGenerateTasks={handleGenerateTasks} isGeneratingTasks={isGeneratingTasks} />;
            case 'venues': return <Venues venues={weddingData.venues || []} onAdd={() => openModal('venue')} onEdit={(item) => openModal('venue', item)} onDelete={(id) => handleDelete('venue', id)} />;
            case 'vendors': return <Vendors vendors={weddingData.vendors || []} onAdd={() => openModal('vendor')} onEdit={(item) => openModal('vendor', item)} onDelete={(id) => handleDelete('vendor', id)} />;
            case 'ai-scout': return <AIVenueScout onSaveVenue={handleSaveVenueFromScout} />;
            default: return <Dashboard stats={dashboardStats} weddingDate={weddingData.weddingDate} onDateChange={handleWeddingDateChange} budgetChartData={budgetChartData} />;
        }
    };
    
    if (!isAuthReady) {
        return <div className="flex items-center justify-center h-screen bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-200"><div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-pink-500"></div></div>;
    }

    return (
        <div className="flex h-screen bg-gray-100 dark:bg-gray-900 font-sans">
            <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} userId={userId}/>
            <main className="flex-1 p-4 md:p-8 overflow-y-auto">
                {renderContent()}
            </main>
            {modal && <Modal modalType={modal} onClose={closeModal} onSubmit={handleFormSubmit} formData={formData} onChange={handleFormChange} />}
        </div>
    );
};

// --- Child Components ---
const Sidebar = ({ activeTab, setActiveTab, userId }) => {
    const navItems = [
        { id: 'dashboard', icon: <Sun className="w-6 h-6"/>, label: 'Dashboard' },
        { id: 'guests', icon: <Users className="w-6 h-6"/>, label: 'Guest List' },
        { id: 'budget', icon: <DollarSign className="w-6 h-6"/>, label: 'Budget' },
        { id: 'todos', icon: <List className="w-6 h-6"/>, label: 'To-Do List' },
        { id: 'venues', icon: <MapPin className="w-6 h-6"/>, label: 'Venues' },
        { id: 'vendors', icon: <Briefcase className="w-6 h-6"/>, label: 'Vendors' },
        { id: 'ai-scout', icon: <Sparkles className="w-6 h-6"/>, label: 'AI Venue Scout' },
    ];
    
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
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate hidden lg:block">User ID:</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{userId}</p>
            </div>
        </nav>
    );
};

const AIVenueScout = ({ onSaveVenue }) => {
    // ... component implementation
    return <div>AI Venue Scout</div>;
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
        
        <div className="md:col-span-2 lg:col-span-2 bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-semibold text-gray-700 dark:text-white mb-4">Budget Breakdown</h2>
            <ResponsiveContainer width="100%" height={200}>
                {budgetChartData.length > 0 ? (
                    <PieChart>
                        <Pie data={budgetChartData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} fill="#8884d8" label>
                            {budgetChartData.map((entry, index) => <Cell key={`cell-${index}`} fill={['#f472b6', '#ec4899', '#d946ef', '#a855f7', '#8b5cf6'][index % 5]} />)}
                        </Pie>
                        <Tooltip />
                    </PieChart>
                ) : <div className="flex items-center justify-center h-full text-gray-500">Add expenses to see a breakdown.</div>}
            </ResponsiveContainer>
        </div>
    </div>
);

const StatCard = ({ title, value, icon }) => (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md flex items-center">
        <div className="p-3 bg-pink-100 dark:bg-pink-900/50 rounded-full text-pink-500 mr-4">
            {icon}
        </div>
        <div>
            <p className="text-sm text-gray-600 dark:text-gray-400">{title}</p>
            <p className="text-2xl font-bold text-gray-800 dark:text-white">{value}</p>
        </div>
    </div>
);

// Define CrudSection, GuestList, Budget, etc. as in previous versions.
// They are omitted here for brevity but are required for the app to function fully.

const CrudSection = ({ title, items, columns, onAdd, onEdit, onDelete, children }) => ( <div>Crud Section Placeholder</div> )
const GuestList = ({ guests, onAdd, onEdit, onDelete }) => ( <div>Guest List Placeholder</div> )
const Budget = ({ budget, onAddExpense, onEditExpense, onDeleteExpense, onBudgetChange }) => ( <div>Budget Placeholder</div> )
const TodoList = ({ todos, onAdd, onEdit, onDelete, onToggle }) => ( <div>Todo List Placeholder</div> )
const Venues = ({ venues, onAdd, onEdit, onDelete }) => ( <div>Venues Placeholder</div> )
const Vendors = ({ vendors, onAdd, onEdit, onDelete }) => ( <div>Vendors Placeholder</div> )
const Modal = ({ modalType, onClose, onSubmit, formData, onChange }) => ( <div>Modal Placeholder</div> )

export default App;

