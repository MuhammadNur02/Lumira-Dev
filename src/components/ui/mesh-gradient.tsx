'use client'

import { cn } from '@/lib/utils'

export interface MeshGradientBackgroundProps {
  className?: string
  children?: React.ReactNode
  /** Animation speed multiplier */
  speed?: number
}

/**
 * Exclusive matte-black background with barely-visible dark orbs that float slowly,
 * giving depth without any obvious color. A fine film-grain overlay completes the
 * premium tactile feel — think high-end fashion or luxury tech packaging.
 */
export function MeshGradientBackground({ className, children, speed = 1 }: MeshGradientBackgroundProps) {
  const duration1 = 80 / speed
  const duration2 = 100 / speed
  const duration3 = 120 / speed
  const duration4 = 90 / speed

  return (
    <div
      className={cn('pointer-events-none fixed inset-0 z-0 overflow-hidden', className)}
      style={{ backgroundColor: '#050505' }}
      aria-hidden="true"
    >
      {/* Near-invisible dark orbs — they shift just enough to give the black surface "life" */}
      <div className="absolute inset-0">
        {/* Orb 1 — deep charcoal, top-left */}
        <div
          className="absolute h-[70%] w-[70%] rounded-full"
          style={{
            left: '-15%',
            top: '-20%',
            background: 'radial-gradient(circle, rgba(18,18,22,0.9) 0%, transparent 70%)',
            filter: 'blur(100px)',
            animation: `meshMove1 ${duration1}s ease-in-out infinite`,
          }}
        />

        {/* Orb 2 — warm charcoal, top-right */}
        <div
          className="absolute h-[55%] w-[55%] rounded-full"
          style={{
            right: '-10%',
            top: '5%',
            background: 'radial-gradient(circle, rgba(22,18,16,0.8) 0%, transparent 70%)',
            filter: 'blur(110px)',
            animation: `meshMove2 ${duration2}s ease-in-out infinite`,
          }}
        />

        {/* Orb 3 — cool charcoal, bottom-center */}
        <div
          className="absolute h-[60%] w-[75%] rounded-full"
          style={{
            left: '15%',
            bottom: '-20%',
            background: 'radial-gradient(circle, rgba(14,16,22,0.85) 0%, transparent 70%)',
            filter: 'blur(130px)',
            animation: `meshMove3 ${duration3}s ease-in-out infinite`,
          }}
        />

        {/* Orb 4 — neutral deep, center accent */}
        <div
          className="absolute h-[45%] w-[45%] rounded-full"
          style={{
            left: '35%',
            top: '25%',
            background: 'radial-gradient(circle, rgba(20,18,20,0.7) 0%, transparent 70%)',
            filter: 'blur(100px)',
            animation: `meshMove4 ${duration4}s ease-in-out infinite`,
          }}
        />
      </div>

      {/* Subtle top-edge highlight — the faintest whisper of light on the "ceiling" */}
      <div
        className="absolute inset-x-0 top-0 h-[40%]"
        style={{
          background: 'radial-gradient(ellipse 80% 50% at 50% 0%, rgba(255,255,255,0.018) 0%, transparent 70%)',
        }}
      />

      {/* Film grain texture — gives the surface a tactile matte quality */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.035]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        }}
      />

      {/* Content layer */}
      {children && <div className="relative z-10 h-full w-full">{children}</div>}

      <style>{`
        @keyframes meshMove1 {
          0%, 100% { transform: translate(0%, 0%) scale(1); }
          25% { transform: translate(3%, 6%) scale(1.03); }
          50% { transform: translate(6%, 3%) scale(0.97); }
          75% { transform: translate(3%, -3%) scale(1.01); }
        }
        @keyframes meshMove2 {
          0%, 100% { transform: translate(0%, 0%) scale(1); }
          33% { transform: translate(-6%, 5%) scale(1.05); }
          66% { transform: translate(-3%, -3%) scale(0.97); }
        }
        @keyframes meshMove3 {
          0%, 100% { transform: translate(0%, 0%) scale(1); }
          50% { transform: translate(-5%, -6%) scale(1.06); }
        }
        @keyframes meshMove4 {
          0%, 100% { transform: translate(0%, 0%) scale(1); }
          25% { transform: translate(8%, -6%) scale(0.93); }
          50% { transform: translate(-6%, 8%) scale(1.07); }
          75% { transform: translate(-8%, -3%) scale(0.97); }
        }
      `}</style>
    </div>
  )
}

export default function MeshGradientBackgroundDemo() {
  return <MeshGradientBackground />
}
