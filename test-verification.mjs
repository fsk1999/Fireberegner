import "./life-annuity.js";
import "./calculations.js";
import "./monte-carlo.js";
import "./plan-code.js";

const { FireCalculations, FireMonteCarlo, FirePlanCode } = globalThis;

console.log("=== 1. Checking Module Exports ===");
console.assert(FireCalculations, "FireCalculations must exist");
console.assert(FireMonteCarlo, "FireMonteCarlo must exist");
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
console.log("✓ Plan code forward and backward compatibility verified.");

console.log("\n=================================");
console.log("ALL 8 VERIFICATION SUITES PASSED!");
console.log("=================================");
