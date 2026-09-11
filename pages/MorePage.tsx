

import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useStore } from '../hooks/useStore';
import { Icons } from '../components/icons/Icons';
import { usePWAInstall } from '../hooks/usePWAInstall';

const MorePage = () => {
    const { settings } = useStore();
    const { isInstalled, isInstallable, isIOS, installPWA } = usePWAInstall();
    const [iosGuideOpen, setIosGuideOpen] = useState(false);

    const whatsappLink = settings?.whatsappNumber ? `https://wa.me/${settings.whatsappNumber.replace(/\D/g, '')}` : '';
    const emailLink = settings?.adminEmail ? `mailto:${settings.adminEmail}` : '';

    const hasCommunityLinks = 
        settings?.whatsappGroupUrl ||
        settings?.whatsappChannelUrl ||
        settings?.telegramChannelUrl ||
        settings?.youtubeChannelUrl ||
        settings?.instagramChannelUrl ||
        settings?.facebookPageUrl;

    const handleInstallClick = async () => {
        if (isIOS) {
            setIosGuideOpen(true);
        } else if (isInstallable) {
            await installPWA();
        } else {
            window.dispatchEvent(new CustomEvent('open-pwa-install-banner'));
        }
    };

    const listItems = [
        { label: 'Join Our Community', href: '/community', icon: Icons.users, isExternal: false, show: (settings?.showJoinCommunity ?? true) && !!hasCommunityLinks },
        { label: 'Blog', href: '/blog', icon: Icons.star, isExternal: false, show: settings?.showLatestUpdates ?? true },
        { label: 'Business / Vendor Portal', href: '/vendor/login', icon: Icons.store, isExternal: false },
        { label: 'Admin Login', href: '/admin/login', icon: Icons.user, isExternal: false },
        { label: 'Contact on WhatsApp', href: whatsappLink, icon: Icons.whatsapp, isExternal: true, show: (settings?.showContactWhatsapp ?? true) && !!whatsappLink },
        { label: 'Contact by Email', href: emailLink, icon: Icons.envelope, isExternal: true, show: (settings?.showContactEmail ?? true) && !!emailLink },
    ].filter(item => item.show !== false);

    return (
        <div className="container mx-auto px-4 max-w-md pb-6 space-y-5">
            {/* App & Store Brand Header Card */}
            <div className="bg-gradient-to-r from-rose-700 via-rose-600 to-amber-600 rounded-2xl p-5 text-white shadow-md flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-white/20 p-1 backdrop-blur-md shrink-0 flex items-center justify-center overflow-hidden border-2 border-white/60 shadow-md aspect-square">
                    {settings?.logoUrl ? (
                        <img 
                            src={settings.logoUrl} 
                            alt={settings.appName || 'App Logo'} 
                            className="w-full h-full object-cover rounded-full bg-white aspect-square" 
                        />
                    ) : (
                        <div className="text-2xl font-extrabold font-serif text-white">
                            {settings?.appName?.[0] || '✨'}
                        </div>
                    )}
                </div>
                <div className="min-w-0">
                    <h2 className="text-xl font-bold font-serif truncate leading-tight">
                        {settings?.appName || 'Baby Boutique'}
                    </h2>
                    <p className="text-xs text-rose-100/90 font-medium mt-0.5">
                        Official Mobile App & Store
                    </p>
                    <span className="inline-block mt-1 px-2 py-0.5 rounded-full bg-white/20 text-[10px] font-bold text-amber-200 border border-white/20">
                        v1.0 • PWA Ready
                    </span>
                </div>
            </div>
            
            <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-rose-100">
                <ul className="divide-y divide-gray-200">
                    {listItems.map((item) => (
                         <li key={item.label}>
                             {item.isExternal ? (
                                 <a
                                     href={item.href}
                                     target="_blank"
                                     rel="noopener noreferrer"
                                     className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
                                 >
                                     <div className="flex items-center gap-4">
                                         <item.icon className="w-6 h-6 text-gray-500" />
                                         <span className="font-medium text-gray-800">{item.label}</span>
                                     </div>
                                     <Icons.chevronRight className="w-5 h-5 text-gray-400" />
                                 </a>
                             ) : (
                                 <Link
                                     to={item.href}
                                     className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
                                 >
                                      <div className="flex items-center gap-4">
                                         <item.icon className="w-6 h-6 text-gray-500" />
                                         <span className="font-medium text-gray-800">{item.label}</span>
                                     </div>
                                     <Icons.chevronRight className="w-5 h-5 text-gray-400" />
                                 </Link>
                             )}
                         </li>
                    ))}
                    {!isInstalled && (
                        <li>
                            <button
                                type="button"
                                onClick={handleInstallClick}
                                className="w-full flex items-center justify-between p-4 hover:bg-rose-50 transition-colors text-left text-rose-700 bg-rose-50/50"
                            >
                                <div className="flex items-center gap-4">
                                    <div className="w-6 h-6 rounded-lg bg-rose-600 text-white flex items-center justify-center shadow-xs">
                                        <Icons.download className="w-4 h-4" />
                                    </div>
                                    <div>
                                        <span className="font-medium text-slate-800 block text-sm">Install App</span>
                                        <span className="text-xs text-rose-600">Faster shopping & offline boutique access</span>
                                    </div>
                                </div>
                                <span className="text-xs bg-rose-600 text-white font-bold px-3 py-1 rounded-full shadow-xs">
                                    Install
                                </span>
                            </button>
                        </li>
                    )}
                </ul>
            </div>

            {iosGuideOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
                    <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl border border-gray-100">
                        <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                            <h3 className="font-bold text-gray-900 text-sm">Install on iPhone / iPad</h3>
                            <button onClick={() => setIosGuideOpen(false)} className="text-gray-400 hover:text-gray-600 p-1">
                                <Icons.x className="w-4 h-4" />
                            </button>
                        </div>
                        <div className="py-4 space-y-3 text-xs text-gray-600">
                            <p>1. Tap the <strong>Share</strong> button <Icons.share className="inline w-3.5 h-3.5 text-teal-600 mb-0.5 mx-0.5" /> in Safari.</p>
                            <p>2. Tap <strong>Add to Home Screen</strong>.</p>
                            <p>3. Tap <strong>Add</strong> at top right to complete installation.</p>
                        </div>
                        <button
                            onClick={() => setIosGuideOpen(false)}
                            className="w-full py-2 bg-teal-600 text-white font-bold text-xs rounded-xl"
                        >
                            Done
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};


export default MorePage;