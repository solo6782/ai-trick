import { useState } from 'react'
import { formatDateFR, parseDate } from '../utils/hrfParser'

export default function ReportsPage({ matchReports, onDelete, onEdit }) {
  const [expandedId, setExpandedId] = useState(null)
  const [editing, setEditing] = useState(null)
  const [editData, setEditData] = useState({})

  const entries = Object.entries(matchReports).sort((a, b) => {
    const da = parseDate(a[1].date) || new Date(0)
    const db = parseDate(b[1].date) || new Date(0)
    return db.getTime() - da.getTime()
  })

  function handleEdit(id, report) {
    setEditing(id)
    setEditData({
      rapport: report.rapport || '',
      compteRendu: report.compteRendu || '',
      notesDetaillees: report.notesDetaillees || ''
    })
  }

  function handleSaveEdit(id) {
    const report = matchReports[id]
    onEdit(id, {
      date: report.date,
      rapport: editData.rapport,
      compteRendu: editData.compteRendu,
      notesDetaillees: editData.notesDetaillees
    })
    setEditing(null)
    setEditData({})
  }

  function handleDelete(id) {
    if (confirm(`Supprimer le rapport du match ${id} ?`)) {
      onDelete(id)
    }
  }

  if (entries.length === 0) {
    return (
      <div className="empty-state">
        <div className="icon">📋</div>
        <h2>Aucun rapport importé</h2>
        <p>Utilise le bouton "Rapport" dans la barre du haut pour importer tes premiers rapports de match.</p>
      </div>
    )
  }

  return (
    <div>
      <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: 20 }}>📋 Rapports de match ({entries.length})</h2>

      {entries.map(([id, report]) => {
        const isExpanded = expandedId === id
        const isEditing = editing === id
        const hasRapport = !!report.rapport
        const hasCR = !!report.compteRendu
        const hasNotes = !!report.notesDetaillees
        const fieldCount = [hasRapport, hasCR, hasNotes].filter(Boolean).length

        return (
          <div key={id} className="alert-card" style={{
            background: 'var(--bg-card)',
            borderColor: isExpanded ? 'var(--accent-blue)' : 'var(--border)',
            marginBottom: 12,
            cursor: isEditing ? 'default' : 'pointer'
          }}>
            {/* Header */}
            <div
              onClick={() => { if (!isEditing) setExpandedId(isExpanded ? null : id) }}
              style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
            >
              <h3 style={{ color: 'var(--text-bright)', fontSize: '0.9rem' }}>
                <span style={{ color: 'var(--accent-blue)' }}>
                  {report.date ? formatDateFR(report.date, { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' }) : 'Date inconnue'}
                </span>
                <span style={{ color: 'var(--text-muted)', marginLeft: 12, fontSize: '0.78rem', fontFamily: 'var(--font-mono)' }}>
                  ID {id}
                </span>
              </h3>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  {fieldCount}/3 champs
                </span>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                  {isExpanded ? '▼' : '▶'}
                </span>
              </div>
            </div>

            {/* Expanded content */}
            {isExpanded && !isEditing && (
              <div style={{ marginTop: 16 }}>
                {hasRapport && (
                  <div style={{ marginBottom: 16 }}>
                    <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--accent-green)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                      Rapport de l'entraîneur
                    </div>
                    <div className="scout-comment" style={{ borderLeftColor: 'var(--accent-green)', whiteSpace: 'pre-wrap' }}>
                      {report.rapport}
                    </div>
                  </div>
                )}

                {hasCR && (
                  <div style={{ marginBottom: 16 }}>
                    <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--accent-orange)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                      Compte-rendu du match
                    </div>
                    <div className="scout-comment" style={{ borderLeftColor: 'var(--accent-orange)', whiteSpace: 'pre-wrap' }}>
                      {report.compteRendu}
                    </div>
                  </div>
                )}

                {hasNotes && (
                  <div style={{ marginBottom: 16 }}>
                    <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--accent-purple)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                      Notes détaillées
                    </div>
                    <div className="scout-comment" style={{ borderLeftColor: 'var(--accent-purple)', whiteSpace: 'pre-wrap', fontFamily: 'var(--font-mono)', fontSize: '0.75rem' }}>
                      {report.notesDetaillees}
                    </div>
                  </div>
                )}

                <div style={{ display: 'flex', gap: 8, marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border)' }}>
                  <button className="btn btn-sm btn-blue" onClick={(e) => { e.stopPropagation(); handleEdit(id, report) }}>
                    ✏️ Modifier
                  </button>
                  <button className="btn btn-sm" onClick={(e) => { e.stopPropagation(); handleDelete(id) }}
                    style={{ borderColor: 'var(--accent-red)', color: 'var(--accent-red)' }}>
                    🗑️ Supprimer
                  </button>
                </div>

                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 8 }}>
                  Enregistré le {report.savedAt ? formatDateFR(report.savedAt) : '—'}
                </div>
              </div>
            )}

            {/* Edit mode */}
            {isExpanded && isEditing && (
              <div style={{ marginTop: 16 }} onClick={e => e.stopPropagation()}>
                <div className="form-group">
                  <label>Rapport de l'entraîneur</label>
                  <textarea value={editData.rapport} onChange={e => setEditData({ ...editData, rapport: e.target.value })} rows={6} />
                </div>
                <div className="form-group">
                  <label>Compte-rendu du match</label>
                  <textarea value={editData.compteRendu} onChange={e => setEditData({ ...editData, compteRendu: e.target.value })} rows={6} />
                </div>
                <div className="form-group">
                  <label>Notes détaillées</label>
                  <textarea value={editData.notesDetaillees} onChange={e => setEditData({ ...editData, notesDetaillees: e.target.value })} rows={6} />
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="btn btn-sm" onClick={() => setEditing(null)}>Annuler</button>
                  <button className="btn btn-sm btn-primary" onClick={() => handleSaveEdit(id)}>Sauvegarder</button>
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
