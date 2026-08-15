/**
 * contract.js
 * Manages player contracts - contract types, duration, salary, and transitions.
 * Contracts determine where a player can go when their current contract ends.
 */
(function (Game) {
  /**
   * Contract types and their default durations/terms
   */
  const CONTRACT_TYPES = {
    // Youth/Development
    NCAA: { type: 'NCAA', years: 4, description: 'University scholarship' },
    CHL: { type: 'CHL', years: 3, description: 'Junior Hockey League contract' },
    USHL: { type: 'USHL', years: 2, description: 'USHL contract (eligible for draft at 18+)' },
    ELITE_JR: { type: 'ELITE_JR', years: 2, description: 'European elite junior league' },

    // Professional
    AHL: { type: 'AHL', years: 1, description: 'AHL contract (development league)' },
    NHL: { type: 'NHL', years: 1, description: 'NHL entry-level contract' },
    EURO_PRO: { type: 'EURO_PRO', years: 2, description: 'European professional league' },

    // Post-Career
    RETIREMENT: { type: 'RETIREMENT', years: 0, description: 'Retired from professional hockey' }
  };

  /**
   * Creates a new contract for a player.
   * `currentYear` is passed explicitly (rather than read from the global
   * Game.state) so this works correctly no matter which state object is
   * active — relying on Game.state here was fragile: it happened to work
   * only because callers always set Game.state before signing, but broke
   * anywhere that wasn't true (e.g. running the season/contract systems
   * standalone, like an automated test, or a future multi-state context).
   * @param {string} leagueId - League ID (NCAA, NHL, AHL, etc.)
   * @param {string} teamName - Name of the team
   * @param {number} salaryUSD - Annual salary in USD
   * @param {number} years - Contract duration in years
   * @param {number} [currentYear] - Career year the contract is signed in; falls back to Game.state if omitted, for backward compatibility.
   * @returns {object} Contract object
   */
  function createContract(leagueId, teamName, salaryUSD, years = 1, currentYear) {
    const year = currentYear != null ? currentYear : (Game.state && Game.state.career ? Game.state.career.currentYear : 0) || 0;
    return {
      id: Game.utils.uid('contract'),
      leagueId,
      teamName,
      salary: salaryUSD,
      startYear: year,
      endYear: year + years,
      yearsRemaining: years,
      status: 'active',
      type: CONTRACT_TYPES[leagueId] ? CONTRACT_TYPES[leagueId].type : 'OTHER',
      signedDate: new Date().toISOString(),
    };
  }

  /**
   * Checks if a contract is expired
   * @param {object} contract - Contract object
   * @param {number} currentYear - Current year in game
   * @returns {boolean}
   */
  function isExpired(contract, currentYear) {
    return contract.endYear <= currentYear;
  }

  /**
   * Updates contract years remaining
   * @param {object} contract - Contract object
   * @param {number} currentYear - Current year in game
   */
  function updateYearsRemaining(contract, currentYear) {
    contract.yearsRemaining = Math.max(0, contract.endYear - currentYear);
    if (contract.yearsRemaining === 0) {
      contract.status = 'expired';
    }
    return contract;
  }

  /**
   * Generates salary range based on league and overall rating
   * @param {string} leagueId - League ID
   * @param {number} playerOvr - Player overall rating (1-99)
   * @returns {object} {min, max, typical}
   */
  function generateSalaryRange(leagueId, playerOvr) {
    const ranges = {
      NCAA: { min: 0, max: 0, typical: 0 }, // Scholarships, no salary
      CHL: { min: 2000, max: 15000, typical: 8000 },
      USHL: { min: 4000, max: 20000, typical: 12000 },
      ELITE_JR: { min: 5000, max: 25000, typical: 15000 },
      AHL: { min: 50000, max: 350000, typical: 150000 },
      NHL: { min: 925000, max: 5000000, typical: 1500000 },
      EURO_PRO: { min: 40000, max: 500000, typical: 200000 },
    };

    // Concrete European pro leagues (SHL, LIIGA, KHL, NL, ELH, DEL, ...)
    // aren't individually listed above — they all share the EURO_PRO salary
    // band. Falling back to NCAA (0) for them, as before, meant every
    // player who signed in Europe outside the abstract 'EURO_PRO' contract
    // path (initial career start, lockout loan, "stay in Europe") showed a
    // $0/yr contract.
    let base = ranges[leagueId];
    if (!base) {
      const league = Game.leagues.leagueData.getLeague(leagueId);
      base = league && league.tier >= 4 ? ranges.EURO_PRO : ranges.NCAA;
    }
    const factor = playerOvr / 50; // Scale by player quality

    return {
      min: Math.floor(base.min * factor),
      max: Math.floor(base.max * factor),
      typical: Math.floor(base.typical * factor),
    };
  }

  /**
   * Generates a realistic salary offer based on league and player performance
   * @param {string} leagueId - League ID
   * @param {number} playerOvr - Player overall rating
   * @returns {number} Salary in USD
   */
  function generateOffer(leagueId, playerOvr) {
    const range = generateSalaryRange(leagueId, playerOvr);
    return Math.floor(Game.utils.randInt(range.min, range.max));
  }

  /**
   * Resolves what happens when a contract expires
   * @param {object} state - Game state
   * @returns {array} Array of available options
   */
  function getContractExpirationOptions(state) {
    const contract = state.player.contract;
    const currentLeague = state.career.leagueId;
    const ovr = Game.leagues.leagueData.overall(state.player);
    const options = [];

    if (currentLeague === 'NHL') {
      const affiliate = Game.data.ahlAffiliates.getAffiliate(contract.teamName);
      
      // Option 1: Renew with current team
      options.push({
        type: 'renew',
        leagueId: 'NHL',
        teamName: contract.teamName,
        label: `Re-sign with ${contract.teamName}`,
        salary: generateOffer('NHL', ovr)
      });

      // Option 2: Go to AHL affiliate
      if (affiliate) {
        options.push({
          type: 'affiliate',
          leagueId: 'AHL',
          teamName: affiliate.affiliate,
          label: `Loan to AHL affiliate: ${affiliate.affiliate}`,
          salary: generateOffer('AHL', ovr)
        });
      }

      // Option 3: Go to Europe — the threshold is deliberately low so a
      // player who's no longer good enough for the NHL (declining late
      // in their career, or just never quite good enough) still has a
      // real path to keep playing professionally overseas.
      if (ovr >= 45) {
        options.push({
          type: 'europe',
          leagueId: 'EURO_PRO',
          label: 'Sign with European team',
          salary: generateOffer('EURO_PRO', ovr)
        });
      }

      // Option 4: Retire
      if (state.player.age >= 33) {
        options.push({
          type: 'retire',
          leagueId: 'RETIREMENT',
          label: 'Retire from professional hockey'
        });
      }
    } else if (currentLeague === 'AHL') {
      options.push({
        type: 'renew',
        leagueId: 'AHL',
        teamName: contract.teamName,
        label: `Re-sign with ${contract.teamName}`,
        salary: generateOffer('AHL', ovr)
      });

      if (ovr >= 70) {
        options.push({
          type: 'promote',
          leagueId: 'NHL',
          label: 'Try for NHL contract',
          salary: generateOffer('NHL', ovr)
        });
      }

      if (ovr >= 60) {
        options.push({
          type: 'europe',
          leagueId: 'EURO_PRO',
          label: 'Sign with European team',
          salary: generateOffer('EURO_PRO', ovr)
        });
      }
    } else if (currentLeague === 'NCAA') {
      if (ovr >= 65) {
        options.push({
          type: 'draft',
          leagueId: 'NHL',
          label: 'Enter NHL Draft (if eligible) or sign as UFA'
        });
      }

      options.push({
        type: 'graduate',
        leagueId: 'UNDRAFTED',
        label: 'Graduate and try for professional contract'
      });
    }

    return options;
  }

  /**
   * Gets contract details for display
   * @param {object} contract - Contract object
   * @returns {object} Formatted contract info
   */
  function getContractDetails(contract) {
    return {
      team: contract.teamName,
      league: Game.leagues.leagueData.getLeague(contract.leagueId).name,
      salary: Game.utils.formatMoney ? Game.utils.formatMoney(contract.salary) : '$' + contract.salary,
      yearsRemaining: contract.yearsRemaining,
      status: contract.status,
      expires: `Year ${contract.endYear}`
    };
  }

  Game.systems = Game.systems || {};
  Game.systems.contract = {
    CONTRACT_TYPES,
    createContract,
    isExpired,
    updateYearsRemaining,
    generateSalaryRange,
    generateOffer,
    getContractExpirationOptions,
    getContractDetails
  };
})(window.Game = window.Game || {});
