import React, { createContext, useContext, useState, useEffect } from 'react';
import { jwtDecode } from "jwt-decode";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(localStorage.getItem('gb_token'));
    const [profiles, setProfiles] = useState([]);
    const [currentProfile, setCurrentProfile] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const initAuth = async () => {
            if (token) {
                try {
                    const decoded = jwtDecode(token);
                    if (decoded.exp * 1000 < Date.now()) {
                        logout();
                    } else {
                        setUser({
                            ...decoded,
                            role: decoded.role || 'user'
                        });
                        await fetchProfiles();
                    }
                } catch (error) {
                    console.error("Invalid token:", error);
                    logout();
                }
            }
            setLoading(false);
        };
        initAuth();
    }, [token]);

    const fetchProfiles = async () => {
        try {
            const res = await fetch('/api/auth/profiles', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setProfiles(data);

                const savedProfileId = localStorage.getItem('gb_current_profile_id');
                if (savedProfileId) {
                    const profile = data.find(p => p.id === parseInt(savedProfileId));
                    if (profile) setCurrentProfile(profile);
                }
            }
        } catch (e) {
            console.error("Failed to fetch profiles", e);
        }
    };

    const login = async (email, password) => {
        const res = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        const data = await res.json();
        if (res.ok) {
            localStorage.setItem('gb_token', data.token);
            setToken(data.token);
            setUser(data.user);
            return { success: true };
        }
        return { success: false, error: data.error };
    };

    const register = async (name, email, password) => {
        const res = await fetch('/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ full_name: name, email, password })
        });
        const data = await res.json();
        if (res.ok) {
            return { success: true, requires_otp: data.requires_otp };
        }
        return { success: false, error: data.error };
    };

    const verifyOtp = async (email, otp) => {
        const res = await fetch('/api/auth/verify-otp', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, otp })
        });
        const data = await res.json();
        if (res.ok) {
            return { success: true };
        }
        return { success: false, error: data.error };
    };

    const resendOtp = async (email) => {
        const res = await fetch('/api/auth/resend-otp', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email })
        });
        const data = await res.json();
        if (res.ok) {
            return {
                success: true,
                message: data.message,
                dev_mode: data.dev_mode,
                debug_otp: data.debug_otp
            };
        }
        return { success: false, error: data.error };
    };

    const createProfile = async (name, avatar) => {
        const res = await fetch('/api/auth/profiles', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ name, avatar })
        });
        if (res.ok) {
            await fetchProfiles();
            return { success: true };
        }
        const data = await res.json();
        return { success: false, error: data.error };
    };

    const updateProfile = async (profileId, name, avatar) => {
        const res = await fetch(`/api/auth/profiles/${profileId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ name, avatar })
        });
        if (res.ok) {
            await fetchProfiles();
            return { success: true };
        }
        const data = await res.json();
        return { success: false, error: data.error };
    };

    const deleteProfile = async (profileId) => {
        const res = await fetch(`/api/auth/profiles/${profileId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        if (res.ok) {
            await fetchProfiles();
            return { success: true };
        }
        const data = await res.json();
        return { success: false, error: data.error };
    };

    const switchProfile = (profileId) => {
        const profile = profiles.find(p => p.id === profileId);
        if (profile) {
            setCurrentProfile(profile);
            localStorage.setItem('gb_current_profile_id', profileId);
        }
        // Ideally clear local state of saved items here or in DashboardLayout effect
    };

    // --- Data Methods ---
    const getSavedVideos = async () => {
        if (!currentProfile || !token) return [];
        const res = await fetch(`/api/auth/profiles/${currentProfile.id}/saved/videos`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) return await res.json();
        return [];
    };

    const saveVideo = async (video) => {
        if (!currentProfile || !token) return false;
        const res = await fetch(`/api/auth/profiles/${currentProfile.id}/saved/videos`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({
                video_id: video.id || video.videoId, // Handle variations
                title: video.title,
                thumbnail: video.thumbnail,
                channel: video.channelTitle || video.channel // Handle variations
            })
        });
        return res.ok;
    };

    const unsaveVideo = async (videoId) => {
        if (!currentProfile || !token) return false;
        const res = await fetch(`/api/auth/profiles/${currentProfile.id}/saved/videos/${videoId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        return res.ok;
    };

    const getSavedNews = async () => {
        if (!currentProfile || !token) return [];
        const res = await fetch(`/api/auth/profiles/${currentProfile.id}/saved/news`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) return await res.json();
        return [];
    };

    const saveNews = async (article) => {
        if (!currentProfile || !token) return false;
        const res = await fetch(`/api/auth/profiles/${currentProfile.id}/saved/news`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({
                url: article.url || article.link,
                title: article.title,
                source: article.source || article.source?.title || 'Unknown'
            })
        });
        return res.ok;
    };

    const unsaveNews = async (url) => {
        if (!currentProfile || !token) return false;
        const res = await fetch(`/api/auth/profiles/${currentProfile.id}/saved/news?url=${encodeURIComponent(url)}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        return res.ok;
    };

    // --- Legal Assistant ---
    const getLegalConversations = async () => {
        if (!currentProfile || !token) return [];
        const res = await fetch(`/api/auth/profiles/${currentProfile.id}/legal/conversations`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) return await res.json();
        return [];
    };

    const createLegalConversation = async (title) => {
        if (!currentProfile || !token) return null;
        const res = await fetch(`/api/auth/profiles/${currentProfile.id}/legal/conversations`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ title })
        });
        if (res.ok) return await res.json();
        return null;
    };

    const getLegalMessages = async (convId) => {
        if (!currentProfile || !token) return [];
        const res = await fetch(`/api/auth/profiles/${currentProfile.id}/legal/conversations/${convId}/messages`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) return await res.json();
        return [];
    };

    const addLegalMessage = async (convId, sender, message) => {
        if (!currentProfile || !token) return false;
        const res = await fetch(`/api/auth/profiles/${currentProfile.id}/legal/conversations/${convId}/messages`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ sender, message })
        });
        return res.ok;
    };

    const logout = () => {
        localStorage.removeItem('gb_token');
        localStorage.removeItem('gb_current_profile_id');
        setToken(null);
        setUser(null);
        setProfiles([]);
        setCurrentProfile(null);
    };

    return (
        <AuthContext.Provider value={{
            user,
            token,
            profiles,
            currentProfile,
            loading,
            login,
            register,
            verifyOtp,
            resendOtp,
            logout,
            createProfile,
            updateProfile,
            deleteProfile,
            switchProfile,
            getSavedVideos,
            saveVideo,
            unsaveVideo,
            getSavedNews,
            saveNews,
            unsaveNews,
            getLegalConversations,
            createLegalConversation,
            getLegalMessages,
            addLegalMessage
        }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
