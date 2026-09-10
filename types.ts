

export interface SizeCategory {
  categoryName: string;
  sizes: string[];
}

export interface Category {
  id: string; // Unique ID for the category
  name: string;
  parentId: string | null; // ID of the parent category, null for top-level
  isVisible: boolean;
  imageUrl?: string;
  bannerImageUrls?: string[]; // Changed from bannerImageUrl to support multiple banners
}

export enum UserRole {
  Admin = "admin",
  Vendor = "vendor"
}

export interface AppUser {
  uid: string;
  email: string;
  role: UserRole;
  firstName?: string;
  lastName?: string;
  shopName?: string;
  shopLogoUrl?: string;
  shopBannerUrl?: string;
  whatsappNumber?: string;
  status: 'pending' | 'active' | 'suspended';
  createdAt: number;
}

export interface Product {
  id: string;
  customId?: string; // Admin-facing custom product identifier
  name: string;
  description: string;
  price: number;
  oldPrice?: number;
  category: string; // Should store category ID now
  images: string[];
  isVisible: boolean;
  createdAt: number;
  sizeCategories?: SizeCategory[];
  deliveryTime?: string;
  easyReturn?: boolean;
  returnPolicy?: string;
  shippingFee?: number;
  freeDelivery?: boolean;
  vendorId?: string; // ID of the vendor who owns this product
  shopName?: string; // Name of the shop for display
}

export interface CartItem {
  id: string;
  customId?: string; // Carry over custom ID to the cart
  name: string;
  price: number;
  image: string;
  quantity: number;
  selectedSizes?: Record<string, string>;
  deliveryTime?: string;
  easyReturn?: boolean;
  returnPolicy?: string;
  additionalInfo?: string;
  shippingFee?: number;
  vendorId?: string;
}

export enum OrderStatus {
  Pending = "Pending",
  OnTheWay = "On The Way",
  Delivered = "Delivered",
  Cancelled = "Cancelled",
}

export interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  createdAt: number;
}

export interface Coupon {
  id: string;
  code: string;
  description: string;
  discountType: 'flat' | 'percentage';
  discountValue: number;
  minBill: number;
  minProducts: number;
  freeShipping: boolean;
  validFrom: number; // Storing as timestamp
  validTo: number;   // Storing as timestamp
  assignment: 'banner' | 'product' | 'both' | 'none';
  vendorId?: string; // null or empty for admin coupons
  createdAt: number;
}

export interface Challan {
  id: string;
  bankAccount: string;
  amount: number;
  description: string;
  vendorIds: string[]; // IDs of vendors this challan is sent to
  createdAt: number;
}


export interface Order {
  id:string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  province: string;
  city: string;
  landmark?: string;
  email: string;
  items: CartItem[];
  total: number;
  shippingFee: number;
  appliedCoupon?: string;
  discountAmount?: number;
  status: OrderStatus;
  paymentMethod: string;
  createdAt: number;
  vendorIds?: string[]; // IDs of vendors involved in this order
}

export interface PaymentMethod {
  id: string;
  name: string;
  details: string;
}

export interface ChatMessage {
  id: string;
  sessionId: string;
  text: string;
  sender: 'user' | 'ai' | 'admin';
  timestamp: number;
}

export interface Banner {
  id: string;
  imageUrl: string;
  redirectUrl?: string;
  isActive: boolean;
  createdAt: number;
}

// Type definitions for the new block-based content editor
export type ContentBlock = {
    id: string;
    type: 'heading' | 'text' | 'image' | 'ad' | 'link' | 'youtube';
    content: string; // For heading, text, link text, youtube ID/link
    imageUrl?: string; // For image, ad
    redirectUrl?: string; // For ad, link URL
};

export interface UpdatePost {
    id: string;
    title: string;
    contentBlocks: ContentBlock[]; // Replaces simple content and imageUrl
    createdAt: number;
}

export interface Settings {
    bannerUrls: string[];
    shippingFee: number; // No longer used in UI, kept for data structure
    whatsappNumber: string;
    paymentMethods: PaymentMethod[];
    categories?: Category[];
    sizeCategories?: SizeCategory[];
    adminEmail?: string;
    appName?: string; // New field for app name
    storeDomain?: string; // Custom store domain (e.g. https://mybrand.com)
    logoUrl?: string; // New field for custom logo URL
    storeBannerUrl?: string; // New field for official store banner URL
    appDownloadUrl?: string; // App download URL
    appFileName?: string; // App download file name
    whatsappGroupUrl?: string;
    whatsappChannelUrl?: string;
    telegramChannelUrl?: string;
    youtubeChannelUrl?: string;
    instagramChannelUrl?: string;
    facebookPageUrl?: string;
    showJoinCommunity?: boolean;
    showLatestUpdates?: boolean;
    showGetApp?: boolean;
    showContactWhatsapp?: boolean;
    showContactEmail?: boolean;
    playStoreUrl?: string;
}

export interface AppNotification {
    id: string;
    userId: string; // 'admin' or customer ID
    title: string;
    message: string;
    type: 'order_placed' | 'order_status_changed';
    link?: string;
    isRead: boolean;
    createdAt: number;
}

export interface RagProductScore {
    id: string;
    matchScore: number;
    matchReason?: string;
}

export interface RagSearchResponse {
    detectedIntent: string;
    detectedCategory: string;
    suggestedKeywords: string[];
    aiSummary: string;
    rankedProductIds: RagProductScore[];
}
