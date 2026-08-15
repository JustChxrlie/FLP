/**
 * audio.js
 * Web Audio API synth SFX + music bed. Volumes driven by settings sliders.
 */
(function (Game) {
  let ctx = null;
  let musicGain = null;
  let sfxGain = null;
  let musicNodes = [];
  let musicPlaying = false;

  const defaults = { music: 0.35, sfx: 0.7, muted: false };

  function ensureCtx() {
    if (ctx) return ctx;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    musicGain = ctx.createGain();
    sfxGain = ctx.createGain();
    musicGain.connect(ctx.destination);
    sfxGain.connect(ctx.destination);
    applyVolumes();
    return ctx;
  }

  function getSettings() {
    try {
      const raw = localStorage.getItem('frozenlegacy_audio');
      if (raw) return { ...defaults, ...JSON.parse(raw) };
    } catch (_) {}
    return { ...defaults };
  }

  function saveSettings(partial) {
    const next = { ...getSettings(), ...partial };
    localStorage.setItem('frozenlegacy_audio', JSON.stringify(next));
    applyVolumes();
    return next;
  }

  function applyVolumes() {
    const s = getSettings();
    if (musicGain) musicGain.gain.value = s.muted ? 0 : s.music;
    if (sfxGain) sfxGain.gain.value = s.muted ? 0 : s.sfx;
  }

  function tone(freq, dur, type, gainNode, vol) {
    const c = ensureCtx();
    if (!c || !gainNode) return;
    if (c.state === 'suspended') c.resume();
    const osc = c.createOscillator();
    const g = c.createGain();
    osc.type = type || 'sine';
    osc.frequency.value = freq;
    g.gain.setValueAtTime((vol || 0.2) * 0.001, c.currentTime);
    g.gain.exponentialRampToValueAtTime(vol || 0.2, c.currentTime + 0.02);
    g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + dur);
    osc.connect(g);
    g.connect(gainNode);
    osc.start();
    osc.stop(c.currentTime + dur + 0.05);
  }

  const SFX = {
    click() {
      tone(600, 0.06, 'square', sfxGain, 0.12);
    },
    goal() {
      tone(440, 0.12, 'sine', sfxGain, 0.25);
      setTimeout(() => tone(554, 0.12, 'sine', sfxGain, 0.22), 80);
      setTimeout(() => tone(659, 0.18, 'sine', sfxGain, 0.2), 160);
    },
    win() {
      [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => tone(f, 0.15, 'triangle', sfxGain, 0.18), i * 90));
    },
    lose() {
      tone(300, 0.2, 'sawtooth', sfxGain, 0.12);
      setTimeout(() => tone(220, 0.3, 'sawtooth', sfxGain, 0.1), 120);
    },
    award() {
      [523, 659, 784, 1047, 1319].forEach((f, i) => setTimeout(() => tone(f, 0.2, 'sine', sfxGain, 0.2), i * 100));
    },
    draft() {
      tone(392, 0.15, 'triangle', sfxGain, 0.2);
      setTimeout(() => tone(523, 0.2, 'triangle', sfxGain, 0.22), 150);
      setTimeout(() => tone(784, 0.35, 'sine', sfxGain, 0.25), 320);
    },
    buy() {
      tone(880, 0.08, 'square', sfxGain, 0.1);
      setTimeout(() => tone(1174, 0.1, 'square', sfxGain, 0.1), 70);
    },
    notify() {
      tone(700, 0.08, 'sine', sfxGain, 0.12);
      setTimeout(() => tone(900, 0.1, 'sine', sfxGain, 0.1), 90);
    },
  };

  function play(name) {
    if (getSettings().muted) return;
    ensureCtx();
    if (SFX[name]) SFX[name]();
  }

  function startMusic() {
    const c = ensureCtx();
    if (!c || musicPlaying) return;
    if (c.state === 'suspended') c.resume();
    musicPlaying = true;
    const notes = [130.81, 164.81, 196.0, 246.94, 261.63, 196.0, 164.81, 146.83];
    let step = 0;
    function tick() {
      if (!musicPlaying) return;
      const s = getSettings();
      if (!s.muted && s.music > 0.01) {
        tone(notes[step % notes.length], 0.45, 'sine', musicGain, 0.08);
        if (step % 4 === 0) tone(notes[step % notes.length] / 2, 0.6, 'triangle', musicGain, 0.05);
      }
      step++;
      const id = setTimeout(tick, 480);
      musicNodes.push(id);
    }
    tick();
  }

  function stopMusic() {
    musicPlaying = false;
    musicNodes.forEach(clearTimeout);
    musicNodes = [];
  }

  Game.audio = {
    play,
    startMusic,
    stopMusic,
    getSettings,
    saveSettings,
    applyVolumes,
    ensureCtx,
  };
})(window.Game = window.Game || {});
