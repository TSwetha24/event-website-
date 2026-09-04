export const formatPrice = (price) => {
  if (price === null || price === undefined || isNaN(price)) return '--'
  return `\u20b9${Number(price).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`
}

export const formatPct = (pct) => {
  if (pct === null || pct === undefined || isNaN(pct)) return '--'
  const val = Number(pct)
  return `${val >= 0 ? '+' : ''}${val.toFixed(2)}%`
}

export const formatRelativeTime = (isoString) => {
  if (!isoString) return ''
  const diff = Date.now() - new Date(isoString).getTime()
  if (diff < 0) return 'just now'
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)

  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  if (hours < 24) return `${hours}h ago`
  return `${days}d ago`
}

export const formatDateTime = (isoString) => {
  if (!isoString) return ''
  return new Date(isoString).toLocaleString('en-IN', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  })
}
