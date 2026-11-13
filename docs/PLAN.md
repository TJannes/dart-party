# Dart Party: plan and decisions

Status: step 1 is built and release 0.1.0 is published, but the owner has not
yet installed it on the Surface or updated it from inside the app (planned:
publish 0.1.1 once 0.1.0 is installed). Step 2 is built. The next thing to
build is step 3. See [Build steps](#build-steps).

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
- The Autodarts address is fixed at `localhost:3180` for now. Making it a
  setting comes with step 3, when settings are first saved.
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
- A tie in the final standings is settled by a short deciding round.
- Throwing order: drawn for the first game; after that, whoever is last in the
  standings starts.
- Ends with a podium.

### A turn

- Three darts unless a game says otherwise.
- The turn passes automatically when Autodarts reports the darts removed.
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

### Spotlight

- A spotlight lands on one segment: 3 points. Its direct neighbours: 2. The
  segments next to those: 1.
- A new target every round, the same for all players in that round.
- Doubles and triples do not count extra. The bull scores nothing.
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
- 6 rounds. Most segments wins; on a tie, most fortified segments.

### Later, rules still to be agreed

Put the detailed rules to the owner when each is about to be built.

- **Sniper**: a cross appears somewhere on the board; closest dart wins the
  round. Uses the exact dart position.
- **Minefield**: hidden treasures and bombs under the segments, revealed when
  hit.
- **Last One Standing**: everyone has lives and a segment; hit someone's
  segment to take a life. Players are eliminated.
- **Higher or Lower**: throw higher than the previous dart or lose a life.
- **Time Bomb**: a bomb ticks down; hit the target to pass it on. Needs a
  design that copes with players walking to the board in turn.

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
- [ ] **3. First playable evening.** Players with avatars, starting an
  evening, the draw, Race, standings between games, the podium, saving and
  resuming, both screen layouts, the first theme pack with sound.
- [ ] **4. The other four specified games**, in this order: Robin Hood,
  Spotlight, Piggy Bank, Land Grab.
- [ ] **5. The five later games**, in this order: Sniper, Minefield, Last One
  Standing, Higher or Lower, Time Bomb. Agree the rules first.
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
