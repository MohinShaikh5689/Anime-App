# Product

<!-- impeccable:product-schema 1 -->

## Platform

adaptive

## Users
Anime fans who keep track of what they watch, planned for a public App Store and Google Play release. They open the app for three jobs in roughly equal measure: logging episodes on what they are currently watching, deciding what to watch next from their own wishlist, and discovering new anime and the characters in them. Typical use is short sessions around watching: on the couch before or after an episode, often in the evening.

## Product Purpose
Anime Tracker keeps a personal anime library in four lists (Watching, Wishlist, Watched, Dropped) with episode progress and a personal 1–5 star rating, backed by the AniList catalogue for search, trending, seasonal and top-rated browsing, anime details and characters. Success is a user who trusts the app as the one place that knows where they are in every show, and who enjoys opening it.

## Positioning
The owner's explicit brief: it should be relaxing to use and not feel like any other anime tracker. Most trackers are dense, stat-heavy database front ends; this one is a calm companion for watching, not a spreadsheet of titles.

## Operating Context
- Account required: email and password sign-in through Supabase Auth. Email confirmation may be enabled for production.
- The library is offline-first on the device and syncs to Supabase (`library_entries`): last write wins per anime, removals sync as soft deletes, and lists made before sign-in are uploaded on first sign-in.
- Catalogue data, cover art, banners, characters and voice actors come from the public AniList GraphQL API.
- JavaScript changes ship as EAS Updates; anything that adds a native module needs a new development or store build.

## Capabilities and Constraints
- Stack: Expo SDK 57, React Native 0.86 (New Architecture), Expo Router with native tabs, TypeScript, React Compiler.
- Native per platform is a confirmed requirement: iOS uses iOS conventions and Liquid Glass on iOS 26 (blur fallback below), Android uses Material 3 / Material You dynamic color.
- Already in the native build and available without a rebuild: Reanimated 4, Gesture Handler, expo-image, expo-blur, expo-glass-effect, expo-haptics, expo-symbols, expo-font, @expo/ui, react-native-paper.
- Account deletion must stay available (App Store requirement for apps with sign-up).
- Existing features to preserve: Home, Library (four lists), Search with genre browsing, anime detail with list status, episode stepper, rating, synopsis and characters; character detail sheet; account screen with sync status, sign out and delete account.

## Brand Commitments
- Name: Anime Tracker.
- Feel requested by the owner: relaxing, calm, fun to use, distinct from other anime trackers.
- No logo or brand assets exist yet.

## Evidence on Hand
- Real catalogue content (titles, covers, banners, scores, genres, characters, voice actors) from AniList at runtime.
- No testimonials, user counts, press or ratings exist. Do not fabricate any.

## Product Principles
1. Every session should feel calm: nothing shouts, nothing nags.
2. The user's own shows come first; the catalogue supports their library, it doesn't bury it.
3. Logging an episode takes one tap from wherever the show appears.
4. Feel native on each platform rather than identical across them.
5. Offline and sync are invisible until something needs the user's attention.

## Accessibility & Inclusion
Public store release: support Dynamic Type and font scaling, VoiceOver and TalkBack labels, Reduce Motion, and sufficient contrast in light and dark mode.
