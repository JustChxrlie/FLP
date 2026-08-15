/**
 * draftAnimations.js
 * Visual animations and effects for draft events (USHL, CHL, NHL).
 * Handles the visual presentation of being drafted and the celebration/reaction.
 */
(function (Game) {
  /**
   * Creates a draft animation sequence
   * @param {object} opts - Animation options
   * @returns {object} Animation handle with cancel() method
   */
  function runDraftAnimation(opts) {
    const {
      mount,
      leagueId,
      teamName,
      round,
      pick,
      playerName,
      onComplete
    } = opts || {};

    if (!mount) {
      if (onComplete) onComplete();
      return { cancel() {} };
    }

    let running = true;
    mount.innerHTML = '';

    const container = document.createElement('div');
    container.className = 'draft-animation';
    container.style.cssText = `
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 300px;
      background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
      border-radius: 8px;
      padding: 40px;
      color: white;
      font-family: Arial, sans-serif;
      text-align: center;
    `;

    // Phase 1: Announce league
    const leagueInfo = document.createElement('div');
    leagueInfo.style.cssText = `
      opacity: 0;
      transition: opacity 0.5s ease-in;
      margin-bottom: 20px;
    `;
    leagueInfo.innerHTML = `<h2 style="font-size: 28px; margin: 0; color: #ffd700;">${getLeagueName(leagueId)}</h2>`;
    container.appendChild(leagueInfo);

    // Phase 2: Player name
    const playerInfo = document.createElement('div');
    playerInfo.style.cssText = `
      opacity: 0;
      transition: opacity 0.5s ease-in;
      margin: 20px 0;
    `;
    playerInfo.innerHTML = `<h1 style="font-size: 48px; margin: 0; color: #00ff00;">${playerName}</h1>`;
    container.appendChild(playerInfo);

    // Phase 3: Draft details
    const draftDetails = document.createElement('div');
    draftDetails.style.cssText = `
      opacity: 0;
      transition: opacity 0.5s ease-in;
      margin: 20px 0;
      font-size: 20px;
    `;
    const detailsText = round ? `Round ${round}, Pick ${pick}` : 'Drafted';
    draftDetails.innerHTML = `<p style="margin: 10px 0;">${detailsText}</p><p style="font-size: 24px; color: #0099ff; margin: 10px 0;">${teamName}</p>`;
    container.appendChild(draftDetails);

    // Phase 4: Celebration
    const celebration = document.createElement('div');
    celebration.style.cssText = `
      opacity: 0;
      transition: opacity 0.5s ease-in;
      margin-top: 30px;
      font-size: 24px;
    `;
    celebration.innerHTML = `<p>🎉 Congratulations! 🎉</p><p>Your professional journey begins!</p>`;
    container.appendChild(celebration);

    mount.appendChild(container);

    // Trigger animations in sequence
    let phase = 0;
    const elements = [leagueInfo, playerInfo, draftDetails, celebration];

    const animationInterval = setInterval(() => {
      if (!running) {
        clearInterval(animationInterval);
        return;
      }

      if (phase < elements.length) {
        elements[phase].style.opacity = '1';
        phase++;
      } else {
        clearInterval(animationInterval);
        if (onComplete) {
          setTimeout(onComplete, 1000);
        }
      }
    }, 800);

    return {
      cancel() {
        running = false;
        clearInterval(animationInterval);
        mount.innerHTML = '';
      }
    };
  }

  /**
   * Creates NCAA commitment animation
   * @param {object} opts - Animation options
   * @returns {object} Animation handle
   */
  function runNCAACommitmentAnimation(opts) {
    const {
      mount,
      playerName,
      schoolName,
      conference,
      onComplete
    } = opts || {};

    if (!mount) {
      if (onComplete) onComplete();
      return { cancel() {} };
    }

    let running = true;
    mount.innerHTML = '';

    const container = document.createElement('div');
    container.className = 'ncaa-animation';
    container.style.cssText = `
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 300px;
      background: linear-gradient(135deg, #001a66 0%, #003d99 100%);
      border-radius: 8px;
      padding: 40px;
      color: white;
      font-family: Arial, sans-serif;
      text-align: center;
    `;

    // School commitment
    const schoolInfo = document.createElement('div');
    schoolInfo.style.cssText = `
      opacity: 0;
      transition: opacity 0.5s ease-in;
      margin-bottom: 20px;
    `;
    schoolInfo.innerHTML = `<p style="font-size: 18px; margin: 0; color: #ffcc00;">NCAA Commitment</p><h2 style="font-size: 32px; margin: 10px 0; color: #ffd700;">${schoolName}</h2>`;
    container.appendChild(schoolInfo);

    // Player name
    const playerInfo = document.createElement('div');
    playerInfo.style.cssText = `
      opacity: 0;
      transition: opacity 0.5s ease-in;
      margin: 20px 0;
    `;
    playerInfo.innerHTML = `<h1 style="font-size: 44px; margin: 0; color: #ffffff;">${playerName}</h1>`;
    container.appendChild(playerInfo);

    // Conference info
    const confInfo = document.createElement('div');
    confInfo.style.cssText = `
      opacity: 0;
      transition: opacity 0.5s ease-in;
      margin: 20px 0;
      font-size: 18px;
    `;
    confInfo.innerHTML = `<p style="margin: 10px 0;">${conference}</p><p style="font-size: 16px; color: #cccccc;">Full Scholarship</p>`;
    container.appendChild(confInfo);

    // Celebration
    const celebration = document.createElement('div');
    celebration.style.cssText = `
      opacity: 0;
      transition: opacity 0.5s ease-in;
      margin-top: 30px;
      font-size: 24px;
    `;
    celebration.innerHTML = `<p>✅ Welcome to College Hockey! ✅</p><p>Your NCAA career awaits!</p>`;
    container.appendChild(celebration);

    const elements = [schoolInfo, playerInfo, confInfo, celebration];
    let phase = 0;

    const animationInterval = setInterval(() => {
      if (!running) {
        clearInterval(animationInterval);
        return;
      }

      if (phase < elements.length) {
        elements[phase].style.opacity = '1';
        phase++;
      } else {
        clearInterval(animationInterval);
        if (onComplete) {
          setTimeout(onComplete, 1000);
        }
      }
    }, 800);

    return {
      cancel() {
        running = false;
        clearInterval(animationInterval);
        mount.innerHTML = '';
      }
    };
  }

  /**
   * Gets league-specific draft information
   * @param {string} leagueId - League ID
   * @returns {object} League info
   */
  function getLeagueDraftInfo(leagueId) {
    const info = {
      USHL: {
        name: 'USHL Draft',
        color: '#ff6600',
        description: 'United States Hockey League Selection'
      },
      CHL: {
        name: 'CHL Draft',
        color: '#cc0000',
        description: 'Canadian Hockey League Selection'
      },
      NHL: {
        name: 'NHL Entry Draft',
        color: '#0033cc',
        description: 'National Hockey League Selection'
      }
    };
    return info[leagueId] || info.NHL;
  }

  /**
   * Gets league name for display
   * @param {string} leagueId - League ID
   * @returns {string} Display name
   */
  function getLeagueName(leagueId) {
    const names = {
      USHL: '🇺🇸 USHL Draft',
      CHL: '🇨🇦 CHL Draft',
      NHL: '🏒 NHL Entry Draft'
    };
    return names[leagueId] || 'Draft Event';
  }

  /**
   * Creates a draft card showing options before draft
   * @param {object} opts - Options for the card
   * @returns {HTMLElement} Card element
   */
  function createDraftPreCard(opts) {
    const {
      playerOvr,
      draftPrediction,
      leagueId
    } = opts || {};

    const card = document.createElement('div');
    card.className = 'draft-prediction-card';
    card.style.cssText = `
      background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
      border: 2px solid #ffd700;
      border-radius: 8px;
      padding: 20px;
      margin: 20px 0;
      color: white;
      font-family: Arial, sans-serif;
    `;

    const info = getLeagueDraftInfo(leagueId);
    card.innerHTML = `
      <h3 style="margin-top: 0; color: ${info.color};">${info.name}</h3>
      <p><strong>Your Overall Rating:</strong> ${playerOvr}/99</p>
      <p><strong>Draft Prediction:</strong> ${draftPrediction}</p>
      <p><em>${info.description}</em></p>
    `;

    return card;
  }

  Game.animations = Game.animations || {};
  Game.animations.draftAnimations = {
    runDraftAnimation,
    runNCAACommitmentAnimation,
    getLeagueDraftInfo,
    getLeagueName,
    createDraftPreCard
  };
})(window.Game = window.Game || {});
