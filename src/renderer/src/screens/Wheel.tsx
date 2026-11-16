import { motion } from 'motion/react'
import { useEffect, useRef, useState } from 'react'
import { WHEEL_TASKS, buddyChoices, wheelNow, wheelPlayers } from '../../../core/party/drinking'
import type { Party } from '../../../core/party/party'
import { strings } from '../../../shared/strings'
import { colourOf, playerOf } from '../colours'
import { Avatar } from '../components/Avatar'
import { OrderList } from '../components/Drinks'
import { PartyFrame } from '../components/PartyFrame'
import { send } from '../hooks'
import { sound } from '../sound'

const s = strings.drinking.wheel

/** Seconds each wheel turns; the task wheel starts when the player wheel stops. */
const SPIN = 3.6
const TASK_COLOURS = ['#ee4266', '#4d9de0', '#3bceac', '#f08a4b', '#b388eb', '#ffd23f', '#8bd450', '#ff8fab']

interface Slot {
  label: string
  colour: string
}

/** A point on the rim, `turn` being a fraction of the way round from the top, clockwise. */
const rim = (turn: number, radius: number): string => {
  const angle = turn * 2 * Math.PI
  return `${(radius * Math.sin(angle)).toFixed(3)} ${(-radius * Math.cos(angle)).toFixed(3)}`
}

/**
 * A wheel of equal slots under a pointer at the top. It rests until `target`
 * is known, then turns and stops with that slot under the pointer. With
 * `still` it shows the outcome at once: a wheel is never spun twice.
 */
function SpinWheel(props: {
  slots: readonly Slot[]
  target: number | null
  delay: number
  still: boolean
  onStop: () => void
}): React.JSX.Element {
  const { slots, target } = props
  const share = 1 / slots.length
  // Five full turns, then on to the middle of the slot.
  const rest = target === null ? 0 : -(target + 0.5) * share * 360
  const turning = target !== null && !props.still

  // The wheel ticks while it turns, slower towards the end.
  useEffect(() => {
    if (!turning) return
    let timer: ReturnType<typeof setTimeout>
    const started = Date.now() + props.delay * 1000
    const tick = (): void => {
      const elapsed = Date.now() - started
      if (elapsed > SPIN * 1000 - 300) return
      if (elapsed >= 0) sound.play('tick')
      timer = setTimeout(tick, 60 + Math.max(0, elapsed) / 12)
    }
    tick()
    return () => clearTimeout(timer)
  }, [turning])

  return (
    <div className="wheel">
      <motion.svg
        viewBox="-1.05 -1.05 2.1 2.1"
        initial={{ rotate: props.still ? rest : 0 }}
        animate={{ rotate: target === null ? 0 : props.still ? rest : rest + 5 * 360 }}
        transition={turning ? { duration: SPIN, delay: props.delay, ease: [0.12, 0.6, 0.2, 1] } : { duration: 0 }}
        onAnimationComplete={() => {
          if (target === null) return
          if (turning) sound.play('reveal')
          props.onStop()
        }}
      >
        <circle r="1.03" fill="var(--gold)" />
        {slots.map((slot, i) => {
          const middle = (i + 0.5) * share
          return (
            <g key={i}>
              {slots.length === 1 ? (
                <circle r="1" fill={slot.colour} />
              ) : (
                <path
                  d={`M0 0 L${rim(i * share, 1)} A1 1 0 0 1 ${rim((i + 1) * share, 1)} Z`}
                  fill={slot.colour}
                  stroke="#1b0a38"
                  strokeWidth="0.012"
                />
              )}
              <text
                transform={`rotate(${middle * 360 - 90}) translate(0.56 0)`}
                textAnchor="middle"
                dominantBaseline="central"
                fontSize={slot.label.length > 12 ? 0.085 : 0.11}
                fontWeight="800"
                fill="#1b0a38"
              >
                {slot.label}
              </text>
            </g>
          )
        })}
        <circle r="0.09" fill="#1b0a38" />
      </motion.svg>
      <svg className="wheel__pointer" viewBox="0 0 20 24" aria-hidden>
        <path d="M2 2 H18 L10 22 Z" fill="var(--hot)" stroke="#1b0a38" strokeWidth="2" strokeLinejoin="round" />
      </svg>
    </div>
  )
}

/** The drinking wheel between two games: first who, then what. */
export function Wheel({ party }: { party: Party }): React.JSX.Element {
  const now = wheelNow(party)
  const spun = now !== null
  // A wheel that was already spun when this screen opened (a restart) is not spun again.
  const still = useRef(spun).current
  const [stopped, setStopped] = useState(still)

  const players = wheelPlayers(party)
  const who = now ? playerOf(party, now.wheel.player) : null
  const choices = buddyChoices(party)
  const noBuddy = now !== null && now.wheel.task === 'safe' && WHEEL_TASKS[now.wheel.slot] === 'buddy'

  return (
    <PartyFrame party={party} title={s.title}>
      <section className="wheels">
        <SpinWheel
          slots={players.map((id) => ({ label: playerOf(party, id).name, colour: colourOf(party, id) }))}
          target={now ? Math.max(0, players.indexOf(now.wheel.player)) : null}
          delay={0}
          still={still}
          onStop={() => {}}
        />
        <SpinWheel
          slots={WHEEL_TASKS.map((task, i) => ({ label: s.tasks[task], colour: TASK_COLOURS[i % TASK_COLOURS.length]! }))}
          target={now ? now.wheel.slot : null}
          delay={SPIN}
          still={still}
          onStop={() => setStopped(true)}
        />
      </section>

      <section className="wheel-result">
        {now && who && stopped && (
          <motion.div
            className="wheel-result__card"
            initial={still ? false : { scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 220, damping: 14 }}
          >
            <h3>
              <Avatar avatar={who.avatar} size="1.6em" mood="shocked" /> {who.name}: {s.tasks[WHEEL_TASKS[now.wheel.slot]!]}
            </h3>
            <OrderList party={party} orders={now.orders} />
            {now.wheel.task === 'safe' && <p>{noBuddy ? s.noBuddy(who.name) : s.safe(who.name)}</p>}
            {now.wheel.task === 'buddy' && (
              <>
                <p>
                  {now.wheel.buddy
                    ? strings.drinking.buddy(who.name, playerOf(party, now.wheel.buddy).name)
                    : s.pickBuddy(who.name)}
                </p>
                <div className="row">
                  {choices.map((id) => {
                    const player = playerOf(party, id)
                    return (
                      <button
                        key={id}
                        type="button"
                        className={now.wheel.buddy === id ? 'chip chip--on' : 'chip'}
                        onClick={() => send({ type: 'pickBuddy', player: id })}
                      >
                        <Avatar avatar={player.avatar} size="1.4em" /> {player.name}
                      </button>
                    )
                  })}
                </div>
              </>
            )}
          </motion.div>
        )}
      </section>

      <footer className="bar bar--center">
        {spun ? (
          <button type="button" className="button button--big" disabled={!stopped} onClick={() => send({ type: 'advance' })}>
            {strings.common.continue}
          </button>
        ) : (
          <>
            <button type="button" className="button button--big" onClick={() => send({ type: 'spinWheel' })}>
              {s.spin}
            </button>
            <button type="button" className="button button--quiet" onClick={() => send({ type: 'advance' })}>
              {s.skip}
            </button>
          </>
        )}
      </footer>
    </PartyFrame>
  )
}
