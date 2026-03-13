/**
 * Storage service — Persists data via Cloudflare D1
 * All functions are async (network calls to worker API)
 */

// ── HRF Data ──

export async function saveHRFData(data) {
  await fetch('/api/hrf', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
}

export async function loadHRFData() {
  try {
    const res = await fetch('/api/hrf');
    const data = await res.json();
    return data;
  } catch {
    return null;
  }
}

// ── Match Reports ──

export async function saveMatchReport(matchId, report) {
  await fetch('/api/reports', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      matchId,
      date: report.date,
      rapport: report.rapport,
      compteRendu: report.compteRendu,
      notesDetaillees: report.notesDetaillees
    })
  });
}

export async function loadMatchReports() {
  try {
    const res = await fetch('/api/reports');
    return await res.json();
  } catch {
    return {};
  }
}

export async function deleteMatchReport(matchId) {
  await fetch('/api/reports', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ matchId })
  });
}

// ── AI Predictions ──

export async function savePredictions(players) {
  await fetch('/api/predictions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ players })
  });
}

export async function loadPredictions() {
  try {
    const res = await fetch('/api/predictions');
    return await res.json();
  } catch {
    return {};
  }
}

// ── Match History ──

export async function saveMatchHistory(entries) {
  await fetch('/api/history', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ entries })
  });
}

export async function loadMatchHistory(playerId = null) {
  try {
    const url = playerId ? `/api/history?player_id=${playerId}` : '/api/history';
    const res = await fetch(url);
    return await res.json();
  } catch {
    return [];
  }
}

// ── Player Match History ──

export async function savePlayerHistory(records) {
  await fetch('/api/history', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ records })
  });
}

export async function loadPlayerHistory(playerId) {
  try {
    const url = playerId ? `/api/history?player_id=${playerId}` : '/api/history';
    const res = await fetch(url);
    return await res.json();
  } catch {
    return [];
  }
}

// ── Settings ──

export async function saveSetting(key, value) {
  await fetch('/api/settings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ key, value })
  });
}

export async function loadSettings() {
  try {
    const res = await fetch('/api/settings');
    return await res.json();
  } catch {
    return {};
  }
}

export async function saveApiKey(key) {
  return saveSetting('api_key', key);
}

export async function loadApiKey() {
  const settings = await loadSettings();
  return settings.api_key || '';
}

export async function saveCustomNotes(notes) {
  return saveSetting('custom_notes', notes);
}

export async function loadCustomNotes() {
  const settings = await loadSettings();
  return settings.custom_notes || '';
}
