import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { authApi, storeTokens, clearTokens, getAccessToken } from '../api/client';

interface User {
  id: string;
  household_id: string;
  display_name: string;
  email?: string;
  phone?: string;
  two_fa_enabled: boolean;
  linked_children: Array<{
    id: string;
    display_name: string;
    age_band: string;
    avatar?: string;
    settings?: any;
  }>;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  selectedChildId: string;
  setSelectedChildId: (id: string) => void;
  login: (identifier: string, password: string) => Promise<{ success: boolean; challenge_id?: string; otp_hint?: string; error?: string }>;
  verify2FA: (challengeId: string, otpCode: string) => Promise<{ success: boolean; error?: string }>;
  register: (identifier: string, password: string, displayName: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedChildId, setSelectedChildId] = useState('child_aarav');

  const refreshUser = useCallback(async () => {
    try {
      const token = await getAccessToken();
      if (!token) {
        setUser(null);
        setIsLoading(false);
        return;
      }

      const result = await authApi.getMe();
      if (result.success && result.data) {
        setUser(result.data);
        // Auto-select first child if available
        if (result.data.linked_children?.length > 0) {
          setSelectedChildId(result.data.linked_children[0].id);
        }
      } else {
        setUser(null);
        await clearTokens();
      }
    } catch {
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  const login = useCallback(async (identifier: string, password: string) => {
    try {
      const result = await authApi.login(identifier, password);
      if (result.success && result.requires_2fa) {
        return {
          success: true,
          challenge_id: result.challenge_id,
          otp_hint: result.otp_hint,
        };
      }
      return { success: false, error: result.error || 'Login failed' };
    } catch (err: any) {
      return { success: false, error: err.message || 'Network error' };
    }
  }, []);

  const verify2FA = useCallback(async (challengeId: string, otpCode: string) => {
    try {
      const result = await authApi.verify2FA(challengeId, otpCode);
      if (result.success && result.access_token) {
        await storeTokens(result.access_token, result.refresh_token);
        setUser(result.user);
        if (result.user?.linked_children?.length > 0) {
          setSelectedChildId(result.user.linked_children[0].id);
        }
        return { success: true };
      }
      return { success: false, error: result.error || 'Verification failed' };
    } catch (err: any) {
      return { success: false, error: err.message || 'Network error' };
    }
  }, []);

  const register = useCallback(async (identifier: string, password: string, displayName: string) => {
    try {
      const result = await authApi.register(identifier, password, displayName);
      if (result.success) {
        return { success: true };
      }
      return { success: false, error: result.error || 'Registration failed' };
    } catch (err: any) {
      return { success: false, error: err.message || 'Network error' };
    }
  }, []);

  const logout = useCallback(async () => {
    await clearTokens();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        selectedChildId,
        setSelectedChildId,
        login,
        verify2FA,
        register,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
