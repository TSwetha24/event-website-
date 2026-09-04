import React from 'react'
import AttentionBadge from './AttentionBadge'
import FreshnessTag from './FreshnessTag'
import { formatPrice, formatPct } from '../utils/format'

export default function PulseCard({ stock, onWhyClick, onRemove }) {
  const isPos = stock.stock_change_pct >= 0
  const isRelPos = stock.relative_change_pct >= 0
  const sevIcon = stock.severity === 'HIGH' ? '🔴' : stock.severity === 'MEDIUM' ? '🟡' : '🔵'

  // Determine clear headline
  const headline =
    stock.event_type === 'outperform'
      ? 'Outperformed the broader market'
      : stock.event_type === 'underperform'
      ? 'Underperformed the broader market'
      : Math.abs(stock.stock_change_pct) >= 3.0
      ? 'Significant price movement'
      : 'Notable market movement'

  return (
    <div className="relative overflow-hidden rounded-2xl bg-slate-900 border border-slate-800/80 hover:border-slate-700 transition-all duration-200 shadow-lg hover:shadow-xl group">
      {/* Accent left indicator line */}
      <div 
        className={`absolute top-0 bottom-0 left-0 w-1.5 ${
          isPos ? 'bg-emerald-500' : 'bg-rose-500'
        }`} 
      />

      <div className="p-5 pl-6">
        {/* Header: Status Icon + Symbol + Headline + Remove */}
        <div className="flex items-start justify-between gap-3 mb-2">
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-base">{sevIcon}</span>
              <h3 className="text-lg font-extrabold text-white tracking-tight">{stock.symbol}</h3>
              {stock.name && (
                <span className="text-xs text-slate-400 font-medium truncate max-w-[200px] hidden sm:inline">
                  · {stock.name}
                </span>
              )}
              <AttentionBadge severity={stock.severity} />
            </div>
            <p className="text-xs font-semibold text-emerald-400 pl-6">
              {headline}
            </p>
          </div>

          <div className="flex items-start gap-3">
            <div className="text-right">
              <div className={`text-xl font-black ${isPos ? 'text-emerald-400' : 'text-rose-400'}`}>
                {formatPct(stock.stock_change_pct)}
              </div>
              <div className="text-[11px] text-slate-400 font-medium">
                vs your last visit
              </div>
            </div>

            {onRemove && (
              <button
                onClick={() => onRemove(stock.symbol)}
                className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-950/40"
                title={`Remove ${stock.symbol} from watchlist`}
                aria-label={`Remove ${stock.symbol}`}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* Price transition */}
        <div className="flex items-center justify-between py-2.5 px-3.5 my-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80 text-xs">
          <div className="flex items-center gap-2 text-slate-300 font-medium">
            <span className="text-slate-400">{formatPrice(stock.price_baseline)}</span>
            <span className="text-slate-600 font-bold">→</span>
            <span className="font-bold text-white text-sm">{formatPrice(stock.price_current)}</span>
            <span className={`font-extrabold ml-1 ${isPos ? 'text-emerald-400' : 'text-rose-400'}`}>
              ({formatPct(stock.stock_change_pct)})
            </span>
          </div>

          <div className="text-[11px] text-slate-400 hidden sm:flex items-center gap-2">
            <span>NIFTY 50: <strong className="text-slate-200">{formatPct(stock.benchmark_change_pct)}</strong></span>
            <span className="text-slate-600">•</span>
            <span>Relative move: <strong className={isRelPos ? 'text-emerald-400' : 'text-rose-400'}>
              {formatPct(stock.relative_change_pct)}
            </strong></span>
          </div>
        </div>

        {/* Contextual Explanation preview */}
        <div className="text-xs text-slate-300 bg-slate-800/40 rounded-xl p-3 my-2 border border-slate-800/50 leading-relaxed">
          <span className="text-emerald-400 font-semibold mr-1.5">⚡ Context:</span>
          {stock.explanation}
        </div>

        {/* Footer: Freshness + Why button */}
        <div className="flex items-center justify-between pt-2 mt-2">
          <FreshnessTag freshness={stock.freshness} />

          <button
            onClick={() => onWhyClick(stock)}
            className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-400 hover:text-emerald-300 bg-emerald-950/40 hover:bg-emerald-900/60 border border-emerald-800/40 px-3 py-1.5 rounded-lg transition-all"
          >
            <span>Why you're seeing this</span>
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}
