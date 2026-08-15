/**
 * eventEngine.js
 * Picks eligible random events for the season and resolves them
 * (auto-applied or via a player choice).
 */
(function (Game) {
  function isEligible(evt, player, state) {
    if (evt.minAge != null && player.age < evt.minAge) return false;
    if (evt.maxAge != null && player.age > evt.maxAge) return false;
    if (evt.once && state.history.usedEvents?.includes(evt.id)) return false;
    if (evt.condition && !evt.condition(player, state)) return false;
    return true;
  }

  function weightedPick(pool) {
    const total = pool.reduce((sum, e) => sum + e.weight, 0);
    let roll = Math.random() * total;
    for (const evt of pool) {
      roll -= evt.weight;
      if (roll <= 0) return evt;
    }
    return pool[pool.length - 1];
  }

  /** Picks N distinct eligible events for this season (no repeats within the same call). */
  function rollSeasonEvents(state, count = Game.utils.randInt(2, 3)) {
    const player = state.player;
    let pool = Game.eventSystem.definitions.filter((e) => isEligible(e, player, state));
    const picked = [];
    for (let i = 0; i < count && pool.length; i++) {
      const evt = weightedPick(pool);
      picked.push(evt);
      pool = pool.filter((e) => e.id !== evt.id);
    }
    return picked;
  }

  function formatText(text, player) {
    return text.replace('{player}', `${player.firstName} ${player.lastName}`);
  }

  /** Resolves an auto-apply event immediately. Returns { event, outcomeText }. */
  function resolveAuto(evt, state) {
    const outcomeText = evt.autoApply(state.player, state);
    markUsed(evt, state);
    return { event: evt, outcomeText };
  }

  /** Resolves a choice event once the player picks an option index. */
  function resolveChoice(evt, state, choiceIndex) {
    const choice = evt.choices[choiceIndex];
    const outcomeText = choice.apply(state.player, state);
    markUsed(evt, state);
    return { event: evt, choice, outcomeText };
  }

  function markUsed(evt, state) {
    if (!evt.once) return;
    state.history.usedEvents = state.history.usedEvents || [];
    state.history.usedEvents.push(evt.id);
  }

  Game.eventSystem = Game.eventSystem || {};
  Game.eventSystem.rollSeasonEvents = rollSeasonEvents;
  Game.eventSystem.formatText = formatText;
  Game.eventSystem.resolveAuto = resolveAuto;
  Game.eventSystem.resolveChoice = resolveChoice;
})(window.Game = window.Game || {});
