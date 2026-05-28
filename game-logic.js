// ═══════════════════════════════════════════════════════════════
// Game Logic (Core Math & Rules)
// ═══════════════════════════════════════════════════════════════

const MUSHROOM_DATA = {
  common: { name: 'Common Mushroom', basePrice: 40, color: 'common', emoji: 'assets/Common_Mushroom.png' },
  red: { name: 'Red Mushroom', basePrice: 75, color: 'red', emoji: 'assets/Red_Mushroom.png' },
  morel: { name: 'Morel', basePrice: 150, color: 'morel', emoji: 'assets/Morel.png' },
  chanterelle: { name: 'Chanterelle', basePrice: 160, color: 'chanterelle', emoji: 'assets/Chanterelle.png' },
  purple: { name: 'Purple Mushroom', basePrice: 250, color: 'purple', emoji: 'assets/Purple_Mushroom.png' },
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
  oak: { name: 'Oak Tree', emoji: 'assets/Acorn.png', mushroomType: 'morel', tapper: { name: 'Oak Resin', price: 150, tapperDays: 7, heavyTapperDays: 3, winter: true } },
  // Note: Maple trees have a hardcoded 90% Red / 10% Purple split in calculateMushroomLog()
  maple: { name: 'Maple Tree', emoji: 'assets/Maple_Seed.png', mushroomType: 'red', tapper: { name: 'Maple Syrup', price: 200, tapperDays: 9, heavyTapperDays: 4, winter: true } },
  pine: { name: 'Pine Tree', emoji: 'assets/Pine_Cone.png', mushroomType: 'chanterelle', tapper: { name: 'Pine Tar', price: 100, tapperDays: 5, heavyTapperDays: 2, winter: true } },
  mystic: { name: 'Mystic Tree', emoji: 'assets/Mystic_Tree_Seed.png', mushroomType: 'purple', noMoss: true, tapper: { name: 'Mystic Syrup', price: 1000, tapperDays: 7, heavyTapperDays: 3, winter: true } },
  mahogany: { name: 'Mahogany Tree', emoji: 'assets/Mahogany_Seed.png', mushroomType: null, tapper: { name: 'Sap', price: 2, tapperDays: 1, heavyTapperDays: 1, winter: true } },
  mushroom: { name: 'Mushroom Tree', emoji: 'assets/Mushroom_Tree.png', mushroomType: null, noMoss: true, tapper: { name: 'Mushrooms (Mixed)', price: 65, tapperDays: 2.15, heavyTapperDays: 2.15, winter: false } },
  green_rain: { name: 'Green Rain Tree (Type 3)', emoji: 'assets/Green_Rain_Tree_3.png', mushroomType: null, noMoss: true, tapper: { name: 'Fiddlehead Fern', price: 90, tapperDays: 1, heavyTapperDays: 1, winter: false } },
};

const CELL_EMPTY = 0;
const CELL_TREE = 1;
const CELL_MUSHLOG = 2;

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

    if (treeInfo.mushroomType === null) {
      typeProbs.common += basicCommon;
      typeProbs.red += basicRed;
      typeProbs.purple += basicPurple;
    } else if (tree.treeType === 'maple') {
      typeProbs.red += 0.9;
      typeProbs.purple += 0.1;
    } else {
      typeProbs[treeInfo.mushroomType] += 1.0;
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
  const grid = config.grid;
  const w = config.gridWidth;
  const h = config.gridHeight;
  const tileable = config.tileableMode;
  const wrapAround = config.wrapAround;

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
  const daysPerYear = 112;
  let rainProb = config.farmLocation === 'ginger' ? 0.24 : config.farmLocation === 'desert' ? 0 : 0.1356;
  if (config.useRainTotems && config.farmLocation !== 'desert') {
    rainProb = 0.89;
  }

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
        const tapperData = treeInfo.tapper;
        if (!tapperData) continue;
        const isHeavy = cell.tapper === 'heavy_tapper';
        const tapperName = isHeavy ? 'Heavy Tapper' : 'Tapper';
        const tapperDays = isHeavy ? tapperData.heavyTapperDays : tapperData.tapperDays;
        const activeDaysPerYear = tapperData.winter ? 112 : 84;

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
