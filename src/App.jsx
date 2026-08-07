import { Routes, Route, Navigate } from 'react-router-dom'
import Navbar from './components/Navbar.jsx'
import Search from './pages/Search.jsx'
import Planning from './pages/Planning.jsx'
import MyReservations from './pages/MyReservations.jsx'
import AdminQueue from './pages/AdminQueue.jsx'
import AdminRooms from './pages/AdminRooms.jsx'
import AdminDashboard from './pages/AdminDashboard.jsx'
import AdminUsers from './pages/AdminUsers.jsx'
import Login from './pages/Login.jsx'
import { useAuth } from './lib/auth.jsx'

function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth()
  if (loading) {
    return (
      <div className="py-20 text-center text-sm text-ink-500">Chargement de la session...</div>
    )
  }
  if (!isAuthenticated) return <Navigate to="/login" replace />
  return children
}

function AdminRoute({ children }) {
  const { isAdmin, loading, isAuthenticated } = useAuth()
  if (loading) {
    return (
      <div className="py-20 text-center text-sm text-ink-500">Chargement de la session...</div>
    )
  }
  if (!isAuthenticated) return <Navigate to="/login" replace />
  if (!isAdmin) return <Navigate to="/" replace />
  return children
}

function AppShell({ children }) {
  return (
    <div className="min-h-screen flex flex-col bg-canvas">
      <Navbar />
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8">{children}</main>
      <footer className="border-t border-ink-200 py-4">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 text-xs text-ink-500 flex flex-col sm:flex-row justify-between gap-1">
          <span>SalleLibre — Reservation de salles</span>
          <span>Service Logistique / Administration</span>
        </div>
      </footer>
    </div>
  )
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/*"
        element={
          <ProtectedRoute>
            <AppShell>
              <Routes>
                <Route path="/" element={<Search />} />
                <Route path="/planning" element={<Planning />} />
                <Route path="/mes-reservations" element={<MyReservations />} />
                <Route path="/admin/demandes" element={<AdminRoute><AdminQueue /></AdminRoute>} />
                <Route path="/admin/salles" element={<AdminRoute><AdminRooms /></AdminRoute>} />
                <Route path="/admin/tableau-de-bord" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
                <Route path="/admin/utilisateurs" element={<AdminRoute><AdminUsers /></AdminRoute>} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </AppShell>
          </ProtectedRoute>
        }
      />
    </Routes>
  )
}
