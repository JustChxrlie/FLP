/**
 * seasonRunner.js
 * Connects simulation + leagues + progression + careerPath + news.
 */
(function (Game) {
  function mergeCareerTotals(player, totals) {
    const ct = player.careerTotals;
    ct.games += totals.games;
    if (player.position === 'G') {
      ct.wins += totals.wins || 0;
      ct.savesMade += totals.savesMade || 0;
      ct.shotsFaced += totals.shotsFaced || 0;
      ct.goalsAgainst += totals.goalsAgainst || 0;
      ct.shutouts += totals.shutouts || 0;
    } else {
      ct.goals += totals.goals || 0;
      ct.assists += totals.assists || 0;
      ct.points += totals.points || 0;
      ct.plusMinus = (ct.plusMinus || 0) + (totals.plusMinus || 0);
      ct.penaltyMinutes += totals.penaltyMinutes || 0;
      ct.shots += totals.shots || 0;
      ct.hits += totals.hits || 0;
      ct.blocksMade += totals.blocksMade || 0;
      ct.faceoffsWon += totals.faceoffsWon || 0;
      ct.faceoffsTaken += totals.faceoffsTaken || 0;
    }
  }

  function startNewSeason(state) {
    const player = state.player;
    if (!state.career.leagueId) {
      Game.systems.careerPath.assignStart(state);
    }
    const league = Game.leagues.leagueData.getLeague(state.career.leagueId);
    const calledUp = !state.career.team || state.career.team.leagueId !== league.id;

    if (calledUp || !state.career.team) {
      const real = Game.systems.careerPath.realTeamFor(state, league.id, state.career.team && state.career.team.teamId);
      state.career.team = {
        name: real.name,
        teamId: real.teamId,
        leagueId: league.id,
        league: league.name,
        tier: league.tier,
      };
    }
    player.team = state.career.team.name;
    player.league = league.name;

    state.career.currentSeason = Game.leagues.season.createSeason(league, state);
    state.career.stage = 'active';
    return { calledUp, league, team: state.career.team };
  }

  function ensureActiveSeason(state) {
    if (state.career.retired) return null;
    if (!state.career.currentSeason) return startNewSeason(state);
    return null;
  }

  function concludeSeason(state) {
    const player = state.player;
    const finishedSeason = state.career.currentSeason;
    const finishedTeam = state.career.team;
    const totals = Game.leagues.season.seasonTotals(finishedSeason, player);
    mergeCareerTotals(player, totals);

    state.history.seasons.push({
      year: state.career.currentYear,
      age: player.age,
      league: finishedSeason.league,
      leagueId: state.career.leagueId,
      team: finishedTeam,
      record: finishedSeason.record,
      totals,
    });

    Game.systems.news.onSeasonEnd(state, {
      league: finishedSeason.league,
      team: finishedTeam,
      totals,
    });

    const ledger = Game.systems.economy.settleSeason(state);
    Game.systems.shop.tickBuffs(player);

    // World AI: simulate every other league this year, folding the user's
    // own real record/goals into their own team's standings row instead of
    // treating their team as a disconnected, cosmetic name.
    Game.systems.worldAI.ensureWorld(state);
    const teamGf = finishedSeason.games.reduce((s, g) => s + (g.teamResult ? g.teamResult.ownScore : 0), 0);
    const teamGa = finishedSeason.games.reduce((s, g) => s + (g.teamResult ? g.teamResult.oppScore : 0), 0);
    const userCtx = finishedTeam && finishedTeam.teamId
      ? { teamId: finishedTeam.teamId, leagueId: state.career.leagueId, record: finishedSeason.record, gf: teamGf, ga: teamGa }
      : null;
    const worldReport = Game.systems.worldAI.advanceYear(state, userCtx);

    // World Juniors invitation is decided here, but the tournament itself
    // is now played out interactively (Game.systems.tournament) from the
    // UI layer once this summary reaches it — see careerHub.presentSeasonExtras.
    // That also means the medal isn't known yet, so it can't be graded into
    // awards.evaluateSeason below; the tournament flow grants it directly.
    const wj = Game.systems.careerPath.checkWorldJuniors(state);
    if (wj) {
      wj.year = state.career.currentYear;
      Game.systems.news.onWorldJuniors(state, wj);
    }

    // Olympics: invitation only decided here (age/rating/league gate,
    // Olympic-year check) — the tournament itself is played out
    // interactively from careerHub (see presentOlympics / playOlympics),
    // same pattern as World Juniors above.
    const olympics = Game.systems.careerPath.checkOlympics ? Game.systems.careerPath.checkOlympics(state) : null;

    // Playoffs: did the user's real team qualify in the league they just
    // played? Built now (standings are final for this year) but, like the
    // tournament above, actually played out interactively by the UI.
    // The NHL gets a real conference/division bracket; every other league
    // falls back to the generic single-elimination bracket.
    const playoffBracket = finishedTeam && finishedTeam.teamId
      ? (state.career.leagueId === 'NHL' && Game.systems.playoffs.buildNhlBracket
          ? Game.systems.playoffs.buildNhlBracket(state)
          : Game.systems.playoffs.buildBracket(state, state.career.leagueId))
      : null;

    const growth = Game.systems.progression.trainSeason(player, 'normal');
    const rolledEvents = Game.eventSystem.rollSeasonEvents(state);
    const resolvedEvents = [];
    const pendingEvents = [];
    rolledEvents.forEach((evt) => {
      if (evt.choices) pendingEvents.push(evt);
      else resolvedEvents.push(Game.eventSystem.resolveAuto(evt, state));
    });

    // Awards (uses current year before increment)
    const seasonAwards = Game.systems.awards.evaluateSeason(state, {
      totals,
      league: finishedSeason.league,
      record: finishedSeason.record,
      wj,
    });
    if (seasonAwards.length && Game.audio) Game.audio.play('award');

    state.career.currentYear += 1;
    player.age += 1;
    state.career.currentAge = player.age;

    let retired = false;
    if (player.age > Game.CONFIG.CAREER.MAX_RETIRE_AGE) {
      state.career.stage = 'retired';
      state.career.retired = true;
      retired = true;
    }

    state.career.currentSeason = null;

    // Contract upkeep: tick the active contract down a year now that the
    // season/year has actually advanced.
    if (Game.systems.contract && state.player.contract) {
      Game.systems.contract.updateYearsRemaining(state.player.contract, state.career.currentYear);
    }

    const transitionOptions = retired ? [] : Game.systems.careerPath.getTransitionOptions(state);

    // NHL Lockout: a rare (~2.5%/yr) event that can only interrupt a
    // player who's about to quietly continue in the NHL with no other
    // transition decision pending — it's presented interactively from
    // careerHub (presentLockout) instead of auto-starting next season.
    let lockoutEvent = null;
    if (!retired && transitionOptions.length === 0 && state.career.leagueId === 'NHL' && Game.systems.specialEvents) {
      if (Game.systems.specialEvents.checkForLockout(state.career.currentYear)) {
        lockoutEvent = Game.systems.specialEvents.generateLockoutEvent(state);
      }
    }

    let nextSeasonInfo = null;
    if (!retired && transitionOptions.length === 0 && !lockoutEvent) {
      nextSeasonInfo = startNewSeason(state);
    }

    return {
      league: finishedSeason.league,
      team: finishedTeam,
      record: finishedSeason.record,
      totals,
      growth,
      resolvedEvents,
      pendingEvents,
      retired,
      nextSeasonInfo,
      transitionOptions,
      wj,
      olympics,
      playoffBracket,
      lockoutEvent,
      ledger,
      worldReport,
      seasonAwards,
    };
  }

  function playNextGame(state) {
    ensureActiveSeason(state);
    if (state.career.retired) return null;

    // A gap year (free agent, no team — see markFreeAgentYear) has zero
    // scheduled games, so isComplete() is vacuously already true; without
    // this check "Play Next Game" would silently do nothing forever
    // instead of resolving straight to the season summary / next chance.
    if (Game.leagues.season.isComplete(state.career.currentSeason)) {
      const summary = concludeSeason(state);
      return { gameResult: null, seasonConcluded: true, summary };
    }

    const result = Game.leagues.season.playNextGame(state.career.currentSeason, state.player);
    if (!result) return null;

    if (Game.leagues.season.isComplete(state.career.currentSeason)) {
      const summary = concludeSeason(state);
      return { gameResult: result, seasonConcluded: true, summary };
    }
    return { gameResult: result, seasonConcluded: false };
  }

  function playRestOfSeason(state) {
    ensureActiveSeason(state);
    const results = [];
    while (!state.career.retired && state.career.currentSeason && !Game.leagues.season.isComplete(state.career.currentSeason)) {
      results.push(Game.leagues.season.playNextGame(state.career.currentSeason, state.player));
    }
    let summary = null;
    if (!state.career.retired && state.career.currentSeason && Game.leagues.season.isComplete(state.career.currentSeason)) {
      summary = concludeSeason(state);
    }
    return { results, summary };
  }

  function applyTransition(state, option) {
    if (!option) return null;

    if (option.type === 'draft') {
      const result = Game.systems.careerPath.resolveDraft(state);
      Game.systems.worldAI.ensureWorld(state);
      const worldDraft = Game.systems.worldAI.runNhlDraft(state, result);
      if (worldDraft.userPick) {
        result.team = worldDraft.userPick.teamName;
        result.round = worldDraft.userPick.round;
        result.pick = worldDraft.userPick.pick;
        result.text = `Selected Round ${result.round} Pick ${result.pick} by ${result.team}.`;
        state.career.drafted = true;
        state.career.undrafted = false;
      }
      Game.systems.news.onDraft(state, result);
      return { type: 'draft', result, worldDraft };
    }

    if (option.type === 'ufa') {
      const offers = Game.systems.careerPath.generateTryoutOffers(state);
      return { type: 'ufa', offers };
    }

    if (option.tryout && option.leagueId) {
      // A tryout must actually be won before the player joins — previously
      // this fell straight into the generic "move" branch below and joined
      // the club unconditionally, making the tryout purely decorative text.
      // The UI runs the interactive tryout minigame and then calls
      // resolveTryout() with the real pass/fail result.
      const real = Game.systems.careerPath.realTeamFor(state, option.leagueId);
      return { type: 'tryout', leagueId: option.leagueId, teamName: real.name, teamId: real.teamId };
    }

    if (option.leagueId) {
      // Retirement, chosen directly from a contract-expiration option.
      if (option.leagueId === 'RETIREMENT' || option.retireChoice) {
        state.career.retired = true;
        state.career.stage = 'retired';
        return { type: 'retire' };
      }

      const from = state.career.leagueId;
      // If this is the post-draft jump to the NHL, join the team that
      // actually drafted the player instead of a brand-new random team —
      // previously this always regenerated a fresh team, so the club that
      // drafted you and the club you played for were disconnected.
      let teamName, teamId;
      if (option.teamName) {
        // Contract-driven moves (re-sign with the same club, loan to the
        // named AHL affiliate) carry their exact destination team — use it
        // verbatim instead of letting moveToLeague roll a new one, so the
        // team you agreed to in the option label is the team you actually
        // join.
        teamName = option.teamName;
      } else if (
        option.leagueId === 'NHL' && from !== 'NHL' &&
        state.career.drafted && state.career.draftInfo && state.career.draftInfo.teamId
      ) {
        teamName = state.career.draftInfo.team;
        teamId = state.career.draftInfo.teamId;
      }
      const team = Game.systems.careerPath.moveToLeague(state, option.leagueId, teamName, teamId);
      Game.systems.news.onTransfer(state, from, option.leagueId, team.name);
      const info = startNewSeason(state);

      // CHL/USHL entry at 16 gets its own (cosmetic) junior draft, played
      // out visually once, the first time the player joins either league.
      let juniorDraft = null;
      if ((option.leagueId === 'CHL' || option.leagueId === 'USHL') && !state.career.juniorDraftInfo) {
        juniorDraft = Game.systems.careerPath.resolveJuniorDraft(state, option.leagueId);
        state.career.juniorDraftInfo = { ...juniorDraft, team: team.name, year: state.career.currentYear };
      }

      return { type: 'move', team, info, juniorDraft: juniorDraft ? state.career.juniorDraftInfo : null };
    }

    return null;
  }

  /** Called by the UI once the interactive tryout minigame resolves. */
  function resolveTryout(state, leagueId, teamName, teamId, passed) {
    if (!passed) {
      return { type: 'tryout-result', passed: false, leagueId, teamName };
    }
    const from = state.career.leagueId;
    const team = Game.systems.careerPath.moveToLeague(state, leagueId, teamName, teamId);
    Game.systems.news.onTransfer(state, from, leagueId, team.name);
    const info = startNewSeason(state);
    return { type: 'tryout-result', passed: true, team, info };
  }

  function acceptOffer(state, offer) {
    const from = state.career.leagueId;
    const team = Game.systems.careerPath.moveToLeague(state, offer.leagueId, offer.team);
    Game.systems.news.onTransfer(state, from, offer.leagueId, team.name);
    state.career.signedPro = true;
    return startNewSeason(state);
  }

  /**
   * Called by the UI whenever a UDFA-style tryout comes up completely
   * empty (no offers, or the one offer tried and lost) — the player spends
   * the coming year as a free agent instead of silently staying attached
   * to their old team. That "year" is a season with zero scheduled games,
   * which seasonRunner.playNextGame resolves to the season summary
   * instantly, so the player can just click through to their next chance.
   * Five straight years of this forces retirement (see
   * careerPath.getTransitionOptions).
   */
  function markFreeAgentYear(state) {
    state.career.team = null;
    state.career.leagueId = null;
    state.career.freeAgent = true;
    state.career.unemployedYears = (state.career.unemployedYears || 0) + 1;
    state.career.currentSeason = { league: 'Free Agency', tier: 0, games: [], record: { w: 0, l: 0, otl: 0 } };
    state.career.stage = 'active';
    state.player.team = 'Free Agent';
    state.player.league = 'Free Agency';
  }

  /**
   * Resolves the player's choice when an NHL lockout event fires (see
   * concludeSeason's lockoutEvent + careerHub.presentLockout). Moves the
   * player to a real AHL affiliate or a European club for the duration,
   * or leaves them in place if they choose to wait it out, then actually
   * starts next season (which concludeSeason held back on).
   */
  function resolveLockoutChoice(state, choiceId) {
    const from = state.career.leagueId;
    if (choiceId === 'play_ahl') {
      const affiliate = Game.data.ahlAffiliates && Game.data.ahlAffiliates.getAffiliate
        ? Game.data.ahlAffiliates.getAffiliate(state.career.team.name)
        : null;
      const team = Game.systems.careerPath.moveToLeague(state, 'AHL', affiliate ? affiliate.affiliate : null);
      Game.systems.news.onTransfer(state, from, 'AHL', team.name);
      Game.systems.news.push(state, {
        type: 'career',
        title: 'Lockout: Loaned to the AHL',
        body: `${state.player.firstName} ${state.player.lastName} will play for ${team.name} during the NHL lockout.`,
        importance: 3,
      });
    } else if (choiceId === 'play_europe') {
      const euroIds = ['SHL', 'LIIGA', 'KHL', 'NL', 'ELH', 'DEL'];
      const id = Game.utils.randChoice(euroIds);
      const team = Game.systems.careerPath.moveToLeague(state, id);
      Game.systems.news.onTransfer(state, from, id, team.name);
      Game.systems.news.push(state, {
        type: 'career',
        title: 'Lockout: Signed in Europe',
        body: `${state.player.firstName} ${state.player.lastName} signed with ${team.name} during the NHL lockout.`,
        importance: 3,
      });
    } else {
      Game.systems.news.push(state, {
        type: 'career',
        title: 'Waiting Out the Lockout',
        body: `${state.player.firstName} ${state.player.lastName} is staying ready at home while the NHL lockout continues.`,
        importance: 2,
      });
    }
    return startNewSeason(state);
  }

  Game.systems = Game.systems || {};
  Game.systems.seasonRunner = {
    ensureActiveSeason,
    playNextGame,
    playRestOfSeason,
    startNewSeason,
    applyTransition,
    resolveTryout,
    acceptOffer,
    markFreeAgentYear,
    resolveLockoutChoice,
    concludeSeason,
  };
})(window.Game = window.Game || {});
