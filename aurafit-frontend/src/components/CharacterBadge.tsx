import { motion } from 'framer-motion'
import { Flame } from 'lucide-react'
import { useState, useEffect } from 'react'
import { CLASS_CONFIG } from '../lib/constants'
import type { CharacterClass } from '../api/types'

interface CharacterBadgeProps {
  characterClass: CharacterClass
  level: number
  streakDays: number
  displayName: string
  avatarUrl?: string | null
  compact?: boolean
}

export function CharacterBadge({
  characterClass,
  level,
  streakDays,
  displayName,
  avatarUrl,
  compact = false,
}: CharacterBadgeProps) {
  const cls = CLASS_CONFIG[characterClass]
  const [imgError, setImgError] = useState(false)

  // Reset error state whenever the URL itself changes
  useEffect(() => { setImgError(false) }, [avatarUrl])

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <div className="level-badge w-8 h-8 text-sm">{level}</div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-white truncate">{displayName}</p>
          <p className="text-xs" style={{ color: cls.color }}>
            {cls.icon} {cls.label}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center gap-3">
      {/* Avatar */}
      <div className="relative">
        <motion.div
          className="w-20 h-20 rounded-full overflow-hidden border-2"
          style={{ borderColor: cls.color + '66' }}
          whileHover={{ scale: 1.05 }}
        >
          {avatarUrl && !imgError ? (
            <img
              src={avatarUrl}
              alt={displayName}
              className="w-full h-full object-cover"
              onError={() => setImgError(true)}
            />
          ) : (
            <div
              className="w-full h-full flex items-center justify-center text-3xl"
              style={{ background: `linear-gradient(135deg, ${cls.color}22, ${cls.color}11)` }}
            >
              {cls.icon}
            </div>
          )}
        </motion.div>
        {/* Level badge */}
        <div
          className="level-badge absolute -bottom-1 -right-1 w-7 h-7 text-xs"
          style={{ fontSize: '11px' }}
        >
          {level}
        </div>
      </div>

      {/* Name + class */}
      <div className="text-center">
        <p className="font-semibold text-white text-sm">{displayName}</p>
        <p className="text-xs font-medium mt-0.5" style={{ color: cls.color }}>
          {cls.icon} {cls.label}
        </p>
        <p className="text-xs text-slate-500 mt-0.5">{cls.description}</p>
      </div>

      {/* Streak */}
      {streakDays > 0 && (
        <motion.div
          className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold"
          style={{
            background: 'rgba(249, 115, 22, 0.15)',
            border: '1px solid rgba(249, 115, 22, 0.35)',
            color: '#fb923c',
          }}
          animate={{ scale: [1, 1.03, 1] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        >
          <Flame size={12} className="flame" style={{ color: '#f97316' }} />
          {streakDays} day streak
        </motion.div>
      )}
    </div>
  )
}
