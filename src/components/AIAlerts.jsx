import { useState, useEffect } from 'react'
import { askPromotions, askDismissals } from '../utils/aiService'
import { saveSetting, loadSettings } from '../utils/storage'
import { formatDateFR } from '../utils/hrfParser'

export default function AIAlerts({ hrfData, matchReports }) {
  const [promoResponse, setPromoResponse] = useState('')
  const [promoLoading, setPromoLoading] = useState(false)
  const [promoCollapsed, setPromoCollapsed] = useState(true) // collapsed by default
  const [promoDate, setPromoDate] = useState(null)
  const [dismissResponse, setDismissResponse] = useState('')
  const [dismissLoading, setDismissLoading] = useState(false)
  const [dismissCollapsed, setDismissCollapsed] = useState(true) // collapsed by default
  const [dismissDate, setDismissDate] = useState(null)
  const [error, setError] = useState('')

  const playerCount = hrfData?.youthPlayers?.length || 0
  const promotableCount = hrfData?.youthPlayers?.filter(p => p.isPromotable).length || 0
  const nearExpiry = hrfData?.youthPlayers?.filter(p => p.age >= 18).length || 0

  useEffect(() => {
    loadSettings().then(s => {
      if (s.promo_analysis) setPromoResponse(s.promo_analysis)
      if (s.promo_analysis_date) setPromoDate(s.promo_analysis_date)
      if (s.dismiss_analysis) setDismissResponse(s.dismiss_analysis)
      if (s.dismiss_analysis_date) setDismissDate(s.dismiss_analysis_date)
    })
  }, [])

  async function handlePromo() {
    setPromoLoading(true); setError(''); setPromoCollapsed(false)
    try {
      const result = await askPromotions(hrfData, matchReports)
      const now = new Date().toISOString()
      setPromoResponse(result)
      setPromoDate(now)
      await saveSetting('promo_analysis', result)
      await saveSetting('promo_analysis_date', now)
    } catch (e) { setError(e.message) }
    finally { setPromoLoading(false) }
  }

  async function handleDismiss() {
    setDismissLoading(true); setError(''); setDismissCollapsed(false)
    try {
      const result = await askDismissals(hrfData, matchReports)
      const now = new Date().toISOString()
      setDismissResponse(result)
      setDismissDate(now)
      await saveSetting('dismiss_analysis', result)
      await saveSetting('dismiss_analysis_date', now)
    } catch (e) { setError(e.message) }
    finally { setDismissLoading(false) }
  }

  const dateStyle = { fontSize: '0.68rem', color: 'var(--text-muted)', fontStyle: 'italic', marginLeft: 8 }

  return (
    <div style={{ display: 'flex', gap: 16, marginBottom: 20, flexWrap: 'wrap' }}>
      {promotableCount > 0 && (
        <div className="alert-card alert-success" style={{ flex: 1, minWidth: 300 }}>
          <h3 style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', flexWrap: 'wrap' }}
              onClick={() => setPromoCollapsed(c => !c)}>
            🎓 Promotions ({promotableCount} promouvable{promotableCount > 1 ? 's' : ''})
            {nearExpiry > 0 && <span style={{ color: 'var(--accent-orange)', marginLeft: 8, fontSize: '0.8rem' }}>⚠️ {nearExpiry} proche{nearExpiry > 1 ? 's' : ''} des 19 ans</span>}
            <span style={{ marginLeft: 8, fontSize: '0.75rem', color: 'var(--text-muted)' }}>{promoCollapsed ? '▶' : '▼'}</span>
            {promoDate && <span style={dateStyle}>({formatDateFR(promoDate)})</span>}
          </h3>
          {!promoCollapsed && (
            <>
              {promoResponse && <div className="alert-body" style={{ whiteSpace: 'pre-wrap' }}>{promoResponse}</div>}
              <button className="btn btn-sm btn-primary" onClick={handlePromo} disabled={promoLoading} style={{ marginTop: 10 }}>
                {promoLoading ? <><span className="loading-spinner" /> Analyse...</> : promoResponse ? '🔄 Relancer l\'analyse' : '🧠 Analyser les promotions'}
              </button>
            </>
          )}
        </div>
      )}

      {playerCount > 14 && (
        <div className="alert-card alert-warning" style={{ flex: 1, minWidth: 300 }}>
          <h3 style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', flexWrap: 'wrap' }}
              onClick={() => setDismissCollapsed(c => !c)}>
            🚨 Effectif surchargé ({playerCount}/14 recommandé)
            <span style={{ marginLeft: 8, fontSize: '0.75rem', color: 'var(--text-muted)' }}>{dismissCollapsed ? '▶' : '▼'}</span>
            {dismissDate && <span style={dateStyle}>({formatDateFR(dismissDate)})</span>}
          </h3>
          {!dismissCollapsed && (
            <>
              {dismissResponse && <div className="alert-body" style={{ whiteSpace: 'pre-wrap' }}>{dismissResponse}</div>}
              <button className="btn btn-sm btn-orange" onClick={handleDismiss} disabled={dismissLoading} style={{ marginTop: 10 }}>
                {dismissLoading ? <><span className="loading-spinner" /> Analyse...</> : dismissResponse ? '🔄 Relancer l\'analyse' : '🧠 Qui licencier ?'}
              </button>
            </>
          )}
        </div>
      )}

      {error && <div className="alert-card alert-warning" style={{ flex: '0 0 100%' }}><h3>⚠️ Erreur</h3><p>{error}</p></div>}
    </div>
  )
}
