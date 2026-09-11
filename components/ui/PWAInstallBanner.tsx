import React, { useEffect, useState } from 'react';
import { usePWAInstall } from '../../hooks/usePWAInstall';
import { Icons } from '../icons/Icons';
import { Button } from '../ui/Button';
import { useStore } from '../../hooks/useStore';

export const PWAInstallBanner = () => {
    const { isInstallable, isInstalled, isIOS, installPWA } = usePWAInstall();
    const { settings } = useStore();
    const appName = settings?.appName || 'Zivio';

    const [isVisible, setIsVisible] = useState(false);
    const [showIOSGuide, setShowIOSGuide] = useState(false);
    const [showAndroidGuide, setShowAndroidGuide] = useState(false);

    useEffect(() => {
        // Clear old 24-hour block from previous sessions
        try {
            localStorage.removeItem('pwa_popup_dismissed_at');
            localStorage.removeItem('pwa_popup_dismissed');
            sessionStorage.removeItem('pwa_popup_dismissed');
        } catch (e) {}

        // Don't show if already opened in standalone mode
        if (isInstalled) {
            return;
        }

        // Check if dismissed in the last 60 seconds of this tab session
        try {
            const tempDismissed = sessionStorage.getItem('pwa_banner_temp_dismissed');
            if (tempDismissed) {
                const elapsed = Date.now() - parseInt(tempDismissed, 10);
                if (elapsed < 60 * 1000) {
                    return;
                }
            }
        } catch (e) {}

        // Trigger prompt on visit after a short 500ms delay
        const timer = setTimeout(() => {
            setIsVisible(true);
        }, 500);

        const handleExternalOpen = () => {
            setIsVisible(true);
        };
        window.addEventListener('open-pwa-install-banner', handleExternalOpen);

        return () => {
            clearTimeout(timer);
            window.removeEventListener('open-pwa-install-banner', handleExternalOpen);
        };
    }, [isInstalled]);

    const handleDismiss = () => {
        setIsVisible(false);
        setShowIOSGuide(false);
        setShowAndroidGuide(false);
        try {
            sessionStorage.setItem('pwa_banner_temp_dismissed', Date.now().toString());
        } catch (e) {}
    };

    const handleInstallClick = async () => {
        if (isIOS) {
            setShowIOSGuide(true);
            return;
        }
        if (isInstallable) {
            const installed = await installPWA();
            if (installed) {
                setIsVisible(false);
            }
        } else {
            // If native prompt is not yet ready or restricted in this browser context, show clean in-app guide
            setShowAndroidGuide(true);
        }
    };

    if (!isVisible || isInstalled) return null;

    return (
        <>
            {/* Floating Visit Popup Banner (bottom right on desktop, floats safely above bottom nav on mobile) */}
            <aside 
                aria-label="Install App Banner"
                className="fixed bottom-20 inset-x-3 sm:inset-x-auto sm:right-6 sm:bottom-6 sm:max-w-md z-[60] animate-in fade-in slide-in-from-bottom-5 duration-300 pointer-events-auto"
            >
                <div className="bg-white/95 backdrop-blur-md rounded-2xl p-4 shadow-2xl border border-rose-200/80 ring-1 ring-rose-100/50 text-slate-800">
                    <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-rose-500 via-rose-600 to-amber-500 flex items-center justify-center text-white shadow-md shrink-0">
                                {settings?.logoUrl ? (
                                    <img src={settings.logoUrl} alt={appName} className="w-7 h-7 object-contain rounded-lg" />
                                ) : (
                                    <Icons.logo className="w-6 h-6 text-white" />
                                )}
                            </div>
                            <div className="min-w-0">
                                <div className="flex items-center gap-1.5">
                                    <h4 className="font-extrabold text-sm text-slate-900 truncate">
                                        Install {appName} App
                                    </h4>
                                    <span className="bg-rose-50 text-rose-700 text-[10px] font-bold px-1.5 py-0.5 rounded border border-rose-200/80 shrink-0">
                                        PWA
                                    </span>
                                </div>
                                <p className="text-[11px] text-slate-500 mt-0.5">
                                    Fast baby shopping • Offline mode • Deals
                                </p>
                            </div>
                        </div>

                        <button
                            onClick={handleDismiss}
                            aria-label="Dismiss app install banner"
                            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-rose-50 transition-colors"
                        >
                            <Icons.x className="w-4 h-4" />
                        </button>
                    </div>

                    <div className="mt-3.5 flex items-center gap-2 pt-2 border-t border-rose-50">
                        <Button
                            size="sm"
                            className="flex-1 bg-gradient-to-r from-rose-600 via-rose-700 to-amber-600 hover:from-rose-700 hover:to-amber-700 text-white font-bold py-2 rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-sm active:scale-95 transition-all"
                            onClick={handleInstallClick}
                        >
                            <Icons.download className="w-3.5 h-3.5" />
                            {isIOS ? 'Install on iPhone / iPad' : 'Install App Now'}
                        </Button>
                        <button
                            onClick={handleDismiss}
                            className="px-3 py-2 text-xs font-semibold text-slate-500 hover:text-slate-700 hover:bg-rose-50 rounded-xl transition-colors"
                        >
                            Not Now
                        </button>
                    </div>
                </div>
            </aside>

            {/* iOS Installation Instruction Modal */}
            {showIOSGuide && (
                <div 
                    role="dialog"
                    aria-modal="true"
                    className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200"
                >
                    <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl border border-rose-100">
                        <div className="flex items-center justify-between pb-3 border-b border-rose-100">
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-rose-500 to-amber-500 flex items-center justify-center text-white">
                                    <Icons.logo className="w-5 h-5 text-white" />
                                </div>
                                <h3 className="font-bold text-slate-900 text-sm">Install on iPhone / iPad</h3>
                            </div>
                            <button 
                                onClick={() => setShowIOSGuide(false)}
                                className="text-slate-400 hover:text-slate-600 p-1 rounded-md"
                            >
                                <Icons.x className="w-4 h-4" />
                            </button>
                        </div>
                        
                        <div className="py-4 space-y-3 text-xs text-slate-600">
                            <div className="flex items-start gap-2.5">
                                <span className="w-5 h-5 rounded-full bg-rose-100 text-rose-800 font-bold flex items-center justify-center shrink-0 text-[11px]">1</span>
                                <p>Tap the <strong>Share</strong> button <Icons.share className="inline w-3.5 h-3.5 text-rose-600 mb-0.5 mx-0.5" /> in Safari's bottom toolbar.</p>
                            </div>
                            <div className="flex items-start gap-2.5">
                                <span className="w-5 h-5 rounded-full bg-rose-100 text-rose-800 font-bold flex items-center justify-center shrink-0 text-[11px]">2</span>
                                <p>Scroll down the share sheet and tap <strong>Add to Home Screen</strong>.</p>
                            </div>
                            <div className="flex items-start gap-2.5">
                                <span className="w-5 h-5 rounded-full bg-rose-100 text-rose-800 font-bold flex items-center justify-center shrink-0 text-[11px]">3</span>
                                <p>Tap <strong>Add</strong> at top right to launch {appName} directly from your home screen!</p>
                            </div>
                        </div>

                        <Button
                            variant="secondary"
                            className="w-full text-xs font-bold py-2 rounded-xl"
                            onClick={() => {
                                setShowIOSGuide(false);
                                handleDismiss();
                            }}
                        >
                            Got It
                        </Button>
                    </div>
                </div>
            )}

            {/* Android / Chrome Installation Instruction Modal */}
            {showAndroidGuide && (
                <div 
                    role="dialog"
                    aria-modal="true"
                    className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200"
                >
                    <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl border border-rose-100">
                        <div className="flex items-center justify-between pb-3 border-b border-rose-100">
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-rose-500 to-amber-500 flex items-center justify-center text-white overflow-hidden shadow-xs">
                                    {settings?.logoUrl ? (
                                        <img src={settings.logoUrl} alt={appName} className="w-full h-full object-cover" />
                                    ) : (
                                        <Icons.logo className="w-5 h-5 text-white" />
                                    )}
                                </div>
                                <h3 className="font-bold text-slate-900 text-sm">Install {appName} on Mobile</h3>
                            </div>
                            <button 
                                onClick={() => setShowAndroidGuide(false)}
                                className="text-slate-400 hover:text-slate-600 p-1 rounded-md"
                            >
                                <Icons.x className="w-4 h-4" />
                            </button>
                        </div>
                        
                        <div className="py-4 space-y-3 text-xs text-slate-600">
                            <div className="flex items-start gap-2.5">
                                <span className="w-5 h-5 rounded-full bg-rose-100 text-rose-800 font-bold flex items-center justify-center shrink-0 text-[11px]">1</span>
                                <p>Tap your browser's <strong>three dots menu (⋮)</strong> at top-right corner.</p>
                            </div>
                            <div className="flex items-start gap-2.5">
                                <span className="w-5 h-5 rounded-full bg-rose-100 text-rose-800 font-bold flex items-center justify-center shrink-0 text-[11px]">2</span>
                                <p>Tap <strong>"Install app"</strong> or <strong>"Add to Home screen"</strong>.</p>
                            </div>
                            <div className="flex items-start gap-2.5">
                                <span className="w-5 h-5 rounded-full bg-rose-100 text-rose-800 font-bold flex items-center justify-center shrink-0 text-[11px]">3</span>
                                <p>Confirm <strong>"Install"</strong> — {appName} will be added directly to your mobile app drawer with this logo & name!</p>
                            </div>
                        </div>

                        <Button
                            className="w-full bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-700 hover:to-amber-700 text-white text-xs font-bold py-2 rounded-xl"
                            onClick={() => {
                                setShowAndroidGuide(false);
                                handleDismiss();
                            }}
                        >
                            Understood
                        </Button>
                    </div>
                </div>
            )}
        </>
    );
};

