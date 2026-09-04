import React from 'react'

export default function FreshnessTag({ freshness }) {
  let dotColor = 'bg-emerald-400'
  let label = 'Live'
  let textColor = 'text-emerald-300'
  let bgClass = 'bg-emerald-950/60 border-emerald-800/40'

  if (freshness === 'delayed') {
    dotColor = 'bg-amber-400'
    label = 'Delayed'
    textColor = 'text-amber-300'
    bgClass = 'bg-amber-950/60 border-amber-800/40'
  } else if (freshness === 'unavailable') {
    dotColor = 'bg-rose-500 animate-pulse'
    label = 'Unavailable'
    textColor = 'text-rose-300'
    bgClass = 'bg-rose-950/60 border-rose-800/40'
  } else if (freshness === 'market_closed') {
    dotColor = 'bg-slate-400'
    label = 'Closed · 3:30 PM'
    textColor = 'text-slate-300'
    bgClass = 'bg-slate-800/80 border-slate-700/60'
  }

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${bgClass} ${textColor}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${dotColor}`}></span>
      {label}
    </span>
  )
}
