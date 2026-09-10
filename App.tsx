
import React, { Suspense, useEffect, useState } from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { AppProvider } from './context/AppContext';
// Fix: Corrected import source for useStore to pull from hooks/useStore instead of context/AppContext.
import { useStore } from './hooks/useStore';
import { FullPageSpinner } from './components/ui/Spinner';
import { ErrorBoundary } from './components/ErrorBoundary';
import { lazyRetry } from './utils/lazyLoad';
import { SplashScreen } from './components/ui/SplashScreen';
import { safeJsonStringify } from './utils/helpers';

// Use lazyRetry for top-level routes to handle deployment updates gracefully
const StoreLayout = lazyRetry(() => import('./components/layout/StoreLayout'), 'StoreLayout');
const AdminLayout = lazyRetry(() => import('./pages/admin/AdminLayout'), 'AdminLayout');
const VendorAuth = lazyRetry(() => import('./pages/vendor/VendorAuth'), 'VendorAuth');
const VendorLayout = lazyRetry(() => import('./pages/vendor/VendorLayout'), 'VendorLayout');

const AppContent = () => {
    const { settings } = useStore();
    const [showSplash, setShowSplash] = useState(true);

    useEffect(() => {
        // Hide splash screen after 2 seconds
        const timer = setTimeout(() => {
            setShowSplash(false);
        }, 2000);

        return () => clearTimeout(timer);
    }, []);

    useEffect(() => {
        if (settings) {
            const logoUrl = typeof settings.logoUrl === 'string' ? settings.logoUrl : '';
            const appName = settings.appName || 'Ali Cart';
            document.title = appName;

            // Update PWA Manifest dynamically with admin shop name and logo
            const manifestIcons = [];
            if (logoUrl) {
                manifestIcons.push({
                    "src": logoUrl,
                    "sizes": "192x192 512x512",
                    "type": "image/png",
                    "purpose": "any"
                });
            }
            manifestIcons.push(
                {
                    "src": "/pwa-192x192.png",
                    "sizes": "192x192",
                    "type": "image/png",
                    "purpose": "any"
                },
                {
                    "src": "/pwa-512x512.png",
                    "sizes": "512x512",
                    "type": "image/png",
                    "purpose": "any"
                },
                {
                    "src": "/pwa-maskable-512x512.png",
                    "sizes": "512x512",
                    "type": "image/png",
                    "purpose": "maskable"
                }
            );

            const manifestData = {
                "id": "/",
                "name": appName,
                "short_name": appName.substring(0, 12),
                "start_url": "/",
                "scope": "/",
                "display": "standalone",
                "background_color": "#ffffff",
                "theme_color": "#be185d",
                "description": `${appName} - Official Online Store`,
                "icons": manifestIcons
            };

            let stringManifest = '';
            try {
                stringManifest = safeJsonStringify(manifestData);
            } catch (err) {
                console.warn('Manifest stringification failed, using fallback:', err);
                stringManifest = safeJsonStringify({
                    "id": "/",
                    "name": appName,
                    "short_name": appName.substring(0, 12),
                    "start_url": "/",
                    "scope": "/",
                    "display": "standalone",
                    "background_color": "#ffffff",
                    "theme_color": "#0d9488"
                });
            }

            const blob = new Blob([stringManifest], {type: 'application/json'});
            const manifestURL = URL.createObjectURL(blob);
            
            let manifestLink = document.querySelector('link[rel="manifest"]');
            if (!manifestLink) {
                manifestLink = document.createElement('link');
                manifestLink.setAttribute('rel', 'manifest');
                document.head.appendChild(manifestLink);
            }
            manifestLink.setAttribute('href', manifestURL);

            // Update Favicon
            let favicon = document.querySelector('link[rel="icon"]');
            if (!favicon) {
                favicon = document.createElement('link');
                favicon.setAttribute('rel', 'icon');
                document.head.appendChild(favicon);
            }
            favicon.setAttribute('href', settings.logoUrl || '/favicon.svg');

            // Update Apple Touch Icon
            let appleTouch = document.querySelector('link[rel="apple-touch-icon"]');
            if (!appleTouch) {
                appleTouch = document.createElement('link');
                appleTouch.setAttribute('rel', 'apple-touch-icon');
                document.head.appendChild(appleTouch);
            }
            appleTouch.setAttribute('href', settings.logoUrl || '/apple-touch-icon.png');

            // Update Apple Mobile Title
            let appTitleMeta = document.querySelector('meta[name="apple-mobile-web-app-title"]');
            if (!appTitleMeta) {
                appTitleMeta = document.createElement('meta');
                appTitleMeta.setAttribute('name', 'apple-mobile-web-app-title');
                document.head.appendChild(appTitleMeta);
            }
            appTitleMeta.setAttribute('content', appName);

            return () => URL.revokeObjectURL(manifestURL);
        }
    }, [settings]);

    if (showSplash) {
        return <SplashScreen />;
    }

    return (
        <Suspense fallback={<FullPageSpinner />}>
            <Routes>
                {/* Admin Routes */}
                <Route path="/admin/*" element={<AdminLayout />} />

                {/* Vendor Routes */}
                <Route path="/vendor/login" element={<VendorAuth />} />
                <Route path="/vendor/register" element={<VendorAuth />} />
                <Route path="/vendor/*" element={<VendorLayout />} />

                {/* Storefront Routes */}
                <Route path="/*" element={<StoreLayout />} />
            </Routes>
        </Suspense>
    );
};

function App() {
  return (
    <ErrorBoundary>
      <HelmetProvider>
        <AppProvider>
          {/* HashRouter is used for stability on static hosts (like InfinityFree) to prevent 404s on refresh */}
          <HashRouter>
              <AppContent />
          </HashRouter>
        </AppProvider>
      </HelmetProvider>
    </ErrorBoundary>
  );
}

export default App;
