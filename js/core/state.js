/**
 * state.js
 * Defines the shape of a save-game's state and exposes Game.state.
 */
(function (Game) {
  function createEmptyState() {
    return {
      meta: {
        slotId: null,
        createdAt: null,
        updatedAt: null,
        version: Game.CONFIG.VERSION,
      },
      player: null,
      career: {
        currentYear: null,
        currentAge: null,
        stage: null,
        retired: false,
        team: null,
        leagueId: null,
        currentSeason: null,
        drafted: false,
        undrafted: false,
        signedPro: false,
        draftInfo: null,
        wjHistory: [],
        freeAgent: false,
        unemployedYears: 0,
      },
      history: {
        seasons: [],
        contracts: [],
        awards: [],
        injuries: [],
        news: [],
        usedEvents: [],
        ledger: [],
      },
      world: {
        leagues: {},
        teams: {},
        npcs: [],
        draftHistory: [],
        records: {},
        initialized: false,
        year: null,
      },
      settings: {
        theme: 'dark',
      },
    };
  }

  Game.state = null;
  Game.createEmptyState = createEmptyState;
})(window.Game = window.Game || {});
