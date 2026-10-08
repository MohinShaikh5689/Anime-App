# Anime Tracker

A cross-platform (iOS + Android) anime tracker built with **React Native**, **Expo SDK 57**, TypeScript and **Expo Router**.

Keep anime in four lists, **Watching**, **Wishlist**, **Watched** and **Dropped**, with episode progress and a personal 1–5 star rating. Everything is stored on the device, with no account and no backend.

## Features

- **Home**: Continue Watching (with one-tap +1 episode), Up Next from your wishlist, counts for each list, and Trending, This Season and Top Rated rows from AniList.
- **Library**: all four lists in one tab, switched with a native segmented control (UISegmentedControl on iOS, Material 3 segmented buttons on Android).
- **Search** the [AniList](https://anilist.co) catalogue (public GraphQL API, no key needed) in a poster grid. Before you type, browse trending anime or filter by genre.
- **Add** any title to a list, **move** it between lists, or **remove** it.
- **Episode tracking**: tap **+** on a row in the Watching list, or use the stepper on the detail screen. Starting an episode moves a show from Wishlist to Watching. Marking a show Watched fills in all its episodes.
- **Ratings**: 1–5 stars. Tap the current star again to clear it.
- **Offline-first library**: saved with AsyncStorage, so library entries open instantly and still work offline.

## Native look on each platform

| | iOS | Android |
|---|---|---|
| Tab bar | Native `UITabBarController` via Expo Router native tabs. Liquid Glass on iOS 26, with a separate Search tab (`role="search"`) | Native Material 3 bottom navigation bar |
| Colors | UIKit semantic system colors (`PlatformColor`), automatic light/dark | **Material You** dynamic color from the wallpaper (Android 12+), seed-color fallback otherwise, light/dark |
| Controls | Liquid Glass (`expo-glass-effect` `GlassView`/`GlassContainer`) with a `BlurView` fallback on iOS < 26 | `react-native-paper` MD3 components (chips, tonal buttons, progress bar, search bar) |
| Headers | Large titles, transparent glass navigation bar, native search field | Material top app bar |
| Icons | SF Symbols | Material Symbols (both via `expo-symbols`) |

Each platform gets its own implementation through platform file extensions. Metro picks `*.android.tsx` on Android and the base file on iOS:

```
src/theme/theme.tsx                 iOS theme (system colors)
src/theme/theme.android.tsx         Android theme (Material You + Paper)
src/theme/stack-options(.android).ts
src/components/controls.tsx         iOS Liquid Glass controls
src/components/controls.android.tsx Android Material 3 controls
src/screens/search-screen(.android).tsx
```

## Project structure

```
src/
  app/                                         Expo Router routes
    _layout.tsx                                root: theme provider + native tabs
    (home,library,search)/                     shared group: one stack per tab
      _layout.tsx                              per-tab stack
      index.tsx                                Home, Library or Search, depending on the tab
      anime/[id].tsx                           anime detail, pushed inside the current tab
  components/   rows, poster, rating stars, platform controls, tab bar
  constants/    list definitions (titles, icons, empty states)
  lib/          AniList client and a small fetch hook
  screens/      library, search and detail screens
  store/        zustand library store persisted with AsyncStorage
  theme/        per-platform theming
```

## Getting started

Requirements: Node.js 20+ and npm. For devices, use the Expo Go app or a development build (see below).

```bash
npm install
npx expo start
```

Then scan the QR code with **Expo Go** (Android) or the Camera app (iOS), or press `i` / `a` to open a simulator or emulator.

### Liquid Glass and Material You need a development build

Expo Go is fine for trying the app, but some native features only show fully in a **development build**:

- **Liquid Glass** needs iOS 26 and an app built with Xcode 26. In Expo Go, or on older iOS, the app falls back to blur materials automatically.
- **Material You dynamic color** reads the wallpaper palette through `@pchmn/expo-material3-theme`, which isn't part of Expo Go. Expo Go uses the fallback seed color instead.

#### Build it with GitHub Actions (no EAS, no Mac needed)

`.github/workflows/ios-dev-client.yml` builds an **unsigned** iOS dev client on a GitHub-hosted Mac running macOS 26 and Xcode 26:

1. Go to **Actions** → **iOS dev client (unsigned)** → **Run workflow**, and pick a target:
   - `device` produces `AnimeTracker-dev-unsigned.ipa`. Sign and install it with your own Apple ID using a sideloading tool such as [Sideloadly](https://sideloadly.io) or [AltStore](https://altstore.io). With a free Apple ID the app expires after 7 days and has to be re-signed.
   - `simulator` produces `AnimeTracker-dev-simulator.zip`. Unzip it and run `xcrun simctl install booted AnimeTracker.app`.
2. Download the build from the run's **Artifacts** section.
3. Run `npx expo start --dev-client` and open the project from the dev client.

#### Build it locally

Use `npx expo run:ios` (macOS + Xcode 26) or `npx expo run:android`.

## Publishing updates

The project is linked to EAS Update (project `@mohin.shaikh/anime-app`, channel `preview`). JavaScript-only changes reach an installed dev client or Expo Go without a rebuild.

- From GitHub: **Actions** → **EAS Update** → **Run workflow**. This needs an Expo access token saved as the repository secret `EXPO_TOKEN`.
- Locally: `npx eas-cli@latest update --channel preview --environment preview`

Open `exp://u.expo.dev/cdc751f6-cf63-41a0-b997-66e47e019725?channel-name=preview` in Expo Go, or paste the `https://` form of that URL into the dev client.

## Scripts

| Command | What it does |
|---|---|
| `npm start` | Start the Expo dev server |
| `npm run ios` / `npm run android` | Start and open on a simulator or emulator |
| `npm run lint` | ESLint (`eslint-config-expo`) |
| `npm run typecheck` | TypeScript (`tsc --noEmit`) |
| `npm run doctor` | `expo-doctor` dependency and config checks |

## Data and privacy

The app only calls `https://graphql.anilist.co` to search and fetch anime details. Your lists, progress and ratings stay on the device (AsyncStorage key `anime-library`) and are deleted if you uninstall the app.
