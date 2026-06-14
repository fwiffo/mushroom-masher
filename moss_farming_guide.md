# Moss Farming Guide for Stardew Valley

Mushroom logs are expensive - they will probably be the bottleneck when
constructing a farm early game, so you might be better off sticking them between
your tapper trees rather than going through a lot of effort to make a space
efficient farm. Late-game, mystic trees will probably be the bottleneck, so
crowding as many logs around them as possible will become more important.

Acquiring hardwood is straightforward, but getting a lot of moss is hard. This
guide tries to help with that. I also recommend [this moss farm video by
KitaDollx](https://www.youtube.com/watch?v=tWXZi91ahts).

## Basics of Harvesting Moss

Moss grows on the trunks of oak, pine, maple, and the green rain trees type 1
and 2. It does not grow on fruit trees, mahogany trees, mushroom trees, mystic
trees, palm trees or type 3 green rain trees (the giant fern trees).

Mentions of green rain trees through the rest of this guide refer to only type 1
and 2. When planting mossy seeds, you can tell which type will grow based on the
appearance of the planted seed - see the [wiki page on green rain
trees](https://stardewvalleywiki.com/Green_Rain_Trees). If the planted seed
looks like a green nub, dig it back up and replant it until you get type 1 or 2.

The exact details of how moss grows are described in the
[wiki page on moss](https://stardewvalleywiki.com/Moss), and in the
[dayUpdate() function in the tree code](https://github.com/Dannode36/StardewValleyDecompiled/blob/main/Stardew%20Valley/StardewValley.TerrainFeatures/Tree.cs#L864).

## Getting lots of moss

### Green Rain

One day in summer every year has green rain. This is your best opportunity to
really gather lots of moss, so make it count. Almost all mature trees of the
correct types will grow moss during the event. Spend the entire day running
through the Cindersap Forest, the Mountains, and your own farm, sweeping the
trees with your scythe or sword. The special green rain trees can also drop
mossy seeds (you want lots of those too).

Special weeds spawn in large quantities during green rain and can drop moss. The
small weeds have a 10% chance to drop moss, the large weeds drop 2-3 moss when
harvested. The large weeds also have a chance to drop mossy seeds. You also want
all the fiber you can get from the weeds.

Plant lots of trees in the days leading up to green rain (i.e. late Spring and
early Summer). Immature trees have a high chance of growing to maturity, and all
eligible mature trees will grow moss. Some mature trees will *temporarily*
transform into mossy green rain trees during the event. Shaking or chopping
those trees down can also yield mossy seeds.

Expect to collect 100-300 moss on the day of the event.

### Dedicated Tree Farms

The most important part of moss farming is to plant lots and lots of trees. The
baseline rate of moss growth is slow, but can be improved significantly in a few
ways.

1. Rain increases the rate of moss growth, so you could use rain totems if
   you're really try-hard.
2. Trees near green rain trees will have significantly accelerated moss growth
   if the green rain tree already has moss. Green rain trees themselves always
   have this accelerated moss growth, so the ideal moss farm is all green rain
   trees (if you have enough mossy seeds).
3. Trees grown with tree fertilizer will regrow moss *much* faster (this
   includes green rain trees).
4. The green rain tree and fertilizer effects are large and they stack.

The details of these mechanics are described below.

### Desperate Times

Moss disappears in winter. If you are in desperate need, there are a few
sources. Unfortunately, these are not particularly helpful early-game.

1. Green rain trees in the greenhouse do grow moss.
2. Moss does grow in the desert, but more slowly due to lack of rain.
3. Green rain trees grow moss on Ginger Island.
4. If you're really, really hard-up, you can use the deconstructor on a deluxe
   worm bin to reclaim the moss used to craft it.

## The Optimal Layout

Trees must have at least one empty tile between them to grow to maturity, so
they are typically planted in a grid with 1-tile gaps. Green rain trees with
moss accelerate moss growth in a 5x5 square centered on the tree. As such, you'd
plant them in the simple pattern you'd use for sprinklers:

```text
T . T . T . T . T . T
. . . . . . . . . . .
T . G . T . T . G . T
. . . . . . . . . . .
T . T . T . T . T . T
. . . . . . . . . . .
T . T . T . T . T . T
. . . . . . . . . . .
T . G . T . T . G . T
. . . . . . . . . . .
T . T . T . T . T . T
```

There are off-farm locations such as the quarry, train station, and desert can
easly accomodate over 100 trees, so it is possible to build up some substantial
moss production. You can also obviously combine a moss farm with a tapper farm,
though green rain trees do not provide tapper products. Tappers themselves have
no affect on moss growth.

## Moss Production Calculations

Because moss growth relies on hidden factors, seasonal weather patterns, and
RNGesus, calculating moss production is complicated.

### Moss Growth Mechanics

1. **Growth Stage Recovery:** Trees go through a number of stages while growing,
   and continue to have a hidden growth stage after maturity, which caps out at
   stage 15. Trees must reach **Stage 14** to grow moss. Harvesting moss drops
   the tree's stage to 11 (if 1 piece drops) or 10 (if 2 pieces drop), meaning
   it takes an average of **3.5 stage advancements** to recover. Normally, trees
   (of types that can grow moss) have a 20% chance to advance one stage each
   night (an average of 17.5 days to get back to stage 14).

2. **The "Secret" Tree Fertilizer Effect:** While you can only apply tree
   fertilizer to a tree *before* it fully matures (Stages 0-4), the tree
   **permanently retains the fertilized status even after fully growing**. For
   the types of trees that can grow moss, this guarantees a tree advances one
   stage every night. This dramatically reduces the recovery time after
   harvesting moss (an average of 3.5 days before moss can grow).

3. **The 5x5 Green Rain Tree Boost:** A mature green rain tree that *currently
    has moss* will boost the moss growth rate on surrounding common trees. Green
    rain trees themselves also have these effects all the time, whether or not
    they have moss. This applies two independent effects each day:
   * **Stage Boost:** 50% chance to grant +1 growth stage. This stacks with
     fertilizer, potentially granting +2 stages in a single day. Incidentally,
     this also significantly boosts the growth rates of saplings, independent of
     the moss effects.
   * **Moss Growth Boost:** 50% chance of a 10% increase in the daily moss spawn
     odds (additive). For example, on a sunny day in Spring, an eligible tree
     has a 10% base chance of growing moss. If it's a green rain tree, or a
     planted near a green rain tree that has moss, there is a 50% chance that it
     will instead have a 20% chance of growing moss (or 15% on average).

After planting a farm, it will take a significant amount of time before it
becomes productive; a tree must be mature for a while before it is able to grow
moss. If you use fertilizer, a newly planted farm will take about two weeks for
all trees to reach stage 14 and steady-state, peak moss production.

If you don't use fertilizer, you're gonna have a bad time. Some laggard trees
will take almost a year to reach stage 14. If you want to farm moss early-game,
rush up to foraging level 7 and gather plenty of fiber to craft tree fertilizer.

The calcuations below are for peak farm production after all trees have reached
stage 14.

---

### Spring and Fall

In Spring and Fall, moss has a base 10% chance of growth on sunny days, and 20%
on rainy days. Factoring out festival days, Spring averages **~4.0 rainy days**
(14.4%) and Fall averages **~4.6 rainy days** (16.3%). *(Calculations below use
the combined ~15.4% average chance).*

* **Baseline (no fertilizer, no green rain trees):**
   * *Recovery:* 20% chance to advance a stage = ~17.5 days to reach Stage 14.
   * *Moss Growth:* ~11.5% average chance accounting for rain = ~8.7 days to
     spawn.
   * *Total Cycle:* ~26.2 days (yields **~1.1 harvests** per season).
* **Green Rain Tree Boost Only:**
   * *Recovery:* 0.7 stages/day = ~5.0 days to reach Stage 14.
   * *Moss Growth:* ~16.5% average chance accounting for rain and green tree
     effect = ~6.1 days to spawn.
   * *Total Cycle:* ~11.1 days (yields **~2.5 harvests** per season).
* **Fertilized Only:**
   * *Recovery:* 100% guaranteed stage growth = 3.5 days.
   * *Moss Growth:* ~11.5% average chance accounting for rain = ~8.7 days to
     spawn.
   * *Total Cycle:* ~12.2 days (yields **~2.3 harvests** per season).
* **Fertilized + Green Rain Tree Boost:**
   * *Recovery:* 1.5 stages/day = ~2.3 days.
   * *Moss Growth:* ~16.5% average chance accounting for rain and green tree
     effect = ~6.1 days to spawn.
   * *Total Cycle:* ~8.4 days (yields **~3.3 harvests** per season).

### Summer

Summer introduces penalties to moss growth on sunny days (3.3% chance of moss
growth when sunny). This is somewhat offset by the greater rate of rain during
summer - an average of **~6.6 rainy days** (23.5%).

* **Baseline (no fertilizer, no green rain trees):**
   * *Recovery:* 20% chance to advance a stage = ~17.5 days to reach Stage 14.
   * *Moss Growth:* Accounting for rain and the low growth rate on sunny days
     produces average moss growth odds of **~7.2%** = ~13.8 days to spawn.
   * *Total Cycle:* ~31.3 days (yields **~0.9 harvests** per season).
* **Green Rain Tree Boost Only:**
   * *Recovery:* 0.7 stages/day = ~5.0 days to reach Stage 14.
   * *Moss Growth:* The rain and green tree effects combine to reach a
     **~12.2%** average chance = ~8.2 days to spawn.
   * *Total Cycle:* ~13.2 days (yields **~2.1 harvests** per season).
* **Fertilized Only:**
   * *Recovery:* 100% guaranteed stage growth = 3.5 days.
   * *Moss Growth:* ~7.2% average chance = ~13.8 days to spawn.
   * *Total Cycle:* ~17.3 days (yields **~1.6 harvests** per season).
* **Fertilized + Green Rain Tree Boost:**
   * *Recovery:* 1.5 stages/day = ~2.3 days.
   * *Moss Growth:* ~12.2% average chance = ~8.2 days to spawn.
   * *Total Cycle:* ~10.5 days (yields **~2.7 harvests** per season).
* **The Green Rain Event:** Occurs exactly once per Summer. The game's daily
  update forces accelerated moss spawning, guaranteeing a free harvest
  (accounted for separately from the above calculations).

### Winter

Moss does not grow during winter and any existing moss on trees disappears at
the start of the season. Be sure to collect all the moss you can on the last day
of fall.

---

### Farm-Wide Annual Potential

Assuming an average yield of **1.5 moss per harvest**, we can calculate the
expected annual yield per tree by combining the Spring, Summer, and Fall
harvests:

* **Baseline Tree:** (~1.1 + ~0.9 + ~1.1) = ~3.0 harvests * 1.5 moss + 1.5
  (green rain) = **~6.0 moss per year.**
* **Fertilized Tree:** (~2.3 + ~1.6 + ~2.3) = ~6.2 harvests * 1.5 moss + 1.5
  (green rain) = **~10.8 moss per year.**
* **Green Rain Tree Boost Only:** (~2.5 + ~2.1 + ~2.5) = ~7.2
  harvests * 1.5 moss + 1.5 (green rain) = **~12.3 moss per year.**
* **Fertilized + Green Rain Tree Boost:** (~3.3 + ~2.7 + ~3.3) = ~9.3 harvests *
  1.5 moss + 1.5 (green rain) = **~15.5 moss per year.**

If you dedicate an 11x11 section of your farm (121 tiles) entirely to a dense
moss farm using the optimal 5x5 layout described above, and ensure you fertilize
every seed when planted:

* You can fit exactly **32 common trees** (alongside the 4 green rain trees).
* **32 trees * ~15.5 moss/year = ~496 moss per year.** (roughly 50 mushroom
  logs).
