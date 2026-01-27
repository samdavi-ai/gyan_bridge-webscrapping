import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const ProtectedRoute = () => {
    const { user, loading } = useAuth();

    if (loading) {
        return (
            <div className="flex h-screen items-center justify-center bg-[#0F0F12]">
                <div className="animate-spin text-4xl text-purple-500">
                    <i className="ri-loader-4-line"></i>
                </div>
            </div>
        );
    }

    return user ? <Outlet /> : <Navigate to="/login" replace />;
};

export default ProtectedRoute;
