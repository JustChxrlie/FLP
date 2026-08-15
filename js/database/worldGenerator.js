/**
 * worldGenerator.js
 * Builds persistent leagues + teams that live in state.world.
 */
(function (Game) {
  /**
   * Leagues that get full persistent standings. `teams` is a minimum team
   * count, not a fixed one — if a league has more real teams in
   * js/data/realTeams.js than this number, every real team is used
   * instead of trimming the list down.
   */
  const WORLD_LEAGUES = [
    { id: 'NHL', teams: 12 },
    { id: 'AHL', teams: 8 },
    { id: 'CHL', teams: 8 },
    { id: 'USHL', teams: 15 },
    { id: 'NCAA', teams: 8 },
    { id: 'SHL', teams: 8 },
    { id: 'LIIGA', teams: 8 },
    { id: 'KHL', teams: 8 },
    { id: 'NL', teams: 6 },
    { id: 'ELH', teams: 6 },
    { id: 'DEL', teams: 6 },
    { id: 'ELITE_JR', teams: 8 },
  ];

  const usedNames = new Set();

  function uniqueTeamName() {
    let name;
    let tries = 0;
    do {
      name = Game.leagues.teamGenerator.generateTeamName();
      tries++;
    } while (usedNames.has(name) && tries < 40);
    usedNames.add(name);
    return name;
  }

  /**
   * Flattens a real-team pool value into a plain array. Most leagues store
   * a flat array; some (e.g. CHL) group real teams by sub-league (WHL,
   * OHL, QMJHL) since that's how they exist in real life — this collapses
   * that grouping into one pool the world doesn't need to know about.
   */
  function flattenPool(value) {
    if (Array.isArray(value)) return value;
    if (value && typeof value === 'object') {
      return Object.keys(value).reduce((acc, key) => acc.concat(flattenPool(value[key])), []);
    }
    return [];
  }

  /**
   * Shuffled copy of a league's real-team pool (see js/data/realTeams.js),
   * or null if that league doesn't have one. Shuffling once per world-gen
   * pass means teams get assigned to random conference slots/indices
   * instead of always appearing in file order.
   */
  function shuffledRealPool(leagueId) {
    const pool = flattenPool(Game.data.realTeams && Game.data.realTeams[leagueId]);
    if (!pool.length) return null;
    const copy = pool.slice();
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Game.utils.randInt(0, i);
      const tmp = copy[i];
      copy[i] = copy[j];
      copy[j] = tmp;
    }
    return copy;
  }

  /**
   * Pulls the next team identity for a league: a real franchise while its
   * pool still has one left, otherwise a fictional generated name (e.g.
   * once WORLD_LEAGUES asks for more teams than a league has real ones).
   */
  function nextTeamIdentity(realQueue) {
    if (realQueue && realQueue.length) {
      const real = realQueue.shift();
      usedNames.add(real.name);
      return { name: real.name, city: real.city || null, state: real.state || null };
    }
    return { name: uniqueTeamName(), city: null, state: null };
  }

  function createTeam(leagueId, index, realQueue) {
    const id = Game.utils.uid('team');
    const identity = nextTeamIdentity(realQueue);
    const name = identity.name;
    const rosterSize = leagueId === 'NHL' ? 18 : leagueId === 'AHL' ? 16 : 14;
    const ovrBias =
      leagueId === 'NHL' ? 28 :
      leagueId === 'AHL' || leagueId === 'KHL' ? 18 :
      leagueId === 'SHL' || leagueId === 'LIIGA' ? 14 :
      leagueId === 'CHL' || leagueId === 'USHL' ? 2 : 0;

    const roster = [];
    for (let i = 0; i < rosterSize; i++) {
      const age =
        leagueId === 'CHL' || leagueId === 'USHL' || leagueId === 'ELITE_JR'
          ? Game.utils.randInt(16, 20)
          : leagueId === 'NCAA'
            ? Game.utils.randInt(18, 23)
            : Game.utils.randInt(20, 36);
      roster.push(
        Game.database.npcFactory.createNpc({
          age,
          ovrBias,
          leagueId,
          teamId: id,
        })
      );
    }

    return {
      id,
      name,
      city: identity.city,
      state: identity.state,
      leagueId,
      index,
      roster,
      record: { w: 0, l: 0, otl: 0, gf: 0, ga: 0, pts: 0 },
      history: [],
      affiliateId: null, // wired up for NHL<->AHL after both leagues exist — see linkAffiliates()
    };
  }

  /**
   * Pairs every NHL team with its real AHL affiliate (Game.data.realTeams
   * .AHL_AFFILIATES, keyed by NHL team name) so "get sent to the minors"
   * always means your own team's real farm club, not a random AHL team.
   * Falls back to pairing by roster index if a name lookup ever misses.
   */
  function linkAffiliates(leagues, teams) {
    const nhl = leagues.NHL;
    const ahl = leagues.AHL;
    if (!nhl || !ahl) return;
    const affMap = (Game.data.realTeams && Game.data.realTeams.AHL_AFFILIATES) || {};
    const ahlByName = {};
    ahl.teamIds.forEach((tid) => { ahlByName[teams[tid].name] = tid; });
    const usedAhl = new Set();

    nhl.teamIds.forEach((nid, i) => {
      const nhlTeam = teams[nid];
      const wantName = affMap[nhlTeam.name];
      let ahlId = wantName && ahlByName[wantName] ? ahlByName[wantName] : null;
      if (!ahlId || usedAhl.has(ahlId)) {
        ahlId = ahl.teamIds.find((tid) => !usedAhl.has(tid)) || ahl.teamIds[i % ahl.teamIds.length];
      }
      usedAhl.add(ahlId);
      nhlTeam.affiliateId = ahlId;
      teams[ahlId].affiliateId = nid; // AHL side points back to its NHL parent
    });
  }

  function generateWorld() {
    usedNames.clear();
    const leagues = {};
    const teams = {};
    const allNpcs = [];

    WORLD_LEAGUES.forEach((def) => {
      const leagueMeta = Game.leagues.leagueData.getLeague(def.id);
      const realQueue = shuffledRealPool(def.id);
      // Never truncate a league's real-team pool — a league with more real
      // teams than its configured minimum gets all of them; fictional
      // names only fill in the gap if the minimum asks for more teams
      // than real ones exist.
      const teamCount = Math.max(def.teams, realQueue ? realQueue.length : 0);
      const teamIds = [];
      for (let i = 0; i < teamCount; i++) {
        const team = createTeam(def.id, i, realQueue);
        teams[team.id] = team;
        teamIds.push(team.id);
        team.roster.forEach((n) => allNpcs.push(n));
      }
      leagues[def.id] = {
        id: def.id,
        name: leagueMeta.name,
        tier: leagueMeta.tier,
        teamIds,
        season: 0,
        standings: [],
        champions: [],
      };
    });

    linkAffiliates(leagues, teams);

    return {
      leagues,
      teams,
      npcs: allNpcs,
      draftHistory: [],
      records: {
        singleSeasonGoals: null,
        singleSeasonPoints: null,
        careerGoals: null,
        careerPoints: null,
        teamTitles: {},
      },
      initialized: true,
      year: null,
    };
  }

  Game.database = Game.database || {};
  Game.database.worldGenerator = { generateWorld, WORLD_LEAGUES, createTeam };
})(window.Game = window.Game || {});
