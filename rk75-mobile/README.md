# RK75 Mobile

The independent Android and iPhone companion app for RK75 Command.

## Ownership and services

- **Source:** GitHub is the source of truth.
- **Application data:** the existing Cloudflare Worker, D1 database, and R2 bucket remain the backend. The mobile app does not keep copies of player data.
- **One shared RK75 experience:** the app opens the current RK75 Cloudflare address. A website deployment therefore appears in the app on its next refresh or launch, without rebuilding the APK or IPA. Player accounts, scans, listings, uploads, and administrator edits use the same backend data in both places.
- **Builds:** Expo Application Services (EAS) builds signed APK, AAB, and IPA artifacts in the cloud. No phone storage is used for builds.
- **Secrets:** never add credentials to this repository. Store `EXPO_TOKEN` in GitHub Actions secrets and Cloudflare credentials only in Cloudflare.

## Local checks

```bash
npm ci
npm run check
```

## Cloud builds

1. Create an Expo account owned by you and run `npx eas-cli@latest login`.
2. From this folder, run `npx eas-cli@latest init` once. This links the mobile project to your Expo account.
3. Build an Android APK for direct installation:

   ```bash
   npm run build:android:apk
   ```

4. Build store packages:

   ```bash
   npm run build:android:store
   npm run build:ios:store
   ```

The Android store build is an AAB because Google Play requires that format. The iPhone store build is an IPA and requires your Apple Developer credentials during the first cloud build.

## Store submission

- Google Play: complete the Play Console listing and submit the production AAB to the internal testing track first.
- Apple: complete the App Store Connect listing, privacy information, screenshots, and TestFlight review before public release.

## Build from GitHub

After the first `eas init`, create an `EXPO_TOKEN` secret in this repository's GitHub Actions settings. Then use **Actions → RK75 Mobile cloud build → Run workflow** and choose Android or iPhone. The token stays in GitHub Secrets and is never written to source control.

The repository contains a separate automatic validation workflow. GitHub checks every mobile change before you start a cloud build.

## Sign-in and saved data

The website and app share the same RK75 account records and saved data. For security, a browser session and an app session are separate: a player signs in once in the app using the same RK75 account, then sees the same saved scans and profile data as on the website. The app does not copy passwords or records into the device.
