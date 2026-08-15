/**
 * tryout.js
 * Interactive tryout / combine minigame (Phase 10) used for undrafted free
 * agents and European club trials. The three "tests" are now driven by the
 * player's real, interactive reactionGame performance (blended with their
 * attributes and OVR), not by a hidden dice roll — a strong tryout can turn
 * a marginal prospect into a signed player, and a poor one can sink a good one.
 */
(function (Game) {
  /**
   * performanceScores: array of 0-100 scores from the interactive minigame
   * (one per test). Falls back to a neutral 55 per test if omitted so any
   * legacy caller keeps working.
   */
  function run(player, clubName, performanceScores) {
    const ovr = Game.leagues.leagueData.overall(player);
    const base = Math.min(0.92, Math.max(0.08, (ovr - 48) / 42));
    const perf = performanceScores && performanceScores.length ? performanceScores : [55, 55, 55];

    const testNames = ['Skating test', 'Skill drill', 'Game scrimmage'];
    const attrBaselines = player.position !== 'G'
      ? [
          ((player.attributes.skating || 50) + (player.attributes.speed || 50)) / 2,
          ((player.attributes.puckHandling || 50) + (player.attributes.wristShot || 50)) / 2,
          ovr,
        ]
      : [
          player.attributes.reflexes || 50,
          player.attributes.positioning || 50,
          ovr,
        ];

    // Each test score blends the player's underlying attributes with how
    // well they actually performed in the minigame — attributes set the
    // ceiling, execution decides how close to it they get.
    const tests = testNames.map((name, i) => {
      const minigameScore = perf[i] != null ? perf[i] : 55;
      const score = Math.round(attrBaselines[i] * 0.5 + minigameScore * 0.5);
      return { name, score: Game.utils.clamp(score, 5, 99) };
    });

    const avg = tests.reduce((s, t) => s + t.score, 0) / tests.length;
    const performanceBonus = (avg - 60) / 100;
    const passChance = Game.utils.clamp(base + performanceBonus, 0.05, 0.95);
    const passed = Math.random() < passChance;

    return {
      clubName,
      tests,
      avg: Math.round(avg),
      passChance: Math.round(passChance * 100),
      passed,
      message: passed
        ? `${player.firstName} impressed ${clubName} and earned a contract offer.`
        : `${player.firstName} did not do enough to convince ${clubName}.`,
    };
  }

  Game.minigames = Game.minigames || {};
  Game.minigames.tryout = { run };
})(window.Game = window.Game || {});
