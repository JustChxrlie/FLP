/**
 * progression.js
 * Governs how a player's attributes change season to season: fast growth
 * in childhood, slower toward maturity, a plateau during the prime, and
 * decline past a certain age. Attributes never exceed their individual
 * ceiling (attributeCaps, Phase 3) or drop below 1.
 */
(function (Game) {
  /**
   * Age curve: each stage defines a "rate of change" per season.
   * Positive = tends to grow toward the ceiling. Negative = tends to decline.
   */
  const AGE_CURVE = [
    { maxAge: 15, factor: 1.5, label: 'Rapid Growth' },
    { maxAge: 19, factor: 1.1, label: 'Youth Development' },
    { maxAge: 23, factor: 0.6, label: 'Maturation' },
    { maxAge: 29, factor: 0.2, label: 'Prime' },
    { maxAge: 33, factor: -0.15, label: 'Plateau' },
    { maxAge: 999, factor: -0.6, label: 'Decline' },
  ];

  const GROWTH_RATE = {
    'Rapid Growth': 0.22,
    'Youth Development': 0.16,
    Maturation: 0.1,
    Prime: 0.04,
  };

  const INTENSITY_MULTIPLIER = {
    light: 0.6,
    normal: 1,
    intense: 1.5,
  };

  function stageForAge(age) {
    return AGE_CURVE.find((stage) => age <= stage.maxAge) || AGE_CURVE[AGE_CURVE.length - 1];
  }

  /**
   * Applies one season of training/development to the player.
   * Returns a report { stageLabel, deltas: { attributeId: change, ... } }
   * so the UI can show it without recomputing anything.
   */
  function trainSeason(player, intensity = 'normal') {
    const stage = stageForAge(player.age);
    const mult = INTENSITY_MULTIPLIER[intensity] ?? 1;
    const deltas = {};

    Object.keys(player.attributes).forEach((id) => {
      const current = player.attributes[id];
      const cap = player.attributeCaps[id];
      let change = 0;

      if (stage.factor >= 0) {
        // Growth: a PROPORTION of the remaining gap to the ceiling closes
        // each season (plus a little noise), so a high-potential player
        // actually approaches their cap by their prime instead of crawling
        // toward it at a flat few points a year forever.
        const room = cap - current;
        if (room > 0) {
          const rate = GROWTH_RATE[stage.label] ?? 0.05;
          const step = room * rate * mult + Game.utils.randInt(0, 2);
          change = Math.min(room, Math.round(step));
        }
      } else {
        // Decline: only applies during plateau/decline, and only downward.
        const step = Game.utils.randInt(0, 2) * Math.abs(stage.factor) * mult;
        change = -Math.round(step);
      }

      if (change !== 0) {
        player.attributes[id] = Game.utils.clamp(current + change, 1, 99);
        deltas[id] = player.attributes[id] - current;
      }
    });

    return { stageLabel: stage.label, factor: stage.factor, deltas };
  }

  Game.systems = Game.systems || {};
  Game.systems.progression = { stageForAge, trainSeason, AGE_CURVE };
})(window.Game = window.Game || {});
