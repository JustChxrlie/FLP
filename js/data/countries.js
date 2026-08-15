/**
 * countries.js
 * Countries available for player creation and NPC generation.
 * Kept as plain data (no logic) so it's easy to extend.
 */
(function (Game) {
  Game.data = Game.data || {};
  Game.data.countries = [
    { code: 'CA', name: 'Canada' },
    { code: 'US', name: 'United States' },
    { code: 'SE', name: 'Sweden' },
    { code: 'FI', name: 'Finland' },
    { code: 'RU', name: 'Russia' },
    { code: 'CZ', name: 'Czech Republic' },
    { code: 'SK', name: 'Slovakia' },
    { code: 'CH', name: 'Switzerland' },
    { code: 'DE', name: 'Germany' },
    { code: 'MX', name: 'Mexico' },
    { code: 'NO', name: 'Norway' },
    { code: 'LV', name: 'Latvia' },
    { code: 'DK', name: 'Denmark' },
    { code: 'JP', name: 'Japan' },
  ];
})(window.Game = window.Game || {});
