import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

const SuperAdminDashboard = () => {
    const { user } = useAuth();
    const [token, setToken] = useState(localStorage.getItem('super_token') || (user?.role === 'superadmin' ? 'role_bypassed' : null));
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [topics, setTopics] = useState({});
    const [newTopic, setNewTopic] = useState('');

    useEffect(() => {
        if (token) fetch('/api/superadmin/topics').then(r => r.json()).then(setTopics);
    }, [token]);

    const handleLogin = (e) => {
        e.preventDefault();
        fetch('/api/superadmin/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        }).then(res => res.json()).then(data => {
            if (data.success) {
                localStorage.setItem('super_token', data.token);
                setToken(data.token);
                setError('');
            } else { setError(data.error); }
        });
    };

    const toggleTopic = (topic, currentStatus) => {
        setTopics(prev => ({ ...prev, [topic]: !currentStatus }));
        fetch('/api/topics/toggle', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ topic, status: !currentStatus })
        });
    };

    const handleAddTopic = () => {
        if (!newTopic.trim()) return;
        fetch('/api/superadmin/topics/add', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ topic: newTopic.trim() })
        }).then(res => res.json()).then(data => {
            if (data.success) {
                setTopics(prev => ({ ...prev, [newTopic.trim()]: true }));
                setNewTopic('');
            } else {
                alert(data.error || 'Failed to add topic');
            }
        });
    };

    if (!token) {
        return (
            <div className="flex items-center justify-center p-6 bg-[#15151A] rounded-2xl w-full max-w-md mx-auto mt-20">
                <form onSubmit={handleLogin} className="w-full space-y-4">
                    <h2 className="text-2xl font-bold">Super Admin</h2>
                    {error && <div className="text-red-400 text-sm">{error}</div>}
                    <input type="text" value={username} onChange={e => setUsername(e.target.value)} placeholder="Username" className="w-full bg-gray-800 px-4 py-2 rounded text-white" />
                    <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Password" className="w-full bg-gray-800 px-4 py-2 rounded text-white" />
                    <button type="submit" className="w-full bg-orange-600 font-bold py-2 rounded text-white">Access Control</button>
                </form>
            </div>
        );
    }

    return (
        <div className="p-8">
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-3xl font-bold">Topic Control</h1>
                <button onClick={() => { setToken(null); localStorage.removeItem('super_token'); }} className="text-gray-400">Logout</button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-3 p-6 rounded-xl border border-white/10 bg-white/5 flex items-center gap-4">
                    <input
                        type="text"
                        value={newTopic}
                        onChange={(e) => setNewTopic(e.target.value)}
                        placeholder="Add new topic..."
                        className="flex-1 bg-black/40 border border-white/10 px-4 py-2 rounded text-white outline-none focus:border-purple-500"
                        onKeyPress={(e) => e.key === 'Enter' && handleAddTopic()}
                    />
                    <button
                        onClick={handleAddTopic}
                        disabled={!newTopic.trim()}
                        className="bg-purple-600 hover:bg-purple-500 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-2 rounded font-bold transition"
                    >
                        Add Topic
                    </button>
                </div>

                {Object.entries(topics).map(([topic, active]) => (
                    <div key={topic} className={`p-6 rounded-xl border ${active ? 'bg-green-500/10 border-green-500/30' : 'bg-red-500/10 border-red-500/30'}`}>
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-xl font-bold">{topic}</h3>
                            <button onClick={() => toggleTopic(topic, active)} className={`w-12 h-6 rounded-full p-1 transition-colors ${active ? 'bg-green-500' : 'bg-gray-600'}`}>
                                <div className={`w-4 h-4 rounded-full bg-white shadow transition-transform ${active ? 'translate-x-6' : 'translate-x-0'}`} />
                            </button>
                        </div>
                        <p className={`text-sm ${active ? 'text-green-400' : 'text-red-400'}`}>{active ? 'Active' : 'Disabled'}</p>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default SuperAdminDashboard;
