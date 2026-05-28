// ═══════════════════════════════════════════════════════════════
// Game Logic (Core Math & Rules)
// ═══════════════════════════════════════════════════════════════

const MUSHROOM_DATA = {
  common: { name: 'Common Mushroom', basePrice: 40, emoji: 'assets/Common_Mushroom.png' },
  red: { name: 'Red Mushroom', basePrice: 75, emoji: 'assets/Red_Mushroom.png' },
  morel: { name: 'Morel', basePrice: 150, emoji: 'assets/Morel.png' },
  chanterelle: { name: 'Chanterelle', basePrice: 160, emoji: 'assets/Chanterelle.png' },
  purple: { name: 'Purple Mushroom', basePrice: 250, emoji: 'assets/Purple_Mushroom.png' },
};

// Quality multipliers: normal=1x, silver=1.25x, gold=1.5x, iridium=2x
const QUALITY_MULTIPLIERS = [1, 1.25, 1.5, 2];
const QUALITY_NAMES = ['Normal', 'Silver', 'Gold', 'Iridium'];
const QUALITY_CLASSES = ['normal', 'silver', 'gold', 'iridium'];

function getRawPrice(mushroomKey, quality) {
  const basePrice = MUSHROOM_DATA[mushroomKey].basePrice;
  const qualMult = QUALITY_MULTIPLIERS[quality];
  return Math.floor(basePrice * qualMult);
}

function getProcessedPrice(mushroomKey, processingMethod, artisanProfession) {
  if (processingMethod === 'raw' || mushroomKey === 'red') return null;

  const basePrice = MUSHROOM_DATA[mushroomKey].basePrice;
  let processedPrice = 0;

  if (processingMethod === 'preserves') {
    processedPrice = 2 * basePrice + 50;
  } else if (processingMethod === 'dehydrator') {
    processedPrice = (basePrice * 7.5 + 25) / 5;
  }

  if (artisanProfession) {
    processedPrice = Math.floor(processedPrice * 1.4);
  }

  return processedPrice;
}

function getProcessingDecision(mushroomKey, quality, processingMethod, artisanProfession) {
  const rawPrice = getRawPrice(mushroomKey, quality);
  const processedPrice = getProcessedPrice(mushroomKey, processingMethod, artisanProfession);

  if (processedPrice !== null && processedPrice > rawPrice) {
    return { price: processedPrice, actualProc: processingMethod };
  } else {
    return { price: rawPrice, actualProc: 'raw' };
  }
}

// Tree types and their mushroom contributions
const TREE_TYPES = {
  oak: { name: 'Oak Tree', emoji: 'assets/Acorn.png', mushroomYield: { morel: 1.0 }, tapper: { name: 'Oak Resin', price: 150, tapperDays: 7, heavyTapperDays: 3, winter: true } },
  maple: { name: 'Maple Tree', emoji: 'assets/Maple_Seed.png', mushroomYield: { red: 0.9, purple: 0.1 }, tapper: { name: 'Maple Syrup', price: 200, tapperDays: 9, heavyTapperDays: 4, winter: true } },
  pine: { name: 'Pine Tree', emoji: 'assets/Pine_Cone.png', mushroomYield: { chanterelle: 1.0 }, tapper: { name: 'Pine Tar', price: 100, tapperDays: 5, heavyTapperDays: 2, winter: true } },
  mystic: { name: 'Mystic Tree', emoji: 'assets/Mystic_Tree_Seed.png', mushroomYield: { purple: 1.0 }, noMoss: true, tapper: { name: 'Mystic Syrup', price: 1000, tapperDays: 7, heavyTapperDays: 3, winter: true } },
  mahogany: { name: 'Mahogany Tree', emoji: 'assets/Mahogany_Seed.png', mushroomYield: null, tapper: { name: 'Sap', price: 2, tapperDays: 1, heavyTapperDays: 1, winter: true } },
  mushroom: { name: 'Mushroom Tree', emoji: 'assets/Mushroom_Tree.png', mushroomYield: null, noMoss: true, tapper: { name: 'Mushrooms (Mixed)', price: 65, tapperDays: 2.15, heavyTapperDays: 2.15, winter: false } },
  green_rain: { name: 'Green Rain Tree (Type 3)', emoji: 'assets/Green_Rain_Tree_3.png', mushroomYield: null, noMoss: true, tapper: { name: 'Fiddlehead Fern', price: 90, tapperDays: 1, heavyTapperDays: 1, winter: false } },
};

const CELL_EMPTY = 0;
const CELL_TREE = 1;
const CELL_MUSHLOG = 2;

// ── Constants ────────────────────────────────────────────────
const DAYS_PER_YEAR = 112;
const DAYS_PER_YEAR_NO_WINTER = 84;
const BASE_HARVEST_CYCLE_DAYS = 4;
const RAIN_PROB_GINGER = 0.24;
const RAIN_PROB_MAIN = 0.1356;
const RAIN_PROB_TOTEM = 0.89;

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

      if (config.wrapAround) {
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

  // ── Quantity ──
  // floor(totalTrees / 2) * random(1 or 2), clamped to [1, 5]
  // Expected value: floor(totalTrees/2) * 1.5, clamped
  const halfTrees = Math.floor(totalTrees / 2);
  const qtyLow = Math.max(1, Math.min(5, halfTrees * 1));
  const qtyHigh = Math.max(1, Math.min(5, halfTrees * 2));
  const expectedQty = (qtyLow + qtyHigh) / 2;

  // ── Mushroom Type Distribution ──
  const basicCount = Math.max(1, Math.floor(totalTrees * 3 / 4));
  const typeProbs = { common: 0, red: 0, morel: 0, chanterelle: 0, purple: 0 };

  const basicCommon = 0.8075;
  const basicRed = 0.1425;
  const basicPurple = 0.05;

  typeProbs.common += basicCount * basicCommon;
  typeProbs.red += basicCount * basicRed;
  typeProbs.purple += basicCount * basicPurple;

  // Per-tree contributions
  for (const tree of trees) {
    const treeInfo = TREE_TYPES[tree.treeType];
    if (!treeInfo) continue;

    if (!treeInfo.mushroomYield) {
      typeProbs.common += basicCommon;
      typeProbs.red += basicRed;
      typeProbs.purple += basicPurple;
    } else {
      for (const [mtype, prob] of Object.entries(treeInfo.mushroomYield)) {
        typeProbs[mtype] += prob;
      }
    }
  }

  // Normalize
  const totalWeight = Object.values(typeProbs).reduce((a, b) => a + b, 0);
  for (const key of Object.keys(typeProbs)) {
    typeProbs[key] = totalWeight > 0 ? typeProbs[key] / totalWeight : 0;
  }

  // ── Quality Distribution ──
  const mossyCount = trees.filter(t => t.hasMoss).length;
  const treeMossCount = totalTrees + mossyCount;

  const upgradeChance = Math.min(1, treeMossCount / 40);

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
  const { emptyCount, treeCount, treeCountsByType, rawLogs, reachableEmpty, unreachableCells } = analyzeMushroomGrid(config);
  const { avgCycleDays, totalHarvests } = calculateHarvestTiming(config);

  const logEcon = calculateLogEconomics(rawLogs, avgCycleDays, config);
  const tapperEcon = calculateTapperEconomics(config, avgCycleDays, reachableEmpty);

  const allUnreachable = [...unreachableCells, ...tapperEcon.unreachableTappers];

  const unreachableEmptySpaces = [];
  const emptySpaceSet = new Set();

  for (const cell of allUnreachable) {
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (dr === 0 && dc === 0) continue;
        const nr = cell.r + dr;
        const nc = cell.c + dc;
        if (nr >= 0 && nr < config.gridHeight && nc >= 0 && nc < config.gridWidth) {
           if (config.grid[nr][nc].type === CELL_EMPTY) {
             const key = `${nr},${nc}`;
             if (!emptySpaceSet.has(key)) {
               emptySpaceSet.add(key);
               unreachableEmptySpaces.push({ r: nr, c: nc });
             }
           }
        }
      }
    }
  }

  return {
    emptyCount,
    treeCount,
    treeCountsByType,
    gridArea: config.gridWidth * config.gridHeight,
    logs: logEcon.perLogResults,
    logCount: rawLogs.length,
    totalGoldPerHarvest: logEcon.totalGoldPerHarvest,
    totalHarvests,
    avgCycleDays,
    totalGoldPerYear: logEcon.totalGoldPerHarvest * totalHarvests,
    dehydratorsRequired: logEcon.dehydratorsRequired,
    jarsRequired: logEcon.jarsRequired,
    totalTapperGoldPerYear: tapperEcon.totalTapperGoldPerYear,
    tapperBreakdown: tapperEcon.tapperBreakdown,
    unreachableCells: allUnreachable,
    unreachableEmptySpaces,
  };
}

function calculateReachableSpaces(grid, w, h) {
  const reachable = Array(h).fill(false).map(() => Array(w).fill(false));
  const queue = [];

  for (let r = 0; r < h; r++) {
    for (let c = 0; c < w; c++) {
      if (r === 0 || r === h - 1 || c === 0 || c === w - 1) {
        if (grid[r][c].type === CELL_EMPTY) {
          reachable[r][c] = true;
          queue.push({ r, c });
        }
      }
    }
  }

  let head = 0;
  while (head < queue.length) {
    const { r, c } = queue[head++];
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (dr === 0 && dc === 0) continue;
        const nr = r + dr;
        const nc = c + dc;
        if (nr >= 0 && nr < h && nc >= 0 && nc < w) {
          if (grid[nr][nc].type === CELL_EMPTY && !reachable[nr][nc]) {
            reachable[nr][nc] = true;
            queue.push({ r: nr, c: nc });
          }
        }
      }
    }
  }

  return reachable;
}

function analyzeMushroomGrid(config) {
  const { grid, gridWidth: w, gridHeight: h } = config;
  const rawLogs = [];
  const unreachableCells = [];
  let emptyCount = 0;
  let treeCount = 0;
  const treeCountsByType = {};

  const reachableEmpty = calculateReachableSpaces(grid, w, h);

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

        let unreachable = true;
        if (r === 0 || r === h - 1 || c === 0 || c === w - 1) {
          unreachable = false;
        } else {
          for (let dr = -1; dr <= 1; dr++) {
            for (let dc = -1; dc <= 1; dc++) {
              if (dr === 0 && dc === 0) continue;
              if (reachableEmpty[r + dr][c + dc]) unreachable = false;
            }
          }
        }

        if (unreachable) unreachableCells.push({ r, c });
        rawLogs.push({ row: r, col: c, unreachable, ...result });
      }
    }
  }

  return { emptyCount, treeCount, treeCountsByType, rawLogs, reachableEmpty, unreachableCells };
}

function calculateHarvestTiming(config) {
  let rainProb = config.farmLocation === 'ginger' ? RAIN_PROB_GINGER : config.farmLocation === 'desert' ? 0 : RAIN_PROB_MAIN;
  if (config.useRainTotems && config.farmLocation !== 'desert') {
    rainProb = RAIN_PROB_TOTEM;
  }
  const avgCycleDays = BASE_HARVEST_CYCLE_DAYS / (1 + rainProb);
  const totalHarvests = Math.floor(DAYS_PER_YEAR / avgCycleDays);
  return { avgCycleDays, totalHarvests };
}

function calculateLogEconomics(rawLogs, avgCycleDays, config) {
  let totalGoldPerHarvest = 0;
  let totalDehydratorMushrooms = 0;
  let totalPickleMushrooms = 0;
  const perLogResults = [];

  for (const log of rawLogs) {
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

  return { perLogResults, totalGoldPerHarvest, dehydratorsRequired, jarsRequired };
}

function calculateTapperEconomics(config, avgCycleDays, reachableEmpty) {
  const { grid, gridWidth: w, gridHeight: h } = config;
  let totalTapperGoldPerYear = 0;
  const tapperBreakdown = {};
  const unreachableTappers = [];

  for (let r = 0; r < h; r++) {
    for (let c = 0; c < w; c++) {
      const cell = grid[r][c];
      if (cell.type === CELL_TREE && cell.tapper) {
        const treeInfo = TREE_TYPES[cell.treeType];
        const tapperData = treeInfo.tapper;
        if (!tapperData) continue;

        let unreachable = true;
        if (r === 0 || r === h - 1 || c === 0 || c === w - 1) {
          unreachable = false;
        } else {
          for (let dr = -1; dr <= 1; dr++) {
            for (let dc = -1; dc <= 1; dc++) {
              if (dr === 0 && dc === 0) continue;
              if (reachableEmpty[r + dr][c + dc]) unreachable = false;
            }
          }
        }
        if (unreachable) unreachableTappers.push({ r, c });

        const isHeavy = cell.tapper === 'heavy_tapper';
        const tapperName = isHeavy ? 'Heavy Tapper' : 'Tapper';
        const tapperDays = isHeavy ? tapperData.heavyTapperDays : tapperData.tapperDays;
        const activeDaysPerYear = tapperData.winter ? DAYS_PER_YEAR : DAYS_PER_YEAR_NO_WINTER;

        let harvestsPerYear = 0;
        if (config.syncTappers) {
          const numMushroomCyclesForTapper = Math.ceil(tapperDays / avgCycleDays);
          const mushroomRunsInActivePeriod = Math.floor(activeDaysPerYear / avgCycleDays);
          harvestsPerYear = Math.floor(mushroomRunsInActivePeriod / numMushroomCyclesForTapper);
        } else {
          harvestsPerYear = Math.floor(activeDaysPerYear / tapperDays);
        }

        let price = tapperData.price;
        if (config.tapperProfession && ['Maple Syrup', 'Oak Resin', 'Pine Tar', 'Mystic Syrup'].includes(tapperData.name)) {
          price = Math.floor(price * 1.25);
        }

        const gold = harvestsPerYear * price;
        totalTapperGoldPerYear += gold;

        const breakdownKey = `${treeInfo.name} (${cell.tapper === 'heavy_tapper' ? 'Heavy' : 'Normal'} Tapper)`;
        if (!tapperBreakdown[breakdownKey]) {
          tapperBreakdown[breakdownKey] = { tapperCount: 0, productName: tapperData.name, totalHarvestsPerYear: 0, totalGold: 0 };
        }
        tapperBreakdown[breakdownKey].tapperCount++;
        tapperBreakdown[breakdownKey].totalHarvestsPerYear += harvestsPerYear;
        tapperBreakdown[breakdownKey].totalGold += gold;
      }
    }
  }

  return { totalTapperGoldPerYear, tapperBreakdown, unreachableTappers };
}
