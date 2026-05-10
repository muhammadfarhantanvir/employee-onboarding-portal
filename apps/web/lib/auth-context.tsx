'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { getSession, clearSession, AuthSession } from './api';

interface AuthContextValue {
  session: AuthSession | null;
  isLoading: boolean;
  signOut: () => void;
}

const AuthContext = createContext<AuthContextValue>({
  session: null,
  isLoading: true,
  signOut: () => {},
});

const PUBLIC_PATHS = ['/login'];

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [session, setSession] = useState<AuthSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const s = getSession();
    setSession(s);
    setIsLoading(false);

    if (!s && !PUBLIC_PATHS.includes(pathname)) {
      router.replace('/login');
    }
  }, []); // Only run once on mount — not on every pathname change

  // Listen for storage events (tab sync)
  useEffect(() => {
    function handleStorage(e: StorageEvent) {
      if (e.key === 'onboarding_session') {
        const s = getSession();
        setSession(s);
        if (!s && !PUBLIC_PATHS.includes(pathname)) {
          router.replace('/login');
        }
      }
    }
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, [pathname, router]);

  const signOut = useCallback(() => {
    clearSession();
    setSession(null);
    router.replace('/login');
  }, [router]);

  return (
    <AuthContext.Provider value={{ session, isLoading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
