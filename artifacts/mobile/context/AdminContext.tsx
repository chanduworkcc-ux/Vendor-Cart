import React, { createContext, useContext, useState, useCallback } from 'react';

const ADMIN_PIN = '1234';

export interface BannerSlide {
  id: string;
  imageUri: string;
  title: string;
  subtitle: string;
}

interface AdminContextType {
  isAdmin: boolean;
  adminLogin: (pin: string) => boolean;
  adminLogout: () => void;
  storeSettings: StoreSettings;
  updateStoreSettings: (s: Partial<StoreSettings>) => void;
  announcements: Announcement[];
  addAnnouncement: (text: string) => void;
  removeAnnouncement: (id: string) => void;
  bannerSlides: BannerSlide[];
  addBannerSlide: (slide: Omit<BannerSlide, 'id'>) => void;
  removeBannerSlide: (id: string) => void;
  updateBannerSlide: (id: string, patch: Partial<Omit<BannerSlide, 'id'>>) => void;
}

export interface StoreSettings {
  storeName: string;
  tagline: string;
  email: string;
  phone: string;
  address: string;
  currency: string;
  freeShippingAbove: number;
  maintenanceMode: boolean;
  allowGuestCheckout: boolean;
  autoConfirmOrders: boolean;
}

export interface Announcement {
  id: string;
  text: string;
  createdAt: string;
}

const DEFAULT_SETTINGS: StoreSettings = {
  storeName: 'ShopAll',
  tagline: 'Your one-stop general store',
  email: 'hello@shopall.com',
  phone: '+91 1800 555 0100',
  address: 'Hyderabad, Telangana, India',
  currency: 'INR',
  freeShippingAbove: 499,
  maintenanceMode: false,
  allowGuestCheckout: true,
  autoConfirmOrders: false,
};

const DEFAULT_BANNERS: BannerSlide[] = [
  {
    id: '1',
    imageUri: 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=800&q=80',
    title: 'Summer Collection 2026',
    subtitle: 'New Arrivals',
  },
  {
    id: '2',
    imageUri: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=800&q=80',
    title: 'Up to 50% Off',
    subtitle: 'Limited Time Deal',
  },
  {
    id: '3',
    imageUri: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=800&q=80',
    title: 'Free Shipping',
    subtitle: 'On orders above ₹499',
  },
];

const AdminContext = createContext<AdminContextType | null>(null);

export function AdminProvider({ children }: { children: React.ReactNode }) {
  const [isAdmin, setIsAdmin] = useState(false);
  const [storeSettings, setStoreSettings] = useState<StoreSettings>(DEFAULT_SETTINGS);
  const [announcements, setAnnouncements] = useState<Announcement[]>([
    { id: '1', text: 'Free shipping on orders above ₹499!', createdAt: new Date().toISOString() },
  ]);
  const [bannerSlides, setBannerSlides] = useState<BannerSlide[]>(DEFAULT_BANNERS);

  const adminLogin = useCallback((pin: string): boolean => {
    if (pin === ADMIN_PIN) { setIsAdmin(true); return true; }
    return false;
  }, []);

  const adminLogout = useCallback(() => setIsAdmin(false), []);

  const updateStoreSettings = useCallback((s: Partial<StoreSettings>) => {
    setStoreSettings((prev) => ({ ...prev, ...s }));
  }, []);

  const addAnnouncement = useCallback((text: string) => {
    setAnnouncements((prev) => [
      { id: Date.now().toString(), text, createdAt: new Date().toISOString() },
      ...prev,
    ]);
  }, []);

  const removeAnnouncement = useCallback((id: string) => {
    setAnnouncements((prev) => prev.filter((a) => a.id !== id));
  }, []);

  const addBannerSlide = useCallback((slide: Omit<BannerSlide, 'id'>) => {
    setBannerSlides((prev) => [
      ...prev,
      { ...slide, id: Date.now().toString() },
    ]);
  }, []);

  const removeBannerSlide = useCallback((id: string) => {
    setBannerSlides((prev) => prev.filter((s) => s.id !== id));
  }, []);

  const updateBannerSlide = useCallback((id: string, patch: Partial<Omit<BannerSlide, 'id'>>) => {
    setBannerSlides((prev) => prev.map((s) => s.id === id ? { ...s, ...patch } : s));
  }, []);

  return (
    <AdminContext.Provider value={{
      isAdmin, adminLogin, adminLogout,
      storeSettings, updateStoreSettings,
      announcements, addAnnouncement, removeAnnouncement,
      bannerSlides, addBannerSlide, removeBannerSlide, updateBannerSlide,
    }}>
      {children}
    </AdminContext.Provider>
  );
}

export function useAdmin() {
  const ctx = useContext(AdminContext);
  if (!ctx) throw new Error('useAdmin must be used inside AdminProvider');
  return ctx;
}
