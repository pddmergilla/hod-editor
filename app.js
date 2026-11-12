(() => {
  "use strict";

  const byId = (id) => document.getElementById(id);
  const ui = {
    file: byId("rom-file"),
    loadLabel: byId("load-label"),
    undo: byId("undo-button"),
    download: byId("download-button"),
    fileState: byId("file-state"),
    changeCount: byId("change-count"),
    sessionState: document.querySelector(".session-state"),
    areaSelect: byId("area-select"),
    areaName: byId("area-name"),
    roomSearch: byId("room-search"),
    roomCount: byId("room-count"),
    roomList: byId("room-list"),
    roomBreadcrumb: byId("room-breadcrumb"),
    roomTitle: byId("room-title"),
    roomSubtitle: byId("room-subtitle"),
    mapSize: byId("map-size"),
    mapViewport: byId("map-viewport"),
    mapHint: byId("map-hint"),
    showEntities: byId("show-entities"),
    collisionToggle: byId("collision-toggle"),
    scrollUp: byId("scroll-up"),
    scrollDown: byId("scroll-down"),
    zoomOut: byId("zoom-out"),
    zoomIn: byId("zoom-in"),
    zoomLabel: byId("zoom-label"),
    entityRoomTitle: byId("entity-room-title"),
    entityCount: byId("entity-count"),
    entityList: byId("entity-list"),
    selectedName: byId("selected-name"),
    editType: byId("edit-type"),
    editEnemyWrap: byId("edit-enemy-wrap"),
    editEnemy: byId("edit-enemy"),
    editEnemyVariantWrap: byId("edit-enemy-variant-wrap"),
    editEnemyVariant: byId("edit-enemy-variant"),
    editPickupWrap: byId("edit-pickup-wrap"),
    editPickup: byId("edit-pickup"),
    editBreakableWrap: byId("edit-breakable-wrap"),
    editAppearance: byId("edit-appearance"),
    editContent: byId("edit-content"),
    editX: byId("edit-x"),
    editY: byId("edit-y"),
    applyEntity: byId("apply-entity"),
    addType: byId("add-type"),
    addEnemyWrap: byId("add-enemy-wrap"),
    addEnemy: byId("add-enemy"),
    addEnemyVariantWrap: byId("add-enemy-variant-wrap"),
    addEnemyVariant: byId("add-enemy-variant"),
    addPickupWrap: byId("add-pickup-wrap"),
    addPickup: byId("add-pickup"),
    addBreakableWrap: byId("add-breakable-wrap"),
    addAppearance: byId("add-appearance"),
    addContent: byId("add-content"),
    addX: byId("add-x"),
    addY: byId("add-y"),
    addEntity: byId("add-entity"),
    duplicateEntity: byId("duplicate-entity"),
    removeEntity: byId("remove-entity"),
    capacityHint: byId("entity-capacity-hint"),
    enemyBankAddEnemy: byId("enemy-bank-add-enemy"),
    enemyBankAddHint: byId("enemy-bank-add-hint"),
    enemyBankAddButton: byId("enemy-bank-add-button"),
    enemyBankEmpty: byId("enemy-bank-empty"),
    enemyBankRows: byId("enemy-bank-rows"),
    statsSearch: byId("stats-search"),
    statsCount: byId("stats-count"),
    statsList: byId("stats-list"),
    notice: byId("live-notice")
  };

  const kindNames = { 0: "Enemy", 1: "Object", 2: "Breakable", 3: "Item Pickup" };
  const state = {
    model: null,
    fileName: "",
    areaFilter: "castle:A",
    roomId: null,
    entityIndex: null,
    editDraft: null,
    editDraftKey: "",
    addDraft: { type: "0" },
    addDraftRoom: "",
    enemyBankRoomId: "",
    category: "juste",
    zoom: 100,
    showEntities: true,
    showCollision: false,
    roomArtPreview: null,
    drag: null,
    pan: null,
    noticeTimer: 0
  };

  function escapeHtml(value) {
    return String(value == null ? "" : value).replace(/[&<>"']/g, (char) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    }[char]));
  }

  function numeric(value, fallback) {
    const number = Number(value);
    return Number.isFinite(number) ? number : fallback;
  }

  function integerInput(input) {
    const number = Number(input.value);
    if (input.value === "" || !Number.isInteger(number)) return null;
    return number;
  }

  function typeName(type) {
    return kindNames[type] || "Entity";
  }

  function typeClass(type) {
    const name = String(typeName(type)).toLowerCase();
    return name === "enemy" || name === "object" || name === "breakable" || name === "item pickup" ? (name === "item pickup" ? "pickup" : name) : "enemy";
  }

  function labelForEntity(entity, index) {
    if (entity && entity.label) return String(entity.label);
    const kind = typeName(entity && entity.type);
    const subtype = entity && entity.subtype;
    if (subtype !== undefined && subtype !== null && subtype !== "") return kind + " · " + subtype;
    return kind + " " + (index + 1);
  }

  function currentAreas() {
    return state.model && Array.isArray(state.model.areas) ? state.model.areas : [];
  }

  function currentRoomArea() {
    for (const area of currentAreas()) {
      if (Array.isArray(area.rooms) && area.rooms.some((room) => room.id === state.roomId)) return area;
    }
    return null;
  }

  function currentRoom() {
    const area = currentRoomArea();
    if (!area || !Array.isArray(area.rooms)) return null;
    return area.rooms.find((room) => room.id === state.roomId) || null;
  }

  function roomEntities(room) {
    if (!state.model || !room) return [];
    try {
      const entities = state.model.getEntities(room.id);
      return Array.isArray(entities) ? entities : [];
    } catch (error) {
      showNotice(error.message || "Could not read this room.", "error");
      return [];
    }
  }

  function roomTemplates(room) {
    if (!state.model || !room) return [];
    try {
      const templates = state.model.getTemplates(room.id);
      return Array.isArray(templates) ? templates : [];
    } catch (error) {
      showNotice(error.message || "Could not read the templates.", "error");
      return [];
    }
  }

  function showNotice(message, kind) {
    window.clearTimeout(state.noticeTimer);
    ui.notice.textContent = message;
    ui.notice.dataset.kind = kind || "";
    ui.notice.hidden = false;
    state.noticeTimer = window.setTimeout(() => { ui.notice.hidden = true; }, 4800);
  }

  function updateChrome() {
    const loaded = Boolean(state.model);
    ui.sessionState.classList.toggle("is-loaded", loaded);
    ui.fileState.textContent = loaded ? "ROM READY" : "NO ROM LOADED";
    if (loaded) {
      const changes = numeric(state.model.changeCount, 0);
      ui.changeCount.textContent = changes + (changes === 1 ? " pending change" : " pending changes") + " · " + state.fileName;
    } else {
      ui.changeCount.textContent = "Your file stays on this device";
    }
    ui.undo.disabled = !loaded || !state.model.canUndo;
    ui.download.disabled = !loaded;
  }

  function switchPanel(panelId) {
    document.querySelectorAll(".main-tab").forEach((button) => {
      const active = button.dataset.panel === panelId;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-selected", String(active));
      button.tabIndex = active ? 0 : -1;
    });
    document.querySelectorAll(".panel").forEach((panel) => {
      panel.hidden = panel.id !== panelId;
      panel.classList.toggle("is-visible", panel.id === panelId);
    });
  }

  function areaFilterLabel() {
    if (state.areaFilter === "all") return "All areas";
    if (state.areaFilter.startsWith("castle:")) {
      return "Castle " + state.areaFilter.slice(7) + " · All areas";
    }
    const index = Number(state.areaFilter.slice(5));
    const area = currentAreas()[index];
    return area ? area.name + " · Castle " + area.castle : "Choose an area";
  }
  function renderAreaSelect() {
    if (!state.model) {
      ui.areaSelect.innerHTML = '<option value="">Load a ROM first</option>';
      ui.areaSelect.disabled = true;
      ui.areaName.textContent = "Choose an area to browse its rooms.";
      return;
    }
    const areas = currentAreas();
    let html = '<option value="all">All areas</option>';
    for (const castle of ["A", "B", "Other"]) {
      const label = castle === "Other" ? "Other" : "Castle " + castle;
      html += '<option value="castle:' + castle + '">' + label + ' · All areas</option>';
      const options = areas.map((area, index) => ({area, index}))
        .filter(item => item.area.castle === castle)
        .map(({area, index}) => '<option value="area:' + index + '">' +
          escapeHtml(area.name || "Area") + '</option>').join("");
      if (options) html += '<optgroup label="' + label + '">' + options + '</optgroup>';
    }
    ui.areaSelect.innerHTML = html;
    ui.areaSelect.disabled = false;
    if (!areas.some(area => area.castle === "A") && state.areaFilter === "castle:A") {
      state.areaFilter = "all";
    }
    ui.areaSelect.value = state.areaFilter;
    ui.areaName.textContent = areaFilterLabel();
  }
  function areasForSelection() {
    const query = ui.roomSearch.value.trim().toLocaleLowerCase();
    return currentAreas().map((area, index) => ({area, index})).filter(({area, index}) => {
      if (state.areaFilter.startsWith("castle:") && area.castle !== state.areaFilter.slice(7)) return false;
      if (state.areaFilter.startsWith("area:") && index !== Number(state.areaFilter.slice(5))) return false;
      return true;
    }).map(({area}) => {
      const rooms = (Array.isArray(area.rooms) ? area.rooms : []).filter(room => {
        return !query || [area.name, room.name, room.id].join(" ").toLocaleLowerCase().includes(query);
      });
      return {area, rooms};
    }).filter(group => group.rooms.length > 0);
  }
  function renderRoomList() {
    renderAreaSelect();
    const groups = areasForSelection();
    const count = groups.reduce((total, group) => total + group.rooms.length, 0);
    ui.roomCount.textContent = state.model ? String(count).padStart(2, "0") : "—";
    if (!state.model) {
      ui.roomList.innerHTML = '<div class="list-empty"><span class="empty-ornament">✦</span><strong>Waiting for a record</strong><span>Load a ROM to reveal its rooms.</span></div>';
      return;
    }
    if (!count) {
      const query = ui.roomSearch.value.trim();
      const message = query ? "No rooms match this search." : "No rooms in this area.";
      ui.roomList.innerHTML = '<div class="list-empty"><span class="empty-ornament">⌕</span><strong>' + escapeHtml(message) + '</strong><span>Try another area or search.</span></div>';
      return;
    }
    ui.roomList.innerHTML = groups.map(group => {
      const areaName = escapeHtml(group.area.name || "Area");
      const buttons = group.rooms.map(room => {
        const selected = room.id === state.roomId;
        const name = escapeHtml(room.name || String(room.id));
        const id = escapeHtml(room.id);
        const entityCount = roomEntities(room).length;
        return '<button class="room-choice' + (selected ? ' is-selected' : '') + '" type="button" data-room-id="' + id + '" aria-current="' + (selected ? 'true' : 'false') + '">' +
          '<span class="room-glyph" aria-hidden="true">⌂</span><span class="room-choice-name">' + name + '</span><span class="room-count-mini">' + entityCount + '</span></button>';
      }).join("");
      return '<section class="room-group"><h3 class="area-name">' + areaName + '</h3>' + buttons + '</section>';
    }).join("");
  }  function roomDimensions(room) {
    const width = Math.max(1, Math.trunc(numeric(room.pixelWidth, numeric(room.width, 1) * 256)));
    const height = Math.max(1, Math.trunc(numeric(room.pixelHeight, numeric(room.height, 1) * 256)));
    return { width, height };
  }

  function roomCollision(room) {
    try {
      const collision = room && room.collision;
      if (!collision) return null;
      const tiles = collision.tiles;
      if (!tiles || typeof tiles.length !== "number") return null;
      return { geometry: collision, tiles, tileCount: tiles.length };
    } catch (error) {
      return null;
    }
  }

  function roomArtPreview(room, dimensions) {
    if (state.roomArtPreview && state.roomArtPreview.model === state.model && state.roomArtPreview.roomId === room.id) {
      return state.roomArtPreview;
    }

    const preview = { model: state.model, roomId: room.id, status: "unsupported", dataUrl: "", width: 0, height: 0 };
    try {
      if (typeof state.model.renderRoomArt !== "function") {
        state.roomArtPreview = preview;
        return preview;
      }
      const art = state.model.renderRoomArt(room.id);
      if (!art) {
        state.roomArtPreview = preview;
        return preview;
      }

      const width = Number(art.width);
      const height = Number(art.height);
      const pixels = art.pixels;
      if (!Number.isInteger(width) || width < 1 || !Number.isInteger(height) || height < 1 ||
          width !== dimensions.width || height !== dimensions.height ||
          !(pixels instanceof Uint8ClampedArray) || pixels.length !== width * height * 4) {
        throw new Error("Room artwork has an invalid size.");
      }

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext("2d");
      if (!context) throw new Error("Room artwork could not be drawn.");
      const imageData = context.createImageData(width, height);
      imageData.data.set(pixels);
      context.putImageData(imageData, 0, 0);
      const dataUrl = canvas.toDataURL("image/png");
      if (!dataUrl || dataUrl === "data:,") throw new Error("Room artwork could not be saved.");
      preview.status = "ready";
      preview.dataUrl = dataUrl;
      preview.width = width;
      preview.height = height;
    } catch (error) {
      preview.status = "failed";
    }
    state.roomArtPreview = preview;
    return preview;
  }

  function entityLabelShort(entity, index) {
    const label = labelForEntity(entity, index);
    return label.length > 22 ? label.slice(0, 21) + "…" : label;
  }

  function collisionRects(room) {
    try {
      const collision = roomCollision(room);
      if (!collision) return "";
      const cols = Math.max(0, Math.trunc(numeric(collision.geometry.width, 0)));
      const rows = Math.max(0, Math.trunc(numeric(collision.geometry.height, 0)));
      if (!cols || !rows) return "";
      let rects = "";
      const limit = Math.min(cols * rows, collision.tileCount);
      for (let index = 0; index < limit; index += 1) {
        if (!collision.tiles[index]) continue;
        const x = (index % cols) * 16;
        const y = Math.floor(index / cols) * 16;
        rects += '<rect class="collision-tile" x="' + x + '" y="' + y + '" width="16" height="16"/>';
      }
      return rects;
    } catch (error) {
      return "";
    }
  }

  function markerMarkup(entity, index) {
    const x = numeric(entity.x, 0);
    const y = numeric(entity.y, 0);
    const selected = index === state.entityIndex;
    const label = escapeHtml(entityLabelShort(entity, index));
    const kind = typeClass(entity.type);
    return '<g class="entity-marker type-' + kind + (selected ? ' is-selected' : '') + '" data-index="' + index + '" tabindex="0" role="button" aria-label="' + escapeHtml(labelForEntity(entity, index)) + ', x ' + x + ', y ' + y + '" aria-pressed="' + selected + '">' +
      '<circle class="marker-halo" cx="' + x + '" cy="' + y + '" r="8"/><circle class="marker-core" cx="' + x + '" cy="' + y + '" r="4"/>' +
      '<text class="marker-label" x="' + (x + 9) + '" y="' + (y - 7) + '">' + label + '</text></g>';
  }
  function renderRoomSvg(room, dimensions, entities, preview) {
    const width = dimensions.width;
    const height = dimensions.height;
    const markers = state.showEntities ? entities.map(markerMarkup).join("") : "";
    const background = preview.status === "ready"
      ? '<image class="room-art" href="' + preview.dataUrl + '" x="0" y="0" width="' + preview.width + '" height="' + preview.height + '" preserveAspectRatio="none" image-rendering="pixelated"/>'
      : '<rect x="0" y="0" width="' + width + '" height="' + height + '" fill="#21192b"/>';
    const collision = state.showCollision || preview.status !== "ready" ? collisionRects(room) : "";
    return '<svg id="room-map" class="room-svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + width + ' ' + height + '" role="img" aria-label="Room layout with entity markers">' +
      '<title>' + escapeHtml(room.name || room.id) + ' layout</title>' +
      background + '<g class="collision-overlay" aria-label="Collision geometry">' + collision + '</g>' +
      '<rect class="map-edge" x=".5" y=".5" width="' + Math.max(0, width - 1) + '" height="' + Math.max(0, height - 1) + '"/>' + markers + '</svg>';
  }
  function renderEntityList(room, entities) {
    ui.entityCount.textContent = entities.length + (entities.length === 1 ? " entity" : " entities");
    if (!room) {
      ui.entityList.innerHTML = '<p class="muted-note">Choose a room to inspect its contents.</p>';
      return;
    }
    if (!entities.length) {
      ui.entityList.innerHTML = '<p class="muted-note">This room has no placed entities yet.</p>';
      return;
    }
    ui.entityList.innerHTML = entities.map((entity, index) => {
      const selected = index === state.entityIndex;
      const x = numeric(entity.x, 0);
      const y = numeric(entity.y, 0);
      return '<button class="entity-choice' + (selected ? ' is-selected' : '') + '" type="button" data-index="' + index + '" aria-pressed="' + selected + '">' +
        '<i class="entity-type-dot type-' + typeClass(entity.type) + '" aria-hidden="true"></i><span class="entity-choice-name">' + escapeHtml(labelForEntity(entity, index)) + '</span><span class="entity-coords">' + x + ', ' + y + '</span></button>';
    }).join("");
  }
  function templateIdForEntity(entity) {
    return [entity.type, entity.subtype, entity.up, entity.extra,
      entity.type === 3 ? 0 : entity.varA, entity.varB].join("/");
  }
  function entityTypeOptions(selected, adding) {
    let options = [
      ["0", "Enemy"], ["2", "Breakable"], ["3", "Item Pickup"],
    ];
    if (!adding && String(selected) === "1") options.push(["1", "Object"]);
    return options.map(([value, label]) => '<option value="' + value + '"' +
      (String(selected) === value ? " selected" : "") + '>' + label + '</option>').join("");
  }
  function enemyOptionsMarkup(entries, selected) {
    const available = entries.filter(entry => entry.available);
    const unavailable = entries.filter(entry => !entry.available);
    const markup = rows => rows.map(entry => '<option value="' + entry.subtype + '"' +
      (Number(selected) === entry.subtype ? " selected" : "") +
      (entry.available ? "" : " disabled") + '>' + escapeHtml(entry.label) + '</option>').join("");
    let html = '<option value="">Choose an enemy…</option>';
    if (available.length) html += '<optgroup label="Available in this room">' + markup(available) + '</optgroup>';
    if (unavailable.length) html += '<optgroup label="Unavailable in this room">' + markup(unavailable) + '</optgroup>';
    return html;
  }
  function templateOptions(templates, selectedId, emptyLabel) {
    const first = '<option value="">' + escapeHtml(emptyLabel) + '</option>';
    return first + templates.map(template => '<option value="' + escapeHtml(template.id) + '"' +
      (String(template.id) === String(selectedId) ? " selected" : "") + '>' +
      escapeHtml(template.label || (typeName(template.type) + " template")) + '</option>').join("");
  }
  function appearanceOptions(options, selected, currentEntity) {
    let rows = options.map(option => ({value: option.value, label: option.label}));
    if (currentEntity && currentEntity.type === 2 &&
        !rows.some(option => option.value === currentEntity.varA)) {
      rows.unshift({value: currentEntity.varA, label: "Current appearance · $" + Number(currentEntity.varA).toString(16).toUpperCase()});
    }
    return '<option value="">Choose an appearance…</option>' + rows.map(option =>
      '<option value="' + option.value + '"' + (Number(selected) === option.value ? " selected" : "") + '>' +
      escapeHtml(option.label) + '</option>').join("");
  }
  function rewardOptions(options, selected, currentEntity) {
    const groups = new Map([
      [0, "Hearts"], [1, "Money"], [2, "Subweapons"], [3, "Consumables"],
    ]);
    let html = '<option value="">Choose contents…</option>';
    for (const [subtype, label] of groups) {
      const rows = options.filter(option => option.subtype === subtype);
      if (!rows.length) continue;
      html += '<optgroup label="' + label + '">' + rows.map(option => {
        const value = option.subtype + "/" + option.varB;
        return '<option value="' + value + '"' + (String(selected) === value ? " selected" : "") + '>' +
          escapeHtml(option.label) + '</option>';
      }).join("") + '</optgroup>';
    }
    if (currentEntity && currentEntity.type === 2 &&
        !options.some(option => option.subtype === currentEntity.subtype && option.varB === currentEntity.varB)) {
      const value = currentEntity.subtype + "/" + currentEntity.varB;
      html += '<option value="' + value + '"' + (String(selected) === value ? " selected" : "") + '>' +
        'Current contents · $' + currentEntity.subtype.toString(16).toUpperCase() + '/' + currentEntity.varB.toString(16).toUpperCase() + '</option>';
    }
    return html;
  }
  function draftFor(room, type, entity) {
    const draft = {type: String(type)};
    if (!room || !state.model) return draft;
    const templates = roomTemplates(room);
    if (String(type) === "0") {
      const enemies = state.model.getEnemyOptions(room.id);
      let enemy = entity && entity.type === 0
        ? enemies.find(option => option.subtype === entity.subtype)
        : null;
      if (!enemy || !enemy.available) enemy = enemies.find(option => option.available);
      draft.enemySubtype = enemy ? enemy.subtype : (entity && entity.type === 0 ? entity.subtype : "");
      const variants = enemy ? enemy.variants : [];
      const currentId = entity && entity.type === 0 ? templateIdForEntity(entity) : "";
      draft.templateId = variants.some(option => option.id === currentId)
        ? currentId : (variants[0] ? variants[0].id : "");
    } else if (String(type) === "3") {
      const pickups = templates.filter(template => template.type === 3);
      const currentId = entity && entity.type === 3 ? templateIdForEntity(entity) : "";
      draft.templateId = pickups.some(template => template.id === currentId)
        ? currentId : (pickups[0] ? pickups[0].id : "");
    } else if (String(type) === "2") {
      const options = state.model.getBreakableOptions(room.id);
      const currentAppearance = entity && entity.type === 2 ? entity.varA : null;
      draft.appearance = options.appearances.some(option => option.value === currentAppearance)
        ? currentAppearance : (options.appearances[0] ? options.appearances[0].value : "");
      const currentReward = entity && entity.type === 2 ? entity.subtype + "/" + entity.varB : "";
      const hasReward = options.rewards.some(option =>
        option.subtype + "/" + option.varB === currentReward);
      draft.reward = hasReward ? currentReward : (options.rewards[0]
        ? options.rewards[0].subtype + "/" + options.rewards[0].varB : "");
      if (entity && entity.type === 2) {
        draft.appearance = entity.varA;
        draft.reward = currentReward;
      }
    }
    return draft;
  }
  function choiceRefs(prefix) {
    return prefix === "edit" ? {
      enemyWrap: ui.editEnemyWrap, enemy: ui.editEnemy, variantWrap: ui.editEnemyVariantWrap, variant: ui.editEnemyVariant,
      pickupWrap: ui.editPickupWrap, pickup: ui.editPickup,
      breakableWrap: ui.editBreakableWrap, appearance: ui.editAppearance, content: ui.editContent,
    } : {
      enemyWrap: ui.addEnemyWrap, enemy: ui.addEnemy, variantWrap: ui.addEnemyVariantWrap, variant: ui.addEnemyVariant,
      pickupWrap: ui.addPickupWrap, pickup: ui.addPickup,
      breakableWrap: ui.addBreakableWrap, appearance: ui.addAppearance, content: ui.addContent,
    };
  }
  function renderChoiceFields(prefix, room, draft, enabled, currentEntity) {
    const refs = choiceRefs(prefix);
    const type = draft ? String(draft.type) : "";
    refs.enemyWrap.hidden = type !== "0";
    refs.pickupWrap.hidden = type !== "3";
    refs.breakableWrap.hidden = type !== "2";
    if (!room || !state.model || !draft) {
      refs.enemy.innerHTML = '<option value="">Choose a room first</option>';
      refs.variant.innerHTML = '<option value="">Choose a room first</option>';
      refs.pickup.innerHTML = '<option value="">Choose a room first</option>';
      refs.appearance.innerHTML = '<option value="">Choose a room first</option>';
      refs.content.innerHTML = '<option value="">Choose a room first</option>';
      [refs.enemy, refs.variant, refs.pickup, refs.appearance, refs.content].forEach(input => { input.disabled = true; });
      return;
    }
    if (type === "0") {
      const enemies = state.model.getEnemyOptions(room.id);
      refs.enemy.innerHTML = enemyOptionsMarkup(enemies, draft.enemySubtype);
      refs.enemy.disabled = !enabled || !enemies.length;
      const enemy = enemies.find(option => option.subtype === Number(draft.enemySubtype));
      const variants = enemy ? enemy.variants : [];
      refs.variant.innerHTML = templateOptions(variants, draft.templateId,
        variants.length ? "Choose a compatible template…" : "No compatible template");
      refs.variantWrap.hidden = variants.length <= 1;
      refs.variant.disabled = !enabled || variants.length <= 1;
      refs.enemy.value = draft.enemySubtype === "" ? "" : String(draft.enemySubtype);
    } else if (type === "3") {
      const pickups = roomTemplates(room).filter(template => template.type === 3);
      refs.pickup.innerHTML = templateOptions(pickups, draft.templateId,
        pickups.length ? "Choose an item…" : "No items available");
      refs.pickup.disabled = !enabled || !pickups.length;
    } else if (type === "2") {
      const options = state.model.getBreakableOptions(room.id);
      refs.appearance.innerHTML = appearanceOptions(options.appearances, draft.appearance, currentEntity);
      refs.content.innerHTML = rewardOptions(options.rewards, draft.reward, currentEntity);
      refs.appearance.disabled = !enabled || !options.appearances.length;
      refs.content.disabled = !enabled || !options.rewards.length;
      refs.appearance.value = draft.appearance === "" ? "" : String(draft.appearance);
      refs.content.value = draft.reward || "";
    }
  }
  function draftIsValid(room, draft, currentEntity, adding) {
    if (!room || !draft || !state.model) return false;
    const type = String(draft.type);
    if (type === "0") {
      const enemy = state.model.getEnemyOptions(room.id)
        .find(option => option.subtype === Number(draft.enemySubtype));
      return Boolean(enemy && enemy.available && enemy.variants.some(option => option.id === draft.templateId));
    }
    if (type === "3") {
      return roomTemplates(room).some(template => template.type === 3 && template.id === draft.templateId);
    }
    if (type === "2") {
      const options = state.model.getBreakableOptions(room.id);
      const appearanceValid = options.appearances.some(option => option.value === Number(draft.appearance)) ||
        (!adding && currentEntity && currentEntity.type === 2 && currentEntity.varA === Number(draft.appearance));
      const parts = String(draft.reward || "").split("/").map(Number);
      const rewardValid = options.rewards.some(option => option.subtype === parts[0] && option.varB === parts[1]) ||
        (!adding && currentEntity && currentEntity.type === 2 &&
          currentEntity.subtype === parts[0] && currentEntity.varB === parts[1]);
      return appearanceValid && rewardValid;
    }
    return !adding && type === "1" && currentEntity && currentEntity.type === 1;
  }
  function renderEntityControls(room, entities) {
    const selectedEntity = room && Number.isInteger(state.entityIndex) ? entities[state.entityIndex] : null;
    const selectedKey = selectedEntity ? room.id + ":" + state.entityIndex : "";
    if (state.editDraftKey !== selectedKey) {
      state.editDraftKey = selectedKey;
      state.editDraft = selectedEntity ? draftFor(room, selectedEntity.type, selectedEntity) : null;
    }
    if (room && state.addDraftRoom !== room.id) {
      state.addDraftRoom = room.id;
      state.addDraft = draftFor(room, "0", null);
    }
    ui.entityRoomTitle.textContent = room ? (room.name || String(room.id)) : "No room selected";
    ui.entityCount.textContent = entities.length + (entities.length === 1 ? " entity" : " entities");
    ui.entityList.setAttribute("aria-disabled", String(!room));
    ui.selectedName.textContent = selectedEntity ? labelForEntity(selectedEntity, state.entityIndex) : "Nothing selected";
    ui.editType.innerHTML = selectedEntity
      ? entityTypeOptions(state.editDraft.type, false)
      : '<option value="">Choose an entity</option>';
    ui.editType.value = selectedEntity ? state.editDraft.type : "";
    ui.editType.disabled = !selectedEntity;
    ui.editX.value = selectedEntity ? numeric(selectedEntity.x, 0) : "";
    ui.editY.value = selectedEntity ? numeric(selectedEntity.y, 0) : "";
    ui.editX.disabled = !selectedEntity;
    ui.editY.disabled = !selectedEntity;
    renderChoiceFields("edit", room, state.editDraft, Boolean(selectedEntity), selectedEntity);
    ui.applyEntity.disabled = !selectedEntity ||
      !draftIsValid(room, state.editDraft, selectedEntity, false);
    const templates = room ? roomTemplates(room) : [];
    ui.addType.innerHTML = room ? entityTypeOptions(state.addDraft && state.addDraft.type, true)
      : '<option value="">Choose a room first</option>';
    ui.addType.disabled = !room;
    if (room && state.addDraft) ui.addType.value = state.addDraft.type;
    renderChoiceFields("add", room, state.addDraft, Boolean(room), null);
    const dimensions = room ? roomDimensions(room) : {width: 1, height: 1};
    ui.addX.max = String(dimensions.width - 1);
    ui.addY.max = String(dimensions.height - 1);
    ui.addX.disabled = !room || entities.length >= 31;
    ui.addY.disabled = !room || entities.length >= 31;
    if (room) {
      const x = Number(ui.addX.value);
      const y = Number(ui.addY.value);
      if (!Number.isFinite(x) || x > dimensions.width - 1) ui.addX.value = String(Math.min(32, dimensions.width - 1));
      if (!Number.isFinite(y) || y > dimensions.height - 1) ui.addY.value = String(Math.min(32, dimensions.height - 1));
    }
    const canAdd = Boolean(room && entities.length < 31 &&
      draftIsValid(room, state.addDraft, null, true));
    ui.addEntity.disabled = !canAdd;
    ui.duplicateEntity.disabled = !selectedEntity || entities.length >= 31;
    ui.removeEntity.disabled = !selectedEntity;
    ui.capacityHint.textContent = room
      ? (31 - entities.length) + " of 31 entity slots available."
      : "Choose a room to inspect its entity slots.";
    renderEnemyBank(room);
  }
  function renderEnemyBank(room) {
    ui.enemyBankRows.innerHTML = "";
    ui.enemyBankEmpty.hidden = false;
    ui.enemyBankAddButton.disabled = true;
    const roomId = room ? String(room.id) : "";
    if (roomId !== state.enemyBankRoomId) ui.enemyBankAddEnemy.value = "";
    state.enemyBankRoomId = roomId;
    if (!state.model) {
      ui.enemyBankAddEnemy.innerHTML = '<option value="">Load a ROM first</option>';
      ui.enemyBankAddEnemy.disabled = true;
      ui.enemyBankAddHint.textContent = "Load a ROM to edit room banks.";
      ui.enemyBankEmpty.textContent = "The room bank will appear here.";
      return;
    }
    if (!room || typeof state.model.getEnemyBank !== "function") {
      ui.enemyBankAddEnemy.innerHTML = '<option value="">Choose a room first</option>';
      ui.enemyBankAddEnemy.disabled = true;
      ui.enemyBankAddHint.textContent = "Choose a room to edit its bank.";
      ui.enemyBankEmpty.textContent = "Choose a room to inspect its bank.";
      return;
    }
    let rows;
    let options;
    try {
      rows = state.model.getEnemyBank(room.id);
      options = state.model.getEnemyBankAddOptions(room.id);
    } catch (error) {
      showNotice(error.message || "Could not read the enemy bank.", "error");
      ui.enemyBankAddEnemy.innerHTML = '<option value="">Bank is unavailable</option>';
      ui.enemyBankAddEnemy.disabled = true;
      ui.enemyBankAddHint.textContent = "Could not read this room's bank.";
      ui.enemyBankEmpty.textContent = "Could not read this room's bank.";
      return;
    }
    options.sort((a, b) => String(a.label || "").localeCompare(String(b.label || ""), undefined,
      {sensitivity: "base", numeric: true}) || Number(a.subtype) - Number(b.subtype));
    const addable = options.some(option => option.available);
    const selectedValue = ui.enemyBankAddEnemy.value;
    const selected = selectedValue === "" ? null : options.find(option => Number(option.subtype) === Number(selectedValue));
    const optionMarkup = options.map(option => '<option value="' + Number(option.subtype) + '" data-available="' +
      String(Boolean(option.available)) + '" data-reason="' + escapeHtml(option.reason || "") + '"' +
      ' data-label="' + escapeHtml(option.label) + '"' +
      (option.reason ? ' title="' + escapeHtml(option.reason) + '"' : '') + '>' +
      escapeHtml(option.label + (option.available ? " · Fits" : " · " + (option.reason || "Does not fit"))) +
      '</option>').join("");
    ui.enemyBankAddEnemy.innerHTML = '<option value="">Choose an enemy…</option>' + optionMarkup;
    ui.enemyBankAddEnemy.disabled = false;
    ui.enemyBankAddEnemy.value = selected ? String(selected.subtype) : "";
    updateEnemyBankAddState(addable, options.length);
    if (!Array.isArray(rows) || !rows.length) {
      ui.enemyBankEmpty.textContent = "No enemies in this room's bank yet.";
      return;
    }
    ui.enemyBankEmpty.hidden = true;
    const sortedRows = rows.slice().sort((a, b) =>
      String(a.label || "").localeCompare(String(b.label || ""), undefined, {sensitivity: "base", numeric: true}) ||
      Number(a.subtype) - Number(b.subtype));
    ui.enemyBankRows.innerHTML = sortedRows.map(row => {
      const sourceSubtype = Number(row.subtype);
      const sourceLabel = String(row.label || ("Enemy " + sourceSubtype));
      const choices = (Array.isArray(row.choices) ? row.choices : []).slice().sort((a, b) =>
        String(a.label || "").localeCompare(String(b.label || ""), undefined, {sensitivity: "base", numeric: true}) ||
        Number(a.subtype) - Number(b.subtype));
      const options = choices.map(choice => {
        const targetSubtype = Number(choice.subtype);
        const label = String(choice.label || ("Enemy " + targetSubtype));
        const reason = choice.reason ? " · " + String(choice.reason) : "";
        return '<option value="' + targetSubtype + '"' +
          (targetSubtype === sourceSubtype ? " selected" : "") +
          (choice.available ? "" : " disabled") +
          (choice.reason ? ' title="' + escapeHtml(choice.reason) + '"' : "") + '>' +
          escapeHtml(label + reason) + '</option>';
      }).join("");
      return '<label class="enemy-bank-row"><span class="enemy-bank-label">' + escapeHtml(sourceLabel) + '</span>' +
        '<select data-source-subtype="' + sourceSubtype + '" aria-label="Replace every ' + escapeHtml(sourceLabel) + ' in this room with">' +
        options + '</select></label>';
    }).join("");
  }
  function updateEnemyBankAddState(addable, optionCount) {
    const value = ui.enemyBankAddEnemy.value;
    const selected = value === "" ? null : ui.enemyBankAddEnemy.selectedOptions[0];
    const available = selected && selected.dataset.available === "true";
    ui.enemyBankAddButton.disabled = !available;
    if (selected && !available) {
      ui.enemyBankAddHint.textContent = "Cannot add: " + selected.dataset.reason;
    } else if (selected) {
      ui.enemyBankAddHint.textContent = "Ready to add.";
    } else if (addable) {
      ui.enemyBankAddHint.textContent = "Choose an enemy to check room space.";
    } else {
      ui.enemyBankAddHint.textContent = optionCount
        ? "No other supported enemy fits this room."
        : "No supported enemies are available.";
    }
  }
  function refreshEnemyAddDraft(room, draft) {
    if (!draft || String(draft.type) !== "0") return draft;
    const enemy = state.model.getEnemyOptions(room.id).find(option =>
      option.subtype === Number(draft.enemySubtype) && option.available);
    if (!enemy) return draftFor(room, "0", null);
    const template = enemy.variants.find(option => option.id === draft.templateId) || enemy.variants[0];
    return {...draft, enemySubtype: enemy.subtype, templateId: template ? template.id : ""};
  }
  function addEnemyToBank() {
    const room = currentRoom();
    if (!room || ui.enemyBankAddEnemy.value === "") return;
    const selectedOption = ui.enemyBankAddEnemy.selectedOptions[0];
    if (!selectedOption || selectedOption.dataset.available !== "true") return;
    const subtype = Number(ui.enemyBankAddEnemy.value);
    if (!Number.isInteger(subtype)) return;
    const label = selectedOption.dataset.label || selectedOption.textContent;
    try {
      state.model.addEnemyToBank(room.id, subtype);
      state.addDraft = refreshEnemyAddDraft(room, state.addDraft);
      ui.enemyBankAddEnemy.value = "";
      updateChrome();
      renderRoomList();
      renderMapWorkspace();
      ui.enemyBankAddEnemy.focus();
      showNotice("Added " + label + " to this room's bank.", "success");
    } catch (error) {
      renderMapWorkspace();
      showNotice(error.message || "Could not add this enemy to the bank.", "error");
    }
  }
  function resetEnemyAddDraft(room) {
    if (state.addDraft && String(state.addDraft.type) === "0") {
      state.addDraft = draftFor(room, "0", null);
    }
  }
  function swapEnemyBank(select) {
    const room = currentRoom();
    if (!room || !select) return;
    const sourceSubtype = Number(select.dataset.sourceSubtype);
    const targetSubtype = Number(select.value);
    if (!Number.isInteger(sourceSubtype) || !Number.isInteger(targetSubtype) || sourceSubtype === targetSubtype) return;
    try {
      const sourceRow = state.model.getEnemyBank(room.id).find(row => Number(row.subtype) === sourceSubtype);
      const sourceLabel = sourceRow && sourceRow.label ? sourceRow.label : "this enemy";
      const choice = sourceRow && Array.isArray(sourceRow.choices)
        ? sourceRow.choices.find(row => Number(row.subtype) === targetSubtype)
        : null;
      const targetLabel = choice && choice.label ? choice.label : "the selected enemy";
      state.model.swapEnemyBank(room.id, sourceSubtype, targetSubtype);
      state.editDraftKey = "";
      resetEnemyAddDraft(room);
      updateChrome();
      renderRoomList();
      renderMapWorkspace();
      const nextSelect = ui.enemyBankRows.querySelector('[data-source-subtype="' + targetSubtype + '"]');
      if (nextSelect) nextSelect.focus();
      showNotice("Replaced every " + sourceLabel + " in this room with " + targetLabel + ".", "success");
    } catch (error) {
      renderMapWorkspace();
      showNotice(error.message || "Could not swap this enemy bank slot.", "error");
    }
  }
  function setZoom(value) {
    const zoom = Math.max(25, Math.min(400, Math.round(value / 25) * 25));
    const svg = byId("room-map");
    if (!svg || zoom === state.zoom) return;
    const previous = state.zoom;
    const viewport = ui.mapViewport;
    const xCenter = viewport.scrollLeft + viewport.clientWidth / 2;
    const yCenter = viewport.scrollTop + viewport.clientHeight / 2;
    state.zoom = zoom;
    const room = currentRoom();
    const dimensions = room ? roomDimensions(room) : null;
    if (dimensions) {
      svg.style.width = dimensions.width * zoom / 100 + "px";
      svg.style.height = dimensions.height * zoom / 100 + "px";
    }
    viewport.scrollLeft = xCenter * zoom / previous - viewport.clientWidth / 2;
    viewport.scrollTop = yCenter * zoom / previous - viewport.clientHeight / 2;
    ui.zoomLabel.textContent = zoom + "%";
    ui.zoomOut.disabled = zoom <= 25;
    ui.zoomIn.disabled = zoom >= 400;
  }
  function renderMapWorkspace() {
    const room = currentRoom();
    ui.showEntities.checked = state.showEntities;
    ui.showEntities.disabled = !state.model;
    ui.zoomLabel.textContent = state.zoom + "%";
    if (!room) {
      state.roomArtPreview = null;
      state.showCollision = false;
      ui.collisionToggle.checked = false;
      ui.collisionToggle.disabled = true;
      ui.roomTitle.textContent = "Choose a room";
      ui.roomSubtitle.textContent = state.model ? "Select a room from the area list." : "Your map will appear here after a ROM is loaded.";
      ui.roomBreadcrumb.textContent = state.model ? areaFilterLabel() : "MAP ARCHIVE";
      ui.mapSize.textContent = "— × — PX";
      ui.mapViewport.innerHTML = '<div class="map-empty"><div class="empty-crest" aria-hidden="true"><span>✦</span></div><strong>The map is sleeping</strong><span>Choose a room to see its layout and markers.</span></div>';
      ui.mapHint.textContent = "Select a room from the index.";
      ui.scrollUp.disabled = true;
      ui.scrollDown.disabled = true;
      ui.zoomOut.disabled = true;
      ui.zoomIn.disabled = true;
      renderEntityList(null, []);
      renderEntityControls(null, []);
      return;
    }
    const scrollLeft = ui.mapViewport.scrollLeft;
    const scrollTop = ui.mapViewport.scrollTop;
    const area = currentRoomArea();
    const dimensions = roomDimensions(room);
    const preview = roomArtPreview(room, dimensions);
    const entities = roomEntities(room);
    if (state.entityIndex !== null && !entities[state.entityIndex]) state.entityIndex = null;
    ui.roomTitle.textContent = room.name || String(room.id);
    ui.roomSubtitle.textContent = dimensions.width + " by " + dimensions.height + " pixels";
    ui.roomBreadcrumb.textContent = (area && area.name ? area.name + " · " : "") +
      "Castle " + (area ? area.castle : "");
    ui.mapSize.textContent = dimensions.width + " × " + dimensions.height + " PX";
    const collision = roomCollision(room);
    const hasCollision = Boolean(collision && collision.tileCount);
    const fallbackCollision = preview.status !== "ready" && hasCollision;
    ui.collisionToggle.checked = state.showCollision || fallbackCollision;
    ui.collisionToggle.disabled = !hasCollision || fallbackCollision;
    ui.mapViewport.innerHTML = renderRoomSvg(room, dimensions, entities, preview);
    const svg = byId("room-map");
    if (svg) {
      svg.style.width = dimensions.width * state.zoom / 100 + "px";
      svg.style.height = dimensions.height * state.zoom / 100 + "px";
    }
    ui.mapViewport.scrollLeft = scrollLeft;
    ui.mapViewport.scrollTop = scrollTop;
    if (preview.status === "unsupported") {
      ui.mapHint.textContent = "Artwork is unavailable; showing room geometry. Left-drag markers; right-drag to pan.";
    } else if (preview.status === "failed") {
      ui.mapHint.textContent = "Artwork could not be rendered; showing room geometry. Left-drag markers; right-drag to pan.";
    } else if (state.showCollision) {
      ui.mapHint.textContent = "Room artwork · collision overlay is on. Left-drag markers; right-drag to pan.";
    } else {
      ui.mapHint.textContent = "Left-drag a marker to move it · right-drag to pan.";
    }
    ui.scrollUp.disabled = false;
    ui.scrollDown.disabled = false;
    ui.zoomOut.disabled = state.zoom <= 25;
    ui.zoomIn.disabled = state.zoom >= 400;
    renderEntityList(room, entities);
    renderEntityControls(room, entities);
    bindMap(room, dimensions);
  }
  function bindMap(room, dimensions) {
    const svg = byId("room-map");
    if (!svg) return;
    svg.addEventListener("pointerdown", event => {
      if (event.button !== 0) return;
      const marker = event.target.closest("[data-index]");
      if (!marker) return;
      event.preventDefault();
      const index = Number(marker.dataset.index);
      const entities = roomEntities(room);
      const entity = entities[index];
      if (!entity) return;
      state.entityIndex = index;
      state.editDraftKey = "";
      renderEntityList(room, entities);
      renderEntityControls(room, entities);
      svg.querySelectorAll(".entity-marker").forEach(item => {
        const selected = Number(item.dataset.index) === index;
        item.classList.toggle("is-selected", selected);
        item.setAttribute("aria-pressed", String(selected));
      });
      state.drag = {
        pointerId: event.pointerId, index,
        startClientX: event.clientX, startClientY: event.clientY,
        startX: numeric(entity.x, 0), startY: numeric(entity.y, 0),
        x: numeric(entity.x, 0), y: numeric(entity.y, 0),
        moved: false,
      };
      svg.setPointerCapture(event.pointerId);
    });
    svg.addEventListener("pointermove", event => {
      const drag = state.drag;
      if (!drag || drag.pointerId !== event.pointerId) return;
      const rect = svg.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      const x = Math.max(0, Math.min(dimensions.width - 1,
        Math.round(drag.startX + (event.clientX - drag.startClientX) * dimensions.width / rect.width)));
      const y = Math.max(0, Math.min(dimensions.height - 1,
        Math.round(drag.startY + (event.clientY - drag.startClientY) * dimensions.height / rect.height)));
      drag.x = x;
      drag.y = y;
      drag.moved = x !== drag.startX || y !== drag.startY;
      const marker = svg.querySelector('[data-index="' + drag.index + '"]');
      if (marker) marker.setAttribute("transform",
        "translate(" + (x - drag.startX) + " " + (y - drag.startY) + ")");
      event.preventDefault();
    });
    svg.addEventListener("pointerup", event => {
      const drag = state.drag;
      if (!drag || drag.pointerId !== event.pointerId) return;
      state.drag = null;
      if (!drag.moved) {
        renderMapWorkspace();
        return;
      }
      try {
        state.entityIndex = drag.index;
        state.model.updateEntity(room.id, drag.index, {x: drag.x, y: drag.y});
        afterEdit("Entity moved to " + drag.x + ", " + drag.y + ".");
      } catch (error) {
        renderMapWorkspace();
        showNotice(error.message || "Could not move this entity.", "error");
      }
    });
    svg.addEventListener("pointercancel", event => {
      if (state.drag && state.drag.pointerId === event.pointerId) {
        state.drag = null;
        renderMapWorkspace();
      }
    });
    svg.addEventListener("keydown", event => {
      const marker = event.target.closest("[data-index]");
      if (marker && (event.key === "Enter" || event.key === " ")) {
        event.preventDefault();
        selectEntity(Number(marker.dataset.index));
      }
    });
  }
  function bindViewportPanning() {
    ui.mapViewport.addEventListener("contextmenu", event => event.preventDefault());
    ui.mapViewport.addEventListener("pointerdown", event => {
      if (event.button !== 2) return;
      event.preventDefault();
      state.pan = {pointerId: event.pointerId, x: event.clientX, y: event.clientY,
        left: ui.mapViewport.scrollLeft, top: ui.mapViewport.scrollTop};
      ui.mapViewport.classList.add("is-panning");
      ui.mapViewport.setPointerCapture(event.pointerId);
    });
    ui.mapViewport.addEventListener("pointermove", event => {
      const pan = state.pan;
      if (!pan || pan.pointerId !== event.pointerId) return;
      ui.mapViewport.scrollLeft = pan.left - (event.clientX - pan.x);
      ui.mapViewport.scrollTop = pan.top - (event.clientY - pan.y);
      event.preventDefault();
    });
    const endPan = event => {
      if (!state.pan || state.pan.pointerId !== event.pointerId) return;
      state.pan = null;
      ui.mapViewport.classList.remove("is-panning");
    };
    ui.mapViewport.addEventListener("pointerup", endPan);
    ui.mapViewport.addEventListener("pointercancel", endPan);
  }
  function selectEntity(index) {
    state.entityIndex = Number.isInteger(index) ? index : null;
    state.editDraftKey = "";
    renderMapWorkspace();
  }
  function selectRoom(id) {
    state.roomId = id;
    state.entityIndex = null;
    state.editDraftKey = "";
    ui.mapViewport.scrollLeft = 0;
    ui.mapViewport.scrollTop = 0;
    ui.addX.value = "32";
    ui.addY.value = "32";
    renderRoomList();
    renderMapWorkspace();
  }
  function renderMap() {
    renderRoomList();
    renderMapWorkspace();
  }
  function afterEdit(message) {
    state.editDraftKey = "";
    updateChrome();
    renderRoomList();
    renderMapWorkspace();
    if (message) showNotice(message, "success");
  }
  function currentSelectedEntity(room) {
    const entities = roomEntities(room);
    return Number.isInteger(state.entityIndex) ? entities[state.entityIndex] : null;
  }
  function addEntity() {
    const room = currentRoom();
    if (!room || !state.addDraft) return;
    const x = integerInput(ui.addX);
    const y = integerInput(ui.addY);
    if (x === null || y === null) {
      showNotice("Enter a valid X and Y position.", "error");
      return;
    }
    const values = {type: Number(state.addDraft.type), x, y};
    if (values.type === 0 || values.type === 3) {
      values.templateId = state.addDraft.templateId;
    } else if (values.type === 2) {
      const reward = String(state.addDraft.reward || "").split("/").map(Number);
      values.appearance = Number(state.addDraft.appearance);
      values.subtype = reward[0];
      values.varB = reward[1];
    }
    try {
      const index = state.model.addTypedEntity(room.id, values, x, y);
      state.entityIndex = Number.isInteger(index) ? index : roomEntities(room).length - 1;
      afterEdit("Entity added to " + (room.name || "the room") + ".");
    } catch (error) {
      showNotice(error.message || "Could not add this entity.", "error");
    }
  }
  function applyEntity() {
    const room = currentRoom();
    const selectedEntity = currentSelectedEntity(room);
    if (!room || !selectedEntity || !state.editDraft) return;
    const x = integerInput(ui.editX);
    const y = integerInput(ui.editY);
    if (x === null || y === null) {
      showNotice("Enter a valid X and Y position.", "error");
      return;
    }
    const values = {type: Number(state.editDraft.type), x, y};
    if (values.type === 0 || values.type === 3) {
      values.templateId = state.editDraft.templateId;
    } else if (values.type === 2) {
      const reward = String(state.editDraft.reward || "").split("/").map(Number);
      values.appearance = Number(state.editDraft.appearance);
      values.subtype = reward[0];
      values.varB = reward[1];
    }
    try {
      const index = state.model.updateTypedEntity(room.id, state.entityIndex, values);
      if (Number.isInteger(index)) state.entityIndex = index;
      afterEdit("Entity updated.");
    } catch (error) {
      showNotice(error.message || "Could not update this entity.", "error");
    }
  }
  function duplicatePosition(entity, dimensions) {
    const limitX = Math.max(0, dimensions.width - 1);
    const limitY = Math.max(0, dimensions.height - 1);
    let x = Math.max(0, Math.min(limitX, numeric(entity.x, 0) + 16));
    let y = Math.max(0, Math.min(limitY, numeric(entity.y, 0) + 16));
    if (x === entity.x && limitX > 0) x = Math.max(0, Math.min(limitX, numeric(entity.x, 0) - 16));
    if (y === entity.y && limitY > 0) y = Math.max(0, Math.min(limitY, numeric(entity.y, 0) - 16));
    return {x, y};
  }
  function duplicateEntity() {
    const room = currentRoom();
    const entity = currentSelectedEntity(room);
    if (!room || !entity) return;
    const position = duplicatePosition(entity, roomDimensions(room));
    try {
      const index = state.model.duplicateEntity(room.id, state.entityIndex, position.x, position.y);
      state.entityIndex = Number.isInteger(index) ? index : roomEntities(room).length - 1;
      afterEdit("Entity duplicated.");
    } catch (error) {
      showNotice(error.message || "Could not duplicate this entity.", "error");
    }
  }
  function removeEntity() {
    const room = currentRoom();
    if (!room || !Number.isInteger(state.entityIndex)) return;
    try {
      state.model.removeEntity(room.id, state.entityIndex);
      state.entityIndex = null;
      state.editDraftKey = "";
      afterEdit("Entity removed.");
    } catch (error) {
      showNotice(error.message || "Could not remove this entity.", "error");
    }
  }  function refreshEntityControls(prefix) {
    const room = currentRoom();
    const entities = room ? roomEntities(room) : [];
    const editX = ui.editX.value;
    const editY = ui.editY.value;
    const addX = ui.addX.value;
    const addY = ui.addY.value;
    renderEntityControls(room, entities);
    if (prefix === "edit") {
      ui.editX.value = editX;
      ui.editY.value = editY;
    }
    ui.addX.value = addX;
    ui.addY.value = addY;
  }
  function changeDraftType(prefix) {
    const room = currentRoom();
    if (!room) return;
    const selected = prefix === "edit" ? currentSelectedEntity(room) : null;
    const type = prefix === "edit" ? ui.editType.value : ui.addType.value;
    const sameTypeEntity = selected && String(selected.type) === String(type) ? selected : null;
    const draft = draftFor(room, type, sameTypeEntity);
    if (prefix === "edit") state.editDraft = draft;
    else state.addDraft = draft;
    refreshEntityControls(prefix);
  }
  function changeDraftChoice(prefix, field) {
    const draft = prefix === "edit" ? state.editDraft : state.addDraft;
    if (!draft) return;
    const refs = choiceRefs(prefix);
    if (field === "enemy") {
      const value = refs.enemy.value;
      draft.enemySubtype = value === "" ? "" : Number(value);
      const room = currentRoom();
      const enemy = room && state.model.getEnemyOptions(room.id)
        .find(option => option.subtype === Number(value));
      draft.templateId = enemy && enemy.variants.length ? enemy.variants[0].id : "";
    } else if (field === "variant") {
      draft.templateId = refs.variant.value;
    } else if (field === "pickup") {
      draft.templateId = refs.pickup.value;
    } else if (field === "appearance") {
      draft.appearance = refs.appearance.value === "" ? "" : Number(refs.appearance.value);
    } else if (field === "content") {
      draft.reward = refs.content.value;
    }
    refreshEntityControls(prefix);
  }
  function allStats(category) {
    if (!state.model || !state.model.stats) return [];
    const entries = state.model.stats[category];
    return Array.isArray(entries) ? entries : [];
  }

  function renderStats() {
    const query = ui.statsSearch.value.trim().toLocaleLowerCase();
    const entries = allStats(state.category);
    const filtered = entries.filter((entry) => {
      if (!query) return true;
      const searchable = [entry.name, entry.id].concat((entry.fields || []).flatMap((field) => [field.label, field.id, field.note]));
      return searchable.join(" ").toLocaleLowerCase().includes(query);
    });
    ui.statsCount.textContent = state.model ? filtered.length + " OF " + entries.length + " ENTRIES" : "—";
    document.querySelectorAll(".category-button").forEach((button) => {
      const selected = button.dataset.category === state.category;
      button.classList.toggle("is-selected", selected);
      button.setAttribute("aria-selected", String(selected));
      button.tabIndex = selected ? 0 : -1;
    });

    if (!state.model) {
      ui.statsList.innerHTML = '<div class="stats-empty"><span class="empty-crest" aria-hidden="true"><span>✧</span></span><strong>No ledger loaded</strong><span>Load a ROM to view editable stats.</span></div>';
      return;
    }
    if (!filtered.length) {
      ui.statsList.innerHTML = '<div class="stats-empty"><span class="empty-crest" aria-hidden="true"><span>⌕</span></span><strong>' + (query ? "No entries found" : "No records in this chapter") + '</strong><span>' + (query ? "Try a shorter search." : "Choose another category.") + '</span></div>';
      return;
    }

    ui.statsList.innerHTML = filtered.map((entry) => {
      const fields = Array.isArray(entry.fields) ? entry.fields : [];
      const controls = fields.map((field) => {
        const min = field.min === undefined || field.min === null ? "" : ' min="' + escapeHtml(field.min) + '"';
        const max = field.max === undefined || field.max === null ? "" : ' max="' + escapeHtml(field.max) + '"';
        const note = field.note ? '<span class="stat-note">' + escapeHtml(field.note) + '</span>' : "";
        return '<label class="stat-field"><span class="stat-field-label">' + escapeHtml(field.label || field.id) + '</span>' +
          '<input type="number" step="1" value="' + escapeHtml(field.value) + '" data-field-id="' + escapeHtml(field.id) + '"' + min + max + ' aria-label="' + escapeHtml((entry.name || entry.id) + " " + (field.label || field.id)) + '">' + note + '</label>';
      }).join("");
      return '<article class="stat-card"><header class="stat-card-header"><h2>' + escapeHtml(entry.name || entry.id || "Unknown record") + '</h2><span class="stat-id">' + escapeHtml(entry.id || "") + '</span></header><div class="stat-fields">' + controls + '</div></article>';
    }).join("");
  }

  function updateStat(input) {
    const fieldId = input.dataset.fieldId;
    const value = integerInput(input);
    if (value === null) {
      renderStats();
      showNotice("Enter a whole number.", "error");
      return;
    }
    try {
      state.model.updateStat(fieldId, value);
      updateChrome();
      showNotice("Stat updated.", "success");
    } catch (error) {
      renderStats();
      showNotice(error.message || "Could not update this stat.", "error");
    }
  }

  async function loadRom(file) {
    if (!file) return;
    const editor = window.HodEditor;
    if (!editor || typeof editor.open !== "function") {
      showNotice("The editor files are missing. Keep profile.js and core.js beside this page.", "error");
      return;
    }
    ui.file.disabled = true;
    ui.loadLabel.textContent = "Opening…";
    try {
      const bytes = new Uint8Array(await file.arrayBuffer());
      const nextModel = await editor.open(bytes);
      if (!nextModel || !Array.isArray(nextModel.areas)) throw new Error("This ROM did not open as a Harmony of Dissonance project.");
      state.model = nextModel;
      state.fileName = file.name;
      state.areaFilter = nextModel.areas.some(area => area.castle === "A") ? "castle:A" : "all";
      state.roomId = null;
      state.entityIndex = null;
      state.editDraft = null;
      state.editDraftKey = "";
      state.addDraft = { type: "0" };
      state.addDraftRoom = "";
      state.drag = null;
      state.pan = null;
      ui.roomSearch.value = "";
      ui.statsSearch.value = "";
      updateChrome();
      renderMap();
      renderStats();
      showNotice("ROM loaded. Choose a room or edit a stat.", "success");
    } catch (error) {
      showNotice(error.message || "Could not open this ROM.", "error");
    } finally {
      ui.loadLabel.textContent = "Load .gba";
      ui.file.value = "";
      ui.file.disabled = false;
    }
  }

  function downloadRom() {
    if (!state.model) return;
    try {
      const bytes = state.model.build();
      if (!(bytes instanceof Uint8Array)) throw new Error("The ROM could not be built.");
      const stem = state.fileName.replace(/\.gba$/i, "");
      const name = (stem || "harmony-of-dissonance") + "-edited.gba";
      const blob = new Blob([bytes], { type: "application/octet-stream" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = name;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1200);
      showNotice("Your edited ROM is ready to save.", "success");
    } catch (error) {
      showNotice(error.message || "Could not build the edited ROM.", "error");
    }
  }

  document.querySelectorAll(".main-tab").forEach((button, index, buttons) => {
    button.addEventListener("click", () => switchPanel(button.dataset.panel));
    button.addEventListener("keydown", event => {
      if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
      event.preventDefault();
      const next = buttons[(index + (event.key === "ArrowRight" ? 1 : buttons.length - 1)) % buttons.length];
      next.focus();
      switchPanel(next.dataset.panel);
    });
  });
  ui.areaSelect.addEventListener("change", () => {
    state.areaFilter = ui.areaSelect.value || "all";
    state.roomId = null;
    state.entityIndex = null;
    state.editDraftKey = "";
    ui.mapViewport.scrollLeft = 0;
    ui.mapViewport.scrollTop = 0;
    renderMap();
  });
  document.querySelectorAll(".category-button").forEach((button, index, buttons) => {
    button.addEventListener("click", () => {
      state.category = button.dataset.category;
      renderStats();
    });
    button.addEventListener("keydown", event => {
      if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
      event.preventDefault();
      const next = buttons[(index + (event.key === "ArrowRight" ? 1 : buttons.length - 1)) % buttons.length];
      state.category = next.dataset.category;
      renderStats();
      next.focus();
    });
  });
  ui.roomSearch.addEventListener("input", renderRoomList);
  ui.roomList.addEventListener("click", event => {
    const button = event.target.closest("[data-room-id]");
    if (button) selectRoom(button.dataset.roomId);
  });
  ui.entityList.addEventListener("click", event => {
    const button = event.target.closest("[data-index]");
    if (button) selectEntity(Number(button.dataset.index));
  });
  ui.enemyBankRows.addEventListener("change", event => {
    const select = event.target.closest("[data-source-subtype]");
    if (select) swapEnemyBank(select);
  });
  ui.enemyBankAddEnemy.addEventListener("change", () => updateEnemyBankAddState(
    [...ui.enemyBankAddEnemy.options].some(option => option.dataset.available === "true"),
    Math.max(0, ui.enemyBankAddEnemy.options.length - 1)));
  ui.enemyBankAddButton.addEventListener("click", addEnemyToBank);
  ui.showEntities.addEventListener("change", () => {
    state.showEntities = ui.showEntities.checked;
    renderMapWorkspace();
  });
  ui.collisionToggle.addEventListener("change", () => {
    state.showCollision = ui.collisionToggle.checked;
    renderMapWorkspace();
  });
  ui.scrollUp.addEventListener("click", () => {
    ui.mapViewport.scrollTop = Math.max(0, ui.mapViewport.scrollTop - Math.round(ui.mapViewport.clientHeight * 0.8));
  });
  ui.scrollDown.addEventListener("click", () => {
    ui.mapViewport.scrollTop = Math.min(ui.mapViewport.scrollHeight,
      ui.mapViewport.scrollTop + Math.round(ui.mapViewport.clientHeight * 0.8));
  });
  ui.zoomOut.addEventListener("click", () => setZoom(state.zoom - 25));
  ui.zoomIn.addEventListener("click", () => setZoom(state.zoom + 25));
  ui.editType.addEventListener("change", () => changeDraftType("edit"));
  ui.addType.addEventListener("change", () => changeDraftType("add"));
  [
    ["edit", ui.editEnemy, "enemy"], ["edit", ui.editEnemyVariant, "variant"],
    ["edit", ui.editPickup, "pickup"], ["edit", ui.editAppearance, "appearance"],
    ["edit", ui.editContent, "content"], ["add", ui.addEnemy, "enemy"],
    ["add", ui.addEnemyVariant, "variant"], ["add", ui.addPickup, "pickup"],
    ["add", ui.addAppearance, "appearance"], ["add", ui.addContent, "content"],
  ].forEach(([prefix, select, field]) => {
    select.addEventListener("change", () => changeDraftChoice(prefix, field));
  });
  ui.addEntity.addEventListener("click", addEntity);
  ui.applyEntity.addEventListener("click", applyEntity);
  ui.duplicateEntity.addEventListener("click", duplicateEntity);
  ui.removeEntity.addEventListener("click", removeEntity);
  bindViewportPanning();
  ui.statsSearch.addEventListener("input", renderStats);
  ui.statsList.addEventListener("change", event => {
    const input = event.target.closest("[data-field-id]");
    if (input) updateStat(input);
  });
  ui.file.addEventListener("change", () => loadRom(ui.file.files && ui.file.files[0]));
  ui.undo.addEventListener("click", () => {
    if (!state.model) return;
    try {
      state.model.undo();
      state.entityIndex = null;
      state.editDraftKey = "";
      resetEnemyAddDraft(currentRoom());
      updateChrome();
      renderMap();
      renderStats();
      showNotice("Undid the latest edit.", "success");
    } catch (error) {
      showNotice(error.message || "Could not undo that edit.", "error");
    }
  });
  ui.download.addEventListener("click", downloadRom);
  document.addEventListener("keydown", event => {
    if (event.key === "/" && !event.ctrlKey && !event.metaKey && !event.altKey) {
      const target = event.target;
      if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement) return;
      event.preventDefault();
      const statsVisible = !byId("stats-panel").hidden;
      (statsVisible ? ui.statsSearch : ui.roomSearch).focus();
    }
    if (event.key === "Escape" && state.drag) {
      state.drag = null;
      renderMapWorkspace();
    }
  });  renderMap();
  renderStats();
  updateChrome();
})();
