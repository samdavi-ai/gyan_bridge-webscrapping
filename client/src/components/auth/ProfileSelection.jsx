import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const ProfileSelection = () => {
    const { profiles, currentProfile, switchProfile, createProfile, updateProfile, deleteProfile, logout } = useAuth();
    const navigate = useNavigate();
    const [isCreating, setIsCreating] = useState(false);
    const [isManaging, setIsManaging] = useState(false);
    const [editingProfile, setEditingProfile] = useState(null);
    const [newProfileName, setNewProfileName] = useState('');
    const [error, setError] = useState('');

    const handleProfileSelect = (profileId) => {
        if (isManaging) {
            const profile = profiles.find(p => p.id === profileId);
            setEditingProfile(profile);
            setNewProfileName(profile.name);
            return;
        }
        switchProfile(profileId);
        navigate('/'); // Go to dashboard
    };

    const handleCreateProfile = async (e) => {
        e.preventDefault();
        setError('');
        if (!newProfileName.trim()) return;

        const result = await createProfile(newProfileName.trim());
        if (result.success) {
            setIsCreating(false);
            setNewProfileName('');
        } else {
            setError(result.error || 'Failed to create profile.');
        }
    };

    const handleUpdateProfile = async (e) => {
        e.preventDefault();
        setError('');
        if (!newProfileName.trim()) return;

        const result = await updateProfile(editingProfile.id, newProfileName.trim(), editingProfile.avatar);
        if (result.success) {
            setEditingProfile(null);
            setNewProfileName('');
        } else {
            setError(result.error || 'Failed to update profile.');
        }
    };

    const handleDeleteProfile = async () => {
        if (window.confirm('Are you sure you want to delete this profile? All saved data will be lost.')) {
            const result = await deleteProfile(editingProfile.id);
            if (result.success) {
                setEditingProfile(null);
            } else {
                setError(result.error || 'Failed to delete profile.');
            }
        }
    };

    return (
        <div className="min-h-screen bg-[#0F0F12] flex flex-col items-center justify-center p-8 font-['Rajdhani'] animate-fade-in relative">

            <button
                onClick={logout}
                className="absolute top-8 right-8 text-gray-400 hover:text-white flex items-center gap-2 transition-colors"
            >
                <i className="ri-logout-box-line text-xl"></i>
                Sign Out
            </button>

            <div className="text-center mb-12">
                <h1 className="text-5xl font-bold text-white mb-4">{isManaging ? "Manage Profiles" : "Who's watching?"}</h1>
                {!isCreating && !editingProfile && <p className="text-gray-400 text-lg">Select a profile to {isManaging ? "edit" : "continue"}</p>}
            </div>

            {isCreating || editingProfile ? (
                <div className="w-full max-w-sm bg-[#18181C] p-8 rounded-2xl border border-white/10 animate-scale-in">
                    <h2 className="text-2xl font-bold text-white mb-6">{isCreating ? "Create Profile" : "Edit Profile"}</h2>
                    {error && <p className="text-red-400 text-sm mb-4">{error}</p>}
                    <form onSubmit={isCreating ? handleCreateProfile : handleUpdateProfile} className="space-y-6">
                        <div>
                            <label className="block text-gray-400 text-sm font-bold mb-2">Name</label>
                            <input
                                type="text"
                                value={newProfileName}
                                onChange={(e) => setNewProfileName(e.target.value)}
                                className="w-full bg-[#0A0A0D] border border-white/10 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-purple-500 transition-colors"
                                placeholder="Profile Name"
                                autoFocus
                            />
                        </div>
                        <div className="flex gap-4">
                            <button
                                type="button"
                                onClick={() => { setIsCreating(false); setEditingProfile(null); }}
                                className="flex-1 py-3 rounded-xl border border-white/10 text-gray-400 hover:bg-white/5 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className="flex-1 bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 rounded-xl transition-colors"
                            >
                                Save
                            </button>
                        </div>
                        {editingProfile && (
                            <button
                                type="button"
                                onClick={handleDeleteProfile}
                                className="w-full py-3 rounded-xl border border-red-500/20 text-red-500 hover:bg-red-500/10 transition-colors mt-4"
                            >
                                Delete Profile
                            </button>
                        )}
                    </form>
                </div>
            ) : (
                <div className="flex flex-wrap justify-center gap-8 max-w-5xl">
                    {profiles.map(profile => (
                        <div
                            key={profile.id}
                            onClick={() => handleProfileSelect(profile.id)}
                            className="group cursor-pointer flex flex-col items-center gap-4 transition-transform hover:scale-105 relative"
                        >
                            <div className={`w-32 h-32 md:w-40 md:h-40 rounded-xl overflow-hidden border-2 border-transparent ${isManaging ? 'group-hover:border-gray-500 opacity-80 group-hover:opacity-100' : 'group-hover:border-white'} transition-all relative`}>
                                <div className={`w-full h-full bg-gradient-to-br ${profile.id % 4 === 0 ? 'from-purple-500 to-blue-500' :
                                        profile.id % 4 === 1 ? 'from-green-500 to-teal-500' :
                                            profile.id % 4 === 2 ? 'from-red-500 to-orange-500' :
                                                'from-yellow-500 to-pink-500'
                                    } flex items-center justify-center text-4xl md:text-5xl font-bold text-white relative`}>
                                    {profile.name[0].toUpperCase()}
                                    {isManaging && (
                                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                                            <i className="ri-pencil-line text-4xl text-white"></i>
                                        </div>
                                    )}
                                </div>
                            </div>
                            <span className="text-gray-400 group-hover:text-white text-xl font-medium transition-colors">{profile.name}</span>
                        </div>
                    ))}

                    {/* Add Profile Button */}
                    {!isManaging && profiles.length < 5 && (
                        <div
                            onClick={() => setIsCreating(true)}
                            className="group cursor-pointer flex flex-col items-center gap-4 transition-transform hover:scale-105"
                        >
                            <div className="w-32 h-32 md:w-40 md:h-40 rounded-xl border-2 border-dashed border-gray-600 group-hover:border-white flex items-center justify-center text-gray-600 group-hover:text-white transition-all bg-[#ffffff05] group-hover:bg-[#ffffff10]">
                                <i className="ri-add-line text-5xl"></i>
                            </div>
                            <span className="text-gray-500 group-hover:text-white text-xl font-medium transition-colors">Add Profile</span>
                        </div>
                    )}
                </div>
            )}

            {!isCreating && !editingProfile && (
                <div className="mt-16">
                    <button
                        onClick={() => setIsManaging(!isManaging)}
                        className={`border px-6 py-2 rounded-full transition uppercase tracking-widest text-sm font-bold ${isManaging ? 'bg-white text-black border-white' : 'border-gray-600 text-gray-400 hover:border-white hover:text-white'}`}
                    >
                        {isManaging ? "Done" : "Manage Profiles"}
                    </button>
                </div>
            )}
        </div>
    );
};

export default ProfileSelection;
