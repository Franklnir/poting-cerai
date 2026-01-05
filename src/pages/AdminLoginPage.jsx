import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient.js'
import { LogIn } from 'lucide-react'

export default function AdminLoginPage() {
  const nav = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function login(e){
    e.preventDefault()
    setError(''); setLoading(true)
    try{
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) throw error
      nav('/admin')
    }catch(err){
      setError(err?.message || 'Login gagal')
    }finally{
      setLoading(false)
    }
  }

  return (
    <div className="card" style={{ marginTop: 18, maxWidth: 560 }}>
      <div className="h1">Admin Login</div>
      <p className="p">Masuk untuk melihat data mentah (khusus admin yang didaftarkan di tabel <span className="pill">admin_users</span>).</p>

      {error ? <div className="notice" style={{ marginTop: 12 }}>{error}</div> : null}

      <form onSubmit={login} style={{ marginTop: 12 }}>
        <div className="field">
          <div className="label">Email</div>
          <input className="input" value={email} onChange={(e)=>setEmail(e.target.value)} placeholder="admin@email.com" />
        </div>
        <div className="field">
          <div className="label">Password</div>
          <input className="input" type="password" value={password} onChange={(e)=>setPassword(e.target.value)} placeholder="••••••••" />
        </div>

        <div className="hr" />
        <button className="btn" type="submit" disabled={loading} style={{ display:'inline-flex', gap:8, alignItems:'center' }}>
          <LogIn size={16} />
          {loading ? 'Masuk…' : 'Masuk'}
        </button>
      </form>
    </div>
  )
}
