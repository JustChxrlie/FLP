/**
 * sequenceGame.js
 * Simon-says style: watch a growing sequence of highlighted pads, then
 * repeat it. Tests focus/memory instead of reflexes or aim — a third,
 * genuinely different mechanic sharing reactionGame's run()/onComplete
 * contract so it can be swapped in anywhere for variety.
 */
(function (Game) {
  const PADS = ['LW', 'C', 'RW', 'D'];

  function run(opts) {
    const {
      mount,
      attempts = 3,
      skill = 50,
      label = 'Watch the pattern, then repeat it.',
      onAttempt,
      onComplete,
    } = opts || {};

    if (!mount) {
      if (onComplete) onComplete(50, []);
      return { cancel() {} };
    }

    const baseLength = 3 + Math.round(skill / 34); // 3-6 pads long depending on skill
    const showSpeed = Game.utils.clamp(560 - skill * 2, 260, 560);

    const scores = [];
    let attemptIndex = 0;
    let sequence = [];
    let inputIndex = 0;
    let accepting = false;

    mount.innerHTML = `
      <div class="reaction-game sequence-game">
        <p class="reaction-game__label">${label}</p>
        <p class="reaction-game__attempt">Round <span data-role="count">1</span> / ${attempts}</p>
        <div class="sequence-game__pads" data-role="pads">
          ${PADS.map((p) => `<button type="button" class="sequence-game__pad" data-pad="${p}">${p}</button>`).join('')}
        </div>
        <p class="reaction-game__result" data-role="result">&nbsp;</p>
      </div>`;

    const padsEl = mount.querySelectorAll('[data-pad]');
    const countEl = mount.querySelector('[data-role="count"]');
    const resultEl = mount.querySelector('[data-role="result"]');
    let running = true;

    function flash(padId, cls) {
      const el = mount.querySelector(`[data-pad="${padId}"]`);
      if (!el) return;
      el.classList.add(cls);
      setTimeout(() => el.classList.remove(cls), showSpeed * 0.7);
    }

    function playback(seq, i, done) {
      if (!running) return;
      if (i >= seq.length) {
        done();
        return;
      }
      flash(seq[i], 'sequence-game__pad--show');
      setTimeout(() => playback(seq, i + 1, done), showSpeed);
    }

    function startAttempt() {
      const length = Math.min(baseLength + attemptIndex, 9);
      sequence = Array.from({ length }).map(() => Game.utils.randChoice(PADS));
      inputIndex = 0;
      accepting = false;
      countEl.textContent = String(attemptIndex + 1);
      resultEl.textContent = 'Watch...';
      setTimeout(() => playback(sequence, 0, () => {
        accepting = true;
        resultEl.textContent = 'Your turn!';
      }), 400);
    }

    function finishAttempt(correctCount) {
      // A concave curve instead of a straight percentage — stumbling
      // partway through a sequence now costs disproportionately more
      // than it used to, instead of near-linear partial credit.
      const ratio = correctCount / sequence.length;
      const score = Math.round(Math.pow(ratio, 1.6) * 100);
      scores.push(score);
      resultEl.textContent = score >= 85 ? 'Perfect recall!' : score >= 60 ? 'Good' : score >= 30 ? 'Shaky' : 'Lost it';
      if (onAttempt) onAttempt(score, attemptIndex);
      attemptIndex++;
      if (attemptIndex >= attempts) {
        running = false;
        const avg = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
        setTimeout(() => onComplete && onComplete(avg, scores.slice()), 600);
      } else {
        setTimeout(() => running && startAttempt(), 700);
      }
    }

    function handlePad(e) {
      if (!accepting || !running) return;
      const padId = e.currentTarget.dataset.pad;
      flash(padId, 'sequence-game__pad--hit');
      const correct = padId === sequence[inputIndex];
      if (!correct) {
        accepting = false;
        finishAttempt(inputIndex); // partial credit for how far they got
        return;
      }
      inputIndex++;
      if (inputIndex >= sequence.length) {
        accepting = false;
        finishAttempt(sequence.length);
      }
    }

    padsEl.forEach((el) => el.addEventListener('click', handlePad));
    startAttempt();

    return {
      cancel() {
        running = false;
      },
    };
  }

  Game.minigames = Game.minigames || {};
  Game.minigames.sequenceGame = { run };
})(window.Game = window.Game || {});
