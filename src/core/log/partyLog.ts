// A log per party, for finding out afterwards what went wrong at the board.
// It keeps what Autodarts sent, what the app made of it and what was done on
// the control panel, each with the time. A bug flag marks a moment in it.
//
// Storage is passed in, so this has no Electron in it. Every write is
// guarded: a log that cannot be written must never stop the party.

/** Plain text files in one folder, by name. */
export interface LogFiles {
  list(): string[]
  read(name: string): string | null
  write(name: string, text: string): void
  append(name: string, text: string): void
  remove(name: string): void
}

/** A moment someone marked as wrong, with an optional note. */
export interface BugFlag {
  id: number
  at: string
  note: string
  /** What the app knew at that moment: the party and the board. */
  context: unknown
}

export interface LogSummary {
  id: string
  startedAt: string
  players: string[]
  freePlay: boolean
  flags: BugFlag[]
}

/**
 * How many party logs are kept. The oldest without a bug are removed; a log
 * with a bug stays until it is deleted by hand.
 */
export const KEEP_LOGS = 20

const CURRENT = 'current.json'
const entries = (id: string): string => `${id}.jsonl`
const flagsOf = (id: string): string => `${id}.flags.json`

export class PartyLog {
  private id: string | null = null
  private lastRaw = ''
  private lastParty = ''

  constructor(
    private readonly files: LogFiles,
    private readonly now: () => Date = () => new Date(),
    private readonly keep = KEEP_LOGS,
  ) {
    const saved = this.safe(() => JSON.parse(files.read(CURRENT) ?? 'null'), null)
    if (typeof saved === 'string' && files.read(entries(saved)) !== null) this.id = saved
  }

  /** The log being written, if a party is on. */
  get current(): string | null {
    return this.id
  }

  /** Starts the log of a new party and drops the oldest beyond the limit. */
  begin(start: { players: string[]; freePlay: boolean; appVersion: string }): void {
    const at = this.now()
    let id = at.toISOString().slice(0, 19).replace('T', '_').replaceAll(':', '-')
    const taken = new Set(this.safe(() => this.files.list(), []))
    for (let n = 2; taken.has(entries(id)); n++) id = `${id.split('~')[0]}~${n}`
    this.id = id
    this.lastRaw = ''
    this.lastParty = ''
    this.safe(() => this.files.write(CURRENT, JSON.stringify(id)), undefined)
    this.record('start', start)
    this.prune()
  }

  /** The party is over or was left. */
  end(): void {
    if (!this.id) return
    this.record('end', {})
    this.id = null
    this.safe(() => this.files.remove(CURRENT), undefined)
  }

  /** One line in the log of the party being played. */
  record(kind: string, data: unknown): void {
    if (!this.id) return
    const line = JSON.stringify({ t: this.now().toISOString(), kind, data })
    const id = this.id
    this.safe(() => this.files.append(entries(id), `${line}\n`), undefined)
  }

  /** What Autodarts sent. The poll repeats it every two seconds: kept once. */
  autodarts(source: 'socket' | 'poll', raw: unknown): void {
    const text = JSON.stringify(raw) ?? 'null'
    if (text === this.lastRaw) return
    this.lastRaw = text
    this.record('autodarts', { source, raw })
  }

  /** Where the party stands after a change, kept only when it moved. */
  party(summary: unknown): void {
    const text = JSON.stringify(summary)
    if (text === this.lastParty) return
    this.lastParty = text
    this.record('party', summary)
  }

  /** Marks this moment. Answers the flag, or null when no party is on. */
  flag(context: unknown): { log: string; flag: BugFlag } | null {
    if (!this.id) return null
    const id = this.id
    const flags = this.flags(id)
    const flag: BugFlag = {
      id: flags.reduce((max, f) => Math.max(max, f.id), 0) + 1,
      at: this.now().toISOString(),
      note: '',
      context,
    }
    this.safe(() => this.files.write(flagsOf(id), JSON.stringify([...flags, flag])), undefined)
    this.record('flag', { id: flag.id })
    return { log: id, flag }
  }

  /** Writes or replaces the note of a flag, also after the party. */
  note(log: string, flag: number, note: string): void {
    const flags = this.flags(log)
    if (!flags.some((f) => f.id === flag)) return
    const updated = flags.map((f) => (f.id === flag ? { ...f, note: note.slice(0, 2000) } : f))
    this.safe(() => this.files.write(flagsOf(log), JSON.stringify(updated)), undefined)
  }

  /** Every kept log, newest first. */
  list(): LogSummary[] {
    return this.ids()
      .reverse()
      .map((id) => {
        const first = this.safe(() => JSON.parse((this.files.read(entries(id)) ?? '').split('\n')[0]!), null)
        const start = first?.kind === 'start' ? first.data : {}
        return {
          id,
          startedAt: typeof first?.t === 'string' ? first.t : '',
          players: Array.isArray(start.players) ? start.players : [],
          freePlay: start.freePlay === true,
          flags: this.flags(id),
        }
      })
  }

  /** Removes a log and its bugs. Not the log of the party being played. */
  delete(log: string): boolean {
    if (log === this.id || !this.ids().includes(log)) return false
    this.safe(() => this.files.remove(entries(log)), undefined)
    this.safe(() => this.files.remove(flagsOf(log)), undefined)
    return true
  }

  /** One log and its flags as a single file, to hand over for analysis. */
  bundle(log: string): string | null {
    const text = this.safe(() => this.files.read(entries(log)), null)
    if (text === null) return null
    const lines = text
      .split('\n')
      .filter((line) => line.trim() !== '')
      .map((line) => this.safe(() => JSON.parse(line), { unreadable: line }))
    return JSON.stringify({ log, exportedAt: this.now().toISOString(), flags: this.flags(log), entries: lines }, null, 1)
  }

  private flags(log: string): BugFlag[] {
    const saved = this.safe(() => JSON.parse(this.files.read(flagsOf(log)) ?? '[]'), [])
    return Array.isArray(saved) ? saved : []
  }

  /** Log ids, oldest first. The ids are times, so they sort. */
  private ids(): string[] {
    return this.safe(() => this.files.list(), [])
      .filter((name) => name.endsWith('.jsonl'))
      .map((name) => name.slice(0, -'.jsonl'.length))
      .sort()
  }

  private prune(): void {
    const ids = this.ids()
    let over = ids.length - this.keep
    for (const id of ids) {
      if (over <= 0) return
      if (id === this.id || this.flags(id).length > 0) continue
      this.safe(() => this.files.remove(entries(id)), undefined)
      over--
    }
  }

  private safe<T>(action: () => T, fallback: T): T {
    try {
      return action()
    } catch {
      return fallback
    }
  }
}
