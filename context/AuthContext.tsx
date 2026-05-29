import React, { createContext, useContext, useState, useEffect } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

interface AuthContextType {
  session: Session | null;
  user: User | null;
  familyId: string | null;
  displayName: string | null;
  inviteCode: string | null;
  loaded: boolean;
  signOut: () => Promise<void>;
  refreshFamily: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  familyId: null,
  displayName: null,
  inviteCode: null,
  loaded: false,
  signOut: async () => {},
  refreshFamily: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [familyId, setFamilyId] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) {
        loadFamily(session.user.id);
      } else {
        setLoaded(true);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        loadFamily(session.user.id);
      } else {
        setFamilyId(null);
        setDisplayName(null);
        setInviteCode(null);
        setLoaded(true);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  async function loadFamily(userId: string) {
    // Two separate queries avoids join RLS edge cases right after family creation
    const { data: memberData, error: memberError } = await supabase
      .from('family_members')
      .select('family_id, display_name')
      .eq('user_id', userId)
      .maybeSingle();

    if (memberError) console.error('loadFamily member error:', memberError);

    if (memberData) {
      setFamilyId(memberData.family_id);
      setDisplayName(memberData.display_name);

      const { data: familyData } = await supabase
        .from('families')
        .select('invite_code')
        .eq('id', memberData.family_id)
        .maybeSingle();

      setInviteCode(familyData?.invite_code ?? null);
    } else {
      setFamilyId(null);
      setDisplayName(null);
      setInviteCode(null);
    }
    setLoaded(true);
  }

  async function refreshFamily() {
    if (session?.user.id) {
      await loadFamily(session.user.id);
    }
  }

  async function signOut() {
    await supabase.auth.signOut();
  }

  return (
    <AuthContext.Provider
      value={{
        session,
        user: session?.user ?? null,
        familyId,
        displayName,
        inviteCode,
        loaded,
        signOut,
        refreshFamily,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
