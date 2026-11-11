import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { connectPresence } from '../lib/presence';

export type PresenceStatus =
  | 'connecting'
  | 'connected'
  | 'authenticated'
  | 'disconnected';

type AuthContextValue = {
  session: Session | null;
  loading: boolean;
  presenceStatus: PresenceStatus;
  onlinePlayers: number;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [presenceStatus, setPresenceStatus] =
    useState<PresenceStatus>('disconnected');
  const [onlinePlayers, setOnlinePlayers] = useState(0);

  useEffect(() => {
    let mounted = true;

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (mounted) {
        setSession(nextSession);
        setLoading(false);
      }
    });

    supabase.auth.getSession().then(({ data, error }) => {
      if (mounted) {
        if (error) {
          console.error('Authentication session loading failed:', error.message);
        }

        setSession(data.session);
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    const accessToken = session?.access_token;

    if (!accessToken) {
      setPresenceStatus('disconnected');
      setOnlinePlayers(0);
      return;
    }

    try {
      const disconnect = connectPresence(accessToken, {
        onStatusChange: setPresenceStatus,
        onOnlinePlayers: setOnlinePlayers,
      });

      return disconnect;
    } catch (error) {
      console.error('Presence initialization failed:', error);
      setPresenceStatus('disconnected');
      return;
    }
  }, [session?.access_token]);

  return (
    <AuthContext.Provider
      value={{
        session,
        loading,
        presenceStatus,
        onlinePlayers,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider.');
  }

  return context;
}
