
import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext'; // Assuming useAuth is in a hooks directory

const AdminDashboard = () => {
    const { user } = useAuth();
    const [token, setToken] = useState(localStorage.getItem('admin_token') || (user?.role === 'superadmin' || user?.role === 'admin' ? 'role_bypassed' : null));
    const [creds, setCreds] = useState({ username: '', password: '' });
    const [error, setError] = useState('');
    const [content, setContent] = useState({ videos: [], news: [] });
    const [activeView, setActiveView] = useState('videos');
    const [loading, setLoading] = useState(false);
    const [stats, setStats] = useState(null);

    useEffect(() => {
        if (token) {
            fetchContent();
            fetch('/api/admin/stats').then(r => r.json()).then(setStats);
        }
    }, [token]);

    const login = async (e) => {
        e.preventDefault();
        try {
            const res = await fetch('/api/admin/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(creds)
            });
            const json = await res.json();
            if (json.success) {
                localStorage.setItem('admin_token', json.token);
                setToken(json.token);
                setError('');
            } else {
                setError(json.error);
            }
        } catch (e) { setError("Connection failed"); }
    };

    const fetchContent = () => {
        setLoading(true);
        fetch('/api/admin/content')
            .then(res => res.json())
            .then(data => {
                setContent({ videos: data.videos || [], news: data.news || [] });
                setLoading(false);
            })
            .catch(err => { console.error(err); setLoading(false); });
    };

    const handleToggle = (id, type, currentStatus) => {
        const key = type === 'video' ? 'videos' : 'news';
        setContent(prev => ({
            ...prev,
            [key]: prev[key].map(i => i.id === id ? { ...i, is_approved: !currentStatus ? 1 : 0 } : i)
        }));
        fetch('/api/admin/content/toggle', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id, type, status: !currentStatus })
        }).catch(() => fetchContent());
    };

    if (!token) return (
        <div className="flex items-center justify-center min-h-[50vh]">
            <div className="p-10 w-full max-w-md bg-[#15151A] rounded-2xl border border-white/10 shadow-2xl">
                <h2 className="text-2xl font-bold mb-6 text-center">Admin Login</h2>
                <form onSubmit={login} className="space-y-4">
                    <input className="w-full bg-black/40 border border-white/10 p-3 rounded text-white focus:border-blue-500 outline-none" placeholder="Username" value={creds.username} onChange={e => setCreds({ ...creds, username: e.target.value })} />
                    <input className="w-full bg-black/40 border border-white/10 p-3 rounded text-white focus:border-blue-500 outline-none" type="password" placeholder="Password" value={creds.password} onChange={e => setCreds({ ...creds, password: e.target.value })} />
                    {error && <p className="text-red-400 text-sm text-center">{error}</p>}
                    <button className="bg-blue-600 hover:bg-blue-500 px-4 py-3 rounded font-bold text-white w-full transition">Login</button>
                    <div className="text-center text-xs text-gray-500 mt-4">
                        <p>Default: admin / gyanbridge123</p>
                    </div>
                </form>
            </div>
        </div>
    );

    const items = activeView === 'videos' ? content.videos : content.news;

    return (
        <div className="p-8 space-y-8 animate-fade-in">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold">Admin Panel</h1>
                <button onClick={() => { localStorage.removeItem('admin_token'); setToken(null); }} className="text-red-400 text-sm hover:text-white transition">Logout</button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-[#15151A] p-6 rounded-xl border border-white/10">
                    <h3 className="text-gray-400 text-sm uppercase tracking-wider mb-2">Total Views</h3>
                    <p className="text-3xl font-bold">{stats?.total_views || 0}</p>
                </div>
                {stats?.prediction && (
                    <div className="bg-[#15151A] p-6 rounded-xl border border-blue-500/30">
                        <h3 className="text-blue-400 text-sm uppercase tracking-wider mb-2">Growth Forecast</h3>
                        <p className="text-3xl font-bold">{stats.prediction.growth || 'N/A'}</p>
                    </div>
                )}
            </div>

            <div className="flex gap-4 border-b border-white/10 pb-4">
                <button onClick={() => setActiveView('videos')} className={`px-4 py-2 rounded-lg font-medium transition ${activeView === 'videos' ? 'bg-purple-600 text-white' : 'bg-white/5 text-gray-400 hover:bg-white/10'}`}>Videos ({content.videos.length})</button>
                <button onClick={() => setActiveView('news')} className={`px-4 py-2 rounded-lg font-medium transition ${activeView === 'news' ? 'bg-purple-600 text-white' : 'bg-white/5 text-gray-400 hover:bg-white/10'}`}>News ({content.news.length})</button>
            </div>

            <div className="bg-[#15151A] rounded-xl border border-white/10 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-gray-300">
                        <thead className="bg-white/5 text-gray-400 uppercase text-xs">
                            <tr>
                                <th className="px-6 py-4">Title</th>
                                <th className="px-6 py-4">Source</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {loading ? <tr><td colSpan="4" className="text-center py-8 text-gray-500">Loading content...</td></tr> :
                                items.map((item) => (
                                    <tr key={item.id} className="hover:bg-white/5 transition-colors">
                                        <td className="px-6 py-4 truncate max-w-sm font-medium text-white" title={item.title}>{item.title}</td>
                                        <td className="px-6 py-4">{item.source || item.channel}</td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2 py-1 rounded text-xs font-bold ${item.is_approved ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                                                {item.is_approved ? 'Approved' : 'Hidden'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <button
                                                onClick={() => handleToggle(item.id, activeView === 'videos' ? 'video' : 'news', item.is_approved)}
                                                className={`text-xs font-bold px-3 py-1.5 rounded transition ${item.is_approved ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30' : 'bg-green-500/20 text-green-400 hover:bg-green-500/30'}`}
                                            >
                                                {item.is_approved ? 'Reject' : 'Approve'}
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default AdminDashboard;
