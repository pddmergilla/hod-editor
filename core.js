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
  const ENEMY = 0;
  const OBJECT = 1;
  const CANDLE = 2;
  const PICKUP = 3;
  const SIGNATURES = [[0x1ec8, 0x08494d48], [0x3bc0, 0x08498d40]];
  const hex = (number, width = 2) => number.toString(16).toUpperCase().padStart(width, '0');

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

  async function open(input) {
    check(input instanceof Uint8Array && input.length >= profile.size && input.length <= LIMIT,
      'Choose the supported modded Harmony of Dissonance GBA ROM or an editor export.');
    const fromEditor = hasFooter(input);
    const bytes = new Uint8Array(input.subarray(0, fromEditor ? input.length - FOOTER.length : input.length));
    const read = reader(bytes);
    const title = new TextDecoder().decode(bytes.subarray(0xa0, 0xb0));
    check(title === profile.title && SIGNATURES.every(([at, value]) => read.word(at) === value),
      'This ROM has a different Harmony of Dissonance layout.');
    if (!fromEditor) {
      check(bytes.length === profile.size, 'This ROM differs from the supported modded base.');
      check(globalThis.crypto?.subtle, 'Open the editor from a local file or a secure website.');
      const hash = new Uint8Array(await crypto.subtle.digest('SHA-256', bytes));
      const actual = Array.from(hash, n => n.toString(16).padStart(2, '0')).join('');
      check(profile.supportedHashes.includes(actual), 'This ROM differs from the supported modded base.');
    }
    return createModel(bytes, read);
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
    const palettes = readList(read, read.word(at + 20), 8, pos => !read.word(pos + 4), 16)
      .filter(pos => read.half(pos) === 1)
      .map(pos => read.word(pos) + '/' + read.word(pos + 4));

    return {
      id: hex(at, 6), name, at, layer, width, height, entities, gfx, palettes,
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

  function createModel(bytes, read) {
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
    const label = ({type, subtype, varB}) => {
      if (type === ENEMY) return enemyName(subtype);
      if (type === PICKUP) return pickupName(subtype, varB);
      if (type === CANDLE) {
        const contents = ['Heart', 'Money', ['Holy Book', 'Cross', 'Axe', 'Holy Water', 'Sacred Fist', 'Knife'][varB]][subtype];
        return contents ? contents + ' candle' : 'Candle $' + hex(subtype);
      }
      return profile.objects[subtype] || 'Object $' + hex(subtype);
    };
    const rooms = new Map();
    const areas = parseAreas(read, label, rooms);
    const compressedCache = new Map();
    for (const area of areas) {
      for (const room of area.rooms) {
        let cached;
        Object.defineProperty(room, 'collision', {get() {
          if (cached === undefined) cached = collisionFor(read, room, compressedCache);
          return cached;
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

    function renderRoomArt(id) {
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
      if (!rows.length) return null;

      const width = room.pixelWidth;
      const height = room.pixelHeight;
      const pixels = new Uint8ClampedArray(width * height * 4);
      for (let i = 3; i < pixels.length; i += 4) pixels[i] = 255;
      const effect = effects.filter(row => row.visualEffect === 0x0d || row.visualEffect === 0x0f).at(-1);
      rows.sort((a, b) => b.z - a.z);

      for (const layer of rows) {
        const halfAlpha = effect && ((effect.visualEffect === 0x0d && layer.index === 1) ||
          (effect.visualEffect === 0x0f && layer.index === 0));
        const alpha = halfAlpha ? ((15 << 3) | (15 >> 2)) : 255;
        const charBase = ((layer.bgControl >> 2) & 3) * 0x4000;
        const blockCache = new Map();
        const mapWidth = layer.width * 8;
        const mapHeight = layer.height * 8;

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
            const reference = read.half(layer.layoutAt + (blockY * mapWidth + blockX) * 2);
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
    const statEdits = new Map();
    const fields = new Map();
    const history = [];
    const fixedPickupFlags = new Set();
    const donors = new Map();
    const pickupTemplates = new Map();
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
        const id = templateId(entity);
        if (!donors.has(id)) donors.set(id, {id, ...entity, rooms: []});
        if (!donors.get(id).rooms.includes(room)) donors.get(id).rooms.push(room);
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

    function templatesFor(id) {
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

    function editRoom(id, rows) {
      const room = roomById(id);
      const before = roomEdits.get(id);
      history.push(() => before ? roomEdits.set(id, before) : roomEdits.delete(id));
      if (rows.length === room.entities.length &&
        rows.every((entity, i) => sameEntity(entity, room.entities[i]))) {
        roomEdits.delete(id);
      } else {
        roomEdits.set(id, rows);
      }
    }

    function sameEntity(a, b) {
      return a.slot === b.slot && a.x === b.x && a.y === b.y && a.varA === b.varA &&
        templateId(a) === templateId(b);
    }

    function coordinates(x, y) {
      integer(x, -32768, END_ENTITY - 1, 'X');
      integer(y, -32768, 32767, 'Y');
    }

    function addEntity(id, template, x, y) {
      coordinates(x, y);
      const rows = getEntities(id);
      check(rows.length < MAX_ENTITIES, 'This room is at the 31-entity limit.');
      const used = new Set(rows.map(entity => entity.slot));
      let slot = 0;
      while (used.has(slot)) slot++;
      editRoom(id, [...rows, place(getTemplate(id, template), slot, x, y)]);
      return rows.length;
    }

    function updateEntity(id, index, values) {
      const rows = getEntities(id).slice();
      const current = rows[index];
      check(current, 'Select an entity first.');
      const {x = current.x, y = current.y, templateId: nextId} = values;
      coordinates(x, y);
      const changed = nextId && nextId !== templateId(current)
        ? place(getTemplate(id, nextId), current.slot, x, y, current)
        : {...current, x, y};
      if (!sameEntity(changed, current)) {
        rows[index] = changed;
        editRoom(id, rows);
      }
      return index;
    }

    function removeEntity(id, index) {
      const rows = getEntities(id);
      check(rows[index], 'Select an entity first.');
      editRoom(id, rows.filter((_, i) => i !== index));
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

    const stats = {juste: [], enemies: [], bosses: [], spells: []};
    for (let level = 1; level <= 99; level++) {
      const id = 'level-' + level;
      stats.juste.push({id, name: level === 1 ? 'Level 1 · Starting stats' : 'Level ' + level,
        fields: profile.levelStats.map(([name, at, min], i) =>
          field(id + '-' + i, name, at + (level - 1) * 2, 'level', min, 999))});
    }
    for (let i = 0; i < 9; i++) {
      const at = 0x4b25f4 + i * 12;
      const id = 'tip-' + i;
      stats.juste.push({id, name: pickupName(4, i), fields: [
        field(id + '-str', 'Strength bonus', at + 6, 'signed', -128, 127),
      ]});
    }

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
        field(id + '-attack', 'Attack', at + 20, 'half', 0, 32767),
        field(id + '-defense', 'Defense', at + 17, 'byte', 0, 255),
        field(id + '-xp', 'EXP', at + 14, 'half', 0, 65535),
        field(id + '-level', 'Level', at + 16, 'byte', 0, 255),
        field(id + '-drop1', 'Drop 1 chance', at + 18, 'byte', 0, 255, 'Out of 1024.'),
        field(id + '-drop2', 'Drop 2 chance', at + 19, 'byte', 0, 255, 'Out of 1024.'),
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
      const row = {id, name: names[i] || book + ' · ' + weapon, fields: [
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
      integer(value, field.ui.min, field.ui.max, field.ui.label);
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
      if (!roomEdits.size && !statEdits.size && bytes.length === profile.size) return bytes.slice();
      let end = (bytes.length + 3) & ~3;
      const entityLists = [];
      for (const [id, rows] of roomEdits) {
        const room = roomById(id);
        const axis = room.width < room.height ? 'y' : 'x';
        const sorted = rows.slice().sort((a, b) => a[axis] - b[axis]);
        entityLists.push({room, sorted, start: end});
        end += (sorted.length + 1) * ENTITY_SIZE;
      }
      check(end + FOOTER.length <= LIMIT, 'The edited ROM would exceed the GBA cartridge size limit.');
      const output = new Uint8Array(end + FOOTER.length);
      output.set(bytes);
      output.set(FOOTER, end);
      const view = new DataView(output.buffer);
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
      for (const [id, value] of statEdits) {
        const {at, format} = fields.get(id);
        if (format === 'level') view.setUint16(at, value ^ 0xe23a, true);
        else if (format === 'signed') view.setInt8(at, value);
        else if (format === 'byte') view.setUint8(at, value);
        else view.setUint16(at, value, true);
      }
      return output;
    }

    return {
      areas, stats, getEntities, getTemplates, renderRoomArt, addEntity, updateEntity, removeEntity, updateStat, build,
      undo() { history.pop()?.(); },
      get canUndo() { return history.length > 0; },
      get changeCount() { return roomEdits.size + statEdits.size; },
    };
  }

  globalThis.HodEditor = {open};
})();
