/**
 * playoffs.js
 * Phase 10: real playoffs. Previously there was no playoff system at all —
 * the season just ended and (sometimes) handed out a Stanley Cup on a
 * hidden dice roll. Now, once the regular season standings are final, the
 * user's real team is checked against the actual league table; if they
 * qualify, a single-elimination bracket is built from real, persistent
 * world teams. Every round the user isn't eliminated in, they play an
 * interactive "big moment" (see careerHub) that meaningfully swings the
 * result — the rest of the bracket is resolved instantly using each CPU
 * team's real roster strength, exactly like the regular-season world sim.
 */
(function (Game) {
  function roundName(remainingTeams) {
    if (remainingTeams <= 2) return 'Final';
    if (remainingTeams <= 4) return 'Semifinals';
    if (remainingTeams <= 8) return 'Quarterfinals';
    return `Round of ${remainingTeams}`;
  }

  /**
   * Builds a bracket for the given league if the user's team qualifies.
   * Returns null if there's no standings data yet, the league is too small
   * to bother with, or the user's team didn't make the cut.
   */
  function buildBracket(state, leagueId) {
    const standings = Game.systems.worldAI.getStandings(state, leagueId);
    if (!standings || standings.length < 4) return null;

    const userTeamId = state.career.team && state.career.team.teamId;
    if (!userTeamId) return null;
    const userIdx = standings.findIndex((r) => r.teamId === userTeamId);
    if (userIdx < 0) return null;

    let size = 8;
    while (size > standings.length) size /= 2;
    if (size < 2) return null;
    if (userIdx >= size) return null; // didn't make the cut this year

    const seeds = standings.slice(0, size);
    const pairs = [];
    for (let i = 0; i < size / 2; i++) pairs.push([seeds[i], seeds[size - 1 - i]]);

    return {
      leagueId,
      size,
      round: 1,
      roundName: roundName(size),
      matchups: pairs.map((p) => ({ a: p[0], b: p[1], winner: null })),
      champion: null,
      userTeamId,
      userSeed: userIdx + 1,
      history: [],
    };
  }

  /**
   * Builds a real NHL playoff bracket using conference/division structure
   * (see js/systems/playoffConferences.js) instead of the generic
   * top-N-by-points bracket: top 4 in each of the 4 divisions make it,
   * seeded 1v4/2v3 within the division, then division champs meet for the
   * division final, then conference finals, then the Stanley Cup Final.
   * Falls back to the generic bracket if the team names in standings
   * don't line up with the known division rosters (e.g. after a custom
   * relocation), so this never hard-fails.
   */
  function buildNhlBracket(state) {
    const PC = Game.systems.playoffConferences;
    const standings = Game.systems.worldAI.getStandings(state, 'NHL');
    const userTeamId = state.career.team && state.career.team.teamId;
    if (!PC || !standings || standings.length < 32 || !userTeamId) return buildBracket(state, 'NHL');

    const DIV_ORDER = ['ATLANTIC', 'METROPOLITAN', 'CENTRAL', 'PACIFIC'];
    const byDiv = {};
    DIV_ORDER.forEach((d) => { byDiv[d] = []; });
    let unmapped = 0;
    standings.forEach((row) => {
      const info = PC.getConferenceForTeam(row.name);
      if (info && byDiv[info.division]) byDiv[info.division].push(row);
      else unmapped++;
    });
    if (unmapped > 0 || DIV_ORDER.some((d) => byDiv[d].length < 4)) {
      return buildBracket(state, 'NHL');
    }

    const matchups = [];
    let userSeed = null;
    DIV_ORDER.forEach((d) => {
      const top4 = byDiv[d].slice(0, 4);
      matchups.push({ a: top4[0], b: top4[3], winner: null });
      matchups.push({ a: top4[1], b: top4[2], winner: null });
      top4.forEach((row, idx) => {
        if (row.teamId === userTeamId) userSeed = idx + 1;
      });
    });

    const userInBracket = matchups.some((m) => m.a.teamId === userTeamId || m.b.teamId === userTeamId);
    if (!userInBracket) return null; // didn't make the cut this year

    return {
      leagueId: 'NHL',
      size: 16,
      round: 1,
      roundName: 'First Round',
      matchups,
      champion: null,
      userTeamId,
      userSeed,
      history: [],
      conferenceFormat: true,
    };
  }

  function cpuWinner(state, teamA, teamB) {
    const ta = Game.systems.worldAI.getTeamById(state, teamA.teamId);
    const tb = Game.systems.worldAI.getTeamById(state, teamB.teamId);
    const sa = (ta ? Game.systems.worldAI.teamStrength(ta) : 50) + Game.utils.randInt(-6, 6);
    const sb = (tb ? Game.systems.worldAI.teamStrength(tb) : 50) + Game.utils.randInt(-6, 6);
    return sa >= sb ? teamA : teamB;
  }

  /** Resolves every matchup in the current round that doesn't involve the user. */
  function resolveCpuMatchups(state, bracket) {
    bracket.matchups.forEach((m) => {
      if (m.winner) return;
      const involvesUser = m.a.teamId === bracket.userTeamId || m.b.teamId === bracket.userTeamId;
      if (involvesUser) return;
      m.winner = cpuWinner(state, m.a, m.b);
    });
  }

  function userMatchup(bracket) {
    return bracket.matchups.find(
      (m) => !m.winner && (m.a.teamId === bracket.userTeamId || m.b.teamId === bracket.userTeamId)
    );
  }

  /**
   * Plays the user's game for the current round interactively via the
   * shared reactionGame minigame, blending the result into a real
   * simulated game line so stats stay consistent with the rest of the
   * season. Calls onRoundComplete({ won, opponent, teamResult, line, avgScore }).
   */
  function playUserRound(state, bracket, mount, onRoundComplete) {
    const m = userMatchup(bracket);
    if (!m) {
      if (onRoundComplete) onRoundComplete(null);
      return;
    }
    const userIsA = m.a.teamId === bracket.userTeamId;
    const opponentSeed = userIsA ? m.b : m.a;
    const oppTeam = Game.systems.worldAI.getTeamById(state, opponentSeed.teamId);
    const baseStrength = oppTeam ? Game.systems.worldAI.teamStrength(oppTeam) : 60;
    const skill = Game.leagues.leagueData.overall(state.player);

    Game.minigames.runRandom({
      mount,
      attempts: 3,
      skill,
      label: `${bracket.roundName} vs ${opponentSeed.name}`,
      actionLabel: 'BIG MOMENT',
      onComplete: (avgScore) => {
        // A strong minigame performance meaningfully softens the effective
        // opponent strength for this deciding game — a great showing can
        // turn an upset, a poor one makes even a weaker rival dangerous.
        const effectiveOpp = Game.utils.clamp(baseStrength - (avgScore - 50) * 0.3, 15, 95);
        const line = Game.systems.simulationEngine.simulateGame(state.player, effectiveOpp);
        const teamResult = Game.systems.simulationEngine.deriveTeamResult(line, state.player.position);
        const userWon = teamResult.result === 'W' || teamResult.result === 'OTW';
        m.winner = userWon ? (userIsA ? m.a : m.b) : opponentSeed;
        bracket.history.push({
          round: bracket.roundName,
          opponent: opponentSeed.name,
          score: `${teamResult.ownScore}-${teamResult.oppScore}`,
          won: userWon,
          avgScore,
        });
        if (onRoundComplete) {
          onRoundComplete({ won: userWon, opponent: opponentSeed, teamResult, line, avgScore });
        }
      },
    });
  }

  /**
   * Once every matchup in the current round has a winner, either crowns a
   * champion or sets up the next round in place. Returns false if the
   * round isn't fully decided yet.
   */
  function advanceRound(bracket) {
    const winners = bracket.matchups.map((m) => m.winner);
    if (winners.some((w) => !w)) return false;
    if (winners.length === 1) {
      bracket.champion = winners[0];
      return true;
    }
    const nextPairs = [];
    for (let i = 0; i < winners.length; i += 2) nextPairs.push([winners[i], winners[i + 1]]);
    bracket.matchups = nextPairs.map((p) => ({ a: p[0], b: p[1], winner: null }));
    bracket.round += 1;
    if (bracket.conferenceFormat) {
      const NHL_ROUND_NAMES = { 2: 'Division Finals', 3: 'Conference Finals', 4: 'Stanley Cup Final' };
      bracket.roundName = NHL_ROUND_NAMES[bracket.round] || roundName(winners.length);
    } else {
      bracket.roundName = roundName(winners.length);
    }
    return true;
  }

  function isUserEliminated(bracket) {
    if (bracket.champion) return bracket.champion.teamId !== bracket.userTeamId;
    return !bracket.matchups.some(
      (m) =>
        (!m.winner && (m.a.teamId === bracket.userTeamId || m.b.teamId === bracket.userTeamId)) ||
        (m.winner && m.winner.teamId === bracket.userTeamId)
    );
  }

  Game.systems = Game.systems || {};
  Game.systems.playoffs = {
    buildBracket,
    buildNhlBracket,
    resolveCpuMatchups,
    userMatchup,
    playUserRound,
    advanceRound,
    isUserEliminated,
  };
})(window.Game = window.Game || {});
