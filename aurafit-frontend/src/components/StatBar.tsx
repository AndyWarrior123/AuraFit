import { motion } from 'framer-motion'
import { useState } from 'react'
import { STAT_CONFIG } from '../lib/constants'

type StatKey = keyof typeof STAT_CONFIG

interface StatBarProps {
  statKey: StatKey
  score: number
  drivenBy: string
  delay?: number
}

export function StatBar({ statKey, score, drivenBy, delay = 0 }: StatBarProps) {
  const cfg = STAT_CONFIG[statKey]
  const [hovered, setHovered] = useState(false)

  return (
    <div
      className="relative group"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div className="flex items-center gap-3 mb-1.5">
        <span
          className="text-xs font-bold font-mono w-8 shrink-0 tracking-widest"
          style={{ color: cfg.color }}
        >
          {cfg.label}
        </span>
        <div className="flex-1 relative h-2 rounded-full overflow-hidden" style={{ background: cfg.track }}>
          <motion.div
            className="h-full rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${score}%` }}
            transition={{ duration: 1.2, delay, ease: [0.25, 0.46, 0.45, 0.94] }}
            style={{
              background: `linear-gradient(90deg, ${cfg.color}cc, ${cfg.color})`,
              boxShadow: `0 0 8px ${cfg.glow}, 0 0 20px ${cfg.glow}44`,
            }}
          />
        </div>
        <motion.span
          className="text-sm font-bold w-8 text-right shrink-0"
          style={{ color: cfg.color }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: delay + 0.8 }}
        >
          {Math.round(score)}
        </motion.span>
      </div>

      {/* Tooltip */}
      <motion.div
        className="absolute left-0 -bottom-10 z-20 pointer-events-none"
        initial={{ opacity: 0, y: -4 }}
        animate={{ opacity: hovered ? 1 : 0, y: hovered ? 0 : -4 }}
        transition={{ duration: 0.15 }}
      >
        <div
          className="text-xs px-3 py-1.5 rounded-lg whitespace-nowrap"
          style={{
            background: 'rgba(13, 13, 35, 0.95)',
            border: `1px solid ${cfg.color}44`,
            color: '#cbd5e1',
          }}
        >
          <span style={{ color: cfg.color }} className="font-semibold">{cfg.full}: </span>
          {drivenBy}
        </div>
      </motion.div>
    </div>
  )
}
