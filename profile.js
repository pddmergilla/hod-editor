'use strict';

globalThis.HodProfile = {
  size: 0x1de9dd8,
  sha256: '67b2269180ecae8b38575071c21f2b34d8285ac16561f6c0b00b3ddc0ad2cc38',
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
  spells: 0xe29d4,
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
