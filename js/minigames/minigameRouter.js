/**
 * minigameRouter.js
 * Picks a random minigame each time one is needed (training, tryouts,
 * playoff "big moments", tournaments) so the player doesn't see the same
 * exact minigame every single time. Every registered minigame shares the
 * run({ mount, attempts, skill, label, onAttempt, onComplete }) contract,
 * so this is a drop-in replacement for calling reactionGame.run directly.
 */
(function (Game) {
  function pool() {
    return [Game.minigames.reactionGame, Game.minigames.aimGame, Game.minigames.sequenceGame].filter(Boolean);
  }

  /** Runs a randomly-chosen minigame with the given options. */
  function runRandom(opts) {
    const games = pool();
    const chosen = games.length ? Game.utils.randChoice(games) : null;
    if (!chosen) {
      if (opts && opts.onComplete) opts.onComplete(50, []);
      return { cancel() {} };
    }
    return chosen.run(opts);
  }

  Game.minigames = Game.minigames || {};
  Game.minigames.runRandom = runRandom;
})(window.Game = window.Game || {});
