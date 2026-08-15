/**
 * teamGenerator.js
 * Generates fictional team names (city + mascot) for the player's own
 * team and for scheduled opponents. Phase 9 will replace this with a
 * persistent, name-stable roster of world teams; for now, names are
 * generated on demand and simply stored wherever they're first assigned
 * (state.career.team, season.games[].opponent) so they stay stable within
 * a save once picked.
 */
(function (Game) {
  const CITIES = [
    'Riverton', 'Frostbridge', 'Lake Placid', 'Ironwood', 'Bay City', 'Northgate',
    'Silverlake', 'Cedar Falls', 'Harborview', 'Maple Ridge', 'Granite Bay', 'Fort Union',
    'Glacier Point', 'Westfield', 'Redstone', 'Pinehurst', 'Stonebrook', 'Copperfield',
    'Winterhaven', 'Elm Crossing',
  ];

  const MASCOTS = [
    'Wolves', 'Ice Hawks', 'Storm', 'Rangers', 'Bruins', 'Miners', 'Blizzards', 'Wolverines',
    'Comets', 'Titans', 'Rapids', 'Foxes', 'Thunderbirds', 'Lumberjacks', 'Kraken', 'Vipers',
    'Grizzlies', 'Falcons', 'Pioneers', 'Marauders',
  ];

  function generateTeamName() {
    return `${Game.utils.randChoice(CITIES)} ${Game.utils.randChoice(MASCOTS)}`;
  }

  Game.leagues = Game.leagues || {};
  Game.leagues.teamGenerator = { generateTeamName };
})(window.Game = window.Game || {});
