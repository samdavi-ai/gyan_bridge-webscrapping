import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const OTPVerification = () => {
    console.log("OTP Verification V2 Loaded");
    const [otp, setOtp] = useState(['', '', '', '', '', '']);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [resendTimer, setResendTimer] = useState(60);
    const [canResend, setCanResend] = useState(false);
    const navigate = useNavigate();
    const loc = useLocation();
    const [debugOtp, setDebugOtp] = useState(loc.state?.debugOtp || null);
    const { verifyOtp, resendOtp } = useAuth();
    const email = loc.state?.email;
    const inputRefs = useRef([]);

    useEffect(() => {
        if (!email) {
            navigate('/register');
        } else {
            // Auto-focus first input on load
            setTimeout(() => inputRefs.current[0]?.focus(), 500);
        }
    }, [email, navigate]);

    useEffect(() => {
        let timer;
        if (resendTimer > 0) {
            timer = setTimeout(() => setResendTimer(resendTimer - 1), 1000);
        } else {
            setCanResend(true);
        }
        return () => clearTimeout(timer);
    }, [resendTimer]);

    const handleChange = (index, value) => {
        if (isNaN(value)) return;
        const newOtp = [...otp];
        newOtp[index] = value.substring(value.length - 1);
        setOtp(newOtp);

        // Move to next input
        if (value && index < 5) {
            inputRefs.current[index + 1].focus();
        }
    };

    const handleKeyDown = (index, e) => {
        if (e.key === 'Backspace' && !otp[index] && index > 0) {
            inputRefs.current[index - 1].focus();
        }
    };

    const handlePaste = (e) => {
        const data = e.clipboardData.getData('text').trim();
        if (data.length === 6 && !isNaN(data)) {
            setOtp(data.split(''));
            inputRefs.current[5].focus();
        }
    };

    const handleSubmit = async (e) => {
        if (e) e.preventDefault();
        const fullOtp = otp.join('');
        if (fullOtp.length !== 6) return;

        setError('');
        setLoading(true);
        try {
            const result = await verifyOtp(email, fullOtp);
            if (result.success) {
                navigate('/login', { state: { message: 'Account verified! Please sign in.' } });
            } else {
                setError(result.error || 'Invalid OTP.');
            }
        } catch (err) {
            setError('An unexpected error occurred.');
        } finally {
            setLoading(false);
        }
    };

    const handleResend = async () => {
        if (!canResend) return;
        setError('');
        setLoading(true);
        try {
            const result = await resendOtp(email);
            if (result.success) {
                setResendTimer(60);
                setCanResend(false);
                if (result.dev_mode) {
                    setDebugOtp(result.debug_otp);
                }
            } else {
                setError(result.error);
            }
        } catch (err) {
            setError('Failed to resend OTP.');
        } finally {
            setLoading(false);
        }
    };

    // Auto-submit when all digits are filled
    useEffect(() => {
        if (otp.join('').length === 6 && !loading) {
            handleSubmit();
        }
    }, [otp]);

    if (!email) return null;

    return (
        <div className="min-h-screen bg-[#0F0F12] flex items-center justify-center p-4 font-['Rajdhani']">
            <div className="w-full max-w-md bg-[#18181C] p-8 rounded-3xl shadow-2xl border border-white/10 relative overflow-hidden">
                {/* Background Decoration */}
                <div className="absolute -top-24 -right-24 w-48 h-48 bg-green-500/10 rounded-full blur-3xl"></div>

                <div className="text-center mb-8 relative z-10">
                    <div className="w-20 h-20 bg-gradient-to-br from-green-500/20 to-emerald-500/20 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-green-500/20 shadow-lg rotate-3">
                        <i className="ri-shield-user-fill text-4xl text-green-400"></i>
                    </div>
                    <h1 className="text-3xl font-bold text-white mb-2">Verify Your Email</h1>
                    <p className="text-gray-400 leading-relaxed">
                        We've sent a 6-digit code to <br />
                        <span className="text-green-400 font-medium">{email}</span>
                    </p>
                </div>

                {error && (
                    <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl mb-6 text-sm flex items-center gap-3 animate-shake">
                        <i className="ri-error-warning-fill text-lg"></i>
                        {error}
                    </div>
                )}

                {/* Dev Mode Helper */}
                {debugOtp && (
                    <div
                        onClick={() => {
                            navigator.clipboard.writeText(debugOtp);
                            const original = debugOtp;
                            setDebugOtp('COPIED!');
                            setTimeout(() => setDebugOtp(original), 1000);
                        }}
                        className="bg-blue-500/10 border border-blue-500/20 text-blue-400 p-4 rounded-xl mb-6 text-sm text-center cursor-pointer hover:bg-blue-500/20 transition-all active:scale-95 group"
                    >
                        <p className="mb-1 uppercase text-[10px] tracking-widest font-bold group-hover:text-blue-300">Developer Mode (Click to Copy)</p>
                        <p>Use code: <span className="text-white font-mono text-xl font-bold tracking-[0.5em]">{debugOtp}</span></p>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-8 relative z-10">
                    <div className="flex justify-between gap-2" onPaste={handlePaste}>
                        {otp.map((digit, index) => (
                            <input
                                key={index}
                                ref={el => inputRefs.current[index] = el}
                                type="text"
                                inputMode="numeric"
                                value={digit}
                                onChange={(e) => handleChange(index, e.target.value)}
                                onKeyDown={(e) => handleKeyDown(index, e)}
                                className="w-12 h-16 bg-[#0A0A0D] border border-white/10 rounded-xl text-white text-center text-2xl font-bold focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20 transition-all shadow-inner"
                                maxLength="1"
                                required
                            />
                        ))}
                    </div>

                    <button
                        type="submit"
                        disabled={loading || otp.join('').length !== 6}
                        className="w-full h-14 bg-gradient-to-r from-green-600 to-emerald-600 text-white font-bold rounded-xl hover:shadow-xl hover:shadow-green-500/20 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
                    >
                        {loading ? <i className="ri-loader-4-line animate-spin text-xl"></i> : 'Verify & Continue'}
                    </button>

                    <div className="text-center pt-2">
                        {canResend ? (
                            <button
                                type="button"
                                onClick={handleResend}
                                className="text-green-400 font-bold hover:text-green-300 transition-colors flex items-center gap-2 mx-auto text-sm"
                            >
                                <i className="ri-refresh-line"></i> Resend Verification Code
                            </button>
                        ) : (
                            <p className="text-gray-500 text-sm flex items-center justify-center gap-2">
                                <i className="ri-time-line"></i> Resend code in <span className="text-gray-300 font-mono">0:{resendTimer.toString().padStart(2, '0')}</span>
                            </p>
                        )}
                    </div>
                </form>

                <div className="mt-8 text-center">
                    <Link to="/register" className="text-gray-500 hover:text-white transition text-sm">
                        Change email address
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default OTPVerification;
