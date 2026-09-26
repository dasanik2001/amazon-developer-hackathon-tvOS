import { Platform } from 'react-native';

// For Android TV emulator with adb reverse, localhost:3001 maps directly to the host machine
const DEFAULT_HOST = 'http://localhost:3001';

export const GUARDIAN_API_BASE = `${DEFAULT_HOST}/api`;

export interface GuardianSessionEvent {
  id?: string;
  child_id: string;
  content_id: string;
  title: string;
  category: string;
  duration_sec: number;
  completed?: boolean;
}

export interface GuardianDigest {
  child_id: string;
  date: string;
  total_minutes: number;
  category_minutes: Record<string, number>;
  top_topics: string[];
  notable_items: Array<{
    title: string;
    reason: string;
    flag_type: 'educational_highlight' | 'potential_concern' | 'topic_breakthrough';
  }>;
  generated_summary: string;
}

export interface GuardianQAResult {
  question: string;
  answer: string;
  evidence_sessions: Array<{
    session_id: string;
    content_id: string;
    title: string;
    duration_min: number;
    category: string;
    topics: string[];
    summary: string;
  }>;
}

export async function recordViewingSession(event: GuardianSessionEvent): Promise<boolean> {
  try {
    const res = await fetch(`${GUARDIAN_API_BASE}/events/session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(event),
    });
    return res.ok;
  } catch (err) {
    console.warn('[Guardian API] Failed to record viewing session:', err);
    return false;
  }
}

export async function fetchDailyDigest(childId: string = 'child_aarav'): Promise<GuardianDigest | null> {
  try {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const localDate = `${year}-${month}-${day}`;
    const res = await fetch(`${GUARDIAN_API_BASE}/digest/${childId}?date=${localDate}`);
    if (!res.ok) return null;
    const json = await res.json();
    return json.success ? json.data : null;
  } catch (err) {
    console.warn('[Guardian API] Failed to fetch daily digest:', err);
    return null;
  }
}

export async function askGuardianAI(question: string, childId: string = 'child_aarav'): Promise<GuardianQAResult | null> {
  try {
    const res = await fetch(`${GUARDIAN_API_BASE}/ai/qa`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ child_id: childId, question }),
    });
    if (!res.ok) return null;
    const json = await res.json();
    return json.success ? json.data : null;
  } catch (err) {
    console.warn('[Guardian API] Failed to ask Guardian AI:', err);
    return null;
  }
}
