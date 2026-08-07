import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth, ROLE_LABELS } from '../lib/auth.jsx'
import { classNames } from '../lib/utils.js'

const linkBase = 'px-3 py-2 rounded-md text-sm font-medium transition-colors'

function NavItem({ to, children, onClick }) {
  return (
    <NavLink
      to={to}
      end={to === '/'}
      onClick={onClick}
      className={({ isActive }) =>
        classNames(
          linkBase,
          isActive ? 'bg-ink-100 text-ink-900' : 'text-ink-500 hover:text-ink-900 hover:bg-ink-100',
        )
      }
    >
      {children}
    </NavLink>
  )
}

export default function Navbar() {
  const { currentUser, logout, isAdmin, isEnseignant, isEtudiant } = useAuth()
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)

  const initials = currentUser?.name
    ? currentUser.name
        .split(' ')
        .map((p) => p[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()
    : '?'

  const handleLogout = () => {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <header className="sticky top-0 z-40 bg-surface/95 backdrop-blur border-b border-ink-200">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="h-14 flex items-center justify-between gap-3">
          <div className="flex items-center gap-6">
            <NavLink to="/" className="flex items-center gap-2 shrink-0">
              <span className="w-7 h-7 rounded-md bg-accent flex items-center justify-center">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M4 21V7a2 2 0 012-2h12a2 2 0 012 2v14M4 21h16M4 21v-4a2 2 0 012-2h2a2 2 0 012 2v4m4 0v-4a2 2 0 012-2h2a2 2 0 012 2v4M9 9h.01M15 9h.01M9 13h.01M15 13h.01"
                    stroke="white"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>
              <span className="font-bold text-ink-900 text-[15px] hidden sm:block">SalleLibre</span>
            </NavLink>

            <nav className="hidden md:flex items-center gap-1">
              <NavItem to="/">Rechercher</NavItem>
              <NavItem to="/planning">Planning</NavItem>
              <NavItem to="/mes-reservations">Mes reservations</NavItem>
              {isAdmin && <NavItem to="/admin/demandes">File d'attente</NavItem>}
              {isAdmin && <NavItem to="/admin/salles">Salles</NavItem>}
              {isAdmin && <NavItem to="/admin/utilisateurs">Utilisateurs</NavItem>}
              {isAdmin && <NavItem to="/admin/tableau-de-bord">Tableau de bord</NavItem>}
            </nav>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 pl-2">
              <div className="w-8 h-8 rounded-full bg-accent-soft border border-ink-200 flex items-center justify-center text-xs font-bold text-ink-700">
                {initials}
              </div>
              <div className="hidden lg:block leading-tight">
                <p className="text-sm font-semibold text-ink-900">{currentUser?.name}</p>
                <p className="text-xs text-ink-500">{ROLE_LABELS[currentUser?.role]}</p>
              </div>
            </div>

            <button className="btn-secondary text-xs hidden sm:inline-flex" onClick={handleLogout}>
              Deconnexion
            </button>

            <button
              className="md:hidden btn-ghost"
              onClick={() => setMenuOpen((o) => !o)}
              aria-label="Menu"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path d="M4 6h16M4 12h16M4 18h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </button>
          </div>
        </div>

        {menuOpen && (
          <nav className="md:hidden flex flex-col gap-1 pb-3">
            <NavItem to="/" onClick={() => setMenuOpen(false)}>Rechercher</NavItem>
            <NavItem to="/planning" onClick={() => setMenuOpen(false)}>Planning</NavItem>
            <NavItem to="/mes-reservations" onClick={() => setMenuOpen(false)}>Mes reservations</NavItem>
            {isAdmin && <NavItem to="/admin/demandes" onClick={() => setMenuOpen(false)}>File d'attente</NavItem>}
            {isAdmin && <NavItem to="/admin/salles" onClick={() => setMenuOpen(false)}>Salles</NavItem>}
            {isAdmin && <NavItem to="/admin/utilisateurs" onClick={() => setMenuOpen(false)}>Utilisateurs</NavItem>}
            {isAdmin && <NavItem to="/admin/tableau-de-bord" onClick={() => setMenuOpen(false)}>Tableau de bord</NavItem>}
            <button className="text-left px-3 py-2 text-sm text-red-600 font-medium" onClick={handleLogout}>
              Deconnexion
            </button>
          </nav>
        )}
      </div>
      {(isEnseignant || isEtudiant) && (
        <div className="bg-accent-soft border-t border-ink-200">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-1.5 text-xs text-ink-700 flex items-center gap-1.5">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" className="shrink-0">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.8" />
              <path d="M12 8v4M12 16h.01" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
            {isEnseignant
              ? 'Profil Enseignant : vos reservations sont confirmees instantanement, sans validation.'
              : 'Profil Etudiant / Association : vos demandes sont soumises a la validation du service Logistique.'}
          </div>
        </div>
      )}
    </header>
  )
}
