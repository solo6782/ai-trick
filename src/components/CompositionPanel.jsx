import { useState } from 'react'
import { askComposition, askCompositionPlanB } from '../utils/aiService'

export default function CompositionPanel({ hrfData, matchReports, onClose }) {
  const [response, setResponse] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [planBFeedback, setPlanBFeedback] = useState('')
  const [hasAsked, setHasAsked] = useState(false)

  async function handleAsk() {
    setLoading(true); setError('')
    try { setResponse(await askComposition(hrfData, matchReports)); setHasAsked(true) }
    catch (e) { setError(e.message) }
    finally { setLoading(false) }
  }

  async function handlePlanB() {
    setLoading(true); setError('')
    try { setResponse(await askCompositionPlanB(hrfData, matchReports, planBFeedback)); setPlanBFeedback('') }
    catch (e) { setError(e.message) }
    finally { setLoading(false) }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ width: 820, maxHeight: '90vh' }}>
        <h2>📝 Composition pour le prochain match</h2>
        <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: 20 }}>
          L'IA va proposer la meilleure composition pour maximiser progression et révélations.
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

        {response && (
          <div className="ai-response">
            <h3>🤖 Proposition de composition</h3>
            <div className="ai-response-body">{response}</div>
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
