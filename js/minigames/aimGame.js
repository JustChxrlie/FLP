/**
 * aimGame.js
 * A puck target moves along a curved path inside a "goal"; the player
 * clicks it, not a fixed button — spatial precision instead of pure
 * timing. Same run()/onComplete(avgScore, scores) contract as
 * reactionGame, so it's a drop-in alternative anywhere that's used
 * (training, tryouts, playoff moments, tournaments), for real variety
 * instead of the same minigame everywhere.
 */
(function (Game) {
  function run(opts) {
    const {
      mount,
      attempts = 3,
      skill = 50,
      label = 'Click the puck when it lines up with the open net!',
      onAttempt,
      onComplete,
    } = opts || {};

    if (!mount) {
      if (onComplete) onComplete(50, []);
      return { cancel() {} };
    }

    const targetRadius = Game.utils.clamp(26 - skill * 0.12, 12, 26); // smaller target = harder, better skill helps a little
    const speed = Game.utils.clamp(1.6 + (100 - skill) * 0.02, 1.2, 3.4); // px-per-frame-ish, in % space

    const scores = [];
    let attemptIndex = 0;
    let raf = null;
    let running = true;
    let px = 50,
      py = 50,
      vx = 1,
      vy = 1;

    mount.innerHTML = `
      <div class="reaction-game aim-game">
        <p class="reaction-game__label">${label}</p>
        <p class="reaction-game__attempt">Shot <span data-role="count">1</span> / ${attempts}</p>
        <div class="aim-game__field" data-role="field">
          <div class="aim-game__net"></div>
          <div class="aim-game__puck" data-role="puck"></div>
        </div>
        <p class="reaction-game__result" data-role="result">&nbsp;</p>
      </div>`;

    const fieldEl = mount.querySelector('[data-role="field"]');
    const puckEl = mount.querySelector('[data-role="puck"]');
    const countEl = mount.querySelector('[data-role="count"]');
    const resultEl = mount.querySelector('[data-role="result"]');

    function resetPuck() {
      px = Game.utils.randInt(20, 80);
      py = Game.utils.randInt(20, 80);
      const angle = Math.random() * Math.PI * 2;
      vx = Math.cos(angle) * speed;
      vy = Math.sin(angle) * speed;
    }

    function frame() {
      if (!running) return;
      px += vx;
      py += vy;
      if (px <= 6 || px >= 94) vx *= -1;
      if (py <= 6 || py >= 94) vy *= -1;
      px = Game.utils.clamp(px, 6, 94);
      py = Game.utils.clamp(py, 6, 94);
      puckEl.style.left = `${px}%`;
      puckEl.style.top = `${py}%`;
      raf = requestAnimationFrame(frame);
    }

    function startAttempt() {
      resetPuck();
      countEl.textContent = String(attemptIndex + 1);
      resultEl.textContent = '\u00a0';
      raf = requestAnimationFrame(frame);
    }

    function stopFrame() {
      if (raf) cancelAnimationFrame(raf);
      raf = null;
    }

    function scoreFor(clickX, clickY) {
      const rect = fieldEl.getBoundingClientRect();
      const relX = ((clickX - rect.left) / rect.width) * 100;
      const relY = ((clickY - rect.top) / rect.height) * 100;
      const dist = Math.hypot(relX - px, relY - py);
      if (dist <= targetRadius * 0.3) return Game.utils.randInt(90, 100);
      if (dist <= targetRadius * 0.6) return Game.utils.randInt(65, 89);
      if (dist <= targetRadius) return Game.utils.randInt(20, 49);
      // Missed the target entirely — no more free points just for clicking.
      return Game.utils.randInt(0, 8);
    }

    function handleClick(e) {
      if (!running) return;
      stopFrame();
      const score = scoreFor(e.clientX, e.clientY);
      scores.push(score);
      resultEl.textContent = score >= 85 ? 'Top corner!' : score >= 65 ? 'Good shot' : score >= 40 ? 'Off target' : 'Wide miss';
      if (onAttempt) onAttempt(score, attemptIndex);
      attemptIndex++;
      if (attemptIndex >= attempts) {
        running = false;
        const avg = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
        setTimeout(() => onComplete && onComplete(avg, scores.slice()), 500);
      } else {
        setTimeout(() => running && startAttempt(), 450);
      }
    }

    fieldEl.addEventListener('click', handleClick);
    startAttempt();

    return {
      cancel() {
        running = false;
        stopFrame();
      },
    };
  }

  Game.minigames = Game.minigames || {};
  Game.minigames.aimGame = { run };
})(window.Game = window.Game || {});
