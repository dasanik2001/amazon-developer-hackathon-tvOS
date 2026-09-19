# Fire TV OS System Overlay & Background Media Ingestion Guide

This document explains the architecture, native Android services, permissions, and deployment instructions for running **Family TV Guardian** as a **system-wide overlay on Fire TV OS**.

---

## 1. Problem & Architecture

On a Fire TV in a real household, children frequently switch between third-party video apps such as **YouTube**, **Amazon Prime Video**, and **Netflix**. Standard apps lose context once the child leaves the app.

Family TV Guardian solves this on Fire TV OS through a native dual-service architecture:

```
┌────────────────────────────────────────────────────────────────────────┐
│                        Fire TV OS Runtime                              │
├────────────────────────────────┬───────────────────────────────────────┤
│  Third-Party Video App         │  YouTube, Prime Video, Netflix, etc.  │
├────────────────────────────────┼───────────────────────────────────────┤
│  GuardianAccessibilityService  │  • Intercepts foreground app package  │
│  (AccessibilityService)        │  • Reads on-screen titles & captions  │
│                                │  • Takes frame snapshots              │
├────────────────────────────────┼───────────────────────────────────────┤
│  GuardianOverlayService        │  • Renders floating HUD over video    │
│  (Foreground Service)          │  • 2-Minute periodic sampling timer   │
│                                │  • Dispatches frames to RAG backend   │
├────────────────────────────────┼───────────────────────────────────────┤
│  MediaSessionTracker           │  • Reads now-playing metadata via     │
│                                │    Android MediaSessionManager        │
└────────────────────────────────┴───────────────────────────────────────┘
                                     │
                      POST /api/overlay/ingest-frame (Every 120s)
                                     ▼
┌────────────────────────────────────────────────────────────────────────┐
│              Family TV Guardian Backend (Port 3001)                    │
│  • AI Content Intelligence (Topics, Safety Signals, Educational Score) │
│  • Frame Context Store & Grounded RAG                                  │
│  • Live Parent Briefing & Q&A                                          │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Fire TV OS Native Components

All native source files are located in `reference-sample/apps/expo-multi-tv/android/app/src/main/`:

| Component | File Path | Responsibilities |
| :--- | :--- | :--- |
| **`GuardianAccessibilityService`** | [`GuardianAccessibilityService.kt`](file:///Users/anik/Desktop/amazon-hack/reference-sample/apps/expo-multi-tv/android/app/src/main/java/com/multitv/guardian/GuardianAccessibilityService.kt) | Listens to `TYPE_WINDOW_STATE_CHANGED` & `TYPE_WINDOW_CONTENT_CHANGED`. Identifies foreground app (`com.google.android.youtube.tv`, `com.amazon.amazonvideo.livingroom`, `com.netflix.ninja`). Recursively extracts on-screen text from `AccessibilityNodeInfo`. |
| **`GuardianOverlayService`** | [`GuardianOverlayService.kt`](file:///Users/anik/Desktop/amazon-hack/reference-sample/apps/expo-multi-tv/android/app/src/main/java/com/multitv/guardian/GuardianOverlayService.kt) | Android Foreground Service drawing a non-focusable floating HUD pill (`TYPE_APPLICATION_OVERLAY`) in the top-right corner. Runs the **2-minute periodic sampling loop** to capture and dispatch frame context to `/api/overlay/ingest-frame`. |
| **`MediaSessionTracker`** | [`MediaSessionTracker.kt`](file:///Users/anik/Desktop/amazon-hack/reference-sample/apps/expo-multi-tv/android/app/src/main/java/com/multitv/guardian/MediaSessionTracker.kt) | Inspects active `MediaSession` objects for now-playing track titles, artists, and playback state (`PLAYING`/`PAUSED`). |
| **`GuardianBridgeModule`** | [`GuardianBridgeModule.kt`](file:///Users/anik/Desktop/amazon-hack/reference-sample/apps/expo-multi-tv/android/app/src/main/java/com/multitv/guardian/GuardianBridgeModule.kt) | React Native native module bridge exposing `startOverlay()`, `stopOverlay()`, and permission checks to JavaScript. |
| **`AndroidManifest.xml`** | [`AndroidManifest.xml`](file:///Users/anik/Desktop/amazon-hack/reference-sample/apps/expo-multi-tv/android/app/src/main/AndroidManifest.xml) | Declares permissions (`SYSTEM_ALERT_WINDOW`, `FOREGROUND_SERVICE`, `BIND_ACCESSIBILITY_SERVICE`) and service configurations. |

---

## 3. How the 2-Minute Ingestion Works

1. **Active Child Context**: The service is initialized with child context:
   - Example: `child_id: "child_aarav"`, `child_name: "Aarav"`.
2. **Periodic Sampling Loop**:
   - Every **120 seconds** (2 minutes), the background timer fires `sampleAndIngestFrameContext()`.
3. **Context Gathering**:
   - Detects the current active app:
     - `com.google.android.youtube.tv` -> **YouTube**
     - `com.amazon.amazonvideo.livingroom` -> **Amazon Prime Video**
     - `com.netflix.ninja` -> **Netflix**
     - `com.disney.disneyplus` -> **Disney+**
   - Retrieves active media title from `MediaSession` or on-screen `AccessibilityNodeInfo` tree.
   - Extracts on-screen text snippets (e.g. video subtitles, episode title, channel description).
4. **Backend RAG Storage**:
   - Posts payload to `POST /api/overlay/ingest-frame`.
   - The AI pipeline automatically:
     - Classifies the learning category (Educational vs Entertainment).
     - Extracts learning topics (`["space exploration", "astronomy"]` or `["marine biology"]`).
     - Scores educational value (0–100).
     - Detects safety/violence signals (`none`, `mild_action`, `intense`).
     - Stores the frame in the vector/RAG memory.
     - Extends the child's daily screen time and updates the Daily Digest.

---

## 4. Hardware & Device Setup (Fire TV Stick or Emulator)

### Prerequisites
- Fire TV Stick 4K / Cube, or Android Studio TV Emulator (Android 11 / API 30+).
- Computer with `adb` installed (`brew install --cask android-platform-tools`).

### Step 1: Enable Developer Options on Fire TV
1. On your Fire TV, navigate to **Settings** -> **My Fire TV** -> **About**.
2. Highlight the device name and click the select button on your remote **7 times**.
3. A prompt will display: *"No need, you are already a developer."*
4. Go back to **Settings** -> **My Fire TV** -> **Developer Options**:
   - Set **ADB Debugging** to **ON**.
   - Set **Apps from Unknown Sources** to **ON**.

### Step 2: Connect via ADB
Find your Fire TV's IP address in **Settings** -> **My Fire TV** -> **About** -> **Network**.
```bash
adb connect <FIRE_TV_IP>:5555
```
*(On your TV screen, allow USB/ADB debugging from this computer).*

### Step 3: Grant System Overlay & Accessibility Permissions
Because Fire TV OS is designed for lean TV experiences, overlay and accessibility permissions can be granted directly via ADB commands:

```bash
# 1. Grant Draw Over Other Apps (SYSTEM_ALERT_WINDOW)
adb shell pm grant com.multitv.guardian android.permission.SYSTEM_ALERT_WINDOW

# 2. Enable the Guardian Accessibility Service
adb shell settings put secure enabled_accessibility_services com.multitv.guardian/.GuardianAccessibilityService
adb shell settings put secure accessibility_enabled 1
```

### Step 4: Start the Guardian Overlay
```bash
# Start the overlay service for Aarav
adb shell am start-foreground-service \
  -a com.multitv.guardian.action.START \
  --es child_id "child_aarav" \
  --es child_name "Aarav" \
  --es backend_url "http://<YOUR_COMPUTER_LOCAL_IP>:3001/api" \
  com.multitv.guardian/.GuardianOverlayService
```

You will see the floating badge:
`🛡️ Guardian • Aarav (Active)`
appear in the top-right corner of the TV screen!

---

## 5. Real-Life Testing Scenarios

### Test Scenario A: YouTube Playback
1. Open the YouTube app on your Fire TV.
2. Play any educational or cartoon video (e.g. *James Webb Space Telescope* or *National Geographic Animals*).
3. The Guardian HUD will remain visible in the top-right corner without interfering with playback or remote controls.
4. After 2 minutes, inspect the backend terminal or web dashboard. The frame sample will appear:
   - App: **YouTube**
   - Media: On-screen video title
   - Topics: `space exploration`, `astronomy`
   - Educational Score: `85/100`

### Test Scenario B: Netflix Cartoon Playback
1. Switch to the Netflix app and launch a cartoon (e.g. *Paw Patrol*).
2. The Accessibility service immediately detects the package switch to `com.netflix.ninja`.
3. In the next 2-minute cycle, the frame is ingested:
   - App: **Netflix**
   - Topics: `kids animation`, `comedy`
   - Category: `Entertainment`

### Test Scenario C: Grounded Parent Q&A
Open the Parent Dashboard at `http://localhost:3001/dashboard`:
- Ask: **"What did Aarav watch on YouTube today?"**
  - AI Answer: *"Aarav watched 6 minutes on YouTube today. The Fire TV overlay sampled: 'Hubble vs James Webb: The Cosmic Breakthrough' (4m), 'How Stars Are Born in the Eagle Nebula' (2m)."*
- Ask: **"Did he watch Netflix today?"**
  - AI Answer: *"Aarav watched 2 minutes on Netflix today. The Fire TV overlay sampled: 'Paw Patrol: Adventure City Laughs' (2m)."*

All responses are strictly backed by the 2-minute sampled frames!
