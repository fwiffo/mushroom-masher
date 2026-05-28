// ═══════════════════════════════════════════════════════════════
// State Management & Data Models
// ═══════════════════════════════════════════════════════════════

const state = {
  gridWidth: 15,
  gridHeight: 15,
  grid: [],            // 2D array of { type, treeType, hasMoss, tapper }
  selectedTool: null,
  tileableMode: false,
  wrapAround: false,
  tileWidth: 5,
  tileHeight: 5,
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
  hoveredLog: null,
  lastResults: null,
};

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

function savePresetsData(presets) {
  localStorage.setItem(PRESETS_STORAGE_KEY, JSON.stringify(presets));
}

function getStateData() {
  return {
    gridWidth: state.gridWidth,
    gridHeight: state.gridHeight,
    grid: state.grid,
    tileableMode: state.tileableMode,
    wrapAround: state.wrapAround,
    tileWidth: state.tileWidth,
    tileHeight: state.tileHeight,
    farmLocation: state.farmLocation,
    useRainTotems: state.useRainTotems,
    artisanProfession: state.artisanProfession,
    tapperProfession: state.tapperProfession,
    syncTappers: state.syncTappers,
    processing: state.processing,
  };
}

function saveStateData() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(getStateData()));
}

function loadStateData(dataObj) {
  try {
    let data = dataObj;
    if (!data) {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) data = JSON.parse(raw);
    }
    if (data) {
      if (data.gridWidth) state.gridWidth = data.gridWidth;
      if (data.gridHeight) state.gridHeight = data.gridHeight;
      if (data.grid) state.grid = data.grid;
      if (data.tileableMode !== undefined) state.tileableMode = data.tileableMode;
      if (data.wrapAround !== undefined) state.wrapAround = data.wrapAround;
      if (data.tileWidth) state.tileWidth = data.tileWidth;
      if (data.tileHeight) state.tileHeight = data.tileHeight;
      if (data.farmLocation) state.farmLocation = data.farmLocation;
      if (data.useRainTotems !== undefined) state.useRainTotems = data.useRainTotems;
      if (data.artisanProfession !== undefined) state.artisanProfession = data.artisanProfession;
      if (data.tapperProfession !== undefined) state.tapperProfession = data.tapperProfession;
      if (data.syncTappers !== undefined) state.syncTappers = data.syncTappers;
      if (data.processing) state.processing = { ...state.processing, ...data.processing };
      return true;
    }
  } catch (e) {
    console.error('Error loading state:', e);
  }
  return false;
}

// ── Grid Utilities ───────────────────────────────────────────

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

function resizeGridData(oldGrid, newW, newH, tileableMode, tileW, tileH) {
  const newGrid = createEmptyGrid(newW, newH);
  for (let r = 0; r < Math.min(newH, oldGrid.length); r++) {
    for (let c = 0; c < Math.min(newW, oldGrid[0].length); c++) {
      newGrid[r][c] = { ...oldGrid[r][c] };
    }
  }
  if (tileableMode) {
    for (let r = 0; r < newH; r++) {
      for (let c = 0; c < newW; c++) {
        if (r >= oldGrid.length || c >= oldGrid[0].length) {
          const localR = r % tileH;
          const localC = c % tileW;
          newGrid[r][c] = { ...newGrid[localR][localC] };
        }
      }
    }
  }
  return newGrid;
}

function mirrorCellToTileableGridData(grid, gridW, gridH, r, c, tileW, tileH) {
  const modifiedCoords = [];
  const localR = r % tileH;
  const localC = c % tileW;
  const sourceCell = grid[r][c];

  for (let tr = localR; tr < gridH; tr += tileH) {
    for (let tc = localC; tc < gridW; tc += tileW) {
      if (tr === r && tc === c) continue;
      grid[tr][tc] = { ...sourceCell };
      modifiedCoords.push({ r: tr, c: tc });
    }
  }
  return modifiedCoords;
}

function retileGridData(grid, gridW, gridH, tileW, tileH) {
  for (let r = 0; r < gridH; r++) {
    for (let c = 0; c < gridW; c++) {
      const localR = r % tileH;
      const localC = c % tileW;
      if (r !== localR || c !== localC) {
        grid[r][c] = { ...grid[localR][localC] };
      }
    }
  }
}
