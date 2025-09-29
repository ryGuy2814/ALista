import React, { useState, useEffect, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, setDoc, onSnapshot, updateDoc } from 'firebase/firestore';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { Calendar, Users, DollarSign, List, MapPin, Briefcase, Plus, Trash2, Edit, Save, X, Sun, Moon, Sparkles, Heart } from 'lucide-react';

// --- PASTE YOUR FIREBASE CONFIGURATION HERE ---
// Replace the placeholder values with your actual Firebase credentials
// You can find these in your .env.local file or in the Firebase Console
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
            console.error("Firebase config is missing or invalid. Please paste your credentials into the firebaseConfig object in App.jsx.");
            // To avoid the infinite spinner, we can mark auth as ready even if it fails
            // This will allow the UI to render with an error or a prompt to configure.
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
    const [location, setLocation] = useState('');
    const [budget, setBudget] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [results, setResults] = useState([]);

    const handleSearch = async (e) => {
        e.preventDefault();
        // search logic...
    };

    return (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
            <h1 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">AI Venue Scout</h1>
            <p className="text-gray-600 dark:text-gray-400 mb-6">Let AI find the perfect venue for your budget and location.</p>
            
            <form onSubmit={handleSearch} className="flex flex-col md:flex-row gap-4 mb-8">
                <input type="text" value={location} onChange={e => setLocation(e.target.value)} placeholder="Enter City or Area (e.g., 'Napa Valley, CA')" className="flex-grow p-2 border rounded-md bg-gray-50 dark:bg-gray-700 dark:text-white dark:border-gray-600" />
                <input type="number" value={budget} onChange={e => setBudget(e.target.value)} placeholder="Max Venue Budget (e.g., 5000)" className="w-full md:w-1/4 p-2 border rounded-md bg-gray-50 dark:bg-gray-700 dark:text-white dark:border-gray-600" />
                <button type="submit" disabled={isLoading} className="bg-pink-500 text-white px-6 py-2 rounded-md hover:bg-pink-600 flex items-center justify-center disabled:bg-pink-300">
                    {isLoading ? <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div> : 'Find Venues'}
                </button>
            </form>

            {error && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-md mb-6" role="alert">{error}</div>}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {results.map((venue, index) => (
                    <div key={index} className="border rounded-lg p-4 flex flex-col justify-between bg-gray-50 dark:bg-gray-700/50 shadow">
                        <div>
                            <h3 className="font-bold text-lg text-pink-600 dark:text-pink-400">{venue.name}</h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">{venue.location}</p>
                            <p className="text-sm dark:text-gray-200 mb-1"><span className="font-semibold">Aesthetic:</span> {venue.aesthetic_description}</p>
                            <p className="text-sm dark:text-gray-200 mb-3"><span className="font-semibold">Est. Price:</span> ${venue.estimated_price?.toLocaleString()}</p>
                        </div>
                        <div className="flex justify-between items-center mt-4">
                            <a href={venue.website_url} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline text-sm">Visit Website</a>
                            <button onClick={() => onSaveVenue(venue)} className="bg-green-500 text-white px-3 py-1 text-sm rounded-md hover:bg-green-600 flex items-center"><Heart size={14} className="mr-1"/> Save to List</button>
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

const CrudSection = ({ title, items, columns, onAdd, onEdit, onDelete, children, onGenerateTasks, isGeneratingTasks }) => (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
        <div className="flex justify-between items-center mb-4">
            <h1 className="text-2xl font-bold text-gray-800 dark:text-white">{title}</h1>
            <div className="flex items-center space-x-2">
                {onGenerateTasks && (
                     <button 
                        onClick={onGenerateTasks} 
                        disabled={isGeneratingTasks}
                        className="bg-purple-500 text-white px-4 py-2 rounded-md hover:bg-purple-600 flex items-center disabled:bg-purple-300 disabled:cursor-not-allowed">
                        {isGeneratingTasks ? (
                             <>
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                Generating...
                            </>
                        ) : (
                            <>
                                <Sparkles size={16} className="mr-2"/> Suggest Tasks
                            </>
                        )}
                    </button>
                )}
                <button onClick={onAdd} className="bg-pink-500 text-white px-4 py-2 rounded-md hover:bg-pink-600 flex items-center">
                    <Plus size={16} className="mr-2"/> Add New
                </button>
            </div>
        </div>
        <div className="overflow-x-auto">
            <table className="w-full text-left text-gray-600 dark:text-gray-400">
                <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                        {columns.map(col => <th key={col.key} className="p-3 font-semibold">{col.label}</th>)}
                        <th className="p-3 font-semibold">Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {items.length > 0 ? items.map(item => (
                        <tr key={item.id} className="border-b dark:border-gray-700">
                            {children(item)}
                             <td className="p-3">
                                <button onClick={() => onEdit(item)} className="text-blue-500 hover:text-blue-700 mr-2"><Edit size={18}/></button>
                                <button onClick={() => onDelete(item.id)} className="text-red-500 hover:text-red-700"><Trash2 size={18}/></button>
                            </td>
                        </tr>
                    )) : <tr><td colSpan={columns.length + 1} className="text-center p-4 text-gray-500">No items yet.</td></tr>}
                </tbody>
            </table>
        </div>
    </div>
);

const GuestList = ({ guests, onAdd, onEdit, onDelete }) => {
    const columns = [ { key: 'name', label: 'Name'}, { key: 'status', label: 'Status' }, { key: 'notes', label: 'Notes' } ];
    const getStatusColor = (status) => {
        switch (status) {
            case 'Attending': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
            case 'Declined': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
            default: return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
        }
    }
    return <CrudSection title="Guest List" items={guests} columns={columns} onAdd={onAdd} onEdit={onEdit} onDelete={onDelete}>
        {guest => (
            <>
                <td className="p-3">{guest.name}</td>
                <td className="p-3"><span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(guest.status)}`}>{guest.status}</span></td>
                <td className="p-3">{guest.notes}</td>
            </>
        )}
    </CrudSection>;
};

const Budget = ({ budget, onAddExpense, onEditExpense, onDeleteExpense, onBudgetChange, chartData }) => {
    const columns = [ { key: 'item', label: 'Item/Category'}, { key: 'estimated', label: 'Estimated Cost'}, { key: 'actual', label: 'Actual Cost'}, { key: 'vendor', label: 'Vendor'} ];
    const totalEstimated = (budget.expenses || []).reduce((acc, curr) => acc + (parseFloat(curr.estimated) || 0), 0);
    const totalActual = (budget.expenses || []).reduce((acc, curr) => acc + (parseFloat(curr.actual) || 0), 0);
    
    return (
        <div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
                    <label className="block text-lg font-semibold text-gray-700 dark:text-white mb-2">Total Estimated Budget</label>
                    <div className="flex items-center">
                       <span className="text-2xl font-bold mr-2 text-gray-800 dark:text-white">$</span>
                       <input type="number" value={budget.estimated || ''} onChange={onBudgetChange} className="w-full text-2xl font-bold p-2 border rounded-md bg-gray-50 dark:bg-gray-700 dark:text-white dark:border-gray-600" />
                    </div>
                </div>
                <StatCard title="Total Estimated Expenses" value={`$${totalEstimated.toLocaleString()}`} icon={<DollarSign />} />
                <StatCard title="Total Actual Spending" value={`$${totalActual.toLocaleString()}`} icon={<DollarSign />} />
            </div>
             <CrudSection title="Expenses" items={budget.expenses || []} columns={columns} onAdd={onAddExpense} onEdit={onEditExpense} onDelete={onDeleteExpense}>
                {expense => (
                    <>
                        <td className="p-3">{expense.item} ({expense.category})</td>
                        <td className="p-3">${parseFloat(expense.estimated || 0).toLocaleString()}</td>
                        <td className="p-3">${parseFloat(expense.actual || 0).toLocaleString()}</td>
                        <td className="p-3">{expense.vendor}</td>
                    </>
                )}
            </CrudSection>
        </div>
    );
};


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
    const columns = [ { key: 'name', label: 'Name'}, { key: 'location', label: 'Location' }, { key: 'capacity', label: 'Capacity' }, { key: 'price', label: 'Price' }, { key: 'notes', label: 'Notes' } ];
    return <CrudSection title="Venues" items={venues} columns={columns} onAdd={onAdd} onEdit={onEdit} onDelete={onDelete}>
        {venue => (
            <>
                <td className="p-3">{venue.name}</td>
                <td className="p-3">{venue.location}</td>
                <td className="p-3">{venue.capacity}</td>
                <td className="p-3">${parseFloat(venue.price || 0).toLocaleString()}</td>
                <td className="p-3">{venue.notes}</td>
            </>
        )}
    </CrudSection>;
};

const Vendors = ({ vendors, onAdd, onEdit, onDelete }) => {
    const columns = [ { key: 'name', label: 'Name'}, { key: 'service', label: 'Service' }, { key: 'contact', label: 'Contact' }, { key: 'price', label: 'Price' }, { key: 'notes', label: 'Notes' } ];
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
                    <SelectField name="status" label="Status" value={formData.status || 'Pending'} onChange={onChange} options={['Pending', 'Attending', 'Declined']} />
                    <TextAreaField name="notes" label="Notes" value={formData.notes || ''} onChange={onChange} />
                </>;
            case 'expense':
                 return <>
                    <InputField name="item" label="Item" value={formData.item || ''} onChange={onChange} required />
                    <InputField name="category" label="Category" value={formData.category || ''} onChange={onChange} required />
                    <InputField name="estimated" label="Estimated Cost" type="number" value={formData.estimated || ''} onChange={onChange} />
                    <InputField name="actual" label="Actual Cost" type="number" value={formData.actual || ''} onChange={onChange} />
                    <InputField name="vendor" label="Vendor" value={formData.vendor || ''} onChange={onChange} />
                </>;
            case 'todo':
                 return <>
                    <InputField name="task" label="Task" value={formData.task || ''} onChange={onChange} required />
                    <InputField name="dueDate" label="Due Date" type="date" value={formData.dueDate || ''} onChange={onChange} />
                </>;
            case 'venue':
                return <>
                    <InputField name="name" label="Venue Name" value={formData.name || ''} onChange={onChange} required />
                    <InputField name="location" label="Location" value={formData.location || ''} onChange={onChange} />
                    <InputField name="capacity" label="Capacity" type="number" value={formData.capacity || ''} onChange={onChange} />
                    <InputField name="price" label="Price" type="number" value={formData.price || ''} onChange={onChange} />
                    <TextAreaField name="notes" label="Notes" value={formData.notes || ''} onChange={onChange} />
                </>;
            case 'vendor':
                 return <>
                    <InputField name="name" label="Vendor Name" value={formData.name || ''} onChange={onChange} required />
                    <InputField name="service" label="Service Type" value={formData.service || ''} onChange={onChange} />
                    <InputField name="contact" label="Contact Info" value={formData.contact || ''} onChange={onChange} />
                    <InputField name="price" label="Price" type="number" value={formData.price || ''} onChange={onChange} />
                    <TextAreaField name="notes" label="Notes" value={formData.notes || ''} onChange={onChange} />
                </>;
            default: return null;
        }
    }

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
                        <button type="submit" className="px-4 py-2 rounded-md text-white bg-pink-500 hover:bg-pink-600 flex items-center"><Save size={16} className="mr-2"/> Save</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const InputField = ({ name, label, ...props }) => (
    <div>
        <label htmlFor={name} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{label}</label>
        <input id={name} name={name} {...props} className="w-full p-2 border rounded-md bg-gray-50 dark:bg-gray-700 dark:text-white dark:border-gray-600 focus:ring-pink-500 focus:border-pink-500" />
    </div>
);

const TextAreaField = ({ name, label, ...props }) => (
    <div>
        <label htmlFor={name} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{label}</label>
        <textarea id={name} name={name} {...props} rows="3" className="w-full p-2 border rounded-md bg-gray-50 dark:bg-gray-700 dark:text-white dark:border-gray-600 focus:ring-pink-500 focus:border-pink-500"></textarea>
    </div>
);

const SelectField = ({ name, label, options, ...props }) => (
    <div>
        <label htmlFor={name} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{label}</label>
        <select id={name} name={name} {...props} className="w-full p-2 border rounded-md bg-gray-50 dark:bg-gray-700 dark:text-white dark:border-gray-600 focus:ring-pink-500 focus:border-pink-500">
            {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
        </select>
    </div>
);


export default App;

