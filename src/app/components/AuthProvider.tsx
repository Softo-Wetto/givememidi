// src/app/components/AuthProvider.tsx
"use client";

import { createContext, useContext, useEffect, useState } from "react";
type User = { id: string; email?: string | null; user_metadata?: Record<string, unknown> };
import { pocketbase } from "../../lib/pocketbaseClient";

type AuthCtx = { user: User | null; loading: boolean };
const AuthContext = createContext<AuthCtx>({ user: null, loading: true });

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    pocketbase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setUser(data.session?.user ?? null);
      setLoading(false);
    });

    const { data: sub } = pocketbase.auth.onAuthStateChange((_evt, session) => {
      setUser(session?.user ?? null);
    });

    // optional: resync on tab focus (fixes “stale auth” cases)
    const onFocus = async () => {
      const { data } = await pocketbase.auth.getSession();
      setUser(data.session?.user ?? null);
    };
    window.addEventListener("focus", onFocus);

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
      window.removeEventListener("focus", onFocus);
    };
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
