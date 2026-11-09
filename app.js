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
    roomSearch: byId("room-search"),
    roomCount: byId("room-count"),
    roomList: byId("room-list"),
    roomBreadcrumb: byId("room-breadcrumb"),
    roomTitle: byId("room-title"),
    roomSubtitle: byId("room-subtitle"),
    mapSize: byId("map-size"),
    mapViewport: byId("map-viewport"),
    mapHint: byId("map-hint"),
    collisionToggle: byId("collision-toggle"),
    moveToggle: byId("move-toggle"),
    entityCount: byId("entity-count"),
    entityList: byId("entity-list"),
    addTemplate: byId("add-template"),
    addX: byId("add-x"),
    addY: byId("add-y"),
    addEntity: byId("add-entity"),
    selectedName: byId("selected-name"),
    editX: byId("edit-x"),
    editY: byId("edit-y"),
    replaceTemplate: byId("replace-template"),
    applyEntity: byId("apply-entity"),
    removeEntity: byId("remove-entity"),
    statsSearch: byId("stats-search"),
    statsCount: byId("stats-count"),
    statsList: byId("stats-list"),
    notice: byId("live-notice")
  };

  const kindNames = { 0: "Enemy", 1: "Object", 2: "Candle", 3: "Pickup" };
  const state = {
    model: null,
    fileName: "",
    castle: "A",
    roomId: null,
    entityIndex: null,
    addTemplateId: "",
    category: "juste",
    moveMode: false,
    showCollision: false,
    roomArtPreview: null,
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
    return name === "enemy" || name === "object" || name === "candle" || name === "pickup" ? name : "enemy";
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

  function areasForCastle() {
    const query = ui.roomSearch.value.trim().toLocaleLowerCase();
    return currentAreas().filter((area) => area.castle === state.castle).map((area) => {
      const rooms = (Array.isArray(area.rooms) ? area.rooms : []).filter((room) => {
        return !query || [area.name, room.name, room.id].join(" ").toLocaleLowerCase().includes(query);
      });
      return { area, rooms };
    }).filter((group) => group.rooms.length > 0);
  }

  function renderRoomList() {
    document.querySelectorAll(".castle-button").forEach((button) => {
      const selected = button.dataset.castle === state.castle;
      button.classList.toggle("is-selected", selected);
      button.setAttribute("aria-pressed", String(selected));
    });

    const groups = areasForCastle();
    const count = groups.reduce((total, group) => total + group.rooms.length, 0);
    ui.roomCount.textContent = state.model ? String(count).padStart(2, "0") : "—";

    if (!state.model) {
      ui.roomList.innerHTML = '<div class="list-empty"><span class="empty-ornament">✦</span><strong>Waiting for a record</strong><span>Load a ROM to reveal its rooms.</span></div>';
      return;
    }

    if (!count) {
      const query = ui.roomSearch.value.trim();
      const message = query ? "No rooms match this search." : "No rooms in this castle.";
      ui.roomList.innerHTML = '<div class="list-empty"><span class="empty-ornament">⌕</span><strong>' + escapeHtml(message) + '</strong><span>Try another castle or search.</span></div>';
      return;
    }

    ui.roomList.innerHTML = groups.map((group) => {
      const areaName = escapeHtml(group.area.name || "Area");
      const buttons = group.rooms.map((room) => {
        const selected = room.id === state.roomId;
        const name = escapeHtml(room.name || String(room.id));
        const id = escapeHtml(room.id);
        const entityCount = roomEntities(room).length;
        return '<button class="room-choice' + (selected ? ' is-selected' : '') + '" type="button" data-room-id="' + id + '" aria-current="' + (selected ? 'true' : 'false') + '">' +
          '<span class="room-glyph" aria-hidden="true">⌂</span><span class="room-choice-name">' + name + '</span><span class="room-count-mini">' + entityCount + '</span></button>';
      }).join("");
      return '<section class="room-group"><h3 class="area-name">' + areaName + '</h3>' + buttons + '</section>';
    }).join("");
  }

  function roomDimensions(room) {
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
    const markers = entities.map(markerMarkup).join("");
    const moveClass = state.moveMode ? " is-moving" : "";
    const background = preview.status === "ready"
      ? '<image class="room-art" href="' + preview.dataUrl + '" x="0" y="0" width="' + preview.width + '" height="' + preview.height + '" preserveAspectRatio="none" image-rendering="pixelated"/>'
      : '<rect x="0" y="0" width="' + width + '" height="' + height + '" fill="#21192b"/>';
    const collision = state.showCollision || preview.status !== "ready" ? collisionRects(room) : "";
    return '<svg id="room-map" class="room-svg' + moveClass + '" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + width + ' ' + height + '" role="img" aria-label="Room layout with entity markers">' +
      '<title>' + escapeHtml(room.name || room.id) + ' layout</title>' +
      background + '<g class="collision-overlay" aria-label="Collision geometry">' + collision + '</g>' +
      '<rect class="map-edge" x=".5" y=".5" width="' + Math.max(0, width - 1) + '" height="' + Math.max(0, height - 1) + '"/>' + markers + '</svg>';
  }

  function renderEntityList(room, entities) {
    ui.entityCount.textContent = entities.length + (entities.length === 1 ? " MARKER" : " MARKERS");
    if (!room) {
      ui.entityList.innerHTML = '<p class="muted-note">Choose a room to inspect its contents.</p>';
      return;
    }
    if (!entities.length) {
      ui.entityList.innerHTML = '<p class="muted-note">This room has no placed markers yet.</p>';
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

  function templateOptions(templates, selectedId, emptyLabel) {
    const first = '<option value="">' + escapeHtml(emptyLabel) + '</option>';
    return first + templates.map((template) => {
      return '<option value="' + escapeHtml(template.id) + '"' + (String(template.id) === String(selectedId) ? " selected" : "") + '>' +
        escapeHtml(template.label || (typeName(template.type) + " template")) + '</option>';
    }).join("");
  }

  function renderEntityControls(room, entities) {
    const templates = room ? roomTemplates(room) : [];
    const addEnabled = Boolean(room && templates.length);
    const selectedEntity = room && Number.isInteger(state.entityIndex) ? entities[state.entityIndex] : null;
    const selectedEnabled = Boolean(selectedEntity);

    ui.addTemplate.innerHTML = templateOptions(templates, state.addTemplateId, addEnabled ? "Choose a template…" : (room ? "No templates available" : "Choose a room first"));
    ui.addTemplate.disabled = !addEnabled;
    if (addEnabled && !templates.some((template) => String(template.id) === String(state.addTemplateId))) {
      state.addTemplateId = String(templates[0].id);
      ui.addTemplate.value = state.addTemplateId;
    }
    ui.addX.disabled = !addEnabled;
    ui.addY.disabled = !addEnabled;
    ui.addEntity.disabled = !addEnabled || !state.addTemplateId;

    ui.selectedName.textContent = selectedEntity ? labelForEntity(selectedEntity, state.entityIndex) : "Nothing selected";
    ui.editX.value = selectedEntity ? numeric(selectedEntity.x, 0) : "";
    ui.editY.value = selectedEntity ? numeric(selectedEntity.y, 0) : "";
    ui.editX.disabled = !selectedEnabled;
    ui.editY.disabled = !selectedEnabled;
    ui.replaceTemplate.innerHTML = templateOptions(templates, "", "Keep current type");
    ui.replaceTemplate.disabled = !selectedEnabled || !templates.length;
    ui.applyEntity.disabled = !selectedEnabled;
    ui.removeEntity.disabled = !selectedEnabled;
  }

  function renderMapWorkspace() {
    const room = currentRoom();
    ui.moveToggle.disabled = !room || !Number.isInteger(state.entityIndex);
    ui.moveToggle.setAttribute("aria-pressed", String(state.moveMode));
    ui.moveToggle.classList.toggle("is-moving", state.moveMode);
    if (!room) {
      state.roomArtPreview = null;
      state.showCollision = false;
      ui.collisionToggle.checked = false;
      ui.collisionToggle.disabled = true;
      ui.roomTitle.textContent = "Choose a room";
      ui.roomSubtitle.textContent = state.model ? "Select a room from the field guide to begin." : "Your map will appear here after a ROM is loaded.";
      ui.roomBreadcrumb.innerHTML = 'MAP ARCHIVE <span>·</span> CASTLE ' + escapeHtml(state.castle);
      ui.mapSize.textContent = "— × — PX";
      ui.mapViewport.innerHTML = '<div class="map-empty"><div class="empty-crest" aria-hidden="true"><span>✦</span></div><strong>The map is sleeping</strong><span>Choose a room to see its layout and markers.</span></div>';
      ui.mapHint.textContent = "Select a room from the index.";
      state.moveMode = false;
      renderEntityList(null, []);
      renderEntityControls(null, []);
      return;
    }

    const area = currentRoomArea();
    const dimensions = roomDimensions(room);
    const preview = roomArtPreview(room, dimensions);
    const entities = roomEntities(room);
    if (state.entityIndex !== null && !entities[state.entityIndex]) state.entityIndex = null;

    ui.roomTitle.textContent = room.name || String(room.id);
    ui.roomSubtitle.textContent = (area && area.name ? area.name + " · " : "") + dimensions.width + " by " + dimensions.height + " pixels";
    ui.roomBreadcrumb.innerHTML = escapeHtml((area && area.name) || "MAP ARCHIVE") + ' <span>·</span> CASTLE ' + escapeHtml(state.castle);
    ui.mapSize.textContent = dimensions.width + " × " + dimensions.height + " PX";
    const collision = roomCollision(room);
    const hasCollision = Boolean(collision && collision.tileCount);
    const fallbackCollision = preview.status !== "ready" && hasCollision;
    ui.collisionToggle.checked = state.showCollision || fallbackCollision;
    ui.collisionToggle.disabled = !hasCollision || fallbackCollision;
    ui.mapViewport.innerHTML = renderRoomSvg(room, dimensions, entities, preview);
    const moveHint = state.moveMode ? " Move mode is on · click the map to place the selected marker." : "";
    if (preview.status === "unsupported") {
      ui.mapHint.textContent = "Artwork is unavailable; showing the room geometry fallback." + moveHint;
    } else if (preview.status === "failed") {
      ui.mapHint.textContent = "Artwork could not be rendered; showing the room geometry fallback." + moveHint;
    } else if (state.moveMode) {
      ui.mapHint.textContent = "Move mode is on · click the map to place the selected marker.";
    } else {
      ui.mapHint.textContent = state.showCollision ? "Room artwork · collision overlay is on." : "Room artwork · pixel view.";
    }
    renderEntityList(room, entities);
    renderEntityControls(room, entities);
    bindMap(room, dimensions);
  }

  function bindMap(room, dimensions) {
    const svg = byId("room-map");
    if (!svg) return;
    svg.addEventListener("click", (event) => {
      const marker = event.target.closest("[data-index]");
      if (marker) {
        state.entityIndex = Number(marker.dataset.index);
        renderMapWorkspace();
        return;
      }
      if (!state.moveMode || !Number.isInteger(state.entityIndex)) return;
      const rect = svg.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      const x = Math.min(dimensions.width - 1, Math.max(0, Math.round((event.clientX - rect.left) * dimensions.width / rect.width)));
      const y = Math.min(dimensions.height - 1, Math.max(0, Math.round((event.clientY - rect.top) * dimensions.height / rect.height)));
      moveSelected(room, x, y);
    });
    svg.addEventListener("keydown", (event) => {
      const marker = event.target.closest("[data-index]");
      if (marker && (event.key === "Enter" || event.key === " ")) {
        event.preventDefault();
        state.entityIndex = Number(marker.dataset.index);
        renderMapWorkspace();
      }
    });
  }

  function moveSelected(room, x, y) {
    try {
      const index = state.model.updateEntity(room.id, state.entityIndex, { x, y });
      if (Number.isInteger(index)) state.entityIndex = index;
      ui.editX.value = x;
      ui.editY.value = y;
      afterEdit("Marker moved to " + x + ", " + y + ".");
    } catch (error) {
      showNotice(error.message || "Could not move this marker.", "error");
    }
  }

  function selectRoom(id) {
    state.roomId = id;
    state.entityIndex = null;
    state.moveMode = false;
    const room = currentRoom();
    const templates = room ? roomTemplates(room) : [];
    state.addTemplateId = templates.length ? String(templates[0].id) : "";
    renderRoomList();
    renderMapWorkspace();
  }

  function renderMap() {
    renderRoomList();
    renderMapWorkspace();
  }

  function afterEdit(message) {
    updateChrome();
    renderRoomList();
    renderMapWorkspace();
    if (message) showNotice(message, "success");
  }

  function addEntity() {
    const room = currentRoom();
    if (!room || !state.addTemplateId) return;
    const x = integerInput(ui.addX);
    const y = integerInput(ui.addY);
    if (x === null || y === null) {
      showNotice("Enter a valid X and Y position.", "error");
      return;
    }
    try {
      const index = state.model.addEntity(room.id, state.addTemplateId, x, y);
      state.entityIndex = Number.isInteger(index) ? index : roomEntities(room).length - 1;
      afterEdit("Entity added to " + (room.name || "the room") + ".");
    } catch (error) {
      showNotice(error.message || "Could not add this entity.", "error");
    }
  }

  function applyEntity() {
    const room = currentRoom();
    if (!room || !Number.isInteger(state.entityIndex)) return;
    const x = integerInput(ui.editX);
    const y = integerInput(ui.editY);
    if (x === null || y === null) {
      showNotice("Enter a valid X and Y position.", "error");
      return;
    }
    const patch = { x, y };
    if (ui.replaceTemplate.value) patch.templateId = ui.replaceTemplate.value;
    try {
      const index = state.model.updateEntity(room.id, state.entityIndex, patch);
      if (Number.isInteger(index)) state.entityIndex = index;
      afterEdit(ui.replaceTemplate.value ? "Marker updated and template replaced." : "Marker updated.");
    } catch (error) {
      showNotice(error.message || "Could not update this marker.", "error");
    }
  }

  function removeEntity() {
    const room = currentRoom();
    if (!room || !Number.isInteger(state.entityIndex)) return;
    try {
      state.model.removeEntity(room.id, state.entityIndex);
      state.entityIndex = null;
      afterEdit("Marker removed.");
    } catch (error) {
      showNotice(error.message || "Could not remove this marker.", "error");
    }
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
      state.castle = ["A", "B", "Other"].includes(nextModel.areas[0] && nextModel.areas[0].castle) ? nextModel.areas[0].castle : "A";
      state.roomId = null;
      state.entityIndex = null;
      state.addTemplateId = "";
      state.moveMode = false;
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
    button.addEventListener("keydown", (event) => {
      if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
      event.preventDefault();
      const next = buttons[(index + (event.key === "ArrowRight" ? 1 : buttons.length - 1)) % buttons.length];
      next.focus();
      switchPanel(next.dataset.panel);
    });
  });
  document.querySelectorAll(".castle-button").forEach((button) => {
    button.addEventListener("click", () => {
      state.castle = button.dataset.castle;
      state.roomId = null;
      state.entityIndex = null;
      state.moveMode = false;
      renderMap();
    });
  });
  document.querySelectorAll(".category-button").forEach((button, index, buttons) => {
    button.addEventListener("click", () => {
      state.category = button.dataset.category;
      renderStats();
    });
    button.addEventListener("keydown", (event) => {
      if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
      event.preventDefault();
      const next = buttons[(index + (event.key === "ArrowRight" ? 1 : buttons.length - 1)) % buttons.length];
      state.category = next.dataset.category;
      renderStats();
      next.focus();
    });
  });
  ui.roomSearch.addEventListener("input", renderRoomList);
  ui.roomList.addEventListener("click", (event) => {
    const button = event.target.closest("[data-room-id]");
    if (button) selectRoom(button.dataset.roomId);
  });
  ui.entityList.addEventListener("click", (event) => {
    const button = event.target.closest("[data-index]");
    if (!button) return;
    state.entityIndex = Number(button.dataset.index);
    renderMapWorkspace();
  });
  ui.moveToggle.addEventListener("click", () => {
    state.moveMode = !state.moveMode;
    renderMapWorkspace();
  });
  ui.collisionToggle.addEventListener("change", () => {
    state.showCollision = ui.collisionToggle.checked;
    renderMapWorkspace();
  });
  ui.addTemplate.addEventListener("change", () => {
    state.addTemplateId = ui.addTemplate.value;
    renderEntityControls(currentRoom(), currentRoom() ? roomEntities(currentRoom()) : []);
  });
  ui.addEntity.addEventListener("click", addEntity);
  ui.applyEntity.addEventListener("click", applyEntity);
  ui.removeEntity.addEventListener("click", removeEntity);
  ui.statsSearch.addEventListener("input", renderStats);
  ui.statsList.addEventListener("change", (event) => {
    const input = event.target.closest("[data-field-id]");
    if (input) updateStat(input);
  });
  ui.file.addEventListener("change", () => loadRom(ui.file.files && ui.file.files[0]));
  ui.undo.addEventListener("click", () => {
    if (!state.model) return;
    try {
      state.model.undo();
      state.entityIndex = null;
      state.moveMode = false;
      updateChrome();
      renderMap();
      renderStats();
      showNotice("Undid the latest edit.", "success");
    } catch (error) {
      showNotice(error.message || "Could not undo that edit.", "error");
    }
  });
  ui.download.addEventListener("click", downloadRom);
  document.addEventListener("keydown", (event) => {
    if (event.key === "/" && !event.ctrlKey && !event.metaKey && !event.altKey) {
      const target = event.target;
      if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement) return;
      event.preventDefault();
      const statsVisible = !byId("stats-panel").hidden;
      (statsVisible ? ui.statsSearch : ui.roomSearch).focus();
    }
    if (event.key === "Escape" && state.moveMode) {
      state.moveMode = false;
      renderMapWorkspace();
    }
  });

  renderMap();
  renderStats();
  updateChrome();
})();
