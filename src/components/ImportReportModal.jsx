import { useState, useMemo } from 'react'

export default function ImportReportModal({ players, existingReports, onSave, onClose }) {
  const matches = useMemo(() => {
    const seen = new Map()
    players.forEach(p => {
      if (p.lastMatch.id && p.lastMatch.date) seen.set(p.lastMatch.id, p.lastMatch.date)
    })
    return Array.from(seen.entries()).map(([id, date]) => ({ id, date })).sort((a, b) => new Date(b.date) - new Date(a.date))
  }, [players])

  const [matchId, setMatchId] = useState(matches[0]?.id || 'custom')
  const [customDate, setCustomDate] = useState('')
  const [rapport, setRapport] = useState('')
  const [compteRendu, setCompteRendu] = useState('')
  const [notesDetaillees, setNotesDetaillees] = useState('')

  function handleSave() {
    const id = matchId === 'custom' ? `custom_${Date.now()}` : matchId
    const date = matchId === 'custom' ? customDate : matches.find(m => m.id === matchId)?.date || ''
    onSave(id, { date, rapport: rapport.trim(), compteRendu: compteRendu.trim(), notesDetaillees: notesDetaillees.trim() })
  }

  const hasContent = rapport.trim() || compteRendu.trim() || notesDetaillees.trim()

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ width: 720 }}>
        <h2>📋 Importer un rapport de match</h2>

        <div className="form-group">
          <label>Match associé</label>
          <select value={matchId} onChange={e => setMatchId(e.target.value)}>
            {matches.map(m => (
              <option key={m.id} value={m.id}>
                {new Date(m.date).toLocaleDateString('fr-FR')} — ID {m.id}
                {existingReports[m.id] ? ' ✓ (déjà importé)' : ''}
              </option>
            ))}
            <option value="custom">Autre match (saisie manuelle)</option>
          </select>
        </div>

        {matchId === 'custom' && (
          <div className="form-group">
            <label>Date du match</label>
            <input type="text" value={customDate} onChange={e => setCustomDate(e.target.value)} placeholder="Ex: 2026-03-12 23:00:00" />
          </div>
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
          <button className="btn btn-blue" onClick={handleSave} disabled={!hasContent}>Enregistrer le rapport</button>
        </div>
      </div>
    </div>
  )
}
