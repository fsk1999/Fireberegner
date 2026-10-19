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

  function gaussianRandom() {
    let u = 0;
    let v = 0;
    while (u === 0) u = Math.random();
    while (v === 0) v = Math.random();
    return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
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
    const runs = options.runs ?? 500;
    const volatility = options.volatility ?? 0.15; // 15% standard deviation
    const calculationDate = options.calculationDate ?? new Date();

    const baseline = FireCalculations.calculateFire(inputs, calculationDate);
    const basePlanRows = baseline.planRows || [];
    if (basePlanRows.length === 0) {
      return {
        successRate: 0,
        medianFinalReserve: 0,
        runs,
        percentiles: { p10: 0, p25: 0, p50: 0, p75: 0, p90: 0 },
        percentileBands: [],
      };
    }

    const startAge = inputs.currentAge;
    const fireAge = baseline.fireRow?.age ?? inputs.retirementAge;
    const finalAge = baseline.finalRow?.age ?? (inputs.retirementAge + inputs.payoutYears);
    const totalYears = finalAge - startAge;

    const finalReserves = [];
    const ageTrajectoryMap = new Map();
    for (let age = startAge; age <= finalAge; age += 1) {
      ageTrajectoryMap.set(age, []);
    }

    let solventRuns = 0;

    for (let run = 0; run < runs; run += 1) {
      // Simulate annual shocks around the return rate
      let isSolvent = true;
      let finalReserve = 0;

      // Clone inputs and apply annual random shocks to calculateFireForAnchor or stepwise simulation
      // To ensure full fidelity with all tax brackets and withdrawal logic,
      // we generate an effective return path and run an anchor evaluation.
      // With volatility, we sample a mean return realization for the run or per-phase.
      const runZ = gaussianRandom();
      const runMeanReturn = Math.max(0, inputs.returnRate + runZ * (volatility / Math.sqrt(Math.max(1, totalYears))));

      // Sample path shocks
      const runInputs = {
        ...inputs,
        returnRate: runMeanReturn,
      };

      try {
        const sim = FireCalculations.calculateFire(runInputs, calculationDate);
        if (sim.isFullyFunded) {
          solventRuns += 1;
        } else {
          isSolvent = false;
        }
        finalReserve = sim.finalReserveAfterTax;

        sim.planRows.forEach((row) => {
          const list = ageTrajectoryMap.get(row.age);
          if (list) {
            list.push(row.totalBalance);
          }
        });
      } catch (e) {
        isSolvent = false;
        finalReserve = 0;
      }

      finalReserves.push(finalReserve);
    }

    finalReserves.sort((a, b) => a - b);

    const percentileBands = [];
    ageTrajectoryMap.forEach((balances, age) => {
      balances.sort((a, b) => a - b);
      percentileBands.push({
        age,
        p10: percentile(balances, 10),
        p25: percentile(balances, 25),
        p50: percentile(balances, 50),
        p75: percentile(balances, 75),
        p90: percentile(balances, 90),
      });
    });

    const successRate = Math.round((solventRuns / runs) * 1000) / 10;

    return {
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
      percentileBands,
    };
  }

  return {
    runMonteCarlo,
  };
});
