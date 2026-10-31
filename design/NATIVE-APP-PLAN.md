# Doodle Heroes: standalone mobile app plan

## Outcome and scope

Build one React Native / Expo app for Android and iOS inside `mobile-expo`.
Bundle all game rules, puzzles, procedural artwork, and required assets so the
installed app plays without the website or internet. Expo Snack is the shared
development preview; standalone offline behavior must be verified in an installed
build because Snack and Expo Go may need connectivity to load development code.

Include Island Sketch, Isle Spans, Lighthouse Wiring, Doodle Guess, Margin Merge,
Scribble Siege, Lantern Isles expedition, daily puzzles, tutorials, settings,
achievements, and local progress. Exclude Draw Party, rooms, accounts, online
leaderboards, cloud sync, and advertising from the initial implementation scope.

**Selected direction: 08 — Meadow Tiles.** Native milestone 1 is implemented:
Home, Island Sketch, catalogue / daily selection, completion, journal, tutorial,
settings and local persistence. The earlier WebView has been removed. The HTML
remains a visual study, while `App.js` now renders React Native components.

Remaining: the other five games, the linked expedition map, further animation
polish, device verification, final app assets, and distributable native builds.
The roadmap below describes the full scope, not a claim that all phases are done.

## 1. Choose the visual direction

Open `ui-directions.html` directly in a browser. It is one self-contained file,
with eight mobile design previews (seven home screens and one gameplay screen) and no external dependencies.

| Option | Direction | Best for |
| --- | --- | --- |
| 01 | Pocket Meadow | Recommended: warm island world, calm green and ivory |
| 02 | Moonlit Isles | Atmospheric dark teal and lantern gold |
| 03 | Little Sketchbook | Keeping the notebook and doodle identity |
| 04 | Doodle Club | Expressive lilac, larger playful shapes |
| 05 | Quiet Logic | A restrained, readable puzzle-first experience |
| 06 | Golden Hour | Terracotta and peach storybook warmth |
| 07 | Doodle Tiles | Meowdoku-inspired cream, cocoa, pastel board and rounded controls |
| 08 | Meadow Tiles | A blend of 01’s island world and 07’s pastel tiles and rounded controls |

Each phone has Home, Games, and Journal previews. Option 07 opens directly on an Island Sketch gameplay style sample. The main action opens a sample
tap-to-fill board. These are interactive style studies, not completed game UI.
Sample counts, streaks, hint behavior, and progress are illustrative.

Option 08 combines Pocket Meadow’s island illustrations, ivory background and
forest-green palette with Doodle Tiles’ rounded white controls and pastel boards.
Its home includes a daily puzzle card and links to a themed interactive board.

Choose a number or combine specific elements, for example 01's palette with
03's outlines. Then design the actual six core screen types consistently:
Home, Library, Expedition map, Game, Completion, and Journal / Settings.

## 2. Establish the native foundation

- Select an Expo SDK supported by the current Snack environment; use matching
  library versions. Replace WebView rendering with React Native screens.
- Keep App.js as a simple entry point and use ordinary component imports so
  the same source can be copied to Snack. Start with a small screen-state router
  and explicit Android back handling; use a navigation library if scope needs it.
- Establish palette, spacing, typography, icon, radius, and motion tokens.
  Bundle fonts with a system fallback; no runtime font or artwork downloads.
- Create reusable safe-area screen containers, buttons, game cards, toolbars,
  bottom navigation, dialogs, and achievement toasts.
- Separate game state from rendering. Bundle copies of the pure TypeScript
  models, engines, solvers, puzzle catalogues, RNG, and daily generation code
  under the mobile app. Record their source paths and keep existing rule tests
  reusable so the standalone app does not depend on parent-folder imports.
- Add an asynchronous storage adapter with a versioned schema, queued writes,
  explicit read failures, and recovery. Restore state before displaying progress.
  Save after meaningful actions and on app backgrounding where possible; never
  assume background events alone guarantee a save.

Deliverable: native shell, playable menu navigation, persisted settings, and a
Snack preview with no WebView or website requests.

## 3. Port the logic games first

| Game | Reuse | Native work |
| --- | --- | --- |
| Island Sketch | `nonogram/solver.ts`, puzzles, daily generator | Number clues, fill / mark modes, drag stroke, undo, hints |
| Isle Spans | `bridges/model.ts`, solver, puzzles, generator | SVG islands and bridges; select / drag connections; hit testing |
| Lighthouse Wiring | `net/model.ts`, solver, puzzles, generator | SVG tile paths, animated 90-degree rotation, network feedback |

Implement Island Sketch end to end first: tutorial → level → save → resume →
completion → next level. Validate the design on actual Android and iOS devices
before propagating the UI across the other games.

Keep clue text readable and offer zoom / pan for large boards. Aim for 44–48
point controls; dense grid cells need zoom or another precise input strategy.
One drag is one undo action. Keep game boards stable while touches are active.
Use SVG for these modest vector boards rather than a component per animation
frame. Confirm each dependency against Snack before relying on it.

## 4. Port the remaining single-player games

1. Doodle Guess: reuse `game.ts` and drawing definitions. Replace browser drawing
   with animated SVG strokes; adapt answer entry to the native keyboard and
   preserve the board when the keyboard opens. Cache the active daily state.
2. Margin Merge: reuse `merge/engine.ts` and `data.ts`. Rebuild inventory, orders,
   drag / select-to-merge interactions, and discoveries. Provide a tap-based
   alternative to dragging. Keep animated sprites separate from durable state.
3. Scribble Siege: reuse the deterministic `survivor/engine.ts` and `data.ts`.
   Replace HTML canvas, procedural sprite rendering, browser input and Web Audio.
   Prototype SVG / a Snack-supported graphics renderer, measure real-device
   frame time and entity counts, then choose the renderer. Do not assume an
   SVG-per-enemy implementation meets the performance budget. If the necessary
   renderer is unavailable in Snack, document the limit and use an Expo
   development build for this game while keeping the rest Snack-compatible.
   Implement a floating joystick, pause on backgrounding, upgrade selection,
   mobile audio lifecycle, coins, unlocks, and the custom-hero drawing workflow.

Deliverable: six games with local resume, working controls, and no network
dependency in the installed app.

## 5. Connect the collection

- Add Lantern Isles chapter progression using the existing expedition content.
- Use the existing daily seed convention consistently with the website. Document
  the day boundary and avoid losing an in-progress puzzle when midnight passes.
- Aggregate achievements and streaks from saved results; preserve replay safety
  so reopening a completion does not award duplicate coins or achievements.
- Bundle short interactive tutorials and relevant guide content.
- Add sound, haptics, reduced motion, contrast / color cues, and reset-progress
  settings. Destructive reset needs a clear confirmation inside the app.
- Keep progress on the device. Existing website saves require a separately
  scoped export/import feature if migration is wanted later.

## Motion specification

| Interaction | Proposed treatment | Budget |
| --- | --- | --- |
| Screen change | Short fade + 12–20 point slide | 180–240 ms |
| Card / button press | Scale to 0.97, release spring | 100–180 ms |
| Fill a cell | Color transition + small scale settle | 100–140 ms |
| Rotate wire | Rotate the tile around its center | 160–200 ms |
| Merge | Two pieces converge, new piece settles | 220–320 ms |
| Completion | Small sticker / stars burst, then settle | Under 900 ms |
| Ambient island | Slow lantern / cloud movement on menus only | 4–8 s loop |

Use Reanimated for interactive transforms and opacity; keep engine updates and
storage separate from animation frames. Prefer a stable 60 fps over decorative
motion. Reduced motion replaces slides, bounces, ambient loops and particles
with immediate state changes or short fades. Haptics are optional and never the
only feedback. Do not animate the whole screen after every move.

## 6. Verification and release gates

- Run the existing pure-engine and solver tests against the reused native core.
- Check meaningful integration cases: undo after drag, save interruption, puzzle
  completion replay, clock/day rollover, hints, and app background/resume.
- Test small and large phones, safe areas, keyboard overlap, enlarged text,
  reduced motion, and color-independent puzzle feedback.
- Profile Siege and merge on a representative lower-end Android and an iPhone.
  Validate sustained play rather than only an empty scene.
- Install production / preview builds, enable airplane mode, cold-launch, play,
  force-close, and resume every game. Confirm no website fetches are necessary.
- Set final app identifiers, icons, splash, privacy disclosures and screenshots;
  build with EAS and test through Android internal testing and iOS TestFlight.

Do not call the migration finished when only menus or a WebView work. Completion
means all scoped games run natively and restore their progress in offline builds.

## Meowdoku reference study

See `meowdoku-study.md` for target identity, evidence, findings and limits.
Use the research to inform hierarchy and feedback. Keep Doodle Heroes' own
artwork, identity, rules, progression, and copy.

## Verified package references

- Reanimated: https://docs.expo.dev/versions/latest/sdk/reanimated/
- Interactive SVG: https://docs.expo.dev/versions/latest/sdk/svg/
- Async storage: https://docs.expo.dev/versions/latest/sdk/async-storage/

Install SDK-matched versions with `npx expo install` in the local project and
use compatible versions offered by Snack. This design deliverable installs no
packages and does not change the existing application.
