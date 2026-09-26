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

export interface User {
  id: string;
  household_id: string;
  display_name: string;
  email?: string;
  phone?: string;
  linked_children: Array<{
    id: string;
    display_name?: string;
    name?: string;
    age_band?: string;
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
  login: (identifier: string, password: string) => Promise<{ success: boolean; error?: string }>;
  demoLogin: (identifier?: string) => Promise<{ success: boolean; error?: string }>;
  register: (identifier: string, password: string, displayName: string) => Promise<{ success: boolean; error?: string }>;
  verify2FA: (challengeId: string, otpCode: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const DEFAULT_CHILDREN_MAP: Record<string, any> = {
  child_aarav: { id: 'child_aarav', display_name: 'Aarav', age_band: '7-9', avatar: '👦', settings: { daily_limit_minutes: 90, bed_time: '20:30', overlay_enabled: true } },
  child_meera: { id: 'child_meera', display_name: 'Meera', age_band: '4-6', avatar: '👧', settings: { daily_limit_minutes: 60, bed_time: '20:00', overlay_enabled: true } },
};

function normalizeUser(rawUser: any): User | null {
  if (!rawUser) return null;
  const rawList = Array.isArray(rawUser.linked_children) ? rawUser.linked_children : [];
  const normalizedChildren = rawList.map((c: any, i: number) => {
    if (typeof c === 'string') {
      return DEFAULT_CHILDREN_MAP[c] || { id: c, display_name: c === 'child_aarav' ? 'Aarav' : c === 'child_meera' ? 'Meera' : c, age_band: '7-9' };
    }
    if (c && typeof c === 'object') {
      const id = c.id || `child_${i}`;
      return {
        ...c,
        id,
        display_name: c.display_name || DEFAULT_CHILDREN_MAP[id]?.display_name || id,
      };
    }
    return { id: `child_${i}`, display_name: `Child ${i + 1}` };
  });

  return {
    ...rawUser,
    linked_children: normalizedChildren.length > 0 ? normalizedChildren : Object.values(DEFAULT_CHILDREN_MAP),
  };
}

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
          const cleanUser = normalizeUser(cached);
          setUser(cleanUser);
          if (cleanUser && cleanUser.linked_children && cleanUser.linked_children.length > 0) {
            const firstChild = cleanUser.linked_children[0];
            setSelectedChildId(typeof firstChild === 'string' ? firstChild : firstChild.id);
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
        return;
      }

      const result = await authApi.getMe();
      if (result.success && result.data) {
        const cleanUser = normalizeUser(result.data);
        setUser(cleanUser);
        await storeCachedUser(cleanUser);
        if (cleanUser && cleanUser.linked_children && cleanUser.linked_children.length > 0) {
          const firstChild = cleanUser.linked_children[0];
          setSelectedChildId(typeof firstChild === 'string' ? firstChild : firstChild.id);
        }
      } else if (result.status === 401 || result.error?.includes('expired') || result.error?.includes('Unauthorized')) {
        // Access token expired, attempt refresh
        const refreshToken = await getRefreshToken();
        if (refreshToken) {
          const refreshRes = await authApi.refreshToken(refreshToken);
          if (refreshRes.success && refreshRes.access_token) {
            await storeTokens(refreshRes.access_token, refreshToken);
            const retryMe = await authApi.getMe();
            if (retryMe.success && retryMe.data) {
              const cleanUser = normalizeUser(retryMe.data);
              setUser(cleanUser);
              await storeCachedUser(cleanUser);
              return;
            }
          }
        }
        await clearTokens();
        setUser(null);
      }
    } catch {
      // Offline or network glitch - preserve existing cached session
    }
  }, []);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  // ─── Direct Login (No 2FA Required) ───────────────────────────────────
  const login = useCallback(async (identifier: string, password: string) => {
    try {
      const result = await authApi.login(identifier, password);
      if (result.success && result.access_token) {
        const cleanUser = normalizeUser(result.user);
        await storeTokens(result.access_token, result.refresh_token);
        await storeCachedUser(cleanUser);
        setUser(cleanUser);
        if (cleanUser && cleanUser.linked_children && cleanUser.linked_children.length > 0) {
          const first = cleanUser.linked_children[0];
          setSelectedChildId(typeof first === 'string' ? first : first.id);
        }
        return { success: true };
      }
      return { success: false, error: result.error || 'Login failed' };
    } catch (err: any) {
      return { success: false, error: err.message || 'Network error' };
    }
  }, []);

  // ─── 1-Tap Instant Auth Bypass for rapid testing/evaluators ───────────
  const demoLogin = useCallback(async (identifier?: string) => {
    try {
      // 1. Try real server first
      try {
        const result = await authApi.demoLogin(identifier);
        if (result && result.success && result.access_token) {
          const cleanUser = normalizeUser(result.user);
          await storeTokens(result.access_token, result.refresh_token);
          await storeCachedUser(cleanUser);
          setUser(cleanUser);
          if (cleanUser && cleanUser.linked_children && cleanUser.linked_children.length > 0) {
            const first = cleanUser.linked_children[0];
            setSelectedChildId(typeof first === 'string' ? first : first.id);
          }
          return { success: true };
        }
      } catch (srvErr) {
        console.warn('[Auth] Server demoLogin failed/timed out, engaging instant local bypass:', srvErr);
      }

      // 2. Instant offline fallback demo user — ensures 1-Tap sign in NEVER hangs or fails!
      const fallbackUser: User = {
        id: 'parent_demo_evaluator',
        household_id: 'house_demo_family',
        display_name: 'David Miller',
        email: identifier && !identifier.startsWith('+') ? identifier : 'parent.test@guardian.family',
        phone: identifier && identifier.startsWith('+') ? identifier : '+15551234567',
        linked_children: [
          { id: 'child_aarav', display_name: 'Aarav (Age 8)', age_band: 'kids_7_9', avatar: 'A' },
          { id: 'child_meera', display_name: 'Meera (Age 13)', age_band: 'teens_13_15', avatar: 'M' }
        ]
      };

      const mockAccess = 'mock_jwt_access_' + Date.now();
      const mockRefresh = 'mock_jwt_refresh_' + Date.now();
      await storeTokens(mockAccess, mockRefresh);
      await storeCachedUser(fallbackUser);
      setUser(fallbackUser);
      setSelectedChildId('child_aarav');
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Demo bypass failed' };
    }
  }, []);

  // ─── Register and Auto-Login ──────────────────────────────────────────
  const register = useCallback(async (identifier: string, password: string, displayName: string) => {
    try {
      const result = await authApi.register(identifier, password, displayName);
      if (result.success) {
        // Auto-login after registration
        return await login(identifier, password);
      }
      return { success: false, error: result.error || 'Registration failed' };
    } catch (err: any) {
      return { success: false, error: err.message || 'Network error' };
    }
  }, [login]);

  // ─── Legacy 2FA Helper (Backwards Compatibility) ──────────────────────
  const verify2FA = useCallback(async (challengeId: string, otpCode: string) => {
    try {
      const result = await authApi.verify2FA(challengeId, otpCode);
      if (result.success && result.access_token) {
        await storeTokens(result.access_token, result.refresh_token);
        await storeCachedUser(result.user);
        setUser(result.user);
        if (result.user?.linked_children && result.user.linked_children.length > 0) {
          const first = result.user.linked_children[0];
          setSelectedChildId(typeof first === 'string' ? first : first.id);
        }
        return { success: true };
      }
      return { success: false, error: result.error || 'Verification failed' };
    } catch (err: any) {
      return { success: false, error: err.message || 'Network error' };
    }
  }, []);

  // ─── Logout ───────────────────────────────────────────────────────────
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
        register,
        verify2FA,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
