// ═══════════════════════════════════════════════════════════════
// UI & DOM Manipulation (View)
// ═══════════════════════════════════════════════════════════════

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

// ── DOM References ───────────────────────────────────────────
const farmGridEl = $('#farm-grid');
const resultsContent = $('#results-content');
const gridWidthInput = $('#grid-width');
const gridHeightInput = $('#grid-height');
const tileWidthInput = $('#tile-width');
const tileHeightInput = $('#tile-height');
const tileableToggle = $('#tileable-mode');
const wrapAroundToggle = $('#wrap-around');
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

// ── Grid Rendering ───────────────────────────────────────────

function renderGrid() {
  if (!farmGridEl) return;
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
        const tw = state.tileWidth;
        const th = state.tileHeight;
        if ((c + 1) % tw === 0 && c < state.gridWidth - 1) cell.classList.add('tile-border-right');
        if ((r + 1) % th === 0 && r < state.gridHeight - 1) cell.classList.add('tile-border-bottom');
      }

      renderCellContent(cell, state.grid[r][c]);

      // Callbacks defined in app.js
      if (typeof handleCellClick === 'function') {
        cell.addEventListener('mousedown', () => handleCellClick(r, c));
      }
      if (typeof handleCellHover === 'function') {
        cell.addEventListener('mouseenter', (e) => {
          if (e.buttons === 1) handleCellClick(r, c);
          handleCellHover(r, c);
        });
      }
      if (typeof handleCellLeave === 'function') {
        cell.addEventListener('mouseleave', () => handleCellLeave(r, c));
      }

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
      tapImg.src = cellData.tapper === 'heavy_tapper' ? 'assets/Heavy_Tapper.png' : 'assets/Tapper.png';
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
  if (!farmGridEl) return;
  const idx = r * state.gridWidth + c;
  const cellEl = farmGridEl.children[idx];
  if (!cellEl) return;

  cellEl.className = 'grid-cell';
  cellEl.dataset.row = r;
  cellEl.dataset.col = c;

  if (state.tileableMode) {
    const tw = state.tileWidth;
    const th = state.tileHeight;
    if ((c + 1) % tw === 0 && c < state.gridWidth - 1) cellEl.classList.add('tile-border-right');
    if ((r + 1) % th === 0 && r < state.gridHeight - 1) cellEl.classList.add('tile-border-bottom');
  }

  cellEl.innerHTML = '';
  renderCellContent(cellEl, state.grid[r][c]);
}

function highlightRange(logR, logC, on) {
  if (!farmGridEl) return;
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

function updateGridHighlighting(results) {
  if (!farmGridEl) return;

  // Clear existing unreachable flags and badges
  const cells = farmGridEl.querySelectorAll('.grid-cell');
  cells.forEach(c => {
    c.classList.remove('unreachable');
    c.classList.remove('unreachable-path');
    c.removeAttribute('title');
    const badge = c.querySelector('.tree-count-badge');
    if (badge) badge.remove();
  });

  if (results) {
    if (results.unreachableCells) {
      for (const pos of results.unreachableCells) {
        const idx = pos.r * state.gridWidth + pos.c;
        if (cells[idx]) {
          cells[idx].classList.add('unreachable');
          cells[idx].title = "Unreachable by player";
        }
      }
    }

    if (results.unreachableEmptySpaces) {
      for (const pos of results.unreachableEmptySpaces) {
        const idx = pos.r * state.gridWidth + pos.c;
        if (cells[idx]) {
          cells[idx].classList.add('unreachable-path');
          cells[idx].title = "Unreachable by player";
        }
      }
    }

    if (results.logs) {
      for (const log of results.logs) {
        const idx = log.row * state.gridWidth + log.col;
        const cellEl = cells[idx];
        if (cellEl) {
          const content = cellEl.querySelector('.cell-content.mushlog');
          if (content) {
            const badge = document.createElement('div');
            badge.className = 'tree-count-badge';
            badge.textContent = log.totalTrees;
            content.appendChild(badge);

            const img = content.querySelector('.cell-img');
            if (img) {
              if (log.totalTrees === 10) {
                img.src = 'assets/Mushroom_Log_Ready.png';
              } else {
                img.src = 'assets/Mushroom_Log.png';
              }
            }
          }
        }
      }
    }
  }
}

// ── Results Rendering ────────────────────────────────────────

function renderResults(results) {
  updateGridHighlighting(results);

  if (!resultsContent) return;
  state.lastResults = results;
  const hasTappers = results.tapperBreakdown && Object.keys(results.tapperBreakdown).length > 0;
  const inspectModeBtn = $('#inspect-mode-btn');
  if (showMathBtn) showMathBtn.style.display = (results.logCount > 0 || hasTappers) ? 'inline-flex' : 'none';
  if (inspectModeBtn) inspectModeBtn.style.display = (results.logCount > 0) ? 'inline-flex' : 'none';

  if (results.logCount === 0 && !hasTappers) {
    resultsContent.innerHTML = renderEmptyState();
    return;
  }

  const gridArea = results.gridArea || (state.gridWidth * state.gridHeight);
  let html = '';

  html += renderCombinedGold(results, hasTappers);

  if (results.logCount > 0) {
    html += renderMushroomLogsSummary(results, gridArea);
    html += renderFarmOverview(results, gridArea);
    html += renderMushroomMix(results, gridArea);
    html += renderProcessingRequirements(results);
  }

  if (hasTappers) {
    html += renderTappersSummary(results);
  }

  resultsContent.innerHTML = html;
}

function renderEmptyState() {
  return `
    <div class="empty-state">
      <img src="assets/Mushroom_Log.png" class="icon" alt="Log" style="width: 48px; height: 48px; object-fit: contain; image-rendering: pixelated;">
      <p>No mushroom logs or tappers found. Place some logs near trees or tappers on trees to see production stats.</p>
    </div>`;
}

function renderCombinedGold(results, hasTappers) {
  if (results.logCount === 0 && !hasTappers) return '';
  const combined = (results.totalGoldPerYear || 0) + (results.totalTapperGoldPerYear || 0);
  return `
    <div class="results-section combined-gold-card">
      <div style="display: flex; justify-content: space-between; align-items: center; padding: 4px;">
        <span class="combined-gold-label">Combined Gold / Year</span>
        <span class="combined-gold-value">${formatGold(combined)}</span>
      </div>
    </div>
  `;
}

function renderMushroomLogsSummary(results, gridArea) {
  const goldPerDay = results.totalGoldPerYear / DAYS_PER_YEAR;
  return `
    <div class="section-header" style="display:flex; align-items:center;">
      <img src="assets/Mushroom_Log.png" class="header-icon" style="margin-right:8px;"> MUSHROOM LOGS
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
        <div class="stat-subtext">${formatGold(goldPerDay / gridArea)} / tile</div>
      </div>
      <div class="gold-summary" style="flex:1; margin-bottom:0; padding:16px 12px;">
        <div class="big-number" style="font-size:1.3rem;">${formatGold(results.totalGoldPerYear)}</div>
        <div class="big-label" style="font-size:0.7rem;">Gold / Year</div>
        <div class="stat-subtext">${formatGold(results.totalGoldPerYear / gridArea)} / tile</div>
      </div>
    </div>
  `;
}

function renderFarmOverview(results, gridArea) {
  const emptyPct = ((results.emptyCount / gridArea) * 100).toFixed(1);
  const logPct = ((results.logCount / gridArea) * 100).toFixed(1);
  const treePct = ((results.treeCount / gridArea) * 100).toFixed(1);

  let html = `
    <div class="results-section" style="margin-top:14px">
      <h3 style="display:flex; align-items:center;"><img src="assets/Farm_Computer.png" class="header-icon"> FARM OVERVIEW</h3>
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
      <div class="stat-row vertical">
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
          <div class="stat-row mini">
            <span class="stat-label">
              <img src="${tInfo.emoji}" style="width:16px; height:16px; object-fit:contain;"> ${tInfo.name}
            </span>
            <span class="stat-value">${tCount}</span>
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
      <div class="stat-row">
        <span class="stat-label">Avg. harvest interval</span>
        <span class="stat-value">${results.avgCycleDays.toFixed(1)} days</span>
      </div>
      <div class="stat-row">
        <span class="stat-label">Harvests / year</span>
        <span class="stat-value">${results.totalHarvests}</span>
      </div>
    </div>
  `;
  return html;
}

function renderMushroomMix(results, gridArea) {
  const aggTypeProbs = { common: 0, red: 0, morel: 0, chanterelle: 0, purple: 0 };
  let aggExpectedQty = 0;

  for (const log of results.logs) {
    for (const [mtype, prob] of Object.entries(log.typeProbs)) {
      aggTypeProbs[mtype] += prob * log.expectedQty;
    }
    aggExpectedQty += log.expectedQty;
  }

  let html = `
    <div class="results-section">
      <h3 style="display:flex; align-items:center;"><img src="assets/Mushroom_Log_Ready.png" class="header-icon"> MUSHROOM MIX (AVG/HARVEST)</h3>
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
          <div class="prob-bar-fill ${mtype}" style="width:${pct}%"></div>
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
  return html;
}

function renderProcessingRequirements(results) {
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

  return `
    <div class="results-section">
      <h3 style="display:flex; align-items:center;"><img src="assets/Dehydrator.png" class="header-icon"> REQUIRED PROCESSING</h3>
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
}

function getLogSignature(log) {
  const sortedTrees = Object.keys(log.nearbyTreeCounts || {}).sort().map(k => `${k}:${log.nearbyTreeCounts[k]}`).join(',');
  return `${log.totalTrees}-${log.mossyCount}-${JSON.stringify(log.typeProbs)}-${sortedTrees}`;
}

function generateLogDetailBodyHTML(log, coordsString, similarLogsText) {
  let html = `
          <div style="font-size:0.8rem; color:var(--text-secondary); margin-bottom:12px; line-height:1.4;">
            <strong>Located at:</strong> ${coordsString}
          </div>
          <div class="stat-row vertical">
            <span class="stat-label">Nearby trees: ${log.totalTrees} (${log.mossyCount} Mossy)</span>
            <div style="padding-left: 10px; width: 100%; margin-top: 4px;">
              ${Object.entries(log.nearbyTreeCounts || {}).map(([tType, tCount]) => {
      const tInfo = TREE_TYPES[tType];
      if (!tInfo) return '';
      return `
                  <div class="stat-row mini">
                    <span class="stat-label">
                      <img src="${tInfo.emoji}" style="width:16px; height:16px; object-fit:contain;"> ${tInfo.name}
                    </span>
                    <span class="stat-value">${tCount}</span>
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
            <div style="font-size:0.85rem; color:var(--text-secondary); margin-bottom:4px;">Quality distribution:</div>
            <div class="quality-row">
  `;
  for (let q = 0; q < 4; q++) {
    html += `<span class="quality-badge ${QUALITY_CLASSES[q]}">${QUALITY_NAMES[q]} ${(log.qualProbs[q] * 100).toFixed(1)}%</span>`;
  }
  html += `</div></div>`;

  html += `<div style="margin-top:12px">`;
  for (const [mtype, prob] of Object.entries(log.typeProbs)) {
    if (prob === 0) continue;
    const data = MUSHROOM_DATA[mtype];
    html += `
        <div class="prob-bar-container">
          <div class="prob-bar-label">
            <span class="name"><img src="${data.emoji}" class="result-icon"> ${data.name}</span>
            <span class="pct">${(prob * 100).toFixed(1)}%</span>
          </div>
          <div class="prob-bar"><div class="prob-bar-fill ${mtype}" style="width:${prob * 100}%"></div></div>
        </div>
    `;
  }
  if (similarLogsText) {
    html += `
      <div style="margin-top:12px; font-size:0.8rem; color:var(--text-secondary); border-top:1px solid rgba(255,255,255,0.2); padding-top:8px;">
        <strong>Similar logs:</strong> ${similarLogsText}
      </div>
    `;
  }
  html += `</div>`;
  return html;
}



function renderTappersSummary(results) {
  let html = `
    <div class="section-header" style="display:flex; align-items:center;">
      <img src="assets/Tapper.png" class="header-icon" style="margin-right:8px;"> TAPPERS
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
  return html;
}

function formatGold(amount) {
  return Math.round(amount).toLocaleString() + 'g';
}

let currentInspectDismissListener = null;
let currentInspectCellEl = null;

function inspectLog(r, c) {
  if (!state.lastResults || !state.lastResults.logs) return;
  const log = state.lastResults.logs.find(l => l.row === r && l.col === c);
  if (!log) return;

  const tooltip = $('#inspect-tooltip');
  if (!tooltip) return;

  const targetSig = getLogSignature(log);
  const similarCoords = [];
  for (const l of state.lastResults.logs) {
    if (getLogSignature(l) === targetSig) {
      similarCoords.push(`(${l.row},${l.col})`);
    }
  }

  let similarLogsText = '';
  if (similarCoords.length > 1) {
    similarLogsText = `${similarCoords.length} logs at ${similarCoords.join(', ')}`;
  }

  tooltip.innerHTML = generateLogDetailBodyHTML(log, `(${r}, ${c})`, similarLogsText);
  tooltip.classList.remove('hidden');

  // Position the tooltip near the cell
  const gridW = state.gridWidth;
  const idx = r * gridW + c;
  const cells = farmGridEl.querySelectorAll('.grid-cell');
  const cellEl = cells[idx];
  if (cellEl) {
    const rect = cellEl.getBoundingClientRect();
    let left = rect.right + 10;
    let top = rect.top;
    
    if (left + 320 > window.innerWidth) {
      left = rect.left - 330;
    }
    if (top + tooltip.offsetHeight > window.innerHeight) {
      top = window.innerHeight - tooltip.offsetHeight - 10;
    }
    
    tooltip.style.left = `${Math.max(10, left) + window.scrollX}px`;
    tooltip.style.top = `${Math.max(10, top) + window.scrollY}px`;

    if (currentInspectCellEl) {
      currentInspectCellEl.classList.remove('inspect-highlight');
    }
    currentInspectCellEl = cellEl;
    currentInspectCellEl.classList.add('inspect-highlight');
  }

  // Remove any existing dismiss listener to prevent immediate closure on bubble
  if (currentInspectDismissListener) {
    document.removeEventListener('mousedown', currentInspectDismissListener);
  }

  currentInspectDismissListener = (e) => {
    if (!tooltip.contains(e.target)) {
      closeInspectTooltip();
    }
  };

  // Set up global click to dismiss after the current event loop
  setTimeout(() => {
    document.addEventListener('mousedown', currentInspectDismissListener);
  }, 0);
}

function closeInspectTooltip() {
  const tooltip = $('#inspect-tooltip');
  if (tooltip) tooltip.classList.add('hidden');
  if (currentInspectCellEl) {
    currentInspectCellEl.classList.remove('inspect-highlight');
    currentInspectCellEl = null;
  }
  if (currentInspectDismissListener) {
    document.removeEventListener('mousedown', currentInspectDismissListener);
    currentInspectDismissListener = null;
  }
}

function populateMathModal(results) {
  if (!results || !modalBody) return;

  let html = '';

  if (state.farmLocation === 'desert') {
    html += `
    <h3>1. Harvest Frequency</h3>
    <ul>
      <li><strong>Location:</strong> Calico Desert (it never rains)</li>
      <li><strong>Result:</strong> Harvest interval is always exactly <code>${BASE_HARVEST_CYCLE_DAYS} days</code>.</li>
      <li><strong>Yearly Yield:</strong> ${DAYS_PER_YEAR} days / ${BASE_HARVEST_CYCLE_DAYS} = <code>${DAYS_PER_YEAR / BASE_HARVEST_CYCLE_DAYS} harvests per year</code>.</li>
    </ul>
    `;
  } else {
    const loc = state.farmLocation === 'ginger' ? 'Ginger Island' : 'Main Farm';
    let rainProbPct = state.farmLocation === 'ginger' ? (RAIN_PROB_GINGER * 100) : (RAIN_PROB_MAIN * 100);
    const isTotem = state.useRainTotems;

    if (isTotem) {
      rainProbPct = (RAIN_PROB_TOTEM * 100);
    }

    let rainProbStr = rainProbPct.toString();

    html += `
    <h3>1. Harvest Frequency</h3>
    <ul>
      <li><strong>Base cycle:</strong> ${BASE_HARVEST_CYCLE_DAYS} days</li>
      <li><strong>Location:</strong> ${loc} (average ${rainProbStr}% chance of rain per day)
        ${!isTotem && state.farmLocation === 'main' ? `
          <ul style="margin-top:6px; margin-bottom:6px; font-size:0.85rem; opacity:0.85;">
            <li>Spring and fall have a flat 18.3% chance of rain.</li>
            <li>Summer rain odds increase daily, plus 1 guaranteed Green Rain day.</li>
            <li>Winter never has rain naturally.</li>
            <li>There is never rain on the 1st day of any season.</li>
            <li>Festival days are always sunny, overriding any weather.</li>
            <li>Averaging this out over the ${DAYS_PER_YEAR}-day year yields approximately ${RAIN_PROB_MAIN * 100}%.</li>
          </ul>
        ` : ''}
        ${isTotem ? `
          <ul style="margin-top:6px; margin-bottom:6px; font-size:0.85rem; opacity:0.85;">
            <li>Rain Totems force rain every day except on festival days and the 1st of the season.</li>
            <li>This averages out to an ${RAIN_PROB_TOTEM * 100}% chance of rain per day over the year.</li>
          </ul>
        ` : ''}
      </li>
      <li><strong>Mechanic:</strong> Each day it rains reduces the remaining harvest time by 1 day.</li>
      <li><strong>Math:</strong> The expected progress per day is <code>1 + ${rainProbStr}%</code>. The average days to reach ${BASE_HARVEST_CYCLE_DAYS} progress is <code>${BASE_HARVEST_CYCLE_DAYS} / (1 + ${rainProbStr}%)</code>.</li>
      <li><strong>Result:</strong> Average harvest interval is <code>${results.avgCycleDays.toFixed(2)} days</code>.</li>
      <li><strong>Yearly Yield:</strong> ${DAYS_PER_YEAR} days / ${results.avgCycleDays.toFixed(2)} = <code>~${results.totalHarvests} harvests per year</code>.</li>
    </ul>
    `;
  }

  html += `
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

    <h3>5. Required Processing</h3>
    <ul>
      <li><strong>Mechanic:</strong> The app calculates the number of dehydrators and preserves jars required to process the yield from each harvest before the next harvest is ready.</li>
      <li><strong>Dehydrators:</strong> A dehydrator requires 5 mushrooms of the same type and quality, and takes 1 in-game day to finish. This means 1 dehydrator processes 5 mushrooms per day.</li>
      <li><strong>Preserves Jars:</strong> A preserves jar processes 1 mushroom and takes 4000 in-game minutes (approximately 2.77 days) to finish.</li>
      <li><strong>Smart Processing:</strong> Processing high-quality mushrooms (especially purple mushrooms) can sometimes result in a <em>lower</em> sale price than selling them raw. When calculating machine requirements, the app assumes you will sell these mushrooms raw, excluding them from the machine totals.</li>
      <li><strong>Formula:</strong> The total machine-days required for the remaining yield are calculated and then divided by the <strong>Average Cycle Days</strong> (from section 1) to determine how many machines must run in parallel to keep up.</li>
    </ul>

    <h3>Mushroom Logs Are Machines</h3>
    <ul>
      <li><strong>Mushroom Logs As Machines:</strong> Mushroom logs are implemented as farm machines like kegs, furnaces, etc. and share many of the same behaviors.</li>
      <li><strong>Harvest:</strong> All the mushrooms for each harvest are of the same type and quality. This tool gives the averages over all possibilities.</li>
      <li><strong>When:</strong> Counterintuitively, these determinations are made at the time of the <em>previous harvest</em> (or when the log was placed down for the first harvest). As such, the types of mushrooms produced may be inconsistent with the types of surrounding trees, since they may have been immature at the time the products were deterimined.</li>
      <li><strong>Wiki references:</strong>
      <ul style="margin-top:6px; margin-bottom:6px; font-size:0.85rem; opacity:0.85;">
        <li><strong><a href="https://stardewvalleywiki.com/Mushroom_Log" target="_blank">Mushroom Log</a></strong></li>
        <li><strong><a href="https://stardewvalleywiki.com/Moss" target="_blank">Moss</a></strong></li>
        <li><strong><a href="https://stardewvalleywiki.com/Trees" target="_blank">Trees</a></strong></li>
        <li><strong><a href="https://stardewvalleywiki.com/Weather" target="_blank">Weather</a></strong></li>
        <li><strong><a href="https://stardewvalleywiki.com/Green_Rain" target="_blank">Green Rain</a></strong></li>
      </ul>
    </li>
  </ul>
  `;

  modalBody.innerHTML = html;
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
