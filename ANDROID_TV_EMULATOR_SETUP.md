# Android TV Virtual Device Setup Guide (Android Studio & macOS)

This guide walks you through setting up an **Android TV Virtual Device (AVD)** in Android Studio on macOS (Apple Silicon / Intel) to test **Family TV Guardian** with a native TV experience, spatial D-pad navigation, and the background overlay service.

---

## 1. Prerequisites: Install Android Studio

If Android Studio is not already installed on your Mac:

### Option A: Install via Homebrew (Recommended)
```bash
brew install --cask android-studio
```

### Option B: Download Directly
Download the official installer from [developer.android.com/studio](https://developer.android.com/studio).

---

## 2. Configure Environment Variables

Add Android SDK paths to your `~/.zshrc` (or `~/.bash_profile`):

```bash
# Open ~/.zshrc
nano ~/.zshrc
```

Paste the following at the bottom:
```bash
export ANDROID_HOME=$HOME/Library/Android/sdk
export ANDROID_SDK_ROOT=$HOME/Library/Android/sdk
export PATH=$PATH:$ANDROID_HOME/emulator
export PATH=$PATH:$ANDROID_HOME/platform-tools
export PATH=$PATH:$ANDROID_HOME/cmdline-tools/latest/bin
```

Save and reload:
```bash
source ~/.zshrc
```

---

## 3. Create the Android TV Virtual Device in Android Studio

1. **Open Android Studio**.
2. From the welcome screen or the main toolbar, open **Virtual Device Manager**:
   - Menu: **Tools** -> **Device Manager** (or click the phone/tablet icon in the top right).
3. Click the **`+` (Create Device)** button.
4. **Select Category**:
   - In the left sidebar under *Category*, select **TV**.
5. **Select TV Profile**:
   - Choose **Television (1080p)** (Resolution: `1920 x 1080`, `320 dpi`).
   - Click **Next**.
6. **Select System Image**:
   - For **Apple Silicon Macs (M1/M2/M3/M4)**:
     - Under the **Recommended** or **Other Images** tab, locate:
       - **Android 11.0 ("Google TV")** or **Android 13.0 ("Google TV")**.
       - ABI: **`arm64-v8a`** (essential for hardware virtualization speed on Apple Silicon).
   - Click the **Download** (arrow) icon next to the image if not already downloaded.
   - Once downloaded, select the image and click **Next**.
7. **Verify & AVD Configuration**:
   - AVD Name: `Android_TV_1080p`
   - Startup orientation: **Landscape**
   - Click **Show Advanced Settings**:
     - *Memory and Storage*: RAM: `2048 MB`, Internal Storage: `4096 MB`.
     - *Graphics*: Select **Hardware - GLES 2.0** (for 60fps smooth playback).
8. Click **Finish**.

---

## 4. Launch the TV Virtual Device

1. In Android Studio **Device Manager**, click the **Play (▶)** button next to `Android_TV_1080p`.
2. The TV emulator window will boot up showing the **Google TV / Android TV Home screen**.
3. Notice the floating TV Remote Controller on the side of the emulator:
   - **D-Pad Directional Arrows** (Up, Down, Left, Right)
   - **Center Button** (Select / OK)
   - **Back Button (◀)**
   - **Home Button (⚪)**

> [!TIP]
> **Keyboard Shortcuts for TV Navigation**:
> - Arrow Keys = D-Pad Navigation
> - Enter / Return = Select / Click
> - Esc / Backspace = TV Remote Back Button
> - Home key = TV Remote Home

---

## 5. Connecting and Running the App

### Step 1: Verify ADB Detects the TV Emulator
In your terminal, run:
```bash
adb devices
```
Expected output:
```text
List of devices attached
emulator-5554    device
```

### Step 2: Ensure Family TV Guardian Backend is Running
In your project terminal:
```bash
cd /Users/anik/Desktop/amazon-hack/server
npm start
```
*(Runs backend on port 3001; on the Android emulator, your Mac is automatically reached at `http://10.0.2.2:3001`)*.

### Step 3: Launch the TV App on the Emulator
From the workspace root:
```bash
cd reference-sample
yarn dev:android
```
Or directly using Expo:
```bash
cd reference-sample/apps/expo-multi-tv
npx expo run:android
```

---

## 6. Testing Key Scenarios on the TV Virtual Device

### A. Testing Spatial D-Pad Navigation & Player
1. Use your keyboard Arrow Keys or the Emulator Remote D-Pad to move through the drawer.
2. Select a video title (e.g. *James Webb Space Discovery*).
3. Press **Enter** to start playback.
4. Press **Enter** during playback to bring up the TV video controls, seek forward/back with Left/Right arrows.
5. Press **Esc** (Back). Observe: the session tracking hook registers duration and sends it to `http://10.0.2.2:3001/api/events/session`.

### B. Testing the On-TV Parent Dashboard
1. Open the left drawer menu on the TV.
2. Navigate down to **🛡️ Parent Briefing** and press **Enter**.
3. View the live Daily Briefing, Total Screen Time, Educational Percentage, and Extracted Topics tags.

### C. Testing the On-TV "Ask AI" Assistant
1. Navigate down to **💬 Ask AI** in the drawer.
2. Use the D-Pad to select *"What did Aarav learn about space?"*.
3. Press **Enter**. The TV screen queries the backend RAG engine and renders the answer with cited source cards!

### D. Testing the System-Wide Floating Overlay Over Third-Party Apps
1. Grant overlay permissions to the app on the emulator via ADB:
   ```bash
   adb shell pm grant com.multitv.guardian android.permission.SYSTEM_ALERT_WINDOW
   adb shell settings put secure enabled_accessibility_services com.multitv.guardian/.GuardianAccessibilityService
   adb shell settings put secure accessibility_enabled 1
   ```
2. Start the foreground overlay service:
   ```bash
   adb shell am start-foreground-service \
     -a com.multitv.guardian.action.START \
     --es child_id "child_aarav" \
     --es child_name "Aarav" \
     --es backend_url "http://10.0.2.2:3001/api" \
     com.multitv.guardian/.GuardianOverlayService
   ```
3. Open YouTube or any browser on the Android TV emulator:
   - Notice the **`🛡️ Guardian • Aarav (Active)`** HUD pill floating in the top-right corner.
   - Every 2 minutes, frame and media titles are captured and ingested into the backend RAG system!
