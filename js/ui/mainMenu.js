/**
 * mainMenu.js
 * Controls the main menu screen: the list of save slots, starting a new
 * career, loading a save, and access to settings.
 */
(function (Game) {
  function slotCardHTML(slot) {
    if (slot.empty) {
      return `
        <article class="save-card save-card--empty" data-slot="${slot.slotId}">
          <div class="save-card__icon">+</div>
          <div class="save-card__text">
            <span class="save-card__title">Empty Slot ${slot.slotId}</span>
            <span class="save-card__subtitle">Start a new career</span>
          </div>
        </article>`;
    }
    const updated = slot.updatedAt
      ? new Date(slot.updatedAt).toLocaleDateString('en-US', { day: '2-digit', month: 'short' })
      : '';
    const posLabel =
      Game.CONFIG.POSITIONS.find((p) => p.id === slot.position)?.label || slot.position || '';
    return `
      <article class="save-card" data-slot="${slot.slotId}">
        <div class="save-card__avatar" aria-hidden="true">🏒</div>
        <div class="save-card__text">
          <span class="save-card__title">${slot.playerName}</span>
          <span class="save-card__subtitle">${posLabel} · Age ${slot.age ?? '?'} · ${
      slot.year ?? '—'
    }</span>
        </div>
        <div class="save-card__meta">
          <span class="save-card__updated">Saved ${updated}</span>
          <button class="icon-btn save-card__delete" title="Delete career" data-action="delete-slot" data-slot="${
            slot.slotId
          }" aria-label="Delete career in slot ${slot.slotId}">🗑</button>
        </div>
      </article>`;
  }

  function renderSlots() {
    const list = document.getElementById('save-slot-list');
    const slots = Game.storage.listSlots();
    list.innerHTML = slots.map(slotCardHTML).join('');

    list.querySelectorAll('.save-card').forEach((card) => {
      card.addEventListener('click', (e) => {
        if (e.target.closest('[data-action="delete-slot"]')) return; // handled separately
        const slotId = Number(card.dataset.slot);
        const slotInfo = slots.find((s) => s.slotId === slotId);
        if (slotInfo.empty) {
          startNewCareer(slotId);
        } else {
          loadCareer(slotId);
        }
      });
    });

    list.querySelectorAll('[data-action="delete-slot"]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const slotId = Number(btn.dataset.slot);
        confirmDeleteSlot(slotId);
      });
    });
  }

  function confirmDeleteSlot(slotId) {
    Game.ui.modal.open({
      title: 'Delete career',
      bodyHTML: `<p>This will permanently delete the career saved in slot ${slotId}. This can't be undone.</p>`,
      actions: [
        { label: 'Cancel', variant: 'ghost' },
        {
          label: 'Delete',
          variant: 'danger',
          onClick: () => {
            Game.storage.delete(slotId);
            renderSlots();
            Game.ui.toast.show('Career deleted', { type: 'info' });
          },
        },
      ],
    });
  }

  function startNewCareer(slotId) {
    Game.pendingSlotId = slotId;
    Game.ui.playerCreation.open();
  }

  function loadCareer(slotId) {
    try {
      const data = Game.storage.load(slotId);
      if (!data || !data.player) {
        Game.ui.toast.show('Could not load this career', { type: 'error' });
        return;
      }
      Game.state = data;
      if (Game.systems.worldAI && (!data.world || !data.world.initialized)) {
        try { Game.systems.worldAI.ensureWorld(data); } catch (e) { console.warn(e); }
      }
      Game.ui.screens.show('career-hub', { instant: true });
      Game.ui.careerHub.render(data);
      const name = data.player.firstName || 'player';
      Game.ui.toast.show('Welcome back, ' + name, { type: 'success' });
    } catch (err) {
      console.error('[Load]', err);
      Game.ui.toast.show('Load failed: ' + (err.message || 'error'), { type: 'error', duration: 5000 });
    }
  }

  function openSettings() {
    const currentTheme = Game.storage.getTheme();
    const audio = Game.audio.getSettings();
    const musicPct = Math.round(audio.music * 100);
    const sfxPct = Math.round(audio.sfx * 100);
    Game.ui.modal.open({
      title: 'Settings',
      bodyHTML: `
        <div class="settings-row">
          <span>Theme</span>
          <div class="segmented" data-role="theme-segmented">
            <button class="segmented__option ${
              currentTheme === 'dark' ? 'segmented__option--active' : ''
            }" data-theme="dark">Dark</button>
            <button class="segmented__option ${
              currentTheme === 'light' ? 'segmented__option--active' : ''
            }" data-theme="light">Light</button>
          </div>
        </div>
        <div class="settings-row">
          <span>Music <em id="set-music-label">${musicPct}%</em></span>
          <input type="range" id="set-music" min="0" max="100" value="${musicPct}" />
        </div>
        <div class="settings-row">
          <span>Sound effects <em id="set-sfx-label">${sfxPct}%</em></span>
          <input type="range" id="set-sfx" min="0" max="100" value="${sfxPct}" />
        </div>
        <div class="settings-row">
          <span>Mute all</span>
          <label><input type="checkbox" id="set-mute" ${audio.muted ? 'checked' : ''}/> Muted</label>
        </div>
        <p class="settings-note">Audio uses synthesized SFX (no external files).</p>
      `,
      actions: [
        {
          label: 'Test SFX',
          variant: 'ghost',
          closeOnClick: false,
          onClick: () => { Game.audio.ensureCtx(); Game.audio.play('notify'); },
        },
        { label: 'Close', variant: 'primary' },
      ],
    });

    document.querySelectorAll('[data-role="theme-segmented"] .segmented__option').forEach((btn) => {
      btn.addEventListener('click', () => {
        Game.ui.theme.set(btn.dataset.theme);
        document
          .querySelectorAll('[data-role="theme-segmented"] .segmented__option')
          .forEach((b) => b.classList.remove('segmented__option--active'));
        btn.classList.add('segmented__option--active');
        Game.audio.play('click');
      });
    });

    const musicEl = document.getElementById('set-music');
    const sfxEl = document.getElementById('set-sfx');
    const muteEl = document.getElementById('set-mute');
    if (musicEl) {
      musicEl.addEventListener('input', () => {
        const v = Number(musicEl.value) / 100;
        Game.audio.saveSettings({ music: v });
        const lbl = document.getElementById('set-music-label');
        if (lbl) lbl.textContent = musicEl.value + '%';
        Game.audio.startMusic();
      });
    }
    if (sfxEl) {
      sfxEl.addEventListener('input', () => {
        const v = Number(sfxEl.value) / 100;
        Game.audio.saveSettings({ sfx: v });
        const lbl = document.getElementById('set-sfx-label');
        if (lbl) lbl.textContent = sfxEl.value + '%';
        Game.audio.play('click');
      });
    }
    if (muteEl) {
      muteEl.addEventListener('change', () => {
        Game.audio.saveSettings({ muted: muteEl.checked });
        if (muteEl.checked) Game.audio.stopMusic();
        else Game.audio.startMusic();
      });
    }
  }

  function init() {
    renderSlots();
    document.getElementById('btn-settings').addEventListener('click', openSettings);
    document.getElementById('btn-about').addEventListener('click', () => {
      Game.ui.modal.open({
        title: 'Frozen Legacy',
        bodyHTML: `
          <p>Live the full career of a professional hockey player: from youth skates
          to retirement, through juniors, the draft, the minors, and the NHL.</p>
          <p class="settings-note">Version ${Game.CONFIG.VERSION} — Phase 10 polishe by phase.</p>
        `,
        actions: [{ label: 'Got it', variant: 'primary' }],
      });
    });
  }

  Game.ui = Game.ui || {};
  Game.ui.mainMenu = { init, renderSlots };
})(window.Game = window.Game || {});
