/**
 * awards.js
 * End-of-season awards: league MVP, Hart, Norris, Vezina, Calder,
 * Conn Smythe, Stanley Cup, Olympics, World Juniors medals.
 */
(function (Game) {
  const AWARD_DEFS = {
    LEAGUE_MVP: { id: 'LEAGUE_MVP', name: 'League MVP', icon: '⭐' },
    HART: { id: 'HART', name: 'Hart Trophy', icon: '🦌' },
    NORRIS: { id: 'NORRIS', name: 'Norris Trophy', icon: '🛡️' },
    VEZINA: { id: 'VEZINA', name: 'Vezina Trophy', icon: '🥅' },
    CALDER: { id: 'CALDER', name: 'Calder Trophy', icon: '🆕' },
    CONN_SMYTHE: { id: 'CONN_SMYTHE', name: 'Conn Smythe Trophy', icon: '🏆' },
    STANLEY_CUP: { id: 'STANLEY_CUP', name: 'Stanley Cup', icon: '🏆' },
    LEAGUE_CHAMPION: { id: 'LEAGUE_CHAMPION', name: 'League Champion', icon: '🏆' },
    PLAYOFF_RUN: { id: 'PLAYOFF_RUN', name: 'Playoff Appearance', icon: '🏒' },
    OLYMPIC_GOLD: { id: 'OLYMPIC_GOLD', name: 'Olympic Gold', icon: '🥇' },
    OLYMPIC_SILVER: { id: 'OLYMPIC_SILVER', name: 'Olympic Silver', icon: '🥈' },
    OLYMPIC_BRONZE: { id: 'OLYMPIC_BRONZE', name: 'Olympic Bronze', icon: '🥉' },
    WJC_GOLD: { id: 'WJC_GOLD', name: 'World Juniors Gold', icon: '🥇' },
    WJC_SILVER: { id: 'WJC_SILVER', name: 'World Juniors Silver', icon: '🥈' },
    WJC_BRONZE: { id: 'WJC_BRONZE', name: 'World Juniors Bronze', icon: '🥉' },
    SCORING_TITLE: { id: 'SCORING_TITLE', name: 'Scoring Title', icon: '🎯' },
  };

  function ovr(player) {
    return Game.leagues.leagueData.overall(player);
  }

  function grant(state, awardId, extra) {
    const def = AWARD_DEFS[awardId];
    if (!def) return null;
    const entry = {
      id: def.id,
      name: def.name,
      icon: def.icon,
      year: state.career.currentYear,
      age: state.player.age,
      leagueId: state.career.leagueId,
      ...extra,
    };
    state.player.awards = state.player.awards || [];
    state.player.awards.push(entry);
    state.history.awards = state.history.awards || [];
    state.history.awards.push(entry);
    if (Game.systems.news && Game.systems.news.onAward) {
      Game.systems.news.onAward(state, def.name);
    }
    return entry;
  }

  /** Evaluate awards after a finished season. Returns list of granted awards. */
  function evaluateSeason(state, summary) {
    const player = state.player;
    const totals = summary.totals || {};
    const leagueId = state.career.leagueId;
    const granted = [];
    const rating = ovr(player);
    const isNHL = leagueId === 'NHL';
    const isPro = ['NHL', 'AHL', 'SHL', 'LIIGA', 'KHL', 'NL', 'ELH', 'DEL'].includes(leagueId);
    const gp = totals.games || 0;
    if (gp < 5) return granted;

    // League MVP (any league) — strong season
    let mvpChance = 0;
    if (player.position === 'G') {
      const wins = totals.wins || 0;
      const so = totals.shutouts || 0;
      mvpChance = Math.min(0.55, (wins / 30) * 0.35 + so * 0.04 + (rating - 60) / 100);
    } else {
      const pts = totals.points || 0;
      const goals = totals.goals || 0;
      mvpChance = Math.min(0.55, (pts / 70) * 0.4 + (goals / 40) * 0.15 + (rating - 60) / 120);
    }
    if (Math.random() < mvpChance) {
      granted.push(grant(state, 'LEAGUE_MVP', { league: summary.league }));
    }

    // Scoring title (skaters)
    if (player.position !== 'G' && (totals.points || 0) >= 50 && Math.random() < 0.25) {
      granted.push(grant(state, 'SCORING_TITLE', { points: totals.points }));
    }

    // NHL awards
    if (isNHL) {
      if (player.position !== 'G' && (totals.points || 0) >= 70 && rating >= 78 && Math.random() < 0.18) {
        granted.push(grant(state, 'HART'));
      }
      if (player.position === 'D' && (totals.points || 0) >= 35 && rating >= 76 && Math.random() < 0.2) {
        granted.push(grant(state, 'NORRIS'));
      }
      if (player.position === 'G' && (totals.wins || 0) >= 28 && Math.random() < 0.2) {
        granted.push(grant(state, 'VEZINA'));
      }
      // Calder — first NHL season (approx: age <= 22 or not yet won Calder)
      const hasCalder = (player.awards || []).some((a) => a.id === 'CALDER');
      if (!hasCalder && player.age <= 23 && rating >= 70 && Math.random() < 0.15) {
        granted.push(grant(state, 'CALDER'));
      }
      // Stanley Cup / Conn Smythe are now granted directly by
      // Game.systems.playoffs once the user actually wins the interactive
      // playoff bracket — see careerHub — instead of a hidden dice roll.
    }

    // Olympic medals: granted directly by Game.systems.tournament right
    // after the interactive Olympic tournament is played (see careerHub
    // presentOlympics / playOlympics), not here — same reasoning as World
    // Juniors below: at the time this runs, this year's tournament (if
    // any) hasn't been played yet.

    // World Juniors medals: granted directly by Game.systems.tournament right
    // after the interactive tournament is played (see careerHub), not here —
    // at the time this runs the tournament for this season hasn't been
    // played yet, so there is nothing reliable to check.

    return granted.filter(Boolean);
  }

  function listPlayerAwards(player) {
    return player.awards || [];
  }

  Game.systems = Game.systems || {};
  Game.systems.awards = { evaluateSeason, listPlayerAwards, grant, AWARD_DEFS };
})(window.Game = window.Game || {});
