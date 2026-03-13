import { useState, useEffect } from 'react'
import { parseHRF } from './utils/hrfParser'
import { loadHRFData, saveHRFData, loadMatchReports, saveMatchReport, loadSettings } from './utils/storage'
import PlayerTable from './components/PlayerTable'
import PlayerDetail from './components/PlayerDetail'
import ImportHRFModal from './components/ImportHRFModal'
import ImportReportModal from './components/ImportReportModal'
import RecruitmentModal from './components/RecruitmentModal'
import CompositionPanel from './components/CompositionPanel'
import AIAlerts from './components/AIAlerts'
import Settings from './components/Settings'

export default function App() {
  const [page, setPage] = useState('dashboard')
  const [hrfData, setHrfData] = useState(null)
  const [matchReports, setMatchReports] = useState({})
  const [hasApiKey, setHasApiKey] = useState(false)
  const [selectedPlayer, setSelectedPlayer] = useState(null)
  const [showImportHRF, setShowImportHRF] = useState(false)
  const [showImportReport, setShowImportReport] = useState(false)
  const [showRecruitment, setShowRecruitment] = useState(false)
  const [showComposition, setShowComposition] = useState(false)
  const [loading, setLoading] = useState(true)

  // Load data from D1 on mount
  useEffect(() => {
    async function init() {
      try {
        const [hrf, reports, settings] = await Promise.all([
          loadHRFData(),
          loadMatchReports(),
          loadSettings()
        ]);
        if (hrf) setHrfData(hrf)
        if (reports) setMatchReports(reports)
        setHasApiKey(!!settings?.api_key)
      } catch (e) {
        console.error('Init error:', e)
      } finally {
        setLoading(false)
      }
    }
    init()
  }, [])

  async function handleHRFImport(text) {
    const parsed = parseHRF(text)
    await saveHRFData(parsed)
    setHrfData(parsed)
    setShowImportHRF(false)
  }

  async function handleReportSave(matchId, report) {
    await saveMatchReport(matchId, report)
    const reports = await loadMatchReports()
    setMatchReports(reports)
    setShowImportReport(false)
  }

  if (loading) {
    return (
      <div className="app">
        <div className="empty-state">
          <div className="loading-spinner" style={{ width: 32, height: 32, margin: '0 auto 16px' }} />
          <p>Chargement...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="app">
      <header className="header">
        <div className="header-title">
          <h1>ai-trick</h1>
          <span className="subtitle">
            {hrfData ? `${hrfData.team.youthTeamName} — S${hrfData.team.season} J${hrfData.team.matchRound}` : 'Gestion Équipe Junior Hattrick'}
          </span>
        </div>
        <div className="header-actions">
          <button className="btn btn-primary" onClick={() => setShowImportHRF(true)}>
            📂 Importer HRF
          </button>
          <button className="btn btn-blue" onClick={() => setShowImportReport(true)} disabled={!hrfData}>
            📋 Rapport
          </button>
          <button className="btn btn-orange" onClick={() => setShowRecruitment(true)} disabled={!hrfData || !hasApiKey}>
            🔍 Recrutement
          </button>
          <button className="btn btn-purple" onClick={() => setShowComposition(true)} disabled={!hrfData || !hasApiKey}>
            📝 Composition
          </button>
        </div>
      </header>

      <nav className="nav-tabs">
        <button className={`nav-tab ${page === 'dashboard' ? 'active' : ''}`} onClick={() => setPage('dashboard')}>
          Tableau de bord
        </button>
        <button className={`nav-tab ${page === 'settings' ? 'active' : ''}`} onClick={() => setPage('settings')}>
          Paramètres
        </button>
      </nav>

      {page === 'dashboard' && (
        <>
          {!hrfData ? (
            <div className="empty-state">
              <div className="icon">📂</div>
              <h2>Bienvenue sur ai-trick !</h2>
              <p>Importe ton fichier HRF pour commencer.</p>
              <button className="btn btn-primary" onClick={() => setShowImportHRF(true)}>Importer un fichier HRF</button>
            </div>
          ) : (
            <>
              <AIAlerts hrfData={hrfData} matchReports={matchReports} />

              <div className="alert-card alert-info" style={{ marginBottom: 20 }}>
                <h3>🏋️ Entraînement senior : {hrfData.training.type} — Intensité {hrfData.training.level}% — Endurance {hrfData.training.staminaPart}%</h3>
              </div>

              <PlayerTable players={hrfData.youthPlayers} onSelectPlayer={setSelectedPlayer} />
            </>
          )}
        </>
      )}

      {page === 'settings' && <Settings onApiKeyChange={setHasApiKey} />}

      {showImportHRF && <ImportHRFModal onImport={handleHRFImport} onClose={() => setShowImportHRF(false)} />}
      {showImportReport && hrfData && <ImportReportModal players={hrfData.youthPlayers} existingReports={matchReports} onSave={handleReportSave} onClose={() => setShowImportReport(false)} />}
      {showRecruitment && <RecruitmentModal hrfData={hrfData} onClose={() => setShowRecruitment(false)} />}
      {showComposition && <CompositionPanel hrfData={hrfData} matchReports={matchReports} onClose={() => setShowComposition(false)} />}
      {selectedPlayer && <PlayerDetail player={selectedPlayer} matchReports={matchReports} onClose={() => setSelectedPlayer(null)} />}
    </div>
  )
}
