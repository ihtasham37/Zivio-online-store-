import React, { useState, useMemo, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useStore } from '../hooks/useStore';
import { formatCurrency, safeJsonStringify } from '../utils/helpers';
import { Button } from '../components/ui/Button';
import { Spinner } from '../components/ui/Spinner';
import { MediaPreview } from '../components/ui/MediaPreview';
import { ProductCard } from '../components/ProductCard';
import { Icons } from '../components/icons/Icons';
import { Textarea } from '../components/ui/Textarea';
import { Accordion } from '../components/ui/Accordion';
import { Product, AppUser } from '../types';
import { db } from '../firebase';
import { doc, getDoc } from 'firebase/firestore';
import { ImageWithFallback } from '../components/ui/ImageWithFallback';
import { SEO } from '../components/SEO';
import { Breadcrumbs } from '../components/ui/Breadcrumbs';

const ProductCarouselRow: React.FC<{ products: Product[] }> = ({ products }) => {
    if (products.length === 0) return null;

    return (
        <div className="flex overflow-x-auto gap-3 pb-3 -mx-4 px-4 cursor-grab active:cursor-grabbing [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
            {products.map(product => (
                <div key={product.id} className="w-2/5 sm:w-1/3 md:w-1/4 lg:w-1/5 flex-shrink-0">
                    <ProductCard product={product} />
                </div>
            ))}
        </div>
    );
};

const ProductDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { products, addToCart, isLoading, settings, wishlist, toggleWishlist, coupons, vendorsMap } = useStore();
  const [quantity, setQuantity] = useState(1);
  const [mainImage, setMainImage] = useState<string | null>(null);
  const [selectedSizes, setSelectedSizes] = useState<Record<string, string>>({});
  const [sizeError, setSizeError] = useState('');
  const [additionalInfo, setAdditionalInfo] = useState('');
  const [showShareMenu, setShowShareMenu] = useState(false);

  const product = useMemo(() => products.find(p => p.id === id), [products, id]);
  const [vendorData, setVendorData] = useState<AppUser | null>(null);

  const applicableCoupons = useMemo(() => {
    if (!product) return [];
    const now = Date.now();
    return coupons.filter(c => {
      const isVendorMatch = product.vendorId ? c.vendorId === product.vendorId : !c.vendorId;
      const isValid = c.validFrom <= now && c.validTo >= now;
      return isVendorMatch && isValid;
    });
  }, [coupons, product]);

  useEffect(() => {
    if (!product?.vendorId) {
      setVendorData(null);
      return;
    }
    // Check vendorsMap from 1-read bundle first
    if (vendorsMap && vendorsMap[product.vendorId]) {
      setVendorData(vendorsMap[product.vendorId]);
      return;
    }
    const fetchVendor = async () => {
      try {
        const docRef = doc(db, 'users', product.vendorId!);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setVendorData(docSnap.data() as AppUser);
        } else {
          setVendorData(null);
        }
      } catch (err) {
        console.error("Error fetching vendor:", err);
        setVendorData(null);
      }
    };
    fetchVendor();
  }, [product, vendorsMap]);

  const productSizeCategories = useMemo(() => product?.sizeCategories || [], [product]);
  const isInWishlist = useMemo(() => wishlist.includes(product?.id || ''), [wishlist, product]);

  const allOtherProducts = useMemo(() => {
    const otherProducts = products.filter(p => p.id !== id && p.isVisible);
    for (let i = otherProducts.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [otherProducts[i], otherProducts[j]] = [otherProducts[j], otherProducts[i]];
    }
    return otherProducts;
  }, [products, id]);

  const prioritizedProducts = useMemo(() => {
    if (!product) return [];
    
    const activeVendorId = product.vendorId || 'admin';
    
    // Tier 1: Same category & same store/vendor
    const tier1 = allOtherProducts.filter(
      p => p.category === product.category && (p.vendorId || 'admin') === activeVendorId
    );
    
    // Tier 2: Same category & different store/vendor
    const tier2 = allOtherProducts.filter(
      p => p.category === product.category && (p.vendorId || 'admin') !== activeVendorId
    );
    
    // Tier 3: Different category & same store/vendor
    const tier3 = allOtherProducts.filter(
      p => p.category !== product.category && (p.vendorId || 'admin') === activeVendorId
    );
    
    // Tier 4: Different category & different store/vendor
    const tier4 = allOtherProducts.filter(
      p => p.category !== product.category && (p.vendorId || 'admin') !== activeVendorId
    );
    
    return [...tier1, ...tier2, ...tier3, ...tier4];
  }, [allOtherProducts, product]);

  const productRows = useMemo(() => {
    if (!product || prioritizedProducts.length === 0) return [];
    
    const row1 = prioritizedProducts.slice(0, 10);
    const row2 = prioritizedProducts.slice(10, 20);
    const row3 = prioritizedProducts.slice(20, 30);
    
    return [row1, row2, row3].filter(row => row.length > 0);
  }, [prioritizedProducts, product]);


  useEffect(() => {
    if (product) {
      setMainImage(product.images?.[0] || null);
      setSelectedSizes({});
      setAdditionalInfo('');
      setQuantity(1);
      window.scrollTo(0, 0);

      // Record user interest for personalized recommendations
      if (product.category) {
        try {
          const stored = localStorage.getItem('user_interests') || '{}';
          const interests = JSON.parse(stored);
          interests[product.category] = (interests[product.category] || 0) + 1;
          localStorage.setItem('user_interests', safeJsonStringify(interests));
        } catch (e) {
          // ignore storage errors
        }
      }
    }
  }, [product]);

  if (isLoading && !product) {
    return <div className="flex justify-center items-center h-96"><Spinner size="lg" /></div>;
  }

  if (!product) {
    return (
      <div className="text-center py-16">
        <h2 className="text-2xl font-bold">Product not found</h2>
        <Button onClick={() => navigate('/')} className="mt-4">Go to Homepage</Button>
      </div>
    );
  }

  const handleSizeChange = (categoryName: string, size: string) => {
    setSelectedSizes(prev => ({...prev, [categoryName]: size}));
    setSizeError('');
  }

  const validateSizes = () => {
    if (product?.sizeCategories && product.sizeCategories.length > 0) {
      if (Object.keys(selectedSizes).length !== product.sizeCategories.length) {
        setSizeError('Please select an option for each size category.');
        return false;
      }
    }
    return true;
  }
  
  const handleAddToCart = () => {
      if (!validateSizes()) return;
      setSizeError('');
      addToCart(product, quantity, selectedSizes, additionalInfo);
  };

  const handleBuyNow = () => {
      if (!validateSizes()) return;
      setSizeError('');
      addToCart(product, quantity, selectedSizes, additionalInfo);
      navigate('/checkout');
  }

  const handleToggleWishlist = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (product) {
      toggleWishlist(product.id);
    }
  };

  const copyProductLink = () => {
    navigator.clipboard.writeText(window.location.href);
    alert('Product link copied to clipboard!');
    setShowShareMenu(false);
  };

  const whatsappNumber = vendorData?.whatsappNumber || settings?.whatsappNumber;
  const whatsappMessage = `Hello! I’m interested in this product: ${product.name} - ${window.location.href}`;
  const whatsappLink = whatsappNumber ? `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(whatsappMessage)}` : '#';
  const shippingFeeText = typeof product.shippingFee === 'number' ? formatCurrency(product.shippingFee) : 'Calculated at checkout';

  return (
    <div className="container mx-auto" key={id}>
      <SEO 
        title={product.name} 
        description={product.description || `Buy ${product.name} at ${settings?.appName || 'Zivio'}. Price: ${formatCurrency(product.price)}.`}
        image={product.images?.[0]}
        schema={{
            "@context": "https://schema.org",
            "@type": "Product",
            "name": product.name,
            "image": product.images || [],
            "description": product.description,
            "sku": product.id,
            "offers": {
                "@type": "Offer",
                "url": window.location.href,
                "priceCurrency": "PKR",
                "price": product.price,
                "availability": "https://schema.org/InStock",
                "seller": {
                    "@type": "Organization",
                    "name": product.shopName || settings?.appName || "Zivio"
                }
            }
        }}
      />
      
      <Breadcrumbs items={[
          { label: product.category, href: `/categories` }, // Simplified for now
          { label: product.name, href: `/product/${product.id}` }
      ]} />

      <div className="bg-white p-2 sm:p-3 rounded-lg shadow-md mb-20 md:mb-0">
        {/* Shop Header Banner & Logo - Compact & Attractive on Mobile */}
        <div 
          onClick={() => product.vendorId ? navigate(`/store/${product.vendorId}`) : navigate('/')}
          className="relative h-14 sm:h-20 md:h-24 rounded-2xl overflow-hidden mb-3.5 bg-gradient-to-r from-rose-700 via-rose-600 to-amber-600 shadow-sm border border-rose-100 cursor-pointer hover:shadow-md transition-all group"
          role="button"
          aria-label="Visit store"
        >
          {(product.vendorId ? vendorData?.shopBannerUrl : (settings?.storeBannerUrl || settings?.bannerUrls?.[0])) && (
            <ImageWithFallback 
              src={product.vendorId ? (vendorData?.shopBannerUrl || '') : (settings?.storeBannerUrl || settings?.bannerUrls?.[0] || '')} 
              className="absolute inset-0 w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500" 
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/40 to-black/25 backdrop-blur-[0.5px]" />
          
          <div className="relative h-full px-3 sm:px-4 flex items-center justify-between">
            <div className="flex items-center gap-2.5 sm:gap-3.5 min-w-0">
              <div className="w-9 h-9 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl border-2 border-white/90 bg-white overflow-hidden shadow-sm flex items-center justify-center shrink-0">
                {product.vendorId ? (
                  vendorData?.shopLogoUrl ? (
                    <ImageWithFallback src={vendorData.shopLogoUrl} className="w-full h-full object-cover" />
                  ) : (
                    <Icons.store className="w-4 h-4 sm:w-6 sm:h-6 text-rose-600" />
                  )
                ) : (
                  settings?.logoUrl ? (
                    <ImageWithFallback src={settings.logoUrl} className="w-full h-full object-cover" />
                  ) : (
                    <Icons.store className="w-4 h-4 sm:w-6 sm:h-6 text-rose-600" />
                  )
                )}
              </div>
              <div className="text-white min-w-0">
                <div className="flex items-center gap-1.5">
                  <h2 className="text-xs sm:text-base font-bold tracking-tight truncate drop-shadow-xs font-serif">
                    {product.vendorId ? (product.shopName || 'Vendor') : (settings?.appName || 'Official Store')}
                  </h2>
                  {(!product.vendorId || vendorData?.status === 'active') && (
                    <Icons.checkCircle className="w-3.5 h-3.5 text-amber-300 fill-amber-400/20 shrink-0" />
                  )}
                </div>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="text-[9px] sm:text-[11px] bg-white/20 text-white px-2 py-0.2 rounded-full font-medium backdrop-blur-xs">
                    {!product.vendorId ? 'Official Store' : 'Verified Business'}
                  </span>
                </div>
              </div>
            </div>

            <div className="shrink-0 pl-2">
              <span className="inline-flex items-center gap-1 text-[10px] sm:text-xs font-bold text-rose-900 bg-white/95 hover:bg-white px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full shadow-xs backdrop-blur-md group-hover:bg-white group-hover:scale-105 transition-all">
                <span>Visit Store</span>
                <span className="text-rose-600">&rarr;</span>
              </span>
            </div>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-2">
          {/* Image Gallery */}
          <div className="space-y-1 max-w-[280px] mx-auto md:max-w-none">
            <div className="relative">
                <div className="border border-rose-100 rounded-2xl overflow-hidden aspect-square shadow-sm bg-white">
                  <MediaPreview 
                    key={mainImage} 
                    src={mainImage || product.images?.[0]} 
                    className="w-full h-full" 
                  />
                </div>
                 <button 
                    onClick={handleToggleWishlist}
                    title={isInWishlist ? "Remove from Wishlist" : "Add to Wishlist"}
                    aria-label={isInWishlist ? `Remove ${product.name} from wishlist` : `Add ${product.name} to wishlist`}
                    className="absolute top-2 right-2 bg-white/90 backdrop-blur-sm rounded-full p-2 text-slate-700 hover:text-rose-600 hover:scale-110 shadow-sm transition-all duration-200 z-10"
                >
                    <Icons.diamond className={`w-5 h-5 transition-all ${isInWishlist ? 'fill-rose-600 stroke-rose-600' : 'fill-none'}`} />
                </button>
            </div>
            {product.images && product.images.length > 1 && (
              <div className="grid grid-cols-5 gap-1.5 pt-1">
                {product.images.map((img, index) => (
                  <button 
                    key={index} 
                    onClick={() => setMainImage(img)} 
                    className={`flex-shrink-0 aspect-square border-2 rounded-xl overflow-hidden transition-all duration-200 focus:outline-none ring-offset-2 ring-rose-400 ${mainImage === img ? 'border-rose-600 scale-105 ring-2 shadow-xs' : 'border-rose-100 hover:border-rose-300'}`}
                    aria-label={`View media ${index + 1}`}
                  >
                    <MediaPreview src={img} className="w-full h-full" controls={false} />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Product Info */}
          <div className="flex flex-col space-y-2 p-0 sm:p-1">
            <div className="flex justify-between items-start relative">
              <span className="text-xs font-semibold text-rose-700 bg-rose-50 px-2.5 py-0.5 rounded-full border border-rose-100">{product.category}</span>
              
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => product.vendorId ? navigate(`/store/${product.vendorId}`) : navigate('/')}
                  className="flex flex-col items-end group"
                >
                    <div className="flex items-center gap-1 text-[10px] bg-rose-50 text-rose-800 px-2 py-0.5 rounded-full font-bold border border-rose-200/80 hover:bg-rose-100 transition-colors">
                      {product.vendorId ? (
                        vendorData?.shopLogoUrl ? (
                          <ImageWithFallback src={vendorData.shopLogoUrl} className="w-4 h-4 rounded-full object-cover" />
                        ) : (
                          <Icons.store className="w-3 h-3" />
                        )
                      ) : (
                        settings?.logoUrl ? (
                          <ImageWithFallback src={settings.logoUrl} className="w-4 h-4 rounded-full object-cover" />
                        ) : (
                          <Icons.store className="w-3 h-3" />
                        )
                      )}
                      {product.vendorId ? (product.shopName || 'Vendor') : (settings?.appName || 'Store')}
                    </div>
                    {(!product.vendorId || vendorData?.status === 'active') && (
                        <span className="text-[8px] text-slate-400 mt-0.5 uppercase tracking-wider">
                          {!product.vendorId ? 'Official Store' : 'Verified Business'}
                        </span>
                    )}
                </button>
                
                <div className="relative">
                  <button 
                    onClick={() => setShowShareMenu(!showShareMenu)}
                    className="p-1 text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    <Icons.moreVertical className="w-5 h-5" />
                  </button>
                  
                  {showShareMenu && (
                    <div className="absolute right-0 top-full mt-1 bg-white shadow-xl rounded-xl border border-rose-100 py-1 w-40 z-30">
                      <button 
                        onClick={copyProductLink}
                        className="w-full text-left px-3 py-2 text-xs flex items-center gap-2 hover:bg-rose-50 text-slate-700 font-medium"
                      >
                        <Icons.copy className="w-3.5 h-3.5 text-rose-600" />
                        Copy Link
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
            <h1 className="text-xl font-bold font-serif text-slate-900 tracking-tight">{product.name}</h1>
            
            <div className="flex items-baseline gap-2">
                <p className="text-2xl font-black text-rose-700 tracking-tight">{formatCurrency(product.price)}</p>
                {product.oldPrice && <p className="text-sm text-slate-400 line-through">{formatCurrency(product.oldPrice)}</p>}
            </div>

            {productSizeCategories.length > 0 && (
              <div className="space-y-1.5 pt-1">
                  {productSizeCategories.map(cat => (
                     <div key={cat.categoryName}>
                        <label className="block text-xs font-bold text-slate-800 mb-1">{cat.categoryName}:</label>
                        <div className="flex flex-wrap gap-1.5">
                          {cat.sizes.map(size => (
                            <button
                                key={size}
                                onClick={() => handleSizeChange(cat.categoryName, size)}
                                className={`px-3 py-1 text-xs font-bold rounded-xl border-2 flex items-center justify-center gap-1.5 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-rose-400 focus:ring-offset-1 ${
                                selectedSizes[cat.categoryName] === size
                                    ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                                    : 'bg-white text-slate-800 border-rose-100 hover:bg-rose-50 hover:border-rose-200'
                                }`}
                                >
                                {size}
                            </button>
                          ))}
                        </div>
                    </div>
                  ))}
                  {sizeError && <p className="mt-1.5 text-xs text-red-600 font-semibold">{sizeError}</p>}
              </div>
            )}


            <div className="pt-1">
                <label htmlFor="additionalInfo" className="block text-xs font-semibold text-slate-700 mb-0.5">Special Instructions / Customization (Optional)</label>
                <Textarea
                  id="additionalInfo"
                  name="additionalInfo"
                  value={additionalInfo}
                  onChange={e => setAdditionalInfo(e.target.value)}
                  rows={2}
                  placeholder="Enter baby size note, color preference or gift message..."
                  className="py-1.5 text-xs"
                />
            </div>
            
             <div className="flex items-center gap-3 pt-1">
              <label htmlFor="quantity" className="text-xs font-bold text-slate-800">Quantity:</label>
              <div className="flex items-center gap-2">
                <Button type="button" variant="ghost" size="sm" className="w-8 h-8 rounded-full bg-rose-50 hover:bg-rose-100 text-rose-800 transition-colors border border-rose-100" onClick={() => setQuantity(q => Math.max(1, q - 1))} aria-label="Decrease quantity">
                    <Icons.minus className="w-3.5 h-3.5" />
                </Button>
                <span id="quantity" className="text-base font-extrabold text-slate-900 w-8 text-center">{quantity}</span>
                <Button type="button" variant="ghost" size="sm" className="w-8 h-8 rounded-full bg-rose-50 hover:bg-rose-100 text-rose-800 transition-colors border border-rose-100" onClick={() => setQuantity(q => q + 1)} aria-label="Increase quantity">
                    <Icons.plus className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-4 border-t border-rose-100 pt-2">
          <Accordion title="Product Details">
              <div className="text-sm text-slate-700 space-y-2">
                <p><strong>Category:</strong> {product.category}</p>
                <div className="whitespace-pre-wrap">
                    {product.description || 'No details available.'}
                </div>
              </div>
          </Accordion>
          <Accordion title="Shipping & Returns">
               <div className="text-sm text-slate-700 space-y-2">
                  <p><strong>Shipping Fee:</strong> {shippingFeeText}</p>
                  {product.deliveryTime && <p><strong>Estimated Delivery:</strong> {product.deliveryTime}</p>}
                  {product.easyReturn && (
                      <div className="flex items-center gap-2 text-emerald-700 font-semibold">
                          <Icons.checkCircle className="w-4 h-4"/>
                          <span>Easy Return & Replacement Available</span>
                      </div>
                  )}
                  {product.returnPolicy && <p><strong>Return Policy:</strong> {product.returnPolicy}</p>}
                  {!product.easyReturn && !product.returnPolicy && <p>Standard return policy applies.</p>}
              </div>
          </Accordion>
        </div>
      
        <div className="sticky bottom-0 bg-white/95 backdrop-blur-md p-2.5 border-t border-rose-100 md:static md:mt-3 md:p-1 md:border-0 md:shadow-none shadow-[0_-4px_16px_rgba(244,63,94,0.08)] z-20 flex flex-col gap-2 rounded-2xl">
            <div className="flex gap-2">
                <Button 
                    onClick={handleAddToCart} 
                    size="sm" 
                    variant="outline"
                    className="flex-1 py-2.5 rounded-xl border-2 border-rose-300 text-rose-700 hover:bg-rose-50 font-bold"
                >
                    Add to Cart
                </Button>

                {(settings?.whatsappNumber || vendorData?.whatsappNumber) && (
                    <a 
                        href={whatsappLink} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="font-bold rounded-xl focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors duration-200 flex items-center justify-center gap-1.5 bg-emerald-600 text-white hover:bg-emerald-700 focus:ring-emerald-500 py-2 px-3 text-xs flex-1 shadow-xs"
                    >
                        <Icons.whatsapp className="w-4 h-4" />
                        <span>Order via WhatsApp</span>
                    </a>
                )}
            </div>
            
            <Button 
                onClick={handleBuyNow} 
                size="md" 
                variant="primary" 
                className="w-full py-3 rounded-xl font-extrabold text-base shadow-md"
            >
                Buy Now
            </Button>

            {/* Applicable Coupons */}
            {applicableCoupons.length > 0 && (
                <div className="mt-2">
                    <p className="text-[10px] font-bold text-rose-800 mb-1 px-1 uppercase tracking-wider">Available Baby Boutique Coupons</p>
                    <div className="flex overflow-x-auto gap-2 pb-1 scrollbar-hide">
                        {applicableCoupons.map(coupon => (
                            <div key={coupon.id} className="flex-shrink-0 bg-rose-50/80 border border-rose-200 rounded-xl p-2.5 flex flex-col min-w-[150px]">
                                <span className="text-rose-800 font-bold text-xs uppercase">{coupon.code}</span>
                                <span className="text-[10px] text-slate-600 line-clamp-1">{coupon.description}</span>
                                <div className="mt-1.5 flex items-center justify-between">
                                    <span className="text-[11px] font-black text-rose-700">
                                        {coupon.discountType === 'flat' ? `${coupon.discountValue} PKR Off` : `${coupon.discountValue}% Off`}
                                    </span>
                                    <button 
                                        onClick={() => {
                                            navigator.clipboard.writeText(coupon.code);
                                            alert('Coupon code copied!');
                                        }}
                                        className="text-[10px] bg-white border border-rose-300 text-rose-700 font-bold px-2 py-0.5 rounded-lg hover:bg-rose-600 hover:text-white transition-colors"
                                    >
                                        Copy
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
      </div>

      {productRows.length > 0 && (
        <div className="mt-4 pt-3 border-t">
          <h2 className="text-xl font-bold text-gray-800 mb-3 pl-1">We Also Recommend</h2>
          <div className="space-y-4">
            {productRows.map((products, index) => (
                <ProductCarouselRow key={index} products={products} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductDetail;