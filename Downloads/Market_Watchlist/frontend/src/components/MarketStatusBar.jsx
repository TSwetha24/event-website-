import React from 'react'
import { formatPct } from '../utils/format'

export default function MarketStatusBar({ marketStatus, benchmark }) {
  const isOpen = marketStatus === 'open'
  const isPre = marketStatus === 'pre-market'
  const benchChange = benchmark?.change_pct ?? 0
  const isBenchPos = benchChange >= 0

  return (
    <div className="w-full bg-slate-900/90 border-b border-slate-800 backdrop-blur-md px-4 py-2 text-xs flex flex-wrap items-center justify-between gap-3 text-slate-300">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="text-slate-400 font-medium">MARKET STATUS:</span>
          <div className="flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${
              isOpen ? 'bg-emerald-400 animate-pulse' : isPre ? 'bg-amber-400' : 'bg-slate-500'
            }`} />
            <span className={`font-semibold uppercase ${
              isOpen ? 'text-emerald-400' : isPre ? 'text-amber-400' : 'text-slate-400'
            }`}>
              {isOpen ? 'Open (NSE / BSE)' : isPre ? 'Pre-Market' : 'Closed (NSE)'}
            </span>
          </div>
        </div>

        {/* Demo Mode Badge */}
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30">
          <span>⚡</span>
          <span>Demo Simulation Mode</span>
        </span>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5">
          <span className="text-slate-400 font-medium">BENCHMARK:</span>
          <span className="font-semibold text-slate-200">{benchmark?.symbol || 'NIFTY 50'}</span>
          <span className={`font-semibold px-1.5 py-0.5 rounded text-[11px] ${
            isBenchPos
              ? 'text-emerald-400 bg-emerald-950/40 border border-emerald-800/40'
              : 'text-rose-400 bg-rose-950/40 border border-rose-800/40'
          }`}>
            {formatPct(benchChange)}
          </span>
        </div>
      </div>
    </div>
  )
}
