
"use client";

import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth } from '@/lib/firebase-client';
import { getUserDetails, getUnreadMessageCount } from '@/lib/actions';
import type { ExecutiveProfile, StartupProfile } from '@/lib/types';

interface UserDetails {
    role: 'startup' | 'executive' | 'admin' | null;
    name: string | null;
    email: string | null;
    profile: Partial<ExecutiveProfile> | Partial<StartupProfile> | null;
}

interface AuthContextType {
  user: User | null;
  userDetails: UserDetails | null;
  unreadMessageCount: number;
  loading: boolean;
  refetchUserDetails: () => Promise<void>;
  refetchUnreadCount: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  userDetails: null,
  unreadMessageCount: 0,
  loading: true,
  refetchUserDetails: async () => {},
  refetchUnreadCount: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userDetails, setUserDetails] = useState<UserDetails | null>(null);
  const [unreadMessageCount, setUnreadMessageCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchUserDetails = useCallback(async (user: User | null) => {
    if (user) {
        try {
            const details = await getUserDetails(user.uid);
            if (details) {
                setUserDetails(details);
            } else {
                 setUserDetails(null);
            }
        } catch (error) {
            console.error("Failed to fetch user details", error);
            setUserDetails(null);
        }
    } else {
        setUserDetails(null);
    }
  }, []);

  const fetchUnreadCount = useCallback(async (user: User | null) => {
      if(user) {
          try {
            const result = await getUnreadMessageCount(user.uid);
            if (result.status === 'success') {
                setUnreadMessageCount(result.count);
            }
          } catch(error) {
            console.error("Failed to fetch unread message count", error);
            setUnreadMessageCount(0);
          }
      } else {
          setUnreadMessageCount(0);
      }
  }, []);

  const refetchUserDetails = useCallback(async () => {
    // onAuthStateChanged will handle the user object, we just need to refetch the details from our DB
    const currentUser = auth.currentUser;
    setUser(currentUser);
    await fetchUserDetails(currentUser);
  }, [fetchUserDetails]);

  const refetchUnreadCount = useCallback(async () => {
    const currentUser = auth.currentUser;
    await fetchUnreadCount(currentUser);
  }, [fetchUnreadCount]);


  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      await Promise.all([
          fetchUserDetails(user),
          fetchUnreadCount(user)
      ]);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [fetchUserDetails, fetchUnreadCount]);

  return (
    <AuthContext.Provider value={{ user, userDetails, loading, unreadMessageCount, refetchUserDetails, refetchUnreadCount }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
