import { useState, useMemo } from 'react'
import { formatDateFR } from '../utils/hrfParser'

export default function ImportReportModal({ players, existingReports, onSave, onClose }) {
  const matches = useMemo(() => {
    const seen = new Map()
    players.forEach(p => {
      if (p.lastMatch.id && p.lastMatch.date) seen.set(p.lastMatch.id, p.lastMatch.date)
    })
    return Array.from(seen.entries()).map(([id, date]) => ({ id, date })).sort((a, b) => new Date(b.date) - new Date(a.date))
  }, [players])

  const [mode, setMode] = useState(matches.length > 0 ? 'select' : 'manual')
  const [matchId, setMatchId] = useState(matches[0]?.id || '')
  const [manualId, setManualId] = useState('')
  const [manualDate, setManualDate] = useState('')
  const [rapport, setRapport] = useState('')
  const [compteRendu, setCompteRendu] = useState('')
  const [notesDetaillees, setNotesDetaillees] = useState('')

  function handleSave() {
    let id, date
    if (mode === 'select') {
      id = matchId
      date = matches.find(m => m.id === matchId)?.date || ''
    } else {
      id = manualId.trim()
      date = manualDate.trim()
    }
    if (!id) return
    onSave(id, { date, rapport: rapport.trim(), compteRendu: compteRendu.trim(), notesDetaillees: notesDetaillees.trim() })
  }

  const hasContent = rapport.trim() || compteRendu.trim() || notesDetaillees.trim()
  const hasId = mode === 'select' ? !!matchId : !!manualId.trim()

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ width: 720 }}>
        <h2>📋 Importer un rapport de match</h2>

        {/* Mode toggle */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          {matches.length > 0 && (
            <button className={`btn btn-sm ${mode === 'select' ? 'btn-blue' : ''}`} onClick={() => setMode('select')}>
              Sélectionner un match
            </button>
          )}
          <button className={`btn btn-sm ${mode === 'manual' ? 'btn-blue' : ''}`} onClick={() => setMode('manual')}>
            Saisir l'ID manuellement
          </button>
        </div>

        {mode === 'select' && (
          <div className="form-group">
            <label>Match associé</label>
            <select value={matchId} onChange={e => setMatchId(e.target.value)}>
              {matches.map(m => (
                <option key={m.id} value={m.id}>
                  {formatDateFR(m.date)} — ID {m.id}
                  {existingReports[m.id] ? ' ✓ (déjà importé)' : ''}
                </option>
              ))}
            </select>
          </div>
        )}

        {mode === 'manual' && (
          <>
            <div className="form-group">
              <label>ID du match</label>
              <input type="text" value={manualId} onChange={e => setManualId(e.target.value)} placeholder="Ex: 142801848" />
            </div>
            <div className="form-group">
              <label>Date du match (JJ-MM-AAAA)</label>
              <input type="text" value={manualDate} onChange={e => setManualDate(e.target.value)} placeholder="Ex: 05-03-2026" />
            </div>
          </>
        )}

        <div className="form-group">
          <label>Rapport de l'entraîneur</label>
          <textarea value={rapport} onChange={e => setRapport(e.target.value)} placeholder="Colle ici le rapport de l'entraîneur junior (commentaires post-match)..." rows={6} />
        </div>

        <div className="form-group">
          <label>Compte-rendu du match</label>
          <textarea value={compteRendu} onChange={e => setCompteRendu(e.target.value)} placeholder="Colle ici le compte-rendu détaillé du match (récit, événements)..." rows={6} />
        </div>

        <div className="form-group">
          <label>Notes détaillées (ratings par secteur)</label>
          <textarea value={notesDetaillees} onChange={e => setNotesDetaillees(e.target.value)} placeholder="Colle ici les notes détaillées du match (BBCode avec les ratings par secteur)..." rows={6} />
        </div>

        <div className="modal-actions">
          <button className="btn" onClick={onClose}>Annuler</button>
          <button className="btn btn-blue" onClick={handleSave} disabled={!hasContent || !hasId}>Enregistrer le rapport</button>
        </div>
      </div>
    </div>
  )
}
