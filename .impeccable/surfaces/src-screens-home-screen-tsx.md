---
version: 1
slug: "src-screens-home-screen-tsx"
primary_target: "src/screens/home-screen.tsx"
related_targets: ["src/screens/library-screen.tsx","src/screens/search-results.tsx","src/screens/anime-detail-screen.tsx","src/screens/character-sheet.tsx"]
---

# App shell: Home, Library, Search, anime detail, character sheet

Scope: the whole signed-in app on iOS and Android, plus sign-in and Account. Visitor mode: Operate.
Audience and job: anime fans (public store release) logging episodes, deciding what to watch, and discovering, in short evening sessions.
Constraints: native per platform (iOS HIG with Liquid Glass and SF; Android Material 3 with dynamic colour), Dynamic Type and Reduce Motion, no native modules beyond the current build.
Owner said polished must not feel busy, generic, cutesy or heavy; success is store-worthy polish.

## Direction contract

THESIS: Every show you follow is a production sheet in progress. Progress reads as a timing sheet of frames you ink one by one, and a finished show gets the director's red check, the approval mark on a cleared cut. It refuses the category default: a dark poster grid of score badges, and its pastel-cute opposite.

OWN-WORLD: Native system ground in light and dark. Non-photo-blue hairline ruling (#8FB3DE light, #3B5A80 dark) structures sheets and lists. Graphite ink for watched frames. Key red (#E5372B) is reserved for exactly two jobs: the current or next frame, and the approval check. The tint is the platform's own (iOS blue-pencil #2F6BD8; Android dynamic primary). Barlow Condensed is used only for episode, frame and count numerals (measurement, not costume); all other text is SF or Roboto in system text styles. Covers are the only imagery: no blur backdrops, gradients or emoji.

STORY: The user opens the app and sees where they are in every show at a glance, inks the next frame with one tap, picks tonight's show from the sheet, and finds new shows in calm ruled shelves. Finishing a show draws a red check.

FIRST VIEWPORT: Home uses the native large title "Home" with Account at the top right. The "On the sheet" section is a ruled list, one row per Watching show: a 48pt cover, the title, a numeral readout "EP 06/12" in Barlow Condensed, a full-width frame strip (one cell per episode, the next cell outlined in key red), and a trailing native +1 button. The pick for tonight is the first Wishlist show, as one row with Start and Shuffle. Below that, discovery shelves sit on ruled baselines.

FORM: Anime production timing sheet (dope sheet), position 1 on my ordered list (IMPECCABLE'S PICK, chosen by the user over the rolled position 7), seed key f3351077. Kept from declined challengers: one reserved colour (orienteering), right-aligned tabular counts (cassette J-card), characters ranked by apparatus not size (lexicon), tabular numeral rigor (datamatics).

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

Signature interaction: tapping +1 inks the next frame cell with a short left-to-right pencil sweep (a crossfade under Reduce Motion). On the anime page, the full sheet is a grid of numbered frames, and tapping a frame sets progress to it. Completion draws a red check in two strokes (short, then long), with a one-line "Finished · title" note. Revised after the finish review: the OK letters were dropped because Barlow is reserved for numerals.
Motion grammar: platform transitions and press highlights only, plus the one ink sweep and the check strokes.
