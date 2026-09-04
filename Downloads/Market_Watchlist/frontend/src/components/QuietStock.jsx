import React from 'react'
import FreshnessTag from './FreshnessTag'
import { formatPrice, formatPct } from '../utils/format'

export default function QuietStock({ stock, onRemove }) {
  const isPos = stock.stock_change_pct >= 0

  return (
    <div className="flex items-center justify-between p-3 px-4 rounded-xl bg-slate-900/50 border border-slate-800/60 hover:bg-slate-900 transition-colors group">
      <div className="flex items-center gap-2.5">
        <span className="w-5 h-5 rounded-full bg-slate-800 flex items-center justify-center text-xs text-slate-400">
          ✓
        </span>
        <span className="font-semibold text-slate-300 text-sm">{stock.symbol}</span>
      </div>

      <div className="flex items-center gap-4">
        <span className="text-sm font-medium text-slate-400">
          {formatPrice(stock.price_current)}
        </span>

        <span className={`text-xs font-semibold px-2 py-0.5 rounded ${
          isPos ? 'text-emerald-400/90 bg-emerald-950/30' : 'text-rose-400/90 bg-rose-950/30'
        }`}>
          {formatPct(stock.stock_change_pct)}
        </span>

        <FreshnessTag freshness={stock.freshness} />

        {onRemove && (
          <button
            onClick={() => onRemove(stock.symbol)}
            className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded text-slate-500 hover:text-rose-400"
            title={`Remove ${stock.symbol}`}
            aria-label={`Remove ${stock.symbol}`}
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>
    </div>
  )
}
