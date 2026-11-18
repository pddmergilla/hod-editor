(() => {
  'use strict';
  const byId = id => document.getElementById(id);
  const escape = value => String(value).replace(/[&<>"']/g, char => ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'}[char]));
  let model = null, selected = 10;
  const drafts = new Map();
  const search = byId('dialogue-search'), category = byId('dialogue-category');
  const list = byId('dialogue-list'), detail = byId('dialogue-detail');
  function error(message) {byId('dialogue-message').textContent = message;}
  function rows() {return model ? model.getDialogues() : [];}
  function listEntries() {
    const query = search.value.toLowerCase();
    const entries = rows().filter(row => (!category.value || row.category === category.value) &&
      (row.text.toLowerCase().includes(query) || String(row.id).includes(query)));
    byId('dialogue-count').textContent = model ? entries.length + ' entries' : 'Load a ROM first';
    list.innerHTML = entries.map(row => '<button type="button" class="dialogue-entry' + (row.id === selected ? ' is-selected' : '') +
      '" data-dialogue-id="' + row.id + '" aria-pressed="' + (row.id === selected) + '"><strong>' +
      escape(row.category + ' · ' + row.id) + (row.changed || drafts.has(row.id) ? ' •' : '') + '</strong><span>' +
      escape(row.text.slice(0, 120) || '(Empty entry)') + '</span></button>').join('') || '<p>No matching entries.</p>';
  }
  function drawDetail() {
    if (!model) {detail.innerHTML = '<p>Load a ROM to browse and edit its dialogue.</p>'; return;}
    const entry = model.getDialogue(selected), names = rows().slice(0, 10);
    const draft = drafts.get(selected);
    const story = entry.category === 'Story dialogue';
    detail.innerHTML = '<h2>' + escape(entry.category) + ' · ' + selected + '</h2>' +
      '<p>Rewrite the text freely. Longer text is saved in extra ROM space. Keep lines short enough for the game’s text box.</p>' +
      (story ? '<p>Scene actions stay protected. Choose a speaker and portrait for each character block. Use “Next page” to continue with the same speaker. The preview below is a reading guide; Dev checks the final layout in-game.</p>' : '<p>Menu and name boxes keep their original size in-game. Longer wording may run outside them.</p>') +
      entry.parts.map((part, index) => {
        if (!part.text) return '';
        const speaker = part.speaker === null ? 'Text' : names[part.speaker]?.text || 'Unknown speaker';
        const value = draft ? draft[index] : part;
        const canChange = story && selected !== 10 && part.speaker !== null && part.portrait !== null;
        const portraits = ['Juste', 'Maxim', 'Possessed Maxim', 'Death', 'Lydie', 'Dracula Wraith'];
        const choices = canChange ? '<div class="dialogue-tools"><label for="dialogue-speaker-' + index + '">Speaker<select id="dialogue-speaker-' + index + '" data-dialogue-speaker="' + index + '">' +
          names.map(row => '<option value="' + row.id + '"' + (value.speaker === row.id ? ' selected' : '') + '>' + escape(row.text || '(Empty name ' + row.id + ')') + '</option>').join('') +
          '</select></label><label for="dialogue-portrait-' + index + '">Portrait<select id="dialogue-portrait-' + index + '" data-dialogue-portrait="' + index + '">' +
          portraits.map((name, id) => '<option value="' + (id + 1) + '"' + (value.portrait === id + 1 ? ' selected' : '') + '>' + escape(name) + '</option>').join('') + '</select></label></div>' : '';
        return '<section class="dialogue-block"><label for="dialogue-text-' + index + '">' + escape(speaker) + ' · Block ' + (index + 1) +
          '</label>' + choices + '<textarea id="dialogue-text-' + index + '" data-dialogue-part="' + index + '" rows="5" spellcheck="true">' + escape(value.text) +
          '</textarea><div class="dialogue-tools">' + (story ? '<button type="button" class="button button-quiet" data-dialogue-page="' + index + '">Next page</button>' : '') +
          '<label>Insert name <select data-dialogue-name="' + index + '"><option value="">Choose…</option>' + names.filter(row => row.text).map(row =>
          '<option value="' + row.id + '">' + escape(row.text) + '</option>').join('') + '</select></label></div><small data-dialogue-length="' + index + '"></small>' +
          '<pre class="dialogue-preview" data-dialogue-preview="' + index + '"></pre></section>';
      }).join('') + '<button type="button" class="button button-outline" id="dialogue-apply">Apply text edits</button>' +
      '<p id="dialogue-message" role="status" aria-live="polite">' + (draft ? 'Draft changes — apply or download to save them.' : 'Edits are saved to your downloaded copy.') + '</p>';
    detail.querySelectorAll('textarea').forEach(updatePreview);
    byId('dialogue-apply').disabled = !draft;
  }
  function updatePreview(area) {
    const index = area.dataset.dialoguePart;
    const names = Array.from({length: 10}, (_, id) => ({id, text: model.getDialogue(id).parts.map(part => part.text).join('')}));
    const text = area.value.replace(/\{NAME (\d)\}/g, (_, id) => names[Number(id)]?.text || '???').replace(/\{PAGE\}/g, '\n\n── Next page ──\n\n');
    detail.querySelector('[data-dialogue-preview="' + index + '"]').textContent = text;
    const pages = area.value.split('{PAGE}');
    const crowded = pages.some(page => page.split('\n').length > 3 || page.split('\n').some(line => line.replace(/\{NAME \d\}/g, 'Belmont').length > 28));
    detail.querySelector('[data-dialogue-length="' + index + '"]').textContent = [...area.value].length + ' typed characters · ' + pages.length +
      (pages.length === 1 ? ' page' : ' pages') + (crowded ? ' · Check line width and height in-game.' : ' · Check the final layout in-game.');
  }
  function remember(area) {
    const parts = model.getDialogue(selected).parts;
    const values = drafts.get(selected) || parts.map(({text, speaker, portrait}) => ({text, speaker, portrait}));
    const index = Number(area.dataset.dialoguePart);
    values[index] = {text: area.value,
      speaker: byId('dialogue-speaker-' + index) ? Number(byId('dialogue-speaker-' + index).value) : parts[index].speaker,
      portrait: byId('dialogue-portrait-' + index) ? Number(byId('dialogue-portrait-' + index).value) : parts[index].portrait};
    if (values.every((value, index) => ['text', 'speaker', 'portrait'].every(key => value[key] === parts[index][key]))) drafts.delete(selected);
    else drafts.set(selected, values);
    byId('dialogue-apply').disabled = !drafts.has(selected);
    error(drafts.has(selected) ? 'Draft changes — apply or download to save them.' : 'Edits are saved to your downloaded copy.');
    updatePreview(area);
  }
  function insert(index, text) {
    const area = byId('dialogue-text-' + index);
    area.setRangeText(text, area.selectionStart, area.selectionEnd, 'end');
    remember(area); area.focus();
  }
  function apply(id) {
    if (!drafts.has(id)) return;
    model.updateDialogue(id, drafts.get(id)); drafts.delete(id);
    document.dispatchEvent(new Event('hod-dialogue-change'));
  }
  search.addEventListener('input', listEntries);
  category.addEventListener('change', listEntries);
  list.addEventListener('click', event => {
    const button = event.target.closest('[data-dialogue-id]');
    if (!button) return;
    selected = Number(button.dataset.dialogueId); listEntries(); drawDetail();
  });
  detail.addEventListener('input', event => {if (event.target.matches('textarea')) remember(event.target);});
  detail.addEventListener('change', event => {
    if (event.target.matches('[data-dialogue-speaker], [data-dialogue-portrait]')) {
      const index = event.target.dataset.dialogueSpeaker ?? event.target.dataset.dialoguePortrait;
      remember(byId('dialogue-text-' + index));
    }
    if (event.target.matches('[data-dialogue-name]') && event.target.value !== '') {
      insert(event.target.dataset.dialogueName, '{NAME ' + event.target.value + '}'); event.target.value = '';
    }
  });
  detail.addEventListener('click', event => {
    const page = event.target.closest('[data-dialogue-page]');
    if (page) insert(page.dataset.dialoguePage, '{PAGE}');
    if (event.target.id === 'dialogue-apply') {
      try {apply(selected); listEntries(); drawDetail(); error('Text edits applied. Download ROM to save a copy.');}
      catch (failure) {error(failure.message);}
    }
  });
  byId('dialogue-export').addEventListener('click', () => {
    if (!model) return;
    try {
      window.HodDialogueUI.applyAll();
      const text = rows().map(row => '## ' + row.category + ' · ' + row.id + '\n\n' + model.getDialogue(row.id).parts.map(part => part.text).join('\n\n')).join('\n\n');
      const url = URL.createObjectURL(new Blob([text], {type: 'text/plain;charset=utf-8'}));
      const link = document.createElement('a'); link.href = url; link.download = 'Harmony-of-Dissonance-dialogue.txt'; link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (failure) {error(failure.message);}
  });
  window.HodDialogueUI = {
    render(nextModel, reset = false) {
      if (model !== nextModel || reset) drafts.clear();
      model = nextModel;
      search.disabled = category.disabled = byId('dialogue-export').disabled = !model;
      listEntries(); drawDetail();
    },
    applyAll() {
      for (const [id, values] of drafts) model.validateDialogue(id, values);
      for (const id of [...drafts.keys()]) apply(id);
      listEntries(); drawDetail();
    },
  };
})();
