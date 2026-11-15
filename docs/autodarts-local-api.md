# The Autodarts local API, as observed

Autodarts Desktop publishes no documentation for this API. Everything here was
observed in November 2026 against Autodarts Desktop with board manager 2.1.1 on
Linux, with three cameras. Windows has not been checked.

The recordings behind these findings are in `fixtures/`; `fixtures/README.md`
says what was really thrown in each.

Only read requests were made, with one exception: `POST /api/reset`.
`/api/start`, `/api/stop`, `/api/restart` and config writes were never called.

## Basics

| Topic | Finding |
|---|---|
| Address | `0.0.0.0:3180`, so reachable from other devices on the network |
| Authentication | None: every route tested answers without a token |
| CORS | `Access-Control-Allow-Origin: *` |
| Version | `GET /api/version` returns `2.1.1` as text |
| Events | WebSocket at `ws://localhost:3180/api/events`; a plain GET gives 404 |

### Security

`GET /api/config` returns the full config, including `auth.apiKey` and
`auth.boardId` (the board's cloud credentials), to anyone on the network.
Never store, log or commit its output. The app has no need for this route.

### Routes

| Route | Status | Answer |
|---|---|---|
| `/api/ping` | 200 | `pong` (text) |
| `/api/version` | 200 | `2.1.1` (text) |
| `/api/state` | 200 | see below |
| `/api/state/stats` | 200 | `{"cpuPercent", "fps", "height", "width", "memoryBytes"}` |
| `/api/state/motion/history` | 200 | `[]` |
| `/api/host` | 200 | system info: versions, cpu, ip, `cam1`–`cam3` |
| `/api/cams/state` | 200 | `{"isOpened": true, "isRunning": false}` |
| `/api/cams/stats` | 200 | `{"fps": [0,0,0], "resolution": {"height": 1080, "width": 1920}}` |
| `/api/devices` | 200 | connected cameras with formats and resolutions |
| `/api/config` | 200 | full config, **contains secrets, see above** |
| `/api/config/dynamic` | 200 | three objects (one per camera) with detection thresholds |
| `/api/config/cam/resolution` | 200 | `{"height": 1080, "width": 1920}` |
| `/api/img/live` | 200 | JPEG |
| `/api/streams/live` | 200 | MJPEG stream |
| `POST /api/reset` | 200 | empty body; see "Reset" |
| `/api/state/detections`, `/api/state/motion`, `/api/config/calibration`, `/api/config/distortion`, `/api/img/detection` | 404 | also with cameras connected |

## State and events

`GET /api/state` returns:

```json
{"connected": true, "event": "started", "running": true, "status": "throw", "throws": []}
```

- After connecting to the WebSocket, messages arrive by themselves. No
  subscribe message is needed.
- A message is sent only when the state changes.
- Each message is `{"type": "state", "data": <same object as /api/state>}`.
- Polling `/api/state` gives the same content about 0.1–0.2 s later.
- `connected` is the connection to the Autodarts cloud, not to the cameras.
- `running: false` means detection is off.

### A dart

```json
{
  "bed": "SingleInner",
  "bouncer": false,
  "coordsX": -0.1417403636702903,
  "coordsY": 0.22981509754228835,
  "failed": false,
  "method": "UnanimousCam",
  "multiplier": 1,
  "segmentName": "S12",
  "segmentNumber": 12
}
```

- `throws` holds all darts of the current turn, in throwing order.
- Values of `bed` seen: `SingleInner`, `SingleOuter`, `Triple`, `Double`,
  `Outside`. The bull and outer bull have not been seen.
- Values of `method` seen: `UnanimousCam`, `Failed`.
- The fields are flat, unlike the cloud API (`segment.name`, `coords.x`).

### Coordinates

- Origin at the centre of the board.
- 1.0 is roughly the outer edge of the double ring (170 mm).
- `coordsY` is positive upwards (towards 20), `coordsX` positive to the right
  (towards 6).
- The scale is approximate. A dart reported as `bed: "Double"` had radius
  0.9526, which at exactly 170 mm is 161.9 mm, just inside the nominal 162 mm
  border and so nominally a single.

**Rule:** `segmentName`, `bed` and `multiplier` are authoritative. Use the
coordinates only to draw the dart, or for games that need a position (Sniper),
never to recompute the segment.

### A normal turn

| Moment | `event` | `status` | `throws` |
|---|---|---|---|
| Waiting for a dart | `started` | `throw` | empty |
| Dart 1 | `throwDetected` | `throw` | 1 |
| Dart 2 | `throwDetected` | `throw` | 2 |
| Dart 3 | `throwDetected` | `takeout` | 3 |
| Hand at the board | `takeoutStarted` | `takeoutInProgress` | 3 |
| Darts gone | `takeoutFinished` | `throw` | empty |

- On dart 1, two messages arrived at the same instant: first with
  `event: "started"`, then with `event: "throwDetected"`, both already holding
  the dart. **Recognise a new dart by the length of `throws`, not by `event`.**
- After dart 3, `status` goes to `takeout` by itself.
- Takeout is also recognised mid-turn, after one or two darts: `takeoutStarted`,
  then `takeoutFinished` with empty `throws` about 0.7–2 s later.

### Misses

A dart in the black surround counts as a throw:

```json
{"bed": "Outside", "bouncer": false, "coordsX": 1.1568, "coordsY": 0.1474,
 "failed": false, "method": "UnanimousCam", "multiplier": 0,
 "segmentName": "M6", "segmentNumber": 6}
```

`segmentName` is `M` plus the nearest number; `multiplier` is 0.

A dart completely off the board also counts as a throw, but cannot be placed:

```json
{"bed": "Outside", "bouncer": true, "coordsX": 0.0, "coordsY": 0.0,
 "failed": true, "method": "Failed", "multiplier": 0,
 "segmentName": "Miss", "segmentNumber": 0}
```

Do not draw it: the coordinates are 0,0. `bouncer` is `true` here, so a real
bounce-out may look the same.

**Rule:** `failed`, `bouncer` or `multiplier` 0 means a miss. The Python
prototype once crashed on `segmentNumber` 0; treat any number outside 1–20 as
"off the board". A throw without a `segmentNumber` or `multiplier` (not seen
yet) is also taken as a miss, so one odd dart cannot hide the whole state
behind an "unexpected answer".

### The stuck board

Whenever a hand comes near the board while `throws` is empty, Autodarts sends
`takeoutStarted` with `status: "takeoutInProgress"` and then never sends
`takeoutFinished`. It stays there until a reset. This happened in three
recordings (`hand`, `hand-herstel`, `reset`).

While stuck, **darts are lost**: a dart thrown and removed in this state
produced no message at all.

Seen once by the owner during a party (2026-11-15, not recorded): darts were
pulled, the board reset itself after a moment, and the darts of that turn
were gone from the app. The likely cause: `throws` emptied while the status
stayed `takeoutInProgress`, without `takeoutFinished`, so the app read it as
every dart being deleted inside Autodarts. The app now takes that for the
darts being removed. The party log will show whether this was it.

**Rules:**

- `throws` becoming empty while `status` is `takeoutInProgress` is the darts
  being removed, also without `takeoutFinished`.
- `takeoutStarted` with empty `throws` is not a change of turn.
- `status: "takeoutInProgress"` with empty `throws` means stuck. Show it, offer
  a reset button, and send `POST /api/reset` automatically after a short delay
  (the prototype cancelled the pending reset if the board recovered, the
  connection dropped or the stream ended).

### Reset

`POST /api/reset` answers 200 with an empty body and causes one message:
`event: "manualReset"`, `status: "throw"`, empty `throws`. The reset button in
Autodarts does exactly the same.

- `manualReset` is its own event and is not a change of turn.
- If a dart is still in the board when you reset, pulling it out afterwards
  makes the board stuck again; a second reset fixes it.
- Darts noted while the app has no game running still count towards
  Autodarts' three per turn. A turn that starts with one already noted
  detects only two more. The app therefore resets at the start of a game
  when `throws` is not empty.

### Without internet

With the network switched off, three darts and the takeout were still
detected, and the local API stayed reachable. `connected` changed to `false`
in a message of its own, without a new `event`, 11 s after the last dart.

**Rule:** `connected: false` is not an error. At most show a notice.

### Standby

More than 15 minutes after the last dart:

```json
{"connected": true, "event": "stopped", "running": false, "status": "stopped", "throws": []}
```

`/api/cams/state` then gave `{"isOpened": false, "isRunning": false}`. The
config has `standbyMinutes: 15`, so this is presumably standby. Autodarts does
not watch the board in this state.

**Rule:** report `running: false` as "detection stopped". Restarting through
`/api/start` is untested.

## How the prototype turned snapshots into events

Compare each state with the previous one:

- `throws` grew and the old darts are a prefix of the new: one "dart thrown"
  per added dart.
- `throws` became empty with `event: "takeoutFinished"`: "darts removed".
- `throws` became empty with `event: "manualReset"`, or `event` changed to
  `manualReset` with `throws` unchanged: "board reset".
- Any other change to `throws`: "throws corrected" with the new list (the
  player edited a dart inside Autodarts).
- Became stuck: "board stuck". `running` flipped: "detection stopped" or
  "detection started".

## Still unverified

- A real bounce-out. `bouncer` was `true` only for a dart fully off the board.
- The bull and the outer bull: values of `bed` and `segmentName`. The
  prototype assumed bull is number 25 with multiplier 2.
- Other values of `method`.
- A dart thrown after `connected` is provably `false`.
- Sending a reset while the hand is still in view.
- The transition into and out of standby, and whether `/api/start` restarts
  detection.
- Reconnecting after Autodarts itself restarts.
- Everything on Windows.
