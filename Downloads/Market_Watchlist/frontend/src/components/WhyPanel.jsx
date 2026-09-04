import React, { useEffect } from 'react'
import FreshnessTag from './FreshnessTag'
import AttentionBadge from './AttentionBadge'
import { formatPrice, formatPct } from '../utils/format'

export default function WhyPanel({ stock, onClose }) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  if (!stock) return null

  const isStockPos = stock.stock_change_pct >= 0
  const isRelPos = stock.relative_change_pct >= 0

  return (
    <div className="fixed inset-0 z-50 overflow-hidden flex justify-end">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="relative w-full max-w-md bg-slate-900 border-l border-slate-800 h-full shadow-2xl p-6 overflow-y-auto flex flex-col justify-between z-10 animate-in slide-in-from-right duration-200">
        <div>
          {/* Header */}
          <div className="flex items-start justify-between gap-4 pb-5 border-b border-slate-800">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-xl font-bold text-white tracking-tight">{stock.symbol}</h3>
                <AttentionBadge severity={stock.severity} />
              </div>
              <p className="text-xs text-slate-400 font-medium">{stock.name}</p>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              aria-label="Close"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Section: Why you're seeing this */}
          <div className="mt-6">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-emerald-400 text-sm">✦</span>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                Why You're Seeing This
              </h4>
            </div>

            <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700/60 shadow-inner">
              <p className="text-sm font-medium text-slate-200 leading-relaxed">
                {stock.explanation}
              </p>
            </div>
          </div>

          {/* Metrics comparison */}
          <div className="mt-6 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Contextual Movement
            </h4>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-3.5 rounded-xl bg-slate-800/50 border border-slate-800">
                <span className="text-xs text-slate-400 block mb-1">Stock Movement</span>
                <span className={`text-lg font-bold ${isStockPos ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {formatPct(stock.stock_change_pct)}
                </span>
                <span className="text-[11px] text-slate-500 block mt-1">
                  {formatPrice(stock.price_baseline)} → {formatPrice(stock.price_current)}
                </span>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-800/50 border border-slate-800">
                <span className="text-xs text-slate-400 block mb-1">Market Benchmark</span>
                <span className={`text-lg font-bold ${stock.benchmark_change_pct >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {formatPct(stock.benchmark_change_pct)}
                </span>
                <span className="text-[11px] text-slate-500 block mt-1">
                  NIFTY 50 Movement
                </span>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs text-slate-400 font-medium block">Relative Excess Alpha</span>
                  <span className="text-[11px] text-slate-500">Stock move minus benchmark move</span>
                </div>
                <div className="text-right">
                  <span className={`text-base font-extrabold ${isRelPos ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {isRelPos ? '▲ ' : '▼ '}{formatPct(stock.relative_change_pct)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Data Freshness details */}
          <div className="mt-6 p-4 rounded-xl bg-slate-800/30 border border-slate-800/80">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs text-slate-400 font-medium">Data Freshness</span>
                <span className="text-[11px] text-slate-500 block mt-0.5">
                  Updated {stock.data_age_seconds ?? 0}s ago
                </span>
              </div>
              <FreshnessTag freshness={stock.freshness} />
            </div>
          </div>
        </div>

        {/* Footer info banner */}
        <div className="pt-6 border-t border-slate-800 mt-6 text-center">
          <p className="text-[11px] text-slate-500 leading-normal">
            WatchPulse identifies observable statistical movements relative to your previous visit. Not investment advice.
          </p>
        </div>
      </div>
    </div>
  )
}
