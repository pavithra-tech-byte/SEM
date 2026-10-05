import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, User, Briefcase, Save, Loader2, CheckCircle2, Crown } from 'lucide-react';
import { useAppStore } from '../store';
import { updateUserProfile } from '../services/firebase';
import { updateProfile as updateAuthProfile } from 'firebase/auth';
import { auth } from '../services/firebase';

const ProfileModal = () => {
    const isOpen = useAppStore((state) => state.modals.profile);
    const closeModal = useAppStore((state) => state.closeModal);
    const user = useAppStore((state) => state.user);
    const userRole = useAppStore((state) => state.userRole);
    const setUser = useAppStore((state) => state.setUser);

    const userProfile = useAppStore((state) => state.userProfile);
    const setUserProfile = useAppStore((state) => state.setUserProfile);

    const [displayName, setDisplayName] = useState(user?.displayName || '');
    const [position, setPosition] = useState(userProfile?.position || 'Explorer');
    const [photoURL, setPhotoURL] = useState(user?.photoURL || userProfile?.photoURL || '');
    const [college, setCollege] = useState(userProfile?.college || '');
    const [dob, setDob] = useState(userProfile?.dob || '');
    const [regNo, setRegNo] = useState(userProfile?.regNo || '');
    const [department, setDepartment] = useState(userProfile?.department || '');
    const [locality, setLocality] = useState(userProfile?.locality || '');
    const [year, setYear] = useState(userProfile?.year || '');
    const [professionalDetails, setProfessionalDetails] = useState(userProfile?.professionalDetails || '');
    
    const [isSaving, setIsSaving] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);

    useEffect(() => {
        if (user) {
            setDisplayName(user.displayName || '');
            setPhotoURL(user.photoURL || userProfile?.photoURL || '');
        }
        if (userProfile) {
            setPosition(userProfile.position || 'Explorer');
            setCollege(userProfile.college || '');
            setDob(userProfile.dob || '');
            setRegNo(userProfile.regNo || '');
            setDepartment(userProfile.department || '');
            setLocality(userProfile.locality || '');
            setYear(userProfile.year || '');
            setProfessionalDetails(userProfile.professionalDetails || '');
        }
    }, [user, userProfile]);

    const handlePhotoChange = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const maxDim = 200;
                let width = img.width;
                let height = img.height;

                if (width > height) {
                    if (width > maxDim) { height *= maxDim / width; width = maxDim; }
                } else {
                    if (height > maxDim) { width *= maxDim / height; height = maxDim; }
                }

                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);

                const compressedBase64 = canvas.toDataURL('image/jpeg', 0.8);
                setPhotoURL(compressedBase64);
            };
            img.src = event.target.result;
        };
        reader.readAsDataURL(file);
    };

    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => { document.body.style.overflow = 'unset'; };
    }, [isOpen]);

    const handleSave = async () => {
        if (!displayName.trim()) return;
        setIsSaving(true);
        try {
            if (auth.currentUser) {
                // Update Firebase Auth
                await updateAuthProfile(auth.currentUser, { displayName, photoURL });
                
                // Update Firestore
                const updatedData = { 
                    displayName, photoURL, position, 
                    college, dob, regNo, department, locality, year, professionalDetails 
                };
                await updateUserProfile(auth.currentUser.uid, updatedData);

                // Update local store
                setUser({ ...auth.currentUser, displayName, photoURL });
                setUserProfile({ ...userProfile, ...updatedData, role: userProfile?.role || 'public', teamId: userProfile?.teamId || null });
                
                setIsSuccess(true);
                setTimeout(() => {
                    setIsSuccess(false);
                    closeModal('profile');
                }, 2000);
            }
        } catch (error) {
            console.error(error);
            alert("Failed to update profile.");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
                        onClick={() => !isSaving && closeModal('profile')}
                    />

                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        onClick={(e) => e.stopPropagation()}
                        className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl p-8 overflow-hidden"
                    >
                        <div className="flex justify-between items-center mb-8">
                            <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Personal Profile</h2>
                            <button onClick={() => closeModal('profile')} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="space-y-4 max-h-[70vh] overflow-y-auto custom-scrollbar pr-2 mb-6">
                            {/* Profile Photo Upload */}
                            <div className="flex flex-col items-center justify-center space-y-3 mb-6">
                                <div className="relative">
                                    <div className="w-24 h-24 rounded-full bg-slate-100 dark:bg-slate-800 border-4 border-white dark:border-slate-900 shadow-xl overflow-hidden flex items-center justify-center relative">
                                        {photoURL ? (
                                            <img src={photoURL} alt="Profile" className="w-full h-full object-cover" />
                                        ) : (
                                            <User size={40} className="text-slate-300 dark:text-slate-600" />
                                        )}
                                    </div>
                                    {userRole !== 'public' && (
                                        <div className="absolute top-0 right-0 w-8 h-8 bg-gradient-to-tr from-amber-400 to-amber-600 rounded-full flex items-center justify-center shadow-lg border-2 border-white dark:border-slate-900 z-10 animate-bounce-subtle">
                                            <Crown size={16} className="text-white fill-current" />
                                        </div>
                                    )}
                                    <label className="absolute bottom-0 right-0 w-8 h-8 bg-indigo-600 rounded-full flex items-center justify-center text-white cursor-pointer hover:scale-110 transition-transform shadow-lg shadow-indigo-500/30 border-2 border-white dark:border-slate-900">
                                        <input type="file" accept="image/*" onChange={handlePhotoChange} className="hidden" />
                                        <span className="text-sm font-black">+</span>
                                    </label>
                                </div>
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Update Avatar</span>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-1 sm:col-span-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Nick Name / Display Name</label>
                                    <div className="relative group">
                                        <div className="absolute inset-y-0 left-4 flex items-center text-slate-400 group-focus-within:text-indigo-500 transition-colors"><User size={16} /></div>
                                        <input type="text" value={displayName} onChange={(e) => setDisplayName(e.target.value)} className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-800/50 border-2 border-transparent focus:border-indigo-500 rounded-xl outline-none font-bold text-xs" placeholder="Nick Name" />
                                    </div>
                                </div>

                                <div className="space-y-1 sm:col-span-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">App Designation</label>
                                    <div className="relative group">
                                        <div className="absolute inset-y-0 left-4 flex items-center text-slate-400 group-focus-within:text-indigo-500 transition-colors"><Briefcase size={16} /></div>
                                        <select value={position} onChange={(e) => setPosition(e.target.value)} className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-800/50 border-2 border-transparent focus:border-indigo-500 rounded-xl outline-none font-bold text-xs appearance-none">
                                            <option value="Explorer">Explorer</option><option value="Leader">Team Leader</option><option value="Designer">UI & Creative Lead</option><option value="Developer">Core Developer</option><option value="Strategist">Tactical Strategist</option><option value="Manager">Resource Manager</option>
                                        </select>
                                    </div>
                                </div>
                                
                                <div className="space-y-1 sm:col-span-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">College / Institution</label>
                                    <input type="text" value={college} onChange={(e) => setCollege(e.target.value)} className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800/50 border-2 border-transparent focus:border-indigo-500 rounded-xl outline-none font-bold text-xs" placeholder="College Name" />
                                </div>

                                <div className="space-y-1">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Date of Birth</label>
                                    <input type="date" value={dob} onChange={(e) => setDob(e.target.value)} className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800/50 border-2 border-transparent focus:border-indigo-500 rounded-xl outline-none font-bold text-xs text-slate-500" />
                                </div>

                                <div className="space-y-1">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Reg. Number</label>
                                    <input type="text" value={regNo} onChange={(e) => setRegNo(e.target.value)} className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800/50 border-2 border-transparent focus:border-indigo-500 rounded-xl outline-none font-bold text-xs" placeholder="Register No." />
                                </div>

                                <div className="space-y-1">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Department</label>
                                    <input type="text" value={department} onChange={(e) => setDepartment(e.target.value)} className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800/50 border-2 border-transparent focus:border-indigo-500 rounded-xl outline-none font-bold text-xs" placeholder="Department" />
                                </div>

                                <div className="space-y-1">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Locality</label>
                                    <input type="text" value={locality} onChange={(e) => setLocality(e.target.value)} className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800/50 border-2 border-transparent focus:border-indigo-500 rounded-xl outline-none font-bold text-xs" placeholder="Locality / City" />
                                </div>
                                
                                <div className="space-y-1 sm:col-span-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Year of Study</label>
                                    <input type="text" value={year} onChange={(e) => setYear(e.target.value)} className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800/50 border-2 border-transparent focus:border-indigo-500 rounded-xl outline-none font-bold text-xs" placeholder="e.g. 3rd Year" />
                                </div>

                                <div className="space-y-1 sm:col-span-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Professional Details</label>
                                    <textarea value={professionalDetails} onChange={(e) => setProfessionalDetails(e.target.value)} className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800/50 border-2 border-transparent focus:border-indigo-500 rounded-xl outline-none font-bold text-xs custom-scrollbar resize-none" rows={4} placeholder="LinkedIn, GitHub, Portfolio OR Skills summary..." />
                                </div>
                            </div>
                        </div>

                        <button
                            onClick={handleSave}
                            disabled={isSaving}
                            className="w-full py-5 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-3 shadow-xl shadow-indigo-500/20 hover:scale-[1.02] active:scale-95 transition-all"
                        >
                            {isSaving ? (
                                <><Loader2 size={18} className="animate-spin" /> Committing Changes...</>
                            ) : isSuccess ? (
                                <><CheckCircle2 size={18} /> Update Synchronized</>
                            ) : (
                                <><Save size={18} /> Update Data Packet</>
                            )}
                        </button>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

export default ProfileModal;
