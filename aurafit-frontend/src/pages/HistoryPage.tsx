import { motion } from 'framer-motion'
import { useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useActivityHistory } from '../hooks/useActivities'
import { ActivityCard, ActivityCardSkeleton, EmptyQuestLog } from '../components/ActivityCard'

export function HistoryPage() {
  const [page, setPage] = useState(1)
  const { data: activities, isLoading } = useActivityHistory(page)

  return (
    <div className="min-h-screen p-4 md:p-6 pb-24 md:pb-6 space-y-5">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-xl font-bold text-white flex items-center gap-2">
          <span className="neon-text-purple">📊</span> Activity History
        </h1>
        <p className="text-sm text-slate-500 mt-0.5">Every quest you've completed</p>
      </motion.div>

      <div className="glow-card rounded-2xl p-5">
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 6 }).map((_, i) => <ActivityCardSkeleton key={i} />)}
          </div>
        ) : activities?.length ? (
          <>
            <div className="space-y-2">
              {activities.map((a, i) => (
                <ActivityCard key={a.id} activity={a} index={i} />
              ))}
            </div>
            <div className="flex items-center justify-between mt-6 pt-4 border-t border-white/5">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft size={16} /> Previous
              </button>
              <span className="text-sm text-slate-500">Page {page}</span>
              <button
                onClick={() => setPage(p => p + 1)}
                disabled={!activities || activities.length < 20}
                className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                Next <ChevronRight size={16} />
              </button>
            </div>
          </>
        ) : (
          <EmptyQuestLog />
        )}
      </div>
    </div>
  )
}
