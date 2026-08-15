/**
 * eventBus.js
 * Simple pub/sub event bus used to decouple systems.
 * Usage:
 *   Game.events.on('season:started', (data) => { ... });
 *   Game.events.emit('season:started', { year: 2031 });
 */
(function (Game) {
  function createEventBus() {
    const listeners = {};

    function on(eventName, callback) {
      if (!listeners[eventName]) listeners[eventName] = [];
      listeners[eventName].push(callback);
      return () => off(eventName, callback); // returns an unsubscribe function
    }

    function off(eventName, callback) {
      if (!listeners[eventName]) return;
      listeners[eventName] = listeners[eventName].filter((cb) => cb !== callback);
    }

    function emit(eventName, payload) {
      if (!listeners[eventName]) return;
      // defensive copy in case a callback unsubscribes during emission
      [...listeners[eventName]].forEach((cb) => {
        try {
          cb(payload);
        } catch (err) {
          console.error(`[EventBus] Error in listener for "${eventName}":`, err);
        }
      });
    }

    return { on, off, emit };
  }

  Game.events = createEventBus();
})(window.Game = window.Game || {});
