import { motion } from 'framer-motion'
import { xpProgressInLevel } from '../lib/constants'

interface XPRingProps {
  totalXp: number
  level: number
  size?: number
}

export function XPRing({ totalXp, level, size = 160 }: XPRingProps) {
  const { current, needed, percent } = xpProgressInLevel(totalXp, level)
  const strokeWidth = 8
  const radius = (size - strokeWidth * 2) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference * (1 - percent / 100)

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      {/* Outer decorative ring */}
      <svg
        width={size}
        height={size}
        className="absolute inset-0 animate-ring-rotate opacity-20"
        style={{ animationDuration: '12s' }}
      >
        {[0, 60, 120, 180, 240, 300].map(angle => (
          <rect
            key={angle}
            x={size / 2 - 2}
            y={4}
            width={4}
            height={8}
            rx={2}
            fill="#06b6d4"
            transform={`rotate(${angle} ${size / 2} ${size / 2})`}
          />
        ))}
      </svg>

      {/* Background track */}
      <svg width={size} height={size} className="absolute inset-0 -rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(6, 182, 212, 0.1)"
          strokeWidth={strokeWidth}
        />
        {/* XP progress arc */}
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={percent >= 100 ? 'url(#xpGoldGradient)' : 'url(#xpGradient)'}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.5, ease: 'easeOut', delay: 0.3 }}
          style={{ filter: 'drop-shadow(0 0 6px rgba(6, 182, 212, 0.7))' }}
        />
        <defs>
          <linearGradient id="xpGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#a855f7" />
            <stop offset="100%" stopColor="#06b6d4" />
          </linearGradient>
          <linearGradient id="xpGoldGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#f59e0b" />
            <stop offset="100%" stopColor="#fbbf24" />
          </linearGradient>
        </defs>
      </svg>

      {/* Center content */}
      <div className="relative flex flex-col items-center gap-0.5">
        <span className="text-xs text-slate-500 tracking-widest uppercase font-medium">Level</span>
        <motion.span
          className="text-4xl font-black neon-text-gold"
          style={{ fontFamily: 'Orbitron, system-ui', lineHeight: 1 }}
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.4, type: 'spring', stiffness: 200 }}
        >
          {level}
        </motion.span>
        {percent >= 100 ? (
          <motion.span
            className="text-xs font-semibold"
            style={{ color: '#f59e0b' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1 }}
          >
            Level up!
          </motion.span>
        ) : (
          <motion.span
            className="text-xs text-cyan-400"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1 }}
          >
            {current.toLocaleString()} / {needed.toLocaleString()}
          </motion.span>
        )}
        <span className="text-xs text-slate-600">XP</span>
      </div>
    </div>
  )
}
