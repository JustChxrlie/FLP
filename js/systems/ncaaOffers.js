/**
 * ncaaOffers.js
 * NCAA recruiting system - players receive offers from universities based on their stats.
 * Offers scale with player performance (points scored, assists, overall rating).
 * Player can choose which NCAA team to join with an animation/special event.
 */
(function (Game) {
  /**
   * NCAA conference tiers for recruitment strength
   */
  const NCAA_CONFERENCES = {
    NCHC: { tier: 'elite', prestige: 95 },
    BIG10: { tier: 'elite', prestige: 90 },
    AHA: { tier: 'mid', prestige: 70 },
    CCHA: { tier: 'mid', prestige: 68 },
  };

  /**
   * Gets NCAA schools by conference
   * @returns {object} Schools grouped by conference
   */
  function getNCAASchoolsByConference() {
    if (!Game.data || !Game.data.realTeams || !Game.data.realTeams.NCAA) {
      return {};
    }
    return Game.data.realTeams.NCAA;
  }

  /**
   * Generates NCAA recruiting offers based on player stats
   * @param {object} state - Game state
   * @returns {array} Array of NCAA offers
   */
  function generateNCAAOffers(state) {
    const player = state.player;
    const ovr = Game.leagues.leagueData.overall(player);
    const careerStats = player.careerTotals || {};
    const pointsPerGame = careerStats.points && careerStats.games ? careerStats.points / careerStats.games : 0;

    const offers = [];
    const schools = getNCAASchoolsByConference();

    // Elite programs recruit the best
    if (ovr >= 80) {
      const eliteSchools = [...(schools.NCHC || []), ...(schools.BIG10 || [])];
      const selected = selectRandomSchools(eliteSchools, Math.min(3, Math.floor(ovr / 30)));
      selected.forEach(school => {
        offers.push({
          school: school.name,
          conference: 'Elite Conference',
          prestige: 90,
          scholarship: 'Full Ride',
          quality: 'elite',
          likelihood: 0.95
        });
      });
    }

    // Mid-tier programs recruit good players
    if (ovr >= 65 && ovr < 80) {
      const midSchools = [...(schools.AHA || []), ...(schools.CCHA || [])];
      const selected = selectRandomSchools(midSchools, Math.min(4, Math.floor(ovr / 25)));
      selected.forEach(school => {
        offers.push({
          school: school.name,
          conference: 'Mid-tier Conference',
          prestige: 75,
          scholarship: 'Full/Partial Ride',
          quality: 'good',
          likelihood: 0.80
        });
      });
    }

    // Lower programs cast wide nets
    if (ovr >= 55) {
      const anySchools = Object.values(schools).flat();
      const selected = selectRandomSchools(anySchools, Math.min(5, Math.floor(ovr / 20)));
      selected.forEach(school => {
        offers.push({
          school: school.name,
          conference: 'Developmental Conference',
          prestige: 60,
          scholarship: 'Partial Scholarship',
          quality: 'developing',
          likelihood: 0.60
        });
      });
    }

    return offers.sort((a, b) => b.prestige - a.prestige);
  }

  /**
   * Helper: Select random schools from a list
   * @param {array} schools - Array of school objects
   * @param {number} count - Number to select
   * @returns {array} Selected schools
   */
  function selectRandomSchools(schools, count) {
    if (!schools || schools.length === 0) return [];
    const shuffled = [...schools].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, Math.min(count, schools.length));
  }

  /**
   * Gets recruiting quality description based on stats
   * @param {number} overallRating - Player OVR (1-99)
   * @param {number} pointsPerGame - Points per game
   * @returns {object} Quality info
   */
  function getRecruitingQuality(overallRating, pointsPerGame = 0) {
    if (overallRating >= 85) {
      return {
        tier: 'elite',
        description: 'Elite prospect - Multiple offers from top programs',
        icon: '⭐⭐⭐⭐⭐'
      };
    } else if (overallRating >= 75) {
      return {
        tier: 'excellent',
        description: 'Excellent prospect - Strong offers from quality programs',
        icon: '⭐⭐⭐⭐'
      };
    } else if (overallRating >= 65) {
      return {
        tier: 'good',
        description: 'Good prospect - Solid offers available',
        icon: '⭐⭐⭐'
      };
    } else if (overallRating >= 55) {
      return {
        tier: 'developing',
        description: 'Developing prospect - Interest from developmental programs',
        icon: '⭐⭐'
      };
    } else {
      return {
        tier: 'longshot',
        description: 'Long shot - Limited offers, hard road ahead',
        icon: '⭐'
      };
    }
  }

  /**
   * Creates recruiting event for player
   * @param {object} state - Game state
   * @returns {object} Recruiting event data
   */
  function createRecruitingEvent(state) {
    const offers = generateNCAAOffers(state);
    const ovr = Game.leagues.leagueData.overall(state.player);
    const quality = getRecruitingQuality(ovr);

    if (offers.length === 0) {
      return {
        type: 'no_offers',
        title: 'No NCAA Offers',
        description: 'Unfortunately, no NCAA programs are interested at this time. Consider improving your performance or exploring other paths (USHL, CHL, Juniors).',
        quality
      };
    }

    return {
      type: 'recruiting',
      title: `NCAA Recruiting - ${quality.icon}`,
      description: `${quality.description}\n\nChoose wisely - this decision will shape your college career!`,
      quality,
      offers,
      deadline: `By end of season (Year ${state.career.currentYear + 1})`
    };
  }

  /**
   * Handles NCAA offer acceptance
   * @param {object} state - Game state
   * @param {string} schoolName - Name of chosen school
   */
  function acceptNCAAOffer(state, schoolName) {
    state.career.ncaaSchool = schoolName;
    state.career.leagueId = 'NCAA';
    state.player.team = schoolName;

    if (Game.systems && Game.systems.newsEngine) {
      Game.systems.newsEngine.addNews({
        type: 'career',
        title: 'NCAA Commitment',
        description: `${state.player.firstName} ${state.player.lastName} committed to play college hockey at ${schoolName}!`
      });
    }
  }

  /**
   * Gets scholarships based on NCAA tier
   * @param {string} conference - Conference name
   * @returns {string} Scholarship type
   */
  function getScholarshipType(conference) {
    if (conference.includes('Elite')) return 'Full Scholarship - Tuition, Room & Board, Books';
    if (conference.includes('Mid')) return 'Full/Partial Scholarship - Varies by program';
    return 'Partial Scholarship - Merit-based aid';
  }

  Game.systems = Game.systems || {};
  Game.systems.ncaaOffers = {
    NCAA_CONFERENCES,
    generateNCAAOffers,
    getRecruitingQuality,
    createRecruitingEvent,
    acceptNCAAOffer,
    getScholarshipType,
    getNCAASchoolsByConference
  };
})(window.Game = window.Game || {});
