---
name: Anime Tracker
description: A personal anime library drawn as a production timing sheet, native on iOS and Android.
colors:
  blue-pencil: "#2F6BD8"
  blue-pencil-dark: "#7AA5F2"
  key-red: "#D63027"
  key-red-dark: "#FF5A4E"
  graphite-ink: "#2B2D33"
  graphite-ink-dark: "#D9DCE3"
  non-photo-blue: "#8FB3DE"
  non-photo-blue-dark: "#3B5A80"
  on-primary: "#FFFFFF"
  on-primary-dark: "#0B1B3A"
  grouped-ground: "#F2F2F7"
  grouped-ground-dark: "#000000"
  grouped-surface: "#FFFFFF"
  grouped-surface-dark: "#1C1C1E"
  label: "#000000"
  label-dark: "#FFFFFF"
  secondary-label: "rgba(60, 60, 67, 0.6)"
  secondary-label-dark: "rgba(235, 235, 245, 0.6)"
  tertiary-fill: "rgba(118, 118, 128, 0.12)"
  tertiary-fill-dark: "rgba(118, 118, 128, 0.24)"
  separator: "rgba(60, 60, 67, 0.29)"
  separator-dark: "rgba(84, 84, 88, 0.6)"
  danger: "#FF3B30"
  danger-dark: "#FF453A"
typography:
  large-title:
    fontFamily: "-apple-system, Roboto, system-ui, sans-serif"
    fontSize: "34px"
    fontWeight: 700
    letterSpacing: "0.37px"
  title2:
    fontFamily: "-apple-system, Roboto, system-ui, sans-serif"
    fontSize: "22px"
    fontWeight: 700
    letterSpacing: "-0.26px"
  title3:
    fontFamily: "-apple-system, Roboto, system-ui, sans-serif"
    fontSize: "20px"
    fontWeight: 600
    letterSpacing: "-0.45px"
  headline:
    fontFamily: "-apple-system, Roboto, system-ui, sans-serif"
    fontSize: "17px"
    fontWeight: 600
    letterSpacing: "-0.43px"
  body:
    fontFamily: "-apple-system, Roboto, system-ui, sans-serif"
    fontSize: "17px"
    fontWeight: 400
    letterSpacing: "-0.43px"
  subhead:
    fontFamily: "-apple-system, Roboto, system-ui, sans-serif"
    fontSize: "15px"
    fontWeight: 400
    letterSpacing: "-0.23px"
  footnote:
    fontFamily: "-apple-system, Roboto, system-ui, sans-serif"
    fontSize: "13px"
    fontWeight: 400
    letterSpacing: "-0.08px"
  caption:
    fontFamily: "-apple-system, Roboto, system-ui, sans-serif"
    fontSize: "12px"
    fontWeight: 400
    letterSpacing: "0px"
  numeral:
    fontFamily: "Barlow Condensed, sans-serif"
    fontSize: "17px"
    fontWeight: 600
    letterSpacing: "0.2px"
    fontFeature: "tnum"
  numeral-display:
    fontFamily: "Barlow Condensed, sans-serif"
    fontSize: "28px"
    fontWeight: 600
    fontFeature: "tnum"
rounded:
  frame-cell: "2px"
  frame: "4px"
  poster-card: "8px"
  poster: "10px"
  status-pill: "12px"
  group: "14px"
  button: "14px"
  card-feature: "20px"
  sheet: "28px"
  pill: "999px"
spacing:
  strip-gap: "2px"
  frame-gap: "6px"
  inline: "8px"
  row: "12px"
  grid-gap: "12px"
  shelf-gap: "14px"
  gutter: "16px"
  shelf-gutter: "20px"
  section: "28px"
  screen-section: "32px"
components:
  button-primary:
    backgroundColor: "{colors.blue-pencil}"
    textColor: "{colors.on-primary}"
    typography: "{typography.headline}"
    rounded: "{rounded.button}"
    padding: "0 20px"
    height: "48px"
  button-tonal:
    backgroundColor: "{colors.tertiary-fill}"
    textColor: "{colors.blue-pencil}"
    typography: "{typography.headline}"
    rounded: "{rounded.button}"
    padding: "0 20px"
    height: "48px"
  button-destructive:
    textColor: "{colors.danger}"
    typography: "{typography.headline}"
    rounded: "{rounded.button}"
    padding: "0 20px"
    height: "48px"
  increment-button:
    backgroundColor: "{colors.tertiary-fill}"
    textColor: "{colors.blue-pencil}"
    rounded: "{rounded.pill}"
    size: "40px"
  chip:
    backgroundColor: "{colors.tertiary-fill}"
    textColor: "{colors.label}"
    typography: "{typography.subhead}"
    rounded: "{rounded.pill}"
    padding: "0 14px"
    height: "34px"
  chip-selected:
    backgroundColor: "{colors.blue-pencil}"
    textColor: "{colors.on-primary}"
  status-pill:
    backgroundColor: "{colors.tertiary-fill}"
    textColor: "{colors.label}"
    rounded: "{rounded.status-pill}"
    padding: "0 12px"
    height: "44px"
  status-pill-selected:
    backgroundColor: "{colors.blue-pencil}"
    textColor: "{colors.on-primary}"
  frame-strip-cell:
    rounded: "{rounded.frame-cell}"
    height: "10px"
  frame-sheet-frame:
    rounded: "{rounded.frame}"
    typography: "{typography.numeral}"
    height: "44px"
    width: "48px"
  sheet-group:
    backgroundColor: "{colors.grouped-surface}"
    rounded: "{rounded.group}"
    padding: "12px"
  poster-card:
    rounded: "{rounded.poster-card}"
    width: "124px"
  episode-readout:
    textColor: "{colors.label}"
    typography: "{typography.numeral}"
---

# Design System: Anime Tracker

## Overview

**Creative North Star: "The Timing Sheet"**

The app is drawn as an anime production dope sheet laid over the platform's own ground. Every show the user follows is a sheet in progress: episodes are frames, watched frames are inked in graphite, the next frame is outlined in key red, and the rest wait as non-photo-blue ruled cells. Sections and lists sit on blue hairline rules the way columns sit on a timing sheet. When a show is finished on the device, a key-red check is drawn in two pencil strokes, the director's approval on a cleared cut.

Everything that is not the sheet stays native. On iOS the ground is the system grouped background with semantic UIKit colors, large titles, SF text styles, native tabs and Liquid Glass chrome on iOS 26 (system material blur below). On Android the ground is Material 3 with Material You dynamic colour, Roboto in the M3 type scale, Paper components and the M3 navigation bar. Only the sheet's own three inks (ruling, graphite, key red) and its numeral face are held constant across both platforms, so the timing sheet reads as the same object on either phone.

Density is calm and grouped: one ruled list of current shows, one pick for tonight, then horizontally scrolling shelves. Cover art is the only imagery and the only saturated colour on a card. Motion is platform transitions and press highlights, plus exactly two authored moments: the ink sweep on a frame and the check strokes.

**Key Characteristics:**
- Native system ground and chrome per platform; the sheet layer is the identity.
- Non-photo-blue hairline rules structure sections, rows and frame cells.
- Graphite ink for progress; key red for the next frame and the finish check only.
- Barlow Condensed for episode, frame, rank and count numerals only, always tabular.
- Covers are the only imagery: no gradients, no blurred backdrops, no emoji.
- Two authored motions, both with Reduce Motion crossfades.

## Colors

A quiet system ground carrying three fixed drafting inks and the platform's own tint.

### Primary
- **Blue Pencil** ({colors.blue-pencil}, dark {colors.blue-pencil-dark}): the animator's construction colour and the app tint on iOS. Text buttons, icon tints, the +1 glyph, selected chips and status pills, the filled primary button, stars in the rating, the "Main" character label, tab tint. On Android the tint is the Material You dynamic `primary`, with Blue Pencil as the fallback seed when the device has no dynamic colour.

### Secondary
- **Key Red** ({colors.key-red}, dark {colors.key-red-dark}): the reserved mark. It outlines the next frame in the strip and the sheet, colours that next frame's number, and draws the finish check. Nothing else in the app uses it.

### Tertiary
- **Graphite Ink** ({colors.graphite-ink}, dark {colors.graphite-ink-dark}): watched frames are filled with it, and the small list-status badge on library covers uses it as its disc. Numbers on inked frames reverse out in the ground colour.

### Neutral
- **Non-Photo Blue Rule** ({colors.non-photo-blue}, dark {colors.non-photo-blue-dark}): the sheet's ruling. Section header baselines, row dividers inside sheet groups and fact lists, empty frame cell outlines, the hairline border around covers, and the ring around character portraits. Fixed on both platforms rather than derived from dynamic colour.
- **Grouped Ground** (iOS `systemGroupedBackground`; Android M3 `background`): every screen's background.
- **Grouped Surface** (iOS `secondarySystemGroupedBackground`; Android M3 `elevation.level1`): sheet groups, detail cards, the pick row, the finish note.
- **Tertiary Fill** (iOS `tertiarySystemFill`; Android M3 `surfaceVariant`): tonal buttons, the inline +1, shuffle, unselected chips and pills, skeletons, poster placeholders.
- **Label / Secondary Label** (iOS `label` / `secondaryLabel`; Android `onSurface` / `onSurfaceVariant`): body text and meta text. The "EP" and "/ 12" parts of a readout use Secondary Label so the current episode number leads.
- **Separator** (iOS `separator`; Android `outlineVariant`): platform-native dividers in non-sheet groups (account card, auth field group).
- **Danger** (iOS `systemRed`; Android M3 `error`): destructive text buttons and sync failure text.

On iOS every neutral is a `PlatformColor` and the inks are `DynamicColorIOS` pairs, so light, dark and increased-contrast modes follow the system. The hex values in the frontmatter are the default iOS renderings, recorded for reference tools.

### Named Rules
**The Two Jobs Rule.** Key red marks the next frame and the finish check. It never appears on a button, badge, heading, score, error or selection state.

**The Ruled Sheet Rule.** Structure is drawn with Non-Photo Blue hairlines (two device hairlines thick), not boxes, fills or shadows. Platform separators remain only inside native-style groups that are not part of the sheet.

**The Cover Is The Colour Rule.** A card's only saturated colour comes from its cover art. Card chrome stays in rules, fills and text colours.

## Typography

**Display / Body Font:** the system face, SF Pro on iOS and Roboto on Android, through the shared text-style table.
**Numeral Font:** Barlow Condensed SemiBold (600), with tabular figures.

**Character:** Native text styles carry all words, so Dynamic Type and Android font scaling apply everywhere. The condensed numeral face is the sheet's hand-lettered count column: narrow, tabular and measurement-like.

### Hierarchy
The table resolves per platform. iOS uses HIG text styles (frontmatter values); Android uses the Material 3 scale.

- **Large Title** (iOS 700, 34; Android 400, 32/40): native large navigation titles and the sign-in heading.
- **Title 2** (iOS 700, 22; Android 400, 22/28): the anime title on the detail page, character name, account avatar initial.
- **Title 3** (iOS 600, 20; Android 500, 20/26): shelf and section headers on the sheet rule, empty-state titles.
- **Headline** (iOS 600, 17; Android 500, 16/24): row titles on Home, detail section titles, button labels, the finish note.
- **Body** (iOS 400, 17; Android 400, 16/24): synopsis and character bios, sign-in subtitle.
- **Subhead** (iOS 400, 15; Android 400, 14/20): poster titles (at 600), chip labels, section actions, fact labels.
- **Footnote** (iOS 400, 13; Android 400, 12/16): poster subtitles, meta lines, library count line.
- **Caption** (iOS 400, 12; Android 500, 11/16): account count labels, character role lines.
- **Numeral** (Barlow 600, 16–18, tabular): the "EP 06 / 12" readout, frame numbers, rank numbers before poster titles, the sheet pager range, numeric character facts.
- **Numeral Display** (Barlow 600, 22–28, tabular): the episode stepper count (28), account list counts (26), the AniList score (22).

### Named Rules
**The Measurement Only Rule.** Barlow Condensed sets numerals that measure something: episodes, frames, ranks, counts, scores. Words, headings, labels and buttons are never set in it, including "OK"-style stamps.

**The Zero-Padded Readout Rule.** Episode progress and ranks pad to two digits ("EP 06", "03") and use tabular figures so columns align down a list.

## Layout

Single-column scrolling screens with native large titles and automatic content insets under translucent bars.

- **Gutters:** 16px for screen content, grouped cards and grids; 20px for shelf headers and shelf rows.
- **Home:** sections stacked at 32px, each a ruled section header 12px above its group. "On the sheet" is one grouped card of up to six rows (48px cover, title and readout on a top line, a full-width 10px frame strip below, trailing +1). "For tonight" is a single grouped card with a 72px cover, a tonal Start Watching button and a circular shuffle. Discovery shelves follow.
- **Shelves:** horizontal lists of 124px poster cards, 14px apart, snapping per card; ranked shelves set a numeral before each title.
- **Poster grids (Library, Search):** at least three columns, cards no narrower than 144px, 12px gaps, 16px side padding, rows 20–22px apart.
- **Detail:** 16px padding, sections 28px apart, each a ruled title above a 16px-padded card. A 116px cover sits beside the title block.
- **Frame sheet:** columns fill the card width with frames at least 48px wide and 6px apart (minimum five columns), each frame 0.72 times as tall as wide and never under 44px. Shows with more than 120 episodes page in blocks of 60.
- **Touch targets:** 44px minimum (frames, pager, status pills); 48px for primary actions and the stepper.

## Elevation & Depth

The system is flat and tonal. Depth comes from the grouped ground beneath grouped surfaces and from native chrome: Liquid Glass navigation, tab bar and floating +1 on iOS 26, the system chrome material blur on earlier iOS, and Material 3 surface tones on Android. Hairline rules, not shadows, separate content.

### Shadow Vocabulary
- **Finish note** (`box-shadow: 0 6px 18px rgba(0,0,0,0.12)`): the one transient overlay, the "Finished · title" note, which floats briefly over content.

### Named Rules
**The Glass Is Chrome Rule.** Liquid Glass is used only for system chrome and the one floating control, the +1 over a cover in the Library grid. In-content buttons use system filled and tinted styles.

## Shapes

Square-ish drafting geometry inside soft native containers. Frame cells are nearly square-cornered (2px in the strip, 4px on the sheet) so they read as cells on a form. Containers use the platform's curvature: iOS groups and buttons at 14px with continuous corners, Android groups at 20px and Material shapes. Covers are 2:3 posters with gently curved corners (iOS 8–10px, Android 12px) and a hairline rule border. Circles are reserved for controls (+1, shuffle, stepper buttons), the status badge, avatars and portrait rings. Character sheets open as native form sheets with 28px corners.

## Components

### Buttons
Native and quiet; the tint carries the action.
- **Shape:** gently curved (14px, continuous), 48px tall, 20px horizontal padding, icon and label 6px apart.
- **Primary:** filled Blue Pencil with on-primary text, used for sign-in and the blank-sheet "Find Anime".
- **Tonal:** Tertiary Fill with Blue Pencil text; the default variant.
- **Destructive:** transparent with Danger text (Sign Out, Delete Account, Remove from Library).
- **Pressed / Disabled:** opacity 0.6 when pressed, 0.35 when disabled; spinner replaces the label while loading.
- **Android:** Paper `contained`, `contained-tonal` and `text` buttons with M3 shapes and ripples.

### +1 (Increment Button)
- **Inline:** a 40px Tertiary Fill circle with a Blue Pencil plus, light impact haptic. Trails each Home sheet row; hidden once the show is complete.
- **Floating:** the same circle as interactive Liquid Glass (material blur before iOS 26), pinned to a Library cover's lower right.
- **Android:** an M3 contained-tonal icon button.

### Chips and Status Pills
- **Chips (genre filter):** 34px pills, Tertiary Fill with Label text; selected fills Blue Pencil with on-primary text. Android uses M3 outlined / flat filter chips.
- **Status picker:** a two-by-two grid of 44px pills (12px radius) with list icons; selected fills Blue Pencil. Android uses M3 chips.
- **List switcher:** native segmented control on iOS, M3 segmented buttons on Android.

### Cards / Containers
- **Sheet group:** Grouped Surface, 14px (iOS) / 20px (Android) corners, 16px side margins; rows divided by Non-Photo Blue rules.
- **Detail card:** the same surface and radius with 16px padding.
- **Shadow strategy:** none (see Elevation & Depth).

### Section Header
A Title 3 heading (Headline on the detail page) sitting on a Non-Photo Blue baseline rule with 8px below the text, optional Blue Pencil text action aligned on the baseline at the right.

### Poster Card
Cover first. A 2:3 cover with a hairline rule border, an optional graphite status badge (22px circle, top right) when the show is in a list, an optional 6px frame strip below the cover, then a two-line semibold Subhead title (preceded by a zero-padded rank numeral on ranked shelves) and a one-line Footnote subtitle. Long press opens move and remove actions. Skeletons keep the same footprint in Tertiary Fill.

### Inputs / Fields
- **iOS:** an inset grouped card (16px radius) of 50px borderless fields separated by an inset platform separator; error and info text centred below.
- **Android:** M3 outlined text fields with leading icons and helper text.

### Navigation
Native tabs on both platforms (Home, Library, Search as the search role), labelled, tinted with the primary colour; the iOS bar minimizes on scroll. Stacks use large titles on iOS and M3 top app bars on Android. Account opens as a modal from a person icon at the top right of Home.

### Frame Strip (signature)
Episode progress as a row of cells 2px apart, up to 26 visible (windowed around the next frame). Watched cells fill with Graphite Ink; the next cell is outlined in Key Red (1.5px); remaining cells are outlined in Non-Photo Blue; cells beyond a known count are dashed when the total is unknown. Heights: 10px in sheet rows, 6px under covers, 12px in the blank-sheet state, 22px as the sign-in mark. Announced as a progress bar.

### Frame Sheet (signature)
The detail page's full sheet: every episode as a numbered, tappable frame. Watched frames are inked with the number reversed out; the next frame has a 2px Key Red outline and a Key Red number; the rest are ruled with Secondary Label numbers. Tapping a frame sets progress to it (tapping the current frame unmarks it), with a selection haptic. When the total is unknown, the native stepper with a 28px numeral count replaces the sheet.

### Episode Readout
"EP 06 / 12" in the numeral face, current number in Label, "EP" and "/ total" in Secondary Label, capped at 1.4x font scale.

### Ink Sweep and Finish Check (signature motion)
- **Ink sweep:** the newly inked cell fills left to right over 420ms (exponential ease-out); a 200ms crossfade under Reduce Motion. Only the just-inked cell animates.
- **Finish check:** a 10px-stroke Key Red check drawn as a short leg (160ms) then a long leg (260ms, 150ms delay), centred over the screen, with a success haptic and a "Finished · title" note under the safe area for 2.6s. Reduce Motion fades it in. Triggered only by local changes, never by sync.

## Do's and Don'ts

### Do:
- **Do** draw progress with the Frame Strip or Frame Sheet wherever a watched show appears.
- **Do** separate sections and sheet rows with Non-Photo Blue hairlines ({colors.non-photo-blue}, two hairlines thick).
- **Do** set every episode, frame, rank, count and score numeral in Barlow Condensed 600 with tabular figures, and every word in the platform text styles.
- **Do** keep chrome native: system tabs, large titles, Liquid Glass on iOS 26, Material 3 and dynamic colour on Android.
- **Do** give every authored motion a Reduce Motion crossfade.

### Don't:
- **Don't** use Key Red for anything other than the next frame and the finish check.
- **Don't** add imagery beyond cover art and character portraits: no gradients, blurred cover backdrops or emoji.
- **Don't** set words, labels or stamps in Barlow Condensed.
- **Don't** use Liquid Glass for in-content buttons or cards; it belongs to chrome and the floating +1.
- **Don't** add shadows to cards or covers; the only shadow is the transient finish note.
