# Chronos Booth (Native Android)

Chronos Booth is now a **native Android app** (Jetpack Compose) that:

- Captures a photo from camera or uploads from gallery.
- Uses Gemini to **analyze** the portrait.
- Uses Gemini image generation to create a transformed image in a selected era style.
- Runs fully as an Android app without webview/web runtime dependencies.

## Project location

- Android app: `android/`

## Secure API key setup (do not commit secrets)

> ⚠️ Real production security: do **not** ship long-lived API keys in client apps.
> Use your own backend token exchange/proxy for Play Store production.

For local development in this repo:

1. Add your key in `android/local.properties` (this file is gitignored):
   ```properties
   GEMINI_API_KEY=your_key_here
   ```
2. Or set an environment variable:
   ```bash
   export GEMINI_API_KEY=your_key_here
   ```

The app reads `GEMINI_API_KEY` into `BuildConfig` during build.

## Build debug APK

```bash
cd android
gradle assembleDebug
```

## Build release bundle (AAB)

```bash
cd android
gradle bundleRelease
```

Output:
`android/app/build/outputs/bundle/release/app-release.aab`

## Google Play readiness checklist

1. Configure your release keystore/signing config.
2. Replace default launcher icon and branding assets.
3. Increment `versionCode`/`versionName` for each release.
4. Add privacy policy and complete Play Console Data Safety form.
5. Move API key usage to secure backend before production launch.
