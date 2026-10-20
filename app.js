(function () {
  const form = document.querySelector("#fire-form");
  const errorBox = document.querySelector("#error");
  const results = document.querySelector("#results");
  const tableBody = document.querySelector("#projection-body");
  const chart = document.querySelector("#wealth-chart");
  const resultHeading = document.querySelector("#result-heading");
  const inflationState = document.querySelector("#inflation-state");
  const pensionRedirectState = document.querySelector(
    "#pension-redirect-state",
  );
  const withdrawalTaxState = document.querySelector("#withdrawal-tax-state");
  const coupleState = document.querySelector("#couple-state");
  const folkepensionState = document.querySelector("#folkepension-state");
  const runMonteCarloButton = document.querySelector("#run-monte-carlo");
  const monteCarloResult = document.querySelector("#monte-carlo-result");
  const mcPhaseComparison = document.querySelector("#mc-phase-comparison");
  const mcChartModeButtons = [
    ...document.querySelectorAll("[data-mc-chart-mode]"),
  ];
  const mcTableScenarioButtons = [
    ...document.querySelectorAll("[data-mc-table-scenario]"),
  ];
  const mcTableShowComparisonInput = document.querySelector(
    "#mc-table-show-comparison",
  );
  const mcTableActiveBanner = document.querySelector("#mc-table-active-banner");
  const mcTableActivePill = document.querySelector("#mc-table-active-pill");
  const mcTableActiveDesc = document.querySelector("#mc-table-active-desc");
  const mcComparisonThs = [...document.querySelectorAll("th.mc-comp-col")];
  const legendGroupWithout = document.querySelector("#legend-group-without");
  const legendGroupWith = document.querySelector("#legend-group-with");
  const legendBaselineTotal = document.querySelector("#legend-baseline-total");
  const freeFundsCostBasisField = document.querySelector(
    "#free-funds-cost-basis-field",
  );
  const freeFundsCostBasisInput = form.elements.freeFundsCostBasis;
  const defensiveReturnField = document.querySelector(
    "#defensive-return-field",
  );
  const returnDeclineYearsField = document.querySelector(
    "#return-decline-years-field",
  );
  const returnRecoveryYearsField = document.querySelector(
    "#return-recovery-years-field",
  );
  const ageSavingsRedirectMessage = document.querySelector(
    "#age-savings-redirect-message",
  );
  const ratePensionSplitMessage = document.querySelector(
    "#rate-pension-split-message",
  );
  const lifeAnnuityLimitMessage = document.querySelector(
    "#life-annuity-limit-message",
  );
  const optimizeButton = document.querySelector("#optimize-contributions");
  const optimizeButtonLabel = optimizeButton.querySelector("span");
  const optimizationResult = document.querySelector("#optimization-result");
  const optimizationSection = document.querySelector("#optimization-section");
  const optimizationResultOnlyElements = [
    ...document.querySelectorAll("[data-optimization-result-only]"),
  ];
  const optimizationHeading = document.querySelector("#optimization-heading");
  const optimizationComparison = document.querySelector(
    "#optimization-comparison",
  );
  const optimizationFireShift = document.querySelector(
    "#optimization-fire-shift",
  );
  const optimizationNote = document.querySelector("#optimization-note");
  const optimizationAllocationBar = document.querySelector(
    "#optimization-allocation-bar",
  );
  const applyOptimizationButton = document.querySelector("#apply-optimization");
  const contributionLockButtons = [
    ...document.querySelectorAll("[data-lock-contribution]"),
  ];
  const savePlanCodeButton = document.querySelector("#save-plan-code");
  const loadPlanCodeButton = document.querySelector("#load-plan-code");
  const planCodeDialog = document.querySelector("#plan-code-dialog");
  const closePlanCodeDialogButton = document.querySelector(
    "#close-plan-code-dialog",
  );
  const savedPlanCode = document.querySelector("#saved-plan-code");
  const copyPlanCodeButton = document.querySelector("#copy-plan-code");
  const copyPlanCodeStatus = document.querySelector(
    "#copy-plan-code-status",
  );
  const planCodeInput = document.querySelector("#plan-code-input");
  const applyPlanCodeButton = document.querySelector("#apply-plan-code");
  const planCodeError = document.querySelector("#plan-code-error");
  const planCodeStatus = document.querySelector("#plan-code-status");
  const { calculateFire, optimizeAnnualContributions } =
    window.FireCalculations;
  const { encodePlan, decodePlan } = window.FirePlanCode;
  let latestOptimization = null;
  let activeOptimizationJob = null;
  let nextOptimizationJobId = 1;
  let planCodeReturnFocus = null;
  let latestMonteCarlo = null;
  let mcChartMode = "without";
  let mcTableScenario = "baseline";
  let mcSeedCounter = 20260419;
  const inputLocale =
    document.documentElement.lang || navigator.language || "da-DK";
  const inputNumber = new Intl.NumberFormat(inputLocale, {
    maximumFractionDigits: 0,
  });
  const inputNumberParts = inputNumber.formatToParts(12345.6);
  const inputGroupSeparator =
    inputNumberParts.find((part) => part.type === "group")?.value || ".";
  const inputDecimalSeparator =
    inputNumberParts.find((part) => part.type === "decimal")?.value || ",";
  const formattedNumberInputs = [
    ...form.querySelectorAll("[data-number-format='integer']"),
  ];
  const nativeNumberInputs = [...form.querySelectorAll("input[type='number']")];

  const currency = new Intl.NumberFormat("da-DK", {
    style: "currency",
    currency: "DKK",
    maximumFractionDigits: 0,
  });
  const percent = new Intl.NumberFormat("da-DK", {
    style: "percent",
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
  const years = new Intl.NumberFormat("da-DK", {
    maximumFractionDigits: 1,
  });
  const ages = new Intl.NumberFormat("da-DK", {
    maximumFractionDigits: 0,
  });
  const compactNumber = new Intl.NumberFormat("da-DK", {
    notation: "compact",
    maximumFractionDigits: 1,
  });
  const dateFormat = new Intl.DateTimeFormat("da-DK", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

  function parseLocalizedNumber(value) {
    let normalized = String(value).trim();
    normalized = normalized.split(inputGroupSeparator).join("");
    normalized = normalized.replace(/\s/g, "");
    normalized = normalized.split(inputDecimalSeparator).join(".");
    normalized = normalized.replace(/[^0-9.-]/g, "");
    return normalized ? Number(normalized) : Number.NaN;
  }

  function readNumber(name, divisor = 1) {
    const input = form.elements[name];
    const value = input.dataset.numberFormat
      ? parseLocalizedNumber(input.value)
      : Number(input.value);
    return value / divisor;
  }

  function formatNumberInput(input, preserveCaret = false) {
    if (!input.value.trim()) {
      return;
    }

    const caret = input.selectionStart ?? input.value.length;
    const digitsBeforeCaret = input.value
      .slice(0, caret)
      .replace(/\D/g, "").length;
    const value = parseLocalizedNumber(input.value);
    if (!Number.isFinite(value)) {
      return;
    }

    input.value = inputNumber.format(Math.max(0, Math.round(value)));
    if (!preserveCaret) {
      return;
    }

    let nextCaret = input.value.length;
    let digitCount = 0;
    for (let index = 0; index < input.value.length; index += 1) {
      if (/\d/.test(input.value[index])) {
        digitCount += 1;
      }
      if (digitCount === digitsBeforeCaret) {
        nextCaret = index + 1;
        break;
      }
    }
    input.setSelectionRange(nextCaret, nextCaret);
  }

  function changeNumberInput(input, direction) {
    const currentValue = parseLocalizedNumber(input.value);
    const startingValue = Number.isFinite(currentValue) ? currentValue : 0;
    const nextValue = Math.max(
      0,
      Math.round(startingValue + direction * 10000),
    );
    input.value = inputNumber.format(nextValue);
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.focus();
  }

  function changeNativeNumberInput(input, direction) {
    if (direction > 0) {
      input.stepUp();
    } else {
      input.stepDown();
    }
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.focus();
  }

  function addNumberSteppers(input) {
    const stepper = document.createElement("span");
    const field = input.closest(".field");
    const inputSuffix = input.closest(".input-suffix");
    const inputUnit = inputSuffix?.querySelector("b")?.textContent.trim();
    const inputUnitLabel = inputUnit === "%" ? "procent" : inputUnit;
    const isFormattedAmount = input.matches("[data-number-format='integer']");
    const fieldLabel =
      field?.querySelector("span")?.textContent.trim().replace(/\s+i$/, "") ||
      "beløbet";
    const groupLabel = field
      ?.closest("fieldset")
      ?.querySelector("legend")
      ?.textContent.trim();
    const controlLabel =
      groupLabel && groupLabel !== "Din plan"
        ? `${fieldLabel} under ${groupLabel}`
        : fieldLabel;

    stepper.className = "amount-stepper";
    input.setAttribute(
      "aria-label",
      inputUnitLabel ? `${fieldLabel} i ${inputUnitLabel}` : fieldLabel,
    );

    [
      {
        direction: 1,
        label: `Forøg ${controlLabel}${isFormattedAmount ? " med 10.000 kr." : ""}`,
        path: "M1 4 4.5 1 8 4",
      },
      {
        direction: -1,
        label: `Sænk ${controlLabel}${isFormattedAmount ? " med 10.000 kr." : ""}`,
        path: "M1 1 4.5 4 8 1",
      },
    ].forEach(({ direction, label, path }) => {
      const button = document.createElement("button");
      button.className = "amount-step-button";
      button.type = "button";
      button.tabIndex = -1;
      button.setAttribute("aria-label", label);
      button.title = label;
      button.innerHTML = `<svg viewBox="0 0 9 5" aria-hidden="true"><path d="${path}" /></svg>`;
      button.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        if (isFormattedAmount) {
          changeNumberInput(input, direction);
        } else {
          changeNativeNumberInput(input, direction);
        }
      });
      stepper.append(button);
    });

    if (inputSuffix) {
      inputSuffix.append(stepper);
    } else {
      const wrapper = document.createElement("span");
      wrapper.className = "stepper-input";
      input.before(wrapper);
      wrapper.append(input, stepper);
    }

    if (isFormattedAmount) {
      input.addEventListener("keydown", (event) => {
        if (event.key !== "ArrowUp" && event.key !== "ArrowDown") {
          return;
        }
        event.preventDefault();
        changeNumberInput(input, event.key === "ArrowUp" ? 1 : -1);
      });
    }
  }

  function readInputs() {
    return {
      currentAge: readNumber("currentAge"),
      retirementAge: readNumber("retirementAge"),
      payoutYears: readNumber("payoutYears"),
      desiredAnnualWithdrawal: readNumber("desiredAnnualWithdrawal"),
      ratePensionBalance: readNumber("ratePensionBalance"),
      lifeAnnuityBalance: readNumber("lifeAnnuityBalance"),
      ratePensionNonDeductibleBasis: readNumber(
        "ratePensionNonDeductibleBasis",
      ),
      ageSavingsBalance: readNumber("ageSavingsBalance"),
      freeFundsBalance: readNumber("freeFundsBalance"),
      freeFundsCostBasis: readNumber("freeFundsCostBasis"),
      askBalance: readNumber("askBalance"),
      annualRatePensionContribution: readNumber(
        "annualRatePensionContribution",
      ),
      annualLifeAnnuityContribution: readNumber(
        "annualLifeAnnuityContribution",
      ),
      annualAgeSavingsContribution: readNumber("annualAgeSavingsContribution"),
      annualFreeFundsContribution: readNumber("annualFreeFundsContribution"),
      annualAskContribution: form.elements.annualAskContribution
        ? readNumber("annualAskContribution")
        : 0,
      ageSavingsContributionLimit: readNumber("ageSavingsContributionLimit"),
      pensionTax: readNumber("pensionTax", 100),
      ratePensionContributionTaxRelief: readNumber(
        "ratePensionContributionTaxRelief",
        100,
      ),
      pensionWithdrawalTax: readNumber("pensionWithdrawalTax", 100),
      askTax: readNumber("askTax", 100),
      freeFundsInventoryShare: readNumber("freeFundsInventoryShare", 100),
      returnRate: readNumber("returnRate", 100),
      inflationRate: readNumber("inflationRate", 100),
      lifeAnnuityPayoutRate: readNumber("lifeAnnuityPayoutRate", 100),
      defensiveReturnRate: readNumber("defensiveReturnRate", 100),
      returnStrategy: form.elements.returnStrategy.value,
      returnDeclineYears: readNumber("returnDeclineYears"),
      returnRecoveryYears: readNumber("returnRecoveryYears"),
      withdrawalAfterTax: form.elements.withdrawalAfterTax.checked,
      contributionsFollowInflation:
        form.elements.contributionsFollowInflation.checked,
      redirectPensionContributionsToFreeFunds:
        form.elements.redirectPensionContributionsToFreeFunds.checked,
      isCouple: form.elements.isCouple?.checked ?? false,
      withdrawalStrategy: form.elements.withdrawalStrategy?.value || "proportional",
      includeFolkepension: form.elements.includeFolkepension?.checked ?? false,
      folkepensionAge: form.elements.folkepensionAge
        ? readNumber("folkepensionAge")
        : 69,
      atpAnnualIncome: form.elements.atpAnnualIncome
        ? readNumber("atpAnnualIncome")
        : 0,
      efterloenAnnualIncome: form.elements.efterloenAnnualIncome
        ? readNumber("efterloenAnnualIncome")
        : 0,
      efterloenYears: form.elements.efterloenYears
        ? readNumber("efterloenYears")
        : 0,
      spendingStepAge: form.elements.spendingStepAge
        ? readNumber("spendingStepAge")
        : 0,
      spendingStepPercent: form.elements.spendingStepPercent
        ? readNumber("spendingStepPercent", 100)
        : 0,
      oneOffEventAge: form.elements.oneOffEventAge
        ? readNumber("oneOffEventAge")
        : 0,
      oneOffEventAmount: form.elements.oneOffEventAmount
        ? readNumber("oneOffEventAmount")
        : 0,
      returnVolatility: form.elements.returnVolatility
        ? readNumber("returnVolatility", 100)
        : 0.15,
      monteCarloRuns: form.elements.monteCarloRuns
        ? readNumber("monteCarloRuns")
        : 500,
      includeHousing: form.elements.includeHousing?.checked ?? false,
      housingType: form.elements.housingType?.value ?? "owner",
      housingValue: form.elements.housingValue
        ? readNumber("housingValue")
        : 8500000,
      housingDebt: form.elements.housingDebt
        ? readNumber("housingDebt")
        : 1600000,
      housingAnnualAmortization: form.elements.housingAnnualAmortization
        ? readNumber("housingAnnualAmortization")
        : 0,
      housingPriceGrowth: form.elements.housingPriceGrowth
        ? readNumber("housingPriceGrowth", 100)
        : 0.02,
      housingOwnershipShare: form.elements.housingOwnershipShare
        ? readNumber("housingOwnershipShare", 100)
        : 0.5,
      housingUnlock: form.elements.housingUnlock?.value === "true",
      housingUnlockShare: form.elements.housingUnlockShare
        ? readNumber("housingUnlockShare", 100)
        : 0.5,
      housingUnlockAgeType: form.elements.housingUnlockAgeType?.value ?? "fire",
      housingUnlockAge: form.elements.housingUnlockAge
        ? readNumber("housingUnlockAge")
        : 60,
      optimizationLocks: Object.fromEntries(
        contributionLockButtons.map((button) => [
          button.dataset.lockContribution,
          button.getAttribute("aria-pressed") === "true",
        ]),
      ),
    };
  }

  const planPercentageFields = new Set([
    "pensionTax",
    "ratePensionContributionTaxRelief",
    "pensionWithdrawalTax",
    "askTax",
    "freeFundsInventoryShare",
    "returnRate",
    "inflationRate",
    "lifeAnnuityPayoutRate",
    "defensiveReturnRate",
    "spendingStepPercent",
    "returnVolatility",
    "housingPriceGrowth",
    "housingOwnershipShare",
    "housingUnlockShare",
  ]);

  function setPlanCodeStatus(message) {
    planCodeStatus.textContent = message;
    planCodeStatus.hidden = !message;
  }

  function setPlanCodeError(message) {
    planCodeError.textContent = message;
    planCodeError.hidden = !message;
  }

  function setCopyPlanCodeStatus(message) {
    copyPlanCodeStatus.textContent = message;
    copyPlanCodeStatus.hidden = !message;
  }

  function formatPlanPercentage(value) {
    return String(Number((value * 100).toFixed(10)));
  }

  function refreshSavedPlanCode() {
    const inputs = readInputs();
    calculateFire(inputs);
    savedPlanCode.value = encodePlan(inputs);
    copyPlanCodeButton.disabled = false;
  }

  function openPlanCodeDialog(mode) {
    planCodeReturnFocus =
      mode === "save" ? savePlanCodeButton : loadPlanCodeButton;
    setPlanCodeStatus("");
    setPlanCodeError("");
    setCopyPlanCodeStatus("");
    planCodeInput.value = "";
    savedPlanCode.value = "";
    copyPlanCodeButton.disabled = true;

    try {
      refreshSavedPlanCode();
    } catch (error) {
      setPlanCodeError(error.message);
    }

    planCodeDialog.showModal();
    window.requestAnimationFrame(() => {
      if (mode === "save" && savedPlanCode.value) {
        copyPlanCodeButton.focus();
      } else if (mode === "load") {
        planCodeInput.focus();
      } else {
        closePlanCodeDialogButton.focus();
      }
    });
  }

  function closePlanCodeDialog() {
    planCodeDialog.close();
    planCodeReturnFocus?.focus();
  }

  async function copySavedPlanCode() {
    if (!savedPlanCode.value) {
      return;
    }

    setCopyPlanCodeStatus("");
    let copied = false;

    if (navigator.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(savedPlanCode.value);
        copied = true;
      } catch (_error) {
        copied = false;
      }
    }

    if (!copied) {
      savedPlanCode.focus();
      savedPlanCode.select();
      try {
        copied = document.execCommand("copy");
      } catch (_error) {
        copied = false;
      }
    }

    setCopyPlanCodeStatus(
      copied
        ? "Koden er kopieret."
        : "Koden kunne ikke kopieres automatisk. Markér og kopiér den manuelt.",
    );
  }

  function applyPlanInputs(inputs) {
    cancelActiveOptimization();
    Object.entries(inputs).forEach(([name, value]) => {
      const input = form.elements[name];
      if (!input) {
        return;
      }

      if (input.type === "checkbox") {
        input.checked = value;
      } else if (planPercentageFields.has(name)) {
        input.value = formatPlanPercentage(value);
      } else {
        input.value = String(value);
        if (input.matches("[data-number-format='integer']")) {
          formatNumberInput(input);
        }
      }
    });

    hideOptimizationResult();
    renderInflationState();
    renderPensionRedirectState();
    renderWithdrawalTaxState();
    renderCoupleState();
    renderFolkepensionState();
    renderFreeFundsTaxation();
    renderReturnStrategyState();
    renderHousingState();
    update();
  }

  function loadPlanCode() {
    setPlanCodeError("");

    try {
      const inputs = decodePlan(planCodeInput.value);
      calculateFire(inputs);
      applyPlanInputs(inputs);
      closePlanCodeDialog();
      setPlanCodeStatus("Input indlæst.");
    } catch (error) {
      setPlanCodeError(error.message);
      planCodeInput.focus();
      planCodeInput.select();
    }
  }

  function toggleContributionLock(button) {
    cancelActiveOptimization();
    const locked = button.getAttribute("aria-pressed") !== "true";
    const row = button.closest(".optimization-row");
    const fieldLabel = button.dataset.lockLabel;
    const label = locked
      ? `Lås ${fieldLabel} op i optimeringen`
      : `Lås ${fieldLabel} i optimeringen`;

    button.setAttribute("aria-pressed", String(locked));
    button.setAttribute("aria-label", label);
    button.title = label;
    row.classList.toggle("optimization-row-locked", locked);
    hideOptimizationResult();
  }

  function lockedContributionNote(locks) {
    const labels = {
      annualRatePensionContribution: "ratepension",
      annualLifeAnnuityContribution: "livrente",
      annualAgeSavingsContribution: "aldersopsparing",
      annualFreeFundsContribution: "frie midler",
    };
    const lockedLabels = Object.entries(locks ?? {})
      .filter(([, locked]) => locked)
      .map(([key]) => labels[key]);

    return lockedLabels.length > 0
      ? ` Låst i optimeringen: ${lockedLabels.join(", ")}.`
      : "";
  }

  function markContributionLimit(name, exceeded, limit) {
    const input = form.elements[name];
    const field = input.closest(".field");

    field.classList.toggle("limit-exceeded", exceeded);
    if (exceeded) {
      input.title = `Indbetalingen overskrider loftet på ${currency.format(limit)}`;
    } else {
      input.removeAttribute("title");
    }
  }

  function setText(id, value) {
    document.querySelector(`#${id}`).textContent = value;
  }

  function renderInflationState() {
    inflationState.textContent = form.elements.contributionsFollowInflation
      .checked
      ? "Følger inflationen"
      : "Følger ikke inflationen";
  }

  function renderCoupleState() {
    if (coupleState && form.elements.isCouple) {
      coupleState.textContent = form.elements.isCouple.checked
        ? "Par (dobbelt bundgrænse)"
        : "Enlig";
    }
  }

  function renderFolkepensionState() {
    if (folkepensionState && form.elements.includeFolkepension) {
      folkepensionState.textContent = form.elements.includeFolkepension.checked
        ? "Medregnes"
        : "Udelades";
    }
  }

  const housingState = document.querySelector("#housing-state");
  const housingTypeField = document.querySelector("#housing-type-field");
  const housingValueField = document.querySelector("#housing-value-field");
  const housingDebtField = document.querySelector("#housing-debt-field");
  const housingAmortizationField = document.querySelector("#housing-amortization-field");
  const housingGrowthField = document.querySelector("#housing-growth-field");
  const housingShareField = document.querySelector("#housing-share-field");
  const housingUnlockField = document.querySelector("#housing-unlock-field");
  const housingUnlockShareField = document.querySelector("#housing-unlock-share-field");
  const housingUnlockAgeTypeField = document.querySelector("#housing-unlock-age-type-field");
  const housingUnlockAgeField = document.querySelector("#housing-unlock-age-field");

  function setFormFieldEnabled(field, input, enabled) {
    if (!field || !input) return;
    field.classList.toggle("field-disabled", !enabled);
    field.setAttribute("aria-disabled", String(!enabled));
    input.disabled = !enabled;
    field.querySelectorAll(".amount-step-button").forEach((button) => {
      button.disabled = !enabled;
    });
  }

  function renderHousingState() {
    const included = Boolean(form.elements.includeHousing?.checked);
    if (housingState) {
      housingState.textContent = included ? "Medregnes" : "Udelades";
    }

    setFormFieldEnabled(housingTypeField, form.elements.housingType, included);
    setFormFieldEnabled(housingValueField, form.elements.housingValue, included);
    setFormFieldEnabled(housingDebtField, form.elements.housingDebt, included);
    setFormFieldEnabled(housingAmortizationField, form.elements.housingAnnualAmortization, included);
    setFormFieldEnabled(housingGrowthField, form.elements.housingPriceGrowth, included);
    setFormFieldEnabled(housingShareField, form.elements.housingOwnershipShare, included);
    setFormFieldEnabled(housingUnlockField, form.elements.housingUnlock, included);

    const unlockActive = included && form.elements.housingUnlock?.value === "true";
    setFormFieldEnabled(housingUnlockShareField, form.elements.housingUnlockShare, unlockActive);
    setFormFieldEnabled(housingUnlockAgeTypeField, form.elements.housingUnlockAgeType, unlockActive);

    const customAgeActive = unlockActive && form.elements.housingUnlockAgeType?.value === "custom";
    setFormFieldEnabled(housingUnlockAgeField, form.elements.housingUnlockAge, customAgeActive);
  }

  function syncMonteCarloButtons() {
    mcChartModeButtons.forEach((button) => {
      const active = button.dataset.mcChartMode === mcChartMode;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-pressed", String(active));
    });
    mcTableScenarioButtons.forEach((button) => {
      const active = button.dataset.mcTableScenario === mcTableScenario;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-pressed", String(active));
    });
  }

  function formatAgeSpread(stats) {
    if (!stats || stats.medianAge === null) {
      return "Ikke nået";
    }
    const opt = stats.optimisticAge !== null ? ages.format(stats.optimisticAge) : "—";
    const med = stats.medianAge !== null ? ages.format(stats.medianAge) : "—";
    const pess = stats.pessimisticAge !== null ? ages.format(stats.pessimisticAge) : "—";
    return `${opt} / ${med} / ${pess} år`;
  }

  function computeMonteCarlo(inputs, advanceSeed = false) {
    if (!window.FireMonteCarlo) {
      return null;
    }
    if (advanceSeed) {
      mcSeedCounter += 7919;
    }
    const mc = window.FireMonteCarlo.runMonteCarlo(inputs, {
      runs: inputs.monteCarloRuns,
      volatility: inputs.returnVolatility,
      seed: mcSeedCounter,
    });
    latestMonteCarlo = mc;
    setText("mc-success-rate", `${years.format(mc.successRate)} %`);
    setText("mc-median-reserve", currency.format(mc.medianFinalReserve));
    setText("mc-p10-reserve", currency.format(mc.percentiles.p10));
    setText("mc-p90-reserve", currency.format(mc.percentiles.p90));
    if (monteCarloResult) {
      monteCarloResult.hidden = false;
    }
    return mc;
  }

  function renderMonteCarloComparison(calculation, inputs, mc) {
    const showPanel =
      Boolean(mc) &&
      (mcChartMode !== "without" ||
        mcTableScenario !== "baseline" ||
        !monteCarloResult?.hidden);
    if (mcPhaseComparison) {
      mcPhaseComparison.hidden = !showPanel;
    }
    if (!mc) {
      return;
    }

    const stop = calculation.pensionStopRow;
    const fire = calculation.fireRow;
    setText(
      "mc-comp-base-meta",
      `Fast forventet afkast (${percent.format(inputs.returnRate)} før skat hvert år)`,
    );
    setText(
      "mc-comp-base-stop",
      stop ? `${ages.format(stop.age)} år` : "Ikke nået",
    );
    setText(
      "mc-comp-base-fire",
      fire ? `${ages.format(fire.age)} år` : "Ikke nået",
    );
    setText(
      "mc-comp-base-fire-wealth",
      fire ? currency.format(fire.totalBalance) : "—",
    );
    setText(
      "mc-comp-base-status",
      calculation.isFullyFunded ? "100 % dækket (Fast)" : "Underfinansieret",
    );
    setText(
      "mc-comp-base-reserve",
      currency.format(calculation.finalRow.totalBalance),
    );
    setText(
      "mc-comp-base-depot",
      currency.format(calculation.finalRow.totalDepotValue),
    );

    setText(
      "mc-comp-sim-meta",
      `${inputNumber.format(mc.runs)} simuleringer · ${percent.format(mc.volatility)} årlig volatilitet`,
    );
    setText("mc-comp-mc-stop", formatAgeSpread(mc.pensionStopAgeStats));
    setText("mc-comp-mc-fire", formatAgeSpread(mc.fireAgeStats));
    setText(
      "mc-comp-mc-fire-rate",
      `${years.format(mc.fireAgeStats.reachedRate)} % af forløb`,
    );
    setText("mc-comp-mc-solvency", `${years.format(mc.successRate)} % solvens`);
    setText(
      "mc-comp-mc-reserve-p50",
      currency.format(mc.totalBalancePercentiles.p50),
    );
    setText(
      "mc-comp-mc-reserve-range",
      `${compactNumber.format(mc.totalBalancePercentiles.p10)} – ${compactNumber.format(mc.totalBalancePercentiles.p90)} kr.`,
    );
  }

  function runMonteCarloSimulation() {
    if (!window.FireMonteCarlo || !runMonteCarloButton) {
      return;
    }
    const labelSpan = runMonteCarloButton.querySelector("span");
    const originalText = labelSpan ? labelSpan.textContent : "";
    runMonteCarloButton.disabled = true;
    if (labelSpan) {
      labelSpan.textContent = "Simulerer…";
    }

    window.setTimeout(() => {
      try {
        const inputs = readInputs();
        const calculation = calculateFire(inputs);
        computeMonteCarlo(inputs, true);
        if (mcChartMode === "without") {
          mcChartMode = "compare";
        }
        syncMonteCarloButtons();
        render(calculation, inputs);
      } catch (err) {
        errorBox.textContent = err.message;
        errorBox.hidden = false;
      } finally {
        runMonteCarloButton.disabled = false;
        if (labelSpan) {
          labelSpan.textContent = originalText;
        }
      }
    }, 10);
  }

  function renderReturnStrategyState() {
    const strategy = form.elements.returnStrategy.value;
    const usesVariableReturn = strategy !== "none";
    const usesRecovery = strategy === "riskTent";

    function setFieldEnabled(field, input, enabled) {
      field.classList.toggle("field-disabled", !enabled);
      field.setAttribute("aria-disabled", String(!enabled));
      input.disabled = !enabled;
      field.querySelectorAll(".amount-step-button").forEach((button) => {
        button.disabled = !enabled;
      });
    }

    setFieldEnabled(
      defensiveReturnField,
      form.elements.defensiveReturnRate,
      usesVariableReturn,
    );
    setFieldEnabled(
      returnDeclineYearsField,
      form.elements.returnDeclineYears,
      usesVariableReturn,
    );
    setFieldEnabled(
      returnRecoveryYearsField,
      form.elements.returnRecoveryYears,
      usesRecovery,
    );
    form.elements.defensiveReturnRate.max = form.elements.returnRate.value;
  }

  function renderPensionRedirectState() {
    pensionRedirectState.textContent = form.elements
      .redirectPensionContributionsToFreeFunds.checked
      ? "Omdirigeres"
      : "Omdirigeres ikke";
  }

  function renderProjectionTableState() {
    setText(
      "projection-note",
      "Datoerne er årlige beregningstidspunkter fra dagens dato. Afkast viser det formuevægtede gennemsnit af det forventede afkast på tværs af alle viste depoter før skat og inflation frem mod næste dato. Livrentedepot viser også efter pensionsstart den beregnede værdi bag de fremtidige udbetalinger. Samlet depotværdi inkluderer livrenten; den frie slutreserve gør ikke. Brutto-udbetaling viser hævninger og livrente før skat. Netto-udbetaling viser beløbet efter beregnet skat. Lagerskat viser skatten af årets positive afkast på den lagerbeskattede andel af frie midler og er trukket fra formuen frem mod næste dato. Effektiv skat viser skatten på årets samlede udbetaling som procent af udbetalingen før skat. Lagerskat indgår ikke i denne procentsats.",
    );
  }

  function renderWithdrawalTaxState() {
    withdrawalTaxState.textContent = form.elements.withdrawalAfterTax.checked
      ? "Efter skat"
      : "Før skat";
  }

  function renderFreeFundsTaxation() {
    const inventoryShare = readNumber("freeFundsInventoryShare", 100);
    const isFullyInventoryTaxed = inventoryShare >= 1;
    const isFullyRealizationTaxed = inventoryShare <= 0;

    freeFundsCostBasisInput.disabled = isFullyInventoryTaxed;
    freeFundsCostBasisInput.required = !isFullyInventoryTaxed;
    freeFundsCostBasisField.classList.toggle(
      "field-disabled",
      isFullyInventoryTaxed,
    );
    freeFundsCostBasisField.setAttribute(
      "aria-disabled",
      String(isFullyInventoryTaxed),
    );
    freeFundsCostBasisField
      .querySelectorAll(".amount-step-button")
      .forEach((button) => {
        button.disabled = isFullyInventoryTaxed;
      });
    freeFundsCostBasisField.querySelector("i").title = isFullyInventoryTaxed
      ? "Den samlede købspris bruges ikke, når alle frie midler er lagerbeskattede."
      : "Det samlede beløb, du betalte for de investeringer i frie midler, som du stadig ejer.";
    setText(
      "total-free-funds-tax-label",
      isFullyInventoryTaxed
        ? "Samlet lagerbeskatning af frie midler"
        : isFullyRealizationTaxed
          ? "Samlet skat på hævninger fra frie midler"
          : "Samlet skat på frie midler",
    );
    setText(
      "effective-free-funds-tax-label",
      isFullyRealizationTaxed
        ? "Effektiv skat på hævninger fra frie midler"
        : "Effektiv skat af beskattet afkast på frie midler",
    );
    renderProjectionTableState();
  }

  function hideOptimizationResult() {
    latestOptimization = null;
    optimizationResult.classList.remove("optimization-has-result");
    optimizationSection.classList.remove("optimization-has-result");
    optimizationResultOnlyElements.forEach((element) => {
      element.hidden = true;
    });
    optimizationHeading.textContent = "Vælg faste beløb";
    optimizationComparison.hidden = false;
    optimizationNote.textContent =
      "Mål 1 er tidligst mulig FIRE. Mål 2 er den laveste årlige pris efter skattebesparelsen. Lås eventuelle faste beløb, og beregn anbefalingen.";
    applyOptimizationButton.disabled = true;
  }

  function renderOptimizationPreview(inputs, calculation) {
    setText(
      "optimization-current-rate",
      currency.format(inputs.annualRatePensionContribution),
    );
    setText(
      "optimization-current-life-annuity",
      currency.format(inputs.annualLifeAnnuityContribution),
    );
    setText(
      "optimization-current-age-savings",
      currency.format(inputs.annualAgeSavingsContribution),
    );
    setText(
      "optimization-current-free",
      currency.format(inputs.annualFreeFundsContribution),
    );
    const deductiblePensionContribution =
      Math.min(
        inputs.annualRatePensionContribution,
        calculation.ratePensionContributionLimit,
      ) +
      Math.min(
        inputs.annualLifeAnnuityContribution,
        calculation.lifeAnnuityContributionLimit,
      );
    setText(
      "optimization-current-net-cost",
      currency.format(calculation.annualNetContributionBudget),
    );
    setText(
      "optimization-current-tax-saving",
      currency.format(
        deductiblePensionContribution *
          calculation.ratePensionContributionTaxRelief,
      ),
    );
    setText(
      "optimization-current-reserve",
      currency.format(calculation.finalReserveAfterTax),
    );
    hideOptimizationResult();
  }

  function fireAgeLabel(fireAge) {
    return fireAge === null ? "Ikke opnået" : `${ages.format(fireAge)} år`;
  }

  function renderOptimization(optimization) {
    latestOptimization = optimization;
    optimizationResult.hidden = false;
    optimizationResult.removeAttribute("aria-busy");

    if (optimization.status === "unachievable") {
      hideOptimizationResult();
      optimizationHeading.textContent = "Ingen fordeling kan nå FIRE";
      applyOptimizationButton.disabled = true;
      optimizationNote.textContent =
        `Det nuværende årlige nettobudget kan ikke finansiere hele planen. Prøv at øge budgettet, sænke den ønskede hævning eller låse færre indbetalinger.${lockedContributionNote(optimization.lockedContributions)}`;
      return;
    }

    latestOptimization = optimization;
    optimizationResult.classList.add("optimization-has-result");
    optimizationSection.classList.add("optimization-has-result");
    optimizationResultOnlyElements.forEach((element) => {
      element.hidden = false;
    });

    const {
      current,
      recommended,
      annualNetBudget,
      ratePensionContributionTaxRelief,
      precision,
      limits,
      evaluatedCandidates,
      lockedContributions,
    } = optimization;
    const lockNote = lockedContributionNote(lockedContributions);
    const headings = {
      improved: "Du kan nå FIRE tidligere",
      "lower-cost": "Samme FIRE til en lavere pris",
      "larger-reserve": "Samme FIRE og pris med en større reserve",
      "current-optimal": "Din fordeling er optimal for FIRE og pris",
      "limits-applied": "De ulåste beløb holder sig under 2026-lofterne",
    };
    const valueIds = [
      ["rate", "annualRatePensionContribution"],
      ["life-annuity", "annualLifeAnnuityContribution"],
      ["age-savings", "annualAgeSavingsContribution"],
      ["free", "annualFreeFundsContribution"],
      ["net-cost", "annualNetCost"],
      ["tax-saving", "annualPensionTaxSaving"],
      ["reserve", "finalReserveAfterTax"],
    ];

    optimizationHeading.textContent = headings[optimization.status];
    optimizationComparison.hidden = false;
    applyOptimizationButton.disabled =
      optimization.status === "current-optimal";
    setText("optimization-current-fire", fireAgeLabel(current.fireAge));
    setText("optimization-recommended-fire", fireAgeLabel(recommended.fireAge));

    valueIds.forEach(([id, key]) => {
      setText(`optimization-current-${id}`, currency.format(current[key]));
      setText(
        `optimization-recommended-${id}`,
        currency.format(recommended[key]),
      );
    });

    const safeTotal = Math.max(1, recommended.annualNetCost);
    const recommendedDeductibleRatePension = Math.min(
      recommended.annualRatePensionContribution,
      limits.ratePension,
    );
    const recommendedRateNetCost =
      recommendedDeductibleRatePension *
        (1 - ratePensionContributionTaxRelief) +
      Math.max(
        0,
        recommended.annualRatePensionContribution -
          recommendedDeductibleRatePension,
      );
    const recommendedDeductibleLifeAnnuity = Math.min(
      recommended.annualLifeAnnuityContribution,
      limits.lifeAnnuity,
    );
    const recommendedLifeAnnuityNetCost =
      recommendedDeductibleLifeAnnuity *
        (1 - ratePensionContributionTaxRelief) +
      Math.max(
        0,
        recommended.annualLifeAnnuityContribution -
          recommendedDeductibleLifeAnnuity,
      );
    optimizationAllocationBar.style.setProperty(
      "--rate-share",
      `${(recommendedRateNetCost / safeTotal) * 100}%`,
    );
    optimizationAllocationBar.style.setProperty(
      "--life-share",
      `${(recommendedLifeAnnuityNetCost / safeTotal) * 100}%`,
    );
    optimizationAllocationBar.style.setProperty(
      "--age-share",
      `${(recommended.annualAgeSavingsContribution / safeTotal) * 100}%`,
    );
    optimizationAllocationBar.style.setProperty(
      "--free-share",
      `${(recommended.annualFreeFundsContribution / safeTotal) * 100}%`,
    );

    const objectiveNote =
      "FIRE-året prioriteres først. Blandt fordelinger med det tidligste FIRE-år vælges den laveste årlige pris efter skattebesparelsen.";
    const limitNote =
      optimization.status === "limits-applied"
        ? " Din nuværende fordeling overskrider et privat 2026-loft, så de ulåste beløb er flyttet under lofterne."
        : "";
    optimizationNote.textContent = `${objectiveNote} Der blev beregnet ${inputNumber.format(evaluatedCandidates)} gyldige kombinationer i trin på ${currency.format(precision)} inden for din nuværende årlige pris på ${currency.format(annualNetBudget)}${limitNote}${lockNote}`;
  }

  function workerRequest(worker, message, expectedType) {
    return new Promise((resolve, reject) => {
      function cleanup() {
        worker.removeEventListener("message", handleMessage);
        worker.removeEventListener("error", handleError);
      }

      function handleMessage(event) {
        if (event.data.jobId !== message.jobId) {
          return;
        }

        cleanup();
        if (event.data.type === "error") {
          reject(new Error(event.data.message));
          return;
        }
        if (event.data.type !== expectedType) {
          reject(new Error("Optimeringen returnerede et ugyldigt svar."));
          return;
        }
        resolve(event.data);
      }

      function handleError() {
        cleanup();
        reject(new Error("Optimeringens worker stoppede uventet."));
      }

      worker.addEventListener("message", handleMessage);
      worker.addEventListener("error", handleError);
      worker.postMessage(message);
    });
  }

  function cancelActiveOptimization() {
    activeOptimizationJob?.cancel();
  }

  function serializedCandidateKey(candidate) {
    return [
      candidate.annualRatePensionContribution,
      candidate.annualLifeAnnuityContribution,
      candidate.annualAgeSavingsContribution,
      candidate.annualFreeFundsContribution,
    ]
      .map((value) => value.toFixed(4))
      .join(":");
  }

  function compareSerializedEvaluations(first, second) {
    return (
      (first.fireTime ?? Number.POSITIVE_INFINITY) -
        (second.fireTime ?? Number.POSITIVE_INFINITY) ||
      first.annualNetCost - second.annualNetCost ||
      second.finalReserveAfterTax - first.finalReserveAfterTax ||
      first.distance - second.distance ||
      second.candidate.annualFreeFundsContribution -
        first.candidate.annualFreeFundsContribution ||
      serializedCandidateKey(first.candidate).localeCompare(
        serializedCandidateKey(second.candidate),
      )
    );
  }

  function bestSerializedEvaluations(results, limit) {
    return results
      .flatMap((result) => result.bestEvaluations ?? [result.best])
      .filter(Boolean)
      .sort(compareSerializedEvaluations)
      .slice(0, limit);
  }

  async function optimizeAnnualContributionsInWorkers(inputs) {
    const workerCount = 4;
    const jobId = nextOptimizationJobId;
    nextOptimizationJobId += 1;
    const workers = [];
    let rejectCancellation;
    const cancellation = new Promise((_resolve, reject) => {
      rejectCancellation = reject;
    });
    const job = {
      jobId,
      cancel() {
        const error = new Error("Optimeringen blev annulleret.");
        error.name = "AbortError";
        rejectCancellation(error);
      },
    };
    activeOptimizationJob = job;

    try {
      for (let index = 0; index < workerCount; index += 1) {
        workers.push(new Worker("./optimization-worker.js?v=20260905-3"));
      }

      const calculationTime = Date.now();
      async function runSearch(searchOptions, resultLimit = 1) {
        const phaseOne = await Promise.race([
          Promise.all(
            workers.map((worker, partitionIndex) =>
              workerRequest(
                worker,
                {
                  type: "phase-one",
                  jobId,
                  inputs,
                  calculationTime,
                  searchOptions,
                  resultLimit,
                  partitionIndex,
                  partitionCount: workerCount,
                },
                "phase-one-complete",
              ),
            ),
          ),
          cancellation,
        ]);
        const finiteFireTimes = phaseOne
          .map((result) => result.best?.fireTime)
          .filter((fireTime) => Number.isFinite(fireTime));
        const targetFireTime =
          finiteFireTimes.length > 0 ? Math.min(...finiteFireTimes) : null;
        let phaseResults = phaseOne;

        if (targetFireTime !== null) {
          phaseResults = await Promise.race([
            Promise.all(
              workers.map((worker) =>
                workerRequest(
                  worker,
                  {
                    type: "phase-two",
                    jobId,
                    targetFireTime,
                    resultLimit,
                  },
                  "phase-two-complete",
                ),
              ),
            ),
            cancellation,
          ]);
        }

        return {
          phaseOne,
          phaseResults,
          targetFireTime,
          evaluatedCandidates: phaseResults.reduce(
            (total, result) => total + result.evaluatedCandidates,
            0,
          ),
        };
      }

      const refinementBeamWidth = 8;
      const coarse = await runSearch(
        {
          pensionStep: 10000,
          ageSavingsStep: 2000,
          freeFundsStep: 10000,
        },
        refinementBeamWidth,
      );
      let selectedSearch = coarse;
      let evaluatedCandidates = coarse.evaluatedCandidates;

      if (coarse.targetFireTime !== null) {
        const refinementCenters = [
          ...bestSerializedEvaluations(
            coarse.phaseOne,
            refinementBeamWidth,
          ),
          ...bestSerializedEvaluations(
            coarse.phaseResults,
            refinementBeamWidth,
          ),
        ].map(({ candidate }) => ({
          totalPension:
            candidate.annualRatePensionContribution +
            candidate.annualLifeAnnuityContribution,
          ageSavings: candidate.annualAgeSavingsContribution,
          radius: 5000,
        }));
        selectedSearch = await runSearch({
          step: 1000,
          refinementCenters,
        });
        evaluatedCandidates += selectedSearch.evaluatedCandidates;
      }

      const evaluations = selectedSearch.phaseResults
        .map((result) => result.best)
        .filter(Boolean);
      const completed = await Promise.race([
        workerRequest(
          workers[0],
          {
            type: "finalize",
            jobId,
            evaluations,
            evaluatedCandidates,
          },
          "complete",
        ),
        cancellation,
      ]);
      completed.optimization.searchMethod = "adaptive-coarse-to-fine";
      return completed.optimization;
    } finally {
      workers.forEach((worker) => worker.terminate());
      if (activeOptimizationJob === job) {
        activeOptimizationJob = null;
      }
    }
  }

  async function runContributionOptimization() {
    optimizeButton.disabled = true;
    optimizeButtonLabel.textContent = "Optimerer…";
    optimizationResult.setAttribute("aria-busy", "true");

    try {
      const inputs = readInputs();
      await new Promise((resolve) => window.setTimeout(resolve, 0));
      const optimization =
        typeof Worker === "function"
          ? await optimizeAnnualContributionsInWorkers(inputs)
          : optimizeAnnualContributions(inputs);
      renderOptimization(optimization);
      errorBox.hidden = true;
    } catch (error) {
      if (error.name !== "AbortError") {
        hideOptimizationResult();
        errorBox.textContent = error.message;
        errorBox.hidden = false;
      }
    } finally {
      optimizeButton.disabled = false;
      optimizeButtonLabel.textContent = "Beregn anbefaling";
      optimizationResult.removeAttribute("aria-busy");
    }
  }

  function applyOptimization() {
    const recommended = latestOptimization?.recommended;

    if (!recommended) {
      return;
    }

    [
      "annualRatePensionContribution",
      "annualLifeAnnuityContribution",
      "annualAgeSavingsContribution",
      "annualFreeFundsContribution",
    ].forEach((name) => {
      if (latestOptimization.lockedContributions?.[name]) {
        return;
      }
      form.elements[name].value = inputNumber.format(
        Math.round(recommended[name]),
      );
    });

    update();
    optimizationHeading.textContent = "Fordelingen er anvendt";
    optimizationNote.textContent =
      "Planen er genberegnet med den anbefalede fordeling.";
    applyOptimizationButton.disabled = true;
  }

  function formatDiffCurrency(diff) {
    if (!Number.isFinite(diff)) {
      return "—";
    }
    const prefix = diff > 0 ? "+" : "";
    return `${prefix}${currency.format(diff)}`;
  }

  function rowMarkup(row, freeFundsInventoryShare, band, showComparison, includeHousing = false) {
    const inventoryTax =
      freeFundsInventoryShare > 0 && row.phase !== "Slut"
        ? currency.format(row.annualFreeFundsTax)
        : "—";
    const effectiveTax = row.withdrawal
      ? percent.format(row.effectiveWithdrawalTaxRate)
      : "—";
    const returnRate = Number.isFinite(row.averageReturnRate)
      ? percent.format(row.averageReturnRate)
      : "—";

    let source = row.withdrawalSource;
    const extras = [];
    if (row.publicPensionNet > 0) extras.push("folkepension");
    if (row.atpGross > 0) extras.push("ATP");
    if (row.efterloenGross > 0) extras.push("efterløn");
    if (row.oneOffCashflow && Math.abs(row.oneOffCashflow) > 0) extras.push("engangsbeløb");
    if (row.housingUnlocked && row.housingUnlocked > 0) extras.push("frigjort friværdi");
    if (extras.length > 0) {
      source = source === "—" ? extras.join(" & ") : `${source} (+ ${extras.join(", ")})`;
    }

    let comparisonCells = "";
    if (showComparison && band) {
      const diff = band.p50 - band.baselineTotal;
      const diffClass =
        diff > 0 ? "is-positive" : diff < 0 ? "is-negative" : "";
      comparisonCells = `
        <td class="mc-comp-col mc-comp-col-base">${currency.format(band.baselineTotal)}</td>
        <td class="mc-comp-col mc-comp-col-mc">${currency.format(band.p10)}</td>
        <td class="mc-comp-col mc-comp-col-mc mc-comp-col-p50">${currency.format(band.p50)}</td>
        <td class="mc-comp-col mc-comp-col-mc">${currency.format(band.p90)}</td>
        <td class="mc-comp-col mc-comp-col-diff ${diffClass}">${formatDiffCurrency(diff)}</td>`;
    }

    return `
      <tr data-phase="${row.phase}">
        <td>${dateFormat.format(row.date)}</td>
        <td>${ages.format(row.age)}</td>
        <td>${row.phase}</td>
        <td class="projection-return">${returnRate}</td>
        <td>${currency.format(row.ratePension)}</td>
        <td>${currency.format(row.lifeAnnuityDepotValue)}</td>
        <td>${row.lifeAnnuityWithdrawal ? currency.format(row.lifeAnnuityWithdrawal) : "—"}</td>
        <td>${currency.format(row.ageSavings)}</td>
        <td>${currency.format(row.freeFunds)}</td>
        <td>${currency.format(row.ask)}</td>
        <td>${currency.format(row.totalDepotValue)}</td>
        <td class="housing-col"${includeHousing ? "" : " hidden"}>${row.housingEquity ? currency.format(row.housingEquity) : "—"}</td>
        <td class="housing-col"${includeHousing ? "" : " hidden"}>${currency.format(row.totalWealthWithHousing ?? row.totalDepotValue)}</td>
        <td>${row.contribution ? currency.format(row.contribution) : "—"}</td>
        <td>${row.withdrawal ? currency.format(row.withdrawal) : "—"}</td>
        <td>${row.withdrawal ? currency.format(row.netWithdrawal) : "—"}</td>
        <td>${inventoryTax}</td>
        <td>${effectiveTax}</td>
        <td>${source}</td>${comparisonCells}
      </tr>`;
  }

  function pointPath(points) {
    return points
      .map((point, index) => `${index === 0 ? "M" : "L"}${point.x},${point.y}`)
      .join(" ");
  }

  function areaPath(points, baseline) {
    if (!points.length) {
      return "";
    }

    return `${pointPath(points)} L${points[points.length - 1].x},${baseline} L${points[0].x},${baseline} Z`;
  }

  function areaBetweenPaths(upperPoints, lowerPoints) {
    if (!upperPoints.length || !lowerPoints.length) {
      return "";
    }
    const forward = pointPath(upperPoints);
    const backward = [...lowerPoints]
      .reverse()
      .map((point) => `L${point.x},${point.y}`)
      .join(" ");
    return `${forward} ${backward} Z`;
  }

  function setPhaseWidth(element, years, totalYears) {
    element.hidden = years <= 0;
    const percentage = years > 0 ? (years / totalYears) * 100 : 0;
    element.style.flex = `0 0 ${percentage}%`;
  }

  function setPhaseGroupWidth(element, years, totalYears) {
    const percentage = (years / totalYears) * 100;
    element.style.flex = `0 0 ${percentage}%`;
  }

  function renderPhases(calculation, inputs) {
    const currentAge = calculation.planRows[0].age;
    const fireAge = calculation.fireRow
      ? calculation.fireRow.age
      : inputs.retirementAge;
    const pensionStopAge = calculation.pensionStopRow
      ? Math.min(calculation.pensionStopRow.age, fireAge)
      : fireAge;
    const finalAge = calculation.finalRow.age;
    const totalYears = Math.max(1, finalAge - currentAge);
    const pensionSavingYears = Math.max(0, pensionStopAge - currentAge);
    const freeFundsOnlyYears = Math.max(0, fireAge - pensionStopAge);
    const fireYears = calculation.fireRow
      ? Math.max(0, inputs.retirementAge - fireAge)
      : 0;
    const pensionYears = Math.max(0, finalAge - inputs.retirementAge);
    const savingYears = Math.max(0, fireAge - currentAge);
    const drawdownYears = Math.max(0, finalAge - fireAge);

    setPhaseGroupWidth(
      document.querySelector("#phase-group-saving"),
      savingYears,
      totalYears,
    );
    setPhaseGroupWidth(
      document.querySelector("#phase-group-drawdown"),
      drawdownYears,
      totalYears,
    );

    const phases = [
      {
        element: document.querySelector("#phase-saving-pension"),
        years: pensionSavingYears,
      },
      {
        element: document.querySelector("#phase-saving-free"),
        years: freeFundsOnlyYears,
      },
      { element: document.querySelector("#phase-fire"), years: fireYears },
      {
        element: document.querySelector("#phase-pension"),
        years: pensionYears,
      },
    ];

    phases.forEach(({ element, years }) => {
      setPhaseWidth(element, years, totalYears);
    });

    const firstVisiblePhase = phases.find(({ years }) => years > 0)?.element;
    phases.forEach(({ element, years }) => {
      const connector = element.querySelector(".phase-connector");
      connector.hidden = years <= 0 || element === firstVisiblePhase;
    });
    setText(
      "phase-saving-pension-ages",
      `${ages.format(currentAge)} – ${ages.format(pensionStopAge)} år`,
    );
    setText(
      "phase-saving-free-ages",
      `${ages.format(pensionStopAge)} – ${ages.format(fireAge)} år`,
    );
    setText(
      "phase-fire-ages",
      `${ages.format(fireAge)} – ${inputs.retirementAge} år`,
    );
    setText(
      "phase-pension-ages",
      `${inputs.retirementAge} – ${ages.format(finalAge)} år`,
    );
  }

  function renderChart(calculation, inputs, mc) {
    const width = 1120;
    const height = 236;
    const margin = { top: 4, right: 76, bottom: 44, left: 76 };
    const plotWidth = width - margin.left - margin.right;
    const plotHeight = height - margin.top - margin.bottom;
    const plotBottom = margin.top + plotHeight;
    const rows = calculation.planRows;
    const minAge = rows[0].age;
    const maxAge = rows[rows.length - 1].age;
    const fireAge = calculation.fireRow
      ? calculation.fireRow.age
      : inputs.retirementAge;
    const pensionStopAge = calculation.pensionStopRow
      ? Math.min(calculation.pensionStopRow.age, fireAge)
      : fireAge;
    const pensionValue = (row) =>
      row.ratePension + row.lifeAnnuity + row.ageSavings;
    const freeFundsValue = (row) => row.freeFunds + row.ask;

    const showMcOnChart = Boolean(mc) && mcChartMode !== "without";
    const showWithoutOnChart = mcChartMode !== "with";
    const bandsByAge = new Map(
      (mc?.percentileBands ?? []).map((band) => [band.age, band]),
    );

    if (legendGroupWithout) {
      legendGroupWithout.hidden = !showWithoutOnChart;
    }
    if (legendBaselineTotal) {
      legendBaselineTotal.hidden = !(showMcOnChart && showWithoutOnChart);
    }
    if (legendGroupWith) {
      legendGroupWith.hidden = !showMcOnChart;
    }

    const baseMax = Math.max(
      ...rows.map((row) =>
        showMcOnChart
          ? Math.max(pensionValue(row), freeFundsValue(row), row.totalBalance)
          : Math.max(pensionValue(row), freeFundsValue(row)),
      ),
      1,
    );
    const mcMax = showMcOnChart
      ? Math.max(...mc.percentileBands.map((band) => band.p90), 1)
      : 1;
    const rawMax = Math.max(showWithoutOnChart ? baseMax : 1, mcMax);
    const magnitude = 10 ** Math.floor(Math.log10(rawMax));
    const yMax = Math.ceil(rawMax / magnitude) * magnitude;
    const xForAge = (age) =>
      margin.left + ((age - minAge) / Math.max(1, maxAge - minAge)) * plotWidth;
    const yForValue = (value) => plotBottom - (value / yMax) * plotHeight;
    const pensionPoints = rows.map((row) => ({
      age: row.age,
      x: xForAge(row.age).toFixed(2),
      y: yForValue(pensionValue(row)).toFixed(2),
    }));
    const freeFundsPoints = rows.map((row) => ({
      age: row.age,
      x: xForAge(row.age).toFixed(2),
      y: yForValue(freeFundsValue(row)).toFixed(2),
    }));
    const totalBaselinePoints = rows.map((row) => ({
      age: row.age,
      x: xForAge(row.age).toFixed(2),
      y: yForValue(row.totalBalance).toFixed(2),
    }));
    const mcPointsForKey = (key) =>
      rows.map((row) => {
        const band = bandsByAge.get(row.age);
        const val = band ? band[key] : row.totalBalance;
        return {
          age: row.age,
          x: xForAge(row.age).toFixed(2),
          y: yForValue(val).toFixed(2),
        };
      });
    const mcP10Points = showMcOnChart ? mcPointsForKey("p10") : [];
    const mcP25Points = showMcOnChart ? mcPointsForKey("p25") : [];
    const mcP50Points = showMcOnChart ? mcPointsForKey("p50") : [];
    const mcP75Points = showMcOnChart ? mcPointsForKey("p75") : [];
    const mcP90Points = showMcOnChart ? mcPointsForKey("p90") : [];

    const yTicks = Array.from({ length: 5 }, (_, index) => (yMax / 4) * index);
    const axisRows = rows.filter(
      (row, index) => index === 0 || row.age !== rows[index - 1].age,
    );
    const phaseRects = [
      {
        className: "chart-phase-saving-pension",
        from: minAge,
        to: pensionStopAge,
      },
      {
        className: "chart-phase-saving-free",
        from: pensionStopAge,
        to: fireAge,
      },
      {
        className: "chart-phase-fire",
        from: fireAge,
        to: inputs.retirementAge,
      },
      {
        className: "chart-phase-pension",
        from: inputs.retirementAge,
        to: maxAge,
      },
    ]
      .filter((phase) => phase.to > phase.from)
      .map(
        (phase) =>
          `<rect class="${phase.className}" x="${xForAge(phase.from)}" y="${margin.top}" width="${xForAge(phase.to) - xForAge(phase.from)}" height="${plotHeight}" />`,
      )
      .join("");
    const gridLines = yTicks
      .map((value) => {
        const y = yForValue(value);
        return `<line class="chart-grid-line" x1="${margin.left}" x2="${width - margin.right}" y1="${y}" y2="${y}" />`;
      })
      .join("");
    const yAxisLabels = yTicks
      .map((value) => {
        const y = yForValue(value);
        return `<text class="chart-axis-label" x="${margin.left - 12}" y="${y + 4}" text-anchor="end">${compactNumber.format(value)} kr.</text>`;
      })
      .join("");
    const boundaries = [pensionStopAge, fireAge, inputs.retirementAge]
      .filter(
        (age, index, agesList) =>
          age > minAge && age < maxAge && agesList.indexOf(age) === index,
      )
      .map(
        (age) =>
          `<line class="chart-boundary" x1="${xForAge(age)}" x2="${xForAge(age)}" y1="${margin.top}" y2="${plotBottom}" />`,
      )
      .join("");
    const yearAxis = axisRows
      .map((row, index) => {
        const x = xForAge(row.age);
        const nowLabel =
          index === 0
            ? `<text class="chart-now-label" x="${x}" y="${plotBottom + 29}">nu</text>`
            : "";
        return `
          <line class="chart-year-tick" x1="${x}" x2="${x}" y1="${plotBottom}" y2="${plotBottom + 4}" />
          <text class="chart-year-label" x="${x}" y="${plotBottom + 14}">${row.age}</text>
          ${nowLabel}`;
      })
      .join("");

    const mcSvgLayers = showMcOnChart
      ? `
          <path class="chart-band-p10-p90" d="${areaBetweenPaths(mcP90Points, mcP10Points)}" />
          <path class="chart-band-p25-p75" d="${areaBetweenPaths(mcP75Points, mcP25Points)}" />
          <path class="chart-line-mc-p10" d="${pointPath(mcP10Points)}" />
          <path class="chart-line-mc-p50" d="${pointPath(mcP50Points)}" />`
      : "";
    const withoutAreaLayers = showWithoutOnChart
      ? `
          <path class="chart-area-pension" d="${areaPath(pensionPoints, plotBottom)}" />
          <path class="chart-area-free-funds" d="${areaPath(freeFundsPoints, plotBottom)}" />`
      : "";
    const withoutLineLayers = showWithoutOnChart
      ? `
          <path class="chart-line-pension" d="${pointPath(pensionPoints)}" />
          <path class="chart-line-free-funds" d="${pointPath(freeFundsPoints)}" />
          ${showMcOnChart ? `<path class="chart-line-total-baseline" d="${pointPath(totalBaselinePoints)}" />` : ""}`
      : "";

    const tooltipWidth = showMcOnChart ? 236 : 184;
    const tooltipHeight = showMcOnChart ? 156 : 84;
    const valX = tooltipWidth - 10;

    chart.innerHTML = `
      <svg viewBox="0 0 ${width} ${height}" role="img" aria-label="Pension og frie midler fra ${ages.format(minAge)} til ${ages.format(maxAge)} år" aria-describedby="wealth-chart-description">
        <desc id="wealth-chart-description">Grafen viser formueudviklingen med og uden Monte Carlo-simulering for hvert år.</desc>
        <defs>
          <clipPath id="chart-plot-clip">
            <rect x="${margin.left}" y="${margin.top}" width="${plotWidth}" height="${plotHeight}" rx="10" />
          </clipPath>
        </defs>
        <rect class="chart-plot-surface" x="${margin.left}" y="${margin.top}" width="${plotWidth}" height="${plotHeight}" rx="10" />
        <g clip-path="url(#chart-plot-clip)">
          ${phaseRects}
          ${withoutAreaLayers}
          ${mcSvgLayers}
          ${gridLines}
          ${boundaries}
          ${withoutLineLayers}
        </g>
        ${yAxisLabels}
        ${yearAxis}
        <rect class="chart-hover-target" x="${margin.left}" y="${margin.top}" width="${plotWidth}" height="${plotHeight}" tabindex="0" role="img" aria-label="Vis beløb for et bestemt år" />
        <g class="chart-hover-layer" style="display: none" aria-hidden="true">
          <line class="chart-hover-line" x1="0" x2="0" y1="${margin.top}" y2="${plotBottom}" />
          <circle class="chart-hover-point-pension" cx="0" cy="0" r="4" ${showWithoutOnChart ? "" : 'style="display:none"'} />
          <circle class="chart-hover-point-free-funds" cx="0" cy="0" r="4" ${showWithoutOnChart ? "" : 'style="display:none"'} />
          <circle class="chart-hover-point-mc-p50" cx="0" cy="0" r="4" ${showMcOnChart ? "" : 'style="display:none"'} />
          <g class="chart-tooltip">
            <rect class="chart-tooltip-box" width="${tooltipWidth}" height="${tooltipHeight}" rx="6" />
            <text id="chart-tooltip-title" class="chart-tooltip-title" x="10" y="17"></text>
            <text class="chart-tooltip-section-tag" x="10" y="32">${showMcOnChart ? "UDEN MONTE CARLO (FAST)" : "Pension"}</text>
            <text id="chart-tooltip-pension" class="chart-tooltip-value" x="${valX}" y="${showMcOnChart ? 47 : 36}"></text>
            ${showMcOnChart ? `<text class="chart-tooltip-label" x="10" y="47">Pension / Frie (Fast)</text>` : ""}
            <text class="chart-tooltip-label" x="10" y="${showMcOnChart ? 63 : 52}">${showMcOnChart ? "Samlet formue (Fast)" : "Frie midler"}</text>
            <text id="chart-tooltip-free-funds" class="chart-tooltip-value" x="${valX}" y="${showMcOnChart ? 63 : 52}"></text>
            <line class="chart-tooltip-total-rule" x1="10" x2="${valX}" y1="${showMcOnChart ? 72 : 61}" y2="${showMcOnChart ? 72 : 61}" />
            <text class="${showMcOnChart ? "chart-tooltip-section-tag chart-tooltip-section-mc" : "chart-tooltip-label"}" x="10" y="${showMcOnChart ? 86 : 76}">${showMcOnChart ? "MED MONTE CARLO (UDSVING)" : "Samlet formue"}</text>
            <text id="chart-tooltip-total" class="chart-tooltip-value" x="${valX}" y="${showMcOnChart ? 102 : 76}"></text>
            ${
              showMcOnChart
                ? `
            <text class="chart-tooltip-label" x="10" y="102">MC P50 (Median)</text>
            <text class="chart-tooltip-label" x="10" y="120">MC P10 (Pessimistisk)</text>
            <text id="chart-tooltip-mc-p10" class="chart-tooltip-value" x="${valX}" y="120"></text>
            <text class="chart-tooltip-label" x="10" y="138">MC P90 (Optimistisk)</text>
            <text id="chart-tooltip-mc-p90" class="chart-tooltip-value" x="${valX}" y="138"></text>`
                : ""
            }
          </g>
        </g>
      </svg>`;

    const svg = chart.querySelector("svg");
    const hoverTarget = svg.querySelector(".chart-hover-target");
    const hoverLayer = svg.querySelector(".chart-hover-layer");
    const hoverLine = svg.querySelector(".chart-hover-line");
    const hoverPensionPoint = svg.querySelector(".chart-hover-point-pension");
    const hoverFreeFundsPoint = svg.querySelector(
      ".chart-hover-point-free-funds",
    );
    const hoverMcP50Point = svg.querySelector(".chart-hover-point-mc-p50");
    const tooltip = svg.querySelector(".chart-tooltip");
    let activeIndex = 0;

    function showYear(index) {
      activeIndex = Math.max(0, Math.min(rows.length - 1, index));
      const row = rows[activeIndex];
      const pensionPoint = pensionPoints[activeIndex];
      const freeFundsPoint = freeFundsPoints[activeIndex];
      const x = Number(pensionPoint.x);
      const pensionY = Number(pensionPoint.y);
      const freeFundsY = Number(freeFundsPoint.y);
      const tooltipX =
        x > width - margin.right - tooltipWidth - 16
          ? x - tooltipWidth - 12
          : x + 12;
      const tooltipY = margin.top + 8;

      hoverLine.setAttribute("x1", x);
      hoverLine.setAttribute("x2", x);
      hoverPensionPoint.setAttribute("cx", x);
      hoverPensionPoint.setAttribute("cy", pensionY);
      hoverFreeFundsPoint.setAttribute("cx", x);
      hoverFreeFundsPoint.setAttribute("cy", freeFundsY);
      if (showMcOnChart && hoverMcP50Point && mcP50Points[activeIndex]) {
        hoverMcP50Point.setAttribute("cx", x);
        hoverMcP50Point.setAttribute("cy", Number(mcP50Points[activeIndex].y));
      }
      tooltip.setAttribute("transform", `translate(${tooltipX} ${tooltipY})`);
      svg.querySelector("#chart-tooltip-title").textContent =
        `${row.date.getFullYear()} · ${ages.format(row.age)} år`;

      if (showMcOnChart) {
        const band = bandsByAge.get(row.age);
        svg.querySelector("#chart-tooltip-pension").textContent =
          `${compactNumber.format(pensionValue(row))} / ${compactNumber.format(freeFundsValue(row))} kr.`;
        svg.querySelector("#chart-tooltip-free-funds").textContent =
          currency.format(row.totalBalance);
        svg.querySelector("#chart-tooltip-total").textContent = band
          ? currency.format(band.p50)
          : "—";
        const p10Node = svg.querySelector("#chart-tooltip-mc-p10");
        const p90Node = svg.querySelector("#chart-tooltip-mc-p90");
        if (p10Node) {
          p10Node.textContent = band ? currency.format(band.p10) : "—";
        }
        if (p90Node) {
          p90Node.textContent = band ? currency.format(band.p90) : "—";
        }
        hoverTarget.setAttribute(
          "aria-label",
          `${row.date.getFullYear()}, ${ages.format(row.age)} år. Uden Monte Carlo samlet formue ${currency.format(row.totalBalance)}. Med Monte Carlo P50 ${band ? currency.format(band.p50) : "—"}, P10 ${band ? currency.format(band.p10) : "—"}, P90 ${band ? currency.format(band.p90) : "—"}.`,
        );
      } else {
        svg.querySelector("#chart-tooltip-pension").textContent =
          currency.format(pensionValue(row));
        svg.querySelector("#chart-tooltip-free-funds").textContent =
          currency.format(freeFundsValue(row));
        svg.querySelector("#chart-tooltip-total").textContent = currency.format(
          row.totalBalance,
        );
        hoverTarget.setAttribute(
          "aria-label",
          `${row.date.getFullYear()}, ${ages.format(row.age)} år. Pension ${currency.format(pensionValue(row))} Frie midler ${currency.format(freeFundsValue(row))} Samlet formue ${currency.format(row.totalBalance)}`,
        );
      }
      hoverLayer.style.display = "block";
    }

    function showPointerYear(event) {
      const rect = svg.getBoundingClientRect();
      const viewBoxX = ((event.clientX - rect.left) / rect.width) * width;
      const progress = Math.max(
        0,
        Math.min(1, (viewBoxX - margin.left) / plotWidth),
      );
      const targetAge = minAge + progress * (maxAge - minAge);
      const nearestIndex = rows.reduce(
        (bestIndex, row, index) =>
          Math.abs(row.age - targetAge) <
          Math.abs(rows[bestIndex].age - targetAge)
            ? index
            : bestIndex,
        0,
      );
      showYear(nearestIndex);
    }

    hoverTarget.addEventListener("pointermove", showPointerYear);
    hoverTarget.addEventListener("pointerdown", showPointerYear);
    hoverTarget.addEventListener("pointerleave", () => {
      hoverLayer.style.display = "none";
    });
    hoverTarget.addEventListener("focus", () => showYear(activeIndex));
    hoverTarget.addEventListener("blur", () => {
      hoverLayer.style.display = "none";
    });
    hoverTarget.addEventListener("keydown", (event) => {
      if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) {
        return;
      }
      event.preventDefault();
      if (event.key === "Home") {
        showYear(0);
      } else if (event.key === "End") {
        showYear(rows.length - 1);
      } else {
        showYear(activeIndex + (event.key === "ArrowRight" ? 1 : -1));
      }
    });
  }

  function render(calculation, inputs) {
    const stop = calculation.pensionStopRow;
    const fire = calculation.fireRow;

    resultHeading.textContent = fire
      ? `FIRE fra ${ages.format(fire.age)} år`
      : "FIRE-ikke nået";
    setText(
      "result-withdrawal",
      inputs.withdrawalAfterTax
        ? `${currency.format(inputs.desiredAnnualWithdrawal)} om året efter skat`
        : `${currency.format(inputs.desiredAnnualWithdrawal)} om året før skat`,
    );
    setText(
      "result-final-balance",
      currency.format(calculation.finalRow.totalBalance),
    );
    setText("result-final-age", ages.format(calculation.finalRow.age));
    setText(
      "result-pension-stop-age",
      stop ? `${ages.format(stop.age)} år` : "—",
    );
    setText(
      "result-pension-stop-label",
      stop ? "Stop pensionsindbetaling" : "Fortsæt pensionsindbetaling",
    );
    setText(
      "result-pension-stop-note",
      stop
        ? stop.coastFinanced
          ? "Pensionen kan vokse videre uden nye indbetalinger."
          : "Den samlede formue finansierer planen uden nye indbetalinger."
        : "Pensionsmålet er ikke nået før pensionsalderen.",
    );
    setText(
      "result-fire-milestone-age",
      fire ? `${ages.format(fire.age)} år` : "—",
    );
    setText(
      "result-fire-milestone-label",
      fire ? "Start FIRE" : "FIRE-målet er ikke nået",
    );
    setText(
      "result-fire-milestone-note",
      fire
        ? `Frie midler finansierer de næste ${years.format(fire.bridgeYears)} år.`
        : "De valgte indbetalinger finansierer ikke hele FIRE-perioden.",
    );
    setText("result-retirement-age", `${inputs.retirementAge} år`);
    setText(
      "result-retirement-note",
      calculation.isFullyFunded
        ? `Pension og eventuelle frie midler finansierer perioden frem til ${ages.format(calculation.finalRow.age)} år.`
        : calculation.firstShortfallDate
          ? `Formuen dækker ikke den ønskede hævning fra ${dateFormat.format(calculation.firstShortfallDate)}.`
          : "Formuen dækker ikke den ønskede hævning gennem hele perioden.",
    );

    const needsMonteCarlo =
      mcChartMode !== "without" ||
      mcTableScenario !== "baseline" ||
      latestMonteCarlo !== null;
    const mc = needsMonteCarlo ? computeMonteCarlo(inputs, false) : null;

    renderPhases(calculation, inputs);
    renderMonteCarloComparison(calculation, inputs, mc);
    renderChart(calculation, inputs, mc);

    setText("current-age", `${calculation.currentAge} år`);
    const realReturn = (growthReturn, defensiveReturn) =>
      calculation.returnStrategy === "none"
        ? percent.format(growthReturn)
        : `${percent.format(defensiveReturn)} – ${percent.format(growthReturn)}`;
    setText(
      "real-pension-return",
      realReturn(
        calculation.realPensionReturn,
        calculation.defensiveRealPensionReturn,
      ),
    );
    setText(
      "real-ask-return",
      realReturn(
        calculation.realAskReturn,
        calculation.defensiveRealAskReturn,
      ),
    );
    setText(
      "real-free-return",
      realReturn(
        calculation.realFreeFundsReturn,
        calculation.defensiveRealFreeFundsReturn,
      ),
    );
    setText(
      "total-free-funds-tax",
      currency.format(calculation.totalFreeFundsTax),
    );
    setText(
      "total-pension-withdrawal-tax",
      currency.format(calculation.totalPensionWithdrawalTax),
    );
    setText(
      "effective-free-funds-tax-rate",
      percent.format(calculation.effectiveFreeFundsTaxRate),
    );
    setText(
      "annual-net-contribution-budget",
      currency.format(calculation.annualNetContributionBudget),
    );
    setText(
      "age-savings-contribution-limit",
      currency.format(calculation.ageSavingsContributionLimit),
    );
    setText(
      "life-annuity-balance-at-retirement",
      currency.format(calculation.lifeAnnuityBalanceAtRetirement),
    );
    setText(
      "life-annuity-annual-income",
      currency.format(calculation.lifeAnnuityAnnualIncome),
    );
    setText(
      "life-annuity-conversion-rate",
      percent.format(calculation.lifeAnnuityConversionRate),
    );
    setText(
      "life-annuity-expected-age",
      `${years.format(calculation.lifeAnnuityExpectedAgeAtDeath)} år`,
    );
    setText(
      "required-at-retirement",
      calculation.requiredAtRetirement === null
        ? "—"
        : currency.format(calculation.requiredAtRetirement),
    );
    setText(
      "pension-target-today",
      calculation.pensionTargetToday === null
        ? "—"
        : currency.format(calculation.pensionTargetToday),
    );
    setText(
      "pension-stop-age",
      stop ? `${ages.format(stop.age)} år` : "Ikke nået",
    );
    setText("pension-stop-date", stop ? dateFormat.format(stop.date) : "—");
    setText(
      "pension-at-stop",
      stop
        ? currency.format(stop.ratePension + stop.lifeAnnuity + stop.ageSavings)
        : "—",
    );
    setText(
      "pension-target-at-stop",
      stop ? currency.format(calculation.pensionTargetAtStop) : "—",
    );
    setText(
      "fire-age",
      fire ? `${ages.format(fire.age)} år` : "Ikke nået før pension",
    );
    setText("fire-date", fire ? dateFormat.format(fire.date) : "—");
    setText(
      "bridge-years",
      fire ? `${years.format(fire.bridgeYears)} år` : "—",
    );
    setText("free-at-fire", fire ? currency.format(fire.freeFunds) : "—");
    setText("ask-at-fire", fire ? currency.format(fire.ask) : "—");
    setText(
      "bridge-withdrawal",
      fire ? currency.format(fire.possibleBridgeWithdrawal) : "—",
    );
    setText("final-date", dateFormat.format(calculation.finalRow.date));
    setText(
      "final-balance",
      currency.format(calculation.finalRow.totalBalance),
    );
    setText(
      "final-pension",
      currency.format(
        calculation.finalRow.ratePension +
          calculation.finalRow.lifeAnnuity +
          calculation.finalRow.ageSavings,
      ),
    );
    setText(
      "final-free-funds",
      currency.format(
        calculation.finalRow.freeFunds + calculation.finalRow.ask,
      ),
    );

    if (calculation.includeHousing) {
      setText(
        "initial-housing-equity",
        currency.format(calculation.initialHousingEquity),
      );
      setText(
        "fire-housing-equity",
        calculation.fireHousingEquity !== null
          ? currency.format(calculation.fireHousingEquity)
          : "—",
      );
      setText(
        "total-housing-unlocked",
        currency.format(calculation.totalHousingUnlocked),
      );
      setText(
        "final-housing-equity",
        currency.format(calculation.finalHousingEquity),
      );
      setText(
        "final-wealth-with-housing",
        currency.format(calculation.finalReserveAfterTaxWithHousing),
      );
    }
    document.querySelectorAll(".housing-key-figure").forEach((el) => {
      el.hidden = !calculation.includeHousing;
    });
    document.querySelectorAll(".housing-col").forEach((el) => {
      el.hidden = !calculation.includeHousing;
    });

    const activeTableCalc =
      mc && mcTableScenario !== "baseline" && mc.scenarios?.[mcTableScenario]
        ? mc.scenarios[mcTableScenario].calculation
        : calculation;
    const showCompCols =
      Boolean(mc) && Boolean(mcTableShowComparisonInput?.checked);
    const bandsByAge = new Map(
      (mc?.percentileBands ?? []).map((band) => [band.age, band]),
    );
    mcComparisonThs.forEach((th) => {
      th.hidden = !showCompCols;
    });

    if (mcTableActiveBanner && mcTableActivePill && mcTableActiveDesc) {
      const scenarioStop = activeTableCalc.pensionStopRow
        ? `${ages.format(activeTableCalc.pensionStopRow.age)} år`
        : "Ikke nået";
      const scenarioFire = activeTableCalc.fireRow
        ? `${ages.format(activeTableCalc.fireRow.age)} år`
        : "Ikke nået";
      const scenarioReserve = currency.format(
        activeTableCalc.finalRow.totalBalance,
      );
      if (mcTableScenario === "baseline" || !mc) {
        mcTableActiveBanner.className = "mc-table-active-banner is-without";
        mcTableActivePill.className = "mc-mode-pill mc-mode-pill-without";
        mcTableActivePill.textContent =
          "AKTIV TABEL: UDEN MONTE CARLO (FAST AFKAST)";
        mcTableActiveDesc.textContent = `Alle op- og nedsparingskolonner viser det deterministiske forløb med fast årligt afkast (${percent.format(inputs.returnRate)}). Stop pension: ${scenarioStop} · Start FIRE: ${scenarioFire} · Slutreserve: ${scenarioReserve}.`;
      } else {
        const scenarioNames = {
          p50: "P50 MEDIAN-FORLØB (TYPISK MARKED)",
          p10: "P10 PESSIMISTISK FORLØB (SVAGT MARKED / 10. PERCENTIL)",
          p90: "P90 OPTIMISTISK FORLØB (STÆRKT MARKED / 90. PERCENTIL)",
        };
        const adaptiveFireText = activeTableCalc.adaptiveFireAge
          ? `${ages.format(activeTableCalc.adaptiveFireAge)} år`
          : "Ikke nået før pension";
        mcTableActiveBanner.className = "mc-table-active-banner is-with";
        mcTableActivePill.className = "mc-mode-pill mc-mode-pill-with";
        mcTableActivePill.textContent = `AKTIV TABEL: MED MONTE CARLO · ${scenarioNames[mcTableScenario]}`;
        mcTableActiveDesc.textContent = `Alle op- og nedsparingskolonner viser et simuleret markedsforløb med årlige afkastudsving (se kolonnen "Afkast"). Opnår FIRE-mål ved: ${adaptiveFireText} · Planlagt FIRE-start: ${scenarioFire} · Slutreserve: ${scenarioReserve}.`;
      }
    }

    tableBody.innerHTML = activeTableCalc.planRows
      .map((row) =>
        rowMarkup(
          row,
          inputs.freeFundsInventoryShare,
          bandsByAge.get(row.age),
          showCompCols,
          calculation.includeHousing,
        ),
      )
      .join("");
    markContributionLimit(
      "annualAgeSavingsContribution",
      calculation.ageSavingsContributionLimitExceeded,
      calculation.ageSavingsContributionLimit,
    );
    markContributionLimit(
      "annualLifeAnnuityContribution",
      calculation.lifeAnnuityContributionLimitExceeded,
      calculation.lifeAnnuityContributionLimit,
    );
    ageSavingsRedirectMessage.hidden =
      calculation.annualAgeSavingsContributionRedirected <= 0;
    ageSavingsRedirectMessage.textContent =
      calculation.annualAgeSavingsContributionRedirected > 0
        ? `${currency.format(calculation.annualAgeSavingsContributionRedirected)} over loftet flyttes til frie midler i beregningen.`
        : "";
    ratePensionSplitMessage.hidden =
      calculation.annualNonDeductibleRatePensionContribution <= 0;
    ratePensionSplitMessage.textContent =
      calculation.annualNonDeductibleRatePensionContribution > 0
        ? `${currency.format(calculation.annualDeductibleRatePensionContribution)} behandles med fradrag, og ${currency.format(calculation.annualNonDeductibleRatePensionContribution)} behandles som hovedstol uden fradrag.`
        : "";
    lifeAnnuityLimitMessage.hidden =
      !calculation.lifeAnnuityContributionLimitExceeded;
    lifeAnnuityLimitMessage.textContent =
      calculation.lifeAnnuityContributionLimitExceeded
        ? `Kun ${currency.format(calculation.lifeAnnuityContributionLimit)} af livrenteindbetalingen får den angivne skattebesparelse i den enkle private model.`
        : "";
    errorBox.hidden = true;
    results.hidden = false;
  }

  function update(event) {
    if (event) {
      event.preventDefault();
    }

    try {
      const inputs = readInputs();
      const calculation = calculateFire(inputs);
      render(calculation, inputs);
      if (!latestOptimization) {
        renderOptimizationPreview(inputs, calculation);
      }
    } catch (error) {
      errorBox.textContent = error.message;
      errorBox.hidden = false;
      results.hidden = true;
    }
  }

  form.addEventListener("submit", update);
  form.addEventListener("input", (event) => {
    cancelActiveOptimization();
    setPlanCodeStatus("");
    hideOptimizationResult();
    if (event.target.matches("[data-number-format='integer']")) {
      formatNumberInput(event.target, true);
    }
    if (event.target === form.elements.contributionsFollowInflation) {
      renderInflationState();
    }
    if (
      event.target === form.elements.redirectPensionContributionsToFreeFunds
    ) {
      renderPensionRedirectState();
    }
    if (event.target === form.elements.withdrawalAfterTax) {
      renderWithdrawalTaxState();
    }
    if (event.target.name === "freeFundsInventoryShare") {
      renderFreeFundsTaxation();
    }
    if (
      event.target === form.elements.returnStrategy ||
      event.target === form.elements.returnRate
    ) {
      renderReturnStrategyState();
    }
    if (event.target === form.elements.isCouple) {
      renderCoupleState();
    }
    if (event.target === form.elements.includeFolkepension) {
      renderFolkepensionState();
    }
    if (
      event.target === form.elements.includeHousing ||
      event.target === form.elements.housingUnlock ||
      event.target === form.elements.housingUnlockAgeType ||
      event.target.name === "housingType"
    ) {
      renderHousingState();
    }
    update(event);
  });
  optimizeButton.addEventListener("click", runContributionOptimization);
  applyOptimizationButton.addEventListener("click", applyOptimization);
  if (runMonteCarloButton) {
    runMonteCarloButton.addEventListener("click", runMonteCarloSimulation);
  }
  mcChartModeButtons.forEach((button) => {
    button.addEventListener("click", () => {
      mcChartMode = button.dataset.mcChartMode || "without";
      syncMonteCarloButtons();
      update();
    });
  });
  mcTableScenarioButtons.forEach((button) => {
    button.addEventListener("click", () => {
      mcTableScenario = button.dataset.mcTableScenario || "baseline";
      if (mcTableScenario !== "baseline" && mcChartMode === "without") {
        mcChartMode = "compare";
      }
      syncMonteCarloButtons();
      update();
    });
  });
  if (mcTableShowComparisonInput) {
    mcTableShowComparisonInput.addEventListener("change", () => {
      update();
    });
  }
  contributionLockButtons.forEach((button) => {
    button.addEventListener("click", () => toggleContributionLock(button));
  });
  savePlanCodeButton.addEventListener("click", () =>
    openPlanCodeDialog("save"),
  );
  loadPlanCodeButton.addEventListener("click", () =>
    openPlanCodeDialog("load"),
  );
  closePlanCodeDialogButton.addEventListener("click", () =>
    closePlanCodeDialog(),
  );
  copyPlanCodeButton.addEventListener("click", copySavedPlanCode);
  applyPlanCodeButton.addEventListener("click", loadPlanCode);
  planCodeDialog.addEventListener("click", (event) => {
    if (event.target === planCodeDialog) {
      closePlanCodeDialog();
    }
  });
  planCodeDialog.addEventListener("cancel", (event) => {
    event.preventDefault();
    closePlanCodeDialog();
  });
  planCodeDialog.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      event.preventDefault();
      closePlanCodeDialog();
    }
  });

  formattedNumberInputs.forEach((input) => {
    formatNumberInput(input);
    addNumberSteppers(input);
  });
  nativeNumberInputs.forEach((input) => addNumberSteppers(input));
  renderInflationState();
  renderPensionRedirectState();
  renderWithdrawalTaxState();
  renderFreeFundsTaxation();
  renderReturnStrategyState();
  renderCoupleState();
  renderFolkepensionState();
  renderHousingState();

  update();
})();
