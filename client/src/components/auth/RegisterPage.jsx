import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const RegisterPage = () => {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { register } = useAuth();
    const navigate = useNavigate();

    const generateStrongPassword = () => {
        const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+";
        let newPass = "";
        for (let i = 0; i < 14; i++) {
            newPass += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        setPassword(newPass);
        setConfirmPassword(newPass);
        setShowPassword(true);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (password !== confirmPassword) {
            setError('Passwords do not match.');
            return;
        }

        if (password.length < 6) {
            setError('Password must be at least 6 characters.');
            return;
        }

        setLoading(true);
        try {
            const result = await register(name, email, password);
            if (result.success) {
                // Navigate to OTP verification, passing email state and debug info if available
                navigate('/verify-otp', {
                    state: {
                        email,
                        debugOtp: result.debug_otp
                    }
                });
            } else {
                setError(result.error || 'Registration failed.');
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
                <div className="absolute top-0 left-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl -translate-y-1/2 -translate-x-1/2 rounded-full pointer-events-none"></div>

                <div className="text-center mb-8 relative z-10">
                    <img src="/logo.png" alt="GyanBridge" className="w-12 h-12 mx-auto mb-4 object-contain" />
                    <h1 className="text-3xl font-bold text-white mb-2">Create Account</h1>
                    <p className="text-gray-400">Join GyanBridge today</p>
                </div>

                {error && (
                    <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-lg mb-6 text-sm flex items-center gap-2">
                        <i className="ri-error-warning-line"></i>
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6 relative z-10">
                    <div>
                        <label className="block text-gray-400 text-sm font-bold mb-2">Full Name</label>
                        <div className="relative">
                            <i className="ri-user-line absolute left-3 top-1/2 -translate-y-1/2 text-gray-500"></i>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="w-full bg-[#0A0A0D] border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors placeholder-gray-600"
                                placeholder="John Doe"
                                required
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-gray-400 text-sm font-bold mb-2">Email Address</label>
                        <div className="relative">
                            <i className="ri-mail-line absolute left-3 top-1/2 -translate-y-1/2 text-gray-500"></i>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full bg-[#0A0A0D] border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors placeholder-gray-600"
                                placeholder="name@example.com"
                                required
                            />
                        </div>
                    </div>

                    <div>
                        <div className="flex justify-between items-center mb-2">
                            <label className="block text-gray-400 text-sm font-bold">Password</label>
                            <button
                                type="button"
                                onClick={generateStrongPassword}
                                className="text-xs text-blue-400 hover:text-blue-300 transition-colors font-bold flex items-center gap-1"
                            >
                                <i className="ri-magic-line"></i> Suggest Strong
                            </button>
                        </div>
                        <div className="relative">
                            <i className="ri-lock-line absolute left-3 top-1/2 -translate-y-1/2 text-gray-500"></i>
                            <input
                                type={showPassword ? "text" : "password"}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full bg-[#0A0A0D] border border-white/10 rounded-xl py-3 pl-10 pr-12 text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors placeholder-gray-600"
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

                    <div>
                        <label className="block text-gray-400 text-sm font-bold mb-2">Confirm Password</label>
                        <div className="relative">
                            <i className="ri-lock-fill absolute left-3 top-1/2 -translate-y-1/2 text-gray-500"></i>
                            <input
                                type={showPassword ? "text" : "password"}
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                className="w-full bg-[#0A0A0D] border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors placeholder-gray-600"
                                placeholder="••••••••"
                                required
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold py-3 px-4 rounded-xl hover:shadow-lg hover:shadow-blue-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        {loading ? <i className="ri-loader-4-line animate-spin"></i> : 'Create Account'}
                    </button>
                </form>

                <div className="mt-8 text-center text-sm text-gray-400 relative z-10">
                    Already have an account? <Link to="/login" className="text-blue-400 hover:text-blue-300 font-bold">Sign In</Link>
                </div>
            </div>
        </div>
    );
};

export default RegisterPage;
