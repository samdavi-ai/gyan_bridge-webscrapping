import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const LoginPage = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { login } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            const result = await login(email, password);
            if (result.success) {
                navigate('/profiles'); // Redirect to profile selection
            } else {
                setError(result.error || 'Login failed.');
            }
        } catch (err) {
            setError('An unexpected error occurred.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#0F0F12] flex items-center justify-center p-4 font-['Rajdhani']">
            <div className="w-full max-w-md bg-[#18181C] p-8 rounded-2xl shadow-2xl border border-white/10 relative overflow-hidden">
                {/* Background Glow */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 rounded-full pointer-events-none"></div>

                <div className="text-center mb-8 relative z-10">
                    <img src="/logo.png" alt="GyanBridge" className="w-12 h-12 mx-auto mb-4 object-contain" />
                    <h1 className="text-3xl font-bold text-white mb-2">Welcome Back</h1>
                    <p className="text-gray-400">Sign in to continue to GyanBridge</p>
                </div>

                {error && (
                    <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-lg mb-6 text-sm flex items-center gap-2">
                        <i className="ri-error-warning-line"></i>
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6 relative z-10">
                    <div>
                        <label className="block text-gray-400 text-sm font-bold mb-2">Email Address</label>
                        <div className="relative">
                            <i className="ri-mail-line absolute left-3 top-1/2 -translate-y-1/2 text-gray-500"></i>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full bg-[#0A0A0D] border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-colors placeholder-gray-600"
                                placeholder="name@example.com"
                                required
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-gray-400 text-sm font-bold mb-2">Password</label>
                        <div className="relative">
                            <i className="ri-lock-line absolute left-3 top-1/2 -translate-y-1/2 text-gray-500"></i>
                            <input
                                type={showPassword ? "text" : "password"}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full bg-[#0A0A0D] border border-white/10 rounded-xl py-3 pl-10 pr-12 text-white focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-colors placeholder-gray-600"
                                placeholder="••••••••"
                                required
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors"
                            >
                                <i className={showPassword ? "ri-eye-off-line" : "ri-eye-line"}></i>
                            </button>
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white font-bold py-3 px-4 rounded-xl hover:shadow-lg hover:shadow-purple-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        {loading ? <i className="ri-loader-4-line animate-spin"></i> : 'Sign In'}
                    </button>
                </form>

                <div className="mt-8 text-center text-sm text-gray-400 relative z-10">
                    Don't have an account? <Link to="/register" className="text-purple-400 hover:text-purple-300 font-bold">Create Account</Link>
                </div>
            </div>
        </div>
    );
};

export default LoginPage;
