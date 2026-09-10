
import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { useStore } from '../hooks/useStore';
import { ProductCard } from '../components/ProductCard';
import { FullPageSpinner } from '../components/ui/Spinner';
import { MediaPreview } from '../components/ui/MediaPreview';
import { Icons } from '../components/icons/Icons';
import { Button } from '../components/ui/Button';
import { Coupon, Product } from '../types';
import { PopupBanners } from '../components/ui/PopupBanners';
import { SEO } from '../components/SEO';
import { formatCurrency } from '../utils/helpers';

const CouponBannerCard: React.FC<{coupon: Coupon}> = ({ coupon }) => (
    <div className="w-full h-full flex-shrink-0 bg-gradient-to-br from-fuchsia-600 to-orange-500 text-white flex flex-col items-center justify-center p-4 text-center">
        <div className="bg-white/20 p-2 rounded-full mb-1 backdrop-blur-sm">
            <Icons.ticket className="w-6 h-6" />
        </div>
        <h2 className="text-xl font-extrabold tracking-tight drop-shadow-md">{coupon.code}</h2>
        <p className="mt-0.5 text-xs font-medium opacity-90">{coupon.description}</p>
        <div className="mt-2 inline-block bg-white text-fuchsia-800 font-bold px-4 py-1 rounded-full shadow-lg text-[10px] uppercase tracking-wide">
            {coupon.discountType === 'percentage' ? `${coupon.discountValue}% OFF` : `Save ${coupon.discountValue}`}
            {coupon.minBill > 0 && ` on orders over ${coupon.minBill}`}
        </div>
    </div>
);

// New component for coupons shown in the product grid
const CouponGridCard: React.FC<{coupon: Coupon}> = ({ coupon }) => (
    <div className="group rounded-lg overflow-hidden shadow-md hover:shadow-xl flex flex-col bg-gradient-to-br from-pink-500 to-orange-400 text-white transition-all duration-300 h-full items-center justify-center p-4 text-center relative border-2 border-white/20">
         <div className="absolute top-2 left-2 bg-white/20 backdrop-blur-md px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider">
            Coupon
         </div>
         <Icons.ticket className="w-10 h-10 mb-2 opacity-90" />
         <h3 className="text-2xl font-black tracking-wider mb-1 border-2 border-dashed border-white/50 px-3 py-1 rounded-md bg-white/10">{coupon.code}</h3>
         <p className="text-sm font-medium leading-tight opacity-95 line-clamp-2 mb-3">{coupon.description}</p>
         <div className="bg-white text-pink-600 text-xs font-bold px-3 py-1.5 rounded-full shadow-sm">
            {coupon.discountType === 'percentage' ? `${coupon.discountValue}% OFF` : `FLAT OFF`}
         </div>
    </div>
);

// Compact card for vertical side columns
const SideProductCard: React.FC<{ product: Product }> = ({ product }) => {
    const discountPercent = product.oldPrice && product.oldPrice > product.price 
      ? Math.round(((product.oldPrice - product.price) / product.oldPrice) * 100) 
      : 0;

    return (
      <Link 
        to={`/product/${product.id}`} 
        className="group flex items-center gap-2 p-1.5 bg-white rounded-xl border border-rose-100 shadow-xs hover:shadow-md hover:border-rose-300 transition-all duration-200 shrink-0"
      >
        <div className="relative w-12 h-12 rounded-lg overflow-hidden bg-rose-50 shrink-0 border border-rose-100/50">
          <MediaPreview
            src={product.images?.[0]}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            controls={false}
            autoPlay={true}
            loop={true}
            muted={true}
          />
          {discountPercent > 0 && (
            <span className="absolute top-0.5 left-0.5 bg-rose-600 text-white text-[8px] font-bold px-1 py-0.2 rounded shadow-xs">
              -{discountPercent}%
            </span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="text-[11px] font-bold text-slate-800 truncate group-hover:text-rose-600 transition-colors">
            {product.name}
          </h4>
          <p className="text-[9px] text-slate-400 truncate">{product.category}</p>
          <div className="flex items-center gap-1 mt-0.5">
            <span className="text-xs font-black text-rose-700">{formatCurrency(product.price)}</span>
            {product.oldPrice && (
              <span className="text-[9px] text-slate-400 line-through">{formatCurrency(product.oldPrice)}</span>
            )}
          </div>
        </div>
      </Link>
    );
};

// Smooth vertical auto-scroll column for desktop screens
const VerticalScrollColumn: React.FC<{
  title: string;
  badge: string;
  products: Product[];
  reverse?: boolean;
}> = ({ title, badge, products, reverse = false }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el || products.length <= 2) return;

    let animationFrameId: number;
    let scrollPos = reverse ? el.scrollHeight / 2 : 0;

    const scrollStep = () => {
      if (reverse) {
        scrollPos -= 0.4;
        if (scrollPos <= 0) scrollPos = el.scrollHeight / 2;
      } else {
        scrollPos += 0.4;
        if (scrollPos >= el.scrollHeight / 2) scrollPos = 0;
      }
      el.scrollTop = scrollPos;
      animationFrameId = requestAnimationFrame(scrollStep);
    };

    animationFrameId = requestAnimationFrame(scrollStep);

    const onMouseEnter = () => cancelAnimationFrame(animationFrameId);
    const onMouseLeave = () => { animationFrameId = requestAnimationFrame(scrollStep); };

    el.addEventListener('mouseenter', onMouseEnter);
    el.addEventListener('mouseleave', onMouseLeave);

    return () => {
      cancelAnimationFrame(animationFrameId);
      if (el) {
        el.removeEventListener('mouseenter', onMouseEnter);
        el.removeEventListener('mouseleave', onMouseLeave);
      }
    };
  }, [products, reverse]);

  if (products.length === 0) return null;

  // Duplicate items for seamless infinite loop
  const displayList = [...products, ...products];

  return (
    <div className="flex flex-col h-full max-h-[220px] sm:max-h-[280px] lg:max-h-[300px] xl:max-h-[340px] bg-white/90 backdrop-blur-md rounded-2xl border border-rose-100 p-2 shadow-xs overflow-hidden">
      <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-rose-50">
        <span className="text-xs font-extrabold font-serif text-rose-900 tracking-tight">{title}</span>
        <span className="text-[9px] font-bold bg-rose-50 text-rose-700 border border-rose-200/60 px-2 py-0.5 rounded-full">
          {badge}
        </span>
      </div>

      <div
        ref={containerRef}
        className="flex-1 overflow-y-auto space-y-1.5 pr-0.5 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
      >
        {displayList.map((product, idx) => (
          <SideProductCard key={`${product.id}-${idx}`} product={product} />
        ))}
      </div>
    </div>
  );
};

// Helper function to chunk an array into smaller arrays of a specific size.
const chunk = <T,>(arr: T[], size: number): T[][] => {
    const chunkedArr: T[][] = [];
    if (!arr) return chunkedArr;
    for (let i = 0; i < arr.length; i += size) {
        chunkedArr.push(arr.slice(i, i + size));
    }
    return chunkedArr;
};

const Home = () => {
  const { products, settings, coupons, isLoading } = useStore();
  const [shuffledProducts, setShuffledProducts] = useState<Product[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  
  const touchStartX = useRef(0);
  const touchEndX = useRef(0);
  const intervalRef = useRef<number | null>(null);

  const banners = useMemo(() => {
    const imageBanners = settings?.bannerUrls || [];
    return imageBanners;
  }, [settings]);

  // Personalized Interest & Randomized Product Order on Page Load/Open
  useEffect(() => {
    const visible = products.filter(p => p.isVisible);
    if (visible.length === 0) return;

    // 1. Get saved user interests from localStorage
    let userInterests: Record<string, number> = {};
    try {
      const stored = localStorage.getItem('user_interests');
      if (stored) userInterests = JSON.parse(stored);
    } catch (e) {
      console.error("Interest storage read error", e);
    }

    // 2. Fisher-Yates shuffle for randomized order every single load
    const shuffle = <T,>(array: T[]): T[] => {
      const arr = [...array];
      for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
      }
      return arr;
    };

    const interestedCategories = Object.keys(userInterests).filter(cat => userInterests[cat] > 0);
    
    const interestMatches = visible.filter(p => interestedCategories.includes(p.category));
    const generalProducts = visible.filter(p => !interestedCategories.includes(p.category));

    const shuffledInterest = shuffle(interestMatches);
    const shuffledGeneral = shuffle(generalProducts);

    // Combine interested and general items randomly
    const finalMixed: Product[] = [];
    let i = 0, g = 0;
    while (i < shuffledInterest.length || g < shuffledGeneral.length) {
      if (i < shuffledInterest.length) finalMixed.push(shuffledInterest[i++]);
      if (i < shuffledInterest.length) finalMixed.push(shuffledInterest[i++]);
      if (g < shuffledGeneral.length) finalMixed.push(shuffledGeneral[g++]);
      if (g < shuffledGeneral.length) finalMixed.push(shuffledGeneral[g++]);
    }

    setShuffledProducts(finalMixed.length > 0 ? finalMixed : shuffle(visible));
  }, [products]);

  // Left & Right Side Columns (Top 4+ items for desktop)
  const leftSideProducts = useMemo(() => {
    return shuffledProducts.slice(0, 8);
  }, [shuffledProducts]);

  const rightSideProducts = useMemo(() => {
    return shuffledProducts.slice(8, 16);
  }, [shuffledProducts]);

  const displayItems = useMemo(() => {
    return shuffledProducts;
  }, [shuffledProducts]);
  
  // Chunk all displayable items into horizontally scrollable rows of 5.
  const productRows = useMemo(() => {
    return chunk(displayItems, 5);
  }, [displayItems]);

  const nextSlide = useCallback(() => {
    setCurrentIndex(prev => (prev === banners.length - 1 ? 0 : prev + 1));
  }, [banners.length]);
  
  const startSlider = useCallback(() => {
      if (intervalRef.current) {
          clearInterval(intervalRef.current);
      }
      intervalRef.current = window.setInterval(nextSlide, 4000);
  }, [nextSlide]);

  useEffect(() => {
    if (banners.length > 1) {
        startSlider();
        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    }
  }, [banners.length, startSlider]);

  const handleManualNav = (action: () => void) => {
      action();
      startSlider();
  }

  const prevSlide = () => {
    handleManualNav(() => setCurrentIndex(prev => (prev === 0 ? banners.length - 1 : prev - 1)));
  };
  
  const nextSlideManual = () => {
      handleManualNav(nextSlide);
  }
  
  const goToSlide = (index: number) => {
      handleManualNav(() => setCurrentIndex(index));
  }

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.targetTouches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.targetTouches[0].clientX;
  };

  const handleTouchEnd = () => {
    if (touchStartX.current - touchEndX.current > 50) {
        nextSlideManual();
    }
    if (touchStartX.current - touchEndX.current < -50) {
        prevSlide();
    }
  };

  if (isLoading && products.length === 0) {
    return <FullPageSpinner />;
  }

  return (
    <div className="space-y-6">
      <SEO 
        title="Online Shopping - Best Deals & Verified Products" 
        description={`Welcome to ${settings?.appName || 'Ali Cart'}. Discover a wide range of premium electronics, fashion, and everyday essentials with verified seller guarantees and fast nationwide shipping.`}
        keywords={['online store', 'ecommerce', 'best deals', 'discount coupons', 'shopping', settings?.appName || 'Ali Cart']}
        schema={[
            {
                "@context": "https://schema.org",
                "@type": "WebSite",
                "name": settings?.appName || "Ali Cart",
                "url": typeof window !== 'undefined' ? window.location.origin : '',
                "potentialAction": {
                    "@type": "SearchAction",
                    "target": `${typeof window !== 'undefined' ? window.location.origin : ''}/search?q={search_term_string}`,
                    "query-input": "required name=search_term_string"
                }
            },
            {
                "@context": "https://schema.org",
                "@type": "Organization",
                "name": settings?.appName || "Ali Cart",
                "url": typeof window !== 'undefined' ? window.location.origin : '',
                "logo": settings?.logoUrl || `${typeof window !== 'undefined' ? window.location.origin : ''}/favicon.svg`
            }
        ]}
      />

      {/* Desktop Hero Layout: Center Banner + Left/Right Vertical Scrolling Product Lists */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 lg:gap-4 items-stretch">
        {/* Left Vertical Scrolling Column (Desktop Only) */}
        <div className="hidden lg:block lg:col-span-3">
          <VerticalScrollColumn
            title="Recommended"
            badge="For You"
            products={leftSideProducts}
            reverse={false}
          />
        </div>

        {/* Center Banner Slider */}
        <div className="col-span-1 lg:col-span-6 flex flex-col justify-center">
          {banners.length > 0 && (
            <div className="relative w-full h-36 sm:h-48 md:h-56 lg:h-[300px] xl:h-[340px] overflow-hidden rounded-2xl shadow-md group border border-rose-100"
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
            >
              <div className="flex transition-transform duration-500 ease-in-out h-full" style={{ transform: `translateX(-${currentIndex * 100}%)` }}>
                  {banners.map((item, index) => (
                      <div key={index} className="w-full h-full flex-shrink-0">
                          {typeof item === 'string' ? (
                              <MediaPreview src={item} className="w-full h-full object-cover" autoPlay={true} loop={true} muted={true} controls={false} />
                          ) : (
                              <CouponBannerCard coupon={item as Coupon} />
                          )}
                      </div>
                  ))}
              </div>

               {banners.length > 1 && (
                <>
                  {/* Left Arrow */}
                  <button onClick={prevSlide} className="absolute top-1/2 -translate-y-1/2 left-2 bg-black/40 text-white p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/70">
                    <Icons.chevronLeft className="w-5 h-5" />
                  </button>
                  {/* Right Arrow */}
                  <button onClick={nextSlideManual} className="absolute top-1/2 -translate-y-1/2 right-2 bg-black/40 text-white p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/70">
                    <Icons.chevronRight className="w-5 h-5" />
                  </button>
                  {/* Dots */}
                  <div className="absolute bottom-2.5 left-1/2 -translate-x-1/2 flex gap-1.5">
                          {banners.map((_, index) => (
                              <button key={index} onClick={() => goToSlide(index)} className={`w-2 h-2 rounded-full transition-all ${index === currentIndex ? 'bg-white w-5' : 'bg-white/50 hover:bg-white/75'}`}></button>
                          ))}
                  </div>
                </>
               )}
            </div>
          )}
        </div>

        {/* Right Vertical Scrolling Column (Desktop Only) */}
        <div className="hidden lg:block lg:col-span-3">
          <VerticalScrollColumn
            title="Trending Deals"
            badge="Top Picks"
            products={rightSideProducts}
            reverse={true}
          />
        </div>
      </div>

      {/* Products Section */}
      <div>
        <h2 className="text-xl font-extrabold font-serif text-slate-900 mb-4 px-1 border-l-4 border-rose-600 pl-3">
            Our Baby & Kids Collection
        </h2>
        {productRows.length > 0 ? (
            <div className="space-y-4">
                {productRows.map((row, rowIndex) => (
                    <div key={`row-${rowIndex}`} className="flex overflow-x-auto gap-3 pb-3 -mx-4 px-4 cursor-grab active:cursor-grabbing [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                        {row.map((item, itemIndex) => {
                            const key = 'code' in item ? `row-${rowIndex}-coupon-${item.id}-${itemIndex}` : `row-${rowIndex}-product-${item.id}`;
                            // Responsive widths: 2.5 on mobile, 3 on sm, 4 on md, 5 on lg
                            const wrapperClasses = "w-2/5 sm:w-1/3 md:w-1/4 lg:w-1/5 flex-shrink-0";

                            return (
                                <div key={key} className={wrapperClasses}>
                                    {'code' in item ? (
                                        <CouponGridCard coupon={item as unknown as Coupon} />
                                    ) : (
                                        <ProductCard product={item as Product} />
                                    )}
                                </div>
                            );
                        })}
                    </div>
                ))}
            </div>
        ) : (
            <div className="text-center py-12 text-gray-500 bg-white rounded-lg shadow-sm">
                <Icons.search className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <h3 className="text-lg font-semibold">No products found</h3>
                <p className="text-sm">There are no products in the store yet.</p>
            </div>
        )}
      </div>
      <PopupBanners />
    </div>
  );
};

export default Home;
