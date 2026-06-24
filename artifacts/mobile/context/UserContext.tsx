import React, { createContext, useContext, useState, useCallback } from 'react';

export type Language = 'English' | 'Telugu' | 'Hindi';

export interface UserProfile {
  name: string;
  email: string;
  phone: string;
  hasSetPhone: boolean;
  language: Language;
  notificationsEnabled: boolean;
  initials: string;
}

interface UserContextType {
  user: UserProfile;
  updateName: (name: string) => void;
  setPhone: (phone: string) => void;
  setLanguage: (lang: Language) => void;
  toggleNotifications: () => void;
}

const DEFAULT_USER: UserProfile = {
  name: 'Guest User',
  email: 'guest@shopall.com',
  phone: '',
  hasSetPhone: false,
  language: 'English',
  notificationsEnabled: true,
  initials: 'G',
};

const UserContext = createContext<UserContextType | null>(null);

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile>(DEFAULT_USER);

  const updateName = useCallback((name: string) => {
    setUser((prev) => ({
      ...prev,
      name: name.trim(),
      initials: name.trim()[0]?.toUpperCase() ?? 'G',
    }));
  }, []);

  const setPhone = useCallback((phone: string) => {
    setUser((prev) => {
      if (prev.hasSetPhone) return prev;
      return { ...prev, phone, hasSetPhone: true };
    });
  }, []);

  const setLanguage = useCallback((language: Language) => {
    setUser((prev) => ({ ...prev, language }));
  }, []);

  const toggleNotifications = useCallback(() => {
    setUser((prev) => ({ ...prev, notificationsEnabled: !prev.notificationsEnabled }));
  }, []);

  return (
    <UserContext.Provider value={{ user, updateName, setPhone, setLanguage, toggleNotifications }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const ctx = useContext(UserContext);
  if (!ctx) throw new Error('useUser must be used inside UserProvider');
  return ctx;
}
