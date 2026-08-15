/**
 * olympicMinigames.js
 * Special minigame logic for Olympic tournaments.
 * Olympics have unique progression: group stage → qualification/knockout → finals
 */
(function (Game) {
  /**
   * Olympic tournament structure and rules
   */
  const OLYMPIC_FORMAT = {
    groupStage: {
      games: 3,
      rounds: 3,
      difficulty: 'easy',
      progression: 'Round robin - win 2+ to advance to knockout'
    },
    qualification: {
      games: 1,
      rounds: 1,
      difficulty: 'normal',
      progression: '50/50 chance to quarterfinals or knockout'
    },
    knockout: {
      games: 1,
      rounds: 1,
      difficulty: 'normal',
      progression: 'Lose and you\'re out - win and advance'
    },
    quarterfinals: {
      games: 1,
      rounds: 1,
      difficulty: 'hard',
      progression: 'Single elimination'
    },
    semifinals: {
      games: 1,
      rounds: 1,
      difficulty: 'hard',
      progression: 'Best of 1 - winner to gold medal round'
    },
    medals: {
      games: 1,
      rounds: 1,
      difficulty: 'extreme',
      progression: 'Gold or Silver medal'
    }
  };

  /**
   * Determines Olympic tournament progression based on record
   * @param {object} record - Win/loss record from group stage
   * @returns {string} Next phase (qualification, knockout, or quarterfinals)
   */
  function getOlympicProgression(record) {
    const { wins = 0, losses = 0 } = record;
    const totalGames = wins + losses;

    if (totalGames < 3) {
      return 'groupStage'; // Still in group stage
    }

    // After group stage (3 games):
    if (wins >= 2) {
      // Won 2+ games: advance directly to quarterfinals
      return 'quarterfinals';
    } else if (wins === 1) {
      // Won exactly 1: 50/50 chance - either qualification or knockout
      return Math.random() < 0.5 ? 'qualification' : 'knockout';
    } else {
      // Won 0: dropped to qualification (consolation bracket)
      return 'qualification';
    }
  }

  /**
   * Gets minigame requirements for Olympic round
   * @param {string} round - Olympic round (groupStage, quarterfinals, etc.)
   * @returns {object} Minigame configuration
   */
  function getOlympicMinigameConfig(round) {
    const configs = {
      groupStage: {
        attempts: 1,
        skill: 'standard',
        difficulty: 'easy',
        description: 'Group Stage Match - Prove you belong on the Olympic stage'
      },
      qualification: {
        attempts: 1,
        skill: 'standard',
        difficulty: 'normal',
        description: 'Qualification Round - Earn your spot in the main bracket'
      },
      knockout: {
        attempts: 2,
        skill: 'standard',
        difficulty: 'normal',
        description: 'Knockout Round - One loss and you\'re out'
      },
      quarterfinals: {
        attempts: 2,
        skill: 'enhanced',
        difficulty: 'hard',
        description: 'Olympic Quarterfinals - Elite competition awaits'
      },
      semifinals: {
        attempts: 2,
        skill: 'enhanced',
        difficulty: 'hard',
        description: 'Olympic Semifinals - One win from a medal'
      },
      medals: {
        attempts: 3,
        skill: 'peak',
        difficulty: 'extreme',
        description: 'Olympic Final - Play for glory and make history'
      }
    };

    return configs[round] || configs.groupStage;
  }

  /**
   * Processes Olympic tournament results
   * @param {object} state - Game state
   * @param {array} gameResults - Results from Olympic games
   * @returns {object} Tournament summary
   */
  function processOlympicResults(state, gameResults) {
    const wins = gameResults.filter(r => r.won).length;
    const losses = gameResults.filter(r => !r.won).length;
    const nextPhase = getOlympicProgression({ wins, losses });

    let medal = null;
    if (nextPhase === 'medals') {
      // Determine medal color based on overall skill and luck
      const playerOvr = Game.leagues.leagueData.overall(state.player);
      const skillFactor = playerOvr / 99;
      const rand = Math.random();

      if (rand < skillFactor * 0.4) {
        medal = 'gold';
      } else if (rand < skillFactor * 0.7) {
        medal = 'silver';
      } else {
        medal = 'bronze';
      }
    }

    return {
      wins,
      losses,
      nextPhase,
      medal,
      summary: `Olympics: ${wins}-${losses} record. ${nextPhase === 'quarterfinals' ? 'Advanced to quarterfinals!' : nextPhase === 'medal' ? `Won ${medal} medal!` : 'Continue competing...'}`
    };
  }

  /**
   * Gets Olympic medal information
   * @param {string} medal - Medal type (gold, silver, bronze)
   * @returns {object} Medal details
   */
  function getMedalInfo(medal) {
    const medals = {
      gold: {
        name: 'Gold Medal',
        points: 30,
        prestige: 'Exceptional',
        description: 'Olympic Champion!',
        emoji: '🥇'
      },
      silver: {
        name: 'Silver Medal',
        points: 20,
        prestige: 'Outstanding',
        description: 'Runner-up, see you in 4 years!',
        emoji: '🥈'
      },
      bronze: {
        name: 'Bronze Medal',
        points: 10,
        prestige: 'Notable',
        description: 'Third Place, Now go for gold next time!',
        emoji: '🥉'
      }
    };

    return medals[medal] || medals.bronze;
  }

  /**
   * Special Olympic career milestone
   * @param {object} state - Game state
   * @param {string} medal - Medal won (or null)
   */
  function recordOlympicAchievement(state, medal) {
    if (!state.career.olympics) {
      state.career.olympics = [];
    }

    state.career.olympics.push({
      year: state.career.currentYear,
      country: state.player.countryCode,
      medal: medal,
      performance: 'competed'
    });

    // Add to player awards if medal won
    if (medal && state.player.awards) {
      const medalInfo = getMedalInfo(medal);
      state.player.awards.push({
        id: `olympic_${medal}`,
        type: 'olympic',
        name: medalInfo.name,
        description: `Won ${medalInfo.name} at the Winter Olympic Games`,
        year: state.career.currentYear,
        prestige: medalInfo.prestige
      });
    }
  }

  Game.minigames = Game.minigames || {};
  Game.minigames.olympicMinigames = {
    OLYMPIC_FORMAT,
    getOlympicProgression,
    getOlympicMinigameConfig,
    processOlympicResults,
    getMedalInfo,
    recordOlympicAchievement
  };
})(window.Game = window.Game || {});
