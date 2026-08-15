/**
 * Fixes (Phase 10): the old version attached its footer-button listeners
 * synchronously (fine) but every screen that needed *body* interactivity
 * (training, shop, standings, tryouts, transitions...) queried the DOM and
 * attached listeners inside a `setTimeout(..., 30)`. If the user tapped a
 * button before that timer fired — very possible on a slower device, or
 * right after a heavy synchronous simulation step — the tap landed on an
 * element with no listener yet and silently did nothing, which is exactly
 * the "popup shows up but I can't press anything" bug. There was also a
 * closing race: `close()` hid the overlay on a one-shot `transitionend`
 * listener, but if a new modal was opened while that listener was still
 * pending (e.g. two flows chained back-to-back), the stale listener could
 * fire *after* the new modal was already open and yank `hidden = true` out
 * from under it, or leave it stuck non-interactive.
 *
 * Fix: (1) bodyEl gets ONE delegated click listener, installed once, that
 * dispatches to whatever `onAction` the currently-open modal registered —
 * so a caller's buttons work the instant `open()` returns, no timer, no
 * race. (2) Closing uses a generation counter instead of a one-shot
 * transitionend listener, so a stale close can never hide a modal that has
 * since been reopened.
 *
 * Usage:
 *   Game.ui.modal.open({ title, bodyHTML, actions, onAction });
 *   // bodyHTML can include elements with data-action="foo" data-x="1" —
 *   // clicking them calls onAction('foo', el, event).
 *   Game.ui.modal.getBodyEl() / getFooterEl() — for callers (like the
 *   interactive minigames) that need to mount richer, self-managed widgets
 *   directly into the modal body.
 */
(function (Game) {
  let overlayEl, dialogEl, titleEl, bodyEl, footerEl;
  let openGen = 0;
  let closeTimer = null;
  let currentOnAction = null;

  function ensureNodes() {
    if (overlayEl) return;
    overlayEl = document.getElementById('modal-overlay');
    dialogEl = overlayEl.querySelector('.modal');
    titleEl = overlayEl.querySelector('.modal__title');
    bodyEl = overlayEl.querySelector('.modal__body');
    footerEl = overlayEl.querySelector('.modal__footer');

    overlayEl.addEventListener('click', (e) => {
      if (e.target === overlayEl) close();
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !overlayEl.hidden) close();
    });

    // Delegated body-click handling: installed exactly once, so it can
    // never be duplicated by re-rendering a modal's body, and it's live
    // before any bodyHTML is ever injected — no attach-after-render race.
    bodyEl.addEventListener('click', (e) => {
      if (!currentOnAction) return;
      const target = e.target.closest('[data-action]');
      if (!target || !bodyEl.contains(target)) return;
      currentOnAction(target.dataset.action, target, e);
    });
  }

  function open({ title, bodyHTML, actions = [], onAction = null }) {
    ensureNodes();
    openGen += 1;
    const myGen = openGen;
    if (closeTimer) {
      clearTimeout(closeTimer);
      closeTimer = null;
    }

    titleEl.textContent = title;
    bodyEl.innerHTML = bodyHTML;
    footerEl.innerHTML = '';
    currentOnAction = onAction;

    actions.forEach((action) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = `btn ${action.variant ? `btn--${action.variant}` : 'btn--ghost'}`;
      btn.textContent = action.label;
      btn.addEventListener('click', () => {
        if (action.onClick) action.onClick();
        // Only auto-close THIS modal if nothing newer opened while onClick
        // ran. A handler that itself calls open() (chaining to the next
        // event/tournament/round/etc.) bumps openGen past myGen — in that
        // case the "trailing" auto-close here must NOT fire, or it would
        // close the modal that onClick just opened instead of this one.
        if (action.closeOnClick !== false && myGen === openGen) close();
      });
      footerEl.appendChild(btn);
    });

    overlayEl.hidden = false;
    // Always re-trigger the show transition, even if a close was mid-flight —
    // removing then re-adding the class on the next frame guarantees the
    // browser treats it as a fresh transition rather than a no-op.
    overlayEl.classList.remove('modal-overlay--visible');
    requestAnimationFrame(() => {
      if (myGen !== openGen) return; // superseded before the frame ran
      overlayEl.classList.add('modal-overlay--visible');
    });
  }

  function close() {
    if (!overlayEl || overlayEl.hidden) return;
    const myGen = openGen;
    overlayEl.classList.remove('modal-overlay--visible');
    if (closeTimer) clearTimeout(closeTimer);
    // A fixed timer (matching the CSS transition length) instead of a
    // one-shot transitionend listener: transitionend simply never fires if
    // there was nothing to transition (e.g. closing immediately after
    // opening), which used to leave the overlay invisible-but-not-hidden —
    // present in the DOM, intercepting clicks, but showing nothing.
    closeTimer = setTimeout(() => {
      closeTimer = null;
      if (myGen !== openGen) return; // a newer modal opened meanwhile
      overlayEl.hidden = true;
      currentOnAction = null;
    }, 260);
  }

  function isOpen() {
    return !!overlayEl && !overlayEl.hidden;
  }

  Game.ui = Game.ui || {};
  Game.ui.modal = {
    open,
    close,
    isOpen,
    getBodyEl: () => (ensureNodes(), bodyEl),
    getFooterEl: () => (ensureNodes(), footerEl),
  };
})(window.Game = window.Game || {});
