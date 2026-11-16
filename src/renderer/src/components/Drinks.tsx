import { motion } from 'motion/react'
import { useMemo, useState } from 'react'
import type { PlayerId } from '../../../core/game/types'
import {
  DRINK_RULES,
  buddyNow,
  drinkTally,
  drinkingNow,
  type DrinkOrder,
  type DrinkRule,
  type DrinkTally,
} from '../../../core/party/drinking'
import type { Party } from '../../../core/party/party'
import { strings } from '../../../shared/strings'
import { colourOf, playerOf } from '../colours'
import { send, useSettings } from '../hooks'
import { Avatar } from './Avatar'
import { Modal } from './Modal'

const s = strings.drinking

// Everything the drinking game puts on screen besides the wheel: the glass
// with a count, the banner, the list of rules and the panel to sit out.

/** A glass, crossed out for a player who sits out. */
export function GlassIcon({ out = false }: { out?: boolean }): React.JSX.Element {
  return (
    <svg className="glass__icon" viewBox="0 0 20 24" aria-hidden>
      <path d="M3 2 H17 L15 21 H5 Z" fill="rgb(255 255 255 / 18%)" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
      {!out && <path d="M4.2 9 H15.8 L14.6 20 H5.4 Z" fill="#f08a4b" />}
      {out && <path d="M1 22 L19 2" stroke="var(--hot)" strokeWidth="2.6" strokeLinecap="round" />}
    </svg>
  )
}

export interface DrinksView {
  tally: Record<PlayerId, DrinkTally>
  sitOut: PlayerId[]
}

/** The counts to show beside the players; null when the party is no drinking game, or it is off. */
export function useDrinks(party: Party): DrinksView | null {
  return useMemo(() => {
    if (!party.drinking) return null
    const now = drinkingNow(party)
    return now.on ? { tally: drinkTally(party), sitOut: now.sitOut } : null
  }, [party])
}

/** A player's glass with the sips taken so far. Nothing outside a drinking game. */
export function Glass({ drinks, player }: { drinks: DrinksView | null; player: PlayerId }): React.JSX.Element | null {
  if (!drinks) return null
  const out = drinks.sitOut.includes(player)
  const sips = drinks.tally[player]?.drunk ?? 0
  return (
    <span className={out ? 'glass glass--out' : 'glass'} title={out ? s.sitsOut : s.sips(sips)}>
      <GlassIcon out={out} />
      {!out && <span className="glass__count">{sips}</span>}
    </span>
  )
}

/** One order as a line: avatar, who, what. */
export function OrderLine({ party, order }: { party: Party; order: DrinkOrder }): React.JSX.Element {
  const player = playerOf(party, order.player)
  const text = order.kind === 'drink' ? s.takes(player.name, order.sips) : s.handsOut(player.name, order.sips)
  return (
    <span className={`order-line order-line--${order.kind}`} style={{ borderColor: colourOf(party, order.player) }}>
      <Avatar avatar={player.avatar} size="1.5em" mood={order.kind === 'drink' ? 'sulk' : 'cheer'} />
      <span>
        {text}
        {order.with && <small> {s.along(playerOf(party, order.with).name)}</small>}
      </span>
      <GlassIcon />
    </span>
  )
}

/** A list of orders, as shown after a game, at the wheel and on the podium. */
export function OrderList({ party, orders }: { party: Party; orders: readonly DrinkOrder[] }): React.JSX.Element | null {
  if (orders.length === 0) return null
  return (
    <div className="order-lines">
      {orders.map((order) => (
        <OrderLine key={`${order.source}-${order.player}-${order.kind}`} party={party} order={order} />
      ))}
    </div>
  )
}

export type DrinkBannerPhase = 'centre' | 'strip' | 'small'

const BANNER_AT: Record<DrinkBannerPhase, { y: string | number; scale: number }> = {
  centre: { y: '-38vh', scale: 1.5 },
  strip: { y: 0, scale: 1 },
  small: { y: 0, scale: 0.5 },
}

/**
 * Says who drinks for the dart just thrown: first big in the middle of the
 * screen, then in its strip at the bottom, and after a while small, as a
 * reminder that stays until the next dart.
 */
export function DrinkBanner(props: { party: Party; orders: readonly DrinkOrder[]; phase: DrinkBannerPhase }): React.JSX.Element {
  const { party, orders, phase } = props
  return (
    <div className="drink-banner" aria-live="polite">
      <motion.div
        className="drink-banner__strip"
        initial={{ y: '-38vh', scale: 0.3, opacity: 0 }}
        animate={{ ...BANNER_AT[phase], opacity: 1 }}
        transition={{ type: 'spring', stiffness: 220, damping: 18 }}
      >
        {orders.map((order) => (
          <OrderLine key={`${order.player}-${order.kind}`} party={party} order={order} />
        ))}
      </motion.div>
    </div>
  )
}

/** The rules as text: the ones given, then the wheel and the closing line. */
export function DrinkRulesText({ rules }: { rules: readonly DrinkRule[] }): React.JSX.Element {
  return (
    <>
      <ul className="rules__list rules__list--drinks">
        {DRINK_RULES.filter((rule) => rules.includes(rule)).map((rule) => (
          <li key={rule}>{s.rules[rule]}</li>
        ))}
        <li>{s.wheelRule}</li>
      </ul>
      {rules.length === 0 && <p className="hint">{s.noRules}</p>}
      <p className="hint">{s.footer}</p>
    </>
  )
}

/** A switch per drinking rule, kept in the settings. */
export function DrinkRuleSwitches(): React.JSX.Element {
  const settings = useSettings()
  const off = settings.disabledDrinkRules
  return (
    <div className="rule-switches">
      {DRINK_RULES.map((rule) => {
        const on = !off.includes(rule)
        return (
          <button
            key={rule}
            type="button"
            className={on ? 'rule-switch rule-switch--on' : 'rule-switch'}
            aria-pressed={on}
            onClick={() =>
              window.dartParty.updateSettings({ disabledDrinkRules: on ? [...off, rule] : off.filter((x) => x !== rule) })
            }
          >
            <span className="rule-switch__state">{on ? s.on : s.off}</span>
            <span>{s.rules[rule]}</span>
          </button>
        )
      })}
    </div>
  )
}

/**
 * The button in the frame of a drinking game, and what it opens: the mode
 * off or on, who sits out, and the rules of this party.
 */
export function DrinksPanel({ party }: { party: Party }): React.JSX.Element | null {
  const [open, setOpen] = useState(false)
  const drinking = party.drinking
  if (!drinking) return null
  const now = drinkingNow(party)
  const pair = buddyNow(party)
  return (
    <>
      <button type="button" className="button button--quiet" onClick={() => setOpen(true)}>
        <GlassIcon out={!now.on} /> {s.panelOpen}
      </button>
      {open && (
        <Modal title={s.switch} onClose={() => setOpen(false)}>
          <div className="row">
            <button type="button" className={now.on ? 'chip chip--on' : 'chip'} onClick={() => send({ type: 'setDrinking', on: true })}>
              {s.on}
            </button>
            <button type="button" className={now.on ? 'chip' : 'chip chip--on'} onClick={() => send({ type: 'setDrinking', on: false })}>
              {s.off}
            </button>
          </div>
          <p className="hint">{s.panelHint}</p>
          <div className="sitters">
            {party.players.map((player) => {
              const out = now.sitOut.includes(player.id)
              return (
                <button
                  key={player.id}
                  type="button"
                  className={out ? 'sitter sitter--out' : 'sitter'}
                  aria-pressed={!out}
                  onClick={() => send({ type: 'setSitOut', player: player.id, out: !out })}
                >
                  <Avatar avatar={player.avatar} size="2.4em" mood={out ? 'idle' : 'cheer'} />
                  <span>{player.name}</span>
                  <GlassIcon out={out} />
                </button>
              )
            })}
          </div>
          {pair && <p className="hint">{s.buddy(playerOf(party, pair.of).name, playerOf(party, pair.buddy).name)}</p>}
          <DrinkRulesText rules={drinking.rules} />
          <button type="button" className="button" onClick={() => setOpen(false)}>
            {strings.common.back}
          </button>
        </Modal>
      )}
    </>
  )
}
