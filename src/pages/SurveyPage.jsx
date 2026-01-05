import React, { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import LikertItem from '../components/LikertItem.jsx'
import { supabase } from '../lib/supabaseClient.js'
import { ITEMS, INSTRUMENT_VERSION } from '../data/instrument.js'

const ROLE_OPTIONS = ['Ayah','Ibu','Wali/Lainnya']
const CUSTODY_OPTIONS = ['Tinggal dengan Ayah','Tinggal dengan Ibu','Bergantian (shared)','Keluarga besar/wali','Lainnya']
const TIME_OPTIONS = ['< 6 bulan','6–12 bulan','1–2 tahun','3–5 tahun','> 5 tahun']
const AGE_OPTIONS = ['0–5','6–12','13–17','18+']

export default function SurveyPage() {
  const nav = useNavigate()
  const [step, setStep] = useState(0) // 0 profile, 1-4 questions pages, 5 review
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [role, setRole] = useState('Ayah')
  const [custody, setCustody] = useState('Tinggal dengan Ayah')
  const [timeSince, setTimeSince] = useState('1–2 tahun')
  const [ageGroup, setAgeGroup] = useState('6–12')
  const [respondentCode, setRespondentCode] = useState('')

  const [answers, setAnswers] = useState(() => Array(20).fill(null))

  const pageQuestions = useMemo(() => {
    // 4 pages x 5 items
    return [
      { title: 'Bagian A (1–5)', idx: [0,1,2,3,4] },
      { title: 'Bagian B (6–10)', idx: [5,6,7,8,9] },
      { title: 'Bagian C (11–15)', idx: [10,11,12,13,14] },
      { title: 'Bagian D (16–20)', idx: [15,16,17,18,19] },
    ]
  }, [])

  const totalAnswered = answers.filter(Boolean).length
  const progress = step === 0 ? 0 : Math.min(100, Math.round((totalAnswered/20)*100))

  function setAnswer(i, v){
    setAnswers(prev => {
      const copy = [...prev]
      copy[i] = v
      return copy
    })
  }

  function next(){
    setError('')
    if (step === 0){
      if (!ROLE_OPTIONS.includes(role) || !CUSTODY_OPTIONS.includes(custody) || !TIME_OPTIONS.includes(timeSince) || !AGE_OPTIONS.includes(ageGroup)){
        setError('Lengkapi profil dulu.')
        return
      }
      setStep(1)
      return
    }
    if (step >= 1 && step <= 4){
      // ensure page questions answered
      const page = pageQuestions[step-1]
      const missing = page.idx.filter(i => !answers[i])
      if (missing.length){
        setError('Masih ada pertanyaan belum diisi pada halaman ini.')
        return
      }
      if (step === 4) setStep(5)
      else setStep(step+1)
      return
    }
    if (step === 5){
      submit()
    }
  }

  function back(){
    setError('')
    if (step === 0) return
    setStep(step-1)
  }

  async function submit(){
    setError('')
    if (answers.some(a => !a)){
      setError('Masih ada pertanyaan yang belum diisi.')
      return
    }
    setLoading(true)
    try{
      const payload = {
        role,
        custody,
        time_since_divorce: timeSince,
        child_age_group: ageGroup,
        respondent_code: respondentCode?.trim() || null,
        answers,
        instrument_version: INSTRUMENT_VERSION,
      }
      const { error: insErr } = await supabase.from('survey_responses').insert(payload)
      if (insErr) throw insErr
      nav('/public?from=submit')
    }catch(e){
      setError(e?.message || 'Gagal submit. Cek koneksi & konfigurasi Supabase.')
    }finally{
      setLoading(false)
    }
  }

  return (
    <div className="grid two">
      <div className="card">
        <div className="h1">Survey Dampak Perceraian (20 item)</div>
        <p className="p">
          Isi sesuai kondisi yang kamu amati. Skala 1–5 (STS–SS). Tanpa esai.
        </p>

        <div className="progressWrap">
          <div className="progressBar" aria-label="progress">
            <div className="progressFill" style={{ width: `${progress}%` }} />
          </div>
          <div className="pill">{progress}%</div>
        </div>

        {error ? <div className="notice" style={{ marginTop: 12 }}>{error}</div> : null}

        {step === 0 && (
          <div style={{ marginTop: 12 }}>
            <div className="hr" />
            <div className="row">
              <div style={{ flex: 1, minWidth: 220 }}>
                <div className="field">
                  <div className="label">Peran responden</div>
                  <select className="select" value={role} onChange={(e)=>setRole(e.target.value)}>
                    {ROLE_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>
              </div>

              <div style={{ flex: 1, minWidth: 220 }}>
                <div className="field">
                  <div className="label">Tinggal anak saat ini</div>
                  <select className="select" value={custody} onChange={(e)=>setCustody(e.target.value)}>
                    {CUSTODY_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>
              </div>

              <div style={{ flex: 1, minWidth: 220 }}>
                <div className="field">
                  <div className="label">Lama sejak perceraian</div>
                  <select className="select" value={timeSince} onChange={(e)=>setTimeSince(e.target.value)}>
                    {TIME_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>
              </div>

              <div style={{ flex: 1, minWidth: 220 }}>
                <div className="field">
                  <div className="label">Kelompok usia anak (utama)</div>
                  <select className="select" value={ageGroup} onChange={(e)=>setAgeGroup(e.target.value)}>
                    {AGE_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>
              </div>
            </div>

            <div className="field">
              <div className="label">Kode responden (opsional)</div>
              <input className="input" value={respondentCode} onChange={(e)=>setRespondentCode(e.target.value)} placeholder="Contoh: P1 / Ayah-A (tanpa nama asli)" />
              <div className="small">Untuk identifikasi internal penelitian (disarankan pakai nama samaran).</div>
            </div>
          </div>
        )}

        {step >= 1 && step <= 4 && (
          <div style={{ marginTop: 12 }}>
            <div className="hr" />
            <div className="badge" style={{ background: '#fff' }}>{pageQuestions[step-1].title}</div>
            {pageQuestions[step-1].idx.map((i) => (
              <LikertItem
                key={i}
                index={i}
                text={ITEMS[i]}
                value={answers[i]}
                onChange={(v)=>setAnswer(i,v)}
              />
            ))}
          </div>
        )}

        {step === 5 && (
          <div style={{ marginTop: 12 }}>
            <div className="hr" />
            <div className="badge" style={{ background: '#fff' }}>Review</div>
            <p className="p" style={{ marginTop: 10 }}>
              Pastikan jawaban sudah benar. Setelah submit, kamu akan diarahkan ke dashboard publik untuk melihat hasil agregat.
            </p>

            <div className="row" style={{ marginTop: 10 }}>
              <div className="kpi">
                <div className="small">Terjawab</div>
                <div className="v">{totalAnswered}/20</div>
                <div className="small">Versi instrumen: {INSTRUMENT_VERSION}</div>
              </div>
              <div className="kpi" style={{ background: 'rgba(255,212,0,0.20)' }}>
                <div className="small">Profil</div>
                <div className="v" style={{ fontSize: 18 }}>{role}</div>
                <div className="small">{custody} • {timeSince} • usia {ageGroup}</div>
              </div>
            </div>

            <div className="hr" />
            <table className="table">
              <thead>
                <tr><th>#</th><th>Pernyataan</th><th>Skor</th></tr>
              </thead>
              <tbody>
                {ITEMS.map((t, i) => (
                  <tr key={i}>
                    <td>{i+1}</td>
                    <td>{t}</td>
                    <td><span className="pill">{answers[i]}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="hr" />
        <div className="row" style={{ justifyContent:'space-between' }}>
          <button className="btn secondary" onClick={back} disabled={step===0 || loading}>Kembali</button>
          <button className="btn" onClick={next} disabled={loading}>
            {loading ? 'Menyimpan…' : (step===5 ? 'Submit & Lihat Dashboard' : 'Lanjut')}
          </button>
        </div>
      </div>

      <div className="card">
        <div className="badge" style={{ background: 'rgba(92,242,255,0.35)' }}>Petunjuk</div>
        <div className="hr" />
        <div className="p">
          <ul style={{ marginTop: 0, lineHeight: 1.6 }}>
            <li>Skala: 1=STS, 2=TS, 3=Netral, 4=Setuju, 5=Sangat Setuju</li>
            <li>Jangan isi nama asli. Pakai kode samaran (opsional).</li>
            <li>Setelah submit, buka <span className="pill">/public</span> untuk grafik agregat.</li>
            <li>Halaman <span className="pill">/admin</span> untuk melihat data mentah (khusus admin login).</li>
          </ul>
        </div>
        <div className="notice" style={{ marginTop: 12 }}>
          Untuk akses dari HP/laptop lain: jalankan <span className="pill">npm run dev -- --host</span> lalu buka <span className="pill">http://IP_KAMU:5173</span>.
        </div>
      </div>
    </div>
  )
}
