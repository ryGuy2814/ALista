import React, { useState } from 'react';
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { Heart } from 'lucide-react';

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoginView, setIsLoginView] = useState(true);
    const auth = getAuth();

    const handleAuthAction = async (e) => {
        e.preventDefault();
        setError(''); // Clear previous errors
        
        try {
            if (isLoginView) {
                // Sign in existing user
                await signInWithEmailAndPassword(auth, email, password);
            } else {
                // Create new user
                await createUserWithEmailAndPassword(auth, email, password);
            }
            // On success, Firebase's onAuthStateChanged listener in App.jsx will handle the rest
        } catch (err) {
            setError(err.message);
        }
    };

    return (
        <div className="flex flex-col items-center justify-center h-screen bg-gradient-to-br from-pink-100 to-purple-100 dark:from-gray-800 dark:to-gray-900 text-center p-4">
            <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-2xl w-full max-w-sm">
                <Heart className="mx-auto w-12 h-12 text-pink-500 mb-4" />
                <h1 className="text-3xl font-bold text-gray-800 dark:text-white mb-2">{isLoginView ? 'Welcome Back!' : 'Create Your Account'}</h1>
                <p className="text-gray-500 dark:text-gray-400 mb-6">{isLoginView ? 'Sign in to continue your planning.' : 'Let\'s get you started.'}</p>
                
                <form onSubmit={handleAuthAction} className="space-y-4">
                    <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="Email Address"
                        className="w-full p-3 border rounded-md bg-gray-50 dark:bg-gray-700 dark:text-white dark:border-gray-600 focus:ring-pink-500 focus:border-pink-500"
                        required
                    />
                    <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Password"
                        className="w-full p-3 border rounded-md bg-gray-50 dark:bg-gray-700 dark:text-white dark:border-gray-600 focus:ring-pink-500 focus:border-pink-500"
                        required
                    />
                    
                    {error && <p className="text-red-500 text-sm">{error}</p>}
                    
                    <button type="submit" className="w-full bg-pink-500 text-white font-bold py-3 px-6 rounded-lg hover:bg-pink-600 transition-colors">
                        {isLoginView ? 'Sign In' : 'Sign Up'}
                    </button>
                </form>

                <div className="mt-6 text-sm">
                    <button onClick={() => setIsLoginView(!isLoginView)} className="text-gray-500 dark:text-gray-400 hover:text-pink-500 transition-colors">
                        {isLoginView ? 'Need an account? Sign Up' : 'Already have an account? Sign In'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Login;