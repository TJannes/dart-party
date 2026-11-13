# Recordings of the Autodarts local API

Real recordings, made in November 2026 against board manager 2.1.1 with three
cameras. Use them as test data for the Autodarts connection.

## Format

One JSON object per line:

```json
{"t": 21.253, "bron": "events", "data": {"type": "state", "data": {...}}}
{"t": 0.074, "bron": "state", "data": {...}}
```

- `t`: seconds since the start of the recording.
- `bron` (Dutch for "source"): `"events"` is a message from the WebSocket
  `/api/events`; `"state"` is an answer from `GET /api/state`, written only
  when it changed.
- `data`: the message or answer as received.

File names are Dutch and kept as recorded.

## What was really thrown

| Recording | Thrown | Detected by Autodarts | Notes |
|---|---|---|---|
| `zonder-cameras` | nothing | nothing | cameras not connected |
| `drie-pijlen` | S12, T1, S18 | S12, T1, S18 | dart 2 lay 0.2 mm inside the triple ring; confirmed T1 on inspection |
| `een-pijl` | one dart, not a double | S5 (SingleOuter, 124.0 mm) | removed at once; takeout took 0.7 s |
| `hand` | nothing, only a hand in front of the board | no dart | `takeoutStarted` at 43.8 s; still `takeoutInProgress` over a minute later |
| `hand-herstel` | S1 thrown and removed while the board was stuck, then the reset button | no dart | the S1 was lost; reset gave `manualReset` and status `throw` |
| `reset` | D6, dart left in; then `POST /api/reset`; then dart removed | D6 (Double, radius 0.9526) | removing the dart after the reset made the board stuck again; a second reset fixed it |
| `naast-bord` | one dart in the black surround, removed | M6 (Outside, multiplier 0) | takeout completed normally |
| `offline` | network off; M19, S20, S10; removed; network on | M19, S20, S10 | `connected` went `false` 11 s after the last dart; takeout detected while `false` |
| `gestopt` | nothing | nothing | Autodarts was in standby (`running: false`) more than 15 minutes after the last dart |
| `buiten-bord` | one dart completely off the board | `Miss` (number 0, `bouncer` and `failed` true, `method: "Failed"`) | not a live recording: the state was read from `/api/state` afterwards and an empty starting state was added |
