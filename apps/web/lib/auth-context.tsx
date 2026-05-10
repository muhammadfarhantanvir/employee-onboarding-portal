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

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [session, setSession] = useState<AuthSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const s = getSession();
    setSession(s);
    setIsLoading(false);

    if (!s && pathname !== '/login') {
      router.replace('/login');
    }
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
