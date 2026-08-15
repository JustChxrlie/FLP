/**
 * worldAI.js
 * Simulates all non-user leagues: standings, NPC aging, draft, records.
 */
(function (Game) {
  function ensureWorld(state) {
    if (state.world && state.world.initialized) {
      if (state.world.year == null) state.world.year = state.career.currentYear;
      return state.world;
    }
    state.world = Game.database.worldGenerator.generateWorld();
    state.world.year = state.career.currentYear;
    return state.world;
  }

  function teamStrength(team) {
    if (!team.roster || !team.roster.length) return 50;
    const active = team.roster.filter((n) => !n.retired);
    if (!active.length) return 40;
    const sum = active.reduce((s, n) => s + n.ovr, 0);
    return Math.round(sum / active.length);
  }

  function simulateMatch(home, away) {
    const hs = teamStrength(home) + Game.utils.randInt(-6, 6);
    const as_ = teamStrength(away) + Game.utils.randInt(-6, 6);
    let hg = Math.max(0, Math.round((hs - 40) / 12 + Game.utils.randInt(0, 4)));
    let ag = Math.max(0, Math.round((as_ - 40) / 12 + Game.utils.randInt(0, 4)));
    if (hg === ag) {
      if (Math.random() < 0.55) hg++;
      else ag++;
      return { homeGoals: hg, awayGoals: ag, ot: true };
    }
    return { homeGoals: hg, awayGoals: ag, ot: false };
  }

  function resetRecords(league, world) {
    league.teamIds.forEach((tid) => {
      const t = world.teams[tid];
      if (!t) return;
      t.record = { w: 0, l: 0, otl: 0, gf: 0, ga: 0, pts: 0 };
    });
  }

  /**
   * Simulate a full season for one league (round-robin light).
   * `userCtx`, when it belongs to this league, carries the user's own
   * team's REAL record/goals from the season they just played — that team
   * is excluded from the random simulation and its standings row is set
   * directly from what actually happened, so "make the playoffs" means
   * something real instead of the user's team being a disconnected,
   * cosmetic name floating outside the actual league table.
   */
  function simulateLeagueSeason(league, world, userCtx) {
    resetRecords(league, world);
    const userTeamId = userCtx && userCtx.leagueId === league.id ? userCtx.teamId : null;
    const ids = league.teamIds.slice();
    const gamesPer = Math.min(ids.length * 2, 40);

    for (let g = 0; g < gamesPer; g++) {
      const shuffled = ids.slice().sort(() => Math.random() - 0.5);
      for (let i = 0; i + 1 < shuffled.length; i += 2) {
        if (shuffled[i] === userTeamId || shuffled[i + 1] === userTeamId) continue;
        const home = world.teams[shuffled[i]];
        const away = world.teams[shuffled[i + 1]];
        if (!home || !away) continue;
        const res = simulateMatch(home, away);
        home.record.gf += res.homeGoals;
        home.record.ga += res.awayGoals;
        away.record.gf += res.awayGoals;
        away.record.ga += res.homeGoals;
        if (res.homeGoals > res.awayGoals) {
          if (res.ot) {
            home.record.w++;
            home.record.pts += 2;
            away.record.otl++;
            away.record.pts += 1;
          } else {
            home.record.w++;
            home.record.pts += 2;
            away.record.l++;
          }
        } else {
          if (res.ot) {
            away.record.w++;
            away.record.pts += 2;
            home.record.otl++;
            home.record.pts += 1;
          } else {
            away.record.w++;
            away.record.pts += 2;
            home.record.l++;
          }
        }
      }
    }

    // The user's own team: use their real season record/goals instead of a
    // simulated one, so their standing actually reflects how they played.
    if (userTeamId && world.teams[userTeamId]) {
      const t = world.teams[userTeamId];
      const rec = userCtx.record || { w: 0, l: 0, otl: 0 };
      t.record = {
        w: rec.w || 0,
        l: rec.l || 0,
        otl: rec.otl || 0,
        gf: userCtx.gf || 0,
        ga: userCtx.ga || 0,
        pts: (rec.w || 0) * 2 + (rec.otl || 0),
      };
    }

    // NPC seasonal stats (approx)
    league.teamIds.forEach((tid) => {
      const team = world.teams[tid];
      if (!team) return;
      team.roster.forEach((npc) => {
        if (npc.retired || npc.position === 'G') return;
        const gp = Game.utils.randInt(20, 70);
        const goals = Math.max(0, Math.round(((npc.ovr - 40) / 8) * (gp / 50) * Game.utils.randInt(5, 14) / 10));
        const assists = Math.max(0, Math.round(goals * (0.8 + Math.random())));
        npc.seasonGoals = goals;
        npc.seasonPoints = goals + assists;
        npc.careerGames += gp;
        npc.careerGoals += goals;
        npc.careerPoints += goals + assists;
      });
    });

    const standings = league.teamIds
      .map((tid) => {
        const t = world.teams[tid];
        return {
          teamId: tid,
          name: t.name,
          w: t.record.w,
          l: t.record.l,
          otl: t.record.otl,
          pts: t.record.pts,
          gf: t.record.gf,
          ga: t.record.ga,
          diff: t.record.gf - t.record.ga,
        };
      })
      .sort((a, b) => b.pts - a.pts || b.diff - a.diff);

    league.standings = standings;
    league.season = (league.season || 0) + 1;
    if (standings[0]) {
      league.champions.push({ year: world.year, teamId: standings[0].teamId, name: standings[0].name });
      world.records.teamTitles[standings[0].name] =
        (world.records.teamTitles[standings[0].name] || 0) + 1;
    }
    return standings;
  }

  function ageNpcs(world) {
    Object.values(world.teams).forEach((team) => {
      const survivors = [];
      team.roster.forEach((npc) => {
        if (npc.retired) return;
        npc.age += 1;
        // growth / decline
        if (npc.age <= 24 && npc.ovr < npc.potential) {
          npc.ovr = Math.min(npc.potential, npc.ovr + Game.utils.randInt(0, 3));
        } else if (npc.age >= 33) {
          npc.ovr = Math.max(30, npc.ovr - Game.utils.randInt(0, 3));
        } else if (npc.age >= 29 && Math.random() < 0.35) {
          npc.ovr = Math.max(35, npc.ovr - 1);
        }
        if (npc.age > 40 || (npc.age > 36 && Math.random() < 0.25)) {
          npc.retired = true;
        } else {
          survivors.push(npc);
        }
      });
      // refill roster
      const target = team.leagueId === 'NHL' ? 18 : 14;
      while (survivors.length < target) {
        const age =
          team.leagueId === 'CHL' || team.leagueId === 'USHL'
            ? Game.utils.randInt(16, 19)
            : Game.utils.randInt(19, 28);
        const bias =
          team.leagueId === 'NHL' ? 26 : team.leagueId === 'AHL' ? 16 : 4;
        survivors.push(
          Game.database.npcFactory.createNpc({
            age,
            ovrBias: bias,
            leagueId: team.leagueId,
            teamId: team.id,
          })
        );
      }
      team.roster = survivors;
    });
  }

  /** Run NHL draft: place prospects + optionally user into real NHL teams. */
  function runNhlDraft(state, userDraftResult) {
    const world = ensureWorld(state);
    const year = state.career.currentYear;
    const prospects = Game.database.npcFactory.generateDraftClass(year, 60);

    // Insert user into ranking if they entered
    let userPick = null;
    if (userDraftResult && userDraftResult.drafted) {
      const userOvr = Game.leagues.leagueData.overall(state.player);
      const slot = prospects.findIndex((p) => p.ovr < userOvr);
      const idx = slot < 0 ? prospects.length : slot;
      prospects.splice(idx, 0, {
        id: state.player.id,
        firstName: state.player.firstName,
        lastName: state.player.lastName,
        ovr: userOvr,
        isUser: true,
        countryCode: state.player.countryCode,
        position: state.player.position,
      });
    }

    const nhl = world.leagues.NHL;
    if (!nhl) return { picks: [], prospects };

    const teamOrder = nhl.teamIds.slice().sort(() => Math.random() - 0.5);
    const picks = [];
    const rounds = 7;
    let pickNum = 1;

    for (let round = 1; round <= rounds; round++) {
      for (let t = 0; t < teamOrder.length; t++) {
        const prospect = prospects.shift();
        if (!prospect) break;
        const team = world.teams[teamOrder[t]];
        const entry = {
          year,
          round,
          pick: pickNum++,
          overall: pickNum - 1,
          teamId: team.id,
          teamName: team.name,
          playerId: prospect.id,
          firstName: prospect.firstName,
          lastName: prospect.lastName,
          position: prospect.position,
          ovr: prospect.ovr,
          isUser: !!prospect.isUser,
        };
        picks.push(entry);

        if (prospect.isUser) {
          userPick = entry;
          state.career.draftInfo = {
            round: entry.round,
            pick: entry.pick,
            team: entry.teamName,
            teamId: entry.teamId,
            year,
          };
          state.player.draftedBy = entry.teamName;
        } else if (round <= 3 && team.roster) {
          // top picks join NHL/AHL pipeline
          prospect.leagueId = round === 1 ? 'NHL' : 'AHL';
          prospect.teamId = team.id;
          prospect.drafted = true;
          if (round === 1) team.roster.push(prospect);
        }
      }
    }

    world.draftHistory.push({ year, picks: picks.slice(0, 32) }); // store top 32
    if (world.draftHistory.length > 15) world.draftHistory.shift();

    return { picks, userPick, prospects };
  }

  function updateRecords(world) {
    Object.values(world.teams).forEach((team) => {
      team.roster.forEach((npc) => {
        if (npc.seasonGoals && (!world.records.singleSeasonGoals || npc.seasonGoals > world.records.singleSeasonGoals.value)) {
          world.records.singleSeasonGoals = {
            value: npc.seasonGoals,
            name: `${npc.firstName} ${npc.lastName}`,
            year: world.year,
            team: team.name,
          };
        }
        if (npc.seasonPoints && (!world.records.singleSeasonPoints || npc.seasonPoints > world.records.singleSeasonPoints.value)) {
          world.records.singleSeasonPoints = {
            value: npc.seasonPoints,
            name: `${npc.firstName} ${npc.lastName}`,
            year: world.year,
            team: team.name,
          };
        }
        if (npc.careerGoals && (!world.records.careerGoals || npc.careerGoals > world.records.careerGoals.value)) {
          world.records.careerGoals = {
            value: npc.careerGoals,
            name: `${npc.firstName} ${npc.lastName}`,
            team: team.name,
          };
        }
        if (npc.careerPoints && (!world.records.careerPoints || npc.careerPoints > world.records.careerPoints.value)) {
          world.records.careerPoints = {
            value: npc.careerPoints,
            name: `${npc.firstName} ${npc.lastName}`,
            team: team.name,
          };
        }
      });
    });
  }

  /**
   * Main tick: call once per user season end.
   * `userCtx` (optional): { teamId, leagueId, record, gf, ga } describing
   * the real team/season the user just finished, so their league's
   * simulation folds in their actual results instead of ignoring them.
   */
  function advanceYear(state, userCtx) {
    const world = ensureWorld(state);
    world.year = state.career.currentYear;

    const standingsByLeague = {};
    Object.keys(world.leagues).forEach((lid) => {
      standingsByLeague[lid] = simulateLeagueSeason(world.leagues[lid], world, userCtx);
    });

    updateRecords(world);
    ageNpcs(world);

    // Always run a silent draft class for world flavor (user draft handled separately)
    if (!state.career.drafted || state.career.draftInfo?.year !== state.career.currentYear) {
      // generate and store top prospects without full assignment if user didn't draft this year
      const cls = Game.database.npcFactory.generateDraftClass(world.year, 32);
      world.lastDraftClass = cls.slice(0, 10).map((p) => ({
        name: `${p.firstName} ${p.lastName}`,
        ovr: p.ovr,
        position: p.position,
        countryCode: p.countryCode,
      }));
    }

    return { standingsByLeague, records: world.records };
  }

  function getStandings(state, leagueId) {
    const world = ensureWorld(state);
    const league = world.leagues[leagueId];
    return league ? league.standings : [];
  }

  function getRecords(state) {
    return ensureWorld(state).records;
  }

  function getDraftHistory(state) {
    return ensureWorld(state).draftHistory || [];
  }

  /** Fetches a specific persistent world team by id, or null. */
  function getTeamById(state, teamId) {
    if (!teamId) return null;
    const world = ensureWorld(state);
    return world.teams[teamId] || null;
  }

  /**
   * A team's real affiliate on the other side of the NHL<->AHL bridge
   * (world.teams[x].affiliateId, set once by worldGenerator.linkAffiliates
   * from real-world NHL/AHL pairings). Returns null if the team has none.
   */
  function getAffiliateTeam(state, teamId) {
    const team = getTeamById(state, teamId);
    if (!team || !team.affiliateId) return null;
    return getTeamById(state, team.affiliateId);
  }

  /**
   * Picks a real, persistent team from the given league instead of
   * generating a disposable random name — this is what makes "the team
   * you play for" an actual, name-stable entity that shows up in the same
   * league's standings, draft history and records.
   */
  function pickRealTeam(state, leagueId, excludeTeamId) {
    const world = ensureWorld(state);
    const league = world.leagues[leagueId];
    if (!league || !league.teamIds.length) return null;
    let pool = excludeTeamId ? league.teamIds.filter((id) => id !== excludeTeamId) : league.teamIds;
    if (!pool.length) pool = league.teamIds;
    const id = Game.utils.randChoice(pool);
    return world.teams[id] || null;
  }

  /** 1-based standings position of a team in a league, or null if not found. */
  function getStandingPosition(state, leagueId, teamId) {
    const standings = getStandings(state, leagueId);
    const idx = standings.findIndex((r) => r.teamId === teamId);
    return idx < 0 ? null : idx + 1;
  }

  /**
   * Resolves a persistent team's id from its name within a league — used
   * when a caller (contract re-signing, AHL affiliate loan, ...) already
   * knows exactly which named team the player is joining and just needs
   * the matching persistent id, instead of picking a random one.
   */
  function findTeamIdByName(state, leagueId, name) {
    const world = ensureWorld(state);
    const league = world.leagues[leagueId];
    if (!league || !name) return null;
    const id = league.teamIds.find((tid) => world.teams[tid] && world.teams[tid].name === name);
    return id || null;
  }

  Game.systems = Game.systems || {};
  Game.systems.worldAI = {
    ensureWorld,
    advanceYear,
    runNhlDraft,
    getStandings,
    getRecords,
    getDraftHistory,
    getTeamById,
    getAffiliateTeam,
    pickRealTeam,
    getStandingPosition,
    findTeamIdByName,
    teamStrength,
  };
})(window.Game = window.Game || {});
