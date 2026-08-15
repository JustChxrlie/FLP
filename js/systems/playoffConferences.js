/**
 * playoffConferences.js
 * NHL playoff structure with conference divisions.
 * Handles seeding, matchups, and bracket generation based on conference standings.
 */
(function (Game) {
  /**
   * Current NHL conference structure
   */
  const NHL_CONFERENCES = {
    EASTERN: {
      name: 'Eastern Conference',
      divisions: {
        ATLANTIC: {
          name: 'Atlantic Division',
          teams: [
            'Boston Bruins',
            'Buffalo Sabres',
            'Detroit Red Wings',
            'Florida Panthers',
            'Montreal Canadiens',
            'Ottawa Senators',
            'Tampa Bay Lightning',
            'Toronto Maple Leafs'
          ]
        },
        METROPOLITAN: {
          name: 'Metropolitan Division',
          teams: [
            'Carolina Hurricanes',
            'Columbus Blue Jackets',
            'New Jersey Devils',
            'New York Islanders',
            'New York Rangers',
            'Philadelphia Flyers',
            'Pittsburgh Penguins',
            'Washington Capitals'
          ]
        }
      }
    },
    WESTERN: {
      name: 'Western Conference',
      divisions: {
        CENTRAL: {
          name: 'Central Division',
          teams: [
            'Chicago Blackhawks',
            'Colorado Avalanche',
            'Dallas Stars',
            'Minnesota Wild',
            'Nashville Predators',
            'St. Louis Blues',
            'Winnipeg Jets'
          ]
        },
        PACIFIC: {
          name: 'Pacific Division',
          teams: [
            'Anaheim Ducks',
            'Calgary Flames',
            'Edmonton Oilers',
            'Los Angeles Kings',
            'San Jose Sharks',
            'Seattle Kraken',
            'Vancouver Canucks',
            'Vegas Golden Knights',
            'Utah Hockey Club'
          ]
        }
      }
    }
  };

  /**
   * Gets conference for a team
   * @param {string} teamName - NHL team name
   * @returns {object} Conference and division info
   */
  function getConferenceForTeam(teamName) {
    for (const [confKey, conf] of Object.entries(NHL_CONFERENCES)) {
      for (const [divKey, div] of Object.entries(conf.divisions)) {
        if (div.teams.includes(teamName)) {
          return {
            conference: confKey,
            conferenceName: conf.name,
            division: divKey,
            divisionName: div.name
          };
        }
      }
    }
    return null;
  }

  /**
   * Gets teams in a specific division
   * @param {string} conference - EASTERN or WESTERN
   * @param {string} division - ATLANTIC, METROPOLITAN, CENTRAL, or PACIFIC
   * @returns {array} Team names in division
   */
  function getTeamsInDivision(conference, division) {
    const conf = NHL_CONFERENCES[conference];
    if (!conf) return [];
    const div = conf.divisions[division];
    return div ? div.teams : [];
  }

  /**
   * Gets all teams in a conference
   * @param {string} conference - EASTERN or WESTERN
   * @returns {array} All team names in conference
   */
  function getTeamsInConference(conference) {
    const conf = NHL_CONFERENCES[conference];
    if (!conf) return [];
    const teams = [];
    for (const div of Object.values(conf.divisions)) {
      teams.push(...div.teams);
    }
    return teams;
  }

  /**
   * Playoff bracket structure (Conference -> Division -> Matchup)
   * @param {object} standings - { EASTERN: { ATLANTIC: [team1, team2, ...], ... }, ... }
   * @returns {object} Playoff bracket
   */
  function generatePlayoffBracket(standings) {
    const bracket = {};

    for (const [confName, conf] of Object.entries(standings)) {
      bracket[confName] = {};

      for (const [divName, teams] of Object.entries(conf)) {
        // Teams in standings order (1st, 2nd, etc.)
        // Playoff matchups: 1 vs 8, 2 vs 7, 3 vs 6, 4 vs 5
        const matchups = [];

        // Assuming teams are sorted by standing
        if (teams.length >= 8) {
          matchups.push([teams[0], teams[7]]);  // 1 vs 8
          matchups.push([teams[1], teams[6]]);  // 2 vs 7
          matchups.push([teams[2], teams[5]]);  // 3 vs 6
          matchups.push([teams[3], teams[4]]);  // 4 vs 5
        }

        bracket[confName][divName] = {
          division: divName,
          matchups: matchups,
          round: 'Round 1'
        };
      }
    }

    return bracket;
  }

  /**
   * Determines playoff opponent based on seeding
   * @param {string} teamName - Player's NHL team
   * @param {array} opponentSeeds - Sorted array of opposing teams
   * @returns {string} Playoff opponent
   */
  function getPlayoffOpponent(teamName, opponentSeeds) {
    const confInfo = getConferenceForTeam(teamName);
    if (!confInfo) return opponentSeeds[0];

    // Find seeding within division
    const divTeams = getTeamsInDivision(confInfo.conference, confInfo.division);
    const teamSeed = divTeams.indexOf(teamName) + 1; // 1-8

    // Matchup formula: 1 vs 8, 2 vs 7, etc.
    const opponentSeed = 9 - teamSeed;
    return divTeams[opponentSeed - 1] || opponentSeeds[0];
  }

  /**
   * Playoff round information
   */
  const PLAYOFF_ROUNDS = {
    1: { name: 'Round 1', matchup: 'Best of 7', games: 7 },
    2: { name: 'Conference Finals', matchup: 'Best of 7', games: 7 },
    3: { name: 'Stanley Cup Finals', matchup: 'Best of 7', games: 7 },
  };

  /**
   * Gets playoff round info
   * @param {number} round - Round number (1-3)
   * @returns {object} Round information
   */
  function getPlayoffRoundInfo(round) {
    return PLAYOFF_ROUNDS[round] || PLAYOFF_ROUNDS[1];
  }

  /**
   * Determines if team makes playoffs based on standings
   * Top 4 teams in each division make playoffs
   * @param {number} divisionStanding - Team's standing within division (1-8)
   * @returns {boolean}
   */
  function makesPlayoffs(divisionStanding) {
    return divisionStanding <= 4;
  }

  /**
   * Gets playoff seed (1-8 within division)
   * @param {string} teamName - NHL team name
   * @param {number} standing - Position in division standings
   * @returns {number} Playoff seed
   */
  function getPlayoffSeed(teamName, standing) {
    const confInfo = getConferenceForTeam(teamName);
    if (!confInfo) return standing;
    // Seed is same as regular season standing within division
    return Math.min(standing, 8);
  }

  Game.systems = Game.systems || {};
  Game.systems.playoffConferences = {
    NHL_CONFERENCES,
    getConferenceForTeam,
    getTeamsInDivision,
    getTeamsInConference,
    generatePlayoffBracket,
    getPlayoffOpponent,
    PLAYOFF_ROUNDS,
    getPlayoffRoundInfo,
    makesPlayoffs,
    getPlayoffSeed
  };
})(window.Game = window.Game || {});
