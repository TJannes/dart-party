import { motion } from 'motion/react'
import { useEffect, useMemo, useState } from 'react'
import type { Evening } from '../../../core/evening/evening'
import { strings } from '../../../shared/strings'
import { EveningFrame } from '../components/EveningFrame'
import { send } from '../hooks'
import { sound } from '../sound'

const ROWS = 18
const ROW_EM = 1.6

function gameName(id: string): string {
  return (strings.games as Record<string, { name: string }>)[id]?.name ?? id
}

/** The draw, as a slot machine reel that stops on the game already chosen. */
export function Draw({ evening }: { evening: Evening }): React.JSX.Element {
  const drawn = evening.games.at(-1)!.gameId
  const [stopped, setStopped] = useState(false)
  const reel = useMemo(() => {
    const names = evening.enabledGames.map(gameName)
    const rows = Array.from({ length: ROWS - 1 }, (_, i) => names[(i * 7 + evening.games.length) % names.length]!)
    return [...rows, gameName(drawn)]
    // One reel per drawn game.
  }, [evening.games.length])

  // The reel ticks while it turns, slower towards the end.
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>
    const started = Date.now()
    const tick = (): void => {
      const elapsed = Date.now() - started
      if (elapsed > 3000) return
      sound.play('tick')
      timer = setTimeout(tick, 60 + elapsed / 12)
    }
    tick()
    return () => clearTimeout(timer)
  }, [evening.games.length])

  return (
    <EveningFrame evening={evening} title={strings.evening.drawTitle}>
      <section className="draw">
        <div className={stopped ? 'reel reel--stopped' : 'reel'} style={{ height: `${ROW_EM * 3}em` }}>
          <motion.div
            key={evening.games.length}
            initial={{ y: `${ROW_EM}em` }}
            animate={{ y: `${-(ROWS - 2) * ROW_EM}em` }}
            transition={{ duration: 3.2, ease: [0.12, 0.6, 0.2, 1] }}
            onAnimationComplete={() => {
              setStopped(true)
              sound.play('reveal')
            }}
          >
            {reel.map((name, i) => (
              <div key={i} className="reel__row" style={{ height: `${ROW_EM}em` }}>
                {name}
              </div>
            ))}
          </motion.div>
        </div>
        <button type="button" className="button button--big" disabled={!stopped} onClick={() => send({ type: 'advance' })}>
          {strings.common.continue}
        </button>
      </section>
    </EveningFrame>
  )
}

export { gameName }
