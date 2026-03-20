import { useState, useEffect } from 'react'
import { parseHRF, formatDateFR } from './utils/hrfParser'
import { loadHRFData, saveHRFData, loadMatchReports, saveMatchReport, deleteMatchReport, loadSettings, saveSetting, loadPredictions, savePredictions, loadPlayerHistory } from './utils/storage'
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

// Generate diff between old and new predictions
function generateAnalysisChangelog(oldPreds, newPreds, players) {
  const changes = [];
  for (const p of players) {
    const oldP = oldPreds[p.id] || {};
    const newP = newPreds.find(n => n.id === p.id) || {};
    const name = p.name;

    // Category change
    if (oldP.category && newP.category && oldP.category !== newP.category) {
      changes.push({ type: 'category', icon: '🔄', text: `${name} : ${oldP.category} → ${newP.category}`, detail: newP.justification || '' });
    } else if (!oldP.category && newP.category) {
      changes.push({ type: 'category', icon: '🆕', text: `${name} : classifié ${newP.category}`, detail: newP.justification || '' });
    }

    // Skill predictions changed
    const skillNames = { keeper: 'GK', defender: 'DEF', playmaker: 'CON', winger: 'AIL', passing: 'PAS', scorer: 'BUT', setPieces: 'CF' };
    for (const [key, label] of Object.entries(skillNames)) {
      const oldS = oldP.skills?.[key] || {};
      const newS = newP[key] || {};
      if (!newS || !newS.current && !newS.max) continue;

      if (newS.current && (!oldS.current || oldS.current !== newS.current)) {
        const arrow = oldS.current ? `~${oldS.current} → ~${newS.current}` : `? → ~${newS.current}`;
        changes.push({ type: 'skill', icon: '📊', text: `${name} : ${label} actuel ${arrow}`, detail: `Confiance: ${newS.confidence || '?'}` });
      }
      if (newS.max && (!oldS.max || oldS.max !== newS.max)) {
        const arrow = oldS.max ? `~${oldS.max} → ~${newS.max}` : `? → ~${newS.max}`;
        changes.push({ type: 'skill', icon: '📊', text: `${name} : ${label} max ${arrow}`, detail: `Confiance: ${newS.confidence || '?'}` });
      }
    }

    // Natural position changed
    if (oldP.naturalPosition && newP.naturalPosition && oldP.naturalPosition !== newP.naturalPosition) {
      changes.push({ type: 'position', icon: '📍', text: `${name} : poste ${oldP.naturalPosition} → ${newP.naturalPosition}` });
    }
  }
  return changes;
}

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
  const [analyzeResult, setAnalyzeResult] = useState(null)
  const [analysisDate, setAnalysisDate] = useState(null)
  const [analysisLog, setAnalysisLog] = useState([])
  const [analysisLogOpen, setAnalysisLogOpen] = useState(false)
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
        if (settings?.analysis_date) setAnalysisDate(settings.analysis_date)
        if (settings?.analysis_log) {
          try { setAnalysisLog(JSON.parse(settings.analysis_log)) } catch {}
        }
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
    setAnalyzeResult(null)
    try {
      const rawPreds = await askPredictions(hrfData, matchReports)
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
        category: p.category || null,
        justification: p.justification || null,
        naturalPosition: p.naturalPosition || null,
        missingSkills: p.missingSkills || [],
        potentialScore: scores[p.id] || 0
      }))

      // Generate changelog by comparing old vs new
      const changelog = generateAnalysisChangelog(predictions, rawPreds, hrfData.youthPlayers)
      const now = new Date().toISOString()

      await savePredictions(toSave)
      await saveSetting('analysis_date', now)
      await saveSetting('analysis_log', JSON.stringify(changelog))

      const preds = await loadPredictions()
      setPredictions(preds)
      setAnalysisDate(now)
      setAnalysisLog(changelog)

      // Summary feedback
      const cats = {}
      toSave.forEach(p => { const c = p.category || '?'; cats[c] = (cats[c] || 0) + 1 })
      const summary = Object.entries(cats).map(([k, v]) => `${v} ${k}`).join(', ')
      const changesCount = changelog.length
      setAnalyzeResult(`✅ ${toSave.length} joueurs analysés : ${summary}${changesCount > 0 ? ` — ${changesCount} changement${changesCount > 1 ? 's' : ''} détecté${changesCount > 1 ? 's' : ''}` : ' — première analyse'}`)
      setTimeout(() => setAnalyzeResult(null), 15000)
    } catch (e) {
      console.error('Analyze error:', e)
      setAnalyzeResult(`❌ ${e.message}`)
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

      {analyzeResult && (
        <div className={`alert-card ${analyzeResult.startsWith('✅') ? 'alert-success' : 'alert-warning'}`} style={{ margin: '0 0 16px 0' }}>
          <p>{analyzeResult}</p>
        </div>
      )}

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

              {/* Analysis status section */}
              <div className="alert-card" style={{ marginBottom: 20, borderColor: 'var(--accent-cyan)', background: 'rgba(6,182,212,0.05)' }}>
                <h3 style={{ cursor: analysisLog.length > 0 ? 'pointer' : 'default', display: 'flex', alignItems: 'center' }}
                    onClick={() => analysisLog.length > 0 && setAnalysisLogOpen(o => !o)}>
                  🧠 Analyse des joueurs
                  {analysisDate && <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontStyle: 'italic', marginLeft: 8 }}>({formatDateFR(analysisDate)})</span>}
                  {!analysisDate && <span style={{ fontSize: '0.72rem', color: 'var(--accent-orange)', marginLeft: 8 }}>— Aucune analyse effectuée</span>}
                  {analysisLog.length > 0 && <span style={{ marginLeft: 8, fontSize: '0.75rem', color: 'var(--text-muted)' }}>{analysisLogOpen ? '▼' : '▶'} {analysisLog.length} changement{analysisLog.length > 1 ? 's' : ''}</span>}
                </h3>
                {analysisLogOpen && analysisLog.length > 0 && (
                  <div style={{ marginTop: 8 }}>
                    {analysisLog.map((c, i) => (
                      <div key={i} style={{ fontSize: '0.78rem', padding: '4px 0', borderBottom: '1px solid var(--border)', display: 'flex', gap: 8 }}>
                        <span>{c.icon}</span>
                        <span style={{ color: 'var(--text-bright)' }}>{c.text}</span>
                        {c.detail && <span style={{ color: 'var(--text-muted)', fontSize: '0.72rem' }}>— {c.detail}</span>}
                      </div>
                    ))}
                  </div>
                )}
              </div>

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
      {showComposition && <CompositionPanel hrfData={hrfData} matchReports={matchReports} predictions={predictions} onClose={() => setShowComposition(false)} />}
      {selectedPlayer && <PlayerDetail player={selectedPlayer} matchReports={matchReports} predictions={predictions} score={scores[selectedPlayer.id]} playerHistory={playerHistory} onClose={() => setSelectedPlayer(null)} />}
      {showChangelog && <ChangelogModal onClose={() => setShowChangelog(false)} />}
    </div>
  )
}
