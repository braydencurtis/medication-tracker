import React, { createContext, useContext, useState, useEffect } from 'react';
import * as SecureStore from 'expo-secure-store';

const USER_NAME_KEY = 'user_name';

interface UserContextType {
  name: string | null;
  loaded: boolean;
  saveName: (name: string) => Promise<void>;
}

const UserContext = createContext<UserContextType>({
  name: null,
  loaded: false,
  saveName: async () => {},
});

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [name, setName] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    SecureStore.getItemAsync(USER_NAME_KEY).then((v) => {
      setName(v);
      setLoaded(true);
    });
  }, []);

  async function saveName(newName: string) {
    await SecureStore.setItemAsync(USER_NAME_KEY, newName.trim());
    setName(newName.trim());
  }

  return (
    <UserContext.Provider value={{ name, loaded, saveName }}>
      {children}
    </UserContext.Provider>
  );
}

export const useUser = () => useContext(UserContext);
