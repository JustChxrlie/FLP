/**
 * attributes.js
 * Defines the attribute schema (different for skaters and goalies) and
 * the generation logic for a brand new 8-year-old player.
 *
 * Design notes:
 * - "Current" attributes start low (he's a kid) and evolve through
 *   training/events in later phases (4, 6, 7).
 * - "Potential" is a hidden ceiling (1-99) that determines how far the
 *   player can grow; the exact number is never shown to the user, only
 *   a "scout projection" with some noise, so the potential system
 *   ("not everyone makes the NHL") isn't 100% predictable.
 */
(function (Game) {
  const SKATER_SCHEMA = {
    physical: ['speed', 'acceleration', 'skating', 'stamina', 'strength', 'balance'],
    technical: ['slapShot', 'wristShot', 'passing', 'vision', 'puckHandling', 'defense', 'shotBlocking'],
    mental: ['aggression', 'discipline', 'leadership', 'confidence', 'mentality', 'professionalism'],
  };

  const GOALIE_SCHEMA = {
    physical: ['reflexes', 'flexibility', 'stamina', 'strength', 'balance'],
    technical: ['positioning', 'reboundControl', 'puckHandling', 'lowBlocking', 'concentration'],
    mental: ['aggression', 'discipline', 'leadership', 'confidence', 'mentality', 'professionalism'],
  };

  const LABELS = {
    speed: 'Speed',
    acceleration: 'Acceleration',
    skating: 'Skating',
    stamina: 'Stamina',
    strength: 'Strength',
    balance: 'Balance',
    slapShot: 'Slap Shot',
    wristShot: 'Wrist Shot',
    passing: 'Passing',
    vision: 'Vision',
    puckHandling: 'Puck Handling',
    defense: 'Defense',
    shotBlocking: 'Shot Blocking',
    aggression: 'Aggression',
    discipline: 'Discipline',
    leadership: 'Leadership',
    confidence: 'Confidence',
    mentality: 'Mentality',
    professionalism: 'Professionalism',
    reflexes: 'Reflexes',
    flexibility: 'Flexibility',
    positioning: 'Positioning',
    reboundControl: 'Rebound Control',
    lowBlocking: 'Low Blocking',
    concentration: 'Concentration',
  };

  const CATEGORY_LABELS = {
    physical: 'Physical',
    technical: 'Technical',
    mental: 'Mental',
  };

  // Attributes that get a small boost depending on position (defines the
  // player's natural archetype, without relying on nationality).
  const POSITION_FOCUS = {
    C: ['vision', 'passing', 'wristShot'],
    LW: ['wristShot', 'speed', 'aggression'],
    RW: ['slapShot', 'speed', 'confidence'],
    D: ['defense', 'shotBlocking', 'strength'],
    G: ['reflexes', 'concentration', 'positioning'],
  };

  function schemaFor(position) {
    return position === 'G' ? GOALIE_SCHEMA : SKATER_SCHEMA;
  }

  function allAttributeIds(position) {
    const schema = schemaFor(position);
    return [...schema.physical, ...schema.technical, ...schema.mental];
  }

  /** Generates a player's starting attributes (low, appropriate for an 8-year-old). */
  function generateInitialAttributes(position) {
    const ids = allAttributeIds(position);
    const focus = POSITION_FOCUS[position] || [];
    const attributes = {};
    ids.forEach((id) => {
      const base = Game.utils.randInt(24, 42);
      const bonus = focus.includes(id) ? Game.utils.randInt(5, 12) : 0;
      attributes[id] = Game.utils.clamp(base + bonus, 1, 99);
    });
    return attributes;
  }

  /** Generates the player's hidden potential (career ceiling), 1-99. */
  function generatePotential() {
    return Game.utils.randInt(8, 99);
  }

  // --- Selectable potential tiers (Phase 11): the player picks their
  // ambition level at creation; the exact roll within that tier stays a
  // little uncertain, so there's still some surprise, but the ceiling is
  // no longer a total mystery/out of the player's hands.
  const POTENTIAL_TIERS = [
    { id: 'longshot', label: 'Long Shot', hint: 'Might not make it past juniors.', min: 15, max: 38 },
    { id: 'roleplayer', label: 'Role Player', hint: 'A dependable pro — never a star.', min: 38, max: 58 },
    { id: 'prospect', label: 'Prospect', hint: 'A real shot at being an everyday pro.', min: 58, max: 75 },
    { id: 'star', label: 'Star Potential', hint: 'Could become a franchise piece.', min: 75, max: 90 },
    { id: 'generational', label: 'Generational Talent', hint: 'Hall-of-Fame ceiling, if it all comes together.', min: 90, max: 99 },
  ];

  function generatePotentialForTier(tierId) {
    const tier = POTENTIAL_TIERS.find((t) => t.id === tierId) || POTENTIAL_TIERS[2];
    return Game.utils.randInt(tier.min, tier.max);
  }

  // --- Selectable archetypes (Phase 11): the same labels the game already
  // derived automatically from attributes, now offered as an up-front
  // choice that biases which attributes start (and grow toward cap)
  // higher, so the choice is actually felt in-game.
  const FORWARD_ARCHETYPES = [
    { id: 'sniper', label: 'Sniper', hint: 'Lives for the finish — a natural scorer.', focus: ['wristShot', 'slapShot'] },
    { id: 'playmaker', label: 'Playmaker', hint: 'Sees the ice a step ahead of everyone else.', focus: ['passing', 'vision'] },
    { id: 'power', label: 'Power Forward', hint: 'Wins every puck battle in the corners.', focus: ['strength', 'aggression'] },
    { id: 'twoway', label: 'Two-Way', hint: 'Reliable in both ends of the rink.', focus: ['defense', 'discipline'] },
    { id: 'speedster', label: 'Speedster', hint: 'Blows by defenders with pure speed.', focus: ['speed', 'acceleration'] },
  ];

  const DEFENSEMAN_ARCHETYPES = [
    { id: 'twoway_d', label: 'Two-Way Defenseman', hint: 'Excellent at both ends — can play in any situation.', focus: ['defense', 'passing'] },
    { id: 'offensive_d', label: 'Offensive Defenseman', hint: 'Joins the rush and creates chances from the point.', focus: ['passing', 'vision', 'speed'] },
    { id: 'defensive_d', label: 'Stay-at-Home Defenseman', hint: 'Your last line of defense — protects the crease.', focus: ['defense', 'shotBlocking', 'discipline'] },
    { id: 'shutdown_d', label: 'Shutdown Defenseman', hint: 'Specializes in shutting down the opposing team\'s best forwards.', focus: ['defense', 'aggression', 'discipline'] },
  ];

  const GOALIE_ARCHETYPES = [
    { id: 'reflex', label: 'Reflex Goalie', hint: 'Pure athleticism — steals goals others can\'t.', focus: ['reflexes', 'concentration'] },
    { id: 'positional', label: 'Positional Goalie', hint: 'Always in the right spot, rarely out of position.', focus: ['positioning', 'reboundControl'] },
  ];

  function archetypesFor(position) {
    if (position === 'G') return GOALIE_ARCHETYPES;
    if (position === 'D') return DEFENSEMAN_ARCHETYPES;
    return FORWARD_ARCHETYPES;
  }

  function archetypeLabel(position, archetypeId) {
    const found = archetypesFor(position).find((a) => a.id === archetypeId);
    return found ? found.label : archetypeId;
  }

  /**
   * Generates a player's starting attributes biased toward a CHOSEN
   * archetype, instead of only the generic position-based focus. Used by
   * player creation once the user picks an archetype card.
   */
  function generateInitialAttributesForArchetype(position, archetypeId) {
    const ids = allAttributeIds(position);
    const positionFocus = POSITION_FOCUS[position] || [];
    const archetype = archetypesFor(position).find((a) => a.id === archetypeId);
    const archetypeFocus = archetype ? archetype.focus : [];
    const attributes = {};
    ids.forEach((id) => {
      const base = Game.utils.randInt(24, 42);
      let bonus = 0;
      if (archetypeFocus.includes(id)) bonus = Game.utils.randInt(12, 20);
      else if (positionFocus.includes(id)) bonus = Game.utils.randInt(5, 12);
      attributes[id] = Game.utils.clamp(base + bonus, 1, 99);
    });
    return attributes;
  }

  /**
   * Generates the hidden ceiling for EACH attribute based on overall
   * potential. Not every attribute on a high-potential player grows
   * equally: each has its own variance around the potential value. The
   * ceiling is never lower than the attribute's already-generated
   * starting value.
   */
  function generateAttributeCaps(attributes, potential) {
    const caps = {};
    Object.entries(attributes).forEach(([id, value]) => {
      const target = Game.utils.clamp(potential + Game.utils.randInt(-14, 10), 1, 99);
      caps[id] = Math.max(value, target);
    });
    return caps;
  }

  /** Turns the real potential into a scout projection with noise (never exact). */
  function scoutProjection(potential) {
    const noise = Game.utils.randInt(-9, 9);
    const perceived = Game.utils.clamp(potential + noise, 1, 99);
    let grade, label;
    if (perceived >= 90) {
      grade = 'A+';
      label = 'Elite prospect';
    } else if (perceived >= 78) {
      grade = 'A';
      label = 'Future star';
    } else if (perceived >= 64) {
      grade = 'B';
      label = 'NHL-caliber projection';
    } else if (perceived >= 48) {
      grade = 'C';
      label = 'Could reach the pros';
    } else if (perceived >= 30) {
      grade = 'D';
      label = 'Uncertain, needs development';
    } else {
      grade = 'F';
      label = 'Unlikely to go far';
    }
    return { grade, label };
  }

  /** Derives a "playstyle archetype" label from the generated attributes (flavor only). */
  function deriveArchetype(position, attributes) {
    if (position === 'G') {
      return attributes.reflexes >= attributes.positioning ? 'Reflex Goalie' : 'Positional Goalie';
    }
    if (position === 'D') {
      const scores = {
        'Two-Way Defenseman': attributes.defense + attributes.passing,
        'Offensive Defenseman': attributes.passing + attributes.vision + attributes.speed,
        'Stay-at-Home Defenseman': attributes.defense + attributes.shotBlocking + attributes.discipline,
        'Shutdown Defenseman': attributes.defense + attributes.aggression + attributes.discipline,
      };
      return Object.entries(scores).sort((a, b) => b[1] - a[1])[0][0];
    }
    const scores = {
      Sniper: attributes.wristShot + attributes.slapShot,
      Playmaker: attributes.passing + attributes.vision,
      Power: attributes.strength + attributes.aggression,
      'Two-Way': attributes.defense + attributes.discipline,
      Speedster: attributes.speed + attributes.acceleration,
    };
    return Object.entries(scores).sort((a, b) => b[1] - a[1])[0][0];
  }

  Game.player = Game.player || {};
  Game.player.attributes = {
    schemaFor,
    allAttributeIds,
    labels: LABELS,
    categoryLabels: CATEGORY_LABELS,
    generateInitialAttributes,
    generateInitialAttributesForArchetype,
    generatePotential,
    generatePotentialForTier,
    potentialTiers: POTENTIAL_TIERS,
    archetypesFor,
    archetypeLabel,
    generateAttributeCaps,
    scoutProjection,
    deriveArchetype,
  };
})(window.Game = window.Game || {});
