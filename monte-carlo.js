(function (root, factory) {
  if (typeof define === "function" && define.amd) {
    define(["./calculations"], factory);
  } else if (typeof module === "object" && module.exports) {
    module.exports = factory(require("./calculations"));
  } else {
    root.FireMonteCarlo = factory(root.FireCalculations);
  }
})(typeof globalThis !== "undefined" ? globalThis : this, function (FireCalculations) {
  "use strict";

  function createRng(seed) {
    if (!Number.isFinite(seed)) {
      return () => Math.random();
    }
    let a = seed >>> 0;
    return function () {
      let t = (a += 0x6d2b79f5);
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function gaussianRandom(rng = Math.random) {
    let u = 0;
    let v = 0;
    while (u === 0) u = rng();
    while (v === 0) v = rng();
    const z = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
    return Math.max(-3.2, Math.min(3.2, z));
  }

  function percentile(sortedArray, p) {
    if (sortedArray.length === 0) return 0;
    const index = (p / 100) * (sortedArray.length - 1);
    const lower = Math.floor(index);
    const upper = Math.ceil(index);
    const weight = index - lower;
    if (lower === upper) return sortedArray[lower];
    return sortedArray[lower] * (1 - weight) + sortedArray[upper] * weight;
  }

  function runMonteCarlo(inputs, options = {}) {
    const runs = Math.max(10, Math.min(5000, Math.round(options.runs ?? inputs.monteCarloRuns ?? 500)));
    const volatility = Math.max(0.01, Math.min(0.6, options.volatility ?? inputs.returnVolatility ?? 0.15));
    const calculationDate = options.calculationDate ?? new Date();
    const rng = createRng(options.seed);

    const baseline = FireCalculations.calculateFire(inputs, calculationDate);
    const basePlanRows = baseline.planRows || [];
    if (basePlanRows.length === 0) {
      return {
        baseline,
        successRate: 0,
        medianFinalReserve: 0,
        runs,
        volatility,
        percentiles: { p10: 0, p25: 0, p50: 0, p75: 0, p90: 0 },
        totalBalancePercentiles: { p10: 0, p25: 0, p50: 0, p75: 0, p90: 0 },
        fireAgeStats: { optimisticAge: inputs.retirementAge, medianAge: inputs.retirementAge, pessimisticAge: inputs.retirementAge, reachedRate: 0 },
        pensionStopAgeStats: { optimisticAge: inputs.retirementAge, medianAge: inputs.retirementAge, pessimisticAge: inputs.retirementAge },
        percentileBands: [],
        scenarios: { p10: { calculation: baseline }, p50: { calculation: baseline }, p90: { calculation: baseline } },
      };
    }

    const startAge = inputs.currentAge;
    const finalAge = baseline.finalRow?.age ?? (inputs.retirementAge + inputs.payoutYears);
    const totalYears = Math.max(1, finalAge - startAge);

    const baselineByAge = new Map();
    basePlanRows.forEach((row) => {
      baselineByAge.set(row.age, row);
    });

    const ageTrajectoryMap = new Map();
    for (let age = startAge; age <= finalAge; age += 1) {
      ageTrajectoryMap.set(age, {
        total: [],
        pension: [],
        freeFunds: [],
        depot: [],
      });
    }

    const finalReserves = [];
    const finalTotalBalances = [];
    const fireAges = [];
    const pensionStopAges = [];
    const runRecords = [];
    let solventRuns = 0;
    let reachedFireCount = 0;

    // Shared calculation cache for ex-ante life annuity metrics
    const sharedCache = { anchorCaches: new Map() };
    const baselineFireAge = baseline.fireRow ? baseline.fireRow.age : inputs.retirementAge;
    const baselineStopAge = baseline.pensionStopRow
      ? Math.min(baseline.pensionStopRow.age, baselineFireAge)
      : baselineFireAge;
    const lockedFireYear = Math.max(0, baselineFireAge - inputs.currentAge);
    const lockedPensionStopYear = Math.max(0, baselineStopAge - inputs.currentAge);

    for (let run = 0; run < runs; run += 1) {
      // Generate year-by-year median-preserving log-normal return multipliers (Sequence-of-Returns Risk)
      const annualReturnMultipliers = [];
      for (let y = 0; y <= totalYears + 2; y += 1) {
        const z = gaussianRandom(rng);
        annualReturnMultipliers.push(Math.exp(volatility * z));
      }

      const adaptiveInputs = {
        ...inputs,
        annualReturnMultipliers,
      };
      const trajectoryInputs = {
        ...inputs,
        annualReturnMultipliers,
        lockedFireYear,
        lockedPensionStopYear,
      };

      try {
        const adaptiveSim = FireCalculations.calculateFire(adaptiveInputs, calculationDate, {
          includeBridgeCapacity: false,
          calculationCache: sharedCache,
        });
        const sim = FireCalculations.calculateFire(trajectoryInputs, calculationDate, {
          includeBridgeCapacity: false,
          calculationCache: sharedCache,
        });

        const isSolvent = Boolean(sim.isFullyFunded);
        if (isSolvent) {
          solventRuns += 1;
        }

        const finalReserve = sim.finalReserveAfterTax ?? 0;
        const finalTotalBalance = sim.finalRow?.totalBalance ?? 0;
        const effectiveFireAge = adaptiveSim.fireRow
          ? adaptiveSim.fireRow.age
          : inputs.retirementAge;
        const effectiveStopAge = adaptiveSim.pensionStopRow
          ? Math.min(adaptiveSim.pensionStopRow.age, effectiveFireAge)
          : effectiveFireAge;

        if (adaptiveSim.fireRow) {
          reachedFireCount += 1;
        }

        sim.adaptiveFireAge = adaptiveSim.fireRow ? adaptiveSim.fireRow.age : null;
        sim.adaptivePensionStopAge = adaptiveSim.pensionStopRow
          ? adaptiveSim.pensionStopRow.age
          : null;

        finalReserves.push(finalReserve);
        finalTotalBalances.push(finalTotalBalance);
        fireAges.push(effectiveFireAge);
        pensionStopAges.push(effectiveStopAge);

        let lifetimeWealthSum = 0;
        sim.planRows.forEach((row) => {
          lifetimeWealthSum += row.totalBalance;
          const bucket = ageTrajectoryMap.get(row.age);
          if (bucket) {
            const pensionVal = row.ratePension + row.lifeAnnuity + row.ageSavings;
            const freeVal = row.freeFunds + row.ask;
            bucket.total.push(row.totalBalance);
            bucket.pension.push(pensionVal);
            bucket.freeFunds.push(freeVal);
            bucket.depot.push(row.totalDepotValue);
          }
        });

        const shortfallTime = sim.firstShortfallDate
          ? sim.firstShortfallDate.getTime()
          : Number.MAX_SAFE_INTEGER;

        runRecords.push({
          sim,
          isSolvent,
          shortfallTime,
          finalReserve,
          lifetimeWealthSum,
        });
      } catch (_err) {
        finalReserves.push(0);
        finalTotalBalances.push(0);
        fireAges.push(inputs.retirementAge);
        pensionStopAges.push(inputs.retirementAge);
      }
    }

    finalReserves.sort((a, b) => a - b);
    finalTotalBalances.sort((a, b) => a - b);
    fireAges.sort((a, b) => a - b);
    pensionStopAges.sort((a, b) => a - b);

    runRecords.sort((a, b) => {
      if (a.isSolvent !== b.isSolvent) {
        return a.isSolvent ? 1 : -1;
      }
      if (!a.isSolvent && a.shortfallTime !== b.shortfallTime) {
        return a.shortfallTime - b.shortfallTime;
      }
      if (Math.abs(a.finalReserve - b.finalReserve) > 1) {
        return a.finalReserve - b.finalReserve;
      }
      return a.lifetimeWealthSum - b.lifetimeWealthSum;
    });

    const pickScenario = (p) => {
      if (runRecords.length === 0) return { calculation: baseline };
      const idx = Math.max(
        0,
        Math.min(runRecords.length - 1, Math.round((p / 100) * (runRecords.length - 1))),
      );
      return { calculation: runRecords[idx].sim };
    };

    const percentileBands = [];
    ageTrajectoryMap.forEach((bucket, age) => {
      bucket.total.sort((a, b) => a - b);
      bucket.pension.sort((a, b) => a - b);
      bucket.freeFunds.sort((a, b) => a - b);
      bucket.depot.sort((a, b) => a - b);

      const baseRow = baselineByAge.get(age);
      const basePension = baseRow
        ? baseRow.ratePension + baseRow.lifeAnnuity + baseRow.ageSavings
        : 0;
      const baseFree = baseRow ? baseRow.freeFunds + baseRow.ask : 0;

      percentileBands.push({
        age,
        baselineTotal: baseRow ? baseRow.totalBalance : 0,
        baselinePension: basePension,
        baselineFreeFunds: baseFree,
        baselineDepot: baseRow ? baseRow.totalDepotValue : 0,
        p10: percentile(bucket.total, 10),
        p25: percentile(bucket.total, 25),
        p50: percentile(bucket.total, 50),
        p75: percentile(bucket.total, 75),
        p90: percentile(bucket.total, 90),
        pensionP10: percentile(bucket.pension, 10),
        pensionP50: percentile(bucket.pension, 50),
        pensionP90: percentile(bucket.pension, 90),
        freeFundsP10: percentile(bucket.freeFunds, 10),
        freeFundsP50: percentile(bucket.freeFunds, 50),
        freeFundsP90: percentile(bucket.freeFunds, 90),
        depotP10: percentile(bucket.depot, 10),
        depotP50: percentile(bucket.depot, 50),
        depotP90: percentile(bucket.depot, 90),
      });
    });

    const successRate = Math.round((solventRuns / runs) * 1000) / 10;
    const reachedRate = Math.round((reachedFireCount / runs) * 1000) / 10;

    return {
      baseline,
      successRate,
      runs,
      volatility,
      medianFinalReserve: percentile(finalReserves, 50),
      percentiles: {
        p10: percentile(finalReserves, 10),
        p25: percentile(finalReserves, 25),
        p50: percentile(finalReserves, 50),
        p75: percentile(finalReserves, 75),
        p90: percentile(finalReserves, 90),
      },
      totalBalancePercentiles: {
        p10: percentile(finalTotalBalances, 10),
        p25: percentile(finalTotalBalances, 25),
        p50: percentile(finalTotalBalances, 50),
        p75: percentile(finalTotalBalances, 75),
        p90: percentile(finalTotalBalances, 90),
      },
      fireAgeStats: {
        // Note: Lower FIRE age is optimistic (P10 of ages = earliest 10%), higher FIRE age is pessimistic (P90 of ages = latest 10%)
        optimisticAge: Math.round(percentile(fireAges, 10)),
        medianAge: Math.round(percentile(fireAges, 50)),
        pessimisticAge: Math.round(percentile(fireAges, 90)),
        reachedRate,
      },
      pensionStopAgeStats: {
        optimisticAge: Math.round(percentile(pensionStopAges, 10)),
        medianAge: Math.round(percentile(pensionStopAges, 50)),
        pessimisticAge: Math.round(percentile(pensionStopAges, 90)),
      },
      percentileBands,
      scenarios: {
        p10: pickScenario(10),
        p50: pickScenario(50),
        p90: pickScenario(90),
      },
    };
  }

  return {
    runMonteCarlo,
  };
});
