/**
 * shop.js
 * Buy temporary / permanent upgrades; apply & tick buffs each season.
 */
(function (Game) {
  function eligibleItems(player) {
    Game.systems.economy.ensureFinances(player);
    const bought = new Set((player.finances.purchases || []).map((p) => p.itemId));
    return (Game.data.shopItems || []).filter((item) => {
      if (item.minAge && player.age < item.minAge) return false;
      if (item.position && item.position !== player.position) return false;
      if (item.once && bought.has(item.id)) return false;
      // hide goalie-only for skaters and vice-versa already handled
      if (item.position === 'G' && player.position !== 'G') return false;
      if (!item.position && player.position === 'G') {
        // skater items with shot attrs skip for goalies if only shot effects
        const keys = Object.keys(item.effects || {});
        if (keys.every((k) => ['wristShot', 'slapShot', 'passing', 'vision', 'puckHandling', 'defense', 'shotBlocking'].includes(k))) {
          return false;
        }
      }
      return true;
    });
  }

  function applyEffects(player, effects, permanent) {
    Object.entries(effects).forEach(([key, val]) => {
      if (key === '_capBoost') {
        Object.keys(player.attributeCaps || {}).forEach((attr) => {
          player.attributeCaps[attr] = Math.min(99, (player.attributeCaps[attr] || 50) + val);
        });
        return;
      }
      if (player.attributes[key] == null) return;
      if (permanent) {
        const cap = player.attributeCaps[key] || 99;
        player.attributes[key] = Game.utils.clamp(player.attributes[key] + val, 1, cap);
      } else {
        // temporary: store as buff, apply on top when reading effective attrs
        // we also bump the raw value for simplicity and reverse on expiry
        const cap = 99;
        player.attributes[key] = Game.utils.clamp(player.attributes[key] + val, 1, cap);
      }
    });
  }

  function reverseEffects(player, effects) {
    Object.entries(effects).forEach(([key, val]) => {
      if (key === '_capBoost') return;
      if (player.attributes[key] == null) return;
      player.attributes[key] = Game.utils.clamp(player.attributes[key] - val, 1, 99);
    });
  }

  function buy(state, itemId) {
    const player = state.player;
    Game.systems.economy.ensureFinances(player);
    const item = (Game.data.shopItems || []).find((i) => i.id === itemId);
    if (!item) return { ok: false, reason: 'Item not found' };

    const list = eligibleItems(player);
    if (!list.find((i) => i.id === itemId)) return { ok: false, reason: 'Not available' };
    if (!Game.systems.economy.canAfford(player, item.price)) {
      return { ok: false, reason: 'Not enough money' };
    }

    Game.systems.economy.spend(player, item.price, item.name);
    applyEffects(player, item.effects, item.type === 'permanent');

    player.finances.purchases.push({
      itemId: item.id,
      name: item.name,
      type: item.type,
      price: item.price,
      year: state.career.currentYear,
    });

    if (item.type === 'temporary') {
      player.finances.activeBuffs.push({
        itemId: item.id,
        name: item.name,
        effects: item.effects,
        seasonsLeft: item.seasons || 1,
      });
    }

    return { ok: true, item, balance: player.finances.balance };
  }

  /** Call at end of every season: decrement temporary buffs and remove expired. */
  function tickBuffs(player) {
    Game.systems.economy.ensureFinances(player);
    const remaining = [];
    (player.finances.activeBuffs || []).forEach((buff) => {
      buff.seasonsLeft -= 1;
      if (buff.seasonsLeft <= 0) {
        reverseEffects(player, buff.effects);
      } else {
        remaining.push(buff);
      }
    });
    player.finances.activeBuffs = remaining;
  }

  Game.systems = Game.systems || {};
  Game.systems.shop = { eligibleItems, buy, tickBuffs, applyEffects };
})(window.Game = window.Game || {});
