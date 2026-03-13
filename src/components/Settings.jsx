import { useState, useEffect } from 'react'
import { loadSettings, saveApiKey, saveCustomNotes } from '../utils/storage'

export default function Settings({ onApiKeyChange }) {
  const [apiKey, setApiKey] = useState('')
  const [notes, setNotes] = useState('')
  const [saved, setSaved] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadSettings().then(s => {
      setApiKey(s.api_key || '')
      setNotes(s.custom_notes || '')
      setLoading(false)
    })
  }, [])

  async function handleSaveKey() {
    await saveApiKey(apiKey)
    onApiKeyChange(!!apiKey)
    setSaved('Clé API sauvegardée'); setTimeout(() => setSaved(''), 2000)
  }

  async function handleSaveNotes() {
    await saveCustomNotes(notes)
    setSaved('Notes sauvegardées'); setTimeout(() => setSaved(''), 2000)
  }

  if (loading) return <div className="empty-state"><div className="loading-spinner" style={{ width: 24, height: 24, margin: '0 auto' }} /></div>

  return (
    <div className="settings-page">
      <h2>⚙️ Paramètres</h2>

      {saved && <div className="alert-card alert-success" style={{ marginBottom: 20 }}><h3>✅ {saved}</h3></div>}

      <div className="alert-card alert-info" style={{ marginBottom: 24 }}>
        <h3>🔑 Clé API Anthropic</h3>
        <p style={{ marginBottom: 12 }}>
          Nécessaire pour les analyses IA. Ta clé est stockée dans la base D1 de ton app et envoyée directement à l'API Anthropic.
        </p>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            type="password" value={apiKey} onChange={e => setApiKey(e.target.value)}
            placeholder="sk-ant-..."
            style={{ flex: 1, padding: '10px 14px', background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)', fontFamily: 'var(--font-mono)', fontSize: '0.82rem' }}
          />
          <button className="btn btn-primary" onClick={handleSaveKey}>Sauvegarder</button>
        </div>
      </div>

      <div className="alert-card" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)', marginBottom: 24 }}>
        <h3 style={{ color: 'var(--accent-purple)' }}>📝 Notes et règles complémentaires</h3>
        <p style={{ marginBottom: 12 }}>
          Ajoute ici des règles ou infos que l'IA doit prendre en compte en plus des règles de base.
        </p>
        <textarea
          value={notes} onChange={e => setNotes(e.target.value)}
          placeholder={"Ex:\n- Je veux prioriser les joueurs techniques\n- Ne pas promouvoir avant la fin de saison\n- Mon prochain entraînement senior sera Ailier"}
          rows={8}
          style={{ width: '100%', padding: '12px 14px', background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)', fontFamily: 'var(--font-main)', fontSize: '0.85rem', resize: 'vertical', marginBottom: 8 }}
        />
        <button className="btn btn-purple" onClick={handleSaveNotes}>Sauvegarder les notes</button>
      </div>

      <div style={{ marginTop: 32, padding: 20, borderTop: '1px solid var(--border)' }}>
        <h3 style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 12 }}>À propos</h3>
        <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.7 }}>
          <strong>ai-trick</strong> — Outil d'aide à la gestion d'équipe junior Hattrick, propulsé par l'IA.<br />
          Modèle : <span style={{ fontFamily: 'var(--font-mono)' }}>claude-sonnet-4-20250514</span><br />
          Stockage : Cloudflare D1 (base de données persistante).<br />
        </p>
      </div>
    </div>
  )
}
