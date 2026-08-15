/**
 * tournament.js
 * Phase 10: the World Junior Championship used to be resolved with a
 * single, invisible Math.random() call the moment the season ended — the
 * player had no part in it beyond a news headline. Now, once invited
 * (Game.systems.careerPath.checkWorldJuniors still decides that, based on
 * age/OVR), the tournament is actually played: a short round-robin of
 * interactive shootout "games" against international competition, with the
 * medal decided by how many the player wins.
 */
(function (Game) {
  const GAMES = 3;

  /** International competition is uniformly tough, with some game-to-game swing. */
  function opponentDifficulty() {
    return Game.utils.clamp(62 + Game.utils.randInt(-8, 16), 40, 95);
  }

  /**
   * Plays the tournament interactively into `mount` (a live DOM element,
   * typically the open modal's body). `seasonYear` should be the year of
   * the season that earned the invitation (concludeSeason's summary.wj.year)
   * so the medal is recorded against the right season, since the actual
   * tournament is played from the UI after the career year has already
   * ticked forward. Calls onGamePlayed after each game and
   * onComplete({ medal, wins, games, log, awardEntry }) at the end.
   */
  function playWorldJuniors(state, mount, { seasonYear, onGamePlayed, onComplete } = {}) {
    const skill = Game.leagues.leagueData.overall(state.player);
    let wins = 0;
    const log = [];

    function playGame(i) {
      Game.minigames.runRandom({
        mount,
        attempts: 1,
        skill,
        label: `World Juniors — Game ${i + 1} of ${GAMES}`,
        actionLabel: 'SHOOT',
        onComplete: (score) => {
          const opp = opponentDifficulty();
          const won = score + Game.utils.randInt(-8, 8) >= opp - 20;
          if (won) wins++;
          const entry = { game: i + 1, score, opponentDifficulty: opp, won };
          log.push(entry);
          if (onGamePlayed) onGamePlayed(entry, i);
          if (i + 1 < GAMES) {
            setTimeout(() => playGame(i + 1), 550);
          } else {
            finish();
          }
        },
      });
    }

    function finish() {
      let medal = null;
      if (wins === GAMES) medal = 'gold';
      else if (wins === GAMES - 1) medal = 'silver';
      else if (wins >= 1) medal = 'bronze';

      const year = seasonYear != null ? seasonYear : state.career.currentYear;
      state.career.wjHistory = state.career.wjHistory || [];
      state.career.wjHistory.push({ year, medal, wins, games: GAMES });

      const map = { gold: 'WJC_GOLD', silver: 'WJC_SILVER', bronze: 'WJC_BRONZE' };
      let awardEntry = null;
      if (medal && map[medal]) {
        awardEntry = Game.systems.awards.grant(state, map[medal]);
      }
      Game.systems.news.onWorldJuniorsResult(state, medal);

      if (onComplete) onComplete({ medal, wins, games: GAMES, log, awardEntry });
    }

    playGame(0);
  }

  const PHASE_OPPONENT = { easy: 58, normal: 66, hard: 74, extreme: 82 };

  /**
   * Plays the Winter Olympics interactively: a 3-game round-robin group
   * stage, then — depending on the record — either straight to the
   * knockout bracket (2+ wins) or one qualification/knockout playoff game
   * first, then quarterfinal → semifinal → medal game. Mirrors the real
   * tournament format at a small scale. Uses olympicMinigames.js for the
   * phase progression/config and minigameDifficulty's phase labels for
   * relative opponent strength. Calls onGamePlayed after each game and
   * onComplete({ medal, wins, log, awardEntry, outcome }) at the end.
   */
  function playOlympics(state, mount, { seasonYear, onGamePlayed, onPhaseChange, onComplete } = {}) {
    const OM = Game.minigames.olympicMinigames;
    const skill = Game.leagues.leagueData.overall(state.player);
    const log = [];
    let groupWins = 0;
    let groupLosses = 0;

    function playPhaseGame(phase, label, cb) {
      const cfg = OM.getOlympicMinigameConfig(phase);
      const baseOpp = PHASE_OPPONENT[cfg.difficulty] || 66;
      if (onPhaseChange) onPhaseChange(phase, cfg);
      Game.minigames.runRandom({
        mount,
        attempts: cfg.attempts || 1,
        skill,
        label: label || cfg.description,
        actionLabel: 'SHOOT',
        onComplete: (score) => {
          const opp = Game.utils.clamp(baseOpp + Game.utils.randInt(-6, 10), 40, 95);
          const won = score + Game.utils.randInt(-8, 8) >= opp - 20;
          const entry = { phase, score, opponentDifficulty: opp, won };
          log.push(entry);
          if (onGamePlayed) onGamePlayed(entry);
          cb(won);
        },
      });
    }

    function runGroupStage(i) {
      playPhaseGame('groupStage', `Group Stage — Game ${i + 1} of 3`, (won) => {
        if (won) groupWins++;
        else groupLosses++;
        if (i + 1 < 3) setTimeout(() => runGroupStage(i + 1), 550);
        else afterGroupStage();
      });
    }

    function afterGroupStage() {
      const phase = OM.getOlympicProgression({ wins: groupWins, losses: groupLosses });
      if (phase === 'quarterfinals') {
        runKnockout('quarterfinals');
        return;
      }
      playPhaseGame(phase, phase === 'qualification' ? 'Olympic Qualification Playoff' : 'Olympic Knockout Playoff', (won) => {
        if (won) runKnockout('quarterfinals');
        else finish(null, 'eliminated');
      });
    }

    function runKnockout(phase) {
      playPhaseGame(phase, phase === 'quarterfinals' ? 'Olympic Quarterfinal' : 'Olympic Semifinal', (won) => {
        if (phase === 'quarterfinals') {
          if (won) runKnockout('semifinals');
          else finish(null, 'eliminated');
        } else if (won) {
          runMedalGame('gold');
        } else {
          runMedalGame('bronze');
        }
      });
    }

    function runMedalGame(target) {
      playPhaseGame('medals', target === 'gold' ? 'Gold Medal Game' : 'Bronze Medal Game', (won) => {
        if (target === 'gold') finish(won ? 'gold' : 'silver', 'medal-game');
        else finish(won ? 'bronze' : null, 'medal-game');
      });
    }

    function finish(medal, outcome) {
      const year = seasonYear != null ? seasonYear : state.career.currentYear;
      // Track history directly (career.olympics) rather than via
      // olympicMinigames.recordOlympicAchievement, which would also push
      // its own award entry into player.awards — awards.grant below is the
      // single source of truth for the actual trophy so it gets a proper
      // icon and shows up consistently with every other award.
      state.career.olympics = state.career.olympics || [];
      state.career.olympics.push({ year, country: state.player.countryCode, medal: medal || null, wins: groupWins, losses: groupLosses, outcome });

      const map = { gold: 'OLYMPIC_GOLD', silver: 'OLYMPIC_SILVER', bronze: 'OLYMPIC_BRONZE' };
      let awardEntry = null;
      if (medal && map[medal]) awardEntry = Game.systems.awards.grant(state, map[medal]);

      Game.systems.news.push(state, {
        type: medal ? 'award' : 'career',
        title: medal ? `Olympic ${medal.charAt(0).toUpperCase()}${medal.slice(1)}!` : 'Olympics Complete',
        body: medal
          ? `${state.player.firstName} ${state.player.lastName} wins ${medal} at the Winter Olympics!`
          : `${state.player.firstName} ${state.player.lastName}'s Olympic run ends without a medal (${groupWins}-${groupLosses} group stage).`,
        importance: medal ? 5 : 2,
      });

      if (onComplete) onComplete({ medal, wins: groupWins, losses: groupLosses, year, log, awardEntry, outcome });
    }

    runGroupStage(0);
  }

  Game.systems = Game.systems || {};
  Game.systems.tournament = { playWorldJuniors, playOlympics, GAMES };
})(window.Game = window.Game || {});
