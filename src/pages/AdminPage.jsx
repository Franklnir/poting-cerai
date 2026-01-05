import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient.js'
import { ITEMS } from '../data/instrument.js'
import { Download, LogOut, Search } from 'lucide-react'

function toCSV(rows){
  const header = ['id','created_at','role','custody','time_since_divorce','child_age_group','respondent_code', ...ITEMS.map((_,i)=>`q${i+1}`)]
  const lines = [header.join(',')]
  for (const r of rows){
    const ans = Array.isArray(r.answers) ? r.answers : (r.answers || [])
    const cells = [
      r.id,
      r.created_at,
      r.role,
      r.custody,
      r.time_since_divorce,
      r.child_age_group,
      (r.respondent_code || ''),
      ...ITEMS.map((_,i)=> ans[i] ?? '')
    ].map(v => {
      const s = String(v ?? '')
      if (s.includes(',') || s.includes('"') || s.includes('\n')) return `"${s.replaceAll('"','""')}"`
      return s
    })
    lines.push(cells.join(','))
  }
  return lines.join('\n')
}

export default function AdminPage() {
  const nav = useNavigate()
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [rows, setRows] = useState([])
  const [q, setQ] = useState('')
  const [selected, setSelected] = useState(null)

  async function load(){
    setLoading(true); setError('')
    try{
      const { data: { session } } = await supabase.auth.getSession()
      setSession(session)
      if (!session){
        nav('/admin/login')
        return
      }

      const { data, error } = await supabase
        .from('survey_responses')
        .select('id, created_at, role, custody, time_since_divorce, child_age_group, respondent_code, answers')
        .order('created_at', { ascending: false })
        .limit(500)

      if (error) throw error
      setRows(data || [])
      setSelected((data && data[0]) ? data[0] : null)
    }catch(e){
      setError(e?.message || 'Tidak bisa memuat data. Pastikan akun ini terdaftar di tabel admin_users.')
    }finally{
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  async function logout(){
    await supabase.auth.signOut()
    nav('/admin/login')
  }

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase()
    if (!s) return rows
    return rows.filter(r => (
      (r.respondent_code || '').toLowerCase().includes(s) ||
      (r.role || '').toLowerCase().includes(s) ||
      (r.custody || '').toLowerCase().includes(s) ||
      (r.time_since_divorce || '').toLowerCase().includes(s) ||
      (r.child_age_group || '').toLowerCase().includes(s) ||
      (r.id || '').toLowerCase().includes(s)
    ))
  }, [rows, q])

  function exportCSV(){
    const csv = toCSV(filtered)
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'survey_responses.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  const selAnswers = Array.isArray(selected?.answers) ? selected.answers : (selected?.answers || [])

  return (
    <div className="grid two" style={{ marginTop: 18 }}>
      <div className="card">
        <div className="row" style={{ justifyContent:'space-between', alignItems:'center' }}>
          <div>
            <div className="h1">Admin — Data Mentah</div>
            <p className="p">Hanya admin yang terdaftar di <span className="pill">admin_users</span> yang bisa membaca data ini.</p>
          </div>
          <div className="row">
            <button className="btn secondary" onClick={exportCSV} disabled={!filtered.length}>
              <Download size={16}/> CSV
            </button>
            <button className="btn pink" onClick={logout}>
              <LogOut size={16}/> Logout
            </button>
          </div>
        </div>

        {error ? <div className="notice" style={{ marginTop: 12 }}>{error}</div> : null}

        <div className="field">
          <div className="label">Cari</div>
          <div className="row" style={{ alignItems:'center' }}>
            <input className="input" value={q} onChange={(e)=>setQ(e.target.value)} placeholder="Cari kode, role, custody, dll." />
            <div className="pill"><Search size={14}/> {filtered.length}</div>
          </div>
        </div>

        <div className="hr" />

        <table className="table">
          <thead>
            <tr>
              <th>Waktu</th>
              <th>Kode</th>
              <th>Profil</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(r => (
              <tr key={r.id} onClick={()=>setSelected(r)} style={{ cursor:'pointer', background: selected?.id === r.id ? 'rgba(92,242,255,0.20)' : 'transparent' }}>
                <td style={{ whiteSpace:'nowrap' }}>{new Date(r.created_at).toLocaleString()}</td>
                <td>{r.respondent_code ? <span className="pill">{r.respondent_code}</span> : <span className="small">—</span>}</td>
                <td className="small">
                  <b>{r.role}</b> • {r.custody} • {r.time_since_divorce} • usia {r.child_age_group}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="small" style={{ marginTop: 10 }}>
          Klik baris untuk melihat detail jawaban di panel kanan.
        </div>
      </div>

      <div className="card">
        <div className="badge" style={{ background:'rgba(255,212,0,0.25)' }}>Detail Respon</div>
        {!selected ? (
          <div className="notice" style={{ marginTop: 12 }}>Belum ada data.</div>
        ) : (
          <div style={{ marginTop: 12 }}>
            <div className="row">
              <div className="kpi">
                <div className="small">Kode</div>
                <div className="v" style={{ fontSize: 18 }}>{selected.respondent_code || '—'}</div>
                <div className="small">{new Date(selected.created_at).toLocaleString()}</div>
              </div>
              <div className="kpi" style={{ background:'rgba(255,92,243,0.15)' }}>
                <div className="small">Profil</div>
                <div className="v" style={{ fontSize: 18 }}>{selected.role}</div>
                <div className="small">{selected.custody}</div>
              </div>
            </div>

            <div className="hr" />
            <table className="table">
              <thead><tr><th>#</th><th>Pernyataan</th><th>Skor</th></tr></thead>
              <tbody>
                {ITEMS.map((t,i)=>(
                  <tr key={i}>
                    <td>{i+1}</td>
                    <td>{t}</td>
                    <td><span className="pill">{selAnswers[i] ?? '—'}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
