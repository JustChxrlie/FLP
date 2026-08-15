/**
 * storage.js
 * localStorage persistence with support for multiple save slots.
 * Knows nothing about UI; it only reads/writes/serializes data.
 */
(function (Game) {
  const Storage = {};

  function keyFor(slotId) {
    return `${Game.CONFIG.SAVE_KEY_PREFIX}${slotId}`;
  }

  /** Returns summarized info for every slot (used and empty). */
  Storage.listSlots = function () {
    const slots = [];
    for (let i = 1; i <= Game.CONFIG.MAX_SAVE_SLOTS; i++) {
      const raw = localStorage.getItem(keyFor(i));
      if (!raw) {
        slots.push({ slotId: i, empty: true });
        continue;
      }
      try {
        const data = JSON.parse(raw);
        slots.push({
          slotId: i,
          empty: false,
          playerName: data.player ? `${data.player.firstName} ${data.player.lastName}` : 'Unnamed career',
          position: data.player ? data.player.position : null,
          age: data.career ? data.career.currentAge : null,
          year: data.career ? data.career.currentYear : null,
          updatedAt: data.meta ? data.meta.updatedAt : null,
        });
      } catch (err) {
        console.error(`[Storage] Slot ${i} is corrupted, marking as empty.`, err);
        slots.push({ slotId: i, empty: true, corrupted: true });
      }
    }
    return slots;
  };

  /** Saves the current state (Game.state) into the given slot. */
  Storage.save = function (slotId, state) {
    state.meta.slotId = slotId;
    state.meta.updatedAt = new Date().toISOString();
    if (!state.meta.createdAt) state.meta.createdAt = state.meta.updatedAt;
    try {
      localStorage.setItem(keyFor(slotId), JSON.stringify(state));
      return true;
    } catch (err) {
      console.error('[Storage] Save error:', err);
      return false;
    }
  };

  /** Loads the state from a slot. Returns null if missing or corrupted. */
  Storage.load = function (slotId) {
    const raw = localStorage.getItem(keyFor(slotId));
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch (err) {
      console.error('[Storage] Load error:', err);
      return null;
    }
  };

  /** Deletes a saved career. */
  Storage.delete = function (slotId) {
    localStorage.removeItem(keyFor(slotId));
  };

  /** Theme preference (independent from save slots). */
  Storage.getTheme = function () {
    return localStorage.getItem(Game.CONFIG.THEME_STORAGE_KEY) || 'dark';
  };

  Storage.setTheme = function (theme) {
    localStorage.setItem(Game.CONFIG.THEME_STORAGE_KEY, theme);
  };

  Game.storage = Storage;
})(window.Game = window.Game || {});
