import { useState, useEffect } from 'react'
import { askComposition, askCompositionPlanB } from '../utils/aiService'
import { saveSetting, loadSettings } from '../utils/storage'
import PitchView from './PitchView'

function parseCompoResponse(raw) {
  try {
    // 1. Try ```json block
    const jsonBlock = raw.match(/```json\s*([\s\S]*?)```/)
    if (jsonBlock) return { type: 'json', data: JSON.parse(jsonBlock[1].trim()), raw }

    // 2. Try ``` block
    const codeBlock = raw.match(/```\s*([\s\S]*?)```/)
    if (codeBlock) {
      const inner = codeBlock[1].trim()
      if (inner.startsWith('{')) return { type: 'json', data: JSON.parse(inner), raw }
    }

    // 3. Find first { and try to parse
    const start = raw.indexOf('{')
    if (start >= 0) {
      const substr = raw.substring(start)
      try { return { type: 'json', data: JSON.parse(substr), raw } } catch {}
      // Try finding last }
      const lastClose = substr.lastIndexOf('}')
      if (lastClose > 0) {
        try { return { type: 'json', data: JSON.parse(substr.substring(0, lastClose + 1)), raw } } catch {}
      }
    }
  } catch (e) { console.warn('Could not parse composition JSON:', e) }
  return { type: 'text', raw }
}

const CAT_COLORS = {
  'STAR': 'var(--accent-green)',
  'PROSPECT': 'var(--accent-blue)',
  'MYSTERE': 'var(--accent-cyan)',
  'GOLFEUR': 'var(--accent-orange)',
  'INUTILE': 'var(--text-muted)',
}

function MiniPlayerCard({ player, onClose }) {
  if (!player) return null
  const skills = [
    { name: 'GK', s: player.skills.keeper },
    { name: 'DEF', s: player.skills.defender },
    { name: 'CON', s: player.skills.playmaker },
    { name: 'AIL', s: player.skills.winger },
    { name: 'PAS', s: player.skills.passing },
    { name: 'BUT', s: player.skills.scorer },
    { name: 'CF', s: player.skills.setPieces },
  ]
  return (
    <div style={{
      position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
      background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)',
      padding: 20, zIndex: 9999, minWidth: 320, maxWidth: 400, boxShadow: '0 10px 40px rgba(0,0,0,0.5)'
    }} onClick={e => e.stopPropagation()}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-bright)' }}>{player.name}</div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
            {player.age}a {player.ageDays}j {player.specialtyLabel ? `• ${player.specialtyLabel}` : ''}
          </div>
        </div>
        <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1.2rem' }}>✕</button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4, fontSize: '0.78rem' }}>
        {skills.map(({ name, s }) => (
          <div key={name} style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 8px', background: 'var(--bg-input)', borderRadius: 4 }}>
            <span style={{ fontWeight: 600 }}>{name}</span>
            <span style={{ fontFamily: 'var(--font-mono)', color: s.current !== null || s.max !== null ? 'var(--text-bright)' : 'var(--text-muted)' }}>
              {s.current ?? '?'} / {s.max ?? '?'}{s.maxReached ? ' ✓' : ''}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

function ClickableName({ name, players, onShowPlayer }) {
  const player = players?.find(p => p.name === name || p.name.includes(name) || name.includes(p.lastName))
  if (!player) return <strong style={{ color: 'var(--text-bright)' }}>{name}</strong>
  return (
    <strong
      style={{ color: 'var(--text-bright)', cursor: 'pointer', textDecoration: 'underline', textDecorationStyle: 'dotted' }}
      onClick={e => { e.stopPropagation(); onShowPlayer(player) }}
      title="Voir la fiche"
    >{name}</strong>
  )
}

function ClassificationSection({ classification, players, onShowPlayer }) {
  if (!classification || classification.length === 0) return null
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 8 }}>Classification des joueurs</div>
      {classification.map((c, i) => (
        <div key={i} style={{ fontSize: '0.78rem', padding: '4px 0', borderBottom: '1px solid var(--border)', display: 'flex', gap: 8, alignItems: 'baseline' }}>
          <span style={{ fontWeight: 700, fontSize: '0.68rem', padding: '1px 6px', borderRadius: 4, background: CAT_COLORS[c.category] || 'var(--text-muted)', color: '#000', minWidth: 70, textAlign: 'center' }}>{c.category}</span>
          <ClickableName name={c.playerName} players={players} onShowPlayer={onShowPlayer} />
          <span style={{ color: 'var(--text-muted)', fontSize: '0.72rem' }}>— {c.justification}</span>
        </div>
      ))}
    </div>
  )
}

function CompoDetails({ data, players, onShowPlayer }) {
  return (
    <div>
      {/* Classification */}
      <ClassificationSection classification={data.classification} players={players} onShowPlayer={onShowPlayer} />

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

      {/* Pitch */}
      <PitchView lineup={data.lineup || []} formation={data.formation} subs={data.subs} />

      {/* Justifications with clickable names */}
      {data.lineup && data.lineup.length > 0 && (
        <div style={{ marginTop: 12 }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 8 }}>Justifications</div>
          {data.lineup.map((p, i) => (
            <div key={i} style={{ fontSize: '0.78rem', padding: '4px 0', borderBottom: '1px solid var(--border)' }}>
              <ClickableName name={p.playerName} players={players} onShowPlayer={onShowPlayer} />
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

export default function CompositionPanel({ hrfData, matchReports, predictions, onClose }) {
  const [parsed, setParsed] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [planBFeedback, setPlanBFeedback] = useState('')
  const [miniPlayer, setMiniPlayer] = useState(null)
  const [loadingState, setLoadingState] = useState(true)

  // Load saved composition on mount
  useEffect(() => {
    loadSettings().then(s => {
      if (s.last_composition) {
        try { setParsed(JSON.parse(s.last_composition)) } catch {}
      }
    }).finally(() => setLoadingState(false))
  }, [])

  async function saveCompo(p) {
    try { await saveSetting('last_composition', JSON.stringify(p)) } catch {}
  }

  async function handleAsk() {
    setLoading(true); setError('')
    try {
      const raw = await askComposition(hrfData, matchReports, predictions)
      const p = parseCompoResponse(raw)
      setParsed(p)
      await saveCompo(p)
    } catch (e) { setError(e.message) }
    finally { setLoading(false) }
  }

  async function handlePlanB() {
    setLoading(true); setError('')
    try {
      const raw = await askCompositionPlanB(hrfData, matchReports, planBFeedback, predictions)
      const p = parseCompoResponse(raw)
      setParsed(p)
      await saveCompo(p)
      setPlanBFeedback('')
    } catch (e) { setError(e.message) }
    finally { setLoading(false) }
  }

  const players = hrfData?.youthPlayers || []

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ width: 860, maxHeight: '90vh' }}>
        <h2>📝 Composition pour le prochain match</h2>
        <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: 20 }}>
          L'IA (Opus) propose la meilleure composition basée sur les classifications pré-calculées.
          {hrfData && <><br />Entraînement senior : <strong>{hrfData.training.type}</strong> — {hrfData.youthPlayers.length} joueurs.</>}
        </p>

        {(!predictions || !Object.values(predictions).some(p => p.category)) && (
          <div className="alert-card alert-warning" style={{ marginBottom: 16 }}>
            <h3>⚠️ Analyse requise</h3>
            <p>Lance d'abord une analyse (🧠 Analyser) pour classifier les joueurs. La composition sera bien meilleure avec les classifications pré-calculées.</p>
          </div>
        )}

        {!parsed && !loadingState && (
          <div style={{ textAlign: 'center', padding: '30px 0' }}>
            <button className="btn btn-purple" onClick={handleAsk} disabled={loading} style={{ fontSize: '1rem', padding: '12px 28px' }}>
              {loading ? <><span className="loading-spinner" /> Analyse en cours (Opus, ~20s)...</> : '🧠 Générer la composition'}
            </button>
          </div>
        )}

        {error && <div className="alert-card alert-warning"><h3>⚠️ Erreur</h3><p>{error}</p></div>}

        {parsed && (
          <div className="ai-response">
            <h3>🤖 Proposition de composition</h3>
            {parsed.type === 'json' ? (
              <CompoDetails data={parsed.data} players={players} onShowPlayer={setMiniPlayer} />
            ) : (
              <div className="ai-response-body" style={{ whiteSpace: 'pre-wrap' }}>{parsed.raw}</div>
            )}

            <div className="ai-response-actions" style={{ marginTop: 16 }}>
              <input type="text" value={planBFeedback} onChange={e => setPlanBFeedback(e.target.value)} placeholder="Raison du refus (optionnel)..." />
              <button className="btn btn-orange btn-sm" onClick={handlePlanB} disabled={loading}>
                {loading ? <span className="loading-spinner" /> : '🔄 Plan B'}
              </button>
              <button className="btn btn-purple btn-sm" onClick={handleAsk} disabled={loading} style={{ marginLeft: 8 }}>
                {loading ? <span className="loading-spinner" /> : '🧠 Recalculer'}
              </button>
            </div>
          </div>
        )}

        <div className="modal-actions" style={{ marginTop: 20 }}>
          <button className="btn" onClick={onClose}>Fermer</button>
        </div>

        {/* Mini player card overlay */}
        {miniPlayer && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.4)', zIndex: 9998 }} onClick={() => setMiniPlayer(null)}>
            <MiniPlayerCard player={miniPlayer} onClose={() => setMiniPlayer(null)} />
          </div>
        )}
      </div>
    </div>
  )
}
