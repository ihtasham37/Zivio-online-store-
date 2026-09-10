import React, { useState, useEffect, useMemo } from 'react';
import { useStore } from '../../hooks/useStore';
import { Icons } from '../icons/Icons';
import { ImageWithFallback } from './ImageWithFallback';

export const PopupBanners = () => {
    const { banners } = useStore();
    const [isVisible, setIsVisible] = useState(false);
    
    const activeBanner = useMemo(() => {
        return banners.find(b => b.isActive) || null;
    }, [banners]);

    const bannerId = activeBanner?.id;

    useEffect(() => {
        if (!bannerId) {
            setIsVisible(false);
            return;
        }
        
        const isClosed = sessionStorage.getItem(`bannerClosed_${bannerId}`);
        if (!isClosed) {
            const timer = setTimeout(() => {
                setIsVisible(true);
            }, 500); // Delay appearance for a smoother feel
            return () => clearTimeout(timer);
        }
    }, [bannerId]);

    const handleClose = () => {
        setIsVisible(false);
        if (bannerId) {
            sessionStorage.setItem(`bannerClosed_${bannerId}`, 'true');
        }
    };

    if (!isVisible || !activeBanner) {
        return null;
    }

    const BannerContent = (
        <ImageWithFallback
            src={activeBanner.imageUrl}
            alt="Promotional Banner"
            className="w-full h-full object-contain bg-white"
        />
    );

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4 animate-fade-in">
            <div className="relative bg-white rounded-lg w-full max-w-xs mx-auto animate-slide-in-up aspect-video overflow-hidden">
                <button
                    onClick={handleClose}
                    className="absolute top-1.5 right-1.5 bg-black/40 text-white w-7 h-7 rounded-full shadow-lg flex items-center justify-center z-10 hover:bg-black/60 transition-colors"
                    aria-label="Close Banner"
                >
                    <Icons.x className="w-4 h-4" />
                </button>
                
                {activeBanner.redirectUrl ? (
                    <a href={activeBanner.redirectUrl} target="_blank" rel="noopener noreferrer" onClick={handleClose} className="block w-full h-full">
                        {BannerContent}
                    </a>
                ) : (
                    <div className="w-full h-full">{BannerContent}</div>
                )}
            </div>
        </div>
    );
};