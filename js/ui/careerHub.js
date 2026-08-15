/**
 * careerHub.js
 * The real career hub (Phase 5): shows the player's current team/league,
 * season record, and schedule, and lets them play through games one at a
 * time or fast-forward the rest of the season. Training minigames, news
 * and contract negotiation (Phases 6-8) will slot into this same screen
 * without replacing it.
 */
(function (Game) {
  function recordLabel(record) {
    return `${record.w}-${record.l}-${record.otl}`;
  }

  function statLineHTML(player, totals) {
    if (player.position === 'G') {
      const savePct = totals.shotsFaced ? totals.savesMade / totals.shotsFaced : 0;
      const gaa = totals.games ? totals.goalsAgainst / totals.games : 0;
      return `
        <div class="stat-pill-row">
          <div class="stat-pill"><span>${totals.games}</span>GP</div>
          <div class="stat-pill"><span>${totals.wins || 0}</span>W</div>
          <div class="stat-pill"><span>${(savePct * 100).toFixed(1)}</span>SV%</div>
          <div class="stat-pill"><span>${gaa.toFixed(2)}</span>GAA</div>
          <div class="stat-pill"><span>${totals.shutouts}</span>SO</div>
        </div>`;
    }
    return `
      <div class="stat-pill-row">
        <div class="stat-pill"><span>${totals.games}</span>GP</div>
        <div class="stat-pill"><span>${totals.goals}</span>G</div>
        <div class="stat-pill"><span>${totals.assists}</span>A</div>
        <div class="stat-pill"><span>${totals.points}</span>PTS</div>
        <div class="stat-pill"><span>${(totals.plusMinus || 0) >= 0 ? '+' : ''}${totals.plusMinus || 0}</span>+/-</div>
        <div class="stat-pill"><span>${totals.penaltyMinutes}</span>PIM</div>
      </div>`;
  }

  function gameLineText(player, line, teamResult) {
    if (player.position === 'G') {
      return `${teamResult.result} ${teamResult.ownScore}-${teamResult.oppScore} · ${line.savesMade} saves${line.shutout ? ' · Shutout!' : ''}`;
    }
    const bits = [`${teamResult.result} ${teamResult.ownScore}-${teamResult.oppScore}`];
    if (line.goals) bits.push(`${line.goals}G`);
    if (line.assists) bits.push(`${line.assists}A`);
    if (!line.goals && !line.assists) bits.push('no points');
    return bits.join(' · ');
  }

  function growthReportHTML(growth) {
    const entries = Object.entries(growth.deltas).sort((a, b) => b[1] - a[1]);
    if (!entries.length) {
      return `<p class="settings-note">No notable attribute changes this season.</p>`;
    }
    const rows = entries
      .slice(0, 6)
      .map(([id, delta]) => {
        const label = Game.player.attributes.labels[id];
        const sign = delta > 0 ? '+' : '';
        const cls = delta > 0 ? 'growth-row--up' : 'growth-row--down';
        return `<div class="growth-row ${cls}"><span>${label}</span><span>${sign}${delta}</span></div>`;
      })
      .join('');
    return `<div class="growth-list">${rows}</div>`;
  }

  function showScheduleModal(state) {
    const season = state.career.currentSeason;
    const rows = season.games
      .map((g) => {
        const status = g.played
          ? `<span class="schedule-row__result">${g.teamResult.result} ${g.teamResult.ownScore}-${g.teamResult.oppScore}</span>`
          : `<span class="schedule-row__pending">—</span>`;
        return `<div class="schedule-row ${g.played ? '' : 'schedule-row--pending'}">
          <span class="schedule-row__week">Wk ${g.week}</span>
          <span class="schedule-row__opponent">vs ${g.opponent}</span>
          ${status}
        </div>`;
      })
      .join('');

    Game.ui.modal.open({
      title: `${season.league} Schedule`,
      bodyHTML: `<div class="schedule-list">${rows}</div>`,
      actions: [{ label: 'Close', variant: 'primary' }],
    });
  }

  function eventsHTML(resolvedEvents, player) {
    if (!resolvedEvents.length) return '';
    const rows = resolvedEvents
      .map(
        (r) => `<div class="event-row"><strong>${Game.eventSystem.formatText(r.event.text, player)}</strong><br><span class="settings-note">${r.outcomeText}</span></div>`
      )
      .join('');
    return `<h4 class="growth-title">Season Events</h4><div class="event-list">${rows}</div>`;
  }

  function presentPendingEvents(state, pendingEvents, onAllResolved) {
    if (!pendingEvents.length) {
      onAllResolved([]);
      return;
    }
    const resolved = [];
    function showNext(index) {
      if (index >= pendingEvents.length) {
        onAllResolved(resolved);
        return;
      }
      const evt = pendingEvents[index];
      Game.ui.modal.open({
        title: 'Season Event',
        bodyHTML: `<p>${Game.eventSystem.formatText(evt.text, state.player)}</p>`,
        actions: evt.choices.map((choice, i) => ({
          label: choice.label,
          variant: i === 0 ? 'primary' : 'ghost',
          closeOnClick: true,
          onClick: () => {
            const result = Game.eventSystem.resolveChoice(evt, state, i);
            resolved.push(result);
            Game.ui.toast.show(result.outcomeText, { type: 'info' });
            showNext(index + 1);
          },
        })),
      });
    }
    showNext(0);
  }

  /**
   * International tournament call-up (World Juniors) and playoffs, both now
   * played out as real interactive minigames instead of an instant dice
   * roll — this runs between the regular season's random events and the
   * "what happens next season" career decisions. Mutates `summary` with
   * `wjResult` / `playoffResult` / extra `seasonAwards` so the season
   * summary screen can show what actually happened.
   */
  function presentSeasonExtras(state, summary, done) {
    presentWorldJuniors(state, summary, () => {
      presentOlympics(state, summary, () => {
        presentPlayoffs(state, summary, done);
      });
    });
  }

  function presentOlympics(state, summary, next) {
    const oly = summary.olympics;
    if (!oly || !oly.invited) { next(); return; }
    Game.ui.modal.open({
      title: 'Olympic Call-up',
      bodyHTML: `<p>${oly.text}</p><p class="settings-note">Play the Winter Olympics to find out how it goes.</p>`,
      actions: [{
        label: 'Play Olympics',
        variant: 'primary',
        onClick: () => {
          Game.ui.modal.open({ title: 'Winter Olympics', bodyHTML: '<div id="oly-mount"></div>', actions: [] });
          const mount = document.getElementById('oly-mount');
          Game.systems.tournament.playOlympics(state, mount, {
            seasonYear: oly.year,
            onComplete: (result) => {
              summary.olympicsResult = result;
              if (result.awardEntry) summary.seasonAwards = (summary.seasonAwards || []).concat(result.awardEntry);
              Game.storage.save(state.meta.slotId, state);
              const medalText = result.medal
                ? `${result.medal.toUpperCase()} medal! (${result.wins}-${result.losses} in group stage)`
                : `Olympics complete — no medal this time (${result.wins}-${result.losses} in group stage).`;
              Game.ui.modal.open({
                title: 'Winter Olympics — Result',
                bodyHTML: `<p>${medalText}</p>`,
                actions: [{ label: 'Continue', variant: 'primary', onClick: next }],
              });
            },
          });
        },
      }],
    });
  }

  function presentLockout(state, summary, next) {
    const evt = summary.lockoutEvent;
    if (!evt) { next(); return; }
    Game.ui.modal.open({
      title: evt.title,
      bodyHTML: `<p>${(evt.description || '').replace(/\n/g, '<br>')}</p>`,
      actions: evt.options.map((opt, i) => ({
        label: opt.label,
        variant: i === 0 ? 'primary' : 'ghost',
        onClick: () => {
          Game.systems.seasonRunner.resolveLockoutChoice(state, opt.id);
          Game.storage.save(state.meta.slotId, state);
          render(state);
          next();
        },
      })),
    });
  }

  function presentWorldJuniors(state, summary, next) {
    const wj = summary.wj;
    if (!wj || !wj.invited) { next(); return; }

    Game.ui.modal.open({
      title: 'World Juniors Call-up',
      bodyHTML: `<p>${wj.text}</p><p class="settings-note">Play the tournament to find out how it goes.</p>`,
      actions: [
        {
          label: 'Play Tournament',
          variant: 'primary',
          onClick: () => {
            Game.ui.modal.open({
              title: 'World Juniors',
              bodyHTML: `<div id="wj-mount"></div>`,
              actions: [],
            });
            const mount = document.getElementById('wj-mount');
            Game.systems.tournament.playWorldJuniors(state, mount, {
              seasonYear: wj.year,
              onComplete: (result) => {
                summary.wjResult = result;
                if (result.awardEntry) {
                  summary.seasonAwards = (summary.seasonAwards || []).concat(result.awardEntry);
                }
                Game.storage.save(state.meta.slotId, state);
                const medalText = result.medal
                  ? `${result.medal.toUpperCase()} medal! (${result.wins}/${result.games} wins)`
                  : `No medal this time (${result.wins}/${result.games} wins).`;
                Game.ui.modal.open({
                  title: 'World Juniors — Result',
                  bodyHTML: `<p>${medalText}</p>`,
                  actions: [{ label: 'Continue', variant: 'primary', onClick: next }],
                });
              },
            });
          },
        },
      ],
    });
  }

  function presentPlayoffs(state, summary, next) {
    const bracket = summary.playoffBracket;
    if (!bracket) { next(); return; }

    Game.ui.modal.open({
      title: 'Playoffs',
      bodyHTML: `<p>${state.career.team.name} qualified as the #${bracket.userSeed} seed! Time to play for it.</p>`,
      actions: [
        {
          label: 'Play Playoffs',
          variant: 'primary',
          onClick: () => playRound(),
        },
      ],
    });

    function playRound() {
      Game.systems.playoffs.resolveCpuMatchups(state, bracket);
      const m = Game.systems.playoffs.userMatchup(bracket);
      if (!m) { finishAfterRoundAdvance(); return; }

      Game.ui.modal.open({
        title: bracket.roundName,
        bodyHTML: `<div id="playoff-mount"></div>`,
        actions: [],
      });
      const mount = document.getElementById('playoff-mount');
      Game.systems.playoffs.playUserRound(state, bracket, mount, (roundResult) => {
        const resultText = roundResult.won
          ? `WIN ${roundResult.teamResult.ownScore}-${roundResult.teamResult.oppScore} vs ${roundResult.opponent.name}!`
          : `Lost ${roundResult.teamResult.ownScore}-${roundResult.teamResult.oppScore} vs ${roundResult.opponent.name}.`;
        Game.ui.toast.show(resultText, { type: roundResult.won ? 'success' : 'error' });
        Game.ui.modal.open({
          title: bracket.roundName + ' — Result',
          bodyHTML: `<p>${resultText}</p>`,
          actions: [{ label: 'Continue', variant: 'primary', onClick: finishAfterRoundAdvance }],
        });
      });
    }

    function finishAfterRoundAdvance() {
      Game.systems.playoffs.resolveCpuMatchups(state, bracket);
      const eliminated = Game.systems.playoffs.isUserEliminated(bracket);
      if (eliminated) {
        finish({ text: `Eliminated in the ${bracket.roundName}.` });
        return;
      }
      const decided = Game.systems.playoffs.advanceRound(bracket);
      if (!decided) {
        // Shouldn't normally happen (all matchups resolved above), but guard anyway.
        finish({ text: `Playoff run ended in the ${bracket.roundName}.` });
        return;
      }
      if (bracket.champion) {
        const won = bracket.champion.teamId === bracket.userTeamId;
        if (won) {
          const isTopFlight = bracket.leagueId === 'NHL';
          const award = Game.systems.awards.grant(state, isTopFlight ? 'STANLEY_CUP' : 'LEAGUE_CHAMPION');
          let extra = award ? [award] : [];
          if (isTopFlight && Math.random() < 0.35) {
            const smythe = Game.systems.awards.grant(state, 'CONN_SMYTHE');
            if (smythe) extra.push(smythe);
          }
          Game.systems.news.push(state, {
            type: 'award',
            title: isTopFlight ? 'Stanley Cup Champions!' : 'League Champions!',
            body: `${state.career.team.name} win it all with ${state.player.firstName} ${state.player.lastName} on the roster.`,
            importance: 5,
          });
          summary.seasonAwards = (summary.seasonAwards || []).concat(extra);
          finish({ text: `Champions! ${state.career.team.name} win the ${bracket.roundName === 'Final' ? 'title' : 'league'}.` });
        } else {
          finish({ text: `Runner-up — lost the Final.` });
        }
        return;
      }
      // Next round: resolve any remaining CPU-only matchups then let the
      // user play theirs.
      playRound();
    }

    function finish(result) {
      summary.playoffResult = result;
      Game.storage.save(state.meta.slotId, state);
      next();
    }
  }

  function showSeasonSummaryModal(state, summary) {
    const player = state.player;
    const title = summary.retired ? `${player.firstName} retires` : `${summary.league} recap`;
    const retirementNote = summary.retired
      ? `<p><strong>${player.firstName} ${player.lastName}</strong> hangs up the skates at age ${player.age - 1}. That was his final season.</p>`
      : '';
    const calledUpNote =
      !summary.retired && summary.nextSeasonInfo && summary.nextSeasonInfo.calledUp
        ? `<p class="settings-note">Moving up to <strong>${summary.nextSeasonInfo.league.name}</strong>, now playing for the <strong>${summary.nextSeasonInfo.team.name}</strong>!</p>`
        : '';
    const wjNote = summary.wjResult
      ? `<h4 class="growth-title">World Juniors</h4><p class="settings-note">${summary.wjResult.wins}/${summary.wjResult.games} wins — ${summary.wjResult.medal ? summary.wjResult.medal.toUpperCase() + ' medal' : 'no medal'}.</p>`
      : '';
    const playoffNote = summary.playoffResult
      ? `<h4 class="growth-title">Playoffs</h4><p class="settings-note">${summary.playoffResult.text}</p>`
      : '';

    Game.ui.modal.open({
      title,
      bodyHTML: `
        ${retirementNote}
        <p class="settings-note">${summary.team} · ${summary.league} · Record ${recordLabel(summary.record)}</p>
        ${statLineHTML(player, summary.totals)}
        <h4 class="growth-title">Development (${summary.growth.stageLabel})</h4>
        ${growthReportHTML(summary.growth)}
        ${eventsHTML(summary.resolvedEvents, player)}
        ${wjNote}
        ${playoffNote}
        ${summary.ledger ? `<h4 class="growth-title">Finances</h4><p class="settings-note">Salary $${(summary.ledger.salary||0).toLocaleString()} · Sponsors $${(summary.ledger.sponsors||0).toLocaleString()} · Living $${Math.abs(summary.ledger.living||0).toLocaleString()} · Tax $${Math.abs(summary.ledger.tax||0).toLocaleString()} · Net $${(summary.ledger.net||0).toLocaleString()} · Balance $${(summary.ledger.balance||0).toLocaleString()}</p>` : ''}
        ${summary.seasonAwards && summary.seasonAwards.length ? `<h4 class="growth-title">Awards</h4><p>${summary.seasonAwards.map((a) => (a.icon || '🏆') + ' ' + a.name).join(' · ')}</p>` : ''}
        ${calledUpNote}
      `,
      actions: [{ label: summary.retired ? 'View career' : 'Continue', variant: 'primary' }],
    });
  }

  function render(state) {
    if (!state || !state.player) return;
    try {
      Game.systems.seasonRunner.ensureActiveSeason(state);
    } catch (e) {
      console.error('[Hub] ensureActiveSeason', e);
    }

    const player = state.player;
    const country = (Game.data.countries || []).find((c) => c.code === player.countryCode);
    const position = (Game.CONFIG.POSITIONS || []).find((p) => p.id === player.position) || { label: player.position || '?' };
    const retired = !!(state.career && state.career.retired);
    const set = (id, text) => {
      const el = document.getElementById(id);
      if (el) el.textContent = text;
    };

    set('hub-player-name', (player.firstName || '') + ' ' + (player.lastName || ''));
    set(
      'hub-player-meta',
      position.label +
        ' · ' +
        (country ? country.name : player.countryCode || '') +
        ' · ' +
        (player.hand === 'L' ? 'Left-handed' : 'Right-handed') +
        ' · Age ' +
        (player.age != null ? player.age : '?')
    );
    set('hub-player-archetype', player.archetype || '');
    const scout = player.scouting || {};
    set('hub-player-scouting', (scout.grade || '') + (scout.label ? ' — ' + scout.label : ''));

    if (retired) {
      set('hub-team-name', 'Retired');
      set('hub-team-league', state.career.team ? state.career.team.league || '' : '');
      set('hub-team-record', '');
    } else {
      const season = state.career.currentSeason;
      const team = state.career.team || {};
      set('hub-team-name', team.name || 'Free Agent');
      set(
        'hub-team-league',
        (season && season.league ? season.league : team.league || '') +
          ' · ' +
          Game.utils.formatSeasonLabel(state.career.currentYear || 0)
      );
      set('hub-team-record', season && season.record ? 'Record: ' + recordLabel(season.record) : '');
    }

    const contractEl = document.getElementById('hub-team-contract');
    if (contractEl) {
      const contract = player.contract;
      if (!retired && contract && Game.systems.contract) {
        const details = Game.systems.contract.getContractDetails(contract);
        contractEl.textContent = `Contract: ${details.salary}/yr · ${details.yearsRemaining} yr(s) left`;
      } else {
        contractEl.textContent = '';
      }
    }

    if (Game.systems.economy) Game.systems.economy.ensureFinances(player);
    const balEl = document.getElementById('hub-balance');
    if (balEl) {
      const buffs = ((player.finances && player.finances.activeBuffs) || []).map((b) => b.name).join(', ');
      balEl.textContent =
        '💰 $' + ((player.finances && player.finances.balance) || 0).toLocaleString() + (buffs ? ' · Buffs: ' + buffs : '');
    }

    const totalsEl = document.getElementById('hub-career-totals');
    if (totalsEl) totalsEl.innerHTML = statLineHTML(player, player.careerTotals || { games: 0 });

    const upcomingEl = document.getElementById('hub-upcoming-list');
    if (upcomingEl) {
      if (retired) {
        upcomingEl.innerHTML = '<p class="settings-note">Career complete.</p>';
      } else if (state.career.currentSeason && state.career.currentSeason.games) {
        const upcoming = state.career.currentSeason.games.filter((g) => !g.played).slice(0, 5);
        upcomingEl.innerHTML = upcoming.length
          ? upcoming
              .map(
                (g) =>
                  '<div class="schedule-row schedule-row--pending"><span class="schedule-row__week">Wk ' +
                  g.week +
                  '</span><span class="schedule-row__opponent">vs ' +
                  g.opponent +
                  '</span></div>'
              )
              .join('')
          : '<p class="settings-note">Season complete.</p>';
      } else {
        upcomingEl.innerHTML = '<p class="settings-note">No schedule yet.</p>';
      }
    }

    const nextBtn = document.getElementById('btn-play-next-game');
    const restBtn = document.getElementById('btn-play-rest-season');
    const scheduleBtn = document.getElementById('btn-view-schedule');
    if (nextBtn) {
      nextBtn.disabled = retired;
      nextBtn.textContent = retired ? 'Career finished' : '▶ Play Next Game';
    }
    if (restBtn) restBtn.disabled = retired;
    if (scheduleBtn) scheduleBtn.disabled = retired;

    set('hub-badge', retired ? 'Retired' : 'Career Hub');
  }

  function finishSeasonFlow(state, summary, cb) {
    if (summary.lockoutEvent) {
      presentLockout(state, summary, cb);
      return;
    }
    if (!state.career.currentSeason && !state.career.retired) {
      Game.systems.seasonRunner.startNewSeason(state);
    }
    cb();
  }

  function handlePlayNextGame() {
    if (!Game.state || Game.state.career.retired) return;
    const outcome = Game.systems.seasonRunner.playNextGame(Game.state);
    if (!outcome) return;

    const { gameResult, seasonConcluded, summary } = outcome;
    if (gameResult) {
      const tr = gameResult.teamResult.result;
      if (Game.audio) {
        if (tr === 'W' || tr === 'OTW') Game.audio.play('win');
        else if (tr === 'L') Game.audio.play('lose');
        else Game.audio.play('notify');
      }
      Game.ui.toast.show(
        `vs ${gameResult.game.opponent}: ${gameLineText(Game.state.player, gameResult.line, gameResult.teamResult)}`,
        { type: tr === 'L' ? 'error' : 'success' }
      );
    }

    if (seasonConcluded) {
      presentPendingEvents(Game.state, summary.pendingEvents, (pendingResolved) => {
        summary.resolvedEvents = summary.resolvedEvents.concat(pendingResolved);
        presentSeasonExtras(Game.state, summary, () => {
          presentTransitions(Game.state, summary.transitionOptions || [], () => {
            finishSeasonFlow(Game.state, summary, () => {
              Game.storage.save(Game.state.meta.slotId, Game.state);
              render(Game.state);
              showSeasonSummaryModal(Game.state, summary);
            });
          });
        });
      });
    } else {
      Game.storage.save(Game.state.meta.slotId, Game.state);
      render(Game.state);
    }
  }

  function handlePlayRestOfSeason() {
    if (!Game.state || Game.state.career.retired) return;
    const { summary } = Game.systems.seasonRunner.playRestOfSeason(Game.state);
    if (summary) {
      presentPendingEvents(Game.state, summary.pendingEvents, (pendingResolved) => {
        summary.resolvedEvents = summary.resolvedEvents.concat(pendingResolved);
        presentSeasonExtras(Game.state, summary, () => {
          presentTransitions(Game.state, summary.transitionOptions || [], () => {
            finishSeasonFlow(Game.state, summary, () => {
              Game.storage.save(Game.state.meta.slotId, Game.state);
              render(Game.state);
              showSeasonSummaryModal(Game.state, summary);
            });
          });
        });
      });
    } else {
      Game.storage.save(Game.state.meta.slotId, Game.state);
      render(Game.state);
    }
  }

  function showNewsModal(state) {
    const feed = Game.systems.news.getFeed(state, 25);
    const typeIcon = { season: '📅', draft: '📋', transfer: '🔄', award: '🏆', medal: '🥇', wj: '🌍', milestone: '⭐' };
    const body = feed.length
      ? feed.map((n) => {
          const imp = n.importance >= 5 ? 'news-item--major' : n.importance >= 3 ? 'news-item--mid' : '';
          return `<div class="news-item ${imp}">
            <div class="news-item__head">
              <span class="news-item__icon">${typeIcon[n.type] || '📰'}</span>
              <strong>${n.title}</strong>
              <span class="news-item__meta">${n.date || ''} · age ${n.age ?? ''}</span>
            </div>
            <p class="news-item__body">${n.body}</p>
          </div>`;
        }).join('')
      : '<p class="settings-note">No headlines yet. Play seasons to generate news.</p>';
    Game.ui.modal.open({
      title: 'News Feed',
      bodyHTML: `<div class="news-feed">${body}</div>`,
      actions: [{ label: 'Close', variant: 'primary' }],
    });
  }

  function showTrainingModal(state) {
    const opts = Game.minigames.training.getOptions(state.player);
    let intensity = 'normal';
    const buttons = opts.map((o) =>
      `<button type="button" class="btn btn--secondary train-focus" data-action="train-focus" data-focus="${o.id}" style="margin:4px">${o.label}</button>`
    ).join('');
    Game.ui.modal.open({
      title: 'Training Session',
      bodyHTML: `<p>Choose focus:</p><div id="train-opts">${buttons}</div>
             <p style="margin-top:8px">Intensity:
               <button type="button" class="btn btn--ghost train-int" data-action="train-intensity" data-int="light">Light</button>
               <button type="button" class="btn btn--ghost train-int" data-action="train-intensity" data-int="normal">Normal</button>
               <button type="button" class="btn btn--ghost train-int" data-action="train-intensity" data-int="intense">Intense</button>
             </p>`,
      actions: [{ label: 'Close', variant: 'ghost' }],
      onAction: (action, el) => {
        if (action === 'train-intensity') {
          intensity = el.dataset.int;
          return;
        }
        if (action === 'train-focus') {
          const focusId = el.dataset.focus;
          const skill = Game.leagues.leagueData.overall(state.player);
          Game.ui.modal.open({
            title: 'Training Session',
            bodyHTML: `<div id="train-mount"></div>`,
            actions: [],
          });
          const mount = document.getElementById('train-mount');
          Game.minigames.runRandom({
            mount,
            attempts: 3,
            skill,
            label: 'Time your reps! Hit the button when the marker is in the zone.',
            actionLabel: 'REP',
            onComplete: (avgScore) => {
              const result = Game.minigames.training.run(state.player, focusId, intensity, avgScore);
              Game.ui.toast.show(result.message, { type: result.success ? 'success' : 'info' });
              Game.storage.save(state.meta.slotId, state);
              render(state);
              Game.ui.modal.close();
            },
          });
        }
      },
    });
  }

  function showShopModal(state) {
    Game.systems.economy.ensureFinances(state.player);
    const items = Game.systems.shop.eligibleItems(state.player);
    const bal = state.player.finances.balance || 0;
    let currentFilter = 'all';
    let currentSort = 'default';
    let currentSearch = '';

    function computeItems() {
      let filtered = currentFilter === 'all' ? items : items.filter((item) => item.type === currentFilter);
      if (currentSearch.trim()) {
        const q = currentSearch.trim().toLowerCase();
        filtered = filtered.filter((item) =>
          item.name.toLowerCase().includes(q) || (item.desc || '').toLowerCase().includes(q));
      }
      filtered = filtered.slice();
      if (currentSort === 'price-asc') filtered.sort((a, b) => a.price - b.price);
      else if (currentSort === 'price-desc') filtered.sort((a, b) => b.price - a.price);
      else if (currentSort === 'affordable') filtered.sort((a, b) => (bal >= b.price) - (bal >= a.price) || a.price - b.price);
      return filtered;
    }

    function rowsHTML(filtered) {
      return filtered.map((item) => {
        const can = bal >= item.price;
        const tag = item.type === 'permanent' ? '🔒 PERM' : `⏱ ${item.seasons || 1}s`;
        return `<div class="shop-row" style="display:flex;justify-content:space-between;align-items:center;gap:8px;margin:6px 0;padding:8px;border:1px solid var(--border, #333);border-radius:8px">
          <div>
            <strong>${item.name}</strong> <span class="settings-note">${tag}</span><br>
            <span class="settings-note">${item.desc}</span><br>
            <span>$${item.price.toLocaleString()}</span>
          </div>
          <button type="button" class="btn ${can ? 'btn--primary' : 'btn--ghost'} shop-buy" data-action="shop-buy" data-id="${item.id}" ${can ? '' : 'disabled'}>Buy</button>
        </div>`;
      }).join('') || '<p class="settings-note">No items match your search/filters.</p>';
    }

    function sortBtn(id, label) {
      const active = currentSort === id;
      return `<button type="button" class="btn ${active ? 'btn--primary' : 'btn--ghost'} btn--small" data-action="shop-sort" data-sort="${id}">${label}</button>`;
    }

    function renderBody() {
      const filtered = computeItems();
      return `
        <div class="modal-section-nav">
          <button type="button" class="btn ${currentFilter === 'all' ? 'btn--primary' : 'btn--ghost'} btn--small modal-section-tab" data-action="shop-filter" data-filter="all">All</button>
          <button type="button" class="btn ${currentFilter === 'temporary' ? 'btn--primary' : 'btn--ghost'} btn--small modal-section-tab" data-action="shop-filter" data-filter="temporary">Temporary</button>
          <button type="button" class="btn ${currentFilter === 'permanent' ? 'btn--primary' : 'btn--ghost'} btn--small modal-section-tab" data-action="shop-filter" data-filter="permanent">Permanent</button>
        </div>
        <div style="display:flex;gap:6px;margin:6px 0;align-items:center;flex-wrap:wrap">
          <input type="text" id="shop-search" placeholder="Search items…" value="${currentSearch.replace(/"/g, '&quot;')}" style="flex:1;min-width:120px;padding:6px;border-radius:6px;border:1px solid var(--border,#333);background:transparent;color:inherit">
          ${sortBtn('price-asc', 'Price ↑')}
          ${sortBtn('price-desc', 'Price ↓')}
          ${sortBtn('affordable', 'Affordable first')}
        </div>
        <div class="shop-summary">
          <span>${filtered.length} items</span>
          <strong>$${bal.toLocaleString()}</strong>
        </div>
        <div class="shop-list" id="shop-list">${rowsHTML(filtered)}</div>
      `;
    }

    function refreshBody(preserveFocus) {
      const body = Game.ui.modal.getBodyEl();
      body.innerHTML = renderBody();
      attachSearchListener();
      if (preserveFocus) {
        const input = document.getElementById('shop-search');
        if (input) {
          input.focus();
          input.setSelectionRange(input.value.length, input.value.length);
        }
      }
    }

    function attachSearchListener() {
      const input = document.getElementById('shop-search');
      if (!input) return;
      input.addEventListener('input', () => {
        currentSearch = input.value;
        const list = document.getElementById('shop-list');
        if (list) list.innerHTML = rowsHTML(computeItems());
      });
    }

    Game.ui.modal.open({
      title: `Shop · $${bal.toLocaleString()}`,
      bodyHTML: renderBody(),
      actions: [{ label: 'Close', variant: 'primary' }],
      onAction: (action, el) => {
        if (action === 'shop-filter') {
          currentFilter = el.dataset.filter || 'all';
          refreshBody(true);
          return;
        }
        if (action === 'shop-sort') {
          currentSort = currentSort === el.dataset.sort ? 'default' : el.dataset.sort;
          refreshBody(true);
          return;
        }
        if (action !== 'shop-buy') return;
        const res = Game.systems.shop.buy(state, el.dataset.id);
        if (res.ok) {
          if (Game.audio) Game.audio.play('buy');
          Game.ui.toast.show(`Bought ${res.item.name}`, { type: 'success' });
          Game.storage.save(state.meta.slotId, state);
          render(state);
          showShopModal(state);
        } else {
          Game.ui.toast.show(res.reason || 'Cannot buy', { type: 'error' });
        }
      },
    });
    attachSearchListener();
  }

  function showStandingsModal(state) {
    Game.systems.worldAI.ensureWorld(state);
    const leagueIds = Object.keys(state.world.leagues || {});
    let current = state.career.leagueId && state.world.leagues[state.career.leagueId]
      ? state.career.leagueId
      : (leagueIds.includes('NHL') ? 'NHL' : leagueIds[0]);

    function bodyFor(lid) {
      const rows = Game.systems.worldAI.getStandings(state, lid);
      if (!rows.length) return '<p class="settings-note">No standings yet — finish a season.</p>';
      const table = rows.map((r, i) =>
        `<div class="schedule-row"><span class="schedule-row__week">${i + 1}</span>
         <span class="schedule-row__opponent">${r.name}</span>
         <span class="schedule-row__result">${r.w}-${r.l}-${r.otl} · ${r.pts} pts</span></div>`
      ).join('');
      const tabs = leagueIds.map((id) =>
        `<button type="button" class="btn btn--ghost btn--small stand-tab" data-action="stand-tab" data-lid="${id}" style="margin:2px">${id}</button>`
      ).join('');
      return `<div style="margin-bottom:8px">${tabs}</div><div class="schedule-list">${table}</div>`;
    }

    function openStandings() {
      Game.ui.modal.open({
        title: `Standings · ${current}`,
        bodyHTML: bodyFor(current),
        actions: [{ label: 'Close', variant: 'primary' }],
        onAction: (action, el) => {
          if (action !== 'stand-tab') return;
          current = el.dataset.lid;
          openStandings();
        },
      });
    }
    openStandings();
  }

  function showRecordsModal(state) {
    Game.systems.worldAI.ensureWorld(state);
    const rec = Game.systems.worldAI.getRecords(state);
    const draft = Game.systems.worldAI.getDraftHistory(state);
    let currentTab = 'records';
    let draftIdx = draft.length ? draft.length - 1 : -1;
    let titleLeague = 'all';
    let titleYear = 'all';

    function line(label, r) {
      if (!r) return `<p class="settings-note">${label}: —</p>`;
      return `<p><strong>${label}:</strong> ${r.name} — ${r.value}${r.year ? ` (${r.year})` : ''}${r.team ? ` · ${r.team}` : ''}</p>`;
    }

    function draftHtml() {
      if (draftIdx < 0 || !draft[draftIdx]) return '<p class="settings-note">No draft history yet.</p>';
      const d = draft[draftIdx];
      const nav = `
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
          <button type="button" class="btn btn--ghost btn--small" data-action="draft-nav" data-dir="-1" ${draftIdx <= 0 ? 'disabled' : ''}>◀ Earlier</button>
          <strong>Draft ${d.year}</strong>
          <button type="button" class="btn btn--ghost btn--small" data-action="draft-nav" data-dir="1" ${draftIdx >= draft.length - 1 ? 'disabled' : ''}>Later ▶</button>
        </div>`;
      const rows = d.picks.slice(0, 20).map((pk) =>
        `<div class="schedule-row"><span class="schedule-row__week">R${pk.round}P${pk.pick}</span>
         <span class="schedule-row__opponent">${pk.firstName} ${pk.lastName}${pk.isUser ? ' ★' : ''}</span>
         <span class="schedule-row__result">${pk.teamName}</span></div>`
      ).join('');
      return `${nav}<h4 class="growth-title">Top ${Math.min(20, d.picks.length)} picks</h4>${rows}`;
    }

    /**
     * Championships, filterable by league and year (Phase 13). Previously
     * this only showed a flat, all-time "team -> title count" table with a
     * name search — there was no way to see who won a specific league in a
     * specific year. Reads world.leagues[lid].champions, which already
     * tracks exactly that (set once per league per season in worldAI.js),
     * instead of the aggregated counts.
     */
    function allChampionEntries() {
      const world = state.world;
      const entries = [];
      Object.keys(world.leagues || {}).forEach((lid) => {
        (world.leagues[lid].champions || []).forEach((c) => {
          entries.push({ league: lid, year: c.year, teamName: c.name });
        });
      });
      return entries;
    }

    function titleLeagueOptions() {
      const world = state.world;
      return Object.keys(world.leagues || {}).filter((lid) => (world.leagues[lid].champions || []).length);
    }

    function titleYearOptions(entries) {
      const years = Array.from(new Set(entries.map((e) => e.year))).filter((y) => y != null);
      years.sort((a, b) => b - a);
      return years;
    }

    function titlesHtml() {
      const all = allChampionEntries();
      const leagueOpts = titleLeagueOptions();
      let entries = titleLeague === 'all' ? all : all.filter((e) => e.league === titleLeague);
      const yearOpts = titleYearOptions(entries);
      if (titleYear !== 'all') entries = entries.filter((e) => String(e.year) === String(titleYear));
      entries.sort((a, b) => (b.year || 0) - (a.year || 0));

      const leagueTabs = `<div class="nav-tabs">` +
        `<button type="button" class="btn btn--ghost btn--small ${titleLeague === 'all' ? 'btn--tab-active' : ''}" data-action="title-league" data-league="all">All Leagues</button>` +
        leagueOpts.map((lid) => `<button type="button" class="btn btn--ghost btn--small ${titleLeague === lid ? 'btn--tab-active' : ''}" data-action="title-league" data-league="${lid}">${lid}</button>`).join('') +
        `</div>`;
      const yearTabs = yearOpts.length
        ? `<div class="nav-tabs">` +
          `<button type="button" class="btn btn--ghost btn--small ${titleYear === 'all' ? 'btn--tab-active' : ''}" data-action="title-year" data-year="all">All Years</button>` +
          yearOpts.map((y) => `<button type="button" class="btn btn--ghost btn--small ${String(titleYear) === String(y) ? 'btn--tab-active' : ''}" data-action="title-year" data-year="${y}">${y}</button>`).join('') +
          `</div>`
        : '';

      const rows = entries.length
        ? entries.map((e) =>
            `<div class="schedule-row"><span class="schedule-row__week">${e.year || '—'}</span>
             <span class="schedule-row__opponent">${e.teamName}</span>
             <span class="schedule-row__result">${e.league}</span></div>`
          ).join('')
        : '<p class="settings-note">No champions recorded for this filter yet.</p>';

      return `${leagueTabs}${yearTabs}<div class="schedule-list" id="titles-list">${rows}</div>`;
    }

    function renderBody() {
      const tabs = `
        <div class="modal-section-nav">
          <button type="button" class="btn ${currentTab === 'records' ? 'btn--primary' : 'btn--ghost'} btn--small modal-section-tab" data-action="records-tab" data-tab="records">Records</button>
          <button type="button" class="btn ${currentTab === 'titles' ? 'btn--primary' : 'btn--ghost'} btn--small modal-section-tab" data-action="records-tab" data-tab="titles">Championships</button>
          <button type="button" class="btn ${currentTab === 'draft' ? 'btn--primary' : 'btn--ghost'} btn--small modal-section-tab" data-action="records-tab" data-tab="draft">Draft</button>
        </div>
      `;

      if (currentTab === 'titles') {
        return `${tabs}
          <div class="record-grid"><div class="record-card"><h4 class="growth-title">Championships</h4>${titlesHtml()}</div></div>`;
      }

      if (currentTab === 'draft') {
        return `${tabs}<div class="record-grid"><div class="record-card" id="draft-card">${draftHtml()}</div></div>`;
      }

      return `${tabs}
        <div class="record-grid">
          <div class="record-card">${line('Single-season goals', rec.singleSeasonGoals)}</div>
          <div class="record-card">${line('Single-season points', rec.singleSeasonPoints)}</div>
          <div class="record-card">${line('Career goals', rec.careerGoals)}</div>
          <div class="record-card">${line('Career points', rec.careerPoints)}</div>
        </div>`;
    }

    function refreshBody() {
      const body = Game.ui.modal.getBodyEl();
      body.innerHTML = renderBody();
    }

    Game.ui.modal.open({
      title: 'World Records & Draft',
      bodyHTML: renderBody(),
      actions: [{ label: 'Close', variant: 'primary' }],
      onAction: (action, el) => {
        if (action === 'records-tab') {
          currentTab = el.dataset.tab || 'records';
          refreshBody();
        } else if (action === 'draft-nav') {
          draftIdx = Game.utils.clamp(draftIdx + Number(el.dataset.dir), 0, draft.length - 1);
          const card = document.getElementById('draft-card');
          if (card) card.innerHTML = draftHtml();
        } else if (action === 'title-league') {
          titleLeague = el.dataset.league;
          titleYear = 'all'; // year options depend on the league — reset so we never filter to an empty combo
          refreshBody();
        } else if (action === 'title-year') {
          titleYear = el.dataset.year;
          refreshBody();
        }
      },
    });
  }

  function showAwardsModal(state) {
    const list = Game.systems.awards.listPlayerAwards(state.player);
    const body = list.length
      ? list.slice().reverse().map((a) =>
          `<div class="award-row">
            <span class="award-row__icon">${a.icon || '🏆'}</span>
            <div><strong>${a.name}</strong><br>
            <span class="settings-note">${a.year || ''}${a.league ? ' · ' + a.league : ''}${a.leagueId ? ' · ' + a.leagueId : ''}</span></div>
          </div>`
        ).join('')
      : '<p class="settings-note">No awards yet. Dominate a season to earn trophies.</p>';
    Game.ui.modal.open({
      title: `Awards · ${list.length}`,
      bodyHTML: `<div class="award-list">${body}</div>`,
      actions: [{ label: 'Close', variant: 'primary' }],
    });
  }

  /** Runs the interactive tryout minigame (3 reactionGame attempts), then
   * calls onResult(passed, tryRes). Used for both UFA signings and the
   * "Tryout with X" European path option. */
  function runInteractiveTryout(state, clubName, onResult) {
    const skill = Game.leagues.leagueData.overall(state.player);
    Game.ui.modal.open({
      title: `Tryout — ${clubName}`,
      bodyHTML: `<div id="tryout-mount"></div>`,
      actions: [],
    });
    const mount = document.getElementById('tryout-mount');
    const scores = [];
    Game.minigames.runRandom({
      mount,
      attempts: 3,
      skill,
      label: `Impress the scouts! Combine drills for ${clubName}.`,
      actionLabel: 'GO',
      onAttempt: (score) => scores.push(score),
      onComplete: () => {
        const tryRes = Game.minigames.tryout.run(state.player, clubName, scores);
        Game.ui.modal.open({
          title: `Tryout — ${clubName}`,
          bodyHTML: `<p>${tryRes.message}</p><p class="settings-note">Combine average: ${tryRes.avg} (${tryRes.passChance}% pass chance)</p>`,
          actions: [{ label: 'Continue', variant: 'primary', onClick: () => onResult(tryRes.passed, tryRes) }],
        });
      },
    });
  }

  /**
   * NCAA recruiting: builds real, stats-based offers (js/systems/ncaaOffers.js)
   * and lets the player pick a school instead of silently auto-assigning one.
   * Committing plays the school-selection animation, then actually moves the
   * player onto that roster.
   */
  function presentNCAARecruiting(state, cb) {
    const event = Game.systems.ncaaOffers.createRecruitingEvent(state);
    if (event.type === 'no_offers') {
      Game.ui.modal.open({
        title: 'NCAA Recruiting',
        bodyHTML: `<p>${event.description}</p>`,
        actions: [{ label: 'Continue', variant: 'primary', onClick: cb }],
      });
      return;
    }
    const rows = event.offers.map((o, idx) =>
      `<button type="button" class="btn btn--secondary" data-action="ncaa-pick" data-idx="${idx}" style="display:block;width:100%;text-align:left;margin:4px 0">
         <strong>${o.school}</strong> — ${o.conference}<br>
         <span class="settings-note">${o.scholarship} · interest ${Math.round(o.likelihood * 100)}%</span>
       </button>`
    ).join('');
    Game.ui.modal.open({
      title: event.title,
      bodyHTML: `<p>${event.description.replace(/\n/g, '<br>')}</p><div>${rows}</div>`,
      actions: [{ label: "I'll decide later", variant: 'ghost', onClick: cb }],
      onAction: (action, el) => {
        if (action !== 'ncaa-pick') return;
        const offer = event.offers[Number(el.dataset.idx)];
        Game.ui.modal.open({ title: 'NCAA Commitment', bodyHTML: '<div id="ncaa-mount"></div>', actions: [] });
        const mount = document.getElementById('ncaa-mount');
        const finish = () => {
          const from = state.career.leagueId;
          const team = Game.systems.careerPath.moveToLeague(state, 'NCAA', offer.school);
          Game.systems.news.onTransfer(state, from, 'NCAA', team.name);
          Game.systems.ncaaOffers.acceptNCAAOffer(state, offer.school);
          Game.systems.seasonRunner.startNewSeason(state);
          Game.ui.modal.close();
          Game.ui.toast.show(`Committed to ${offer.school}!`, { type: 'success' });
          Game.storage.save(state.meta.slotId, state);
          cb();
        };
        if (Game.animations && Game.animations.draftAnimations && mount) {
          Game.animations.draftAnimations.runNCAACommitmentAnimation({
            mount,
            playerName: `${state.player.firstName} ${state.player.lastName}`,
            schoolName: offer.school,
            conference: offer.conference,
            onComplete: finish,
          });
        } else {
          finish();
        }
      },
    });
  }

  /**
   * Top-5 overall picks are too big an investment to quietly return to
   * junior/college hockey — the team wants them at NHL camp immediately to
   * see if they're ready. Forces the NHL destination (the team that
   * drafted them) and plays a camp-battle minigame to decide whether they
   * stick on the opening night roster or get sent to the real AHL
   * affiliate for more seasoning.
   */
  function presentTopPickCamp(state, pickInfo, cb) {
    const from = state.career.leagueId;
    const team = Game.systems.careerPath.moveToLeague(state, 'NHL', pickInfo.teamName, pickInfo.teamId);
    Game.systems.news.onTransfer(state, from, 'NHL', team.name);
    Game.systems.seasonRunner.startNewSeason(state);
    Game.storage.save(state.meta.slotId, state);

    Game.ui.modal.open({
      title: `${team.name} Training Camp`,
      bodyHTML: `<p>As the #${pickInfo.overall} overall pick, ${state.player.firstName} is invited straight to NHL training camp to see if he's ready right now.</p>`,
      actions: [{ label: 'Attend Camp', variant: 'primary', onClick: runCamp }],
    });

    function runCamp() {
      const skill = Game.leagues.leagueData.overall(state.player);
      Game.ui.modal.open({ title: `${team.name} Training Camp`, bodyHTML: '<div id="camp-mount"></div>', actions: [] });
      const mount = document.getElementById('camp-mount');
      Game.minigames.runRandom({
        mount,
        attempts: 3,
        skill,
        label: 'Impress the coaching staff — camp battle drills!',
        actionLabel: 'GO',
        onComplete: (avgScore) => {
          const madeTeam = avgScore >= 60;
          if (madeTeam) {
            Game.ui.modal.open({
              title: 'Camp Result',
              bodyHTML: `<p>${state.player.firstName} earns a spot on the ${team.name} opening night roster!</p>`,
              actions: [{ label: 'Continue', variant: 'primary', onClick: cb }],
            });
            return;
          }
          const affiliate = Game.systems.worldAI.getAffiliateTeam
            ? Game.systems.worldAI.getAffiliateTeam(state, team.teamId)
            : null;
          const dest = affiliate
            ? { name: affiliate.name, teamId: affiliate.id }
            : Game.systems.careerPath.realTeamFor(state, 'AHL', team.teamId);
          const from2 = state.career.leagueId;
          const ahlTeam = Game.systems.careerPath.moveToLeague(state, 'AHL', dest.name, dest.teamId);
          Game.systems.news.onTransfer(state, from2, 'AHL', ahlTeam.name);
          Game.systems.seasonRunner.startNewSeason(state);
          Game.storage.save(state.meta.slotId, state);
          Game.ui.modal.open({
            title: 'Camp Result',
            bodyHTML: `<p>${state.player.firstName} needs more seasoning — assigned to the ${ahlTeam.name} to start the year.</p>`,
            actions: [{ label: 'Continue', variant: 'primary', onClick: cb }],
          });
        },
      });
    }
  }

  /** Runs the actual effect of a single chosen transition option and reports back via cb(). */
  function resolveTransitionOption(state, opt, cb) {
    // NCAA commitment is a real choice among real schools (stats-based
    // offers), not just an automatic move — intercept before applyTransition
    // even runs so no team gets auto-assigned first.
    if (opt && opt.leagueId === 'NCAA' && opt.ncaaChoice && Game.systems.ncaaOffers) {
      presentNCAARecruiting(state, cb);
      return;
    }

    const res = Game.systems.seasonRunner.applyTransition(state, opt);
    if (res && res.type === 'draft') {
      const d = res.result;
      const topPick = d.drafted && res.worldDraft && res.worldDraft.userPick &&
        res.worldDraft.userPick.overall <= Game.CONFIG.CAREER.TOP_PICK_CUTOFF;
      const afterReveal = () => {
        if (topPick) {
          presentTopPickCamp(state, res.worldDraft.userPick, cb);
        } else {
          Game.ui.toast.show(d.text, { type: d.drafted ? 'success' : 'info' });
          Game.storage.save(state.meta.slotId, state);
          cb();
        }
      };
      if (Game.animations && Game.animations.draftAnimations && d.team) {
        Game.ui.modal.open({ title: 'NHL Entry Draft', bodyHTML: '<div id="draft-mount"></div>', actions: [] });
        const mount = document.getElementById('draft-mount');
        Game.animations.draftAnimations.runDraftAnimation({
          mount,
          leagueId: 'NHL',
          teamName: d.team,
          round: d.round,
          pick: d.pick,
          playerName: `${state.player.firstName} ${state.player.lastName}`,
          onComplete: () => {
            Game.ui.modal.close();
            Game.storage.save(state.meta.slotId, state);
            if (!topPick) Game.ui.toast.show(d.text, { type: d.drafted ? 'success' : 'info' });
            if (topPick) presentTopPickCamp(state, res.worldDraft.userPick, cb);
            else cb();
          },
        });
      } else {
        afterReveal();
      }
    } else if (res && res.type === 'ufa') {
      if (res.offers.length) {
        const offer = res.offers[0];
        runInteractiveTryout(state, offer.team, (passed) => {
          if (passed) {
            Game.systems.seasonRunner.acceptOffer(state, offer);
            Game.ui.toast.show(`Joined ${offer.team}`, { type: 'success' });
          } else {
            Game.systems.seasonRunner.markFreeAgentYear(state);
            Game.ui.toast.show(`No club signs ${state.player.firstName} this year — another shot next season.`, { type: 'error' });
          }
          Game.storage.save(state.meta.slotId, state);
          cb();
        });
      } else {
        Game.systems.seasonRunner.markFreeAgentYear(state);
        Game.ui.toast.show('No clubs interested after tryouts.', { type: 'error' });
        Game.storage.save(state.meta.slotId, state);
        cb();
      }
    } else if (res && res.type === 'tryout') {
      // Fixed: this path used to skip the tryout entirely and join the club
      // unconditionally. Now it's a real, interactive combine, and joining
      // only happens if it's actually won.
      runInteractiveTryout(state, res.teamName, (passed) => {
        const outcome = Game.systems.seasonRunner.resolveTryout(state, res.leagueId, res.teamName, res.teamId, passed);
        if (outcome.passed) {
          Game.ui.toast.show(`Signed with ${outcome.team.name}`, { type: 'success' });
        } else {
          Game.ui.toast.show(`${res.teamName} passed on signing you this time.`, { type: 'error' });
        }
        Game.storage.save(state.meta.slotId, state);
        cb();
      });
    } else if (res && res.type === 'move') {
      if (res.juniorDraft && Game.animations && Game.animations.draftAnimations) {
        const jd = res.juniorDraft;
        Game.ui.modal.open({ title: `${jd.leagueId} Draft`, bodyHTML: '<div id="jdraft-mount"></div>', actions: [] });
        const mount = document.getElementById('jdraft-mount');
        Game.animations.draftAnimations.runDraftAnimation({
          mount,
          leagueId: jd.leagueId,
          teamName: jd.team,
          round: jd.round,
          pick: jd.pick,
          playerName: `${state.player.firstName} ${state.player.lastName}`,
          onComplete: () => {
            Game.ui.modal.close();
            Game.ui.toast.show(`Drafted Round ${jd.round}, Pick ${jd.pick} by ${jd.team}`, { type: 'success' });
            Game.storage.save(state.meta.slotId, state);
            cb();
          },
        });
      } else {
        Game.ui.toast.show(`Joined ${res.team.name}`, { type: 'success' });
        Game.storage.save(state.meta.slotId, state);
        cb();
      }
    } else if (res && res.type === 'retire') {
      Game.ui.toast.show('You have retired from professional hockey.', { type: 'info' });
      Game.storage.save(state.meta.slotId, state);
      cb();
    } else {
      Game.storage.save(state.meta.slotId, state);
      cb();
    }
  }

  /**
   * Presents the season's career-path choices. Fixed (Phase 10): previously
   * every option (draft, "Jump to the NHL", "Report to the AHL", "Remain in
   * league X", ...) was asked as its own independent yes/no prompt in
   * sequence, so a player could accept more than one "where do I go" option
   * in the same pass — each one silently overwrote the team/season the
   * previous one had just set up. Destination options (anything that
   * actually places the player on a team) are now grouped into a single
   * mutually-exclusive choice; only "Enter NHL Draft" (which doesn't move
   * the player anywhere by itself) is still its own standalone prompt.
   */
  function presentTransitions(state, options, done) {
    if (!options || !options.length) { done(); return; }
    const draftOpt = options.find((o) => o.type === 'draft');
    const destinationOpts = options.filter((o) => o.type === 'ufa' || o.leagueId);

    function afterDraft() {
      presentDestinationChoice();
    }

    function presentDestinationChoice() {
      if (!destinationOpts.length) { done(); return; }
      if (destinationOpts.length === 1) {
        const opt = destinationOpts[0];
        Game.ui.modal.open({
          title: 'Career Decision',
          bodyHTML: `<p>${opt.label}</p>`,
          actions: [
            { label: 'Choose this', variant: 'primary', onClick: () => resolveTransitionOption(state, opt, done) },
            { label: 'Skip', variant: 'ghost', onClick: done },
          ],
        });
        return;
      }
      const rows = destinationOpts
        .map((opt, idx) => `<button type="button" class="btn btn--secondary" data-action="dest-pick" data-idx="${idx}" style="display:block;width:100%;text-align:left;margin:4px 0">${opt.label}</button>`)
        .join('');
      Game.ui.modal.open({
        title: 'Where to next?',
        bodyHTML: `<p class="settings-note">Pick one path for next season.</p><div>${rows}</div>`,
        actions: [{ label: "I'll decide later", variant: 'ghost', onClick: done }],
        onAction: (action, el) => {
          if (action !== 'dest-pick') return;
          const opt = destinationOpts[Number(el.dataset.idx)];
          Game.ui.modal.close();
          resolveTransitionOption(state, opt, done);
        },
      });
    }

    if (draftOpt) {
      Game.ui.modal.open({
        title: 'Career Decision',
        bodyHTML: `<p>${draftOpt.label}</p>`,
        actions: [
          { label: 'Choose this', variant: 'primary', onClick: () => resolveTransitionOption(state, draftOpt, afterDraft) },
          { label: 'Skip', variant: 'ghost', onClick: afterDraft },
        ],
      });
    } else {
      presentDestinationChoice();
    }
  }

  function init() {
    document.getElementById('btn-hub-to-menu').addEventListener('click', () => {
      Game.ui.screens.show('main-menu');
      Game.ui.mainMenu.renderSlots();
    });
    document.getElementById('btn-play-next-game').addEventListener('click', handlePlayNextGame);
    document.getElementById('btn-play-rest-season').addEventListener('click', handlePlayRestOfSeason);
    document.getElementById('btn-view-schedule').addEventListener('click', () => {
      if (!Game.state || Game.state.career.retired) return;
      showScheduleModal(Game.state);
    });
    const newsBtn = document.getElementById('btn-view-news');
    if (newsBtn) newsBtn.addEventListener('click', () => { if (Game.state) showNewsModal(Game.state); });
    const trainBtn = document.getElementById('btn-train');
    if (trainBtn) trainBtn.addEventListener('click', () => { if (Game.state && !Game.state.career.retired) showTrainingModal(Game.state); });
    const shopBtn = document.getElementById('btn-shop');
    if (shopBtn) shopBtn.addEventListener('click', () => { if (Game.state && !Game.state.career.retired) showShopModal(Game.state); });
    const standBtn = document.getElementById('btn-standings');
    if (standBtn) standBtn.addEventListener('click', () => { if (Game.state) { Game.audio.play('click'); showStandingsModal(Game.state); } });
    const recBtn = document.getElementById('btn-records');
    if (recBtn) recBtn.addEventListener('click', () => { if (Game.state) { Game.audio.play('click'); showRecordsModal(Game.state); } });
    const awardsBtn = document.getElementById('btn-awards');
    if (awardsBtn) awardsBtn.addEventListener('click', () => { if (Game.state) { Game.audio.play('click'); showAwardsModal(Game.state); } });
  }

  Game.ui = Game.ui || {};
  Game.ui.careerHub = { init, render };
})(window.Game = window.Game || {});
