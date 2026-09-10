
import React, { useEffect, useState, Suspense, useMemo } from 'react';
import { Routes, Route, useLocation, useNavigate, Link } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../../firebase';
import { useAuth } from '../../hooks/useAuth';
import { Spinner } from '../../components/ui/Spinner';
import { Icons } from '../../components/icons/Icons';
import { useStore } from '../../hooks/useStore';
import { UserRole } from '../../types';

const Dashboard = React.lazy(() => import('../admin/Dashboard'));
const ManageProducts = React.lazy(() => import('../admin/ManageProducts'));
const ManageOrders = React.lazy(() => import('../admin/ManageOrders'));
const VendorSettings = React.lazy(() => import('./VendorSettings'));
const ManageCoupons = React.lazy(() => import('../admin/ManageCoupons'));
const Challans = React.lazy(() => import('./Challans'));

type SidebarLinkProps = {
    to: string;
    children: React.ReactNode;
    badge?: number;
};

const SidebarLink: React.FC<SidebarLinkProps> = ({ to, children, badge }) => {
    const location = useLocation();
    const fullPath = `/vendor${to === '/' ? '' : to}`;
    const isActive = location.pathname === fullPath || (to !== '/' && location.pathname.startsWith(fullPath));

    return (
        <Link 
            to={`/vendor${to === '/' ? '' : to}`} 
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

const VendorLayout = () => {
  const { logout, userData } = useAuth();
  const { challans, myOrders, syncCatalogBundle } = useStore();
  const navigate = useNavigate();
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
    } catch (e) {
      console.error("Vendor catalog sync failed:", e);
      alert("Failed to sync catalog bundle. Please try again.");
    } finally {
      setIsSyncingBundle(false);
    }
  };

  const myChallanCount = useMemo(() => {
    if (!userData) return 0;
    return challans.filter(c => c.vendorIds?.includes(userData.uid)).length;
  }, [challans, userData]);

  useEffect(() => {
    const updateCount = () => {
      if (!userData) return;
      const lastSeen = parseInt(localStorage.getItem(`vendorLastSeenOrderTime_${userData.uid}`) || '0', 10);
      const count = myOrders.filter(o => (o.createdAt || 0) > lastSeen).length;
      setNewOrderCount(count);
    };

    updateCount();

    window.addEventListener('orderSeenUpdate', updateCount);
    return () => window.removeEventListener('orderSeenUpdate', updateCount);
  }, [myOrders, userData]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, user => {
        if (!user) {
            navigate('/vendor/login');
        } else {
            setIsAuthCheckComplete(true);
        }
    });
    return () => unsubscribe();
  }, [navigate]);

  useEffect(() => {
    if (isAuthCheckComplete && userData) {
        if (userData.role !== UserRole.Vendor) {
            if (userData.role === UserRole.Admin) {
                navigate('/admin');
            } else {
                navigate('/vendor/login');
            }
        } else if (userData.status !== 'active') {
             navigate('/vendor/login');
        }
    }
  }, [isAuthCheckComplete, userData, navigate]);

  // Use a cleaner loading state to prevent flash
  if (!isAuthCheckComplete || !userData || userData.role !== UserRole.Vendor || userData.status !== 'active') {
    return <div className="flex items-center justify-center h-screen bg-slate-900 text-rose-400 font-bold"><Spinner size="lg" /></div>;
  }

  return (
    <div className="flex h-screen bg-slate-100 font-sans">
      <aside className={`bg-slate-900 text-white w-64 space-y-6 py-7 px-3 absolute inset-y-0 left-0 transform ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:relative md:translate-x-0 transition-transform duration-200 ease-in-out z-30 flex flex-col border-r border-slate-800`}>
        <div className="px-3 flex items-center justify-between">
            <Link to="/vendor" className="flex items-center gap-2.5 text-2xl font-bold text-white">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-rose-500 to-amber-500 flex items-center justify-center shadow-md">
                    <Icons.store className="w-5 h-5 text-white" />
                </div>
                <span className="truncate font-serif text-lg font-bold">{userData?.shopName || 'Vendor Panel'}</span>
            </Link>
            <button className="md:hidden text-slate-400 hover:text-white" onClick={() => setIsSidebarOpen(false)}><Icons.x className="w-5 h-5" /></button>
        </div>
        <nav className="flex-grow space-y-1">
          <SidebarLink to="/">Dashboard</SidebarLink>
          <SidebarLink to="/products">My Products</SidebarLink>
          <SidebarLink to="/orders" badge={newOrderCount}>My Orders</SidebarLink>
          <SidebarLink to="/coupons">Coupons</SidebarLink>
          <SidebarLink to="/challans" badge={myChallanCount}>Challans</SidebarLink>
          <SidebarLink to="/settings">Shop Settings</SidebarLink>
        </nav>
        <div className="px-3 mt-auto space-y-2">
             <Link to="/" className="flex items-center gap-3 w-full px-4 py-2.5 rounded-xl transition-colors text-slate-400 hover:text-white hover:bg-slate-800/60 text-sm">
                <Icons.home className="w-4 h-4" />
                <span>View Store</span>
            </Link>
             <button onClick={logout} className="flex items-center gap-3 w-full px-4 py-3 rounded-xl transition-colors text-slate-400 hover:bg-rose-500/20 hover:text-rose-300">
                <Icons.logOut className="w-5 h-5" />
                <span className="font-medium">Logout</span>
            </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col overflow-hidden">
         <header className="bg-white border-b border-slate-200 shadow-sm flex justify-between items-center p-3 sm:px-4 sm:py-3">
            <button className="text-slate-600 md:hidden mr-2 p-1.5 rounded-lg hover:bg-slate-100" onClick={() => setIsSidebarOpen(true)}>
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16m-7 6h7"></path></svg>
            </button>
            <h1 className="text-lg sm:text-xl font-bold text-slate-800 font-serif truncate mr-2">Vendor: {userData?.shopName}</h1>
            <div className="flex items-center gap-2 sm:gap-3">
                <button
                    onClick={handleManualSync}
                    disabled={isSyncingBundle}
                    title="Publish current catalog into single 1-read bundle for entire app"
                    className={`text-xs px-2.5 sm:px-3 py-1.5 rounded-xl flex items-center gap-1.5 font-medium transition-all shadow-sm ${
                        syncSuccess
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-300'
                        : 'bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200'
                    }`}
                >
                    {isSyncingBundle ? (
                        <>
                            <Spinner size="sm" />
                            <span className="hidden sm:inline">Syncing Catalog...</span>
                            <span className="sm:hidden">Syncing...</span>
                        </>
                    ) : syncSuccess ? (
                        <>
                            <span>✓ Catalog Synced</span>
                        </>
                    ) : (
                        <>
                            <Icons.refresh className="w-3.5 h-3.5 text-rose-600" />
                            <span className="hidden sm:inline">Sync 1-Read Catalog</span>
                            <span className="sm:hidden">Sync Catalog</span>
                        </>
                    )}
                </button>
                <div className="text-xs text-slate-500 hidden md:block">{userData?.email}</div>
            </div>
        </header>
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-slate-100 p-3 md:p-6">
            <Suspense fallback={<div className="flex justify-center p-16"><Spinner size="lg"/></div>}>
                <Routes>
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/products" element={<ManageProducts />} />
                  <Route path="/orders" element={<ManageOrders />} />
                  <Route path="/coupons" element={<ManageCoupons />} />
                  <Route path="/challans" element={<Challans />} />
                  <Route path="/settings" element={<VendorSettings />} />
                </Routes>
            </Suspense>
        </main>
      </div>
    </div>
  );
};

export default VendorLayout;
