# Doodle Heroes · Meadow Tiles

Native Expo / React Native app for Android and iOS, using selected design **08**.
There is no WebView or website connection. The existing Astro website remains
separate in the parent directory.

## Implemented: milestone 1

- Meadow Tiles home: animated SVG island, forest-green controls, pastel tiles.
- Island Sketch: all 12 catalogue puzzles in three chapters, plus a deterministic
  10 × 10 daily sketch generated entirely on the device.
- Number clues, tap / drag strokes, fill / mark / erase, undo, clear, solver hints.
- Completion detection, stars, journal, local streak and three milestones.
- Saved boards, undo history, hints, time, completion and reduced-motion setting.
- Foreground play timer, Android back handling, tutorial and larger-cell mode.
- Storage error recovery, retry, and an explicit confirmed reset.
- System reduced-motion preference plus an in-app option.

The other five games and the linked expedition map are still planned. The game
library labels them as in development; it does not pretend they are playable.

## Run locally

Use Node.js 22 or newer. From this directory:

```sh
npm install
npm start
```

Open the QR code with a compatible Expo Go installation on an Android phone or
iPhone. This project targets Expo SDK 55. If your Expo Go no longer supports it,
use an SDK-compatible development build or upgrade the project deliberately.
The development server is not needed once you have built and installed a
standalone app. Development previews can require connectivity to load the bundle.

## Expo Snack

1. Create a blank project at https://snack.expo.dev with SDK 55 if available.
2. Copy `App.js` and **every file inside `src/`**, preserving directory names.
   Pasting only App.js is not sufficient. `snack-source.zip` contains these files
   and package metadata for convenient extraction and copying.
3. Add these dependencies, using versions compatible with the selected SDK:
   - `react-native-safe-area-context` (~5.6.2 for this project)
   - `react-native-svg` (15.15.3)
   - `@react-native-async-storage/async-storage` (2.2.0)
4. Keep Snack's Expo, React and React Native dependency versions matched to its
   selected SDK. Do not copy node_modules, dist, tests, design files or the lockfile.
5. Open the preview in Expo Go on Android or iOS. Phone previews are the target.

No API keys, website URL, server or multiplayer setup are needed.

## Controls

Fill paints a square; Mark places an ×; Erase removes a fill or mark. Tapping an
already selected value clears it. A drag stroke is one undo action. Hints apply
one line deduction and explain it. Undo retains hint cost. Completion needs the
correct filled squares; marking every empty cell is optional.

On large boards, use Larger cells and swipe on the clue area to scroll sideways.
The grid itself handles painting gestures. Pastel row colors are decorative.
Completed boards are read-only and remain available in the journal.

Daily sketches use the local date and the original website's seeded algorithm.
A saved daily retains its puzzle definition across midnight. Streaks count local
completion days. Saved website progress does not automatically transfer.

## Validation

```sh
npm test
npm run check
npx expo export --platform all
```

The mobile tests cover stroke undo, immutable completion, hints and conflicts,
round-trip / damaged saves, deterministic daily generation, streaks, catalogue
solvability and bounded history. Android and iOS Metro exports validate bundling;
they do not replace native compilation or device testing.

Still verify on real Android and iOS devices: drag responsiveness, screen-reader
input, safe areas, large text, board scrolling, background/resume, save reload,
reduced motion, and airplane-mode cold launch in an installed build.

## Native build

Choose unique `ios.bundleIdentifier` and `android.package` values in app.json,
add final icon / splash assets, then configure EAS and build. Store distribution
and developer accounts are separate from this development milestone.

```sh
npx eas-cli@latest login
npx eas-cli@latest build:configure
npx eas-cli@latest build --platform all
```

## Sources and next phases

`src/core/nonogram/solver.ts` and `puzzles.ts` are copied from the website's
matching `src/games/nonogram/` files. `daily.ts` uses a local relative import.
`src/core/lib/rng.ts` and `scoring.ts` are copied from the website's shared lib.
Keep those copies aligned when rules or catalogue data change; the mobile package
has no imports from outside its own directory.

See [design/NATIVE-APP-PLAN.md](design/NATIVE-APP-PLAN.md) for remaining phases and
[design/ui-directions.html](design/ui-directions.html) for the selected visual study.

Expo references:
- https://docs.expo.dev/versions/v55.0.0/
- https://docs.expo.dev/build/setup/
