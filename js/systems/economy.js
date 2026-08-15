/**
 * economy.js
 * Salaries by league tier, seasonal pay, living expenses, sponsorships, taxes.
 */
(function (Game) {
  /** Base annual salary by leagueId (before OVR multiplier). */
  const SALARY_TABLE = {
    AAA: 0,
    ACADEMY: 0,
    CHL: 4500,
    USHL: 4000,
    JUNIOR_A: 2500,
    NTDP: 5000,
    ELITE_JR: 6000,
    NCAA: 0, // scholarship — living stipend
    SHL: 85000,
    LIIGA: 70000,
    KHL: 120000,
    NL: 95000,
    ELH: 55000,
    DEL: 60000,
    AHL: 90000,
    NHL: 850000,
  };

  const LIVING_COST = {
    1: 1200,  // youth
    2: 3500,  // junior
    3: 5000,  // NCAA
    4: 18000, // euro pro
    5: 22000, // AHL
    6: 45000, // NHL
  };

  function baseSalary(leagueId) {
    return SALARY_TABLE[leagueId] != null ? SALARY_TABLE[leagueId] : 3000;
  }

  function salaryForPlayer(player, leagueId) {
    const base = baseSalary(leagueId);
    if (base <= 0) return 0;
    const ovr = Game.leagues.leagueData.overall(player);
    const mult = 0.55 + (ovr / 100) * 1.1; // ~0.55–1.65
    return Math.round(base * mult);
  }

  function livingCost(tier) {
    return LIVING_COST[tier] || 4000;
  }

  function sponsorshipIncome(player) {
    const list = player.finances.sponsorships || [];
    return list.reduce((s, sp) => s + (sp.amount || 0), 0);
  }

  /** Apply end-of-season money: salary + sponsors − living − tax. Returns ledger. */
  function settleSeason(state) {
    const player = state.player;
    ensureFinances(player); // guards against settling before finances exist (e.g. first-ever season, shop never opened)
    const leagueId = state.career.leagueId || 'AAA';
    const league = Game.leagues.leagueData.getLeague(leagueId);
    const tier = league.tier || 1;

    const salary = salaryForPlayer(player, leagueId);
    const sponsors = sponsorshipIncome(player);
    const living = livingCost(tier);
    const gross = salary + sponsors;
    const taxRate = gross > 100000 ? 0.28 : gross > 30000 ? 0.18 : 0.05;
    const tax = Math.round(gross * taxRate);
    const net = gross - living - tax;

    player.finances.balance = (player.finances.balance || 0) + net;

    // NCAA stipend
    if (leagueId === 'NCAA' && salary === 0) {
      player.finances.balance += 8000;
    }

    // Youth pocket money from family
    if (tier === 1) {
      player.finances.balance += 1500;
    }

    const ledger = {
      salary,
      sponsors,
      living: -living,
      tax: -tax,
      net,
      balance: player.finances.balance,
    };

    state.history.ledger = state.history.ledger || [];
    state.history.ledger.push({
      year: state.career.currentYear,
      age: player.age,
      ...ledger,
    });

    return ledger;
  }

  function ensureFinances(player) {
    if (!player.finances) {
      player.finances = { balance: 0, sponsorships: [], expenses: [], purchases: [], activeBuffs: [] };
    }
    if (!player.finances.activeBuffs) player.finances.activeBuffs = [];
    if (!player.finances.purchases) player.finances.purchases = [];
    if (player.finances.balance == null) player.finances.balance = 0;
  }

  function canAfford(player, price) {
    ensureFinances(player);
    return player.finances.balance >= price;
  }

  function spend(player, amount, label) {
    ensureFinances(player);
    if (player.finances.balance < amount) return false;
    player.finances.balance -= amount;
    player.finances.expenses.push({
      id: Game.utils.uid('exp'),
      label: label || 'Purchase',
      amount: -amount,
      year: null,
    });
    return true;
  }

  function addMoney(player, amount, label) {
    ensureFinances(player);
    player.finances.balance += amount;
  }

  /** Starting money when career begins. */
  function grantStartingMoney(player) {
    ensureFinances(player);
    player.finances.balance = 2500;
  }

  Game.systems = Game.systems || {};
  Game.systems.economy = {
    baseSalary,
    salaryForPlayer,
    livingCost,
    settleSeason,
    ensureFinances,
    canAfford,
    spend,
    addMoney,
    grantStartingMoney,
    sponsorshipIncome,
    SALARY_TABLE,
  };
})(window.Game = window.Game || {});
