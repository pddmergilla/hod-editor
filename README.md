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

- Foreground/background tile painting with real ROM artwork, a tile palette, flips, layer visibility, and a grid. Choose a **16 × 16** or **32 × 32** brush. In 16 × 16 mode, click a quarter of a palette tile or copy a rectangle from the room; the grid and preview follow the selected size. Smaller painting preserves collision and the untouched parts of each block.
- Copy a tile or rectangle with **Copy Tile / Area** or Ctrl+C, then click or drag to stamp it. Ctrl+V resumes the copied brush; Esc cancels copying. Copied brushes work across rooms with the same tile and collision definitions. Private 32 × 32 definitions stay in their own room. Changing the palette tile or paint layer returns to a single tile.
- Small brushes rebuild room-specific tile combinations within the original tileset capacity. If a layer has no spare combinations, the stroke is rejected without changing anything; use 32 × 32 painting or Undo to free combinations. Some 256-color backgrounds cannot flip individual pieces unless matching flipped artwork already exists.
- Collision mode samples a tile's first collision cell or sets all sixteen 8 × 8 collision cells to a value from 0–255. Tile definitions are shared: every use of that definition changes together. Existing mixed collision shapes are preserved until painted. Empty tiles cannot have collision edited.
- Ctrl+Z / Cmd+Z undoes one brush stroke. Right-drag pans; zoom and the up/down controls work in every mode. Text fields keep their usual shortcuts.
- Entities mode keeps room enemy and pickup placement, enemy banks, and entity copy/paste.
- Actual ROM sprites at room scale for enemies, pickups, breakables, and supported objects. Sprites move and zoom with their placement markers. Helpers and unsupported artwork keep their markers; hover or select a sprite to see its label.
- Room enemy banks with graphics and palette capacity checks.
- Seven named enemy spawner choices, including Medusa Head Spawner. A new spawn area adds its timers and companion marker automatically, using four entity slots. Existing timers are reused.
- Player progression, enemy and boss stats, spell costs, and supported spell power fields.
- Undo and exports that can be reopened for further editing.

## Files

- `index.html`: editor page.
- `styles.css`: appearance.
- `profile.js`: supported ROM layouts and resource definitions.
- `core.js`: ROM parsing, editing, and export.
- `app.js`: editor controls.

There is no build step or package installation. Unsupported ROMs are rejected by compatibility checks.

Each room shares one spawner type. Moving an endpoint moves its timer too; deleting a spawner removes the room's spawner group. Undo restores the whole action.

ROMs, patches, saves, and extracted game assets are not included. Gameplay changes should be checked in-game after export.

## Reference

ROM format research uses [DSVEdit](https://github.com/LagoLunatic/DSVEdit). Castlevania and Harmony of Dissonance belong to their respective rights holders.
