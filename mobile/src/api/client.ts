import AsyncStorage from '@react-native-async-storage/async-storage';

// ─── Configuration ─────────────────────────────────────────────────────
// Change this to your server URL (use ngrok/cloudflare tunnel for remote access)
const BASE_URL = __DEV__
  ? 'http://10.0.2.2:3001' // Android emulator localhost alias
  : 'http://localhost:3001';

const API_URL = `${BASE_URL}/api`;
const AUTH_URL = `${BASE_URL}/api/auth`;

// ─── Token Management ───────────────────────────────────────────────────

const TOKEN_KEY = 'guardian_access_token';
const REFRESH_KEY = 'guardian_refresh_token';

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

export async function clearTokens(): Promise<void> {
  await AsyncStorage.multiRemove([TOKEN_KEY, REFRESH_KEY]);
}

// ─── HTTP Helper ────────────────────────────────────────────────────────

async function request<T>(
  url: string,
  options: RequestInit = {}
): Promise<T> {
  const token = await getAccessToken();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  const data = await response.json();

  // Auto-refresh on 401
  if (response.status === 401 && token) {
    const refreshToken = await getRefreshToken();
    if (refreshToken) {
      const refreshResult = await fetch(`${AUTH_URL}/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: refreshToken }),
      });

      if (refreshResult.ok) {
        const refreshData = await refreshResult.json();
        if (refreshData.access_token) {
          await AsyncStorage.setItem(TOKEN_KEY, refreshData.access_token);
          // Retry original request with new token
          headers['Authorization'] = `Bearer ${refreshData.access_token}`;
          const retryResponse = await fetch(url, { ...options, headers });
          return retryResponse.json();
        }
      }
    }
  }

  return data;
}

// ─── Auth API ───────────────────────────────────────────────────────────

export const authApi = {
  register: (identifier: string, password: string, display_name: string) =>
    request<any>(`${AUTH_URL}/register`, {
      method: 'POST',
      body: JSON.stringify({ identifier, password, display_name }),
    }),

  login: (identifier: string, password: string) =>
    request<any>(`${AUTH_URL}/login`, {
      method: 'POST',
      body: JSON.stringify({ identifier, password }),
    }),

  verify2FA: (challenge_id: string, otp_code: string) =>
    request<any>(`${AUTH_URL}/verify-2fa`, {
      method: 'POST',
      body: JSON.stringify({ challenge_id, otp_code }),
    }),

  resendOtp: (challenge_id: string) =>
    request<any>(`${AUTH_URL}/resend-otp`, {
      method: 'POST',
      body: JSON.stringify({ challenge_id }),
    }),

  forgotPassword: (identifier: string) =>
    request<any>(`${AUTH_URL}/forgot-password`, {
      method: 'POST',
      body: JSON.stringify({ identifier }),
    }),

  resetPassword: (challenge_id: string, otp_code: string, new_password: string) =>
    request<any>(`${AUTH_URL}/reset-password`, {
      method: 'POST',
      body: JSON.stringify({ challenge_id, otp_code, new_password }),
    }),

  getMe: () => request<any>(`${AUTH_URL}/me`),

  refreshToken: (refresh_token: string) =>
    request<any>(`${AUTH_URL}/refresh`, {
      method: 'POST',
      body: JSON.stringify({ refresh_token }),
    }),
};

// ─── Guardian API (Viewing Data) ────────────────────────────────────────

export const guardianApi = {
  getChildren: () => request<any>(`${API_URL}/children`),

  getDigest: (childId: string, date?: string) =>
    request<any>(`${API_URL}/digest/${childId}${date ? `?date=${date}` : ''}`),

  getSessions: (childId?: string, date?: string) => {
    const params = new URLSearchParams();
    if (childId) params.append('child_id', childId);
    if (date) params.append('date', date);
    return request<any>(`${API_URL}/sessions?${params.toString()}`);
  },

  askAI: (child_id: string, question: string, date?: string) =>
    request<any>(`${API_URL}/ai/qa`, {
      method: 'POST',
      body: JSON.stringify({ child_id, question, date }),
    }),

  getOverlayControl: () => request<any>(`${API_URL}/overlay/control`),

  setOverlayControl: (enabled: boolean, child_id?: string) =>
    request<any>(`${API_URL}/overlay/control`, {
      method: 'POST',
      body: JSON.stringify({ enabled, child_id }),
    }),

  getFrames: (childId?: string, limit?: number) => {
    const params = new URLSearchParams();
    if (childId) params.append('child_id', childId);
    if (limit) params.append('limit', String(limit));
    return request<any>(`${API_URL}/overlay/frames?${params.toString()}`);
  },

  getCatalog: () => request<any>(`${API_URL}/catalog`),
};

// ─── Remote Control API ─────────────────────────────────────────────────

export const remoteApi = {
  sendCommand: (command: string, target_child?: string, payload?: Record<string, any>) =>
    request<any>(`${AUTH_URL}/remote/command`, {
      method: 'POST',
      body: JSON.stringify({ command, target_child, payload }),
    }),
};

// ─── TV Pairing API ─────────────────────────────────────────────────────

export const pairingApi = {
  approve: (pair_token?: string, short_code?: string) =>
    request<any>(`${AUTH_URL}/tv-pair/approve`, {
      method: 'POST',
      body: JSON.stringify({ pair_token, short_code }),
    }),

  getDevices: () =>
    request<any>(`${AUTH_URL}/tv-pair/devices`),

  disconnect: (pair_token: string) =>
    request<any>(`${AUTH_URL}/tv-pair/disconnect`, {
      method: 'POST',
      body: JSON.stringify({ pair_token }),
    }),

  initiate: (device_name?: string) =>
    request<any>(`${AUTH_URL}/tv-pair/initiate`, {
      method: 'POST',
      body: JSON.stringify({ device_name }),
    }),
};

export { BASE_URL, API_URL, AUTH_URL };
