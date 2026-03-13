import { getSkillLabel, getPositionLabel, formatAge, formatDateFR, parseDate } from '../utils/hrfParser'
import { getScoreColor } from '../utils/scoreCalculator'

const SKILL_KEYS = [
  { key: 'keeper', name: 'Gardien', color: '#22d3ee' },
  { key: 'defender', name: 'Défense', color: '#3b82f6' },
  { key: 'playmaker', name: 'Construction', color: '#a78bfa' },
  { key: 'winger', name: 'Ailier', color: '#10b981' },
  { key: 'passing', name: 'Passe', color: '#f59e0b' },
  { key: 'scorer', name: 'Buteur', color: '#ef4444' },
  { key: 'setPieces', name: 'Coup franc', color: '#94a3b8' }
]

function SkillBar({ name, skill, prediction, color }) {
  const MAX = 10
  const pred = prediction || {}

  // Merge HRF + prediction
  const showCur = skill.current !== null ? skill.current : (pred.current ?? null)
  const showMax = skill.max !== null ? skill.max : (pred.max ?? null)
  const curIsPred = skill.current === null && pred.current != null
  const maxIsPred = skill.max === null && pred.max != null

  const curPct = showCur !== null ? (showCur / MAX) * 100 : 0
  const maxPct = showMax !== null ? (showMax / MAX) * 100 : 0

  const curLabel = showCur !== null ? `${curIsPred ? '~' : ''}${showCur} (${getSkillLabel(showCur)})` : '?'
  const maxLabel = showMax !== null ? `${maxIsPred ? '~' : ''}${showMax} (${getSkillLabel(showMax)})` : '?'

  let status = ''
  if (skill.maxReached) status = ' ✓ MAXÉ'
  else if (showCur !== null && showMax !== null) {
    const gap = showMax - showCur
    if (gap > 0) status = ` → +${gap}`
  }

  const confidence = (curIsPred || maxIsPred) ? ` (IA: ${pred.confidence || '?'})` : ''

  return (
    <div className="skill-bar-group">
      <div className="skill-bar-label">
        <span className="name" style={{ color: skill.maxReached ? 'var(--skill-maxed)' : 'var(--text-primary)' }}>{name}{status}{confidence}</span>
        <span className="values" style={{ color: (curIsPred || maxIsPred) ? 'var(--accent-cyan)' : 'var(--text-secondary)' }}>{curLabel} / {maxLabel}</span>
      </div>
      <div className="skill-bar-track">
        {skill.current !== null && <div className="skill-bar-current" style={{ width: `${curPct}%`, background: skill.maxReached ? 'var(--skill-maxed)' : color }} />}
        {skill.max !== null && <div className="skill-bar-max" style={{ left: `${maxPct}%`, borderColor: color }} />}
      </div>
    </div>
  )
}

export default function PlayerDetail({ player, matchReports, predictions, score, playerHistory, onClose }) {
  const pred = predictions?.[player.id]?.skills || {};
  const history = (playerHistory || []).filter(h => h.player_id === player.id);

  return (
    <div className="detail-overlay" onClick={onClose}>
      <div className="detail-panel" onClick={e => e.stopPropagation()}>
        <div className="detail-header">
          <div>
            <h2>{player.name}</h2>
            <div style={{ display: 'flex', gap: 8, marginTop: 6, alignItems: 'center' }}>
              {player.specialtyLabel && <span className="tag tag-specialty">{player.specialtyLabel}</span>}
              {score !== undefined && (
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem', fontWeight: 700, color: getScoreColor(score) }}>
                  Potentiel : {score}/100
                </span>
              )}
            </div>
          </div>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>

        <div className="detail-meta">
          <div className="meta-item"><strong>{formatAge(player.age, player.ageDays)}</strong></div>
          <div className="meta-item">Promo : <strong>{player.isPromotable ? '✅ Prêt' : `dans ${player.daysUntilPromotion}j`}</strong></div>
          <div className="meta-item">Arrivée : <strong>{formatDateFR(player.arrivalDate)}</strong></div>
          <div className="meta-item">Buts : <strong>{player.careerGoals}</strong> (ligue: {player.leagueGoals}, amicaux: {player.friendlyGoals})</div>
          {player.isInjured && <div className="meta-item"><span className="tag tag-injured">Blessé</span></div>}
          {player.cards > 0 && <div className="meta-item"><span className="tag tag-card">{player.cards} carton(s)</span></div>}
        </div>

        <div className="detail-section">
          <h3>Compétences</h3>
          {SKILL_KEYS.map(({ key, name, color }) => <SkillBar key={key} name={name} skill={player.skills[key]} prediction={pred[key]} color={color} />)}
          {predictions?.[player.id]?.updatedAt && (
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 8 }}>
              Prédictions IA du {formatDateFR(predictions[player.id].updatedAt)}
            </div>
          )}
        </div>

        {player.lastMatch.date && (
          <div className="detail-section">
            <h3>Dernier match</h3>
            <div className="detail-meta">
              <div className="meta-item">Date : <strong>{formatDateFR(player.lastMatch.date)}</strong></div>
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

        {history.length > 0 && (() => {
          // Build a map of match_id → coach sentences for this player
          const nameVariants = [player.name, player.firstName, player.lastName].filter(n => n && n.length > 2);
          const coachByMatch = {};

          for (const [id, r] of Object.entries(matchReports)) {
            if (!r.rapport) continue;
            const sentences = r.rapport.split(/(?<=\.)\s*(?=[A-ZÀ-ÿ])/).map(s => s.trim()).filter(Boolean);
            const matching = sentences.filter(s =>
              nameVariants.some(n => s.toLowerCase().includes(n.toLowerCase()))
            );
            if (matching.length > 0) coachByMatch[id] = matching;
          }

          // Sort history: most recent first
          const sorted = [...history].sort((a, b) => {
            const da = parseDate(a.match_date) || new Date(0);
            const db = parseDate(b.match_date) || new Date(0);
            return db.getTime() - da.getTime();
          });

          return (
            <div className="detail-section">
              <h3>Historique des matchs ({sorted.length})</h3>
              {sorted.map((h, i) => {
                const phrases = coachByMatch[h.match_id] || [];
                return (
                  <div key={i} style={{ marginBottom: phrases.length > 0 ? 12 : 0 }}>
                    <div style={{
                      display: 'flex', gap: 16, padding: '6px 0',
                      borderBottom: phrases.length > 0 ? 'none' : '1px solid var(--border)',
                      fontSize: '0.78rem'
                    }}>
                      <span style={{ minWidth: 110, color: 'var(--text-secondary)' }}>
                        {h.match_date ? formatDateFR(h.match_date) : '—'}
                      </span>
                      <span style={{ minWidth: 140 }}>{getPositionLabel(h.position_code)}</span>
                      <span style={{ minWidth: 40, textAlign: 'center', fontFamily: 'var(--font-mono)' }}>{h.played_minutes}</span>
                      <span style={{ minWidth: 30, textAlign: 'center', color: 'var(--accent-orange)', fontFamily: 'var(--font-mono)' }}>{h.rating}★</span>
                    </div>
                    {phrases.length > 0 && (
                      <div style={{ paddingBottom: 8, borderBottom: '1px solid var(--border)' }}>
                        {phrases.map((s, j) => (
                          <div key={j} className="scout-comment" style={{
                            borderLeftColor: 'var(--accent-green)',
                            marginTop: 4,
                            fontSize: '0.78rem'
                          }}>{s}</div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          );
        })()}
      </div>
    </div>
  )
}
