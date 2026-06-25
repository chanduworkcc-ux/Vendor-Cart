import React, { createContext, useContext, useState, useCallback } from 'react';

const ADMIN_PIN = '1234';

interface AdminContextType {
  isAdmin: boolean;
  adminLogin: (pin: string) => boolean;
  adminLogout: () => void;
  storeSettings: StoreSettings;
  updateStoreSettings: (s: Partial<StoreSettings>) => void;
  announcements: Announcement[];
  addAnnouncement: (text: string) => void;
  removeAnnouncement: (id: string) => void;
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

const AdminContext = createContext<AdminContextType | null>(null);

export function AdminProvider({ children }: { children: React.ReactNode }) {
  const [isAdmin, setIsAdmin] = useState(false);
  const [storeSettings, setStoreSettings] = useState<StoreSettings>(DEFAULT_SETTINGS);
  const [announcements, setAnnouncements] = useState<Announcement[]>([
    { id: '1', text: 'Free shipping on orders above ₹499!', createdAt: new Date().toISOString() },
  ]);

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

  return (
    <AdminContext.Provider value={{ isAdmin, adminLogin, adminLogout, storeSettings, updateStoreSettings, announcements, addAnnouncement, removeAnnouncement }}>
      {children}
    </AdminContext.Provider>
  );
}

export function useAdmin() {
  const ctx = useContext(AdminContext);
  if (!ctx) throw new Error('useAdmin must be used inside AdminProvider');
  return ctx;
}
