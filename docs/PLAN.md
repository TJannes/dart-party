# Dart Party: plan and decisions

Status: steps 1 to 3 are built and released (0.2.0). Steps 4 and 5 are built
but not yet released: eleven mini-games are in the draw. Updating from 0.1.0 to
0.1.1 inside the app works on Ubuntu; the owner still has to install on the
Surface and do the same on Windows. Everything from step 3 on has only been
played through by hand on Ubuntu with one display: not with real darts, not
with a real second screen, not on Windows, and nobody has listened to the
sound yet. The next thing to build is step 6 (free play). See
[Build steps](#build-steps).

## Goal

A group of friends plays an evening of darts mini-games on one board. The app
draws the mini-games at random, hands out points after each one, keeps a
running scoreboard and crowns a winner after the chosen number of games.

Dart detection is not ours: Autodarts Desktop runs on the same machine and the
app reads its local API. See `autodarts-local-api.md`.

The interface must be fun, playful, lively, themed and colourful, with sound.

## Decisions

All of these were agreed with the owner. Do not reopen them unprompted.

### Audience and platform

- Built for the owner's own group. A friend with their own board must be able
  to install it without help. It is not a public product with support.
- Windows and Linux (Ubuntu).
- Target hardware: a Microsoft Surface Pro 9 with touch, plus a TV over HDMI.
  It must also work without the TV.
- Autodarts and the three cameras run on that same Surface. The Autodarts
  address stays configurable (default `localhost:3180`) in case it runs
  elsewhere.
- UI text is English only, with all strings in one place so translation stays
  possible. Code and docs are English too.

### Screens

- With a second display: the TV shows the show (game, animations, scoreboard)
  full screen; the Surface shows the control panel (correct a dart, add a miss,
  next player, menus).
- Without one: the Surface shows the show with the controls built in.
- The app detects which applies and offers one button to switch.
- Design the show for reading from the throwing line, about 3 metres.
- Phones as remote controls: not now.
- For now the main window is the complete app (scene plus controls) in both
  layouts, and the show window is the same screens without anything to
  press. A leaner control-only panel for the Surface can come later.
- The show goes to the display that is not the Surface's built-in one.

### Technology

- Electron with TypeScript, React for the UI, SVG plus an animation library
  for the scenes.
- Layers:
  - a pure TypeScript core (game rules, evening, scoring) with no Electron
    dependency, fully tested, using `fixtures/` for the board side;
  - the main process owns the Autodarts connection and the game state;
  - the windows (show and control) only render that state and send commands.
- Standings are derived from the full history of darts, so a correction is a
  recomputation, never a patch. A bug in an animation must not be able to
  corrupt the score.
- A new mini-game is one rules module plus one scene.
- Colours, backgrounds and sounds are a swappable theme pack from the start.
  Only one pack ships at first. Later: packs for seasons and holidays, chosen
  by date.

### Installation and updates

- Windows: installer with a wizard. Ubuntu: AppImage.
- Built by GitHub Actions, published as GitHub Releases on the public repo
  `TJannes/dart-party`.
- The app checks for a newer version at startup and shows a button. It never
  installs on its own during an evening.
- No code-signing certificate. Windows shows "unknown publisher" once; accepted.
- Licence: MIT.
- Installer and updater come first, before any game, because the owner can
  only test Windows by installing releases.
- Updating takes two clicks: "Download update", then "Restart and install"
  once the download is complete. Nothing is downloaded without the first.
- The Windows installer is per user, so neither installing nor updating needs
  administrator rights.
- A release is made by pushing a tag `vX.Y.Z` that matches `version` in
  `package.json`. The workflow builds on Windows and Ubuntu and then publishes
  one release with all files.
- The AppImage uses electron-builder's newer static runtime (`toolsets.appimage`
  in `electron-builder.yml`, marked beta by electron-builder) so it starts on
  Ubuntu 24.04 without installing libfuse2.
- On Linux the app runs without the Chromium sandbox: Ubuntu 24.04 blocks the
  sandbox for AppImages, and electron-builder's AppImage launcher passes
  `--no-sandbox` for that reason. Acceptable because the windows only ever
  load the app's own bundled pages. Never load remote content in a window.

### Autodarts

- The dependency on an undocumented local API is accepted. Two safety nets:
  a clear message when Autodarts is not running or answers in an unexpected
  shape, and every dart can always be entered or corrected by hand.
- The app only reports that Autodarts is not running. It does not start it.
- The app listens on the WebSocket and also polls the state every 2 seconds,
  so a missed message or a silently dead socket is caught. When Autodarts is
  unreachable it retries every 2 seconds.
- A stuck board is reset automatically after 2 seconds (the prototype's
  value), and again every 2 seconds for as long as it stays stuck.
- Darts that are already in the board when the app first connects are shown
  but not reported as thrown.
- The bull is assumed to be number 25 (multiplier 2 for the bull, 1 for the
  outer bull), as in the prototype. Still to be confirmed on a real board.
- The Autodarts address is a setting (default `localhost:3180`).
- "Unofficial, not affiliated with Autodarts" in the README and in the app.
  Their name and logo appear nowhere in the app name or icon.

### Players

- 2 to 8 players, everyone for themselves. No teams yet.
- Each player has a name and picks an avatar from a fixed set of about twenty
  drawn characters. No photo upload. Avatars are vector art so they can move
  and react (cheer, sulk) inside any scene.
- Player profiles are saved on the machine.
- Players are fixed once an evening starts. An evening can always be aborted.

### An evening

- At the start: choose players and the number of games (default 5).
- Each game is drawn visibly (wheel or slot machine). No game twice in one
  evening, unless fewer mini-games exist than the chosen number.
- Mini-games can be switched off in settings so they are never drawn.
- A short rules card is shown before each game.
- Points by finishing place, for example 4-3-2-1 with four players.
- Tied places share the higher points and the next player moves down:
  4-4-2-1. No tie-break inside a mini-game.
- A tie in the final standings is settled by a short deciding round, for
  first place only: lower ties stay shared. Each tied player throws three
  darts and the highest ordinary score wins. If that is level too, those
  still level throw again.
- Throwing order: drawn for the first game; after that the reverse of the
  standings, so the last starts and the leader throws last. Players level on
  points keep their order from the previous game.
- If every enabled game has been played, games may repeat, but not the same
  one twice in a row when there is a choice.
- Ends with a podium.

### A turn

- Three darts unless a game says otherwise.
- A rule can end a turn before the darts are pulled (a bomb passed on, a
  player knocked out). The next dart then counts for the next player; pulling
  the old darts first does not skip anyone.
- The turn passes automatically when Autodarts reports the darts removed,
  also after fewer than three darts. A takeout with no dart thrown in the
  turn does not pass it.
- After the last dart of a game the result stays on screen until someone
  continues, so the deciding dart can still be corrected.
- A game with a round limit ends on the last dart of the last turn; it does
  not wait for those darts to be pulled.
- The control panel always offers: correct a dart, add a miss, move on by hand,
  reset the board.
- Every mini-game has a maximum number of rounds.

### Saving

- Player profiles.
- The running evening, written after every dart, so a crash or restart resumes
  where it was.
- The result of every finished evening. Showing a hall of fame comes later.

### Style and sound

- Game-show frame: lights, a wheel for the draw, a podium at the end.
- Each mini-game has its own scene.
- Sound effects per event (hit, miss, pushed back, win, the wheel) and
  background music per scene. No spoken caller. Volume control on the control
  panel.
- Only freely usable sounds (CC0), because the repo is public.
- For now every sound is synthesised by the app itself (Web Audio), so the
  first theme pack contains no recordings at all. Effects: hit, big hit,
  thud, miss, pushed back, win, the reel ticking and stopping, the podium
  fanfare. Music: a simple generated loop per scene (menu, game, podium).
  The owner has not yet judged whether this is good enough or whether CC0
  recordings should replace it.
- Sound plays in one window only: the show window when there is one.

## Mini-games

Segment numbering and neighbours follow the real board, clockwise from the
top: 20, 1, 18, 4, 13, 6, 10, 15, 2, 17, 3, 19, 7, 16, 8, 11, 14, 9, 12, 5.

### Race (build first)

- Each player is dealt two adjacent segments, no overlap between players.
- Hit your own segment: move forward. Single 1 step, double 2, triple 3.
- Hit another player's segment: that player moves back the same number of
  steps, never behind the start.
- Anything else: nothing happens.
- The track is 10 steps. First across the finish wins at once; the rest are
  ranked by distance.
- Safety limit: 10 rounds. Then the furthest player wins.
- Scene: a race track with the avatars as racers.

### Robin Hood

- The board is an archery target. Only distance from the centre counts; the
  thin rings give no bonus and the segment number is irrelevant.
- Bullseye 6, outer bull 5, inner single (between bull and triple ring) 4,
  everything further out (triple ring, outer single, double ring) 3.
- Zone borders follow the wires, so everyone can see which zone a dart is in.
- 6 rounds, highest total wins.
- A dart entered by hand is entered as a zone (6, 5, 4, 3 or miss), not as a
  segment.

### Spotlight

- A spotlight lands on one segment: 3 points. Its direct neighbours: 2. The
  segments next to those: 1.
- A new target every round, the same for all players in that round.
- Doubles and triples do not count extra. The bull scores nothing.
- The six targets of a game are all different.
- 6 rounds, highest total wins.

### Piggy Bank

- Every dart adds its normal value to your piggy bank.
- A dart off the board breaks the pig: you lose half, rounded down.
- Off the board means: the black surround, fully off, or a bounce-out.
- 6 rounds, highest total wins.
- This game leans hardest on miss detection. "Add a miss" must be within easy
  reach on the control panel.

### Land Grab

- The 20 segments are plots of land with a castle. The bull does nothing.
- Hit a free segment: it is yours (1 wall).
- Hit your own segment: fortified (2 walls, the maximum).
- Hit someone else's segment: one wall-hit. A plain segment falls after 2 hits,
  a fortified one after 3. Whoever lands the last hit takes it.
- Hits by different attackers add up.
- Double counts as 2 hits, triple as 3.
- The hits of one dart are played out one after the other, on any segment.
  So a double on a free segment takes it and fortifies it, and a triple on
  someone's plain segment knocks it down, takes it and fortifies it. (Filled
  in while building; the owner has not confirmed it.)
- A segment that changes hands starts again with one wall and no damage.
  Damage does not heal, also not when the owner fortifies.
- 6 rounds. Most segments wins; on a tie, most fortified segments.

### Sniper

- Each round a cross appears on the board, the same for every player. It can
  be anywhere inside the double ring, also on a wire.
- Three darts each; only your closest dart counts, by its exact position.
- When everyone has thrown, the closest player gets 3 points, the second 2,
  the third 1. Players level to the millimetre share the place.
- A dart Autodarts could not place does not count. A dart in the surround
  does, by its distance. A player without a placed dart gets nothing.
- 5 rounds, highest total wins.
- A dart entered by hand is entered by tapping the board on screen.

### Minefield

- Under the 20 segments lie 3 chests (5 points), 5 coins (2 points), 4 bombs
  and 8 empty spots, shuffled each game.
- The first dart on a segment reveals it and gets what is there. After that
  the segment is empty and safe. The ring does not matter; the bull does
  nothing.
- A bomb costs half your points, rounded down like the piggy bank.
- How much is still hidden is shown, but not where.
- 6 rounds, or until every treasure is found. Highest total wins.

The numbers of chests, coins and bombs, their values, the five rounds of
Sniper and the early end of Minefield were filled in while building; the
owner chose the scoring, where the cross can be, what a bomb does and what
happens after a reveal.

### Last One Standing

- Everyone has 3 lives and one segment of their own, dealt at random.
- Hit someone's segment: they lose a life. A double takes 2, a triple 3.
- Your own segment costs you lives in the same way.
- A player without lives is out and is skipped. Their segment does nothing
  from then on. A player who knocks themselves out is done at once.
- The last player standing wins; the others are ranked by when they went
  out. After 10 rounds the survivors are ranked by lives.

### Higher or Lower

- Before every dart the game calls "higher" or "lower". The dart must be
  worth more, or less, than the dart before it, whoever threw that.
- The first dart of the game is free: any dart on the board sets the value.
- Wrong, equal, or off the board: lose a life. A dart on the board always
  becomes the new value, right or wrong; a miss leaves it.
- The call is a coin flip, except that from 30 up it is always "lower" and
  up to 5 always "higher", so it is never (nearly) impossible.
- 3 lives, three darts a turn, knockout as in Last One Standing, 10 rounds.

### Time Bomb

- A bomb with a hidden fuse goes round. The fuse is counted in darts (4 to
  10), not seconds, so walking to the board costs nothing.
- At the board you hold the bomb. Hit the target zone (a segment and its two
  neighbours, new every turn, any ring) and your turn ends safely.
- Every other dart burns the fuse. The dart that burns the last of it sets
  the bomb off: the thrower loses a life and their turn ends. A new bomb
  with a new fuse starts with the next player.
- How much fuse has burned is shown; how much is left is not.
- 3 lives, knockout as in Last One Standing, 10 rounds.

### Raise the Bar

The owner's own idea: do better than the player before you.

- An opener throws three darts; the total is the bar.
- The next player must throw strictly more. Over it: they hold the bar, at
  their total, and the pot grows by 1. The pot starts at 1.
- Not over it: the holder wins the pot. The failed attempt is void, and the
  next opener sets a fresh bar.
- Everyone opens equally often, in throwing order: three times each with 2
  players, twice with 3 or 4, once with 5 to 8. The game ends when the last
  bar falls. Most points wins.
- An attempt is settled by its third dart, without waiting for the takeout.
- Filled in while building: the number of openings per player count, and
  that the first challenger is the player after the opener.

The owner chose: your own segment costs lives, doubles and triples count,
the game calls higher or lower, and the fuse counts in darts. Filled in while
building and not yet confirmed: the 10-round limits, the free first dart and
the 30 and 5 limits of Higher or Lower, the three-segment target zone and the
fuse length of Time Bomb, and that hitting the target does not burn fuse.

Some names and themes may still change.

### Free play

X01 and Around the Clock return as free play outside an evening. They are not
in the draw. They exist in the Python prototype and are handy for testing
detection.

## Build steps

- [ ] **1. Shell, installer, updater.** An empty Electron window that installs
  on Windows (wizard) and runs on Ubuntu (AppImage), built by GitHub Actions,
  with the "new version available" button working. Include `LICENSE` (MIT) and
  a README with the disclaimer. Done when the owner has installed a release on
  the Surface and updated it to a second release from inside the app.
  *Built and checked on Ubuntu 24.04 (AppImage starts, update check runs).
  Not yet released; the Windows installer and both update paths are untested.*
- [x] **2. Autodarts connection.** Read the local API, turn state snapshots
  into events (dart thrown, darts removed, corrected, reset, stuck, detection
  stopped/started, connection lost/restored), recover a stuck board. Tested
  against every recording in `fixtures/`.
  *The rules live in `src/core/board/`, the connection in
  `src/main/autodarts/`. The window shows a plain status panel (board state,
  the darts of the turn, a reset button, a short log) until the real show
  replaces it. Checked live only against an Autodarts without cameras; not
  yet with real darts, and not on Windows.*
- [x] **3. First playable evening.** Players with avatars, starting an
  evening, the draw, Race, standings between games, the podium, saving and
  resuming, both screen layouts, the first theme pack with sound.
  - [x] Rules core in `src/core/`: Race, the evening (draw, throwing order,
    turns, corrections, points, standings), the deciding round. Tested.
  - [x] The main process runs an evening: holds it, feeds it board events and
    commands from the windows, saves it after every dart, resumes it, and
    writes the result to the history. Tested without Electron
    (`src/core/evening/session.ts`); no screen uses it yet.
  - [x] Player profiles and the avatar set (twenty animals, drawn from parts
    in `components/Avatar.tsx`, with idle, cheer and sulk moods).
  - [x] Screens: players and start, the draw, rules card, the Race scene,
    standings, deciding round, podium, and the controls (miss, add, undo and
    correct a dart, next player, reset, volume, stop the evening).
  - [x] Show and control windows. With a second display the show opens on it
    full screen with nothing to press; the main window keeps the controls.
    The switch is under Settings. `DART_PARTY_FORCE_SHOW=1` opens the show
    window on a machine with one display, for testing.
  - [x] Theme pack (`src/renderer/src/theme/`): colours, player colours,
    sound effects and music.
  - [x] Settings: mini-games on or off, volume, screens, Autodarts address.
- [x] **4. The other four specified games**, in this order: Robin Hood,
  Spotlight, Piggy Bank, Land Grab.
  *Rules in `src/core/game/`, one case each in
  `src/renderer/src/scenes/GameScene.tsx`. Each was played for a few darts by
  hand on Ubuntu; none to the end, none with real darts.*
- [x] **5. The five later games**, in this order: Sniper, Minefield, Last One
  Standing, Higher or Lower, Time Bomb. Agree the rules first.
  - [x] Sniper and Minefield. Played for a few darts by hand on Ubuntu.
  - [x] Raise the Bar, added on the owner's idea. Played a few turns by hand.
  - [x] Last One Standing, Higher or Lower, Time Bomb. Knockout games:
    `playKnockout` in `src/core/game/types.ts` skips players who are out.
    Played for a few darts by hand on Ubuntu.
- [ ] **6. Free play**: X01 and Around the Clock.
- [ ] **Later**: seasonal and holiday theme packs, hall of fame, teams,
  players joining or leaving mid-evening, phones as remotes, starting
  Autodarts from the app.

## Open items for the owner

- Test early whether the Surface Pro 9 handles three cameras on one hub and
  whether Autodarts runs on it. Confirm it is the Intel model, not the ARM
  (5G) one.
- Ask on the Autodarts Discord whether they object to an unofficial app on the
  local API, preferably before the first release. No official position was
  found online; community tools such as darts-caller and Tools for Autodarts
  have existed openly for years.
- Install each test release on the Surface and report what goes wrong.

## Still unverified about Autodarts

See the end of `autodarts-local-api.md`. The ones that matter for the games:
what a real bounce-out looks like, the values for bull and outer bull, and
whether sending a reset is safe while a hand is still in view.
