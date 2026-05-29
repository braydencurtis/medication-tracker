import React, { createContext, useContext, useState, useEffect } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

export type MemberStatus = 'approved' | 'pending' | 'rejected' | null;

interface AuthContextType {
  session: Session | null;
  user: User | null;
  familyId: string | null;       // only set when approved
  memberStatus: MemberStatus;
  isOwner: boolean;
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
  memberStatus: null,
  isOwner: false,
  displayName: null,
  inviteCode: null,
  loaded: false,
  signOut: async () => {},
  refreshFamily: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [familyId, setFamilyId] = useState<string | null>(null);
  const [memberStatus, setMemberStatus] = useState<MemberStatus>(null);
  const [isOwner, setIsOwner] = useState(false);
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
        resetFamily();
        setLoaded(true);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  function resetFamily() {
    setFamilyId(null);
    setMemberStatus(null);
    setIsOwner(false);
    setDisplayName(null);
    setInviteCode(null);
  }

  async function loadFamily(userId: string) {
    const { data: memberData, error: memberError } = await supabase
      .from('family_members')
      .select('family_id, display_name, status')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (memberError) console.error('loadFamily error:', memberError);

    if (memberData) {
      setDisplayName(memberData.display_name);
      setMemberStatus(memberData.status as MemberStatus);

      if (memberData.status === 'approved') {
        setFamilyId(memberData.family_id);

        const { data: familyData } = await supabase
          .from('families')
          .select('invite_code, owner_id')
          .eq('id', memberData.family_id)
          .maybeSingle();

        setInviteCode(familyData?.invite_code ?? null);
        setIsOwner(familyData?.owner_id === userId);
      } else {
        setFamilyId(null);
        setInviteCode(null);
        setIsOwner(false);
      }
    } else {
      resetFamily();
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
        memberStatus,
        isOwner,
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
