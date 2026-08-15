/**
 * leagueData.js
 * Full country-branching ladder + real European / North American junior & pro leagues.
 */
(function (Game) {
  const EUROPEAN_CODES = new Set(['SE', 'FI', 'RU', 'CZ', 'SK', 'CH', 'DE', 'NO', 'LV', 'DK', 'JP']);

  const LEAGUES = {
    AAA: { id: 'AAA', name: 'AAA Minor Hockey', gamesPerSeason: 28, opponentStrength: 38, tier: 1, region: 'NA' },
    ACADEMY: { id: 'ACADEMY', name: 'National Academy', gamesPerSeason: 26, opponentStrength: 40, tier: 1, region: 'EU' },

    CHL: { id: 'CHL', name: 'Canadian Hockey League', gamesPerSeason: 68, opponentStrength: 58, tier: 2, region: 'CA' },
    USHL: { id: 'USHL', name: 'United States Hockey League', gamesPerSeason: 62, opponentStrength: 56, tier: 2, region: 'US' },
    JUNIOR_A: { id: 'JUNIOR_A', name: 'Junior A', gamesPerSeason: 50, opponentStrength: 52, tier: 2, region: 'CA' },
    NTDP: { id: 'NTDP', name: 'USA NTDP', gamesPerSeason: 55, opponentStrength: 62, tier: 2, region: 'US' },
    ELITE_JR: { id: 'ELITE_JR', name: 'Elite Junior League', gamesPerSeason: 40, opponentStrength: 55, tier: 2, region: 'EU' },

    NCAA: { id: 'NCAA', name: 'NCAA Division I', gamesPerSeason: 34, opponentStrength: 64, tier: 3, region: 'NA' },

    SHL: { id: 'SHL', name: 'SHL (Sweden)', gamesPerSeason: 52, opponentStrength: 74, tier: 4, region: 'EU' },
    LIIGA: { id: 'LIIGA', name: 'Liiga (Finland)', gamesPerSeason: 60, opponentStrength: 72, tier: 4, region: 'EU' },
    KHL: { id: 'KHL', name: 'KHL', gamesPerSeason: 68, opponentStrength: 78, tier: 4, region: 'EU' },
    NL: { id: 'NL', name: 'National League (Switzerland)', gamesPerSeason: 52, opponentStrength: 70, tier: 4, region: 'EU' },
    ELH: { id: 'ELH', name: 'ELH (Czechia)', gamesPerSeason: 52, opponentStrength: 68, tier: 4, region: 'EU' },
    DEL: { id: 'DEL', name: 'DEL (Germany)', gamesPerSeason: 52, opponentStrength: 66, tier: 4, region: 'EU' },

    AHL: { id: 'AHL', name: 'American Hockey League', gamesPerSeason: 72, opponentStrength: 72, tier: 5, region: 'NA' },
    NHL: { id: 'NHL', name: 'National Hockey League', gamesPerSeason: 82, opponentStrength: 88, tier: 6, region: 'NA' },
  };

  const COUNTRY_START = {
    CA: 'AAA', US: 'AAA', MX: 'AAA', AR: 'AAA',
    SE: 'ACADEMY', FI: 'ACADEMY', RU: 'ACADEMY', CZ: 'ACADEMY', SK: 'ACADEMY',
    CH: 'ACADEMY', DE: 'ACADEMY', NO: 'ACADEMY', LV: 'ACADEMY', DK: 'ACADEMY', JP: 'ACADEMY',
  };

  const EURO_PRO_BY_COUNTRY = {
    SE: 'SHL', FI: 'LIIGA', RU: 'KHL', CZ: 'ELH', SK: 'ELH',
    CH: 'NL', DE: 'DEL', NO: 'SHL', LV: 'KHL', DK: 'SHL', JP: 'DEL',
  };

  function isEuropean(code) { return EUROPEAN_CODES.has(code); }
  function isCanadian(code) { return code === 'CA'; }
  function isAmerican(code) { return code === 'US'; }
  function startLeagueId(countryCode) { return COUNTRY_START[countryCode] || 'ACADEMY'; }
  function getLeague(id) { return LEAGUES[id] || LEAGUES.ACADEMY; }

  function overall(player) {
    const attrs = player.attributes;
    const keys = Object.keys(attrs);
    if (!keys.length) return 40;
    return Math.round(keys.reduce((s, k) => s + attrs[k], 0) / keys.length);
  }

  Game.leagues = Game.leagues || {};
  Game.leagues.leagueData = {
    LEAGUES, COUNTRY_START, EURO_PRO_BY_COUNTRY,
    isEuropean, isCanadian, isAmerican, startLeagueId, getLeague, overall,
  };
})(window.Game = window.Game || {});
