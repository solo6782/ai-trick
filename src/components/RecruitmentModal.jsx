import { useState } from 'react'
import { askRecruitment } from '../utils/aiService'

export default function RecruitmentModal({ hrfData, onClose }) {
  const [profiles, setProfiles] = useState(['', '', ''])
  const [response, setResponse] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  function updateProfile(i, v) {
    const u = [...profiles]; u[i] = v; setProfiles(u)
  }

  async function handleAnalyze() {
    setLoading(true); setError('')
    try { setResponse(await askRecruitment(hrfData, profiles)) }
    catch (e) { setError(e.message) }
    finally { setLoading(false) }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ width: 780 }}>
        <h2>🔍 Recrutement — Analyse des profils</h2>
        <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: 20 }}>
          Colle les profils proposés par tes recruteurs. L'IA te dira lequel choisir.
        </p>

        {[0, 1, 2].map(i => (
          <div key={i} className="form-group">
            <label>Profil {i + 1}</label>
            <textarea value={profiles[i]} onChange={e => updateProfile(i, e.target.value)} placeholder={`Colle ici le profil du recruteur ${i + 1}...`} rows={5} />
          </div>
        ))}

        {error && <div className="alert-card alert-warning"><h3>⚠️ Erreur</h3><p>{error}</p></div>}

        {response && (
          <div className="ai-response">
            <h3>🤖 Recommandation</h3>
            <div className="ai-response-body">{response}</div>
          </div>
        )}

        <div className="modal-actions">
          <button className="btn" onClick={onClose}>Fermer</button>
          <button className="btn btn-orange" onClick={handleAnalyze} disabled={!profiles.some(p => p.trim()) || loading}>
            {loading ? <><span className="loading-spinner" /> Analyse en cours...</> : '🔍 Analyser'}
          </button>
        </div>
      </div>
    </div>
  )
}
