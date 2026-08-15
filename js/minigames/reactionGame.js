/**
 * reactionGame.js
 * Shared interactive timing minigame (Phase 10).
 *
 * A marker sweeps back and forth across a bar; the player must press the
 * action button right as it crosses the target zone. This is the real,
 * skill-based interaction that backs training sessions, tryouts/combines,
 * international tournaments (World Juniors) and playoff "big moments" —
 * replacing the old instant, non-interactive dice rolls.
 *
 * `skill` (0-100, usually the player's OVR) makes the zone a bit wider and
 * the sweep a bit slower for a more developed player, without ever making
 * the outcome automatic — the player still has to click at the right time.
 *
 * All DOM wiring happens synchronously against the `mount` element passed
 * in, and listeners are attached immediately (no setTimeout race), so the
 * very first tap always registers.
 */
(function (Game) {
  function run(opts) {
    const {
      mount,
      attempts = 3,
      skill = 50,
      label = 'Press the button when the marker hits the zone!',
      actionLabel = 'GO',
      onAttempt,
      onComplete,
    } = opts || {};

    if (!mount) {
      if (onComplete) onComplete(50, []);
      return { cancel() {} };
    }

    const zoneWidth = Game.utils.clamp(16 + skill * 0.22, 16, 38); // % of track width
    const durationMs = Game.utils.clamp(1400 - skill * 4, 650, 1400);

    const scores = [];
    let attemptIndex = 0;
    let raf = null;
    let running = true;
    let pos = 0;
    let zoneCenter = 50;
    let startTs = null;

    mount.innerHTML = `
      <div class="reaction-game">
        <p class="reaction-game__label">${label}</p>
        <p class="reaction-game__attempt">Attempt <span data-role="count">1</span> / ${attempts}</p>
        <div class="reaction-game__track" data-role="track">
          <div class="reaction-game__zone" data-role="zone"></div>
          <div class="reaction-game__marker" data-role="marker"></div>
        </div>
        <button type="button" class="btn btn--primary reaction-game__btn" data-role="hit">${actionLabel}</button>
        <p class="reaction-game__result" data-role="result">&nbsp;</p>
      </div>`;

    const zoneEl = mount.querySelector('[data-role="zone"]');
    const markerEl = mount.querySelector('[data-role="marker"]');
    const btnEl = mount.querySelector('[data-role="hit"]');
    const countEl = mount.querySelector('[data-role="count"]');
    const resultEl = mount.querySelector('[data-role="result"]');

    function placeZone() {
      zoneCenter = Game.utils.randInt(18, 82);
      zoneEl.style.left = `${zoneCenter - zoneWidth / 2}%`;
      zoneEl.style.width = `${zoneWidth}%`;
    }

    function frame(ts) {
      if (!running) return;
      if (!startTs) startTs = ts;
      const elapsed = (ts - startTs) % durationMs;
      const cyclePos = elapsed / durationMs;
      const t = cyclePos < 0.5 ? cyclePos * 2 : 2 - cyclePos * 2; // triangle wave 0->1->0
      pos = t * 100;
      markerEl.style.left = `${pos}%`;
      raf = requestAnimationFrame(frame);
    }

    function startAttempt() {
      placeZone();
      pos = 0;
      startTs = null;
      countEl.textContent = String(attemptIndex + 1);
      resultEl.textContent = '\u00a0';
      btnEl.disabled = false;
      raf = requestAnimationFrame(frame);
    }

    function stopFrame() {
      if (raf) cancelAnimationFrame(raf);
      raf = null;
    }

    function scoreFor(playerPos) {
      const dist = Math.abs(playerPos - zoneCenter);
      const half = zoneWidth / 2;
      if (dist <= half) {
        return Math.round(100 - (dist / half) * 30); // 70-100 inside the zone
      }
      // Outside the zone is a miss — punished harder and with no safety
      // net: a near-miss caps well below the zone's worst score, and a
      // wild miss bottoms out at 0 instead of a guaranteed floor.
      const over = dist - half;
      return Math.max(0, Math.round(45 - over * 2.4));
    }

    function handleHit() {
      if (!running || btnEl.disabled) return;
      btnEl.disabled = true;
      stopFrame();
      const score = scoreFor(pos);
      scores.push(score);
      resultEl.textContent = score >= 85 ? 'Perfect!' : score >= 65 ? 'Good' : score >= 40 ? 'Okay' : 'Missed';
      if (onAttempt) onAttempt(score, attemptIndex);
      attemptIndex++;
      if (attemptIndex >= attempts) {
        running = false;
        const avg = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
        setTimeout(() => {
          if (onComplete) onComplete(avg, scores.slice());
        }, 500);
      } else {
        setTimeout(() => {
          if (running) startAttempt();
        }, 450);
      }
    }

    btnEl.addEventListener('click', handleHit);
    startAttempt();

    return {
      cancel() {
        running = false;
        stopFrame();
      },
    };
  }

  Game.minigames = Game.minigames || {};
  Game.minigames.reactionGame = { run };
})(window.Game = window.Game || {});
