/**
 * 🔒 TEAM AUTHENTICATION COMPONENT
 * 
 * Provides the secure gateway to the application.
 * Handles both "Sign In" and "Create Team Account" using Firebase.
 */

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../store';
import { loginUser, registerUser, initFirebase, getUserData, loginWithGoogle } from '../services/firebase';
import { initNotificationSystem } from '../notifications';
import { Shield, Lock, Mail, Loader2, AlertCircle, Settings2, CheckCircle2 } from 'lucide-react';

const Login = () => {
    const navigate = useNavigate();
    // Component State: Track what the user enters in the form
    const [isRegistering, setIsRegistering] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');
    const [college, setCollege] = useState('');
    const [dob, setDob] = useState('');
    const [regNo, setRegNo] = useState('');
    const [department, setDepartment] = useState('');
    const [locality, setLocality] = useState('');
    const [year, setYear] = useState('');
    const [mobile, setMobile] = useState('');
    const [professionalDetails, setProfessionalDetails] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    // Firebase config setup state (shown when no config exists)
    const [configInput, setConfigInput] = useState('');
    const [configError, setConfigError] = useState('');
    const [configSaved, setConfigSaved] = useState(false);

    // Global Store Hooks: Get helper functions to update global app state
    const firebaseConfig = useAppStore((state) => state.firebaseConfig);
    const setFirebaseConfig = useAppStore((state) => state.setFirebaseConfig);
    const setUser = useAppStore((state) => state.setUser);
    const setUserRole = useAppStore((state) => state.setUserRole);
    const setCloudProvider = useAppStore((state) => state.setCloudProvider);
    const setUserProfile = useAppStore((state) => state.setUserProfile);

    // True when no valid Firebase config is present yet
    const isConfigMissing = !firebaseConfig || !firebaseConfig.apiKey;

    const handleSaveConfig = () => {
        setConfigError('');
        try {
            const parsed = JSON.parse(configInput.trim());
            if (!parsed.apiKey || !parsed.projectId || !parsed.authDomain) {
                setConfigError('Invalid config: must include apiKey, projectId, and authDomain.');
                return;
            }
            setFirebaseConfig(parsed);   // persists to localStorage via the store
            setConfigSaved(true);
            setConfigInput('');
            // Re-initialize Firebase immediately with the new config
            initFirebase(parsed);
        } catch (e) {
            setConfigError('Invalid JSON. Please paste the exact config object from Firebase Console.');
        }
    };

    const handleGoogleLogin = async () => {
        setError('');
        setIsLoading(true);
        try {
            if (!firebaseConfig || !firebaseConfig.apiKey) {
                throw new Error("Configuration Missing: Please go to Settings and paste your Firebase Project Config JSON first.");
            }
            initFirebase(firebaseConfig);
            const userCredential = await loginWithGoogle();
            setUser(userCredential.user);
            
            const userData = await getUserData(userCredential.user.uid);
            setUserRole(userData.role);
            setUserProfile(userData);
            useAppStore.getState().setTeamId(userData.teamId);

            initNotificationSystem().catch(err => console.error("Notification Init fail:", err));
            setCloudProvider('firestore');

            const pendingInvite = sessionStorage.getItem('pendingInvite');
            if (pendingInvite) {
                sessionStorage.removeItem('pendingInvite');
                navigate(`/invite/${pendingInvite}`);
            } else {
                navigate('/');
            }
        } catch (err) {
            console.error('Google Auth failure:', err);
            setError(err.message || 'Google authentication failed.');
        } finally {
            setIsLoading(false);
        }
    };

    /**
     * Handles the authentication logic when the button is clicked.
     */
    const handleAuth = async (e) => {
        e.preventDefault(); // Stop page refresh
        setError('');       // Clear previous errors
        setIsLoading(true); // Show spinner

        try {
            // Check if Firebase is configured before attempting anything
            if (!firebaseConfig || !firebaseConfig.apiKey) {
                throw new Error("Configuration Missing: Please go to Settings and paste your Firebase Project Config JSON first.");
            }

            // Initialize the Firebase engine
            initFirebase(firebaseConfig);

            if (isRegistering) {
                // Execute Firebase "Create User" logic
                const userCredential = await registerUser(email, password, name, {
                    college, dob, regNo, department, locality, year, professionalDetails, mobile
                });
                setUser(userCredential.user);    // Save user to the "Brain" (Store)

                // Fetch and set role
                const userData = await getUserData(userCredential.user.uid);
                setUserRole(userData.role);
                setUserProfile(userData);
                useAppStore.getState().setTeamId(userData.teamId);
                
                // Initialize notification system for push alerts
                initNotificationSystem().catch(err => console.error("Notification Init fail:", err));

                setCloudProvider('firestore');   // Activate cloud sync
            } else {
                // Execute Firebase "Login" logic
                const userCredential = await loginUser(email, password);
                setUser(userCredential.user);    // Save user to the "Brain" (Store)

                // Fetch and set role
                const userData = await getUserData(userCredential.user.uid);
                setUserRole(userData.role);
                setUserProfile(userData);
                useAppStore.getState().setTeamId(userData.teamId);

                // Initialize notification system for push alerts
                initNotificationSystem().catch(err => console.error("Notification Init fail:", err));

                setCloudProvider('firestore');   // Activate cloud sync

                // Handle Redirect
                const pendingInvite = sessionStorage.getItem('pendingInvite');
                if (pendingInvite) {
                    sessionStorage.removeItem('pendingInvite');
                    navigate(`/invite/${pendingInvite}`);
                } else {
                    navigate('/');
                }
            }
        } catch (err) {
            console.error('Auth failure:', err);

            // Map cryptic Firebase errors to friendly messages for the user
            let message = err.message;
            if (err.code === 'auth/user-not-found') message = 'User not found. Try registering instead.';
            if (err.code === 'auth/wrong-password') message = 'Incorrect password.';
            if (err.code === 'auth/email-already-in-use') message = 'This email is already in use by another team member.';

            setError(message || 'Authentication failed. Please try again.');
        } finally {
            setIsLoading(false); // Hide spinner
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-4 relative overflow-hidden">
            {/* Elegant Background Shadows */}
            <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-600/10 blur-[120px] rounded-full" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-violet-600/10 blur-[120px] rounded-full" />
            </div>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full max-w-md relative z-10"
            >
                {/* Firebase Config Setup Panel — shown only when no config is detected */}
                {isConfigMissing && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mb-6 p-5 rounded-2xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 shadow-lg"
                    >
                        <div className="flex items-center gap-2 mb-3">
                            <Settings2 size={16} className="text-amber-600 shrink-0" />
                            <h2 className="text-xs font-black uppercase tracking-widest text-amber-700 dark:text-amber-400">
                                Firebase Setup Required
                            </h2>
                        </div>
                        <p className="text-[11px] text-amber-700/80 dark:text-amber-400/80 font-medium mb-3 leading-relaxed">
                            Paste your Firebase Project Config JSON below. Get it from{' '}
                            <span className="font-black">Firebase Console → Project Settings → Your Apps → SDK setup</span>.
                        </p>
                        <textarea
                            id="firebase-config-input"
                            value={configInput}
                            onChange={(e) => { setConfigInput(e.target.value); setConfigError(''); setConfigSaved(false); }}
                            placeholder={'{ "apiKey": "...", "authDomain": "...", "projectId": "...", ... }'}
                            rows={5}
                            className="w-full font-mono text-[11px] px-3 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-500/30 text-slate-700 dark:text-slate-300 outline-none focus:border-indigo-500 resize-none"
                        />
                        {configError && (
                            <p className="text-[10px] font-bold text-rose-600 mt-2 flex items-center gap-1">
                                <AlertCircle size={11} /> {configError}
                            </p>
                        )}
                        {configSaved && (
                            <p className="text-[10px] font-bold text-emerald-600 mt-2 flex items-center gap-1">
                                <CheckCircle2 size={11} /> Config saved! You can now log in.
                            </p>
                        )}
                        <button
                            id="save-firebase-config-btn"
                            onClick={handleSaveConfig}
                            disabled={!configInput.trim()}
                            className="mt-3 w-full py-2.5 bg-amber-500 hover:bg-amber-600 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl text-[11px] font-black uppercase tracking-widest transition-all"
                        >
                            Save Firebase Config
                        </button>
                    </motion.div>
                )}

                {/* Config already saved confirmation */}
                {!isConfigMissing && configSaved && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="mb-4 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30 flex items-center gap-2"
                    >
                        <CheckCircle2 size={14} className="text-emerald-600 shrink-0" />
                        <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400">
                            Firebase config saved. Log in below.
                        </span>
                    </motion.div>
                )}
                {/* Branding Section */}
                <div className="text-center mb-8">
                    <motion.div
                        initial={{ scale: 0.5 }}
                        animate={{ scale: 1 }}
                        className="w-20 h-20 bg-indigo-600 rounded-3xl flex items-center justify-center shadow-2xl shadow-indigo-500/20 mx-auto mb-6 rotate-12"
                    >
                        <Shield size={40} className="text-white -rotate-12" />
                    </motion.div>
                    <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight mb-2">
                        {isRegistering ? 'Create' : 'SEM'} <span className="text-indigo-600">{isRegistering ? 'Account' : 'Access'}</span>
                    </h1>
                    <p className="text-slate-500 font-medium">
                        {isRegistering ? 'Sign up to start collaborating.' : 'Please log in to sync your event data.'}
                    </p>
                </div>

                {/* Login Form Card */}
                <div className="glass-card p-8 border-0 ring-1 ring-slate-200 dark:ring-slate-800 shadow-2xl shadow-indigo-500/5">
                    <form onSubmit={handleAuth} className="space-y-6">
                        <div className="space-y-4">
                            {isRegistering && (
                                <div className="space-y-4 max-h-[40vh] overflow-y-auto custom-scrollbar pr-2 mb-4">
                                    <div className="relative group">
                                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors">
                                            <Shield size={18} />
                                        </div>
                                        <input type="text" required value={name} onChange={(e) => setName(e.target.value)} placeholder="Full Name" className="input pl-11 !py-3 font-semibold focus:ring-indigo-500/20 focus:border-indigo-500 w-full" />
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <input type="text" value={college} onChange={(e) => setCollege(e.target.value)} placeholder="College Name" className="input px-4 !py-3 font-semibold focus:ring-indigo-500/20 focus:border-indigo-500 text-xs w-full" />
                                        <input type="text" value={regNo} onChange={(e) => setRegNo(e.target.value)} placeholder="Register No." className="input px-4 !py-3 font-semibold focus:ring-indigo-500/20 focus:border-indigo-500 text-xs w-full" />
                                        <input type="tel" value={mobile} onChange={(e) => setMobile(e.target.value)} placeholder="Mobile No." className="input px-4 !py-3 font-semibold focus:ring-indigo-500/20 focus:border-indigo-500 text-xs w-full" />
                                        <input type="text" value={department} onChange={(e) => setDepartment(e.target.value)} placeholder="Department" className="input px-4 !py-3 font-semibold focus:ring-indigo-500/20 focus:border-indigo-500 text-xs w-full" />
                                        <input type="text" value={year} onChange={(e) => setYear(e.target.value)} placeholder="Year of Study" className="input px-4 !py-3 font-semibold focus:ring-indigo-500/20 focus:border-indigo-500 text-xs w-full" />
                                        <div className="col-span-2">
                                            <input type="date" value={dob} onChange={(e) => setDob(e.target.value)} placeholder="Date of Birth" className="input px-4 !py-3 font-semibold focus:ring-indigo-500/20 focus:border-indigo-500 text-xs w-full text-slate-500 dark:text-slate-400" />
                                        </div>
                                        <div className="col-span-2">
                                            <input type="text" value={locality} onChange={(e) => setLocality(e.target.value)} placeholder="Locality / City" className="input px-4 !py-3 font-semibold focus:ring-indigo-500/20 focus:border-indigo-500 text-xs w-full" />
                                        </div>
                                        <div className="col-span-2">
                                            <textarea value={professionalDetails} onChange={(e) => setProfessionalDetails(e.target.value)} placeholder="Professional Summary, Skills, Extra-curriculars..." rows={3} className="input px-4 !py-3 font-semibold focus:ring-indigo-500/20 focus:border-indigo-500 text-xs w-full custom-scrollbar resize-none" />
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div className="relative group">
                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={18} />
                                <input
                                    type="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="Email Address"
                                    className="input pl-11 !py-3 font-semibold focus:ring-indigo-500/20 focus:border-indigo-500"
                                />
                            </div>

                            <div className="relative group">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={18} />
                                <input
                                    type="password"
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="Password"
                                    className="input pl-11 !py-3 font-semibold"
                                />
                            </div>
                        </div>

                        {/* Error Notification */}
                        {error && (
                            <motion.div
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                className="p-3 rounded-xl bg-rose-50 dark:bg-rose-500/10 border border-rose-100 dark:border-rose-500/20 text-rose-600 text-xs font-bold flex items-center gap-2"
                            >
                                <AlertCircle size={14} />
                                {error}
                            </motion.div>
                        )}

                        {/* Action Button */}
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white w-full h-14 font-black rounded-2xl shadow-xl shadow-indigo-500/20 flex items-center justify-center gap-3 transition-all hover:scale-[1.02] active:scale-95"
                        >
                            {isLoading ? (
                                <Loader2 className="animate-spin" size={20} />
                            ) : (
                                isRegistering ? "Register Now" : "Secure Login"
                            )}
                        </button>

                        {/* Divider */}
                        <div className="relative my-4 flex py-1 items-center">
                            <div className="flex-grow border-t border-slate-200 dark:border-slate-800"></div>
                            <span className="flex-shrink mx-4 text-slate-400 text-xs font-black uppercase tracking-widest">Or</span>
                            <div className="flex-grow border-t border-slate-200 dark:border-slate-800"></div>
                        </div>

                        {/* Google Login Button */}
                        <button
                            type="button"
                            onClick={handleGoogleLogin}
                            disabled={isLoading}
                            className="w-full h-14 border border-slate-200 dark:border-slate-800 dark:text-white bg-white/50 dark:bg-slate-900/50 hover:bg-slate-100 dark:hover:bg-slate-800/80 rounded-2xl flex items-center justify-center gap-3 font-bold transition-all active:scale-95"
                        >
                            <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                                <path fill="#EA4335" d="M12 5.04c1.66 0 3.2.57 4.38 1.69l3.27-3.27C17.67 1.47 14.98 1 12 1 7.35 1 3.39 3.65 1.5 7.5l3.85 2.99C6.27 7.54 8.91 5.04 12 5.04z" />
                                <path fill="#4285F4" d="M23.49 12.27c0-.81-.07-1.59-.2-2.36H12v4.51h6.46c-.28 1.48-1.12 2.74-2.38 3.58l3.7 2.87c2.16-2 3.71-4.94 3.71-8.6z" />
                                <path fill="#FBBC05" d="M5.35 10.49c-.24-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29L1.5 2.92C.54 4.84 0 7.01 0 9.3c0 2.29.54 4.46 1.5 6.38l3.85-3.19z" />
                                <path fill="#34A853" d="M12 23c3.24 0 5.97-1.07 7.96-2.91l-3.7-2.87c-1.03.69-2.35 1.1-4.26 1.1-3.09 0-5.73-2.5-6.65-5.45L1.5 16.07C3.39 19.92 7.35 23 12 23z" />
                            </svg>
                            Continue with Google
                        </button>
                    </form>

                    {/* Mode Toggle */}
                    <div className="mt-6 text-center">
                        <button
                            onClick={() => setIsRegistering(!isRegistering)}
                            className="text-sm font-bold text-indigo-600 hover:text-indigo-500 transition-colors"
                        >
                            {isRegistering ? 'Already a member? Login' : 'Need an account? Sign up'}
                        </button>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

export default Login;
