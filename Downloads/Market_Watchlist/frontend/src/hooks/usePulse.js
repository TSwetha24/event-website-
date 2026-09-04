import { useState, useEffect, useCallback, useRef } from 'react'
import client from '../api/client'

export function usePulse() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const isFetchingRef = useRef(false)

  const fetchPulse = useCallback(async (isBackground = false) => {
    if (isFetchingRef.current) return
    isFetchingRef.current = true

    if (!isBackground) {
      setLoading(true)
    }

    try {
      const res = await client.get('/pulse')
      setData(res.data)
      setError(null)
    } catch (err) {
      console.error('Failed to fetch pulse data:', err)
      setError(err.response?.data?.detail || 'Failed to fetch pulse data')
    } finally {
      setLoading(false)
      isFetchingRef.current = false
    }
  }, [])

  useEffect(() => {
    fetchPulse(false)

    const interval = setInterval(() => {
      fetchPulse(true)
    }, 60000)

    return () => clearInterval(interval)
  }, [fetchPulse])

  return {
    data,
    loading,
    error,
    refresh: () => fetchPulse(false)
  }
}
