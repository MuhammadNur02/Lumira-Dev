import type { Transition } from 'motion/react'

/** Spring tokens (StyleGuide §6.2). Change stiffness for speed, damping for bounce, mass for weight. */
export const spring = {
  press: { type: 'spring', stiffness: 700, damping: 35, mass: 0.5 },
  snappy: { type: 'spring', stiffness: 500, damping: 32, mass: 0.8 },
  smooth: { type: 'spring', stiffness: 300, damping: 30, mass: 1 },
  reveal: { type: 'spring', stiffness: 260, damping: 26, mass: 1 },
  gentle: { type: 'spring', stiffness: 170, damping: 26, mass: 1 },
  bouncy: { type: 'spring', stiffness: 400, damping: 22, mass: 1 },
} as const satisfies Record<string, Transition>

/** Exits: short, ease-in, no spring. */
export const exit = { duration: 0.14, ease: [0.4, 0, 1, 1] } as const satisfies Transition
