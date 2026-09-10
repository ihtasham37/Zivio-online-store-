

import React, { Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import { Navbar } from './Navbar'; // This is now the slim Header
import { Footer } from './Footer'; // This is now the BottomNav
import { Spinner } from '../ui/Spinner';
import { lazyRetry } from '../../utils/lazyLoad';
import { PWAInstallBanner } from '../ui/PWAInstallBanner';

// Replace standard React.lazy with lazyRetry to automatically handle chunk load errors
const Home = lazyRetry(() => import('../../pages/Home'), 'Home');
const ProductDetail = lazyRetry(() => import('../../pages/ProductDetail'), 'ProductDetail');
const Cart = lazyRetry(() => import('../../pages/Cart'), 'Cart');
const Checkout = lazyRetry(() => import('../../pages/Checkout'), 'Checkout');
const OrderSuccess = lazyRetry(() => import('../../pages/OrderSuccess'), 'OrderSuccess');
const Wishlist = lazyRetry(() => import('../../pages/Wishlist'), 'Wishlist');
const TrackOrder = lazyRetry(() => import('../../pages/TrackOrder'), 'TrackOrder');
const Search = lazyRetry(() => import('../../pages/Search'), 'Search');
const CategoriesPage = lazyRetry(() => import('../../pages/CategoriesPage'), 'CategoriesPage');
const CategoryProductsPage = lazyRetry(() => import('../../pages/CategoryProductsPage'), 'CategoryProductsPage');
const MorePage = lazyRetry(() => import('../../pages/MorePage'), 'MorePage');
const BlogPage = lazyRetry(() => import('../../pages/BlogPage'), 'BlogPage');
const BlogPostPage = lazyRetry(() => import('../../pages/BlogPostPage'), 'BlogPostPage');
const CommunityPage = lazyRetry(() => import('../../pages/CommunityPage'), 'CommunityPage');
const VendorStore = lazyRetry(() => import('../../pages/VendorStore'), 'VendorStore');


const StoreLayout = () => {
  return (
    <div className="flex flex-col min-h-screen bg-gray-50 font-sans">
      <PWAInstallBanner />
      <Navbar />
      <main className="flex-grow container mx-auto px-4 py-4 pt-12 pb-20">
        <Suspense fallback={<div className="flex justify-center items-center h-96"><Spinner size="lg"/></div>}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/product/:id" element={<ProductDetail />} />
            <Route path="/cart" element={<Cart />} />
            <Route path="/checkout" element={<Checkout />} />
            <Route path="/order-success" element={<OrderSuccess />} />
            <Route path="/wishlist" element={<Wishlist />} />
            <Route path="/track-order" element={<TrackOrder />} />
            <Route path="/search" element={<Search />} />
            <Route path="/categories" element={<CategoriesPage />} />
            <Route path="/category/:categoryId" element={<CategoryProductsPage />} />
            <Route path="/more" element={<MorePage />} />
            <Route path="/blog" element={<BlogPage />} />
            <Route path="/blog/:postId" element={<BlogPostPage />} />
            <Route path="/community" element={<CommunityPage />} />
            <Route path="/store/:vendorId" element={<VendorStore />} />
          </Routes>
        </Suspense>
      </main>
      <Footer />
    </div>
  );
};

export default StoreLayout;