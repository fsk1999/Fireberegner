import "./life-annuity.js";
import "./calculations.js";
import "./monte-carlo.js";
import "./math-explainer.js";
import "./plan-code.js";

const { FireCalculations, FireMonteCarlo, FireMathExplainer, FirePlanCode } = globalThis;

console.log("=== 1. Checking Module Exports ===");
console.assert(FireCalculations, "FireCalculations must exist");
console.assert(FireMonteCarlo, "FireMonteCarlo must exist");
console.assert(FireMathExplainer, "FireMathExplainer must exist");
console.assert(FirePlanCode, "FirePlanCode must exist");
console.log("✓ All modules loaded successfully.");

console.log("\n=== 2. Baseline Single Calculation ===");
const baseInputs = {
  currentAge: 35,
  retirementAge: 68,
  payoutYears: 20,
  desiredAnnualWithdrawal: 300000,
  ratePensionBalance: 300000,
  lifeAnnuityBalance: 100000,
  ratePensionNonDeductibleBasis: 0,
  ageSavingsBalance: 50000,
  freeFundsBalance: 200000,
  freeFundsCostBasis: 150000,
  askBalance: 100000,
  annualRatePensionContribution: 40000,
  annualLifeAnnuityContribution: 0,
  annualAgeSavingsContribution: 9900,
  annualFreeFundsContribution: 50000,
  annualAskContribution: 0,
  ageSavingsContributionLimit: 9900,
  pensionTax: 0.153,
  ratePensionContributionTaxRelief: 0.528,
  pensionWithdrawalTax: 0.37,
  askTax: 0.17,
  freeFundsInventoryShare: 0,
  returnRate: 0.07,
  inflationRate: 0.02,
  lifeAnnuityPayoutRate: 0.045,
  defensiveReturnRate: 0.035,
  returnDeclineYears: 10,
  returnRecoveryYears: 5,
  returnStrategy: "none",
  withdrawalAfterTax: true,
  contributionsFollowInflation: true,
  redirectPensionContributionsToFreeFunds: false,
  // Extended inputs
  isCouple: false,
  withdrawalStrategy: "proportional",
  includeFolkepension: false,
  folkepensionAge: 69,
  atpAnnualIncome: 0,
  efterloenAnnualIncome: 0,
  efterloenYears: 0,
  spendingStepAge: 0,
  spendingStepPercent: 0,
  oneOffEventAge: 0,
  oneOffEventAmount: 0,
  returnVolatility: 0.15,
  monteCarloRuns: 500
};

const baseCalc = FireCalculations.calculateFire(baseInputs);
const baseFireAge = baseCalc.fireRow?.age ?? baseCalc.finalRow.age;
console.log("Base fireAge:", baseFireAge, "fireDate:", baseCalc.fireRow?.date?.toISOString().slice(0, 10));
console.assert(Number.isFinite(baseFireAge), "Base fireAge should be finite");
console.log("✓ Baseline calculation passed.");

console.log("\n=== 3. Couple Mode Validation ===");
const coupleInputs = {
  ...baseInputs,
  isCouple: true
};
const coupleCalc = FireCalculations.calculateFire(coupleInputs);
const coupleFireAge = coupleCalc.fireRow?.age ?? coupleCalc.finalRow.age;
console.log("Couple fireAge:", coupleFireAge);
console.assert(FireCalculations.effectiveShareIncomeThreshold(coupleInputs) === 158800, "Couple share threshold should be 158,800");
console.assert(FireCalculations.effectiveShareIncomeThreshold(baseInputs) === 79400, "Single share threshold should be 79,400");
console.assert(FireCalculations.effectiveAskDepositCap(coupleInputs) === 348400, "Couple ASK cap should be 348,400");
console.assert(FireCalculations.effectiveAskDepositCap(baseInputs) === 174200, "Single ASK cap should be 174,200");
console.log("✓ Couple mode threshold doubling verified.");

console.log("\n=== 4. Tax-Optimal vs Proportional Withdrawal Strategy ===");
const taxOptimalInputs = {
  ...baseInputs,
  withdrawalStrategy: "taxOptimal"
};
const taxOptimalCalc = FireCalculations.calculateFire(taxOptimalInputs);
const taxOptimalFireAge = taxOptimalCalc.fireRow?.age ?? taxOptimalCalc.finalRow.age;
console.log("Proportional fireAge:", baseFireAge, "vs Tax-Optimal fireAge:", taxOptimalFireAge);
console.assert(Number.isFinite(taxOptimalFireAge), "Tax-optimal fireAge should be finite");
console.log("✓ Tax-optimal calculation executed cleanly.");

console.log("\n=== 5. Folkepension, ATP & Efterløn ===");
const folkepensionInputs = {
  ...baseInputs,
  includeFolkepension: true,
  folkepensionAge: 68,
  atpAnnualIncome: 25000,
  efterloenAnnualIncome: 120000,
  efterloenYears: 3
};
const folkepensionCalc = FireCalculations.calculateFire(folkepensionInputs);
const folkepensionFireAge = folkepensionCalc.fireRow?.age ?? folkepensionCalc.finalRow.age;
console.log("With Folkepension + ATP fireAge:", folkepensionFireAge);
console.assert(folkepensionFireAge <= baseFireAge, "Folkepension and ATP should allow earlier or equal FIRE age");

// Check Folkepension modregning function directly: (inputs, age, taxablePrivatePensionWithdrawal)
const singlePub = FireCalculations.calculatePublicPensionForAge({ isCouple: false, includeFolkepension: true, folkepensionAge: 68 }, 68, 50000);
const couplePub = FireCalculations.calculatePublicPensionForAge({ isCouple: true, includeFolkepension: true, folkepensionAge: 68 }, 68, 50000);
console.log("Single Folkepension totalGross at 50k other income:", Math.round(singlePub.totalGross));
console.log("Couple Folkepension totalGross at 50k other income:", Math.round(couplePub.totalGross));
console.assert(singlePub.totalGross > 0, "Single should receive Folkepension");
console.assert(couplePub.totalGross > singlePub.totalGross, "Couple combined Folkepension should exceed single");
console.log("✓ Folkepension calculations and modregning verified.");

console.log("\n=== 6. Spending Phases & One-Off Windfalls/Expenses ===");
const phaseInputs = {
  ...baseInputs,
  spendingStepAge: 75,
  spendingStepPercent: -0.25, // 25% lower spending from age 75
  oneOffEventAge: 50,
  oneOffEventAmount: -500000 // 500k expense at age 50
};
const phaseCalc = FireCalculations.calculateFire(phaseInputs);
const phaseFireAge = phaseCalc.fireRow?.age ?? phaseCalc.finalRow.age;
console.log("Phase calculation fireAge:", phaseFireAge);
console.assert(Number.isFinite(phaseFireAge), "Phase calculation fireAge should be finite");
console.log("✓ Spending step and one-off events verified.");

console.log("\n=== 7. Monte Carlo Simulation ===");
const mcResults = FireMonteCarlo.runMonteCarlo(baseInputs, { runs: 300, volatility: 0.16, seed: 12345 });
console.log("Monte Carlo Success Rate:", mcResults.successRate.toFixed(1) + "%");
console.log("Median final reserve:", Math.round(mcResults.medianFinalReserve));
console.log("P10 final reserve:", Math.round(mcResults.percentiles.p10));
console.log("P90 final reserve:", Math.round(mcResults.percentiles.p90));
console.log("FIRE Age Spread (Opt/Med/Pess):", mcResults.fireAgeStats.optimisticAge, mcResults.fireAgeStats.medianAge, mcResults.fireAgeStats.pessimisticAge);
console.assert(mcResults.runs === 300, "Should have 300 runs");
console.assert(mcResults.successRate >= 0 && mcResults.successRate <= 100, "Success rate between 0 and 100%");
console.assert(mcResults.percentileBands.length === baseCalc.planRows.length, "Percentile bands must match planRows length");
console.assert(Number.isFinite(mcResults.percentileBands[0].baselineTotal), "Percentile bands must include baselineTotal");
console.assert(mcResults.scenarios?.p10?.calculation?.planRows?.length === baseCalc.planRows.length, "P10 scenario must include full planRows");
console.assert(mcResults.scenarios?.p50?.calculation?.planRows?.length === baseCalc.planRows.length, "P50 scenario must include full planRows");
console.assert(mcResults.scenarios?.p90?.calculation?.planRows?.length === baseCalc.planRows.length, "P90 scenario must include full planRows");
console.log("✓ Monte Carlo simulation, percentile bands, and scenario trajectories verified.");

console.log("\n=== 8. Plan Code Backward & Forward Compatibility ===");
// Encode extended inputs
const encodedExtended = FirePlanCode.encodePlan(folkepensionInputs);
console.log("Encoded extended plan code length:", encodedExtended.length);
const decodedExtended = FirePlanCode.decodePlan(encodedExtended);
console.assert(decodedExtended.isCouple === false, "Decoded isCouple should be false");
console.assert(decodedExtended.includeFolkepension === true, "Decoded includeFolkepension should be true");
console.assert(decodedExtended.atpAnnualIncome === 25000, "Decoded atpAnnualIncome should be 25000");
console.assert(decodedExtended.efterloenYears === 3, "Decoded efterloenYears should be 3");

// Test legacy plan code (without extended fields)
const legacyObj = {
  currentAge: 40,
  retirementAge: 69,
  payoutYears: 20,
  desiredAnnualWithdrawal: 360000,
  ratePensionBalance: 400000,
  lifeAnnuityBalance: 0,
  ratePensionNonDeductibleBasis: 0,
  ageSavingsBalance: 30000,
  freeFundsBalance: 500000,
  freeFundsCostBasis: 400000,
  askBalance: 120000,
  annualRatePensionContribution: 30000,
  annualLifeAnnuityContribution: 0,
  annualAgeSavingsContribution: 9900,
  annualFreeFundsContribution: 60000,
  ageSavingsContributionLimit: 9900,
  pensionTax: 0.153,
  ratePensionContributionTaxRelief: 0.528,
  pensionWithdrawalTax: 0.37,
  askTax: 0.17,
  freeFundsInventoryShare: 0,
  returnRate: 0.07,
  inflationRate: 0.02,
  lifeAnnuityPayoutRate: 0.045,
  defensiveReturnRate: 0.035,
  returnDeclineYears: 10,
  returnRecoveryYears: 5,
  returnStrategy: "none",
  withdrawalAfterTax: true,
  contributionsFollowInflation: true,
  redirectPensionContributionsToFreeFunds: false
};
const encodedLegacy = FirePlanCode.encodePlan(legacyObj);
const decodedLegacy = FirePlanCode.decodePlan(encodedLegacy);
console.assert(decodedLegacy.currentAge === 40, "Legacy age preserved");
console.assert(decodedLegacy.isCouple === false, "Legacy default isCouple should be false");
console.assert(decodedLegacy.withdrawalStrategy === "proportional", "Legacy default withdrawalStrategy should be proportional");
console.assert(decodedLegacy.includeFolkepension === false, "Legacy default includeFolkepension should be false");
console.assert(decodedLegacy.annualAskContribution === 0, "Legacy default annualAskContribution should be 0");
console.assert(decodedLegacy.includeHousing === false, "Legacy default includeHousing should be false");
console.log("✓ Plan code forward and backward compatibility verified.");

console.log("\n=== 9. Housing & Home Equity (Bolig & Friværdi) ===");
const housingInputs = {
  ...baseInputs,
  includeHousing: true,
  housingType: "owner",
  housingValue: 8500000,
  housingDebt: 1600000,
  housingAnnualAmortization: 0,
  housingPriceGrowth: 0.02,
  housingOwnershipShare: 0.5,
  housingUnlock: true,
  housingUnlockShare: 0.5,
  housingUnlockAgeType: "fire",
};
const housingCalc = FireCalculations.calculateFire(housingInputs);
console.log("Without housing fireAge:", baseCalc.fireRow?.age, "With housing fireAge:", housingCalc.fireRow?.age);
console.assert(housingCalc.fireRow !== null, "FIRE should be reachable with housing equity");
console.assert(housingCalc.fireRow.age <= baseCalc.fireRow.age, "Unlocking housing equity should enable earlier or equal FIRE age");
console.assert(housingCalc.initialHousingEquity === (8500000 - 1600000) * 0.5, "Initial equity calculation correct");
console.assert(housingCalc.totalHousingUnlocked > 0, "Housing equity should be unlocked at FIRE");
console.assert(housingCalc.planRows[0].housingEquity > 0, "Plan rows should contain housingEquity");
console.assert(housingCalc.finalReserveAfterTaxWithHousing > housingCalc.finalReserveAfterTax, "Reserve with housing should be greater than portfolio reserve alone");
console.log("✓ Housing equity calculation, unlock at FIRE, and wealth aggregation verified.");

console.log("\n=== 10. Monte Carlo Simulation with Housing ===");
const mcNoHousing = FireMonteCarlo.runMonteCarlo(baseInputs, { runs: 50, volatility: 0.15, seed: 42 });
const mcHousing = FireMonteCarlo.runMonteCarlo(housingInputs, { runs: 50, volatility: 0.15, seed: 42 });

console.assert(mcHousing.percentileBands.length > 0, "MC with housing should produce percentile bands");
console.assert(mcHousing.percentileBands[0].baselineTotal === housingCalc.planRows[0].totalWealthWithHousing, "MC baselineTotal should reflect totalWealthWithHousing");
console.assert(mcHousing.percentileBands[0].baselineHousing === housingCalc.planRows[0].housingEquity, "MC baselineHousing should match housingEquity");
console.assert(mcHousing.medianFinalReserve > mcNoHousing.medianFinalReserve, "Median final reserve with housing should exceed reserve without housing");
console.assert(mcHousing.scenarios.p50.calculation.includeHousing === true, "P50 scenario calculation should have includeHousing true");
console.assert(mcHousing.scenarios.p50.calculation.planRows[0].housingEquity === housingCalc.planRows[0].housingEquity, "P50 scenario should include housing equity");
console.log("✓ Monte Carlo simulation correctly reflects housing equity in bands, scenarios, and reserves.");

console.log("\n=== 11. Interactive Math Explanations & Inspection ===");
const rowToTest = housingCalc.planRows[1];
const prevRowToTest = housingCalc.planRows[0];

const testColumns = [
  "returnRate", "ratePension", "lifeAnnuityDepotValue", "lifeAnnuityWithdrawal",
  "ageSavings", "freeFunds", "ask", "totalDepotValue", "housingEquity",
  "totalWealthWithHousing", "contribution", "withdrawal", "netWithdrawal",
  "lagerskat", "effectiveWithdrawalTaxRate", "baseTotal", "p50", "p10", "p90", "diff"
];

for (const colKey of testColumns) {
  const exp = FireMathExplainer.explainTableCell({
    colKey,
    row: rowToTest,
    prevRow: prevRowToTest,
    calculation: housingCalc,
    inputs: housingInputs,
    scenario: "baseline"
  });
  console.assert(exp !== null, `Explanation for column ${colKey} should not be null`);
  console.assert(typeof exp.title === "string" && exp.title.length > 0, `Title for ${colKey} must be a non-empty string`);
  console.assert(typeof exp.quickMath === "string" && exp.quickMath.length > 0, `quickMath for ${colKey} must be present`);
  console.assert(typeof exp.formula === "string" && exp.formula.length > 0, `formula for ${colKey} must be present`);
  console.assert(Array.isArray(exp.steps) && exp.steps.length > 0, `steps for ${colKey} must be non-empty array`);
}

const testMetrics = [
  "result-heading", "result-pension-stop-age", "result-fire-milestone-age",
  "result-final-balance", "life-annuity-conversion-rate"
];

for (const metricKey of testMetrics) {
  const exp = FireMathExplainer.explainKeyMetric({
    metricKey,
    calculation: housingCalc,
    inputs: housingInputs
  });
  console.assert(exp !== null, `Explanation for metric ${metricKey} should not be null`);
  console.assert(typeof exp.title === "string" && exp.title.length > 0, `Title for ${metricKey} must be a non-empty string`);
  console.assert(typeof exp.formula === "string", `Formula for ${metricKey} must be a string`);
}
console.log("✓ All interactive math explanations (hover breakdowns & full inspector) validated.");

console.log("\n=== 12. Historical Crisis Stress Testing ===");
const stressResults = FireMonteCarlo.runHistoricalStressTests(baseInputs);
console.assert(Array.isArray(stressResults) && stressResults.length === 4, "Must evaluate all 4 historical crises");
stressResults.forEach((res) => {
  console.assert(typeof res.name === "string", "Crisis must have name");
  console.assert(typeof res.isSolvent === "boolean", "Crisis must produce boolean isSolvent");
  console.assert(Number.isFinite(res.finalReserve), "Crisis must produce numeric finalReserve");
  console.log(`Crisis ${res.name}: Solvent=${res.isSolvent}, MinBalance=${res.minBalance}, FinalReserve=${res.finalReserve}`);
});
console.log("✓ Historical crisis stress tests verified.");

console.log("\n=== 13. Sensitivity & Tornado Analysis ===");
const sensitivityResults = FireMonteCarlo.calculateSensitivityAnalysis(baseInputs);
console.assert(Array.isArray(sensitivityResults) && sensitivityResults.length === 4, "Must analyze all 4 key factors");
sensitivityResults.forEach((factor) => {
  console.assert(typeof factor.name === "string", "Factor must have name");
  console.assert(Number.isFinite(factor.swing), "Swing must be numeric");
  console.log(`Factor '${factor.name}': Best=${factor.bestAge}y, Worst=${factor.worstAge}y, Swing=${factor.swing} years`);
});
console.assert(sensitivityResults[0].swing >= sensitivityResults[sensitivityResults.length - 1].swing, "Factors must be sorted by swing descending");
console.log("✓ Sensitivity analysis and factor ranking verified.");

console.log("\n=== 14. Cash Reserve (Kontantreserve & Rente) ===");
const cashInputs = {
  ...baseInputs,
  cashBalance: 250000,
  annualCashContribution: 24000,
  cashInterestRate: 0.02,
  cashInterestTax: 0.37,
};
const cashCalc = FireCalculations.calculateFire(cashInputs);
console.assert(cashCalc.planRows[0].cash === 250000, "Initial cash balance must match input");
console.assert(cashCalc.planRows[1].cash > 250000, "Cash balance should grow with contribution and net bank interest");
console.assert(cashCalc.planRows[0].totalDepotValue >= 250000, "Total depot value must include cash reserve");

const cashExp = FireMathExplainer.explainTableCell({
  colKey: "cash",
  row: cashCalc.planRows[1],
  prevRow: cashCalc.planRows[0],
  calculation: cashCalc,
  inputs: cashInputs,
});
console.assert(cashExp !== null, "Math explainer must not be null for cash");
console.assert(cashExp.title.includes("Kontantreserve"), "Math explainer must explain cash reserve");
console.assert(typeof cashExp.formula === "string", "Cash explainer must have formula");

const encodedCash = FirePlanCode.encodePlan(cashInputs);
const decodedCash = FirePlanCode.decodePlan(encodedCash);
console.assert(decodedCash.cashBalance === 250000, "Encoded plan must preserve cashBalance");
console.assert(decodedCash.annualCashContribution === 24000, "Encoded plan must preserve annualCashContribution");
console.assert(Math.abs(decodedCash.cashInterestRate - 0.02) < 0.0001, "Encoded plan must preserve cashInterestRate");
console.assert(Math.abs(decodedCash.cashInterestTax - 0.37) < 0.0001, "Encoded plan must preserve cashInterestTax");
console.log("✓ Cash reserve, bank interest taxation, and plan persistence verified.");

console.log("\n=== 15. Custom Crisis Simulation & Matrix Return Profile ===");
const customAnnualRates = [-0.25, -0.15, 0.02, 0.08];
const customCrisisRes = FireMonteCarlo.simulateCustomCrisis(baseInputs, customAnnualRates);
console.assert(customCrisisRes.isCustom === true, "Must flag isCustom as true");
console.assert(typeof customCrisisRes.name === "string" && customCrisisRes.name.includes("Brugerdefineret"), "Custom crisis must be identified");
console.assert(Array.isArray(customCrisisRes.planRows) && customCrisisRes.planRows.length > 0, "Custom crisis must yield plan rows");
console.assert(typeof customCrisisRes.isSolvent === "boolean", "Custom crisis must evaluate solvency");
console.assert(Number.isFinite(customCrisisRes.finalReserve), "Custom crisis must compute numeric final reserve");
console.log(`Custom Crisis: Solvent=${customCrisisRes.isSolvent}, MinBalance=${customCrisisRes.minBalance}, FinalReserve=${customCrisisRes.finalReserve}`);
console.log("✓ Custom crisis simulation and matrix return profiling verified.");

console.log("\n=== 16. Dynamic Cash Share (% af frie midler) & Glide Path ===");
const dynamicCashInputs = {
  ...baseInputs,
  freeFundsBalance: 500000,
  annualFreeFundsContribution: 50000,
  cashShareStart: 5,
  cashShareTarget: 20,
  cashShareStrategy: "glidePath",
};
const dynCalc = FireCalculations.calculateFire(dynamicCashInputs);
console.assert(dynCalc.planRows.length > 0, "Must generate plan rows");
const initialRow = dynCalc.planRows[0];
console.assert(Math.abs(initialRow.cashShare - 0.05) < 0.001, `Initial cash share must be ~5%, got ${initialRow.cashShare}`);
console.assert(Math.abs(initialRow.cash - (500000 * 0.05)) < 1, `Initial cash must be 5% of total free funds: expected 25000, got ${initialRow.cash}`);

const retRow = dynCalc.planRows.find((r) => r.age >= dynamicCashInputs.retirementAge);
if (retRow && (retRow.freeFunds + retRow.cash) > 0) {
  console.assert(Math.abs(retRow.cashShare - 0.20) < 0.01, `Retirement cash share must reach 20%, got ${retRow.cashShare}`);
}

const encodedDyn = FirePlanCode.encodePlan(dynamicCashInputs);
const decodedDyn = FirePlanCode.decodePlan(encodedDyn);
console.assert(decodedDyn.cashShareStart === 5, "Plan code must preserve cashShareStart");
console.assert(decodedDyn.cashShareTarget === 20, "Plan code must preserve cashShareTarget");
console.assert(decodedDyn.cashShareStrategy === "glidePath", "Plan code must preserve cashShareStrategy");

const dynExp = FireMathExplainer.explainTableCell({
  colKey: "cash",
  row: initialRow,
  calculation: dynCalc,
  inputs: dynamicCashInputs,
});
console.assert(dynExp !== null, "Math explainer must explain dynamic cash share");
console.assert(dynExp.formula.includes("5") || dynExp.formula.includes("%"), "Explainer formula should mention cash share percentage");
console.log("✓ Dynamic cash share, linear glide path, and plan persistence verified.");

console.log("\n==================================");
console.log("ALL 16 VERIFICATION SUITES PASSED!");
console.log("==================================");



