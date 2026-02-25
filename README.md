# Chronos Booth

Chronos Booth is a React + Vite app that transforms portraits into historical/futuristic themed images with Gemini.

## Local web development

1. Install dependencies:
   ```bash
   npm install
   ```
2. Create env file:
   ```bash
   cp .env.example .env.local
   ```
3. Set `VITE_GEMINI_API_KEY` in `.env.local`.
4. Start the dev server:
   ```bash
   npm run dev
   ```

## Android Studio setup (included in this repo)

This repo now includes a native Android wrapper project at `android/` that loads the built web app from bundled assets (`app/src/main/assets/public`).

### Build and sync web assets into Android

```bash
npm run android:sync
```

### Open in Android Studio

1. Open Android Studio.
2. Choose **Open** and select the `android/` directory.
3. Let Gradle sync.
4. Build debug APK:
   ```bash
   ./gradlew assembleDebug
   ```

### Build Play Store bundle (AAB)

```bash
npm run android:release
```

Generated output:
`android/app/build/outputs/bundle/release/app-release.aab`

## Play Store readiness checklist

Before uploading to Google Play Console:

1. Set your final package ID in `android/app/build.gradle` (`applicationId`).
2. Bump `versionCode` and `versionName` for every release.
3. Add your own launcher icons and splash assets.
4. Create a release keystore and configure signing in `android/app/build.gradle`.
5. Test on real devices (camera permission flow and network behavior).
6. Provide required Play Console metadata (privacy policy, screenshots, content rating, data safety form).

## Notes

- The app reads API keys from Vite env vars (`VITE_GEMINI_API_KEY` / `VITE_API_KEY`).
- `android/app/src/main/assets/public` should be refreshed with `npm run android:sync` before each Android build.
