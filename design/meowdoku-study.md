# Meowdoku reference study

Reviewed 31 October 2026. Target: **Meowdoku: Brain Puzzle Games**, Oakever Games,
Android package `com.oakever.meowdoku`.

## Evidence and limits

This is a public product study using the official publisher's Google Play listing,
not a completed binary reverse engineering investigation. No APK/IPA or runtime
capture was supplied. REA tools are absent from this session and no installed
`rea` CLI was found. The REA connection/recovery instructions were consulted;
no configuration changes or tool installations were made.

Initially only listing text was reviewed. A follow-up pass inspected two official
promotional screenshot images: a landscape illustration and a portrait gameplay
image. These establish their depicted visual presentation, not runtime behavior.
Animation timings, framework, asset pipeline, storage format and level generator
remain unknown.

Source: [Official Google Play listing](https://play.google.com/store/apps/details?id=com.oakever.meowdoku&hl=en_US).
The listing was marked updated 29 October 2026 when reviewed; a marketing listing
does not identify the exact installed build or prove runtime behavior.

## What the official listing establishes

- The publisher presents it as a single-player logic game with a colored grid.
- Its stated rules require one cat in each region, with cats sharing neither
  rows nor columns and never touching diagonally.
- The described placement gesture is a double tap. Incorrect placements consume
  one of three hearts.
- The publisher advertises offline play, daily puzzles, global completion-time
  rankings and tactile feedback. These are product claims, not device-tested findings.
- Google Play labels it as containing advertising and in-app purchases.

These points summarize the publisher's description; gameplay has not been run.
The listing's promise about non-intrusive advertising is not sufficient evidence
of its actual frequency. Some visible store reviews complain about ads, but
reviews are individual reports, not a verified measurement of the current build.

## Useful design conclusions for Doodle Heroes

The following are proposed design choices, not observed Meowdoku implementation details:

| Product pattern | Adaptation for Doodle Heroes |
| --- | --- |
| A small, memorable rule set | Teach each game with a short interactive example; keep rules accessible during play. |
| A strong central board | Give puzzles most of the screen; put undo, mark and hint controls within thumb reach. |
| Character identity | Use an original doodle hero, notebook artwork and collectible stickers rather than copying cats or assets. |
| Feedback after a move | Animate fills or tile rotation briefly; add optional subtle haptics and clear error symbols. |
| Short repeatable puzzles | Offer Continue and a local daily challenge without requiring an account. |
| Offline core play | Bundle puzzle catalogues and deterministic generators and save locally. Exclude rankings and multiplayer for this release. |

For visual hierarchy, use one primary Continue action on Home, a compact daily
card, and a clearly labeled game library. Inside play, keep navigation secondary
to the board. These are recommendations pending the user's choice of UI direction.

For controls, prefer a single tap plus explicit fill/mark mode for Island Sketch;
test this against long press before deciding. Meowdoku's described double tap is
not automatically appropriate for all six games. Do not introduce a heart limit
into Doodle Heroes merely because this reference uses one.

For motion, prototype 120–180 ms input feedback, approximately 250 ms screen
transitions and a brief completion celebration. Honor reduced motion and never
block the next move while a decorative animation runs. These timings are proposed
for Doodle Heroes; no Meowdoku animation timing has been measured.

## What remains unresolved for a deeper RE pass

An exact app version and a lawfully supplied APK/IPA or recorded gameplay would
be needed to investigate real screens, tutorial flow, animations, persistence,
engine/framework, puzzle validation and packaged resources. Until then, those
questions remain unknown. Publicly discoverable similarly named browser games
were not treated as evidence for Oakever's mobile app.

## Follow-up: design option 07

The portrait screenshot depicts warm cream surroundings, cocoa/brown typography,
round white back/settings buttons, level and score counters, pill-shaped status
areas, a compact three-part rules strip, and a large pastel-colored board with
white gutters and a soft outer border. The landscape promo uses more dimensional
characters and tiles; it is not evidence that all gameplay uses that rendering.

References inspected:
- [Official portrait gameplay image](https://play-lh.googleusercontent.com/lyiexjhoPXGiguZiCBkFFu27gtp1S34fHzj82bmmwbiwr-JXBksUA8hiDqEn9Xbt8Q5qT616QI-4QuM5cij8=w800)
- [Official landscape promotional image](https://play-lh.googleusercontent.com/qsGiOZrr0qmnA9hPmwRv79Qq_xnta6onx8aaf_RGat7b-8sQK269EyS4CIkFbisjEQpfIxmfBXnPYOm5t87uSA=w800)

`ui-directions.html` option 07, Doodle Tiles, adapts that cream/cocoa palette,
pastel board treatment, compact instructions and rounded controls to Island
Sketch. It uses Doodle Heroes branding and nonogram clues, with undo/clear/hint
controls. Pastel colors are decorative and do not add colored-region rules.
It does not reuse the cat artwork, implement Meowdoku gameplay, or add its
mistake-limit mechanic. The tile animation is an original proposed treatment.
