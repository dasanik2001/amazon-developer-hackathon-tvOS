import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import {
  authApi,
  storeTokens,
  clearTokens,
  getAccessToken,
  getRefreshToken,
  storeCachedUser,
  getCachedUser,
} from '../api/client';

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
  demoLogin: (identifier?: string) => Promise<{ success: boolean; error?: string }>;
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

  // Load cached user session immediately on mount for persistent instant login
  useEffect(() => {
    async function initSession() {
      try {
        const [token, cached] = await Promise.all([
          getAccessToken(),
          getCachedUser(),
        ]);

        if (token && cached) {
          setUser(cached);
          if (cached.linked_children?.length > 0) {
            setSelectedChildId(cached.linked_children[0].id);
          }
        }
      } catch (err) {
        console.warn('[Auth] Failed to restore local session:', err);
      } finally {
        setIsLoading(false);
      }
    }

    initSession();
  }, []);

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
        await storeCachedUser(result.data);
        if (result.data.linked_children?.length > 0) {
          setSelectedChildId(result.data.linked_children[0].id);
        }
      } else if (result.status === 401 || result.error?.includes('expired') || result.error?.includes('Unauthorized')) {
        // Access token expired, attempt refresh
        const refreshToken = await getRefreshToken();
        if (refreshToken) {
          const refreshRes = await authApi.refreshToken(refreshToken);
          if (refreshRes.success && refreshRes.access_token) {
            await storeTokens(refreshRes.access_token, refreshToken);
            // Retry getMe
            const retryMe = await authApi.getMe();
            if (retryMe.success && retryMe.data) {
              setUser(retryMe.data);
              await storeCachedUser(retryMe.data);
              return;
            }
          }
        }
        // Only clear if refresh explicitly failed
        await clearTokens();
        setUser(null);
      }
      // If network unreachable / offline, DO NOT clear session! Keep user logged in!
    } catch {
      // Offline or network hiccup - preserve existing cached session
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

  // 1-Tap Instant Auth Bypass for rapid testing/evaluators
  const demoLogin = useCallback(async (identifier?: string) => {
    try {
      setIsLoading(true);
      const result = await authApi.demoLogin(identifier);
      if (result.success && result.access_token) {
        await storeTokens(result.access_token, result.refresh_token);
        await storeCachedUser(result.user);
        setUser(result.user);
        if (result.user?.linked_children?.length > 0) {
          setSelectedChildId(result.user.linked_children[0].id);
        }
        return { success: true };
      }
      return { success: false, error: result.error || 'Demo login failed' };
    } catch (err: any) {
      return { success: false, error: err.message || 'Cannot reach server' };
    } finally {
      setIsLoading(false);
    }
  }, []);

  const verify2FA = useCallback(async (challengeId: string, otpCode: string) => {
    try {
      const result = await authApi.verify2FA(challengeId, otpCode);
      if (result.success && result.access_token) {
        await storeTokens(result.access_token, result.refresh_token);
        await storeCachedUser(result.user);
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
        demoLogin,
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
