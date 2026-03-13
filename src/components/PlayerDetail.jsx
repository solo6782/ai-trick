import { getSkillLabel, getPositionLabel, formatAge } from '../utils/hrfParser'
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
          <div className="meta-item">Arrivée : <strong>{new Date(player.arrivalDate).toLocaleDateString('fr-FR')}</strong></div>
          <div className="meta-item">Buts : <strong>{player.careerGoals}</strong> (ligue: {player.leagueGoals}, amicaux: {player.friendlyGoals})</div>
          {player.isInjured && <div className="meta-item"><span className="tag tag-injured">Blessé</span></div>}
          {player.cards > 0 && <div className="meta-item"><span className="tag tag-card">{player.cards} carton(s)</span></div>}
        </div>

        <div className="detail-section">
          <h3>Compétences</h3>
          {SKILL_KEYS.map(({ key, name, color }) => <SkillBar key={key} name={name} skill={player.skills[key]} prediction={pred[key]} color={color} />)}
          {predictions?.[player.id]?.updatedAt && (
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 8 }}>
              Prédictions IA du {new Date(predictions[player.id].updatedAt).toLocaleString('fr-FR')}
            </div>
          )}
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

        {history.length > 0 && (
          <div className="detail-section">
            <h3>Historique des matchs ({history.length})</h3>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', fontSize: '0.78rem' }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: 'left', padding: '6px 8px' }}>Date</th>
                    <th style={{ textAlign: 'left', padding: '6px 8px' }}>Poste</th>
                    <th style={{ textAlign: 'center', padding: '6px 8px' }}>Min</th>
                    <th style={{ textAlign: 'center', padding: '6px 8px' }}>★</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((h, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '6px 8px', color: 'var(--text-secondary)' }}>
                        {h.match_date ? new Date(h.match_date).toLocaleDateString('fr-FR') : '—'}
                      </td>
                      <td style={{ padding: '6px 8px' }}>{getPositionLabel(h.position_code)}</td>
                      <td style={{ padding: '6px 8px', textAlign: 'center', fontFamily: 'var(--font-mono)' }}>{h.played_minutes}</td>
                      <td style={{ padding: '6px 8px', textAlign: 'center', color: 'var(--accent-orange)', fontFamily: 'var(--font-mono)' }}>{h.rating}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {Object.keys(matchReports).length > 0 && (() => {
          // Extract only sentences mentioning this player from coach reports
          const name = player.name;
          const firstName = player.firstName;
          const lastName = player.lastName;
          const nameVariants = [name, firstName, lastName].filter(n => n && n.length > 2);

          const relevantSentences = [];

          for (const [id, r] of Object.entries(matchReports)) {
            if (!r.rapport) continue;
            // Split rapport into sentences (split on period followed by uppercase or end)
            const sentences = r.rapport.split(/(?<=\.)\s*(?=[A-ZÀ-ÿ])/).map(s => s.trim()).filter(Boolean);
            const matching = sentences.filter(s =>
              nameVariants.some(n => s.toLowerCase().includes(n.toLowerCase()))
            );
            if (matching.length > 0) {
              relevantSentences.push({
                matchId: id,
                date: r.date,
                sentences: matching
              });
            }
          }

          if (relevantSentences.length === 0) return null;

          return (
            <div className="detail-section">
              <h3>Rapports coach ({relevantSentences.length})</h3>
              {relevantSentences.map((entry, i) => (
                <div key={i} style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: 4 }}>
                    {entry.date ? new Date(entry.date).toLocaleDateString('fr-FR') : `Match ${entry.matchId}`}
                  </div>
                  {entry.sentences.map((s, j) => (
                    <div key={j} className="scout-comment" style={{ borderLeftColor: 'var(--accent-green)' }}>{s}</div>
                  ))}
                </div>
              ))}
            </div>
          );
        })()}
      </div>
    </div>
  )
}
