import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Icons } from '../icons/Icons';
import { useStore } from '../../hooks/useStore';
import { usePWAInstall } from '../../hooks/usePWAInstall';
import { safeLower, formatCurrency } from '../../utils/helpers';
import { MediaPreview } from '../ui/MediaPreview';

export const Navbar = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  
  const { wishlist, settings, products } = useStore();
  const { isInstalled } = usePWAInstall();
  const wishlistCount = wishlist.length;

  // Instant fast local search calculation as user types (0ms lag)
  const instantMatches = useMemo(() => {
    const raw = searchQuery.trim();
    if (!raw || products.length === 0) return [];
    const q = safeLower(raw);
    const tokens = q.split(/\s+/).filter(t => t.length > 0);

    return products
      .filter(p => p.isVisible)
      .map(p => {
        let score = 0;
        const name = safeLower(p.name);
        const cat = safeLower(p.category);
        const customId = safeLower(p.customId || '');
        const id = safeLower(p.id);

        if (customId === q || id === q) score += 1000;
        if (name.includes(q)) score += 500;
        if (cat.includes(q)) score += 300;
        
        tokens.forEach(t => {
          if (name.includes(t)) score += 100;
          if (cat.includes(t)) score += 80;
        });

        return { product: p, score };
      })
      .filter(item => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 5)
      .map(item => item.product);
  }, [searchQuery, products]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      setIsDropdownOpen(false);
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const handleSelectProduct = (productId: string) => {
    setIsDropdownOpen(false);
    setSearchQuery('');
    navigate(`/product/${productId}`);
  };

  const handleCategoryQuickSearch = (cat: string) => {
    setIsDropdownOpen(false);
    navigate(`/search?q=${encodeURIComponent(cat)}`);
  };

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="fixed top-0 left-0 right-0 z-40 h-14 bg-white/95 backdrop-blur-md border-b border-rose-100 shadow-xs transition-all">
      <div className="container mx-auto px-2 sm:px-4 flex justify-between items-center h-full gap-1.5 sm:gap-4">
        {/* Website Logo with Luxury Baby Branding */}
        <Link to="/" className="flex items-center gap-1 sm:gap-1.5 shrink-0 group">
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-gradient-to-tr from-rose-500 to-amber-400 p-0.5 shadow-xs flex items-center justify-center text-white shrink-0">
            <span className="text-xs sm:text-base font-bold">✨</span>
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-xs sm:text-base font-extrabold font-serif text-rose-800 tracking-tight group-hover:text-rose-600 transition-colors leading-none truncate max-w-[85px] sm:max-w-none">
              {settings?.appName || 'Baby Boutique'}
            </span>
            <span className="hidden xs:inline-block text-[8px] sm:text-[9px] font-semibold text-amber-700/90 uppercase tracking-wider leading-none mt-0.5">
              Luxury Kids Wear
            </span>
          </div>
        </Link>

        {/* Search Bar with Responsive Instant Suggestions Dropdown */}
        <div className="flex-1 min-w-0 max-w-xl relative" ref={searchContainerRef}>
          <form onSubmit={handleSearchSubmit} className="relative w-full">
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setIsDropdownOpen(true);
              }}
              onFocus={() => setIsDropdownOpen(true)}
              placeholder="Search baby clothes, ID..."
              className="w-full h-8.5 sm:h-10 pl-8 sm:pl-10 pr-8 sm:pr-10 rounded-full bg-rose-50/60 hover:bg-rose-50 focus:bg-white border border-rose-200 focus:border-rose-400 focus:outline-none focus:ring-2 focus:ring-rose-300/40 text-xs sm:text-sm text-slate-800 placeholder-rose-300 transition-all shadow-inner"
            />
            <div className="absolute inset-y-0 left-0 flex items-center pl-2.5 sm:pl-3 pointer-events-none text-rose-400">
              <Icons.search className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>

            {searchQuery.trim() && (
              <button
                type="submit"
                className="absolute inset-y-1 right-1 px-2 sm:px-2.5 bg-gradient-to-r from-rose-500 to-rose-600 hover:from-rose-600 hover:to-rose-700 text-white rounded-full text-[10px] sm:text-[11px] font-bold flex items-center gap-0.5 sm:gap-1 shadow-xs transition-transform active:scale-95"
              >
                <span>AI</span>
                <Icons.chevronRight className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
              </button>
            )}
          </form>

          {/* Instant Search Results Dropdown - Full width on Mobile, Contained on Desktop */}
          {isDropdownOpen && searchQuery.trim().length > 0 && (
            <div className="fixed inset-x-2.5 top-15 sm:absolute sm:inset-x-0 sm:top-full mt-1 sm:mt-1.5 w-auto sm:w-full max-w-xl mx-auto bg-white rounded-2xl border border-rose-100 shadow-2xl overflow-hidden z-50 animate-fade-in divide-y divide-rose-50 max-h-[80vh] flex flex-col">
              {/* Header */}
              <div className="p-2.5 bg-gradient-to-r from-rose-50 via-rose-50/80 to-amber-50/50 flex items-center justify-between text-xs shrink-0">
                <span className="font-bold text-rose-800 flex items-center gap-1.5">
                  <span>⚡ Instant Suggestions</span>
                  <span className="text-[10px] bg-rose-100 text-rose-700 px-1.5 py-0.2 rounded-full font-bold">
                    {instantMatches.length}
                  </span>
                </span>
                <button
                  type="button"
                  onClick={handleSearchSubmit}
                  className="text-[11px] font-bold text-rose-600 hover:text-rose-800 underline cursor-pointer"
                >
                  Deep AI Search &rarr;
                </button>
              </div>

              {/* Matches List */}
              {instantMatches.length > 0 ? (
                <div className="max-h-64 sm:max-h-72 overflow-y-auto p-1.5 space-y-1 overscroll-contain">
                  {instantMatches.map((product) => (
                    <div
                      key={product.id}
                      onClick={() => handleSelectProduct(product.id)}
                      className="flex items-center gap-2.5 p-2 rounded-xl hover:bg-rose-50/70 active:bg-rose-100/60 cursor-pointer transition-colors group"
                    >
                      <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-lg overflow-hidden bg-rose-50 shrink-0 border border-rose-100">
                        <MediaPreview
                          src={product.images?.[0]}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                          controls={false}
                          autoPlay={false}
                          muted={true}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-slate-800 truncate group-hover:text-rose-700">
                          {product.name}
                        </p>
                        <div className="flex items-center gap-1.5 mt-0.5 text-[10px] text-slate-500">
                          <span className="bg-rose-50 text-rose-700 px-1.5 py-0.2 rounded font-medium truncate max-w-[100px]">
                            {product.category}
                          </span>
                          {product.customId && (
                            <span className="font-mono text-slate-400 shrink-0">ID: {product.customId}</span>
                          )}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="text-xs font-black text-rose-700">
                          {formatCurrency(product.price)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-4 text-center text-xs text-slate-500 space-y-1">
                  <p className="font-medium">No direct keyword match found in catalog.</p>
                  <p className="text-[11px] text-rose-600 font-semibold">
                    Press Search to use Gemini AI semantic recommendations!
                  </p>
                </div>
              )}

              {/* Footer Quick Categories */}
              <div className="p-2 bg-slate-50 flex items-center gap-1.5 overflow-x-auto scrollbar-hide text-[11px] shrink-0">
                <span className="text-[10px] font-bold text-slate-400 uppercase shrink-0">Tags:</span>
                {['Rompers', 'Cotton Frock', 'Baby Suit', 'Newborn', '0-6M', '1-2Y'].map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => handleCategoryQuickSearch(tag)}
                    className="shrink-0 bg-white hover:bg-rose-100 text-rose-700 border border-rose-200 px-2 py-0.5 rounded-full font-medium transition-colors text-[10px]"
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
          {!isInstalled && (
            <button
              type="button"
              onClick={() => window.dispatchEvent(new CustomEvent('open-pwa-install-banner'))}
              className="flex items-center justify-center gap-1 text-xs font-bold bg-gradient-to-r from-rose-500 to-amber-500 hover:from-rose-600 hover:to-amber-600 text-white p-2 sm:px-3 sm:py-1.5 rounded-full shadow-xs transition-all active:scale-95"
              title="Install App on Device"
            >
              <Icons.download className="w-3.5 h-3.5" />
              <span className="hidden md:inline text-[11px]">Install</span>
            </button>
          )}

          {/* Wishlist Icon with Luxury Badge */}
          <Link
            to="/wishlist"
            className="relative p-1.5 sm:p-2 text-rose-700 hover:text-rose-800 hover:bg-rose-50 rounded-full transition-colors"
            aria-label="Wishlist"
          >
            <Icons.diamond className="w-5 h-5" />
            {wishlistCount > 0 && (
              <span className="absolute top-0 right-0 bg-rose-600 text-white text-[9px] font-black w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full flex items-center justify-center ring-2 ring-white">
                {wishlistCount}
              </span>
            )}
          </Link>
        </div>
      </div>
    </header>
  );
};
