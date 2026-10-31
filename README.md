# Doodle Heroes · Meadow Tiles

Native Expo / React Native app for Android and iOS, using selected design **08**.
There is no WebView or website connection. The existing Astro website remains
separate in the parent directory.

## Six playable native games

The selected design is **08 — Meadow Tiles**: ivory, forest green, pastel tiles,
rounded controls and an illustrated island. All game screens use native React
Native controls and SVG. No WebView, website server, API key or account is used.

| Game | Implemented |
| --- | --- |
| Island Sketch | 12 puzzles + daily generation; drag fill/mark/erase, undo, hints, stars |
| Isle Spans | 12 maps + daily; two-tap bridge construction, double bridges, crossing checks, undo, solver hints |
| Lighthouse Wiring | 12 grids + daily; animated rotation, tile locking, powered-network feedback, undo, solver hints |
| Doodle Guess | Daily stroke reveal, word suggestions, six guesses, category hint, saved result and native sharing |
| Margin Merge | 6 × 7 board; tap or drag to move/merge, orders, experience, chain unlocks, offline ink, 32-item book |
| Scribble Siege | Ten-minute fixed-step combat, floating joystick and directional controls, six weapons, passives, level-ups, boss, daily twists, hero unlocks, upgrades, custom hero drawing and idle coin jar |

Progress saves locally. Existing Island Sketch saves migrate automatically.
The journal includes puzzle results, daily guesses, Siege records and merge
collection stats. Daily puzzles keep their original dates across midnight.
Menus, wire turns, merges and doodle reveals animate; system/in-app reduced
motion is respected. Each game includes a short in-app guide.

Siege pauses when backgrounded or when its help opens. A suspended run saves its
random state, enemies, projectiles, hit sets, upgrade choices and position; it
resumes from the lobby. Finished runs bank rewards once. The simulation uses
60 fixed steps per second and the batched SVG renderer requests up to 30 redraws
per second; actual device performance remains to be measured.

Multiplayer and the linked expedition map are outside this build. Sound/music
and haptic effects are not implemented; the games currently play silently.
Final store assets and native distribution builds remain separate work.

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

## Expo Snack — GitHub import

Use the app-only **snack** branch. Runtime source is plain JavaScript because
Snack's parser rejected a TypeScript interface in the previous import.
The HTML design preview is preserved on the **design-reference** branch so
neither main nor snack needs Snack's failing asset-upload path.

1. Open https://snack.expo.dev and choose **Import git repository**.
2. Enter `https://github.com/syndney2000-gif/doodle-heroes-mobile`.
3. Open **Show advanced options**, set **Branch name** to `snack`, and leave
   **Folder path** blank (the project is at the branch root).
4. Import, then choose Expo SDK 55 and test on Android or iOS with a compatible
   Expo Go version. If SDK 55 is unavailable, align the project with a supported
   SDK before testing; do not mix native dependency versions.

You can also paste the branch URL:
https://github.com/syndney2000-gif/doodle-heroes-mobile/tree/snack

The branch contains App.js, src/, app.json, a short README, and a package.json
with runtime dependencies only. It excludes HTML, tests, lockfiles, scripts and
other development material. All artwork is drawn in code, so no asset upload
is required. Files are adapted from the same source, not independently maintained.

After changing app source on main, regenerate and push the Snack branch:

```sh
npm run snack
git push origin snack
```

`npm run snack` updates only the local generated branch; it does not switch your
checkout or publish anything. Re-import after updates; importing GitHub is a
snapshot rather than live synchronization.

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

The current suite has **104 passing tests**. It includes the reused engine and
solver tests, native save migration, catalogue/daily checks, bridge connectivity,
wire locking, merge orders, deterministic Siege resume, reward deduplication and
malformed-save checks. Screen tests use mocked native views to exercise navigation,
real game actions, drawing, pause/background handling and Siege reopen/resume.

Android and iOS Metro exports validate the runtime imports and JavaScript bundles;
they are not compiled APK/IPA files and do not prove native layout or performance.

Still verify on real phones: touch/drag accuracy, floating joystick, screen-reader
input, safe areas, large text, keyboard avoidance, board scrolling, background /
force-close restoration, sustained combat performance, and airplane-mode cold
launch in an installed build. Hardware visual testing has not been performed.

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

The pure game modules under `src/core/{nonogram,bridges,net,merge,doodle-guess,survivor}`
are adapted from the matching website engines, with native JavaScript imports.
`src/core/survivor/snapshot.js` and `src/core/mobileGames.js` implement native saves
and actions. Siege uses an equivalent stateful RNG to make snapshots resumable.
`src/games/` contains the new native screens and SVG rendering. Keep shared rules
aligned when the website changes; this app imports nothing from outside its repo.

See [design/NATIVE-APP-PLAN.md](design/NATIVE-APP-PLAN.md) for remaining phases and
[the HTML design preview](https://github.com/syndney2000-gif/doodle-heroes-mobile/blob/design-reference/design/ui-directions.html) for the selected visual study.

Expo references:
- https://docs.expo.dev/versions/v55.0.0/
- https://docs.expo.dev/build/setup/
