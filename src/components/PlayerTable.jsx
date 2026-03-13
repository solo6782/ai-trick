import { useState } from 'react'
import { getPositionLabel, formatAge, formatPromotion, getSkillColor } from '../utils/hrfParser'
import { getScoreColor } from '../utils/scoreCalculator'

const SKILL_MAP = {
  keeper: 'GK', defender: 'DEF', playmaker: 'CON',
  winger: 'AIL', passing: 'PAS', scorer: 'BUT', setPieces: 'CF'
};

function SkillCell({ skill, prediction }) {
  const pred = prediction || {};

  // Determine displayed current and max, merging HRF + predictions
  const hrfCur = skill.current;
  const hrfMax = skill.max;
  const predCur = pred.current !== undefined ? pred.current : null;
  const predMax = pred.max !== undefined ? pred.max : null;

  const showCur = hrfCur !== null ? hrfCur : predCur;
  const showMax = hrfMax !== null ? hrfMax : predMax;
  const curIsPredicted = hrfCur === null && predCur !== null;
  const maxIsPredicted = hrfMax === null && predMax !== null;

  if (showCur === null && showMax === null) {
    return <td className="skill-cell unknown">—</td>
  }

  const color = getSkillColor(hrfCur, hrfMax); // color based on HRF data only
  const hasPrediction = curIsPredicted || maxIsPredicted;

  let curStr = showCur !== null ? `${curIsPredicted ? '~' : ''}${showCur}` : '?';
  let maxStr = showMax !== null ? `${maxIsPredicted ? '~' : ''}${showMax}` : '?';

  return (
    <td className={`skill-cell ${hasPrediction ? 'predicted' : color}`}
        title={hasPrediction ? `Prédiction IA (${pred.confidence || '?'})` : ''}>
      {curStr}/{maxStr}
    </td>
  );
}

export default function PlayerTable({ players, predictions, scores, onSelectPlayer }) {
  const [sortField, setSortField] = useState('score')
  const [sortDir, setSortDir] = useState('desc')

  function handleSort(field) {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortField(field); setSortDir('desc') }
  }

  const sorted = [...players].sort((a, b) => {
    let va, vb
    switch (sortField) {
      case 'name': va = a.name; vb = b.name; break
      case 'totalDays': va = a.totalDays; vb = b.totalDays; break
      case 'canBePromotedIn': va = a.canBePromotedIn; vb = b.canBePromotedIn; break
      case 'lastRating': va = a.lastMatch.rating || 0; vb = b.lastMatch.rating || 0; break
      case 'score': va = scores[a.id] || 0; vb = scores[b.id] || 0; break
      default: va = scores[a.id] || 0; vb = scores[b.id] || 0
    }
    if (typeof va === 'string') return sortDir === 'asc' ? va.localeCompare(vb) : vb.localeCompare(va)
    return sortDir === 'asc' ? va - vb : vb - va
  })

  const arrow = sortDir === 'asc' ? ' ↑' : ' ↓'

  return (
    <div className="table-container">
      <table>
        <thead>
          <tr>
            <th onClick={() => handleSort('score')} style={{ cursor: 'pointer' }} title="Score de potentiel">
              Pot.{sortField === 'score' ? arrow : ''}
            </th>
            <th onClick={() => handleSort('name')} style={{ cursor: 'pointer' }}>Joueur{sortField === 'name' ? arrow : ''}</th>
            <th onClick={() => handleSort('totalDays')} style={{ cursor: 'pointer' }}>Âge{sortField === 'totalDays' ? arrow : ''}</th>
            <th>Spé.</th>
            <th onClick={() => handleSort('canBePromotedIn')} style={{ cursor: 'pointer' }}>Promo{sortField === 'canBePromotedIn' ? arrow : ''}</th>
            <th>Statut</th>
            <th title="Gardien">GK</th>
            <th title="Défense">DEF</th>
            <th title="Construction">CON</th>
            <th title="Ailier">AIL</th>
            <th title="Passe">PAS</th>
            <th title="Buteur">BUT</th>
            <th title="Coup franc">CF</th>
            <th>Poste</th>
            <th onClick={() => handleSort('lastRating')} style={{ cursor: 'pointer' }}>★{sortField === 'lastRating' ? arrow : ''}</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map(p => {
            const pred = predictions[p.id]?.skills || {};
            const score = scores[p.id] || 0;
            return (
              <tr key={p.id} onClick={() => onSelectPlayer(p)}>
                <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.82rem', fontWeight: 700, color: getScoreColor(score), textAlign: 'center' }}>
                  {score}
                </td>
                <td className="player-name">{p.name}</td>
                <td className="player-age">{formatAge(p.age, p.ageDays)}</td>
                <td>{p.specialtyLabel && <span className="tag tag-specialty">{p.specialtyLabel}</span>}</td>
                <td>{p.isPromotable ? <span className="tag tag-promo-ready">Prêt</span> : <span className="tag-promo-wait">{formatPromotion(p.daysUntilPromotion)}</span>}</td>
                <td>
                  {p.isInjured && <span className="tag tag-injured">Blessé</span>}
                  {p.cards > 0 && <span className="tag tag-card">{p.cards}🟨</span>}
                  {!p.isInjured && p.cards === 0 && '✓'}
                </td>
                <SkillCell skill={p.skills.keeper} prediction={pred.keeper} />
                <SkillCell skill={p.skills.defender} prediction={pred.defender} />
                <SkillCell skill={p.skills.playmaker} prediction={pred.playmaker} />
                <SkillCell skill={p.skills.winger} prediction={pred.winger} />
                <SkillCell skill={p.skills.passing} prediction={pred.passing} />
                <SkillCell skill={p.skills.scorer} prediction={pred.scorer} />
                <SkillCell skill={p.skills.setPieces} prediction={pred.setPieces} />
                <td style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                  {p.lastMatch.positionCode ? getPositionLabel(p.lastMatch.positionCode) : '—'}
                </td>
                <td className="skill-cell" style={{ color: 'var(--accent-orange)' }}>{p.lastMatch.rating ?? '—'}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  )
}
