/**
 * screenManager.js
 */
(function (Game) {
  function show(screenId, opts) {
    opts = opts || {};
    var root = document.getElementById('app-root');
    if (!root) return;
    var sections = root.querySelectorAll('[data-screen]');
    sections.forEach(function (section) {
      var isTarget = section.getAttribute('data-screen') === screenId;
      if (isTarget) {
        section.hidden = false;
        section.removeAttribute('hidden');
        section.classList.add('screen--active');
      } else {
        section.classList.remove('screen--active');
        section.hidden = true;
      }
    });
    if (Game.events) Game.events.emit('screen:changed', { screenId: screenId });
  }

  Game.ui = Game.ui || {};
  Game.ui.screens = { show: show };
})(window.Game = window.Game || {});
