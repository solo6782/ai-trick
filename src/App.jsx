import { useState, useEffect } from 'react'
import { parseHRF } from './utils/hrfParser'
import { loadHRFData, saveHRFData, loadMatchReports, saveMatchReport, deleteMatchReport, loadSettings, loadPredictions, savePredictions, loadPlayerHistory } from './utils/storage'
import { calculatePotentialScore } from './utils/scoreCalculator'
import { askPredictions } from './utils/aiService'
import { VERSION } from './version'
import PlayerTable from './components/PlayerTable'
import PlayerDetail from './components/PlayerDetail'
import ImportHRFModal from './components/ImportHRFModal'
import ImportReportModal from './components/ImportReportModal'
import RecruitmentModal from './components/RecruitmentModal'
import CompositionPanel from './components/CompositionPanel'
import AIAlerts from './components/AIAlerts'
import ReportsPage from './components/ReportsPage'
import ChangelogModal from './components/ChangelogModal'
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
  const [showChangelog, setShowChangelog] = useState(false)
  const [predictions, setPredictions] = useState({})
  const [scores, setScores] = useState({})
  const [playerHistory, setPlayerHistory] = useState([])
  const [analyzing, setAnalyzing] = useState(false)
  const [loading, setLoading] = useState(true)

  // Calculate scores whenever hrfData changes
  function recalcScores(players) {
    const s = {};
    for (const p of players) s[p.id] = calculatePotentialScore(p);
    setScores(s);
  }

  // Load data from D1 on mount
  useEffect(() => {
    async function init() {
      try {
        const [hrf, reports, settings, preds, history] = await Promise.all([
          loadHRFData(),
          loadMatchReports(),
          loadSettings(),
          loadPredictions(),
          loadPlayerHistory()
        ]);
        if (hrf) { setHrfData(hrf); recalcScores(hrf.youthPlayers); }
        if (reports) setMatchReports(reports)
        if (preds) setPredictions(preds)
        if (history) setPlayerHistory(history)
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
    recalcScores(parsed.youthPlayers)
    // Reload history (ImportHRFModal already saved history records)
    const history = await loadPlayerHistory()
    setPlayerHistory(history)
    setShowImportHRF(false)
  }

  async function handleReportSave(matchId, report) {
    await saveMatchReport(matchId, report)
    const reports = await loadMatchReports()
    setMatchReports(reports)
    setShowImportReport(false)
  }

  async function handleReportDelete(matchId) {
    await deleteMatchReport(matchId)
    const reports = await loadMatchReports()
    setMatchReports(reports)
  }

  async function handleReportEdit(matchId, report) {
    await saveMatchReport(matchId, report)
    const reports = await loadMatchReports()
    setMatchReports(reports)
  }

  async function handleAnalyze() {
    setAnalyzing(true)
    try {
      const rawPreds = await askPredictions(hrfData, matchReports)
      // Transform AI response into storage format
      const toSave = rawPreds.map(p => ({
        id: p.id,
        skills: {
          keeper: p.keeper || {},
          defender: p.defender || {},
          playmaker: p.playmaker || {},
          winger: p.winger || {},
          passing: p.passing || {},
          scorer: p.scorer || {},
          setPieces: p.setPieces || {}
        },
        potentialScore: scores[p.id] || 0
      }))
      await savePredictions(toSave)
      const preds = await loadPredictions()
      setPredictions(preds)
    } catch (e) {
      console.error('Analyze error:', e)
      alert('Erreur d\'analyse : ' + e.message)
    } finally {
      setAnalyzing(false)
    }
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
          <span onClick={() => setShowChangelog(true)} style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', cursor: 'pointer', textDecoration: 'underline', textDecorationStyle: 'dotted' }} title="Voir le changelog">v{VERSION}</span>
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
          <button className="btn" onClick={handleAnalyze} disabled={!hrfData || !hasApiKey || analyzing}
            style={{ borderColor: 'var(--accent-cyan)', color: 'var(--accent-cyan)' }}>
            {analyzing ? <><span className="loading-spinner" style={{ borderTopColor: 'var(--accent-cyan)' }} /> Analyse...</> : '🧠 Analyser'}
          </button>
        </div>
      </header>

      <nav className="nav-tabs">
        <button className={`nav-tab ${page === 'dashboard' ? 'active' : ''}`} onClick={() => setPage('dashboard')}>
          Tableau de bord
        </button>
        <button className={`nav-tab ${page === 'reports' ? 'active' : ''}`} onClick={() => setPage('reports')}>
          Rapports ({Object.keys(matchReports).length})
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

              <PlayerTable players={hrfData.youthPlayers} predictions={predictions} scores={scores} onSelectPlayer={setSelectedPlayer} />
            </>
          )}
        </>
      )}

      {page === 'settings' && <Settings onApiKeyChange={setHasApiKey} />}

      {page === 'reports' && <ReportsPage matchReports={matchReports} onDelete={handleReportDelete} onEdit={handleReportEdit} />}

      {showImportHRF && <ImportHRFModal onImport={handleHRFImport} onHistoryImported={async () => { const h = await loadPlayerHistory(); setPlayerHistory(h); }} onClose={() => setShowImportHRF(false)} />}
      {showImportReport && hrfData && <ImportReportModal players={hrfData.youthPlayers} existingReports={matchReports} onSave={handleReportSave} onClose={() => setShowImportReport(false)} />}
      {showRecruitment && <RecruitmentModal hrfData={hrfData} onClose={() => setShowRecruitment(false)} />}
      {showComposition && <CompositionPanel hrfData={hrfData} matchReports={matchReports} onClose={() => setShowComposition(false)} />}
      {selectedPlayer && <PlayerDetail player={selectedPlayer} matchReports={matchReports} predictions={predictions} score={scores[selectedPlayer.id]} playerHistory={playerHistory} onClose={() => setSelectedPlayer(null)} />}
      {showChangelog && <ChangelogModal onClose={() => setShowChangelog(false)} />}
    </div>
  )
}
