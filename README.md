# Family TV Guardian

> **AI-Powered Viewing Intelligence Layer for Fire TV**  
> *Amazon Developer Hackathon: Fire TV Track*

[![Fire TV](https://img.shields.io/badge/Platform-Fire%20TV%20%7C%20Fire%20OS%20%7C%20Vega-orange)](https://developer.amazon.com/fire-tv)
[![AI](https://img.shields.io/badge/AI-Amazon%20Bedrock-blue)](https://aws.amazon.com/bedrock/)
[![React Native](https://img.shields.io/badge/React%20Native-Multi--TV-61dafb)](https://github.com/AmazonAppDev/react-native-multi-tv-app-sample)

---

## 💡 The Core Problem & Vision

Parents often know total screen time, but lack useful context: **what was watched, what it contained, whether it was educational, and whether viewing patterns are healthy.** 

A raw watch-history list creates tedious work for the parent. Instead of punitive timers or simple content blockers, **Family TV Guardian** turns viewing events into an interpretable daily briefing.

> *"Do not just tell parents how long their child watched. Tell them what it meant."*

---

## 🎯 P0 MVP Features Implemented

| Feature | PRD MVP Behavior | Implementation Status |
| :--- | :--- | :--- |
| **Viewing Session Tracking** | Record title/content, start/end timestamps, duration, and completion | ✅ Implemented in `PlayerScreen.tsx` & `/api/events/session` |
| **Content Intelligence** | Classify categories, topics, educational scores, age-oriented signals, and safety flags | ✅ Implemented via Amazon Bedrock Claude 3 / Nova & Local Engine |
| **Daily Digest** | Summarize total screen time, category mix, and notable highlights | ✅ Implemented in `digestService.ts` & Dashboard screens |
| **Parent Q&A (Grounded RAG)**| Natural-language parent questions grounded in stored viewing evidence | ✅ Implemented in `qaService.ts` with clickable evidence cards |
| **Topic Extraction** | Extract learning themes (space, marine biology, robotics/STEM, coding) | ✅ Implemented in AI Pipeline & Topic chips |

---

## 🏛️ System Architecture

```
┌────────────────────────────────────────────────────────┐
│               Fire TV App (React Native)               │
│  - Spatial Navigation Remote Control                   │
│  - Session Tracking Hook in PlayerScreen               │
│  - TV-native Parent Briefing & Ask AI Screens          │
└──────────────────────────┬─────────────────────────────┘
                           │ POST /api/events/session
                           ▼
┌────────────────────────────────────────────────────────┐
│           Family TV Guardian Backend (Node/TS)         │
│  - Viewing Event Store & Ingestion Pipeline            │
│  - Daily Digest Engine & Aggregations                  │
│  - Grounded RAG Parent Q&A Engine                      │
└──────────────────────────┬─────────────────────────────┘
                           │ Content enrichment & Q&A
                           ▼
┌────────────────────────────────────────────────────────┐
│              AI Intelligence Layer                     │
│  - Amazon Bedrock (Anthropic Claude 3 / Amazon Nova)   │
│  - High-Fidelity Local Intelligence Engine (Fallback)  │
└────────────────────────────────────────────────────────┘
```

---

## 🚀 Quick Start (2-Minute Test)

### 1. Install & Start Backend + Parent Dashboard
```bash
cd server
npm install
npm start
```
- **Backend API**: `http://localhost:3001/api`
- **Parent Dashboard & Scenario Simulator**: `http://localhost:3001/dashboard`

### 2. Run the Automated Real-Life Scenario Suite
```bash
npm run test:real-life --prefix server
```

### 3. Open the Interactive Web Dashboard
Navigate to [http://localhost:3001/dashboard](http://localhost:3001/dashboard) in your browser:
- Test the 1-click **Scenario Simulator**:
  - `🚀 Aarav's Space Day (25m)`: Generates viewing session & extracts space topics.
  - `💥 Action Cartoon`: Evaluates safety flags and highlights mild action sequences.
  - `💬 Ask AI`: Instant grounded Q&A with evidence cards ("What did he learn about space?").

For detailed dependency procurement (AWS Bedrock model permissions, Fire TV ADB setup, Vega SDK), consult:
📖 **[DEPENDENCIES_AND_PROCUREMENT.md](./DEPENDENCIES_AND_PROCUREMENT.md)**.
