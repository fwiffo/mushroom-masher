// ═══════════════════════════════════════════════════════════════
// Application Logic (Controller & Event Handlers)
// ═══════════════════════════════════════════════════════════════

// ── Application Core ─────────────────────────────────────────

function syncUIWithState() {
  if (gridWidthInput) gridWidthInput.value = state.gridWidth;
  if (gridHeightInput) gridHeightInput.value = state.gridHeight;
  if (tileableToggle) tileableToggle.checked = state.tileableMode;
  if (infiniteCalcToggle) infiniteCalcToggle.checked = state.infiniteCalc;
  if (tileSizeSettings) tileSizeSettings.style.display = state.tileableMode ? 'block' : 'none';
  if (tileWidthInput) tileWidthInput.value = state.tileWidth;
  if (tileHeightInput) tileHeightInput.value = state.tileHeight;
  if (farmLocationSelect) farmLocationSelect.value = state.farmLocation;

  if (rainTotemToggle) {
    rainTotemToggle.checked = state.useRainTotems;
    rainTotemToggle.disabled = (state.farmLocation === 'desert');
    const row = rainTotemToggle.closest('.toggle-row');
    if (row) {
      row.style.opacity = state.farmLocation === 'desert' ? '0.5' : '1';
      row.style.pointerEvents = state.farmLocation === 'desert' ? 'none' : 'auto';
    }
  }

  if (artisanToggle) artisanToggle.checked = state.artisanProfession;
  if (tapperToggle) tapperToggle.checked = state.tapperProfession;
  if (syncTappersToggle) syncTappersToggle.checked = state.syncTappers;

  if (rainFrequencyDisplay) {
    let rainPct = state.farmLocation === 'ginger' ? 24 : state.farmLocation === 'desert' ? 0 : 13.56;
    if (state.useRainTotems && state.farmLocation !== 'desert') rainPct = 89;
    rainFrequencyDisplay.textContent = `~${rainPct}% chance of rain per day`;
  }

  $$('.processing-select').forEach(sel => {
    if (!sel.disabled && state.processing[sel.dataset.mushroom]) {
      sel.value = state.processing[sel.dataset.mushroom];
    }
  });
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
  const tw = parseInt(tileWidthInput.value) || 7;
  const th = parseInt(tileHeightInput.value) || 7;

  state.grid = resizeGridData(state.grid, newW, newH, state.tileableMode, tw, th);
  state.gridWidth = newW;
  state.gridHeight = newH;
  renderGrid();
  saveStateData();
  updateCalculation();
}

function updateCalculation() {
  const results = calculateFarm(state);
  renderResults(results);
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
      saveStateData();
      updateCalculation();
    }
    return;
  }

  if (tool === 'mushlog') {
    if (cell.type === CELL_MUSHLOG) return; // already placed
    state.grid[r][c] = { type: CELL_MUSHLOG, treeType: null, hasMoss: false };
    updateSingleCell(r, c);
    syncTileableGrid(r, c);
    saveStateData();
    updateCalculation();
    return;
  }

  // Moss tool
  if (tool === 'moss') {
    if (cell.type === CELL_TREE && !TREE_TYPES[cell.treeType].noMoss) {
      state.grid[r][c].hasMoss = !state.grid[r][c].hasMoss;
      updateSingleCell(r, c);
      syncTileableGrid(r, c);
      saveStateData();
      updateCalculation();
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
      saveStateData();
      updateCalculation();
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
    saveStateData();
    updateCalculation();
  }
}

function syncTileableGrid(r, c) {
  if (!state.tileableMode) return;
  const tw = parseInt(tileWidthInput.value) || 7;
  const th = parseInt(tileHeightInput.value) || 7;

  const modified = syncTileableGridData(state.grid, state.gridWidth, state.gridHeight, r, c, tw, th);
  for (const coord of modified) {
    updateSingleCell(coord.r, coord.c);
  }
}

function retileGrid() {
  if (!state.tileableMode) return;
  const tw = parseInt(tileWidthInput.value) || 7;
  const th = parseInt(tileHeightInput.value) || 7;
  retileGridData(state.grid, state.gridWidth, state.gridHeight, tw, th);
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
      savePresetsData(presets);
      updatePresetDropdown(presets);
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
        if (loadStateData(data)) {
          syncUIWithState();
          renderGrid();
          saveStateData();
          updateCalculation();
        }
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
        savePresetsData(presets);
        updatePresetDropdown(presets);
        presetSelect.value = '';
      }
    });
  }

  // Grid size
  if (gridWidthInput) gridWidthInput.addEventListener('change', resizeGrid);
  if (gridHeightInput) gridHeightInput.addEventListener('change', resizeGrid);

  // Tileable
  if (tileableToggle) {
    tileableToggle.addEventListener('change', () => {
      state.tileableMode = tileableToggle.checked;
      tileSizeSettings.style.display = state.tileableMode ? 'block' : 'none';
      if (state.tileableMode) retileGrid();
      renderGrid();
      saveStateData();
      updateCalculation();
    });
  }

  if (infiniteCalcToggle) {
    infiniteCalcToggle.addEventListener('change', () => {
      state.infiniteCalc = infiniteCalcToggle.checked;
      saveStateData();
      updateCalculation();
    });
  }

  if (tileWidthInput) {
    tileWidthInput.addEventListener('change', () => {
      state.tileWidth = parseInt(tileWidthInput.value) || 7;
      retileGrid();
      renderGrid();
      saveStateData();
      updateCalculation();
    });
  }

  if (tileHeightInput) {
    tileHeightInput.addEventListener('change', () => {
      state.tileHeight = parseInt(tileHeightInput.value) || 7;
      retileGrid();
      renderGrid();
      saveStateData();
      updateCalculation();
    });
  }

  if (artisanToggle) {
    artisanToggle.addEventListener('change', () => {
      state.artisanProfession = artisanToggle.checked;
      saveStateData();
      updateCalculation();
    });
  }

  if (tapperToggle) {
    tapperToggle.addEventListener('change', () => {
      state.tapperProfession = tapperToggle.checked;
      saveStateData();
      updateCalculation();
    });
  }

  if (syncTappersToggle) {
    syncTappersToggle.addEventListener('change', () => {
      state.syncTappers = syncTappersToggle.checked;
      saveStateData();
      updateCalculation();
    });
  }

  if (farmLocationSelect) {
    farmLocationSelect.addEventListener('change', (e) => {
      state.farmLocation = e.target.value;
      saveStateData();

      if (rainTotemToggle) {
        rainTotemToggle.disabled = (state.farmLocation === 'desert');
        const row = rainTotemToggle.closest('.toggle-row');
        if (row) {
          row.style.opacity = state.farmLocation === 'desert' ? '0.5' : '1';
          row.style.pointerEvents = state.farmLocation === 'desert' ? 'none' : 'auto';
        }
      }

      if (rainFrequencyDisplay) {
        let rainPct = state.farmLocation === 'ginger' ? 24 : state.farmLocation === 'desert' ? 0 : 13.56;
        if (state.useRainTotems && state.farmLocation !== 'desert') rainPct = 89;
        rainFrequencyDisplay.textContent = `~${rainPct}% chance of rain per day`;
      }
      updateCalculation();
    });
  }

  if (rainTotemToggle) {
    rainTotemToggle.addEventListener('change', (e) => {
      state.useRainTotems = e.target.checked;
      saveStateData();
      if (rainFrequencyDisplay) {
        let rainPct = state.farmLocation === 'ginger' ? 24 : state.farmLocation === 'desert' ? 0 : 13.56;
        if (state.useRainTotems && state.farmLocation !== 'desert') rainPct = 89;
        rainFrequencyDisplay.textContent = `~${rainPct}% chance of rain per day`;
      }
      updateCalculation();
    });
  }

  // Processing
  $$('.processing-select').forEach(sel => {
    sel.addEventListener('change', () => {
      state.processing[sel.dataset.mushroom] = sel.value;
      saveStateData();
      updateCalculation();
    });
  });

  // Clear
  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      state.grid = createEmptyGrid(state.gridWidth, state.gridHeight);
      state.lastResults = null;
      showMathBtn.style.display = 'none';
      renderGrid();
      saveStateData();
      resultsContent.innerHTML = `
        <div class="empty-state">
          <div class="icon">🍄</div>
          <p>Place some mushroom logs and trees on the grid and production will be displayed automatically.</p>
        </div>`;
    });
  }

  // Modal
  if (showMathBtn) {
    showMathBtn.addEventListener('click', () => {
      populateMathModal(state.lastResults);
      mathModal.classList.add('open');
    });
  }

  if (closeModalBtn) {
    closeModalBtn.addEventListener('click', () => {
      mathModal.classList.remove('open');
    });
  }

  if (mathModal) {
    mathModal.addEventListener('click', (e) => {
      if (e.target === mathModal) {
        mathModal.classList.remove('open');
      }
    });
  }
}

// ── Initialize ───────────────────────────────────────────────

function init() {
  initToolbar();
  setupEventListeners();

  const presets = loadPresets();
  updatePresetDropdown(presets);

  const loaded = loadStateData();
  if (loaded) {
    syncUIWithState();
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
