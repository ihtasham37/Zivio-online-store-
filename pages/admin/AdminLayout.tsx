
import React, { useEffect, useState, Suspense } from 'react';
import { Routes, Route, useLocation, useNavigate, Link } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../../firebase';
import { useAuth } from '../../hooks/useAuth';
import { Spinner } from '../../components/ui/Spinner';
import { Icons } from '../../components/icons/Icons';
import { useStore } from '../../hooks/useStore';
import { UserRole } from '../../types';

const Dashboard = React.lazy(() => import('./Dashboard'));
const ManageProducts = React.lazy(() => import('./ManageProducts'));
const ManageCategories = React.lazy(() => import('./ManageCategories'));
const CategoryProducts = React.lazy(() => import('./CategoryProducts'));
const ManageOrders = React.lazy(() => import('./ManageOrders'));
const Settings = React.lazy(() => import('./Settings'));
const ManageCoupons = React.lazy(() => import('./ManageCoupons'));
const ManageBanners = React.lazy(() => import('./ManageBanners'));
const ManageBlog = React.lazy(() => import('./ManageBlog')); // Renamed from ManageUpdates
const ManageVendors = React.lazy(() => import('./ManageVendors'));
const ManageChallans = React.lazy(() => import('./ManageChallans'));

type SidebarLinkProps = {
    to: string;
    children: React.ReactNode;
    badge?: number;
};

const SidebarLink: React.FC<SidebarLinkProps> = ({ to, children, badge }) => {
    const location = useLocation();
    const fullPath = `/admin${to === '/' ? '' : to}`;
    const isActive = location.pathname.startsWith(fullPath) && (to !== '/' || location.pathname === '/admin');

    return (
        <Link 
            to={`/admin${to === '/' ? '' : to}`} 
            className={`flex items-center justify-between px-4 py-3 rounded-xl transition-all relative ${
                isActive 
                ? 'bg-gradient-to-r from-rose-500/20 to-amber-500/10 text-rose-300 font-bold border-l-4 border-rose-500 shadow-sm' 
                : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
            }`}
        >
            <div className="flex items-center gap-2">
                <span className="font-medium">{children}</span>
            </div>
            {badge !== undefined && badge > 0 && (
                <span className="bg-gradient-to-r from-rose-500 to-amber-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full min-w-[18px] text-center shadow-sm">
                    {badge}
                </span>
            )}
        </Link>
    );
};

const getPageTitle = (pathname: string) => {
    if (pathname.endsWith('/admin')) return 'Dashboard';
    if (pathname.includes('/products')) return 'Manage Products';
    if (pathname.startsWith('/admin/categories/')) return 'Category Products';
    if (pathname.includes('/categories')) return 'Manage Categories';
    if (pathname.includes('/orders')) return 'Manage Orders';
    if (pathname.includes('/coupons')) return 'Manage Coupons';
    if (pathname.includes('/banners')) return 'Manage Banners';
    if (pathname.includes('/updates')) return 'Manage Blog';
    if (pathname.includes('/challans')) return 'Manage Challans';
    if (pathname.includes('/settings')) return 'Store Settings';
    return 'Admin Panel';
};

const AdminLayout = () => {
  const { logout, userData } = useAuth();
  const { settings: appSettings, myOrders, syncCatalogBundle } = useStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [isAuthCheckComplete, setIsAuthCheckComplete] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [newOrderCount, setNewOrderCount] = useState(0);
  const [isSyncingBundle, setIsSyncingBundle] = useState(false);
  const [syncSuccess, setSyncSuccess] = useState(false);

  const handleManualSync = async () => {
    setIsSyncingBundle(true);
    try {
      if (syncCatalogBundle) {
        await syncCatalogBundle();
        setSyncSuccess(true);
        setTimeout(() => setSyncSuccess(false), 2500);
      }
    } finally {
      setIsSyncingBundle(false);
    }
  };

  useEffect(() => {
    const updateCount = () => {
      const lastSeen = parseInt(localStorage.getItem('adminLastSeenOrderTime') || '0', 10);
      const count = myOrders.filter(o => (o.createdAt || 0) > lastSeen).length;
      setNewOrderCount(count);
    };

    updateCount();

    window.addEventListener('orderSeenUpdate', updateCount);
    return () => window.removeEventListener('orderSeenUpdate', updateCount);
  }, [myOrders]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, user => {
        if (!user) {
            navigate('/vendor/login');
        } else {
            // Wait for userData to be loaded in context if needed
            if ('Notification' in window && Notification.permission === 'default') {
                Notification.requestPermission();
            }
        }
        setIsAuthCheckComplete(true);
    });
    return () => unsubscribe();
  }, [navigate]);

  useEffect(() => {
    if (isAuthCheckComplete && userData && userData.role !== UserRole.Admin) {
        if (userData.role === UserRole.Vendor) {
            navigate('/vendor');
        } else {
            navigate('/vendor/login');
        }
    }
  }, [isAuthCheckComplete, userData, navigate]);
  
  useEffect(() => {
    if (isSidebarOpen) {
        setIsSidebarOpen(false);
    }
  }, [location.pathname]);

  if (!isAuthCheckComplete || !userData || userData.role !== UserRole.Admin) {
    return <div className="flex items-center justify-center h-screen bg-slate-900 text-rose-400 font-bold"><Spinner size="lg" /></div>;
  }

  return (
    <div className="flex h-screen bg-slate-100 font-sans">
      <aside className={`bg-slate-900 text-white w-64 space-y-6 py-7 px-3 absolute inset-y-0 left-0 transform ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:relative md:translate-x-0 transition-transform duration-200 ease-in-out z-30 flex flex-col border-r border-slate-800`}>
        <div className="px-3 flex items-center justify-between">
            <Link to="/admin" className="flex items-center gap-2.5 text-2xl font-bold text-white tracking-tight">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-rose-500 to-amber-500 flex items-center justify-center shadow-md">
                    <Icons.sparkles className="w-5 h-5 text-white" />
                </div>
                <span className="font-serif text-lg bg-gradient-to-r from-white via-rose-100 to-amber-100 bg-clip-text text-transparent font-bold truncate">
                    {appSettings?.appName ? `${appSettings.appName} Admin` : 'Boutique Admin'}
                </span>
            </Link>
            <button className="md:hidden text-slate-400 hover:text-white" onClick={() => setIsSidebarOpen(false)}><Icons.x className="w-5 h-5" /></button>
        </div>
        <nav className="flex-grow space-y-1">
          <SidebarLink to="/">Dashboard</SidebarLink>
          <SidebarLink to="/products">Products</SidebarLink>
          <SidebarLink to="/categories">Categories</SidebarLink>
          <SidebarLink to="/orders" badge={newOrderCount}>Orders</SidebarLink>
          <SidebarLink to="/coupons">Coupons</SidebarLink>
          <SidebarLink to="/banners">Banners</SidebarLink>
          <SidebarLink to="/updates">Blog</SidebarLink>
          <SidebarLink to="/vendors">Vendors</SidebarLink>
          <SidebarLink to="/challans">Manage Challans</SidebarLink>
          <SidebarLink to="/settings">Settings</SidebarLink>
        </nav>
        <div className="px-3 mt-auto">
             <button onClick={logout} className="flex items-center gap-3 w-full px-4 py-3 rounded-xl transition-colors text-slate-400 hover:bg-rose-500/20 hover:text-rose-300">
                <Icons.logOut className="w-5 h-5" />
                <span className="font-medium">Logout</span>
            </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col overflow-hidden">
         <header className="bg-white border-b border-slate-200 shadow-sm flex justify-between items-center px-4 py-3">
            <button className="text-slate-600 md:hidden p-1.5 rounded-lg hover:bg-slate-100" onClick={() => setIsSidebarOpen(true)}>
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16m-7 6h7"></path></svg>
            </button>
            <h1 className="text-lg md:text-xl font-bold text-slate-800 font-serif">{getPageTitle(location.pathname)}</h1>
            <div className="flex items-center gap-3">
                <button
                    onClick={handleManualSync}
                    disabled={isSyncingBundle}
                    title="Publish current data into single 1-read bundle for store visitors"
                    className={`text-xs px-3 py-1.5 rounded-xl flex items-center gap-1.5 font-medium transition-all shadow-sm ${
                        syncSuccess
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-300'
                        : 'bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200'
                    }`}
                >
                    {isSyncingBundle ? (
                        <>
                            <Spinner size="sm" />
                            <span>Syncing Bundle...</span>
                        </>
                    ) : syncSuccess ? (
                        <>
                            <span>✓ 1-Read Bundle Updated</span>
                        </>
                    ) : (
                        <>
                            <svg className="w-3.5 h-3.5 text-rose-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                            <span>Sync 1-Read Bundle</span>
                        </>
                    )}
                </button>
            </div>
        </header>
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-slate-100 p-3 md:p-6">
            <Suspense fallback={<div className="flex justify-center p-16"><Spinner size="lg"/></div>}>
                <Routes>
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/products" element={<ManageProducts />} />
                  <Route path="/categories" element={<ManageCategories />} />
                  <Route path="/categories/:categoryName" element={<CategoryProducts />} />
                  <Route path="/orders" element={<ManageOrders />} />
                  <Route path="/coupons" element={<ManageCoupons />} />
                  <Route path="/banners" element={<ManageBanners />} />
                  <Route path="/updates" element={<ManageBlog />} />
                  <Route path="/vendors" element={<ManageVendors />} />
                  <Route path="/challans" element={<ManageChallans />} />
                  <Route path="/settings" element={<Settings />} />
                </Routes>
            </Suspense>
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;