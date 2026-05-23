import { getSkillLabel, getPositionLabel, formatAge, formatDateFR, parseDate } from '../utils/hrfParser'
import { getScoreColor } from '../utils/scoreCalculator'
import { estimateSkillFromRating } from '../utils/skillEstimator'

// Couleur de la pastille selon la confiance de l'estimation calculée
const CONFIDENCE_DOT = { bonne: '#10b981', moyenne: '#f59e0b', faible: '#ef4444' }

const SKILL_KEYS = [
  { key: 'keeper', name: 'Gardien', color: '#22d3ee' },
  { key: 'defender', name: 'Défense', color: '#3b82f6' },
  { key: 'playmaker', name: 'Construction', color: '#a78bfa' },
  { key: 'winger', name: 'Ailier', color: '#10b981' },
  { key: 'passing', name: 'Passe', color: '#f59e0b' },
  { key: 'scorer', name: 'Buteur', color: '#ef4444' },
  { key: 'setPieces', name: 'Coup franc', color: '#94a3b8' }
]

function SkillBar({ name, skill, prediction, color, estimate }) {
  const MAX = 10
  const pred = prediction || {}

  // Merge HRF + prediction
  const showCur = skill.current !== null ? skill.current : (pred.current ?? null)
  const showMax = skill.max !== null ? skill.max : (pred.max ?? null)
  const curIsPred = skill.current === null && pred.current != null
  const maxIsPred = skill.max === null && pred.max != null

  const curPct = showCur !== null ? (showCur / MAX) * 100 : 0
  const maxPct = showMax !== null ? (showMax / MAX) * 100 : 0

  // Estimation calculée (note de match) : prime sur le "?" du niveau actuel inconnu.
  const useEstimate = estimate && skill.current === null
  let curLabel
  if (useEstimate) {
    curLabel = `~${estimate.estimate} (${estimate.low}–${estimate.high})`
  } else {
    curLabel = showCur !== null ? `${curIsPred ? '~' : ''}${showCur} (${getSkillLabel(showCur)})` : '?'
  }
  const maxLabel = showMax !== null ? `${maxIsPred ? '~' : ''}${showMax} (${getSkillLabel(showMax)})` : '?'

  let status = ''
  if (skill.maxReached) status = ' ✓ MAXÉ'
  else if (showCur !== null && showMax !== null) {
    const gap = showMax - showCur
    if (gap > 0) status = ` → +${gap}`
  }

  const confidence = (curIsPred || maxIsPred) && !useEstimate ? ` (IA: ${pred.confidence || '?'})` : ''
  const estPct = useEstimate ? (estimate.estimate / MAX) * 100 : 0

  return (
    <div className="skill-bar-group">
      <div className="skill-bar-label">
        <span className="name" style={{ color: skill.maxReached ? 'var(--skill-maxed)' : 'var(--text-primary)' }}>
          {useEstimate && (
            <span title={`Estimation (confiance ${estimate.confidence}) — ${estimate.basis}`}
              style={{ display: 'inline-block', width: 9, height: 9, borderRadius: '50%', marginRight: 6,
                background: CONFIDENCE_DOT[estimate.confidence] || '#94a3b8', verticalAlign: 'middle' }} />
          )}
          {name}{status}{confidence}
        </span>
        <span className="values" style={{ color: useEstimate ? (CONFIDENCE_DOT[estimate.confidence] || 'var(--accent-cyan)') : ((curIsPred || maxIsPred) ? 'var(--accent-cyan)' : 'var(--text-secondary)') }}>{curLabel} / {maxLabel}</span>
      </div>
      <div className="skill-bar-track">
        {skill.current !== null && <div className="skill-bar-current" style={{ width: `${curPct}%`, background: skill.maxReached ? 'var(--skill-maxed)' : color }} />}
        {useEstimate && <div className="skill-bar-current" style={{ width: `${estPct}%`, background: color, opacity: 0.4 }} />}
        {skill.max !== null && <div className="skill-bar-max" style={{ left: `${maxPct}%`, borderColor: color }} />}
      </div>
    </div>
  )
}

export default function PlayerDetail({ player, matchReports, predictions, score, playerHistory, onClose }) {
  const pred = predictions?.[player.id]?.skills || {};
  const skillEstimate = estimateSkillFromRating(player);
  const history = (playerHistory || []).filter(h => h.player_id === player.id);

  return (
    <div className="detail-overlay" onClick={onClose}>
      <div className="detail-panel" onClick={e => e.stopPropagation()}>
        <div className="detail-header">
          <div>
            <h2>{player.name}</h2>
            <div style={{ display: 'flex', gap: 8, marginTop: 6, alignItems: 'center', flexWrap: 'wrap' }}>
              {player.specialtyLabel && <span className="tag tag-specialty">{player.specialtyLabel}</span>}
              {score !== undefined && (
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem', fontWeight: 700, color: getScoreColor(score) }}>
                  Potentiel : {score}/100
                </span>
              )}
              {predictions?.[player.id]?.category && (() => {
                const cat = predictions[player.id].category;
                const colors = { STAR: '#22c55e', PROSPECT: '#3b82f6', MYSTERE: '#06b6d4', GOLFEUR: '#f59e0b', INUTILE: '#6b7280' };
                return (
                  <span style={{ fontSize: '0.72rem', fontWeight: 700, padding: '2px 8px', borderRadius: 4, background: colors[cat] || '#6b7280', color: '#000' }}>
                    {cat}
                  </span>
                );
              })()}
            </div>
            {predictions?.[player.id]?.justification && (
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: 6, fontStyle: 'italic' }}>
                {predictions[player.id].justification}
                {predictions[player.id].naturalPosition && <> — Poste : <strong>{predictions[player.id].naturalPosition}</strong></>}
              </div>
            )}
            {predictions?.[player.id]?.missingSkills?.length > 0 && (
              <div style={{ fontSize: '0.72rem', color: 'var(--accent-cyan)', marginTop: 4 }}>
                À découvrir : {predictions[player.id].missingSkills.join(', ')}
              </div>
            )}
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
          {SKILL_KEYS.map(({ key, name, color }) => (
            <SkillBar key={key} name={name} skill={player.skills[key]} prediction={pred[key]} color={color}
              estimate={skillEstimate && skillEstimate.skill === key ? skillEstimate : null} />
          ))}
          {skillEstimate && (
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 8, display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap' }}>
              <span>Estimation (note de match) :</span>
              <span><span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: '#10b981', marginRight: 4 }} />bonne</span>
              <span><span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: '#f59e0b', marginRight: 4 }} />moyenne</span>
              <span><span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: '#ef4444', marginRight: 4 }} />faible</span>
            </div>
          )}
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
                return (
                  <div key={i}>
                    <div style={{
                      display: 'flex', gap: 16, padding: '6px 0',
                      borderBottom: '1px solid var(--border)',
                      fontSize: '0.78rem'
                    }}>
                      <span style={{ minWidth: 110, color: 'var(--text-secondary)' }}>
                        {h.match_date ? formatDateFR(h.match_date) : '—'}
                      </span>
                      <span style={{ minWidth: 140 }}>{getPositionLabel(h.position_code)}</span>
                      <span style={{ minWidth: 40, textAlign: 'center', fontFamily: 'var(--font-mono)' }}>{h.played_minutes}</span>
                      <span style={{ minWidth: 30, textAlign: 'center', color: 'var(--accent-orange)', fontFamily: 'var(--font-mono)' }}>{h.rating}★</span>
                    </div>
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
