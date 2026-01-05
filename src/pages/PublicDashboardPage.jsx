import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import html2canvas from 'html2canvas'
import { supabase } from '../lib/supabaseClient.js'
import { ITEMS } from '../data/instrument.js'
import {
  PieChart, Pie, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  LineChart, Line, Cell, LabelList
} from 'recharts'
import { Download, RefreshCcw } from 'lucide-react'

function objToChart(obj){
  const entries = Object.entries(obj || {})
  return entries.map(([name, value]) => ({ name, value: Number(value) }))
}

function cssVar(name){
  if (typeof window === 'undefined') return ''
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim()
}

export default function PublicDashboardPage() {
  const [params] = useSearchParams()
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [selectedItem, setSelectedItem] = useState(0)
  const wrapRef = useRef(null)

  const fromSubmit = params.get('from') === 'submit'

  const palette = useMemo(() => ([
    cssVar('--c1') || '#3b82f6',
    cssVar('--c2') || '#22c55e',
    cssVar('--c3') || '#f97316',
    cssVar('--c4') || '#a855f7',
    cssVar('--c5') || '#ef4444',
    cssVar('--c6') || '#14b8a6',
    cssVar('--c7') || '#f43f5e',
    cssVar('--c8') || '#84cc16',
  ]), [])

  const roleColor = useMemo(() => ({
    'Ayah': cssVar('--role-ayah') || palette[0],
    'Ibu': cssVar('--role-ibu') || palette[2],
    'Wali/Lainnya': cssVar('--role-wali') || palette[3],
  }), [palette])

  const likertColors = useMemo(() => ([
    cssVar('--bad')    || '#ef4444', // 1
    cssVar('--warn')   || '#f59e0b', // 2
    cssVar('--accent') || '#ffd400', // 3
    cssVar('--ok')     || '#22c55e', // 4
    cssVar('--info')   || '#3b82f6', // 5
  ]), [])

  const tooltipStyle = useMemo(() => ({
    contentStyle: {
      border: '3px solid #0b0b0f',
      borderRadius: 14,
      boxShadow: '5px 5px 0 rgba(0,0,0,0.92)',
      background: '#fff',
      fontWeight: 900
    },
    labelStyle: { fontWeight: 900, color: '#0b0b0f' }
  }), [])

  async function fetchStats(){
    setLoading(true); setError('')
    try{
      const { data, error } = await supabase.rpc('get_survey_stats', { p_days: 30 })
      if (error) throw error
      setData(data)
    }catch(e){
      setError(e?.message || 'Gagal memuat statistik. Pastikan supabase.sql sudah dijalankan.')
    }finally{
      setLoading(false)
    }
  }

  useEffect(() => { fetchStats() }, [])

  const roleData = useMemo(() => objToChart(data?.role_counts), [data])
  const custodyData = useMemo(() => objToChart(data?.custody_counts), [data])
  const timeData = useMemo(() => objToChart(data?.time_counts), [data])
  const ageData = useMemo(() => objToChart(data?.age_counts), [data])
  const daily = useMemo(() => (data?.daily || []).map(d => ({ ...d, count: Number(d.count) })), [data])

  const likertCounts = data?.likert_counts?.[selectedItem] || {}
  const likertBar = useMemo(() => ([
    { label: 'STS(1)', count: Number(likertCounts['1'] || 0) },
    { label: 'TS(2)',  count: Number(likertCounts['2'] || 0) },
    { label: 'N(3)',   count: Number(likertCounts['3'] || 0) },
    { label: 'S(4)',   count: Number(likertCounts['4'] || 0) },
    { label: 'SS(5)',  count: Number(likertCounts['5'] || 0) },
  ]), [likertCounts])

  const averages = data?.likert_avg || []
  const avgGrid = useMemo(() => {
    return ITEMS.map((t, i) => ({
      idx: i+1,
      avg: Number(averages[i] || 0).toFixed(2),
      text: t,
    }))
  }, [averages])

  async function exportPNG(){
    if (!wrapRef.current) return
    const canvas = await html2canvas(wrapRef.current, { backgroundColor: null, scale: 2 })
    const link = document.createElement('a')
    link.download = 'dashboard-survey.png'
    link.href = canvas.toDataURL('image/png')
    link.click()
  }

  // ====== LABEL PIE: "Nama: Angka" tampil di chart (tanpa hover)
  const RADIAN = Math.PI / 180
  const renderPieLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, name, value }) => {
    if (!value) return null
    const r = innerRadius + (outerRadius - innerRadius) * 1.25
    const x = cx + r * Math.cos(-midAngle * RADIAN)
    const y = cy + r * Math.sin(-midAngle * RADIAN)
    const anchor = x > cx ? 'start' : 'end'
    return (
      <text
        x={x}
        y={y}
        textAnchor={anchor}
        dominantBaseline="central"
        fill="#0b0b0f"
        fontWeight={950}
        style={{ filter: 'drop-shadow(2px 2px 0 rgba(0,0,0,0.25))' }}
      >
        {name}: {value}
      </text>
    )
  }

  function LegendList({ rows, mode = 'palette' }){
    if (!rows?.length) return null
    return (
      <div className="legend">
        {rows.map((d, i) => {
          const swatchClass =
            mode === 'role'
              ? (d.name === 'Ayah' ? 'ayah' : d.name === 'Ibu' ? 'ibu' : 'wali')
              : `c${(i % 8) + 1}`

          return (
            <div className="legendItem" key={d.name}>
              <span className={`swatch ${swatchClass}`} />
              {d.name}: {d.value}
            </div>
          )
        })}
      </div>
    )
  }

  return (
    <div className="card" style={{ marginTop: 18 }}>
      <div ref={wrapRef}>
        <div className="row" style={{ justifyContent:'space-between', alignItems:'center' }}>
          <div>
            <div className="h1">Dashboard Publik (Agregat)</div>
            <p className="p">
              Transparan untuk penelitian: menampilkan ringkasan agregat semua responden (tanpa data mentah per orang).
            </p>
            {fromSubmit ? (
              <div className="notice info" style={{ marginTop: 10 }}>
                ✅ Terima kasih. Data kamu tersimpan. Di bawah ini hasil keseluruhan (agregat).
              </div>
            ) : null}
          </div>
          <div className="row">
            <button className="btn secondary" onClick={fetchStats} disabled={loading}>
              <RefreshCcw size={16}/> Refresh
            </button>
            <button className="btn" onClick={exportPNG}>
              <Download size={16}/> Export PNG
            </button>
          </div>
        </div>

        {error ? <div className="notice bad" style={{ marginTop: 12 }}>{error}</div> : null}

        <div className="row" style={{ marginTop: 14 }}>
          <div className="kpi info">
            <div className="small">Total respon</div>
            <div className="v">{data?.total ?? '—'}</div>
            <div className="small">Update: {data?.generated_at ? new Date(data.generated_at).toLocaleString() : '—'}</div>
          </div>
          <div className="kpi" style={{ background: 'rgba(92,242,255,0.25)' }}>
            <div className="small">Item dipilih</div>
            <div className="v" style={{ fontSize: 18 }}>#{selectedItem+1}</div>
            <div className="small">Rata-rata: {Number(averages?.[selectedItem] || 0).toFixed(2)}</div>
          </div>
        </div>

        {/* ===== Row 1 ===== */}
        <div className="grid two" style={{ marginTop: 14 }}>
          <div className="card">
            <div className="badge" style={{ background: 'rgba(255,212,0,0.25)' }}>Komposisi Peran</div>
            <div className="chartWrap">
              <div style={{ width: '100%', height: 300 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      dataKey="value"
                      data={roleData}
                      innerRadius={45}
                      outerRadius={85}
                      stroke="#0b0b0f"
                      strokeWidth={3}
                      labelLine={false}
                      label={renderPieLabel}
                    >
                      {roleData.map((d, i) => (
                        <Cell key={d.name} fill={roleColor[d.name] || palette[i % palette.length]} />
                      ))}
                    </Pie>
                    <Tooltip {...tooltipStyle} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
            <LegendList rows={roleData} mode="role" />
          </div>

          <div className="card">
            <div className="badge" style={{ background: 'rgba(92,242,255,0.25)' }}>Tren Respon (30 hari)</div>
            <div style={{ height: 260, marginTop: 10 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={daily}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                  <YAxis allowDecimals={false} />
                  <Tooltip {...tooltipStyle} />
                  <Line
                    type="monotone"
                    dataKey="count"
                    stroke={palette[0]}
                    strokeWidth={3}
                    dot={{ r: 3, stroke: '#0b0b0f', strokeWidth: 2 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* ===== Row 2 ===== */}
        <div className="grid two">
          <div className="card">
            <div className="badge" style={{ background: 'rgba(255,92,243,0.20)' }}>Tinggal Anak</div>
            <div style={{ height: 300, marginTop: 10 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={custodyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={0} />
                  <YAxis allowDecimals={false} />
                  <Tooltip {...tooltipStyle} />
                  <Bar dataKey="value" stroke="#0b0b0f" strokeWidth={3}>
                    {custodyData.map((d, i) => (
                      <Cell key={d.name} fill={palette[i % palette.length]} />
                    ))}
                    {/* ANGKA DI ATAS BAR */}
                    <LabelList dataKey="value" position="top" fill="#0b0b0f" fontWeight={950} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <LegendList rows={custodyData} />
          </div>

          <div className="card">
            <div className="badge" style={{ background: 'rgba(255,212,0,0.25)' }}>Lama Sejak Perceraian</div>
            <div style={{ height: 300, marginTop: 10 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={timeData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={0} />
                  <YAxis allowDecimals={false} />
                  <Tooltip {...tooltipStyle} />
                  <Bar dataKey="value" stroke="#0b0b0f" strokeWidth={3}>
                    {timeData.map((d, i) => (
                      <Cell key={d.name} fill={palette[i % palette.length]} />
                    ))}
                    {/* ANGKA DI ATAS BAR */}
                    <LabelList dataKey="value" position="top" fill="#0b0b0f" fontWeight={950} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <LegendList rows={timeData} />
          </div>
        </div>

        {/* ===== Row 3 ===== */}
        <div className="grid two">
          <div className="card">
            <div className="badge" style={{ background: 'rgba(92,242,255,0.25)' }}>Kelompok Usia Anak</div>
            <div style={{ height: 300, marginTop: 10 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={ageData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={0} />
                  <YAxis allowDecimals={false} />
                  <Tooltip {...tooltipStyle} />
                  <Bar dataKey="value" stroke="#0b0b0f" strokeWidth={3}>
                    {ageData.map((d, i) => (
                      <Cell key={d.name} fill={palette[i % palette.length]} />
                    ))}
                    {/* ANGKA DI ATAS BAR */}
                    <LabelList dataKey="value" position="top" fill="#0b0b0f" fontWeight={950} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <LegendList rows={ageData} />
          </div>

          <div className="card">
            <div className="badge" style={{ background: 'rgba(255,92,243,0.20)' }}>Distribusi Skor (Item terpilih)</div>

            <div className="field" style={{ marginTop: 10 }}>
              <div className="label">Pilih item (1–20)</div>
              <select className="select" value={selectedItem} onChange={(e)=>setSelectedItem(Number(e.target.value))}>
                {ITEMS.map((t, i) => (
                  <option key={i} value={i}>
                    {i+1}. {t.slice(0,55)}{t.length>55?'…':''}
                  </option>
                ))}
              </select>
              <div className="small">Pakai item ini untuk screenshot grafik per aspek.</div>
            </div>

            <div className="itemCard" style={{ marginTop: 12 }}>
              <div className="itemText">#{selectedItem+1}. {ITEMS[selectedItem]}</div>
            </div>

            <div style={{ height: 240, marginTop: 10 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={likertBar}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="label" />
                  <YAxis allowDecimals={false} />
                  <Tooltip {...tooltipStyle} />
                  <Bar dataKey="count" stroke="#0b0b0f" strokeWidth={3}>
                    {likertBar.map((d, i) => (
                      <Cell key={d.label} fill={likertColors[i]} />
                    ))}
                    {/* ANGKA DI ATAS BAR */}
                    <LabelList dataKey="count" position="top" fill="#0b0b0f" fontWeight={950} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="legend">
              {['1=STS','2=TS','3=N','4=S','5=SS'].map((t,i)=>(
                <div className="legendItem" key={t}>
                  <span className="swatch" style={{ background: likertColors[i] }} />
                  {t}: {likertBar[i]?.count ?? 0}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ===== Table mean ===== */}
        <div className="card" style={{ marginTop: 18 }}>
          <div className="badge" style={{ background: 'rgba(255,212,0,0.25)' }}>Ringkasan Rata-rata 20 Item</div>
          <p className="p" style={{ marginTop: 10 }}>
            Tabel ini cocok untuk dilampirkan/screenshot pada jurnal (mean per item).
          </p>
          <div className="hr" />
          <table className="table">
            <thead>
              <tr><th>#</th><th>Pernyataan</th><th>Rata-rata</th></tr>
            </thead>
            <tbody>
              {avgGrid.map(r => (
                <tr key={r.idx} onClick={()=>setSelectedItem(r.idx-1)} style={{ cursor:'pointer' }}>
                  <td>{r.idx}</td>
                  <td>{r.text}</td>
                  <td><span className="pill">{r.avg}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="small" style={{ marginTop: 10 }}>
            Klik baris untuk memilih item dan melihat grafik distribusi.
          </div>
        </div>
      </div>
    </div>
  )
}
