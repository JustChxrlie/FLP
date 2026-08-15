/**
 * specialEvents.js
 * Special rare events that can occur during a player's career:
 * - NHL Lockout (extremely rare - 2-3% chance per year when in NHL)
 * - International tournaments
 * - Career milestone events
 */
(function (Game) {
  /**
   * Checks if an NHL lockout should occur this season
   * Very rare event (2-3% chance per year)
   * @param {number} year - Current year
   * @returns {boolean}
   */
  function checkForLockout(year) {
    // 2.5% chance per year
    return Math.random() < 0.025;
  }

  /**
   * Generates lockout event data
   * @param {object} state - Game state
   * @returns {object} Lockout event info
   */
  function generateLockoutEvent(state) {
    const currentLeague = state.career.leagueId;
    
    // Only happens when in NHL
    if (currentLeague !== 'NHL') {
      return null;
    }

    const teamName = state.player.team || 'Your NHL Team';
    const affiliate = Game.data.ahlAffiliates.getAffiliate(teamName);
    const playerOvr = Game.leagues.leagueData.overall(state.player);

    const options = [
      {
        id: 'play_ahl',
        label: `Play in AHL affiliate (${affiliate ? affiliate.affiliate : 'AHL'}) during lockout`,
        description: 'Continue your career in the AHL affiliate while the lockout is ongoing.',
        league: 'AHL',
        impact: 'Continue earning and playing, but in a lower league'
      },
      {
        id: 'play_europe',
        label: 'Sign with European team during lockout',
        description: 'Explore international hockey while the lockout lasts.',
        league: 'EURO_PRO',
        impact: 'High salary potential in Europe, but risk missing NHL action'
      },
      {
        id: 'wait_out',
        label: 'Wait for lockout to end',
        description: 'Stay home and train, hoping the lockout resolves quickly.',
        league: 'LOCKOUT',
        impact: 'No game play, limited training, but maintain loyalty to your NHL team'
      }
    ];

    return {
      type: 'lockout',
      title: 'NHL LOCKOUT',
      description: `The NHL and Players' Association have reached an impasse. A lockout has begun!
      
As a member of the ${teamName}, you must decide how to spend your time while the labor dispute is resolved.`,
      year: state.career.currentYear,
      options,
      duration: Game.utils.randInt(3, 6), // Estimated months
      severity: 'critical'
    };
  }

  /**
   * List of special events that can trigger during career
   */
  const SPECIAL_EVENTS = {
    LOCKOUT: {
      id: 'lockout',
      name: 'NHL Lockout',
      chance: 0.025, // 2.5% per year in NHL
      conditions: (state) => state.career.leagueId === 'NHL',
      generator: generateLockoutEvent
    },
    INJURY_RETURN: {
      id: 'injury_return',
      name: 'Return from Injury',
      chance: 0.15, // Can happen to injured players
      conditions: (state) => state.player.injuries && state.player.injuries.length > 0,
      generator: null // Handled by injury system
    },
    AWARDS: {
      id: 'awards',
      name: 'Major Award Nomination',
      chance: 0.08, // 8% chance for high performers
      conditions: (state) => Game.leagues.leagueData.overall(state.player) >= 80,
      generator: null // Handled by awards system
    },
    COACH_CONFLICT: {
      id: 'coach_conflict',
      name: 'Coach Conflict',
      chance: 0.05, // 5% chance, can hurt relationships
      conditions: (state) => state.player.relationships.coach < 40,
      generator: null
    },
    TRADE: {
      id: 'trade',
      name: 'Traded to New Team',
      chance: 0.1, // 10% chance in professional leagues
      conditions: (state) => ['NHL', 'AHL', 'EURO_PRO'].includes(state.career.leagueId),
      generator: null
    }
  };

  /**
   * Checks if any special events should trigger this year
   * @param {object} state - Game state
   * @returns {array} Array of triggered special events
   */
  function checkSpecialEvents(state) {
    const triggeredEvents = [];

    Object.values(SPECIAL_EVENTS).forEach((event) => {
      if (event.conditions(state) && Math.random() < event.chance) {
        if (event.generator) {
          const eventData = event.generator(state);
          if (eventData) {
            triggeredEvents.push(eventData);
          }
        } else {
          triggeredEvents.push({
            type: event.id,
            title: event.name,
            description: `${event.name} has occurred!`,
            year: state.career.currentYear
          });
        }
      }
    });

    return triggeredEvents;
  }

  /**
   * Handles the lockout event outcome
   * @param {object} state - Game state
   * @param {string} choiceId - Which option the player chose
   */
  function handleLockoutChoice(state, choiceId) {
    switch (choiceId) {
      case 'play_ahl':
        state.career.leagueId = 'AHL';
        state.career.lockoutMode = 'ahl_affiliate';
        if (Game.state && Game.state.news) {
          Game.systems.newsEngine.addNews({
            type: 'career',
            title: 'Playing AHL During Lockout',
            description: `${state.player.firstName} decided to play in the AHL affiliate during the lockout.`
          });
        }
        break;

      case 'play_europe':
        state.career.leagueId = 'EURO_PRO';
        state.career.lockoutMode = 'europe';
        if (Game.state && Game.state.news) {
          Game.systems.newsEngine.addNews({
            type: 'career',
            title: 'European Adventure',
            description: `${state.player.firstName} signed with a European team during the NHL lockout.`
          });
        }
        break;

      case 'wait_out':
        state.career.lockoutMode = 'waiting';
        state.career.leagueId = 'LOCKOUT';
        if (Game.state && Game.state.news) {
          Game.systems.newsEngine.addNews({
            type: 'career',
            title: 'Waiting Out the Lockout',
            description: `${state.player.firstName} decided to wait for the NHL lockout to end.`
          });
        }
        break;
    }
  }

  /**
   * Resolves a lockout (when it ends)
   * @param {object} state - Game state
   */
  function resolveLockout(state) {
    if (state.career.lockoutMode === 'ahl_affiliate' || state.career.lockoutMode === 'europe') {
      // Return to NHL
      state.career.leagueId = 'NHL';
      state.career.lockoutMode = null;
    }
  }

  Game.systems = Game.systems || {};
  Game.systems.specialEvents = {
    checkForLockout,
    generateLockoutEvent,
    checkSpecialEvents,
    handleLockoutChoice,
    resolveLockout,
    SPECIAL_EVENTS
  };
})(window.Game = window.Game || {});
