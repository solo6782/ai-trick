/**
 * HRF File Parser — Extracts youth players and team data from Hattrick Organizer files
 */

const SKILL_LEVELS = {
  0: 'inexistant', 1: 'catastrophique', 2: 'mauvais', 3: 'médiocre',
  4: 'faible', 5: 'inadéquat', 6: 'passable', 7: 'honorable',
  8: 'excellent', 9: 'formidable', 10: 'brillant', 11: 'magnifique',
  12: 'surnaturel', 13: 'titanique', 14: 'extra-terrestre',
  15: 'mythique', 16: 'magique', 17: 'utopique', 18: 'divin'
};

const SPECIALTY_MAP = {
  0: null, 1: 'Technique', 2: 'Rapide', 3: 'Costaud',
  4: 'Imprévisible', 5: 'Joueur de tête', 6: 'Guérison accélérée', 8: "Chef d'orchestre"
};

const POSITION_CODES = {
  100: 'Gardien', 101: 'Arrière droit', 102: 'DC droit', 103: 'DC central',
  104: 'DC gauche', 105: 'Arrière gauche', 106: 'Ailier droit',
  107: 'Milieu droit', 108: 'Milieu central', 109: 'Milieu gauche',
  110: 'Ailier gauche', 111: 'Attaquant droit', 112: 'Attaquant central', 113: 'Attaquant gauche'
};

export function parseHRF(text) {
  const sections = {};
  let currentSection = null;
  for (const line of text.split(/\r?\n/)) {
    const m = line.match(/^\[(.+)\]$/);
    if (m) { currentSection = m[1]; sections[currentSection] = sections[currentSection] || {}; continue; }
    if (currentSection) {
      const eq = line.indexOf('=');
      if (eq > 0) sections[currentSection][line.substring(0, eq).trim()] = line.substring(eq + 1).trim();
    }
  }
  return {
    team: extractTeamData(sections),
    youthPlayers: extractYouthPlayers(sections),
    training: extractTraining(sections)
  };
}

function extractTeamData(s) {
  const b = s.basics || {}, l = s.league || {};
  return {
    teamId: b.teamID, teamName: b.teamName,
    youthTeamId: b.youthTeamID, youthTeamName: b.youthTeamName,
    owner: b.owner, season: b.season, matchRound: b.matchround,
    serie: l.serie, position: l.placering
  };
}

function extractTraining(s) {
  const t = s.team || {};
  return {
    type: t.trType || '', typeValue: parseInt(t.trTypeValue) || 0,
    level: parseInt(t.trLevel) || 0, staminaPart: parseInt(t.staminaTrainingPart) || 0
  };
}

function parseSkillBlock(data, prefix) {
  const current = data[`${prefix}Skill`];
  const max = data[`${prefix}SkillMax`];
  return {
    current: current !== undefined && current !== '' ? parseInt(current) : null,
    currentKnown: data[`${prefix}SkillIsAvailable`] === 'True',
    max: max !== undefined && max !== '' ? parseInt(max) : null,
    maxKnown: data[`${prefix}SkillMaxIsAvailable`] === 'True',
    maxReached: data[`${prefix}SkillIsMaxReached`] === 'True',
  };
}

function extractScoutComments(data) {
  const comments = [];
  for (let i = 0; i < 10; i++) {
    const text = data[`ScoutComment${i}Text`];
    if (!text) break;
    comments.push({
      text: text.replace(/&nbsp;/g, ' ').trim(),
      type: parseInt(data[`ScoutComment${i}Type`]) || 0,
      skillType: parseInt(data[`ScoutComment${i}SkillType`]) || 0,
      skillLevel: parseInt(data[`ScoutComment${i}SkillLevel`]) || 0
    });
  }
  return comments;
}

function extractYouthPlayers(sections) {
  const players = [];
  for (const [key, data] of Object.entries(sections)) {
    if (!key.startsWith('youthplayer')) continue;
    const age = parseInt(data.Age) || 0;
    const ageDays = parseInt(data.AgeDays) || 0;
    const canBePromotedIn = parseInt(data.CanBePromotedIn);
    const specialty = parseInt(data.Specialty) || 0;
    players.push({
      id: key.replace('youthplayer', ''),
      firstName: data.FirstName || '', lastName: data.LastName || '',
      name: `${data.FirstName || ''} ${data.LastName || ''}`.trim(),
      age, ageDays, totalDays: age * 112 + ageDays,
      arrivalDate: data.ArrivalDate || '',
      canBePromotedIn,
      isPromotable: canBePromotedIn <= 0,
      daysUntilPromotion: Math.max(0, canBePromotedIn),
      specialty, specialtyLabel: SPECIALTY_MAP[specialty] || null,
      cards: parseInt(data.Cards) || 0,
      injuryLevel: parseInt(data.InjuryLevel),
      isInjured: parseInt(data.InjuryLevel) > 0,
      careerGoals: parseInt(data.CareerGoals) || 0,
      leagueGoals: parseInt(data.LeagueGoals) || 0,
      friendlyGoals: parseInt(data.FriendlyGoals) || 0,
      skills: {
        keeper: parseSkillBlock(data, 'Keeper'),
        defender: parseSkillBlock(data, 'Defender'),
        playmaker: parseSkillBlock(data, 'Playmaker'),
        winger: parseSkillBlock(data, 'Winger'),
        passing: parseSkillBlock(data, 'Passing'),
        scorer: parseSkillBlock(data, 'Scorer'),
        setPieces: parseSkillBlock(data, 'SetPieces')
      },
      lastMatch: {
        id: data.YouthMatchID || null, date: data.YouthMatchDate || null,
        positionCode: data.PositionCode ? parseInt(data.PositionCode) : null,
        playedMinutes: data.PlayedMinutes ? parseInt(data.PlayedMinutes) : null,
        rating: data.Rating ? parseFloat(data.Rating) : null
      },
      scoutComments: extractScoutComments(data)
    });
  }
  players.sort((a, b) => b.totalDays - a.totalDays);
  return players;
}

export function getSkillLabel(level) { return SKILL_LEVELS[level] || `${level}`; }
export function getPositionLabel(code) { return POSITION_CODES[code] || `Inconnu (${code})`; }
export function formatAge(age, days) { return `${age}a ${days}j`; }
export function formatPromotion(d) { return d <= 0 ? 'Prêt' : `${d}j`; }

export function getSkillColor(current, max) {
  if (current === null && max === null) return 'unknown';
  if (current !== null && max !== null && current >= max) return 'maxed';
  if (current !== null && max !== null) return 'progressing';
  if (current !== null) return 'current-only';
  if (max !== null) return 'max-only';
  return 'unknown';
}

export { SKILL_LEVELS, SPECIALTY_MAP, POSITION_CODES };

/**
 * Extract player match history records from a parsed HRF.
 * Returns an array of records ready for D1 insertion.
 */
export function extractMatchHistory(parsedHRF) {
  const hrfDate = parsedHRF.team?.season ? `S${parsedHRF.team.season}-J${parsedHRF.team.matchRound}` : '';
  const records = [];

  for (const player of parsedHRF.youthPlayers) {
    if (player.lastMatch.id && player.lastMatch.date) {
      records.push({
        playerId: player.id,
        playerName: player.name,
        matchId: player.lastMatch.id,
        matchDate: player.lastMatch.date,
        positionCode: player.lastMatch.positionCode,
        playedMinutes: player.lastMatch.playedMinutes,
        rating: player.lastMatch.rating,
        hrfDate
      });
    }
  }

  return records;
}
