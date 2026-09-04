import React from 'react'

export default function AttentionBadge({ severity }) {
  const sev = (severity || 'LOW').toUpperCase()

  let badgeStyle = 'bg-blue-500/10 text-blue-400 border-blue-500/30'
  let dotColor = 'bg-blue-400'

  if (sev === 'HIGH') {
    badgeStyle = 'bg-rose-500/15 text-rose-300 border-rose-500/40'
    dotColor = 'bg-rose-400'
  } else if (sev === 'MEDIUM') {
    badgeStyle = 'bg-amber-500/15 text-amber-300 border-amber-500/40'
    dotColor = 'bg-amber-400'
  }

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold tracking-wider uppercase border ${badgeStyle}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${dotColor}`}></span>
      {sev} ATTENTION
    </span>
  )
}
