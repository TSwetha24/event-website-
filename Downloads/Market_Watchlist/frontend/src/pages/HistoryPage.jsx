import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import client from '../api/client'
import AttentionBadge from '../components/AttentionBadge'
import { formatPrice, formatPct } from '../utils/format'

export default function HistoryPage() {
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchEvents = async () => {
    setLoading(true)
    try {
      const res = await client.get('/events?days=7')
      setEvents(res.data)
    } catch (err) {
      console.error('Failed to load events:', err)
      setError(err.response?.data?.detail || 'Failed to load activity history')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchEvents()
  }, [])

  const handleAcknowledge = async (eventId) => {
    try {
      await client.patch(`/events/${eventId}/acknowledge`)
      setEvents(prev => prev.map(e => e.id === eventId ? { ...e, acknowledged: true } : e))
    } catch (err) {
      console.error('Failed to acknowledge event:', err)
    }
  }

  // Format friendly date label: "Today", "Yesterday", or "Sep 4, 2026"
  const getDateLabel = (dateStr) => {
    const eventDate = new Date(dateStr)
    const today = new Date()
    const yesterday = new Date()
    yesterday.setDate(today.getDate() - 1)

    const isSameDay = (d1, d2) =>
      d1.getFullYear() === d2.getFullYear() &&
      d1.getMonth() === d2.getMonth() &&
      d1.getDate() === d2.getDate()

    if (isSameDay(eventDate, today)) return 'Today'
    if (isSameDay(eventDate, yesterday)) return 'Yesterday'

    return eventDate.toLocaleDateString('en-IN', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  const formatEventTime = (dateStr) => {
    const t = new Date(dateStr).toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    })
    return `${t} · Simulation`
  }

  // Group events by friendly day
  const groupedEvents = events.reduce((acc, evt) => {
    const label = getDateLabel(evt.created_at)
    if (!acc[label]) acc[label] = []
    acc[label].push(evt)
    return acc
  }, {})

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 py-8 px-4 sm:px-6">
      <div className="max-w-3xl mx-auto">
        {/* Navigation */}
        <div className="flex items-center justify-between mb-8 pb-4 border-b border-slate-800">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-emerald-400 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            <span>Back to WatchPulse Feed</span>
          </Link>
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span className="w-2 h-2 rounded-full bg-amber-400"></span>
            <span className="font-medium">⚡ Demo Mode Activity Log</span>
          </div>
        </div>

        {/* Page Title & Mission Statement */}
        <div className="mb-8">
          <h1 className="text-2xl font-black text-white tracking-tight">Meaningful Activity History</h1>
          <p className="text-xs text-slate-400 mt-1 max-w-xl">
            A historical record of the meaningful changes that WatchPulse previously surfaced to your attention.
          </p>
        </div>

        {loading ? (
          <div className="space-y-4">
            <div className="h-28 bg-slate-900/60 border border-slate-800 rounded-2xl animate-pulse" />
            <div className="h-28 bg-slate-900/60 border border-slate-800 rounded-2xl animate-pulse" />
          </div>
        ) : error ? (
          <div className="p-6 rounded-2xl bg-rose-950/40 border border-rose-800/50 text-rose-300 text-xs">
            {error}
          </div>
        ) : events.length === 0 ? (
          /* Empty State */
          <div className="text-center py-20 px-6 bg-slate-900/70 border border-slate-800/80 rounded-3xl shadow-xl">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-2xl flex items-center justify-center mx-auto mb-4">
              ⚡
            </div>
            <h3 className="text-base font-bold text-white mb-2">No meaningful events yet</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto leading-relaxed">
              Your activity history will appear here when WatchPulse detects a significant change in your watchlist.
            </p>
            <div className="mt-6">
              <Link
                to="/"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-950 bg-emerald-400 hover:bg-emerald-300 px-4 py-2 rounded-xl transition-all shadow"
              >
                Go to Dashboard
              </Link>
            </div>
          </div>
        ) : (
          /* Grouped Event Timeline */
          <div className="space-y-8">
            {Object.entries(groupedEvents).map(([dateLabel, dayEvents]) => (
              <div key={dateLabel}>
                <div className="flex items-center gap-2 mb-4 px-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-sm shadow-emerald-400/50"></span>
                  <h2 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                    {dateLabel}
                  </h2>
                  <span className="text-[11px] text-slate-500 font-medium">
                    ({dayEvents.length} {dayEvents.length === 1 ? 'event' : 'events'})
                  </span>
                </div>

                <div className="space-y-4">
                  {dayEvents.map((evt) => {
                    const isPos = evt.stock_change_pct >= 0

                    return (
                      <div
                        key={evt.id}
                        className={`p-5 rounded-2xl bg-slate-900 border transition-all ${
                          evt.acknowledged
                            ? 'border-slate-800/70 opacity-80'
                            : 'border-slate-700/90 shadow-lg shadow-black/40'
                        }`}
                      >
                        {/* Top row: Attention Badge + Time (with Simulation tag) */}
                        <div className="flex items-center justify-between gap-3 mb-3">
                          <AttentionBadge severity={evt.severity} />

                          <div className="text-right">
                            <span className="text-xs font-medium text-slate-400">
                              {formatEventTime(evt.created_at)}
                            </span>
                          </div>
                        </div>

                        {/* Middle row: Large Symbol + Large Percentage Badge */}
                        <div className="flex items-baseline justify-between gap-4 my-1">
                          <div className="flex items-baseline gap-2">
                            <h3 className="text-xl font-black text-white tracking-tight">{evt.symbol}</h3>
                            {evt.name && (
                              <span className="text-xs text-slate-400 font-medium">
                                · {evt.name}
                              </span>
                            )}
                          </div>

                          <div className={`text-2xl font-black ${isPos ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {formatPct(evt.stock_change_pct)}
                          </div>
                        </div>

                        {/* Price Transition baseline */}
                        {evt.price_at_baseline && evt.price_current && (
                          <div className="text-xs text-slate-400 font-medium my-1">
                            <span>{formatPrice(evt.price_at_baseline)}</span>
                            <span className="text-slate-600 mx-1.5">→</span>
                            <span className="text-slate-200 font-bold">{formatPrice(evt.price_current)}</span>
                          </div>
                        )}

                        {/* Evidence-backed explanation text */}
                        <div className="mt-3 p-3 rounded-xl bg-slate-950/70 border border-slate-800/80 text-xs text-slate-200 leading-relaxed font-medium">
                          {evt.explanation}
                        </div>

                        {/* Footer info & review action */}
                        <div className="pt-3 mt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500">
                          <div>
                            {evt.relative_change_pct !== null && evt.relative_change_pct !== undefined && (
                              <span>
                                Relative alpha vs NIFTY 50: <strong className={evt.relative_change_pct >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                                  {formatPct(evt.relative_change_pct)}
                                </strong>
                              </span>
                            )}
                          </div>

                          <div>
                            {!evt.acknowledged ? (
                              <button
                                onClick={() => handleAcknowledge(evt.id)}
                                className="text-slate-400 hover:text-emerald-400 px-2 py-1 rounded hover:bg-slate-800 transition-colors font-semibold"
                              >
                                Mark as reviewed ✓
                              </button>
                            ) : (
                              <span className="text-slate-600 italic">Reviewed ✓</span>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
