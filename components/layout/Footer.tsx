import React from 'react';
import { NavLink } from 'react-router-dom';
import { Icons } from '../icons/Icons';
import { useStore } from '../../hooks/useStore';

const NavItem = ({ to, icon: Icon, label }: { to: string; icon: React.ComponentType<any>; label: string }) => {
  const { cart } = useStore();
  const cartItemCount = cart.reduce((acc, item) => acc + item.quantity, 0);

  return (
    <NavLink
      to={to}
      end={to === "/"} // ensure exact match only for home route
      className={({ isActive }) =>
        `flex flex-col items-center justify-center gap-0.5 w-full pt-1.5 pb-1 transition-all relative ${
          isActive ? 'text-rose-700 font-bold' : 'text-slate-400 hover:text-rose-600'
        }`
      }
    >
      {({ isActive }) => (
        <>
          <div className="relative">
            <Icon className={`w-5 h-5 transition-transform ${isActive ? 'scale-110 text-rose-700' : ''}`} />
            {label === 'Cart' && cartItemCount > 0 && (
              <span className="absolute -top-1.5 -right-2.5 bg-gradient-to-r from-rose-600 to-amber-500 text-white text-[10px] font-black w-4 h-4 rounded-full flex items-center justify-center ring-2 ring-white shadow-xs">
                {cartItemCount}
              </span>
            )}
          </div>
          <span className="text-[10px] tracking-tight">{label}</span>
          {isActive && (
            <span className="w-1 h-1 rounded-full bg-rose-600 mt-0.5" />
          )}
        </>
      )}
    </NavLink>
  );
};

export const Footer = () => {
  return (
    <footer className="fixed bottom-0 left-0 right-0 z-30 h-14 bg-white/95 backdrop-blur-md border-t border-rose-100 shadow-[0_-2px_15px_rgba(244,63,94,0.06)]">
      <nav className="container mx-auto h-full flex justify-around items-center px-1">
        <NavItem to="/" icon={Icons.home} label="Home" />
        <NavItem to="/categories" icon={Icons.category} label="Collections" />
        <NavItem to="/cart" icon={Icons.shoppingCart} label="Cart" />
        <NavItem to="/track-order" icon={Icons.package} label="Track Order" />
        <NavItem to="/more" icon={Icons.more} label="More" />
      </nav>
    </footer>
  );
};
