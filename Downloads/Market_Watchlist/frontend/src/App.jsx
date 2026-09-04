import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import AddStocksPage from './pages/AddStocksPage'
import StockDetailPage from './pages/StockDetailPage'
import HistoryPage from './pages/HistoryPage'

function ProtectedRoute({ children }) {
  const token = localStorage.getItem('watchpulse_token')
  if (!token) {
    return <Navigate to="/login" replace />
  }
  return children
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route
        path="/"
        element={
          <ProtectedRoute>
            <DashboardPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/add-stocks"
        element={
          <ProtectedRoute>
            <AddStocksPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/stock/:symbol"
        element={
          <ProtectedRoute>
            <StockDetailPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/history"
        element={
          <ProtectedRoute>
            <HistoryPage />
          </ProtectedRoute>
        }
      />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
