import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { useAtom } from 'jotai';
import { User, userAtom, userIdAtom, isAppLockedAtom } from '../states/States';
import { apiFetch } from '../utils/apiFetch';
import { getApiUrl } from '../utils/apiUrl';
import { getToken, setToken, removeToken, setUserId, getLockPin } from '../utils/authStorage';
import { connectSocket, disconnectSocket } from '../hooks/useSocket';

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: User;
  login: (token: string, userId?: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUserData: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [user, setUser] = useAtom<User>(userAtom);
  const [, setGlobalUserId] = useAtom(userIdAtom);
  const [, setIsAppLocked] = useAtom(isAppLockedAtom);

  const refreshUserData = useCallback(async () => {
    const token = await getToken();
    if (!token) {
      setIsAuthenticated(false);
      setIsLoading(false);
      return;
    }

    try {
      const res = await apiFetch(`${getApiUrl()}/api/users/me`);
      if (!res.ok) throw new Error('Unauthorized');

      const data = await res.json();
      setUser({
        username: data.username,
        email: data.email,
        profilePic: data.profilePic || '',
        about: data.about || "Hey there! I'm using Chugli.",
      });
      setGlobalUserId(data._id);
      await setUserId(data._id);
      setIsAuthenticated(true);
      connectSocket(data._id);

      // Check if App Lock is enabled
      const pin = await getLockPin();
      if (pin) {
        setIsAppLocked(true);
      }
    } catch (err) {
      await removeToken();
      setUser({} as User);
      setIsAuthenticated(false);
      disconnectSocket();
    } finally {
      setIsLoading(false);
    }
  }, [setUser, setGlobalUserId, setIsAppLocked]);

  const login = useCallback(async (token: string, uId?: string) => {
    await setToken(token);
    if (uId) {
      setGlobalUserId(uId);
      await setUserId(uId);
      connectSocket(uId);
    }
    setIsAuthenticated(true);
    await refreshUserData();
  }, [setGlobalUserId, refreshUserData]);

  const logout = useCallback(async () => {
    await removeToken();
    setIsAuthenticated(false);
    setUser({} as User);
    setGlobalUserId(null);
    disconnectSocket();
  }, [setUser, setGlobalUserId]);

  const initialCheckRef = useRef(false);
  useEffect(() => {
    if (!initialCheckRef.current) {
      initialCheckRef.current = true;
      refreshUserData();
    }
  }, [refreshUserData]);

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        isLoading,
        user,
        login,
        logout,
        refreshUserData,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
