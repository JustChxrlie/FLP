/**
 * main.js — bootstrap resiliente
 */
(function (Game) {
  function showBootError(err) {
    console.error('[Frozen Legacy] Boot error', err);
    var root = document.getElementById('app-root');
    if (!root) return;
    var box = document.createElement('div');
    box.style.cssText =
      'position:fixed;inset:0;z-index:99999;background:#0a0e14;color:#eef2f7;padding:24px;font-family:system-ui;overflow:auto';
    box.innerHTML =
      '<h1 style="color:#e6455d">Frozen Legacy — Error</h1>' +
      '<p>Couldnt start. Open the console (F12) for more details.</p>' +
      '<pre style="background:#11161f;padding:12px;border-radius:8px;white-space:pre-wrap">' +
      String(err && (err.stack || err.message || err)) +
      '</pre>' +
      '<p style="opacity:.7;margin-top:16px">Consejo: sirve la carpeta con un servidor local<br>' +
      '<code>npx serve .</code> o <code>python3 -m http.server</code> y abre http://localhost</p>';
    document.body.appendChild(box);
  }

  function boot() {
    try {
      if (!Game || !Game.ui) throw new Error('Game.ui no cargó. Revisa que todos los JS estén en /js');
      Game.ui.theme.init();
      Game.ui.mainMenu.init();
      Game.ui.playerCreation.init();
      Game.ui.careerHub.init();
      Game.ui.screens.show('main-menu', { instant: true });

      if (Game.events) {
        Game.events.on('screen:changed', function (p) {
          console.debug('[Game] Screen:', p.screenId);
        });
      }

      var unlock = function () {
        if (Game.audio) {
          try {
            Game.audio.ensureCtx();
            Game.audio.startMusic();
          } catch (e) {}
        }
        window.removeEventListener('pointerdown', unlock);
      };
      window.addEventListener('pointerdown', unlock);

      var ver = document.getElementById('version-label');
      if (ver && Game.CONFIG) ver.textContent = Game.CONFIG.VERSION;

      console.info('%c' + Game.CONFIG.GAME_TITLE + ' v' + Game.CONFIG.VERSION, 'color:#4fd8eb;font-weight:bold;');
    } catch (err) {
      showBootError(err);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})(window.Game = window.Game || {});
