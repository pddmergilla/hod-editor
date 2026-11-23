'use strict';
// "Castle's Kitchen" tab: download the release PPF, or build the ROM here from a clean US ROM.
(() => {
  const release = window.HodKitchenRelease;
  const core = window.HodKitchenCore;
  const panel = document.getElementById('kitchen-panel');
  if (!panel || !release || !core) return;

  const esc = s => String(s).replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
  const size = n => (n / 1048576).toFixed(2) + ' MB';
  const short = h => h.slice(0, 8) + '…' + h.slice(-8);
  const state = {ppf: null, built: null};

  const features = [
    ['Visual Improvement recolor', 'Visual Improvement v1.2.9 [Chain]: new palettes for Juste, enemies and areas, brighter torches and effects, the Chain Whip and new walk and jump animations.'],
    ['Better Fast Travel', 'The Lure Key and Hint Card 3 come earlier, so teleporters open sooner.'],
    ['Air movement', 'Reworked air physics and mid-air whip landings, with quicker air-whip hits.'],
    ['Slide kick', "Juste can't be hit while sliding, and slide and brandish attacks are rebalanced."],
    ['Spells', 'You can only cast spells when MP is full. Without full MP, you automatically switch to Subweapon mode and are encouraged to use subweapons instead.'],
    ['HUD', 'Shows your HP number and the equipped item’s icon. Save points refill hearts.'],
    ['Whip upgrades', 'Equippable whip upgrades now actually have whip effects.'],
    ['Auto-cure', 'Antidote and Uncurse are used automatically after a moment.'],
    ['Enemies', 'Some enemies have been reworked with new moves and behaviors.'],
    ['Bosses', 'Bosses have been revamped to be deadlier.'],
    ['Items', 'Equip an item and use it anywhere in the game, instantly.'],
    ['Map', "Dots mark item pickups you haven't collected, so you won't forget where you left things. Shop rooms have an orange marker."],
    ['New Game+', 'After the best ending, name a new file NGPLUS to start with every whip part, spellbook and relic.'],
  ];

  panel.innerHTML = `
    <div class="stats-heading"><div><span class="eyebrow">ROM HACK · ${esc(release.version)}</span><h1>${esc(release.title)}</h1>
      <p>A Harmony of Dissonance mod with the Visual Improvement recolor built in. Apply it to a clean <strong>US</strong> ROM.</p></div></div>
    <div class="kitchen-grid">
      <section class="kitchen-card">
        <h2>Download the PPF</h2>
        <p>A PPF3 patch from the clean US ROM to ${esc(release.title)} ${esc(release.version)}, recolor included. Apply it with any PPF3 patcher, or build it below.</p>
        <a class="button button-primary" id="kitchen-download-ppf" href="${esc(release.ppf.file)}" download="${esc(release.ppf.name)}"><span aria-hidden="true">↓</span><span>Download ${esc(release.ppf.name)}</span></a>
        <dl class="kitchen-facts">
          <dt>Patch</dt><dd>${size(release.ppf.size)} · SHA-256 <code title="${release.ppf.sha256}">${short(release.ppf.sha256)}</code></dd>
          <dt>Input</dt><dd>${esc(release.vanilla.name)} · ${size(release.vanilla.size)} · CRC32 <code>${release.vanilla.crc32}</code> · SHA-256 <code title="${release.vanilla.sha256}">${short(release.vanilla.sha256)}</code></dd>
          <dt>Output</dt><dd>${size(release.result.size)} · CRC32 <code>${release.result.crc32}</code> · SHA-256 <code title="${release.result.sha256}">${short(release.result.sha256)}</code></dd>
        </dl>
      </section>
      <section class="kitchen-card">
        <h2>Build it here</h2>
        <p>Choose your clean US ROM. It is checked and patched on this device; nothing is uploaded.</p>
        <label class="button button-outline" for="kitchen-rom"><span aria-hidden="true">＋</span><span>Choose US .gba</span>
          <input id="kitchen-rom" type="file" accept=".gba,application/octet-stream" hidden></label>
        <label class="button button-quiet" for="kitchen-ppf" id="kitchen-ppf-label" hidden><span aria-hidden="true">＋</span><span>Choose the PPF</span>
          <input id="kitchen-ppf" type="file" accept=".ppf,application/octet-stream" hidden></label>
        <p class="kitchen-status" id="kitchen-status" role="status" aria-live="polite"></p>
        <div class="kitchen-actions" id="kitchen-actions" hidden>
          <button class="button button-primary" id="kitchen-save" type="button"><span aria-hidden="true">↓</span><span>Download ROM</span></button>
          <button class="button button-outline" id="kitchen-edit" type="button">Open in editor</button>
        </div>
      </section>
    </div>
    <section class="kitchen-card kitchen-features"><h2>What's in it</h2><ul>${features.map(([name, text]) => `<li><strong>${esc(name)}</strong><span>${esc(text)}</span></li>`).join('')}</ul>
      <p class="muted-note">Earlier editor exports and the clean US ROM also open in the Map, Stats and Dialogue editors.</p></section>`;

  const ui = {
    rom: panel.querySelector('#kitchen-rom'), ppf: panel.querySelector('#kitchen-ppf'),
    ppfLabel: panel.querySelector('#kitchen-ppf-label'), status: panel.querySelector('#kitchen-status'),
    actions: panel.querySelector('#kitchen-actions'), save: panel.querySelector('#kitchen-save'), edit: panel.querySelector('#kitchen-edit'),
  };
  const say = (text, kind = '') => { ui.status.textContent = text; ui.status.dataset.kind = kind; };

  async function checkedPpf(bytes) {
    if (bytes.length !== release.ppf.size || await core.sha256(bytes) !== release.ppf.sha256)
      throw new Error(`That PPF is not ${release.ppf.name}.`);
    return core.parsePpf(bytes);
  }

  async function loadPpf() {
    if (state.ppf) return state.ppf;
    try {
      const response = await fetch(release.ppf.file, {cache: 'no-cache'});
      if (!response.ok) throw new Error();
      state.ppf = await checkedPpf(new Uint8Array(await response.arrayBuffer()));
      return state.ppf;
    } catch (error) {
      if (error.message?.startsWith('That PPF')) throw error;
      ui.ppfLabel.hidden = false;
      throw new Error(`This page can't read the bundled patch from here. Choose the downloaded ${release.ppf.name} too.`);
    }
  }

  async function build(file) {
    state.built = null;
    ui.actions.hidden = true;
    say('Checking your ROM…');
    const input = new Uint8Array(await file.arrayBuffer());
    const hash = await core.sha256(input);
    if (input.length === release.result.size && hash === release.result.sha256)
      throw new Error(`This ROM is already ${release.title} ${release.version}.`);
    if (input.length !== release.vanilla.size || hash !== release.vanilla.sha256)
      throw new Error(`This is not the clean US ROM (needs CRC32 ${release.vanilla.crc32}). Other regions, hacks and bad dumps can't be patched.`);
    const ppf = await loadPpf();
    say('Patching…');
    const output = core.apply(input, ppf);
    if (output.length !== release.result.size || await core.sha256(output) !== release.result.sha256)
      throw new Error('The patched ROM failed its check; nothing was saved.');
    state.built = output;
    ui.actions.hidden = false;
    say(`Built and verified: ${release.title} ${release.version} (CRC32 ${release.result.crc32}).`, 'success');
  }

  let pendingRom = null;
  async function run(file) {
    try {
      await build(file);
      pendingRom = null;
    } catch (error) {
      pendingRom = state.ppf ? null : file;
      say(error.message || 'Could not build the ROM.', 'error');
    }
  }

  ui.rom.addEventListener('change', () => { const file = ui.rom.files[0]; ui.rom.value = ''; if (file) run(file); });
  ui.ppf.addEventListener('change', async () => {
    const file = ui.ppf.files[0]; ui.ppf.value = '';
    if (!file) return;
    try {
      state.ppf = await checkedPpf(new Uint8Array(await file.arrayBuffer()));
      ui.ppfLabel.hidden = true;
      if (pendingRom) run(pendingRom); else say('Patch ready. Choose your clean US ROM.');
    } catch (error) { say(error.message, 'error'); }
  });
  ui.save.addEventListener('click', () => {
    if (!state.built) return;
    const url = URL.createObjectURL(new Blob([state.built], {type: 'application/octet-stream'}));
    const link = document.createElement('a');
    link.href = url; link.download = release.result.name;
    document.body.appendChild(link); link.click(); link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1200);
  });
  ui.edit.addEventListener('click', () => {
    if (state.built && window.HodApp) window.HodApp.openRom(new File([state.built], release.result.name), 'map-panel');
  });
})();
