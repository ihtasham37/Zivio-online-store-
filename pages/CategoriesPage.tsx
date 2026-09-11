import React from 'react';
import { Link } from 'react-router-dom';
import { useStore } from '../hooks/useStore';
import { Icons } from '../components/icons/Icons';
import { Spinner } from '../components/ui/Spinner';
import { MediaPreview } from '../components/ui/MediaPreview';
import { SEO } from '../components/SEO';

const CategoriesPage = () => {
    const { settings, isLoading } = useStore();

    // Show only top-level categories (those without a parent)
    const topLevelCategories = settings?.categories?.filter(c => c.isVisible && !c.parentId) || [];

    if (isLoading && !settings) {
        return (
            <div className="flex justify-center items-center h-96">
                <Spinner size="lg" />
            </div>
        );
    }

    const categoriesSchema = {
        "@context": "https://schema.org",
        "@type": "ItemList",
        "itemListElement": topLevelCategories.map((category, index) => ({
            "@type": "ListItem",
            "position": index + 1,
            "name": category.name,
            "url": `${typeof window !== 'undefined' ? window.location.origin : ''}/category/${category.id}`
        }))
    };

    return (
        <div className="container mx-auto">
            <SEO 
                title="Browse Categories"
                description={`Explore all product categories at ${settings?.appName || 'Zivio'}. Find the best electronics, fashion, home goods, and more.`}
                schema={categoriesSchema}
                keywords={topLevelCategories.map(c => c.name)}
            />
            <h1 className="text-3xl font-bold text-gray-800 mb-6 text-center">All Categories</h1>

            {topLevelCategories.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                    {topLevelCategories.map(category => (
                        <Link
                            key={category.id}
                            to={`/category/${category.id}`}
                            className="group flex flex-col items-center justify-center p-4 bg-white rounded-lg shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300 border border-gray-100"
                        >
                            <div className="w-20 h-20 rounded-full mb-3 overflow-hidden bg-gray-100 flex items-center justify-center text-gray-400">
                                <MediaPreview 
                                    src={category.imageUrl || ''}
                                    className="w-full h-full"
                                    controls={false}
                                />
                            </div>
                            <span className="font-semibold text-center text-gray-700 group-hover:text-teal-600">{category.name}</span>
                        </Link>
                    ))}
                </div>
            ) : (
                <div className="text-center py-16 text-gray-500">
                    <Icons.search className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                    <h3 className="text-lg font-semibold">No Categories Found</h3>
                    <p className="text-sm">The store owner hasn't added any product categories yet.</p>
                </div>
            )}
        </div>
    );
};

export default CategoriesPage;