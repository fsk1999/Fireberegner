(function (root, factory) {
  const lifeAnnuityCalculations =
    typeof module === "object" && module.exports
      ? require("./life-annuity.js")
      : root.LifeAnnuityCalculations;
  const api = factory(lifeAnnuityCalculations);

  if (typeof module === "object" && module.exports) {
    module.exports = api;
  }

  root.FireCalculations = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function (
  lifeAnnuityCalculations,
) {
  const { calculateLifeAnnuityMetrics } =
    lifeAnnuityCalculations;
  const MONEY_TOLERANCE = 0.01;
  const CALCULATION_TOLERANCE = 1e-7;
  const SHARE_INCOME_THRESHOLD = 79400;
  const SHARE_INCOME_LOW_RATE = 0.27;
  const SHARE_INCOME_HIGH_RATE = 0.42;
  const FREE_FUNDS_TAXATION = Object.freeze({
    realization: "realization",
    inventory: "inventory",
    mixed: "mixed",
  });
  const RETURN_STRATEGY = Object.freeze({
    none: "none",
    declining: "declining",
    riskTent: "riskTent",
  });
  const WITHDRAWAL_STRATEGY = Object.freeze({
    proportional: "proportional",
    taxOptimal: "taxOptimal",
  });
  const FREE_FUNDS_WITHDRAWAL_STRATEGY = Object.freeze({
    cashFirst: "cashFirst",
    taxOptimal: "taxOptimal",
    proportional: "proportional",
    stocksFirst: "stocksFirst",
  });
  const DEFAULT_DEFENSIVE_RETURN_RATE = 0.04;
  const DEFAULT_RETURN_DECLINE_YEARS = 10;
  const DEFAULT_RETURN_RECOVERY_YEARS = 15;
  const CONTRIBUTION_SEARCH_STEP = 1000;
  const CONTRIBUTION_LIMITS = Object.freeze({
    ratePension: 68700,
    lifeAnnuity: 63200,
    ageSavings: 9900,
    ageSavingsHigh: 64200,
    askDepositCap: 174200,
  });
  const PUBLIC_PENSION_2026 = Object.freeze({
    grundbeloeb: 90528,
    pensionstillaegSingle: 104772,
    freeDeductionSingle: 98800,
    reductionRateSingle: 0.309,
    pensionstillaegCouple: 107232,
    freeDeductionCouple: 197900,
    reductionRateCouple: 0.32,
  });

  const RATE_PENSION = 0;
  const LIFE_ANNUITY = 1;
  const AGE_SAVINGS = 2;
  const FREE_FUNDS_REALIZATION = 3;
  const FREE_FUNDS_INVENTORY = 4;
  const ASK = 5;
  const CASH = 6;

  const CASH_STRATEGY = Object.freeze({
    glidePath: "glidePath",
    glidePathFire: "glidePathFire",
    stepAtRetirement: "stepAtRetirement",
    stepAtFire: "stepAtFire",
    constant: "constant",
  });

  function getTargetCashShare(year, age, inputs, fireAge = inputs?.retirementAge) {
    if (
      Array.isArray(inputs?.annualCashShares) &&
      Number.isFinite(inputs.annualCashShares[year])
    ) {
      const shareVal = inputs.annualCashShares[year];
      const normalizedShare = shareVal > 1 ? shareVal / 100 : shareVal;
      return Math.max(0, Math.min(1, normalizedShare));
    }
    if (!Number.isFinite(inputs?.cashShareStart)) {
      return 0;
    }
    const startShare = Math.max(0, Math.min(1, inputs.cashShareStart / 100));
    const targetShare = Number.isFinite(inputs.cashShareTarget)
      ? Math.max(0, Math.min(1, inputs.cashShareTarget / 100))
      : startShare;
    const strategy = inputs.cashShareStrategy || "glidePath";

    if (strategy === "constant") {
      return startShare;
    }

    const currentAge = inputs.currentAge;
    const targetAge =
      strategy === "glidePathFire" || strategy === "stepAtFire" || inputs.cashTargetAgeType === "fire"
        ? (fireAge || inputs.retirementAge)
        : inputs.retirementAge;

    if (strategy === "stepAtRetirement" || strategy === "stepAtFire") {
      return age >= targetAge ? targetShare : startShare;
    }

    if (targetAge <= currentAge) {
      return targetShare;
    }

    const progress = Math.max(0, Math.min(1, (age - currentAge) / (targetAge - currentAge)));
    return startShare + progress * (targetShare - startShare);
  }

  function householdMultiplier(inputs) {
    return inputs?.isCouple ? 2 : 1;
  }

  function effectiveShareIncomeThreshold(inputs) {
    return SHARE_INCOME_THRESHOLD * householdMultiplier(inputs);
  }

  function effectiveRatePensionLimit(inputs) {
    return CONTRIBUTION_LIMITS.ratePension * householdMultiplier(inputs);
  }

  function effectiveLifeAnnuityLimit(inputs) {
    return CONTRIBUTION_LIMITS.lifeAnnuity * householdMultiplier(inputs);
  }

  function effectiveAskDepositCap(inputs) {
    return CONTRIBUTION_LIMITS.askDepositCap * householdMultiplier(inputs);
  }

  function withdrawalStrategy(inputs) {
    if (inputs?.withdrawalStrategy === "proportional") {
      return WITHDRAWAL_STRATEGY.proportional;
    }
    return WITHDRAWAL_STRATEGY.taxOptimal;
  }

  function freeFundsWithdrawalStrategy(inputs) {
    if (inputs?.freeFundsWithdrawalStrategy) {
      return inputs.freeFundsWithdrawalStrategy;
    }
    const strat = inputs?.withdrawalStrategy;
    if (strat === "cashFirst") return FREE_FUNDS_WITHDRAWAL_STRATEGY.cashFirst;
    if (strat === "stocksFirst") return FREE_FUNDS_WITHDRAWAL_STRATEGY.stocksFirst;
    if (strat === "proportional") return FREE_FUNDS_WITHDRAWAL_STRATEGY.proportional;
    return FREE_FUNDS_WITHDRAWAL_STRATEGY.taxOptimal;
  }

  function freeFundsInventoryShare(inputs) {
    if (inputs.freeFundsInventoryShare !== undefined) {
      return inputs.freeFundsInventoryShare;
    }

    return inputs.freeFundsTaxation === FREE_FUNDS_TAXATION.inventory ? 1 : 0;
  }

  function calculationError() {
    return new Error(
      "Forudsætningerne giver tal, der er for store til at beregne.",
    );
  }

  function assertFinite(...values) {
    if (values.some((value) => !Number.isFinite(value))) {
      throw calculationError();
    }
  }

  function ratePensionContributionParts(
    totalContribution,
    rateLimit = CONTRIBUTION_LIMITS.ratePension,
  ) {
    const deductibleRatePensionContribution = Math.min(
      totalContribution,
      rateLimit,
    );
    const nonDeductibleRatePensionContribution = Math.max(
      0,
      totalContribution - deductibleRatePensionContribution,
    );

    return {
      deductible: deductibleRatePensionContribution,
      nonDeductible: nonDeductibleRatePensionContribution,
    };
  }

  function ratePensionContributionNetCost(
    totalContribution,
    taxRelief,
    rateLimit = CONTRIBUTION_LIMITS.ratePension,
  ) {
    const parts = ratePensionContributionParts(totalContribution, rateLimit);
    const netCost = parts.deductible * (1 - taxRelief) + parts.nonDeductible;
    assertFinite(netCost);
    return netCost;
  }

  function lifeAnnuityContributionNetCost(
    totalContribution,
    taxRelief,
    lifeLimit = CONTRIBUTION_LIMITS.lifeAnnuity,
  ) {
    const deductibleContribution = Math.min(
      totalContribution,
      lifeLimit,
    );
    const nonDeductibleContribution = Math.max(
      0,
      totalContribution - deductibleContribution,
    );
    const netCost =
      deductibleContribution * (1 - taxRelief) + nonDeductibleContribution;
    assertFinite(netCost);
    return netCost;
  }

  function pensionContributionTaxSaving(
    contributions,
    taxRelief,
    rateLimit = CONTRIBUTION_LIMITS.ratePension,
    lifeLimit = CONTRIBUTION_LIMITS.lifeAnnuity,
  ) {
    const rateContribution = contributions.annualRatePensionContribution ?? 0;
    const lifeAnnuityContribution =
      contributions.annualLifeAnnuityContribution ?? 0;
    const saving =
      rateContribution -
      ratePensionContributionNetCost(rateContribution, taxRelief, rateLimit) +
      lifeAnnuityContribution -
      lifeAnnuityContributionNetCost(
        lifeAnnuityContribution,
        taxRelief,
        lifeLimit,
      );
    assertFinite(saving);
    return saving;
  }

  function contributionNetBudget(
    contributions,
    taxRelief,
    rateLimit = CONTRIBUTION_LIMITS.ratePension,
    lifeLimit = CONTRIBUTION_LIMITS.lifeAnnuity,
  ) {
    const budget =
      ratePensionContributionNetCost(
        contributions.annualRatePensionContribution,
        taxRelief,
        rateLimit,
      ) +
      lifeAnnuityContributionNetCost(
        contributions.annualLifeAnnuityContribution ?? 0,
        taxRelief,
        lifeLimit,
      ) +
      contributions.annualAgeSavingsContribution +
      (contributions.annualAskContribution ?? 0) +
      contributions.annualFreeFundsContribution;
    assertFinite(budget);
    return budget;
  }

  function ageSavingsContributionLimit(inputs) {
    const rawLimit =
      inputs.ageSavingsContributionLimit ?? CONTRIBUTION_LIMITS.ageSavings;
    const validBaseLimits = [
      CONTRIBUTION_LIMITS.ageSavings,
      CONTRIBUTION_LIMITS.ageSavingsHigh,
      CONTRIBUTION_LIMITS.ageSavings * 2,
      CONTRIBUTION_LIMITS.ageSavingsHigh * 2,
    ];

    if (!validBaseLimits.includes(rawLimit)) {
      throw new Error(
        "Loftet for aldersopsparing skal være et gældende 2026-loft.",
      );
    }

    if (
      inputs.isCouple &&
      (rawLimit === CONTRIBUTION_LIMITS.ageSavings ||
        rawLimit === CONTRIBUTION_LIMITS.ageSavingsHigh)
    ) {
      return rawLimit * 2;
    }

    return rawLimit;
  }

  function calculatePublicPensionForAge(
    inputs,
    age,
    taxablePrivatePensionWithdrawal = 0,
  ) {
    const folkepensionAge = inputs.folkepensionAge ?? inputs.retirementAge;
    const efterloenYears = inputs.efterloenYears ?? 0;
    const efterloenAnnualIncome = inputs.efterloenAnnualIncome ?? 0;
    const pensionTaxRate = inputs.pensionWithdrawalTax ?? 0.37;
    const efterloenGross =
      efterloenAnnualIncome > 0 &&
      efterloenYears > 0 &&
      age >= folkepensionAge - efterloenYears &&
      age < folkepensionAge
        ? efterloenAnnualIncome
        : 0;

    if (age < folkepensionAge) {
      return {
        efterloenGross,
        atpGross: 0,
        folkepensionGrundbeloeb: 0,
        folkepensionTillaeg: 0,
        folkepensionReduction: 0,
        totalGross: efterloenGross,
        totalNet: efterloenGross * (1 - pensionTaxRate),
      };
    }

    const atpGross = inputs.atpAnnualIncome ?? 0;
    if (!inputs.includeFolkepension) {
      return {
        efterloenGross: 0,
        atpGross,
        folkepensionGrundbeloeb: 0,
        folkepensionTillaeg: 0,
        folkepensionReduction: 0,
        totalGross: atpGross,
        totalNet: atpGross * (1 - pensionTaxRate),
      };
    }

    const multiplier = householdMultiplier(inputs);
    const grundbeloeb = PUBLIC_PENSION_2026.grundbeloeb * multiplier;
    const maxTillaeg = inputs.isCouple
      ? PUBLIC_PENSION_2026.pensionstillaegCouple
      : PUBLIC_PENSION_2026.pensionstillaegSingle;
    const freeDeduction = inputs.isCouple
      ? PUBLIC_PENSION_2026.freeDeductionCouple
      : PUBLIC_PENSION_2026.freeDeductionSingle;
    const reductionRate = inputs.isCouple
      ? PUBLIC_PENSION_2026.reductionRateCouple
      : PUBLIC_PENSION_2026.reductionRateSingle;
    const incomeBase = Math.max(0, taxablePrivatePensionWithdrawal + atpGross);
    const reduction = Math.min(
      maxTillaeg,
      Math.max(0, incomeBase - freeDeduction) * reductionRate,
    );
    const tillaeg = Math.max(0, maxTillaeg - reduction);
    const totalGross = atpGross + grundbeloeb + tillaeg;
    assertFinite(grundbeloeb, tillaeg, reduction, totalGross);

    return {
      efterloenGross: 0,
      atpGross,
      folkepensionGrundbeloeb: grundbeloeb,
      folkepensionTillaeg: tillaeg,
      folkepensionReduction: reduction,
      totalGross,
      totalNet: totalGross * (1 - pensionTaxRate),
    };
  }

  function desiredWithdrawalForAge(inputs, age) {
    const base = inputs.desiredAnnualWithdrawal;
    const stepAge = inputs.spendingStepAge;
    const stepPercent = inputs.spendingStepPercent ?? 0;
    if (
      Number.isInteger(stepAge) &&
      stepAge > 0 &&
      Number.isFinite(stepPercent) &&
      stepPercent !== 0 &&
      age >= stepAge
    ) {
      return Math.max(0, base * (1 + stepPercent));
    }
    return base;
  }

  function applyOneOffCashflowForAge(inputs, age) {
    const eventAge = inputs.oneOffEventAge;
    const eventAmount = inputs.oneOffEventAmount ?? 0;
    if (Number.isInteger(eventAge) && eventAge > 0 && age === eventAge) {
      return eventAmount;
    }
    return 0;
  }

  function calculateHousingForAge(inputs, age, effectiveFireAge = null) {
    if (!inputs.includeHousing || inputs.housingType === "rent") {
      return {
        housingValue: 0,
        housingDebt: 0,
        housingEquity: 0,
        unlockedAmount: 0,
        isUnlockYear: false,
      };
    }

    const currentAge = inputs.currentAge;
    const year = Math.max(0, age - currentAge);
    const inflation = inputs.inflationRate ?? 0.02;
    const priceGrowth = inputs.housingPriceGrowth ?? 0.02;
    const ownershipShare = Math.max(0, Math.min(1, inputs.housingOwnershipShare ?? 1.0));
    const initialValue = inputs.housingValue ?? 0;
    const initialDebt = inputs.housingDebt ?? 0;
    const annualAmortization = inputs.housingAnnualAmortization ?? 0;

    const realGrowthFactor = Math.pow((1 + priceGrowth) / (1 + inflation), year);
    const inflationFactor = Math.pow(1 + inflation, year);

    const nominalDebt = Math.max(0, initialDebt - annualAmortization * year);
    const realDebt = nominalDebt / inflationFactor;

    const totalPropertyValue = initialValue * realGrowthFactor;
    const totalPropertyEquity = Math.max(0, totalPropertyValue - realDebt);
    const myEquity = totalPropertyEquity * ownershipShare;

    const unlockEnabled = Boolean(inputs.housingUnlock);
    const unlockShare = Math.max(0, Math.min(1, inputs.housingUnlockShare ?? 0.5));
    const unlockAgeType = inputs.housingUnlockAgeType ?? "fire";
    const unlockCustomAge = inputs.housingUnlockAge ?? inputs.retirementAge;

    const targetUnlockAge =
      unlockAgeType === "fire"
        ? (effectiveFireAge ?? inputs.retirementAge)
        : unlockCustomAge;

    const isUnlockYear = unlockEnabled && age === targetUnlockAge;
    const unlockedAmount = isUnlockYear ? myEquity * unlockShare : 0;

    const postUnlockEquity =
      unlockEnabled && age >= targetUnlockAge
        ? Math.max(0, myEquity * (1 - unlockShare))
        : myEquity;

    return {
      housingValue: totalPropertyValue * ownershipShare,
      housingDebt: realDebt * ownershipShare,
      housingEquity: postUnlockEquity,
      unlockedAmount,
      isUnlockYear,
    };
  }

  function normalizeDate(date) {
    if (!(date instanceof Date) || !Number.isFinite(date.getTime())) {
      throw calculationError();
    }

    return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12);
  }

  function daysInMonth(year, month) {
    return new Date(year, month + 1, 0).getDate();
  }

  function annualDate(anchorDate, yearOffset) {
    const targetYear = anchorDate.getFullYear() + yearOffset;
    const month = anchorDate.getMonth();
    const day = Math.min(anchorDate.getDate(), daysInMonth(targetYear, month));
    const date = new Date(targetYear, month, day, 12);

    if (!Number.isFinite(date.getTime())) {
      throw calculationError();
    }

    return date;
  }

  function returnStrategy(inputs) {
    return inputs.returnStrategy ?? RETURN_STRATEGY.none;
  }

  function defensiveReturnRate(inputs) {
    return inputs.defensiveReturnRate ?? DEFAULT_DEFENSIVE_RETURN_RATE;
  }

  function returnDeclineYears(inputs) {
    return inputs.returnDeclineYears ?? DEFAULT_RETURN_DECLINE_YEARS;
  }

  function returnRecoveryYears(inputs) {
    return inputs.returnRecoveryYears ?? DEFAULT_RETURN_RECOVERY_YEARS;
  }

  function strategyReturnRate(
    growthReturnRate,
    defensiveRate,
    strategy,
    year,
    firstWithdrawalYear,
    declineYears = DEFAULT_RETURN_DECLINE_YEARS,
    recoveryYears = DEFAULT_RETURN_RECOVERY_YEARS,
  ) {
    if (strategy === RETURN_STRATEGY.none) {
      return growthReturnRate;
    }

    if (year < firstWithdrawalYear) {
      if (declineYears === 0) {
        return growthReturnRate;
      }

      const declineStartYear = firstWithdrawalYear - declineYears;
      if (year <= declineStartYear) {
        return growthReturnRate;
      }

      const progress =
        (year - declineStartYear) / declineYears;
      return growthReturnRate + (defensiveRate - growthReturnRate) * progress;
    }

    if (strategy === RETURN_STRATEGY.declining) {
      return defensiveRate;
    }

    if (year === firstWithdrawalYear) {
      return defensiveRate;
    }

    if (recoveryYears === 0) {
      return growthReturnRate;
    }

    const recoveryEndYear = firstWithdrawalYear + recoveryYears;
    if (year >= recoveryEndYear) {
      return growthReturnRate;
    }

    const progress =
      (year - firstWithdrawalYear) / recoveryYears;
    return defensiveRate + (growthReturnRate - defensiveRate) * progress;
  }

  function presentValueFactor(rates) {
    let factor = 0;
    let growth = 1;

    rates.forEach((rate) => {
      factor += 1 / growth;
      growth *= 1 + rate;
      assertFinite(factor, growth);
    });

    return factor;
  }

  function annualCapacity(balance, rates) {
    if (balance <= 0 || rates.length <= 0) {
      return 0;
    }

    const factor = presentValueFactor(rates);
    const capacity = factor > 0 ? balance / factor : 0;
    assertFinite(capacity);
    return capacity;
  }

  function compoundGrowth(rates) {
    const growth = rates.reduce((factor, rate) => factor * (1 + rate), 1);
    assertFinite(growth);
    return growth;
  }

  function allocateWithdrawals(capacities, desiredWithdrawal) {
    const totalCapacity = capacities.reduce((total, value) => total + value, 0);
    const total = Math.min(desiredWithdrawal, totalCapacity);
    assertFinite(totalCapacity, total);

    if (totalCapacity <= 0) {
      return { amounts: capacities.map(() => 0), total: 0 };
    }

    const amounts = capacities.map(
      (capacity) => total * (capacity / totalCapacity),
    );
    assertFinite(...amounts);
    return { amounts, total };
  }

  function allocateForPhase(capacities, desiredWithdrawal, beforeRetirement) {
    const freeIndexes = [FREE_FUNDS_REALIZATION, FREE_FUNDS_INVENTORY, ASK, CASH];
    if (beforeRetirement) {
      const allocation = allocateWithdrawals(
        freeIndexes.map((index) => capacities[index]),
        desiredWithdrawal,
      );

      return {
        amounts: [0, 0, 0, ...allocation.amounts],
        total: allocation.total,
      };
    }

    const pensionIndexes = [RATE_PENSION, LIFE_ANNUITY, AGE_SAVINGS];
    const pensionAllocation = allocateWithdrawals(
      pensionIndexes.map((index) => capacities[index]),
      desiredWithdrawal,
    );
    const freeAllocation = allocateWithdrawals(
      freeIndexes.map((index) => capacities[index]),
      desiredWithdrawal - pensionAllocation.total,
    );

    return {
      amounts: [...pensionAllocation.amounts, ...freeAllocation.amounts],
      total: pensionAllocation.total + freeAllocation.total,
    };
  }

  function grossWithdrawalForNetTarget(
    netTarget,
    realizationCapacity,
    totalFreeCapacity,
    realizationBalance,
    freeFundsCostBasis,
    shareIncomeThreshold = SHARE_INCOME_THRESHOLD,
  ) {
    if (netTarget <= 0) {
      return 0;
    }

    if (totalFreeCapacity <= 0) {
      return 0;
    }

    const realizationShare = realizationCapacity / totalFreeCapacity;
    const gainShare =
      realizationBalance > 0
        ? Math.max(
            0,
            (realizationBalance - freeFundsCostBasis) / realizationBalance,
          )
        : 0;
    const taxableGainPerGrossWithdrawal = realizationShare * gainShare;
    let grossWithdrawal = netTarget;

    if (taxableGainPerGrossWithdrawal > 0) {
      const grossAtThreshold =
        shareIncomeThreshold / taxableGainPerGrossWithdrawal;
      const netAtThreshold =
        grossAtThreshold - shareIncomeThreshold * SHARE_INCOME_LOW_RATE;

      if (netTarget <= netAtThreshold) {
        grossWithdrawal =
          netTarget /
          (1 - SHARE_INCOME_LOW_RATE * taxableGainPerGrossWithdrawal);
      } else {
        grossWithdrawal =
          (netTarget -
            (SHARE_INCOME_HIGH_RATE - SHARE_INCOME_LOW_RATE) *
              shareIncomeThreshold) /
          (1 - SHARE_INCOME_HIGH_RATE * taxableGainPerGrossWithdrawal);
      }
    }

    assertFinite(
      totalFreeCapacity,
      realizationShare,
      gainShare,
      taxableGainPerGrossWithdrawal,
      grossWithdrawal,
    );
    return Math.min(grossWithdrawal, totalFreeCapacity);
  }

  function grossPensionWithdrawalForNetTarget(
    desiredNetWithdrawal,
    ratePensionShare,
    lifeAnnuityShare,
    pensionWithdrawalTax,
    taxFreeRatePensionAllowance,
  ) {
    if (desiredNetWithdrawal <= 0) {
      return 0;
    }

    const usableTaxFreeAllowance =
      ratePensionShare > 0 ? taxFreeRatePensionAllowance : 0;
    const grossAtAllowanceLimit =
      ratePensionShare > 0 ? usableTaxFreeAllowance / ratePensionShare : 0;
    const netFractionBeforeAllowance =
      1 - pensionWithdrawalTax * lifeAnnuityShare;
    const netAtAllowanceLimit =
      grossAtAllowanceLimit * netFractionBeforeAllowance;

    if (desiredNetWithdrawal <= netAtAllowanceLimit + MONEY_TOLERANCE) {
      if (netFractionBeforeAllowance <= CALCULATION_TOLERANCE) {
        return null;
      }

      const grossWithdrawal = desiredNetWithdrawal / netFractionBeforeAllowance;
      assertFinite(grossWithdrawal);
      return grossWithdrawal;
    }

    const taxablePensionShare = ratePensionShare + lifeAnnuityShare;
    const netFractionAfterAllowance =
      1 - pensionWithdrawalTax * taxablePensionShare;
    if (netFractionAfterAllowance <= CALCULATION_TOLERANCE) {
      return null;
    }

    const grossWithdrawal =
      (desiredNetWithdrawal - pensionWithdrawalTax * usableTaxFreeAllowance) /
      netFractionAfterAllowance;
    assertFinite(grossWithdrawal);
    return grossWithdrawal;
  }

  function allocateForNetWithdrawal(
    balances,
    capacities,
    desiredNetWithdrawal,
    beforeRetirement,
    freeFundsCostBasis,
    pensionWithdrawalTax,
    taxFreeRatePensionAllowance = 0,
    shareIncomeThreshold = SHARE_INCOME_THRESHOLD,
    freeFundsStrategy = FREE_FUNDS_WITHDRAWAL_STRATEGY.proportional,
  ) {
    const pensionIndexes = [RATE_PENSION, LIFE_ANNUITY, AGE_SAVINGS];
    const freeIndexes = [FREE_FUNDS_REALIZATION, FREE_FUNDS_INVENTORY, ASK, CASH];
    const pensionCapacities = pensionIndexes.map((index) => capacities[index]);
    const totalPensionCapacity = pensionCapacities.reduce(
      (total, capacity) => total + capacity,
      0,
    );
    const ratePensionShare =
      totalPensionCapacity > 0
        ? pensionCapacities[RATE_PENSION] / totalPensionCapacity
        : 0;
    const lifeAnnuityShare =
      totalPensionCapacity > 0
        ? pensionCapacities[LIFE_ANNUITY] / totalPensionCapacity
        : 0;
    const requiredGrossPensionWithdrawal = grossPensionWithdrawalForNetTarget(
      desiredNetWithdrawal,
      ratePensionShare,
      lifeAnnuityShare,
      pensionWithdrawalTax,
      taxFreeRatePensionAllowance,
    );
    const desiredGrossPensionWithdrawal =
      requiredGrossPensionWithdrawal ?? totalPensionCapacity;
    const pensionAllocation = beforeRetirement
      ? { amounts: [0, 0, 0], total: 0 }
      : allocateWithdrawals(pensionCapacities, desiredGrossPensionWithdrawal);
    const taxableRatePensionWithdrawal = Math.max(
      0,
      pensionAllocation.amounts[RATE_PENSION] - taxFreeRatePensionAllowance,
    );
    const pensionTax =
      (taxableRatePensionWithdrawal + pensionAllocation.amounts[LIFE_ANNUITY]) *
      pensionWithdrawalTax;
    const pensionNetWithdrawal = pensionAllocation.total - pensionTax;
    const remainingNetWithdrawal = Math.max(
      0,
      desiredNetWithdrawal - pensionNetWithdrawal,
    );
    const freeAllocation = allocateFreeFundsWithdrawal(
      balances,
      capacities,
      remainingNetWithdrawal,
      freeFundsCostBasis,
      shareIncomeThreshold,
      freeFundsStrategy,
      true,
    );

    return {
      amounts: [...pensionAllocation.amounts, ...freeAllocation.amounts],
      total: pensionAllocation.total + freeAllocation.total,
    };
  }

  function allocateFreeFundsWithdrawal(
    balances,
    capacities,
    targetNet,
    freeFundsCostBasis,
    shareIncomeThreshold,
    strategy = FREE_FUNDS_WITHDRAWAL_STRATEGY.taxOptimal,
    withdrawalAfterTax = true,
  ) {
    const amounts = [0, 0, 0, 0]; // [FREE_FUNDS_REALIZATION, FREE_FUNDS_INVENTORY, ASK, CASH]
    let rem = Math.max(0, targetNet);
    if (rem <= 0) return { amounts, total: 0 };

    if (strategy === FREE_FUNDS_WITHDRAWAL_STRATEGY.proportional) {
      const freeIndexes = [FREE_FUNDS_REALIZATION, FREE_FUNDS_INVENTORY, ASK, CASH];
      const freeCapacities = freeIndexes.map((index) => capacities[index]);
      const totalFreeCapacity = freeCapacities.reduce((t, c) => t + c, 0);
      const freeGross = grossWithdrawalForNetTarget(
        rem,
        freeCapacities[0],
        totalFreeCapacity,
        balances[FREE_FUNDS_REALIZATION],
        freeFundsCostBasis,
        shareIncomeThreshold,
      );
      const alloc = allocateWithdrawals(freeCapacities, freeGross);
      return { amounts: alloc.amounts, total: alloc.total };
    }

    const realizationBalance = balances[FREE_FUNDS_REALIZATION];
    const gainShare = realizationBalance > 0
      ? Math.max(0, (realizationBalance - freeFundsCostBasis) / realizationBalance)
      : 0;

    const drawFromRealization = (maxLimit, isHighTier = false) => {
      const available = Math.max(0, realizationBalance - amounts[0]);
      if (available <= 0 || rem <= 0) return;
      const cap = Math.min(available, maxLimit);
      if (!withdrawalAfterTax || gainShare <= CALCULATION_TOLERANCE) {
        const draw = Math.min(cap, rem);
        amounts[0] += draw;
        rem = Math.max(0, rem - draw);
      } else {
        const taxRate = isHighTier ? SHARE_INCOME_HIGH_RATE : SHARE_INCOME_LOW_RATE;
        const netPerGross = 1 - taxRate * gainShare;
        const maxNet = cap * netPerGross;
        if (rem <= maxNet + MONEY_TOLERANCE) {
          const draw = Math.min(cap, rem / netPerGross);
          amounts[0] += draw;
          rem = 0;
        } else {
          amounts[0] += cap;
          rem = Math.max(0, rem - maxNet);
        }
      }
    };

    const drawFromCash = () => {
      if (balances[CASH] > 0 && rem > 0) {
        const draw = Math.min(balances[CASH], rem);
        amounts[3] += draw;
        rem = Math.max(0, rem - draw);
      }
    };

    const drawFromAsk = () => {
      if (balances[ASK] > 0 && rem > 0) {
        const draw = Math.min(balances[ASK], rem);
        amounts[2] += draw;
        rem = Math.max(0, rem - draw);
      }
    };

    const drawFromInventory = () => {
      if (balances[FREE_FUNDS_INVENTORY] > 0 && rem > 0) {
        const draw = Math.min(balances[FREE_FUNDS_INVENTORY], rem);
        amounts[1] += draw;
        rem = Math.max(0, rem - draw);
      }
    };

    if (strategy === FREE_FUNDS_WITHDRAWAL_STRATEGY.cashFirst) {
      drawFromCash();
      drawFromAsk();
      drawFromInventory();
      const maxGrossLow = gainShare > CALCULATION_TOLERANCE ? shareIncomeThreshold / gainShare : realizationBalance;
      drawFromRealization(maxGrossLow, false);
      drawFromRealization(realizationBalance, true);
    } else if (strategy === FREE_FUNDS_WITHDRAWAL_STRATEGY.stocksFirst) {
      const maxGrossLow = gainShare > CALCULATION_TOLERANCE ? shareIncomeThreshold / gainShare : realizationBalance;
      drawFromRealization(maxGrossLow, false);
      drawFromRealization(realizationBalance, true);
      drawFromInventory();
      drawFromAsk();
      drawFromCash();
    } else {
      // taxOptimal (default)
      const maxGrossLow = gainShare > CALCULATION_TOLERANCE ? shareIncomeThreshold / gainShare : realizationBalance;
      drawFromRealization(maxGrossLow, false);
      drawFromInventory();
      drawFromAsk();
      drawFromCash();
      drawFromRealization(realizationBalance, true);
    }

    const total = amounts.reduce((sum, v) => sum + v, 0);
    return { amounts, total };
  }

  function allocateTaxOptimalWithdrawal(
    balances,
    capacities,
    desiredTarget,
    beforeRetirement,
    freeFundsCostBasis,
    pensionWithdrawalTax,
    taxFreeRatePensionAllowance = 0,
    shareIncomeThreshold = SHARE_INCOME_THRESHOLD,
    withdrawalAfterTax = true,
    freeFundsStrategy = FREE_FUNDS_WITHDRAWAL_STRATEGY.taxOptimal,
  ) {
    const amounts = [0, 0, 0, 0, 0, 0, 0];
    let remainingTarget = Math.max(0, desiredTarget);
    if (remainingTarget <= 0) {
      return { amounts, total: 0 };
    }

    if (!beforeRetirement) {
      const rateCapacity = Math.min(
        balances[RATE_PENSION],
        capacities[RATE_PENSION],
      );
      if (rateCapacity > 0 && remainingTarget > 0) {
        if (!withdrawalAfterTax) {
          const draw = Math.min(rateCapacity, remainingTarget);
          amounts[RATE_PENSION] = draw;
          remainingTarget = Math.max(0, remainingTarget - draw);
        } else {
          const taxFreeCap = Math.min(rateCapacity, taxFreeRatePensionAllowance);
          if (remainingTarget <= taxFreeCap) {
            amounts[RATE_PENSION] = remainingTarget;
            remainingTarget = 0;
          } else {
            const netAfterTaxFree = remainingTarget - taxFreeCap;
            const netRate = 1 - pensionWithdrawalTax;
            const additionalGross =
              netRate > CALCULATION_TOLERANCE
                ? Math.min(
                    Math.max(0, rateCapacity - taxFreeCap),
                    netAfterTaxFree / netRate,
                  )
                : 0;
            const totalRateDraw = taxFreeCap + additionalGross;
            const deliveredNet = taxFreeCap + additionalGross * netRate;
            amounts[RATE_PENSION] = totalRateDraw;
            remainingTarget = Math.max(0, remainingTarget - deliveredNet);
          }
        }
      }

      const ageScheduledCapacity = Math.min(
        balances[AGE_SAVINGS],
        capacities[AGE_SAVINGS],
      );
      if (ageScheduledCapacity > 0 && remainingTarget > 0) {
        const draw = Math.min(ageScheduledCapacity, remainingTarget);
        amounts[AGE_SAVINGS] = draw;
        remainingTarget = Math.max(0, remainingTarget - draw);
      }
    }

    if (remainingTarget > 0) {
      const freeAlloc = allocateFreeFundsWithdrawal(
        balances,
        capacities,
        remainingTarget,
        freeFundsCostBasis,
        shareIncomeThreshold,
        freeFundsStrategy,
        withdrawalAfterTax,
      );
      amounts[FREE_FUNDS_REALIZATION] += freeAlloc.amounts[0];
      amounts[FREE_FUNDS_INVENTORY] += freeAlloc.amounts[1];
      amounts[ASK] += freeAlloc.amounts[2];
      amounts[CASH] += freeAlloc.amounts[3];
    }

    const total = amounts.reduce((sum, value) => sum + value, 0);
    assertFinite(...amounts, total);
    return { amounts, total };
  }

  function growBalances(balances, rates) {
    const grown = balances.map((balance, index) =>
      Math.max(0, balance * (1 + rates[index])),
    );
    assertFinite(...grown);
    return grown;
  }

  function midyearGrowthFactor(rate) {
    const factor = Math.sqrt(1 + rate);
    assertFinite(factor);
    return factor;
  }

  function calculateShareIncomeTax(
    taxableGain,
    shareIncomeThreshold = SHARE_INCOME_THRESHOLD,
  ) {
    const tax =
      Math.min(taxableGain, shareIncomeThreshold) * SHARE_INCOME_LOW_RATE +
      Math.max(0, taxableGain - shareIncomeThreshold) *
        SHARE_INCOME_HIGH_RATE;
    assertFinite(taxableGain, tax);
    return tax;
  }

  function calculateFreeFundsSale(
    balance,
    costBasis,
    withdrawal,
    shareIncomeThreshold = SHARE_INCOME_THRESHOLD,
  ) {
    if (balance <= 0 || withdrawal <= 0) {
      return {
        realizedGain: 0,
        tax: 0,
        remainingCostBasis: costBasis,
      };
    }

    const soldShare = Math.min(1, withdrawal / balance);
    const usedCostBasis = costBasis * soldShare;
    const realizedGain = withdrawal - usedCostBasis;
    const taxableGain = Math.max(0, realizedGain);
    const tax = calculateShareIncomeTax(taxableGain, shareIncomeThreshold);
    const remainingCostBasis =
      soldShare >= 1 - CALCULATION_TOLERANCE
        ? 0
        : Math.max(0, costBasis - usedCostBasis);

    assertFinite(
      soldShare,
      usedCostBasis,
      realizedGain,
      taxableGain,
      tax,
      remainingCostBasis,
    );
    return { realizedGain, tax, remainingCostBasis };
  }

  function createRow(
    age,
    date,
    balances,
    freeFundsCostBasis,
    ratePensionNonDeductibleBasis = 0,
    values = {},
  ) {
    const totalBalance = balances.reduce(
      (total, balance) => total + balance,
      0,
    );
    const row = {
      age,
      date: new Date(date),
      phase: "Opsparing",
      pensionReturnRate: null,
      freeFundsReturnRate: null,
      ratePension: balances[RATE_PENSION],
      lifeAnnuity: balances[LIFE_ANNUITY],
      lifeAnnuityDepotValue: balances[LIFE_ANNUITY],
      ageSavings: balances[AGE_SAVINGS],
      freeFunds:
        balances[FREE_FUNDS_REALIZATION] + balances[FREE_FUNDS_INVENTORY],
      freeFundsRealization: balances[FREE_FUNDS_REALIZATION],
      freeFundsInventory: balances[FREE_FUNDS_INVENTORY],
      ask: balances[ASK],
      cash: balances[CASH] ?? 0,
      totalBalance,
      contribution: 0,
      withdrawal: 0,
      desiredWithdrawal: 0,
      freeFundsWithdrawal: 0,
      realizedFreeFundsGain: 0,
      withdrawalTax: 0,
      annualFreeFundsTax: 0,
      pensionWithdrawalTax: 0,
      lifeAnnuityWithdrawal: 0,
      totalWithdrawalTax: 0,
      netWithdrawal: 0,
      publicPensionGross: 0,
      publicPensionNet: 0,
      atpGross: 0,
      efterloenGross: 0,
      oneOffCashflow: 0,
      housingValue: 0,
      housingDebt: 0,
      housingEquity: 0,
      housingUnlocked: 0,
      totalWealthWithHousing: totalBalance,
      effectiveFreeFundsWithdrawalTaxRate: 0,
      effectiveWithdrawalTaxRate: 0,
      freeFundsCostBasis,
      ratePensionNonDeductibleBasis,
      taxFreeRatePensionWithdrawal: 0,
      taxableRatePensionWithdrawal: 0,
      askWithdrawal: 0,
      cashWithdrawal: 0,
      ageSavingsWithdrawal: 0,
      withdrawalSource: "—",
      withdrawalShortfall: false,
      ...values,
    };

    row.totalDepotValue = row.totalBalance +
      row.lifeAnnuityDepotValue - row.lifeAnnuity;
    row.totalWealthWithHousing = row.totalBalance + (row.housingEquity ?? 0);
    const pensionBalance =
      row.ratePension + row.lifeAnnuityDepotValue + row.ageSavings;
    const freeStockBalance = row.freeFunds + row.ask;
    const cashRate = values.cashReturnRate ?? 0.015;
    row.cashInterestRate = cashRate;
    row.averageReturnRate =
      row.totalDepotValue > 0 &&
      Number.isFinite(row.pensionReturnRate) &&
      Number.isFinite(row.freeFundsReturnRate)
        ? (pensionBalance * row.pensionReturnRate +
            freeStockBalance * row.freeFundsReturnRate +
            row.cash * cashRate) /
          row.totalDepotValue
        : null;

    const totalLiquidFree = row.freeFunds + (row.cash ?? 0);
    row.cashShare = totalLiquidFree > 0 ? (row.cash / totalLiquidFree) : 0;

    Object.values(row)
      .filter((value) => typeof value === "number")
      .forEach((value) => assertFinite(value));
    return row;
  }

  function assertInputs(inputs) {
    const amounts = [
      "ratePensionBalance",
      "ageSavingsBalance",
      "freeFundsBalance",
      "freeFundsCostBasis",
      "askBalance",
      "annualRatePensionContribution",
      "annualAgeSavingsContribution",
      "annualFreeFundsContribution",
      "desiredAnnualWithdrawal",
    ];
    const taxes = ["pensionTax", "askTax"];
    const optionalAmounts = [
      inputs.lifeAnnuityBalance ?? 0,
      inputs.annualLifeAnnuityContribution ?? 0,
      inputs.annualAskContribution ?? 0,
      inputs.cashBalance ?? 0,
      inputs.annualCashContribution ?? 0,
      inputs.atpAnnualIncome ?? 0,
      inputs.efterloenAnnualIncome ?? 0,
    ];
    ageSavingsContributionLimit(inputs);
    if (
      inputs.freeFundsTaxation !== undefined &&
      ![
        FREE_FUNDS_TAXATION.realization,
        FREE_FUNDS_TAXATION.inventory,
      ].includes(inputs.freeFundsTaxation)
    ) {
      throw new Error(
        "Beskatning af frie midler skal være realisations- eller lagerbeskatning.",
      );
    }

    const inventoryShare = freeFundsInventoryShare(inputs);
    if (inputs.cashShareStart !== undefined) {
      if (!Number.isFinite(inputs.cashShareStart) || inputs.cashShareStart < 0 || inputs.cashShareStart > 100) {
        throw new Error("Kontantandel ved start skal være mellem 0 % og 100 %.");
      }
    }
    if (inputs.cashShareTarget !== undefined) {
      if (!Number.isFinite(inputs.cashShareTarget) || inputs.cashShareTarget < 0 || inputs.cashShareTarget > 100) {
        throw new Error("Kontantandel ved pension skal være mellem 0 % og 100 %.");
      }
    }
    if (Array.isArray(inputs.annualCashShares)) {
      for (const share of inputs.annualCashShares) {
        if (Number.isFinite(share) && (share < 0 || (share > 1 && share > 100))) {
          throw new Error("Årlig kontantandel skal være mellem 0 % og 100 %.");
        }
      }
    }
    if (Array.isArray(inputs.annualCashInterestRates)) {
      for (const rate of inputs.annualCashInterestRates) {
        if (Number.isFinite(rate) && rate <= -1) {
          throw new Error("Årlig kontantrente kan ikke være lavere end -100 %.");
        }
      }
    }
    if (
      !Number.isFinite(inventoryShare) ||
      inventoryShare < 0 ||
      inventoryShare > 1
    ) {
      throw new Error(
        "Andelen af lagerbeskattede frie midler skal være mellem 0 og 100 %.",
      );
    }

    if (!Number.isInteger(inputs.currentAge) || inputs.currentAge < 0) {
      throw new Error("Din nuværende alder skal være et helt tal.");
    }

    if (
      !Number.isInteger(inputs.retirementAge) ||
      inputs.retirementAge <= inputs.currentAge
    ) {
      throw new Error(
        "Pensionsalderen skal være et helt tal og højere end din nuværende alder.",
      );
    }

    if (!Number.isInteger(inputs.payoutYears) || inputs.payoutYears <= 0) {
      throw new Error(
        "Udbetalingsperioden skal være et positivt antal hele år.",
      );
    }

    const includesRatePension =
      inputs.ratePensionBalance > 0 || inputs.annualRatePensionContribution > 0;
    if (
      includesRatePension &&
      (inputs.payoutYears < 10 || inputs.payoutYears > 30)
    ) {
      throw new Error(
        "Ratepension skal udbetales over mellem 10 og 30 hele år.",
      );
    }

    amounts.forEach((key) => {
      if (!Number.isFinite(inputs[key]) || inputs[key] < 0) {
        throw new Error("Beløb skal være 0 eller højere.");
      }
    });
    if (optionalAmounts.some((value) => !Number.isFinite(value) || value < 0)) {
      throw new Error("Beløb skal være 0 eller højere.");
    }

    const ratePensionNonDeductibleBasis =
      inputs.ratePensionNonDeductibleBasis ?? 0;
    if (
      !Number.isFinite(ratePensionNonDeductibleBasis) ||
      ratePensionNonDeductibleBasis < 0
    ) {
      throw new Error("Beløb skal være 0 eller højere.");
    }

    if (
      inventoryShare < 1 &&
      inputs.freeFundsCostBasis > inputs.freeFundsBalance
    ) {
      throw new Error(
        "Den samlede købspris må ikke være højere end værdien af de frie midler.",
      );
    }

    taxes.forEach((key) => {
      if (!Number.isFinite(inputs[key]) || inputs[key] < 0 || inputs[key] > 1) {
        throw new Error("Skattesatser skal være mellem 0 og 100 %.");
      }
    });

    const pensionWithdrawalTax = inputs.pensionWithdrawalTax ?? 0;
    if (
      !Number.isFinite(pensionWithdrawalTax) ||
      pensionWithdrawalTax < 0 ||
      pensionWithdrawalTax > 1
    ) {
      throw new Error("Skattesatser skal være mellem 0 og 100 %.");
    }

    const ratePensionContributionTaxRelief =
      inputs.ratePensionContributionTaxRelief ?? 0;
    if (
      !Number.isFinite(ratePensionContributionTaxRelief) ||
      ratePensionContributionTaxRelief < 0 ||
      ratePensionContributionTaxRelief > 1
    ) {
      throw new Error("Skattesatser skal være mellem 0 og 100 %.");
    }

    const cashInterestRate = inputs.cashInterestRate ?? 0.015;
    if (!Number.isFinite(cashInterestRate)) {
      throw new Error("Renten på kontantreserve skal være et gyldigt tal.");
    }

    const cashInterestTax = inputs.cashInterestTax ?? 0.37;
    if (
      !Number.isFinite(cashInterestTax) ||
      cashInterestTax < 0 ||
      cashInterestTax > 1
    ) {
      throw new Error("Skattesatser skal være mellem 0 og 100 %.");
    }

    if (!Number.isFinite(inputs.returnRate) || inputs.returnRate < 0) {
      throw new Error("Det forventede afkast skal være 0 % eller højere.");
    }

    const selectedReturnStrategy = returnStrategy(inputs);
    if (!Object.values(RETURN_STRATEGY).includes(selectedReturnStrategy)) {
      throw new Error("Vælg en gyldig afkaststrategi.");
    }

    if (selectedReturnStrategy !== RETURN_STRATEGY.none) {
      const selectedDefensiveReturnRate = defensiveReturnRate(inputs);
      if (
        !Number.isFinite(selectedDefensiveReturnRate) ||
        selectedDefensiveReturnRate < 0 ||
        selectedDefensiveReturnRate > inputs.returnRate
      ) {
        throw new Error(
          "Det defensive afkast skal være mellem 0 % og det forventede afkast.",
        );
      }

      const selectedReturnDeclineYears = returnDeclineYears(inputs);
      if (
        !Number.isInteger(selectedReturnDeclineYears) ||
        selectedReturnDeclineYears < 0
      ) {
        throw new Error(
          "Nedtrapningsperioden skal være 0 eller flere hele år.",
        );
      }

      if (selectedReturnStrategy === RETURN_STRATEGY.riskTent) {
        const selectedReturnRecoveryYears = returnRecoveryYears(inputs);
        if (
          !Number.isInteger(selectedReturnRecoveryYears) ||
          selectedReturnRecoveryYears < 0
        ) {
          throw new Error(
            "Genoptrapningsperioden skal være 0 eller flere hele år.",
          );
        }
      }
    }

    if (!Number.isFinite(inputs.inflationRate) || inputs.inflationRate <= -1) {
      throw new Error("Inflationen skal være større end -100 %.");
    }
    const payoutRate = inputs.lifeAnnuityPayoutRate ?? 0.0322;
    if (!Number.isFinite(payoutRate) || payoutRate <= -1) {
      throw new Error("Livrentens udbetalingsrente skal være større end -100 %.");
    }

    if (inputs.includeHousing) {
      const housingValue = inputs.housingValue ?? 0;
      const housingDebt = inputs.housingDebt ?? 0;
      const amortization = inputs.housingAnnualAmortization ?? 0;
      if (!Number.isFinite(housingValue) || housingValue < 0) {
        throw new Error("Boligens værdi skal være 0 eller højere.");
      }
      if (!Number.isFinite(housingDebt) || housingDebt < 0) {
        throw new Error("Restgæld i boligen skal være 0 eller højere.");
      }
      if (!Number.isFinite(amortization) || amortization < 0) {
        throw new Error("Årligt afdrag på gæld skal være 0 eller højere.");
      }
      if (inputs.housingPriceGrowth !== undefined && (!Number.isFinite(inputs.housingPriceGrowth) || inputs.housingPriceGrowth <= -1)) {
        throw new Error("Forventet prisstigning skal være større end -100 %.");
      }
      if (inputs.housingOwnershipShare !== undefined && (!Number.isFinite(inputs.housingOwnershipShare) || inputs.housingOwnershipShare < 0 || inputs.housingOwnershipShare > 1)) {
        throw new Error("Ejerandel skal være mellem 0 og 100 %.");
      }
    }
  }

  function calculateFireForAnchor(
    inputs,
    calculationDate = new Date(),
    {
      includeBridgeCapacity = true,
      assumedFireYear = null,
      freeReturnAnchorYear = null,
      candidateOnly = false,
      calculationCache = null,
    } = {},
  ) {
    const asOfDate = normalizeDate(calculationDate);
    const yearsToRetirement = inputs.retirementAge - inputs.currentAge;
    const finalYear = yearsToRetirement + inputs.payoutYears;
    const retirementDate = annualDate(asOfDate, yearsToRetirement);
    const finalDate = annualDate(asOfDate, finalYear);
    const selectedReturnStrategy = returnStrategy(inputs);
    const selectedDefensiveReturnRate = defensiveReturnRate(inputs);
    const selectedReturnDeclineYears = returnDeclineYears(inputs);
    const selectedReturnRecoveryYears = returnRecoveryYears(inputs);
    const effectiveFreeReturnAnchorYear =
      freeReturnAnchorYear ?? yearsToRetirement;
    const pensionWithdrawalTax = inputs.pensionWithdrawalTax ?? 0;
    const ratePensionContributionTaxRelief =
      inputs.ratePensionContributionTaxRelief ?? 0;
    const selectedAgeSavingsContributionLimit =
      ageSavingsContributionLimit(inputs);
    const selectedRatePensionLimit = effectiveRatePensionLimit(inputs);
    const selectedLifeAnnuityLimit = effectiveLifeAnnuityLimit(inputs);
    const selectedAskDepositCap = effectiveAskDepositCap(inputs);
    const selectedShareIncomeThreshold = effectiveShareIncomeThreshold(inputs);
    const annualDeductibleRatePensionContribution = Math.min(
      inputs.annualRatePensionContribution,
      selectedRatePensionLimit,
    );
    const annualNonDeductibleRatePensionContribution = Math.max(
      0,
      inputs.annualRatePensionContribution -
        annualDeductibleRatePensionContribution,
    );
    const annualLifeAnnuityContribution =
      inputs.annualLifeAnnuityContribution ?? 0;
    const initialRatePensionNonDeductibleBasis =
      inputs.ratePensionNonDeductibleBasis ?? 0;
    const effectiveAnnualAgeSavingsContribution = Math.min(
      inputs.annualAgeSavingsContribution,
      selectedAgeSavingsContributionLimit,
    );
    const annualAgeSavingsContributionRedirected = Math.max(
      0,
      inputs.annualAgeSavingsContribution -
        effectiveAnnualAgeSavingsContribution,
    );
    const inventoryShare = freeFundsInventoryShare(inputs);
    const freeFundsTaxation =
      inventoryShare === 1
        ? FREE_FUNDS_TAXATION.inventory
        : inventoryShare === 0
          ? FREE_FUNDS_TAXATION.realization
          : FREE_FUNDS_TAXATION.mixed;
    const usesInventoryTax = inventoryShare > 0;
    let anchorCache = calculationCache?.anchorCaches.get(
      effectiveFreeReturnAnchorYear,
    );
    if (!anchorCache) {
      anchorCache = {
        realReturnSeries: new Map(),
        presentValueFactors: new Map(),
        compoundGrowth: new Map(),
      };
      calculationCache?.anchorCaches.set(
        effectiveFreeReturnAnchorYear,
        anchorCache,
      );
    }
    const realReturnSeriesCache = anchorCache.realReturnSeries;
    const presentValueFactorCache = anchorCache.presentValueFactors;
    const compoundGrowthCache = anchorCache.compoundGrowth;

    function applyRealizedReturnMultiplier(baseReturn, year, useRealized) {
      if (!useRealized) {
        return baseReturn;
      }
      if (
        Array.isArray(inputs.annualReturnRates) &&
        Number.isFinite(inputs.annualReturnRates[year])
      ) {
        return inputs.annualReturnRates[year];
      }
      if (
        !Array.isArray(inputs.annualReturnMultipliers) ||
        !Number.isFinite(inputs.annualReturnMultipliers[year])
      ) {
        return baseReturn;
      }
      return Math.max(
        -0.85,
        (1 + baseReturn) * inputs.annualReturnMultipliers[year] - 1,
      );
    }

    function pensionNominalReturn(year, useRealized = false) {
      const base = strategyReturnRate(
        inputs.returnRate,
        selectedDefensiveReturnRate,
        selectedReturnStrategy,
        year,
        yearsToRetirement,
        selectedReturnDeclineYears,
        selectedReturnRecoveryYears,
      );
      return applyRealizedReturnMultiplier(base, year, useRealized);
    }

    function freeNominalReturn(year, useRealized = false) {
      const base = strategyReturnRate(
        inputs.returnRate,
        selectedDefensiveReturnRate,
        selectedReturnStrategy,
        year,
        effectiveFreeReturnAnchorYear,
        selectedReturnDeclineYears,
        selectedReturnRecoveryYears,
      );
      return applyRealizedReturnMultiplier(base, year, useRealized);
    }

    function realPensionReturnFor(nominalReturn) {
      return (
        (1 + nominalReturn * (1 - inputs.pensionTax)) /
          (1 + inputs.inflationRate) -
        1
      );
    }

    function realAskReturnFor(nominalReturn) {
      return (
        (1 + nominalReturn * (1 - inputs.askTax)) /
          (1 + inputs.inflationRate) -
        1
      );
    }

    function grossRealFreeFundsReturnFor(nominalReturn) {
      return (1 + nominalReturn) / (1 + inputs.inflationRate) - 1;
    }

    function realCashReturnFor(nominalReturn, taxRate) {
      return (
        (1 + nominalReturn * (1 - taxRate)) /
          (1 + inputs.inflationRate) -
        1
      );
    }

    const cashInterestRate = inputs.cashInterestRate ?? 0.015;
    const cashInterestTax = inputs.cashInterestTax ?? 0.37;
    const realCashReturn = realCashReturnFor(cashInterestRate, cashInterestTax);

    function getCashInterestRateForYear(year) {
      if (
        Array.isArray(inputs.annualCashInterestRates) &&
        Number.isFinite(inputs.annualCashInterestRates[year])
      ) {
        const rateVal = inputs.annualCashInterestRates[year];
        return rateVal > 1 ? rateVal / 100 : rateVal;
      }
      return inputs.cashInterestRate ?? 0.015;
    }

    function realCashReturnForYear(year) {
      const nominalRate = getCashInterestRateForYear(year);
      return realCashReturnFor(nominalRate, cashInterestTax);
    }

    const netPensionReturn = inputs.returnRate * (1 - inputs.pensionTax);
    const realPensionReturn = realPensionReturnFor(inputs.returnRate);
    const realAskReturn = realAskReturnFor(inputs.returnRate);
    const grossRealFreeFundsReturn = grossRealFreeFundsReturnFor(
      inputs.returnRate,
    );
    const defensiveRealPensionReturn = realPensionReturnFor(
      selectedDefensiveReturnRate,
    );
    const defensiveRealAskReturn = realAskReturnFor(
      selectedDefensiveReturnRate,
    );
    const defensiveGrossRealFreeFundsReturn = grossRealFreeFundsReturnFor(
      selectedDefensiveReturnRate,
    );
    const lifeAnnuityPayoutRate = inputs.lifeAnnuityPayoutRate ?? 0.0322;
    let lifeAnnuityMetrics = calculationCache?.lifeAnnuityMetrics;
    if (!lifeAnnuityMetrics) {
      lifeAnnuityMetrics = calculateLifeAnnuityMetrics({
        retirementAge: inputs.retirementAge,
        retirementYear: retirementDate.getFullYear(),
        discountRates: [lifeAnnuityPayoutRate],
      });
      if (calculationCache) {
        calculationCache.lifeAnnuityMetrics = lifeAnnuityMetrics;
      }
    }

    function annualLifeAnnuityIncome(balanceAtRetirement) {
      const income = balanceAtRetirement * lifeAnnuityMetrics.conversionRate;
      assertFinite(income);
      return income;
    }

    // For a pure life annuity on an unchanged mortality basis, annual reserve
    // recalculation (including survivor credits) reduces to this ratio.
    // The annuity factor discounts NOMINAL payments. Deflate each subsequent
    // payment separately; using a real discount rate would promise indexation.
    let lifeAnnuityIncomeFactors = calculationCache?.lifeAnnuityIncomeFactors;
    if (!lifeAnnuityIncomeFactors) {
      lifeAnnuityIncomeFactors = [1];
      for (let period = 1; period < inputs.payoutYears; period += 1) {
        lifeAnnuityIncomeFactors.push(
          lifeAnnuityIncomeFactors[period - 1] *
            (1 + realPensionReturnFor(
              pensionNominalReturn(yearsToRetirement + period - 1),
            )) / (1 + lifeAnnuityPayoutRate),
        );
      }
      if (calculationCache) {
        calculationCache.lifeAnnuityIncomeFactors = lifeAnnuityIncomeFactors;
      }
    }
    const lifeIncomeBounds = calculationCache?.lifeIncomeBounds ?? {
      minimum: Math.min(...lifeAnnuityIncomeFactors),
      maximum: Math.max(...lifeAnnuityIncomeFactors),
      // Discounting the regulated income at its investment return cancels
      // that return, leaving only the payout rate in the present value.
      presentValue: presentValueFactor(
        Array(inputs.payoutYears).fill(lifeAnnuityPayoutRate),
      ),
    };
    if (calculationCache) {
      calculationCache.lifeIncomeBounds = lifeIncomeBounds;
    }

    function lifeAnnuityDepotValue(initialIncome, year) {
      const period = year - yearsToRetirement;
      // The final row has no payment, but still has an opening reserve.
      const incomeFactor = lifeAnnuityIncomeFactors[period] ??
        lifeAnnuityIncomeFactors[period - 1] *
          (1 + realPensionReturnFor(pensionNominalReturn(year - 1))) /
          (1 + lifeAnnuityPayoutRate);
      const factors = lifeAnnuityMetrics.pureLifeAnnuityFactors;
      const reserveFactor = factors[Math.min(period, factors.length - 1)];
      return initialIncome * incomeFactor * reserveFactor;
    }

    function inventoryTaxForBalance(
      balance,
      nominalReturn,
      priorTaxableGain = 0,
    ) {
      if (balance <= 0 || nominalReturn <= 0) {
        return 0;
      }

      const inventoryGain = balance * nominalReturn;
      return (
        calculateShareIncomeTax(
          priorTaxableGain + inventoryGain,
          selectedShareIncomeThreshold,
        ) -
        calculateShareIncomeTax(
          priorTaxableGain,
          selectedShareIncomeThreshold,
        )
      );
    }

    function inventoryAnnualCapacity(balance, startYear, periods) {
      if (balance <= 0 || periods <= 0) {
        return 0;
      }

      let affordable = 0;
      let unaffordable = balance;

      for (let iteration = 0; iteration < 60; iteration += 1) {
        if (unaffordable - affordable <= MONEY_TOLERANCE) {
          break;
        }

        const withdrawal = (affordable + unaffordable) / 2;
        let remaining = balance;
        let funded = true;

        for (let period = 0; period < periods; period += 1) {
          if (remaining + MONEY_TOLERANCE < withdrawal) {
            funded = false;
            break;
          }

          remaining = Math.max(0, remaining - withdrawal);
          const nominalReturn = freeNominalReturn(startYear + period);
          const tax = inventoryTaxForBalance(remaining, nominalReturn);
          remaining =
            (remaining * (1 + nominalReturn) - tax) /
            (1 + inputs.inflationRate);
          assertFinite(remaining, tax);
        }

        if (funded) {
          affordable = withdrawal;
        } else {
          unaffordable = withdrawal;
        }
      }

      assertFinite(affordable);
      return affordable;
    }

    function inventoryRateForBalance(balance, nominalReturn) {
      if (balance <= 0) {
        return (
          (1 + nominalReturn * (1 - SHARE_INCOME_LOW_RATE)) /
            (1 + inputs.inflationRate) -
          1
        );
      }

      return (
        (balance * (1 + nominalReturn) -
          inventoryTaxForBalance(balance, nominalReturn)) /
          (1 + inputs.inflationRate) /
          balance -
        1
      );
    }

    function ratesForBalances(balances, year, useRealized = false) {
      const pensionReturn = pensionNominalReturn(year, useRealized);
      const freeReturn = freeNominalReturn(year, useRealized);
      return [
        realPensionReturnFor(pensionReturn),
        realPensionReturnFor(pensionReturn),
        realPensionReturnFor(pensionReturn),
        grossRealFreeFundsReturnFor(freeReturn),
        inventoryRateForBalance(
          balances[FREE_FUNDS_INVENTORY],
          freeReturn,
        ),
        realAskReturnFor(freeReturn),
        realCashReturnForYear(year),
      ];
    }

    function realReturnSeriesFor(index, startYear, periods) {
      const key = `${index}:${startYear}:${periods}`;
      const cached = realReturnSeriesCache.get(key);
      if (cached) {
        return cached;
      }

      const series = Array.from({ length: periods }, (_value, period) => {
        const year = startYear + period;
        if (index <= AGE_SAVINGS) {
          return realPensionReturnFor(pensionNominalReturn(year));
        }
        if (index === ASK) {
          return realAskReturnFor(freeNominalReturn(year));
        }
        if (index === CASH) {
          return realCashReturnForYear(year);
        }
        return grossRealFreeFundsReturnFor(freeNominalReturn(year));
      });
      realReturnSeriesCache.set(key, series);
      return series;
    }

    function presentValueFactorFor(index, startYear, periods) {
      const key = `${index}:${startYear}:${periods}`;
      if (presentValueFactorCache.has(key)) {
        return presentValueFactorCache.get(key);
      }

      const factor = presentValueFactor(
        realReturnSeriesFor(index, startYear, periods),
      );
      presentValueFactorCache.set(key, factor);
      return factor;
    }

    function pensionGrowthFactor(startYear, periods) {
      const key = `${startYear}:${periods}`;
      if (compoundGrowthCache.has(key)) {
        return compoundGrowthCache.get(key);
      }

      const factor =
        selectedReturnStrategy === RETURN_STRATEGY.none
          ? Math.pow(1 + realPensionReturn, periods)
          : compoundGrowth(
              realReturnSeriesFor(RATE_PENSION, startYear, periods),
            );
      compoundGrowthCache.set(key, factor);
      return factor;
    }

    function capacitiesForBalances(balances, startYear, periods) {
      return balances.map((balance, index) => {
        if (index === FREE_FUNDS_INVENTORY) {
          return inventoryAnnualCapacity(balance, startYear, periods);
        }
        if (balance <= 0 || periods <= 0) {
          return 0;
        }
        const factor = presentValueFactorFor(index, startYear, periods);
        const capacity = factor > 0 ? balance / factor : 0;
        assertFinite(capacity);
        return capacity;
      });
    }

    function growBalancesWithTax(
      balances,
      year,
      priorTaxableGain = 0,
      useRealized = false,
    ) {
      const inventoryBalance = balances[FREE_FUNDS_INVENTORY];
      const nominalReturn = freeNominalReturn(year, useRealized);
      const inventoryTax = inventoryTaxForBalance(
        inventoryBalance,
        nominalReturn,
        priorTaxableGain,
      );
      const currentRates = ratesForBalances(balances, year, useRealized);
      const grownBalances = growBalances(balances, currentRates);

      grownBalances[FREE_FUNDS_INVENTORY] = Math.max(
        0,
        (inventoryBalance * (1 + nominalReturn) - inventoryTax) /
          (1 + inputs.inflationRate),
      );

      const realTax = inventoryTax / (1 + inputs.inflationRate);
      const realTaxableGain = usesInventoryTax
        ? Math.max(0, inventoryBalance * nominalReturn) /
          (1 + inputs.inflationRate)
        : 0;

      assertFinite(...grownBalances, realTax, realTaxableGain);
      return {
        balances: grownBalances,
        freeFundsTax: realTax,
        freeFundsTaxableGain: realTaxableGain,
      };
    }

    const boundaryRates = [
      realPensionReturn,
      realAskReturn,
      grossRealFreeFundsReturn,
      realCashReturn,
      defensiveRealPensionReturn,
      defensiveRealAskReturn,
      defensiveGrossRealFreeFundsReturn,
    ];
    if (boundaryRates.some((rate) => !Number.isFinite(rate) || rate <= -1)) {
      throw new Error("Forudsætningerne giver et ugyldigt reelt afkast.");
    }

    const followsInflation = inputs.contributionsFollowInflation !== false;
    const redirectsPensionContributions =
      inputs.redirectPensionContributionsToFreeFunds !== false;
    const hasDynamicCashShare =
      Number.isFinite(inputs.cashShareStart) ||
      (Array.isArray(inputs.annualCashShares) &&
        inputs.annualCashShares.some((s) => Number.isFinite(s)));
    let initialCash = 0;
    let initialFreeRealization = 0;
    let initialFreeInventory = 0;
    let initialCostBasis = inputs.freeFundsCostBasis ?? 0;

    if (hasDynamicCashShare) {
      const totalFree = (inputs.freeFundsBalance ?? 0) > 0 ? inputs.freeFundsBalance : (inputs.cashBalance ?? 0);
      const startShare = getTargetCashShare(0, inputs.currentAge, inputs, inputs.retirementAge);
      initialCash = totalFree * startShare;
      const initialFreeStock = totalFree * (1 - startShare);
      initialFreeRealization = initialFreeStock * (1 - inventoryShare);
      initialFreeInventory = initialFreeStock * inventoryShare;
      initialCostBasis = Math.min(initialFreeRealization, inputs.freeFundsCostBasis ?? 0);
    } else {
      initialCash = inputs.cashBalance ?? 0;
      initialFreeRealization = inputs.freeFundsBalance * (1 - inventoryShare);
      initialFreeInventory = inputs.freeFundsBalance * inventoryShare;
      initialCostBasis = (inputs.freeFundsCostBasis ?? 0) * (1 - inventoryShare);
    }

    const initialBalances = [
      inputs.ratePensionBalance,
      inputs.lifeAnnuityBalance ?? 0,
      inputs.ageSavingsBalance,
      initialFreeRealization,
      initialFreeInventory,
      inputs.askBalance,
      initialCash,
    ];
    assertFinite(...initialBalances, initialCostBasis);

    function contributionAtMidyear(baseContribution, yearNumber) {
      if (baseContribution <= 0) {
        return 0;
      }

      const contribution = followsInflation
        ? baseContribution
        : baseContribution /
          Math.pow(1 + inputs.inflationRate, yearNumber - 0.5);
      assertFinite(contribution);
      return contribution;
    }

    function accumulateWithMidyearContributions(
      startingBalances,
      contributions,
      year,
    ) {
      const growth = growBalancesWithTax(startingBalances, year, 0, true);
      const currentRates = ratesForBalances(startingBalances, year, true);
      const endingBalances = growth.balances.map(
        (balance, index) =>
          balance +
          contributions[index] * midyearGrowthFactor(currentRates[index]),
      );

      if (contributions[FREE_FUNDS_INVENTORY] > 0) {
        const startingBalance = startingBalances[FREE_FUNDS_INVENTORY];
        const contribution = contributions[FREE_FUNDS_INVENTORY];
        const nominalReturn = freeNominalReturn(year, true);
        const nominalHalfYearGrowth = Math.sqrt(1 + nominalReturn);
        const inflationHalfYearGrowth = Math.sqrt(1 + inputs.inflationRate);
        const openingBalanceAtYearEnd =
          (startingBalance * (1 + nominalReturn)) /
          (1 + inputs.inflationRate);
        const contributionAtYearEnd =
          contribution * (nominalHalfYearGrowth / inflationHalfYearGrowth);
        const taxableGain =
          nominalReturn > 0
            ? startingBalance * nominalReturn +
              contribution *
                inflationHalfYearGrowth *
                (nominalHalfYearGrowth - 1)
            : 0;
        const tax =
          calculateShareIncomeTax(taxableGain, selectedShareIncomeThreshold) /
          (1 + inputs.inflationRate);

        endingBalances[FREE_FUNDS_INVENTORY] = Math.max(
          0,
          openingBalanceAtYearEnd + contributionAtYearEnd - tax,
        );
        growth.freeFundsTax = tax;
        growth.freeFundsTaxableGain = taxableGain / (1 + inputs.inflationRate);
      }

      assertFinite(...endingBalances);
      return { ...growth, balances: endingBalances };
    }

    function annualTaxFreeRatePensionAllowance(
      nonDeductibleBasis,
      remainingPayoutYears,
    ) {
      if (nonDeductibleBasis <= 0 || remainingPayoutYears <= 0) {
        return 0;
      }

      // SKAT requires the tax-free principal to be spread over the fixed
      // payout period. This annual model approximates that rule with equal
      // nominal allowances. Deflating the remaining basis after each year
      // makes the allowance decrease in real terms when inflation is positive.
      const allowance = nonDeductibleBasis / remainingPayoutYears;
      assertFinite(allowance);
      return allowance;
    }

    function pensionTargetForMix(
      ratePension,
      lifeAnnuity,
      ageSavings,
      nonDeductibleBasis,
      desiredWithdrawal = inputs.desiredAnnualWithdrawal,
    ) {
      if (desiredWithdrawal <= 0 && !inputs.spendingStepPercent && !inputs.oneOffEventAmount) {
        return 0;
      }

      const lifeAnnuityIncome = annualLifeAnnuityIncome(lifeAnnuity);
      const usableLifeAnnuityIncome = inputs.withdrawalAfterTax
        ? lifeAnnuityIncome * (1 - pensionWithdrawalTax)
        : lifeAnnuityIncome;
      const flexiblePension = ratePension + ageSavings;
      const payoutFactor = presentValueFactorFor(
        RATE_PENSION,
        yearsToRetirement,
        inputs.payoutYears,
      );
      const payoutRates = realReturnSeriesFor(
        RATE_PENSION,
        yearsToRetirement,
        inputs.payoutYears,
      );
      const remainingWithdrawalFor = (period) => {
        const retirementPeriodAge = inputs.retirementAge + period;
        const periodDesired = desiredWithdrawalForAge(inputs, retirementPeriodAge);
        const periodOneOff = applyOneOffCashflowForAge(inputs, retirementPeriodAge);
        const periodPubPension = inputs.includeFolkepension
          ? calculatePublicPensionForAge(
              inputs,
              retirementPeriodAge,
              usableLifeAnnuityIncome * lifeAnnuityIncomeFactors[period],
            )
          : { totalGross: 0, totalNet: 0, guaranteedIncomeGross: 0, guaranteedIncomeNet: 0 };
        const periodAtp = inputs.atpAnnualIncome ?? 0;
        const periodGuaranteedNet = inputs.withdrawalAfterTax
          ? (periodPubPension.totalNet + periodAtp * (1 - pensionWithdrawalTax))
          : (periodPubPension.totalGross + periodAtp);
        const netNeeded = Math.max(0, periodDesired - periodGuaranteedNet - periodOneOff);
        return Math.max(0, netNeeded - usableLifeAnnuityIncome * lifeAnnuityIncomeFactors[period]);
      };
      let remainingPresentValue = 0;
      let discount = 1;
      for (let period = 0; period < inputs.payoutYears; period += 1) {
        remainingPresentValue += remainingWithdrawalFor(period) / discount;
        discount *= 1 + payoutRates[period];
      }
      if (remainingPresentValue <= MONEY_TOLERANCE) {
        return lifeAnnuity;
      }
      if (flexiblePension <= CALCULATION_TOLERANCE) {
        if (inputs.withdrawalAfterTax) {
          return null;
        }
        return lifeAnnuity + remainingPresentValue;
      }

      if (!inputs.withdrawalAfterTax) {
        return lifeAnnuity + remainingPresentValue;
      }
      const rateShare = ratePension / flexiblePension;
      const initialTaxFreeAllowance = annualTaxFreeRatePensionAllowance(
        nonDeductibleBasis,
        inputs.payoutYears,
      );
      if (initialTaxFreeAllowance <= CALCULATION_TOLERANCE) {
        const netFraction = 1 - pensionWithdrawalTax * rateShare;
        if (netFraction <= CALCULATION_TOLERANCE) {
          return null;
        }

        const target =
          lifeAnnuity +
          remainingPresentValue / netFraction;
        assertFinite(target);
        return target;
      }

      let target = 0;
      let discountFactor = 1;

      for (let period = 0; period < inputs.payoutYears; period += 1) {
        const taxFreeAllowance =
          initialTaxFreeAllowance / Math.pow(1 + inputs.inflationRate, period);
        const grossWithdrawal = grossPensionWithdrawalForNetTarget(
          remainingWithdrawalFor(period),
          rateShare,
          0,
          pensionWithdrawalTax,
          taxFreeAllowance,
        );
        if (grossWithdrawal === null) {
          return null;
        }

        target += grossWithdrawal / discountFactor;
        discountFactor *= 1 + payoutRates[period];
        assertFinite(target, discountFactor);
      }

      target += lifeAnnuity;
      assertFinite(target);
      return target;
    }

    function simulateDrawdown(
      startYear,
      startBalances,
      startFreeFundsCostBasis,
      startRatePensionNonDeductibleBasis,
      {
        desiredWithdrawal = inputs.desiredAnnualWithdrawal,
        endYear = finalYear,
        shouldRecord = false,
        startingContribution = 0,
      } = {},
    ) {
      let balances = [...startBalances];
      let freeFundsCostBasis = startFreeFundsCostBasis;
      let ratePensionNonDeductibleBasis = startRatePensionNonDeductibleBasis;
      const rows = [];
      let isFullyFunded = true;
      let firstShortfallDate = null;
      let annualFreeFundsTax = 0;
      let annualFreeFundsTaxableGain = 0;
      let lifeAnnuityConverted = false;
      let lifeAnnuityBalanceAtRetirement = 0;
      let lifeAnnuityAnnualIncome = 0;

      for (let year = startYear; year < endYear; year += 1) {
        const beforeRetirement = year < yearsToRetirement;
        if (!beforeRetirement && !lifeAnnuityConverted) {
          lifeAnnuityConverted = true;
          lifeAnnuityBalanceAtRetirement = balances[LIFE_ANNUITY];
          lifeAnnuityAnnualIncome = annualLifeAnnuityIncome(
            lifeAnnuityBalanceAtRetirement,
          );
          balances[LIFE_ANNUITY] = 0;
        }

        const currentAgeYear = inputs.currentAge + year;
        const effectiveFireAge = inputs.currentAge + startYear;
        const housingInfo = calculateHousingForAge(
          inputs,
          currentAgeYear,
          effectiveFireAge,
        );
        if (housingInfo.unlockedAmount > 0) {
          balances[FREE_FUNDS_REALIZATION] += housingInfo.unlockedAmount;
          freeFundsCostBasis += housingInfo.unlockedAmount;
        }

        const periods = beforeRetirement
          ? yearsToRetirement - year
          : endYear - year;
        const capacities = capacitiesForBalances(balances, year, periods);
        const remainingPayoutYears = beforeRetirement ? 0 : finalYear - year;
        const taxFreeRatePensionAllowance = beforeRetirement
          ? 0
          : annualTaxFreeRatePensionAllowance(
              ratePensionNonDeductibleBasis,
              remainingPayoutYears,
            );
        const lifeAnnuityWithdrawal = beforeRetirement
          ? 0
          : lifeAnnuityAnnualIncome *
            lifeAnnuityIncomeFactors[year - yearsToRetirement];
        const lifeAnnuityWithdrawalTax =
          lifeAnnuityWithdrawal * pensionWithdrawalTax;

        const baseDesired = desiredWithdrawalForAge(inputs, currentAgeYear);
        const oneOff = applyOneOffCashflowForAge(inputs, currentAgeYear);
        const atpIncome = (!beforeRetirement && inputs.atpAnnualIncome) ? inputs.atpAnnualIncome : 0;
        const efterloenIncome = (beforeRetirement && inputs.efterloenAnnualIncome && year >= yearsToRetirement - (inputs.efterloenYears ?? 0)) ? inputs.efterloenAnnualIncome : 0;
        const taxablePensionEst = beforeRetirement ? 0 : (lifeAnnuityWithdrawal + capacities[RATE_PENSION]);
        const pubPension = (!beforeRetirement && inputs.includeFolkepension)
          ? calculatePublicPensionForAge(inputs, currentAgeYear, taxablePensionEst)
          : { grundbeloeb: 0, pensionstillaeg: 0, totalGross: 0, totalNet: 0, guaranteedIncomeGross: 0, guaranteedIncomeNet: 0 };
        
        const nonPortfolioGross = pubPension.totalGross + atpIncome + efterloenIncome;
        const nonPortfolioNet = inputs.withdrawalAfterTax !== false
          ? (pubPension.totalNet + (atpIncome + efterloenIncome) * (1 - pensionWithdrawalTax))
          : nonPortfolioGross;

        const currentYearDesiredWithdrawal = Math.max(0, baseDesired - nonPortfolioNet - oneOff);

        if (oneOff > 0 && baseDesired - nonPortfolioNet < oneOff) {
          const surplus = oneOff - Math.max(0, baseDesired - nonPortfolioNet);
          balances[FREE_FUNDS_REALIZATION] += surplus;
          freeFundsCostBasis += surplus;
        }

        const remainingDesiredWithdrawal = Math.max(
          0,
          currentYearDesiredWithdrawal -
            (inputs.withdrawalAfterTax
              ? lifeAnnuityWithdrawal - lifeAnnuityWithdrawalTax
              : lifeAnnuityWithdrawal),
        );
        const freeStrategy = freeFundsWithdrawalStrategy(inputs);
        const allocateCurrentWithdrawal = (withdrawalCapacities) => {
          if (withdrawalStrategy(inputs) === WITHDRAWAL_STRATEGY.taxOptimal) {
            return allocateTaxOptimalWithdrawal(
              balances,
              withdrawalCapacities,
              remainingDesiredWithdrawal,
              beforeRetirement,
              freeFundsCostBasis,
              pensionWithdrawalTax,
              taxFreeRatePensionAllowance,
              selectedShareIncomeThreshold,
              inputs.withdrawalAfterTax !== false,
              freeStrategy,
            );
          }
          return inputs.withdrawalAfterTax
            ? allocateForNetWithdrawal(
                balances,
                withdrawalCapacities,
                remainingDesiredWithdrawal,
                beforeRetirement,
                freeFundsCostBasis,
                pensionWithdrawalTax,
                taxFreeRatePensionAllowance,
                selectedShareIncomeThreshold,
                freeStrategy,
              )
            : allocateForPhase(
                withdrawalCapacities,
                remainingDesiredWithdrawal,
                beforeRetirement,
              );
        };
        let allocation = allocateCurrentWithdrawal(capacities);
        if (!beforeRetirement && lifeAnnuityAnnualIncome > 0) {
          const delivered = inputs.withdrawalAfterTax
            ? allocation.total -
              Math.max(0, allocation.amounts[RATE_PENSION] -
                taxFreeRatePensionAllowance) * pensionWithdrawalTax -
              calculateFreeFundsSale(
                balances[FREE_FUNDS_REALIZATION],
                freeFundsCostBasis,
                allocation.amounts[FREE_FUNDS_REALIZATION],
                selectedShareIncomeThreshold,
              ).tax
            : allocation.total;
          if (delivered + MONEY_TOLERANCE < remainingDesiredWithdrawal) {
            // A rising annuity can require larger flexible withdrawals now
            // and smaller ones later. The level-payment capacity is not a
            // withdrawal limit for age savings, ASK or free funds. Keep the
            // rate-pension limit and let the full simulation test solvency.
            const flexibleCapacities = balances.map((balance, index) =>
              index === RATE_PENSION ? capacities[index] :
                index === LIFE_ANNUITY ? 0 : balance,
            );
            allocation = allocateCurrentWithdrawal(flexibleCapacities);
          }
        }
        const date = annualDate(asOfDate, year);
        const realizationWithdrawal =
          allocation.amounts[FREE_FUNDS_REALIZATION];
        const freeFundsWithdrawal =
          realizationWithdrawal + allocation.amounts[FREE_FUNDS_INVENTORY];
        const freeFundsSale = calculateFreeFundsSale(
          balances[FREE_FUNDS_REALIZATION],
          freeFundsCostBasis,
          realizationWithdrawal,
          selectedShareIncomeThreshold,
        );
        const taxFreeRatePensionWithdrawal = Math.min(
          allocation.amounts[RATE_PENSION],
          taxFreeRatePensionAllowance,
        );
        const taxableRatePensionWithdrawal = Math.max(
          0,
          allocation.amounts[RATE_PENSION] - taxFreeRatePensionWithdrawal,
        );
        const pensionWithdrawalTaxAmount =
          taxableRatePensionWithdrawal * pensionWithdrawalTax +
          lifeAnnuityWithdrawalTax;
        const totalWithdrawalTax =
          freeFundsSale.tax + pensionWithdrawalTaxAmount;
        const totalWithdrawal = allocation.total + lifeAnnuityWithdrawal;
        const netWithdrawal = totalWithdrawal - totalWithdrawalTax;
        const effectiveFreeFundsWithdrawalTaxRate =
          freeFundsWithdrawal > 0 ? freeFundsSale.tax / freeFundsWithdrawal : 0;
        const effectiveWithdrawalTaxRate =
          totalWithdrawal > 0 ? totalWithdrawalTax / totalWithdrawal : 0;
        const deliveredWithdrawal = inputs.withdrawalAfterTax
          ? netWithdrawal
          : totalWithdrawal;
        const totalDelivered = deliveredWithdrawal + nonPortfolioNet + oneOff;
        const shortfall =
          totalDelivered + MONEY_TOLERANCE < baseDesired;

        if (shortfall && !firstShortfallDate) {
          firstShortfallDate = new Date(date);
        }
        isFullyFunded = isFullyFunded && !shortfall;

        if (shouldRecord) {
          const pensionWithdrawal =
            allocation.amounts[RATE_PENSION] +
            allocation.amounts[AGE_SAVINGS] +
            lifeAnnuityWithdrawal;
          const stockDraw =
            allocation.amounts[FREE_FUNDS_REALIZATION] +
            allocation.amounts[FREE_FUNDS_INVENTORY];
          const cashDraw = allocation.amounts[CASH] ?? 0;
          const askDraw = allocation.amounts[ASK] ?? 0;

          let withdrawalSource = "—";
          if (totalWithdrawal > MONEY_TOLERANCE) {
            const parts = [];
            if (pensionWithdrawal > MONEY_TOLERANCE) parts.push("Pension");
            if (stockDraw > MONEY_TOLERANCE && cashDraw > MONEY_TOLERANCE) {
              parts.push("Frie Midler (aktier & kontant)");
            } else if (stockDraw > MONEY_TOLERANCE) {
              parts.push("Frie Midler (aktier)");
            } else if (cashDraw > MONEY_TOLERANCE) {
              parts.push("Frie Midler (kontant)");
            }
            if (askDraw > MONEY_TOLERANCE && parts.length === 0) {
              parts.push("ASK");
            }
            withdrawalSource = parts.join(" + ") || "Frie Midler";
          }

          rows.push(
            createRow(
              inputs.currentAge + year,
              date,
              balances,
              freeFundsCostBasis,
              ratePensionNonDeductibleBasis,
              {
                phase: beforeRetirement ? "FIRE" : "Pension",
                pensionReturnRate: pensionNominalReturn(year, shouldRecord),
                freeFundsReturnRate: freeNominalReturn(year, shouldRecord),
                cashReturnRate: getCashInterestRateForYear(year),
                contribution: year === startYear ? startingContribution : 0,
                withdrawal: totalWithdrawal,
                desiredWithdrawal: baseDesired,
                freeFundsWithdrawal,
                realizedFreeFundsGain: freeFundsSale.realizedGain,
                withdrawalTax: freeFundsSale.tax,
                pensionWithdrawalTax: pensionWithdrawalTaxAmount,
                lifeAnnuityWithdrawal,
                lifeAnnuityDepotValue: beforeRetirement
                  ? balances[LIFE_ANNUITY]
                  : lifeAnnuityDepotValue(lifeAnnuityAnnualIncome, year),
                taxFreeRatePensionWithdrawal,
                taxableRatePensionWithdrawal,
                totalWithdrawalTax,
                netWithdrawal,
                publicPensionGross: pubPension.totalGross,
                publicPensionNet: pubPension.totalNet,
                atpGross: atpIncome,
                efterloenGross: efterloenIncome,
                oneOffCashflow: oneOff,
                housingValue: housingInfo.housingValue,
                housingDebt: housingInfo.housingDebt,
                housingEquity: housingInfo.housingEquity,
                housingUnlocked: housingInfo.unlockedAmount,
                effectiveFreeFundsWithdrawalTaxRate,
                effectiveWithdrawalTaxRate,
                withdrawalSource,
                withdrawalShortfall: shortfall,
                askWithdrawal: allocation.amounts[ASK] ?? 0,
                cashWithdrawal: allocation.amounts[CASH] ?? 0,
                ageSavingsWithdrawal: allocation.amounts[AGE_SAVINGS] ?? 0,
              },
            ),
          );
        }

        freeFundsCostBasis = freeFundsSale.remainingCostBasis;
        balances = balances.map((balance, index) =>
          Math.max(0, balance - allocation.amounts[index]),
        );
        const growth = growBalancesWithTax(
          balances,
          year,
          Math.max(0, freeFundsSale.realizedGain),
          shouldRecord,
        );
        if (shouldRecord) {
          rows[rows.length - 1].annualFreeFundsTax = growth.freeFundsTax;
        }
        balances = growth.balances;
        if (hasDynamicCashShare) {
          const nextTargetShare = getTargetCashShare(year + 1, currentAgeYear + 1, inputs, effectiveFireAge);
          const totalFreeEnding = balances[FREE_FUNDS_REALIZATION] + balances[FREE_FUNDS_INVENTORY] + balances[CASH];
          if (totalFreeEnding > 0) {
            const targetCashEnding = totalFreeEnding * nextTargetShare;
            const targetStockEnding = totalFreeEnding - targetCashEnding;
            balances[CASH] = targetCashEnding;
            balances[FREE_FUNDS_REALIZATION] = targetStockEnding * (1 - inventoryShare);
            balances[FREE_FUNDS_INVENTORY] = targetStockEnding * inventoryShare;
            freeFundsCostBasis = Math.min(balances[FREE_FUNDS_REALIZATION], freeFundsCostBasis);
          }
        }
        annualFreeFundsTax += growth.freeFundsTax;
        annualFreeFundsTaxableGain += growth.freeFundsTaxableGain;
        freeFundsCostBasis /= 1 + inputs.inflationRate;
        ratePensionNonDeductibleBasis =
          Math.max(
            0,
            ratePensionNonDeductibleBasis - taxFreeRatePensionAllowance,
          ) /
          (1 + inputs.inflationRate);
        assertFinite(freeFundsCostBasis, ratePensionNonDeductibleBasis);
      }

      if (shouldRecord) {
        const endHousingInfo = calculateHousingForAge(
          inputs,
          inputs.currentAge + endYear,
          inputs.currentAge + startYear,
        );
        rows.push(
          createRow(
            inputs.currentAge + endYear,
            annualDate(asOfDate, endYear),
            balances,
            freeFundsCostBasis,
            ratePensionNonDeductibleBasis,
            {
              phase: "Slut",
              cashReturnRate: getCashInterestRateForYear(endYear),
              lifeAnnuityDepotValue: lifeAnnuityConverted
                ? lifeAnnuityDepotValue(lifeAnnuityAnnualIncome, endYear)
                : balances[LIFE_ANNUITY],
              housingValue: endHousingInfo.housingValue,
              housingDebt: endHousingInfo.housingDebt,
              housingEquity: endHousingInfo.housingEquity,
              housingUnlocked: 0,
            },
          ),
        );
      }

      return {
        rows,
        finalBalances: balances,
        finalFreeFundsCostBasis: freeFundsCostBasis,
        finalRatePensionNonDeductibleBasis: ratePensionNonDeductibleBasis,
        annualFreeFundsTax,
        annualFreeFundsTaxableGain,
        lifeAnnuityAnnualIncome,
        lifeAnnuityBalanceAtRetirement,
        isFullyFunded,
        firstShortfallDate,
      };
    }

    function sustainableBridgeWithdrawal(
      startYear,
      startBalances,
      startFreeFundsCostBasis,
      startRatePensionNonDeductibleBasis,
    ) {
      const bridgeYears = yearsToRetirement - startYear;

      if (bridgeYears <= 0) {
        return 0;
      }

      const grossCapacity = allocateForPhase(
        capacitiesForBalances(startBalances, startYear, bridgeYears),
        Number.MAX_VALUE,
        true,
      ).total;

      if (
        grossCapacity <= 0 ||
        !inputs.withdrawalAfterTax ||
        startBalances[FREE_FUNDS_REALIZATION] <= MONEY_TOLERANCE
      ) {
        return grossCapacity;
      }

      function bridgeIsFunded(desiredWithdrawal) {
        return simulateDrawdown(
          startYear,
          startBalances,
          startFreeFundsCostBasis,
          startRatePensionNonDeductibleBasis,
          {
            desiredWithdrawal,
            endYear: yearsToRetirement,
          },
        ).isFullyFunded;
      }

      if (bridgeIsFunded(grossCapacity)) {
        return grossCapacity;
      }

      let affordable = 0;
      let unaffordable = grossCapacity;

      for (let iteration = 0; iteration < 60; iteration += 1) {
        if (unaffordable - affordable <= MONEY_TOLERANCE) {
          break;
        }

        const candidate = (affordable + unaffordable) / 2;

        if (bridgeIsFunded(candidate)) {
          affordable = candidate;
        } else {
          unaffordable = candidate;
        }
      }

      assertFinite(affordable);
      return affordable;
    }

    function pensionMilestoneStatus(
      year,
      balances,
      ratePensionNonDeductibleBasis,
    ) {
      const bridgeYears = yearsToRetirement - year;
      const pensionGrowth = pensionGrowthFactor(year, bridgeYears);
      const ratePensionAtRetirement = balances[RATE_PENSION] * pensionGrowth;
      const lifeAnnuityAtRetirement = balances[LIFE_ANNUITY] * pensionGrowth;
      const ageSavingsAtRetirement = balances[AGE_SAVINGS] * pensionGrowth;
      const pensionAtRetirement =
        ratePensionAtRetirement +
        lifeAnnuityAtRetirement +
        ageSavingsAtRetirement;
      const ratePensionNonDeductibleBasisAtRetirement =
        ratePensionNonDeductibleBasis /
        Math.pow(1 + inputs.inflationRate, bridgeYears);
      const pensionTargetAtRetirement = pensionTargetForMix(
        ratePensionAtRetirement,
        lifeAnnuityAtRetirement,
        ageSavingsAtRetirement,
        ratePensionNonDeductibleBasisAtRetirement,
      );
      const coastFinanced =
        pensionTargetAtRetirement !== null &&
        pensionTargetAtRetirement <= pensionAtRetirement + MONEY_TOLERANCE;
      const pensionTarget =
        pensionTargetAtRetirement === null
          ? null
          : pensionTargetAtRetirement / pensionGrowth;

      assertFinite(pensionAtRetirement, pensionTarget ?? 0);
      return { bridgeYears, pensionTarget, coastFinanced };
    }

    function evaluateMilestone(
      year,
      balances,
      freeFundsCostBasis,
      ratePensionNonDeductibleBasis,
      checkFireReadiness = true,
    ) {
      const { bridgeYears, pensionTarget, coastFinanced } =
        pensionMilestoneStatus(
          year,
          balances,
          ratePensionNonDeductibleBasis,
        );
      const drawdown = checkFireReadiness
        ? simulateDrawdown(
            year,
            balances,
            freeFundsCostBasis,
            ratePensionNonDeductibleBasis,
            { shouldRecord: false },
          )
        : null;

      const lifeAnnuityVal =
        year < yearsToRetirement ? balances[LIFE_ANNUITY] : 0;
      const freeFundsVal =
        balances[FREE_FUNDS_REALIZATION] + balances[FREE_FUNDS_INVENTORY];
      const totalBalanceVal =
        balances[RATE_PENSION] +
        lifeAnnuityVal +
        balances[AGE_SAVINGS] +
        freeFundsVal +
        balances[ASK] +
        (balances[CASH] ?? 0);
      const milestoneHousing = calculateHousingForAge(
        inputs,
        inputs.currentAge + year,
        null,
      );

      return {
        age: inputs.currentAge + year,
        date: annualDate(asOfDate, year),
        ratePension: balances[RATE_PENSION],
        lifeAnnuity: lifeAnnuityVal,
        ageSavings: balances[AGE_SAVINGS],
        freeFunds: freeFundsVal,
        freeFundsRealization: balances[FREE_FUNDS_REALIZATION],
        freeFundsInventory: balances[FREE_FUNDS_INVENTORY],
        freeFundsCostBasis,
        ratePensionNonDeductibleBasis,
        ask: balances[ASK],
        cash: balances[CASH] ?? 0,
        totalBalance: totalBalanceVal,
        housingEquity: milestoneHousing.housingEquity,
        totalWealthWithHousing:
          totalBalanceVal + (milestoneHousing.housingEquity ?? 0),
        bridgeYears,
        pensionTarget,
        coastFinanced,
        possibleBridgeWithdrawal: null,
        fireReady: drawdown?.isFullyFunded ?? false,
      };
    }

    const accumulationRows = [];
    const milestoneRows = [];
    let balances = [...initialBalances];
    let freeFundsCostBasis = initialCostBasis;
    let ratePensionNonDeductibleBasis = initialRatePensionNonDeductibleBasis;
    let accumulationFreeFundsTax = 0;
    let accumulationFreeFundsTaxableGain = 0;
    let contributionAtCheckpoint = 0;
    let pensionContributionsActive = true;
    let pensionCoastRow = null;
    let pensionStopRow = null;
    let fireRow = null;
    let drawdownStartYear = yearsToRetirement;
    let drawdownStartBalances = null;
    let drawdownStartFreeFundsCostBasis = null;
    let drawdownStartRatePensionNonDeductibleBasis = null;
    let drawdownStartContribution = 0;

    for (let year = 0; year <= yearsToRetirement; year += 1) {
      const currentAgeYear = inputs.currentAge + year;
      const accHousingInfo = calculateHousingForAge(inputs, currentAgeYear, null);
      if (accHousingInfo.unlockedAmount > 0) {
        balances[FREE_FUNDS_REALIZATION] += accHousingInfo.unlockedAmount;
        freeFundsCostBasis += accHousingInfo.unlockedAmount;
      }

      if (candidateOnly) {
        const { coastFinanced } = pensionMilestoneStatus(
          year,
          balances,
          ratePensionNonDeductibleBasis,
        );
        if (!pensionCoastRow && coastFinanced) {
          pensionCoastRow = true;
          pensionStopRow = true;
          pensionContributionsActive = false;
        }

        if (year === assumedFireYear) {
          const fireReady = simulateDrawdown(
            year,
            balances,
            freeFundsCostBasis,
            ratePensionNonDeductibleBasis,
            { shouldRecord: false },
          ).isFullyFunded;
          return {
            fireRow: fireReady
              ? { age: inputs.currentAge + year }
              : null,
          };
        }
      }

      const hasLockedSchedule = Number.isInteger(inputs.lockedFireYear);
      const checkFireReadiness =
        assumedFireYear === null || year === assumedFireYear || hasLockedSchedule;
      const milestone = candidateOnly
        ? null
        : evaluateMilestone(
            year,
            balances,
            freeFundsCostBasis,
            ratePensionNonDeductibleBasis,
            checkFireReadiness,
          );
      if (milestone) {
        milestoneRows.push(milestone);
      }

      if (hasLockedSchedule) {
        const stopYear = Number.isInteger(inputs.lockedPensionStopYear)
          ? inputs.lockedPensionStopYear
          : inputs.lockedFireYear;
        if (year >= stopYear && !pensionStopRow) {
          pensionCoastRow = milestone;
          pensionStopRow = milestone;
          pensionContributionsActive = false;
        }
        if (year === inputs.lockedFireYear) {
          if (milestone && includeBridgeCapacity) {
            milestone.possibleBridgeWithdrawal = sustainableBridgeWithdrawal(
              year,
              balances,
              freeFundsCostBasis,
              ratePensionNonDeductibleBasis,
            );
          }
          fireRow =
            inputs.lockedFireYear < yearsToRetirement ? milestone : null;
          pensionStopRow = pensionStopRow || milestone;
          drawdownStartYear = year;
          drawdownStartBalances = [...balances];
          drawdownStartFreeFundsCostBasis = freeFundsCostBasis;
          drawdownStartRatePensionNonDeductibleBasis =
            ratePensionNonDeductibleBasis;
          drawdownStartContribution = contributionAtCheckpoint;
          break;
        }
      } else {
        if (milestone && !pensionCoastRow && milestone.coastFinanced) {
          pensionCoastRow = milestone;
          pensionStopRow = pensionStopRow || milestone;
          pensionContributionsActive = false;
        }

        if (milestone?.fireReady) {
          if (includeBridgeCapacity) {
            milestone.possibleBridgeWithdrawal = sustainableBridgeWithdrawal(
              year,
              balances,
              freeFundsCostBasis,
              ratePensionNonDeductibleBasis,
            );
          }
          fireRow = milestone;
          pensionStopRow = pensionStopRow || milestone;
          drawdownStartYear = year;
          drawdownStartBalances = [...balances];
          drawdownStartFreeFundsCostBasis = freeFundsCostBasis;
          drawdownStartRatePensionNonDeductibleBasis =
            ratePensionNonDeductibleBasis;
          drawdownStartContribution = contributionAtCheckpoint;
          break;
        }
      }

      if (year === yearsToRetirement) {
        drawdownStartBalances = [...balances];
        drawdownStartFreeFundsCostBasis = freeFundsCostBasis;
        drawdownStartRatePensionNonDeductibleBasis =
          ratePensionNonDeductibleBasis;
        drawdownStartContribution = contributionAtCheckpoint;
        break;
      }

      if (!candidateOnly) {
        accumulationRows.push(
          createRow(
            inputs.currentAge + year,
            annualDate(asOfDate, year),
            balances,
            freeFundsCostBasis,
            ratePensionNonDeductibleBasis,
            {
              phase: "Opsparing",
              pensionReturnRate: pensionNominalReturn(year, true),
              freeFundsReturnRate: freeNominalReturn(year, true),
              cashReturnRate: getCashInterestRateForYear(year),
              contribution: contributionAtCheckpoint,
              housingValue: accHousingInfo.housingValue,
              housingDebt: accHousingInfo.housingDebt,
              housingEquity: accHousingInfo.housingEquity,
              housingUnlocked: accHousingInfo.unlockedAmount,
            },
          ),
        );
      }

      const nextYear = year + 1;
      const oneOffAcc = applyOneOffCashflowForAge(inputs, inputs.currentAge + year);
      if (oneOffAcc !== 0) {
        balances[FREE_FUNDS_REALIZATION] = Math.max(0, balances[FREE_FUNDS_REALIZATION] + oneOffAcc);
        if (oneOffAcc > 0) {
          freeFundsCostBasis += oneOffAcc;
        }
      }

      const shouldCalculatePensionContributions =
        pensionContributionsActive || redirectsPensionContributions;
      const deductibleRatePensionContribution =
        shouldCalculatePensionContributions
          ? contributionAtMidyear(
              annualDeductibleRatePensionContribution,
              nextYear,
            )
          : 0;
      const nonDeductibleRatePensionContribution =
        shouldCalculatePensionContributions
          ? contributionAtMidyear(
              annualNonDeductibleRatePensionContribution,
              nextYear,
            )
          : 0;
      const lifeAnnuityContribution = shouldCalculatePensionContributions
        ? contributionAtMidyear(annualLifeAnnuityContribution, nextYear)
        : 0;
      const ageSavingsContribution = shouldCalculatePensionContributions
        ? contributionAtMidyear(effectiveAnnualAgeSavingsContribution, nextYear)
        : 0;
      const ageSavingsContributionRedirected = contributionAtMidyear(
        annualAgeSavingsContributionRedirected,
        nextYear,
      );
      const redirectedPensionContribution =
        !pensionContributionsActive && redirectsPensionContributions
          ? deductibleRatePensionContribution *
              (1 - ratePensionContributionTaxRelief) +
            nonDeductibleRatePensionContribution +
            lifeAnnuityContributionNetCost(
              lifeAnnuityContribution,
              ratePensionContributionTaxRelief,
            ) +
            ageSavingsContribution
          : 0;

      let askContribution = contributionAtMidyear(inputs.annualAskContribution ?? 0, nextYear);
      const availableAskRoom = Math.max(0, selectedAskDepositCap - balances[ASK]);
      let askContributionRedirected = 0;
      if (askContribution > availableAskRoom) {
        askContributionRedirected = askContribution - availableAskRoom;
        askContribution = availableAskRoom;
      }

      const totalFreeFundsContribution =
        contributionAtMidyear(inputs.annualFreeFundsContribution, nextYear) +
        ageSavingsContributionRedirected +
        askContributionRedirected +
        redirectedPensionContribution;
      let cashContribution = 0;
      let freeRealizationContrib = 0;
      let freeInventoryContrib = 0;

      if (hasDynamicCashShare) {
        const targetShare = getTargetCashShare(nextYear, currentAgeYear, inputs, yearsToRetirement);
        cashContribution = totalFreeFundsContribution * targetShare;
        const stockContrib = totalFreeFundsContribution * (1 - targetShare);
        freeRealizationContrib = stockContrib * (1 - inventoryShare);
        freeInventoryContrib = stockContrib * inventoryShare;
      } else {
        cashContribution = contributionAtMidyear(
          inputs.annualCashContribution ?? 0,
          nextYear,
        );
        freeRealizationContrib = totalFreeFundsContribution * (1 - inventoryShare);
        freeInventoryContrib = totalFreeFundsContribution * inventoryShare;
      }

      const contributions = [
        pensionContributionsActive
          ? deductibleRatePensionContribution +
            nonDeductibleRatePensionContribution
          : 0,
        pensionContributionsActive ? lifeAnnuityContribution : 0,
        pensionContributionsActive ? ageSavingsContribution : 0,
        freeRealizationContrib,
        freeInventoryContrib,
        askContribution,
        cashContribution,
      ];
      contributionAtCheckpoint = contributions.reduce(
        (total, contribution) => total + contribution,
        0,
      );
      const growth = accumulateWithMidyearContributions(
        balances,
        contributions,
        year,
      );
      if (!candidateOnly) {
        accumulationRows[accumulationRows.length - 1].annualFreeFundsTax =
          growth.freeFundsTax;
      }
      balances = growth.balances;
      if (hasDynamicCashShare) {
        const nextTargetShare = getTargetCashShare(nextYear, currentAgeYear + 1, inputs, yearsToRetirement);
        const totalFreeEnding = balances[FREE_FUNDS_REALIZATION] + balances[FREE_FUNDS_INVENTORY] + balances[CASH];
        if (totalFreeEnding > 0) {
          const targetCashEnding = totalFreeEnding * nextTargetShare;
          const targetStockEnding = totalFreeEnding - targetCashEnding;
          balances[CASH] = targetCashEnding;
          balances[FREE_FUNDS_REALIZATION] = targetStockEnding * (1 - inventoryShare);
          balances[FREE_FUNDS_INVENTORY] = targetStockEnding * inventoryShare;
        }
      }
      accumulationFreeFundsTax += growth.freeFundsTax;
      accumulationFreeFundsTaxableGain += growth.freeFundsTaxableGain;
      freeFundsCostBasis =
        freeFundsCostBasis / (1 + inputs.inflationRate) +
        contributions[FREE_FUNDS_REALIZATION] /
          Math.sqrt(1 + inputs.inflationRate);
      ratePensionNonDeductibleBasis =
        ratePensionNonDeductibleBasis / (1 + inputs.inflationRate) +
        (pensionContributionsActive
          ? nonDeductibleRatePensionContribution /
            Math.sqrt(1 + inputs.inflationRate)
          : 0);
      assertFinite(
        contributionAtCheckpoint,
        freeFundsCostBasis,
        ratePensionNonDeductibleBasis,
        ...balances,
      );
    }

    const drawdown = simulateDrawdown(
      drawdownStartYear,
      drawdownStartBalances,
      drawdownStartFreeFundsCostBasis,
      drawdownStartRatePensionNonDeductibleBasis,
      {
        shouldRecord: true,
        startingContribution: drawdownStartContribution,
      },
    );
    const planRows = [...accumulationRows, ...drawdown.rows];
    const retirementOpeningRow = planRows.find(
      (row) => row.age === inputs.retirementAge,
    );
    const projectedRatePension = retirementOpeningRow?.ratePension ?? 0;
    const projectedLifeAnnuity = drawdown.lifeAnnuityBalanceAtRetirement;
    const projectedAgeSavings = retirementOpeningRow?.ageSavings ?? 0;
    const projectedRatePensionNonDeductibleBasis =
      retirementOpeningRow?.ratePensionNonDeductibleBasis ?? 0;
    const requiredAtRetirement = pensionTargetForMix(
      projectedRatePension,
      projectedLifeAnnuity,
      projectedAgeSavings,
      projectedRatePensionNonDeductibleBasis,
    );
    const pensionTargetToday =
      requiredAtRetirement === null
        ? null
        : requiredAtRetirement /
          pensionGrowthFactor(0, yearsToRetirement);
    const finalRow = planRows[planRows.length - 1];
    const finalTaxFreeRatePension = Math.min(
      finalRow.ratePension,
      finalRow.ratePensionNonDeductibleBasis,
    );
    const finalTaxablePension =
      Math.max(0, finalRow.ratePension - finalTaxFreeRatePension) +
      finalRow.lifeAnnuity;
    const finalRealizationGain = Math.max(
      0,
      finalRow.freeFundsRealization - finalRow.freeFundsCostBasis,
    );
    const finalReserveAfterTax =
      finalTaxFreeRatePension +
      finalTaxablePension * (1 - pensionWithdrawalTax) +
      finalRow.ageSavings +
      finalRow.freeFundsRealization -
      calculateShareIncomeTax(finalRealizationGain, selectedShareIncomeThreshold) +
      finalRow.freeFundsInventory +
      finalRow.ask;
    const totalFreeFundsWithdrawalTax = planRows.reduce(
      (total, row) => total + row.withdrawalTax,
      0,
    );
    const totalFreeFundsTax =
      totalFreeFundsWithdrawalTax +
      accumulationFreeFundsTax +
      drawdown.annualFreeFundsTax;
    const totalPensionWithdrawalTax = planRows.reduce(
      (total, row) => total + row.pensionWithdrawalTax,
      0,
    );
    const totalFreeFundsWithdrawals = planRows.reduce(
      (total, row) => total + row.freeFundsWithdrawal,
      0,
    );
    const effectiveFreeFundsWithdrawalTaxRate =
      totalFreeFundsWithdrawals > 0
        ? totalFreeFundsWithdrawalTax / totalFreeFundsWithdrawals
        : 0;
    const totalFreeFundsTaxableGain =
      accumulationFreeFundsTaxableGain + drawdown.annualFreeFundsTaxableGain;
    const totalRealizedFreeFundsGain = planRows.reduce(
      (total, row) => total + Math.max(0, row.realizedFreeFundsGain),
      0,
    );
    const totalTaxableFreeFundsGain =
      totalFreeFundsTaxableGain + totalRealizedFreeFundsGain;
    const effectiveFreeFundsTaxRate = usesInventoryTax
      ? totalTaxableFreeFundsGain > 0
        ? totalFreeFundsTax / totalTaxableFreeFundsGain
        : 0
      : effectiveFreeFundsWithdrawalTaxRate;
    const pensionTargetAtStop = pensionStopRow
      ? pensionStopRow.pensionTarget
      : null;
    const annualNetContributionBudget = contributionNetBudget(
      {
        annualRatePensionContribution: inputs.annualRatePensionContribution,
        annualLifeAnnuityContribution,
        annualAgeSavingsContribution: inputs.annualAgeSavingsContribution,
        annualFreeFundsContribution: inputs.annualFreeFundsContribution,
      },
      ratePensionContributionTaxRelief,
    );
    const ageSavingsContributionLimitExceeded =
      inputs.annualAgeSavingsContribution >
      selectedAgeSavingsContributionLimit + MONEY_TOLERANCE;
    const lifeAnnuityContributionLimitExceeded =
      annualLifeAnnuityContribution >
      selectedLifeAnnuityLimit + MONEY_TOLERANCE;
    assertFinite(
      requiredAtRetirement ?? 0,
      pensionTargetToday ?? 0,
      pensionTargetAtStop ?? 0,
      finalReserveAfterTax,
      totalFreeFundsTax,
      totalPensionWithdrawalTax,
      totalFreeFundsWithdrawals,
      effectiveFreeFundsWithdrawalTaxRate,
      totalFreeFundsTaxableGain,
      effectiveFreeFundsTaxRate,
      drawdown.lifeAnnuityAnnualIncome,
      drawdown.lifeAnnuityBalanceAtRetirement,
      lifeAnnuityMetrics.annuityFactor,
      lifeAnnuityMetrics.conversionRate,
      lifeAnnuityMetrics.expectedAgeAtDeath,
    );

    return {
      currentAge: inputs.currentAge,
      returnStrategy: selectedReturnStrategy,
      defensiveReturnRate: selectedDefensiveReturnRate,
      returnDeclineYears: selectedReturnDeclineYears,
      returnRecoveryYears: selectedReturnRecoveryYears,
      freeFundsTaxation,
      freeFundsInventoryShare: inventoryShare,
      netPensionReturn,
      realPensionReturn,
      defensiveRealPensionReturn,
      realAskReturn,
      defensiveRealAskReturn,
      realFreeFundsReturn:
        inputs.freeFundsBalance > 0
          ? (initialBalances[FREE_FUNDS_REALIZATION] *
              grossRealFreeFundsReturn +
              initialBalances[FREE_FUNDS_INVENTORY] *
                inventoryRateForBalance(
                  initialBalances[FREE_FUNDS_INVENTORY],
                  inputs.returnRate,
                )) /
            inputs.freeFundsBalance
          : grossRealFreeFundsReturn * (1 - inventoryShare) +
            inventoryRateForBalance(0, inputs.returnRate) * inventoryShare,
      defensiveRealFreeFundsReturn:
        inputs.freeFundsBalance > 0
          ? (initialBalances[FREE_FUNDS_REALIZATION] *
              defensiveGrossRealFreeFundsReturn +
              initialBalances[FREE_FUNDS_INVENTORY] *
                inventoryRateForBalance(
                  initialBalances[FREE_FUNDS_INVENTORY],
                  selectedDefensiveReturnRate,
                )) /
            inputs.freeFundsBalance
          : defensiveGrossRealFreeFundsReturn * (1 - inventoryShare) +
            inventoryRateForBalance(0, selectedDefensiveReturnRate) *
              inventoryShare,
      yearsToRetirement,
      retirementDate,
      finalDate,
      requiredAtRetirement,
      pensionTargetToday,
      pensionCoastRow,
      pensionStopRow,
      pensionTargetAtStop,
      annualNetContributionBudget,
      ratePensionContributionTaxRelief,
      ratePensionContributionLimit: selectedRatePensionLimit,
      annualDeductibleRatePensionContribution,
      annualNonDeductibleRatePensionContribution,
      annualLifeAnnuityContribution,
      lifeAnnuityAnnualIncome: drawdown.lifeAnnuityAnnualIncome,
      lifeAnnuityBalanceAtRetirement:
        drawdown.lifeAnnuityBalanceAtRetirement,
      lifeAnnuityFactor: lifeAnnuityMetrics.annuityFactor,
      lifeAnnuityConversionRate: lifeAnnuityMetrics.conversionRate,
      lifeAnnuityExpectedAgeAtDeath:
        lifeAnnuityMetrics.expectedAgeAtDeath,
      lifeAnnuityExpectedRemainingLifetime:
        lifeAnnuityMetrics.expectedRemainingLifetime,
      lifeAnnuityContributionLimit: selectedLifeAnnuityLimit,
      lifeAnnuityContributionLimitExceeded,
      ageSavingsContributionLimit: selectedAgeSavingsContributionLimit,
      ageSavingsContributionLimitExceeded,
      annualAgeSavingsContributionRedirected,
      effectiveAnnualAgeSavingsContribution,
      askDepositCap: selectedAskDepositCap,
      shareIncomeThreshold: selectedShareIncomeThreshold,
      withdrawalStrategy: withdrawalStrategy(inputs),
      isCouple: Boolean(inputs.isCouple),
      householdMultiplier: householdMultiplier(inputs),
      includeFolkepension: Boolean(inputs.includeFolkepension),
      fireRow,
      isFullyFunded: drawdown.isFullyFunded,
      firstShortfallDate: drawdown.firstShortfallDate,
      totalFreeFundsTax,
      totalFreeFundsWithdrawalTax,
      totalFreeFundsTaxableGain,
      totalPensionWithdrawalTax,
      effectiveFreeFundsWithdrawalTaxRate,
      effectiveFreeFundsTaxRate,
      returnAnchors: {
        freeFunds: inputs.currentAge + effectiveFreeReturnAnchorYear,
        pension: inputs.retirementAge,
      },
      rows: milestoneRows,
      planRows,
      finalRow,
      finalReserveAfterTax,
      includeHousing: Boolean(inputs.includeHousing),
      initialHousingEquity: calculateHousingForAge(
        inputs,
        inputs.currentAge,
        fireRow?.age ?? inputs.retirementAge,
      ).housingEquity,
      fireHousingEquity: fireRow
        ? calculateHousingForAge(inputs, fireRow.age, fireRow.age).housingEquity
        : null,
      finalHousingEquity: finalRow.housingEquity ?? 0,
      totalHousingUnlocked: planRows.reduce(
        (sum, row) => sum + (row.housingUnlocked ?? 0),
        0,
      ),
      finalReserveAfterTaxWithHousing:
        finalReserveAfterTax + (finalRow.housingEquity ?? 0),
    };
  }

  function calculateFire(
    inputs,
    calculationDate = new Date(),
    { includeBridgeCapacity = true, calculationCache = null } = {},
  ) {
    assertInputs(inputs);

    if (returnStrategy(inputs) === RETURN_STRATEGY.none) {
      return calculateFireForAnchor(inputs, calculationDate, {
        includeBridgeCapacity,
        calculationCache,
      });
    }

    const yearsToRetirement = inputs.retirementAge - inputs.currentAge;
    let latestUnfundedYear = -1;
    let earliestFundedYear = yearsToRetirement + 1;

    while (earliestFundedYear - latestUnfundedYear > 1) {
      const candidateYear = Math.floor(
        (latestUnfundedYear + earliestFundedYear) / 2,
      );
      const candidate = calculateFireForAnchor(inputs, calculationDate, {
        includeBridgeCapacity: false,
        assumedFireYear: candidateYear,
        freeReturnAnchorYear: candidateYear,
        candidateOnly: true,
        calculationCache,
      });

      if (candidate.fireRow?.age === inputs.currentAge + candidateYear) {
        earliestFundedYear = candidateYear;
      } else {
        latestUnfundedYear = candidateYear;
      }
    }

    const fireYear =
      earliestFundedYear <= yearsToRetirement ? earliestFundedYear : null;
    const freeReturnAnchorYear = fireYear ?? yearsToRetirement;
    return calculateFireForAnchor(inputs, calculationDate, {
      includeBridgeCapacity,
      assumedFireYear: freeReturnAnchorYear,
      freeReturnAnchorYear,
      calculationCache,
    });
  }

  function contributionSnapshot(contributions, calculation) {
    return {
      ...contributions,
      annualNetCost: contributionNetBudget(
        contributions,
        calculation.ratePensionContributionTaxRelief,
      ),
      annualPensionTaxSaving: pensionContributionTaxSaving(
        contributions,
        calculation.ratePensionContributionTaxRelief,
      ),
      fireAge: calculation.fireRow?.age ?? null,
      fireDate: calculation.fireRow ? new Date(calculation.fireRow.date) : null,
      finalReserveAfterTax: calculation.finalReserveAfterTax,
      finalAge: calculation.finalRow.age,
    };
  }

  function contributionDistance(first, second) {
    return (
      Math.abs(
        first.annualRatePensionContribution -
          second.annualRatePensionContribution,
      ) +
      Math.abs(
        first.annualLifeAnnuityContribution -
          second.annualLifeAnnuityContribution,
      ) +
      Math.abs(
        first.annualAgeSavingsContribution -
          second.annualAgeSavingsContribution,
      ) +
      Math.abs(
        first.annualFreeFundsContribution - second.annualFreeFundsContribution,
      )
    );
  }

  function candidateKey(candidate) {
    return [
      candidate.annualRatePensionContribution,
      candidate.annualLifeAnnuityContribution,
      candidate.annualAgeSavingsContribution,
      candidate.annualFreeFundsContribution,
    ]
      .map((value) => value.toFixed(4))
      .join(":");
  }

  function compareEvaluations(first, second) {
    const firstFireTime = evaluationFireTime(first);
    const secondFireTime = evaluationFireTime(second);

    return (
      firstFireTime - secondFireTime ||
      first.annualNetCost - second.annualNetCost ||
      evaluationFinalReserve(second) - evaluationFinalReserve(first) ||
      first.distance - second.distance ||
      second.candidate.annualFreeFundsContribution -
        first.candidate.annualFreeFundsContribution ||
      candidateKey(first.candidate).localeCompare(
        candidateKey(second.candidate),
      )
    );
  }

  function evaluationFireTime(evaluation) {
    if ("fireTime" in evaluation) {
      return evaluation.fireTime ?? Number.POSITIVE_INFINITY;
    }

    return evaluation.calculation.fireRow
      ? evaluation.calculation.fireRow.date.getTime()
      : Number.POSITIVE_INFINITY;
  }

  function evaluationFinalReserve(evaluation) {
    return "finalReserveAfterTax" in evaluation
      ? evaluation.finalReserveAfterTax
      : evaluation.calculation.finalReserveAfterTax;
  }

  function serializeEvaluation(evaluation) {
    if (!evaluation) {
      return null;
    }

    return {
      candidate: evaluation.candidate,
      annualNetCost: evaluation.annualNetCost,
      distance: evaluation.distance,
      fireTime: Number.isFinite(evaluationFireTime(evaluation))
        ? evaluationFireTime(evaluation)
        : null,
      finalReserveAfterTax: evaluationFinalReserve(evaluation),
      snapshot:
        evaluation.snapshot ??
        contributionSnapshot(evaluation.candidate, evaluation.calculation),
    };
  }

  function contributionCombinationKey(combination) {
    return [
      combination.ratePension,
      combination.lifeAnnuity,
      combination.ageSavings,
    ]
      .map((value) => value.toFixed(4))
      .join(":");
  }

  function contributionCombinationPartition(
    combination,
    partitionCount,
  ) {
    const key = contributionCombinationKey(combination);
    let hash = 2166136261;

    for (let index = 0; index < key.length; index += 1) {
      hash ^= key.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }

    return (hash >>> 0) % partitionCount;
  }

  function contributionCandidates(
    maximum,
    current,
    step = CONTRIBUTION_SEARCH_STEP,
  ) {
    const candidates = new Set([0, maximum]);

    for (
      let contribution = step;
      contribution < maximum;
      contribution += step
    ) {
      candidates.add(contribution);
    }
    if (current >= 0 && current <= maximum) {
      candidates.add(current);
    }

    return [...candidates].sort((first, second) => first - second);
  }

  function createAnnualContributionOptimizationSession(
    inputs,
    calculationDate = new Date(),
    searchOptions = {},
  ) {
    const pensionSearchStep =
      searchOptions.pensionStep ??
      searchOptions.step ??
      CONTRIBUTION_SEARCH_STEP;
    const ageSavingsSearchStep =
      searchOptions.ageSavingsStep ??
      searchOptions.step ??
      CONTRIBUTION_SEARCH_STEP;
    const freeFundsSearchStep =
      searchOptions.freeFundsStep ??
      searchOptions.step ??
      CONTRIBUTION_SEARCH_STEP;
    if (
      [pensionSearchStep, ageSavingsSearchStep, freeFundsSearchStep].some(
        (step) => !Number.isFinite(step) || step <= 0,
      )
    ) {
      throw new Error("Optimeringens søgetrin skal være større end 0.");
    }
    const totalPensionRange = searchOptions.totalPensionRange ?? null;
    const ageSavingsRange = searchOptions.ageSavingsRange ?? null;
    const refinementCenters = searchOptions.refinementCenters ?? null;
    const isInRange = (value, range) =>
      !range ||
      (value >= range.minimum - MONEY_TOLERANCE &&
        value <= range.maximum + MONEY_TOLERANCE);
    const isNearRefinementCenter = (totalPension, ageSavings) =>
      !refinementCenters ||
      refinementCenters.some(
        (center) =>
          Math.abs(totalPension - center.totalPension) <=
            center.radius + MONEY_TOLERANCE &&
          Math.abs(ageSavings - center.ageSavings) <=
            center.radius + MONEY_TOLERANCE,
      );
    const calculationCache = { anchorCaches: new Map() };
    const currentCalculation = calculateFire(inputs, calculationDate, {
      includeBridgeCapacity: false,
      calculationCache,
    });
    const currentContributions = {
      annualRatePensionContribution: inputs.annualRatePensionContribution,
      annualLifeAnnuityContribution:
        inputs.annualLifeAnnuityContribution ?? 0,
      annualAgeSavingsContribution: inputs.annualAgeSavingsContribution,
      annualFreeFundsContribution: inputs.annualFreeFundsContribution,
    };
    const optimizationLocks = {
      annualRatePensionContribution: Boolean(
        inputs.optimizationLocks?.annualRatePensionContribution,
      ),
      annualLifeAnnuityContribution: Boolean(
        inputs.optimizationLocks?.annualLifeAnnuityContribution,
      ),
      annualAgeSavingsContribution: Boolean(
        inputs.optimizationLocks?.annualAgeSavingsContribution,
      ),
      annualFreeFundsContribution: Boolean(
        inputs.optimizationLocks?.annualFreeFundsContribution,
      ),
    };
    const ratePensionContributionTaxRelief =
      inputs.ratePensionContributionTaxRelief ?? 0;
    const selectedAgeSavingsContributionLimit =
      ageSavingsContributionLimit(inputs);
    const selectedRatePensionLimit = effectiveRatePensionLimit(inputs);
    const selectedLifeAnnuityLimit = effectiveLifeAnnuityLimit(inputs);
    const annualNetBudget = contributionNetBudget(
      currentContributions,
      ratePensionContributionTaxRelief,
    );
    const currentUnlockedContributionsAreWithinLimits =
      (optimizationLocks.annualRatePensionContribution ||
        currentContributions.annualRatePensionContribution <=
          selectedRatePensionLimit + MONEY_TOLERANCE) &&
      (optimizationLocks.annualLifeAnnuityContribution ||
        currentContributions.annualLifeAnnuityContribution <=
          selectedLifeAnnuityLimit + MONEY_TOLERANCE) &&
      (optimizationLocks.annualAgeSavingsContribution ||
        currentContributions.annualAgeSavingsContribution <=
          selectedAgeSavingsContributionLimit + MONEY_TOLERANCE);

    function buildCandidate(
      ratePension,
      lifeAnnuity,
      ageSavings,
      freeFunds,
    ) {
      if (
        ratePension < -MONEY_TOLERANCE ||
        (!optimizationLocks.annualRatePensionContribution &&
          ratePension >
            selectedRatePensionLimit + MONEY_TOLERANCE) ||
        lifeAnnuity < -MONEY_TOLERANCE ||
        (!optimizationLocks.annualLifeAnnuityContribution &&
          lifeAnnuity > selectedLifeAnnuityLimit + MONEY_TOLERANCE) ||
        ageSavings < -MONEY_TOLERANCE ||
        (!optimizationLocks.annualAgeSavingsContribution &&
          ageSavings >
            selectedAgeSavingsContributionLimit + MONEY_TOLERANCE) ||
        (optimizationLocks.annualRatePensionContribution &&
          Math.abs(
            ratePension -
              currentContributions.annualRatePensionContribution,
          ) > MONEY_TOLERANCE) ||
        (optimizationLocks.annualLifeAnnuityContribution &&
          Math.abs(
            lifeAnnuity -
              currentContributions.annualLifeAnnuityContribution,
          ) > MONEY_TOLERANCE) ||
        (optimizationLocks.annualAgeSavingsContribution &&
          Math.abs(
            ageSavings - currentContributions.annualAgeSavingsContribution,
          ) > MONEY_TOLERANCE) ||
        freeFunds < -MONEY_TOLERANCE ||
        (optimizationLocks.annualFreeFundsContribution &&
          Math.abs(
            freeFunds - currentContributions.annualFreeFundsContribution,
          ) > MONEY_TOLERANCE)
      ) {
        return null;
      }

      const candidate = {
        annualRatePensionContribution: Math.max(0, ratePension),
        annualLifeAnnuityContribution: Math.max(0, lifeAnnuity),
        annualAgeSavingsContribution: Math.max(0, ageSavings),
        annualFreeFundsContribution: Math.max(0, freeFunds),
      };
      if (
        contributionNetBudget(candidate, ratePensionContributionTaxRelief) >
        annualNetBudget + MONEY_TOLERANCE
      ) {
        return null;
      }
      return candidate;
    }

    function completeFullBudgetCandidate(ratePension, lifeAnnuity, ageSavings) {
      const baselineFreeFunds = optimizationLocks.annualFreeFundsContribution
        ? currentContributions.annualFreeFundsContribution
        : 0;
      const candidateWithoutFreeFunds = buildCandidate(
        ratePension,
        lifeAnnuity,
        ageSavings,
        baselineFreeFunds,
      );
      if (!candidateWithoutFreeFunds) {
        return null;
      }
      if (optimizationLocks.annualFreeFundsContribution) {
        return buildCandidate(
          ratePension,
          lifeAnnuity,
          ageSavings,
          currentContributions.annualFreeFundsContribution,
        );
      }

      const pensionAndAgeNetCost = contributionNetBudget(
        candidateWithoutFreeFunds,
        ratePensionContributionTaxRelief,
      );
      return buildCandidate(
        ratePension,
        lifeAnnuity,
        ageSavings,
        annualNetBudget - pensionAndAgeNetCost,
      );
    }

    function evaluate(candidate) {
      const calculation = calculateFire(
        { ...inputs, ...candidate },
        calculationDate,
        { includeBridgeCapacity: false, calculationCache },
      );
      const evaluation = {
        candidate,
        annualNetCost: contributionNetBudget(
          candidate,
          ratePensionContributionTaxRelief,
        ),
        distance: contributionDistance(candidate, currentContributions),
        fireTime: calculation.fireRow
          ? calculation.fireRow.date.getTime()
          : null,
        finalReserveAfterTax: calculation.finalReserveAfterTax,
        snapshot: contributionSnapshot(candidate, calculation),
      };
      return evaluation;
    }

    const ratePensionCandidates = optimizationLocks
      .annualRatePensionContribution
      ? [currentContributions.annualRatePensionContribution]
      : contributionCandidates(
          selectedRatePensionLimit,
          currentContributions.annualRatePensionContribution,
          pensionSearchStep,
        );
    const lifeAnnuityCandidates = optimizationLocks
      .annualLifeAnnuityContribution
      ? [currentContributions.annualLifeAnnuityContribution]
      : contributionCandidates(
          selectedLifeAnnuityLimit,
          currentContributions.annualLifeAnnuityContribution,
          pensionSearchStep,
        );
    const ageSavingsCandidates = optimizationLocks
      .annualAgeSavingsContribution
      ? [currentContributions.annualAgeSavingsContribution]
      : contributionCandidates(
          selectedAgeSavingsContributionLimit,
          currentContributions.annualAgeSavingsContribution,
          ageSavingsSearchStep,
        ).filter((contribution) =>
          isInRange(contribution, ageSavingsRange),
        );
    const totalPensionCandidates = new Set();
    if (optimizationLocks.annualRatePensionContribution) {
      lifeAnnuityCandidates.forEach((lifeAnnuity) => {
        totalPensionCandidates.add(
          currentContributions.annualRatePensionContribution + lifeAnnuity,
        );
      });
    } else if (optimizationLocks.annualLifeAnnuityContribution) {
      ratePensionCandidates.forEach((ratePension) => {
        totalPensionCandidates.add(
          ratePension + currentContributions.annualLifeAnnuityContribution,
        );
      });
    } else {
      ratePensionCandidates.forEach((ratePension) => {
        totalPensionCandidates.add(ratePension);
      });
      lifeAnnuityCandidates.forEach((lifeAnnuity) => {
        if (lifeAnnuity > 0) {
          totalPensionCandidates.add(
            selectedRatePensionLimit + lifeAnnuity,
          );
        }
      });
      totalPensionCandidates.add(
        currentContributions.annualRatePensionContribution +
          currentContributions.annualLifeAnnuityContribution,
      );
    }

    function pensionSplits(totalPensionContribution) {
      if (optimizationLocks.annualRatePensionContribution) {
        return [
          {
            ratePension: currentContributions.annualRatePensionContribution,
            lifeAnnuity:
              totalPensionContribution -
              currentContributions.annualRatePensionContribution,
          },
        ];
      }
      if (optimizationLocks.annualLifeAnnuityContribution) {
        return [
          {
            ratePension:
              totalPensionContribution -
              currentContributions.annualLifeAnnuityContribution,
            lifeAnnuity: currentContributions.annualLifeAnnuityContribution,
          },
        ];
      }

      const rateFirst = Math.min(
        selectedRatePensionLimit,
        totalPensionContribution,
      );
      const lifeFirst = Math.min(
        selectedLifeAnnuityLimit,
        totalPensionContribution,
      );
      return [
        {
          ratePension: rateFirst,
          lifeAnnuity: totalPensionContribution - rateFirst,
        },
        {
          ratePension: totalPensionContribution - lifeFirst,
          lifeAnnuity: lifeFirst,
        },
      ];
    }

    const evaluationsByCandidateKey = new Map();
    const contributionCombinations = [
      {
        ratePension: currentContributions.annualRatePensionContribution,
        lifeAnnuity: currentContributions.annualLifeAnnuityContribution,
        ageSavings: currentContributions.annualAgeSavingsContribution,
      },
    ];

    function evaluateCandidate(candidate) {
      if (!candidate) {
        return null;
      }
      const key = candidateKey(candidate);
      if (evaluationsByCandidateKey.has(key)) {
        return evaluationsByCandidateKey.get(key);
      }

      const evaluation = evaluate(candidate);
      evaluationsByCandidateKey.set(key, evaluation);
      return evaluation;
    }

    [...totalPensionCandidates]
      .sort((first, second) => first - second)
      .filter((totalPensionContribution) =>
        isInRange(totalPensionContribution, totalPensionRange),
      )
      .forEach((totalPensionContribution) => {
        pensionSplits(totalPensionContribution).forEach((pensionSplit) => {
          ageSavingsCandidates.forEach((ageSavingsContribution) => {
            if (
              !isNearRefinementCenter(
                totalPensionContribution,
                ageSavingsContribution,
              )
            ) {
              return;
            }
            const combination = {
              ratePension: pensionSplit.ratePension,
              lifeAnnuity: pensionSplit.lifeAnnuity,
              ageSavings: ageSavingsContribution,
            };
            contributionCombinations.push(combination);
          });
        });
      });

    function cheapestEvaluationForFireTime(
      combination,
      targetFireTime,
      maximumNetCost,
    ) {
      const { ratePension, lifeAnnuity, ageSavings } = combination;
      if (optimizationLocks.annualFreeFundsContribution) {
        const evaluation = evaluateCandidate(
          buildCandidate(
            ratePension,
            lifeAnnuity,
            ageSavings,
            currentContributions.annualFreeFundsContribution,
          ),
        );
        return evaluation && evaluationFireTime(evaluation) <= targetFireTime
          ? evaluation
          : null;
      }

      const candidateWithoutFreeFunds = buildCandidate(
        ratePension,
        lifeAnnuity,
        ageSavings,
        0,
      );
      if (!candidateWithoutFreeFunds) {
        return null;
      }
      const fixedNetCost = contributionNetBudget(
        candidateWithoutFreeFunds,
        ratePensionContributionTaxRelief,
      );
      if (fixedNetCost > maximumNetCost + MONEY_TOLERANCE) {
        return null;
      }
      const maximumFreeFunds = Math.max(0, annualNetBudget - fixedNetCost);
      let lowerStep = -1;
      let upperStep = Math.ceil(
        maximumFreeFunds / freeFundsSearchStep,
      );
      let bestEvaluation = null;

      while (upperStep - lowerStep > 1) {
        const candidateStep = Math.floor((lowerStep + upperStep) / 2);
        const freeFunds = Math.min(
          maximumFreeFunds,
          candidateStep * freeFundsSearchStep,
        );
        const evaluation = evaluateCandidate(
          buildCandidate(
            ratePension,
            lifeAnnuity,
            ageSavings,
            freeFunds,
          ),
        );
        const reachesTarget =
          evaluation && evaluationFireTime(evaluation) <= targetFireTime;

        if (reachesTarget) {
          upperStep = candidateStep;
          bestEvaluation = evaluation;
        } else {
          lowerStep = candidateStep;
        }
      }

      if (!bestEvaluation) {
        const freeFunds = Math.min(
          maximumFreeFunds,
          upperStep * freeFundsSearchStep,
        );
        const evaluation = evaluateCandidate(
          buildCandidate(
            ratePension,
            lifeAnnuity,
            ageSavings,
            freeFunds,
          ),
        );
        if (
          evaluation && evaluationFireTime(evaluation) <= targetFireTime
        ) {
          bestEvaluation = evaluation;
        }
      }

      return bestEvaluation;
    }

    function partitionCombinations(partitionIndex, partitionCount) {
      if (
        !Number.isInteger(partitionIndex) ||
        !Number.isInteger(partitionCount) ||
        partitionCount < 1 ||
        partitionIndex < 0 ||
        partitionIndex >= partitionCount
      ) {
        throw new Error("Optimeringens partition er ugyldig.");
      }

      return contributionCombinations.filter(
        (combination) =>
          contributionCombinationPartition(combination, partitionCount) ===
          partitionIndex,
      );
    }

    function retainBestEvaluation(bestEvaluations, evaluation, limit) {
      if (!evaluation) {
        return;
      }
      bestEvaluations.push(evaluation);
      bestEvaluations.sort(compareEvaluations);
      if (bestEvaluations.length > limit) {
        bestEvaluations.length = limit;
      }
    }

    function evaluateFullBudgetPartition(
      partitionIndex,
      partitionCount,
      resultLimit = 1,
    ) {
      const bestEvaluations = [];

      partitionCombinations(partitionIndex, partitionCount).forEach(
        ({ ratePension, lifeAnnuity, ageSavings }) => {
          retainBestEvaluation(
            bestEvaluations,
            evaluateCandidate(
              completeFullBudgetCandidate(
                ratePension,
                lifeAnnuity,
                ageSavings,
              ),
            ),
            resultLimit,
          );
        },
      );

      return {
        best: serializeEvaluation(bestEvaluations[0]),
        bestEvaluations: bestEvaluations.map(serializeEvaluation),
        evaluatedCandidates: evaluationsByCandidateKey.size,
      };
    }

    function evaluateCheapestPartition(
      targetFireTime,
      partitionIndex,
      partitionCount,
      resultLimit = 1,
    ) {
      const bestEvaluations = [];

      partitionCombinations(partitionIndex, partitionCount).forEach(
        (combination) => {
          const evaluation = cheapestEvaluationForFireTime(
            combination,
            targetFireTime,
            bestEvaluations[0]?.annualNetCost ?? Number.POSITIVE_INFINITY,
          );
          retainBestEvaluation(bestEvaluations, evaluation, resultLimit);
        },
      );

      return {
        best: serializeEvaluation(bestEvaluations[0]),
        bestEvaluations: bestEvaluations.map(serializeEvaluation),
        evaluatedCandidates: evaluationsByCandidateKey.size,
      };
    }

    function finalize(evaluations, evaluatedCandidates) {
      const bestEvaluation = evaluations
        .filter(Boolean)
        .reduce(
          (best, evaluation) =>
            !best || compareEvaluations(evaluation, best) < 0
              ? evaluation
              : best,
          null,
        );
      let bestSnapshot = bestEvaluation?.snapshot ?? null;
      const bestFireTime = evaluationFireTime(bestEvaluation ?? {
        fireTime: null,
      });

      const currentFireTime = currentCalculation.fireRow
        ? currentCalculation.fireRow.date.getTime()
        : Number.POSITIVE_INFINITY;
      const currentEvaluation = {
        candidate: currentContributions,
        calculation: currentCalculation,
        annualNetCost: contributionNetBudget(
          currentContributions,
          ratePensionContributionTaxRelief,
        ),
        distance: 0,
      };
      let status = "improved";

      if (!Number.isFinite(bestFireTime)) {
        status = "unachievable";
      } else if (!currentUnlockedContributionsAreWithinLimits) {
        status = "limits-applied";
      } else if (compareEvaluations(currentEvaluation, bestEvaluation) <= 0) {
        status = "current-optimal";
        bestSnapshot = contributionSnapshot(
          currentContributions,
          currentCalculation,
        );
      } else if (currentFireTime === bestFireTime) {
        status =
          bestEvaluation.annualNetCost <
          currentEvaluation.annualNetCost - MONEY_TOLERANCE
            ? "lower-cost"
            : "larger-reserve";
      }

      return {
        status,
        current: contributionSnapshot(
          currentContributions,
          currentCalculation,
        ),
        recommended: status === "unachievable" ? null : bestSnapshot,
        annualNetBudget,
        ratePensionContributionTaxRelief,
        limits: {
          ratePension: selectedRatePensionLimit,
          lifeAnnuity: selectedLifeAnnuityLimit,
          ageSavings: selectedAgeSavingsContributionLimit,
        },
        precision: Math.min(
          pensionSearchStep,
          ageSavingsSearchStep,
          freeFundsSearchStep,
        ),
        evaluatedCandidates,
        searchMethod: "exhaustive-grid",
        lockedContributions: optimizationLocks,
      };
    }

    return {
      evaluateFullBudgetPartition,
      evaluateCheapestPartition,
      finalize,
    };
  }

  function completeAnnualContributionOptimization(session) {
    const fullBudget = session.evaluateFullBudgetPartition(0, 1);
    const earliestFireTime = fullBudget.best?.fireTime;

    if (earliestFireTime === null || earliestFireTime === undefined) {
      return session.finalize(
        [fullBudget.best],
        fullBudget.evaluatedCandidates,
      );
    }

    const cheapest = session.evaluateCheapestPartition(
      earliestFireTime,
      0,
      1,
    );
    return session.finalize(
      [cheapest.best],
      cheapest.evaluatedCandidates,
    );
  }

  function optimizeAnnualContributions(inputs, calculationDate = new Date()) {
    return completeAnnualContributionOptimization(
      createAnnualContributionOptimizationSession(inputs, calculationDate),
    );
  }

  function optimizeAnnualContributionsAdaptive(
    inputs,
    calculationDate = new Date(),
  ) {
    const coarsePensionStep = 10000;
    const coarseAgeSavingsStep = 2000;
    const coarseFreeFundsStep = 10000;
    const refinementRadius = 5000;
    const refinementBeamWidth = 8;
    const coarseSession = createAnnualContributionOptimizationSession(
      inputs,
      calculationDate,
      {
        pensionStep: coarsePensionStep,
        ageSavingsStep: coarseAgeSavingsStep,
        freeFundsStep: coarseFreeFundsStep,
      },
    );
    const coarseFullBudget = coarseSession.evaluateFullBudgetPartition(
      0,
      1,
      refinementBeamWidth,
    );
    const targetFireTime = coarseFullBudget.best?.fireTime;
    if (targetFireTime === null || targetFireTime === undefined) {
      const coarse = coarseSession.finalize(
        [coarseFullBudget.best],
        coarseFullBudget.evaluatedCandidates,
      );
      coarse.searchMethod = "adaptive-coarse-to-fine";
      return coarse;
    }
    const coarseCheapest = coarseSession.evaluateCheapestPartition(
      targetFireTime,
      0,
      1,
      refinementBeamWidth,
    );
    const refinementCenters = [
      ...coarseFullBudget.bestEvaluations,
      ...coarseCheapest.bestEvaluations,
    ].map(
      ({ candidate }) => ({
        totalPension:
          candidate.annualRatePensionContribution +
          candidate.annualLifeAnnuityContribution,
        ageSavings: candidate.annualAgeSavingsContribution,
        radius: refinementRadius,
      }),
    );
    const fine = completeAnnualContributionOptimization(
      createAnnualContributionOptimizationSession(inputs, calculationDate, {
        step: CONTRIBUTION_SEARCH_STEP,
        refinementCenters,
      }),
    );

    fine.evaluatedCandidates += coarseCheapest.evaluatedCandidates;
    fine.searchMethod = "adaptive-coarse-to-fine";
    return fine;
  }

  return {
    calculateFire,
    createAnnualContributionOptimizationSession,
    optimizeAnnualContributions,
    optimizeAnnualContributionsAdaptive,
    CONTRIBUTION_LIMITS,
    FREE_FUNDS_TAXATION,
    RETURN_STRATEGY,
    WITHDRAWAL_STRATEGY,
    FREE_FUNDS_WITHDRAWAL_STRATEGY,
    freeFundsWithdrawalStrategy,
    PUBLIC_PENSION_2026,
    strategyReturnRate,
    householdMultiplier,
    effectiveShareIncomeThreshold,
    effectiveRatePensionLimit,
    effectiveLifeAnnuityLimit,
    effectiveAskDepositCap,
    calculatePublicPensionForAge,
    desiredWithdrawalForAge,
    applyOneOffCashflowForAge,
    CASH_STRATEGY,
    getTargetCashShare,
  };
});
