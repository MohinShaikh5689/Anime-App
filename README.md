# Anime Tracker

A cross-platform (iOS + Android) anime tracker built with **React Native**, **Expo SDK 57**, TypeScript and **Expo Router**.

Keep anime in four lists, **Watching**, **Wishlist**, **Watched** and **Dropped**, with episode progress and a personal 1–5 star rating. Everything is stored on the device, with no account and no backend.

## Features

- **Search** the [AniList](https://anilist.co) catalogue (public GraphQL API, no key needed). Trending anime show up before you type.
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
    (watching,wishlist,watched,dropped,search)/  shared group: one stack per tab
      _layout.tsx                              per-tab stack
      index.tsx                                list screen, or search for the Search tab
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

Build one in the cloud with EAS, so you don't need Xcode or Android Studio:

```bash
npx eas-cli@latest build --profile development --platform ios      # or android
npx expo start --dev-client
```

Or build locally with `npx expo run:ios` (macOS + Xcode 26) or `npx expo run:android`.

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
