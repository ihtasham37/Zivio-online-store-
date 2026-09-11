import React, { createContext, useState, useEffect, ReactNode, useCallback, useContext, useMemo } from 'react';
import { 
    getFirestore, collection, doc, onSnapshot, orderBy, query, addDoc, setDoc, deleteDoc, updateDoc, where, getDocs, writeBatch, getDoc
} from 'firebase/firestore';
import { 
    getAuth, onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, User
} from 'firebase/auth';
import { db, auth } from '../firebase';
import { 
    Product, CartItem, Order, Settings, ChatMessage, OrderStatus, Customer, Coupon, Banner, Category, UpdatePost, ContentBlock,
    AppUser, UserRole, Challan
} from '../types';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { useSessionStorage } from '../hooks/useSessionStorage';
import { normalizePhone, generateCartItemKey, sanitizeForFirestore, safeJsonStringify } from '../utils/helpers';
import { compressImage, fileToDataUri } from '../utils/compression';

export interface CatalogBundle {
  products: Product[];
  settings: Settings | null;
  banners: Banner[];
  coupons: Coupon[];
  updatePosts: UpdatePost[];
  challans: Challan[];
  vendorsStatus: Record<string, string>;
  vendorsMap: Record<string, AppUser>;
  lastUpdated: number;
}

export interface AppContextType {
  products: Product[];
  cart: CartItem[];
  orders: Order[];
  settings: Settings | null;
  chatMessages: ChatMessage[];
  coupons: Coupon[];
  banners: Banner[];
  updatePosts: UpdatePost[];
  isLoading: boolean;
  error: string | null;
  user: User | null;
  userData: AppUser | null;
  myProducts: Product[];
  myOrders: Order[];
  wishlist: string[];
  activeCustomer: { email: string, phone: string } | null;
  customerOrders: Order[];
  challans: Challan[];
  vendorsMap: Record<string, AppUser>;
  syncCatalogBundle: (overrides?: Partial<CatalogBundle>) => Promise<void>;
  refreshCatalog: () => Promise<void>;

  addToCart: (product: Product, quantity: number, selectedSizes?: Record<string, string>, additionalInfo?: string) => void;
  removeFromCart: (productId: string, selectedSizes?: Record<string, string>) => void;
  updateCartQuantity: (productId: string, quantity: number, selectedSizes?: Record<string, string>) => void;
  clearCart: () => void;
  addProduct: (product: Omit<Product, 'id' | 'createdAt'>) => Promise<void>;
  updateProduct: (product: Product) => Promise<void>;
  deleteProduct: (productId: string) => Promise<void>;
  toggleProductVisibility: (productId: string, isVisible: boolean) => Promise<void>;
  moveProduct: (productId: string, newCategory: string) => Promise<void>;
  copyProduct: (productId: string, destinationCategory: string) => Promise<void>;
  addOrder: (order: Omit<Order, 'id' | 'createdAt' | 'customerId'>) => Promise<string>;
  updateOrderStatus: (orderId: string, status: OrderStatus) => Promise<void>;
  deleteOrder: (orderId: string) => Promise<void>;
  sendChatMessage: (message: string, sessionId: string) => Promise<void>;
  sendAdminReply: (sessionId: string, text: string) => Promise<void>;
  deleteChatMessage: (messageId: string) => Promise<void>;
  updateSettings: (settings: Settings) => Promise<void>;
  addCategory: (name: string, parentId: string | null, imageUrl?: string, bannerImageUrls?: string[]) => Promise<void>;
  deleteCategory: (categoryId: string) => Promise<void>;
  updateCategory: (categoryId: string, newData: Partial<Omit<Category, 'id'>>) => Promise<void>;
  moveCategory: (categoryId: string, newParentId: string | null) => Promise<void>;
  copyCategory: (categoryId: string, newParentId: string | null) => Promise<void>;
  addUpdatePost: (post: Omit<UpdatePost, 'id' | 'createdAt'>) => Promise<void>;
  updateUpdatePost: (post: UpdatePost) => Promise<void>;
  deleteUpdatePost: (post: UpdatePost) => Promise<void>;
  toggleWishlist: (productId: string) => void;
  uploadFile: (file: File) => Promise<string>;
  deleteFile: (fileUrl: string) => Promise<void>;
  login: (email: string, pass: string) => Promise<void>;
  register: (email: string, pass: string) => Promise<void>;
  vendorRegister: (email: string, pass: string, shopName: string, firstName: string, lastName: string, whatsappNumber: string) => Promise<void>;
  updateVendorProfile: (uid: string, data: Partial<AppUser>) => Promise<void>;
  logout: () => Promise<void>;
  trackWithEmailAndPhone: (email: string, phone: string) => Promise<boolean>;
  customerLogout: () => void;
  addCoupon: (coupon: Omit<Coupon, 'id' | 'createdAt'>) => Promise<void>;
  updateCoupon: (coupon: Coupon) => Promise<void>;
  deleteCoupon: (couponId: string) => Promise<void>;
  addBanner: (banner: Omit<Banner, 'id' | 'createdAt'>) => Promise<void>;
  updateBanner: (banner: Banner) => Promise<void>;
  deleteBanner: (banner: Banner) => Promise<void>;
  addChallan: (challan: Omit<Challan, 'id' | 'createdAt'>) => Promise<void>;
  deleteChallan: (challanId: string) => Promise<void>;
}

export const AppContext = createContext<AppContextType | undefined>(undefined);

export const useStore = (): Omit<AppContextType, 'user' | 'login' | 'logout'> => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useStore must be used within an AppProvider');
  }
  const { user, login, logout, ...storeData } = context;
  return storeData;
};

const apiRequest = async (endpoint: string, body: any) => {
    try {
        const isFormData = typeof FormData !== 'undefined' && body instanceof FormData;
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: isFormData ? {} : { 'Content-Type': 'application/json' },
            body: isFormData ? body : (typeof body === 'string' ? body : safeJsonStringify(body))
        });
        if (!response.ok) throw new Error(`Server status: ${response.status}`);
        const result = await response.json();
        if (!result.success) throw new Error(result.error || 'API request failed');
        return result;
    } catch (error) {
        console.error(`API Error:`, error instanceof Error ? error.message : String(error));
        throw error;
    }
};

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [vendorsStatus, setVendorsStatus] = useState<Record<string, string>>({});
  const [vendorsMap, setVendorsMap] = useState<Record<string, AppUser>>({});

  const [cart, setCart] = useLocalStorage<CartItem[]>('cart', []);
  const [wishlist, setWishlist] = useLocalStorage<string[]>('wishlist', []);
  const [orders, setOrders] = useState<Order[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [banners, setBanners] = useState<Banner[]>([]);
  const [challans, setChallans] = useState<Challan[]>([]);
  const [updatePosts, setUpdatePosts] = useState<UpdatePost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<AppUser | null>(null);

  const products = useMemo(() => {
    if (userData?.role === UserRole.Admin) {
      return allProducts;
    }
    return allProducts.filter(p => {
      if (!p.vendorId) return true; // Admin product is always visible
      const status = vendorsStatus[p.vendorId];
      return status === 'active';
    });
  }, [allProducts, vendorsStatus, userData]);
  
  const myProducts = useMemo(() => {
    if (!userData) return [];
    if (userData.role === UserRole.Admin) return allProducts;
    return allProducts.filter(p => p.vendorId === userData.uid);
  }, [allProducts, userData]);

  const myOrders = useMemo(() => {
    if (!userData) return [];
    if (userData.role === UserRole.Admin) return orders;
    return orders.filter(o => o.vendorIds?.includes(userData.uid) || o.items.some(i => allProducts.find(p => p.id === i.id)?.vendorId === userData.uid));
  }, [orders, allProducts, userData]);

  const [activeCustomer, setActiveCustomer] = useSessionStorage<{ email: string, phone: string } | null>('active-tracking-id', null);
  const [customerOrders, setCustomerOrders] = useState<Order[]>([]);
  
  const uploadFile = useCallback(async (file: File): Promise<string> => {
    // Strictly compress image to < 20 KB
    const processedFile = await compressImage(file);
    
    try {
      const formData = new FormData();
      formData.append('file', processedFile);
      const result = await apiRequest('/api/upload', formData);
      if (result && result.url) {
        return result.url;
      }
    } catch (apiErr) {
      console.warn('Backend/Edge upload endpoint note, using direct compressed asset:', apiErr);
    }
    
    // Direct lightweight compressed Data URI fallback (< 20 KB data URI is ultra-fast and reliable)
    return await fileToDataUri(processedFile);
  }, []);

  const deleteFile = useCallback(async (fileUrl: string): Promise<void> => {
    if (!fileUrl?.includes('cloudinary')) return;
    await apiRequest('/api/delete', safeJsonStringify({ fileUrl }));
  }, []);
  
  const addToCart = (product: Product, quantity: number, selectedSizes?: Record<string, string>, additionalInfo?: string) => {
    setCart(prev => {
      const itemKey = generateCartItemKey({ id: product.id, selectedSizes });
      const existing = prev.find(i => generateCartItemKey(i) === itemKey);
      if (existing) return prev.map(i => generateCartItemKey(i) === itemKey ? { ...i, quantity: i.quantity + quantity } : i);
      return [...prev, { id: product.id, customId: product.customId, name: product.name, price: product.price, image: product.images[0], quantity, selectedSizes, deliveryTime: product.deliveryTime, easyReturn: product.easyReturn, returnPolicy: product.returnPolicy, additionalInfo, shippingFee: product.shippingFee, vendorId: product.vendorId }];
    });
    alert(`${product.name} added to cart!`);
  };

  const removeFromCart = (productId: string, selectedSizes?: Record<string, string>) => {
    const itemKey = generateCartItemKey({ id: productId, selectedSizes });
    setCart(prev => prev.filter(i => generateCartItemKey(i) !== itemKey));
  };
  
  const updateCartQuantity = (productId: string, quantity: number, selectedSizes?: Record<string, string>) => {
      if (quantity <= 0) removeFromCart(productId, selectedSizes);
      else {
          const itemKey = generateCartItemKey({ id: productId, selectedSizes });
          setCart(prev => prev.map(i => generateCartItemKey(i) === itemKey ? { ...i, quantity } : i));
      }
  };
  
  const clearCart = () => setCart([]);

  const CATALOG_SESSION_CACHE_KEY = 'ali_cart_catalog_bundle_cache_v1';

  const applyBundleData = useCallback((data: Partial<CatalogBundle>) => {
    if (Array.isArray(data.products)) setAllProducts(data.products);
    if (data.settings) setSettings(data.settings);
    if (Array.isArray(data.banners)) setBanners(data.banners);
    if (Array.isArray(data.coupons)) setCoupons(data.coupons);
    if (Array.isArray(data.updatePosts)) setUpdatePosts(data.updatePosts);
    if (Array.isArray(data.challans)) setChallans(data.challans);
    if (data.vendorsStatus) setVendorsStatus(data.vendorsStatus);
    if (data.vendorsMap) setVendorsMap(data.vendorsMap);
  }, []);

  const syncCatalogBundle = useCallback(async (overrides?: Partial<CatalogBundle>) => {
    try {
      const bundleToSave: CatalogBundle = {
        products: overrides?.products ?? allProducts,
        settings: overrides?.settings ?? settings,
        banners: overrides?.banners ?? banners,
        coupons: overrides?.coupons ?? coupons,
        updatePosts: overrides?.updatePosts ?? updatePosts,
        challans: overrides?.challans ?? challans,
        vendorsStatus: overrides?.vendorsStatus ?? vendorsStatus,
        vendorsMap: overrides?.vendorsMap ?? vendorsMap,
        lastUpdated: Date.now()
      };
      await setDoc(doc(db, 'settings', 'catalog_bundle'), sanitizeForFirestore(bundleToSave), { merge: true });
      try {
        sessionStorage.setItem(CATALOG_SESSION_CACHE_KEY, safeJsonStringify(bundleToSave));
      } catch (e) {}
    } catch (e) {
      console.warn("Could not sync catalog bundle:", e);
    }
  }, [allProducts, settings, banners, coupons, updatePosts, challans, vendorsStatus, vendorsMap]);

  const addProduct = async (data: Omit<Product, 'id' | 'createdAt'>) => {
    const productData = {
        ...data,
        createdAt: Date.now(),
        ...(userData?.role === UserRole.Vendor && {
            vendorId: userData.uid,
            shopName: userData.shopName
        }),
        // If admin adds, maybe we can let them specify or default to store name
        ...(userData?.role === UserRole.Admin && !data.shopName && {
            shopName: settings?.appName || 'Store'
        })
    };
    const docRef = await addDoc(collection(db, 'products'), productData);
    const newProd = { id: docRef.id, ...productData } as Product;
    const updated = [newProd, ...allProducts];
    setAllProducts(updated);
    await syncCatalogBundle({ products: updated });
  };
  const updateProduct = async (data: Product) => {
    await setDoc(doc(db, 'products', data.id), data);
    const updated = allProducts.map(p => p.id === data.id ? data : p);
    setAllProducts(updated);
    await syncCatalogBundle({ products: updated });
  };
  const deleteProduct = async (id: string) => {
    const prod = allProducts.find(p => p.id === id);
    if (prod?.images) await Promise.all(prod.images.map(url => deleteFile(url)));
    await deleteDoc(doc(db, 'products', id));
    const updated = allProducts.filter(p => p.id !== id);
    setAllProducts(updated);
    await syncCatalogBundle({ products: updated });
  };
  const toggleProductVisibility = async (id: string, isVisible: boolean) => {
    await updateDoc(doc(db, 'products', id), { isVisible });
    const updated = allProducts.map(p => p.id === id ? { ...p, isVisible } : p);
    setAllProducts(updated);
    await syncCatalogBundle({ products: updated });
  };
  const moveProduct = async (id: string, newCategory: string) => {
    await updateDoc(doc(db, 'products', id), { category: newCategory });
    const updated = allProducts.map(p => p.id === id ? { ...p, category: newCategory } : p);
    setAllProducts(updated);
    await syncCatalogBundle({ products: updated });
  };
  const copyProduct = async (id: string, cat: string) => {
    const prod = allProducts.find(p => p.id === id);
    if (!prod) throw new Error("Product not found");
    const { id: _, createdAt: __, ...newData } = prod;
    await addProduct({ ...newData, category: cat, name: `${newData.name} (Copy)` });
  };

    const addOrder = async (orderData: Omit<Order, 'id' | 'createdAt' | 'customerId'>) => {
    const phone = normalizePhone(orderData.customerPhone);
    const cleanedData = sanitizeForFirestore({
        ...orderData, 
        customerPhone: phone, 
        email: orderData.email.trim().toLowerCase(),
        createdAt: Date.now() 
    });
    const docRef = await addDoc(collection(db, 'orders'), cleanedData);
    
    clearCart();
    return docRef.id;
  };
  
  const updateOrderStatus = async (id: string, status: OrderStatus) => await updateDoc(doc(db, 'orders', id), { status });
  const deleteOrder = async (id: string) => await deleteDoc(doc(db, 'orders', id));
  
  const updateSettings = async (data: Settings) => {
    await setDoc(doc(db, 'settings', 'main'), data, { merge: true });
    setSettings(data);
    await syncCatalogBundle({ settings: data });
  };
  
  const addCategory = async (name: string, parentId: string | null, imageUrl?: string, bannerImageUrls?: string[]) => {
    if (!settings) return;
    const trimmedName = name.trim();
    const existingCategories = (settings.categories || []).filter(c => c && typeof c.name === 'string');
    if (!trimmedName) { alert("Category name cannot be empty."); return; }
    if (existingCategories.some(c => c.name.toLowerCase() === trimmedName.toLowerCase())) { alert(`Category "${trimmedName}" already exists.`); return; }
    const newCategory: Category = { id: `cat_${Date.now()}`, name: trimmedName, parentId, isVisible: true, ...(imageUrl && { imageUrl }), ...(bannerImageUrls && bannerImageUrls.length > 0 && { bannerImageUrls }) };
    await updateSettings({ ...settings, categories: [...existingCategories, newCategory] });
  };

  const deleteCategory = async (id: string) => {
    if (!settings?.categories) return;
    const allCategories = settings.categories;
    const remainingCategories = allCategories.filter(c => c.id !== id && c.parentId !== id);
    await updateSettings({ ...settings, categories: remainingCategories });
  };
  
  const updateCategory = async (id: string, newData: Partial<Omit<Category, 'id'>>) => {
    if (!settings?.categories) return;
    const updatedCategories = settings.categories.map(c => c.id === id ? { ...c, ...newData } : c);
    await updateSettings({ ...settings, categories: updatedCategories });
  };

  const moveCategory = async (categoryId: string, newParentId: string | null) => await updateCategory(categoryId, { parentId: newParentId });
  const copyCategory = async (categoryId: string, newParentId: string | null) => {
    if (!settings?.categories) return;
    const cat = settings.categories.find(c => c.id === categoryId);
    if (cat) await addCategory(`${cat.name} Copy`, newParentId, cat.imageUrl, cat.bannerImageUrls);
  };
  
  const addUpdatePost = async (post: Omit<UpdatePost, 'id' | 'createdAt'>) => {
    const postData = { ...post, createdAt: Date.now() };
    const docRef = await addDoc(collection(db, 'updatePosts'), postData);
    const newPost = { id: docRef.id, ...postData };
    const updated = [newPost, ...updatePosts];
    setUpdatePosts(updated);
    await syncCatalogBundle({ updatePosts: updated });
  };
  const updateUpdatePost = async (post: UpdatePost) => {
    await setDoc(doc(db, 'updatePosts', post.id), post);
    const updated = updatePosts.map(p => p.id === post.id ? post : p);
    setUpdatePosts(updated);
    await syncCatalogBundle({ updatePosts: updated });
  };
  const deleteUpdatePost = async (post: UpdatePost) => {
    await deleteDoc(doc(db, 'updatePosts', post.id));
    const updated = updatePosts.filter(p => p.id !== post.id);
    setUpdatePosts(updated);
    await syncCatalogBundle({ updatePosts: updated });
  };

  const sendChatMessage = async (text: string, sessionId: string) => {
    await addDoc(collection(db, 'chatMessages'), { sessionId, text, sender: 'user', timestamp: Date.now() });
  };
  const sendAdminReply = async (sessionId: string, text: string) => {
    await addDoc(collection(db, 'chatMessages'), { sessionId, text, sender: 'admin', timestamp: Date.now() });
  };
  const deleteChatMessage = async (id: string) => {
    await deleteDoc(doc(db, 'chatMessages', id));
  };

  const toggleWishlist = (id: string) => setWishlist(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);

  const login = async (email: string, pass: string) => {
    await signInWithEmailAndPassword(auth, email, pass);
  };
  const register = async (email: string, pass: string) => {
      const cred = await createUserWithEmailAndPassword(auth, email, pass);
      const newUser: AppUser = {
          uid: cred.user.uid,
          email: email.toLowerCase(),
          role: UserRole.Admin, // Default to admin for now if they use this, but we'll use specific ones
          status: 'active',
          createdAt: Date.now()
      };
      await setDoc(doc(db, 'users', cred.user.uid), newUser);
  };

  const vendorRegister = async (email: string, pass: string, shopName: string, firstName: string, lastName: string, whatsappNumber: string) => {
      const cred = await createUserWithEmailAndPassword(auth, email, pass);
      const newUser: AppUser = {
          uid: cred.user.uid,
          email: email.toLowerCase(),
          role: UserRole.Vendor,
          firstName,
          lastName,
          shopName,
          whatsappNumber,
          status: 'pending',
          createdAt: Date.now()
      };
      await setDoc(doc(db, 'users', cred.user.uid), newUser);
  };

  const updateVendorProfile = async (uid: string, data: Partial<AppUser>) => {
      await updateDoc(doc(db, 'users', uid), data);
  };

  const logout = async () => await signOut(auth);
  
  const trackWithEmailAndPhone = async (email: string, phone: string) => {
      const normPhone = normalizePhone(phone);
      const inputEmail = email.trim().toLowerCase();
      
      // Query by phone from orders collection to find matching orders
      const q = query(collection(db, 'orders'), where('customerPhone', '==', normPhone));
      const snap = await getDocs(q);
      
      if (!snap.empty) {
          // Filter by email in memory
          const foundOrders = snap.docs
            .map(d => ({ id: d.id, ...d.data() } as Order))
            .filter(o => o.email?.toLowerCase() === inputEmail);
          
          if (foundOrders.length > 0) {
              setActiveCustomer({ email: inputEmail, phone: normPhone });
              return true;
          }
      }
      return false;
  };
  
  const customerLogout = () => {
      setActiveCustomer(null);
      setCustomerOrders([]);
  };

    useEffect(() => {
    if (!activeCustomer) return;
    let isInitialLoad = true;
    
    // Request permission if not already granted
    if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission();
    }

    // Realtime listener for tracked orders
    const q = query(collection(db, 'orders'), where('customerPhone', '==', activeCustomer.phone));
    const unsub = onSnapshot(q, snap => {
        if (!isInitialLoad) {
            snap.docChanges().forEach(change => {
                if (change.type === 'modified') {
                    const order = change.doc.data() as Order;
                    if (order.email?.toLowerCase() === activeCustomer.email) {
                        // Play sound for all status updates
                        const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
                        audio.play().catch(() => {});

                        if ('Notification' in window && Notification.permission === 'granted') {
                            new Notification('Order Status Updated', {
                                body: `Your order status for ${order.id.substring(0,6)} is now: ${order.status}`,
                                icon: '/favicon.svg'
                            });
                        } else {
                            // Fallback to alert if permission denied but user is active on page
                            alert(`Order Status Updated: Your order is now ${order.status}`);
                        }
                    }
                }
            });
        }
        isInitialLoad = false;

        const results = snap.docs
            .map(d => ({ id: d.id, ...d.data() } as Order))
            .filter(o => o.email?.toLowerCase() === activeCustomer.email);
        
        // Sort by createdAt DESC in memory
        setCustomerOrders(results.sort((a, b) => b.createdAt - a.createdAt));
    });
    return () => unsub();
  }, [activeCustomer]);
  
  const addCoupon = async (data: Omit<Coupon, 'id' | 'createdAt'>) => {
    const couponData = {
      ...data,
      createdAt: Date.now(),
      vendorId: userData?.role === UserRole.Vendor ? userData.uid : (data.vendorId || null)
    };
    const docRef = await addDoc(collection(db, 'coupons'), couponData);
    const newCoupon = { id: docRef.id, ...couponData };
    const updated = [newCoupon, ...coupons];
    setCoupons(updated);
    await syncCatalogBundle({ coupons: updated });
  };
  const updateCoupon = async (data: Coupon) => {
    await setDoc(doc(db, 'coupons', data.id), data);
    const updated = coupons.map(c => c.id === data.id ? data : c);
    setCoupons(updated);
    await syncCatalogBundle({ coupons: updated });
  };
  const deleteCoupon = async (id: string) => {
    await deleteDoc(doc(db, 'coupons', id));
    const updated = coupons.filter(c => c.id !== id);
    setCoupons(updated);
    await syncCatalogBundle({ coupons: updated });
  };

  const loadCatalog = useCallback(async (forceRefresh = false) => {
    setIsLoading(true);

    // 1. Session Storage check: Instant load with ZERO Firestore reads for the session!
    if (!forceRefresh) {
      try {
        const cached = sessionStorage.getItem(CATALOG_SESSION_CACHE_KEY);
        if (cached) {
          const parsed = JSON.parse(cached);
          if (parsed && Array.isArray(parsed.products)) {
            applyBundleData(parsed);
            setIsLoading(false);
            return; // 0 FIRESTORE READS!
          }
        }
      } catch (e) {
        console.warn("Session cache read error:", e);
      }
    }

    // 2. Exactly ONE read from Firestore for the entire store visit!
    try {
      const bundleSnap = await getDoc(doc(db, 'settings', 'catalog_bundle'));
      if (bundleSnap.exists()) {
        const bundleData = bundleSnap.data() as CatalogBundle;
        applyBundleData(bundleData);
        try {
          sessionStorage.setItem(CATALOG_SESSION_CACHE_KEY, safeJsonStringify(bundleData));
        } catch (e) {}
        setIsLoading(false);
        return; // EXACTLY 1 FIRESTORE READ FOR THE ENTIRE STORE!
      }
    } catch (err) {
      console.warn("Could not fetch catalog_bundle doc, falling back to one-time collection fetch:", err);
    }

    // 3. Fallback: If catalog_bundle doc has not yet been initialized in Firestore
    try {
      const [settingsSnap, productsSnap, couponsSnap, bannersSnap, challansSnap, updatesSnap, vendorsSnap] = await Promise.all([
        getDoc(doc(db, 'settings', 'main')),
        getDocs(query(collection(db, 'products'), orderBy('createdAt', 'desc'))),
        getDocs(query(collection(db, 'coupons'), orderBy('createdAt', 'desc'))),
        getDocs(query(collection(db, 'banners'), orderBy('createdAt', 'desc'))),
        getDocs(query(collection(db, 'challans'), orderBy('createdAt', 'desc'))),
        getDocs(query(collection(db, 'updatePosts'), orderBy('createdAt', 'desc'))),
        getDocs(query(collection(db, 'users'), where('role', '==', UserRole.Vendor)))
      ]);

      const loadedSettings = settingsSnap.exists() ? (settingsSnap.data() as Settings) : null;
      const loadedProducts = productsSnap.docs.map(d => ({ id: d.id, ...d.data() } as Product));
      const loadedCoupons = couponsSnap.docs.map(d => ({ id: d.id, ...d.data() } as Coupon));
      const loadedBanners = bannersSnap.docs.map(d => ({ id: d.id, ...d.data() } as Banner));
      const loadedChallans = challansSnap.docs.map(d => ({ id: d.id, ...d.data() } as Challan));
      const loadedUpdates = updatesSnap.docs.map(d => ({ id: d.id, ...d.data() } as UpdatePost));
      
      const vStatus: Record<string, string> = {};
      const vMap: Record<string, AppUser> = {};
      vendorsSnap.docs.forEach(d => {
        const u = d.data() as AppUser;
        vStatus[d.id] = u.status;
        vMap[d.id] = { ...u, uid: d.id };
      });

      const compiledBundle: CatalogBundle = {
        products: loadedProducts,
        settings: loadedSettings,
        banners: loadedBanners,
        coupons: loadedCoupons,
        updatePosts: loadedUpdates,
        challans: loadedChallans,
        vendorsStatus: vStatus,
        vendorsMap: vMap,
        lastUpdated: Date.now()
      };

      applyBundleData(compiledBundle);
      try {
        sessionStorage.setItem(CATALOG_SESSION_CACHE_KEY, safeJsonStringify(compiledBundle));
      } catch (e) {}

      // Write bundle so all future visits only take 1 read
      try {
        await setDoc(doc(db, 'settings', 'catalog_bundle'), sanitizeForFirestore(compiledBundle), { merge: true });
      } catch (writeErr) {
        // Ignored if permissions don't allow unauth write
      }
    } catch (fallbackErr) {
      console.error("Error loading fallback catalog:", fallbackErr);
    } finally {
      setIsLoading(false);
    }
  }, [applyBundleData]);

  const refreshCatalog = useCallback(async () => {
    await loadCatalog(true);
  }, [loadCatalog]);

  const addBanner = async (data: Omit<Banner, 'id' | 'createdAt'>) => {
    const bannerData = { ...data, createdAt: Date.now() };
    const docRef = await addDoc(collection(db, 'banners'), bannerData);
    const newBanner = { id: docRef.id, ...bannerData };
    const updated = [newBanner, ...banners];
    setBanners(updated);
    await syncCatalogBundle({ banners: updated });
  };
  const updateBanner = async (data: Banner) => {
    await setDoc(doc(db, 'banners', data.id), data);
    const updated = banners.map(b => b.id === data.id ? data : b);
    setBanners(updated);
    await syncCatalogBundle({ banners: updated });
  };
  const deleteBanner = async (banner: Banner) => {
    if(banner.imageUrl) await deleteFile(banner.imageUrl);
    await deleteDoc(doc(db, 'banners', banner.id));
    const updated = banners.filter(b => b.id !== banner.id);
    setBanners(updated);
    await syncCatalogBundle({ banners: updated });
  };

  const addChallan = async (data: Omit<Challan, 'id' | 'createdAt'>) => {
    const challanData = { ...data, createdAt: Date.now() };
    const docRef = await addDoc(collection(db, 'challans'), challanData);
    const newChallan = { id: docRef.id, ...challanData };
    const updated = [newChallan, ...challans];
    setChallans(updated);
    await syncCatalogBundle({ challans: updated });
  };

  const deleteChallan = async (id: string) => {
    await deleteDoc(doc(db, 'challans', id));
    const updated = challans.filter(c => c.id !== id);
    setChallans(updated);
    await syncCatalogBundle({ challans: updated });
  };

  useEffect(() => {
    // 1-Read Visit Fetch: Loads bundle once per visit
    loadCatalog();

    let unsubOrders = () => {}, unsubChat = () => {}, unsubUserData = () => {};
    const unsubAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      unsubOrders(); unsubChat(); unsubUserData();
      if (currentUser) {
        let previousStatus: string | null = null;
        unsubUserData = onSnapshot(doc(db, 'users', currentUser.uid), (snap) => {
            if (snap.exists()) {
                const uData = snap.data() as AppUser;
                setUserData(uData);

                // Notify pending vendor on acceptance/approval
                if (previousStatus === 'pending' && uData.status === 'active') {
                    const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
                    audio.play().catch(() => {});
                    
                    if ('Notification' in window && Notification.permission === 'granted') {
                        new Notification('Account Approved!', {
                            body: `Congratulations ${uData.firstName}! Your vendor shop "${uData.shopName}" has been accepted. You can now access your dashboard.`,
                            icon: '/favicon.svg'
                        });
                    } else {
                        alert(`Congratulations! Your vendor shop "${uData.shopName}" has been accepted.`);
                    }
                }
                previousStatus = uData.status;
            } else {
                setUserData({
                    uid: currentUser.uid,
                    email: currentUser.email || '',
                    role: UserRole.Admin,
                    status: 'active',
                    createdAt: Date.now()
                });
            }
        });
        let isInitialOrdersLoad = true;
        
        // Admin notification permission
        if ('Notification' in window && Notification.permission === 'default') {
            Notification.requestPermission();
        }

        unsubOrders = onSnapshot(query(collection(db, 'orders'), orderBy('createdAt', 'desc')), (snap) => {
            if (!isInitialOrdersLoad) {
                snap.docChanges().forEach(change => {
                    if (change.type === 'added') {
                        const order = change.doc.data() as Order;
                        const isVendor = userData?.role === UserRole.Vendor;
                        const isAdmin = !userData?.role || userData.role === UserRole.Admin;
                        
                        const isForThisVendor = isVendor && order.vendorIds?.includes(currentUser.uid);
                        const isForAdmin = isAdmin && (!order.vendorIds || order.vendorIds.length === 0 || order.vendorIds.includes('admin'));

                        if (isForThisVendor || isForAdmin) {
                            if ('Notification' in window && Notification.permission === 'granted') {
                                new Notification('New Order Received!', {
                                    body: `Order from ${order.customerName} for ${order.total.toLocaleString()} PKR.`,
                                    icon: '/favicon.svg'
                                });
                            } else {
                                const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
                                audio.play().catch(() => {});
                                alert(`New Order Received from ${order.customerName}!`);
                            }
                        }
                    }
                });
            }
            isInitialOrdersLoad = false;
            setOrders(snap.docs.map(d => ({ id: d.id, ...d.data() } as Order)));
        });
        unsubChat = onSnapshot(query(collection(db, "chatMessages"), orderBy("timestamp", "asc")), (snap) => setChatMessages(snap.docs.map(d => ({ id: d.id, ...d.data() } as ChatMessage))));
      } else { setOrders([]); setChatMessages([]); }
    });

    return () => {
      unsubOrders(); unsubChat(); unsubUserData(); unsubAuth();
    };
  }, [loadCatalog]);

  const value = {
    products, cart, orders, settings, chatMessages, coupons, banners, updatePosts,
    isLoading, error, user, userData, myProducts, myOrders, wishlist, activeCustomer, customerOrders,
    addToCart, removeFromCart, updateCartQuantity, clearCart,
    addProduct, updateProduct, deleteProduct, toggleProductVisibility, moveProduct, copyProduct,
    addOrder, updateOrderStatus, deleteOrder,
    sendChatMessage, sendAdminReply, deleteChatMessage,
    updateSettings, addCategory, deleteCategory, updateCategory, moveCategory, copyCategory,
    addUpdatePost, updateUpdatePost, deleteUpdatePost,
    toggleWishlist, uploadFile, deleteFile,
    login, register, vendorRegister, updateVendorProfile, logout, trackWithEmailAndPhone, customerLogout,
    addCoupon, updateCoupon, deleteCoupon, addBanner, updateBanner, deleteBanner,
    addChallan, deleteChallan,
    challans,
    vendorsMap,
    syncCatalogBundle,
    refreshCatalog
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};