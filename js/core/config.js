/**
 * config.js
 * Global, immutable game configuration. Contains no save-game state
 * (that lives in state.js).
 */
(function (Game) {
  Game.CONFIG = {
    GAME_TITLE: 'Frozen Legacy',
    VERSION: '1.1',

    SAVE_KEY_PREFIX: 'frozenlegacy_save_',
    MAX_SAVE_SLOTS: 3,

    CAREER: {
      START_AGE: 12,
      MIN_RETIRE_AGE: 35,
      MAX_RETIRE_AGE: 42,
      DRAFT_MIN_AGE: 18,
      DRAFT_MAX_AGE: 21,
      WJ_MIN_AGE: 16,
      WJ_MAX_AGE: 20,
      NCAA_MAX_YEARS: 4,
      UDFA_RETIRE_AFTER_YEARS: 5,
      TOP_PICK_CUTOFF: 5,
    },

    POSITIONS: [
      { id: 'C', label: 'Center', full: 'Center' },
      { id: 'LW', label: 'Left Wing', full: 'Left Wing' },
      { id: 'RW', label: 'Right Wing', full: 'Right Wing' },
      { id: 'D', label: 'Defenseman', full: 'Defenseman' },
      { id: 'G', label: 'Goalie', full: 'Goalie' },
    ],

    HANDS: [
      { id: 'L', label: 'Left' },
      { id: 'R', label: 'Right' },
    ],

    THEME_STORAGE_KEY: 'frozenlegacy_theme',

    OVR_THRESHOLDS: {
      NHL_ELITE: 85,
      NHL_STARTER: 78,
      NHL_BOTTOM: 72,
      AHL: 68,
      TOP_EURO: 74,
      MID_EURO: 65,
      JUNIOR_ELITE: 58,
      DRAFT_1ST: 82,
      DRAFT_2ND: 75,
      DRAFT_LATE: 68,
      TRYOUT_PASS: 62,
    },
  };
})(window.Game = window.Game || {});
