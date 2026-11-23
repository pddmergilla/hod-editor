'use strict';

globalThis.HodProfile = {
  // Smallest base image. Editor exports append their data after the base.
  // 0x800000: Visual Improvement + Better Fast Travel (no REharmonized), opened as an editor export.
  // 0x1de9dd8: the earlier REharmonized build, which can also be opened raw.
  // The clean US ROM (0x800000) shares this layout and opens raw too.
  size: 0x800000,
  baseSizes: [0x800000, 0x1de9dd8],
  vanillaHash: '85e0a40de22783badbbc95d6bcad68a3a25d0916c4111956213f8281358a61db',
  supportedHashes: [
    '85e0a40de22783badbbc95d6bcad68a3a25d0916c4111956213f8281358a61db',
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
    0x3c: {gfx: [0x081236e8], palettes: [[0x081273a0, 0]]},
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
    0x4f: {gfx: [0x08123710], palettes: [[0x081273c4, 0]]},
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

  function planEnemyBank(room, oldBank, newBank, entities, read, removeOnly = false) {
    const original = room.entities.map(entityAssets);
    const placed = entities.map(entityAssets);
    if ((room.flags & 0xff) === 5 || original.some(asset => !asset) || placed.some(asset => !asset)) {
      if (removeOnly) return {gfx: room.gfx, paletteEntries: room.paletteEntries};
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
      ...(removeOnly ? [] : required.gfx),
    ])];
    if (!removeOnly && !fitsEnemyGraphics(gfx, read)) return {reason: 'These sprites exceed the room’s graphics budget.'};

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
    if (!removeOnly && occupied.size + newPaletteCount > 4) return {reason: 'These enemies exceed the room’s four palette slots.'};
    return {gfx, paletteEntries};
  }

  // Sprite frames from DSVEdit, checked against the game.
  const spriteFrames = {
    enemies: {
      0x0: {sprite: 0x8128508, frame: 0x0, gfx: [0x80e894c], palette: 0x8123784, paletteOffset: 0},
      0x1: {sprite: 0x8154680, frame: 0x12, gfx: [0x811bd88], palette: 0x8125a88, paletteOffset: 0},
      0x2: {sprite: 0x8154680, frame: 0x4, gfx: [0x811bd88], palette: 0x8125a88, paletteOffset: 0},
      0x3: {sprite: 0x8148f44, frame: 0x0, gfx: [0x811bc98], palette: 0x8125348, paletteOffset: 1},
      0x4: {sprite: 0x8148d7c, frame: 0x0, gfx: [0x811bc88], palette: 0x8125324, paletteOffset: 0},
      0x5: {sprite: 0x812ef28, frame: 0x0, gfx: [0x80f0a2c], palette: 0x8124714, paletteOffset: 0},
      0x6: {sprite: 0x812e238, frame: 0x8, gfx: [0x80f0a24], palette: 0x81246f0, paletteOffset: 0},
      0x7: {sprite: 0x812ef28, frame: 0xb, gfx: [0x80f0a2c], palette: 0x8124714, paletteOffset: 0},
      0x8: {sprite: 0x812b460, frame: 0x0, gfx: [0x80e89ac], palette: 0x8123984, paletteOffset: 0},
      0x9: {sprite: 0x8128d6c, frame: 0x8, gfx: [0x80e895c, 0x80e8964], palette: 0x81237cc, paletteOffset: 0},
      0xa: {sprite: 0x8128784, frame: 0x4, gfx: [0x80e8954], palette: 0x81237a8, paletteOffset: 0},
      0xb: {sprite: 0x81282f8, frame: 0x0, gfx: [0x80e8944], palette: 0x8123760, paletteOffset: 0},
      0xc: {sprite: 0x81298c4, frame: 0x0, gfx: [0x80e8974], palette: 0x81238d8, paletteOffset: 0},
      0xd: {sprite: 0x8127a58, frame: 0x0, gfx: [0x80e8934], palette: 0x8123718, paletteOffset: 0},
      0xe: {sprite: 0x814e1b8, frame: 0x5, gfx: [0x811bd18], palette: 0x81257e0, paletteOffset: 0},
      0xf: {sprite: 0x8127a58, frame: 0x3, gfx: [0x80e8934], palette: 0x8123718, paletteOffset: 0},
      0x10: {sprite: 0x814cbb0, frame: 0x0, gfx: [0x811bd20], palette: 0x8125844, paletteOffset: 2},
      0x11: {sprite: 0x812b9f4, frame: 0x10, gfx: [0x80e89c4], palette: 0x81239c8, paletteOffset: 0},
      0x12: {sprite: 0x8128e20, frame: 0x0, gfx: [0x80e896c], palette: 0x81237f0, paletteOffset: 0},
      0x13: {sprite: 0x81434cc, frame: 0x0, gfx: [0x811bc38], palette: 0x812522c, paletteOffset: 0},
      0x14: {sprite: 0x812aa34, frame: 0x0, gfx: [0x80e897c], palette: 0x812393c, paletteOffset: 0},
      0x15: {sprite: 0x812ae48, frame: 0x0, gfx: [0x80e8984], palette: 0x8123960, paletteOffset: 0},
      0x16: {sprite: 0x8127e54, frame: 0x26, gfx: [0x80e893c], palette: 0x812373c, paletteOffset: 0},
      0x17: {sprite: 0x813f740, frame: 0x10, gfx: [0x811bc00], palette: 0x8124e30, paletteOffset: 0},
      0x18: {sprite: 0x814778c, frame: 0x0, gfx: [0x811bc68], palette: 0x8125298, paletteOffset: 0},
      0x19: {sprite: 0x8149478, frame: 0x0, gfx: [0x811bcb0], palette: 0x8124714, paletteOffset: 0},
      0x1a: {sprite: 0x814778c, frame: 0x3, gfx: [0x811bc68], palette: 0x8125298, paletteOffset: 0},
      0x1b: {sprite: 0x8155d18, frame: 0x5, gfx: [0x811bdf0], palette: 0x812606c, paletteOffset: 0},
      0x1c: {sprite: 0x8148b84, frame: 0x0, gfx: [0x811bc80], palette: 0x8125300, paletteOffset: 0},
      0x1d: {sprite: 0x812b9f4, frame: 0x10, gfx: [0x80e89c4], palette: 0x81239c8, paletteOffset: 6},
      0x1e: {sprite: 0x8146940, frame: 0x0, gfx: [0x811bc48, 0x811bc50], palette: 0x8125274, paletteOffset: 0},
      0x1f: {sprite: 0x8151524, frame: 0x71, gfx: [0x811bd30, 0x811bd38, 0x811bd40, 0x811bd48], palette: 0x81258cc, paletteOffset: 0},
      0x20: {sprite: 0x815c09c, frame: 0x0, gfx: [0x811bdf8], palette: 0x812744c, paletteOffset: 0},
      0x21: {sprite: 0x81495bc, frame: 0x1, gfx: [0x811bcc0], palette: 0x8125410, paletteOffset: 0},
      0x22: {sprite: 0x812f5ac, frame: 0x1e, gfx: [0x80f0a34], palette: 0x8124714, paletteOffset: 0},
      0x23: {sprite: 0x812f7b0, frame: 0x0, gfx: [0x80f0a44], palette: 0x812479c, paletteOffset: 0},
      0x24: {sprite: 0x813d118, frame: 0x0, gfx: [0x811bbe8], palette: 0x8124da4, paletteOffset: 0},
      0x25: {sprite: 0x8149c94, frame: 0xa, gfx: [0x811bcd0], palette: 0x8125498, paletteOffset: 0},
      0x26: {sprite: 0x814a3b4, frame: 0x0, gfx: [0x811bce0], palette: 0x81254dc, paletteOffset: 0},
      0x27: {sprite: 0x814e1b8, frame: 0xc, gfx: [0x811bd18], palette: 0x81257e0, paletteOffset: 1},
      0x28: {sprite: 0x814307c, frame: 0x0, gfx: [0x811bc10, 0x811bc18, 0x811bc20, 0x811bc28, 0x811bc30], palette: 0x81251c8, paletteOffset: 0},
      0x29: {sprite: 0x8139560, frame: 0x17, gfx: [0x811bb20], palette: 0x8124808, paletteOffset: 0},
      0x2a: {sprite: 0x8139560, frame: 0x18, gfx: [0x811bb20], palette: 0x8124808, paletteOffset: 0},
      0x2b: {sprite: 0x813b96c, frame: 0x0, gfx: [0x811bbe0], palette: 0x8124d80, paletteOffset: 0},
      0x2c: {sprite: 0x8151680, frame: 0x0, gfx: [0x811bd50], palette: 0x80df5e8, paletteOffset: 1},
      0x2d: {sprite: 0x812de6c, frame: 0x0, gfx: [0x80f0a1c], palette: 0x81246ac, paletteOffset: 0},
      0x2e: {sprite: 0x8138c30, frame: 0x0, gfx: [0x811bb10], palette: 0x81247e4, paletteOffset: 0},
      0x2f: {sprite: 0x8152640, frame: 0x0, gfx: [0x811bd60], palette: 0x81259d8, paletteOffset: 0},
      0x30: {sprite: 0x8152bc8, frame: 0x0, gfx: [0x811bd68], palette: 0x81259fc, paletteOffset: 0},
      0x31: {sprite: 0x8154764, frame: 0x0, gfx: [0x811bd90], palette: 0x8125b0c, paletteOffset: 0},
      0x32: {sprite: 0x8151680, frame: 0x0, gfx: [0x811bd50], palette: 0x80df5e8, paletteOffset: 1},
      0x33: {sprite: 0x81521fc, frame: 0x4, gfx: [0x811bd58], palette: 0x81259b4, paletteOffset: 0},
      0x34: {sprite: 0x812b9f4, frame: 0xa, gfx: [0x80e89c4], palette: 0x81239c8, paletteOffset: 0},
      0x35: {sprite: 0x812bd30, frame: 0x10, gfx: [0x80e89cc], palette: 0x8123b4c, paletteOffset: 0},
      0x36: {sprite: 0x8153948, frame: 0x0, gfx: [0x811bd70], palette: 0x8125a20, paletteOffset: 0},
      0x37: {sprite: 0x8154680, frame: 0x0, gfx: [0x811bd88], palette: 0x8125a88, paletteOffset: 0},
      0x38: {sprite: 0x812e238, frame: 0x0, gfx: [0x80f0a24], palette: 0x81246f0, paletteOffset: 0},
      0x39: {sprite: 0x8148f44, frame: 0x0, gfx: [0x811bc98], palette: 0x8125348, paletteOffset: 0},
      0x3a: {sprite: 0x81592d0, frame: 0x10, gfx: [0x8123678], palette: 0x8126aec, paletteOffset: 0},
      0x3b: {sprite: 0x8127a58, frame: 0x6, gfx: [0x80e8934], palette: 0x8123718, paletteOffset: 0},
      0x3c: {sprite: 0x815b550, frame: 0xb, gfx: [0x81236e8], palette: 0x81273a0, paletteOffset: 0},
      0x3d: {sprite: 0x81592d0, frame: 0x3, gfx: [0x8123678, 0x811bd10], palette: 0x8126aec, paletteOffset: 1},
      0x3e: {sprite: 0x813a6d0, frame: 0x0, gfx: [0x811bbd8], palette: 0x8124d5c, paletteOffset: 0},
      0x3f: {sprite: 0x813d118, frame: 0x6, gfx: [0x811bbe8], palette: 0x8124da4, paletteOffset: 1},
      0x40: {sprite: 0x8151680, frame: 0xa, gfx: [0x811bd50], palette: 0x80df5e8, paletteOffset: 4},
      0x41: {sprite: 0x812b9f4, frame: 0x10, gfx: [0x80e89c4], palette: 0x81239c8, paletteOffset: 8},
      0x42: {sprite: 0x813920c, frame: 0x0, gfx: [0x811bb18], palette: 0x812373c, paletteOffset: 0},
      0x43: {sprite: 0x81596e4, frame: 0x29, gfx: [0x8123680, 0x8123688], palette: 0x8126b30, paletteOffset: 0},
      0x44: {sprite: 0x81294e0, frame: 0x0, gfx: [0x80e898c, 0x80e8994, 0x80e899c, 0x80e89a4], palette: 0x8123834, paletteOffset: 0},
      0x45: {sprite: 0x8154398, frame: 0x0, gfx: [0x811bd80], palette: 0x8125a64, paletteOffset: 0},
      0x46: {sprite: 0x8149478, frame: 0x0, gfx: [0x811bcb0], palette: 0x8124714, paletteOffset: 2},
      0x47: {sprite: 0x8151680, frame: 0x0, gfx: [0x811bd50], palette: 0x80df5e8, paletteOffset: 1},
      0x48: {sprite: 0x814cbb0, frame: 0x0, gfx: [0x811bd20], palette: 0x8125844, paletteOffset: 1},
      0x49: {sprite: 0x8156d50, frame: 0xc, gfx: [0x811be10, 0x811be18], palette: 0x8126090, paletteOffset: 1},
      0x4a: {sprite: 0x814b8b4, frame: 0x0, gfx: [0x811bd08], palette: 0x8125714, paletteOffset: 0},
      0x4b: {sprite: 0x813e444, frame: 0x0, gfx: [0x811bbf0], palette: 0x8124de8, paletteOffset: 0},
      0x4c: {sprite: 0x8143910, frame: 0x0, gfx: [0x811bc40], palette: 0x8125250, paletteOffset: 0},
      0x4d: {sprite: 0x812f5ac, frame: 0x1f, gfx: [0x80f0a34], palette: 0x8124714, paletteOffset: 0},
      0x4e: {sprite: 0x814d1d4, frame: 0x13, gfx: [0x811bd10], palette: 0x8125798, paletteOffset: 0},
      0x4f: {sprite: 0x815cd8c, frame: 0x0, gfx: [0x8123710], palette: 0x81273c4, paletteOffset: 0},
      0x50: {sprite: 0x8130a70, frame: 0x0, gfx: [0x80f0a4c], palette: 0x81247c0, paletteOffset: 0},
      0x51: {sprite: 0x812c06c, frame: 0x10, gfx: [0x80e89d4], palette: 0x8123b90, paletteOffset: 0},
      0x52: {sprite: 0x812de6c, frame: 0x0, gfx: [0x80f0a1c], palette: 0x81246ac, paletteOffset: 1},
      0x53: {sprite: 0x814307c, frame: 0x58, gfx: [0x811bc10, 0x811bc18, 0x811bc20, 0x811bc28, 0x811bc30], palette: 0x81251c8, paletteOffset: 0},
      0x54: {sprite: 0x8159fa8, frame: 0x0, gfx: [0x8123690, 0x8123698], palette: 0x8126c54, paletteOffset: 0},
      0x55: {sprite: 0x812b6e8, frame: 0x10, gfx: [0x80e89b4, 0x80e89bc], palette: 0x8123c18, paletteOffset: 0},
      0x56: {sprite: 0x8148488, frame: 0x0, gfx: [0x811bc70, 0x811bc78], palette: 0x81252bc, paletteOffset: 0},
      0x57: {sprite: 0x8148488, frame: 0x0, gfx: [0x811bc70, 0x811bc78], palette: 0x81252bc, paletteOffset: 0},
      0x58: {sprite: 0x814a0d8, frame: 0xa, gfx: [0x811bcd8], palette: 0x8125498, paletteOffset: 1},
      0x59: {sprite: 0x814a3b4, frame: 0x0, gfx: [0x811bce0], palette: 0x81254dc, paletteOffset: 1},
      0x5a: {sprite: 0x814cbb0, frame: 0x0, gfx: [0x811bd20], palette: 0x8125844, paletteOffset: 0},
      0x5b: {sprite: 0x813a358, frame: 0x0, gfx: [0x811bbd0], palette: 0x8124d38, paletteOffset: 0},
      0x5c: {sprite: 0x812ef28, frame: 0x0, gfx: [0x80f0a2c], palette: 0x8124714, paletteOffset: 0},
      0x5d: {sprite: 0x81495bc, frame: 0x0, gfx: [0x811bcc0, 0x80e8944], palette: 0x8123760, paletteOffset: 0},
      0x5e: {sprite: 0x814e5fc, frame: 0x7, gfx: [0x811bd28], palette: 0x81258a8, paletteOffset: 0},
      0x5f: {sprite: 0x812c39c, frame: 0x10, gfx: [0x80e89dc], palette: 0x8123bd4, paletteOffset: 0},
      0x60: {sprite: 0x813f3b0, frame: 0x0, gfx: [0x811bbf8], palette: 0x8124e0c, paletteOffset: 0},
      0x61: {sprite: 0x814b398, frame: 0x0, gfx: [0x811bcf0, 0x811bcf8, 0x811bd00], palette: 0x81256b0, paletteOffset: 0},
      0x62: {sprite: 0x815bef8, frame: 0x0, gfx: [0x8123700], palette: 0x8125d64, paletteOffset: 0},
      0x63: {sprite: 0x815bad8, frame: 0x0, gfx: [0x81236f0, 0x81236f8], palette: 0x81273e8, paletteOffset: 1},
      0x64: {sprite: 0x812e238, frame: 0x0, gfx: [0x80f0a24], palette: 0x81246f0, paletteOffset: 0},
      0x65: {sprite: 0x8156d50, frame: 0x0, gfx: [0x811be10], palette: 0x8126090, paletteOffset: 0},
      0x6b: {sprite: 0x8149478, frame: 0x0, gfx: [0x811bc90], palette: 0x8124714, paletteOffset: 2},
      0x6c: {sprite: 0x812ce34, frame: 0x47, gfx: [0x80e89fc], palette: 0x8124104, paletteOffset: 1},
      0x6d: {sprite: 0x8157080, frame: 0x0, gfx: [0x811be00, 0x811be08], palette: 0x8126090, paletteOffset: 2},
      0x6e: {sprite: 0x8157410, frame: 0x0, gfx: [0x811be20], palette: 0x815f9c4, paletteOffset: 9},
      0x6f: {sprite: 0x812b9f4, frame: 0x10, gfx: [0x80e89c4], palette: 0x81239c8, paletteOffset: 0},
      0x70: {sprite: 0x8154680, frame: 0x0, gfx: [0x811bd88], palette: 0x8125a88, paletteOffset: 0},
      0x71: {sprite: 0x81571ac, frame: 0x0, gfx: [0x811bca0], palette: 0x8160474, paletteOffset: 3, y: -32},
      0x77: {sprite: 0x812b6e8, frame: 0x10, gfx: [0x80e89b4, 0x80e89bc], palette: 0x8123c18, paletteOffset: 0},
      0x78: {sprite: 0x8127e54, frame: 0x0, gfx: [0x80e893c], palette: 0x80e09d0, paletteOffset: 0},
      0x79: {sprite: 0x812b9f4, frame: 0x10, gfx: [0x80e89c4], palette: 0x81239c8, paletteOffset: 0},
      0x7a: {sprite: 0x8149478, frame: 0x0, gfx: [0x811bcb0], palette: 0x8124714, paletteOffset: 0},
      0x7b: {sprite: 0x8154680, frame: 0x0, gfx: [0x811bd88], palette: 0x8125a88, paletteOffset: 0},
      0x7c: {sprite: 0x8127a58, frame: 0x0, gfx: [0x80e8934], palette: 0x8123718, paletteOffset: 0},
    },
    objects: {
      0x0: {sprite: 0x812c4bc, frame: 0x0, gfx: [0x80e89e4], palette: 0x815da54, paletteOffset: 0},
      0x1: {sprite: 0x812c510, frame: 0x0, gfx: [0x80e89f4], palette: 0x815df60, paletteOffset: 2},
      0x2: {sprite: 0x812c5ac, frame: 0x0, gfx: [0x80e89ec], palette: 0x815ddbc, paletteOffset: 0},
      0x3: {sprite: 0x812c4bc, frame: 0x1, gfx: [0x80e89e4], palette: 0x815da54, paletteOffset: 1},
      0x5: {sprite: 0x812cf60, frame: 0x1, gfx: [0x80f0a14], palette: 0x8124528, paletteOffset: 0},
      0x6: {sprite: 0x812ce34, frame: 0x52, gfx: [0x80e89fc], palette: 0x8124528, paletteOffset: 1},
      0x8: {sprite: 0x812f5d0, frame: 0x0, gfx: [0x80f0a3c], palette: 0x8124778, paletteOffset: 0},
      0x9: {sprite: 0x81395a8, frame: 0x1, gfx: [0x811bb28], palette: 0x815e470, paletteOffset: 0},
      0xa: {sprite: 0x81395a8, frame: 0x0, gfx: [0x811bb28], palette: 0x815e470, paletteOffset: 0},
      0xb: {sprite: 0x81396f8, frame: 0x8, gfx: [0x811bb30], palette: 0x815ee48, paletteOffset: 8},
      0xc: {sprite: 0x8139878, frame: 0x5, gfx: [0x811bb30], palette: 0x815efec, paletteOffset: 8},
      0xd: {sprite: 0x81396f8, frame: 0x0, gfx: [0x811bb30], palette: 0x815ee48, paletteOffset: 4},
      0xe: {sprite: 0x8139878, frame: 0x0, gfx: [0x811bb30], palette: 0x8124978, paletteOffset: 0},
      0xf: {sprite: 0x81395a8, frame: 0x0, gfx: [0x811bb28], palette: 0x815e470, paletteOffset: 0},
      0x10: {sprite: 0x8139cec, frame: 0x0, gfx: [0x811bbc8], palette: 0x8124528, paletteOffset: 0},
      0x12: {sprite: 0x8139a58, frame: 0x8, gfx: [0x811bb48], palette: 0x8124c50, paletteOffset: 0},
      0x13: {sprite: 0x8139a58, frame: 0x0, gfx: [0x811bb48], palette: 0x8124c50, paletteOffset: 1},
      0x14: {sprite: 0x8139a58, frame: 0x6, gfx: [0x811bb48], palette: 0x8124c50, paletteOffset: 2},
      0x16: {sprite: 0x81398c0, frame: 0x0, gfx: [0x811bb38], palette: 0x815e95c, paletteOffset: 2},
      0x17: {sprite: 0x813992c, frame: 0x0, gfx: [0x811bb40], palette: 0x8124c50, paletteOffset: 0},
      0x18: {sprite: 0x8139af4, frame: 0x0, gfx: [0x811bb50], palette: 0x8124c50, paletteOffset: 3},
      0x19: {sprite: 0x8139af4, frame: 0x3, gfx: [0x811bb50], palette: 0x8124c50, paletteOffset: 3},
      0x1a: {sprite: 0x813f848, frame: 0x0, gfx: [0x811bc08], palette: 0x8124ed8, paletteOffset: 0},
      0x1c: {sprite: 0x814a45c, frame: 0x0, gfx: [0x811bce8], palette: 0x8160b04, paletteOffset: 0},
      0x1d: {sprite: 0x8139b54, frame: 0x0, gfx: [0x811bb58], palette: 0x8124c50, paletteOffset: 5},
      0x1e: {sprite: 0x814a45c, frame: 0x0, gfx: [0x811bce8], palette: 0x8160b04, paletteOffset: 0},
      0x1f: {sprite: 0x8158b5c, frame: 0x0, gfx: [0x8123658], palette: 0x81267d4, paletteOffset: 0},
      0x21: {sprite: 0x814910c, frame: 0x0, gfx: [0x811bca8], palette: 0x81607bc, paletteOffset: 3},
      0x23: {sprite: 0x814910c, frame: 0x0, gfx: [0x811bca8], palette: 0x81607bc, paletteOffset: 3},
      0x28: {sprite: 0x814cea4, frame: 0x0, gfx: [0x811bd00], palette: 0x81257bc, paletteOffset: 0},
      0x29: {sprite: 0x815a2f0, frame: 0x0, gfx: [0x81236b0], palette: 0x8127208, paletteOffset: 0},
      0x2a: {sprite: 0x8158acc, frame: 0x0, gfx: [0x8123648, 0x8123650], palette: 0x812613c, paletteOffset: 0},
      0x2b: {sprite: 0x8158c7c, frame: 0x0, gfx: [0x8123668], palette: 0x81267f8, paletteOffset: 0},
      0x2c: {sprite: 0x8158e98, frame: 0x0, gfx: [0x8123670], palette: 0x812681c, paletteOffset: 0},
      0x2d: {sprite: 0x8158bbc, frame: 0x0, gfx: [0x8123660], palette: 0x81267d4, paletteOffset: 0},
      0x2e: {sprite: 0x815a2a8, frame: 0x0, gfx: [0x81236a8], palette: 0x81271e4, paletteOffset: 0},
      0x2f: {sprite: 0x815a41c, frame: 0x0, gfx: [0x81236b8], palette: 0x8127250, paletteOffset: 0},
      0x30: {sprite: 0x815a860, frame: 0x0, gfx: [0x81236d8], palette: 0x8127358, paletteOffset: 0},
    },
    candles: {
      0x0: {sprite: 0x81548b4, frame: 0x0, gfx: [0x811bd98], palette: 0x8125bb0, paletteOffset: 0},
      0x1: {sprite: 0x8154a88, frame: 0x0, gfx: [0x811bda0], palette: 0x8125bb0, paletteOffset: 1},
      0x2: {sprite: 0x8154c08, frame: 0x0, gfx: [0x811bda8], palette: 0x8125bb0, paletteOffset: 2},
      0x3: {sprite: 0x8154d7c, frame: 0x0, gfx: [0x811bdb0], palette: 0x8125bb0, paletteOffset: 3},
      0x4: {sprite: 0x8154ecc, frame: 0x0, gfx: [0x811bdb8], palette: 0x8125cd4, paletteOffset: 0},
      0x5: {sprite: 0x815501c, frame: 0x0, gfx: [0x811bdc0], palette: 0x8125cf8, paletteOffset: 0},
      0x6: {sprite: 0x8155250, frame: 0x0, gfx: [0x811bdc8], palette: 0x8125d1c, paletteOffset: 0},
      0x7: {sprite: 0x8155484, frame: 0x0, gfx: [0x811bdd0], palette: 0x8125bb0, paletteOffset: 7},
      0x8: {sprite: 0x81556ac, frame: 0x0, gfx: [0x811bdd8], palette: 0x8125d40, paletteOffset: 0},
    },
    skullDoor: {sprite: 0x81559e8, frame: 0x1, gfx: [0x811bde8], palette: 0x8125e68, paletteOffset: 0},
  };

  function entitySpriteInfo({type, subtype, varA = 0, varB = 0}) {
    let spec;
    let assets;
    if (type === 0) {
      let id = subtype === 0x6a ? varB : subtype;
      if (id >= 0x7d && id < 0xfa) id -= 0x7d;
      if (id === 0x7a) id = 0x19;
      spec = spriteFrames.enemies[id];
      assets = (subtype === 0x6a ? spawned[id] : null) || enemies[id];
      if (assets?.variants?.[varA] && spec) {
        const [palette, paletteOffset] = assets.variants[varA][0];
        return {...spec, palette, paletteOffset};
      }
    } else if (type === 1) {
      spec = spriteFrames.objects[subtype];
      if (subtype === 5) {
        if (varA >= 2) return spriteFrames.skullDoor;
        return spec ? {...spec, paletteOffset: varA} : null;
      }
    } else if (type === 2) {
      if ((varA & 0x0fff) === 0) {
        const kind = varA >>> 12;
        return kind <= 3 ? {sprite: 0x0812ce34, frame: kind ? 0x4a : 0x47,
          gfx: [0x080e89fc], palette: 0x08124104, paletteOffset: kind ? 7 + kind : 1} : null;
      }
      spec = spriteFrames.candles[(varA & 0x0fff) - 0x10];
    }
    return spec || null;
  }

  Object.assign(globalThis.HodProfile, {enemyBankEnemies, enemyBankKey, planEnemyBank, entitySpriteInfo});
})();
