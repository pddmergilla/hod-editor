# Harmony of Dissonance Editor

A local browser editor for Castlevania: Harmony of Dissonance, built for the supported modded ROM layout.

## Use

1. Download or clone this repository.
2. Open `index.html` in a modern browser.
3. Choose **Load .gba** and select your compatible ROM or an earlier editor export.
4. Edit rooms, enemy banks, pickups, or stats. Use **Undo** to reverse an edit.
5. Choose **Download ROM** to save a separate edited copy.

Your ROM stays on your computer. The editor does not upload it.

## Features

- Room artwork, enemy and pickup placement, and entity copy/paste.
- Room enemy banks with graphics and palette capacity checks.
- Seven named enemy spawner choices, including Medusa Head Spawner. These require rooms with existing spawn timers.
- Player progression, enemy and boss stats, spell costs, and supported spell power fields.
- Undo and exports that can be reopened for further editing.

## Files

- `index.html`: editor page.
- `styles.css`: appearance.
- `profile.js`: supported ROM layouts and resource definitions.
- `core.js`: ROM parsing, editing, and export.
- `app.js`: editor controls.

There is no build step or package installation. Unsupported ROMs are rejected by compatibility checks.

ROMs, patches, saves, and extracted game assets are not included. Gameplay changes should be checked in-game after export.

## Reference

ROM format research uses [DSVEdit](https://github.com/LagoLunatic/DSVEdit). Castlevania and Harmony of Dissonance belong to their respective rights holders.
