import { getSkillLabel, getPositionLabel, formatAge } from '../utils/hrfParser'

const SKILL_KEYS = [
  { key: 'keeper', name: 'Gardien', color: '#22d3ee' },
  { key: 'defender', name: 'Défense', color: '#3b82f6' },
  { key: 'playmaker', name: 'Construction', color: '#a78bfa' },
  { key: 'winger', name: 'Ailier', color: '#10b981' },
  { key: 'passing', name: 'Passe', color: '#f59e0b' },
  { key: 'scorer', name: 'Buteur', color: '#ef4444' },
  { key: 'setPieces', name: 'Coup franc', color: '#94a3b8' }
]

function SkillBar({ name, skill, color }) {
  const MAX = 10
  const curPct = skill.current !== null ? (skill.current / MAX) * 100 : 0
  const maxPct = skill.max !== null ? (skill.max / MAX) * 100 : 0
  const curLabel = skill.current !== null ? `${skill.current} (${getSkillLabel(skill.current)})` : '?'
  const maxLabel = skill.max !== null ? `${skill.max} (${getSkillLabel(skill.max)})` : '?'
  let status = ''
  if (skill.maxReached) status = ' ✓ MAXÉ'
  else if (skill.current !== null && skill.max !== null) {
    const gap = skill.max - skill.current
    if (gap > 0) status = ` → +${gap}`
  }

  return (
    <div className="skill-bar-group">
      <div className="skill-bar-label">
        <span className="name" style={{ color: skill.maxReached ? 'var(--skill-maxed)' : 'var(--text-primary)' }}>{name}{status}</span>
        <span className="values">{curLabel} / {maxLabel}</span>
      </div>
      <div className="skill-bar-track">
        {skill.current !== null && <div className="skill-bar-current" style={{ width: `${curPct}%`, background: skill.maxReached ? 'var(--skill-maxed)' : color }} />}
        {skill.max !== null && <div className="skill-bar-max" style={{ left: `${maxPct}%`, borderColor: color }} />}
      </div>
    </div>
  )
}

export default function PlayerDetail({ player, matchReports, onClose }) {
  return (
    <div className="detail-overlay" onClick={onClose}>
      <div className="detail-panel" onClick={e => e.stopPropagation()}>
        <div className="detail-header">
          <div>
            <h2>{player.name}</h2>
            {player.specialtyLabel && <span className="tag tag-specialty" style={{ marginTop: 4 }}>{player.specialtyLabel}</span>}
          </div>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>

        <div className="detail-meta">
          <div className="meta-item"><strong>{formatAge(player.age, player.ageDays)}</strong></div>
          <div className="meta-item">Promo : <strong>{player.isPromotable ? '✅ Prêt' : `dans ${player.daysUntilPromotion}j`}</strong></div>
          <div className="meta-item">Arrivée : <strong>{new Date(player.arrivalDate).toLocaleDateString('fr-FR')}</strong></div>
          <div className="meta-item">Buts : <strong>{player.careerGoals}</strong> (ligue: {player.leagueGoals}, amicaux: {player.friendlyGoals})</div>
          {player.isInjured && <div className="meta-item"><span className="tag tag-injured">Blessé</span></div>}
          {player.cards > 0 && <div className="meta-item"><span className="tag tag-card">{player.cards} carton(s)</span></div>}
        </div>

        <div className="detail-section">
          <h3>Compétences</h3>
          {SKILL_KEYS.map(({ key, name, color }) => <SkillBar key={key} name={name} skill={player.skills[key]} color={color} />)}
        </div>

        {player.lastMatch.date && (
          <div className="detail-section">
            <h3>Dernier match</h3>
            <div className="detail-meta">
              <div className="meta-item">Date : <strong>{new Date(player.lastMatch.date).toLocaleDateString('fr-FR')}</strong></div>
              <div className="meta-item">Poste : <strong>{getPositionLabel(player.lastMatch.positionCode)}</strong></div>
              <div className="meta-item">Minutes : <strong>{player.lastMatch.playedMinutes}</strong></div>
              <div className="meta-item">Note : <strong>{player.lastMatch.rating}★</strong></div>
            </div>
          </div>
        )}

        {player.scoutComments.length > 0 && (
          <div className="detail-section">
            <h3>Commentaires du recruteur</h3>
            {player.scoutComments.map((c, i) => <div key={i} className="scout-comment">{c.text}</div>)}
          </div>
        )}

        {Object.keys(matchReports).length > 0 && (
          <div className="detail-section">
            <h3>Rapports de match</h3>
            {Object.entries(matchReports).map(([id, r]) => (
              <div key={id} style={{ marginBottom: 12 }}>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: 4 }}>Match {id} — {r.date || ''}</div>
                {r.rapport && <div className="scout-comment" style={{ borderLeftColor: 'var(--accent-green)' }}>{r.rapport}</div>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
