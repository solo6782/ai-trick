import { useState, useRef } from 'react'
import { parseHRF, extractMatchHistory } from '../utils/hrfParser'
import { savePlayerHistory } from '../utils/storage'

export default function ImportHRFModal({ onImport, onHistoryImported, onClose }) {
  const [mode, setMode] = useState('current') // 'current' or 'history'
  const [text, setText] = useState('')
  const [historyFiles, setHistoryFiles] = useState([])
  const [importing, setImporting] = useState(false)
  const [progress, setProgress] = useState('')
  const fileRef = useRef()
  const historyRef = useRef()

  function handleFile(e) {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => setText(ev.target.result)
    reader.readAsText(file, 'utf-8')
  }

  function handleHistoryFiles(e) {
    setHistoryFiles(Array.from(e.target.files))
  }

  async function handleBulkImport() {
    if (historyFiles.length === 0) return
    setImporting(true)
    setProgress(`0/${historyFiles.length} fichiers traités...`)

    let totalRecords = 0
    let allRecords = []

    for (let i = 0; i < historyFiles.length; i++) {
      const file = historyFiles[i]
      setProgress(`${i + 1}/${historyFiles.length} — ${file.name}`)

      try {
        const text = await file.text()
        const parsed = parseHRF(text)
        const records = extractMatchHistory(parsed)
        allRecords = allRecords.concat(records)
        totalRecords += records.length
      } catch (e) {
        console.error(`Erreur sur ${file.name}:`, e)
      }
    }

    // Save records in chunks (API has limits)
    if (allRecords.length > 0) {
      const CHUNK = 200
      for (let i = 0; i < allRecords.length; i += CHUNK) {
        const chunk = allRecords.slice(i, i + CHUNK)
        setProgress(`Sauvegarde ${i + chunk.length}/${allRecords.length}...`)
        await savePlayerHistory(chunk)
      }
    }

    setProgress(`✅ Terminé ! ${totalRecords} notes individuelles extraites de ${historyFiles.length} fichiers.`)
    setImporting(false)
    if (onHistoryImported) onHistoryImported()
  }

  async function handleCurrentImport() {
    // Import as current HRF + extract history
    const parsed = parseHRF(text)
    const records = extractMatchHistory(parsed)
    if (records.length > 0) {
      await savePlayerHistory(records)
    }
    onImport(text)
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ width: 680 }}>
        <h2>📂 Importer des fichiers HRF</h2>

        {/* Mode selector */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
          <button
            className={`btn btn-sm ${mode === 'current' ? 'btn-primary' : ''}`}
            onClick={() => setMode('current')}
          >
            HRF courant
          </button>
          <button
            className={`btn btn-sm ${mode === 'history' ? 'btn-blue' : ''}`}
            onClick={() => setMode('history')}
          >
            📚 Importer historique (en masse)
          </button>
        </div>

        {mode === 'current' && (
          <>
            <div className="alert-card alert-info" style={{ marginBottom: 16 }}>
              <h3>ℹ️ Import courant</h3>
              <p>Importe le HRF le plus récent. Il remplace le précédent et les notes individuelles des joueurs sont ajoutées à l'historique.</p>
            </div>

            <div className="form-group">
              <label>Sélectionner un fichier .hrf</label>
              <input type="file" accept=".hrf,.txt" ref={fileRef} onChange={handleFile} />
            </div>
            <div className="form-group">
              <label>Ou coller le contenu directement</label>
              <textarea value={text} onChange={e => setText(e.target.value)} placeholder="Colle le contenu de ton fichier HRF ici..." rows={8} />
            </div>

            <div className="modal-actions">
              <button className="btn" onClick={onClose}>Annuler</button>
              <button className="btn btn-primary" onClick={handleCurrentImport} disabled={!text.trim()}>Importer</button>
            </div>
          </>
        )}

        {mode === 'history' && (
          <>
            <div className="alert-card alert-info" style={{ marginBottom: 16 }}>
              <h3>📚 Import historique</h3>
              <p>
                Sélectionne tous tes anciens fichiers HRF. L'app va extraire les notes individuelles de chaque joueur pour chaque match
                et les stocker dans l'historique. Le HRF courant ne sera <strong>pas</strong> remplacé.
                Les doublons sont automatiquement ignorés.
              </p>
            </div>

            <div className="form-group">
              <label>Sélectionner les fichiers HRF ({historyFiles.length} sélectionné{historyFiles.length > 1 ? 's' : ''})</label>
              <input
                type="file"
                accept=".hrf,.txt"
                multiple
                ref={historyRef}
                onChange={handleHistoryFiles}
              />
            </div>

            {historyFiles.length > 0 && (
              <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: 16, maxHeight: 150, overflowY: 'auto' }}>
                {historyFiles.map((f, i) => (
                  <div key={i} style={{ padding: '2px 0', fontFamily: 'var(--font-mono)', fontSize: '0.75rem' }}>{f.name}</div>
                ))}
              </div>
            )}

            {progress && (
              <div className="alert-card" style={{
                background: progress.startsWith('✅') ? 'var(--accent-green-dim)' : 'var(--bg-card)',
                borderColor: progress.startsWith('✅') ? 'var(--accent-green)' : 'var(--border)',
                marginBottom: 16
              }}>
                <p style={{ color: progress.startsWith('✅') ? 'var(--accent-green)' : 'var(--text-secondary)' }}>{progress}</p>
              </div>
            )}

            <div className="modal-actions">
              <button className="btn" onClick={onClose}>Fermer</button>
              <button
                className="btn btn-blue"
                onClick={handleBulkImport}
                disabled={historyFiles.length === 0 || importing}
              >
                {importing ? <><span className="loading-spinner" /> Import en cours...</> : `📚 Importer ${historyFiles.length} fichier${historyFiles.length > 1 ? 's' : ''}`}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
