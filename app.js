// ═══════════════════════════════════════════════════════════════
// Stardew Valley Mushroom Farm Designer — Core Application
// ═══════════════════════════════════════════════════════════════

// ── Game Data ────────────────────────────────────────────────

const MUSHROOM_DATA = {
  common: { name: 'Common Mushroom', base: 40, color: 'common', emoji: 'assets/Common_Mushroom.png' },
  red: { name: 'Red Mushroom', base: 75, color: 'red', emoji: 'assets/Red_Mushroom.png' },
  morel: { name: 'Morel', base: 150, color: 'morel', emoji: 'assets/Morel.png' },
  chanterelle: { name: 'Chanterelle', base: 160, color: 'chanterelle', emoji: 'assets/Chanterelle.png' },
  purple: { name: 'Purple Mushroom', base: 250, color: 'purple', emoji: 'assets/Purple_Mushroom.png' },
};

// Quality multipliers: base=1x, silver=1.25x, gold=1.5x, iridium=2x
const QUALITY_MULTIPLIERS = [1, 1.25, 1.5, 2];
const QUALITY_NAMES = ['Base', 'Silver', 'Gold', 'Iridium'];
const QUALITY_CLASSES = ['base', 'silver', 'gold', 'iridium'];

// Preserves Jar: 2 * base + 50
// Dehydrator: base * 7.5 (for 5 mushrooms input → 1 dried output, value = base * 7.5)
// Wiki values:
// Common: raw 40, pickles 130, dried 325
// Morel: raw 150, pickles 350, dried 1150
// Chanterelle: raw 160, pickles 370, dried 1225
// Purple: raw 250, pickles 550, dried 1900
// Red: raw 75, pickles not listed with dehydrator
// Preserves = 2*base + 50
// Dried = base * 7.5 + 25 ... let me recalc
// Common dried: 325. 40*7.5=300+25=325 ✓
// Morel dried: 1150. 150*7.5=1125+25=1150 ✓
// Chanterelle dried: 1225. 160*7.5=1200+25=1225 ✓
// Purple dried: 1900. 250*7.5=1875+25=1900 ✓
// Dried requires 5 mushrooms as input. So per-mushroom value = (base*7.5+25)/5

function getProcessingDecision(mushroomKey, quality, processing, artisanProfession) {
  const base = MUSHROOM_DATA[mushroomKey].base;
  const qualMult = QUALITY_MULTIPLIERS[quality];
  const rawPrice = Math.floor(base * qualMult);

  if (processing === 'raw' || mushroomKey === 'red') {
    return { price: rawPrice, actualProc: 'raw' };
  }

  let processedPrice = 0;
  if (processing === 'preserves') {
    processedPrice = 2 * base + 50;
  } else if (processing === 'dehydrator') {
    processedPrice = (base * 7.5 + 25) / 5;
  }

  if (artisanProfession) {
    processedPrice = Math.floor(processedPrice * 1.4);
  }

  if (rawPrice > processedPrice) {
    return { price: rawPrice, actualProc: 'raw' };
  } else {
    return { price: processedPrice, actualProc: processing };
  }
}

function getProcessedPrice(mushroomKey, quality, processing) {
  return getProcessingDecision(mushroomKey, quality, processing).price;
}

// Tree types and their mushroom contributions
const TREE_TYPES = {
  oak: { name: 'Oak Tree', emoji: 'assets/Acorn.png', mushroomType: 'morel', mushroomChance: 1.0, tapper: { name: 'Oak Resin', price: 150, normalDays: 7, heavyDays: 3, winter: true } },
  maple: { name: 'Maple Tree', emoji: 'assets/Maple_Seed.png', mushroomType: 'red', mushroomChance: 0.9, altType: 'purple', altChance: 0.1, tapper: { name: 'Maple Syrup', price: 200, normalDays: 9, heavyDays: 4, winter: true } },
  pine: { name: 'Pine Tree', emoji: 'assets/Pine_Cone.png', mushroomType: 'chanterelle', mushroomChance: 1.0, tapper: { name: 'Pine Tar', price: 100, normalDays: 5, heavyDays: 2, winter: true } },
  tree_mystic: { name: 'Mystic Tree', emoji: 'assets/Mystic_Tree_Seed.png', mushroomType: 'purple', mushroomChance: 1.0, noMoss: true, tapper: { name: 'Mystic Syrup', price: 1000, normalDays: 7, heavyDays: 3, winter: true } },
  tree_mahogany: { name: 'Mahogany Tree', emoji: 'assets/Mahogany_Seed.png', mushroomType: null, tapper: { name: 'Sap', price: 2, normalDays: 1, heavyDays: 1, winter: true } },
  tree_mushroom: { name: 'Mushroom Tree', emoji: 'assets/Mushroom_Tree.png', mushroomType: null, noMoss: true, tapper: { name: 'Mushrooms (Mixed)', price: 65, normalDays: 2.15, heavyDays: 2.15, winter: false } },
  tree_green_rain: { name: 'Green Rain Tree (Type 3)', emoji: 'assets/Green_Rain_Tree_3.png', mushroomType: null, noMoss: true, tapper: { name: 'Fiddlehead Fern', price: 90, normalDays: 1, heavyDays: 1, winter: false } },
};

const CELL_EMPTY = 0;
const CELL_TREE = 1;
const CELL_MUSHLOG = 2;

// ── App State ────────────────────────────────────────────────

const state = {
  gridWidth: 15,
  gridHeight: 15,
  grid: [],            // 2D array of { type, treeType, hasMoss, tapper }
  selectedTool: null,
  tileableMode: false,
  infiniteCalc: false,
  tileWidth: 7,
  tileHeight: 7,
  farmLocation: 'main',
  useRainTotems: false,
  artisanProfession: false,
  tapperProfession: false,
  syncTappers: false,
  processing: {
    common: 'raw',
    red: 'raw',
    morel: 'raw',
    chanterelle: 'raw',
    purple: 'raw',
  },
  hoveredLog: null,  // {row, col} of log being hovered
  lastResults: null,
};

// ── DOM References ───────────────────────────────────────────

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

const farmGridEl = $('#farm-grid');
const resultsContent = $('#results-content');
const gridWidthInput = $('#grid-width');
const gridHeightInput = $('#grid-height');
const tileWidthInput = $('#tile-width');
const tileHeightInput = $('#tile-height');
const tileableToggle = $('#tileable-mode');
const infiniteCalcToggle = $('#infinite-calc');
const tileSizeSettings = $('#tile-size-settings');
const farmLocationSelect = $('#farm-location');
const rainTotemToggle = $('#rain-totem-mode');
const artisanToggle = $('#artisan-profession');
const tapperToggle = $('#tapper-profession');
const syncTappersToggle = $('#sync-tappers');
const rainFrequencyDisplay = $('#rain-frequency-display');
const clearBtn = $('#clear-grid');

const showMathBtn = $('#show-math-btn');
const mathModal = $('#math-modal');
const closeModalBtn = $('#close-modal-btn');
const modalBody = $('#modal-body');


// ── Local Storage ────────────────────────────────────────────

const STORAGE_KEY = 'stardewMushroomFarmState';
const PRESETS_STORAGE_KEY = 'stardewMushroomFarmPresets';

function loadPresets() {
  try {
    const raw = localStorage.getItem(PRESETS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (e) {
    return {};
  }
}

function savePresets(presets) {
  localStorage.setItem(PRESETS_STORAGE_KEY, JSON.stringify(presets));
  updatePresetDropdown(presets);
}

function updatePresetDropdown(presets) {
  const select = $('#preset-select');
  if (!select) return;
  const currentVal = select.value;
  select.innerHTML = '<option value="">-- Select --</option>';
  for (const name of Object.keys(presets)) {
    const opt = document.createElement('option');
    opt.value = name;
    opt.textContent = name;
    select.appendChild(opt);
  }
  if (presets[currentVal]) {
    select.value = currentVal;
  }
}

function saveState() {
  const data = {
    gridWidth: state.gridWidth,
    gridHeight: state.gridHeight,
    grid: state.grid,
    tileableMode: state.tileableMode,
    infiniteCalc: state.infiniteCalc,
    tileWidth: state.tileWidth,
    tileHeight: state.tileHeight,
    farmLocation: state.farmLocation,
    useRainTotems: state.useRainTotems,
    artisanProfession: state.artisanProfession,
    tapperProfession: state.tapperProfession,
    syncTappers: state.syncTappers,
    processing: state.processing,
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  updateCalculation();
}

function updateCalculation() {
  const results = calculateFarm(state);
  renderResults(results);
}

function loadState(dataObj) {
  try {
    let data = dataObj;
    if (!data) {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) data = JSON.parse(raw);
    }
    if (data) {
      if (data.gridWidth) state.gridWidth = data.gridWidth;
      if (data.gridHeight) state.gridHeight = data.gridHeight;
      if (data.grid) {
        state.grid = data.grid;
        for (let r = 0; r < state.grid.length; r++) {
          for (let c = 0; c < state.grid[r].length; c++) {
            if (state.grid[r][c] && state.grid[r][c].treeType === 'mystic') {
              state.grid[r][c].treeType = 'tree_mystic';
            }
          }
        }
      }
      if (data.tileableMode !== undefined) state.tileableMode = data.tileableMode;
      if (data.infiniteCalc !== undefined) state.infiniteCalc = data.infiniteCalc;
      if (data.tileWidth) state.tileWidth = data.tileWidth;
      if (data.tileHeight) state.tileHeight = data.tileHeight;
      if (data.farmLocation) state.farmLocation = data.farmLocation;
      if (data.useRainTotems !== undefined) state.useRainTotems = data.useRainTotems;
      if (data.artisanProfession !== undefined) state.artisanProfession = data.artisanProfession;
      if (data.tapperProfession !== undefined) state.tapperProfession = data.tapperProfession;
      if (data.syncTappers !== undefined) state.syncTappers = data.syncTappers;
      if (data.processing) state.processing = { ...state.processing, ...data.processing };

      // Update DOM to match loaded state
      gridWidthInput.value = state.gridWidth;
      gridHeightInput.value = state.gridHeight;
      tileableToggle.checked = state.tileableMode;
      infiniteCalcToggle.checked = state.infiniteCalc;
      tileSizeSettings.style.display = state.tileableMode ? 'block' : 'none';
      tileWidthInput.value = state.tileWidth;
      tileHeightInput.value = state.tileHeight;
      farmLocationSelect.value = state.farmLocation;

      const rainTotemToggle = $('#rain-totem-mode');
      if (rainTotemToggle) {
        rainTotemToggle.checked = state.useRainTotems;
        rainTotemToggle.disabled = (state.farmLocation === 'desert');
        const row = rainTotemToggle.closest('.toggle-row');
        if (row) {
          row.style.opacity = state.farmLocation === 'desert' ? '0.5' : '1';
          row.style.pointerEvents = state.farmLocation === 'desert' ? 'none' : 'auto';
        }
      }

      $('#artisan-profession').checked = state.artisanProfession;

      const rf = $('#rain-frequency-display');
      if (rf) {
        let rainPct = state.farmLocation === 'ginger' ? 24 : state.farmLocation === 'desert' ? 0 : 13.56;
        if (state.useRainTotems && state.farmLocation !== 'desert') rainPct = 89;
        rf.textContent = `~${rainPct}% chance of rain per day`;
      }

      $$('.processing-select').forEach(sel => {
        if (!sel.disabled && state.processing[sel.dataset.mushroom]) {
          sel.value = state.processing[sel.dataset.mushroom];
        }
      });
      return true;
    }
  } catch (e) {
    console.error('Error loading state:', e);
  }
  return false;
}

// ── Grid Initialization ─────────────────────────────────────

function createEmptyGrid(w, h) {
  const grid = [];
  for (let r = 0; r < h; r++) {
    const row = [];
    for (let c = 0; c < w; c++) {
      row.push({ type: CELL_EMPTY, treeType: null, hasMoss: false });
    }
    grid.push(row);
  }
  return grid;
}

function initGrid() {
  state.gridWidth = parseInt(gridWidthInput.value) || 15;
  state.gridHeight = parseInt(gridHeightInput.value) || 15;
  state.grid = createEmptyGrid(state.gridWidth, state.gridHeight);
  renderGrid();
}

function resizeGrid() {
  const newW = parseInt(gridWidthInput.value) || 15;
  const newH = parseInt(gridHeightInput.value) || 15;
  const oldGrid = state.grid;
  const newGrid = createEmptyGrid(newW, newH);

  // Preserve existing cells
  for (let r = 0; r < Math.min(newH, oldGrid.length); r++) {
    for (let c = 0; c < Math.min(newW, oldGrid[0].length); c++) {
      newGrid[r][c] = { ...oldGrid[r][c] };
    }
  }

  // Populate new cells if tileable mode is on
  if (state.tileableMode) {
    const tw = parseInt(tileWidthInput.value) || 7;
    const th = parseInt(tileHeightInput.value) || 7;
    for (let r = 0; r < newH; r++) {
      for (let c = 0; c < newW; c++) {
        if (r >= oldGrid.length || c >= oldGrid[0].length) {
          const localR = r % th;
          const localC = c % tw;
          newGrid[r][c] = { ...newGrid[localR][localC] };
        }
      }
    }
  }

  state.gridWidth = newW;
  state.gridHeight = newH;
  state.grid = newGrid;
  renderGrid();
  saveState();
}

// ── Grid Rendering ───────────────────────────────────────────

function renderGrid() {
  farmGridEl.style.gridTemplateColumns = `repeat(${state.gridWidth}, var(--cell-size))`;
  farmGridEl.style.gridTemplateRows = `repeat(${state.gridHeight}, var(--cell-size))`;
  farmGridEl.innerHTML = '';

  for (let r = 0; r < state.gridHeight; r++) {
    for (let c = 0; c < state.gridWidth; c++) {
      const cell = document.createElement('div');
      cell.className = 'grid-cell';
      cell.dataset.row = r;
      cell.dataset.col = c;

      // Tileable borders
      if (state.tileableMode) {
        const tw = parseInt(tileWidthInput.value) || 7;
        const th = parseInt(tileHeightInput.value) || 7;
        if ((c + 1) % tw === 0 && c < state.gridWidth - 1) cell.classList.add('tile-border-right');
        if ((r + 1) % th === 0 && r < state.gridHeight - 1) cell.classList.add('tile-border-bottom');
      }

      renderCellContent(cell, state.grid[r][c]);

      cell.addEventListener('mousedown', () => handleCellClick(r, c));
      cell.addEventListener('mouseenter', (e) => {
        if (e.buttons === 1) handleCellClick(r, c);
        handleCellHover(r, c);
      });
      cell.addEventListener('mouseleave', () => handleCellLeave(r, c));

      farmGridEl.appendChild(cell);
    }
  }
}

function renderCellContent(cellEl, cellData) {
  if (cellData.type === CELL_EMPTY) return;

  const content = document.createElement('div');
  content.className = 'cell-content';

  if (cellData.type === CELL_TREE) {
    const treeInfo = TREE_TYPES[cellData.treeType];
    content.classList.add(cellData.treeType);
    if (cellData.hasMoss) content.classList.add('mossy');
    const img = document.createElement('img');
    img.src = treeInfo.emoji;
    img.className = 'cell-img';
    content.appendChild(img);

    if (cellData.tapper) {
      const tapImg = document.createElement('img');
      tapImg.src = cellData.tapper === 'heavy' ? 'assets/Heavy_Tapper.png' : 'assets/Tapper.png';
      tapImg.className = 'cell-tapper';
      content.appendChild(tapImg);
    }

    cellEl.classList.add('has-tree');
  } else if (cellData.type === CELL_MUSHLOG) {
    content.classList.add('mushlog');
    const img = document.createElement('img');
    img.src = 'assets/Mushroom_Log.png';
    img.className = 'cell-img';
    content.appendChild(img);
    cellEl.classList.add('has-mushlog');
  }

  cellEl.appendChild(content);
}

function updateSingleCell(r, c) {
  const idx = r * state.gridWidth + c;
  const cellEl = farmGridEl.children[idx];
  if (!cellEl) return;

  // Remove old content classes
  cellEl.className = 'grid-cell';
  cellEl.dataset.row = r;
  cellEl.dataset.col = c;

  // Re-add tileable borders
  if (state.tileableMode) {
    const tw = parseInt(tileWidthInput.value) || 7;
    const th = parseInt(tileHeightInput.value) || 7;
    if ((c + 1) % tw === 0 && c < state.gridWidth - 1) cellEl.classList.add('tile-border-right');
    if ((r + 1) % th === 0 && r < state.gridHeight - 1) cellEl.classList.add('tile-border-bottom');
  }

  // Clear children
  cellEl.innerHTML = '';
  renderCellContent(cellEl, state.grid[r][c]);
}

// ── Grid Interaction ─────────────────────────────────────────

function handleCellClick(r, c) {
  const tool = state.selectedTool;
  if (!tool) return;

  const cell = state.grid[r][c];

  if (tool === 'eraser') {
    if (cell.type !== CELL_EMPTY) {
      state.grid[r][c] = { type: CELL_EMPTY, treeType: null, hasMoss: false };
      updateSingleCell(r, c);
      syncTileableGrid(r, c);
      saveState();
    }
    return;
  }

  if (tool === 'mushlog') {
    if (cell.type === CELL_MUSHLOG) return; // already placed
    state.grid[r][c] = { type: CELL_MUSHLOG, treeType: null, hasMoss: false };
    updateSingleCell(r, c);
    syncTileableGrid(r, c);
    saveState();
    return;
  }

  // Moss tool
  if (tool === 'moss') {
    if (cell.type === CELL_TREE && !TREE_TYPES[cell.treeType].noMoss) {
      state.grid[r][c].hasMoss = !state.grid[r][c].hasMoss;
      updateSingleCell(r, c);
      syncTileableGrid(r, c);
      saveState();
    }
    return;
  }

  // Tapper tools
  if (tool === 'tapper' || tool === 'heavy_tapper') {
    if (cell.type === CELL_TREE) {
      const treeInfo = TREE_TYPES[cell.treeType];
      if (!treeInfo.tapper) return; // Cannot be tapped

      const tType = tool === 'tapper' ? 'normal' : 'heavy';
      if (cell.tapper === tType) {
        state.grid[r][c].tapper = null;
      } else {
        state.grid[r][c].tapper = tType;
      }
      updateSingleCell(r, c);
      syncTileableGrid(r, c);
      saveState();
    }
    return;
  }

  // Tree placement
  if (TREE_TYPES[tool]) {
    if (cell.type === CELL_TREE && cell.treeType === tool) {
      // Just re-clicking the same tree tool doesn't do anything special anymore
      return;
    } else {
      state.grid[r][c] = { type: CELL_TREE, treeType: tool, hasMoss: false, tapper: null };
    }
    updateSingleCell(r, c);
    syncTileableGrid(r, c);
    saveState();
  }
}

function syncTileableGrid(r, c) {
  if (!state.tileableMode) return;
  const tw = parseInt(tileWidthInput.value) || 7;
  const th = parseInt(tileHeightInput.value) || 7;

  // Determine which tile-local position this is
  const localR = r % th;
  const localC = c % tw;
  const sourceCell = state.grid[r][c];

  // Copy to all other tiles
  for (let tr = localR; tr < state.gridHeight; tr += th) {
    for (let tc = localC; tc < state.gridWidth; tc += tw) {
      if (tr === r && tc === c) continue;
      state.grid[tr][tc] = { ...sourceCell };
      updateSingleCell(tr, tc);
    }
  }
}

function retileGrid() {
  if (!state.tileableMode) return;
  const tw = parseInt(tileWidthInput.value) || 7;
  const th = parseInt(tileHeightInput.value) || 7;

  for (let r = 0; r < state.gridHeight; r++) {
    for (let c = 0; c < state.gridWidth; c++) {
      const localR = r % th;
      const localC = c % tw;
      if (r !== localR || c !== localC) {
        state.grid[r][c] = { ...state.grid[localR][localC] };
      }
    }
  }
}

function handleCellHover(r, c) {
  const cell = state.grid[r][c];
  if (cell.type === CELL_MUSHLOG) {
    state.hoveredLog = { row: r, col: c };
    highlightRange(r, c, true);
  } else {
    // If we're hovering over something else and there was a previous highlight, clear it
    if (state.hoveredLog) {
      highlightRange(state.hoveredLog.row, state.hoveredLog.col, false);
      state.hoveredLog = null;
    }
  }
}

function handleCellLeave(r, c) {
  if (state.hoveredLog && state.hoveredLog.row === r && state.hoveredLog.col === c) {
    highlightRange(r, c, false);
    state.hoveredLog = null;
  }
}

function highlightRange(logR, logC, on) {
  for (let dr = -3; dr <= 3; dr++) {
    for (let dc = -3; dc <= 3; dc++) {
      const nr = logR + dr;
      const nc = logC + dc;
      if (nr < 0 || nr >= state.gridHeight || nc < 0 || nc >= state.gridWidth) continue;
      const idx = nr * state.gridWidth + nc;
      const cellEl = farmGridEl.children[idx];
      if (cellEl) {
        if (on) cellEl.classList.add('in-range');
        else cellEl.classList.remove('in-range');
      }
    }
  }
}

// ── Toolbar ──────────────────────────────────────────────────

function initToolbar() {
  $$('.tool-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const tool = btn.dataset.tool;
      if (state.selectedTool === tool) {
        state.selectedTool = null;
        btn.classList.remove('active');
      } else {
        $$('.tool-btn').forEach(b => b.classList.remove('active'));
        state.selectedTool = tool;
        btn.classList.add('active');
      }
    });
  });
}

// ── Calculation Engine ───────────────────────────────────────

function getNearbyCells(grid, logR, logC, gridW, gridH, config) {
  const cells = [];
  const tw = config.tileWidth || gridW;
  const th = config.tileHeight || gridH;

  for (let dr = -3; dr <= 3; dr++) {
    for (let dc = -3; dc <= 3; dc++) {
      if (dr === 0 && dc === 0) continue; // skip self
      let nr = logR + dr;
      let nc = logC + dc;

      if (config.infiniteCalc) {
        if (config.tileableMode) {
          // Wrap using tile dimensions to simulate infinite pattern
          nr = ((nr % th) + th) % th;
          nc = ((nc % tw) + tw) % tw;
        } else {
          // Wrap using grid dimensions
          nr = ((nr % gridH) + gridH) % gridH;
          nc = ((nc % gridW) + gridW) % gridW;
        }
      } else {
        if (nr < 0 || nr >= gridH || nc < 0 || nc >= gridW) continue;
      }

      cells.push(grid[nr][nc]);
    }
  }
  return cells;
}

function calculateMushroomLog(grid, logR, logC, gridW, gridH, config) {
  const nearby = getNearbyCells(grid, logR, logC, gridW, gridH, config);

  // Count trees
  const trees = nearby.filter(c => c.type === CELL_TREE);
  const totalTrees = trees.length;

  const nearbyTreeCounts = {};
  for (const t of trees) {
    nearbyTreeCounts[t.treeType] = (nearbyTreeCounts[t.treeType] || 0) + 1;
  }

  const matureTrees = trees; // All trees assumed mature

  // ── Quantity ──
  // floor(totalTrees / 2) * random(1 or 2), clamped to [1, 5]
  // Expected value: floor(totalTrees/2) * 1.5, clamped
  const halfTrees = Math.floor(totalTrees / 2);
  // Expected qty = average of (halfTrees*1) and (halfTrees*2) = halfTrees * 1.5
  // But clamped to [1, 5] per roll
  const qtyLow = Math.max(1, Math.min(5, halfTrees * 1));
  const qtyHigh = Math.max(1, Math.min(5, halfTrees * 2));
  const expectedQty = (qtyLow + qtyHigh) / 2;

  // ── Mushroom Type Distribution ──
  // Step 1: Basic distribution entries = max(1, floor(totalTrees * 3/4))
  const basicCount = Math.max(1, Math.floor(totalTrees * 3 / 4));

  // Step 2: One entry per mature tree based on type
  // Build the pool of entries
  // Each entry is a probability distribution over mushroom types
  // Then we pick one entry uniformly at random

  const totalEntries = basicCount + matureTrees.length;

  // For each entry, track what mushroom it contributes
  // Basic entries: Common 80.75%, Red 14.25%, Purple 5%
  // Tree entries depend on tree type

  // We'll compute the probability of each mushroom type by averaging across all entries
  const typeProbs = { common: 0, red: 0, morel: 0, chanterelle: 0, purple: 0 };

  // Basic distribution contributions
  const basicCommon = 0.8075;
  const basicRed = 0.1425;
  const basicPurple = 0.05;

  typeProbs.common += basicCount * basicCommon;
  typeProbs.red += basicCount * basicRed;
  typeProbs.purple += basicCount * basicPurple;

  // Per-tree contributions
  for (const tree of matureTrees) {
    const treeInfo = TREE_TYPES[tree.treeType];
    if (!treeInfo) continue;

    if (treeInfo.mushroomType === null) {
      // Uses basic distribution (e.g., mahogany)
      typeProbs.common += basicCommon;
      typeProbs.red += basicRed;
      typeProbs.purple += basicPurple;
    } else if (tree.treeType === 'maple') {
      // 90% red, 10% purple
      typeProbs.red += 0.9;
      typeProbs.purple += 0.1;
    } else {
      // 100% of its mushroom type
      typeProbs[treeInfo.mushroomType] += 1.0;
    }
  }

  // Normalize
  const totalWeight = Object.values(typeProbs).reduce((a, b) => a + b, 0);
  for (const key of Object.keys(typeProbs)) {
    typeProbs[key] = totalWeight > 0 ? typeProbs[key] / totalWeight : 0;
  }

  // ── Quality Distribution ──
  // treeMossCount = trees.length + mossy trees count (mossy counted twice)
  const mossyCount = trees.filter(t => t.hasMoss).length;
  const treeMossCount = totalTrees + mossyCount; // each tree counts 1, mossy ones count an extra 1

  const upgradeChance = Math.min(1, treeMossCount / 40);

  // Probability of each quality:
  // P(base) = 1 - upgradeChance
  // P(silver) = upgradeChance * (1 - upgradeChance)
  // P(gold) = upgradeChance^2 * (1 - upgradeChance)
  // P(iridium) = upgradeChance^3
  const qualProbs = [
    1 - upgradeChance,
    upgradeChance * (1 - upgradeChance),
    upgradeChance * upgradeChance * (1 - upgradeChance),
    upgradeChance * upgradeChance * upgradeChance,
  ];

  return {
    totalTrees,
    nearbyTreeCounts,
    mossyCount,
    treeMossCount,
    expectedQty,
    qtyLow,
    qtyHigh,
    typeProbs,
    qualProbs,
    upgradeChance,
  };
}

function calculateFarm(config) {
  const grid = config.grid;
  const w = config.gridWidth;
  const h = config.gridHeight;
  const tileable = config.tileableMode;
  const infiniteCalc = config.infiniteCalc;

  // Find all mushroom logs and calculate area stats
  const logs = [];
  let emptyCount = 0;
  let treeCount = 0;
  const treeCountsByType = {};

  for (let r = 0; r < h; r++) {
    for (let c = 0; c < w; c++) {
      const cell = grid[r][c];
      if (cell.type === CELL_EMPTY) {
        emptyCount++;
      } else if (cell.type === CELL_TREE) {
        treeCount++;
        treeCountsByType[cell.treeType] = (treeCountsByType[cell.treeType] || 0) + 1;
      } else if (cell.type === CELL_MUSHLOG) {
        const result = calculateMushroomLog(grid, r, c, w, h, config);
        logs.push({ row: r, col: c, ...result });
      }
    }
  }

  // Harvest timing
  // Base: every 4 days. Rain reduces remaining time by an extra day.
  // Main Farm normal: ~13.56%. Ginger Island: 24%. Calico Desert: 0%.
  // Rain Totems override probability to ~89% (considering un-totemable festival days and 1st of season).
  const daysPerYear = 112;
  let rainProb = config.farmLocation === 'ginger' ? 0.24 : config.farmLocation === 'desert' ? 0 : 0.1356;
  if (config.useRainTotems && config.farmLocation !== 'desert') {
    rainProb = 0.89;
  }

  // Since a rainy day grants 2 days of progress and a sunny day grants 1, 
  // expected daily progress is (1 - rainProb) * 1 + (rainProb) * 2 = 1 + rainProb.
  // Therefore, the average cycle length is 4 / (1 + rainProb).
  const avgCycleDays = 4 / (1 + rainProb);

  const totalHarvests = Math.floor(daysPerYear / avgCycleDays);

  // Compute gold
  let totalGoldPerHarvest = 0;
  let totalDehydratorMushrooms = 0;
  let totalPickleMushrooms = 0;
  const perLogResults = [];

  for (const log of logs) {
    let logGoldPerHarvest = 0;
    const breakdown = {};

    for (const [mtype, typeProb] of Object.entries(log.typeProbs)) {
      if (typeProb === 0) continue;
      const processing = config.processing[mtype];

      let avgPricePerMushroom = 0;
      const qualDetails = [];

      for (let q = 0; q < 4; q++) {
        const qualProb = log.qualProbs[q];
        const decision = getProcessingDecision(mtype, q, processing, config.artisanProfession);
        const price = decision.price;
        avgPricePerMushroom += qualProb * price;
        qualDetails.push({ quality: q, prob: qualProb, price });

        const expectedCountForQuality = log.expectedQty * typeProb * qualProb;
        if (decision.actualProc === 'dehydrator') totalDehydratorMushrooms += expectedCountForQuality;
        if (decision.actualProc === 'preserves') totalPickleMushrooms += expectedCountForQuality;
      }

      const expectedCount = log.expectedQty * typeProb;
      const goldFromType = expectedCount * avgPricePerMushroom;
      logGoldPerHarvest += goldFromType;

      breakdown[mtype] = {
        typeProb,
        expectedCount,
        avgPricePerMushroom,
        goldFromType,
        qualDetails,
      };
    }

    perLogResults.push({
      ...log,
      logGoldPerHarvest,
      breakdown,
    });

    totalGoldPerHarvest += logGoldPerHarvest;
  }

  const PICKLE_DAYS = 4000 / (24 * 60);
  const totalDehydratorDays = totalDehydratorMushrooms / 5;
  const totalPickleDays = totalPickleMushrooms * PICKLE_DAYS;
  const dehydratorsRequired = Math.ceil(totalDehydratorDays / avgCycleDays);
  const jarsRequired = Math.ceil(totalPickleDays / avgCycleDays);

  // ── Calculate Tapper Yield ──
  let totalTapperGoldPerYear = 0;
  const tapperBreakdown = {};

  for (let r = 0; r < h; r++) {
    for (let c = 0; c < w; c++) {
      const cell = grid[r][c];
      if (cell.type === CELL_TREE && cell.tapper) {
        const treeInfo = TREE_TYPES[cell.treeType];
        if (!treeInfo || !treeInfo.tapper) continue;

        const tapInfo = treeInfo.tapper;
        const daysToProduce = cell.tapper === 'heavy' ? tapInfo.heavyDays : tapInfo.normalDays;
        const activeDaysPerYear = tapInfo.winter ? 112 : 84;

        let harvestsPerYear = 0;
        if (config.syncTappers) {
          const numMushroomCyclesForTapper = Math.ceil(daysToProduce / avgCycleDays);
          const mushroomRunsInActivePeriod = Math.floor(activeDaysPerYear / avgCycleDays);
          harvestsPerYear = Math.floor(mushroomRunsInActivePeriod / numMushroomCyclesForTapper);
        } else {
          harvestsPerYear = Math.floor(activeDaysPerYear / daysToProduce);
        }

        let price = tapInfo.price;
        if (config.tapperProfession && ['Maple Syrup', 'Oak Resin', 'Pine Tar', 'Mystic Syrup'].includes(tapInfo.name)) {
          price = Math.floor(price * 1.25);
        }

        const gold = harvestsPerYear * price;
        totalTapperGoldPerYear += gold;

        const breakdownKey = `${treeInfo.name} (${cell.tapper === 'heavy' ? 'Heavy' : 'Normal'} Tapper)`;
        if (!tapperBreakdown[breakdownKey]) {
          tapperBreakdown[breakdownKey] = { tapperCount: 0, productName: tapInfo.name, totalHarvestsPerYear: 0, totalGold: 0 };
        }
        tapperBreakdown[breakdownKey].tapperCount++;
        tapperBreakdown[breakdownKey].totalHarvestsPerYear += harvestsPerYear;
        tapperBreakdown[breakdownKey].totalGold += gold;
      }
    }
  }

  return {
    emptyCount,
    treeCount,
    treeCountsByType,
    gridArea: w * h,
    logs: perLogResults,
    logCount: logs.length,
    totalGoldPerHarvest,
    totalHarvests,
    avgCycleDays,
    totalGoldPerYear: totalGoldPerHarvest * totalHarvests,
    tileMode: tileable,
    dehydratorsRequired,
    jarsRequired,
    totalTapperGoldPerYear,
    tapperBreakdown,
  };
}

// ── Results Rendering ────────────────────────────────────────

function renderResults(results) {
  state.lastResults = results;
  const hasTappers = results.tapperBreakdown && Object.keys(results.tapperBreakdown).length > 0;
  showMathBtn.style.display = (results.logCount > 0 || hasTappers) ? 'block' : 'none';

  let html = '';

  if (results.logCount === 0 && !hasTappers) {
    html = `
      <div class="empty-state">
        <img src="assets/Mushroom_Log.png" class="icon" alt="Log" style="width: 48px; height: 48px; image-rendering: pixelated;">
        <p>No mushroom logs or tappers found. Place some logs near trees or tappers on trees to see production stats.</p>
      </div>`;
  } else {
    // ── Combined Gold Headline ──
    const combined = (results.totalGoldPerYear || 0) + (results.totalTapperGoldPerYear || 0);
    if (results.logCount > 0 || hasTappers) {
      html += `
        <div class="results-section" style="margin-bottom:16px; background: rgba(0,0,0,0.15); border-radius: 8px; border: 1px solid var(--text-accent); box-shadow: inset 0 0 10px rgba(52,211,153,0.1);">
          <div style="display: flex; justify-content: space-between; align-items: center; padding: 4px;">
            <span style="font-weight: 600; font-size: 0.9rem; color: var(--text-primary); text-transform: uppercase; letter-spacing: 1px;">Combined Gold / Year</span>
            <span style="font-size: 1.4rem; font-weight: bold; color: var(--text-accent); text-shadow: 0 0 8px rgba(52,211,153,0.4);">${formatGold(combined)}</span>
          </div>
        </div>
      `;
    }

    if (results.logCount > 0) {
      // ── Gold Summary ──
      const goldPerDay = results.totalGoldPerYear / 112;
      const gridArea = results.gridArea || (state.gridWidth * state.gridHeight);

      html += `
      <div style="margin: 24px 0 16px 0; padding-bottom: 8px; border-bottom: 2px solid rgba(255, 255, 255, 0.1); font-size: 1.1rem; font-weight: 700; color: var(--text-primary); text-transform: uppercase; letter-spacing: 1px;">
        🍄 MUSHROOM LOGS
      </div>
      <div class="gold-summary">
        <div class="big-number">${formatGold(results.totalGoldPerHarvest)}</div>
        <div class="big-label">Expected gold per harvest</div>
        <div style="font-size:0.85rem; color:var(--text-secondary); margin-top:6px; text-align:center;">${formatGold(results.totalGoldPerHarvest / gridArea)} per tile</div>
      </div>
      <div style="display:flex; gap:12px; margin-bottom:16px;">
        <div class="gold-summary" style="flex:1; margin-bottom:0; padding:16px 12px;">
          <div class="big-number" style="font-size:1.3rem;">${formatGold(goldPerDay)}</div>
          <div class="big-label" style="font-size:0.7rem;">Gold / Day</div>
          <div style="font-size:0.75rem; color:var(--text-secondary); margin-top:6px; text-align:center;">${formatGold(goldPerDay / gridArea)} / tile</div>
        </div>
        <div class="gold-summary" style="flex:1; margin-bottom:0; padding:16px 12px;">
          <div class="big-number" style="font-size:1.3rem;">${formatGold(results.totalGoldPerYear)}</div>
          <div class="big-label" style="font-size:0.7rem;">Gold / Year</div>
          <div style="font-size:0.75rem; color:var(--text-secondary); margin-top:6px; text-align:center;">${formatGold(results.totalGoldPerYear / gridArea)} / tile</div>
        </div>
      </div>
    `;

      // ── Farm Overview ──
      const emptyPct = ((results.emptyCount / gridArea) * 100).toFixed(1);
      const logPct = ((results.logCount / gridArea) * 100).toFixed(1);
      const treePct = ((results.treeCount / gridArea) * 100).toFixed(1);

      html += `
      <div class="results-section" style="margin-top:14px">
        <h3>📋 FARM OVERVIEW</h3>
        <div class="stat-row">
          <span class="stat-label">Empty Space</span>
          <span class="stat-value">${results.emptyCount} (${emptyPct}%)</span>
        </div>
        <div class="stat-row">
          <span class="stat-label">Mushroom Logs</span>
          <span class="stat-value">${results.logCount} (${logPct}%)</span>
        </div>
    `;

      if (results.treeCount > 0) {
        html += `
        <div class="stat-row" style="flex-direction: column; align-items: flex-start; padding-top: 8px; border-top: 1px solid var(--border-color);">
          <span class="stat-label" style="margin-bottom: 4px; display: flex; justify-content: space-between; width: 100%;">
            <span>Trees</span>
            <span class="stat-value">${results.treeCount} (${treePct}%)</span>
          </span>
          <div style="padding-left: 10px; width: 100%;">
      `;
        for (const [tType, tCount] of Object.entries(results.treeCountsByType || {})) {
          const tInfo = TREE_TYPES[tType];
          if (tInfo) {
            html += `
            <div class="stat-row" style="padding: 2px 0; border: none;">
              <span class="stat-label" style="font-size: 0.8rem; display: flex; align-items: center; gap: 4px;">
                <img src="${tInfo.emoji}" style="width:16px; height:16px; object-fit:contain;"> ${tInfo.name}
              </span>
              <span class="stat-value" style="font-size: 0.8rem;">${tCount}</span>
            </div>
          `;
          }
        }
        html += `
          </div>
        </div>
      `;
      }

      html += `
        <div class="stat-row" style="padding-top: 8px; border-top: 1px solid var(--border-color);">
          <span class="stat-label">Avg. harvest interval</span>
          <span class="stat-value">${results.avgCycleDays.toFixed(1)} days</span>
        </div>
        <div class="stat-row">
          <span class="stat-label">Harvests / year</span>
          <span class="stat-value">${results.totalHarvests}</span>
        </div>
      </div>
    `;

      // ── Aggregate mushroom type breakdown ──
      const aggTypeProbs = { common: 0, red: 0, morel: 0, chanterelle: 0, purple: 0 };
      let aggExpectedQty = 0;

      for (const log of results.logs) {
        for (const [mtype, prob] of Object.entries(log.typeProbs)) {
          aggTypeProbs[mtype] += prob * log.expectedQty;
        }
        aggExpectedQty += log.expectedQty;
      }

      html += `
      <div class="results-section">
        <h3>🍄 MUSHROOM MIX (AVG/HARVEST)</h3>
    `;

      for (const [mtype, data] of Object.entries(MUSHROOM_DATA)) {
        const count = aggTypeProbs[mtype];
        const pct = aggExpectedQty > 0 ? (count / aggExpectedQty * 100) : 0;
        html += `
        <div class="prob-bar-container">
          <div class="prob-bar-label">
            <span class="name"><img src="${data.emoji}" class="result-icon"> ${data.name}</span>
            <span class="pct">${count.toFixed(1)} (${pct.toFixed(1)}%)</span>
          </div>
          <div class="prob-bar">
            <div class="prob-bar-fill ${data.color}" style="width:${pct}%"></div>
          </div>
        </div>
      `;
      }

      html += `
        <div class="stat-row" style="margin-top:6px">
          <span class="stat-label">Total mushrooms / harvest</span>
          <span class="stat-value">${aggExpectedQty.toFixed(1)}</span>
        </div>
        <div class="stat-row">
          <span class="stat-label">Mushrooms / tile</span>
          <span class="stat-value">${(aggExpectedQty / gridArea).toFixed(2)}</span>
        </div>
      </div>
    `;

      // ── Processing Equipment ──
      const bypassedItems = [];
      for (const [mtype, proc] of Object.entries(state.processing)) {
        if (proc === 'raw' || mtype === 'red') continue;

        const bypassedQualities = [];
        for (let q = 0; q < 4; q++) {
          const decision = getProcessingDecision(mtype, q, proc, state.artisanProfession);
          if (decision.actualProc === 'raw') {
            bypassedQualities.push(QUALITY_NAMES[q]);
          }
        }
        if (bypassedQualities.length > 0) {
          bypassedItems.push(`${MUSHROOM_DATA[mtype].name} (${bypassedQualities.join(', ')})`);
        }
      }

      let bypassMsg = `* Minimum machines needed to process one harvest before the next one is ready.<br/>`;
      bypassMsg += `* Red Mushrooms cannot be processed.`;
      if (bypassedItems.length > 0) {
        bypassMsg += `<br/>* Excluded (more profitable to sell raw): <strong>${bypassedItems.join('; ')}</strong>.`;
      }

      html += `
      <div class="results-section">
        <h3>🛠️ REQUIRED PROCESSING</h3>
        <div class="stat-row">
          <span class="stat-label">Dehydrators</span>
          <span class="stat-value" style="color:var(--text-accent);">${results.dehydratorsRequired}</span>
        </div>
        <div class="stat-row">
          <span class="stat-label">Preserves Jars</span>
          <span class="stat-value" style="color:var(--text-accent);">${results.jarsRequired}</span>
        </div>
        <div style="font-size:0.75rem; color:var(--text-secondary); margin-top:8px; line-height:1.4;">
          ${bypassMsg}
        </div>
      </div>
    `;

      // ── Per-Log Details ──
      html += `
      <details class="results-section" style="margin-top:14px; cursor:pointer;">
        <summary style="outline:none; font-size:0.85rem; color:var(--text-accent); letter-spacing:1.5px; text-transform:uppercase; font-weight:600;">
          <span style="display:inline-flex; align-items:center; gap:8px;">📍 PER-LOG DETAILS</span>
        </summary>
        <div style="margin-top:16px; cursor:default; display:flex; flex-direction:column; gap:8px;">
    `;

      const logGroups = {};
      for (const log of results.logs) {
        const sortedTrees = Object.keys(log.nearbyTreeCounts || {}).sort().map(k => `${k}:${log.nearbyTreeCounts[k]}`).join(',');
        const sig = `${log.totalTrees}-${log.mossyCount}-${JSON.stringify(log.typeProbs)}-${sortedTrees}`;
        if (!logGroups[sig]) {
          logGroups[sig] = { count: 0, sampleLog: log, coords: [] };
        }
        logGroups[sig].count++;
        logGroups[sig].coords.push(`(${log.row},${log.col})`);
      }

      const groups = Object.values(logGroups);
      groups.sort((a, b) => b.sampleLog.logGoldPerHarvest - a.sampleLog.logGoldPerHarvest);

      for (let i = 0; i < groups.length; i++) {
        const group = groups[i];
        const log = group.sampleLog;
        const multi = group.count > 1;
        const logIcon = `<img src="assets/Mushroom_Log.png" alt="Log" style="height: 2.4em; width: auto; vertical-align: middle; margin-right: 6px; image-rendering: pixelated; margin-top: -4px;">`;
        const title = multi ? `${logIcon}${group.count} Logs` : `${logIcon}Log ${group.coords[0]}`;

        html += `
        <div class="log-detail" id="log-detail-${i}">
          <div class="log-detail-header" onclick="toggleLogDetail(${i})">
            <span>${title} — ${log.totalTrees} trees — ${formatGold(log.logGoldPerHarvest)}/harvest ${multi ? 'each' : ''}</span>
            <span class="chevron">▶</span>
          </div>
          <div class="log-detail-body">
            <div style="font-size:0.75rem; color:var(--text-secondary); margin-bottom:12px; line-height:1.4;">
              <strong>Located at:</strong> ${group.coords.join(', ')}
            </div>
            <div class="stat-row" style="flex-direction: column; align-items: flex-start; border-bottom: 1px solid var(--border-color); padding-bottom: 8px;">
              <span class="stat-label">Nearby trees: ${log.totalTrees} (${log.mossyCount} Mossy)</span>
              <div style="padding-left: 10px; width: 100%; margin-top: 4px;">
                ${Object.entries(log.nearbyTreeCounts || {}).map(([tType, tCount]) => {
          const tInfo = TREE_TYPES[tType];
          if (!tInfo) return '';
          return `
                    <div class="stat-row" style="padding: 2px 0; border: none;">
                      <span class="stat-label" style="font-size: 0.8rem; display: flex; align-items: center; gap: 4px;">
                        <img src="${tInfo.emoji}" style="width:16px; height:16px; object-fit:contain;"> ${tInfo.name}
                      </span>
                      <span class="stat-value" style="font-size: 0.8rem;">${tCount}</span>
                    </div>
                  `;
        }).join('')}
              </div>
            </div>
            <div class="stat-row">
              <span class="stat-label">Qty (min–max)</span>
              <span class="stat-value">${log.qtyLow}–${log.qtyHigh} (avg ${log.expectedQty.toFixed(1)})</span>
            </div>
            <div class="stat-row">
              <span class="stat-label">Quality upgrade chance</span>
              <span class="stat-value">${(log.upgradeChance * 100).toFixed(1)}%</span>
            </div>
            <div style="margin-top:6px">
              <div style="font-size:0.7rem;color:var(--text-secondary);margin-bottom:4px">Quality distribution:</div>
              <div class="quality-row">
      `;
        for (let q = 0; q < 4; q++) {
          html += `<span class="quality-badge ${QUALITY_CLASSES[q]}">${QUALITY_NAMES[q]} ${(log.qualProbs[q] * 100).toFixed(1)}%</span>`;
        }
        html += `</div></div>`;

        html += `<div style="margin-top:6px">`;
        for (const [mtype, prob] of Object.entries(log.typeProbs)) {
          if (prob === 0) continue;
          const data = MUSHROOM_DATA[mtype];
          html += `
          <div class="prob-bar-container">
            <div class="prob-bar-label">
              <span class="name"><img src="${data.emoji}" class="result-icon"> ${data.name}</span>
              <span class="pct">${(prob * 100).toFixed(1)}%</span>
            </div>
            <div class="prob-bar"><div class="prob-bar-fill ${data.color}" style="width:${prob * 100}%"></div></div>
          </div>
        `;
        }
        html += `</div></div></div>`;
      }
      html += `</div></details>`;
    } // End of logCount > 0 block

    // ── Render Tappers ──
    if (hasTappers) {
      html += `
      <div style="margin: 32px 0 16px 0; padding-bottom: 8px; border-bottom: 2px solid rgba(255, 255, 255, 0.1); font-size: 1.1rem; font-weight: 700; color: var(--text-primary); text-transform: uppercase; letter-spacing: 1px;">
        🍯 TAPPERS
      </div>
      <div class="results-section">
    `;

      for (const [key, stats] of Object.entries(results.tapperBreakdown)) {
        html += `
        <div class="stat-row" style="align-items: flex-start; flex-direction: column; padding: 8px 0; border-bottom: 1px solid var(--border-color);">
          <div style="display: flex; justify-content: space-between; width: 100%;">
            <span class="stat-label"><strong>${stats.tapperCount}x</strong> ${key}</span>
            <span class="stat-value">${formatGold(stats.totalGold)}</span>
          </div>
          <div style="font-size: 0.75rem; color: var(--text-secondary); margin-top: 4px;">
            Produces: ${stats.totalHarvestsPerYear}x ${stats.productName} / Year
          </div>
        </div>
      `;
      }

      html += `
        <div class="stat-row" style="margin-top:8px; padding-top:4px;">
          <span class="stat-label"><strong>Tapper Gold / Year</strong></span>
          <span class="stat-value" style="color:var(--text-accent);"><strong>${formatGold(results.totalTapperGoldPerYear)}</strong></span>
        </div>
      </div>
    `;
    } // End of if (hasTappers)
  } // End of else block

  resultsContent.innerHTML = html;
}

function toggleLogDetail(i) {
  const el = document.getElementById(`log-detail-${i}`);
  if (el) el.classList.toggle('open');
}
// Expose to global for onclick
window.toggleLogDetail = toggleLogDetail;

function formatGold(amount) {
  return Math.round(amount).toLocaleString() + 'g';
}

function populateMathModal(results) {
  if (!results) return;

  const loc = state.farmLocation === 'ginger' ? 'Ginger Island' : state.farmLocation === 'desert' ? 'Calico Desert' : 'Main Farm';
  const rainProbPct = state.farmLocation === 'ginger' ? 24 : state.farmLocation === 'desert' ? 0 : 13.56;
  const rainProbStr = state.farmLocation === 'ginger' ? '24' : state.farmLocation === 'desert' ? '0' : '13.56';

  let html = `
    <h3>1. Harvest Frequency</h3>
    <ul>
      <li><strong>Base cycle:</strong> 4 days</li>
      <li><strong>Location:</strong> ${loc} (average ${rainProbStr}% chance of rain per day)
        ${state.farmLocation === 'main' ? `
          <ul style="margin-top:6px; margin-bottom:6px; font-size:0.85rem; opacity:0.85;">
            <li>Spring and fall have a flat 18.3% chance of rain.</li>
            <li>Summer rain odds increase daily, plus 1 guaranteed Green Rain day.</li>
            <li>Winter never has rain naturally.</li>
            <li>There is never rain on the 1st day of any season.</li>
            <li>Festival days are always sunny, overriding any weather.</li>
            <li>Averaging this out over the 112-day year yields approximately 13.56%.</li>
          </ul>
        ` : ''}
      </li>
      <li><strong>Mechanic:</strong> Each day it rains reduces the remaining harvest time by 1 day.</li>
      <li><strong>Math:</strong> Probability of at least 1 rain day during a 4-day cycle is <code>1 - (1 - ${rainProbStr}%)^4 = ${((1 - Math.pow(1 - (rainProbPct / 100), 4)) * 100).toFixed(2)}%</code>.</li>
      <li><strong>Result:</strong> Average harvest interval is <code>${results.avgCycleDays.toFixed(2)} days</code>.</li>
      <li><strong>Yearly Yield:</strong> 112 days / ${results.avgCycleDays.toFixed(2)} = <code>~${results.totalHarvests} harvests per year</code>.</li>
    </ul>

    <h3>2. Quantity (Per Log)</h3>
    <ul>
      <li><strong>Mechanic:</strong> The game counts wild trees in a 7×7 square around the log.</li>
      <li><strong>Formula:</strong> <code>min(5, max(1, floor(NearbyTrees / 2) * random(1 or 2)))</code></li>
      <li><strong>10 trees</strong> are required to guarantee the maximum of 5 mushrooms per harvest.</li>
    </ul>

    <h3>3. Quality (Per Log)</h3>
    <ul>
      <li><strong>Mechanic:</strong> Quality is determined by NearbyTrees + MossyTrees (trees with moss count twice).</li>
      <li><strong>Formula:</strong> Upgrade chance is <code>(NearbyTrees + MossyTrees) / 40</code> (max 100%).</li>
      <li><strong>Rolls:</strong> That probability is rolled repeatedly until it fails or reaches iridium quality.</li>
      <li><strong>Example:</strong> Consider a log surrounded by 10 trees, 6 of which are mossy. The odds for quality upgrades are <code>(10 + 6) / 40 = 40%</code>. 60% of the time the output will be standard quality, 24% will be silver, 9.6% will be gold, and 6.4% will be iridium.</li>
    </ul>

    <h3>4. Mushroom Types (Per Log)</h3>
    <ul>
      <li><strong>Mechanic:</strong> The game builds a pool of possible mushrooms based on nearby trees.</li>
      <li><strong>Step 1 (Basic Pool):</strong> Adds <code>max(1, floor(NearbyTrees * 0.75))</code> entries from a base distribution (Common 80.75%, Red 14.25%, Purple 5%).</li>
      <li><strong>Step 2 (Tree Bonus):</strong> Adds 1 entry per mature tree based on its type:
        <ul style="margin-top:6px; margin-bottom:6px; font-size:0.85rem; opacity:0.85;">
          <li><strong>Oak:</strong> 100% Morel</li>
          <li><strong>Pine:</strong> 100% Chanterelle</li>
          <li><strong>Mystic:</strong> 100% Purple</li>
          <li><strong>Maple:</strong> 90% Red, 10% Purple</li>
          <li><strong>Immature trees, or any other tree types:</strong> Adds another entry from the base distribution</li>
        </ul>
      </li>
      <li><strong>Step 3:</strong> One type is chosen randomly from the combined pool.</li>
    </ul>

    <h3>Mushroom Logs Are Machines</h3>
    <ul>
      <li><strong>Mushroom Logs As Machines:</strong> Mushroom logs are implemented as farm machines like kegs, furnaces, etc. and share many of the same behaviors.</li>
      <li><strong>Harvest:</strong> All the mushrooms for each harvest are of the same type and quality. This tool gives the averages over all possibilities.</li>
      <li><strong>When:</strong> Counterintuitively, these determinations are made at the time of the <em>previous harvest</em> (or when the log was placed down for the first harvest). As such, the types of mushrooms produced may be inconsistent with the types of surrounding trees, since they may have been immature at the time the products were deterimined.</li>
      <li><strong>Wiki references:</strong>
      <ul style="margin-top:6px; margin-bottom:6px; font-size:0.85rem; opacity:0.85;">
        <li><strong><a href="https://stardewvalleywiki.com/Mushroom_Log" target="_blank" style="color:var(--text-accent); text-decoration: underline;">Mushroom Log</a></strong></li>
        <li><strong><a href="https://stardewvalleywiki.com/Moss" target="_blank" style="color:var(--text-accent); text-decoration: underline;">Moss</a></strong></li>
        <li><strong><a href="https://stardewvalleywiki.com/Trees" target="_blank" style="color:var(--text-accent); text-decoration: underline;">Trees</a></strong></li>
        <li><strong><a href="https://stardewvalleywiki.com/Weather" target="_blank" style="color:var(--text-accent); text-decoration: underline;">Weather</a></strong></li>
        <li><strong><a href="https://stardewvalleywiki.com/Green_Rain" target="_blank" style="color:var(--text-accent); text-decoration: underline;">Green_Rain</a></strong></li>
      </ul>
    </li>
  </ul>
  `;

  modalBody.innerHTML = html;
}

// ── Event Listeners ──────────────────────────────────────────

function setupEventListeners() {
  // Presets
  const presetSelect = $('#preset-select');
  const presetNameInput = $('#preset-name');
  const savePresetBtn = $('#save-preset-btn');
  const loadPresetBtn = $('#load-preset-btn');
  const deletePresetBtn = $('#delete-preset-btn');

  if (savePresetBtn) {
    savePresetBtn.addEventListener('click', () => {
      const name = presetNameInput.value.trim();
      if (!name) {
        alert('Please enter a name for the preset.');
        return;
      }
      const presets = loadPresets();
      presets[name] = {
        gridWidth: state.gridWidth,
        gridHeight: state.gridHeight,
        grid: state.grid,
        tileableMode: state.tileableMode,
        infiniteCalc: state.infiniteCalc,
        tileWidth: state.tileWidth,
        tileHeight: state.tileHeight,
        farmLocation: state.farmLocation,
        useRainTotems: state.useRainTotems,
        artisanProfession: state.artisanProfession,
        tapperProfession: state.tapperProfession,
        syncTappers: state.syncTappers,
        processing: state.processing,
      };
      savePresets(presets);
      presetNameInput.value = '';
      presetSelect.value = name;
    });
  }

  if (loadPresetBtn) {
    loadPresetBtn.addEventListener('click', () => {
      const name = presetSelect.value;
      if (!name) return;
      const presets = loadPresets();
      const data = presets[name];
      if (data) {
        loadState(data);
        renderGrid();
        saveState();
        updateCalculation();
      }
    });
  }

  if (deletePresetBtn) {
    deletePresetBtn.addEventListener('click', () => {
      const name = presetSelect.value;
      if (!name) return;
      if (confirm(`Delete preset "${name}"?`)) {
        const presets = loadPresets();
        delete presets[name];
        savePresets(presets);
        presetSelect.value = '';
      }
    });
  }

  // Grid size
  gridWidthInput.addEventListener('change', resizeGrid);
  gridHeightInput.addEventListener('change', resizeGrid);

  // Tileable
  tileableToggle.addEventListener('change', () => {
    state.tileableMode = tileableToggle.checked;
    tileSizeSettings.style.display = state.tileableMode ? 'block' : 'none';
    if (state.tileableMode) retileGrid();
    renderGrid();
    saveState();
  });

  infiniteCalcToggle.addEventListener('change', () => {
    state.infiniteCalc = infiniteCalcToggle.checked;
    saveState();
  });

  tileWidthInput.addEventListener('change', () => {
    state.tileWidth = parseInt(tileWidthInput.value) || 7;
    retileGrid();
    renderGrid();
    saveState();
  });

  tileHeightInput.addEventListener('change', () => {
    state.tileHeight = parseInt(tileHeightInput.value) || 7;
    retileGrid();
    renderGrid();
    saveState();
  });

  artisanToggle.addEventListener('change', () => {
    state.artisanProfession = artisanToggle.checked;
    saveState();
    calculateFarm();
  });

  tapperToggle.addEventListener('change', () => {
    state.tapperProfession = tapperToggle.checked;
    saveState();
    calculateFarm();
  });

  syncTappersToggle.addEventListener('change', () => {
    state.syncTappers = syncTappersToggle.checked;
    saveState();
    calculateFarm();
  });

  farmLocationSelect.addEventListener('change', (e) => {
    state.farmLocation = e.target.value;
    saveState();

    const rainTotemToggle = $('#rain-totem-mode');
    if (rainTotemToggle) {
      rainTotemToggle.disabled = (state.farmLocation === 'desert');
      const row = rainTotemToggle.closest('.toggle-row');
      if (row) {
        row.style.opacity = state.farmLocation === 'desert' ? '0.5' : '1';
        row.style.pointerEvents = state.farmLocation === 'desert' ? 'none' : 'auto';
      }
    }

    const rf = $('#rain-frequency-display');
    if (rf) {
      let rainPct = state.farmLocation === 'ginger' ? 24 : state.farmLocation === 'desert' ? 0 : 13.56;
      if (state.useRainTotems && state.farmLocation !== 'desert') rainPct = 89;
      rf.textContent = `~${rainPct}% chance of rain per day`;
    }
    updateCalculation();
  });

  const rainTotemToggle = $('#rain-totem-mode');
  if (rainTotemToggle) {
    rainTotemToggle.addEventListener('change', (e) => {
      state.useRainTotems = e.target.checked;
      saveState();
      const rf = $('#rain-frequency-display');
      if (rf) {
        let rainPct = state.farmLocation === 'ginger' ? 24 : state.farmLocation === 'desert' ? 0 : 13.56;
        if (state.useRainTotems && state.farmLocation !== 'desert') rainPct = 89;
        rf.textContent = `~${rainPct}% chance of rain per day`;
      }
      updateCalculation();
    });
  }



  // Processing
  $$('.processing-select').forEach(sel => {
    sel.addEventListener('change', () => {
      state.processing[sel.dataset.mushroom] = sel.value;
      saveState();
    });
  });

  // Clear
  clearBtn.addEventListener('click', () => {
    state.grid = createEmptyGrid(state.gridWidth, state.gridHeight);
    state.lastResults = null;
    showMathBtn.style.display = 'none';
    renderGrid();
    saveState();
    resultsContent.innerHTML = `
      <div class="empty-state">
        <div class="icon">🍄</div>
        <p>Place some mushroom logs and trees on the grid and production will be displayed automatically.</p>
      </div>`;
  });

  // Modal
  showMathBtn.addEventListener('click', () => {
    populateMathModal(state.lastResults);
    mathModal.classList.add('open');
  });

  closeModalBtn.addEventListener('click', () => {
    mathModal.classList.remove('open');
  });

  mathModal.addEventListener('click', (e) => {
    if (e.target === mathModal) {
      mathModal.classList.remove('open');
    }
  });
}

// ── Initialize ───────────────────────────────────────────────

function init() {
  initToolbar();
  setupEventListeners();

  const presets = loadPresets();
  updatePresetDropdown(presets);

  const loaded = loadState();
  if (loaded) {
    renderGrid();
  } else {
    initGrid();
  }

  // Auto-select mushlog tool for convenience if not loading specific tool
  const mushlogBtn = document.querySelector('[data-tool="mushlog"]');
  if (mushlogBtn) {
    mushlogBtn.click();
  }

  // Calculate initial results
  updateCalculation();
}

document.addEventListener('DOMContentLoaded', init);
