import AsyncStorage from '@react-native-async-storage/async-storage';

export type SensitivityLevel = 'strict' | 'standard' | 'relaxed';

export interface GuardianPrefs {
  dailyLimitMinutes: number | null;
  sensitivity: SensitivityLevel | null;
}

const PREFS_KEY = 'guardian_parent_prefs';

const DEFAULTS: GuardianPrefs = {
  dailyLimitMinutes: null,
  sensitivity: null,
};

export async function getPrefs(): Promise<GuardianPrefs> {
  try {
    const raw = await AsyncStorage.getItem(PREFS_KEY);
    if (!raw) return { ...DEFAULTS };
    return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULTS };
  }
}

export async function setPrefs(patch: Partial<GuardianPrefs>): Promise<GuardianPrefs> {
  const next = { ...(await getPrefs()), ...patch };
  try {
    await AsyncStorage.setItem(PREFS_KEY, JSON.stringify(next));
  } catch {}
  return next;
}
