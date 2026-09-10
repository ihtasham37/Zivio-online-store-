import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Product } from '../types';
import { formatCurrency } from '../utils/helpers';
import { MediaPreview } from './ui/MediaPreview';
import { useStore } from '../hooks/useStore';
import { Icons } from './icons/Icons';

interface ProductCardProps {
  product: Product;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product }) => {
  const { coupons, wishlist, toggleWishlist, settings } = useStore();
  
  if (!product) return null; // Safety guard

  const isInWishlist = useMemo(() => wishlist.includes(product.id), [wishlist, product.id]);

  const handleToggleWishlist = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toggleWishlist(product.id);
  };

  const hasProductDeals = useMemo(() => {
    const now = Date.now();
    return coupons.some(c => c.assignment === 'product' && c.validFrom <= now && c.validTo >= now);
  }, [coupons]);

  const discountPercent = product.oldPrice && product.oldPrice > product.price 
    ? Math.round(((product.oldPrice - product.price) / product.oldPrice) * 100) 
    : 0;

  const displayShopName = useMemo(() => {
    if (!product.vendorId) {
      return settings?.appName || 'Baby Boutique';
    }
    return product.shopName || 'Boutique';
  }, [product.vendorId, product.shopName, settings?.appName]);

  return (
    <Link 
      to={`/product/${product.id}`} 
      className="group rounded-2xl overflow-hidden shadow-xs hover:shadow-lg focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-rose-400 flex flex-col bg-white border border-rose-100/70 hover:border-rose-300 transition-all duration-300 active:scale-[0.98] h-full"
      aria-label={`View details for ${product.name}`}
    >
      <div className="relative aspect-square overflow-hidden bg-rose-50/40">
        <MediaPreview
          src={product.images?.[0]}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-108"
          controls={false}
          autoPlay={true}
          loop={true}
          muted={true}
        />
        
        {/* Wishlist Button */}
        <button 
            onClick={handleToggleWishlist}
            aria-label={isInWishlist ? 'Remove from wishlist' : 'Add to wishlist'}
            className="absolute top-1.5 right-1.5 bg-white/80 hover:bg-white backdrop-blur-md rounded-full p-1.5 text-rose-500 hover:scale-110 shadow-xs transition-all z-10"
        >
            <Icons.diamond className={`w-3.5 h-3.5 transition-all ${isInWishlist ? 'fill-rose-500 stroke-rose-500' : 'fill-none stroke-rose-400'}`} />
        </button>

        {/* Badges Top Left */}
        <div className="absolute top-1.5 left-1.5 flex flex-col gap-1 z-10">
          {discountPercent > 0 && (
            <div className="bg-gradient-to-r from-rose-600 to-rose-700 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full w-fit shadow-xs">
              {discountPercent}% OFF
            </div>
          )}
          {hasProductDeals && (
            <div className="bg-gradient-to-r from-amber-500 to-amber-600 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full w-fit shadow-xs">
              ✨ DEAL
            </div>
          )}
        </div>
        
        {/* Free Delivery Bottom Left */}
        {product.freeDelivery && (
            <div className="absolute bottom-1.5 left-1.5 z-10">
                 <div className="bg-white/90 backdrop-blur-md text-rose-800 text-[8px] font-bold px-1.5 py-0.5 rounded-full shadow-xs border border-rose-200 flex items-center gap-1">
                    <Icons.package className="w-2.5 h-2.5 text-rose-600" />
                    <span>Free Delivery</span>
                 </div>
            </div>
        )}
      </div>
      
      <div className="p-2 sm:p-2.5 flex-grow flex flex-col justify-between space-y-1.5">
        <div>
            <h3 className="text-xs font-bold text-slate-800 group-hover:text-rose-700 transition-colors line-clamp-2 leading-snug">
              {product.name}
            </h3>
            <div className="flex justify-between items-center mt-1">
                <span className="text-[10px] text-rose-600 font-semibold bg-rose-50 px-1.5 py-0.2 rounded-full">
                  {product.category}
                </span>
                <span className="text-[9px] text-slate-400 font-medium truncate max-w-[80px]">
                  {displayShopName}
                </span>
            </div>
        </div>
        
        <div className="flex items-baseline gap-1.5 pt-0.5 border-t border-rose-50">
            <p className="text-sm font-black text-rose-800">{formatCurrency(product.price)}</p>
            {product.oldPrice && (
              <p className="text-[10px] text-slate-400 line-through font-medium">
                {formatCurrency(product.oldPrice)}
              </p>
            )}
        </div>
      </div>
    </Link>
  );
};
