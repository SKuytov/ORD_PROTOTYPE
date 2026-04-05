# PartPulse Orders — Android App

A native Android app for the PartPulse Orders industrial procurement system.

## Features

- 🔐 Secure JWT authentication with biometric-safe credential storage
- 📋 Full orders list with rich filtering:
  - Sort by ID (newest/oldest), date, priority, or due date
  - Filter by status, priority, building, date range
  - Search across description, part number, building, supplier
- 📄 Detailed order view with files, timeline, pricing
- ➕ Create new orders with autocomplete and cost center selection
- ✅ Approvals panel for managers (approve/reject with reason)
- 💬 Quote workflow for procurement (advance status, approve)
- 📊 Dashboard with KPIs, pipeline view, overdue alerts
- 🏭 Role-based UI (requester, procurement, manager, admin, accounting)
- 📎 File attachments (opens in browser)
- 🌐 Connected to: https://partpulse-orders.tail675c8b.ts.net

## Quick Build (EAS Cloud — Recommended)

Prerequisites: Expo account at expo.dev (free)

```bash
# Install dependencies
cd partpulse-android
npm install

# Login to Expo
npx eas login

# Build APK (cloud build — takes ~10 minutes)
npx eas build --platform android --profile preview
```

The APK download link will be printed when the build completes. No Android SDK needed on your machine!

## Local Build

Prerequisites: Android SDK, Java 17+, Android Studio

```bash
# Generate native Android project
npx expo prebuild --platform android

# Build APK
cd android
./gradlew assembleRelease
# APK at: android/app/build/outputs/apk/release/app-release.apk
```

## Install on Device

1. Enable "Install unknown apps" on your Android device
2. Transfer the APK via USB, email, or cloud storage
3. Tap to install
4. Connect to Tailscale on the device OR ensure access to the Tailscale Funnel URL

## User Accounts

Use the same credentials as the web app. The app connects to:
`https://partpulse-orders.tail675c8b.ts.net/api`

## Tailscale Note

The app connects via the Tailscale Funnel public URL, so it works:
- From any device connected to the internet (via funnel)
- Faster from devices on the Tailscale network directly

For internal-only access, change `API_BASE_URL` in `src/constants/index.ts`
to your Tailscale IP: `http://100.65.216.117/api`
