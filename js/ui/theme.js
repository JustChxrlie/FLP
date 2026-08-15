/**
 * theme.js
 * Aplica y persiste el tema visual (oscuro/claro) vía atributo data-theme en <html>.
 */
(function (Game) {
  function set(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    Game.storage.setTheme(theme);
  }

  function init() {
    set(Game.storage.getTheme());
  }

  Game.ui = Game.ui || {};
  Game.ui.theme = { set, init };
})(window.Game = window.Game || {});
