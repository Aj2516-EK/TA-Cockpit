function scoreColor(score: number): string {
  if (score >= 80) return '#10b981' // emerald-500
  if (score >= 60) return '#f59e0b' // amber-500
  return '#f43f5e' // rose-500
}

function scoreLabel(score: number): string {
  if (score >= 80) return 'Healthy'
  if (score >= 60) return 'At Risk'
  return 'Critical'
}

export function HealthScoreRing({ score }: { score: number }) {
  const size = 120
  const stroke = 10
  const radius = (size - stroke) / 2
  const circumference = 2 * Math.PI * radius
  const pct = Math.min(Math.max(score, 0), 100) / 100
  const offset = circumference * (1 - pct)
  const color = scoreColor(score)

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          {/* Track */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth={stroke}
            className="text-slate-900/8 dark:text-white/8"
          />
          {/* Progress */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            style={{ transition: 'stroke-dashoffset 0.6s ease' }}
          />
        </svg>
        {/* Center label */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-[24px] font-bold tracking-tight text-slate-900 dark:text-white">
            {score}
          </span>
        </div>
      </div>
      <div className="flex items-center gap-1.5">
        <span
          className="h-2 w-2 rounded-full"
          style={{ backgroundColor: color }}
        />
        <span className="text-[12px] font-medium text-slate-600 dark:text-slate-300">
          {scoreLabel(score)}
        </span>
      </div>
    </div>
  )
}
