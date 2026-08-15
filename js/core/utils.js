/**
 * utils.js
 * Generic, dependency-free helper functions.
 */
(function (Game) {
  const Utils = {};

  /** Random integer between min and max, inclusive. */
  Utils.randInt = function (min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  };

  /** Random element from an array. */
  Utils.randChoice = function (arr) {
    return arr[Utils.randInt(0, arr.length - 1)];
  };

  /** Clamps a value between a minimum and a maximum. */
  Utils.clamp = function (value, min, max) {
    return Math.min(Math.max(value, min), max);
  };

  /** Generates a simple unique id (good enough for this app, no external deps). */
  Utils.uid = function (prefix = 'id') {
    return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  };

  /** Formats a number as money (USD, no decimals). */
  Utils.formatMoney = function (amount) {
    const sign = amount < 0 ? '-' : '';
    const abs = Math.abs(Math.round(amount));
    return `${sign}$${abs.toLocaleString('en-US')}`;
  };

  /** Formats a season year into a readable label. */
  Utils.formatSeasonLabel = function (year) {
    return `${year}-${(year + 1).toString().slice(-2)} Season`;
  };

  /** Generic debounce. */
  Utils.debounce = function (fn, wait) {
    let t;
    return (...args) => {
      clearTimeout(t);
      t = setTimeout(() => fn(...args), wait);
    };
  };

  Game.utils = Utils;
})(window.Game = window.Game || {});
