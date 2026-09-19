# Family TV Guardian: Dependencies & Procurement Guide

This guide details all prerequisites, dependencies, procurement steps, and instructions for running and testing **Family TV Guardian** in real-life scenarios.

---

## 1. Quick Architecture Summary

```
┌──────────────────────────────────────────────────────────┐
│                   Family TV Guardian                     │
├──────────────────────────┬───────────────────────────────┤
│ Fire TV / Connected App  │ React Native Multi-TV         │
│                          │ (Fire OS, Android TV, Web)    │
├──────────────────────────┼───────────────────────────────┤
│ Viewing Event API        │ Node.js + Express + TS        │
│ & Content Intelligence   │ (Port 3001)                   │
├──────────────────────────┼───────────────────────────────┤
│ AI Intelligence Engine   │ Amazon Bedrock (Claude 3 /    │
│                          │ Nova) + Local Fallback        │
├──────────────────────────┼───────────────────────────────┤
│ Parent Dashboard &       │ HTML5 / CSS3 / ES6            │
│ Scenario Simulator       │ http://localhost:3001/dashboard│
└──────────────────────────┴───────────────────────────────┘
```

---

## 2. Dependencies & Procurement Breakdown

### A. Core Runtime & Tooling

| Dependency | Purpose | Minimum Version | Procurement / Installation Method |
| :--- | :--- | :--- | :--- |
| **Node.js** | Backend server & JS runtime | `v18.0.0+` (Tested on `v24`) | Download from [nodejs.org](https://nodejs.org/) or install via nvm: `nvm install 20` |
| **npm** | Package management | `v9.0.0+` | Pre-bundled with Node.js |
| **Git** | Codebase source control | `v2.30+` | macOS: `brew install git` or Xcode CLI tools |

---

### B. AI Engine: Amazon Bedrock (Cloud Option)

To use Amazon Bedrock for generative AI analysis and parent Q&A:

#### How to Procure AWS Bedrock Access:
1. **Create an AWS Account**:
   - Go to [aws.amazon.com](https://aws.amazon.com/) and register an account.
2. **Request Amazon Bedrock Model Access**:
   - In the AWS Management Console, set your region to `us-east-1` (N. Virginia) or `us-west-2` (Oregon).
   - Search for **Amazon Bedrock** in the top search bar.
   - In the left navigation menu, click **Model access**.
   - Click the orange **Modify model access** button.
   - Check the boxes for:
     - **Anthropic Claude 3 Haiku** (`anthropic.claude-3-haiku-20240307-v1:0`)
     - **Amazon Nova Micro** (`amazon.nova-micro-v1:0`) or **Amazon Titan Text Express**
   - Click **Next** and **Submit**. Access is typically granted within 1–2 minutes.
3. **Create IAM Credentials**:
   - Go to the **IAM Console** -> **Users** -> **Create User** (e.g. `tv-guardian-admin`).
   - Attach the policy `AmazonBedrockFullAccess` (or custom policy with `bedrock:InvokeModel`).
   - Create an Access Key under the **Security credentials** tab.
4. **Configure Environment Variables**:
   - In `server/.env`:
     ```bash
     AWS_REGION=us-east-1
     AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE
     AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
     BEDROCK_MODEL_ID=anthropic.claude-3-haiku-20240307-v1:0
     ```

> [!NOTE]
> **Zero-Friction Local Intelligence Engine**:
> If AWS credentials are NOT provided, Family TV Guardian automatically falls back to its built-in High-Fidelity Intelligence Engine. This allows hackathon judges and testers to run full end-to-end scenarios completely offline with zero configuration!

---

### C. TV Platform Targets & Simulators

Depending on your testing environment:

#### 1. Zero-Hardware Web Simulator (Recommended for instant testing)
- **Requirements**: Any modern web browser (Chrome, Firefox, Safari, Edge).
- **How to Procure**: Already on your machine! Open `http://localhost:3001/dashboard`.

#### 2. Physical Fire TV Device (Fire TV Stick 4K / Cube)
- **Requirements**:
  - Fire TV device on the same local Wi-Fi network.
  - Enable Developer Options on Fire TV:
    1. Go to **Settings** -> **My Fire TV** -> **About**.
    2. Click the device name 7 times until "You are now a developer" appears.
    3. Go back to **Developer Options** -> Enable **ADB Debugging** and **Apps from Unknown Sources**.
  - Install Android Platform Tools (ADB):
    - macOS: `brew install --cask android-platform-tools`
    - Connect to Fire TV: `adb connect <FIRE_TV_IP_ADDRESS>:5555`

#### 3. Android TV / Fire TV Emulator
- **Requirements**:
  - [Android Studio](https://developer.android.com/studio) installed.
  - In Android Studio Virtual Device Manager, create a TV emulator:
    - Hardware: **Television (1080p)**.
    - System Image: **Android 11 (Google TV / Android TV)** or **API 28-34**.

#### 4. Fire TV Vega OS (Vega SDK)
- **Requirements**:
  - Amazon Vega SDK (available to Amazon Developer Hackathon participants via the official [Amazon Developer Portal](https://developer.amazon.com/docs/vega/0.21/install-vega-sdk.html)).

---

## 3. Step-by-Step Execution & Real-Life Testing

### Step 1: Start the Backend & Dashboard

```bash
cd server
npm start
```

Output:
```
=================================================
🛡️  Family TV Guardian Backend is running on port 3001
📡  API: http://localhost:3001/api
💻  Parent Dashboard: http://localhost:3001/dashboard
=================================================
✅ Content catalog preheated and intelligence signals loaded.
```

### Step 2: Run the Automated Real-Life Scenario Verification Suite

In a separate terminal, execute:
```bash
npm run test:real-life --prefix server
```

This verifies:
1. Child profile registration (Aarav).
2. Video playback session event ingestion (`started_at`, `ended_at`, duration).
3. AI structured content analysis & topic extraction (Space, Astronomy, Robotics, Action).
4. Safety & violence signal detection (detects mild action sequence in cartoon content).
5. Daily digest aggregation (screen time ratio, educational time, category breakdown).
6. Evidence-grounded parent Q&A queries.

### Step 3: Interactive Real-Life Scenario Testing via Web UI

Open your browser to:
👉 **[http://localhost:3001/dashboard](http://localhost:3001/dashboard)**

#### Real-Life Test Cases:
1. **Scenario 1: Educational Space Exploration**:
   - Click the **"🚀 Aarav's Space Day (25m)"** button.
   - Notice the Daily Briefing update: Total Screen Time updates, Educational Time updates to 25 min (or higher), and Extracted Topics shows `space`, `astronomy`, `deep cosmos`.
2. **Scenario 2: Safety Signal Detection**:
   - Click the **"💥 Action Cartoon (Flag Test)"** button.
   - Look under **Content Signals & Safety Exceptions**: A warning card highlights: *"Detected mild animated action sequence / laser stunts"* with evidence citation.
3. **Scenario 3: Grounded Parent Q&A**:
   - Click the suggested prompt: **"What did he learn about space?"**.
   - Read the AI answer: *"Aarav watched 'James Webb Space Telescope: Unveiling Deep Space' for 25 minutes. He learned about how the James Webb Space Telescope uses gold-coated infrared mirrors to view ancient galaxies..."*
   - Inspect the **Verified Evidence** card attached below the answer.
4. **Scenario 4: Direct Video Playback**:
   - Scroll down to **Catalog & Player Simulator**.
   - Click **"▶ Watch & Track"** on *Coding Robots: How Machines Think*.
   - The session is dynamically captured, analyzed, and integrated into Aarav's daily profile!
