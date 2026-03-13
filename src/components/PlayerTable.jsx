import { useState } from 'react'
import { getSkillLabel, getPositionLabel, formatAge, formatPromotion, getSkillColor } from '../utils/hrfParser'

function SkillCell({ skill }) {
  const color = getSkillColor(skill.current, skill.max)
  let display = '—'
  if (skill.current !== null && skill.max !== null) display = `${skill.current}/${skill.max}`
  else if (skill.current !== null) display = `${skill.current}/?`
  else if (skill.max !== null) display = `?/${skill.max}`
  return <td className={`skill-cell ${color}`}>{display}</td>
}

export default function PlayerTable({ players, onSelectPlayer }) {
  const [sortField, setSortField] = useState('totalDays')
  const [sortDir, setSortDir] = useState('desc')

  function handleSort(field) {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortField(field); setSortDir('desc') }
  }

  const sorted = [...players].sort((a, b) => {
    let va, vb
    switch (sortField) {
      case 'name': va = a.name; vb = b.name; break
      case 'totalDays': va = a.totalDays; vb = b.totalDays; break
      case 'canBePromotedIn': va = a.canBePromotedIn; vb = b.canBePromotedIn; break
      case 'lastRating': va = a.lastMatch.rating || 0; vb = b.lastMatch.rating || 0; break
      default: va = a.totalDays; vb = b.totalDays
    }
    if (typeof va === 'string') return sortDir === 'asc' ? va.localeCompare(vb) : vb.localeCompare(va)
    return sortDir === 'asc' ? va - vb : vb - va
  })

  const arrow = sortDir === 'asc' ? ' ↑' : ' ↓'

  return (
    <div className="table-container">
      <table>
        <thead>
          <tr>
            <th onClick={() => handleSort('name')} style={{ cursor: 'pointer' }}>Joueur{sortField === 'name' ? arrow : ''}</th>
            <th onClick={() => handleSort('totalDays')} style={{ cursor: 'pointer' }}>Âge{sortField === 'totalDays' ? arrow : ''}</th>
            <th>Spé.</th>
            <th onClick={() => handleSort('canBePromotedIn')} style={{ cursor: 'pointer' }}>Promo{sortField === 'canBePromotedIn' ? arrow : ''}</th>
            <th>Statut</th>
            <th title="Gardien">GK</th>
            <th title="Défense">DEF</th>
            <th title="Construction">CON</th>
            <th title="Ailier">AIL</th>
            <th title="Passe">PAS</th>
            <th title="Buteur">BUT</th>
            <th title="Coup franc">CF</th>
            <th>Poste</th>
            <th onClick={() => handleSort('lastRating')} style={{ cursor: 'pointer' }}>★{sortField === 'lastRating' ? arrow : ''}</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map(p => (
            <tr key={p.id} onClick={() => onSelectPlayer(p)}>
              <td className="player-name">{p.name}</td>
              <td className="player-age">{formatAge(p.age, p.ageDays)}</td>
              <td>{p.specialtyLabel && <span className="tag tag-specialty">{p.specialtyLabel}</span>}</td>
              <td>{p.isPromotable ? <span className="tag tag-promo-ready">Prêt</span> : <span className="tag-promo-wait">{formatPromotion(p.daysUntilPromotion)}</span>}</td>
              <td>
                {p.isInjured && <span className="tag tag-injured">Blessé</span>}
                {p.cards > 0 && <span className="tag tag-card">{p.cards}🟨</span>}
                {!p.isInjured && p.cards === 0 && '✓'}
              </td>
              <SkillCell skill={p.skills.keeper} />
              <SkillCell skill={p.skills.defender} />
              <SkillCell skill={p.skills.playmaker} />
              <SkillCell skill={p.skills.winger} />
              <SkillCell skill={p.skills.passing} />
              <SkillCell skill={p.skills.scorer} />
              <SkillCell skill={p.skills.setPieces} />
              <td style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                {p.lastMatch.positionCode ? getPositionLabel(p.lastMatch.positionCode) : '—'}
              </td>
              <td className="skill-cell" style={{ color: 'var(--accent-orange)' }}>{p.lastMatch.rating ?? '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
