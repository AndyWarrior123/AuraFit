import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip } from "recharts";
import { useXpHistory } from "../hooks/useActivities";

export function XpHistoryChart() {
    const { data, isLoading } = useXpHistory()

    if (isLoading || !data) {
        return <div className="h-32 bg-white/5 rounded-x1 animate-pulse" />
    }

    return (
        <ResponsiveContainer width="100%" height={120}>
      <AreaChart data={data} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
        <defs>
          <linearGradient id="xpGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#a855f7" stopOpacity={0.4} />
            <stop offset="95%" stopColor="#a855f7" stopOpacity={0} />
          </linearGradient>
        </defs>
        <XAxis
          dataKey="date"
          tick={{ fill: '#475569', fontSize: 10 }}
          tickFormatter={d => new Date(d).toLocaleDateString('en', { month: 'numeric', day: 'numeric' })}
          interval={3}
          axisLine={false}
          tickLine={false}
        />
        <YAxis hide />
        <Tooltip
          contentStyle={{
            background: '#12122d',
            border: '1px solid rgba(168,85,247,0.3)',
            borderRadius: 8,
            color: '#e2e8f0',
            fontSize: 12,
          }}
          formatter={(v: number) => [`+${v} XP`, 'XP Earned']}
          labelFormatter={d => new Date(d).toLocaleDateString('en', { weekday: 'short', month: 'short', day: 'numeric' })}
        />
        <Area
          type="monotone"
          dataKey="xp"
          stroke="#a855f7"
          strokeWidth={2}
          fill="url(#xpGrad)"
          dot={false}
          activeDot={{ r: 4, fill: '#a855f7', stroke: '#12122d', strokeWidth: 2 }}
        />
      </AreaChart>
    </ResponsiveContainer>
    )
}