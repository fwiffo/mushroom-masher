// Custom Minimal Test Runner
const testResults = document.getElementById('test-results');
const testSummary = document.getElementById('test-summary');
let passCount = 0;
let failCount = 0;

function describe(name, fn) {
  const div = document.createElement('div');
  div.className = 'suite';
  div.textContent = `▶ ${name}`;
  testResults.appendChild(div);
  try {
    fn();
  } catch (e) {
    console.error(e);
  }
}

function it(desc, fn) {
  try {
    fn();
    passCount++;
    const res = document.createElement('div');
    res.className = 'pass';
    res.textContent = `  ✓ ${desc}`;
    testResults.appendChild(res);
  } catch (e) {
    failCount++;
    const res = document.createElement('div');
    res.className = 'fail';
    res.textContent = `  ✗ ${desc}\n      ${e.message}`;
    testResults.appendChild(res);
  }
}

function assertEqual(actual, expected, msg) {
  // Simple deep equals for arrays/objects
  const aStr = JSON.stringify(actual);
  const eStr = JSON.stringify(expected);
  if (aStr !== eStr) {
    throw new Error(`${msg || 'Assertion failed'}: expected ${eStr}, got ${aStr}`);
  }
}

function assertClose(actual, expected, epsilon = 0.0001, msg) {
  if (Math.abs(actual - expected) > epsilon) {
    throw new Error(`${msg || 'Assertion failed'}: expected ~${expected}, got ${actual}`);
  }
}

// Ensure the app.js is initialized before running tests
setTimeout(() => {
  runTests();
  testSummary.textContent = `Tests completed. Passed: ${passCount}, Failed: ${failCount}`;
  testSummary.style.color = failCount > 0 ? '#f87171' : '#4ade80';
}, 500);

function runTests() {
  describe('getRawPrice() - Base Pricing Logic', () => {
    it('calculates raw price correctly based on quality', () => {
      // Common mushroom basePrice=40
      assertEqual(getRawPrice('common', 0), 40);
      // Iridium common (40 * 2 = 80)
      assertEqual(getRawPrice('common', 3), 80);
    });
  });

  describe('getProcessedPrice() - Machine Pricing Logic', () => {
    it('returns null for raw or red mushroom processing', () => {
      assertEqual(getProcessedPrice('common', 'raw', false), null);
      assertEqual(getProcessedPrice('red', 'preserves', false), null);
    });

    it('returns Dehydrator pricing correctly', () => {
      // Common dehydrated: (40*7.5 + 25)/5 = 325/5 = 65
      assertEqual(getProcessedPrice('common', 'dehydrator', false), 65);
    });

    it('returns Preserves Jar pricing correctly', () => {
      // Morel preserves: 150*2 + 50 = 350
      assertEqual(getProcessedPrice('morel', 'preserves', false), 350);
    });

    it('applies Artisan Profession bonus', () => {
      // Morel preserves + artisan: floor(350 * 1.4) = 489 (due to JS float math)
      assertEqual(getProcessedPrice('morel', 'preserves', true), 489);
    });
  });

  describe('getProcessingDecision() - Final Output Decision', () => {
    it('chooses processing if processed price is higher', () => {
      // Common dehydrator = 65 vs raw = 40
      const dec = getProcessingDecision('common', 0, 'dehydrator', false);
      assertEqual(dec, { price: 65, actualProc: 'dehydrator' });
    });

    it('bypasses processing if raw sells for more', () => {
      // Iridium Purple Mushroom raw = 250 * 2 = 500
      // Purple dehydrated = (250*7.5 + 25)/5 = 380
      // 500 > 380, so it should choose raw automatically
      const dec = getProcessingDecision('purple', 3, 'dehydrator', false);
      assertEqual(dec, { price: 500, actualProc: 'raw' });
    });

    it('never processes red mushrooms', () => {
      // Red basePrice=75. Dehydrated/Preserves normally don't accept it.
      // Our logic forces raw.
      const dec = getProcessingDecision('red', 0, 'preserves', false);
      assertEqual(dec, { price: 75, actualProc: 'raw' });
    });
  });

  describe('getNearbyCells() - Proximity Search', () => {
    it('extracts exactly 48 cells in a 7x7 grid without center cell', () => {
      const mockGrid = Array.from({ length: 10 }, () => Array(10).fill({ type: CELL_EMPTY }));
      const config = { wrapAround: false, tileableMode: false };
      const nearby = getNearbyCells(mockGrid, 5, 5, 10, 10, config);
      assertEqual(nearby.length, 48); // 7x7 - 1 = 48
    });

    it('clamps to boundaries when non-infinite', () => {
      const mockGrid = Array.from({ length: 10 }, () => Array(10).fill({ type: CELL_EMPTY }));
      const config = { wrapAround: false, tileableMode: false };
      const nearby = getNearbyCells(mockGrid, 0, 0, 10, 10, config);
      assertEqual(nearby.length, 15);
    });

    it('wraps infinitely when tileable', () => {
      const mockGrid = Array.from({ length: 7 }, () => Array(7).fill({ type: CELL_EMPTY }));
      // At corner 0,0 with tileable mode, it should find exactly 48 cells (since a 7x7 grid tileably wraps perfectly)
      const config = { wrapAround: true, tileableMode: true, tileWidth: 7, tileHeight: 7 };
      const nearby = getNearbyCells(mockGrid, 0, 0, 7, 7, config);
      assertEqual(nearby.length, 48);
    });
  });

  describe('calculateMushroomLog() - Probability & Yield Math', () => {
    it('returns expected zero state when no trees nearby', () => {
      const mockGrid = Array.from({ length: 7 }, () => Array(7).fill({ type: CELL_EMPTY }));
      const config = { wrapAround: false, tileableMode: false };
      const res = calculateMushroomLog(mockGrid, 3, 3, 7, 7, config);
      assertEqual(res.totalTrees, 0);
      assertEqual(res.expectedQty, 1); // math.max(1, 0*1.5) -> clamped low 1, high 1, avg 1
      assertEqual(res.upgradeChance, 0);
    });

    it('calculates upgrade chance perfectly', () => {
      const mockGrid = Array.from({ length: 7 }, () => Array(7).fill({ type: CELL_EMPTY }));
      // Put 5 trees around it, 2 of them mossy
      mockGrid[2][3] = { type: CELL_TREE, treeType: 'oak', hasMoss: true };
      mockGrid[2][4] = { type: CELL_TREE, treeType: 'oak', hasMoss: true };
      mockGrid[3][2] = { type: CELL_TREE, treeType: 'pine', hasMoss: false };
      mockGrid[4][3] = { type: CELL_TREE, treeType: 'maple', hasMoss: false };
      mockGrid[4][4] = { type: CELL_TREE, treeType: 'mystic', hasMoss: false };
      const config = { wrapAround: false, tileableMode: false };
      const res = calculateMushroomLog(mockGrid, 3, 3, 7, 7, config);

      assertEqual(res.totalTrees, 5);
      assertEqual(res.mossyCount, 2);
      // treeMossCount = 5 + 2 = 7
      // upgradeChance = 7 / 40 = 0.175
      assertEqual(res.upgradeChance, 0.175);

      // Verify P(base)
      assertClose(res.qualProbs[0], 1 - 0.175);
    });

    it('computes correct quantity based on trees', () => {
      const mockGrid = Array.from({ length: 7 }, () => Array(7).fill({ type: CELL_EMPTY }));
      // 8 trees -> halfTrees = 4.
      // qtyLow = min(5, 4*1) = 4
      // qtyHigh = min(5, 4*2) = 5
      // expected = 4.5
      // Place 8 distinct trees around the log at (3,3)
      const treeCoords = [[1, 1], [1, 2], [1, 3], [1, 4], [2, 1], [2, 2], [2, 3], [2, 4]];
      for (const [r, c] of treeCoords) {
        mockGrid[r][c] = { type: CELL_TREE, treeType: 'oak', hasMoss: false };
      }
      const config = { wrapAround: false, tileableMode: false };
      const res = calculateMushroomLog(mockGrid, 3, 3, 7, 7, config);
      assertEqual(res.expectedQty, 4.5);
    });

    it('correctly weighs mushroom type distributions', () => {
      const mockGrid = Array.from({ length: 7 }, () => Array(7).fill({ type: CELL_EMPTY }));
      // 1 Pine Tree (chanterelle)
      mockGrid[2][3] = { type: CELL_TREE, treeType: 'pine', hasMoss: false };
      const config = { wrapAround: false, tileableMode: false };
      const res = calculateMushroomLog(mockGrid, 3, 3, 7, 7, config);
      // Basic Count = max(1, floor(1 * 0.75)) = 1
      // Total entries = 1 basic + 1 pine = 2
      // common = 0.8075 / 2
      // red = 0.1425 / 2
      // purple = 0.05 / 2
      // chanterelle = 1 / 2
      assertClose(res.typeProbs.common, 0.8075 / 2);
      assertClose(res.typeProbs.chanterelle, 0.5);
    });
  });

  describe('calculateFarm() - Total Yield Aggregation', () => {
    it('aggregates total gold correctly across logs', () => {
      // Reset state for clear testing
      state.gridWidth = 7;
      state.gridHeight = 7;
      state.grid = Array.from({ length: 7 }, () => Array(7).fill({ type: CELL_EMPTY }));

      // Place 1 tree and 2 logs
      state.grid[3][3] = { type: CELL_TREE, treeType: 'oak', hasMoss: false }; // Oak = Morel
      state.grid[3][2] = { type: CELL_MUSHLOG, treeType: null, hasMoss: false };
      state.grid[3][4] = { type: CELL_MUSHLOG, treeType: null, hasMoss: false };

      const config = {
        grid: state.grid,
        gridWidth: 7,
        gridHeight: 7,
        tileableMode: false,
        wrapAround: false,
        farmLocation: 'main',
        useRainTotems: false,
        artisanProfession: false,
        processing: { common: 'raw', red: 'raw', morel: 'dehydrator', chanterelle: 'raw', purple: 'raw' }
      };

      const farmRes = calculateFarm(config);
      assertEqual(farmRes.logCount, 2);

      // Validate morel count: 1 (qty) * 2 (logs) * 0.5 (prob) = 1.0 expected morels/harvest
      let totalMorels = 0;
      for (const log of farmRes.logs) {
        if (log.breakdown.morel) totalMorels += log.breakdown.morel.expectedCount;
      }
      assertClose(totalMorels, 1.0);
    });

    it('calculates average cycle days based on rain totems', () => {
      const config = {
        grid: Array.from({ length: 1 }, () => Array(1).fill({ type: CELL_EMPTY })),
        gridWidth: 1, gridHeight: 1,
        farmLocation: 'main',
        useRainTotems: false
      };
      const resNormal = calculateFarm(config);
      // Without totems: avgCycleDays = 4 / (1 + 0.1356) = 3.52236
      assertClose(resNormal.avgCycleDays, 3.52236);

      config.useRainTotems = true;
      const resTotems = calculateFarm(config);
      // With totems: avgCycleDays = 4 / (1 + 0.89) = 2.11640
      assertClose(resTotems.avgCycleDays, 2.11640);
    });

    it('computes correct dehydrators and preserves jars required', () => {
      state.grid = Array.from({ length: 7 }, () => Array(7).fill({ type: CELL_EMPTY }));

      // Place 10 logs
      for (let i = 0; i < 10; i++) {
        const r = 2 + Math.floor(i / 5);
        const c = i % 5;
        state.grid[r][c] = { type: CELL_MUSHLOG, treeType: null, hasMoss: false };
      }

      // Place 10 oak trees around them (in the intersection area visible to all 10 logs)
      const treeCoords = [[0, 1], [0, 2], [0, 3], [1, 1], [1, 2], [1, 3], [4, 1], [4, 2], [5, 1], [5, 2]];
      for (const [r, c] of treeCoords) {
        state.grid[r][c] = { type: CELL_TREE, treeType: 'oak', hasMoss: false };
      }

      const config = {
        grid: state.grid,
        gridWidth: 7,
        gridHeight: 7,
        tileableMode: false,
        wrapAround: false,
        farmLocation: 'main',
        useRainTotems: true,
        artisanProfession: false,
        processing: { common: 'preserves', red: 'raw', morel: 'dehydrator', chanterelle: 'raw', purple: 'raw' }
      };

      const res = calculateFarm(config);

      // Verify math:
      // logs = 10, each sees 10 trees -> qty = 5 per log
      // weights: basic = max(1, floor(10 * 0.75)) = 7
      // total entries = 7 basic + 10 oak = 17
      // morel prob = 10 / 17
      // common prob = (7 * 0.8075) / 17

      // Expected morels per harvest = 10 logs * 5 qty * (10 / 17) = 29.4117
      // Dehydrator days = 29.4117 / 5 = 5.8823
      // avgCycleDays with totems = 4 / 1.89 = 2.1164
      // dehydratorsRequired = Math.ceil(5.8823 / 2.1164) = 3
      assertEqual(res.dehydratorsRequired, 3);

      // Expected common per harvest = 10 logs * 5 qty * (5.6525 / 17) = 16.625
      // Pickle days per jar = 4000 / (24 * 60) = 2.7777
      // Total pickle days = 16.625 * 2.7777 = 46.18
      // jarsRequired = Math.ceil(46.18 / 2.1164) = 22
      assertEqual(res.jarsRequired, 22);
    });
  });

  describe('calculateFarm() - Tappers', () => {
    it('calculates tapper yields and total gold', () => {
      const grid = Array.from({ length: 1 }, () => Array(2).fill({ type: CELL_EMPTY }));
      grid[0][0] = { type: CELL_TREE, treeType: 'oak', tapper: 'tapper' };
      grid[0][1] = { type: CELL_TREE, treeType: 'maple', tapper: 'heavy_tapper' };
      const config = {
        grid: grid, gridWidth: 2, gridHeight: 1, tileableMode: false,
        wrapAround: false, farmLocation: 'main', useRainTotems: false,
        tapperProfession: false, syncTappers: false
      };

      const res = calculateFarm(config);
      // Oak normal: winter=true -> 112 days. Oak days=7 -> 112/7 = 16 harvests. Price=150.
      // Maple heavy: winter=true -> 112 days. Maple heavy days=4 -> 112/4 = 28 harvests. Price=200.
      const breakdown = res.tapperBreakdown;
      assertEqual(breakdown['Oak Tree (Normal Tapper)'].totalHarvestsPerYear, 16);
      assertEqual(breakdown['Oak Tree (Normal Tapper)'].totalGold, 16 * 150);
      assertEqual(breakdown['Maple Tree (Heavy Tapper)'].totalHarvestsPerYear, 28);
      assertEqual(breakdown['Maple Tree (Heavy Tapper)'].totalGold, 28 * 200);
      assertEqual(res.totalTapperGoldPerYear, 16 * 150 + 28 * 200);
    });

    it('calculates sync tappers logic correctly', () => {
      const grid = Array.from({ length: 1 }, () => Array(1).fill({ type: CELL_EMPTY }));
      grid[0][0] = { type: CELL_TREE, treeType: 'oak', tapper: 'tapper' };
      const config = {
        grid: grid, gridWidth: 1, gridHeight: 1, tileableMode: false,
        wrapAround: false, farmLocation: 'main', useRainTotems: false,
        tapperProfession: false, syncTappers: true
      };
      const res = calculateFarm(config);
      // avgCycleDays = 3.522 (without totems, 1 log, no trees)
      // numMushroomCyclesForTapper = Math.ceil(7 / 3.52236) = 2
      // mushroomRunsInActivePeriod = Math.floor(112 / 3.52236) = 31
      // harvestsPerYear = Math.floor(31 / 2) = 15
      assertEqual(res.tapperBreakdown['Oak Tree (Normal Tapper)'].totalHarvestsPerYear, 15);
    });

    it('applies tapper profession correctly', () => {
      const grid = Array.from({ length: 1 }, () => Array(1).fill({ type: CELL_EMPTY }));
      grid[0][0] = { type: CELL_TREE, treeType: 'oak', tapper: 'tapper' };
      const config = {
        grid: grid, gridWidth: 1, gridHeight: 1, tileableMode: false,
        wrapAround: false, farmLocation: 'main', useRainTotems: false,
        tapperProfession: true, syncTappers: false
      };
      const res = calculateFarm(config);
      assertEqual(res.tapperBreakdown['Oak Tree (Normal Tapper)'].totalGold, 2992);
    });
  });

  describe('Grid Manipulation & Utilities', () => {
    it('createEmptyGrid() returns a 2D array of correct dimensions with empty cells', () => {
      const grid = createEmptyGrid(3, 2);
      assertEqual(grid.length, 2); // 2 rows
      assertEqual(grid[0].length, 3); // 3 cols
      assertEqual(grid[0][0].type, CELL_EMPTY);
    });

    it('resizeGridData() shrinks and expands the grid correctly without tileable wrapping', () => {
      const oldGrid = createEmptyGrid(3, 3);
      oldGrid[0][0].type = CELL_MUSHLOG;
      oldGrid[2][2].type = CELL_TREE;

      // Expand to 4x4
      const expanded = resizeGridData(oldGrid, 4, 4, false, 2, 2);
      assertEqual(expanded.length, 4);
      assertEqual(expanded[0].length, 4);
      assertEqual(expanded[0][0].type, CELL_MUSHLOG); // preserved
      assertEqual(expanded[2][2].type, CELL_TREE); // preserved
      assertEqual(expanded[3][3].type, CELL_EMPTY); // new cell

      // Shrink to 2x2
      const shrunk = resizeGridData(oldGrid, 2, 2, false, 2, 2);
      assertEqual(shrunk.length, 2);
      assertEqual(shrunk[0].length, 2);
      assertEqual(shrunk[0][0].type, CELL_MUSHLOG); // preserved
    });

    it('resizeGridData() expands using tileable pattern correctly', () => {
      const oldGrid = createEmptyGrid(2, 2);
      oldGrid[0][1].type = CELL_MUSHLOG; // Top right of the 2x2 tile is a log

      // Expand to 4x4 with tileable Mode ON and tile size 2x2
      const expanded = resizeGridData(oldGrid, 4, 4, true, 2, 2);
      assertEqual(expanded[0][1].type, CELL_MUSHLOG); // original
      assertEqual(expanded[0][3].type, CELL_MUSHLOG); // tiled
      assertEqual(expanded[2][1].type, CELL_MUSHLOG); // tiled
      assertEqual(expanded[2][3].type, CELL_MUSHLOG); // tiled
      assertEqual(expanded[1][1].type, CELL_EMPTY); // original empty
      assertEqual(expanded[3][3].type, CELL_EMPTY); // tiled empty
    });

    it('mirrorCellToTileableGridData() returns coordinates of updated tiles', () => {
      const grid = createEmptyGrid(4, 4);
      grid[0][0].type = CELL_MUSHLOG; // Change the source cell

      // We modified (0,0) in a 4x4 grid with tile dimensions 2x2.
      // This should sync to (0,2), (2,0), (2,2)
      const modified = mirrorCellToTileableGridData(grid, 4, 4, 0, 0, 2, 2);

      assertEqual(modified.length, 3);
      assertEqual(grid[0][2].type, CELL_MUSHLOG);
      assertEqual(grid[2][0].type, CELL_MUSHLOG);
      assertEqual(grid[2][2].type, CELL_MUSHLOG);
    });

    it('retileGridData() completely reshapes the grid based on the top-left tile', () => {
      const grid = createEmptyGrid(4, 4);
      grid[0][0].type = CELL_TREE;
      grid[3][3].type = CELL_MUSHLOG; // This should be overwritten

      // Retile using 2x2
      retileGridData(grid, 4, 4, 2, 2);

      assertEqual(grid[0][0].type, CELL_TREE);
      assertEqual(grid[2][2].type, CELL_TREE);
      assertEqual(grid[3][3].type, CELL_EMPTY); // Overwritten by local empty cell (1,1)
    });

    it('formatGold() adds g and commas correctly', () => {
      assertEqual(formatGold(1000), '1,000g');
      assertEqual(formatGold(1500.6), '1,501g'); // rounded
    });
  });
}
