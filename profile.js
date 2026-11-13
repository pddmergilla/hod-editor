'use strict';

globalThis.HodProfile = {
  // Smallest base image. Editor exports append their data after the base.
  // 0x800000: Visual Improvement + Better Fast Travel (no REharmonized), opened as an editor export.
  // 0x1de9dd8: the earlier REharmonized build, which can also be opened raw.
  size: 0x800000,
  baseSizes: [0x800000, 0x1de9dd8],
  supportedHashes: [
    '67b2269180ecae8b38575071c21f2b34d8285ac16561f6c0b00b3ddc0ad2cc38',
    '951388561ca3a98ca22436eaeebc3bc3e3eaaa9b9db6f25b0c8a34df289c3854',
  ],
  title: 'CASTLEVANIA1ACHE',
  areaPointer: 0x1ec8,
  sectors: [
    'Entrance', 'Marble Corridor & Room of Illusion',
    'Shrine of the Apostates & Wailing Way', 'Castle Top Floor',
    'Skeleton Cave', 'Luminous Cavern', 'Aqueduct of Dragons',
    'Sky Walkway & Chapel of Dissonance', 'Clock Tower', 'Castle Treasury',
  ],
  hardcoded: [0x4afb74, 0x4b0230, 0x4b0304, 0x4afe1c, 0x4aff84],
  enemies: 0xc7e38,
  bosses: [0x09, 0x11, 0x1e, 0x1f, 0x28, 0x2e, 0x36, 0x37, 0x42, 0x43, 0x44,
    0x49, 0x53, 0x54, 0x55, 0x56, 0x57, 0x60, 0x61, 0x62, 0x63, 0x77],
  spawnTimerDefaults: {
    0x66: {varA: 2, varB: 100},
    0x67: {varA: 2, varB: 100},
  },
  spawnTimerNames: {0x66: 'Spawn Timer · Start', 0x67: 'Spawn Timer · End'},
  spells: 0xe29d4,
  // Subweapon throw records: 8 x 12 bytes, +1 is the heart cost. The second table is used
  // while the matching ring is equipped. Base power is the attack kind's byte at 0xE2504 + kind * 4.
  subweaponTables: [0xe2308, 0xe2368],
  subweaponThrows: [
    // [subweapon index, attack kind, ring equipment index or null]
    [1, 0x07, 0x7c], [2, 0x08, 0x7d], [3, 0x09, 0x7b], [4, 0x0a, 0x7a],
    [5, 0x0b, 0x7f], [6, 0x0c, 0x7e], [7, 0x2f, null],
  ],
  books: ['Special', 'Fire', 'Ice', 'Thunder', 'Wind', 'Summoning'],
  subweapons: ['None', 'Knife', 'Axe', 'Cross', 'Holy Water', 'Holy Book', 'Sacred Fist', 'Shuriken'],
  items: [
    [3, 'Consumables', 0x4b24a4, 27, 12], [4, 'Whip tips', 0x4b25f4, 9, 12],
    [5, 'Equipment', 0x4b2660, 128, 12], [6, 'Spellbooks', 0x4b2c60, 5, 4],
    [7, 'Relics', 0x4b2c74, 12, 4], [8, 'Furniture', 0x4b2ca4, 31, 4],
  ],
  objects: {
    0: 'Save point', 1: 'Warp point', 2: 'Teleporter', 3: 'Breakable wall',
    5: 'Door', 6: 'Boss door', 8: 'Pushable crates', 9: 'Button',
    10: 'Tall gate', 11: 'Floodgate', 16: 'Cracked wall', 17: 'Cogs',
    18: 'Pendulum', 26: 'Merchant', 30: 'Ramp', 31: 'Elevator', 36: 'Water',
    37: 'Spikes', 38: 'Event', 39: 'Drawbridge', 40: 'Lydie', 42: 'Furniture',
    43: 'Guillotine', 44: 'Breakable ceiling', 45: 'Locked floor gate',
  },
  levelStats: [
    ['Max HP', 0xe452c, 1], ['Max MP', 0xe45f4, 0], ['Max hearts', 0xe46bc, 0],
    ['Strength', 0xe4784, 0], ['Defense', 0xe484c, 0],
    ['Intelligence', 0xe4914, 0], ['Luck', 0xe49dc, 0],
  ],
  sparePickupFlags: [0x11c, 0x11d, 0x11e, 0x11f],
  spellPower: {
    1: 0x33,
    9: 0x0f, 10: 0x10, 11: 0x11, 12: 0x12, 13: 0x13, 14: 0x14,
    17: 0x15, 18: 0x16, 19: 0x17, 20: 0x18, 21: 0x19, 22: 0x1a,
    25: 0x1b, 27: 0x1d, 28: 0x1e, 29: 0x1f, 30: 0x21,
    33: 0x22, 34: 0x23, 35: 0x24, 37: 0x26, 38: 0x27,
    42: 0x29, 43: 0x2a, 44: 0x2b, 45: 0x2c, 46: 0x2d,
  },
};

(() => {
  // Sprite and palette calls checked against the supported ROM.
  const enemies = {
    0x00: {gfx: [0x080e894c], palettes: [[0x08123784, 0]]},
    0x01: {gfx: [0x0811bd88], palettes: [[0x08125a88, 0]], variants: {1: [[0x08125a88, 1]]}},
    0x02: {gfx: [0x0811bd88], palettes: [[0x08125a88, 0]], variants: {
      1: [[0x08125a88, 1]], 2: [[0x08125a88, 2]], 3: [[0x08125a88, 3]],
    }},
    0x03: {gfx: [0x0811bc98], palettes: [[0x08125348, 1]]},
    0x05: {gfx: [0x080f0a2c], palettes: [[0x08124714, 0]]},
    0x06: {gfx: [0x080f0a24], palettes: [[0x081246f0, 0]]},
    0x07: {gfx: [0x080f0a2c], palettes: [[0x08124714, 0]]},
    0x08: {gfx: [0x080e89ac], palettes: [[0x08123984, 0], [0x08123984, 1]]},
    0x0b: {gfx: [0x080e8944], palettes: [[0x08123760, 0]], varA: 1},
    0x0c: {gfx: [0x080e8974], palettes: [[0x081238d8, 0]]},
    0x0d: {gfx: [0x080e8934], palettes: [[0x08123718, 0]]},
    0x0e: {gfx: [0x0811bd18], palettes: [[0x081257e0, 0]]},
    0x0f: {gfx: [0x080e8934], palettes: [[0x08123718, 0]]},
    0x10: {gfx: [0x0811bd20], palettes: [[0x08125844, 2]]},
    0x12: {gfx: [0x080e896c], palettes: [[0x081237f0, 0]]},
    0x13: {gfx: [0x0811bc38], palettes: [[0x0812522c, 0]]},
    0x14: {gfx: [0x080e897c], palettes: [[0x0812393c, 0]]},
    0x16: {gfx: [0x080e893c], palettes: [[0x0812373c, 0]]},
    0x17: {gfx: [0x0811bc00], palettes: [[0x08124e30, 0]]},
    0x18: {gfx: [0x0811bc68], palettes: [[0x08125298, 0]]},
    0x19: {gfx: [0x0811bcb0], palettes: [[0x08124714, 0]]},
    0x1a: {gfx: [0x0811bc68], palettes: [[0x08125298, 0]]},
    0x1b: {gfx: [0x0811bdf0], palettes: [[0x0812606c, 0]]},
    0x1c: {gfx: [0x0811bc80], palettes: [[0x08125300, 0]]},
    0x1d: {gfx: [0x080e89c4], palettes: [[0x081239c8, 6], [0x081239c8, 7]]},
    0x20: {gfx: [0x0811bdf8], palettes: [[0x0812744c, 0]]},
    0x21: {gfx: [0x0811bcc0], palettes: [[0x08125410, 0]]},
    0x22: {gfx: [0x080f0a34], palettes: [[0x08124714, 0], [0x08124714, 1]]},
    0x23: {gfx: [0x080f0a44], palettes: [[0x0812479c, 0]]},
    0x24: {gfx: [0x0811bbe8], palettes: [[0x08124da4, 0]]},
    0x25: {gfx: [0x0811bcd0], palettes: [[0x08125498, 0]]},
    0x26: {gfx: [0x0811bce0], palettes: [[0x081254dc, 0]]},
    0x27: {gfx: [0x0811bd18], palettes: [[0x081257e0, 1]]},
    0x29: {gfx: [0x0811bb20], palettes: [[0x08124808, 0]]},
    0x2a: {gfx: [0x0811bb20], palettes: [[0x08124808, 0]]},
    0x2b: {gfx: [0x0811bbe0], palettes: [[0x08124d80, 0]]},
    0x2c: {gfx: [0x0811bd50], palettes: [[0x080df5e8, 1], [0x08125910, 0]]},
    0x2d: {gfx: [0x080f0a1c], palettes: [[0x081246ac, 0]]},
    0x2f: {gfx: [0x0811bd60], palettes: [[0x081259d8, 0]]},
    0x30: {gfx: [0x0811bd68], palettes: [[0x081259fc, 0]]},
    0x31: {gfx: [0x0811bd90], palettes: [[0x08125b0c, 0]]},
    0x32: {gfx: [0x0811bd50], palettes: [[0x080df5e8, 1], [0x08125910, 0]]},
    0x33: {gfx: [0x0811bd58], palettes: [[0x081259b4, 0]]},
    0x34: {gfx: [0x080e89c4], palettes: [[0x081239c8, 0], [0x081239c8, 1]]},
    0x35: {gfx: [0x080e89cc], palettes: [[0x08123b4c, 0], [0x08123b4c, 1]]},
    0x38: {gfx: [0x080f0a24], palettes: [[0x081246f0, 0]]},
    0x3a: {gfx: [0x08123678], palettes: [[0x08126aec, 0]]},
    0x3b: {gfx: [0x080e8934], palettes: [[0x08123718, 0]]},
    0x3d: {gfx: [0x08123678, 0x0811bd10], palettes: [[0x08126aec, 1], [0x08125798, 0]]},
    0x3e: {gfx: [0x0811bbd8], palettes: [[0x08124d5c, 0]]},
    0x3f: {gfx: [0x0811bbe8], palettes: [[0x08124da4, 1]]},
    0x40: {gfx: [0x0811bd50], palettes: [[0x080df5e8, 4], [0x08125910, 0]]},
    0x41: {gfx: [0x080e89c4], palettes: [[0x081239c8, 8], [0x081239c8, 9]]},
    0x45: {gfx: [0x0811bd80], palettes: [[0x08125a64, 0]]},
    0x46: {gfx: [0x0811bcb0], palettes: [[0x08124714, 2]]},
    0x47: {gfx: [0x0811bd50], palettes: [[0x080df5e8, 1], [0x08125910, 0]]},
    0x48: {gfx: [0x0811bd20], palettes: [[0x08125844, 1]]},
    0x4a: {gfx: [0x0811bd08], palettes: [[0x08125714, 0]]},
    0x4b: {gfx: [0x0811bbf0], palettes: [[0x08124de8, 0]]},
    0x4c: {gfx: [0x0811bc40], palettes: [[0x08125250, 0]]},
    0x4d: {gfx: [0x080f0a34], palettes: [[0x08124714, 0], [0x08124714, 1]]},
    0x4e: {gfx: [0x0811bd10], palettes: [[0x08125798, 0]]},
    0x50: {gfx: [0x080f0a4c], palettes: [[0x081247c0, 0]]},
    0x51: {gfx: [0x080e89d4], palettes: [[0x08123b90, 0], [0x08123b90, 1]]},
    0x52: {gfx: [0x080f0a1c], palettes: [[0x081246ac, 1]]},
    0x58: {gfx: [0x0811bcd8], palettes: [[0x08125498, 1]]},
    0x59: {gfx: [0x0811bce0], palettes: [[0x081254dc, 1]]},
    0x5a: {gfx: [0x0811bd20], palettes: [[0x08125844, 0]]},
    0x5b: {gfx: [0x0811bbd0], palettes: [[0x08124d38, 0]]},
    0x5c: {gfx: [0x080f0a2c], palettes: [[0x08124714, 0]]},
    0x5d: {gfx: [0x080e8944, 0x0811bcc0], palettes: [[0x08123760, 0], [0x08125410, 0]]},
    0x5e: {gfx: [0x0811bd28], palettes: [[0x081258a8, 0]]},
    0x5f: {gfx: [0x080e89dc], palettes: [[0x08123bd4, 0], [0x08123bd4, 1]]},
    0x78: {gfx: [0x080e893c], palettes: [[0x080e09d0, 0]], variants: {1: [[0x0812373c, 0]]}},
  };

  const common = {gfx: [], palettes: []};
  const spawned = {
    0x04: {gfx: [0x0811bc88], palettes: [[0x08125324, 0]]},
    0x0a: {gfx: [0x080e8954], palettes: [[0x081237a8, 0]]},
    0x15: {gfx: [0x080e8984], palettes: [[0x08123960, 0]]},
    0x39: {gfx: [0x0811bc98], palettes: [[0x08125348, 0]]},
  };
  const spawners = [
    [0x00, 'Bat Spawner'], [0x03, 'Medusa Head Spawner'], [0x04, 'Zombie Spawner'], [0x0a, 'Ghost Spawner'],
    [0x15, 'Flying Skeleton Spawner'], [0x20, 'Mini Devil Spawner'], [0x39, 'Gold Medusa Spawner'],
  ];
  const enemyBankEnemies = {...enemies};
  for (const [target, label] of spawners) {
    enemyBankEnemies[0x100 + target] = {
      ...(spawned[target] || enemies[target]), subtype: 0x6a, varA: target === 0 ? 1 : 0,
      varB: target, label,
    };
  }
  const objects = {
    0x04: common,
    0x06: {gfx: [], palettes: [[0x08124528, 1]]},
    0x07: common,
    0x08: {gfx: [0x080f0a3c], palettes: [[0x08124778, 0]]},
    0x0b: {gfx: [0x0811bb30], palettes: [[0x0815ee48, 0]]},
    0x0d: {gfx: [0x0811bb30], palettes: [[0x0815ee48, 4]]},
    0x10: {gfx: [0x0811bbc8], palettes: [[0x08124528, 0]]},
    0x11: common,
    0x13: {gfx: [0x0811bb48], palettes: [[0x08124c50, 2]]},
    0x16: {gfx: [0x0811bb38], palettes: [[0x0815e95c, 2]]},
    0x17: {gfx: [0x0811bb40], palettes: [[0x08124c50, 0]]},
    0x18: {gfx: [0x0811bb50], palettes: [[0x08124c50, 3]]},
    0x19: {gfx: [0x0811bb50], palettes: [[0x08124c50, 3]]},
    0x1d: {gfx: [0x0811bb58], palettes: [[0x08124c50, 5]]},
    0x1e: {gfx: [0x0811bce8], palettes: [[0x08160b04, 0]]},
    0x21: {gfx: [0x0811bca8], palettes: [[0x081607bc, 3]]},
    0x22: common,
    0x23: {gfx: [0x0811bca8], palettes: [[0x081607bc, 3]]},
    0x24: common,
    0x25: common,
    0x2b: {gfx: [0x08123668], palettes: [[0x081267f8, 0]]},
    0x2c: {gfx: [0x08123670], palettes: [[0x0812681c, 0]]},
    0x2d: {gfx: [0x08123660], palettes: [[0x081267d4, 0]]},
    0x2e: {gfx: [0x081236a8], palettes: [[0x081271e4, 0]]},
    0x30: {gfx: [0x081236d8], palettes: [[0x08127358, 0]]},
    0x31: common,
  };
  const doors = [
    {gfx: [0x080f0a14], palettes: [[0x08124528, 0]]},
    {gfx: [0x080f0a14], palettes: [[0x08124528, 1]]},
    {gfx: [0x0811bde8], palettes: [[0x08125e68, 0]]},
  ];
  const candles = [
    [0x08125bb0, 0], [0x08125bb0, 1], [0x08125bb0, 2], [0x08125bb0, 3],
    [0x08125cd4, 0], [0x08125cf8, 0], [0x08125d1c, 0], [0x08125bb0, 7], [0x08125d40, 0],
  ].map((palette, index) => ({gfx: [0x0811bd98 + index * 8], palettes: [palette]}));

  function entityAssets({type, subtype, varA, varB}) {
    if (type === 0) {
      if (subtype === 0x66 || subtype === 0x67) return common;
      if (subtype === 0x6a) return spawned[varB] || enemies[varB];
      if (subtype === 0x7a) return enemies[0x19];
      const enemy = enemies[subtype];
      if (!enemy || varB || ((subtype === 0x16 || subtype === 0x78) && varA === 2)) return null;
      return {gfx: enemy.gfx, palettes: enemy.variants?.[varA] || enemy.palettes};
    }
    if (type === 1) return subtype === 5 ? doors[Math.min(varA, 2)] : objects[subtype];
    if (type === 2) return (varA & 0x0fff) === 0 ? common : candles[(varA & 0x0fff) - 0x10];
    return common;
  }

  function collectAssets(assets) {
    return {
      gfx: new Set(assets.flatMap(asset => asset.gfx)),
      palettes: new Set(assets.flatMap(asset => asset.palettes.map(palette => palette.join('/')))),
    };
  }

  function fitsEnemyGraphics(gfx, read) {
    let used = 0;
    for (const pointer of gfx) {
      const at = read.offset(pointer, 4);
      if (at === null || read.byte(at) > 1 || read.byte(at + 1) !== 4 || read.byte(at + 2) !== 0x10) return false;
      const units = read.byte(at + 3) / 4;
      if (![1, 2, 3, 4].includes(units)) return false;
      used += units === 3 ? 4 : units;
    }
    // Space for shared sprites and attacks.
    return used <= 8;
  }

  const enemyBankKey = entity => entity.subtype === 0x6a ? 0x100 + entity.varB : entity.subtype;

  function planEnemyBank(room, oldBank, newBank, entities, read) {
    const original = room.entities.map(entityAssets);
    const placed = entities.map(entityAssets);
    if ((room.flags & 0xff) === 5 || original.some(asset => !asset) || placed.some(asset => !asset)) {
      return {reason: 'This room has a boss, scripted enemy, or unverified prop.'};
    }
    const removed = oldBank.filter(subtype => !newBank.includes(subtype));
    const released = collectAssets([
      ...removed.map(subtype => enemyBankEnemies[subtype]),
      ...original.filter((_, index) => {
        const entity = room.entities[index];
        return entity.type === 0 && removed.includes(enemyBankKey(entity));
      }),
    ]);
    const required = collectAssets([
      ...newBank.map(subtype => enemyBankEnemies[subtype]),
      ...placed,
      ...original.filter((_, index) => {
        const entity = room.entities[index];
        return entity.type !== 0 || !removed.includes(enemyBankKey(entity));
      }),
    ]);
    const gfx = [...new Set([
      ...room.gfx.filter(pointer => !released.gfx.has(pointer) || required.gfx.has(pointer)),
      ...required.gfx,
    ])];
    if (!fitsEnemyGraphics(gfx, read)) return {reason: 'These sprites exceed the room’s graphics budget.'};

    const occupied = new Map();
    const paletteEntries = room.paletteEntries.filter(([header, pointer]) => {
      const type = header & 0xffff;
      const slot = (header >>> 16) & 15;
      if (!type || slot < 10 || slot > 13) return true;
      const key = pointer + '/' + (header >>> 24);
      if (type === 1 && released.palettes.has(key) && !required.palettes.has(key)) return false;
      occupied.set(slot, key);
      return true;
    });
    const loaded = new Set(occupied.values());
    const newPaletteCount = [...required.palettes].filter(key => !loaded.has(key)).length;
    if (occupied.size + newPaletteCount > 4) return {reason: 'These enemies exceed the room’s four palette slots.'};
    return {gfx, paletteEntries};
  }

  Object.assign(globalThis.HodProfile, {enemyBankEnemies, enemyBankKey, planEnemyBank});
})();
