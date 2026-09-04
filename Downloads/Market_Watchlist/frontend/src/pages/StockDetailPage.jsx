import React, { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import client from '../api/client'
import FreshnessTag from '../components/FreshnessTag'
import { formatPrice, formatPct, formatDateTime } from '../utils/format'

export default function StockDetailPage() {
  const { symbol } = useParams()
  const [snapshot, setSnapshot] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const fetchSnapshot = async () => {
      setLoading(true)
      try {
        const res = await client.get(`/market/snapshot/${symbol}`)
        setSnapshot(res.data)
      } catch (err) {
        console.error('Failed to load snapshot:', err)
        setError(err.response?.data?.detail || 'Stock snapshot unavailable')
      } finally {
        setLoading(false)
      }
    }

    if (symbol) {
      fetchSnapshot()
    }
  }, [symbol])

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 py-8 px-4 sm:px-6">
      <div className="max-w-2xl mx-auto">
        {/* Navigation */}
        <div className="mb-6">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-emerald-400 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            <span>Back to WatchPulse</span>
          </Link>
        </div>

        {loading ? (
          <div className="h-64 bg-slate-900/60 border border-slate-800 rounded-3xl animate-pulse" />
        ) : error ? (
          <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 text-center">
            <span className="text-3xl block mb-2">⚠️</span>
            <h2 className="text-lg font-bold text-white mb-1">Stock Details Unavailable</h2>
            <p className="text-xs text-slate-400 mb-4">{error}</p>
            <Link
              to="/"
              className="px-4 py-2 rounded-xl bg-slate-800 text-xs font-semibold hover:bg-slate-700"
            >
              Return to Dashboard
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Header Card */}
            <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl">
              <div className="flex items-start justify-between gap-4 mb-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h1 className="text-2xl font-black text-white tracking-tight">{snapshot.symbol}</h1>
                    <span className="text-xs uppercase font-semibold px-2 py-0.5 rounded bg-slate-800 text-slate-400">
                      NSE
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 font-medium">{snapshot.name || `${snapshot.symbol} Ltd`}</p>
                </div>

                <FreshnessTag freshness={snapshot.freshness} />
              </div>

              <div className="pt-4 border-t border-slate-800/80 flex items-baseline justify-between">
                <div>
                  <span className="text-xs text-slate-500 font-medium block uppercase tracking-wider mb-1">
                    Current Snapshot Price
                  </span>
                  <div className="text-3xl font-extrabold text-white">
                    {formatPrice(snapshot.price)}
                  </div>
                </div>

                {snapshot.change_pct !== undefined && snapshot.change_pct !== null && (
                  <div className="text-right">
                    <span className="text-xs text-slate-500 font-medium block uppercase tracking-wider mb-1">
                      Today's Move
                    </span>
                    <span className={`text-xl font-bold ${
                      snapshot.change_pct >= 0 ? 'text-emerald-400' : 'text-rose-400'
                    }`}>
                      {formatPct(snapshot.change_pct)}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Explanatory Context */}
            <div className="p-6 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                <span>⚡</span>
                <span>WatchPulse Monitoring Insights</span>
              </h2>

              <p className="text-sm text-slate-300 leading-relaxed">
                WatchPulse continuously records snapshots for {snapshot.symbol}. When you visit the dashboard, prices are compared against your exact last visit time rather than just yesterday's market close.
              </p>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800">
                  <span className="text-xs text-slate-400 block mb-1">Recorded Source</span>
                  <span className="text-sm font-bold text-slate-200 uppercase">
                    {snapshot.source || 'NSE Data Provider'}
                  </span>
                </div>

                <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800">
                  <span className="text-xs text-slate-400 block mb-1">Snapshot Timestamp</span>
                  <span className="text-sm font-bold text-slate-200">
                    {formatDateTime(snapshot.recorded_at)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
