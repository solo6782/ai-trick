/**
 * Calculate a potential score (0-100) for a youth player based on known data.
 * No AI needed — pure HRF data calculation.
 */

// Weight of each skill for determining overall player value
// Based on Hattrick market value: high skills in key positions are most valuable
const SKILL_WEIGHTS = {
  keeper: 1.0,
  defender: 1.0,
  playmaker: 1.2,  // Construction is king in HT (milieu)
  winger: 0.9,
  passing: 1.0,
  scorer: 1.1,     // Buteur is high demand
  setPieces: 0.3   // Low impact
};

// Specialty bonus
const SPECIALTY_BONUS = {
  1: 8,   // Technique — very valuable
  2: 5,   // Rapide
  3: 5,   // Costaud
  4: 4,   // Imprévisible
  5: 4,   // Joueur de tête
  6: 2,   // Guérison accélérée
  8: 3    // Chef d'orchestre
};

export function calculatePotentialScore(player) {
  let score = 0;
  let maxPossible = 0;
  let knownSkills = 0;
  let totalSkills = 0;

  for (const [key, skill] of Object.entries(player.skills)) {
    const weight = SKILL_WEIGHTS[key] || 1.0;
    totalSkills++;

    // Max known: strongest signal of value
    if (skill.max !== null) {
      knownSkills++;
      // Scale: max of 8+ is excellent (scaled to weight)
      score += Math.min(skill.max, 10) * weight * 1.5;
      maxPossible += 10 * weight * 1.5;
    }
    // Current known without max: partial info
    else if (skill.current !== null) {
      knownSkills += 0.5;
      // Current is at least this good, max could be higher
      score += Math.min(skill.current, 10) * weight * 1.0;
      maxPossible += 10 * weight * 1.5;
    }
    // Unknown: add to max possible but no score
    else {
      maxPossible += 10 * weight * 1.5;
    }
  }

  // Specialty bonus
  if (player.specialty && SPECIALTY_BONUS[player.specialty]) {
    score += SPECIALTY_BONUS[player.specialty];
  }
  maxPossible += 8; // Max specialty bonus

  // Age factor: younger players have more time to develop
  // 15 years = full bonus, 19 years = no bonus
  const ageFactor = Math.max(0, (19 - player.age) / 4);
  score += ageFactor * 5;
  maxPossible += 5;

  // Discovery factor: penalize if too many unknowns
  // (we can't rate what we don't know)
  const discoveryRatio = knownSkills / totalSkills;
  
  // Base score as percentage
  let pct = maxPossible > 0 ? (score / maxPossible) * 100 : 0;

  // If few skills are known, cap the score to indicate uncertainty
  if (discoveryRatio < 0.3) {
    pct = Math.min(pct, 40); // Can't be rated high with so little info
  }

  return Math.round(Math.max(0, Math.min(100, pct)));
}

/**
 * Get a text label for the score
 */
export function getScoreLabel(score) {
  if (score >= 75) return 'Pépite';
  if (score >= 55) return 'Prometteur';
  if (score >= 35) return 'Correct';
  if (score >= 20) return 'Faible';
  return 'Inconnu';
}

export function getScoreColor(score) {
  if (score >= 75) return 'var(--accent-green)';
  if (score >= 55) return 'var(--accent-blue)';
  if (score >= 35) return 'var(--accent-orange)';
  if (score >= 20) return 'var(--accent-red)';
  return 'var(--text-muted)';
}
