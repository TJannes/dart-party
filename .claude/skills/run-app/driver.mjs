// Launches the built app under Playwright and takes commands over HTTP, so
// an agent can click through it like a user with one shell call per step.
//
//   node .claude/skills/run-app/driver.mjs          start (keep running)
//   node .claude/skills/run-app/drive.mjs <cmd> ... send a command
//
// Uses the app's normal user data: this machine is a test environment.
import { _electron as electron } from 'playwright-core'
import { createServer } from 'node:http'
import { mkdirSync } from 'node:fs'
import { join, resolve } from 'node:path'

const APP_DIR = resolve(import.meta.dirname, '../../..')
const PORT = Number(process.env.DRIVER_PORT || 9400)
const SHOTS = process.env.SCREENSHOT_DIR || join(APP_DIR, '.claude/skills/run-app/shots')
mkdirSync(SHOTS, { recursive: true })

const app = await electron.launch({
  executablePath: join(APP_DIR, 'node_modules/electron/dist/electron'),
  // The setuid sandbox helper is not set up on this machine.
  args: ['--no-sandbox', APP_DIR],
  env: { ...process.env, ...(process.env.FORCE_SHOW ? { DART_PARTY_FORCE_SHOW: '1' } : {}) },
  timeout: 30_000,
})

/** The control window (role=main), or the show window with `show`. */
async function windowFor(role = 'main') {
  for (let i = 0; i < 50; i++) {
    const page = app.windows().find((w) => w.url().includes(`role=${role}`))
    if (page) return page
    await new Promise((r) => setTimeout(r, 200))
  }
  throw new Error(`no ${role} window`)
}
let page = await windowFor()
await page.waitForLoadState('domcontentloaded')

const clickable = (text) =>
  page.locator('button, a, [role="button"], label, summary').filter({ hasText: text }).first()

const commands = {
  /** Click a button or link by (part of) its visible text, with the real mouse. */
  async click(text) {
    await clickable(text).click({ timeout: 5000 })
    return `clicked "${text}"`
  },
  /** Click the n-th (0-based) match of a CSS selector. */
  async 'click-css'(selector, n = '0') {
    await page.locator(selector).nth(Number(n)).click({ timeout: 5000 })
    return `clicked ${selector} #${n}`
  },
  /** Click at window coordinates (CSS pixels). */
  async 'click-at'(x, y) {
    await page.mouse.click(Number(x), Number(y))
    return `clicked at ${x},${y}`
  },
  /** Click a spot on an element, given as fractions of its box (0..1). */
  async 'click-in'(selector, fx, fy) {
    const box = await page.locator(selector).first().boundingBox()
    if (!box) throw new Error(`no box for ${selector}`)
    const x = box.x + box.width * Number(fx)
    const y = box.y + box.height * Number(fy)
    await page.mouse.click(x, y)
    return `clicked ${selector} at ${x.toFixed(0)},${y.toFixed(0)}`
  },
  /**
   * Tap the on-screen board at board coordinates (centre 0,0, double ring
   * edge at radius 1, y up), as Board.tsx maps a tap. Defaults to the board
   * in the "Add dart" picker.
   */
  async 'tap-board'(x, y, selector = '.picker__board svg') {
    const VIEW = 1.32
    const box = await page.locator(selector).first().boundingBox()
    if (!box) throw new Error(`no board at ${selector}`)
    const size = Math.min(box.width, box.height)
    const px = box.x + (box.width - size) / 2 + ((Number(x) + VIEW) / (2 * VIEW)) * size
    const py = box.y + (box.height - size) / 2 + ((-Number(y) + VIEW) / (2 * VIEW)) * size
    await page.mouse.click(px, py)
    return `tapped board ${x},${y} at ${px.toFixed(0)},${py.toFixed(0)}`
  },
  /**
   * Enter one dart by hand through "Add dart": S20, D5, T19, 25 (outer
   * bull), B (bull) or M (miss). Not for Sniper (use tap-board) or Robin
   * Hood (click the zone).
   */
  async dart(spec) {
    await clickable('Add dart').click({ timeout: 5000 })
    const modal = page.locator('.modal__card')
    await modal.waitFor({ timeout: 5000 })
    const key = String(spec).toUpperCase()
    if (key === 'M') await modal.locator('.key--miss').click()
    else if (key === 'B') await modal.locator('.key--wide', { hasText: 'Bull' }).click()
    else if (key === '25') await modal.locator('.key--wide', { hasText: /^25$/ }).click()
    else {
      const ring = { S: 'Single', D: 'Double', T: 'Triple' }[key[0]]
      const number = Number(key.slice(1))
      if (!ring || !(number >= 1 && number <= 20)) throw new Error(`bad dart ${spec}`)
      await modal.locator('.chip', { hasText: ring }).click()
      await modal.locator('.picker__numbers .key').nth(number - 1).click()
    }
    await modal.waitFor({ state: 'detached', timeout: 5000 })
    return `dart ${key}`
  },
  /** On the Settings screen: leave only this game in the draw (by its name on the chip). */
  async 'only-game'(...words) {
    const name = words.join(' ')
    const chips = page.locator('.settings .chip').filter({ hasText: /./ })
    const target = chips.filter({ hasText: new RegExp(`^${name}$`) }).first()
    if (!(await target.evaluate((el) => el.classList.contains('chip--on')))) await target.click()
    // Then switch off every other game chip of the first block that is on.
    const games = page.locator('.settings .row').first().locator('.chip')
    for (let i = 0; i < (await games.count()); i++) {
      const chip = games.nth(i)
      if ((await chip.innerText()).trim() === name) continue
      if (await chip.evaluate((el) => el.classList.contains('chip--on'))) await chip.click()
    }
    return `only ${name}`
  },
  /** Fill an input: by placeholder, label or CSS selector. */
  async fill(target, ...words) {
    const value = words.join(' ')
    const byLabel = page.getByLabel(target).or(page.getByPlaceholder(target))
    const input = (await byLabel.count()) > 0 ? byLabel.first() : page.locator(target).first()
    await input.fill(value)
    return `filled ${target}`
  },
  async type(...words) {
    await page.keyboard.type(words.join(' '), { delay: 20 })
    return 'typed'
  },
  async press(key) {
    await page.keyboard.press(key)
    return `pressed ${key}`
  },
  /** Screenshot of the window, into the shots folder. */
  async ss(name = `ss-${Date.now()}`) {
    const file = join(SHOTS, `${name}.png`)
    await page.screenshot({ path: file })
    return file
  },
  /** Visible text of the page, or of a CSS selector. */
  async text(selector) {
    return selector ? page.locator(selector).first().innerText() : page.locator('body').innerText()
  },
  /** The buttons on screen and whether they are enabled. */
  async buttons() {
    return page.evaluate(() =>
      [...document.querySelectorAll('button')]
        .filter((b) => b.offsetParent !== null)
        .map((b) => `${b.disabled ? '(off) ' : ''}${b.innerText.replace(/\s+/g, ' ').trim()}`)
        .join('\n'),
    )
  },
  /** Wait until some text shows. */
  async 'wait-text'(...words) {
    await page.getByText(words.join(' ')).first().waitFor({ timeout: 15000 })
    return 'found'
  },
  async sleep(ms) {
    await new Promise((r) => setTimeout(r, Number(ms)))
    return 'slept'
  },
  /** Evaluate JavaScript in the page; for reading state, not for driving it. */
  async eval(...code) {
    return JSON.stringify(await page.evaluate(code.join(' ')), null, 1)
  },
  /** Switch to the show window (needs FORCE_SHOW=1) or back to main. */
  async window(role = 'main') {
    page = await windowFor(role)
    return `now on ${role}`
  },
  async size(width, height) {
    await app.evaluate(({ BrowserWindow }, [w, h]) => BrowserWindow.getAllWindows()[0]?.setSize(w, h), [
      Number(width),
      Number(height),
    ])
    return `size ${width}x${height}`
  },
  async quit() {
    setTimeout(async () => {
      await app.close().catch(() => {})
      process.exit(0)
    }, 50)
    return 'bye'
  },
}

createServer(async (req, res) => {
  let body = ''
  for await (const chunk of req) body += chunk
  const [name, ...args] = JSON.parse(body || '[]')
  const command = commands[name]
  let out
  try {
    out = command ? await command(...args) : `unknown command; try: ${Object.keys(commands).join(', ')}`
  } catch (error) {
    out = `ERROR: ${error.message.split('\n')[0]}`
  }
  res.end(String(out))
}).listen(PORT, '127.0.0.1', () => console.log(`driver ready on ${PORT}`))

app.on('close', () => process.exit(0))
