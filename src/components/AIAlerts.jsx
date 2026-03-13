import { useState } from 'react'
import { askPromotions, askDismissals } from '../utils/aiService'

export default function AIAlerts({ hrfData, matchReports }) {
  const [promoResponse, setPromoResponse] = useState('')
  const [promoLoading, setPromoLoading] = useState(false)
  const [dismissResponse, setDismissResponse] = useState('')
  const [dismissLoading, setDismissLoading] = useState(false)
  const [error, setError] = useState('')

  const playerCount = hrfData?.youthPlayers?.length || 0
  const promotableCount = hrfData?.youthPlayers?.filter(p => p.isPromotable).length || 0
  const nearExpiry = hrfData?.youthPlayers?.filter(p => p.age >= 18).length || 0

  async function handlePromo() {
    setPromoLoading(true); setError('')
    try { setPromoResponse(await askPromotions(hrfData, matchReports)) }
    catch (e) { setError(e.message) }
    finally { setPromoLoading(false) }
  }

  async function handleDismiss() {
    setDismissLoading(true); setError('')
    try { setDismissResponse(await askDismissals(hrfData, matchReports)) }
    catch (e) { setError(e.message) }
    finally { setDismissLoading(false) }
  }

  return (
    <div style={{ display: 'flex', gap: 16, marginBottom: 20, flexWrap: 'wrap' }}>
      {promotableCount > 0 && (
        <div className="alert-card alert-success" style={{ flex: 1, minWidth: 300 }}>
          <h3>
            🎓 Promotions ({promotableCount} promouvable{promotableCount > 1 ? 's' : ''})
            {nearExpiry > 0 && <span style={{ color: 'var(--accent-orange)', marginLeft: 8, fontSize: '0.8rem' }}>⚠️ {nearExpiry} proche{nearExpiry > 1 ? 's' : ''} des 19 ans</span>}
          </h3>
          {!promoResponse
            ? <button className="btn btn-sm btn-primary" onClick={handlePromo} disabled={promoLoading}>
                {promoLoading ? <><span className="loading-spinner" /> Analyse...</> : '🧠 Analyser les promotions'}
              </button>
            : <div className="alert-body" style={{ whiteSpace: 'pre-wrap' }}>{promoResponse}</div>
          }
        </div>
      )}

      {playerCount > 14 && (
        <div className="alert-card alert-warning" style={{ flex: 1, minWidth: 300 }}>
          <h3>🚨 Effectif surchargé ({playerCount}/14 recommandé)</h3>
          {!dismissResponse
            ? <button className="btn btn-sm btn-orange" onClick={handleDismiss} disabled={dismissLoading}>
                {dismissLoading ? <><span className="loading-spinner" /> Analyse...</> : '🧠 Qui licencier ?'}
              </button>
            : <div className="alert-body" style={{ whiteSpace: 'pre-wrap' }}>{dismissResponse}</div>
          }
        </div>
      )}

      {error && <div className="alert-card alert-warning" style={{ flex: '0 0 100%' }}><h3>⚠️ Erreur</h3><p>{error}</p></div>}
    </div>
  )
}
