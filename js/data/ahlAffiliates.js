/**
 * ahlAffiliates.js
 * Maps NHL teams to their AHL affiliate teams for loan/demotion purposes.
 * Allows players to go to their team's AHL affiliate when they're not
 * performing well in the NHL, or when they need development time.
 */
(function (Game) {
  Game.data = Game.data || {};

  const AHL_AFFILIATES = {
    // Eastern Conference - Atlantic
    'Boston Bruins': { affiliate: 'Providence Bruins', league: 'AHL', country: 'US', state: 'RI' },
    'Buffalo Sabres': { affiliate: 'Rochester Americans', league: 'AHL', country: 'US', state: 'NY' },
    'Detroit Red Wings': { affiliate: 'Grand Rapids Griffins', league: 'AHL', country: 'US', state: 'MI' },
    'Florida Panthers': { affiliate: 'Charlotte Checkers', league: 'AHL', country: 'US', state: 'NC' },
    'Montreal Canadiens': { affiliate: 'Laval Rocket', league: 'AHL', country: 'CA', state: 'QC' },
    'Ottawa Senators': { affiliate: 'Belleville Senators', league: 'AHL', country: 'CA', state: 'ON' },
    'Tampa Bay Lightning': { affiliate: 'Syracuse Crunch', league: 'AHL', country: 'US', state: 'NY' },
    'Toronto Maple Leafs': { affiliate: 'Toronto Marlies', league: 'AHL', country: 'CA', state: 'ON' },

    // Eastern Conference - Metropolitan
    'Carolina Hurricanes': { affiliate: 'Chicago Wolves', league: 'AHL', country: 'US', state: 'IL' },
    'Columbus Blue Jackets': { affiliate: 'Cleveland Monsters', league: 'AHL', country: 'US', state: 'OH' },
    'New Jersey Devils': { affiliate: 'Utica Comets', league: 'AHL', country: 'US', state: 'NY' },
    'New York Islanders': { affiliate: 'Bridgeport Islanders', league: 'AHL', country: 'US', state: 'CT' },
    'New York Rangers': { affiliate: 'Hartford Wolf Pack', league: 'AHL', country: 'US', state: 'CT' },
    'Philadelphia Flyers': { affiliate: 'Lehigh Valley Phantoms', league: 'AHL', country: 'US', state: 'PA' },
    'Pittsburgh Penguins': { affiliate: 'Wilkes-Barre Scranton Penguins', league: 'AHL', country: 'US', state: 'PA' },
    'Washington Capitals': { affiliate: 'Hershey Bears', league: 'AHL', country: 'US', state: 'PA' },

    // Western Conference - Central
    'Colorado Avalanche': { affiliate: 'Colorado Eagles', league: 'AHL', country: 'US', state: 'CO' },
    'Chicago Blackhawks': { affiliate: 'Rockford IceHogs', league: 'AHL', country: 'US', state: 'IL' },
    'Dallas Stars': { affiliate: 'Texas Stars', league: 'AHL', country: 'US', state: 'TX' },
    'Minnesota Wild': { affiliate: 'Iowa Wild', league: 'AHL', country: 'US', state: 'IA' },
    'Nashville Predators': { affiliate: 'Milwaukee Admirals', league: 'AHL', country: 'US', state: 'WI' },
    'St. Louis Blues': { affiliate: 'Springfield Thunderbirds', league: 'AHL', country: 'US', state: 'MO' },
    'Winnipeg Jets': { affiliate: 'Manitoba Moose', league: 'AHL', country: 'CA', state: 'MB' },

    // Western Conference - Pacific
    'Anaheim Ducks': { affiliate: 'San Diego Gulls', league: 'AHL', country: 'US', state: 'CA' },
    'Calgary Flames': { affiliate: 'Wichita Thunder', league: 'AHL', country: 'US', state: 'KS' },
    'Edmonton Oilers': { affiliate: 'Bakersfield Condors', league: 'AHL', country: 'US', state: 'CA' },
    'Los Angeles Kings': { affiliate: 'Ontario Reign', league: 'AHL', country: 'US', state: 'CA' },
    'San Jose Sharks': { affiliate: 'San Jose Barracuda', league: 'AHL', country: 'US', state: 'CA' },
    'Seattle Kraken': { affiliate: 'Coachella Valley Firebirds', league: 'AHL', country: 'US', state: 'CA' },
    'Vancouver Canucks': { affiliate: 'Abbotsford Canucks', league: 'AHL', country: 'CA', state: 'BC' },
    'Vegas Golden Knights': { affiliate: 'Henderson Silver Knights', league: 'AHL', country: 'US', state: 'NV' },
    'Utah Hockey Club': { affiliate: 'Salt Lake City Grizzlies', league: 'AHL', country: 'US', state: 'UT' }
  };

  /**
   * Get the AHL affiliate for a given NHL team
   * @param {string} teamName - The NHL team name
   * @returns {object|null} The affiliate info or null if not found
   */
  function getAffiliate(teamName) {
    return AHL_AFFILIATES[teamName] || null;
  }

  /**
   * Get all affiliates
   * @returns {object} All AHL affiliate mappings
   */
  function getAllAffiliates() {
    return { ...AHL_AFFILIATES };
  }

  Game.data.ahlAffiliates = {
    getAffiliate,
    getAllAffiliates,
    AHL_AFFILIATES
  };
})(window.Game = window.Game || {});
