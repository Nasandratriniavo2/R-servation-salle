import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import { useAuth, ROLE_LABELS } from '../lib/auth.jsx'
import { classNames } from '../lib/utils.js'

const linkBase = 'px-3 py-2 rounded-md text-sm font-medium transition-colors'

function NavItem({ to, children }) {
  return (
    <NavLink
      to={to}
      end={to === '/'}
      className={({ isActive }) =>
        classNames(linkBase, isActive ? 'bg-ink-100 text-ink-900' : 'text-ink-500 hover:text-ink-900 hover:bg-ink-100')
      }
    >
      {children}
    </NavLink>
  )
}

export default function Navbar() {
  const { currentUser, users, switchUser, isAdmin, isEnseignant, isEtudiant } = useAuth()
  const [menuOpen, setMenuOpen] = useState(false)
  const [roleMenuOpen, setRoleMenuOpen] = useState(false)

  const initials = currentUser?.name
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

  return (
    <header className="sticky top-0 z-40 bg-surface/95 backdrop-blur border-b border-ink-200">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="h-14 flex items-center justify-between gap-3">
          <div className="flex items-center gap-6">
            <NavLink to="/" className="flex items-center gap-2 shrink-0">
              <span className="w-7 h-7 rounded-md bg-accent flex items-center justify-center">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M4 21V7a2 2 0 012-2h12a2 2 0 012 2v14M4 21h16M4 21v-4a2 2 0 012-2h2a2 2 0 012 2v4m4 0v-4a2 2 0 012-2h2a2 2 0 012 2v4M9 9h.01M15 9h.01M9 13h.01M15 13h.01" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </span>
              <span className="font-bold text-ink-900 text-[15px] hidden sm:block">SalleLibre</span>
            </NavLink>

            <nav className="hidden md:flex items-center gap-1">
              <NavItem to="/">Rechercher</NavItem>
              <NavItem to="/planning">Planning</NavItem>
              <NavItem to="/mes-reservations">Mes réservations</NavItem>
              {isAdmin && <NavItem to="/admin/demandes">File d'attente</NavItem>}
              {isAdmin && <NavItem to="/admin/salles">Salles</NavItem>}
              {isAdmin && <NavItem to="/admin/tableau-de-bord">Tableau de bord</NavItem>}
            </nav>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative hidden sm:block">
              <button
                onClick={() => setRoleMenuOpen((o) => !o)}
                className="btn-secondary text-xs"
                aria-haspopup="true"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><path d="M17 1l4 4-4 4M3 11V9a4 4 0 014-4h14M7 23l-4-4 4-4M21 13v2a4 4 0 01-4 4H3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                Changer de profil (démo)
              </button>
              {roleMenuOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setRoleMenuOpen(false)} />
                  <div className="absolute right-0 mt-2 w-64 card shadow-pop z-20 py-1.5">
                    <p className="px-3 pt-1 pb-2 text-xs font-semibold text-ink-500 uppercase tracking-wide">Barre de test — profils</p>
                    {users.map((u) => (
                      <button
                        key={u.id}
                        onClick={() => {
                          switchUser(u.id)
                          setRoleMenuOpen(false)
                        }}
                        className={classNames(
                          'w-full text-left px-3 py-2 text-sm hover:bg-ink-100 flex items-center justify-between',
                          currentUser && u.id === currentUser.id && 'bg-ink-100',
                        )}
                      >
                        <span>
                          <span className="block font-medium text-ink-900">{u.name}</span>
                          <span className="block text-xs text-ink-500">{ROLE_LABELS[u.role]}</span>
                        </span>
                        {currentUser && u.id === currentUser.id && (
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M20 6L9 17l-5-5" stroke="#059669" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                        )}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            <div className="flex items-center gap-2 pl-2 border-l border-ink-200">
              <div className="w-8 h-8 rounded-full bg-accent-soft border border-ink-200 flex items-center justify-center text-xs font-bold text-ink-700">
                {initials}
              </div>
              <div className="hidden lg:block leading-tight">
                <p className="text-sm font-semibold text-ink-900">{currentUser?.name}</p>
                <p className="text-xs text-ink-500">{ROLE_LABELS[currentUser?.role]}</p>
              </div>
            </div>

            <button className="md:hidden btn-ghost" onClick={() => setMenuOpen((o) => !o)} aria-label="Menu">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M4 6h16M4 12h16M4 18h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
            </button>
          </div>
        </div>

        {menuOpen && (
          <nav className="md:hidden flex flex-col gap-1 pb-3">
            <NavItem to="/">Rechercher</NavItem>
            <NavItem to="/planning">Planning</NavItem>
            <NavItem to="/mes-reservations">Mes réservations</NavItem>
            {isAdmin && <NavItem to="/admin/demandes">File d'attente</NavItem>}
            {isAdmin && <NavItem to="/admin/salles">Salles</NavItem>}
            {isAdmin && <NavItem to="/admin/tableau-de-bord">Tableau de bord</NavItem>}
            <div className="mt-2 pt-2 border-t border-ink-200">
              <p className="px-3 pb-1.5 text-xs font-semibold text-ink-500 uppercase tracking-wide">Changer de profil</p>
              {users.map((u) => (
                <button
                  key={u.id}
                  onClick={() => switchUser(u.id)}
                  className={classNames(
                    'w-full text-left px-3 py-2 text-sm rounded-md hover:bg-ink-100 flex items-center justify-between',
                    currentUser && u.id === currentUser.id && 'bg-ink-100',
                  )}
                >
                  <span>{u.name} — {ROLE_LABELS[u.role]}</span>
                </button>
              ))}
            </div>
          </nav>
        )}
      </div>
      {(isEnseignant || isEtudiant) && (
        <div className="bg-accent-soft border-t border-ink-200">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-1.5 text-xs text-ink-700 flex items-center gap-1.5">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" className="shrink-0"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.8" /><path d="M12 8v4M12 16h.01" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
            {isEnseignant
              ? 'Profil Enseignant : vos réservations sont confirmées instantanément, sans validation.'
              : 'Profil Étudiant / Association : vos demandes sont soumises à la validation du service Logistique.'}
          </div>
        </div>
      )}
    </header>
  )
}
