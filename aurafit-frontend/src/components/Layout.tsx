import { NavLink, Outlet } from 'react-router-dom'
import { motion } from 'framer-motion'
import { LayoutDashboard, Swords, BarChart3, User, LogOut, Zap } from 'lucide-react'
import { useAuthStore } from '../auth/useAuthStore'
import { useCharacterSheet } from '../hooks/useCharacter'
import { CharacterBadge } from './CharacterBadge'

const NAV_ITEMS = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/workout',   icon: Swords,          label: 'Workout' },
  { to: '/history',  icon: BarChart3,        label: 'History' },
  { to: '/profile',  icon: User,             label: 'Profile' },
]

export function Layout() {
  const { user, logout } = useAuthStore()
  const { data: sheet } = useCharacterSheet()
  const liveLevel = sheet?.stats.level_at_snapshot ?? user?.current_level ?? 1
  const liveClass = sheet?.stats.character_class ?? user?.character_class ?? 'NOVICE'
  const liveStreak = sheet?.stats.current_streak_days ?? 0

  return (
    <div className="flex h-screen overflow-hidden bg-space-900">
      {/* Grid background overlay */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          backgroundImage:
            'linear-gradient(rgba(168, 85, 247, 0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(168, 85, 247, 0.04) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}
      />

      {/* Sidebar */}
      <motion.aside
        className="hidden md:flex flex-col w-64 shrink-0 relative z-10"
        style={{
          background: 'linear-gradient(180deg, #0a0a20 0%, #080818 100%)',
          borderRight: '1px solid rgba(168, 85, 247, 0.15)',
        }}
        initial={{ x: -264 }}
        animate={{ x: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
      >
        {/* Logo */}
        <div className="px-6 py-5 border-b border-white/5">
          <div className="flex items-center gap-2.5">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center text-lg"
              style={{
                background: 'linear-gradient(135deg, #7c3aed, #06b6d4)',
                boxShadow: '0 0 20px rgba(124, 58, 237, 0.4)',
              }}
            >
              <Zap size={18} color="white" />
            </div>
            <span
              className="text-lg font-black tracking-tight text-white"
              style={{ fontFamily: 'Orbitron, system-ui' }}
            >
              AuraFit
            </span>
          </div>
        </div>

        {/* Character info */}
        {user && (
          <div className="px-6 py-5 border-b border-white/5">
            <CharacterBadge
              characterClass={liveClass}
              level={liveLevel}
              streakDays={liveStreak}
              displayName={user.display_name}
              avatarUrl={user.avatar_url}
              compact
            />
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {NAV_ITEMS.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            >
              <Icon size={18} />
              <span className="text-sm font-medium">{label}</span>
            </NavLink>
          ))}
        </nav>

        {/* Logout */}
        <div className="px-3 py-4 border-t border-white/5">
          <button
            onClick={logout}
            className="nav-item w-full text-left text-red-400/70 hover:text-red-400 hover:bg-red-500/10"
          >
            <LogOut size={18} />
            <span className="text-sm font-medium">Sign Out</span>
          </button>
        </div>
      </motion.aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto relative">
        <Outlet />
      </main>

      {/* Bottom nav (mobile) */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around px-2 py-2"
        style={{
          background: 'rgba(8, 8, 24, 0.95)',
          borderTop: '1px solid rgba(168, 85, 247, 0.2)',
          backdropFilter: 'blur(20px)',
        }}
      >
        {NAV_ITEMS.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex flex-col items-center gap-1 px-4 py-2 rounded-xl transition-all ${
                isActive ? 'text-purple-400' : 'text-slate-500'
              }`
            }
          >
            <Icon size={20} />
            <span className="text-xs font-medium">{label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
