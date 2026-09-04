import React, { useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { usePulse } from '../hooks/usePulse'
import client from '../api/client'
import MarketStatusBar from '../components/MarketStatusBar'
import PulseCard from '../components/PulseCard'
import QuietStock from '../components/QuietStock'
import WhyPanel from '../components/WhyPanel'
import { formatDateTime, formatRelativeTime, formatPct } from '../utils/format'

export default function DashboardPage() {
  const { data, loading, error, refresh } = usePulse()
  const [selectedStockForWhy, setSelectedStockForWhy] = useState(null)
  const [toast, setToast] = useState(null)
  const [simulating, setSimulating] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const [userName, setUserName] = useState(localStorage.getItem('watchpulse_user_name') || 'Investor')
  const [userEmail, setUserEmail] = useState(localStorage.getItem('watchpulse_user_email') || '')
  const dropdownRef = useRef(null)
  const navigate = useNavigate()

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await client.get('/auth/me')
        if (res.data?.name) {
          setUserName(res.data.name)
          localStorage.setItem('watchpulse_user_name', res.data.name)
        }
        if (res.data?.email) {
          setUserEmail(res.data.email)
          localStorage.setItem('watchpulse_user_email', res.data.email)
        }
      } catch (err) {
        // Token might be invalid or network issue
      }
    }
    fetchUser()
  }, [])

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setProfileOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const showToast = (message, type = 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }

  const handleLogout = () => {
    localStorage.removeItem('watchpulse_token')
    localStorage.removeItem('watchpulse_user_name')
    localStorage.removeItem('watchpulse_user_email')
    navigate('/login')
  }

  const handleRemoveStock = async (symbol) => {
    try {
      await client.delete(`/watchlist/stocks/${symbol}`)
      showToast(`Removed ${symbol} from watchlist`)
      refresh()
    } catch (err) {
      showToast(err.response?.data?.detail || `Failed to remove ${symbol}`, 'error')
    }
  }

  const handleSimulateDrift = async () => {
    setSimulating(true)
    try {
      await client.post('/market/simulate')
      showToast('Simulated new market tick')
      refresh()
    } catch (err) {
      showToast('Failed to simulate market tick', 'error')
    } finally {
      setSimulating(false)
    }
  }

  const getGreeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return 'Good morning'
    if (hour < 17) return 'Good afternoon'
    return 'Good evening'
  }

  const firstName = userName.split(' ')[0] || 'Investor'
  const totalStocksCount = (data?.meaningful_changes?.length || 0) + (data?.quiet_stocks?.length || 0)
  const attentionCount = data?.meaningful_changes?.length || 0
  const isMarketOpen = data?.market_status === 'open'
  const isBenchPos = (data?.benchmark?.change_pct ?? 0) >= 0

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Top market status ticker */}
      <MarketStatusBar 
        marketStatus={data?.market_status || 'open'} 
        benchmark={data?.benchmark} 
      />

      {/* Main Navigation Bar */}
      <header className="border-b border-slate-800/80 bg-slate-900/80 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between">
          {/* Logo & Tagline */}
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center text-xl shadow-sm group-hover:bg-emerald-500/20 transition-all">
              ⚡
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base font-black tracking-tight text-white">WatchPulse</span>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  Groww Edition
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium">Contextual Watchlist Intelligence</p>
            </div>
          </Link>

          {/* Right Header Navigation & Profile */}
          <div className="flex items-center gap-3">
            <button
              onClick={handleSimulateDrift}
              disabled={simulating}
              className="text-xs font-bold text-amber-400 hover:text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 px-3 py-2 rounded-xl transition-all flex items-center gap-1.5 shadow-sm"
              title="Simulate a new market tick to test price movements"
            >
              <span>{simulating ? '⏳' : '⚡'}</span>
              <span className="hidden sm:inline">Simulate Tick</span>
            </button>

            <Link
              to="/add-stocks"
              className="inline-flex items-center gap-1 text-xs font-bold text-slate-950 bg-emerald-400 hover:bg-emerald-300 px-3.5 py-2 rounded-xl transition-all shadow-md shadow-emerald-500/15"
            >
              <span>+ Add Stocks</span>
            </Link>

            {/* Notification Bell with event count badge */}
            <Link
              to="/history"
              className="relative p-2 rounded-xl bg-slate-800/80 hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors border border-slate-700/60"
              title="Activity History & Alerts"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              {attentionCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-500 text-[10px] font-extrabold text-white flex items-center justify-center animate-pulse">
                  {attentionCount}
                </span>
              )}
            </Link>

            {/* Profile Dropdown */}
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setProfileOpen(!profileOpen)}
                className="flex items-center gap-2 p-1.5 pr-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700/60 transition-colors text-left cursor-pointer"
              >
                <div className="w-7 h-7 rounded-lg bg-emerald-500 text-slate-950 font-black text-xs flex items-center justify-center shadow">
                  {firstName.charAt(0).toUpperCase()}
                </div>
                <span className="text-xs font-bold text-slate-200 hidden md:inline max-w-[120px] truncate">
                  {userName}
                </span>
                <svg className="w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {profileOpen && (
                <div className="absolute right-0 mt-2 w-56 rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl p-2 z-50 animate-in fade-in zoom-in-95 duration-100">
                  <div className="p-3 border-b border-slate-800">
                    <p className="text-xs font-extrabold text-white truncate">{userName}</p>
                    <p className="text-[11px] text-slate-400 truncate mt-0.5">{userEmail || 'Active User'}</p>
                    <div className="mt-2 flex items-center gap-1.5 text-[10px] font-semibold text-emerald-400 bg-emerald-950/50 px-2 py-0.5 rounded-md border border-emerald-800/40">
                      <span>●</span>
                      <span>{totalStocksCount} stocks monitored</span>
                    </div>
                  </div>

                  <div className="py-1">
                    <Link
                      to="/add-stocks"
                      onClick={() => setProfileOpen(false)}
                      className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-800/80 rounded-lg transition-colors"
                    >
                      <span>⚙️</span>
                      <span>Watchlist Management</span>
                    </Link>
                    <Link
                      to="/history"
                      onClick={() => setProfileOpen(false)}
                      className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-800/80 rounded-lg transition-colors"
                    >
                      <span>📜</span>
                      <span>Activity History</span>
                    </Link>
                  </div>

                  <div className="pt-1 border-t border-slate-800">
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2 px-3 py-2 text-xs font-bold text-rose-400 hover:bg-rose-950/40 rounded-lg transition-colors text-left"
                    >
                      <span>🚪</span>
                      <span>Sign Out</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 py-6">
        {/* Toast */}
        {toast && (
          <div className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl text-xs font-bold shadow-2xl flex items-center gap-2 transition-all ${
            toast.type === 'error'
              ? 'bg-rose-950 border border-rose-800 text-rose-300'
              : 'bg-emerald-950 border border-emerald-800 text-emerald-300'
          }`}>
            <span>{toast.type === 'error' ? '⚠️' : '✓'}</span>
            <span>{toast.message}</span>
          </div>
        )}

        {/* Loading state skeleton */}
        {loading && !data && (
          <div className="space-y-6">
            <div className="h-24 bg-slate-900/60 border border-slate-800/80 rounded-3xl animate-pulse"></div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="h-28 bg-slate-900/60 border border-slate-800/80 rounded-2xl animate-pulse"></div>
              <div className="h-28 bg-slate-900/60 border border-slate-800/80 rounded-2xl animate-pulse"></div>
              <div className="h-28 bg-slate-900/60 border border-slate-800/80 rounded-2xl animate-pulse"></div>
            </div>
          </div>
        )}

        {/* Error notification */}
        {error && (
          <div className="mb-6 p-4 rounded-2xl bg-rose-950/40 border border-rose-800/50 flex items-center justify-between text-rose-300 text-sm">
            <div className="flex items-center gap-3">
              <span className="text-xl">⚠️</span>
              <div>
                <p className="font-semibold">Unable to refresh pulse</p>
                <p className="text-xs text-rose-400/80">{error}</p>
              </div>
            </div>
            <button
              onClick={refresh}
              className="px-3 py-1.5 bg-rose-900/40 hover:bg-rose-900/60 border border-rose-700/50 rounded-lg text-xs font-semibold"
            >
              Retry
            </button>
          </div>
        )}

        {/* Data warning banner */}
        {data?.data_warning && (
          <div className="mb-6 p-3.5 rounded-xl bg-amber-950/40 border border-amber-800/50 flex items-center gap-3 text-amber-300 text-xs">
            <span className="text-base">⚡</span>
            <span>{data.data_warning}</span>
          </div>
        )}

        {data && (
          <>
            {/* Top Greeting & Portfolio Overview */}
            <div className="mb-6">
              <h2 className="text-2xl font-black text-white tracking-tight">
                {getGreeting()}, {firstName} 👋
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Here's what meaningfully changed across your watchlist since your previous visit.
              </p>

              {/* 3 Summary Overview Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 mt-4">
                {/* 1. Watchlist Count */}
                <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-sm flex flex-col justify-between">
                  <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                    <span>Watchlist</span>
                    <span className="text-slate-500">📈</span>
                  </div>
                  <div>
                    <span className="text-2xl font-black text-white">{totalStocksCount}</span>
                    <span className="text-xs text-slate-400 ml-1.5">Stocks watching</span>
                  </div>
                  <div className="mt-2 text-[11px] text-emerald-400 font-medium flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                    <span>Continuous background monitoring</span>
                  </div>
                </div>

                {/* 2. Attention Count */}
                <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-sm flex flex-col justify-between">
                  <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                    <span>Attention</span>
                    <span className="text-slate-500">🎯</span>
                  </div>
                  <div>
                    <span className="text-2xl font-black text-white">{attentionCount}</span>
                    <span className="text-xs text-slate-400 ml-1.5">
                      {attentionCount === 1 ? 'Event detected' : 'Events detected'}
                    </span>
                  </div>
                  <div className="mt-2 text-[11px] font-medium text-slate-400">
                    {attentionCount > 0 ? (
                      <span className="text-rose-400 font-semibold">Requires your review</span>
                    ) : (
                      <span className="text-slate-400">All stocks within normal noise</span>
                    )}
                  </div>
                </div>

                {/* 3. Market Snapshot Card */}
                <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-sm flex flex-col justify-between">
                  <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                    <span>Market Snapshot</span>
                    <span className="text-slate-500">🏛️</span>
                  </div>
                  <div className="flex items-baseline justify-between">
                    <div>
                      <span className="text-xs font-bold text-slate-300 block">{data?.benchmark?.symbol || 'NIFTY 50'}</span>
                      <span className={`text-2xl font-black ${isBenchPos ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {formatPct(data?.benchmark?.change_pct)}
                      </span>
                    </div>
                  </div>
                  <div className="mt-2 text-[11px] text-slate-400 font-medium flex items-center gap-1.5">
                    <span className={`w-1.5 h-1.5 rounded-full ${isMarketOpen ? 'bg-emerald-400' : 'bg-slate-500'}`}></span>
                    <span>{isMarketOpen ? 'Market Open (NSE)' : 'Market Closed · 3:30 PM'}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Baseline Context Ribbon */}
            <div className="mb-6 p-4 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900/90 to-slate-950 border border-slate-800/90 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md">
              <div className="flex items-center gap-3">
                <span className="text-lg">👀</span>
                <div>
                  <h3 className="text-sm font-extrabold text-white tracking-tight">
                    Since You Last Checked
                  </h3>
                  <p className="text-xs text-slate-400">
                    {data.first_visit ? (
                      <span className="text-emerald-400 font-medium">Starting baseline established just now</span>
                    ) : (
                      <>
                        <span>Previous visit: <strong className="text-slate-200">{formatDateTime(data.since)}</strong></span>
                        <span className="text-slate-600 mx-1.5">•</span>
                        <span className="text-emerald-400 font-medium">({formatRelativeTime(data.since)})</span>
                      </>
                    )}
                  </p>
                </div>
              </div>

              <div className="text-left sm:text-right">
                <span className="text-xs font-extrabold px-3 py-1 rounded-xl bg-slate-800 border border-slate-700 text-slate-200">
                  {attentionCount} meaningful {attentionCount === 1 ? 'change' : 'changes'}
                </span>
              </div>
            </div>

            {/* Empty watchlist state */}
            {totalStocksCount === 0 && (
              <div className="text-center py-16 px-4 rounded-3xl border border-dashed border-slate-800 bg-slate-900/30">
                <span className="text-4xl block mb-3">📈</span>
                <h3 className="text-lg font-bold text-white mb-1">Your Watchlist is Empty</h3>
                <p className="text-xs text-slate-400 max-w-md mx-auto mb-6">
                  Add 5 to 10 stocks you care about. WatchPulse will watch them continuously and only alert you to meaningful changes.
                </p>
                <Link
                  to="/add-stocks"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-500/20 transition-all"
                >
                  + Add Your First Stocks
                </Link>
              </div>
            )}

            {/* Meaningful Changes Section */}
            {data.meaningful_changes?.length > 0 && (
              <section className="mb-8">
                <div className="flex items-center justify-between mb-3.5">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>
                    Meaningful Market Changes ({data.meaningful_changes.length})
                  </h3>
                  <span className="text-[11px] text-slate-400 font-medium">
                    Ranked by Contextual Significance
                  </span>
                </div>

                <div className="grid grid-cols-1 gap-4">
                  {data.meaningful_changes.map((stock) => (
                    <PulseCard
                      key={stock.symbol}
                      stock={stock}
                      onWhyClick={(s) => setSelectedStockForWhy(s)}
                      onRemove={handleRemoveStock}
                    />
                  ))}
                </div>
              </section>
            )}

            {/* Quiet Stocks Section (No Meaningful Changes) */}
            {data.quiet_stocks?.length > 0 && (
              <section className="mb-8">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                      <span>✓</span>
                      <span>No Significant Change ({data.quiet_stocks.length})</span>
                    </h3>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Your watchlist is moving within normal market variance.
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  {data.quiet_stocks.map((stock) => (
                    <QuietStock
                      key={stock.symbol}
                      stock={stock}
                      onRemove={handleRemoveStock}
                    />
                  ))}
                </div>
              </section>
            )}

            {/* Bottom quick links */}
            <div className="pt-6 border-t border-slate-900 flex flex-wrap items-center justify-between text-xs text-slate-500 gap-4">
              <span>Auto-refreshing every 60 seconds with live market snapshots</span>
              <button
                onClick={refresh}
                className="hover:text-emerald-400 flex items-center gap-1.5 transition-colors font-medium"
              >
                <span>↻ Refresh Feed</span>
              </button>
            </div>
          </>
        )}
      </main>

      {/* Slide-out Why Panel */}
      {selectedStockForWhy && (
        <WhyPanel
          stock={selectedStockForWhy}
          onClose={() => setSelectedStockForWhy(null)}
        />
      )}
    </div>
  )
}
