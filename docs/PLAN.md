# Dart Party: plan and decisions

Status: steps 1 to 3 are built and released (0.2.0). Steps 4 to 8 are built
and released, for the owner to test (0.3.0 has the games and the animations,
0.4.0 adds free play, 0.5.0 the themed animations per game, 0.6.0 renames
the evening to a party, 0.7.0 adds the drinking game, 0.8.0 the demo on
the rules card): eleven
mini-games are in the
draw. Updating from 0.1.0 to
0.1.1 inside the app works on Ubuntu; the owner confirmed step 1 done on
2026-11-16. Everything from step 3 on has only been
played through by hand on Ubuntu with one display: not with real darts, not
with a real second screen, not on Windows, and nobody has listened to the
sound yet. The owner still has to judge step 6 (animations in every game) on the
Surface, under Settings, "Try the animations". Step 8 (themed animations per
game) is built for all eleven games and seen only on the Animations screen
on Ubuntu. Step 9 (the drinking game) is built and released in 0.7.0: played
through by hand on Ubuntu in one window, without darts, a second screen or
sound. Step 10 (rules explained by animation) is built for all eleven games
and seen on Ubuntu in one window; released in 0.8.0 with the two changes
to the drinking game of 2026-11-16. 0.8.1 has the new values in Piggy
Bank (the double ring pays three times) and its own board. 0.8.2 has
the target zone of Time Bomb that follows the players, and a wrong dart
ending the turn in Higher or Lower. Step 11 (Blackjack, a twelfth game) is
built with its own scene and animations but not released: one round was
played by hand on Ubuntu in one window, without darts, a second screen or
sound. What is left after it is under "Later" and "Parked".
See [Build steps](#build-steps).

## Goal

A group of friends plays a party of darts mini-games on one board. The app
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
  - a pure TypeScript core (game rules, party, scoring) with no Electron
    dependency, fully tested, using `fixtures/` for the board side;
  - the main process owns the Autodarts connection and the game state;
  - the windows (show and control) only render that state and send commands.
- Standings are derived from the full history of darts, so a correction is a
  recomputation, never a patch. A bug in an animation must not be able to
  corrupt the score.
- A new mini-game is one rules module, with the moments it reports, plus one
  scene. See [Animations](#animations).
- Colours, backgrounds and sounds are a swappable theme pack from the start.
  Only one pack ships at first. Later: packs for seasons and holidays, chosen
  by date.

### Installation and updates

- Windows: installer with a wizard. Ubuntu: AppImage.
- Built by GitHub Actions, published as GitHub Releases on the public repo
  `TJannes/dart-party`.
- The app checks for a newer version at startup and shows a button. It never
  installs on its own during a party.
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
- When a game starts (Start on the rules card, a deciding round, a free-play
  game or playing it again) the board is reset, but only if Autodarts
  already holds darts. Darts noted between games are ignored by the app but
  still fill Autodarts' turn of three, so the first player lost a dart
  (seen by the owner). No reset when the list is empty, because resetting
  with a dart still in the board makes it stuck once that dart is pulled.
  Decided with the owner on 2026-11-15.
- Darts that vanish from Autodarts' list during a takeout (status
  `takeoutInProgress`, no `takeoutFinished`) count as removed: the turn
  passes and its darts stay. Only a shorter list outside a takeout is a
  correction. Decided with the owner on 2026-11-15 after darts of a Minefield
  turn disappeared.
- Darts that are already in the board when the app first connects are shown
  but not reported as thrown.
- The bull is assumed to be number 25 (multiplier 2 for the bull, 1 for the
  outer bull), as in the prototype. Still to be confirmed on a real board.
- The Autodarts address is a setting (default `localhost:3180`).
- "Unofficial, not affiliated with Autodarts" in the README and in the app.
  Their name and logo appear nowhere in the app name or icon.

### Players

- 2 to 8 players, everyone for themselves. No teams yet.
  The rows of players in a game scene shrink to the height there is
  (`--rows` on `.race__track`), so eight fit above the controls; with
  eight the names get small, smallest in Time Bomb with its heading.
  Whether to lower the maximum to six is an open question of the owner's
  (2026-11-16).
- Each player has a name and picks an avatar from a fixed set of about twenty
  drawn characters. No photo upload. Avatars are vector art so they can move
  and react (cheer, sulk) inside any scene.
- Player profiles are saved on the machine.
- Players are fixed once a party starts. A party can always be aborted.

### A party

- Called a "party", in the app and in the code, since 2026-11-15; it was
  an "evening" before, which the owner wanted to change. The theme that
  was called "party" is now "gameShow". A party saved by 0.5.0 or earlier
  (`evening.json`) is carried over on the first start of the new version.
- At the start: choose players and the number of games (default 5).
- Each game is drawn visibly (wheel or slot machine). No game twice in one
  party, unless fewer mini-games exist than the chosen number.
- Mini-games can be switched off in settings so they are never drawn.
- A short rules card is shown before each game.
- Points by finishing place, for example 4-3-2-1 with four players.
- Tied places share the higher points and the next player moves down:
  4-4-2-1. No tie-break inside a mini-game.
- A tie in the final standings is settled by a short deciding round, for
  first place only: lower ties stay shared. Each tied player throws three
  darts and the highest ordinary score wins. If that is level too, those
  still level throw again. It has no rules card: these rules stand in one
  line under the heading of its play screen (owner, 2026-11-16).
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
- The running party, written after every dart, so a crash or restart resumes
  where it was.
- The result of every finished party. Showing a hall of fame comes later.

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
  fanfare. The effects stay synthesised.
- Every effect must be audible on a small laptop speaker, which plays almost
  nothing under 200 Hz. A low thump keeps its body for a good speaker and
  gets a short mid-range knock on top; a test guards this. No setting for
  the kind of speaker. A dart that does nothing (neutral) sounds such a
  knock: heard, but not a fault; the fault sound stays for a dart off the
  board. Decided with the owner on 2026-11-15.
- Music: the generated loop per scene proved too monotonous after a few
  minutes, so it is replaced by CC0 recordings and the music generator is
  removed. Decided with the owner on 2026-11-15:
  - Style per scene: lounge in the menu, upbeat funk or game show during
    play, something triumphant on the podium.
  - A small playlist per scene: 3 to 5 tracks for play, 2 to 3 for the
    menu, 1 to 2 for the podium. Random order, never the same track twice
    in a row, a pause of 2 to 4 seconds between tracks.
  - All mini-games share one pool of play music. The theme allows music per
    game later.
  - The music ducks by about 40% under darts and effects and comes back in
    about half a second. A change of scene crossfades in about a second.
    Tracks are loudness-normalised.
  - Moving to the next mini-game keeps the current track playing.
  - On the podium the existing fanfare plays first, then the podium music
    loops for as long as the screen is open.
  - Claude finds candidates (OpenGameArt and Freesound, CC0 only, licence
    checked per track) and lists them with links; the owner listens and
    picks. Source, author and licence of every track go into `CREDITS.md`.
  - Files are OGG; the music may add 20 to 30 MB to the installer.
  - Music that follows the tension of a game is an idea for later.
  - Shortlist (OpenGameArt, CC0 on 2026-11-15; recheck before use).
    Play: Funked Up (Joth), Funky Disco Beats to Boogie/Woogie to (Fupi),
    Midnight Cruiser, Wednesday Night and Rhythm Factory (Zane Little
    Music), Catchy Swing (Doge), Electro Swing type (G_P), Funky House (Of
    Far Different Nature), 1-UP Nightclub (neonarkade). Menu: Shop Theme
    (CleytonKauffman), Coffee House Bump (OatCog), Mocha Frapp (Pro
    Sensory), Bossa Town (KarateStudios), Jazzy Blues (LushoGames). Podium:
    Victory! Victory! Victory! (Spring Spring), Racing Game Result
    (MintoDog), Outro party music (buffy), Winning the Race (section31),
    Triumphant (Emma_MA). Funky Victory Loop was dropped: only 8 seconds.
- Sound plays in one window only: the show window when there is one.

### Bug reports

- Every party, free play included, keeps a log: what Autodarts sent (a
  repeated poll once), what the app made of it, every control-panel action,
  every reset and why, and where the party stands, each with the time. Logs
  live in the app's data folder. A log with a bug is kept until it is
  deleted by hand; of the logs without one, the oldest go once there are
  more than 20 logs. `/api/config` is never
  called, so it is never in a log.
- A Bug button (a beetle and the word "Bug") on the control panel marks the
  moment at the tap, with the party and the board as they were; a note is
  optional and can be written then or later.
- Under Settings, "Bug reports" lists the logs with a bug ("Show all
  parties" shows the others too), lets the notes be edited, and "Save for
  analysis" saves one log with its bugs as one file for Claude to read.
  "Delete" removes a log with its bugs, after a confirmation. There is no
  "solved" status per bug.
- Logs hold the players' names: they stay out of the public repo. A log used
  as a fixture gets neutral names first.
- Decided with the owner on 2026-11-15.

### Drinking game

Agreed with the owner in an interview on 2026-11-16.

- A layer on top of a party. It never changes points or standings.
- Switched on per party on the start screen: a switch "Drinking game" with
  one sentence of explanation and a link to the rules. Off by default; the
  last choice is remembered. Not in free play.
- The rules hang on what every game reports (moments, the verdict per dart,
  the ranking), never on one game, so a new mini-game takes part by itself.
- The wording stays neutral ("drinks", "sip"); the word alcohol appears
  nowhere, so any drink counts.
- During a game:
  - three misses in one turn: the thrower drinks 1;
  - a turn that brings nothing (every dart neutral or bad): the thrower
    drinks 1;
  - points lost (broken pig, bomb in Minefield): the victim drinks 1;
  - a life lost or blown up: the victim drinks 1, however many lives;
  - knocked out: the victim drinks 2;
  - the bar knocked off in Raise the Bar: the thrower drinks 1;
  - a 180 or three darts in one segment: the thrower hands out 1.
- One dart gives one player at most one order: the heaviest.
- Being attacked without losing a life (pushed back, a wall hit) costs
  nothing.
- The empty-turn rule does not hold in Last One Standing, Race and Time
  Bomb, where an empty turn is the usual thing. A rules module says so with
  one optional field (`emptyTurnsAreNormal`); a game that says nothing gets
  the rule.
- Every rule has its own switch under Settings, "Drinking rules", all on by
  default.
- After a game: the last drinks with 2 to 4 players, the last two with 5 or
  6, the last three with 7 or 8, one sip each. Whoever shares a place with a
  drinker drinks too. The winner hands out 1 sip, whatever the number of
  players; several winners each hand out 1. It was as many sips as there
  were drinkers; with 8 players that made up to 6 of 8 drink, which the
  owner found too much (2026-11-16).
- On the podium: the last of the party drinks 2, the winner hands out 2,
  and two titles are shown: "Thirstiest" (most sips taken) and "Most
  generous" (most handed out). No drinking in a deciding round.
- The wheel: after every game but the last, after the standings and before
  the next draw. Never during a game. First a player wheel (purely random,
  only players who drink), then a task wheel; one tap on "Spin" starts
  both, about 8 seconds together, and the outcome stays up until someone
  continues. "Skip" passes it; it cannot be spun again. The outcome is saved
  when spun, so a restart shows the same result.
- The task wheel has eight equal slots: Drink 1 (twice), Drink 2, Hand out
  2, Everyone drinks, Everyone but you drinks, Pick a drinking buddy, Safe.
- The buddy is tapped on the control panel and drinks along with the
  chooser, one way only, until the next wheel. At most one pair. With no
  other drinker the slot counts as Safe.
- Handing out is done by word of mouth: the app only counts it for the
  giver.
- Sitting out: a tick per player at the start, and at any moment later on
  the control panel. The whole mode can also be switched off and on again
  during the party. Both count from that moment; earlier sips stay. A
  player who sits out is not on the wheel, gets no orders to drink and
  cannot be a buddy, but may hand out.
- On screen: a banner that stays until the next dart, nothing to confirm.
  It comes up big in the middle of the screen once the animation chain is
  over, stays there for 3 seconds, then moves down to a fixed strip
  at the bottom. After 10 seconds it shrinks to half its size, so it no
  longer covers the bottom player or the board, and stays as a reminder
  until the next dart falls or the party moves to another screen. The next
  player is announced only when it has left the middle. It was 2 seconds
  in the strip and was cut short by the turn passing; the owner found that
  far too short after a hat-trick, asked for the middle first, and chose
  the 3 seconds in the middle, the 10 seconds and staying until the next
  dart (2026-11-16). Several drinkers from one dart share one banner. It
  stays in calm mode, without flash or shaking.
- The dart that ends a game gets no banner: it came on top of the win
  animation and was followed straight away by the orders under the
  standings, too much at once (owner, 2026-11-16). Its orders stand with
  the lines under the standings instead, first, so nothing is let off.
- A glass with a count beside every player on the scoreboard and on the
  standings; a crossed-out glass for a player who sits out.
- Two new synthesised sounds (drink, hand out); the wheels use the
  existing reel sound.
- A card "Drinking rules" after choosing the players and before the first
  draw, with only the rules that are on and, at the bottom, "Any drink
  counts. Anyone can sit out at any time." It stays within reach on the
  control panel. Nothing extra on the rules card of a game.
- The counts follow from the history of darts: a correction recounts them
  and plays the banner of the new outcome, with no "you drank for nothing".
  Nothing plays on undo.
- Orders and wheel outcomes go into the party log; the final counts per
  player go into the saved result.
- Filled in while building, not put to the owner: a turn is only empty if
  it also scored the thrower nothing (in Robin Hood three darts in the
  outer zone are "neutral" but score 9); only a full turn of three darts
  can be empty; a miss on an empty pig loses nothing, so costs no sip;
  three darts in one segment hand out a sip in any game, also on a segment
  that does nothing; when a dart gives a player an order to drink and one
  to hand out of the same size, drinking wins; "after a game" and "podium"
  are one switch each, covering both the drinker and the winner; the
  winner of a game hands out nothing when nobody drinks after it (everyone
  level, or every drinker sits out); the dart that ends a game still plays
  no drink sound, as the lines under the standings never did; when
  everyone is level nobody drinks; on the podium only the last place drinks, whatever the
  number of players; skipping a wheel also ends the buddy pair; the buddy
  drinks the same number of sips as the chooser; the order of the slots on
  the task wheel.

### Animations

Agreed with the owner in an interview on 2026-11-15. Ideas that are not yet
decided are in `ANIMATION-IDEAS.md`.

- Three layers, built in this order: moments that work in every game, themed
  moments per game, and rules explained by animation.
- Next to the five feedback values, the rules report *moments*: what
  happened and to whom (life lost, knocked out, attacked by whom, captured,
  exploded, bar raised, and so on). Pure data, tested with the rules. The
  windows only react to them, for animation and for sound.
- An animation never holds up the game. A new dart cuts a running animation
  short. Ordinary reactions last about 1 second at most; big moments
  (explosion, knockout, win) about 3 seconds at most, and only where the turn
  or the game ends anyway.
- One dart that causes several moments plays them as one short chain from
  cause to effect (glove, life lost, knocked out, game won), about 3 seconds
  in total. A general spectacular moment is dropped when the game itself
  already shows something big.
- Nothing plays on undo, on resuming after a restart, or when a screen is
  first opened. A corrected dart plays the animation of its new outcome.
- Everything is drawn in SVG and moved with `motion`, like the avatars. No
  animation files (Lottie, video, sprites). Simple and cartoon-like is fine
  for now.
- The animation for each moment is a replaceable part of the theme pack. The
  owner may later want to see how polished it could look: a polished version
  of one game can then be put beside the simple one without touching the
  rules. Using animation files for that would be a new decision.
- The players' own avatars are the actors: the attacker throws, the victim
  takes the hit. Five more moods: shocked, hit, laughing, sweating, knocked
  out.
- Teasing a bad throw is fine (tumbleweed, sulking avatar, blackened after a
  bomb), as long as it stays playful and is never bigger than the reward for
  something good.
- A setting "calm animations", off by default, for the whole party. It
  drops screen flashes, shaking, full-screen moments and teasing, and keeps
  the small reactions (impact, flying points, moving avatars).
- Spectacular in any game: three darts in one segment, bullseye, triple 20,
  180, three misses in one turn, deciding the game with the last dart. Each
  game decides what is spectacular for it; this list is the fallback.
- The crown for taking the lead hops only on the standings screen between
  games, for the party standings. Not during a game.
- Animations play in both windows. Sound stays in one.
- Every new animation gets its own sound, synthesised by the app like the
  current ones.
- Rules card: a demo beside shortened text, a loop of two to four steps with
  one caption each. It uses the avatars and dealt segments of that party's
  players and reuses the game's own scene and animations. No sound effects
  in the demo; the music plays on. The start button works at once.
- A screen "Animations" under Settings plays every moment of every game at
  one tap, without a dart. For judging on the Surface, for seeing whether
  the Surface keeps up, and later for comparing a polished version.
- The themed ideas per game in `ANIMATION-IDEAS.md` are a starting point.
  They are put to the owner when that game is about to be done, like the
  rules.

Agreed per game on 2026-11-15:

- **Time Bomb.** The bomb sits in the row of the player at the board. The
  fuse is secret, so it never gets visibly shorter: every burned dart makes
  the bomb bigger and redder, the spark fiercer and the ticking faster, and
  the holder sweats. That shows only how much has burned. Target hit: the
  avatar throws the bomb to the next player. Boom: full-screen flash, a
  life falls off, and the avatar stays blackened until that player is back
  at the board (not in calm mode).
- **Last One Standing.** A boxing glove on a spring from the attacker to
  the victim, one blow per life taken (2 or 3 for a double or triple). Your
  own segment: the glove flies out, turns round and hits the thrower. Out:
  counted out, with stars round the head. Two players left (in a game that
  started with more): a "Final duel" banner, once, and the lights stay
  dimmed for the rest of the game.
- **Piggy Bank.** One big pig above the board, in the colour of the player
  at the board, with their total on it; the next player's pig slides in on
  the turn change. Coins drop into it, it grows fatter with the total and
  wiggles. A dart of 40 or more: one golden coin and the pig grins. Off the
  board: a hammer, a crack, coins roll away, and the pig looks grumpy. It
  keeps a plaster per break.
- **Race.** Forward: a dust cloud and speed lines; a triple adds a nitro
  flame. Pushed back: the attacker throws a banana peel for a single and
  an oil slick, with a bigger skid, for a double or triple; the victim
  spins backwards. Finish: chequered flag, the finish tape snaps, a camera
  flash.
- **Robin Hood.** Darts land as arrows that quiver in the target. Bullseye:
  an arrow is split, feathers fly. Off the board only: the arrow thuds
  into a tree and a bird flies up (teasing, so not in calm mode). The
  lowest zone gets the plain quivering arrow.
- **Spotlight.** New round: the spotlight sweeps over the board with a drum
  roll and stops. Hit the target (3 points): the avatar bows in the beam
  and roses are thrown. A whole turn without points: the beam swings away
  and someone coughs (teasing, so not in calm mode).
- **Land Grab.** Everything plays on the segment on the board, which shows
  a small castle per plot instead of the marks. Claim: a flag in the
  player's colour, the castle rises. Fortify: a second wall, stone by
  stone. Attack: a catapult stone from the attacker's avatar, a crack in
  the wall. Capture: the wall crumbles, the old flag drops, the new one
  goes up. The steps of a double or triple play shortly after each other.
- **Sniper.** New round: the cross drops in like a scope locking on. Every
  dart: a dotted line measures the distance to the cross while the
  millimetres count up. End of the round: gold, silver and bronze rings
  on the three closest darts.
- **Minefield.** A shovel digs for about half a second before the segment
  shows what was under it. Chest: the lid opens, a glow and coins. Coin: one
  flip. Bomb: explosion, half the points blown away, the avatar blackened
  until that player is back at the board, as in Time Bomb. Empty: a small
  crab walks out.
- **Higher or Lower.** The call is a big arrow, up or down, with the number
  to beat; it flips like a card at every new call. Right: it turns green
  and shoots onward. Wrong: it breaks, a buzzer, a heart cracks.
- **Raise the Bar.** A high-jump set with the bar at the height of the
  total to beat, instead of the meter. The thrower's avatar rises with
  their total per dart. Over it: the avatar jumps over, the bar moves up,
  a coin drops in the pot. Not over it: the avatar knocks the bar off and
  the holder collects the pot.

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
- Safety limit: 10 rounds, fewer with more players: about 40 turns in all,
  so 10 rounds up to 4 players, then 8, 7, 6 and 5 with 8 players. Then
  the furthest player wins. Why: with 6 to 8 players most of the board is
  dealt, everyone is pushed back by everyone, and an estimate put the game
  at 30 to 40 minutes. The owner asked for the shorter limit
  (2026-11-16); the 40 turns were filled in while building.
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

- Every dart adds its value to your piggy bank. The double ring pays three
  times the number of its segment (double 20 is 60); the triple ring pays
  only once (triple 20 is 20). The bull keeps its 25 and 50.
- A dart off the board breaks the pig: you lose half, rounded down.
- Why: with ordinary values the safe middle paid best (triple 20), so the
  pig only broke by bad luck. Now the big darts lie next to the edge, and
  going for them is a choice. The owner's idea (2026-11-16); he left the
  numbers to Claude, who chose three times over four so one lucky dart
  does not decide a game, and the triple ring at once so the middle of the
  board is never the best place to aim. A segment that may not be hit was
  considered and dropped: too close to Minefield and Last One Standing.
- A dart of 40 or more is still the golden coin: now a double 14 or
  higher, or the bullseye. Only the bullseye is a spectacle in this game.
- The board shows it (asked by the owner, 2026-11-16): the double ring is
  gold with a glow and four coins marked "×3" on it, the triple ring is
  drawn like the singles around it, the surround is dark red, and the
  heading above the pigs says "The gold ring pays ×3". The rules text
  calls it the gold double ring. Filled in while building: these looks.
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
- With 6 to 8 players every treasure is often found in round 2 or 3, so
  the last throwers of that round get fewer turns. Kept as it is (owner,
  2026-11-16): playing the round out would only leave bombs for them, and
  the throwing order changes every game. More treasure for more players
  was the other option.

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
- Wrong, equal, or off the board: lose a life, and the turn is over. A
  dart on the board always becomes the new value, right or wrong; a miss
  leaves it. So a turn costs one life at most and the next player inherits
  the value of the wrong dart. Before, the turn went on, and a player
  could lose all three lives before anyone else had thrown (owner,
  2026-11-16).
- The call is a coin flip, except that from 30 up it is always "lower" and
  up to 5 always "higher", so it is never (nearly) impossible.
- 3 lives, up to three darts a turn, knockout as in Last One Standing, 10
  rounds. As after a bomb, the next dart counts for the next player, also
  before the old darts are pulled.

### Time Bomb

- A bomb with a hidden fuse goes round. The fuse is counted in darts (4 to
  10), not seconds, so walking to the board costs nothing.
- At the board you hold the bomb. Hit the target zone (a segment and its two
  neighbours, new every turn, any ring) and your turn ends safely.
- Every other dart burns the fuse. The dart that burns the last of it sets
  the bomb off: the thrower loses a life and their turn ends. A new bomb
  with a new fuse starts with the next player.
- How much fuse has burned is shown; how much is left is not.
- 3 lives, knockout as in Last One Standing, 10 rounds, fewer with more
  players: about 48 turns in all, so 10 rounds up to 5 players, then 8, 7
  and 6 with 8 players. Why: a life is only lost when a whole fuse burns
  out, so with many players nobody is knocked out before the limit and
  the game always ran its 10 rounds, 20 to 30 minutes. The owner asked
  for the shorter limit (2026-11-16); the 48 turns were filled in while
  building.
- The target zone follows the players (owner, 2026-11-16: the game was too
  easy, and it must only change when the game sees that). Every game
  starts three segments wide. After a round in which more than two thirds
  of the turns passed the bomb on, the next round is one step harder:
  two segments (the target and the next one clockwise), then one. After a
  round in which fewer than a third did, it is one step easier again,
  never wider than three. A turn counts when a dart was thrown in it.
  The zone only changes between rounds, so everyone in a round throws at
  the same size, and it follows from the darts alone, so a correction
  recomputes it. Known trap: correcting a dart of an earlier round can
  change the zone of the round being played, and its darts are then
  judged again. A change is announced at the start of the round ("Too
  easy! The target shrinks", "The target grows again") with a ring closing
  in on the board and a sound of its own. The owner chose this over a
  round without an explosion as the signal, a shorter fuse, and a zone per
  player; Last One Standing and Race, where a group can find the targets
  too hard, were left as they are. Filled in while building: the two
  thirds and the third, the two-wide step and which neighbour it keeps,
  the wording, and that the fuse length does not change.
- A game says how hard its round is as `level` in its view; the cue for a
  new round then carries `harder` or `easier`. Any later game that adapts
  can use the same.

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
- One bar can be raised at most five times: the fifth raise wins the pot
  (6) at once, and the next opener starts. Without it the game had no
  limit at all, against the rule that every game has one. Asked for by
  the owner (2026-11-16); the five was filled in while building.
- Filled in while building: the number of openings per player count, and
  that the first challenger is the player after the opener.

The owner chose: your own segment costs lives, doubles and triples count,
the game calls higher or lower, and the fuse counts in darts. Filled in while
building and not yet confirmed: the 10-round limits, the free first dart and
the 30 and 5 limits of Higher or Lower, the three-segment target zone and the
fuse length of Time Bomb, and that hitting the target does not burn fuse.

### Blackjack

Added for balance: see "Balance: skill against luck" under the ideas below.
Agreed with the owner on 2026-11-16, on Claude's proposal.

- Get as close to 21 as you can without going over.
- Only the number of the segment counts; the ring does not. A triple 7 is
  7. So a chance triple cannot bust a weak thrower, and everyone sees at
  once what a dart is worth.
- The bull, inner and outer, is the ace: 11, or 1 when 11 would take the
  hand over 21. The game works it out; nobody chooses.
- A dart off the board is worth 0, but it is used up.
- Stopping: pull your darts, after one, two or three. Over 21 is bust and
  the turn is over at once; the next dart counts for the next player.
- Per round the closest hand gets 3 points, the second 2, the third 1.
  Equal hands share the place, as in Sniper. A bust scores nothing, also
  when nearly everyone is bust.
- Exactly 21 pays 1 point on top of the place.
- 5 rounds, highest total wins.
- The start moves up one player every round: whoever throws last knows
  what to beat, and without this the leader of the party, who throws last,
  would have that every round. `playTurns` takes the order of a game as
  an optional `throwerOf`.
- Why it balances: two random darts on the board make 21 on average, so a
  weak thrower is near it by themselves and mostly has to choose when to
  stop. A strong thrower can take 20 and stop, but going for 21 needs the
  1, which lies between the 20 and the 18.
- On screen: above the players "To beat: 19" (the best hand of the round
  that is no longer being thrown at); under each name the hand, "Bust" or
  "Blackjack!", and until a player's turn comes what the last round paid.
  The dart slots show what a dart adds (7, A, Miss), not its ring.
- Filled in while building, not put to the owner: the ace stays flexible,
  as in the card game (a bull and then a 15 make 16, not a bust); a hand
  of exactly 21 ends the turn; a hand of 0 (only misses) gets no place;
  a bust is reported as a turn that brought nothing (`blank`: a cough, no
  sip of its own); a miss sounds as a fault, any other dart as a hit, 21
  as a big hit; the round is paid out without an animation, since it often
  ends on a takeout and not on a dart; the wording on screen ("18 · pull
  to stop" under the name of whoever is throwing).
- Its own scene and animations, asked by the owner on 2026-11-16: a card
  table above the board with the deck, the hand of whoever threw last as
  playing cards, that player's avatar and the total on a chip. Every dart
  deals a card from the deck (a dart off the board lies face down, a bull
  is an A); a bust gets a red "BUST" stamp across the cards and a red
  chip, 21 a gold chip. The hand stays on the table until the next player
  throws, also the hand that closed a round. Themed moments: on a bust the
  table shakes and the chips are swept off, with the buzzer in place of
  the cough; on 21 chips fly up from the table, with the gold-coin sound.
  One new synthesised sound, `card`, with every dart on the board. Three
  entries on the Animations screen. Filled in while building: all of
  these looks, the suits (they only tell the cards apart), and that the
  round has no opening animation of its own.

Some names and themes may still change.

### Ideas, not agreed

Proposals for more mini-games, written down so they are not lost. None is
agreed or built. Each says what it would add that the eleven games do not
already have. The three marked "first" are the ones recommended to try first.

- **Boss Battle** (first). Everyone against a monster on the board. The
  monster has hit points and a weak spot that moves each round; every dart
  does its value in damage, the weak spot double. A miss makes the monster
  hit back: that player loses some of the damage they have dealt. The game
  ends when the monster is down or after six rounds; players are ranked by
  damage dealt. Adds: playing together while still competing, and a scene
  with a character that reacts. To decide: hit points per player, what a
  miss costs, a bonus for the finishing blow.
- **Close Call** (first). Each round the game names a number, say 47. With
  three darts, get as close to it as you can without going over. Closest
  gets 3 points, second 2, third 1; over is bust and scores nothing. Adds:
  arithmetic and choosing which segment to aim for, which no other game
  asks. Easy to explain. To decide: range of the numbers, whether hitting
  it exactly pays a bonus.
- **Bank Robbery** (first). Everyone starts with ten coins and a segment of
  their own. Hit someone's segment and you take a coin from them, two for a
  double, three for a triple. Hit the bull and you take one from everyone.
  Six rounds, most coins wins. Adds: the attacking of Last One Standing
  without anyone having to sit out. To decide: what your own segment does,
  whether coins can run out.
- **Call Your Shot**. Before your turn you pick on the control panel how
  bold you are: half the board for 1 point a dart, a quarter for 2, one
  segment for 5. The game then lights up a zone of that size. Adds: the
  player chooses the risk, so strong and weak throwers can both play it
  their way. Needs a choice on the control panel before each turn.
- **Rule of the Round**. Each round a card is drawn with a rule: only even
  numbers, only odd, only the high half, only doubles and triples, only the
  left side. Darts that follow the rule score their value, the others
  nothing. Adds: a different target every round with no new scene per rule.
  To decide: which rules, and how to keep them equally hard.
- **Mini Golf**. Nine holes, each a target segment. Count the darts you need
  to hit it, at most three; not in three is a four. Lowest total wins. Adds:
  a game where low is good, and one that needs only accuracy on a single
  segment. To decide: whether doubles and triples count as a hole in one.
- **Closer**. Three darts, and each must land nearer the centre than your
  dart before it. One point for the second dart if it is closer, two for
  the third if it is closer again. Uses the exact position, like Sniper.
  Adds: the order of your darts matters. To decide: what the first dart is
  worth, and what an unplaced dart does.
- **Snake**. Hit a segment to make it yours; someone else hitting it takes
  it over. At the end only your longest unbroken run of neighbouring
  segments counts. Adds: where your segments lie matters more than how many
  you have, so cutting an opponent's snake in two is a real move. Close to
  Land Grab, so perhaps a variant of it rather than a game of its own.
- **Follow the Leader**. The leader throws one dart; where it lands is the
  target. Everyone else gets three darts to hit that segment or a
  neighbour; who fails loses a life. The next player leads the next round.
  Adds: the players set the targets themselves. To decide: what happens
  when the leader misses the board.

**Balance: skill against luck (2026-11-16).** The owner wants weaker
throwers to feel they can win. Claude's reading of the eleven games, not
measured: mostly skill are Robin Hood, Spotlight, Piggy Bank, Sniper and
Raise the Bar; mixed are Race, Land Grab, Last One Standing, Higher or
Lower and Time Bomb; mostly luck is only Minefield. So the set leans to
skill. New games should therefore be of the kind where any dart on the
board does something and a choice or hidden information decides, not pure
luck where the throw no longer matters. The owner brought a list of ideas
on 2026-11-16; the ones below came out of it. Recommended order: Blackjack,
Memory, Trap Runner. None is agreed; the rules are put to the owner when a
game is about to be built.

- **Blackjack** (balance, first). Built: see [Blackjack](#blackjack). It
  is Close Call with a fixed number and stopping, so Close Call above is
  no longer needed as a game of its own.
- **Memory** (balance, second). Claude's reading of "Memory Darts" on the
  owner's list, which only said "remember numbers". Ten pairs of pictures
  lie hidden under the 20 segments. Every dart turns over the segment it
  hits; two matching pictures in one turn are yours, the rest turn back
  when the turn ends. Most pairs wins. Adds: memory and luck early on,
  aim only once the places are known. Hidden things under segments, like
  Minefield, but another mechanism. To decide: what the bull does, whether
  a pair gives an extra dart, the round limit.
- **Trap Runner** (balance, third). Everyone walks from 0 to exactly 20.
  Any dart on the board is a step, double 2, triple 3; too many steps do
  not count. Three segments are traps. Adds: a race where every dart moves
  you and the leader can fall. As the owner's list had it (a trap sends
  you back to 0, bull jumps to 18) a weak thrower hits a trap in about
  four turns out of ten and would never finish, so it needs tuning: a trap
  that costs a few steps, or checkpoints. To decide: that, whether traps
  move, the bull.
- **Bingo**. Everyone is dealt five numbers; the first to hit them all
  wins. A random dart hits one a quarter of the time, so kinder than Race,
  but still mostly aim. Close to Race and Around the Clock.
- **Virus**. Every hit lets you give another player an infection; enough
  infections cost darts or a turn. Adds: any hit works and the table gangs
  up on the leader. Needs a choice of victim on the control panel after
  every dart, which is slow; Bank Robbery covers much of it.

Dropped from that list as too close to what exists: Killer and Survivor
(Last One Standing), King of the Hill (Raise the Bar), Risky Business and
Russian Roulette (Minefield), Hot Potato (Time Bomb), Domino (Higher or
Lower, by position), High Risk / Safe (Call Your Shot), Odd vs Even and
Color Game (Rule of the Round), Around the World (Around the Clock in free
play), Tic Tac Toe (Land Grab, Snake), Last Man Standing. The secret-number
Sniper needs every player to pick in secret, which one shared screen cannot
do. The team games wait for teams, which do not exist yet. The drinking
variants are not needed: the drinking game is a layer that every mini-game
joins by itself.

Ideas for themed animations per game are collected in `ANIMATION-IDEAS.md`.
What is agreed about animations is under [Animations](#animations).

### Free play

X01 and Around the Clock are played on their own, outside a party, from
"Free play" on the home screen. They are never in the draw. Agreed with the
owner on 2026-11-15:

- 1 to 8 players, so also alone: handy for testing detection.
- No round limit. A game lasts until someone finishes; it can always be
  stopped. The others are ranked by how far they got.
- The game in progress is saved after every dart and resumed after a crash
  or restart, like a party. Its result is kept nowhere.
- No draw, no rules card, no points, no podium. After a game: "Play again"
  (the same game and players) or "Done".

**X01**

- Chosen at the start: 301, 501 or 701, and double out or straight out.
  Default 501 with double out.
- Count down to exactly zero. A dart that goes below zero is a bust: the
  turn ends and the score goes back to what it was when the turn began.
- With double out the last dart must be a double (the bullseye counts), so
  leaving 1, or reaching zero without a double, is a bust too.
- When the player at the board can finish with the darts they have left,
  the scene shows the route ("Finish: T20 · S10 · D20"), also when playing
  straight out. Asked for by the owner. The route avoids the bullseye where
  another exists, then takes the fewest darts, then the easiest ones
  (singles before triples), then the handiest double to end on (20, 16, 8,
  18, 12, ...). These preferences were filled in while building. It can be
  hidden under Settings, "X01 finish suggestions"; it shows by default.
- A bust ends the turn like a bomb passed on: the next dart counts for the
  next player, also before the darts are pulled.

**Around the Clock**

- Hit 1 to 20 in order. Any single, double or triple of your number counts
  once. The first to hit the 20 wins.

Filled in while building, not put to the owner: "Play again" lets the
player after the last starter throw first; a triple 20 or bullseye that
goes bust is not celebrated; in Around the Clock the big number is the last
number hit, with the next one under the name.

## Build steps

- [x] **1. Shell, installer, updater.** An empty Electron window that installs
  on Windows (wizard) and runs on Ubuntu (AppImage), built by GitHub Actions,
  with the "new version available" button working. Include `LICENSE` (MIT) and
  a README with the disclaimer. Done when the owner has installed a release on
  the Surface and updated it to a second release from inside the app.
  *Confirmed done by the owner on 2026-11-16.*
- [x] **2. Autodarts connection.** Read the local API, turn state snapshots
  into events (dart thrown, darts removed, corrected, reset, stuck, detection
  stopped/started, connection lost/restored), recover a stuck board. Tested
  against every recording in `fixtures/`.
  *The rules live in `src/core/board/`, the connection in
  `src/main/autodarts/`. The window shows a plain status panel (board state,
  the darts of the turn, a reset button, a short log) until the real show
  replaces it. Checked live only against an Autodarts without cameras; not
  yet with real darts, and not on Windows.*
- [x] **3. First playable party.** Players with avatars, starting a
  party, the draw, Race, standings between games, the podium, saving and
  resuming, both screen layouts, the first theme pack with sound.
  - [x] Rules core in `src/core/`: Race, the party (draw, throwing order,
    turns, corrections, points, standings), the deciding round. Tested.
  - [x] The main process runs a party: holds it, feeds it board events and
    commands from the windows, saves it after every dart, resumes it, and
    writes the result to the history. Tested without Electron
    (`src/core/party/session.ts`); no screen uses it yet.
  - [x] Player profiles and the avatar set (twenty animals, drawn from parts
    in `components/Avatar.tsx`, with idle, cheer and sulk moods).
  - [x] Screens: players and start, the draw, rules card, the Race scene,
    standings, deciding round, podium, and the controls (miss, add, undo and
    correct a dart, next player, reset, volume, stop the party).
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
- [x] **6. Animations in every game.** Moments reported by the rules, with
  sound reacting to them. Impact on the board with the value flying to the
  score; reactions to a good, great and bad dart; attack from avatar to
  avatar; life lost and knocked out; turn change; game won; points flying
  into the scoreboard with rows swapping; the crown on the standings screen;
  the podium; the spectacular moments; the five new avatar moods; the "calm
  animations" setting; the "Animations" screen under Settings.
  *How it fits together: the rules report moments per dart (`Moment` in
  `src/core/game/types.ts`); `src/core/party/cues.ts` compares the party
  before and after and says what to play; `src/renderer/src/animation/`
  turns that into a timeline and plays it over any screen; the drawings are
  in `src/renderer/src/theme/gameShowAnimations.tsx`, with a slot per game for
  step 8. Checked on Ubuntu by tapping through the Animations screen and by
  playing one Piggy Bank game by hand to the standings: no errors. Not
  checked: real darts, a second screen, Windows, the Surface's speed, and
  nobody has heard the eight new sounds. Calm mode was not looked at on
  screen, only tested in the timeline. Filled in while building, not put to
  the owner: which games count bullseye, triple 20 and 180 as spectacular
  (Piggy Bank, Raise the Bar and the deciding round all three; Robin Hood
  the bullseye only); a photo finish is a win taken from someone else by
  the dart that ends the game; Sniper reports no points per dart because a
  round only pays out at its end; the podium animation also plays after a
  restart on the podium screen.*
- [x] **7. Free play**: X01 and Around the Clock.
  *Rules in `src/core/game/x01.ts` and `aroundTheClock.ts`; free play is a
  party with `freePlay` set, holding one game (`startFreePlay` and
  `playAgain` in `src/core/party/party.ts`), so the play screen, the
  controls, corrections, saving and the animations are the same. Played by
  hand on Ubuntu: a bust, resuming after a restart, a few darts of Around
  the Clock, finishing a 301 straight out, playing again, stopping. Not with
  real darts, not on Windows, and no game of 501 with double out was played
  to the end by hand (the tests do).*
- [x] **8. Themed animations per game.** First Time Bomb, Last One Standing
  and Piggy Bank; then the other eight in the order of this plan. Agree the
  ideas per game first.
  - [x] Time Bomb, Last One Standing, Piggy Bank.
    *New moments from the rules: `fuse`, `passed`, `exploded`, `finalDuel`,
    and hitting your own segment is now an `attacked` on yourself. The
    drawings a scene and its animations share (bomb, pig, glove) are in
    `src/renderer/src/theme/gameShowProps.tsx`; the game's own animations are
    registered under `games` in `gameShowAnimations.tsx`, its own sounds in
    `soundsOf` in `animation/timeline.ts`. Eleven new synthesised sounds.
    Under Settings, "Try the animations", there is a "Per game" block.
    Looked at on Ubuntu on that screen: fuse, boom and the blackened
    avatar, the triple punch with counting out, the final duel, the golden
    coin, the hammer. Not looked at: the bomb being thrown, the glove on
    your own segment, calm mode, a real game on the play screen, a second
    screen, Windows; nobody has heard the new sounds. Filled in while
    building, not put to the owner: the pig is fullest at 300 and shows at
    most four plasters; ordinary darts drop one coin per 10 points, at most
    five; the hammer also comes down on an empty pig; the holder of the
    bomb sweats from three burned darts; the ticking has three speeds (up
    to 2, up to 5, more); at the end of Piggy Bank the winner's pig is
    shown; a knocked-out player who was blackened stays so.*
  - [x] The other eight games: Race, Robin Hood, Spotlight, Land Grab,
    Sniper, Minefield, Higher or Lower, Raise the Bar.
    *More moments from the rules: `blank`, `fortified`, `measured`,
    `roundResult`, `dug`, `call`, `jump`; Minefield also reports `exploded`.
    A cue now says when the next player starts a new round, which Spotlight
    and Sniper animate. Their animations are in
    `src/renderer/src/theme/gameShowGames.tsx`. Digging keeps its secret: for
    half a second (`DIG_TIME`) the scene shows the game as it was before
    the dart (`useSuspense` in `animation/Stage.tsx`) and no sound or score
    gives the find away. The board draws castles for Land Grab; Higher or
    Lower shows its call as an arrow; Raise the Bar has a high-jump set
    above the board instead of the meter. Twenty-four more synthesised
    sounds. Every one of these has a button under "Per game" on the
    Animations screen, and most were looked at there on Ubuntu. Not looked
    at: the banana peel, forward without nitro, a single attack and the
    plain capture in Land Grab, a dug-up coin, calm mode, a real game on
    the play screen, a second screen, Windows; nobody has heard the
    sounds. Known gaps: the first round of a game gets no spotlight sweep
    or scope (nothing plays when a screen is first opened); the scene
    shows a captured castle at once while the stone is still flying.
    Filled in while building, not put to the owner: the spotlight makes
    five stops before its target; the cough needs three darts, so two
    darts and a takeout is no blank turn; the three rings appear only
    when the last player throws a third dart; a blackened digger clears
    at the start of their next turn; the pot shows its size as a number;
    the avatar in the high-jump set stands at the height of its total so
    far.*
- [x] **9. Drinking game.** As decided under
  [Drinking game](#drinking-game).
  *The rules are in `src/core/party/drinking.ts`, tested. A party holds an
  optional `drinking` (the rules that are on, who sits out, the switches
  thrown with the moment they count from, the wheel outcomes); everything
  else is worked out from the darts. Two new stages: `drinkRules` (the card
  before the first draw) and `wheel` (between a finished game and the next
  draw, only when the mode is on and someone drinks). The session takes
  `drinking` on `start` and the commands `setDrinking`, `setSitOut`,
  `spinWheel` and `pickBuddy`. Settings keep `drinkingGame` (the last
  choice) and `disabledDrinkRules`; a party keeps the rules it started
  with. On screen: `components/Drinks.tsx` (glass, banner, rule switches,
  the "Drinks" panel), `screens/DrinkRules.tsx`, `screens/Wheel.tsx`; the
  banner is started by `animation/Stage.tsx`. The log gets a `drink` entry
  per order and `drinksRecounted` after a correction; the saved result
  gets `drinks`.*
  *Played by hand on Ubuntu, one window, darts entered by command: the
  switch and sitting out on the start screen, the rule switches, the card,
  the banner for a knockout and for three misses, no banner for a player
  who sits out, the glasses, the orders under the standings, the wheel
  (spun, and again after a reload: it shows its outcome without turning),
  the podium with its orders and titles. Not looked at: picking a buddy on
  screen (the tests cover it), the hand-out banner, switching off
  mid-party on screen, calm mode, the show window, Windows; nobody has
  heard the two new sounds or the wheel ticking.*
  *Filled in while building, not put to the owner: the rule switches open
  in a dialog on the start screen instead of leading to Settings; the
  "Drinks" button (mode off or on, who sits out, the rules) sits in the
  header of every party screen, not only among the controls of a game; the
  banner is a plain component, not a replaceable part of the theme pack;
  it sits above the controls in the window that has them and at the very
  bottom on the show; it plays the drink sound when anyone drinks, else
  the hand-out sound; a dart taken back takes its banner with it; the
  orders after a game are lines under the standings, without banner or
  sound; the two wheels stand side by side, the task wheel starts when the
  player wheel stops; with the mode switched off the glasses are hidden;
  the Animations screen has no drinking moments.*
- [x] **10. Rules explained by animation** on the rules card.
  *The owner saw Race first and agreed the steps of the other ten on
  2026-11-16. A demo is a script per game in `src/core/party/demo.ts`: a
  few darts played through the real rules by the party's own players, in
  a party of its own that is never saved. Its captions are `demo` in
  `strings.games`, one per dart, and `short` is the shortened text.
  `components/RulesDemo.tsx` shows the game's scene and plays the darts in
  a loop through the stage, silently (`silent` on a cue played by hand);
  the stage is halted when the card closes. A game without a script (free
  play has no card) would keep the old card.*
  *The steps: Race: own segment, a triple, pushed back. Robin Hood:
  bullseye 6, inside the triple ring 4, the rest 3. Spotlight: on the
  target 3, its neighbour 2, far off nothing. Piggy Bank: coins, a golden
  coin, the hammer. Land Grab: claimed, fortified, attacked, taken. Sniper:
  a dart measured, a closer one, the round paid out. Minefield: chest,
  coin, bomb. Last One Standing: a life off someone, one off yourself, a
  triple knocks out. Higher or Lower: the first dart, a right call, a
  wrong one. Time Bomb: the fuse burns, the bomb is passed on, it goes
  off. Raise the Bar: the opener, over the bar, not over it.*
  *Looked at on Ubuntu in one window: every step of every game with four
  players; Race, Last One Standing and Raise the Bar with two; Race,
  Sniper, Time Bomb, Land Grab and Last One Standing with eight (it fits,
  the rows get small); pressing "Let's play" in the middle of an
  animation. Not looked at: the show window, calm mode, Windows, the
  Surface's speed with a demo looping.*
  *Filled in while building, not put to the owner: the demo is on the
  right and takes three fifths of the card; the throwing order moves under
  the text as a row of chips; a step waits 1.2 seconds, throws, and stays
  3.2 seconds; a demo only shows darts, never a turn being announced;
  moments that fill the screen in a game (a spectacle such as "Bullseye!",
  the win, the final duel banner) are left off the card, and the scripts
  avoid a triple 20 and three darts in one segment for that reason; what a
  game keeps hidden (mines, the fuse, the targets, the cross, the calls)
  is made up for the demo, never the party's real one; only Race and Last
  One Standing use the dealt segments; the first player in the throwing
  order throws first in every demo; in Sniper the darts of the other
  players appear at once before the last dart, and the round is paid out
  by pulling the darts straight after it; the captions and the shortened
  texts.*
- [x] **11. Blackjack**, a twelfth game, added for balance (2026-11-16).
  Rules, a card table as its scene, themed animations for a bust and for
  21, rules card with demo, entries on the Animations screen, tests. *One
  round played by hand on Ubuntu in one window (three cards, a bust, a 21
  with a bull, the start moving up in round 2); the new sound not listened
  to; not on Windows; not released.*
- [ ] **Parked: recorded music.** CC0 playlists per scene in place of the
  generated loops, as decided under [Style and sound](#style-and-sound).
  Parked by the owner on 2026-11-15; pick it up only when asked. The
  shortlist is ready; the owner still has to listen and pick.
- [ ] **Later**: streaks (a flame after three good turns), a comeback
  animation, a polished version of one game to compare, seasonal and holiday theme packs, hall of fame, teams,
  players joining or leaving mid-party, phones as remotes, starting
  Autodarts from the app.
- [ ] **Later: a way to the board calibration.** Asked by the owner on
  2026-11-16. Calibrating inside the app is not possible: the local API has
  no calibration endpoint (`/api/config/calibration` gives 404) and it would
  mean config writes, which are never used. Idea: a button, for example on
  the board check, that opens the board manager's own page at the address
  in the settings, where Autodarts calibrates. To check first: whether that
  page offers calibration in board manager 2.1.1 and under which path; the
  app now only opens `https://` links outside, so a local `http://` address
  needs allowing.

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
