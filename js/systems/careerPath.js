/**
 * careerPath.js
 * Country-specific development paths, draft, free agency tryouts, World Juniors.
 */
(function (Game) {
  const LD = () => Game.leagues.leagueData;
  const OVR = () => Game.CONFIG.OVR_THRESHOLDS;

  function pathRegion(code) {
    if (LD().isCanadian(code)) return 'CA';
    if (LD().isAmerican(code)) return 'US';
    if (LD().isEuropean(code)) return 'EU';
    return 'EU';
  }

  /** Returns possible next leagues + choice flags when a transition age is hit. */
  function getTransitionOptions(state) {
    const player = state.player;
    const age = player.age;
    const code = player.countryCode;
    const region = pathRegion(code);
    const ovr = LD().overall(player);
    const currentId = state.career.leagueId || LD().startLeagueId(code);
    const options = [];

    // Free-agent gap year: the player has no team at all (see
    // seasonRunner.markFreeAgentYear, called whenever a UDFA-style tryout
    // fails). Nothing else applies until they either land a team or run out
    // of chances — 5 straight unsigned years forces retirement.
    if (state.career.freeAgent) {
      if ((state.career.unemployedYears || 0) >= Game.CONFIG.CAREER.UDFA_RETIRE_AFTER_YEARS) {
        return [{
          leagueId: 'RETIREMENT',
          label: `No club has signed ${player.firstName} in ${state.career.unemployedYears} years — it's time to retire.`,
          auto: false,
          retireChoice: true,
        }];
      }
      return [{ type: 'ufa', label: 'Try out for a team again', auto: false }];
    }

    // NCAA eligibility is exactly 4 seasons — after that it's a forced,
    // single UDFA-style tryout with a real pro club, exactly like going
    // undrafted, not a normal "stay another year" choice.
    if (currentId === 'NCAA') {
      const ncaaYears = state.history.seasons.filter((s) => s.leagueId === 'NCAA').length;
      if (ncaaYears >= Game.CONFIG.CAREER.NCAA_MAX_YEARS) {
        return [{
          type: 'ufa',
          label: `NCAA eligibility used up after ${ncaaYears} seasons — try out for a pro club`,
          auto: false,
        }];
      }
    }

    // Age 16 transitions
    if (age === 16) {
      if (region === 'CA') {
        options.push({ leagueId: 'CHL', label: 'Enter the CHL Draft', auto: false, juniorDraft: true });
        options.push({ leagueId: 'JUNIOR_A', label: 'Stay in Junior A → path to NCAA', auto: false });
      } else if (region === 'US') {
        options.push({ leagueId: 'USHL', label: 'Enter the USHL Draft', auto: false, juniorDraft: true });
        if (ovr >= 60) options.push({ leagueId: 'NTDP', label: 'USA NTDP (highly selective)', auto: false });
        options.push({ leagueId: 'NCAA', label: 'Commit early to NCAA path', auto: false, ncaaChoice: true });
      } else if (region === 'EU') {
        options.push({ leagueId: 'ELITE_JR', label: 'Move to Elite Junior', auto: true });
      }
    }

    // Age 17-18 European promotion
    if (region === 'EU' && age >= 17 && age <= 19 && currentId === 'ELITE_JR') {
      const euroId = LD().EURO_PRO_BY_COUNTRY[code] || 'SHL';
      if (ovr >= OVR().TOP_EURO) {
        options.push({ leagueId: euroId, label: `Sign with ${LD().getLeague(euroId).name}`, auto: false });
      } else if (ovr >= OVR().MID_EURO) {
        options.push({ leagueId: euroId, label: `Tryout with ${LD().getLeague(euroId).name}`, tryout: true });
      }
    }

    // NCAA entry from juniors
    if ((currentId === 'CHL' || currentId === 'USHL' || currentId === 'JUNIOR_A' || currentId === 'NTDP') && age >= 17 && age <= 20) {
      options.push({ leagueId: 'NCAA', label: 'Commit to NCAA', auto: false, ncaaChoice: true });
    }

    // Draft window 18-21
    if (age >= Game.CONFIG.CAREER.DRAFT_MIN_AGE && age <= Game.CONFIG.CAREER.DRAFT_MAX_AGE && !state.career.drafted && !state.career.undrafted) {
      options.push({ type: 'draft', label: 'Enter NHL Draft', auto: false });
    }

    // Undrafted free agent
    if (age >= 20 && !state.career.drafted && !state.career.signedPro) {
      options.push({ type: 'ufa', label: 'Sign as Undrafted Free Agent (tryouts)', auto: false });
    }

    // Post-draft: once drafted, offer the jump to NHL/AHL (or stay put)
    // regardless of path — this used to be Europe-only, which meant
    // Canadian/American players had no way to actually turn pro. European
    // players additionally get an explicit "stay in Europe" option instead
    // of a generic "remain" label, since that's a real, ongoing career
    // choice for them (never having to leave for the NHL/AHL at all).
    if (state.career.drafted && currentId !== 'NHL' && currentId !== 'AHL') {
      if (ovr >= OVR().NHL_BOTTOM) {
        options.push({ leagueId: 'NHL', label: 'Jump to the NHL', auto: false });
        options.push({ leagueId: 'AHL', label: 'Report to the AHL', auto: false });
      } else if (ovr >= OVR().AHL) {
        options.push({ leagueId: 'AHL', label: 'Report to the AHL', auto: false });
      }
      const stayLabel = region === 'EU'
        ? `Stay in Europe with ${LD().getLeague(currentId).name}`
        : `Remain in ${LD().getLeague(currentId).name} this year`;
      options.push({ leagueId: currentId, label: stayLabel, auto: false });
    }

    // Once under a pro contract (NHL/AHL/EURO_PRO tier), the contract
    // system is the source of truth for what happens next — only once it
    // actually expires does a real choice (re-sign, loan to the AHL
    // affiliate, sign in Europe, or retire) appear, instead of a random
    // 25% chance of an offer showing up out of nowhere.
    if (state.career.signedPro && (currentId === 'NHL' || currentId === 'AHL' || LD().getLeague(currentId).tier >= 4)) {
      const contract = state.player.contract;
      if (Game.systems.contract && contract && Game.systems.contract.isExpired(contract, state.career.currentYear)) {
        const contractOptions = Game.systems.contract.getContractExpirationOptions(state);
        const euroPick = () => {
          const preferred = LD().EURO_PRO_BY_COUNTRY && LD().EURO_PRO_BY_COUNTRY[code];
          const euroIds = ['SHL', 'LIIGA', 'KHL', 'NL', 'ELH', 'DEL'];
          return preferred && euroIds.includes(preferred) ? preferred : Game.utils.randChoice(euroIds);
        };
        contractOptions.forEach((co) => {
          if (co.type === 'retire') {
            options.push({ leagueId: 'RETIREMENT', label: co.label, auto: false, retireChoice: true });
          } else {
            let lid = co.leagueId;
            if (lid === 'UNDRAFTED') lid = currentId;
            if (lid === 'EURO_PRO') lid = euroPick();
            options.push({
              leagueId: lid,
              label: co.salary ? `${co.label} (${Game.utils.formatMoney(co.salary)}/yr)` : co.label,
              auto: false,
              teamName: co.teamName,
            });
          }
        });
      } else if (!contract) {
        // Safety net for saves created before the contract system existed.
        const offers = generatePostContractOffers(state);
        offers.forEach((o) => {
          if (o.leagueId !== currentId) {
            options.push({ leagueId: o.leagueId, label: `Offer from ${LD().getLeague(o.leagueId).name} (${Game.utils.formatMoney(o.salary)})`, auto: false });
          }
        });
      }
    }

    return options;
  }

  /**
   * Resolves NHL Draft result based on OVR (blended with true potential —
   * scouts draft on upside, not just current form). This is the "does the
   * player get drafted at all" gate; when it says yes, worldAI.runNhlDraft
   * (called right after, in seasonRunner.applyTransition) is what actually
   * assigns a real, persistent NHL team — the placeholder name here just
   * covers the sliver of time before that runs.
   */
  function resolveDraft(state) {
    const currentOvr = LD().overall(state.player);
    const potential = state.player.potential || currentOvr;
    const ovr = Math.round(currentOvr * 0.55 + potential * 0.45);
    let round = null;
    let pick = null;
    let teamName = 'a team';

    if (ovr >= OVR().DRAFT_1ST) {
      round = 1;
      pick = Game.utils.randInt(1, 32);
    } else if (ovr >= OVR().DRAFT_2ND) {
      round = Game.utils.randInt(2, 3);
      pick = Game.utils.randInt(1, 32);
    } else if (ovr >= OVR().DRAFT_LATE) {
      round = Game.utils.randInt(4, 7);
      pick = Game.utils.randInt(1, 32);
    } else {
      // Only a permanent "undrafted" verdict on the final eligible attempt —
      // earlier misses just mean "not this year", so the option to enter
      // the draft comes back next season (see getTransitionOptions).
      const isFinalAttempt = state.player.age >= Game.CONFIG.CAREER.DRAFT_MAX_AGE;
      if (isFinalAttempt) state.career.undrafted = true;
      state.career.drafted = false;
      return {
        drafted: false,
        text: isFinalAttempt
          ? `${state.player.firstName} ${state.player.lastName} went undrafted.`
          : `${state.player.firstName} ${state.player.lastName} was passed over in this year's draft.`,
      };
    }

    state.career.drafted = true;
    state.career.draftInfo = { round, pick, team: teamName, year: state.career.currentYear };
    state.player.draftedBy = teamName;
    return {
      drafted: true,
      round,
      pick,
      team: teamName,
      text: `Selected Round ${round} Pick ${pick} by ${teamName}.`,
    };
  }

  /** Free-agent tryout: success chance scales with OVR. Returns offers. */
  function generateTryoutOffers(state) {
    const ovr = LD().overall(state.player);
    const offers = [];
    const passChance = Math.min(0.95, Math.max(0.05, (ovr - 50) / 40));

    // NHL / AHL only if high enough
    if (ovr >= OVR().AHL && Math.random() < passChance * 0.7) {
      const t = realTeamFor(state, 'AHL');
      offers.push({ leagueId: 'AHL', team: t.name, teamId: t.teamId, type: 'AHL' });
    }
    if (ovr >= OVR().NHL_BOTTOM && Math.random() < passChance * 0.4) {
      const t = realTeamFor(state, 'NHL');
      offers.push({ leagueId: 'NHL', team: t.name, teamId: t.teamId, type: 'NHL' });
    }

    // European clubs for lower OVR or as fallback — biased toward the
    // player's own country's league first (fixes UDFA tryouts landing on
    // a random/foreign league when they should target home first).
    if (ovr < OVR().NHL_STARTER || offers.length === 0) {
      const homeEuroId = LD().EURO_PRO_BY_COUNTRY[state.player.countryCode];
      const otherEuroIds = ['SHL', 'LIIGA', 'KHL', 'NL', 'ELH', 'DEL'].filter((id) => id !== homeEuroId);
      const euroIds = homeEuroId ? [homeEuroId, ...otherEuroIds] : otherEuroIds;
      euroIds.forEach((id) => {
        const chance = id === homeEuroId ? Math.min(0.95, passChance + 0.3) : passChance * 0.5;
        if (Math.random() < chance) {
          const t = realTeamFor(state, id);
          offers.push({ leagueId: id, team: t.name, teamId: t.teamId, type: 'EURO' });
        }
      });
    }

    if (offers.length === 0 && ovr >= OVR().TRYOUT_PASS) {
      const t = realTeamFor(state, 'AHL');
      offers.push({ leagueId: 'AHL', team: t.name, teamId: t.teamId, type: 'AHL' });
    }
    return offers;
  }

  /** World Juniors eligibility & call-up. */
  function checkWorldJuniors(state) {
    const age = state.player.age;
    const leagueId = state.career.leagueId;
    if (age < Game.CONFIG.CAREER.WJ_MIN_AGE || age > Game.CONFIG.CAREER.WJ_MAX_AGE) return null;
    if (leagueId === 'NHL') return null;

    const ovr = LD().overall(state.player);
    const chance = Math.min(0.9, Math.max(0.05, (ovr - 55) / 35));
    if (Math.random() > chance) return null;

    return {
      invited: true,
      text: `${state.player.firstName} ${state.player.lastName} has been invited to represent ${countryName(state.player.countryCode)} at the World Junior Championship.`,
    };
  }

  /**
   * Lightweight "draft" for CHL/USHL entry at 16 — junior leagues take
   * nearly everyone who tries out, so this doesn't gate anything, but it
   * generates a plausible round/pick from current stats purely so the
   * moment can actually be dramatized (see js/ui/draftAnimations.js)
   * instead of being a silent team assignment.
   */
  function resolveJuniorDraft(state, leagueId) {
    const ovr = LD().overall(state.player);
    const potential = state.player.potential || ovr;
    const blended = Math.round(ovr * 0.6 + potential * 0.4);
    let round;
    if (blended >= 70) round = Game.utils.randInt(1, 2);
    else if (blended >= 55) round = Game.utils.randInt(2, 5);
    else round = Game.utils.randInt(5, 12);
    const pick = Game.utils.randInt(1, leagueId === 'CHL' ? 20 : 15);
    return { round, pick, leagueId };
  }

  /**
   * Olympics: unlike World Juniors (youth-only), this fires for pros in
   * a top-flight league (NHL or top European pro leagues) during Olympic
   * years, gated by age/rating like the old hidden-roll version used to
   * be — but now it only decides the *invitation*; the tournament itself
   * is played out interactively (see js/systems/tournament.js playOlympics,
   * wired up from careerHub).
   */
  function checkOlympics(state) {
    const year = state.career.currentYear;
    if (year % 4 !== 0) return null;
    const age = state.player.age;
    if (age < 20 || age > 38) return null;
    const leagueId = state.career.leagueId;
    const league = LD().getLeague(leagueId);
    const isTopFlight = leagueId === 'NHL' || (league && league.tier >= 4);
    if (!isTopFlight) return null;
    const ovr = LD().overall(state.player);
    if (ovr < 72) return null;
    const chance = Math.min(0.85, Math.max(0.05, (ovr - 65) / 30));
    if (Math.random() > chance) return null;
    return {
      invited: true,
      year,
      text: `${state.player.firstName} ${state.player.lastName} has been named to ${countryName(state.player.countryCode)}'s Olympic roster for the Winter Games.`,
    };
  }

  /**
   * Issues (or renews) a contract whenever the player joins a new team.
   * The contract is what now actually gates what happens next in a pro
   * career — see the "signedPro" block in getTransitionOptions above.
   */
  function ensureContract(state, leagueId, teamName) {
    if (!Game.systems.contract) return;
    const ovr = LD().overall(state.player);
    const def = Game.systems.contract.CONTRACT_TYPES[leagueId];
    const years = (def && def.years) || 1;
    const salary = Game.systems.contract.generateOffer(leagueId, ovr);
    const contract = Game.systems.contract.createContract(leagueId, teamName, salary, Math.max(1, years), state.career.currentYear);
    state.player.contract = contract;
    state.career.contracts = state.career.contracts || [];
    state.career.contracts.push(contract);
    if (state.career.contracts.length > 25) state.career.contracts.shift();
  }

  function countryName(code) {
    const c = (Game.data.countries || []).find((x) => x.code === code);
    return c ? c.name : code;
  }

  /**
   * Picks a real, persistent team from the world for the given league,
   * falling back to a fresh generated name only if the world isn't
   * available for some reason (should not normally happen).
   *
   * Fixed (Phase 13): this used to return a "National Academy" name for
   * ANY European player requesting ANY league (ELITE_JR, AHL, NHL, a Euro
   * pro league, a UDFA tryout target — all of it), because the academy
   * check ignored which league was actually being requested. That's why
   * European UDFA tryouts and Elite Junior placements were landing on an
   * academy instead of a real club. Academies are now scoped to the
   * ACADEMY league only (the actual pre-Elite-Junior years); Elite Junior
   * gets a real club from the player's own country's pro league (framed
   * as that club's junior pipeline, since there's no separate persistent
   * Elite Junior roster per country); every other league always goes
   * through the normal real-team pool regardless of the player's country.
   */
  function realTeamFor(state, leagueId, excludeTeamId) {
    if (leagueId === 'ACADEMY') {
      if (state && state.player && state.player.countryCode && Game.data && Game.data.europeanAcademies && Game.data.europeanAcademies.getAcademy) {
        const academyName = Game.data.europeanAcademies.getAcademy(state.player.countryCode);
        if (academyName) return { name: academyName, teamId: null };
      }
      return { name: 'European Academy', teamId: null };
    }

    if (leagueId === 'ELITE_JR') {
      const code = state && state.player ? state.player.countryCode : null;
      const proId = code && LD().EURO_PRO_BY_COUNTRY[code];
      if (proId && Game.systems.worldAI) {
        Game.systems.worldAI.ensureWorld(state);
        const team = Game.systems.worldAI.pickRealTeam(state, proId);
        if (team) return { name: `${team.name} Juniors`, teamId: null };
      }
    }

    if (Game.systems.worldAI) {
      Game.systems.worldAI.ensureWorld(state);
      const team = Game.systems.worldAI.pickRealTeam(state, leagueId, excludeTeamId);
      if (team) return { name: team.name, teamId: team.id };
    }
    return { name: Game.leagues.teamGenerator.generateTeamName(), teamId: null };
  }

  /** Assign starting league on career begin. */
  function assignStart(state) {
    const id = LD().startLeagueId(state.player.countryCode);
    const league = LD().getLeague(id);
    const real = realTeamFor(state, id);

    if (LD().isEuropean(state.player.countryCode) && Game.data && Game.data.europeanAcademies && Game.data.europeanAcademies.getAcademy) {
      state.player.academy = Game.data.europeanAcademies.getAcademy(state.player.countryCode);
      state.career.academy = state.player.academy;
    } else {
      state.player.academy = null;
      state.career.academy = null;
    }

    state.career.leagueId = id;
    state.career.team = {
      name: real.name,
      teamId: real.teamId,
      leagueId: id,
      league: league.name,
      tier: league.tier,
    };
    state.player.team = state.career.team.name;
    state.player.league = league.name;
    state.career.drafted = false;
    state.career.undrafted = false;
    state.career.signedPro = false;
    state.career.draftInfo = null;
    state.career.wjHistory = [];
    ensureContract(state, id, state.career.team.name);
    return { league, team: state.career.team };
  }

  /**
   * Move player to a new league/team. If a specific team (name + teamId)
   * isn't given, a real, persistent team is picked from that league's
   * world roster — never a disposable random name — so the player always
   * belongs to a team that also shows up in standings, records and draft
   * history.
   */
  function moveToLeague(state, leagueId, teamName, teamId) {
    const league = LD().getLeague(leagueId);
    let name = teamName;
    let id = teamId || null;
    if (name && !id && Game.systems.worldAI && Game.systems.worldAI.findTeamIdByName) {
      // A caller that already knows the exact destination team (contract
      // re-sign, AHL affiliate loan, ...) still needs its persistent id
      // resolved so it matches standings/playoff lookups correctly.
      Game.systems.worldAI.ensureWorld(state);
      id = Game.systems.worldAI.findTeamIdByName(state, leagueId, name);
    }
    if (!name) {
      const prevTeamId = state.career.team && state.career.team.teamId;
      const real = realTeamFor(state, leagueId, prevTeamId);
      name = real.name;
      id = real.teamId;
    }
    state.career.leagueId = leagueId;
    state.career.team = {
      name,
      teamId: id,
      leagueId,
      league: league.name,
      tier: league.tier,
    };
    state.player.team = state.career.team.name;
    state.player.league = league.name;
    if (leagueId === 'NHL' || leagueId === 'AHL' || league.tier >= 4) {
      state.career.signedPro = true;
    }
    // Signing anywhere ends any free-agent gap-year streak — this is the
    // single point every successful placement (draft jump, tryout pass,
    // contract offer, NCAA exit tryout) funnels through.
    state.career.freeAgent = false;
    state.career.unemployedYears = 0;
    ensureContract(state, leagueId, name);
    return state.career.team;
  }

  /** After contract ends – generate free-agent offers (simplified, no full contract system yet). */
  function generatePostContractOffers(state) {
    const ovr = LD().overall(state.player);
    const offers = [];
    const prevTeamId = state.career.team && state.career.team.teamId;
    if (ovr >= OVR().NHL_BOTTOM) {
      const t = realTeamFor(state, 'NHL', prevTeamId);
      offers.push({ leagueId: 'NHL', team: t.name, teamId: t.teamId, salary: Math.round(ovr * 120000) });
    }
    if (ovr >= OVR().AHL) {
      const t = realTeamFor(state, 'AHL', prevTeamId);
      offers.push({ leagueId: 'AHL', team: t.name, teamId: t.teamId, salary: Math.round(ovr * 15000) });
    }
    if (ovr < OVR().NHL_STARTER) {
      const euro = ['SHL', 'LIIGA', 'KHL', 'NL', 'ELH', 'DEL'];
      euro.forEach((id) => {
        if (Math.random() < 0.45) {
          const t = realTeamFor(state, id, prevTeamId);
          offers.push({ leagueId: id, team: t.name, teamId: t.teamId, salary: Math.round(ovr * 25000) });
        }
      });
    }
    return offers;
  }

  Game.systems = Game.systems || {};
  Game.systems.careerPath = {
    pathRegion,
    getTransitionOptions,
    resolveDraft,
    resolveJuniorDraft,
    checkOlympics,
    generateTryoutOffers,
    checkWorldJuniors,
    assignStart,
    moveToLeague,
    generatePostContractOffers,
    ensureContract,
    realTeamFor,
    overall: () => LD().overall,
  };
})(window.Game = window.Game || {});
