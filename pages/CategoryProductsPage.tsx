import React, { useMemo, useState, useEffect, useCallback, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useStore } from '../hooks/useStore';
import { ProductCard } from '../components/ProductCard';
import { Spinner } from '../components/ui/Spinner';
import { Icons } from '../components/icons/Icons';
import { MediaPreview } from '../components/ui/MediaPreview';
import { Product } from '../types';
import { SEO } from '../components/SEO';

const CategoryProductsPage = () => {
    const { categoryId } = useParams<{ categoryId: string }>();
    const { products, isLoading, settings } = useStore();
    const [shuffledProducts, setShuffledProducts] = useState<Product[]>([]);
    
    // State for banner slider
    const [currentIndex, setCurrentIndex] = useState(0);
    const intervalRef = useRef<number | null>(null);

    const allCategories = useMemo(() => settings?.categories || [], [settings]);
    
    const currentCategory = useMemo(() => {
        return allCategories.find(c => c.id === categoryId);
    }, [allCategories, categoryId]);

    const subCategories = useMemo(() => {
        return allCategories.filter(c => c.isVisible && c.parentId === categoryId);
    }, [allCategories, categoryId]);
    
    const isParentCategory = useMemo(() => currentCategory ? !currentCategory.parentId : false, [currentCategory]);

    const productsToShow = useMemo(() => {
        if (!currentCategory) return [];

        if (isParentCategory) {
            const descendantCategoryIdsOrNames = new Set<string>();
            const queue: string[] = [currentCategory.id];
            
            while(queue.length > 0) {
                const currentId = queue.shift()!;
                const children = allCategories.filter(c => c.parentId === currentId);
                for (const child of children) {
                    if(child.parentId) {
                        descendantCategoryIdsOrNames.add(child.name);
                        descendantCategoryIdsOrNames.add(child.id);
                    }
                    queue.push(child.id);
                }
            }
            return products.filter(p => p.isVisible && (descendantCategoryIdsOrNames.has(p.category) || p.category === currentCategory.id || p.category === currentCategory.name));
        }
        
        return products.filter(p => p.isVisible && (p.category === currentCategory.id || p.category === currentCategory.name));

    }, [products, currentCategory, allCategories, isParentCategory]);

    useEffect(() => {
        const shuffled = [...productsToShow];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        setShuffledProducts(shuffled);
    }, [productsToShow]);
    
    const banners = useMemo(() => currentCategory?.bannerImageUrls || [], [currentCategory]);

    const nextSlide = useCallback(() => {
        setCurrentIndex(prev => (prev === banners.length - 1 ? 0 : prev + 1));
    }, [banners.length]);

    useEffect(() => {
        if (banners.length > 1) {
            intervalRef.current = window.setInterval(nextSlide, 4000);
            return () => {
                if (intervalRef.current) clearInterval(intervalRef.current);
            };
        }
    }, [banners.length, nextSlide]);

    const parentCategory = useMemo(() => {
        if (!currentCategory?.parentId) return null;
        return allCategories.find(c => c.id === currentCategory.parentId);
    }, [allCategories, currentCategory]);

    if (isLoading && products.length === 0) {
        return <div className="flex justify-center items-center h-96"><Spinner size="lg" /></div>;
    }
    
    if (!currentCategory) {
        return <div className="text-center py-16 text-gray-500">Category not found.</div>
    }

    return (
        <div className="container mx-auto">
            <SEO 
                title={`${currentCategory.name} - Shop Collection`}
                description={`Browse ${currentCategory.name} products at ${settings?.appName || 'Zivio'}. Discover amazing discounts and quality assured products.`}
                keywords={[currentCategory.name, 'online shopping', 'deals']}
                schema={{
                    "@context": "https://schema.org",
                    "@type": "CollectionPage",
                    "name": currentCategory.name,
                    "description": `Shop all products in ${currentCategory.name}`
                }}
            />
            {banners.length > 0 && (
                 <div className="relative w-full h-40 md:h-56 rounded-xl overflow-hidden mb-4 shadow-lg group">
                    <div className="flex transition-transform duration-500 ease-in-out h-full" style={{ transform: `translateX(-${currentIndex * 100}%)` }}>
                        {banners.map((url, index) => (
                             <div key={index} className="w-full h-full flex-shrink-0">
                                <MediaPreview src={url} className="w-full h-full" autoPlay={true} loop={true} muted={true} controls={false} />
                             </div>
                        ))}
                    </div>
                    {banners.length > 1 && (
                        <>
                            <button onClick={() => setCurrentIndex(p => p === 0 ? banners.length-1 : p-1)} className="absolute top-1/2 -translate-y-1/2 left-2 bg-black/30 text-white p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"><Icons.chevronLeft className="w-5 h-5" /></button>
                            <button onClick={() => setCurrentIndex(p => p === banners.length-1 ? 0 : p+1)} className="absolute top-1/2 -translate-y-1/2 right-2 bg-black/30 text-white p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"><Icons.chevronRight className="w-5 h-5" /></button>
                            <div className="absolute bottom-2.5 left-1/2 -translate-x-1/2 flex gap-1.5">
                                {banners.map((_, index) => ( <button key={index} onClick={() => setCurrentIndex(index)} className={`w-2 h-2 rounded-full transition-all ${index === currentIndex ? 'bg-white w-5' : 'bg-white/50'}`}></button> ))}
                            </div>
                        </>
                    )}
                </div>
            )}
            <div className="mb-4">
                <Link to={parentCategory ? `/category/${parentCategory.id}` : "/categories"} className="text-sm text-gray-600 hover:text-teal-600 hover:underline">
                    Back to {parentCategory ? parentCategory.name : 'All Categories'}
                </Link>
            </div>
            <h1 className="text-3xl font-bold text-gray-800 mb-4 text-center">{currentCategory.name}</h1>
            
            {subCategories.length > 0 && (
                <div className="mb-6">
                    <h2 className="text-xl font-bold text-gray-700 mb-3">Sub-categories</h2>
                    <div className="grid grid-cols-4 sm:grid-cols-3 md:grid-cols-4 gap-4">
                         {subCategories.map(subCat => (
                              <Link key={subCat.id} to={`/category/${subCat.id}`} className="group flex flex-col items-center justify-center p-3 bg-white rounded-lg shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300 border">
                                 <div className="w-16 h-16 rounded-full mb-2 overflow-hidden bg-gray-100">
                                     <MediaPreview src={subCat.imageUrl || ''} className="w-full h-full" controls={false} />
                                 </div>
                                 <span className="font-semibold text-sm text-center text-gray-700 group-hover:text-teal-600">{subCat.name}</span>
                             </Link>
                         ))}
                    </div>
                </div>
            )}

            {shuffledProducts.length > 0 && (
                <div className={subCategories.length > 0 ? "border-t pt-6" : ""}>
                    <h2 className="text-xl font-bold text-gray-700 mb-3">{isParentCategory ? 'Products in This Collection' : 'Products'}</h2>
                    <div className="flex overflow-x-auto gap-3 pb-3 -mx-4 px-4 cursor-grab active:cursor-grabbing [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                        {shuffledProducts.map(product => (
                            <div key={product.id} className="w-2/5 sm:w-1/3 md:w-1/4 lg:w-1/5 flex-shrink-0">
                                <ProductCard product={product} />
                            </div>
                        ))}
                    </div>
                </div>
            )}
            
            {subCategories.length === 0 && productsToShow.length === 0 && (
                 <div className="text-center py-16 text-gray-500">
                    <Icons.search className="w-16 h-16 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold">Nothing here yet</h3>
                    <p>There are no sub-categories or products in "{currentCategory.name}".</p>
                </div>
            )}
        </div>
    );
};

export default CategoryProductsPage;