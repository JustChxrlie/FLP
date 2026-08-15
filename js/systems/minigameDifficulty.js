/**
 * minigameDifficulty.js
 * Progressive difficulty system for minigames based on tournament phase/round.
 * Ensures that as tournaments progress, minigames become more challenging.
 */
(function (Game) {
  /**
   * Difficulty multipliers based on tournament phase/context
   * Affects: zone width, sweep speed, number of attempts, scoring requirements
   */
  const DIFFICULTY_LEVELS = {
    // Early rounds/easy matches
    EASY: {
      id: 'easy',
      name: 'Easy',
      zoneWidthMultiplier: 1.3,    // 30% wider target zone
      sweepSpeedMultiplier: 1.4,   // 40% slower
      attemptMultiplier: 1,         // Standard attempts
      scoreThreshold: 0.40,         // Need 40% accuracy to pass
      confidence: 1.2
    },

    // Regular/normal matches
    NORMAL: {
      id: 'normal',
      name: 'Normal',
      zoneWidthMultiplier: 1.0,
      sweepSpeedMultiplier: 1.0,
      attemptMultiplier: 1,
      scoreThreshold: 0.60,
      confidence: 1.0
    },

    // Playoff/tournament matches
    HARD: {
      id: 'hard',
      name: 'Hard',
      zoneWidthMultiplier: 0.75,   // 25% narrower zone
      sweepSpeedMultiplier: 0.75,  // 25% faster
      attemptMultiplier: 1.2,      // More attempts needed (but harder to succeed)
      scoreThreshold: 0.75,        // Need 75% accuracy
      confidence: 0.85
    },

    // Championship/Finals
    EXTREME: {
      id: 'extreme',
      name: 'Extreme',
      zoneWidthMultiplier: 0.5,    // 50% narrower - very precise
      sweepSpeedMultiplier: 0.6,   // Much faster
      attemptMultiplier: 1.5,      // Multiple attempts needed
      scoreThreshold: 0.85,        // Need 85% accuracy
      confidence: 0.7
    }
  };

  /**
   * Gets difficulty based on tournament/phase context
   * @param {string} context - 'training', 'tryout', 'regular_season', 'playoffs', 'wjc', 'olympics'
   * @param {number} round - Current round (1-based)
   * @param {number} totalRounds - Total rounds in this phase
   * @returns {object} Difficulty settings
   */
  function getDifficultyForContext(context, round = 1, totalRounds = 1) {
    switch (context) {
      case 'training':
        return DIFFICULTY_LEVELS.EASY;

      case 'tryout':
        return DIFFICULTY_LEVELS.NORMAL;

      case 'combine':
        return DIFFICULTY_LEVELS.NORMAL;

      case 'regular_season':
        // Early season is easier, late season gets harder
        if (round <= Math.floor(totalRounds * 0.25)) return DIFFICULTY_LEVELS.EASY;
        if (round <= Math.floor(totalRounds * 0.75)) return DIFFICULTY_LEVELS.NORMAL;
        return DIFFICULTY_LEVELS.HARD;

      case 'playoffs':
        // Round 1 = easy, Conference Finals = hard, Stanley Cup = extreme
        if (round === 1) return DIFFICULTY_LEVELS.EASY;
        if (round === 2) return DIFFICULTY_LEVELS.NORMAL;
        if (round === 3) return DIFFICULTY_LEVELS.HARD;
        return DIFFICULTY_LEVELS.EXTREME; // Finals

      case 'wjc':
        // WJC progression
        if (round <= 3) return DIFFICULTY_LEVELS.EASY; // Round robin
        if (round === 4) return DIFFICULTY_LEVELS.NORMAL; // Qualification
        if (round === 5) return DIFFICULTY_LEVELS.HARD; // Quarterfinals
        return DIFFICULTY_LEVELS.EXTREME; // Semis/Finals

      case 'olympics':
        // Olympics progression
        if (round <= 3) return DIFFICULTY_LEVELS.EASY; // Group stage
        if (round === 4) return DIFFICULTY_LEVELS.NORMAL; // Qualification round
        if (round === 5) return DIFFICULTY_LEVELS.HARD; // Quarterfinals
        return DIFFICULTY_LEVELS.EXTREME; // Semis/Finals

      default:
        return DIFFICULTY_LEVELS.NORMAL;
    }
  }

  /**
   * Gets number of minigames to play based on context
   * @param {string} context - Tournament/phase context
   * @param {number} round - Current round
   * @returns {number} Number of minigames to play
   */
  function getMinigameCountForContext(context, round = 1) {
    switch (context) {
      case 'training':
        return 1; // Single training exercise

      case 'tryout':
      case 'combine':
        return 2; // Multiple try exercises

      case 'regular_season':
        return 1; // One per game

      case 'playoffs':
        if (round === 1) return 1; // First round - one per game
        if (round === 2) return 2; // Conference finals - more intense
        if (round === 3) return 2; // Conference finals
        return 3; // Stanley Cup Finals - highest intensity

      case 'wjc':
        if (round <= 3) return 1; // Round robin
        if (round === 4) return 1; // Qualification
        if (round <= 5) return 2; // QF onwards
        return 3; // Finals

      case 'olympics':
        if (round <= 3) return 1; // Group stage
        if (round === 4) return 2; // Qualification
        if (round <= 5) return 2; // QF onwards
        return 3; // Finals

      default:
        return 1;
    }
  }

  /**
   * Gets custom minigame options based on difficulty
   * @param {object} difficulty - Difficulty level object
   * @param {number} playerSkill - Player overall/skill (1-99)
   * @param {number} baseAttempts - Base number of attempts
   * @returns {object} Modified options for minigame
   */
  function getMinigameOptions(difficulty, playerSkill, baseAttempts = 3) {
    const adjustedSkill = Math.round(playerSkill * difficulty.confidence);
    const adjustedAttempts = Math.max(1, Math.round(baseAttempts * difficulty.attemptMultiplier));

    return {
      skill: adjustedSkill,
      attempts: adjustedAttempts,
      difficulty: difficulty.id,
      zoneWidthMultiplier: difficulty.zoneWidthMultiplier,
      sweepSpeedMultiplier: difficulty.sweepSpeedMultiplier,
      scoreThreshold: difficulty.scoreThreshold
    };
  }

  /**
   * Determines if minigame result counts as success based on score and threshold
   * @param {number} score - Minigame score (0-100)
   * @param {object} difficulty - Difficulty object
   * @returns {boolean}
   */
  function isSuccessfulScore(score, difficulty) {
    return score >= (difficulty.scoreThreshold * 100);
  }

  /**
   * Gets minigame description based on context
   * @param {string} context - Tournament context
   * @param {number} round - Current round
   * @returns {string} Minigame description
   */
  function getMinigameDescription(context, round = 1) {
    const descriptions = {
      training: 'Training Exercise: Show your precision and focus.',
      tryout: 'Tryout Challenge: Prove your skills against the competition.',
      combine: 'Combine Test: Demonstrate your athletic ability.',
      regular_season: 'Game Time: Focus and execute in the moment.',
      playoffs: 'Playoff Moment: This is where champions are made.',
      wjc: 'International Stage: Compete for your country\'s glory.',
      olympics: 'Olympic Quest: Represent your nation on the world stage.'
    };
    return descriptions[context] || 'Game Challenge: Show your skill!';
  }

  Game.systems = Game.systems || {};
  Game.systems.minigameDifficulty = {
    DIFFICULTY_LEVELS,
    getDifficultyForContext,
    getMinigameCountForContext,
    getMinigameOptions,
    isSuccessfulScore,
    getMinigameDescription
  };
})(window.Game = window.Game || {});
