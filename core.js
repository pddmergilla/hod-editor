'use strict';

(() => {
  const profile = globalThis.HodProfile;
  const ROM = 0x08000000;
  const LIMIT = 0x02000000;
  const END_ENTITY = 0x7fff;
  const ENTITY_SIZE = 12;
  const MAX_ENTITIES = 31;
  const SCREEN = 256;
  const FOOTER = new TextEncoder().encode('HOD-EDITOR-EXPORT-01');
  const BANK_MARKER = new TextEncoder().encode('HOD-ENEMY-BANK-01');
  const ENEMY = 0;
  const OBJECT = 1;
  const CANDLE = 2;
  const PICKUP = 3;
  const SIGNATURES = [[0x1ec8, 0x08494d48], [0x3bc0, 0x08498d40]];
  const hex = (number, width = 2) => number.toString(16).toUpperCase().padStart(width, '0');
  const enemyBankEnemies = profile.enemyBankEnemies;
  const isBankSubtype = subtype => Number.isInteger(subtype) && subtype >= 0 &&
    Object.prototype.hasOwnProperty.call(enemyBankEnemies, String(subtype)) && !profile.bosses.includes(subtype);

  function check(condition, message) {
    if (!condition) throw new Error(message);
  }

  function integer(value, min, max, label) {
    check(Number.isInteger(value) && value >= min && value <= max,
      label + ' must be a whole number from ' + min + ' to ' + max + '.');
    return value;
  }

  function reader(bytes) {
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    return {
      byte: p => view.getUint8(p),
      half: p => view.getUint16(p, true),
      short: p => view.getInt16(p, true),
      word: p => view.getUint32(p, true),
      offset(pointer, size = 1) {
        if (!pointer) return null;
        const at = pointer - ROM;
        check(at >= 0 && at <= bytes.length - size, 'A ROM pointer falls outside the game.');
        return at;
      },
    };
  }

  function hasFooter(bytes) {
    return bytes.length >= profile.size + FOOTER.length &&
      FOOTER.every((byte, index) => bytes[bytes.length - FOOTER.length + index] === byte);
  }

  function bankTrailer(bytes) {
    const end = bytes.length - FOOTER.length;
    const markerAt = end - BANK_MARKER.length;
    if (markerAt < 4 || !BANK_MARKER.every((byte, index) => bytes[markerAt + index] === byte)) {
      return {end, rooms: null};
    }
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const size = view.getUint32(markerAt - 4, true);
    const start = markerAt - 4 - size;
    check(size > 0 && start >= profile.size, 'The enemy bank data in this export is damaged.');
    let data;
    try {
      data = JSON.parse(new TextDecoder().decode(bytes.subarray(start, markerAt - 4)));
    } catch (error) {
      throw new Error('The enemy bank data in this export is damaged.');
    }
    check(data && data.version === 1 && data.rooms && typeof data.rooms === 'object' && !Array.isArray(data.rooms),
      'The enemy bank data in this export is not supported.');
    return {end: start, rooms: data.rooms};
  }

  async function open(input) {
    check(input instanceof Uint8Array && input.length >= profile.size && input.length <= LIMIT,
      'Choose the supported modded Harmony of Dissonance GBA ROM or an editor export.');
    const fromEditor = hasFooter(input);
    const trailer = fromEditor ? bankTrailer(input) : {end: input.length, rooms: null};
    const bytes = new Uint8Array(input.subarray(0, trailer.end));
    const read = reader(bytes);
    const title = new TextDecoder().decode(bytes.subarray(0xa0, 0xb0));
    check(title === profile.title && SIGNATURES.every(([at, value]) => read.word(at) === value),
      'This ROM has a different Harmony of Dissonance layout.');
    if (!fromEditor) {
      check(profile.baseSizes.includes(bytes.length), 'This ROM differs from the supported modded base.');
      check(globalThis.crypto?.subtle, 'Open the editor from a local file or a secure website.');
      const hash = new Uint8Array(await crypto.subtle.digest('SHA-256', bytes));
      const actual = Array.from(hash, n => n.toString(16).padStart(2, '0')).join('');
      check(profile.supportedHashes.includes(actual), 'This ROM differs from the supported modded base.');
    }
    return createModel(bytes, read, trailer.rooms);
  }

  function textReader(read) {
    const decoder = new TextDecoder('shift_jis');
    return id => {
      const at = read.offset(read.word(0x495500 + id * 4), 4);
      if (at === null) return '';
      const chars = [];
      for (let i = 0; i < 100; i++) {
        let glyph = read.half(at + 2 + i * 2);
        if (glyph === 0xf00a) break;
        if (glyph >= 0xf000 || glyph < 0x8140) continue;
        if (glyph >= 0x8540) glyph = read.half(0xc5508 + (glyph - 0x8540) * 4);
        if (glyph >= 0x8140 && glyph <= 0xefff) chars.push(glyph >> 8, glyph & 255);
      }
      return decoder.decode(Uint8Array.from(chars)).normalize('NFKC').trim();
    };
  }

  function readEntity(read, at) {
    const tag = read.byte(at + 4);
    return {
      x: read.short(at), y: read.short(at + 2), slot: tag & 63, type: tag >> 6,
      subtype: read.byte(at + 5), up: read.byte(at + 6), extra: read.byte(at + 7),
      varA: read.half(at + 8), varB: read.half(at + 10),
    };
  }

  function readList(read, pointer, stride, test, limit) {
    if (!pointer) return [];
    const rows = [];
    for (let i = 0; i <= limit; i++) {
      const at = read.offset(pointer + stride * i, stride);
      if (test(at)) return rows;
      rows.push(at);
    }
    throw new Error('A ROM list has no end marker.');
  }

  function parseRoom(read, at, name, label) {
    const layerList = read.offset(read.word(at + 8), 8);
    const layer = layerList === null ? null : read.offset(read.word(layerList + 4), 16);
    const width = layer === null ? 1 : integer(read.byte(layer), 1, 15, 'Room width');
    const height = layer === null ? 1 : integer(read.byte(layer + 1), 1, 15, 'Room height');
    const flags = read.word(at + 32);
    const entities = readList(read, read.word(at + 24), ENTITY_SIZE,
      pos => read.half(pos) === END_ENTITY, MAX_ENTITIES)
      .map(pos => readEntity(read, pos))
      .map(entity => ({...entity, label: label(entity)}));
    const gfx = readList(read, read.word(at + 16), 4, pos => !read.word(pos), 40)
      .map(pos => read.word(pos));
    const paletteEntries = readList(read, read.word(at + 20), 8, pos => !read.word(pos + 4), 16)
      .map(pos => [read.word(pos), read.word(pos + 4)]);
    const palettes = paletteEntries.filter(([header]) => (header & 0xffff) === 1)
      .map(([header, pointer]) => header + '/' + pointer);

    return {
      id: hex(at, 6), name, at, layer, width, height, entities, gfx, palettes, paletteEntries, flags,
      x: (flags >>> 16) & 127, y: (flags >>> 23) & 127,
      pixelWidth: width * SCREEN, pixelHeight: height * SCREEN,
    };
  }

  function parseAreas(read, label, rooms) {
    const sectorTable = read.offset(read.word(profile.areaPointer), 84);
    const sectors = profile.sectors.flatMap((name, i) => ['A', 'B'].map((castle, j) => ({
      name, castle,
      pointers: readList(read, read.word(sectorTable + (i * 2 + j) * 4), 4,
        at => !read.word(at), 64).map(at => read.word(at)),
    })));
    sectors.push({name: 'Special rooms', castle: 'Other', pointers: profile.hardcoded.map(at => at + ROM)});
    return sectors.map(({name, castle, pointers}) => {
      const entries = [];
      pointers.forEach((pointer, index) => {
        const seen = new Set();
        let variant = 1;
        while (pointer && !seen.has(pointer)) {
          check(variant <= 20, 'A room has too many alternate states.');
          seen.add(pointer);
          const at = read.offset(pointer, 36);
          const id = hex(at, 6);
          const roomName = 'Room ' + hex(index) + (variant > 1 ? ' · State ' + variant : '');
          if (!rooms.has(id)) rooms.set(id, parseRoom(read, at, roomName, label));
          if (!entries.some(room => room.id === id)) entries.push({...rooms.get(id), name: roomName});
          pointer = read.word(at + 4);
          variant++;
        }
      });
      return {name, castle, rooms: entries};
    });
  }

  function decompress(read, at) {
    const header = read.word(at);
    const size = header >>> 8;
    check((header & 255) === 0x10 && size >= 4 && size <= 0x10000, 'Unknown compressed data.');
    const result = new Uint8Array(size);
    let source = at + 4;
    let written = 0;
    while (written < size) {
      const flags = read.byte(source++);
      for (let bit = 128; bit && written < size; bit >>= 1) {
        if (!(flags & bit)) {
          result[written++] = read.byte(source++);
          continue;
        }
        const high = read.byte(source++);
        const distance = ((high & 15) << 8 | read.byte(source++)) + 1;
        check(distance <= written, 'Invalid compressed data.');
        const count = Math.min((high >> 4) + 3, size - written);
        for (let i = 0; i < count; i++) {
          result[written] = result[written - distance];
          written++;
        }
      }
    }
    // Skip the extra four-byte header.
    return result.subarray(4);
  }

  function collisionFor(read, room, cache) {
    if (room.layer === null) return null;
    const at = read.offset(read.word(room.layer + 8), 4);
    const layout = read.offset(read.word(room.layer + 12), room.width * room.height * 128);
    if (at === null || layout === null) return null;
    if (!cache.has(at)) cache.set(at, decompress(read, at));
    const tileset = cache.get(at);
    const width = room.width * 16;
    const height = room.height * 16;
    const tiles = new Uint8Array(width * height);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const tile = read.half(layout + ((y >> 1) * (width >> 1) + (x >> 1)) * 2);
        const index = tile & 0x3fff;
        if (!index) continue;
        const subX = ((x & 1) ^ Number(Boolean(tile & 0x4000))) * 2;
        const subY = ((y & 1) ^ Number(Boolean(tile & 0x8000))) * 2;
        const mini = (index - 1) * 16 + subY * 4 + subX;
        tiles[y * width + x] = Number([0, 1, 4, 5]
          .some(offset => (tileset[mini + offset] & 15) !== 0));
      }
    }
    return {width, height, tiles};
  }

  function createModel(bytes, read, savedBankRooms) {
    const localLayers = new Map();
    const tileEdits = new Map();
    const collisionEdits = new Map();
    const sourceHalf = read.half;
    read = {...read, half: at => tileEdits.get(at) ?? sourceHalf(at)};
    const getText = textReader(read);
    const enemyNames = Array.from({length: 125}, (_, index) => {
      const name = getText(0x1cc + index);
      return name && name !== 'NULL' ? name : 'Enemy $' + hex(index);
    });
    const itemNames = new Map();
    for (const [type, , start, count, stride] of profile.items) {
      for (let i = 0; i < count; i++) {
        itemNames.set(type + '/' + i, getText(0x22 + read.half(start + i * stride)));
      }
    }
    itemNames.set('9/0', 'Life Max Up');
    itemNames.set('9/1', 'Heart Max Up');
    const pickupName = (subtype, item) => itemNames.get(subtype + '/' + item) || 'Pickup $' + hex(subtype) + '/' + hex(item);
    const enemyName = id => enemyNames[id % 125] || 'Enemy $' + hex(id);
    const bankSubtypes = Object.keys(enemyBankEnemies).map(Number).filter(isBankSubtype);
    const bankNameCounts = new Map();
    for (const subtype of bankSubtypes) {
      const name = enemyBankEnemies[subtype].label || enemyName(subtype);
      bankNameCounts.set(name, (bankNameCounts.get(name) || 0) + 1);
    }
    const bankEnemyLabel = subtype => {
      const name = enemyBankEnemies[subtype].label || enemyName(subtype);
      return bankNameCounts.get(name) > 1 ? name + ' · $' + hex(subtype) : name;
    };
    const candleAppearanceNames = new Map([
      [0x0000, 'Candle'],
      [0x1000, 'Small golden candle'],
      [0x2000, 'Candle · palette 2'],
      [0x3000, 'Candle · palette 3'],
      [0x0010, 'Green pedestal torch'],
      [0x0011, 'Brass candle stand'],
      [0x0012, 'Gold twin candle stand'],
      [0x0013, 'Blue lantern stand'],
      [0x0014, 'Green lantern stand'],
      [0x0015, 'Tripod brazier'],
      [0x0016, 'Statue torch'],
      [0x0017, 'Blue candelabra'],
      [0x0018, 'Tall blue-flame candle stand'],
    ]);
    const breakableRewards = [
      {subtype: 0, varB: 0, label: 'Small heart'},
      {subtype: 0, varB: 1, label: 'Large heart'},
      {subtype: 1, varB: 0, label: 'Money · 0'},
      {subtype: 1, varB: 1, label: 'Money · 1'},
      ...['Holy Book', 'Cross', 'Axe', 'Holy Water', 'Sacred Fist', 'Knife']
        .map((label, varB) => ({subtype: 2, varB, label})),
      ...Array.from({length: 27}, (_, varB) => {
        const label = itemNames.get('3/' + varB);
        return label ? {subtype: 3, varB, label} : null;
      }).filter(Boolean),
    ];
    const label = ({type, subtype, varA, varB}) => {
      if (type === ENEMY) {
        if (profile.spawnTimerNames[subtype]) return profile.spawnTimerNames[subtype];
        if (subtype === 0x6a) return enemyBankEnemies[profile.enemyBankKey({type, subtype, varB})]?.label || 'Enemy Spawner';
        return enemyName(subtype);
      }
      if (type === PICKUP) return pickupName(subtype, varB);
      if (type === CANDLE) {
        const appearance = candleAppearanceNames.get(varA) || 'Breakable $' + hex(varA);
        const reward = breakableRewards.find(option => option.subtype === subtype && option.varB === varB);
        return reward ? appearance + ' · ' + reward.label : appearance;
      }
      return profile.objects[subtype] || 'Object $' + hex(subtype);
    };
    const rooms = new Map();
    const areas = parseAreas(read, label, rooms);
    const savedBanks = new Map();
    for (const [id, values] of Object.entries(savedBankRooms || {})) {
      const room = rooms.get(id);
      check(room && Array.isArray(values) && values.every(isBankSubtype),
        'The enemy bank data contains an unsupported room or enemy.');
      const selected = new Set(values);
      check(selected.size === values.length, 'The enemy bank data contains an unsupported room or enemy.');
      for (const entity of room.entities) {
        const key = profile.enemyBankKey(entity);
        if (entity.type === ENEMY && entity.subtype === 0x6a && isBankSubtype(key)) selected.add(key);
      }
      check(room.entities.every(entity => entity.type !== ENEMY || !isBankSubtype(profile.enemyBankKey(entity)) ||
        selected.has(profile.enemyBankKey(entity))),
      'The enemy bank data does not match this room.');
      savedBanks.set(id, selected);
    }
    const compressedCache = new Map();
    for (const area of areas) {
      for (const room of area.rooms) {
        Object.defineProperty(room, 'collision', {get() {
          return roomCollision(room);
        }});
      }
    }

    function decompressedAt(pointer) {
      const at = read.offset(pointer, 4);
      if (at === null) return null;
      if (!compressedCache.has(at)) compressedCache.set(at, decompress(read, at));
      return compressedCache.get(at);
    }

    const paletteCache = new Map();


    function backgroundPalette(room) {
      const entries = readList(read, read.word(room.at + 20), 8, at => !read.word(at + 4), 16);
      const wrapper = entries.find(at => read.half(at) === 0);
      if (wrapper === undefined) return null;
      const pointer = read.word(wrapper + 4);
      if (paletteCache.has(pointer)) return paletteCache.get(pointer);
      const start = read.offset(pointer, 4);
      const count = read.byte(start + 2) * 16;
      const data = read.offset(pointer + 4, count * 2);
      const colors = new Uint8Array(count * 3);
      for (let i = 0; i < count; i++) {
        const value = read.half(data + i * 2);
        for (let channel = 0; channel < 3; channel++) {
          const five = (value >>> (5 * channel)) & 31;
          colors[i * 3 + channel] = (five << 3) | (five >> 2);
        }
      }
      paletteCache.set(pointer, colors);
      return colors;
    }

    function backgroundGraphics(room) {
      const listAt = read.offset(read.word(room.at + 12), 16);
      if (listAt === null) return [];
      return Array.from({length: 4}, (_, slot) => {
        const pointer = read.word(listAt + slot * 4);
        if (!pointer) return null;
        const wrapperAt = read.offset(pointer, 8);
        const kind = read.byte(wrapperAt);
        const bpp = read.byte(wrapperAt + 1);
        let data;
        if (kind === 1) {
          data = decompressedAt(read.word(wrapperAt + 4));
        } else if (kind === 0) {
          const length = read.byte(wrapperAt + 3) * 512;
          const dataAt = read.offset(pointer + 4, length);
          data = bytes.subarray(dataAt, dataAt + length);
        }
        return data?.length ? {data, bpp} : null;
      });
    }

    const entityArtCache = new Map();
    const spritePageCache = new Map();

    function spritePage(pointer) {
      if (spritePageCache.has(pointer)) return spritePageCache.get(pointer);
      const at = read.offset(pointer, 8);
      check(read.byte(at + 1) === 4, 'Unsupported sprite colors.');
      const kind = read.byte(at);
      check(kind === 0 || kind === 1, 'Unsupported sprite artwork.');
      const size = read.byte(at + 3) * 512;
      const start = kind === 0 ? read.offset(pointer + 4, size) : null;
      const data = kind === 1 ? decompressedAt(read.word(at + 4)) : bytes.subarray(start, start + size);
      spritePageCache.set(pointer, data);
      return data;
    }

    function renderEntitySprite(entity) {
      if (entity.type === PICKUP) {
        let icon;
        if (entity.subtype === 9 && entity.varB <= 1) {
          icon = renderItemIcon(0x0c + entity.varB, 1);
        } else {
          const group = profile.items.find(([type]) => type === entity.subtype);
          if (!group || entity.varB >= group[3]) return null;
          const prefix = {3: 'consumable-', 4: 'whip-', 5: 'equip-'}[entity.subtype] || 'item' + entity.subtype + '-';
          const id = prefix + entity.varB;
          const at = group[2] + entity.varB * group[4];
          icon = renderItemIcon(statEdits.get(id + '-icon') ?? read.byte(at + 2),
            statEdits.get(id + '-palette') ?? read.byte(at + 3));
        }
        return icon ? {...icon, x: -8, y: -16} : null;
      }
      const spec = profile.entitySpriteInfo(entity);
      if (!spec) return null;
      const key = JSON.stringify(spec);
      if (entityArtCache.has(key)) return entityArtCache.get(key);
      let result = null;
      try {
        const header = read.offset(spec.sprite, 12);
        const count = read.half(header);
        check(count > 0 && count < 256 && spec.frame < count, 'Unsupported sprite frame.');
        const frame = read.offset(read.word(header + 4) + spec.frame * 12, 12);
        const partCount = read.half(frame + 4);
        check(partCount > 0 && partCount <= 128, 'Unsupported sprite parts.');
        const first = read.offset(read.word(frame + 8), partCount * 12);
        const parts = Array.from({length: partCount}, (_, i) => {
          const at = first + i * 12;
          const signed = value => value < 128 ? value : value - 256;
          return {x: signed(read.byte(at)), y: signed(read.byte(at + 1)),
            gx: read.byte(at + 4) & ~7, gy: read.byte(at + 5) & ~7,
            w: read.byte(at + 6), h: read.byte(at + 7),
            page: read.byte(at + 9), flips: read.byte(at + 10)};
        });
        check(parts.every(p => p.w > 0 && p.w <= 64 && p.h > 0 && p.h <= 64 && p.page < spec.gfx.length),
          'Unsupported sprite dimensions.');
        const x = Math.min(...parts.map(p => p.x));
        const y = Math.min(...parts.map(p => p.y));
        const width = Math.max(...parts.map(p => p.x + p.w)) - x;
        const height = Math.max(...parts.map(p => p.y + p.h)) - y;
        const pixels = new Uint8ClampedArray(width * height * 4);
        const palette = read.offset(spec.palette, 4);
        check(spec.paletteOffset >= 0 && spec.paletteOffset < read.byte(palette + 2), 'Unsupported sprite palette.');
        const colors = read.offset(spec.palette + 4 + spec.paletteOffset * 32, 32);
        const pages = spec.gfx.map(spritePage);
        // Draw back parts first.
        for (const part of parts.reverse()) {
          const data = pages[part.page];
          for (let py = 0; py < part.h; py++) {
            for (let px = 0; px < part.w; px++) {
              const sx = part.gx + (part.flips & 2 ? part.w - 1 - px : px);
              const sy = part.gy + (part.flips & 1 ? part.h - 1 - py : py);
              if (sx >= 128 || sy >= 128) continue;
              const address = ((sy >> 3) * 16 + (sx >> 3)) * 32 + (sy & 7) * 4 + ((sx & 7) >> 1);
              if (address >= data.length) continue;
              const color = (data[address] >>> ((sx & 1) * 4)) & 15;
              if (!color) continue;
              const rgb = read.half(colors + color * 2);
              const out = ((part.y - y + py) * width + part.x - x + px) * 4;
              for (let c = 0; c < 3; c++) {
                const five = (rgb >>> (c * 5)) & 31;
                pixels[out + c] = (five << 3) | (five >> 2);
              }
              pixels[out + 3] = 255;
            }
          }
        }
        if (pixels.some((value, index) => index % 4 === 3 && value)) {
          result = {x: x + (spec.x || 0), y: y + (spec.y || 0), width, height, pixels};
        }
      } catch (error) {
        // Keep invisible helpers selectable.
      }
      entityArtCache.set(key, result);
      return result;
    }

    function decompressHeader(at) {
      const output = [];
      let source = at + 4;
      while (output.length < 4) {
        const flags = read.byte(source++);
        for (let bit = 128; bit && output.length < 4; bit >>= 1) {
          if (!(flags & bit)) output.push(read.byte(source++));
          else {
            const high = read.byte(source++);
            const distance = ((high & 15) << 8 | read.byte(source++)) + 1;
            check(distance <= output.length, 'Invalid collision header.');
            for (let i = 0; i < (high >> 4) + 3 && output.length < 4; i++) output.push(output[output.length - distance]);
          }
        }
      }
      return output;
    }

    function getTileLayers(id) {
      const room = roomById(id);
      const list = read.offset(read.word(room.at + 8), 24);
      if (list === null) return [];
      const layers = [];
      for (let index = 0; index < 3; index++) {
        const entry = list + index * 8;
        const pointer = read.word(entry + 4);
        if (!pointer) continue;
        const metadata = read.offset(pointer, 16);
        const type = read.half(metadata + 2);
        const width = read.byte(metadata) * 8, height = read.byte(metadata + 1) * 8;
        if (![2, 3].includes(type) || !width || !height || width > 120 || height > 120) continue;
        const tilesetPointer = read.word(metadata + 4);
        const layoutPointer = read.word(metadata + 12);
        if (!tilesetPointer || !layoutPointer) continue;
        const tileset = decompressedAt(tilesetPointer);
        const layoutAt = read.offset(layoutPointer, width * height * 2);
        const collisionPointer = read.word(metadata + 8);
        layers.push({index, metadata, width, height, type, tilesetPointer, collisionPointer,
          layoutAt, bgControl: read.half(entry + 2), data: tileset, collision: collisionPointer ? decompressedAt(collisionPointer) : null, z: read.byte(entry), count: Math.min(0x4000, tileset.length / (type === 3 ? 16 : 32) + 1),
          key: type + '/' + tilesetPointer + '/' + collisionPointer,
          values: Uint16Array.from({length: width * height}, (_, i) => read.half(layoutAt + i * 2))});
      }
      return layers.map(layer => ({...layer, ...localLayers.get(id + '/' + layer.index),
        baseKey: layer.key, key: layer.key + (localLayers.has(id + '/' + layer.index) ? '/' + id : '')}));
    }

    function editTiles(id, index, changes) {
      const layer = getTileLayers(id).find(row => row.index === index);
      check(layer, 'Choose an available layer.');
      if (localLayers.has(id + '/' + index)) {
        const values = layer.values.slice();
        for (const {x, y, value} of changes) {
          integer(x, 0, layer.width - 1, 'Tile X'); integer(y, 0, layer.height - 1, 'Tile Y');
          integer(value, 0, 65535, 'Tile ID'); check((value & 0x3fff) < layer.count, 'This tile is outside the room tileset.');
          values[y * layer.width + x] = value;
        }
        if (values.some((v, i) => v !== layer.values[i])) saveLocalLayer(id, index, {...localLayers.get(id + '/' + index), values});
        return;
      }
      const writes = new Map();
      for (const {x, y, value} of changes) {
        integer(x, 0, layer.width - 1, 'Tile X');
        integer(y, 0, layer.height - 1, 'Tile Y');
        integer(value, 0, 65535, 'Tile ID');
        check((value & 0x3fff) < layer.count, 'This tile is outside the room tileset.');
        writes.set(layer.layoutAt + (y * layer.width + x) * 2, value);
      }
      const previous = new Map([...writes.keys()].map(at => [at, tileEdits.get(at)]));
      if (![...writes].some(([at, value]) => read.half(at) !== value)) return;
      history.push(() => previous.forEach((value, at) => value === undefined ? tileEdits.delete(at) : tileEdits.set(at, value)));
      writes.forEach((value, at) => value === sourceHalf(at) ? tileEdits.delete(at) : tileEdits.set(at, value));
    }

    function getTileCollision(id, index, reference) {
      const layer = getTileLayers(id).find(row => row.index === index);
      check(layer && layer.collisionPointer, 'This layer has no collision definitions.');
      const data = layer.collision;
      const tile = reference & 0x3fff;
      check(tile > 0 && tile * 16 <= data.length, 'Choose a nonempty tile with collision.');
      return data.slice((tile - 1) * 16, tile * 16);
    }

    function editTileCollision(id, index, reference, value) {
      integer(value, 0, 255, 'Collision value');
      getTileCollision(id, index, reference);
      const layer = getTileLayers(id).find(row => row.index === index);
      if (localLayers.has(id + '/' + index)) {
        const collision = layer.collision.slice(), start = ((reference & 0x3fff) - 1) * 16;
        if (collision.subarray(start, start + 16).every(n => n === value)) return;
        collision.fill(value, start, start + 16);
        saveLocalLayer(id, index, {...localLayers.get(id + '/' + index), collision}); return;
      }
      const at = read.offset(layer.collisionPointer, 4);
      const data = decompressedAt(layer.collisionPointer);
      const start = ((reference & 0x3fff) - 1) * 16;
      const old = data.slice(start, start + 16);
      if (old.every(n => n === value)) return;
      const wasEdited = collisionEdits.has(at);
      history.push(() => {data.set(old, start); if (!wasEdited) collisionEdits.delete(at);});
      data.fill(value, start, start + 16);
      collisionEdits.set(at, data);
    }

    function editTileCollisions(id, index, references, value) {
      integer(value, 0, 255, 'Collision value');
      references.forEach(reference => getTileCollision(id, index, reference));
      const start = history.length;
      try {references.forEach(reference => editTileCollision(id, index, reference, value));}
      catch (error) {while (history.length > start) history.pop()(); throw error;}
      const steps = history.splice(start);
      if (steps.length) history.push(() => steps.reverse().forEach(undo => undo()));
    }

    function saveLocalLayer(id, index, edit) {
      const key = id + '/' + index, previous = localLayers.get(key);
      history.push(() => previous ? localLayers.set(key, previous) : localLayers.delete(key));
      localLayers.set(key, edit);
    }

    function roomCollision(room) {
      const layer = getTileLayers(room.id).find(row => row.index === 0);
      if (!layer?.collision) return null;
      const width = layer.width * 2, height = layer.height * 2;
      const tiles = new Uint8Array(width * height);
      for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
        const ref = layer.values[(y >> 1) * layer.width + (x >> 1)], id = ref & 0x3fff;
        if (!id) continue;
        const sx = ((x & 1) ^ Number(Boolean(ref & 0x4000))) * 2;
        const sy = ((y & 1) ^ Number(Boolean(ref & 0x8000))) * 2;
        const at = (id - 1) * 16 + sy * 4 + sx;
        tiles[y * width + x] = Number([0, 1, 4, 5].some(i => (layer.collision[at + i] & 15) !== 0));
      }
      return {width, height, tiles};
    }

    function sampleTileCells(id, index, reference) {
      const layer = getTileLayers(id).find(row => row.index === index);
      check(layer, 'Choose an available layer.');
      integer(reference, 0, 65535, 'Tile ID');
      const tile = reference & 0x3fff;
      check(tile < layer.count, 'This tile is outside the room tileset.');
      const stride = layer.type === 3 ? 1 : 2;
      return Array.from({length: 16}, (_, i) => {
        if (!tile) return {ref: 0, h: false, v: false};
        const x = i % 4, y = i >> 2;
        const at = ((tile - 1) * 16 + (reference & 0x8000 ? 3 - y : y) * 4 + (reference & 0x4000 ? 3 - x : x)) * stride;
        const raw = layer.data[at] | (stride === 2 ? layer.data[at + 1] << 8 : 0);
        return {ref: raw, h: Boolean(reference & 0x4000), v: Boolean(reference & 0x8000)};
      });
    }

    function editTileCells(id, index, changes) {
      const layer = getTileLayers(id).find(row => row.index === index);
      check(layer, 'Choose an available layer.');
      const data = layer.data.slice(), values = layer.values.slice(), collision = layer.collision?.slice();
      const stride = layer.type === 3 ? 1 : 2, blockSize = stride * 16;
      const groups = new Map();
      const room = roomById(id), graphics = backgroundGraphics(room);
      const charBase = ((layer.bgControl >> 2) & 3) * 0x4000;
      function orient(cell, h, v) {
        integer(cell.ref, 0, stride === 1 ? 255 : 65535, 'Tile piece');
        const flipH = Boolean(cell.h) !== h, flipV = Boolean(cell.v) !== v;
        if (stride === 2) return cell.ref ^ (flipH ? 0x400 : 0) ^ (flipV ? 0x800 : 0);
        if ((!flipH && !flipV) || !cell.ref) return cell.ref;
        function graphic(ref) {
          const address = charBase + ref * 64;
          const slot = address >= 0x8000 ? 3 : address >>> 13, page = graphics[slot];
          const start = address - (slot === 3 ? 0x8000 : slot * 0x2000);
          return page?.bpp === 8 && start >= 0 && start + 64 <= page.data.length ? page.data.subarray(start, start + 64) : null;
        }
        const source = graphic(cell.ref);
        check(source, 'This flipped piece has no matching artwork.');
        for (let candidate = 1; candidate < 256; candidate++) {
          const pixels = graphic(candidate); if (!pixels) continue;
          if (pixels.every((pixel, i) => pixel === source[(flipV ? 7 - (i >> 3) : i >> 3) * 8 + (flipH ? 7 - (i & 7) : i & 7)])) return candidate;
        }
        throw new Error('This background has no flipped version of that piece. Turn off Flip X/Y or copy an unflipped piece.');
      }
      for (const change of changes) {
        integer(change.x, 0, layer.width * 4 - 1, 'Piece X'); integer(change.y, 0, layer.height * 4 - 1, 'Piece Y');
        const block = (change.y >> 2) * layer.width + (change.x >> 2);
        if (!groups.has(block)) groups.set(block, []);
        groups.get(block).push(change);
      }
      for (const [block, edits] of groups) {
        const reference = values[block], tile = reference & 0x3fff;
        const h = Boolean(reference & 0x4000), v = Boolean(reference & 0x8000);
        const desired = tile ? data.slice((tile - 1) * blockSize, tile * blockSize) : new Uint8Array(blockSize);
        const oldCollision = collision ? (tile ? collision.slice((tile - 1) * 16, tile * 16) : new Uint8Array(16)) : null;
        check(!oldCollision || oldCollision.length === 16, 'This tile has incomplete collision data.');
        for (const {x, y, cell} of edits) {
          const sx = h ? 3 - (x & 3) : x & 3, sy = v ? 3 - (y & 3) : y & 3;
          const at = (sy * 4 + sx) * stride, raw = orient(cell, h, v);
          desired[at] = raw & 255; if (stride === 2) desired[at + 1] = raw >> 8;
        }
        if (tile ? desired.every((b, i) => b === data[(tile - 1) * blockSize + i]) : desired.every(b => b === 0)) continue;
        const limit = Math.min(layer.count, collision ? collision.length / 16 + 1 : layer.count);
        let chosen = 0;
        for (let candidate = 1; candidate < limit; candidate++) {
          if (desired.every((b, i) => b === data[(candidate - 1) * blockSize + i]) &&
              (!collision || oldCollision.every((b, i) => b === collision[(candidate - 1) * 16 + i]))) {chosen = candidate; break;}
        }
        if (!chosen) {
          const used = new Set(Array.from(values, (ref, i) => i === block ? 0 : ref & 0x3fff));
          for (let candidate = 1; candidate < limit; candidate++) if (!used.has(candidate)) {chosen = candidate; break;}
          check(chosen, 'This layer has no spare tile combinations. Undo a small-brush edit or use 32 × 32 painting.');
          data.set(desired, (chosen - 1) * blockSize);
          if (collision) collision.set(oldCollision, (chosen - 1) * 16);
        }
        values[block] = chosen | (reference & 0xc000);
      }
      if (data.every((b, i) => b === layer.data[i]) && values.every((b, i) => b === layer.values[i])) return;
      saveLocalLayer(id, index, {data, values, collision});
    }

    function packTileData(data) {
      const size = data.length + 4, raw = new Uint8Array(size);
      new DataView(raw.buffer).setUint32(0, (size << 8) | 0x10, true); raw.set(data, 4);
      const packed = new Uint8Array(4 + size + Math.ceil(size / 8));
      new DataView(packed.buffer).setUint32(0, (size << 8) | 0x10, true);
      let pos = 4;
      for (let i = 0; i < size; i += 8) {packed[pos++] = 0; const part = raw.subarray(i, i + 8); packed.set(part, pos); pos += part.length;}
      return packed;
    }

    function renderRoomArt(id, options = {}) {
      const room = roomById(id);
      const layerListAt = read.offset(read.word(room.at + 8), 24);
      if (layerListAt === null) return null;
      const palette = backgroundPalette(room);
      const graphics = backgroundGraphics(room);
      if (!palette || !graphics.some(Boolean)) return null;

      const rows = [];
      const effects = [];
      for (let index = 0; index < 3; index++) {
        const entry = layerListAt + index * 8;
        const visualEffect = read.byte(entry + 1);
        effects.push({index, visualEffect});
        const metadataPointer = read.word(entry + 4);
        if (!metadataPointer) continue;
        const metadata = read.offset(metadataPointer, 16);
        const layerWidth = read.byte(metadata);
        const layerHeight = read.byte(metadata + 1);
        const type = read.half(metadata + 2);
        if (!layerWidth || !layerHeight || layerWidth > 15 || layerHeight > 15 ||
            (type !== 2 && type !== 3)) continue;
        const tilesetPointer = read.word(metadata + 4);
        const layoutPointer = read.word(metadata + 12);
        if (!tilesetPointer || !layoutPointer) continue;
        const layoutAt = read.offset(layoutPointer, layerWidth * layerHeight * 128);
        const tileset = decompressedAt(tilesetPointer);
        if (!tileset?.length) continue;
        rows.push({
          index, z: read.byte(entry), bgControl: read.half(entry + 2),
          width: layerWidth, height: layerHeight, type, layoutAt, tileset,
        });
      }
      for (const row of rows) {const layer = getTileLayers(id).find(layer => layer.index === row.index); row.tileset = layer.data; row.values = layer.values;}
      if (!rows.length) return null;

      const paletteLayer = options.palette === undefined ? null : rows.find(row => row.index === options.palette);
      if (options.palette !== undefined && !paletteLayer) return null;
      const paletteCount = paletteLayer ? getTileLayers(id).find(row => row.index === options.palette).count : 0;
      const width = paletteLayer ? 8 * 32 : room.pixelWidth;
      const height = paletteLayer ? Math.ceil(paletteCount / 8) * 32 : room.pixelHeight;
      const pixels = new Uint8ClampedArray(width * height * 4);
      for (let i = 3; i < pixels.length; i += 4) pixels[i] = 255;
      const effect = effects.filter(row => row.visualEffect === 0x0d || row.visualEffect === 0x0f).at(-1);
      rows.sort((a, b) => b.z - a.z);

      for (const layer of rows) {
        if (paletteLayer && layer !== paletteLayer) continue;
        if (!paletteLayer && options.hidden?.includes(layer.index)) continue;
        const halfAlpha = effect && ((effect.visualEffect === 0x0d && layer.index === 1) ||
          (effect.visualEffect === 0x0f && layer.index === 0));
        const alpha = halfAlpha ? ((15 << 3) | (15 >> 2)) : 255;
        const charBase = ((layer.bgControl >> 2) & 3) * 0x4000;
        const blockCache = new Map();
        const mapWidth = paletteLayer ? 8 : layer.width * 8;
        const mapHeight = paletteLayer ? Math.ceil(paletteCount / 8) : layer.height * 8;

        function renderBlock(reference) {
          if (blockCache.has(reference)) return blockCache.get(reference);
          const output = new Uint8Array(32 * 32 * 4);
          const blockIndex = reference & 0x3fff;
          const blockH = Boolean(reference & 0x4000);
          const blockV = Boolean(reference & 0x8000);

          const wide = layer.type === 3;
          const bytesPerTile = wide ? 16 : 32;
          const tileStart = (blockIndex - 1) * bytesPerTile;
          if (tileStart + bytesPerTile > layer.tileset.length) return output;

          for (let miniY = 0; miniY < 4; miniY++) {
            for (let miniX = 0; miniX < 4; miniX++) {
              const sourceMiniX = blockH ? 3 - miniX : miniX;
              const sourceMiniY = blockV ? 3 - miniY : miniY;
              const miniIndex = sourceMiniY * 4 + sourceMiniX;
              const at = tileStart + miniIndex * (wide ? 1 : 2);
              const ref = wide ? layer.tileset[at] : layer.tileset[at] | (layer.tileset[at + 1] << 8);
              const bytesPerMini = wide ? 64 : 32;
              const vram = charBase + (ref & 255) * bytesPerMini + (wide ? 0 : ((ref >> 8) & 3) * 0x2000);
              const slot = vram >= 0x8000 ? 3 : vram >>> 13;
              const page = graphics[slot];
              const gfxAt = vram - (slot === 3 ? 0x8000 : slot * 0x2000);
              if (page?.bpp !== (wide ? 8 : 4) || gfxAt < 0 || gfxAt + bytesPerMini > page.data.length) continue;
              const flipX = blockH !== (!wide && Boolean(ref & 0x400));
              const flipY = blockV !== (!wide && Boolean(ref & 0x800));
              const paletteBase = wide ? 0 : (ref >>> 12) * 16;

              for (let py = 0; py < 8; py++) {
                const sourceY = flipY ? 7 - py : py;
                for (let px = 0; px < 8; px++) {
                  const sourceX = flipX ? 7 - px : px;
                  const source = sourceY * 8 + sourceX;
                  const packed = page.data[gfxAt + (wide ? source : source >> 1)];
                  const colorIndex = wide ? packed : (packed >>> ((source & 1) * 4)) & 15;
                  const color = (paletteBase + colorIndex) * 3;
                  if (!colorIndex || color >= palette.length) continue;
                  const out = ((miniY * 8 + py) * 32 + miniX * 8 + px) * 4;
                  output[out] = palette[color];
                  output[out + 1] = palette[color + 1];
                  output[out + 2] = palette[color + 2];
                  output[out + 3] = 255;
                }
              }
            }
          }
          blockCache.set(reference, output);
          return output;
        }

        for (let blockY = 0; blockY < mapHeight && blockY * 32 < height; blockY++) {
          for (let blockX = 0; blockX < mapWidth && blockX * 32 < width; blockX++) {
            const reference = paletteLayer ? blockY * mapWidth + blockX : layer.values[blockY * mapWidth + blockX];
            if (!(reference & 0x3fff)) continue;
            const block = renderBlock(reference);
            for (let y = 0; y < 32 && blockY * 32 + y < height; y++) {
              for (let x = 0; x < 32 && blockX * 32 + x < width; x++) {
                const from = (y * 32 + x) * 4;
                if (!block[from + 3]) continue;
                const to = ((blockY * 32 + y) * width + blockX * 32 + x) * 4;
                if (alpha === 255) {
                  pixels[to] = block[from];
                  pixels[to + 1] = block[from + 1];
                  pixels[to + 2] = block[from + 2];
                } else {
                  const inverse = 255 - alpha;
                  pixels[to] = Math.round((block[from] * alpha + pixels[to] * inverse) / 255);
                  pixels[to + 1] = Math.round((block[from + 1] * alpha + pixels[to + 1] * inverse) / 255);
                  pixels[to + 2] = Math.round((block[from + 2] * alpha + pixels[to + 2] * inverse) / 255);
                }
              }
            }
          }
        }
      }
      return {width, height, pixels};
    }

    const roomEdits = new Map();
    const roomResourceEdits = new Map();
    const bankEdits = new Map();
    const statEdits = new Map();
    const fields = new Map();
    const history = [];
    const fixedPickupFlags = new Set();
    const donors = new Map();
    const pickupTemplates = new Map();
    const enemySubtypes = new Set(enemyNames.flatMap((name, subtype) => name.startsWith('Enemy $') ? [] : [subtype]));
    const roomTemplates = new Map();

    function templateId(entity) {
      return [entity.type, entity.subtype, entity.up, entity.extra,
        entity.type === PICKUP ? 0 : entity.varA, entity.varB].join('/');
    }

    for (const room of rooms.values()) {
      for (const entity of room.entities) {
        if (entity.type === PICKUP) {
          fixedPickupFlags.add(entity.varA);
          continue;
        }
        if (entity.type !== ENEMY && entity.type !== CANDLE) continue;
        if (entity.type === ENEMY) enemySubtypes.add(entity.subtype);
        const id = templateId(entity);
        if (!donors.has(id)) donors.set(id, {id, ...entity, rooms: []});
        if (!donors.get(id).rooms.includes(room)) donors.get(id).rooms.push(room);
      }
    }
    const spawnTimerDonors = new Map();
    for (const donor of donors.values()) {
      if (donor.type === ENEMY && profile.spawnTimerDefaults[donor.subtype] && !spawnTimerDonors.has(donor.subtype)) {
        spawnTimerDonors.set(donor.subtype, donor);
      }
    }
    for (const [key, item] of itemNames) {
      if (!item) continue;
      const [subtype, varB] = key.split('/').map(Number);
      const entity = {type: PICKUP, subtype, varB, varA: 0, up: 0, extra: 0, label: item};
      const id = templateId(entity);
      pickupTemplates.set(id, {id, ...entity});
    }

    function roomById(id) {
      const room = rooms.get(id);
      check(room, 'Choose a valid room.');
      return room;
    }

    function baseTemplatesFor(id) {
      if (!roomTemplates.has(id)) {
        const room = roomById(id);
        const local = new Map();
        for (const entity of room.entities) {
          if (entity.type !== ENEMY && entity.type !== CANDLE) continue;
          const id = templateId(entity);
          local.set(id, donors.get(id));
        }
        for (const [id, donor] of donors) {
          // Match the donor's loaded art and palette slots.
          if (local.has(id) || (donor.type === ENEMY && (profile.bosses.includes(donor.subtype) || donor.subtype >= 0x64))) continue;
          if (donor.rooms.some(other => other.gfx.every(gfx => room.gfx.includes(gfx)) &&
            other.palettes.every(palette => room.palettes.includes(palette)))) local.set(id, donor);
        }
        for (const [id, entity] of pickupTemplates) local.set(id, entity);
        roomTemplates.set(id, local);
      }
      return roomTemplates.get(id);
    }

    function customBankFor(id) {
      return bankEdits.get(id) || savedBanks.get(id);
    }

    function originalBankFor(id) {
      return savedBanks.get(id) || new Set([...baseTemplatesFor(id).values()]
        .filter(template => template.type === ENEMY && isBankSubtype(profile.enemyBankKey(template)))
        .map(template => profile.enemyBankKey(template)));
    }

    function templatesFor(id) {
      const templates = baseTemplatesFor(id);
      const active = customBankFor(id);
      if (!active) return templates;
      const resources = roomResourceEdits.get(id) || roomById(id);
      const currentGfx = resources.gfx;
      const currentPalettes = resources.paletteEntries.map(([header, pointer]) => header + '/' + pointer);
      const localIds = new Set(roomById(id).entities
        .filter(entity => entity.type === ENEMY || entity.type === CANDLE)
        .map(templateId));
      const selected = new Map();
      for (const [templateKey, template] of templates) {
        const bankKey = profile.enemyBankKey(template);
        const bankEnemy = template.type === ENEMY && isBankSubtype(bankKey);
        if (bankEnemy && !active.has(bankKey)) continue;
        if (localIds.has(templateKey)) {
          selected.set(templateKey, template);
          continue;
        }
        const matchesResources = !template.rooms || template.rooms.some(other =>
          other.gfx.every(gfx => currentGfx.includes(gfx)) &&
          other.palettes.every(palette => currentPalettes.includes(palette)));
        if (matchesResources) selected.set(templateKey, template);
      }
      for (const subtype of active) {
        const entity = bankTemplate(subtype);
        const templateKey = templateId(entity);
        if (!selected.has(templateKey)) {
          selected.set(templateKey, {...entity, id: templateKey, label: label(entity)});
        }
      }
      return selected;
    }

    function getTemplates(id) {
      const variants = new Map();
      const templates = [...templatesFor(id).values()];
      for (const template of templates) {
        const key = template.type + '/' + template.label;
        variants.set(key, (variants.get(key) || 0) + 1);
      }
      return templates.map(template => ({
        id: template.id, type: template.type,
        label: variants.get(template.type + '/' + template.label) > 1
          ? template.label + ' · $' + hex(template.subtype) + '/' + hex(template.varA) + '/' + hex(template.varB)
          : template.label,
      })).sort((a, b) => a.type - b.type || a.label.localeCompare(b.label));
    }

    function getEnemyOptions(id) {
      const templates = [...templatesFor(id).values()].filter(template => template.type === ENEMY);
      const bySubtype = new Map();
      for (const template of templates) {
        if (!bySubtype.has(template.subtype)) bySubtype.set(template.subtype, []);
        bySubtype.get(template.subtype).push(template);
      }
      const subtypes = new Set([...enemySubtypes, ...templates.map(template => template.subtype)]);
      return [...subtypes].sort((a, b) => a - b).map(subtype => {
        const name = subtype === 0x6a ? 'Enemy Spawner' : profile.spawnTimerNames[subtype] || enemyNames[subtype];
        const variants = bySubtype.get(subtype) || [];
        const choices = variants.map((template, index) => ({
          id: template.id,
          label: subtype === 0x6a ? template.label : variants.length > 1 ? 'Variant ' + (index + 1) : template.label,
        }));
        return {subtype, label: name || 'Enemy $' + hex(subtype), available: choices.length > 0, variants: choices};
      });
    }

    function bankPlan(room, newBank, rows) {
      return profile.planEnemyBank(room, [...originalBankFor(room.id)], [...newBank], rows, read);
    }

    function bankTemplate(subtype) {
      const descriptor = enemyBankEnemies[subtype];
      return {
        type: ENEMY, subtype: descriptor.subtype ?? subtype, up: 0, extra: 0,
        varA: descriptor.varA ?? 0, varB: descriptor.varB ?? 0,
      };
    }

    function bankSwap(room, rows, selected, source, target) {
      const nextBank = new Set(selected);
      nextBank.delete(source);
      nextBank.add(target);
      const template = bankTemplate(target);
      const replacesEntities = rows.some(entity => entity.type === ENEMY && profile.enemyBankKey(entity) === source);
      let nextRows = rows.map(entity => entity.type === ENEMY && profile.enemyBankKey(entity) === source
        ? place(template, entity.slot, entity.x, entity.y)
        : entity);
      try {
        if (isSpawner(template) && replacesEntities) {
          checkSpawnerSpecies(nextRows, template);
          const marker = nextRows.find(isSpawner);
          if (marker) nextRows = addMissingSpawnerHelpers(room, nextRows, marker);
          check(nextRows.length <= MAX_ENTITIES, 'The spawner and its timers need more entity slots. This room holds 31.');
        } else if (enemyBankEnemies[source]?.subtype === 0x6a && rows.some(isSpawner) && !nextRows.some(isSpawner)) {
          nextRows = nextRows.filter(entity => !isSpawnerTimer(entity));
        }
      } catch (error) {
        return {nextBank, nextRows: rows, resources: {reason: error.message}};
      }
      return {nextBank, nextRows, resources: bankPlan(room, nextBank, nextRows)};
    }

    function getEnemyBank(id) {
      const room = roomById(id);
      const rows = getEntities(id);
      const selected = customBankFor(id) || originalBankFor(id);
      return [...selected].sort((a, b) => a - b).map(source => ({
        subtype: source,
        label: bankEnemyLabel(source),
        choices: bankSubtypes.map(target => {
          const label = bankEnemyLabel(target);
          if (target === source) return {subtype: target, label, available: true};
          const reason = selected.has(target)
            ? 'This enemy already has a bank slot.'
            : bankSwap(room, rows, selected, source, target).resources.reason;
          return {subtype: target, label, available: !reason, reason};
        }),
      }));
    }

    function getEnemyBankAddOptions(id) {
      const room = roomById(id);
      const rows = getEntities(id);
      const selected = customBankFor(id) || originalBankFor(id);
      return bankSubtypes.map(subtype => {
        const reason = selected.has(subtype)
          ? 'This enemy already has a bank slot.'
          : bankPlan(room, new Set([...selected, subtype]), rows).reason;
        return {subtype, label: bankEnemyLabel(subtype), available: !reason, reason};
      });
    }

    function breakableAppearances(id) {
      const compatible = new Set([...templatesFor(id).values()]
        .filter(template => template.type === CANDLE)
        .map(template => template.varA));
      return [...candleAppearanceNames].filter(([value]) => (value & 0x0fff) === 0 || compatible.has(value))
        .map(([value, label]) => ({value, label}));
    }

    function getBreakableOptions(id) {
      return {appearances: breakableAppearances(id), rewards: breakableRewards.map(reward => ({...reward}))};
    }

    function getEntities(id) {
      return roomEdits.get(id) || roomById(id).entities;
    }

    function nextPickupFlag() {
      const used = new Set(fixedPickupFlags);
      for (const entities of roomEdits.values()) {
        for (const entity of entities) if (entity.type === PICKUP) used.add(entity.varA);
      }
      for (const flag of profile.sparePickupFlags) {
        if (!used.has(flag)) return flag;
      }
      throw new Error('No spare pickup flags are available. Change an existing pickup to reuse its flag.');
    }

    function getTemplate(roomId, id) {
      const template = templatesFor(roomId).get(id);
      check(template, 'Choose a template compatible with this room.');
      return template;
    }

    function place(template, slot, x, y, current) {
      const {type, subtype, up, extra, varB} = template;
      const samePickup = type === PICKUP && current?.type === PICKUP;
      const varA = samePickup ? current.varA : type === PICKUP ? nextPickupFlag() : template.varA;
      const entity = {type, subtype, up, extra, varA, varB, slot, x, y};
      return {...entity, label: label(entity)};
    }

    function setRoomRows(id, rows) {
      const room = roomById(id);
      if (rows.length === room.entities.length && rows.every((entity, i) => sameEntity(entity, room.entities[i]))) {
        roomEdits.delete(id);
      } else {
        roomEdits.set(id, rows);
      }
    }

    function sameList(a, b) {
      return a.length === b.length && a.every((value, index) => value === b[index]);
    }

    function samePalettes(a, b) {
      return a.length === b.length && a.every((entry, index) => sameList(entry, b[index]));
    }

    function editRoom(id, rows, bank, resources) {
      const room = roomById(id);
      const selected = bank || customBankFor(id);
      if (selected) {
        resources ||= bankPlan(room, selected, rows);
        check(!resources.reason, resources.reason);
      }
      const snapshots = [roomEdits, roomResourceEdits, bankEdits].map(edits => [edits, edits.get(id)]);
      history.push(() => {
        for (const [edits, before] of snapshots) {
          if (before) edits.set(id, before);
          else edits.delete(id);
        }
      });
      setRoomRows(id, rows);
      if (resources) {
        if (sameList(resources.gfx, room.gfx) && samePalettes(resources.paletteEntries, room.paletteEntries)) {
          roomResourceEdits.delete(id);
        } else {
          roomResourceEdits.set(id, resources);
        }
      }
      if (bank) bankEdits.set(id, bank);
    }

    function sameEntity(a, b) {
      return a.slot === b.slot && a.x === b.x && a.y === b.y && a.varA === b.varA &&
        templateId(a) === templateId(b);
    }

    function coordinates(x, y) {
      integer(x, -32768, END_ENTITY - 1, 'X');
      integer(y, -32768, 32767, 'Y');
    }

    const isSpawner = entity => entity.type === ENEMY && entity.subtype === 0x6a;
    const isSpawnerTimer = entity => entity.type === ENEMY && (entity.subtype === 0x66 || entity.subtype === 0x67);

    function checkSpawnerSpecies(rows, marker) {
      check(rows.filter(isSpawner).every(entity => entity.varA === marker.varA && entity.varB === marker.varB),
        'A room can use only one spawner type. Change the room bank to replace the whole group.');
    }

    function appendPlaced(rows, template, x, y) {
      const used = new Set(rows.map(entity => entity.slot));
      let slot = 0;
      while (used.has(slot)) slot++;
      rows.push(place(template, slot, x, y));
    }

    function addMissingSpawnerHelpers(room, input, marker) {
      checkSpawnerSpecies(input, marker);
      integer(marker.x, 0, room.pixelWidth - 1, 'Spawner X');
      integer(marker.y, 0, room.pixelHeight - 1, 'Spawner Y');
      const missing = [0x66, 0x67].filter(subtype => !input.some(entity =>
        entity.type === ENEMY && entity.subtype === subtype));
      if (!missing.length) return input;
      const rows = input.slice();
      const axis = room.width < room.height ? 'y' : 'x';
      const length = axis === 'x' ? room.pixelWidth : room.pixelHeight;
      const lower = 8;
      const upper = length - 8;
      const nearStart = marker[axis] <= length / 2;
      for (const subtype of missing) {
        const point = {x: marker.x, y: marker.y};
        point[axis] = missing.length === 2
          ? ((subtype === 0x66) === nearStart ? marker[axis] : nearStart ? upper : lower)
          : subtype === 0x66 ? lower : upper;
        if (!rows.some(entity => isSpawner(entity) && entity.x === point.x && entity.y === point.y)) {
          appendPlaced(rows, marker, point.x, point.y);
        }
        appendPlaced(rows, {
          type: ENEMY, subtype, up: 0, extra: 0, ...profile.spawnTimerDefaults[subtype],
        }, point.x, point.y);
      }
      return rows;
    }

    function placementRows(id, template, x, y, replaceIndex, checkCapacity = true) {
      coordinates(x, y);
      const room = roomById(id);
      const rows = getEntities(id).slice();
      const replacing = replaceIndex !== undefined;
      const index = replacing ? replaceIndex : rows.length;
      const current = replacing ? rows[index] : null;
      check(replacing || !isSpawnerTimer(template) || !rows.some(isSpawner),
        'Timers are shared with the spawner. Duplicate the spawner instead.');
      if (replacing) {
        check(current, 'Select an entity first.');
        check(!isSpawner(current) || isSpawner(template), 'Delete the spawner group before changing its type.');
        check(!isSpawnerTimer(current) || template.type === current.type && template.subtype === current.subtype,
          'Delete the spawner to remove its timers.');
        rows[index] = place(template, current.slot, x, y, current);
        if (isSpawner(current) || isSpawnerTimer(current)) {
          for (let i = 0; i < rows.length; i++) {
            if (i === index) continue;
            const entity = rows[i];
            const paired = isSpawner(current) ? isSpawnerTimer(entity) : isSpawner(entity);
            if (paired && entity.x === current.x && entity.y === current.y) {
              rows[i] = {...entity, x, y};
            }
          }
        }
      } else {
        appendPlaced(rows, template, x, y);
      }
      const nextRows = isSpawner(template) ? addMissingSpawnerHelpers(room, rows, rows[index]) : rows;
      if (checkCapacity) check(nextRows.length <= MAX_ENTITIES, isSpawner(template)
        ? 'The spawner and its timers need more entity slots. This room holds 31.' : 'This room is at the 31-entity limit.');
      return {rows: nextRows, index};
    }

    function getEntityAddCost(id, templateOrId, options = {}) {
      const currentRows = getEntities(id);
      const remaining = MAX_ENTITIES - currentRows.length;
      const template = typeof templateOrId === 'string' ? getTemplate(id, templateOrId) : templateOrId;
      const replacing = options.replaceIndex !== undefined;
      if (!template) {
        const slotsNeeded = replacing ? 0 : 1;
        return {slotsNeeded, remaining, fits: slotsNeeded <= remaining, isSpawner: false};
      }
      try {
        const plan = placementRows(id, template, options.x ?? 32, options.y ?? 32, options.replaceIndex, false);
        const slotsNeeded = plan.rows.length - currentRows.length;
        const fits = slotsNeeded <= remaining;
        return {slotsNeeded, remaining, fits, isSpawner: isSpawner(template),
          reason: fits ? undefined : 'This needs ' + slotsNeeded + ' entity slots; ' + remaining + ' available.'};
      } catch (error) {
        return {slotsNeeded: isSpawner(template) ? 1 + [0x66, 0x67].filter(subtype =>
          !currentRows.some(entity => entity.type === ENEMY && entity.subtype === subtype)).length : 1,
          remaining, fits: false, isSpawner: isSpawner(template), reason: error.message};
      }
    }

    function insertEntity(id, template, x, y) {
      const plan = placementRows(id, template, x, y);
      editRoom(id, plan.rows);
      return plan.index;
    }

    function addEntity(id, template, x, y) {
      return insertEntity(id, getTemplate(id, template), x, y);
    }

    function typedTemplate(id, values, current) {
      const type = Number(values.type);
      if (type === ENEMY || type === PICKUP) {
        const template = getTemplate(id, values.templateId);
        check(template.type === type, 'Choose a compatible template for this type.');
        return template;
      }
      if (type === OBJECT && current?.type === OBJECT) return current;
      check(type === CANDLE, 'Choose Enemy, Breakable, or Item Pickup.');

      const appearance = Number(values.appearance);
      const subtype = Number(values.subtype);
      const varB = Number(values.varB);
      const oldBreakable = current?.type === CANDLE ? current : null;
      check(oldBreakable?.varA === appearance || breakableAppearances(id).some(option => option.value === appearance),
        'This breakable appearance is not available in the room.');
      check((oldBreakable?.subtype === subtype && oldBreakable.varB === varB) ||
        breakableRewards.some(reward => reward.subtype === subtype && reward.varB === varB),
        'Choose a supported breakable reward.');
      const donor = oldBreakable || [...templatesFor(id).values()].find(template =>
        template.type === CANDLE && template.varA === appearance);
      return {type, subtype, up: donor?.up ?? 0, extra: donor?.extra ?? 0, varA: appearance, varB};
    }

    function addTypedEntity(id, values, x, y) {
      return insertEntity(id, typedTemplate(id, values), x, y);
    }

    function duplicateEntity(id, index, x, y) {
      const current = getEntities(id)[index];
      check(current, 'Select an entity first.');
      return insertEntity(id, current, x, y);
    }

    function pasteEntity(id, entity, sourceId, x, y) {
      check(entity, 'Copy an entity first.');
      if (String(sourceId) === String(id)) return insertEntity(id, entity, x, y);
      return insertEntity(id, getTemplate(id, templateId(entity)), x, y);
    }

    function updateEntity(id, index, values) {
      const rows = getEntities(id).slice();
      const current = rows[index];
      check(current, 'Select an entity first.');
      const {x = current.x, y = current.y, templateId: nextId} = values;
      coordinates(x, y);
      let template = current;
      if (values.type !== undefined) template = typedTemplate(id, values, current);
      else if (nextId && nextId !== templateId(current)) template = getTemplate(id, nextId);
      const changed = place(template, current.slot, x, y, current);
      if (!sameEntity(changed, current)) {
        const plan = placementRows(id, template, x, y, index);
        editRoom(id, plan.rows);
      }
      return index;
    }

    function removeEntity(id, index) {
      const rows = getEntities(id);
      check(rows[index], 'Select an entity first.');
      check(!isSpawnerTimer(rows[index]) || !rows.some(isSpawner), 'Delete the spawner to remove its timers.');
      editRoom(id, isSpawner(rows[index]) ? rows.filter(entity => !isSpawner(entity) && !isSpawnerTimer(entity))
        : rows.filter((_, i) => i !== index));
    }

    function swapEnemyBank(id, sourceSubtype, targetSubtype) {
      const room = roomById(id);
      const selected = customBankFor(id) || originalBankFor(id);
      check(selected.has(sourceSubtype) && isBankSubtype(targetSubtype), 'Choose an enemy bank slot.');
      check(sourceSubtype !== targetSubtype, 'Choose a different enemy for this slot.');
      check(!selected.has(targetSubtype), 'This enemy already has a bank slot.');
      const {nextBank, nextRows, resources} = bankSwap(room, getEntities(id), selected, sourceSubtype, targetSubtype);
      editRoom(id, nextRows, nextBank, resources);
    }

    function removeEnemyFromBank(id, subtype) {
      const selected = customBankFor(id) || originalBankFor(id);
      check(isBankSubtype(subtype) && selected.has(subtype), 'Choose an enemy bank slot.');
      const nextBank = new Set(selected);
      nextBank.delete(subtype);
      const rows = getEntities(id);
      let nextRows = rows.filter(entity => entity.type !== ENEMY || profile.enemyBankKey(entity) !== subtype);
      if (rows.some(isSpawner) && !nextRows.some(isSpawner)) {
        nextRows = nextRows.filter(entity => !isSpawnerTimer(entity));
      }
      const room = roomById(id);
      const current = {...room, ...(roomResourceEdits.get(id) || {}), entities: rows};
      const resources = profile.planEnemyBank(current, [...selected], [...nextBank], nextRows, read, true);
      editRoom(id, nextRows, nextBank, resources);
    }

    function addEnemyToBank(id, subtype) {
      check(isBankSubtype(subtype), 'Choose a supported enemy.');
      const selected = customBankFor(id) || originalBankFor(id);
      check(!selected.has(subtype), 'This enemy already has a bank slot.');
      editRoom(id, getEntities(id), new Set([...selected, subtype]));
    }

    // Game text: a header halfword, glyph halfwords, then 0xF006 0xF00A. 0x8540+ glyphs index the
    // proportional font table at 0xC5508; uppercase letters and digits use full-width Shift-JIS codes.
    const TEXT_TABLE = 0x495500;
    const glyphDecoder = new TextDecoder('shift_jis');
    const sjisChar = code => glyphDecoder.decode(Uint8Array.of(code >> 8, code & 255)).normalize('NFKC');
    const encodeMap = new Map();
    for (let i = 0; i < 0x26; i++) {
      const char = sjisChar(read.half(0xc5508 + i * 4));
      if (char.length === 1 && !encodeMap.has(char)) encodeMap.set(char, 0x8540 + i);
    }
    for (let k = 0; k < 26; k++) {
      const char = String.fromCharCode(65 + k);
      if (!encodeMap.has(char)) encodeMap.set(char, 0x8260 + k);
    }
    for (let k = 0; k < 10; k++) encodeMap.set(String(k), 0x824f + k);
    for (const [char, code] of [['?', 0x8148], ['/', 0x815e], ['‘', 0x8165], ['”', 0x8168], ['+', 0x817b],
      ['-', 0x817c], ['=', 0x8181]]) {
      if (!encodeMap.has(char)) encodeMap.set(char, code);
    }
    if (encodeMap.has('’')) encodeMap.set("'", encodeMap.get('’'));
    if (encodeMap.has('”')) encodeMap.set('"', encodeMap.get('”'));
    const glyphChar = code => {
      let char = null;
      if (code >= 0x8540 && code < 0x8540 + 0x26) char = sjisChar(read.half(0xc5508 + (code - 0x8540) * 4));
      else if (code >= 0x8140 && code < 0x8540) char = sjisChar(code);
      return char && encodeMap.get(char) === code ? char : null;
    };

    function readText(id) {
      const at = read.offset(read.word(TEXT_TABLE + id * 4), 4);
      const codes = [];
      for (let i = 1; i < 512; i++) {
        const code = read.half(at + i * 2);
        if (code === 0xf00a) break;
        codes.push(code);
      }
      const trail = codes[codes.length - 1] === 0xf006;
      if (trail) codes.pop();
      const text = codes.map(code => code === 0xf006 ? '\n' : glyphChar(code) ?? '{' + hex(code, 4) + '}').join('');
      return {header: read.half(at), trail, text};
    }

    function encodeText(text, {header, trail}) {
      const codes = [header];
      const parts = text.replace(/\r\n?/g, '\n').split(/(\{[0-9a-fA-F]{4}\})/);
      for (const part of parts) {
        if (/^\{[0-9a-fA-F]{4}\}$/.test(part)) {
          codes.push(parseInt(part.slice(1, 5), 16));
          continue;
        }
        for (const char of part) {
          if (char === '\n') codes.push(0xf006);
          else if (encodeMap.has(char)) codes.push(encodeMap.get(char));
          else throw new Error('The game font has no "' + char + '" character.');
        }
      }
      if (trail) codes.push(0xf006);
      codes.push(0xf00a);
      check(codes.length <= 400, 'This text is too long.');
      return codes;
    }

    function textField(id, label, textId, multiline, note) {
      const {header, trail, text} = readText(textId);
      const ui = {id, label, kind: 'text', multiline, value: text, note};
      fields.set(id, {ui, original: text, at: textId, format: 'text', header, trail});
      return ui;
    }

    // Item icons: 4 uncompressed 4bpp pages of 64 icons (16x16, 1D tile order), palettes at 0x124104.
    const ICON_PAGES = [0x080e8a04, 0x080eaa08, 0x080eca0c, 0x080eea10];
    const ICON_PALETTES = 0x124104;
    const iconPaletteCount = read.byte(ICON_PALETTES + 2);
    const iconPages = ICON_PAGES.map(pointer => {
      const at = read.offset(pointer, 4);
      if (read.byte(at) === 1) return decompressedAt(read.word(at + 4));
      return bytes.subarray(at + 4, at + 4 + read.byte(at + 3) * 512);
    });
    function renderItemIcon(index, palette) {
      const icon = index - 1;
      const page = iconPages[icon >> 6];
      if (icon < 0 || !page || palette < 0 || palette >= iconPaletteCount) return null;
      const local = icon & 63;
      const pixels = new Uint8ClampedArray(16 * 16 * 4);
      for (let ty = 0; ty < 2; ty++) {
        for (let tx = 0; tx < 2; tx++) {
          const tile = ((local >> 3) * 2 + ty) * 16 + (local & 7) * 2 + tx;
          for (let y = 0; y < 8; y++) {
            for (let x = 0; x < 8; x++) {
              const value = page[tile * 32 + y * 4 + (x >> 1)];
              const color = x & 1 ? value >> 4 : value & 15;
              if (!color) continue;
              const rgb = read.half(ICON_PALETTES + 4 + palette * 32 + color * 2);
              const o = ((ty * 8 + y) * 16 + tx * 8 + x) * 4;
              pixels[o] = (rgb & 31) << 3 | (rgb & 31) >> 2;
              pixels[o + 1] = (rgb >> 5 & 31) << 3 | (rgb >> 5 & 31) >> 2;
              pixels[o + 2] = (rgb >> 10 & 31) << 3 | (rgb >> 10 & 31) >> 2;
              pixels[o + 3] = 255;
            }
          }
        }
      }
      return {width: 16, height: 16, pixels};
    }

    function field(id, label, at, format, min, max, note) {
      let original;
      if (format === 'level') {
        original = read.half(at) ^ 0xe23a;
      } else if (format === 'signed') {
        original = (read.byte(at) << 24) >> 24;
      } else {
        original = format === 'byte' ? read.byte(at) : read.half(at);
      }
      const ui = {id, label, min: Math.min(min, original), max: Math.max(max, original), value: original, note};
      fields.set(id, {ui, original, at, format});
      return ui;
    }

    const stats = {juste: [], enemies: [], bosses: [], spells: [], items: []};
    for (let level = 1; level <= 99; level++) {
      const id = 'level-' + level;
      stats.juste.push({id, kind: 'level', level, name: level === 1 ? 'Level 1 · Starting stats' : 'Level ' + level,
        fields: profile.levelStats.map(([name, at, min], i) =>
          field(id + '-' + i, name, at + (level - 1) * 2, 'level', min, 999))});
    }

    // Items. Name text 0x22 + item ID, description text 0xF7 + item ID; icon halfword = index+1 | palette << 8.
    const RESISTANCES = ['Poison', 'Curse', 'Stone', 'Fire', 'Ice', 'Thunder', 'Wind'];
    const ELEMENTS = ['Fire', 'Ice', 'Thunder', 'Wind'];
    const SLOTS = {0: 'Accessories', 1: 'Arms', 2: 'Body armor', 3: 'Head', 4: 'Feet'};
    function itemEntry(id, group, at, extra) {
      const itemId = read.half(at);
      return {id, kind: 'item', group, fields: [
        textField(id + '-name', 'Name', 0x22 + itemId, false, 'Shown in menus and pickup messages.'),
        textField(id + '-desc', 'Description', 0xf7 + itemId, true, 'Enter starts a new line.'),
        Object.assign(field(id + '-icon', 'Icon', at + 2, 'byte', 1, 255), {role: 'icon'}),
        Object.assign(field(id + '-palette', 'Icon palette', at + 3, 'byte', 0, iconPaletteCount - 1), {role: 'palette'}),
        ...extra,
      ]};
    }
    const equipStats = (id, at) => [
      field(id + '-str', 'STR', at + 6, 'signed', -128, 127),
      field(id + '-def', 'DEF', at + 7, 'signed', -128, 127),
      field(id + '-int', 'INT', at + 8, 'signed', -128, 127),
      field(id + '-lck', 'LCK', at + 9, 'signed', -128, 127),
    ];
    const bitsField = (id, label, at, names, note) =>
      Object.assign(field(id, label, at, 'half', 0, 65535, note), {bits: names.map((name, bit) => ({bit, name}))});
    for (let i = 0; i < 28; i++) {
      const at = 0x4b24a4 + i * 12;
      const id = 'consumable-' + i;
      const type = read.byte(at + 4);
      const extra = [];
      if (type === 0 || type === 1) {
        extra.push(Object.assign(field(id + '-restores', 'Restores', at + 4, 'byte', 0, 1),
          {options: [{value: 0, label: 'HP'}, {value: 1, label: 'MP'}]}));
        extra.push(field(id + '-amount', 'Amount', at + 6, 'half', 0, 9999, 'Capped at the max.'));
      } else if (type === 2) {
        extra.push(Object.assign(field(id + '-cures', 'Cures', at + 6, 'half', 1, 2),
          {options: [{value: 1, label: 'Poison'}, {value: 2, label: 'Curse'}]}));
      } else if (type === 3) {
        extra.push(field(id + '-duration', 'Invincibility', at + 6, 'half', 0, 65535, 'Frames. 60 is about 1 second.'));
      }
      stats.items.push(itemEntry(id, type <= 3 ? 'Consumables' : 'Key items & treasures', at, extra));
    }
    for (let i = 0; i < 9; i++) {
      const at = 0x4b25f4 + i * 12;
      const id = 'whip-' + i;
      stats.items.push(itemEntry(id, 'Whip parts', at, [...equipStats(id, at),
        bitsField(id + '-element', 'Whip element', at + 10, ELEMENTS, 'Element added to whip attacks.')]));
    }
    for (let i = 0; i < 128; i++) {
      const at = 0x4b2660 + i * 12;
      const id = 'equip-' + i;
      const entry = itemEntry(id, SLOTS[read.byte(at + 4)] || 'Other equipment', at, [...equipStats(id, at),
        bitsField(id + '-res', 'Resistances', at + 10, RESISTANCES,
          'Fire, Ice, Thunder and Wind cut that element’s damage by about 25%.')]);
      stats.items.push(entry);
    }
    for (const [type, group, start, count, stride] of profile.items) {
      if (type < 6) continue;
      for (let i = 0; i < count; i++) {
        stats.items.push(itemEntry('item' + type + '-' + i, group, start + i * stride, []));
      }
    }

    for (const [index, kind, ring] of profile.subweaponThrows) {
      const id = 'subweapon-' + index;
      const [normal, ringed] = profile.subweaponTables.map(table => table + index * 12 + 1);
      const fields = [field(id + '-hearts', 'Heart cost', normal, 'byte', 0, 255)];
      if (ring !== null) {
        fields.push(Object.assign(field(id + '-ring-hearts', 'Heart cost with ring', ringed, 'byte', 0, 255,
          'While ' + pickupName(5, ring) + ' is equipped.'), {role: 'ring'}));
      }
      fields.push(field(id + '-power', 'Base power', 0xe2504 + kind * 4, 'byte', 0, 255,
        'Shared by every hit of this throw.'));
      stats.spells.push({id, kind: 'subweapon', weapon: index, name: 'Subweapon · ' + profile.subweapons[index],
        ring: ring === null ? null : pickupName(5, ring), fields});
    }

    // Enemy drops: halfword (type << 8 | item). 0 means no drop. Type is the pickup subtype.
    const dropOptions = [{value: 0, label: 'Nothing', group: ''}];
    for (let item = 0; item < 6; item++) dropOptions.push({value: 0x100 | item, label: 'Money bag · size ' + item, group: 'Money'});
    for (const [type, group, , count] of profile.items) {
      if (type !== 3 && type !== 4 && type !== 5) continue;
      for (let item = 0; item < (type === 3 ? 28 : count); item++) {
        const name = getText(0x22 + read.half(profile.items.find(row => row[0] === type)[2] + item * 12));
        dropOptions.push({value: type << 8 | item, label: name || 'Item $' + hex(item), group});
      }
    }
    const dropField = (id, label, at) => {
      const ui = field(id, label, at, 'half', 0, 65535);
      ui.options = dropOptions.some(option => option.value === ui.value) ? dropOptions
        : [...dropOptions, {value: ui.value, label: 'Other · $' + hex(ui.value, 4), group: 'Current'}];
      return ui;
    };

    const activeEnemies = new Set([...rooms.values()].flatMap(room => room.entities)
      .filter(entity => entity.type === ENEMY).map(entity => entity.subtype));
    for (let i = 0; i < 250; i++) {
      const at = profile.enemies + i * 36;
      const normalId = i % 125;
      const name = enemyName(i);
      if (!read.word(at) || (!activeEnemies.has(normalId) && name === 'Enemy $' + hex(normalId))) continue;
      const id = 'enemy-' + i;
      const row = {id, name: name + (i >= 125 ? ' · Maxim mode' : ''), fields: [
        field(id + '-hp', 'Max HP', at + 12, 'half', 1, 32767),
        field(id + '-attack', 'Attack', at + 20, 'half', 0, 32767, 'Slot 1. Usually body contact.'),
        field(id + '-attack2', 'Attack 2', at + 22, 'half', 0, 32767, 'Weapon or projectile slot.'),
        field(id + '-attack3', 'Attack 3', at + 24, 'half', 0, 32767, 'Weapon or projectile slot.'),
        field(id + '-attack4', 'Attack 4', at + 26, 'half', 0, 32767, 'Weapon or projectile slot.'),
        field(id + '-defense', 'Defense', at + 17, 'byte', 0, 255),
        Object.assign(field(id + '-weaknesses', 'Elemental weaknesses', at + 33, 'byte', 0, 255), {bits: ELEMENTS.map((name, bit) => ({bit, name}))}),
        Object.assign(field(id + '-resistances', 'Elemental resistances', at + 32, 'byte', 0, 255), {bits: ELEMENTS.map((name, bit) => ({bit, name}))}),
        field(id + '-xp', 'EXP', at + 14, 'half', 0, 65535),
        field(id + '-level', 'Level', at + 16, 'byte', 0, 255),
        dropField(id + '-drop1-item', 'Drop 1', at + 8),
        field(id + '-drop1', 'Drop 1 chance', at + 18, 'byte', 0, 255, 'Out of 1024.'),
        dropField(id + '-drop2-item', 'Drop 2', at + 10),
        field(id + '-drop2', 'Drop 2 chance', at + 19, 'byte', 0, 255, 'Out of 1024. Rolled before drop 1.'),
      ]};
      stats[profile.bosses.includes(normalId) ? 'bosses' : 'enemies'].push(row);
    }

    for (let i = 0; i < 48; i++) {
      const at = profile.spells + i * 12;
      if (!read.word(at)) continue;
      const id = 'spell-' + i;
      const book = profile.books[Math.floor(i / 8)];
      const weapon = profile.subweapons[i % 8];
      const names = {1: 'Maxim Mirage', 7: 'Maxim · Healing Spell', 40: 'Summoning · Healing Spell'};
      const row = {id, kind: 'spell', book: Math.floor(i / 8), weapon: i % 8, name: names[i] || book + ' · ' + weapon, fields: [
        field(id + '-mp', 'MP cost', at + 6, 'half', 0, 32767),
        field(id + '-hearts', 'Heart cost', at + 8, 'half', 0, 32767),
      ]};
      const hit = profile.spellPower[i];
      if (hit !== undefined) {
        row.fields.push(field(id + '-power', 'Base power', 0xe2504 + hit * 4, 'byte', 0, 255,
          'Damage scales with INT. 8 is 1× INT before modifiers.'));
      }
      stats.spells.push(row);
    }

    function updateStat(id, value) {
      const field = fields.get(id);
      check(field, 'Choose a valid stat.');
      if (field.format === 'text') {
        check(typeof value === 'string', field.ui.label + ' must be text.');
        check(value.trim().length > 0, field.ui.label + ' cannot be empty.');
        encodeText(value, field);
      } else {
        integer(value, field.ui.min, field.ui.max, field.ui.label);
        if (field.ui.options) {
          check(field.ui.options.some(option => option.value === value), 'Choose one of the listed options.');
        }
      }
      const previous = field.ui.value;
      if (previous === value) return;
      history.push(() => {
        field.ui.value = previous;
        if (previous === field.original) statEdits.delete(id);
        else statEdits.set(id, previous);
      });
      field.ui.value = value;
      if (value === field.original) statEdits.delete(id);
      else statEdits.set(id, value);
    }

    function build() {
      const customBanks = new Map([...savedBanks, ...bankEdits]);
      if (!localLayers.size && !tileEdits.size && !collisionEdits.size && !roomEdits.size && !roomResourceEdits.size && !customBanks.size && !statEdits.size &&
          profile.baseSizes.includes(bytes.length)) return bytes.slice();
      let end = (bytes.length + 3) & ~3;
      const entityLists = [];
      const resourceLists = [];
      for (const [id, rows] of roomEdits) {
        const room = roomById(id);
        const axis = room.width < room.height ? 'y' : 'x';
        const sorted = rows.slice().sort((a, b) => a[axis] - b[axis]);
        entityLists.push({room, sorted, start: end});
        end += (sorted.length + 1) * ENTITY_SIZE;
      }
      for (const [id, resources] of roomResourceEdits) {
        const room = roomById(id);
        const list = {room};
        if (!sameList(resources.gfx, room.gfx)) {
          list.gfxStart = end;
          end += (resources.gfx.length + 1) * 4;
        }
        if (!samePalettes(resources.paletteEntries, room.paletteEntries)) {
          list.paletteStart = end;
          end += (resources.paletteEntries.length + 1) * 8;
        }
        if (list.gfxStart !== undefined || list.paletteStart !== undefined) resourceLists.push({room, resources, ...list});
      }
      const textLists = [];
      for (const [id, value] of statEdits) {
        const field = fields.get(id);
        if (field.format !== 'text') continue;
        const codes = encodeText(value, field);
        textLists.push({textId: field.at, codes, start: end});
        end += (codes.length * 2 + 3) & ~3;
      }
      const bankPayload = customBanks.size ? new TextEncoder().encode(JSON.stringify({
        version: 1,
        rooms: Object.fromEntries([...customBanks].sort(([a], [b]) => a.localeCompare(b))
          .map(([id, subtypes]) => [id, [...subtypes].sort((a, b) => a - b)])),
      })) : null;
      const collisionLists = [];
      for (const [at, data] of collisionEdits) {
        const size = data.length + 4;
        const packed = new Uint8Array(4 + size + Math.ceil(size / 8));
        new DataView(packed.buffer).setUint32(0, (size << 8) | 0x10, true);
        const header = decompressHeader(at);
        let pos = 4;
        const raw = new Uint8Array(size);
        raw.set(header); raw.set(data, 4);
        for (let i = 0; i < raw.length; i += 8) {packed[pos++] = 0; const part = raw.subarray(i, i + 8); packed.set(part, pos); pos += part.length;}
        collisionLists.push({at, packed, start: end});
        end = (end + packed.length + 3) & ~3;
      }
      const localLists = [];
      for (const room of rooms.values()) {
        const edits = getTileLayers(room.id).filter(layer => localLayers.has(room.id + '/' + layer.index));
        if (!edits.length) continue;
        const list = {room, edits: [], start: end}; end += 24;
        for (const layer of edits) {
          const item = {layer, metadata: end}; end += 16;
          item.layout = end; end = (end + layer.values.length * 2 + 3) & ~3;
          item.gfx = end; item.gfxData = packTileData(layer.data); end = (end + item.gfxData.length + 3) & ~3;
          if (layer.collision) {item.collision = end; item.collisionData = packTileData(layer.collision); end = (end + item.collisionData.length + 3) & ~3;}
          list.edits.push(item);
        }
        localLists.push(list);
      }
      const bankStart = end;
      if (bankPayload) end += bankPayload.length + 4 + BANK_MARKER.length;
      const footerAt = end;
      check(footerAt + FOOTER.length <= LIMIT, 'The edited ROM would exceed the GBA cartridge size limit.');
      const output = new Uint8Array(footerAt + FOOTER.length);
      output.set(bytes);
      const view = new DataView(output.buffer);
      tileEdits.forEach((value, at) => view.setUint16(at, value, true));
      for (const {at, packed, start} of collisionLists) {
        output.set(packed, start);
        const metadata = new Set();
        for (const room of rooms.values()) for (const layer of getTileLayers(room.id)) {
          if (layer.collisionPointer === ROM + at) metadata.add(layer.metadata);
        }
        metadata.forEach(pos => view.setUint32(pos + 8, ROM + start, true));
      }
      for (const {room, edits, start} of localLists) {
        const originalList = read.offset(read.word(room.at + 8), 24);
        output.set(bytes.subarray(originalList, originalList + 24), start);
        view.setUint32(room.at + 8, ROM + start, true);
        for (const item of edits) {
          const {layer, metadata, layout, gfx, gfxData} = item;
          output.set(bytes.subarray(layer.metadata, layer.metadata + 16), metadata);
          view.setUint32(start + layer.index * 8 + 4, ROM + metadata, true);
          view.setUint32(metadata + 4, ROM + gfx, true);
          view.setUint32(metadata + 12, ROM + layout, true);
          layer.values.forEach((v, i) => view.setUint16(layout + i * 2, v, true));
          output.set(gfxData, gfx);
          if (item.collisionData) {view.setUint32(metadata + 8, ROM + item.collision, true); output.set(item.collisionData, item.collision);}
        }
      }
      for (const {room, sorted, start} of entityLists) {
        view.setUint32(room.at + 24, ROM + start, true);
        let at = start;
        for (const entity of sorted) {
          view.setInt16(at, entity.x, true);
          view.setInt16(at + 2, entity.y, true);
          view.setUint8(at + 4, (entity.type << 6) | entity.slot);
          view.setUint8(at + 5, entity.subtype);
          view.setUint8(at + 6, entity.up);
          view.setUint8(at + 7, entity.extra);
          view.setUint16(at + 8, entity.varA, true);
          view.setUint16(at + 10, entity.varB, true);
          at += ENTITY_SIZE;
        }
        view.setUint32(at, 0x7fff7fff, true);
      }
      for (const {room, resources, gfxStart, paletteStart} of resourceLists) {
        if (gfxStart !== undefined) {
          view.setUint32(room.at + 16, ROM + gfxStart, true);
          resources.gfx.forEach((pointer, index) => view.setUint32(gfxStart + index * 4, pointer, true));
          view.setUint32(gfxStart + resources.gfx.length * 4, 0, true);
        }
        if (paletteStart !== undefined) {
          view.setUint32(room.at + 20, ROM + paletteStart, true);
          resources.paletteEntries.forEach(([header, pointer], index) => {
            view.setUint32(paletteStart + index * 8, header, true);
            view.setUint32(paletteStart + index * 8 + 4, pointer, true);
          });
          view.setUint32(paletteStart + resources.paletteEntries.length * 8, 0, true);
          view.setUint32(paletteStart + resources.paletteEntries.length * 8 + 4, 0, true);
        }
      }
      for (const [id, value] of statEdits) {
        const {at, format} = fields.get(id);
        if (format === 'text') continue;
        if (format === 'level') view.setUint16(at, value ^ 0xe23a, true);
        else if (format === 'signed') view.setInt8(at, value);
        else if (format === 'byte') view.setUint8(at, value);
        else view.setUint16(at, value, true);
      }
      for (const {textId, codes, start} of textLists) {
        codes.forEach((code, index) => view.setUint16(start + index * 2, code, true));
        view.setUint32(TEXT_TABLE + textId * 4, ROM + start, true);
      }
      if (bankPayload) {
        output.set(bankPayload, bankStart);
        view.setUint32(bankStart + bankPayload.length, bankPayload.length, true);
        output.set(BANK_MARKER, bankStart + bankPayload.length + 4);
      }
      output.set(FOOTER, footerAt);
      return output;
    }

    return {
      areas, stats, getEntities, getTemplates, getEnemyOptions, getEnemyBank, getEnemyBankAddOptions, getEntityAddCost,
      getBreakableOptions, renderRoomArt, renderItemIcon, renderEntitySprite,
      getTileLayers, editTiles, getTileCollision, editTileCollision, editTileCollisions, sampleTileCells, editTileCells,
      addEntity, addTypedEntity, duplicateEntity, pasteEntity, updateEntity, updateTypedEntity: updateEntity, removeEntity,
      swapEnemyBank, addEnemyToBank, removeEnemyFromBank, updateStat, build,
      undo() { history.pop()?.(); },
      get canUndo() { return history.length > 0; },
      get changeCount() {
        return new Set([...roomEdits.keys(), ...roomResourceEdits.keys(), ...bankEdits.keys()]).size + statEdits.size + tileEdits.size + collisionEdits.size + localLayers.size;
      },
    };
  }

  globalThis.HodEditor = {open};
})();
