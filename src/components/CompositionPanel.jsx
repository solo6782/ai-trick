import { useState } from 'react'
import { askComposition, askCompositionPlanB } from '../utils/aiService'
import PitchView from './PitchView'

function parseCompoResponse(raw) {
  // Try to extract JSON from the response
  try {
    const jsonMatch = raw.match(/```json\s*([\s\S]*?)```/)
    if (jsonMatch) {
      return { type: 'json', data: JSON.parse(jsonMatch[1].trim()), raw }
    }
    // Try parsing the whole thing as JSON
    const trimmed = raw.trim()
    if (trimmed.startsWith('{')) {
      return { type: 'json', data: JSON.parse(trimmed), raw }
    }
  } catch (e) {
    console.warn('Could not parse composition JSON:', e)
  }
  return { type: 'text', raw }
}

function CompoDetails({ data }) {
  return (
    <div>
      {/* Training + Tactic */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 16, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 150, padding: 12, background: 'var(--bg-input)', borderRadius: 'var(--radius-sm)', borderLeft: '3px solid var(--accent-blue)' }}>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>Entraînement primaire</div>
          <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--accent-blue)' }}>{data.primaryTraining}</div>
        </div>
        <div style={{ flex: 1, minWidth: 150, padding: 12, background: 'var(--bg-input)', borderRadius: 'var(--radius-sm)', borderLeft: '3px solid var(--accent-purple)' }}>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>Entraînement secondaire</div>
          <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--accent-purple)' }}>{data.secondaryTraining}</div>
        </div>
        {data.tactic && (
          <div style={{ flex: 1, minWidth: 150, padding: 12, background: 'var(--bg-input)', borderRadius: 'var(--radius-sm)', borderLeft: '3px solid var(--accent-orange)' }}>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>Tactique</div>
            <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--accent-orange)' }}>{data.tactic}</div>
          </div>
        )}
      </div>

      {data.trainingJustification && (
        <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: 16, lineHeight: 1.7 }}>
          {data.trainingJustification}
        </div>
      )}

      {/* Pitch graphic */}
      <PitchView lineup={data.lineup || []} formation={data.formation} subs={data.subs} />

      {/* Player details with orders */}
      {data.lineup && data.lineup.length > 0 && (
        <div style={{ marginTop: 12 }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 8 }}>Justifications</div>
          {data.lineup.map((p, i) => (
            <div key={i} style={{ fontSize: '0.78rem', padding: '4px 0', borderBottom: '1px solid var(--border)' }}>
              <strong style={{ color: 'var(--text-bright)' }}>{p.playerName}</strong>
              <span style={{ color: 'var(--text-muted)' }}> ({p.position})</span>
              {p.order && p.order !== 'Normal' && (
                <span style={{ color: 'var(--accent-orange)', fontSize: '0.72rem', marginLeft: 6 }}>▸ {p.order}</span>
              )}
              <span style={{ color: 'var(--text-secondary)' }}> — {p.reason}</span>
            </div>
          ))}
        </div>
      )}

      {/* Substitutions */}
      {data.substitutions && data.substitutions.length > 0 && (
        <div style={{ marginTop: 16, padding: 12, background: 'var(--bg-input)', borderRadius: 'var(--radius-sm)' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--accent-cyan)', textTransform: 'uppercase', marginBottom: 8 }}>🔄 Remplacements programmés</div>
          {data.substitutions.map((s, i) => (
            <div key={i} style={{ fontSize: '0.78rem', padding: '4px 0', color: 'var(--text-secondary)' }}>
              <strong style={{ color: 'var(--accent-cyan)' }}>{s.minute}'</strong> — {s.out} ↔ {s.in}
              {s.position && <span style={{ color: 'var(--text-muted)' }}> ({s.position})</span>}
              {s.reason && <span> — {s.reason}</span>}
            </div>
          ))}
        </div>
      )}

      {/* Training change */}
      {data.trainingChange && (
        <div className="alert-card alert-warning" style={{ marginTop: 16 }}>
          <h3>⚠️ Changement d'entraînement recommandé</h3>
          <p>{data.trainingChange}</p>
        </div>
      )}

      {/* Summary */}
      {data.summary && (
        <div style={{ marginTop: 16, padding: 12, background: 'var(--bg-input)', borderRadius: 'var(--radius-sm)', fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.7, borderLeft: '3px solid var(--accent-green)' }}>
          {data.summary}
        </div>
      )}
    </div>
  )
}

export default function CompositionPanel({ hrfData, matchReports, onClose }) {
  const [parsed, setParsed] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [planBFeedback, setPlanBFeedback] = useState('')
  const [hasAsked, setHasAsked] = useState(false)

  async function handleAsk() {
    setLoading(true); setError('')
    try {
      const raw = await askComposition(hrfData, matchReports)
      setParsed(parseCompoResponse(raw))
      setHasAsked(true)
    } catch (e) { setError(e.message) }
    finally { setLoading(false) }
  }

  async function handlePlanB() {
    setLoading(true); setError('')
    try {
      const raw = await askCompositionPlanB(hrfData, matchReports, planBFeedback)
      setParsed(parseCompoResponse(raw))
      setPlanBFeedback('')
    } catch (e) { setError(e.message) }
    finally { setLoading(false) }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ width: 820, maxHeight: '90vh' }}>
        <h2>📝 Composition pour le prochain match</h2>
        <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: 20 }}>
          L'IA propose la meilleure composition pour maximiser progression et révélations.
          {hrfData && <><br />Entraînement senior : <strong>{hrfData.training.type}</strong> — {hrfData.youthPlayers.length} joueurs.</>}
        </p>

        {!hasAsked && (
          <div style={{ textAlign: 'center', padding: '30px 0' }}>
            <button className="btn btn-purple" onClick={handleAsk} disabled={loading} style={{ fontSize: '1rem', padding: '12px 28px' }}>
              {loading ? <><span className="loading-spinner" /> Analyse en cours...</> : '🧠 Générer la composition'}
            </button>
          </div>
        )}

        {error && <div className="alert-card alert-warning"><h3>⚠️ Erreur</h3><p>{error}</p></div>}

        {parsed && (
          <div className="ai-response">
            <h3>🤖 Proposition de composition</h3>
            {parsed.type === 'json' ? (
              <CompoDetails data={parsed.data} />
            ) : (
              <div className="ai-response-body">{parsed.raw}</div>
            )}

            <div className="ai-response-actions">
              <input type="text" value={planBFeedback} onChange={e => setPlanBFeedback(e.target.value)} placeholder="Raison du refus (optionnel)..." />
              <button className="btn btn-orange btn-sm" onClick={handlePlanB} disabled={loading}>
                {loading ? <span className="loading-spinner" /> : '🔄 Plan B'}
              </button>
            </div>
          </div>
        )}

        <div className="modal-actions" style={{ marginTop: 20 }}>
          <button className="btn" onClick={onClose}>Fermer</button>
        </div>
      </div>
    </div>
  )
}
