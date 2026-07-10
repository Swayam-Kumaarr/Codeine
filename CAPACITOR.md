# Codeine → Android APK with Capacitor

> This guide explains how to package Codeine as a native Android APK using Capacitor.

---

## How it works

Capacitor wraps your web app in a native Android WebView shell. The APK installs like any other Android app, works offline (within PWA limits), and can receive push notifications via the OS.

The flow is:
1. Next.js builds a **static export** (HTML/CSS/JS files, no server)
2. Capacitor copies those files into an Android project
3. Android Studio compiles and signs the APK

---

## One-time setup

### 1. Switch Next.js to static export

Open `next.config.ts` (or `next.config.js`) and add:

```ts
const nextConfig = {
  output: 'export',
  // ... your existing config
}
```

> **Important:** Static export disables all server-side features — API routes (`/api/*`), server components, and middleware. Your app uses API routes for push notifications and LeetCode/GitHub proxies. Those will stop working in the APK. You have two options:
> - **Option A (recommended for APK):** Keep two separate Vercel deployments — one for the web (normal) and one static for the APK.
> - **Option B:** Host API routes on a separate backend (e.g., a small Express server on Railway).
>
> For now, the simplest path: build the static export just for APK, keep the Vercel web build unchanged.

### 2. Install dependencies

```bash
cd "C:\Users\swaya\OneDrive\Documents\Codeine"
npm install @capacitor/core @capacitor/cli @capacitor/android
```

### 3. Init Capacitor

```bash
npx cap init "Codeine" "com.swayam.codeine" --web-dir=out
```

This creates `capacitor.config.ts`. Leave defaults.

### 4. Add Android platform

```bash
npx cap add android
```

This creates the `android/` folder (a full Gradle project).

---

## Every time you update the app

```bash
# 1. Build static export
npm run build

# 2. Copy web assets into Android project
npx cap sync

# 3. Open Android Studio (or just build directly)
npx cap open android
```

---

## Building the APK in Android Studio

1. `npx cap open android` opens Android Studio
2. Wait for Gradle sync to finish
3. **Build → Generate Signed Bundle / APK**
4. Choose **APK**
5. Create a new keystore (first time) or use existing
   - Keep the `.jks` file safe — you need it for every future update
6. Choose **release** build variant
7. Click **Finish** — APK output: `android/app/release/app-release.apk`

---

## Install on your phone

```bash
# Option 1: ADB (phone connected via USB, USB debugging on)
adb install android/app/release/app-release.apk

# Option 2: Copy APK to phone storage and open the file
# Option 3: Host on a URL and download from your phone browser
```

---

## PWA install (simpler, no APK needed)

If you just want it on your home screen without building an APK:

1. Open Codeine on your Android phone in Chrome
2. Tap the 3-dot menu → **Add to Home screen**
3. Done — it installs as a PWA, works offline, gets push notifications

This is actually the fastest path. The APK is only needed if you want to distribute via Play Store or want a fully native feel.

---

## Play Store distribution (optional later)

For Play Store you need:
- Android Studio + signed release APK (or AAB bundle)
- Google Play Console account ($25 one-time)
- App icon 512×512, screenshots, privacy policy URL (already at `/privacy`)
- `targetSdk` must be recent (currently ≥34)

---

## Troubleshooting

| Issue | Fix |
|---|---|
| `next export` fails — API routes not supported | Disable `output: 'export'` for Vercel, only enable it for APK builds |
| `npx cap sync` says no web dir | Run `npm run build` first so the `out/` folder exists |
| Android Studio Gradle sync fails | File → Invalidate Caches → Restart |
| APK installs but shows blank screen | Open DevTools via `chrome://inspect`, check JS errors — likely CORS or API route 404 |
| Push notifications don't work in APK | Native push in Capacitor needs `@capacitor/push-notifications` plugin + FCM setup, separate from Web Push |

---

## Files to not commit

```
android/           # generated, large — add to .gitignore
out/               # static export output — add to .gitignore
```

Add to `.gitignore`:
```
/out
/android
```

(The iOS equivalent would be `/ios` if you ever add `@capacitor/ios`.)
