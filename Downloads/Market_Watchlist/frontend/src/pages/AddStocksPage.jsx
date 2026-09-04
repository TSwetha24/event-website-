import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import client from '../api/client'

export default function AddStocksPage() {
  const [query, setQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [watchlist, setWatchlist] = useState([])
  const [loadingWatchlist, setLoadingWatchlist] = useState(true)
  const [searching, setSearching] = useState(false)
  const [toast, setToast] = useState(null)

  const showToast = (message, type = 'success') => {
    setToast({ message, type })
    setTimeout(() => setToast(null), 3000)
  }

  // Fetch current user watchlist on mount
  const fetchWatchlist = async () => {
    try {
      setLoadingWatchlist(true)
      const res = await client.get('/watchlist')
      setWatchlist(res.data)
    } catch (err) {
      console.error('Failed to load watchlist:', err)
      showToast('Failed to load watchlist', 'error')
    } finally {
      setLoadingWatchlist(false)
    }
  }

  useEffect(() => {
    fetchWatchlist()
  }, [])

  // Debounced search
  useEffect(() => {
    if (!query.trim()) {
      setSearchResults([])
      return
    }

    const timer = setTimeout(async () => {
      setSearching(true)
      try {
        const res = await client.get(`/stocks/search?q=${encodeURIComponent(query.trim())}`)
        setSearchResults(res.data)
      } catch (err) {
        console.error('Search failed:', err)
      } finally {
        setSearching(false)
      }
    }, 250)

    return () => clearTimeout(timer)
  }, [query])

  const handleAddStock = async (symbol) => {
    try {
      await client.post('/watchlist/stocks', { symbol })
      showToast(`Added ${symbol} to watchlist`)
      fetchWatchlist()
    } catch (err) {
      const msg = err.response?.data?.detail || `Failed to add ${symbol}`
      showToast(msg, 'error')
    }
  }

  const handleRemoveStock = async (symbol) => {
    try {
      await client.delete(`/watchlist/stocks/${symbol}`)
      showToast(`Removed ${symbol} from watchlist`)
      fetchWatchlist()
    } catch (err) {
      const msg = err.response?.data?.detail || `Failed to remove ${symbol}`
      showToast(msg, 'error')
    }
  }

  const watchlistSymbols = new Set(watchlist.map(item => item.symbol))

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 py-8 px-4 sm:px-6">
      <div className="max-w-2xl mx-auto">
        {/* Header navigation */}
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
          <span className="text-xs text-slate-500 font-medium">Manage Watchlist</span>
        </div>

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

        <div className="mb-6">
          <h1 className="text-2xl font-black text-white tracking-tight">Add Stocks to Watch</h1>
          <p className="text-xs text-slate-400 mt-1">
            Search any NSE listed equity. WatchPulse will track snapshots and highlight contextual shifts.
          </p>
        </div>

        {/* Search Input */}
        <div className="relative mb-6">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by stock symbol or name (e.g. RELIANCE, TCS, ZOMATO)..."
            className="w-full bg-slate-900 border border-slate-800 focus:border-emerald-500 rounded-2xl pl-12 pr-4 py-3.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-colors"
          />
          <svg className="w-5 h-5 text-slate-500 absolute left-4 top-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          {searching && (
            <div className="absolute right-4 top-4">
              <span className="inline-block w-4 h-4 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin"></span>
            </div>
          )}
        </div>

        {/* Search Results */}
        {query.trim().length > 0 && (
          <div className="mb-8 bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 px-1">
              Search Results ({searchResults.length})
            </h3>

            {searchResults.length === 0 && !searching ? (
              <p className="text-xs text-slate-500 py-4 text-center">
                No stocks matching "{query}".
              </p>
            ) : (
              <div className="space-y-2">
                {searchResults.map((stock) => {
                  const alreadyAdded = watchlistSymbols.has(stock.symbol)
                  return (
                    <div
                      key={stock.symbol}
                      className="flex items-center justify-between p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 hover:border-slate-700 transition-colors"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white text-sm">{stock.symbol}</span>
                          <span className="text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
                            {stock.exchange}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 mt-0.5">{stock.name}</p>
                      </div>

                      <button
                        onClick={() => handleAddStock(stock.symbol)}
                        disabled={alreadyAdded}
                        className={`text-xs font-bold px-3.5 py-1.5 rounded-xl transition-all ${
                          alreadyAdded
                            ? 'bg-slate-800/80 text-slate-500 cursor-not-allowed'
                            : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-md shadow-emerald-500/10'
                        }`}
                      >
                        {alreadyAdded ? 'Added' : '+ Add'}
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* Current Watchlist */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">Your Active Watchlist</h2>
              <p className="text-xs text-slate-400">
                {watchlist.length} stocks currently monitored
              </p>
            </div>
            {watchlist.length > 0 && (
              <Link
                to="/"
                className="text-xs font-bold text-emerald-400 hover:underline"
              >
                View Feed →
              </Link>
            )}
          </div>

          {loadingWatchlist ? (
            <div className="py-8 text-center text-xs text-slate-500">Loading your stocks...</div>
          ) : watchlist.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-xs text-slate-400 mb-2">You haven't added any stocks yet.</p>
              <p className="text-[11px] text-slate-500">Search for Reliance, TCS, or Infosys above.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {watchlist.map((item) => (
                <div
                  key={item.symbol}
                  className="flex items-center justify-between p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 hover:bg-slate-950 transition-colors"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white text-sm">{item.symbol}</span>
                      <span className="text-[10px] font-medium text-slate-400 px-1.5 py-0.5 rounded bg-slate-800">
                        {item.exchange}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">{item.name}</p>
                  </div>

                  <button
                    onClick={() => handleRemoveStock(item.symbol)}
                    className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-950/30 transition-colors"
                    title="Remove stock"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
