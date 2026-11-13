// Draws the app icon (build/icon.png, 1024x1024) with no dependencies.
// Run with `npm run icon` after changing the design, and commit the result.
//
// The design is a party-coloured board on a rounded purple tile. It is
// deliberately not the Autodarts logo.

import { mkdirSync, writeFileSync } from 'node:fs'
import { deflateSync } from 'node:zlib'

const SIZE = 1024
const SAMPLES = 3 // supersampling per axis, for smooth edges

const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16))

const TILE_TOP = hex('#5b2a9d')
const TILE_BOTTOM = hex('#2b1055')
const RIM = hex('#1b0a38')
const WEDGES = ['#ee4266', '#ffd23f', '#3bceac', '#4d9de0'].map(hex)
const RING = hex('#ffffff')
const OUTER_BULL = hex('#3bceac')
const BULL = hex('#ee4266')

const mix = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t)

/** Colour at a point, with x and y in -1..1; null is transparent. */
function colourAt(x, y) {
  // Rounded-square tile.
  const corner = 0.44
  const dx = Math.max(Math.abs(x) - (1 - corner), 0)
  const dy = Math.max(Math.abs(y) - (1 - corner), 0)
  if (Math.hypot(dx, dy) > corner) return null

  const r = Math.hypot(x, y)
  if (r > 0.8) return mix(TILE_TOP, TILE_BOTTOM, (y + 1) / 2)
  if (r > 0.74) return RIM
  if (r < 0.09) return BULL
  if (r < 0.2) return OUTER_BULL

  // Twenty wedges, the top one centred like the 20 on a real board.
  const turn = (Math.atan2(x, -y) / (2 * Math.PI) + 1 + 1 / 40) % 1
  const wedge = Math.floor(turn * 20)
  const inRing = (r > 0.68 && r <= 0.74) || (r > 0.42 && r < 0.48)
  if (inRing) return wedge % 2 === 0 ? RING : WEDGES[(wedge / 2) % 4 | 0]
  return wedge % 2 === 0 ? WEDGES[(wedge / 2) % 4 | 0] : RIM
}

const pixels = Buffer.alloc(SIZE * (SIZE * 4 + 1))
for (let py = 0; py < SIZE; py++) {
  const row = py * (SIZE * 4 + 1)
  pixels[row] = 0 // PNG filter: none
  for (let px = 0; px < SIZE; px++) {
    let r = 0
    let g = 0
    let b = 0
    let a = 0
    for (let sy = 0; sy < SAMPLES; sy++) {
      for (let sx = 0; sx < SAMPLES; sx++) {
        const x = ((px + (sx + 0.5) / SAMPLES) / SIZE) * 2 - 1
        const y = ((py + (sy + 0.5) / SAMPLES) / SIZE) * 2 - 1
        const c = colourAt(x, y)
        if (!c) continue
        r += c[0]
        g += c[1]
        b += c[2]
        a += 1
      }
    }
    const at = row + 1 + px * 4
    if (a > 0) {
      pixels[at] = Math.round(r / a)
      pixels[at + 1] = Math.round(g / a)
      pixels[at + 2] = Math.round(b / a)
    }
    pixels[at + 3] = Math.round((a / (SAMPLES * SAMPLES)) * 255)
  }
}

const crcTable = Array.from({ length: 256 }, (_, n) => {
  let c = n
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
  return c >>> 0
})

function crc32(buffer) {
  let c = 0xffffffff
  for (const byte of buffer) c = crcTable[(c ^ byte) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

function chunk(type, data) {
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data])
  const length = Buffer.alloc(4)
  length.writeUInt32BE(data.length)
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(body))
  return Buffer.concat([length, body, crc])
}

const header = Buffer.alloc(13)
header.writeUInt32BE(SIZE, 0)
header.writeUInt32BE(SIZE, 4)
header[8] = 8 // bit depth
header[9] = 6 // RGBA

mkdirSync('build', { recursive: true })
writeFileSync(
  'build/icon.png',
  Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(pixels, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]),
)
console.log('Wrote build/icon.png')
