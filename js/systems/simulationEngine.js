/**
 * simulationEngine.js
 * Resolves a player's performance in a single game or a full season
 * statistically, from their attributes. It does not simulate the game
 * play-by-play: it computes attribute-weighted probabilities and
 * resolves them with random rolls (more realistic than a fixed average,
 * much lighter than a full match simulator).
 */
(function (Game) {
  const COMPETITION_BY_AGE = [
    { maxAge: 11, label: 'Youth League', games: 16, opponentStrength: 26 },
    { maxAge: 14, label: 'Junior League', games: 24, opponentStrength: 36 },
    { maxAge: 17, label: 'Junior / High School', games: 30, opponentStrength: 48 },
    { maxAge: 20, label: 'Elite Junior (CHL/USHL/NCAA)', games: 34, opponentStrength: 58 },
    { maxAge: 999, label: 'Senior Competition', games: 40, opponentStrength: 66 },
  ];

  function competitionForAge(age) {
    return COMPETITION_BY_AGE.find((c) => age <= c.maxAge) || COMPETITION_BY_AGE[COMPETITION_BY_AGE.length - 1];
  }

  /** Weighted average of the attributes that most influence a skater's offense. */
  function offenseRating(attrs) {
    return (attrs.wristShot * 1.1 + attrs.slapShot * 0.9 + attrs.vision + attrs.passing + attrs.puckHandling + attrs.speed * 0.7) / 5.7;
  }

  function defenseRating(attrs) {
    return (attrs.defense * 1.2 + attrs.shotBlocking + attrs.strength * 0.6 + attrs.discipline * 0.4) / 3.2;
  }

  function goalieRating(attrs) {
    return (attrs.reflexes * 1.2 + attrs.positioning + attrs.reboundControl + attrs.concentration * 0.8) / 4;
  }

  /** Simulates a single game for a skater (C/LW/RW/D). Returns a stat line. */
  function simulateSkaterGame(player, opponentStrength) {
    const a = player.attributes;
    const off = offenseRating(a);
    const def = defenseRating(a);
    const edge = Game.utils.clamp((off - opponentStrength) / 40, -0.6, 0.8);

    const goalChance = Game.utils.clamp(0.18 + edge * 0.3 + (player.position === 'D' ? -0.08 : 0), 0.02, 0.75);
    const assistChance = Game.utils.clamp(0.28 + edge * 0.25, 0.03, 0.8);

    const goals = Math.random() < goalChance ? Game.utils.randInt(1, 2) : 0;
    const assists = Math.random() < assistChance ? Game.utils.randInt(1, 2) : 0;
    const shots = Game.utils.clamp(Math.round(2 + off / 22 + Math.random() * 3), 0, 9);
    const hits = Game.utils.clamp(Math.round(a.aggression / 30 + Math.random() * 3), 0, 6);
    const blocks = player.position === 'D'
      ? Game.utils.clamp(Math.round(def / 30 + Math.random() * 2), 0, 5)
      : Game.utils.randInt(0, 1);
    const penaltyMinutes = Math.random() < 0.18 + (100 - a.discipline) / 500 ? Game.utils.randChoice([2, 2, 4]) : 0;
    const plusMinus = Game.utils.clamp(Math.round(edge * 4 + Game.utils.randInt(-1, 1)), -3, 4);
    const toiMinutes = player.position === 'D' ? Game.utils.randInt(16, 24) : Game.utils.randInt(11, 19);
    const faceoffsTaken = player.position === 'C' ? Game.utils.randInt(8, 20) : 0;
    const faceoffWinChance = Game.utils.clamp(0.42 + (a.vision - 50) / 200, 0.25, 0.7);
    const faceoffsWon = faceoffsTaken
      ? Array.from({ length: faceoffsTaken }).filter(() => Math.random() < faceoffWinChance).length
      : 0;

    return {
      goals,
      assists,
      points: goals + assists,
      shots,
      hits,
      blocksMade: blocks,
      penaltyMinutes,
      plusMinus,
      toiMinutes,
      faceoffsWon,
      faceoffsTaken,
    };
  }

  /** Simulates a single game for a goalie. Returns a stat line. */
  function simulateGoalieGame(player, opponentStrength) {
    const a = player.attributes;
    const rating = goalieRating(a);
    const edge = Game.utils.clamp((rating - opponentStrength) / 45, -0.5, 0.5);

    const shotsFaced = Game.utils.randInt(20, 34);
    const baseSavePct = Game.utils.clamp(0.885 + edge * 0.06, 0.82, 0.96);
    let goalsAgainst = 0;
    let saves = 0;
    for (let i = 0; i < shotsFaced; i++) {
      if (Math.random() < baseSavePct) saves++;
      else goalsAgainst++;
    }
    const shutout = goalsAgainst === 0;
    const win = Math.random() < Game.utils.clamp(0.5 + edge, 0.1, 0.9);

    return {
      shotsFaced,
      savesMade: saves,
      goalsAgainst,
      savePct: shotsFaced ? saves / shotsFaced : 0,
      shutout,
      win,
      toiMinutes: 60,
    };
  }

  function simulateGame(player, opponentStrength = 50) {
    return player.position === 'G'
      ? simulateGoalieGame(player, opponentStrength)
      : simulateSkaterGame(player, opponentStrength);
  }

  /**
   * Derives a team-level result (score + W/L/OTL) from an individual stat
   * line. This is a lightweight approximation — it does not simulate the
   * other 17 players on the ice — good enough to give the schedule/
   * standings a sense of real games without a full team engine (Phase 9).
   */
  function deriveTeamResult(line, position) {
    if (position === 'G') {
      const ownScore = Game.utils.clamp(Game.utils.randInt(1, 4) + (line.shutout ? 1 : 0), 0, 7);
      const oppScore = line.goalsAgainst;
      if (ownScore === oppScore) {
        const otWin = Math.random() < 0.5;
        return { ownScore: ownScore + (otWin ? 1 : 0), oppScore: oppScore + (otWin ? 0 : 1), result: otWin ? 'OTW' : 'OTL' };
      }
      return { ownScore, oppScore, result: ownScore > oppScore ? 'W' : 'L' };
    }
    let ownScore = Game.utils.clamp(Math.round(2 + line.points * 0.6 + line.plusMinus * 0.3 + Game.utils.randInt(-1, 1)), 0, 9);
    let oppScore = Game.utils.clamp(Math.round(2 - line.plusMinus * 0.3 + Game.utils.randInt(0, 2)), 0, 8);
    if (ownScore === oppScore) {
      const otWin = Math.random() < 0.5;
      if (otWin) ownScore += 1;
      else oppScore += 1;
      return { ownScore, oppScore, result: otWin ? 'OTW' : 'OTL' };
    }
    return { ownScore, oppScore, result: ownScore > oppScore ? 'W' : 'L' };
  }

  function aggregateSkaterSeason(lines) {
    const totals = {
      games: lines.length,
      goals: 0,
      assists: 0,
      points: 0,
      shots: 0,
      hits: 0,
      blocksMade: 0,
      penaltyMinutes: 0,
      plusMinus: 0,
      faceoffsWon: 0,
      faceoffsTaken: 0,
    };
    lines.forEach((l) => {
      totals.goals += l.goals;
      totals.assists += l.assists;
      totals.points += l.points;
      totals.shots += l.shots;
      totals.hits += l.hits;
      totals.blocksMade += l.blocksMade;
      totals.penaltyMinutes += l.penaltyMinutes;
      totals.plusMinus += l.plusMinus;
      totals.faceoffsWon += l.faceoffsWon;
      totals.faceoffsTaken += l.faceoffsTaken;
    });
    return totals;
  }

  function aggregateGoalieSeason(lines) {
    const totals = { games: lines.length, wins: 0, shotsFaced: 0, savesMade: 0, goalsAgainst: 0, shutouts: 0 };
    lines.forEach((l) => {
      if (l.win) totals.wins++;
      totals.shotsFaced += l.shotsFaced;
      totals.savesMade += l.savesMade;
      totals.goalsAgainst += l.goalsAgainst;
      if (l.shutout) totals.shutouts++;
    });
    totals.savePct = totals.shotsFaced ? totals.savesMade / totals.shotsFaced : 0;
    totals.gaa = totals.games ? totals.goalsAgainst / totals.games : 0;
    return totals;
  }

  function aggregateSeason(lines, position) {
    return position === 'G' ? aggregateGoalieSeason(lines) : aggregateSkaterSeason(lines);
  }

  Game.systems = Game.systems || {};
  Game.systems.simulationEngine = {
    competitionForAge,
    simulateGame,
    deriveTeamResult,
    aggregateSeason,
  };
})(window.Game = window.Game || {});
