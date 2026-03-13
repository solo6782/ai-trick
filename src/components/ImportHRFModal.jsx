import { useState, useRef } from 'react'

export default function ImportHRFModal({ onImport, onClose }) {
  const [text, setText] = useState('')
  const fileRef = useRef()

  function handleFile(e) {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => setText(ev.target.result)
    reader.readAsText(file, 'utf-8')
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <h2>📂 Importer un fichier HRF</h2>
        <div className="form-group">
          <label>Sélectionner un fichier .hrf</label>
          <input type="file" accept=".hrf,.txt" ref={fileRef} onChange={handleFile} />
        </div>
        <div className="form-group">
          <label>Ou coller le contenu directement</label>
          <textarea value={text} onChange={e => setText(e.target.value)} placeholder="Colle le contenu de ton fichier HRF ici..." rows={10} />
        </div>
        <div className="modal-actions">
          <button className="btn" onClick={onClose}>Annuler</button>
          <button className="btn btn-primary" onClick={() => onImport(text)} disabled={!text.trim()}>Importer</button>
        </div>
      </div>
    </div>
  )
}
