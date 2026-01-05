import React from 'react'

export default function LikertItem({ index, text, value, onChange }) {
  const choices = [1,2,3,4,5]
  return (
    <div className="itemCard">
      <div className="itemTop">
        <div className="row" style={{ alignItems:'flex-start' }}>
          <div className="itemIndex">{index + 1}</div>
          <div>
            <div className="itemText">{text}</div>
            <div className="small">1=STS • 2=TS • 3=N • 4=S • 5=SS</div>
          </div>
        </div>
        <div className="pill">{value ? `Terpilih: ${value}` : 'Pilih 1–5'}</div>
      </div>

      <div className="likert">
        {choices.map((c) => (
          <div
            key={c}
            className={`choice ${value === c ? "active" : ""}`}
            role="button"
            tabIndex={0}
            onClick={() => onChange(c)}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onChange(c) }}
            aria-label={`Pilih ${c}`}
          >
            {c}
          </div>
        ))}
      </div>
    </div>
  )
}
