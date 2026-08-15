/**
 * npcFactory.js
 * Lightweight NPC players for world simulation (not full player objects).
 */
(function (Game) {
  const POSITIONS = ['C', 'LW', 'RW', 'D', 'D', 'G']; // D weighted

  function randomCountry() {
    const list = Game.data.countries || [{ code: 'CA' }];
    return Game.utils.randChoice(list).code;
  }

  function randomName(countryCode) {
    const names = Game.data.names || {};
    const pool = names[countryCode] || names.CA || names.US || { first: ['Alex'], last: ['Player'] };
    const first = Game.utils.randChoice(pool.first || pool.firstNames || ['Alex']);
    const last = Game.utils.randChoice(pool.last || pool.lastNames || ['Smith']);
    return { firstName: first, lastName: last };
  }

  /** Create a compact NPC for world sim. ovrBias shifts average overall. */
  function createNpc({ age, position, countryCode, ovrBias, leagueId, teamId } = {}) {
    const pos = position || Game.utils.randChoice(POSITIONS);
    const code = countryCode || randomCountry();
    const name = randomName(code);
    const base = 42 + (ovrBias || 0) + Game.utils.randInt(-12, 18);
    const ovr = Game.utils.clamp(base, 28, 95);
    const potential = Game.utils.clamp(ovr + Game.utils.randInt(0, 22), ovr, 99);

    return {
      id: Game.utils.uid('npc'),
      firstName: name.firstName,
      lastName: name.lastName,
      countryCode: code,
      position: pos,
      age: age != null ? age : Game.utils.randInt(18, 34),
      ovr,
      potential,
      leagueId: leagueId || null,
      teamId: teamId || null,
      careerGoals: 0,
      careerPoints: 0,
      careerGames: 0,
      awards: [],
      retired: false,
    };
  }

  /** Generate a draft-eligible prospect class. */
  function generateDraftClass(year, count = 64) {
    const prospects = [];
    for (let i = 0; i < count; i++) {
      const tier = i < 8 ? 18 : i < 24 ? 8 : i < 40 ? 0 : -8;
      const p = createNpc({
        age: Game.utils.randInt(18, 20),
        ovrBias: tier,
      });
      p.draftYear = year;
      p.draftEligible = true;
      prospects.push(p);
    }
    prospects.sort((a, b) => b.ovr - a.ovr);
    return prospects;
  }

  Game.database = Game.database || {};
  Game.database.npcFactory = { createNpc, generateDraftClass, randomCountry, randomName };
})(window.Game = window.Game || {});
