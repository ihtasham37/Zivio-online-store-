
import React from 'react';
import { motion } from 'motion/react';
import { Icons } from '../icons/Icons';
import { useStore } from '../../hooks/useStore';

export const SplashScreen = () => {
    const { settings } = useStore();
    return (
        <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-white">
            <motion.div
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.5, ease: "easeOut" }}
                className="flex flex-col items-center"
            >
                <div className="bg-gradient-to-tr from-rose-600 to-amber-500 p-4 rounded-3xl shadow-2xl mb-4">
                    <Icons.logo className="w-20 h-20 text-white" />
                </div>
                <motion.h1 
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.3, duration: 0.5 }}
                    className="text-3xl font-extrabold font-serif text-rose-900 tracking-tight"
                >
                    {settings?.appName || 'Store'}
                </motion.h1>
                <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.6, duration: 0.5 }}
                    className="text-rose-600/80 mt-2 font-semibold text-sm tracking-wide"
                >
                    Luxury Baby & Kids Boutique
                </motion.p>
            </motion.div>
            
            <div className="absolute bottom-12">
                <div className="flex gap-1.5">
                    {[0, 1, 2].map((i) => (
                        <motion.div
                            key={i}
                            animate={{
                                scale: [1, 1.5, 1],
                                opacity: [0.3, 1, 0.3]
                            }}
                            transition={{
                                duration: 1,
                                repeat: Infinity,
                                delay: i * 0.2
                            }}
                            className="w-2.5 h-2.5 bg-gradient-to-r from-rose-500 to-amber-500 rounded-full"
                        />
                    ))}
                </div>
            </div>
        </div>
    );
};
