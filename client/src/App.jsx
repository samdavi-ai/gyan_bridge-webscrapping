import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import LoginPage from './components/auth/LoginPage';
import RegisterPage from './components/auth/RegisterPage';
import OTPVerification from './components/auth/OTPVerification';
import ProfileSelection from './components/auth/ProfileSelection';
import ProtectedRoute from './components/auth/ProtectedRoute';
import DashboardLayout from './components/DashboardLayout';
import './index.css';

const RequireProfile = ({ children }) => {
    const { currentProfile } = useAuth();
    if (!currentProfile) {
        return <Navigate to="/profiles" replace />;
    }
    return children;
};

const AppContent = () => {
    const { logout, user } = useAuth();

    return (
        <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/verify-otp" element={<OTPVerification />} />

            <Route element={<ProtectedRoute />}>
                <Route path="/profiles" element={<ProfileSelection />} />
                <Route path="/" element={
                    <RequireProfile>
                        <DashboardLayout user={user} onLogout={logout} />
                    </RequireProfile>
                } />
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
    );
};

const App = () => {
    return (
        <React.StrictMode>
            <AuthProvider>
                <Router>
                    <AppContent />
                </Router>
            </AuthProvider>
        </React.StrictMode>
    );
};

export default App;
