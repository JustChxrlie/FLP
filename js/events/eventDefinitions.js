/**
 * eventDefinitions.js
 * Pool of random season events. Each event: id, category, weight,
 * eligibility (minAge/maxAge/position/once), text, and either an
 * automatic effect or a set of player choices.
 */
(function (Game) {
  const { clamp, randInt, randChoice } = Game.utils;

  function bumpAttr(player, id, amount) {
    if (player.attributes[id] == null) return;
    player.attributes[id] = clamp(player.attributes[id] + amount, 1, 99);
  }
  function bumpRel(player, id, amount) {
    player.relationships[id] = clamp((player.relationships[id] ?? 50) + amount, 0, 100);
  }
  function bumpPop(player, scope, amount) {
    player.popularity[scope] = clamp((player.popularity[scope] ?? 0) + amount, 0, 100);
  }
  function addMoney(player, amount) {
    player.finances.balance += amount;
  }

  const EVENTS = [
    {
      id: 'minor_injury',
      category: 'injury',
      weight: 10,
      minAge: 8,
      text: '{player} took a hard hit and is dealing with a minor injury.',
      autoApply: (player, state) => {
        const weeks = randInt(1, 4);
        player.injuries.push({ id: Game.utils.uid('injury'), label: 'Minor injury', weeksOut: weeks, year: state.career.currentYear });
        bumpAttr(player, 'stamina', -randInt(1, 3));
        return `Out for about ${weeks} week(s). Stamina dipped slightly.`;
      },
    },
    {
      id: 'coach_change',
      category: 'coach',
      weight: 8,
      minAge: 10,
      text: 'Your team has a new head coach this year.',
      choices: [
        {
          label: 'Adapt quickly and impress them',
          apply: (player) => {
            bumpAttr(player, 'professionalism', 3);
            bumpRel(player, 'coach', 12);
            return 'The new coach notices your effort.';
          },
        },
        {
          label: 'Keep doing things your own way',
          apply: (player) => {
            bumpAttr(player, 'confidence', 2);
            bumpRel(player, 'coach', -6);
            return 'You stay comfortable, but the coach is unsure about you.';
          },
        },
      ],
    },
    {
      id: 'new_teammate',
      category: 'teammate',
      weight: 10,
      minAge: 8,
      text: 'A new player joined the locker room and looks up to you.',
      autoApply: (player) => {
        bumpRel(player, 'teammates', 5);
        return 'The locker room chemistry improves a bit.';
      },
    },
    {
      id: 'family_problems',
      category: 'family',
      weight: 6,
      minAge: 10,
      text: 'Things have been tense at home lately.',
      choices: [
        {
          label: 'Focus on hockey to cope',
          apply: (player) => {
            bumpAttr(player, 'mentality', 2);
            bumpRel(player, 'family', -8);
            return 'Hockey becomes your escape, but home feels distant.';
          },
        },
        {
          label: 'Prioritize your family right now',
          apply: (player) => {
            bumpRel(player, 'family', 10);
            bumpAttr(player, 'confidence', -2);
            return 'Your family appreciates you being there.';
          },
        },
      ],
    },
    {
      id: 'sponsorship_offer',
      category: 'sponsorship',
      weight: 6,
      minAge: 15,
      text: 'A local brand wants to sponsor you.',
      choices: [
        {
          label: 'Sign the deal',
          apply: (player) => {
            const amount = randInt(500, 5000);
            addMoney(player, amount);
            bumpPop(player, 'local', 4);
            player.finances.sponsorships.push({ id: Game.utils.uid('sponsor'), amount });
            return `Deal signed for ${Game.utils.formatMoney(amount)}.`;
          },
        },
        {
          label: 'Turn it down to stay focused',
          apply: (player) => {
            bumpAttr(player, 'professionalism', 1);
            return 'You keep things simple for now.';
          },
        },
      ],
    },
    {
      id: 'interview_request',
      category: 'press',
      weight: 8,
      minAge: 14,
      text: 'A local reporter wants a quick interview with you.',
      choices: [
        {
          label: 'Give a confident answer',
          apply: (player) => {
            bumpPop(player, 'local', 3);
            bumpRel(player, 'press', 6);
            bumpAttr(player, 'confidence', 1);
            return 'Fans like your confidence.';
          },
        },
        {
          label: 'Stay humble',
          apply: (player) => {
            bumpRel(player, 'press', 10);
            bumpRel(player, 'teammates', 3);
            return 'The press and your teammates respect the humility.';
          },
        },
      ],
    },
    {
      id: 'controversy',
      category: 'controversy',
      weight: 4,
      minAge: 14,
      condition: (player) => player.attributes.discipline < 45,
      text: '{player} was involved in a heated incident that made local headlines.',
      autoApply: (player) => {
        bumpRel(player, 'press', -10);
        bumpPop(player, 'local', -5);
        return 'The story hurts your reputation for a while.';
      },
    },
    {
      id: 'agent_change',
      category: 'agent',
      weight: 5,
      minAge: 16,
      text: 'It might be time to reconsider your representation.',
      choices: [
        {
          label: 'Hire an ambitious young agent',
          apply: (player) => {
            bumpRel(player, 'agent', 8);
            bumpPop(player, 'national', 2);
            return 'Your new agent starts pushing your name around the league.';
          },
        },
        {
          label: 'Stick with someone experienced and steady',
          apply: (player) => {
            bumpRel(player, 'agent', 12);
            return 'Your agent relationship stays rock solid.';
          },
        },
      ],
    },
    {
      id: 'financial_trouble',
      category: 'finance',
      weight: 4,
      minAge: 18,
      condition: (player) => player.finances.balance < 2000,
      text: 'Money has been tight lately.',
      choices: [
        {
          label: 'Cut back on expenses',
          apply: (player) => {
            bumpAttr(player, 'discipline', 2);
            return 'You tighten your budget and get by.';
          },
        },
        {
          label: 'Take out a short-term loan',
          apply: (player) => {
            addMoney(player, 1500);
            player.finances.expenses.push({ id: Game.utils.uid('exp'), label: 'Loan repayment', amount: -1800 });
            return 'You get by for now, but you owe more later.';
          },
        },
      ],
    },
    {
      id: 'camp_invite',
      category: 'training',
      weight: 7,
      minAge: 12,
      text: 'You were invited to an elite training camp over the break.',
      choices: [
        {
          label: 'Attend and push yourself hard',
          apply: (player) => {
            bumpAttr(player, randChoice(['speed', 'strength', 'skating', 'stamina']), 3);
            bumpAttr(player, 'stamina', -1);
            return 'The camp pays off physically.';
          },
        },
        {
          label: 'Skip it and rest instead',
          apply: (player) => {
            bumpAttr(player, 'stamina', 2);
            return 'You come back fresh for the season.';
          },
        },
      ],
    },
    {
      id: 'named_captain',
      category: 'leadership',
      weight: 3,
      minAge: 15,
      condition: (player) => player.attributes.leadership >= 55,
      once: true,
      text: '{player} was named team captain!',
      autoApply: (player) => {
        bumpAttr(player, 'leadership', 5);
        bumpRel(player, 'teammates', 8);
        bumpPop(player, 'local', 5);
        return 'Wearing the "C" changes how the room sees you.';
      },
    },
    {
      id: 'rivalry',
      category: 'rivalry',
      weight: 6,
      minAge: 12,
      text: 'A player on a rival team has started a real rivalry with you.',
      autoApply: (player) => {
        bumpAttr(player, 'confidence', 2);
        bumpAttr(player, 'aggression', 2);
        return 'The rivalry sharpens your competitive edge.';
      },
    },
    {
      id: 'romance',
      category: 'relationship',
      weight: 5,
      minAge: 16,
      text: 'You met someone special this year.',
      choices: [
        {
          label: 'Make time for the relationship',
          apply: (player) => {
            bumpAttr(player, 'confidence', 3);
            bumpAttr(player, 'mentality', 2);
            return 'Life outside the rink feels good.';
          },
        },
        {
          label: 'Keep your focus on hockey',
          apply: (player) => {
            bumpAttr(player, 'professionalism', 2);
            return 'You stay locked in on your career.';
          },
        },
      ],
    },
    {
      id: 'scandal',
      category: 'scandal',
      weight: 3,
      minAge: 17,
      condition: (player) => player.popularity.local > 40 && player.attributes.discipline < 50,
      text: 'A personal misstep turned into an unwanted scandal.',
      autoApply: (player) => {
        bumpPop(player, 'local', -8);
        bumpPop(player, 'national', -4);
        bumpRel(player, 'press', -12);
        return 'It takes a while for the noise to die down.';
      },
    },
    {
      id: 'bad_press',
      category: 'press',
      weight: 5,
      minAge: 14,
      text: 'A local outlet ran an unflattering story about your recent form.',
      autoApply: (player) => {
        bumpRel(player, 'press', -6);
        bumpAttr(player, 'confidence', -1);
        return 'You brush it off, but it stings a little.';
      },
    },
    {
      id: 'best_friend',
      category: 'teammate',
      weight: 6,
      minAge: 8,
      text: 'You and a teammate have become inseparable.',
      autoApply: (player) => {
        bumpRel(player, 'teammates', 10);
        bumpAttr(player, 'confidence', 1);
        return 'Having someone in your corner makes the grind easier.';
      },
    },
    {
      id: 'child_born',
      category: 'family',
      weight: 3,
      minAge: 23,
      once: true,
      text: '{player} welcomed a child this year.',
      autoApply: (player) => {
        bumpRel(player, 'family', 15);
        bumpAttr(player, 'mentality', 3);
        bumpAttr(player, 'professionalism', 2);
        return 'Fatherhood/motherhood gives you a new perspective.';
      },
    },
    {
      id: 'locker_room_conflict',
      category: 'teammate',
      weight: 5,
      minAge: 14,
      text: 'Two teammates are feuding and it is affecting the room.',
      choices: [
        {
          label: 'Step in and mediate',
          apply: (player) => {
            bumpAttr(player, 'leadership', 3);
            bumpRel(player, 'teammates', 6);
            return 'You help clear the air.';
          },
        },
        {
          label: 'Stay out of it',
          apply: (player) => {
            bumpRel(player, 'teammates', -3);
            return 'The tension lingers a bit longer.';
          },
        },
      ],
    },
  ];

  Game.eventSystem = Game.eventSystem || {};
  Game.eventSystem.definitions = EVENTS;
})(window.Game = window.Game || {});
