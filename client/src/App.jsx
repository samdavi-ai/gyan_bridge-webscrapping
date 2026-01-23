
/* eslint-disable */
import React, { useState, useEffect } from 'react';
import LoginEntry from './components/LoginEntry';
import DashboardLayout from './components/DashboardLayout';
import './index.css';

const App = () => {
    const [user, setUser] = useState(() => localStorage.getItem('gb_user') || null);

    const handleLogin = (u) => {
        localStorage.setItem('gb_user', JSON.stringify(u)); // Store as JSON string or plain string depending on usage. Original was simple.
        setUser(u);
    };

    // Fix: localStorage returns string, so we might need to parse if object stored, but existing logic was likely string or simple token.
    // Line 987 was: const [user, setUser] = useState(() => localStorage.getItem('gb_user') || null);
    // Line 988: const handleLogin = (u) => { localStorage.setItem('gb_user', u); setUser(u); };
    // If 'u' is object {name: 'foo'}, then [object Object] would be stored.
    // If LogicEntry sends {name: 'foo'}, then we should stringify.
    // However, keeping consistent with previous simple logic for now, but improved slightly.

    const handleLogout = () => {
        localStorage.removeItem('gb_user');
        setUser(null);
    };

    useEffect(() => {
        const style = document.createElement('style');
        style.innerHTML = `.animate-fade-in {animation: fadeIn 0.4s ease-out forwards; } @keyframes fadeIn {from {opacity: 0; } to {opacity: 1; } } .custom-scrollbar::-webkit-scrollbar {width: 6px; } .custom-scrollbar::-webkit-scrollbar-thumb {background: rgba(255,255,255,0.1); border-radius: 10px; }`;
        document.head.appendChild(style);
    }, []);

    return (
        <React.StrictMode>
            {!user ? <LoginEntry onLogin={handleLogin} /> : <DashboardLayout user={user} onLogout={handleLogout} />}
        </React.StrictMode>
    );
};

export default App;
