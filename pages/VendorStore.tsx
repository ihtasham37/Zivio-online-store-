
import React, { useMemo, useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useStore } from '../hooks/useStore';
import { ProductCard } from '../components/ProductCard';
import { Spinner } from '../components/ui/Spinner';
import { Icons } from '../components/icons/Icons';
import { Button } from '../components/ui/Button';
import { db } from '../firebase';
import { doc, getDoc } from 'firebase/firestore';
import { AppUser } from '../types';
import { ImageWithFallback } from '../components/ui/ImageWithFallback';
import { SEO } from '../components/SEO';

const VendorStore = () => {
    const { vendorId } = useParams<{ vendorId: string }>();
    const { products, isLoading, vendorsMap } = useStore();
    const navigate = useNavigate();
    const [vendorData, setVendorData] = useState<AppUser | null>(null);
    const [fetchingVendor, setFetchingVendor] = useState(true);

    useEffect(() => {
        if (!vendorId) {
            setFetchingVendor(false);
            return;
        }
        if (vendorsMap && vendorsMap[vendorId]) {
            setVendorData(vendorsMap[vendorId]);
            setFetchingVendor(false);
            return;
        }
        const fetchVendor = async () => {
            setFetchingVendor(true);
            try {
                const docRef = doc(db, 'users', vendorId);
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    setVendorData(docSnap.data() as AppUser);
                }
            } catch (err) {
                console.error("Error fetching vendor:", err);
            } finally {
                setFetchingVendor(false);
            }
        };
        fetchVendor();
    }, [vendorId, vendorsMap]);

    const vendorProducts = useMemo(() => {
        return products.filter(p => p.vendorId === vendorId && p.isVisible);
    }, [products, vendorId]);

    if (isLoading || fetchingVendor) {
        return <div className="flex justify-center items-center h-96"><Spinner size="lg" /></div>;
    }

    if (!vendorData) {
        return (
            <div className="text-center py-16">
                <Icons.store className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                <h2 className="text-2xl font-bold text-gray-800">Store Not Found</h2>
                <Button onClick={() => navigate('/')} className="mt-4">Back to Homepage</Button>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <SEO 
                title={`${vendorData.shopName || 'Vendor Store'} - Official Store`}
                description={`Browse verified products and exclusive deals from ${vendorData.shopName || 'this vendor'}. Fast delivery and customer satisfaction guaranteed.`}
                image={vendorData.shopLogoUrl || vendorData.shopBannerUrl}
                schema={{
                    "@context": "https://schema.org",
                    "@type": "Store",
                    "name": vendorData.shopName || "Vendor Store",
                    "image": vendorData.shopLogoUrl,
                    "description": `Official online store for ${vendorData.shopName}`
                }}
            />
            {/* Store Header */}
            <div className="relative rounded-2xl overflow-hidden bg-white shadow-md border border-gray-100">
                {/* Banner */}
                <div className="h-32 sm:h-48 bg-gradient-to-r from-rose-600 via-rose-500 to-amber-500 relative">
                    {vendorData.shopBannerUrl && (
                        <ImageWithFallback src={vendorData.shopBannerUrl} className="w-full h-full object-cover" />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                </div>
                
                {/* Profile Info */}
                <div className="px-6 pb-6 pt-16 relative">
                    <div className="absolute -top-12 left-6">
                        <div className="w-24 h-24 rounded-2xl bg-white p-1 shadow-lg border border-rose-100 overflow-hidden">
                            <ImageWithFallback 
                                src={vendorData.shopLogoUrl || ''} 
                                fallbackSrc="/placeholder.svg"
                                className="w-full h-full object-cover rounded-xl"
                            />
                        </div>
                    </div>
                    
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                            <h1 className="text-2xl font-bold font-serif text-slate-900">{vendorData.shopName}</h1>
                            <div className="flex items-center gap-2 text-slate-500 text-sm mt-1">
                                <Icons.user className="w-4 h-4" />
                                <span>{vendorData.firstName} {vendorData.lastName}</span>
                                {vendorData.status === 'active' && (
                                    <span className="flex items-center gap-1 text-amber-600 font-bold ml-2">
                                        <Icons.checkCircle className="w-4 h-4" />
                                        Verified Business
                                    </span>
                                )}
                            </div>
                        </div>
                        
                        <div className="flex items-center gap-3">
                            {vendorData.whatsappNumber && (
                                <a 
                                    href={`https://wa.me/${vendorData.whatsappNumber}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl font-bold flex items-center gap-2 transition-colors shadow-sm"
                                >
                                    <Icons.whatsapp className="w-5 h-5" />
                                    WhatsApp
                                </a>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Products Grid */}
            <div>
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold font-serif text-slate-900 border-l-4 border-rose-600 pl-3">
                        Boutique Collection ({vendorProducts.length})
                    </h2>
                </div>

                {vendorProducts.length > 0 ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                        {vendorProducts.map(product => (
                            <ProductCard key={product.id} product={product} />
                        ))}
                    </div>
                ) : (
                    <div className="bg-white rounded-xl p-12 text-center shadow-sm border border-dashed border-gray-200">
                        <Icons.search className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                        <h3 className="text-lg font-semibold text-gray-800">No products yet</h3>
                        <p className="text-gray-500">This vendor hasn't added any products to their store yet.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default VendorStore;
