/**
 * newsEngine.js
 * Dynamic news feed that evolves with goals, awards, medals, transfers, etc.
 */
(function (Game) {
  function push(state, item) {
    state.history.news = state.history.news || [];
    state.history.news.unshift({
      id: Game.utils.uid('news'),
      date: state.career.currentYear,
      age: state.player.age,
      importance: item.importance || 1,
      ...item,
    });
    if (state.history.news.length > 100) state.history.news.length = 100;
  }

  function headlineForSeason(state, summary) {
    const p = state.player;
    const name = `${p.firstName} ${p.lastName}`;
    const totals = summary.totals || {};
    const goals = totals.goals || 0;
    const points = totals.points || 0;
    const league = summary.league || p.league;
    const team = (summary.team && summary.team.name) || p.team;

    if (p.position === 'G') {
      const wins = totals.wins || 0;
      const so = totals.shutouts || 0;
      if (so >= 5) return `${name} posts ${so} shutouts for ${team} in the ${league}.`;
      if (wins >= 25) return `${name} records ${wins} wins, solidifying role with ${team}.`;
      return `${name} finishes the ${league} season with ${wins} wins for ${team}.`;
    }

    if (goals >= 40) return `BREAKOUT: ${name} explodes for ${goals} goals with ${team}.`;
    if (goals >= 30) return `${name} nets ${goals} goals, emerging as a scoring threat in the ${league}.`;
    if (points >= 60) return `${name} piles up ${points} points for ${team} this season.`;
    if (points >= 40) return `${name} contributes ${points} points in a strong campaign with ${team}.`;
    return `${name} wraps up the ${league} season with ${team} (${goals}G ${totals.assists || 0}A).`;
  }

  function onSeasonEnd(state, summary) {
    const text = headlineForSeason(state, summary);
    const goals = (summary.totals && summary.totals.goals) || 0;
    push(state, {
      type: 'season',
      title: goals >= 30 ? 'Breakout Season' : 'Season Review',
      body: text,
      importance: goals >= 40 ? 4 : 2,
    });
  }

  function onDraft(state, result) {
    if (!result.drafted) {
      push(state, { type: 'draft', title: 'Undrafted', body: result.text, importance: 3 });
      return;
    }
    push(state, {
      type: 'draft',
      title: `Drafted Round ${result.round}`,
      body: result.text,
      importance: 5,
    });
    if (Game.audio) Game.audio.play('draft');
  }

  function onTransfer(state, fromLeague, toLeague, teamName) {
    const name = `${state.player.firstName} ${state.player.lastName}`;
    push(state, {
      type: 'transfer',
      title: 'Transfer',
      body: `${name} moves to ${teamName} (${toLeague}).`,
      importance: 4,
    });
  }

  function onWorldJuniors(state, result) {
    if (!result || !result.invited) return;
    push(state, {
      type: 'wj',
      title: 'World Juniors Call-up',
      body: result.text,
      importance: 4,
    });
  }

  function onWorldJuniorsResult(state, medal) {
    const name = `${state.player.firstName} ${state.player.lastName}`;
    if (medal === 'gold') {
      push(state, { type: 'medal', title: 'World Juniors Gold!', body: `${name} and country capture gold at the World Juniors.`, importance: 5 });
    } else if (medal === 'silver') {
      push(state, { type: 'medal', title: 'World Juniors Silver', body: `${name} helps secure silver at the World Juniors.`, importance: 4 });
    } else if (medal === 'bronze') {
      push(state, { type: 'medal', title: 'World Juniors Bronze', body: `${name} earns bronze at the World Juniors.`, importance: 3 });
    } else {
      push(state, { type: 'wj', title: 'World Juniors', body: `${name} competed at the World Juniors.`, importance: 2 });
    }
  }

  function onAward(state, awardName) {
    const name = `${state.player.firstName} ${state.player.lastName}`;
    push(state, {
      type: 'award',
      title: awardName,
      body: `${name} wins the ${awardName}.`,
      importance: 5,
    });
  }

  function onMilestone(state, text) {
    push(state, { type: 'milestone', title: 'Milestone', body: text, importance: 3 });
  }

  function getFeed(state, limit = 20) {
    return (state.history.news || []).slice(0, limit);
  }

  Game.systems = Game.systems || {};
  Game.systems.news = {
    push,
    onSeasonEnd,
    onDraft,
    onTransfer,
    onWorldJuniors,
    onWorldJuniorsResult,
    onAward,
    onMilestone,
    getFeed,
  };
})(window.Game = window.Game || {});
