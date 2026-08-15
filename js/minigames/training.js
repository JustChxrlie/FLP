/**
 * training.js
 * Interactive training minigame (Phase 10). Player picks focus attribute
 * group and intensity, then plays a real timing minigame (reactionGame);
 * how well they do drives how much they actually gain — a flubbed session
 * can fall flat even at "intense", and a sharp one over-delivers.
 */
(function (Game) {
  const FOCUS_OPTIONS = {
    skater: [
      { id: 'speed', label: 'Speed & Skating', attrs: ['speed', 'acceleration', 'skating'] },
      { id: 'shot', label: 'Shooting', attrs: ['slapShot', 'wristShot'] },
      { id: 'skill', label: 'Puck Skills', attrs: ['passing', 'vision', 'puckHandling'] },
      { id: 'defense', label: 'Defense', attrs: ['defense', 'shotBlocking', 'strength'] },
      { id: 'mental', label: 'Mental', attrs: ['confidence', 'mentality', 'leadership'] },
    ],
    goalie: [
      { id: 'reflexes', label: 'Reflexes', attrs: ['reflexes', 'flexibility'] },
      { id: 'position', label: 'Positioning', attrs: ['positioning', 'reboundControl', 'lowBlocking'] },
      { id: 'mental', label: 'Concentration', attrs: ['concentration', 'confidence', 'mentality'] },
    ],
  };

  function getOptions(player) {
    return player.position === 'G' ? FOCUS_OPTIONS.goalie : FOCUS_OPTIONS.skater;
  }

  /**
   * Runs a training session.
   * intensity: 'light' | 'normal' | 'intense'
   * performanceScore: 0-100 result from the interactive reactionGame minigame
   *   (defaults to a neutral 60 so old saves / callers without the minigame
   *   still work).
   * Returns { success, deltas, message }
   */
  function run(player, focusId, intensity = 'normal', performanceScore = 60) {
    const options = getOptions(player);
    const focus = options.find((o) => o.id === focusId) || options[0];
    const intensityMult = { light: 0.7, normal: 1, intense: 1.4 }[intensity] || 1;
    // 0 -> 0.15x, 60 -> ~1x, 100 -> 1.55x. A whiffed minigame now barely
    // moves the needle instead of guaranteeing half credit; a perfect one
    // still meaningfully overdelivers.
    const perfMult = Game.utils.clamp(0.15 + (performanceScore / 100) * 1.4, 0.15, 1.55);
    const mult = intensityMult * perfMult;

    const deltas = {};
    let totalGain = 0;

    focus.attrs.forEach((attr) => {
      if (player.attributes[attr] == null) return;
      const cap = player.attributeCaps[attr] || 99;
      const room = cap - player.attributes[attr];
      if (room <= 0) return;
      const gain = Math.min(room, Math.round(Game.utils.randInt(1, 3) * mult));
      if (gain > 0) {
        player.attributes[attr] += gain;
        deltas[attr] = gain;
        totalGain += gain;
      }
    });

    // small risk of fatigue on intense, more likely if the session went poorly
    let message = `Training focused on ${focus.label}.`;
    const fatigueChance = intensity === 'intense' ? (performanceScore < 40 ? 0.3 : 0.15) : 0;
    if (fatigueChance && Math.random() < fatigueChance) {
      const stam = player.attributes.stamina;
      if (stam != null && stam > 5) {
        player.attributes.stamina -= 1;
        deltas.stamina = (deltas.stamina || 0) - 1;
        message += ' Pushed too hard — stamina dipped.';
      }
    }

    const perfNote = performanceScore >= 85 ? ' Excellent session!' : performanceScore < 40 ? ' Sloppy session.' : '';

    return {
      success: totalGain > 0,
      focus: focus.label,
      intensity,
      performanceScore,
      deltas,
      message: message + perfNote + (totalGain ? ` +${totalGain} total.` : ' Already at ceiling.'),
    };
  }

  Game.minigames = Game.minigames || {};
  Game.minigames.training = { getOptions, run };
})(window.Game = window.Game || {});
