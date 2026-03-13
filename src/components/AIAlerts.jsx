import { useState, useEffect } from 'react'
import { askPromotions, askDismissals } from '../utils/aiService'
import { saveSetting, loadSettings } from '../utils/storage'

export default function AIAlerts({ hrfData, matchReports }) {
  const [promoResponse, setPromoResponse] = useState('')
  const [promoLoading, setPromoLoading] = useState(false)
  const [promoCollapsed, setPromoCollapsed] = useState(false)
  const [dismissResponse, setDismissResponse] = useState('')
  const [dismissLoading, setDismissLoading] = useState(false)
  const [dismissCollapsed, setDismissCollapsed] = useState(false)
  const [error, setError] = useState('')

  const playerCount = hrfData?.youthPlayers?.length || 0
  const promotableCount = hrfData?.youthPlayers?.filter(p => p.isPromotable).length || 0
  const nearExpiry = hrfData?.youthPlayers?.filter(p => p.age >= 18).length || 0

  // Load saved analyses on mount
  useEffect(() => {
    loadSettings().then(s => {
      if (s.promo_analysis) setPromoResponse(s.promo_analysis)
      if (s.dismiss_analysis) setDismissResponse(s.dismiss_analysis)
    })
  }, [])

  async function handlePromo() {
    setPromoLoading(true); setError(''); setPromoCollapsed(false)
    try {
      const result = await askPromotions(hrfData, matchReports)
      setPromoResponse(result)
      await saveSetting('promo_analysis', result)
    } catch (e) { setError(e.message) }
    finally { setPromoLoading(false) }
  }

  async function handleDismiss() {
    setDismissLoading(true); setError(''); setDismissCollapsed(false)
    try {
      const result = await askDismissals(hrfData, matchReports)
      setDismissResponse(result)
      await saveSetting('dismiss_analysis', result)
    } catch (e) { setError(e.message) }
    finally { setDismissLoading(false) }
  }

  return (
    <div style={{ display: 'flex', gap: 16, marginBottom: 20, flexWrap: 'wrap' }}>
      {promotableCount > 0 && (
        <div className="alert-card alert-success" style={{ flex: 1, minWidth: 300 }}>
          <h3 style={{ cursor: promoResponse ? 'pointer' : 'default' }}
              onClick={() => promoResponse && setPromoCollapsed(c => !c)}>
            🎓 Promotions ({promotableCount} promouvable{promotableCount > 1 ? 's' : ''})
            {nearExpiry > 0 && <span style={{ color: 'var(--accent-orange)', marginLeft: 8, fontSize: '0.8rem' }}>⚠️ {nearExpiry} proche{nearExpiry > 1 ? 's' : ''} des 19 ans</span>}
            {promoResponse && <span style={{ marginLeft: 8, fontSize: '0.75rem', color: 'var(--text-muted)' }}>{promoCollapsed ? '▶' : '▼'}</span>}
          </h3>
          {!promoResponse ? (
            <button className="btn btn-sm btn-primary" onClick={handlePromo} disabled={promoLoading}>
              {promoLoading ? <><span className="loading-spinner" /> Analyse...</> : '🧠 Analyser les promotions'}
            </button>
          ) : !promoCollapsed ? (
            <>
              <div className="alert-body" style={{ whiteSpace: 'pre-wrap' }}>{promoResponse}</div>
              <button className="btn btn-sm btn-primary" onClick={handlePromo} disabled={promoLoading} style={{ marginTop: 10 }}>
                {promoLoading ? <><span className="loading-spinner" /> Analyse...</> : '🔄 Relancer l\'analyse'}
              </button>
            </>
          ) : null}
        </div>
      )}

      {playerCount > 14 && (
        <div className="alert-card alert-warning" style={{ flex: 1, minWidth: 300 }}>
          <h3 style={{ cursor: dismissResponse ? 'pointer' : 'default' }}
              onClick={() => dismissResponse && setDismissCollapsed(c => !c)}>
            🚨 Effectif surchargé ({playerCount}/14 recommandé)
            {dismissResponse && <span style={{ marginLeft: 8, fontSize: '0.75rem', color: 'var(--text-muted)' }}>{dismissCollapsed ? '▶' : '▼'}</span>}
          </h3>
          {!dismissResponse ? (
            <button className="btn btn-sm btn-orange" onClick={handleDismiss} disabled={dismissLoading}>
              {dismissLoading ? <><span className="loading-spinner" /> Analyse...</> : '🧠 Qui licencier ?'}
            </button>
          ) : !dismissCollapsed ? (
            <>
              <div className="alert-body" style={{ whiteSpace: 'pre-wrap' }}>{dismissResponse}</div>
              <button className="btn btn-sm btn-orange" onClick={handleDismiss} disabled={dismissLoading} style={{ marginTop: 10 }}>
                {dismissLoading ? <><span className="loading-spinner" /> Analyse...</> : '🔄 Relancer l\'analyse'}
              </button>
            </>
          ) : null}
        </div>
      )}

      {error && <div className="alert-card alert-warning" style={{ flex: '0 0 100%' }}><h3>⚠️ Erreur</h3><p>{error}</p></div>}
    </div>
  )
}
