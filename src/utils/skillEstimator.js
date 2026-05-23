// skillEstimator.js
// Estime la caractéristique DOMINANTE du poste joué par un jeune, à partir de
// sa note individuelle de match. Calé sur données réelles youth (8 HRF, ~46 cas),
// validé en leave-one-out.
//
// Pourquoi seulement la note individuelle ?
//   - Les jeunes n'ont PAS de forme/endurance comme facteur (règles HT) → la note
//     reflète directement la compétence, sans le bruit qui gêne chez les seniors.
//   - On a testé l'ajout des notes de secteur (CR) : aucune amélioration. Inutile.
//
// Précision mesurée (leave-one-out, écart |estimé - réel|) :
//   Défenseur central : ±0.34  (100% à ±1)   — fiable
//   Ailier            : ±0.45  (100% à ±1)   — fiable
//   Attaquant         : ±0.48  (82% à ±1)    — fiable
//   Arrière latéral   : ±0.56  (100% à ±1)   — correct (peu de données)
//   Milieu            : ±0.72  (57-83% à ±1) — indicatif
//
// L'estimateur retourne TOUJOURS une fourchette + confiance, jamais une valeur
// sèche. Il retourne null quand il ne peut/doit rien estimer.

// Carac dominante + modèle linéaire (skill = a*note + b) + sigma (incertitude réelle)
// calés sur données youth. confidence dérivée de sigma + taille d'échantillon.
const POSITION_MODELS = {
  CD: { skill: 'defender',  a: 0.840, b: 1.168,  sigma: 0.36, confidence: 'bonne'   },
  WI: { skill: 'winger',    a: 0.286, b: 2.514,  sigma: 0.50, confidence: 'moyenne' }, // peu de cas → sigma élargi
  FW: { skill: 'scorer',    a: 0.960, b: -0.815, sigma: 0.52, confidence: 'bonne'   },
  WB: { skill: 'defender',  a: 0.286, b: 3.286,  sigma: 0.60, confidence: 'moyenne' }, // peu de cas + pente faible
  IM: { skill: 'playmaker', a: 0.824, b: 0.588,  sigma: 0.72, confidence: 'faible'  },
};

// PositionCode HT → groupe de poste
function positionGroup(code) {
  switch (code) {
    case 100: return 'GK';
    case 101: case 105: return 'WB';
    case 102: case 103: case 104: return 'CD';
    case 106: case 110: return 'WI';
    case 107: case 108: case 109: return 'IM';
    case 111: case 112: case 113: return 'FW';
    default: return null;
  }
}

// Map groupe → clé de skill dans player.skills
const SKILL_KEY = {
  defender: 'defender', winger: 'winger', scorer: 'scorer', playmaker: 'playmaker',
};

/**
 * Estime la carac dominante du poste joué par un jeune lors de son dernier match.
 * @param {object} player - joueur parsé (skills, lastMatch)
 * @returns {object|null} { skill, estimate, low, high, confidence, basis } ou null
 */
export function estimateSkillFromRating(player) {
  const lm = player?.lastMatch;
  if (!lm || lm.rating == null || lm.positionCode == null) return null; // pas de match exploitable
  if (lm.playedMinutes != null && lm.playedMinutes < 60) return null;   // trop peu de minutes

  const group = positionGroup(lm.positionCode);
  if (!group || group === 'GK') return null; // gardien non modélisé

  const model = POSITION_MODELS[group];
  const skillKey = SKILL_KEY[model.skill];
  const skill = player.skills?.[skillKey];

  // Si la carac actuelle est déjà connue, pas besoin d'estimer.
  if (skill && skill.currentKnown) return null;

  // Estimation linéaire
  let est = model.a * lm.rating + model.b;
  est = Math.max(0, Math.min(20, est));

  // Fourchette = ±2 sigma arrondi au demi-niveau (couvre ~95% des cas).
  const half = Math.max(0.5, Math.round(2 * model.sigma * 2) / 2);
  const low = Math.max(0, Math.round((est - half) * 2) / 2);
  const high = Math.min(20, Math.round((est + half) * 2) / 2);

  // Si le max est connu, on ne peut pas dépasser le max.
  const cappedHigh = (skill && skill.maxKnown && skill.max != null)
    ? Math.min(high, skill.max)
    : high;

  return {
    skill: skillKey,
    group,
    estimate: Math.round(est * 2) / 2,
    low,
    high: cappedHigh,
    confidence: model.confidence,
    basis: `note ${lm.rating} au poste ${lm.positionCode} (${lm.playedMinutes ?? '?'} min)`,
  };
}

export { positionGroup, POSITION_MODELS };
