
import React from 'react';
import { Helmet } from 'react-helmet-async';
import { useStore } from '../hooks/useStore';
import { safeJsonStringify } from '../utils/helpers';

interface SEOProps {
    title?: string;
    description?: string;
    image?: string;
    article?: boolean;
    type?: 'website' | 'article' | 'product';
    canonical?: string;
    schema?: object | object[];
    keywords?: string[] | string;
    noindex?: boolean;
    price?: number;
    currency?: string;
    availability?: 'InStock' | 'OutOfStock';
}

export const SEO: React.FC<SEOProps> = ({ 
    title, 
    description, 
    image, 
    article, 
    type = 'website',
    canonical, 
    schema,
    keywords,
    noindex = false,
    price,
    currency = 'PKR',
    availability = 'InStock'
}) => {
    const { settings } = useStore();
    const appName = settings?.appName || 'Zivio';
    const defaultDescription = 'A high-performance, mobile-friendly multi-vendor e-commerce platform with AI-powered search and verified products.';
    const siteUrl = typeof window !== 'undefined' ? window.location.origin : '';
    const currentUrl = typeof window !== 'undefined' ? (canonical || window.location.href) : '';

    const seoTitle = title ? `${title} | ${appName}` : `${appName} | Premium Online Shopping`;
    const seoDescription = description || defaultDescription;
    const seoImage = image || settings?.logoUrl || `${siteUrl}/favicon.svg`;
    const keywordString = Array.isArray(keywords) ? keywords.join(', ') : (keywords || `${appName}, online shopping, buy online, e-commerce, deals, electronics, fashion`);
    const ogType = article ? 'article' : (type === 'product' ? 'product' : 'website');

    return (
        <Helmet>
            {/* Standard HTML Metadata */}
            <title>{seoTitle}</title>
            <meta name="description" content={seoDescription} />
            <meta name="keywords" content={keywordString} />
            {noindex ? (
                <meta name="robots" content="noindex, nofollow" />
            ) : (
                <meta name="robots" content="index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1" />
            )}
            {currentUrl && <link rel="canonical" href={currentUrl} />}

            {/* Open Graph / Facebook */}
            <meta property="og:site_name" content={appName} />
            <meta property="og:title" content={seoTitle} />
            <meta property="og:description" content={seoDescription} />
            <meta property="og:type" content={ogType} />
            {currentUrl && <meta property="og:url" content={currentUrl} />}
            {seoImage && <meta property="og:image" content={seoImage} />}
            {seoImage && <meta property="og:image:alt" content={seoTitle} />}

            {/* Twitter */}
            <meta name="twitter:card" content="summary_large_image" />
            <meta name="twitter:title" content={seoTitle} />
            <meta name="twitter:description" content={seoDescription} />
            {seoImage && <meta name="twitter:image" content={seoImage} />}

            {/* Product Specific Microdata */}
            {type === 'product' && price !== undefined && (
                <>
                    <meta property="product:price:amount" content={price.toString()} />
                    <meta property="product:price:currency" content={currency} />
                    <meta property="product:availability" content={availability.toLowerCase()} />
                </>
            )}

            {/* JSON-LD Structured Data */}
            {schema && (
                Array.isArray(schema) ? (
                    schema.map((item, idx) => (
                        <script key={idx} type="application/ld+json">
                            {safeJsonStringify(item)}
                        </script>
                    ))
                ) : (
                    <script type="application/ld+json">
                        {safeJsonStringify(schema)}
                    </script>
                )
            )}
        </Helmet>
    );
};
