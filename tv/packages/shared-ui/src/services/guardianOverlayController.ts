import { NativeModules, Platform } from 'react-native';
import { GUARDIAN_API_BASE } from './guardianApi';

const { GuardianBridgeModule } = NativeModules;

export interface OverlayStatus {
  active: boolean;
  canDrawOverlays: boolean;
  accessibilityConnected: boolean;
  currentForegroundPackage: string;
}

/**
 * Starts the native Fire TV OS system overlay and 2-minute periodic monitoring.
 */
export async function startSystemOverlay(
  childId: string = 'child_aarav',
  childName: string = 'Aarav',
  backendUrl: string = GUARDIAN_API_BASE
): Promise<boolean> {
  if (Platform.OS === 'android' && GuardianBridgeModule) {
    try {
      return await GuardianBridgeModule.startOverlay(childId, childName, backendUrl);
    } catch (err) {
      console.warn('[Overlay Controller] Native startOverlay error:', err);
      return false;
    }
  }

  console.log(`[Overlay Controller] Started background overlay mode on ${Platform.OS} for ${childName}`);
  return true;
}

/**
 * Stops the native Fire TV OS system overlay.
 */
export async function stopSystemOverlay(): Promise<boolean> {
  if (Platform.OS === 'android' && GuardianBridgeModule) {
    try {
      return await GuardianBridgeModule.stopOverlay();
    } catch (err) {
      console.warn('[Overlay Controller] Native stopOverlay error:', err);
      return false;
    }
  }
  return true;
}

/**
 * Checks overlay permissions and accessibility connection status.
 */
export async function checkOverlayStatus(): Promise<OverlayStatus> {
  if (Platform.OS === 'android' && GuardianBridgeModule) {
    try {
      const res = await GuardianBridgeModule.checkPermissions();
      return {
        active: true,
        canDrawOverlays: !!res.canDrawOverlays,
        accessibilityConnected: !!res.accessibilityConnected,
        currentForegroundPackage: res.currentForegroundPackage || '',
      };
    } catch (err) {
      console.warn('[Overlay Controller] checkPermissions error:', err);
    }
  }

  return {
    active: true,
    canDrawOverlays: true,
    accessibilityConnected: true,
    currentForegroundPackage: 'com.google.android.youtube.tv',
  };
}

/**
 * Dispatches an on-demand or periodic frame context packet directly to backend
 */
export async function ingestExternalMediaFrame(
  childId: string,
  appName: string,
  appPackage: string,
  mediaTitle: string,
  textSnippets: string[]
): Promise<any> {
  try {
    const res = await fetch(`${GUARDIAN_API_BASE}/overlay/ingest-frame`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        child_id: childId,
        app_name: appName,
        app_package: appPackage,
        media_title: mediaTitle,
        text_snippets: textSnippets,
        timestamp: new Date().toISOString(),
        duration_increment_sec: 120, // 2-minute sample
      }),
    });
    return await res.json();
  } catch (err) {
    console.error('[Overlay Controller] Failed to ingest frame context:', err);
    return null;
  }
}
