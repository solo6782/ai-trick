/**
 * PitchView — Displays a football formation on a pitch graphic
 */

const POSITION_COORDS = {
  'Gardien':          { row: 0, col: 2 },
  'Arr. droit':       { row: 1, col: 0 },
  'DC droit':         { row: 1, col: 1 },
  'DC central':       { row: 1, col: 2 },
  'DC gauche':        { row: 1, col: 3 },
  'Arr. gauche':      { row: 1, col: 4 },
  'Ailier droit':     { row: 2, col: 0 },
  'Milieu droit':     { row: 2, col: 1 },
  'Milieu central':   { row: 2, col: 2 },
  'Milieu gauche':    { row: 2, col: 3 },
  'Ailier gauche':    { row: 2, col: 4 },
  'Attaquant droit':  { row: 3, col: 1 },
  'Attaquant central':{ row: 3, col: 2 },
  'Attaquant gauche': { row: 3, col: 3 },
};

function getRowPositions(lineup, row) {
  return lineup
    .filter(p => POSITION_COORDS[p.position]?.row === row)
    .sort((a, b) => (POSITION_COORDS[a.position]?.col || 0) - (POSITION_COORDS[b.position]?.col || 0));
}

function PlayerBadge({ player, compact }) {
  const lastName = player.playerName.split(' ').pop();
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 2,
      minWidth: compact ? 70 : 90,
    }}>
      <div style={{
        width: compact ? 36 : 44,
        height: compact ? 36 : 44,
        borderRadius: '50%',
        background: 'var(--accent-green-dim)',
        border: '2px solid var(--accent-green)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: compact ? '0.7rem' : '0.8rem',
        fontWeight: 700,
        color: 'var(--accent-green)',
      }}>
        {lastName.substring(0, 3).toUpperCase()}
      </div>
      <div style={{
        fontSize: compact ? '0.65rem' : '0.72rem',
        fontWeight: 600,
        color: 'var(--text-bright)',
        textAlign: 'center',
        maxWidth: compact ? 80 : 100,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap'
      }}>
        {lastName}
      </div>
      <div style={{
        fontSize: '0.6rem',
        color: 'var(--text-muted)',
        textAlign: 'center',
        maxWidth: compact ? 80 : 100,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap'
      }}>
        {player.position}
      </div>
    </div>
  );
}

function PitchRow({ players, compact }) {
  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      gap: compact ? 8 : 16,
      padding: '8px 0'
    }}>
      {players.map((p, i) => <PlayerBadge key={i} player={p} compact={compact} />)}
    </div>
  );
}

export default function PitchView({ lineup, formation, subs }) {
  if (!lineup || lineup.length === 0) return null;

  const rows = [
    getRowPositions(lineup, 3), // Attackers (top)
    getRowPositions(lineup, 2), // Midfielders
    getRowPositions(lineup, 1), // Defenders
    getRowPositions(lineup, 0), // Goalkeeper
  ];

  const compact = lineup.length > 9;

  return (
    <div style={{ marginBottom: 16 }}>
      {/* Formation label */}
      <div style={{
        textAlign: 'center',
        fontSize: '0.85rem',
        fontWeight: 700,
        color: 'var(--accent-green)',
        marginBottom: 8
      }}>
        {formation || ''}
      </div>

      {/* Pitch */}
      <div style={{
        background: 'linear-gradient(180deg, #1a3d1a 0%, #245024 30%, #1a3d1a 50%, #245024 70%, #1a3d1a 100%)',
        border: '2px solid #2d5a2d',
        borderRadius: 'var(--radius-md)',
        padding: '16px 8px',
        position: 'relative',
        minHeight: 320,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
      }}>
        {/* Center line */}
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '10%',
          right: '10%',
          borderTop: '1px solid rgba(255,255,255,0.15)',
        }} />
        {/* Center circle */}
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          width: 60,
          height: 60,
          marginTop: -30,
          marginLeft: -30,
          border: '1px solid rgba(255,255,255,0.15)',
          borderRadius: '50%',
        }} />

        {rows.map((rowPlayers, i) => (
          rowPlayers.length > 0 && <PitchRow key={i} players={rowPlayers} compact={compact} />
        ))}
      </div>

      {/* Subs */}
      {subs && subs.length > 0 && (
        <div style={{ marginTop: 12, padding: '8px 12px', background: 'var(--bg-input)', borderRadius: 'var(--radius-sm)' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6, textTransform: 'uppercase' }}>
            Remplaçants / Non alignés
          </div>
          {subs.map((s, i) => (
            <div key={i} style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', padding: '2px 0' }}>
              <strong>{s.playerName}</strong> — <span style={{ color: 'var(--text-muted)' }}>{s.reason}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
