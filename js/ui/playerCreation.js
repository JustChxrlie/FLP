/**
 * playerCreation.js
 * Controls the real player-creation screen (Phase 3):
 * personal info → position → generated attributes → confirm.
 * On confirm, builds the full Game.state and saves it into the
 * pending slot (Game.pendingSlotId), then navigates to the career hub.
 */
(function (Game) {
  let draft = null; // { firstName, lastName, countryCode, hand, position, archetypeId, potentialTier, attributes, potential, scouting, archetype }

  function resetDraft() {
    draft = {
      firstName: '',
      lastName: '',
      countryCode: Game.data.countries[0].code,
      stateCode: null,
      hand: 'R',
      position: null,
      archetypeId: null,
      potentialTier: 'prospect',
      attributes: null,
      potential: null,
      scouting: null,
      archetype: null,
    };
  }

  function els() {
    return {
      firstName: document.getElementById('pc-first-name'),
      lastName: document.getElementById('pc-last-name'),
      country: document.getElementById('pc-country'),
      stateField: document.getElementById('pc-state-field'),
      state: document.getElementById('pc-state'),
      handButtons: document.querySelectorAll('#pc-hand-segmented .segmented__option'),
      randomNameBtn: document.getElementById('pc-random-name'),
      positionGrid: document.getElementById('pc-position-grid'),
      archetypeGrid: document.getElementById('pc-archetype-grid'),
      potentialGrid: document.getElementById('pc-potential-grid'),
      attributesPanel: document.getElementById('pc-attributes-panel'),
      attributesGrid: document.getElementById('pc-attributes-grid'),
      scoutBadge: document.getElementById('pc-scout-badge'),
      archetypeLabel: document.getElementById('pc-archetype-label'),
      rerollBtn: document.getElementById('pc-reroll'),
      confirmBtn: document.getElementById('pc-confirm'),
      cancelBtn: document.getElementById('pc-cancel'),
      errorText: document.getElementById('pc-error'),
    };
  }

/** State/Region picker dynamic based on the selected country. */
function renderCountryOptions() {
    const { country } = els();
    country.innerHTML = Game.data.countries
      .map((c) => `<option value="${c.code}">${c.name}</option>`)
      .join('');
    country.value = draft.countryCode;
  }

  /** State/Region picker dynamic based on the selected country. */
  function renderStateOptions() {
    const { stateField, state } = els();
    
    // Obtenemos los estados/regiones correspondientes al país seleccionado
    const countryStates = Game.data.statesByCountry && Game.data.statesByCountry[draft.countryCode];
    const hasStates = countryStates && countryStates.length > 0;

    // Ocultamos el campo si el país seleccionado no tiene estados/regiones registrados
    stateField.hidden = !hasStates;
    
    if (!hasStates) {
      draft.stateCode = null;
      state.innerHTML = '';
      return;
    }

    // Renderizamos las opciones correspondientes al país actual
    state.innerHTML = countryStates
      .map((s) => `<option value="${s.code}">${s.name}</option>`)
      .join('');

    // Validamos si el estado actual pertenece a este país, si no, seleccionamos el primero por defecto
    const isValidState = countryStates.some((s) => s.code === draft.stateCode);
    if (!isValidState || !draft.stateCode) {
      draft.stateCode = countryStates[0].code;
    }
    
    state.value = draft.stateCode;
  }

  
  function renderPositionGrid() {
    const { positionGrid } = els();
    positionGrid.innerHTML = Game.CONFIG.POSITIONS.map(
      (p) => `
      <button type="button" class="position-card ${
        draft.position === p.id ? 'position-card--active' : ''
      }" data-position="${p.id}">
        <span class="position-card__code">${p.id}</span>
        <span class="position-card__label">${p.label}</span>
      </button>`
    ).join('');

    positionGrid.querySelectorAll('.position-card').forEach((btn) => {
      btn.addEventListener('click', () => {
        draft.position = btn.dataset.position;
        // Archetype options depend on position (goalie vs skater) — reset to the first one available.
        draft.archetypeId = Game.player.attributes.archetypesFor(draft.position)[0].id;
        regenerateAttributes();
        renderPositionGrid();
        renderArchetypeGrid();
        renderPotentialGrid();
        renderAttributes();
        validate();
      });
    });
  }

  function renderArchetypeGrid() {
    const { archetypeGrid } = els();
    if (!draft.position) {
      archetypeGrid.innerHTML = `<p class="settings-note">Pick a position first.</p>`;
      return;
    }
    const options = Game.player.attributes.archetypesFor(draft.position);
    archetypeGrid.innerHTML = options
      .map(
        (a) => `
      <button type="button" class="archetype-card ${draft.archetypeId === a.id ? 'archetype-card--active' : ''}" data-archetype="${a.id}">
        <span class="archetype-card__label">${a.label}</span>
        <span class="archetype-card__hint">${a.hint}</span>
      </button>`
      )
      .join('');

    archetypeGrid.querySelectorAll('.archetype-card').forEach((btn) => {
      btn.addEventListener('click', () => {
        draft.archetypeId = btn.dataset.archetype;
        regenerateAttributes();
        renderArchetypeGrid();
        renderAttributes();
      });
    });
  }

  function renderPotentialGrid() {
    const { potentialGrid } = els();
    const tiers = Game.player.attributes.potentialTiers;
    potentialGrid.innerHTML = tiers
      .map(
        (t) => `
      <button type="button" class="archetype-card ${draft.potentialTier === t.id ? 'archetype-card--active' : ''}" data-potential="${t.id}">
        <span class="archetype-card__label">${t.label}</span>
        <span class="archetype-card__hint">${t.hint}</span>
      </button>`
      )
      .join('');

    potentialGrid.querySelectorAll('.archetype-card').forEach((btn) => {
      btn.addEventListener('click', () => {
        draft.potentialTier = btn.dataset.potential;
        regenerateAttributes();
        renderPotentialGrid();
        renderAttributes();
      });
    });
  }

  function regenerateAttributes() {
    if (!draft.position) return;
    draft.attributes = draft.archetypeId
      ? Game.player.attributes.generateInitialAttributesForArchetype(draft.position, draft.archetypeId)
      : Game.player.attributes.generateInitialAttributes(draft.position);
    draft.potential = Game.player.attributes.generatePotentialForTier(draft.potentialTier);
    draft.scouting = Game.player.attributes.scoutProjection(draft.potential);
    draft.archetype = draft.archetypeId
      ? Game.player.attributes.archetypeLabel(draft.position, draft.archetypeId)
      : Game.player.attributes.deriveArchetype(draft.position, draft.attributes);
  }

  function attributeRowHTML(id, value) {
    const label = Game.player.attributes.labels[id];
    return `
      <div class="attr-row">
        <span class="attr-row__label">${label}</span>
        <div class="progress-bar"><div class="progress-bar__fill" style="width:${value}%"></div></div>
        <span class="attr-row__value">${value}</span>
      </div>`;
  }

  function renderAttributes() {
    const { attributesPanel, attributesGrid, scoutBadge, archetypeLabel } = els();
    if (!draft.position || !draft.attributes) {
      attributesPanel.hidden = true;
      return;
    }
    attributesPanel.hidden = false;
    const schema = Game.player.attributes.schemaFor(draft.position);

    attributesGrid.innerHTML = Object.entries(schema)
      .map(
        ([categoryKey, ids]) => `
        <div class="attr-category">
          <h4 class="attr-category__title">${Game.player.attributes.categoryLabels[categoryKey]}</h4>
          ${ids.map((id) => attributeRowHTML(id, draft.attributes[id])).join('')}
        </div>`
      )
      .join('');

    scoutBadge.textContent = `Scout projection: ${draft.scouting.grade} — ${draft.scouting.label}`;
    archetypeLabel.textContent = `Natural style: ${draft.archetype}`;
  }

  function validate() {
    const { confirmBtn, errorText } = els();
    const problems = [];
    if (!draft.firstName.trim()) problems.push('name');
    if (!draft.lastName.trim()) problems.push('last name');
    if (!draft.position) problems.push('position');

    const valid = problems.length === 0;
    confirmBtn.disabled = !valid;
    errorText.textContent = valid ? '' : `Missing: ${problems.join(', ')}.`;
    return valid;
  }

  function wireBasicInputs() {
    const { firstName, lastName, country, state, handButtons, randomNameBtn } = els();

    firstName.addEventListener('input', (e) => {
      draft.firstName = e.target.value;
      validate();
    });
    lastName.addEventListener('input', (e) => {
      draft.lastName = e.target.value;
      validate();
    });
    country.addEventListener('change', (e) => {
      draft.countryCode = e.target.value;
      draft.stateCode = null;
      renderStateOptions();
    });
    state.addEventListener('change', (e) => {
      draft.stateCode = e.target.value;
    });
    handButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        draft.hand = btn.dataset.hand;
        handButtons.forEach((b) => b.classList.remove('segmented__option--active'));
        btn.classList.add('segmented__option--active');
      });
    });
    randomNameBtn.addEventListener('click', () => {
      const { firstName: fn, lastName: ln } = Game.data.randomName(draft.countryCode);
      draft.firstName = fn;
      draft.lastName = ln;
      firstName.value = fn;
      lastName.value = ln;
      validate();
    });
  }

  function wireActions() {
    const { rerollBtn, confirmBtn, cancelBtn } = els();

    rerollBtn.addEventListener('click', () => {
      regenerateAttributes();
      renderAttributes();
    });

    confirmBtn.addEventListener('click', () => {
      if (!validate()) return;
      confirmCareer();
    });

    cancelBtn.addEventListener('click', () => {
      Game.pendingSlotId = null;
      Game.ui.screens.show('main-menu');
      Game.ui.mainMenu.renderSlots();
    });
  }

  function confirmCareer() {
    try {
      if (!draft.position || !draft.attributes) {
        regenerateAttributes();
      }
      const player = Game.player.createPlayer({
        firstName: draft.firstName.trim(),
        lastName: draft.lastName.trim(),
        countryCode: draft.countryCode,
        stateCode: draft.countryCode === 'US' ? draft.stateCode : null,
        hand: draft.hand,
        position: draft.position,
        archetypeId: draft.archetypeId,
        potentialTier: draft.potentialTier,
      });
      player.attributes = draft.attributes || player.attributes;
      player.potential = draft.potential != null ? draft.potential : player.potential;
      player.attributeCaps = Game.player.attributes.generateAttributeCaps(player.attributes, player.potential);
      player.scouting = draft.scouting || player.scouting;
      player.archetype = draft.archetype || player.archetype;
      if (
        Game.data && Game.data.europeanAcademies && Game.data.europeanAcademies.getAcademy &&
        Game.leagues && Game.leagues.leagueData && Game.leagues.leagueData.isEuropean &&
        Game.leagues.leagueData.isEuropean(draft.countryCode)
      ) {
        player.academy = Game.data.europeanAcademies.getAcademy(draft.countryCode);
      } else {
        player.academy = null;
      }

      const state = Game.createEmptyState();
      state.player = player;
      state.career.currentYear = new Date().getFullYear();
      state.career.currentAge = player.age;
      state.career.stage = 'youth';

      const slotId = Game.pendingSlotId || 1;
      state.meta.slotId = slotId;

      Game.state = state;
      Game.systems.economy.grantStartingMoney(player);
      Game.systems.careerPath.assignStart(state);
      Game.systems.seasonRunner.startNewSeason(state);

      // World can be heavy — init after season so hub appears even if world fails
      try {
        Game.systems.worldAI.ensureWorld(state);
      } catch (worldErr) {
        console.error('[Career] World init failed', worldErr);
      }

      Game.storage.save(slotId, state);
      Game.pendingSlotId = null;

      Game.ui.screens.show('career-hub', { instant: true });
      Game.ui.careerHub.render(state);
      Game.ui.toast.show(player.firstName + ' ' + player.lastName + ' begins their story!', {
        type: 'success',
      });
      if (Game.audio) Game.audio.play('notify');
    } catch (err) {
      console.error('[Career] Start failed', err);
      Game.ui.toast.show('Could not start career: ' + (err && err.message ? err.message : 'unknown error'), {
        type: 'error',
        duration: 5000,
      });
    }
  }

  function init() {
    wireBasicInputs();
    wireActions();
  }

  /** Called every time the screen is entered, so the form always starts clean. */
  function open() {
    resetDraft();
    const { firstName, lastName, handButtons, errorText } = els();
    // Auto-fill random name so user can start faster
    try {
      const rnd = Game.data.randomName(draft.countryCode);
      draft.firstName = rnd.firstName;
      draft.lastName = rnd.lastName;
      firstName.value = rnd.firstName;
      lastName.value = rnd.lastName;
    } catch (e) {
      firstName.value = '';
      lastName.value = '';
    }
    errorText.textContent = '';
    handButtons.forEach((b) => b.classList.toggle('segmented__option--active', b.dataset.hand === draft.hand));
    renderCountryOptions();
    renderStateOptions();
    renderPositionGrid();
    // Default position Center so confirm is enabled after open
    draft.position = 'C';
    draft.archetypeId = Game.player.attributes.archetypesFor(draft.position)[0].id;
    regenerateAttributes();
    renderPositionGrid();
    renderArchetypeGrid();
    renderPotentialGrid();
    renderAttributes();
    validate();
    Game.ui.screens.show('player-creation', { instant: true });
  }

  Game.ui = Game.ui || {};
  Game.ui.playerCreation = { init, open };
})(window.Game = window.Game || {});
