import AsyncStorage from '@react-native-async-storage/async-storage';
import { NativeModules, Platform } from 'react-native';

// ─── Dynamic Server Configuration ──────────────────────────────────────
const CUSTOM_SERVER_KEY = 'guardian_custom_server_url';
export const DEFAULT_SERVER_URL = process.env.EXPO_PUBLIC_API_URL || 'http://192.168.0.100:3001';

/**
 * Detect host IP dynamically from Metro bundler's scriptURL in Expo Go / React Native.
 * If Metro is loading from "http://192.168.0.100:8081/index.bundle...", this extracts "192.168.0.100".
 */
function getMetroHostIp(): string | null {
  try {
    const scriptURL = (NativeModules as any)?.SourceCode?.scriptURL;
    if (typeof scriptURL === 'string') {
      const match = scriptURL.match(/^https?:\/\/([^/:]+)/);
      if (match && match[1] && match[1] !== 'localhost' && match[1] !== '127.0.0.1') {
        return match[1];
      }
    }
  } catch {}
  return null;
}

/** Resolve dynamic server URL: Custom override -> EXPO_PUBLIC_API_URL -> Metro Host IP -> LAN IP */
export async function getBaseUrl(): Promise<string> {
  try {
    const custom = await AsyncStorage.getItem(CUSTOM_SERVER_KEY);
    if (custom && custom.trim()) {
      // Auto-migrate stale hardcoded 192.168.0.102 address if previously stored in AsyncStorage
      if (custom.includes('192.168.0.102')) {
        const updated = custom.replace('192.168.0.102', '192.168.0.100');
        await AsyncStorage.setItem(CUSTOM_SERVER_KEY, updated);
        return updated.replace(/\/+$/, '');
      }
      return custom.trim().replace(/\/+$/, '');
    }
  } catch {}

  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL.replace(/\/+$/, '');
  }

  const metroIp = getMetroHostIp();
  if (metroIp) {
    return `http://${metroIp}:3001`;
  }

  // Fallback to PC's active LAN IP
  return 'http://192.168.0.100:3001';
}

/** Set a custom server host (e.g. http://192.168.0.100:3001 or https://my-tunnel.ngrok.io) */
export async function setCustomServerUrl(url: string): Promise<void> {
  const clean = url.trim().replace(/\/+$/, '');
  if (!clean || clean === DEFAULT_SERVER_URL) {
    await AsyncStorage.removeItem(CUSTOM_SERVER_KEY);
  } else {
    await AsyncStorage.setItem(CUSTOM_SERVER_KEY, clean);
  }
}

/** Test connectivity to the server */
export async function testServerConnection(targetUrl?: string): Promise<{ success: boolean; latencyMs?: number; error?: string; url: string }> {
  const base = targetUrl ? targetUrl.trim().replace(/\/+$/, '') : await getBaseUrl();
  const start = Date.now();
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);
    const res = await fetch(`${base}/health`, { signal: controller.signal });
    clearTimeout(timeout);
    return { success: res.ok, latencyMs: Date.now() - start, url: base };
  } catch (err: any) {
    return { success: false, error: err.message || 'Cannot reach server', url: base };
  }
}

// ─── Token & Session Management (Persistent Auth) ───────────────────────

const TOKEN_KEY = 'guardian_access_token';
const REFRESH_KEY = 'guardian_refresh_token';
const CACHED_USER_KEY = 'guardian_cached_user';

export async function storeTokens(accessToken: string, refreshToken: string): Promise<void> {
  await AsyncStorage.multiSet([
    [TOKEN_KEY, accessToken],
    [REFRESH_KEY, refreshToken],
  ]);
}

export async function getAccessToken(): Promise<string | null> {
  return AsyncStorage.getItem(TOKEN_KEY);
}

export async function getRefreshToken(): Promise<string | null> {
  return AsyncStorage.getItem(REFRESH_KEY);
}

export async function storeCachedUser(user: any): Promise<void> {
  try {
    if (user) {
      await AsyncStorage.setItem(CACHED_USER_KEY, JSON.stringify(user));
    } else {
      await AsyncStorage.removeItem(CACHED_USER_KEY);
    }
  } catch {}
}

export async function getCachedUser(): Promise<any | null> {
  try {
    const raw = await AsyncStorage.getItem(CACHED_USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export async function clearTokens(): Promise<void> {
  await AsyncStorage.multiRemove([TOKEN_KEY, REFRESH_KEY, CACHED_USER_KEY]);
}

// ─── HTTP Helper with Timeout Guard ──────────────────────────────────────

async function request<T>(
  pathOrUrl: string,
  options: RequestInit = {}
): Promise<T> {
  const baseUrl = await getBaseUrl();
  const fullUrl = pathOrUrl.startsWith('http')
    ? pathOrUrl
    : `${baseUrl}${pathOrUrl.startsWith('/') ? '' : '/'}${pathOrUrl}`;

  const token = await getAccessToken();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // 5-second abort controller to prevent infinite buffering
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000);

  try {
    const response = await fetch(fullUrl, {
      ...options,
      headers,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    const data = await response.json();

    // Auto-refresh on 401
    if (response.status === 401 && token) {
      const refreshToken = await getRefreshToken();
      if (refreshToken) {
        try {
          const refreshCtrl = new AbortController();
          const refreshTimeout = setTimeout(() => refreshCtrl.abort(), 4000);
          const refreshResult = await fetch(`${baseUrl}/api/auth/refresh`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refresh_token: refreshToken }),
            signal: refreshCtrl.signal,
          });
          clearTimeout(refreshTimeout);

          if (refreshResult.ok) {
            const refreshData = await refreshResult.json();
            if (refreshData.access_token) {
              await AsyncStorage.setItem(TOKEN_KEY, refreshData.access_token);
              headers['Authorization'] = `Bearer ${refreshData.access_token}`;
              const retryResponse = await fetch(fullUrl, { ...options, headers });
              return retryResponse.json();
            }
          }
        } catch {}
      }
    }

    return data;
  } catch (fetchErr: any) {
    clearTimeout(timeoutId);
    if (fetchErr.name === 'AbortError') {
      return {
        success: false,
        error: `Server timed out (5s) connecting to ${baseUrl}. Check your Wi-Fi or server status.`,
      } as unknown as T;
    }
    const msg = fetchErr.message || '';
    if (msg.includes('NoRouteToHost') || msg.includes('Network request failed') || msg.includes('ECONNREFUSED')) {
      return {
        success: false,
        error: `Cannot reach backend at ${baseUrl}. Ensure backend server is running and phone is on the same Wi-Fi.`,
      } as unknown as T;
    }
    return {
      success: false,
      error: fetchErr.message || 'Cannot reach server',
    } as unknown as T;
  }
}

// ─── Auth API ───────────────────────────────────────────────────────────

export const authApi = {
  register: (identifier: string, password: string, display_name: string) =>
    request<any>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ identifier, password, display_name }),
    }),

  login: (identifier: string, password: string) =>
    request<any>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ identifier, password }),
    }),

  demoLogin: (identifier?: string) =>
    request<any>('/api/auth/demo-login', {
      method: 'POST',
      body: JSON.stringify({ identifier }),
    }),

  verify2FA: (challenge_id: string, otp_code: string) =>
    request<any>('/api/auth/verify-2fa', {
      method: 'POST',
      body: JSON.stringify({ challenge_id, otp_code }),
    }),

  resendOtp: (challenge_id: string) =>
    request<any>('/api/auth/resend-otp', {
      method: 'POST',
      body: JSON.stringify({ challenge_id }),
    }),

  forgotPassword: (identifier: string) =>
    request<any>('/api/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ identifier }),
    }),

  resetPassword: (challenge_id: string, otp_code: string, new_password: string) =>
    request<any>('/api/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ challenge_id, otp_code, new_password }),
    }),

  getMe: () => request<any>('/api/auth/me'),

  refreshToken: (refresh_token: string) =>
    request<any>('/api/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ refresh_token }),
    }),
};

// ─── Guardian API (Viewing Data) ────────────────────────────────────────

export const guardianApi = {
  getChildren: () => request<any>('/api/children'),

  getDigest: (childId: string, date?: string) =>
    request<any>(`/api/digest/${childId}${date ? `?date=${date}` : ''}`),

  getSessions: (childId?: string, date?: string) => {
    const params = new URLSearchParams();
    if (childId) params.append('child_id', childId);
    if (date) params.append('date', date);
    return request<any>(`/api/sessions?${params.toString()}`);
  },

  askAI: (child_id: string, question: string, date?: string) =>
    request<any>('/api/ai/qa', {
      method: 'POST',
      body: JSON.stringify({ child_id, question, date }),
    }),

  getOverlayControl: () => request<any>('/api/overlay/control'),

  setOverlayControl: (enabled: boolean, child_id?: string) =>
    request<any>('/api/overlay/control', {
      method: 'POST',
      body: JSON.stringify({ enabled, child_id }),
    }),

  getFrames: (childId?: string, limit?: number) => {
    const params = new URLSearchParams();
    if (childId) params.append('child_id', childId);
    if (limit) params.append('limit', String(limit));
    return request<any>(`/api/overlay/frames?${params.toString()}`);
  },

  getCatalog: () => request<any>('/api/catalog'),
};

// ─── Remote Control API ─────────────────────────────────────────────────

export const remoteApi = {
  sendCommand: (command: string, target_child?: string, payload?: Record<string, any>) =>
    request<any>('/api/auth/remote/command', {
      method: 'POST',
      body: JSON.stringify({ command, target_child, payload }),
    }),
};

// ─── TV Pairing API ─────────────────────────────────────────────────────

export const pairingApi = {
  approve: (pair_token?: string, short_code?: string) =>
    request<any>('/api/auth/tv-pair/approve', {
      method: 'POST',
      body: JSON.stringify({ pair_token, short_code }),
    }),

  getDevices: () =>
    request<any>('/api/auth/tv-pair/devices'),

  disconnect: (pair_token: string) =>
    request<any>('/api/auth/tv-pair/disconnect', {
      method: 'POST',
      body: JSON.stringify({ pair_token }),
    }),

  initiate: (device_name?: string) =>
    request<any>('/api/auth/tv-pair/initiate', {
      method: 'POST',
      body: JSON.stringify({ device_name }),
    }),
};
