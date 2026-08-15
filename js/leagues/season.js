/**
 * season.js
 * Builds a season's schedule (one entry per game, each against a named
 * opponent) and plays it one game at a time, tracking the team's W/L/OTL
 * record as it goes. This is the Phase 5 replacement for the "simulate an
 * entire season at once" approach from Phase 4.
 */
(function (Game) {
  /**
   * Creates a fresh season schedule for the given league. Opponents are
   * drawn from the league's real, persistent world teams (the same teams
   * that appear in standings/records) instead of a throwaway random name
   * per game — so the schedule is actually playing against the division
   * rivals you can see on the standings screen, with strength derived from
   * each rival's real roster instead of a flat per-league fudge number.
   */
  function createSeason(league, state) {
    const games = [];
    let rivals = null;
    if (state && Game.systems.worldAI) {
      Game.systems.worldAI.ensureWorld(state);
      const worldLeague = state.world.leagues[league.id];
      const ownTeamId = state.career.team && state.career.team.teamId;
      if (worldLeague && worldLeague.teamIds.length) {
        rivals = worldLeague.teamIds
          .filter((id) => id !== ownTeamId)
          .map((id) => state.world.teams[id])
          .filter(Boolean);
      }
    }

    for (let i = 0; i < league.gamesPerSeason; i++) {
      let opponentName;
      let opponentStrength;
      if (rivals && rivals.length) {
        const rival = Game.utils.randChoice(rivals);
        opponentName = rival.name;
        opponentStrength = Game.utils.clamp(
          Game.systems.worldAI.teamStrength(rival) + Game.utils.randInt(-6, 6),
          10,
          95
        );
      } else {
        opponentName = Game.leagues.teamGenerator.generateTeamName();
        opponentStrength = Game.utils.clamp(league.opponentStrength + Game.utils.randInt(-8, 8), 10, 95);
      }
      games.push({
        week: i + 1,
        opponent: opponentName,
        opponentStrength,
        played: false,
        line: null,
        teamResult: null,
      });
    }
    return {
      league: league.name,
      tier: league.tier,
      games,
      record: { w: 0, l: 0, otl: 0 },
    };
  }

  function isComplete(season) {
    return season.games.every((g) => g.played);
  }

  function nextGame(season) {
    return season.games.find((g) => !g.played) || null;
  }

  /** Plays the next unplayed game in the season. Returns null if the season is already done. */
  function playNextGame(season, player) {
    const game = nextGame(season);
    if (!game) return null;

    const line = Game.systems.simulationEngine.simulateGame(player, game.opponentStrength);
    const teamResult = Game.systems.simulationEngine.deriveTeamResult(line, player.position);

    game.played = true;
    game.line = line;
    game.teamResult = teamResult;

    if (teamResult.result === 'W' || teamResult.result === 'OTW') season.record.w++;
    else if (teamResult.result === 'OTL') season.record.otl++;
    else season.record.l++;

    return { game, line, teamResult };
  }

  /** Aggregates every played game in the season into a single stat line. */
  function seasonTotals(season, player) {
    const playedLines = season.games.filter((g) => g.played).map((g) => g.line);
    return Game.systems.simulationEngine.aggregateSeason(playedLines, player.position);
  }

  Game.leagues = Game.leagues || {};
  Game.leagues.season = { createSeason, isComplete, nextGame, playNextGame, seasonTotals };
})(window.Game = window.Game || {});
