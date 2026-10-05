import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const SplashScreen = ({ onComplete }) => {
    const [isVisible, setIsVisible] = useState(true);

    useEffect(() => {
        // Splash screen loads instantly
        setIsVisible(false);
        if (onComplete) onComplete();
    }, [onComplete]);

    return (
        <AnimatePresence>
            {isVisible && (
                <motion.div
                    initial={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.8, ease: "easeInOut" }}
                    className="fixed inset-0 z-[9999] bg-[#1a1f2e] flex items-center justify-center overflow-hidden"
                >
                    {/* Background Texture/Noise (Optional) */}
                    <div className="absolute inset-0 opacity-5 pointer-events-none"
                        style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 200 200\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noiseFilter\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.65\' numOctaves=\'3\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noiseFilter)\'/%3E%3C/svg%3E")' }}
                    />

                    <motion.div
                        initial={{ scale: 0.9, opacity: 0, y: 20 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        transition={{ duration: 1, ease: "easeOut" }}
                        className="relative z-10 flex items-center gap-1.5 md:gap-3"
                    >
                        {/* Logo Icon (Stylized R) */}
                        <div className="relative w-16 h-16 md:w-20 md:h-20 flex items-center justify-center">
                            {/* Orange R shape using CSS or SVG */}
                            <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-2xl">
                                <path
                                    d="M 20 10 L 20 90 L 45 90 L 45 60 L 60 60 L 80 90 L 80 90 L 55 60 C 75 60 90 50 90 35 C 90 20 75 10 55 10 Z"
                                    fill="#e67e22" // Orange Color
                                    stroke="none"
                                />
                                <path
                                    d="M 45 30 L 45 45 L 55 45 C 60 45 65 42 65 37 C 65 32 60 30 55 30 Z"
                                    fill="#1a1f2e" // Cutout
                                />
                            </svg>
                            {/* Better SVG for the 'R' in the image */}
                            <div className="absolute inset-0">
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="0" strokeLinecap="round" strokeLinejoin="round" className="w-full h-full text-[#d35400]">
                                    <path d="M 4 4 L 4 20 L 9 20 L 9 14 L 14 14 L 19 20 L 23 20 L 17 13 C 21 12 22 9 21 6 C 20 4 18 3 14 3 L 4 3 L 4 4 Z M 9 7 L 13 7 C 15 7 16 8 16 9 C 16 10 15 11 13 11 L 9 11 L 9 7 Z" fill="#e67e22" />
                                </svg>
                            </div>
                        </div>

                        {/* Text: REDDOT */}
                        <div className="text-4xl md:text-6xl font-black text-white tracking-widest flex items-center">
                            <span>RED</span>
                            <span className="font-light opacity-90">DOT</span>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default SplashScreen;
