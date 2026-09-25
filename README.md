# 🛡️ Family TV Guardian

> **AI-Powered Viewing Intelligence, Parent Companion & Cross-Device TV Governance for Amazon Fire TV**  
> *Developed for the Amazon Developer Hackathon — Fire TV & Living Room Experience Track*

[![Fire TV](https://img.shields.io/badge/Platform-Fire%20TV%20%7C%20Fire%20OS%20%7C%20Vega-orange.svg?style=for-the-badge&logo=amazon)](https://developer.amazon.com/fire-tv)
[![Amazon Bedrock](https://img.shields.io/badge/AI-Amazon%20Bedrock%20Claude%203%20%2F%20Nova-blue.svg?style=for-the-badge&logo=amazonaws)](https://aws.amazon.com/bedrock/)
[![React Native Multi-TV](https://img.shields.io/badge/TV%20Client-React%20Native%20Multi--TV-61dafb.svg?style=for-the-badge&logo=react)](https://github.com/AmazonAppDev/react-native-multi-tv-app-sample)
[![Parent Mobile App](https://img.shields.io/badge/Mobile-React%20Native%20%2F%20Expo-black.svg?style=for-the-badge&logo=expo)](file:///d:/Dev/Projects/amazon-developer-hackathon-tvOS/mobile)
[![Android APK](https://img.shields.io/badge/Release-Android%20APK%20Ready-success.svg?style=for-the-badge&logo=android)](file:///d:/Dev/Projects/amazon-developer-hackathon-tvOS/mobile/FamilyTVGuardian.apk)
[![TypeScript](https://img.shields.io/badge/Backend-TypeScript%20%2F%20Node.js-3178c6.svg?style=for-the-badge&logo=typescript)](file:///d:/Dev/Projects/amazon-developer-hackathon-tvOS/server)

---

## 📌 Executive Summary

Screen time metrics tell parents **how long** their children watch TV, but give zero insight into **what they watched, what educational value it provided, or whether viewing behaviors are healthy**. 

Raw viewing logs burden parents with endless lists of episodes and timestamps. **Family TV Guardian** transforms passive screen time monitoring into an **interpretable, cognitive viewing intelligence system**.

> *"Don't just count screen minutes. Uncover what they actually mean."*

```
       📺 Fire TV 10-Foot UI                  📱 Parent Mobile Companion
  ┌──────────────────────────────┐       ┌─────────────────────────────────┐
  │  • Spatial Nav Remote UI     │       │  • Secured Parent Auth (2FA)    │
  │  • Real-Time Media Tracker   │       │  • Camera QR TV Login Scanner   │
  │  • Dynamic QR Code Display   │       │  • Daily Intelligence Digests   │
  │  • Remote Lock / Bedtime HUD │       │  • Grounded RAG "Ask AI" Chat   │
  └──────────────┬───────────────┘       │  • Live Remote TV Controls      │
                 │                       └────────────────┬────────────────┘
                 │ WebSocket / REST                       │ WebSocket / REST
                 └───────────────────┐ ┌──────────────────┘
                                     ▼ ▼
                       ┌───────────────────────────────┐
                       │  Family TV Guardian Backend   │
                       │  • Ingest & Vision Engine     │
                       │  • Grounded RAG Vector Store  │
                       │  • WebSocket Event Bus        │
                       │  • Auth & Device Binding      │
                       └───────────────┬───────────────┘
                                       │
                                       ▼
                       ┌───────────────────────────────┐
                       │   Amazon Bedrock Generative   │
                       │   Intelligence (Claude 3 /    │
                       │   Amazon Nova Micro / Titan)  │
                       └───────────────────────────────┘
```

---

## ✨ Key Capabilities

### 1. 🧠 Grounded Viewing RAG (Retrieval-Augmented Generation)
- Parents can ask natural language questions in real-time: *"What did Aarav learn today?"*, *"Did he watch any violent scenes?"*, or *"Was his coding video actually educational?"*.
- Queries are grounded in real viewing evidence (synopses, transcripts, Accessibility text snippets, and timestamps) with clickable evidence cards and confidence scores.

### 2. 📊 Educational & Cognitive Scoring (0–100)
- Analyzes educational value, STEM topics (space, astronomy, coding, biology), age appropriateness, and language/violence safety signals.
- Generates categorized daily digests highlighting educational breakthroughs and potential concerns.

### 3. 📷 Zero-Typing TV QR Code Pairing & Mobile Sync
- **No typing passwords on TV with a remote.**
- The Fire TV renders a cryptographic, expiring QR code on screen.
- Parents scan the QR code using the **Parent Mobile App's built-in camera scanner**.
- The TV immediately authenticates and links to the parent's household over WebSockets.

### 4. 🔐 High-Security Parent Account System
- Multi-factor authentication supporting **Email** or **E.164 International Phone Numbers**.
- **bcrypt** password hashing with salt rounds.
- 6-digit **2FA OTP challenges** with attempt throttling, rate limiting, and expiration.
- Cryptographically signed **JWT access and refresh tokens** with TV device token rotation.

### 5. 🎮 Real-Time TV Remote Governance
- From anywhere in the world, parents can send instant commands over persistent WebSockets:
  - ⏸️ **Remote Pause / Resume**
  - 🔒 **Immediate Screen Lock**
  - ⏳ **Extend Daily Limit (+15 / +30 min)**
  - 🌙 **Trigger Bedtime Mode**

### 6. 📱 Standalone Android Parent Mobile APK
- Fully pre-compiled and signed standalone APK: **[`FamilyTVGuardian.apk`](file:///d:/Dev/Projects/amazon-developer-hackathon-tvOS/mobile/FamilyTVGuardian.apk)** (59.5 MB).
- Runs on any Android mobile device or emulator without requiring Android Studio.

---

## 🏛️ Repository Architecture & Ecosystem

```
amazon-developer-hackathon-tvOS/
├── mobile/                        # 📱 Parent Mobile Companion App (React Native / Expo)
│   ├── FamilyTVGuardian.apk       # 🚀 Ready-to-install Standalone Android APK (59.5 MB)
│   ├── src/
│   │   ├── components/            # QrScannerModal, RemoteControlModal, BottomNav
│   │   ├── navigation/            # Native Stack Navigation & Type Safety
│   │   ├── screens/               # Auth, Dashboard, ChildDigest, AskAI, LinkedTVs
│   │   └── services/              # API Client, WebSocket Client, Storage
│   ├── android/                   # Generated Android Native Project (Hermes / C++)
│   └── App.tsx                    # Mobile App Entrypoint & Global State Provider
│
├── server/                        # 🖥️ Intelligence Backend & Real-Time Event Bus
│   ├── src/
│   │   ├── db/database.ts         # Persistent Data Store (JSON + CRUD Operations)
│   │   ├── routes/                # authRoutes.ts (2FA & QR), api.ts (Ingest & RAG)
│   │   ├── services/              # authService, aiPipeline, qaService, digestService
│   │   └── index.ts               # Express Server & WebSocket Server
│   ├── test/                      # E2E test suites (tvPairingFlow.test.ts, realLifeScenario)
│   └── data/guardian_db.json      # Pre-seeded database with profiles, sessions & frames
│
├── reference-sample/              # 📺 Amazon Fire TV 10-Foot Living Room App
│   ├── apps/expo-multi-tv/        # Fire OS / Android TV / Web target runners
│   └── packages/shared-ui/        # TV Spatial Navigation Screens (Login, Dashboard, Player)
│
├── web-dashboard/                 # 💻 Parent Web Companion & 1-Click Scenario Simulator
│   ├── index.html                 # Interactive Web UI (Dark Mode, Responsive)
│   ├── app.js                     # Live WebSocket Client & Simulator Controller
│   └── styles.css                 # Modern CSS Design Tokens
│
└── DEPENDENCIES_AND_PROCUREMENT.md# 📖 Comprehensive procurement & deployment manual
```

---

## 📲 Fire TV QR Pairing & Parent Auth Workflow

```
[ Step 1: Parent Sign Up & 2FA ]
Parent Mobile App ──> POST /api/auth/register (Email/Phone + Password)
                 ──> POST /api/auth/login    (Returns challenge_id)
                 ──> POST /api/auth/verify-2fa (6-digit OTP -> JWT Token)

[ Step 2: Fire TV Generates Dynamic QR ]
Fire TV App      ──> POST /api/auth/tv-pair/session
Server           ──> Returns { short_code: "GARD-892", qr_data_url: "data:image/png..." }
Fire TV App      ──> Displays high-contrast QR code on 10-foot TV screen

[ Step 3: Camera Scan & Immediate Binding ]
Parent Mobile    ──> Scans QR Code using expo-camera
Parent Mobile    ──> POST /api/auth/tv-pair/approve (Bearer Token + Pair Token)
Server           ──> Binds Fire TV device to Parent Household
Server           ──> Broadcasts 'tv:paired' event over WebSockets

[ Step 4: TV Instant Unlock ]
Fire TV App      ──> Receives WebSocket event -> Unlocks Parent Dashboard & Player
```

---

## 🔌 API Reference

### 🔐 Authentication & Accounts (`/api/auth`)
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/auth/register` | Create parent account with email or phone + password |
| `POST` | `/api/auth/login` | Validate credentials and trigger 2FA OTP challenge |
| `POST` | `/api/auth/verify-2fa` | Verify 6-digit OTP code, returns JWT access & refresh tokens |
| `POST` | `/api/auth/resend-otp` | Request a fresh OTP code for an active challenge |
| `POST` | `/api/auth/forgot-password`| Initiate account recovery with OTP verification |
| `POST` | `/api/auth/reset-password` | Set new password upon successful recovery challenge |
| `GET` | `/api/auth/me` | Retrieve authenticated parent profile & linked children |

### 📺 Fire TV Pairing (`/api/auth/tv-pair` & `/api/pairing`)
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/auth/tv-pair/session` | Create new pairing session (returns short code + QR data URL) |
| `GET` | `/api/auth/tv-pair/status/:token` | Long-poll or check TV pairing authorization status |
| `POST` | `/api/auth/tv-pair/approve` | Parent approves pairing session via scanned QR payload |
| `GET` | `/api/auth/tv-pair/devices` | List all Fire TV devices authorized for the parent's household |
| `DELETE`| `/api/auth/tv-pair/devices/:id` | Unlink / revoke access for a Fire TV device |
| `GET` | `/api/pairing/qr/:sessionId.png` | Stream dynamic QR code PNG directly to TV browser/view |

### 🎮 Remote TV Governance (`/api/auth/remote-command`)
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/auth/remote-command` | Send real-time commands (`pause`, `resume`, `lock`, `extend_time`, `bedtime`) |

### 🧠 Content Intelligence & RAG (`/api`)
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/events/session` | Ingest completed viewing session from Fire TV player |
| `POST` | `/api/ingest/frame` | Ingest live frame metadata / AccessibilityNodeInfo text |
| `GET` | `/api/digest/:child_id/today` | Fetch daily viewing digest, top topics & notable highlights |
| `POST` | `/api/qa` | Ask natural language question grounded in stored child viewing history |

---

## 🚀 Quickstart Guide

### 1. Clone & Set Up the Backend
```bash
git clone https://github.com/dasanik2001/amazon-developer-hackathon-tvOS.git
cd amazon-developer-hackathon-tvOS/server
npm install
npm start
```
- **Backend API**: `http://localhost:3001/api`
- **Parent Web Dashboard**: `http://localhost:3001/dashboard`
- **WebSocket Endpoint**: `ws://localhost:3001`

### 2. Run Automated Verification Tests
Verify all AI pipelines, viewing ingestion, and TV QR pairing flows:
```bash
# Test E2E TV QR Pairing & 2FA Auth Flow
npm run test:tv-pairing --prefix server

# Test Real-Life Viewing Scenario & Grounded AI Intelligence
npm run test:real-life --prefix server
```

### 3. Run or Install the Parent Mobile App

#### Option A: Install Standalone APK (Recommended for Phone/Emulator)
Transfer the pre-built APK to your phone or emulator:
```bash
# File located at:
mobile/FamilyTVGuardian.apk (59.5 MB)

# Install via ADB:
adb install mobile/FamilyTVGuardian.apk
```

#### Option B: Run in Expo Development Mode
```bash
cd mobile
npm install
npx expo start
```
Scan the terminal QR code using **Expo Go** on your iOS or Android phone to launch instantly.

### 4. Run the Fire TV Living Room App
```bash
cd reference-sample
npm install
npm run start:multi-tv
```
- Select **Android** to run on your connected Fire TV Stick via ADB (`adb connect <FIRE_TV_IP>`).
- Select **Web** to run the 10-foot spatial navigation UI in your desktop browser.

---

## 🤖 Amazon Bedrock Integration

Family TV Guardian leverages **Amazon Bedrock** for high-accuracy content analysis and grounded RAG responses:
- **Primary Model**: Anthropic Claude 3 Haiku (`anthropic.claude-3-haiku-20240307-v1:0`) for low-latency cognitive extraction.
- **Secondary Model**: Amazon Nova Micro (`amazon.nova-micro-v1:0`) for cost-effective topic clustering.
- **Local Fallback Engine**: If AWS credentials are not configured, the backend seamlessly switches to its built-in rule-and-heuristic engine, ensuring **100% offline availability during evaluation and demos**.

Configure your AWS credentials in [`server/.env`](file:///d:/Dev/Projects/amazon-developer-hackathon-tvOS/server/.env):
```env
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
BEDROCK_MODEL_ID=anthropic.claude-3-haiku-20240307-v1:0
```

---

## 🔒 Security & Privacy by Design

- **COPPA & Child Privacy Compliance**: No raw video or camera footage is ever transmitted to the cloud. Only extracted semantic topics, accessibility metadata, and text summaries are processed.
- **Encrypted Credentials**: Passwords hashed using industry-standard **bcrypt** (salt rounds = 10).
- **Expiring Secrets**: 2FA OTP codes expire in 5 minutes with a maximum of 3 attempts. TV pairing QR tokens expire in 10 minutes.
- **Token Rotation**: Short-lived JWT access tokens (1 hour) paired with secure refresh tokens (7 days).

---

## 🏆 Hackathon Alignment & Innovation

| Hackathon Criterion | Family TV Guardian Solution |
| :--- | :--- |
| **Living Room Innovation** | Solves the #1 parent frustration with streaming TV through conversational AI and daily cognitive digests instead of rigid screen-time bans. |
| **Fire TV Native Synergy** | Built upon Amazon's official `react-native-multi-tv-app-sample` with complete D-Pad spatial navigation, HDMI-CEC readiness, and Accessibility API compatibility. |
| **AWS & Amazon Bedrock** | Direct AWS SDK v3 integration utilizing state-of-the-art foundation models with graceful zero-downtime local fallback. |
| **Cross-Device Cohesion** | Unifies the Fire TV 10-foot experience with an authenticated Parent Mobile App, dynamic QR pairing, and real-time WebSocket governance. |

---

## 📄 License & Attribution

This project is licensed under the **Apache License 2.0**.  
Developed for the **Amazon Developer Hackathon (Fire TV & Vega Track)**.
