import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import { BarChart3, ClipboardList, Shield } from 'lucide-react'

export default function Layout({ children }) {
  const loc = useLocation()
  return (
    <div className="container">
      <div className="nav">
        <div className="brand">
          <div className="badge">
            <ClipboardList size={16} />
            Potting Survey Neo
          </div>
          <div className="small">20 item • Supabase • Dashboard</div>
        </div>
        <div className="row">
          <NavLink to="/" active={loc.pathname === "/"} icon={<ClipboardList size={16} />} label="Survey" />
          <NavLink to="/public" active={loc.pathname.startsWith("/public")} icon={<BarChart3 size={16} />} label="Dashboard" />
          <NavLink to="/admin" active={loc.pathname.startsWith("/admin")} icon={<Shield size={16} />} label="Admin" />
        </div>
      </div>

      {children}

      <div style={{ marginTop: 18 }} className="small">
        Tips: jalankan dev server dengan <span className="pill">npm run dev -- --host</span> supaya bisa diakses HP/laptop lain satu Wi‑Fi.
      </div>
    </div>
  )
}

function NavLink({ to, active, icon, label }) {
  return (
    <Link to={to} className={`btn ${active ? "pink" : "secondary"}`} style={{ display: "inline-flex", gap: 8, alignItems: "center" }}>
      {icon}{label}
    </Link>
  )
}
