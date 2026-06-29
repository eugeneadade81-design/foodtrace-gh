import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'

/** App shell for authenticated screens: branded sidebar nav + top bar. */
export default function Layout() {
  const { logout } = useAuth()
  const navigate = useNavigate()

  const onLogout = () => {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          FoodTrace GH
          <span>Regulator Console</span>
        </div>
        <nav className="nav">
          <NavLink to="/dashboard" className="nav-link">Dashboard</NavLink>
          <NavLink to="/recalls" className="nav-link">Recalls</NavLink>
        </nav>
        <div className="sidebar-foot">FDA · GSA</div>
      </aside>

      <div className="main">
        <header className="topbar">
          <span className="topbar-title">Food Safety Regulator Portal</span>
          <button type="button" className="btn-ghost" onClick={onLogout}>Log out</button>
        </header>
        <main className="content">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
