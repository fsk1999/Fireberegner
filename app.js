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
  const chartScaleButtons = [
    ...document.querySelectorAll("[data-chart-scale]"),
  ];
  const chartViewTabs = [...document.querySelectorAll("[data-chart-view]")];
  const chartViewPanes = {
    wealth: document.querySelector("#wealth-chart-view"),
    cashflow: document.querySelector("#cashflow-chart-view"),
    tax: document.querySelector("#tax-chart-view"),
    solvency: document.querySelector("#solvency-chart-view"),
  };
  const cashflowChart = document.querySelector("#cashflow-chart");
  const taxChart = document.querySelector("#tax-chart");
  const solvencyChart = document.querySelector("#solvency-chart");
  const runSolvencyMcBtn = document.querySelector("#run-solvency-mc-btn");
  let currentChartView = "wealth";

  const autoCalculateToggle = document.querySelector("#auto-calculate-toggle");
  const manualRecalculateBtn = document.querySelector("#manual-recalculate-btn");
  const uncalculatedBadge = document.querySelector("#uncalculated-badge");
  const formRecalculateSubmitBtn = document.querySelector(
    "#form-recalculate-submit-btn",
  );

  let autoCalculateEnabled = true;
  try {
    const savedAuto = localStorage.getItem("fire_auto_calculate");
    if (savedAuto !== null) {
      autoCalculateEnabled = savedAuto === "true";
    }
  } catch (_e) {}
  let hasUncalculatedChanges = false;

  function updateCalcModeUi() {
    if (autoCalculateToggle) {
      autoCalculateToggle.checked = autoCalculateEnabled;
    }
    if (manualRecalculateBtn) {
      manualRecalculateBtn.hidden = autoCalculateEnabled;
    }
    if (uncalculatedBadge) {
      uncalculatedBadge.hidden = !hasUncalculatedChanges || autoCalculateEnabled;
    }
  }

  const compareScenariosTrigger = document.querySelector(
    "#compare-scenarios-trigger",
  );
  const exportPdfTrigger = document.querySelector("#export-pdf-trigger");
  const scenarioDialog = document.querySelector("#scenario-comparison-dialog");
  const closeScenarioDialogBtn = document.querySelector(
    "#close-scenario-dialog",
  );
  const saveAsPlanABtn = document.querySelector("#save-as-plan-a-btn");
  const saveAsPlanBBtn = document.querySelector("#save-as-plan-b-btn");
  const loadPlanABtn = document.querySelector("#load-plan-a-btn");
  const loadPlanBBtn = document.querySelector("#load-plan-b-btn");
  const scenarioContent = document.querySelector(
    "#scenario-comparison-content",
  );

  let scenarioPlanA = null;
  let scenarioPlanB = null;

  try {
    const savedA = localStorage.getItem("fire_scenario_plan_a");
    if (savedA) scenarioPlanA = JSON.parse(savedA);
    const savedB = localStorage.getItem("fire_scenario_plan_b");
    if (savedB) scenarioPlanB = JSON.parse(savedB);
  } catch (_e) {}


  const mcTableShowComparisonInput = document.querySelector(
    "#mc-table-show-comparison",
  );
  const mcTableActiveBanner = document.querySelector("#mc-table-active-banner");
  const mcTableActivePill = document.querySelector("#mc-table-active-pill");
  const mcTableActiveDesc = document.querySelector("#mc-table-active-desc");
  const mcComparisonThs = [
    ...document.querySelectorAll("#main-projection-table-wrap th.mc-comp-col"),
  ];
  const scenComparisonThs = [
    ...document.querySelectorAll("#main-projection-table-wrap th.scen-comp-col"),
  ];
  const scenCompThBadge = document.querySelector("#scen-comp-th-badge");
  const scenCompThTitle = document.querySelector("#scen-comp-th-title");
  const tableCrisisPickerWrap = document.querySelector(
    "#table-crisis-picker-wrap",
  );
  const tableCrisisSelect = document.querySelector("#table-crisis-select");
  const mcTableCrisisBtnLabel = document.querySelector(
    "#mc-table-crisis-btn-label",
  );
  const mainProjectionTableWrap = document.querySelector(
    "#main-projection-table-wrap",
  );
  const projectionDetailsCard = document.querySelector(
    "#projection-details-card",
  );
  const colGroupPills = [
    ...document.querySelectorAll("[data-toggle-col-group]"),
  ];
  const colGroupToggleAllBtn = document.querySelector(
    "#col-group-toggle-all-btn",
  );
  const housingColPill = document.querySelector(".housing-col-pill");

  const deepDiveDetailDialog = document.querySelector(
    "#deep-dive-detail-dialog",
  );
  const closeDeepDiveDialogBtn = document.querySelector(
    "#close-deep-dive-dialog",
  );
  const deepDiveDialogKicker = document.querySelector(
    "#deep-dive-dialog-kicker",
  );
  const deepDiveDialogHeading = document.querySelector(
    "#deep-dive-dialog-heading",
  );
  const deepDiveDialogSub = document.querySelector("#deep-dive-dialog-sub");
  const deepDiveDialogSummary = document.querySelector(
    "#deep-dive-dialog-summary",
  );
  const deepDiveModalTableWrap = document.querySelector(
    "#deep-dive-modal-table-wrap",
  );
  const deepDiveModalTbody = document.querySelector("#deep-dive-modal-tbody");
  const modalColGroupPills = [
    ...document.querySelectorAll("[data-modal-col-group]"),
  ];

  const legendGroupWithout = document.querySelector("#legend-group-without");
  const legendGroupWith = document.querySelector("#legend-group-with");
  const legendBaselineTotal = document.querySelector("#legend-baseline-total");
  const legendHousing = document.querySelector("#legend-housing");
  const legendCrisisOverlay = document.querySelector("#legend-crisis-overlay");
  const legendCrisisTitle = document.querySelector("#legend-crisis-title");
  let activeStressTestCrisis = null;
  let latestStressResults = [];
  let selectedTableCrisisIdx = 0;
  let activeTornadoPreset = null;
  let baseTornadoInputs = null;
  let isApplyingTornadoSliders = false;
  let tornadoOffsets = {
    spendingPct: 0,
    returnPts: 0,
    savingsPct: 0,
    inflationPts: 0,
  };
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
  const mathHoverTooltip = document.querySelector("#math-hover-tooltip");
  const mathTooltipBadge = document.querySelector("#math-tooltip-badge");
  const mathTooltipTitle = document.querySelector("#math-tooltip-title");
  const mathTooltipMath = document.querySelector("#math-tooltip-math");
  const mathInspectorDialog = document.querySelector("#math-inspector-dialog");
  const mathInspectorBadge = document.querySelector("#math-inspector-badge");
  const mathInspectorTitle = document.querySelector("#math-inspector-title");
  const mathInspectorDescription = document.querySelector(
    "#math-inspector-description",
  );
  const mathInspectorFormula = document.querySelector(
    "#math-inspector-formula",
  );
  const mathInspectorFormulaDetails = document.querySelector(
    "#math-inspector-formula-details",
  );
  const mathInspectorSteps = document.querySelector("#math-inspector-steps");
  const mathInspectorCalcCard = document.querySelector(
    "#math-inspector-calc-card",
  );
  const mathInspectorCalcTitle = document.querySelector(
    "#math-inspector-calc-title",
  );
  const mathInspectorCalcExample = document.querySelector(
    "#math-inspector-calc-example",
  );
  const mathInspectorCalcNote = document.querySelector(
    "#math-inspector-calc-note",
  );
  const mathInspectorAssumptions = document.querySelector(
    "#math-inspector-assumptions",
  );
  const mathInspectorClose = document.querySelector("#math-inspector-close");
  const mathInspectorOk = document.querySelector("#math-inspector-ok");

  const { calculateFire, optimizeAnnualContributions } =
    window.FireCalculations;
  const { encodePlan, decodePlan } = window.FirePlanCode;
  let latestOptimization = null;
  let activeOptimizationJob = null;
  let nextOptimizationJobId = 1;
  let planCodeReturnFocus = null;
  let latestMonteCarlo = null;
  let latestInputs = null;
  let latestCalculation = null;
  let latestActiveTableCalc = null;
  let mcChartMode = "without";
  let mcTableScenario = "baseline";
  let chartScaleMode = "linear";
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
    syncChartScaleButtons();
  }

  function syncChartScaleButtons() {
    chartScaleButtons.forEach((button) => {
      const active = button.dataset.chartScale === chartScaleMode;
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
    const firePlanRow = fire
      ? calculation.planRows?.find((r) => r.age === fire.age) || fire
      : null;
    const fireWealthVal = firePlanRow
      ? calculation.includeHousing
        ? (firePlanRow.totalWealthWithHousing ??
          firePlanRow.totalBalance ??
          (firePlanRow.ratePension || 0) +
            (firePlanRow.lifeAnnuity || 0) +
            (firePlanRow.ageSavings || 0) +
            (firePlanRow.freeFunds || 0) +
            (firePlanRow.ask || 0) +
            (firePlanRow.housingEquity || 0))
        : (firePlanRow.totalBalance ??
          (firePlanRow.ratePension || 0) +
            (firePlanRow.lifeAnnuity || 0) +
            (firePlanRow.ageSavings || 0) +
            (firePlanRow.freeFunds || 0) +
            (firePlanRow.ask || 0))
      : null;
    setText(
      "mc-comp-base-fire-wealth",
      Number.isFinite(fireWealthVal) ? currency.format(fireWealthVal) : "—",
    );
    setText(
      "mc-comp-base-status",
      calculation.isFullyFunded ? "100 % dækket (Fast)" : "Underfinansieret",
    );
    setText(
      "mc-comp-base-reserve",
      currency.format(
        calculation.includeHousing
          ? (calculation.finalReserveAfterTaxWithHousing ?? calculation.finalRow.totalWealthWithHousing ?? calculation.finalRow.totalBalance)
          : calculation.finalRow.totalBalance,
      ),
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

  function rowMarkup(
    row,
    freeFundsInventoryShare,
    band,
    showComparison,
    includeHousing = false,
    baseComparisonRow = null,
    showScenarioComp = false,
  ) {
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
      comparisonCells += `
        <td class="mc-comp-col mc-comp-col-base" data-col-group="comparison"><span class="explainable-val" data-col-key="baseTotal" data-row-age="${row.age}" tabindex="0">${currency.format(band.baselineTotal)}</span></td>
        <td class="mc-comp-col mc-comp-col-mc" data-col-group="comparison"><span class="explainable-val" data-col-key="p10" data-row-age="${row.age}" tabindex="0">${currency.format(band.p10)}</span></td>
        <td class="mc-comp-col mc-comp-col-mc mc-comp-col-p50" data-col-group="comparison"><span class="explainable-val" data-col-key="p50" data-row-age="${row.age}" tabindex="0">${currency.format(band.p50)}</span></td>
        <td class="mc-comp-col mc-comp-col-mc" data-col-group="comparison"><span class="explainable-val" data-col-key="p90" data-row-age="${row.age}" tabindex="0">${currency.format(band.p90)}</span></td>
        <td class="mc-comp-col mc-comp-col-diff ${diffClass}" data-col-group="comparison"><span class="explainable-val" data-col-key="diff" data-row-age="${row.age}" tabindex="0">${formatDiffCurrency(diff)}</span></td>`;
    }
    if (showScenarioComp && baseComparisonRow) {
      const baseVal = includeHousing
        ? (baseComparisonRow.totalWealthWithHousing ?? baseComparisonRow.totalBalance)
        : baseComparisonRow.totalBalance;
      const scenVal = includeHousing
        ? (row.totalWealthWithHousing ?? row.totalBalance)
        : row.totalBalance;
      const diff = scenVal - baseVal;
      const diffClass =
        diff > 0 ? "is-positive" : diff < 0 ? "is-negative" : "";
      comparisonCells += `
        <td class="scen-comp-col mc-comp-col-base" data-col-group="comparison">${currency.format(baseVal)}</td>
        <td class="scen-comp-col mc-comp-col-mc mc-comp-col-p50" data-col-group="comparison">${currency.format(scenVal)}</td>
        <td class="scen-comp-col mc-comp-col-diff ${diffClass}" data-col-group="comparison">${formatDiffCurrency(diff)}</td>`;
    }

    return `
      <tr data-phase="${row.phase}">
        <td>${dateFormat.format(row.date)}</td>
        <td>${ages.format(row.age)}</td>
        <td>${row.phase}</td>
        <td class="projection-return"><span class="explainable-val" data-col-key="returnRate" data-row-age="${row.age}" tabindex="0">${returnRate}</span></td>
        <td data-col-group="pension"><span class="explainable-val" data-col-key="ratePension" data-row-age="${row.age}" tabindex="0">${currency.format(row.ratePension)}</span></td>
        <td data-col-group="pension"><span class="explainable-val" data-col-key="lifeAnnuityDepotValue" data-row-age="${row.age}" tabindex="0">${currency.format(row.lifeAnnuityDepotValue)}</span></td>
        <td data-col-group="pension">${row.lifeAnnuityWithdrawal ? `<span class="explainable-val" data-col-key="lifeAnnuityWithdrawal" data-row-age="${row.age}" tabindex="0">${currency.format(row.lifeAnnuityWithdrawal)}</span>` : "—"}</td>
        <td data-col-group="pension"><span class="explainable-val" data-col-key="ageSavings" data-row-age="${row.age}" tabindex="0">${currency.format(row.ageSavings)}</span></td>
        <td data-col-group="free"><span class="explainable-val" data-col-key="freeFunds" data-row-age="${row.age}" tabindex="0">${currency.format(row.freeFunds)}</span></td>
        <td data-col-group="free"><span class="explainable-val" data-col-key="ask" data-row-age="${row.age}" tabindex="0">${currency.format(row.ask)}</span></td>
        <td><span class="explainable-val" data-col-key="totalDepotValue" data-row-age="${row.age}" tabindex="0">${currency.format(row.totalDepotValue)}</span></td>
        <td class="housing-col" data-col-group="housing"${includeHousing ? "" : " hidden"}>${row.housingEquity ? `<span class="explainable-val" data-col-key="housingEquity" data-row-age="${row.age}" tabindex="0">${currency.format(row.housingEquity)}</span>` : "—"}</td>
        <td class="housing-col" data-col-group="housing"${includeHousing ? "" : " hidden"}><span class="explainable-val" data-col-key="totalWealthWithHousing" data-row-age="${row.age}" tabindex="0">${currency.format(row.totalWealthWithHousing ?? row.totalDepotValue)}</span></td>
        <td data-col-group="cashflow">${row.contribution ? `<span class="explainable-val" data-col-key="contribution" data-row-age="${row.age}" tabindex="0">${currency.format(row.contribution)}</span>` : "—"}</td>
        <td data-col-group="cashflow">${row.withdrawal ? `<span class="explainable-val" data-col-key="withdrawal" data-row-age="${row.age}" tabindex="0">${currency.format(row.withdrawal)}</span>` : "—"}</td>
        <td>${row.withdrawal ? `<span class="explainable-val" data-col-key="netWithdrawal" data-row-age="${row.age}" tabindex="0">${currency.format(row.netWithdrawal)}</span>` : "—"}</td>
        <td data-col-group="cashflow">${inventoryTax !== "—" ? `<span class="explainable-val" data-col-key="lagerskat" data-row-age="${row.age}" tabindex="0">${inventoryTax}</span>` : "—"}</td>
        <td data-col-group="cashflow">${effectiveTax !== "—" ? `<span class="explainable-val" data-col-key="effectiveWithdrawalTaxRate" data-row-age="${row.age}" tabindex="0">${effectiveTax}</span>` : "—"}</td>
        <td data-col-group="cashflow">${source}</td>${comparisonCells}
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
    const height = 400;
    const margin = { top: 32, right: 80, bottom: 50, left: 85 };
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
    const housingValue = (row) =>
      calculation.includeHousing ? (row.housingEquity ?? 0) : 0;

    const showMcOnChart = Boolean(mc) && mcChartMode !== "without";
    const showWithoutOnChart = mcChartMode !== "with";
    const showTotalBaseline =
      showWithoutOnChart && (showMcOnChart || Boolean(activeStressTestCrisis));
    const bandsByAge = new Map(
      (mc?.percentileBands ?? []).map((band) => [band.age, band]),
    );

    if (legendGroupWithout) {
      legendGroupWithout.hidden = !showWithoutOnChart;
    }
    if (legendHousing) {
      legendHousing.hidden = !(showWithoutOnChart && calculation.includeHousing);
    }
    if (legendBaselineTotal) {
      legendBaselineTotal.hidden = !showTotalBaseline;
    }
    if (legendCrisisOverlay) {
      legendCrisisOverlay.hidden = !activeStressTestCrisis;
      if (activeStressTestCrisis && legendCrisisTitle) {
        legendCrisisTitle.textContent = `Krise: ${activeStressTestCrisis.name}`;
      }
    }
    if (legendGroupWith) {
      legendGroupWith.hidden = !showMcOnChart;
    }

    const baseMax = Math.max(
      ...rows.map((row) => {
        const total = calculation.includeHousing
          ? (row.totalWealthWithHousing ?? row.totalBalance)
          : row.totalBalance;
        return showTotalBaseline
          ? Math.max(
              pensionValue(row),
              freeFundsValue(row),
              housingValue(row),
              total,
            )
          : Math.max(
              pensionValue(row),
              freeFundsValue(row),
              housingValue(row),
            );
      }),
      1,
    );
    const mcMax = showMcOnChart
      ? Math.max(...mc.percentileBands.map((band) => band.p90), 1)
      : 1;
    const crisisMax = activeStressTestCrisis?.planRows?.length
      ? Math.max(
          ...activeStressTestCrisis.planRows.map((cr) =>
            calculation.includeHousing
              ? (cr.totalWealthWithHousing ?? cr.totalBalance)
              : cr.totalBalance,
          ),
          1,
        )
      : 1;
    const rawMax = Math.max(
      showWithoutOnChart ? baseMax : 1,
      mcMax,
      crisisMax,
    );
    const xForAge = (age) =>
      margin.left + ((age - minAge) / Math.max(1, maxAge - minAge)) * plotWidth;

    let yMax;
    let yForValue;
    let yTicks;

    if (chartScaleMode === "symlog") {
      const linearThreshold = 2_000_000;
      const linearFraction = 0.35; // 35 % af lodret plotplads til 0 - 2 mio. kr.

      if (rawMax <= linearThreshold) {
        const magnitude = 10 ** Math.max(0, Math.floor(Math.log10(rawMax)));
        yMax = Math.max(linearThreshold, Math.ceil(rawMax / magnitude) * magnitude);
        yForValue = (value) =>
          plotBottom - (Math.max(0, Number(value) || 0) / yMax) * plotHeight;
        yTicks = [0, 500_000, 1_000_000, 1_500_000, 2_000_000].filter(
          (t) => t <= yMax,
        );
      } else {
        if (rawMax <= 5_000_000) {
          yMax = 5_000_000;
        } else if (rawMax <= 10_000_000) {
          yMax = 10_000_000;
        } else if (rawMax <= 20_000_000) {
          yMax = 20_000_000;
        } else if (rawMax <= 50_000_000) {
          yMax = 50_000_000;
        } else if (rawMax <= 100_000_000) {
          yMax = 100_000_000;
        } else {
          const magnitude = 10 ** Math.floor(Math.log10(rawMax));
          yMax = Math.ceil(rawMax / magnitude) * magnitude;
        }

        const logDenominator = Math.log(yMax / linearThreshold);

        yForValue = (value) => {
          const val = Number(value) || 0;
          if (val <= 0) return plotBottom;
          let norm;
          if (val <= linearThreshold) {
            norm = (val / linearThreshold) * linearFraction;
          } else {
            norm =
              linearFraction +
              (1 - linearFraction) *
                (Math.log(val / linearThreshold) / logDenominator);
          }
          norm = Math.max(0, Math.min(1, norm));
          return plotBottom - norm * plotHeight;
        };

        const candidateTicks = [
          0,
          1_000_000,
          2_000_000,
          5_000_000,
          10_000_000,
          20_000_000,
          50_000_000,
          100_000_000,
          200_000_000,
          500_000_000,
        ];
        yTicks = candidateTicks.filter((tick) => tick <= yMax);
        if (!yTicks.includes(yMax)) {
          yTicks.push(yMax);
        }
      }
    } else {
      const paddedMax = rawMax * 1.04;
      const magnitude = 10 ** Math.floor(Math.log10(paddedMax));
      const halfMag = magnitude / 2;
      yMax =
        paddedMax / magnitude <= 2.5 && halfMag >= 100_000
          ? Math.ceil(paddedMax / halfMag) * halfMag
          : Math.ceil(paddedMax / magnitude) * magnitude;
      yForValue = (value) =>
        plotBottom - (Math.max(0, Number(value) || 0) / yMax) * plotHeight;
      yTicks = Array.from({ length: 5 }, (_, index) => (yMax / 4) * index);
    }

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
    const housingPoints = rows.map((row) => ({
      age: row.age,
      x: xForAge(row.age).toFixed(2),
      y: yForValue(housingValue(row)).toFixed(2),
    }));
    const totalBaselinePoints = rows.map((row) => ({
      age: row.age,
      x: xForAge(row.age).toFixed(2),
      y: yForValue(
        calculation.includeHousing
          ? (row.totalWealthWithHousing ?? row.totalBalance)
          : row.totalBalance,
      ).toFixed(2),
    }));
    const mcPointsForKey = (key) =>
      rows.map((row) => {
        const band = bandsByAge.get(row.age);
        const fallback = calculation.includeHousing
          ? (row.totalWealthWithHousing ?? row.totalBalance)
          : row.totalBalance;
        const val = band ? band[key] : fallback;
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

    const activeCrisisPoints = activeStressTestCrisis?.planRows?.length
      ? rows.map((row) => {
          const crisisRow = activeStressTestCrisis.planRows.find(
            (cr) => cr.age === row.age,
          );
          const val = crisisRow
            ? calculation.includeHousing
              ? (crisisRow.totalWealthWithHousing ?? crisisRow.totalBalance)
              : crisisRow.totalBalance
            : 0;
          return {
            age: row.age,
            val,
            x: xForAge(row.age).toFixed(2),
            y: yForValue(val).toFixed(2),
          };
        })
      : null;

    const axisRows = rows.filter(
      (row, index) => index === 0 || row.age !== rows[index - 1].age,
    );
    const phaseRects = [
      {
        className: "chart-phase-saving-pension",
        from: minAge,
        to: pensionStopAge,
        label: "Opsparing",
      },
      {
        className: "chart-phase-saving-free",
        from: pensionStopAge,
        to: fireAge,
        label: "Frie Midler",
      },
      {
        className: "chart-phase-fire",
        from: fireAge,
        to: inputs.retirementAge,
        label: "FIRE Brofase",
      },
      {
        className: "chart-phase-pension",
        from: inputs.retirementAge,
        to: maxAge,
        label: "Pension",
      },
    ]
      .filter((phase) => phase.to > phase.from)
      .map((phase) => {
        const x1 = xForAge(phase.from);
        const x2 = xForAge(phase.to);
        const w = x2 - x1;
        const labelSvg =
          w > 50
            ? `<text x="${x1 + w / 2}" y="${margin.top + 16}" text-anchor="middle" font-size="10" font-weight="600" fill="#64748b" opacity="0.65" letter-spacing="0.04em" style="text-transform:uppercase">${phase.label}</text>`
            : "";
        return `<rect class="${phase.className}" x="${x1}" y="${margin.top}" width="${w}" height="${plotHeight}" />${labelSvg}`;
      })
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
          <path class="chart-area-free-funds" d="${areaPath(freeFundsPoints, plotBottom)}" />
          ${calculation.includeHousing ? `<path class="chart-area-housing" d="${areaPath(housingPoints, plotBottom)}" />` : ""}`
      : "";
    const withoutLineLayers = showWithoutOnChart
      ? `
          <path class="chart-line-pension" d="${pointPath(pensionPoints)}" />
          <path class="chart-line-free-funds" d="${pointPath(freeFundsPoints)}" />
          ${calculation.includeHousing ? `<path class="chart-line-housing" d="${pointPath(housingPoints)}" />` : ""}
          ${showTotalBaseline ? `<path class="chart-line-total-baseline" d="${pointPath(totalBaselinePoints)}" />` : ""}`
      : "";
    const crisisLineLayer = activeCrisisPoints
      ? `<path class="chart-line-crisis" d="${pointPath(activeCrisisPoints)}" />`
      : "";

    chart.innerHTML = `
      <svg viewBox="0 0 ${width} ${height}" role="img" aria-label="Pension og frie midler fra ${ages.format(minAge)} til ${ages.format(maxAge)} år" aria-describedby="wealth-chart-description">
        <desc id="wealth-chart-description">Grafen viser formueudviklingen med og uden Monte Carlo-simulering for hvert år.</desc>
        <defs>
          <linearGradient id="gradient-free-funds" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#10b981" stop-opacity="0.28" />
            <stop offset="100%" stop-color="#10b981" stop-opacity="0.01" />
          </linearGradient>
          <linearGradient id="gradient-pension" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#6366f1" stop-opacity="0.28" />
            <stop offset="100%" stop-color="#6366f1" stop-opacity="0.01" />
          </linearGradient>
          <linearGradient id="gradient-housing" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#f59e0b" stop-opacity="0.28" />
            <stop offset="100%" stop-color="#f59e0b" stop-opacity="0.01" />
          </linearGradient>
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
          ${crisisLineLayer}
        </g>
        ${yAxisLabels}
        ${yearAxis}
        <rect class="chart-hover-target" x="${margin.left}" y="${margin.top}" width="${plotWidth}" height="${plotHeight}" tabindex="0" role="img" aria-label="Vis beløb for et bestemt år" />
        <g class="chart-hover-layer" style="display: none" aria-hidden="true">
          <line class="chart-hover-line" x1="0" x2="0" y1="${margin.top}" y2="${plotBottom}" />
          <circle class="chart-hover-point-pension" cx="0" cy="0" r="4.5" ${showWithoutOnChart ? "" : 'style="display:none"'} />
          <circle class="chart-hover-point-free-funds" cx="0" cy="0" r="4.5" ${showWithoutOnChart ? "" : 'style="display:none"'} />
          <circle class="chart-hover-point-housing" cx="0" cy="0" r="4.5" ${showWithoutOnChart && calculation.includeHousing ? "" : 'style="display:none"'} />
          <circle class="chart-hover-point-mc-p50" cx="0" cy="0" r="4.5" ${showMcOnChart ? "" : 'style="display:none"'} />
          <circle class="chart-hover-point-crisis" cx="0" cy="0" r="4.5" ${activeCrisisPoints ? "" : 'style="display:none"'} />
          <g class="chart-tooltip"></g>
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
    const hoverHousingPoint = svg.querySelector(".chart-hover-point-housing");
    const hoverMcP50Point = svg.querySelector(".chart-hover-point-mc-p50");
    const hoverCrisisPoint = svg.querySelector(".chart-hover-point-crisis");
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
      const totalBalanceVal = calculation.includeHousing
        ? (row.totalWealthWithHousing ?? row.totalBalance)
        : row.totalBalance;
      const band = showMcOnChart ? bandsByAge.get(row.age) : null;

      const items = [];
      if (showWithoutOnChart) {
        items.push({
          label: "Pension",
          value: pensionValue(row),
          color: "#818cf8",
        });
        items.push({
          label: "Frie midler",
          value: freeFundsValue(row),
          color: "#34d399",
        });
        if (calculation.includeHousing) {
          items.push({
            label: "Friværdi",
            value: housingValue(row),
            color: "#fbbf24",
          });
        }
      }
      items.push({
        label: showMcOnChart ? "Samlet formue (Fast)" : "Samlet formue",
        value: totalBalanceVal,
        color: "#38bdf8",
      });
      if (showMcOnChart && band) {
        items.push({
          label: "MC P90 (Optimistisk)",
          value: band.p90,
          color: "#93c5fd",
        });
        items.push({
          label: "MC P50 (Median)",
          value: band.p50,
          color: "#60a5fa",
        });
        items.push({
          label: "MC P10 (Pessimistisk)",
          value: band.p10,
          color: "#f59e0b",
        });
      }
      if (activeCrisisPoints && activeCrisisPoints[activeIndex]) {
        items.push({
          label: `Krise (${activeStressTestCrisis.name.split(" ")[0]})`,
          value: activeCrisisPoints[activeIndex].val,
          color: "#ef4444",
        });
      }

      // Sorter faldende efter beløb: grafen med det højeste beløb øverst, dernæst de øvrige mod laveste beløb nederst
      items.sort((a, b) => b.value - a.value);

      const tooltipWidth = 248;
      const valX = tooltipWidth - 14;
      const rowHeight = 20;
      const headerHeight = 32;
      const boxHeight = headerHeight + items.length * rowHeight + 10;

      const tooltipX =
        x > width - margin.right - tooltipWidth - 16
          ? x - tooltipWidth - 14
          : x + 14;
      const tooltipY = margin.top + 10;

      hoverLine.setAttribute("x1", x);
      hoverLine.setAttribute("x2", x);
      hoverPensionPoint.setAttribute("cx", x);
      hoverPensionPoint.setAttribute("cy", pensionY);
      hoverFreeFundsPoint.setAttribute("cx", x);
      hoverFreeFundsPoint.setAttribute("cy", freeFundsY);
      if (hoverHousingPoint && calculation.includeHousing && housingPoints[activeIndex]) {
        hoverHousingPoint.setAttribute("cx", x);
        hoverHousingPoint.setAttribute("cy", Number(housingPoints[activeIndex].y));
      }
      if (showMcOnChart && hoverMcP50Point && mcP50Points[activeIndex]) {
        hoverMcP50Point.setAttribute("cx", x);
        hoverMcP50Point.setAttribute("cy", Number(mcP50Points[activeIndex].y));
      }
      if (hoverCrisisPoint && activeCrisisPoints && activeCrisisPoints[activeIndex]) {
        hoverCrisisPoint.setAttribute("cx", x);
        hoverCrisisPoint.setAttribute("cy", Number(activeCrisisPoints[activeIndex].y));
      }

      tooltip.setAttribute("transform", `translate(${tooltipX} ${tooltipY})`);

      const currentPhase =
        row.age < pensionStopAge
          ? "Opsparing"
          : row.age < fireAge
            ? "Frie Midler"
            : row.age < inputs.retirementAge
              ? "FIRE Brofase"
              : "Pension";

      const rowsSvg = items
        .map((item, idx) => {
          const y = headerHeight + 15 + idx * rowHeight;
          return `
            <circle cx="16" cy="${y - 4}" r="3.5" fill="${item.color}" />
            <text class="chart-tooltip-label" x="26" y="${y}">${item.label}</text>
            <text class="chart-tooltip-value" x="${valX}" y="${y}">${currency.format(item.value)}</text>`;
        })
        .join("");

      tooltip.innerHTML = `
        <rect class="chart-tooltip-box" width="${tooltipWidth}" height="${boxHeight}" rx="8" />
        <text class="chart-tooltip-title" x="12" y="20">${row.date.getFullYear()} · ${ages.format(row.age)} år</text>
        <text class="chart-tooltip-phase-tag" x="${valX}" y="20" text-anchor="end">${currentPhase}</text>
        <line class="chart-tooltip-total-rule" x1="12" x2="${tooltipWidth - 12}" y1="28" y2="28" />
        ${rowsSvg}`;

      const ariaDetails = items
        .map((it) => `${it.label} ${currency.format(it.value)}`)
        .join(". ");
      hoverTarget.setAttribute(
        "aria-label",
        `${row.date.getFullYear()}, ${ages.format(row.age)} år. ${ariaDetails}`,
      );

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

    showYear(0);
    hoverLayer.style.display = "none";
  }

  function renderCashflowChart(calculation, inputs) {
    if (!cashflowChart) return;
    const rows = calculation.planRows;
    if (!rows || rows.length === 0) {
      cashflowChart.innerHTML = "";
      return;
    }

    const minAge = rows[0].age;
    const maxAge = rows[rows.length - 1].age;
    const width = 1120;
    const height = 400;
    const margin = { top: 32, right: 80, bottom: 50, left: 85 };
    const plotWidth = width - margin.left - margin.right;
    const plotHeight = height - margin.top - margin.bottom;
    const plotBottom = height - margin.bottom;

    const xForAge = (age) =>
      margin.left + ((age - minAge) / Math.max(1, maxAge - minAge)) * plotWidth;

    const pensionTaxRate = inputs.pensionWithdrawalTax ?? 0.38;

    const data = rows.map((row) => {
      const isAccumulation = row.phase === "Opsparing";
      const savings = isAccumulation ? Math.max(0, row.contribution || 0) : 0;
      const free = Math.max(
        0,
        (row.freeFundsWithdrawal || 0) - (row.withdrawalTax || 0),
      );
      const ask = Math.max(0, row.askWithdrawal || 0);
      const ageSavings = Math.max(0, row.ageSavingsWithdrawal || 0);
      const rate = Math.max(
        0,
        (row.taxFreeRatePensionWithdrawal || 0) +
          (row.taxableRatePensionWithdrawal || 0) * (1 - pensionTaxRate),
      );
      const life = Math.max(
        0,
        (row.lifeAnnuityWithdrawal || 0) * (1 - pensionTaxRate),
      );
      const pub = Math.max(0, row.publicPensionNet || 0);
      const atp = Math.max(
        0,
        ((row.atpGross || 0) + (row.efterloenGross || 0)) * (1 - pensionTaxRate),
      );
      const housing = Math.max(0, row.housingUnlocked || 0);
      const target = isAccumulation
        ? 0
        : (row.desiredWithdrawal || inputs.desiredAnnualWithdrawal || 0);
      const totalOut =
        free + ask + ageSavings + rate + life + pub + atp + housing;
      const stackTotal = isAccumulation ? savings : totalOut;

      return {
        row,
        age: row.age,
        year: row.date.getFullYear(),
        isAccumulation,
        savings,
        free,
        ask,
        ageSavings,
        rate,
        life,
        pub,
        atp,
        housing,
        target,
        totalOut,
        stackTotal,
      };
    });

    const maxVal = Math.max(
      ...data.map((d) => Math.max(d.stackTotal, d.target)),
      100_000,
    );
    const magnitude = 10 ** Math.max(3, Math.floor(Math.log10(maxVal)));
    const yMax = Math.ceil(maxVal / magnitude) * magnitude;
    const yForValue = (val) =>
      plotBottom - (Math.max(0, Number(val) || 0) / yMax) * plotHeight;

    const yTicks = Array.from({ length: 5 }, (_, i) => (yMax / 4) * i);
    const gridLines = yTicks
      .map(
        (tick) => `
          <line class="chart-grid-line" x1="${margin.left}" x2="${width - margin.right}" y1="${yForValue(tick)}" y2="${yForValue(tick)}" />`,
      )
      .join("");

    const yAxisLabels = yTicks
      .map(
        (tick) => `
          <text class="chart-axis-label" x="${margin.left - 12}" y="${yForValue(tick) + 4}" text-anchor="end">${compactNumber.format(tick)} kr.</text>`,
      )
      .join("");

    const yearAxis = rows
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

    // Bar rendering
    const barWidth = Math.max(4, Math.min(18, (plotWidth / rows.length) * 0.72));
    const barsSvg = data
      .map((d) => {
        const x = xForAge(d.age) - barWidth / 2;
        if (d.isAccumulation) {
          if (d.savings <= 0) return "";
          const h = (d.savings / yMax) * plotHeight;
          const y = plotBottom - h;
          return `<rect x="${x}" y="${y}" width="${barWidth}" height="${h}" fill="#2563eb" rx="2.5" />`;
        }

        const segments = [
          { val: d.free, fill: "#10b981" },
          { val: d.ask, fill: "#06b6d4" },
          { val: d.ageSavings, fill: "#8b5cf6" },
          { val: d.rate, fill: "#f59e0b" },
          { val: d.life, fill: "#ec4899" },
          { val: d.pub, fill: "#6366f1" },
          { val: d.atp, fill: "#14b8a6" },
          { val: d.housing, fill: "#84cc16" },
        ];

        let curY = plotBottom;
        return segments
          .map((seg) => {
            if (seg.val <= 0) return "";
            const h = (seg.val / yMax) * plotHeight;
            curY -= h;
            return `<rect x="${x}" y="${curY}" width="${barWidth}" height="${h}" fill="${seg.fill}" rx="2" />`;
          })
          .join("");
      })
      .join("");

    // Desired withdrawal target line
    const targetPoints = data
      .filter((d) => !d.isAccumulation && d.target > 0)
      .map((d) => ({
        x: xForAge(d.age).toFixed(2),
        y: yForValue(d.target).toFixed(2),
      }));
    const targetPath =
      targetPoints.length > 0
        ? `M ${targetPoints.map((p) => `${p.x} ${p.y}`).join(" L ")}`
        : "";

    cashflowChart.innerHTML = `
      <svg viewBox="0 0 ${width} ${height}" role="img" aria-label="Årligt cashflow og udbetalingskilder fra ${ages.format(minAge)} til ${ages.format(maxAge)} år">
        <defs>
          <clipPath id="cf-plot-clip">
            <rect x="${margin.left}" y="${margin.top}" width="${plotWidth}" height="${plotHeight}" rx="10" />
          </clipPath>
        </defs>
        <rect class="chart-plot-surface" x="${margin.left}" y="${margin.top}" width="${plotWidth}" height="${plotHeight}" rx="10" />
        <g clip-path="url(#cf-plot-clip)">
          ${gridLines}
          ${barsSvg}
          ${targetPath ? `<path d="${targetPath}" stroke="#ef4444" stroke-width="2" stroke-dasharray="4 3" fill="none" />` : ""}
        </g>
        ${yAxisLabels}
        ${yearAxis}
        <rect class="chart-hover-target" x="${margin.left}" y="${margin.top}" width="${plotWidth}" height="${plotHeight}" tabindex="0" role="img" aria-label="Vis cashflow for et bestemt år" />
        <g class="chart-hover-layer" style="display: none" aria-hidden="true">
          <line class="chart-hover-line" x1="0" x2="0" y1="${margin.top}" y2="${plotBottom}" />
          <g class="chart-tooltip"></g>
        </g>
      </svg>`;

    const svg = cashflowChart.querySelector("svg");
    const hoverTarget = svg.querySelector(".chart-hover-target");
    const hoverLayer = svg.querySelector(".chart-hover-layer");
    const hoverLine = svg.querySelector(".chart-hover-line");
    const tooltip = svg.querySelector(".chart-tooltip");
    let activeIndex = 0;

    function showCfYear(index) {
      activeIndex = Math.max(0, Math.min(data.length - 1, index));
      const d = data[activeIndex];
      const x = xForAge(d.age);

      hoverLine.setAttribute("x1", x);
      hoverLine.setAttribute("x2", x);

      const items = [];
      if (d.isAccumulation) {
        items.push({
          label: "Årlig opsparing",
          value: d.savings,
          color: "#2563eb",
        });
      } else {
        if (d.free > 0)
          items.push({
            label: "Frie midler (netto)",
            value: d.free,
            color: "#10b981",
          });
        if (d.ask > 0)
          items.push({
            label: "Aktiesparekonto",
            value: d.ask,
            color: "#06b6d4",
          });
        if (d.ageSavings > 0)
          items.push({
            label: "Aldersopsparing",
            value: d.ageSavings,
            color: "#8b5cf6",
          });
        if (d.rate > 0)
          items.push({
            label: "Ratepension (netto)",
            value: d.rate,
            color: "#f59e0b",
          });
        if (d.life > 0)
          items.push({
            label: "Livrente (netto)",
            value: d.life,
            color: "#ec4899",
          });
        if (d.pub > 0)
          items.push({
            label: "Folkepension (netto)",
            value: d.pub,
            color: "#6366f1",
          });
        if (d.atp > 0)
          items.push({
            label: "ATP & Efterløn",
            value: d.atp,
            color: "#14b8a6",
          });
        if (d.housing > 0)
          items.push({
            label: "Frigjort friværdi",
            value: d.housing,
            color: "#84cc16",
          });
        items.push({
          label: "Samlet udbetalt",
          value: d.totalOut,
          color: "#1d2b27",
        });
        if (d.target > 0) {
          items.push({
            label: "Ønsket forbrug (mål)",
            value: d.target,
            color: "#ef4444",
          });
        }
      }

      const tooltipWidth = 252;
      const valX = tooltipWidth - 12;
      const rowHeight = 20;
      const headerHeight = 32;
      const boxHeight = headerHeight + items.length * rowHeight + 10;
      const tooltipX =
        x > width - margin.right - tooltipWidth - 16
          ? x - tooltipWidth - 14
          : x + 14;
      const tooltipY = margin.top + 8;

      tooltip.setAttribute("transform", `translate(${tooltipX} ${tooltipY})`);
      const rowsSvg = items
        .map((item, idx) => {
          const y = headerHeight + 14 + idx * rowHeight;
          return `
            <circle cx="15" cy="${y - 4}" r="4" fill="${item.color}" />
            <text class="chart-tooltip-label" x="25" y="${y}">${item.label}</text>
            <text class="chart-tooltip-value" x="${valX}" y="${y}">${currency.format(item.value)}</text>`;
        })
        .join("");

      tooltip.innerHTML = `
        <rect class="chart-tooltip-box" width="${tooltipWidth}" height="${boxHeight}" rx="8" />
        <text class="chart-tooltip-title" x="12" y="21">${d.year} · ${ages.format(d.age)} år</text>
        <text class="chart-tooltip-phase" x="${valX}" y="20">${d.isAccumulation ? "Opsparing" : "Udbetaling"}</text>
        <line class="chart-tooltip-total-rule" x1="12" x2="${tooltipWidth - 12}" y1="${headerHeight}" y2="${headerHeight}" />
        ${rowsSvg}`;

      hoverLayer.style.display = "block";
    }

    hoverTarget.addEventListener("mousemove", (event) => {
      const rect = svg.getBoundingClientRect();
      const viewBoxX = ((event.clientX - rect.left) / rect.width) * width;
      const progress = Math.max(
        0,
        Math.min(1, (viewBoxX - margin.left) / plotWidth),
      );
      const targetAge = minAge + progress * (maxAge - minAge);
      const nearestIndex = data.reduce(
        (bestIndex, d, index) =>
          Math.abs(d.age - targetAge) <
          Math.abs(data[bestIndex].age - targetAge)
            ? index
            : bestIndex,
        0,
      );
      showCfYear(nearestIndex);
    });
    hoverTarget.addEventListener("mouseleave", () => {
      hoverLayer.style.display = "none";
    });
    hoverTarget.addEventListener("focus", () => showCfYear(activeIndex));
    hoverTarget.addEventListener("blur", () => {
      hoverLayer.style.display = "none";
    });
    showCfYear(0);
    hoverLayer.style.display = "none";
  }

  function renderTaxChart(calculation, inputs) {
    if (!taxChart) return;
    const rows = calculation.planRows;
    if (!rows || rows.length === 0) {
      taxChart.innerHTML = "";
      return;
    }

    const minAge = rows[0].age;
    const maxAge = rows[rows.length - 1].age;
    const width = 1120;
    const height = 400;
    const margin = { top: 32, right: 80, bottom: 50, left: 85 };
    const plotWidth = width - margin.left - margin.right;
    const plotHeight = height - margin.top - margin.bottom;
    const plotBottom = height - margin.bottom;

    const xForAge = (age) =>
      margin.left + ((age - minAge) / Math.max(1, maxAge - minAge)) * plotWidth;

    const pensionTaxRate = inputs.pensionWithdrawalTax ?? 0.38;

    const taxData = rows.map((row) => {
      // 1. PAL-skat (15,3% af nominelt pensionsafkast)
      const pensionDepot =
        (row.ratePension || 0) +
        (row.ageSavings || 0) +
        (row.lifeAnnuityDepotValue || row.lifeAnnuity || 0);
      const returnRate =
        row.pensionReturnRate ?? inputs.pensionReturnRate ?? 0.05;
      const palTax = Math.max(
        0,
        Math.round(pensionDepot * returnRate * (inputs.pensionTax ?? 0.153)),
      );

      // 2. Aktieavancebeskatning (27/42% på realisation af frie midler)
      const shareTax = Math.max(0, row.withdrawalTax || 0);

      // 3. ASK & depot lagerskat (17%)
      const askTax = Math.max(
        0,
        row.annualFreeFundsTax ||
          Math.round(
            (row.ask || 0) *
              (row.freeFundsReturnRate ?? inputs.freeFundsReturnRate ?? 0.07) *
              0.17,
          ),
      );

      // 4. Pensionsudbetalingsskat & ATP/efterlønskat
      const pensionTax = Math.max(
        0,
        (row.pensionWithdrawalTax || 0) +
          Math.round(
            ((row.atpGross || 0) + (row.efterloenGross || 0)) * pensionTaxRate,
          ),
      );

      // 5. Modregning i folkepension
      let offsetTax = 0;
      if (row.age >= (inputs.publicPensionAge ?? 69)) {
        const fullPublicPension = 186_000;
        offsetTax = Math.max(
          0,
          Math.round(fullPublicPension - (row.publicPensionGross || 0)),
        );
      }

      const totalTax = palTax + shareTax + askTax + pensionTax + offsetTax;
      return {
        row,
        age: row.age,
        year: row.date.getFullYear(),
        palTax,
        shareTax,
        askTax,
        pensionTax,
        offsetTax,
        totalTax,
      };
    });

    const maxVal = Math.max(...taxData.map((d) => d.totalTax), 20_000);
    const magnitude = 10 ** Math.max(3, Math.floor(Math.log10(maxVal)));
    const yMax = Math.ceil(maxVal / magnitude) * magnitude;
    const yForValue = (val) =>
      plotBottom - (Math.max(0, Number(val) || 0) / yMax) * plotHeight;

    const yTicks = Array.from({ length: 5 }, (_, i) => (yMax / 4) * i);
    const gridLines = yTicks
      .map(
        (tick) => `
          <line class="chart-grid-line" x1="${margin.left}" x2="${width - margin.right}" y1="${yForValue(tick)}" y2="${yForValue(tick)}" />`,
      )
      .join("");

    const yAxisLabels = yTicks
      .map(
        (tick) => `
          <text class="chart-axis-label" x="${margin.left - 12}" y="${yForValue(tick) + 4}" text-anchor="end">${compactNumber.format(tick)} kr.</text>`,
      )
      .join("");

    const yearAxis = rows
      .map((row, index) => {
        const x = xForAge(row.age);
        const nowLabel =
          index === 0
            ? `<text class="chart-now-label" x="${x}" y="${plotBottom + 29}">nu</text>`
            : "";
        return `
          <line class="chart-year-tick" x1="${x}" x2="${x}" y1="${plotBottom}" y2="${plotBottom + 4}" />
          <text class="chart-year-label" x="${x}" y="${plotBottom + 16}">${row.age}</text>
          ${nowLabel}`;
      })
      .join("");

    // Bar rendering
    const barWidth = Math.max(4, Math.min(18, (plotWidth / rows.length) * 0.72));
    const barsSvg = taxData
      .map((d) => {
        const x = xForAge(d.age) - barWidth / 2;
        const segments = [
          { val: d.palTax, fill: "#8b5cf6" },
          { val: d.shareTax, fill: "#f59e0b" },
          { val: d.askTax, fill: "#06b6d4" },
          { val: d.pensionTax, fill: "#ef4444" },
          { val: d.offsetTax, fill: "#ec4899" },
        ];

        let curY = plotBottom;
        return segments
          .map((seg) => {
            if (seg.val <= 0) return "";
            const h = (seg.val / yMax) * plotHeight;
            curY -= h;
            return `<rect x="${x}" y="${curY}" width="${barWidth}" height="${h}" fill="${seg.fill}" rx="2" />`;
          })
          .join("");
      })
      .join("");

    // Total tax line across years
    const totalLinePoints = taxData.map((d) => ({
      x: xForAge(d.age).toFixed(2),
      y: yForValue(d.totalTax).toFixed(2),
    }));
    const totalLinePath = `M ${totalLinePoints.map((p) => `${p.x} ${p.y}`).join(" L ")}`;

    taxChart.innerHTML = `
      <svg viewBox="0 0 ${width} ${height}" role="img" aria-label="Skat og afgifter over tid fra ${ages.format(minAge)} til ${ages.format(maxAge)} år">
        <defs>
          <clipPath id="tax-plot-clip">
            <rect x="${margin.left}" y="${margin.top}" width="${plotWidth}" height="${plotHeight}" rx="10" />
          </clipPath>
        </defs>
        <rect class="chart-plot-surface" x="${margin.left}" y="${margin.top}" width="${plotWidth}" height="${plotHeight}" rx="10" />
        <g clip-path="url(#tax-plot-clip)">
          ${gridLines}
          ${barsSvg}
          <path d="${totalLinePath}" stroke="#1e293b" stroke-width="2.5" fill="none" />
        </g>
        ${yAxisLabels}
        ${yearAxis}
        <rect class="chart-hover-target" x="${margin.left}" y="${margin.top}" width="${plotWidth}" height="${plotHeight}" tabindex="0" role="img" aria-label="Vis skat for et bestemt år" />
        <g class="chart-hover-layer" style="display: none" aria-hidden="true">
          <line class="chart-hover-line" x1="0" x2="0" y1="${margin.top}" y2="${plotBottom}" />
          <circle class="chart-hover-point-total" cx="0" cy="0" r="4.5" fill="#1e293b" stroke="#ffffff" stroke-width="1.5" />
          <g class="chart-tooltip"></g>
        </g>
      </svg>`;

    const svg = taxChart.querySelector("svg");
    const hoverTarget = svg.querySelector(".chart-hover-target");
    const hoverLayer = svg.querySelector(".chart-hover-layer");
    const hoverLine = svg.querySelector(".chart-hover-line");
    const hoverPointTotal = svg.querySelector(".chart-hover-point-total");
    const tooltip = svg.querySelector(".chart-tooltip");
    let activeIndex = 0;

    function showTaxYear(index) {
      activeIndex = Math.max(0, Math.min(taxData.length - 1, index));
      const d = taxData[activeIndex];
      const x = xForAge(d.age);
      const totalY = yForValue(d.totalTax);

      hoverLine.setAttribute("x1", x);
      hoverLine.setAttribute("x2", x);
      hoverPointTotal.setAttribute("cx", x);
      hoverPointTotal.setAttribute("cy", totalY);

      const items = [];
      if (d.palTax > 0)
        items.push({
          label: "PAL-skat (15,3 %)",
          value: d.palTax,
          color: "#8b5cf6",
        });
      if (d.shareTax > 0)
        items.push({
          label: "Aktieskat (27/42 %)",
          value: d.shareTax,
          color: "#f59e0b",
        });
      if (d.askTax > 0)
        items.push({
          label: "ASK lagerskat (17 %)",
          value: d.askTax,
          color: "#06b6d4",
        });
      if (d.pensionTax > 0)
        items.push({
          label: "Pensionsudbetalingsskat",
          value: d.pensionTax,
          color: "#ef4444",
        });
      if (d.offsetTax > 0)
        items.push({
          label: "Modregning i folkepension",
          value: d.offsetTax,
          color: "#ec4899",
        });
      items.push({
        label: "Samlet skat & afgifter",
        value: d.totalTax,
        color: "#1e293b",
      });

      const tooltipWidth = 256;
      const valX = tooltipWidth - 12;
      const rowHeight = 20;
      const headerHeight = 32;
      const boxHeight = headerHeight + items.length * rowHeight + 10;
      const tooltipX =
        x > width - margin.right - tooltipWidth - 16
          ? x - tooltipWidth - 14
          : x + 14;
      const tooltipY = margin.top + 8;

      tooltip.setAttribute("transform", `translate(${tooltipX} ${tooltipY})`);
      const rowsSvg = items
        .map((item, idx) => {
          const y = headerHeight + 14 + idx * rowHeight;
          return `
            <circle cx="15" cy="${y - 4}" r="4" fill="${item.color}" />
            <text class="chart-tooltip-label" x="25" y="${y}">${item.label}</text>
            <text class="chart-tooltip-value" x="${valX}" y="${y}">${currency.format(item.value)}</text>`;
        })
        .join("");

      tooltip.innerHTML = `
        <rect class="chart-tooltip-box" width="${tooltipWidth}" height="${boxHeight}" rx="8" />
        <text class="chart-tooltip-title" x="12" y="21">${d.year} · ${ages.format(d.age)} år</text>
        <text class="chart-tooltip-phase" x="${valX}" y="20">Skat &amp; afgifter</text>
        <line class="chart-tooltip-total-rule" x1="12" x2="${tooltipWidth - 12}" y1="${headerHeight}" y2="${headerHeight}" />
        ${rowsSvg}`;

      hoverLayer.style.display = "block";
    }

    hoverTarget.addEventListener("mousemove", (event) => {
      const rect = svg.getBoundingClientRect();
      const viewBoxX = ((event.clientX - rect.left) / rect.width) * width;
      const progress = Math.max(
        0,
        Math.min(1, (viewBoxX - margin.left) / plotWidth),
      );
      const targetAge = minAge + progress * (maxAge - minAge);
      const nearestIndex = taxData.reduce(
        (bestIndex, d, index) =>
          Math.abs(d.age - targetAge) <
          Math.abs(taxData[bestIndex].age - targetAge)
            ? index
            : bestIndex,
        0,
      );
      showTaxYear(nearestIndex);
    });
    hoverTarget.addEventListener("mouseleave", () => {
      hoverLayer.style.display = "none";
    });
    hoverTarget.addEventListener("focus", () => showTaxYear(activeIndex));
    hoverTarget.addEventListener("blur", () => {
      hoverLayer.style.display = "none";
    });
    showTaxYear(0);
    hoverLayer.style.display = "none";
  }

  function renderSolvencyChart(calculation, inputs, mc) {
    if (!solvencyChart) return;
    const activeMc = mc || latestMonteCarlo;
    const bands = activeMc?.percentileBands;
    if (!bands || bands.length === 0) {
      solvencyChart.innerHTML = `
        <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:360px;color:var(--muted);gap:14px;text-align:center;padding:24px;">
          <p style="font-size:16px;color:var(--ink);font-weight:600;margin:0;">Overlevelseskurven kræver en Monte Carlo-simulering</p>
          <p style="max-width:440px;margin:0;font-size:13px;line-height:1.4;">Klik på knappen for at køre simuleringen og beregne din solvens-sandsynlighed for hvert enkelt leveår.</p>
          <button type="button" class="mc-segment-btn is-active" id="run-solvency-empty-btn" style="padding:8px 16px;font-size:13px;cursor:pointer;">
            🎲 Kør Monte Carlo nu
          </button>
        </div>`;
      const emptyBtn = solvencyChart.querySelector("#run-solvency-empty-btn");
      if (emptyBtn) emptyBtn.addEventListener("click", runMonteCarloSimulation);
      return;
    }

    const minAge = bands[0].age;
    const maxAge = bands[bands.length - 1].age;
    const width = 1120;
    const height = 400;
    const margin = { top: 32, right: 80, bottom: 50, left: 85 };
    const plotWidth = width - margin.left - margin.right;
    const plotHeight = height - margin.top - margin.bottom;
    const plotBottom = height - margin.bottom;

    const xForAge = (age) =>
      margin.left + ((age - minAge) / Math.max(1, maxAge - minAge)) * plotWidth;

    const yForRate = (rate) =>
      plotBottom -
      (Math.max(0, Math.min(100, Number(rate) || 0)) / 100) * plotHeight;

    const yTicks = [0, 25, 50, 75, 90, 100];
    const gridLines = yTicks
      .map(
        (tick) => `
          <line class="chart-grid-line" x1="${margin.left}" x2="${width - margin.right}" y1="${yForRate(tick)}" y2="${yForRate(tick)}" stroke-dasharray="${tick === 90 || tick === 75 ? "4 3" : "none"}" />`,
      )
      .join("");

    const yAxisLabels = yTicks
      .map(
        (tick) => `
          <text class="chart-axis-label" x="${margin.left - 12}" y="${yForRate(tick) + 4}" text-anchor="end">${tick} %</text>`,
      )
      .join("");

    const yearAxis = bands
      .map((band, index) => {
        const x = xForAge(band.age);
        const nowLabel =
          index === 0
            ? `<text class="chart-now-label" x="${x}" y="${plotBottom + 29}">nu</text>`
            : "";
        return `
          <line class="chart-year-tick" x1="${x}" x2="${x}" y1="${plotBottom}" y2="${plotBottom + 4}" />
          <text class="chart-year-label" x="${x}" y="${plotBottom + 16}">${band.age}</text>
          ${nowLabel}`;
      })
      .join("");

    // Colored Zones:
    // 90 - 100%: Green
    // 75 - 90%: Amber
    // 0 - 75%: Soft red
    const y100 = yForRate(100);
    const y90 = yForRate(90);
    const y75 = yForRate(75);
    const y0 = yForRate(0);

    const zonesSvg = `
      <rect x="${margin.left}" y="${y100}" width="${plotWidth}" height="${y90 - y100}" fill="rgba(16, 185, 129, 0.12)" />
      <rect x="${margin.left}" y="${y90}" width="${plotWidth}" height="${y75 - y90}" fill="rgba(245, 158, 11, 0.12)" />
      <rect x="${margin.left}" y="${y75}" width="${plotWidth}" height="${y0 - y75}" fill="rgba(239, 68, 68, 0.08)" />
      <text x="${width - margin.right - 12}" y="${y100 + 16}" text-anchor="end" font-size="11" font-weight="700" fill="#059669">Meget sikker (90–100 %)</text>
      <text x="${width - margin.right - 12}" y="${y90 + 16}" text-anchor="end" font-size="11" font-weight="700" fill="#d97706">Moderat risiko (75–90 %)</text>
      <text x="${width - margin.right - 12}" y="${y75 + 16}" text-anchor="end" font-size="11" font-weight="700" fill="#dc2626">Forhøjet udtømningsrisiko (&lt;75 %)</text>
    `;

    // Solvency curve
    const points = bands.map((b) => ({
      x: xForAge(b.age).toFixed(2),
      y: yForRate(b.solvencyRate).toFixed(2),
    }));
    const linePath = `M ${points.map((p) => `${p.x} ${p.y}`).join(" L ")}`;
    const areaPoints = [
      { x: margin.left, y: plotBottom },
      ...points,
      { x: points[points.length - 1].x, y: plotBottom },
    ];
    const areaPath = `M ${areaPoints.map((p) => `${p.x} ${p.y}`).join(" L ")} Z`;

    solvencyChart.innerHTML = `
      <svg viewBox="0 0 ${width} ${height}" role="img" aria-label="Solvens-sandsynlighed over tid fra ${ages.format(minAge)} til ${ages.format(maxAge)} år">
        <defs>
          <clipPath id="solvency-plot-clip">
            <rect x="${margin.left}" y="${margin.top}" width="${plotWidth}" height="${plotHeight}" rx="10" />
          </clipPath>
          <linearGradient id="solvency-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#6366f1" stop-opacity="0.35" />
            <stop offset="100%" stop-color="#6366f1" stop-opacity="0.02" />
          </linearGradient>
        </defs>
        <rect class="chart-plot-surface" x="${margin.left}" y="${margin.top}" width="${plotWidth}" height="${plotHeight}" rx="10" />
        <g clip-path="url(#solvency-plot-clip)">
          ${zonesSvg}
          ${gridLines}
          <path d="${areaPath}" fill="url(#solvency-grad)" />
          <path d="${linePath}" stroke="#6366f1" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round" />
        </g>
        ${yAxisLabels}
        ${yearAxis}
        <rect class="chart-hover-target" x="${margin.left}" y="${margin.top}" width="${plotWidth}" height="${plotHeight}" tabindex="0" role="img" aria-label="Vis solvens for en bestemt alder" />
        <g class="chart-hover-layer" style="display: none" aria-hidden="true">
          <line class="chart-hover-line" x1="0" x2="0" y1="${margin.top}" y2="${plotBottom}" />
          <circle class="chart-hover-point-solvency" cx="0" cy="0" r="5" fill="#6366f1" stroke="#ffffff" stroke-width="2" />
          <g class="chart-tooltip"></g>
        </g>
      </svg>`;

    const svg = solvencyChart.querySelector("svg");
    const hoverTarget = svg.querySelector(".chart-hover-target");
    const hoverLayer = svg.querySelector(".chart-hover-layer");
    const hoverLine = svg.querySelector(".chart-hover-line");
    const hoverPoint = svg.querySelector(".chart-hover-point-solvency");
    const tooltip = svg.querySelector(".chart-tooltip");
    let activeIndex = 0;

    function showSolvencyYear(index) {
      activeIndex = Math.max(0, Math.min(bands.length - 1, index));
      const b = bands[activeIndex];
      const x = xForAge(b.age);
      const y = yForRate(b.solvencyRate);

      hoverLine.setAttribute("x1", x);
      hoverLine.setAttribute("x2", x);
      hoverPoint.setAttribute("cx", x);
      hoverPoint.setAttribute("cy", y);

      let statusColor = "#10b981";
      let statusText = "Meget sikker (≥ 90 %)";
      if (b.solvencyRate < 75) {
        statusColor = "#ef4444";
        statusText = "Forhøjet risiko (< 75 %)";
      } else if (b.solvencyRate < 90) {
        statusColor = "#f59e0b";
        statusText = "Moderat risiko (75–90 %)";
      }

      const items = [
        {
          label: "Solvens-chance",
          value: `${b.solvencyRate} %`,
          color: statusColor,
        },
        {
          label: "Sikkerhedszone",
          value: statusText,
          color: statusColor,
        },
        {
          label: "Median formue (P50)",
          value: currency.format(b.p50),
          color: "#6366f1",
        },
        {
          label: "Pessimistisk formue (P10)",
          value: currency.format(b.p10),
          color: "#b45309",
        },
      ];

      const tooltipWidth = 256;
      const valX = tooltipWidth - 12;
      const rowHeight = 20;
      const headerHeight = 32;
      const boxHeight = headerHeight + items.length * rowHeight + 10;
      const tooltipX =
        x > width - margin.right - tooltipWidth - 16
          ? x - tooltipWidth - 14
          : x + 14;
      const tooltipY = margin.top + 8;

      tooltip.setAttribute("transform", `translate(${tooltipX} ${tooltipY})`);
      const rowsSvg = items
        .map((item, idx) => {
          const rowY = headerHeight + 14 + idx * rowHeight;
          return `
            <circle cx="15" cy="${rowY - 4}" r="4" fill="${item.color}" />
            <text class="chart-tooltip-label" x="25" y="${rowY}">${item.label}</text>
            <text class="chart-tooltip-value" x="${valX}" y="${rowY}">${item.value}</text>`;
        })
        .join("");

      tooltip.innerHTML = `
        <rect class="chart-tooltip-box" width="${tooltipWidth}" height="${boxHeight}" rx="8" />
        <text class="chart-tooltip-title" x="12" y="21">${ages.format(b.age)} år</text>
        <text class="chart-tooltip-phase" x="${valX}" y="20">Monte Carlo Solvens</text>
        <line class="chart-tooltip-total-rule" x1="12" x2="${tooltipWidth - 12}" y1="${headerHeight}" y2="${headerHeight}" />
        ${rowsSvg}`;

      hoverLayer.style.display = "block";
    }

    hoverTarget.addEventListener("mousemove", (event) => {
      const rect = svg.getBoundingClientRect();
      const viewBoxX = ((event.clientX - rect.left) / rect.width) * width;
      const progress = Math.max(
        0,
        Math.min(1, (viewBoxX - margin.left) / plotWidth),
      );
      const targetAge = minAge + progress * (maxAge - minAge);
      const nearestIndex = bands.reduce(
        (bestIndex, b, index) =>
          Math.abs(b.age - targetAge) <
          Math.abs(bands[bestIndex].age - targetAge)
            ? index
            : bestIndex,
        0,
      );
      showSolvencyYear(nearestIndex);
    });
    hoverTarget.addEventListener("mouseleave", () => {
      hoverLayer.style.display = "none";
    });
    hoverTarget.addEventListener("focus", () => showSolvencyYear(activeIndex));
    hoverTarget.addEventListener("blur", () => {
      hoverLayer.style.display = "none";
    });
    showSolvencyYear(0);
    hoverLayer.style.display = "none";
  }

  function renderFolkepensionOptimizer(calculation, inputs) {
    const optimizerCard = document.querySelector("#folkepension-optimizer-card");
    const lostTotalEl = document.querySelector("#optimizer-lost-total");
    const lostAnnualEl = document.querySelector("#optimizer-lost-annual");
    const receivedTotalEl = document.querySelector("#optimizer-received-total");
    const lostDescEl = document.querySelector("#optimizer-lost-desc");
    if (!optimizerCard || !lostTotalEl) return;

    if (!inputs.includeFolkepension) {
      lostTotalEl.textContent = "Udeladt";
      lostTotalEl.className = "optimizer-metric-value";
      lostAnnualEl.textContent = "0 kr.";
      receivedTotalEl.textContent = "0 kr.";
      if (lostDescEl) {
        lostDescEl.textContent =
          "Folkepension er slået fra under antagelser. Slå den til for at se modregning.";
      }
      return;
    }

    const pensionAge = inputs.folkepensionAge || 69;
    const retirementRows = (calculation.planRows || []).filter(
      (r) => r.age >= pensionAge,
    );
    // Lovfastsat fuld folkepension pr. person/år (2026-niveau: grundbeløb + fuldt pensionstillæg)
    const fullAnnual = inputs.isCouple ? 144_144 : 195_300;
    const totalFullPotential = retirementRows.length * fullAnnual;
    const totalReceivedGross = retirementRows.reduce(
      (sum, r) => sum + (r.publicPensionGross || 0),
      0,
    );
    const totalLost = Math.max(0, totalFullPotential - totalReceivedGross);
    const avgLost =
      retirementRows.length > 0
        ? Math.round(totalLost / retirementRows.length)
        : 0;

    lostTotalEl.textContent = currency.format(totalLost);
    lostTotalEl.className =
      totalLost > 0
        ? "optimizer-metric-value text-danger"
        : "optimizer-metric-value text-success";
    lostAnnualEl.textContent = currency.format(avgLost) + " / år";
    receivedTotalEl.textContent = currency.format(totalReceivedGross);
    if (lostDescEl) {
      lostDescEl.textContent =
        totalLost > 0
          ? "Modregnet i pensionstillæg pga. ratepension og livrente over bundgrænsen."
          : "Du bevarer dit fulde pensionstillæg uden modregning!";
    }
  }

  function renderStressTests(inputs, skipChartRefresh = false) {
    const grid = document.querySelector("#stress-test-grid");
    if (!grid || !window.FireMonteCarlo?.runHistoricalStressTests) return;

    const anchorInputs = baseTornadoInputs || inputs;
    const results = window.FireMonteCarlo.runHistoricalStressTests(anchorInputs);
    latestStressResults = results;

    if (activeStressTestCrisis) {
      const updated = results.find((r) => r.name === activeStressTestCrisis.name);
      if (updated) {
        activeStressTestCrisis = updated;
        if (
          !skipChartRefresh &&
          currentChartView === "wealth" &&
          latestCalculation &&
          latestInputs
        ) {
          renderChart(latestCalculation, latestInputs, latestMonteCarlo);
        }
      }
    }

    grid.innerHTML = results
      .map((r, idx) => {
        const isActive = activeStressTestCrisis && activeStressTestCrisis.name === r.name;
        const badgeClass = r.isSolvent
          ? "scenario-delta-better"
          : "scenario-delta-worse";
        const badgeText = r.isSolvent
          ? "Overlever krisen"
          : `Udtømmes ved ${ages.format(r.depletionAge || 75)} år`;

        return `
          <div class="stress-card${isActive ? " is-active" : ""}" data-crisis-idx="${idx}">
            <div class="stress-card-header">
              <span class="stress-card-title">${r.name}</span>
              <span class="stress-card-badge ${badgeClass}">${badgeText}</span>
            </div>
            <p class="stress-card-desc">${r.desc}</p>
            <div class="stress-card-metrics">
              <div class="stress-metric-row">
                <span>Laveste formue undervejs:</span>
                <strong>${currency.format(r.minBalance)}</strong>
              </div>
              <div class="stress-metric-row">
                <span>Slutreserve ved 90 år:</span>
                <strong style="color:${r.finalReserve > 0 ? "#059669" : "#dc2626"}">
                  ${currency.format(r.finalReserve)}
                </strong>
              </div>
            </div>
            <div class="stress-card-action">
              <button type="button" class="stress-card-btn stress-card-btn-primary" data-stress-action="chart" data-crisis-idx="${idx}">
                ${isActive ? "✓ På graf (Slå fra)" : "📈 Vis på formuegraf"}
              </button>
              <button type="button" class="stress-card-btn stress-card-btn-secondary" data-stress-action="modal" data-crisis-idx="${idx}">
                🔍 År-for-år vindue
              </button>
              <button type="button" class="stress-card-btn stress-card-btn-secondary" data-stress-action="table" data-crisis-idx="${idx}">
                📋 Vis i hovedtabel
              </button>
            </div>
          </div>`;
      })
      .join("");

    grid.querySelectorAll("[data-stress-action]").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const idx = Number(btn.dataset.crisisIdx);
        const action = btn.dataset.stressAction;
        const selected = results[idx];
        if (!selected) return;

        if (action === "chart") {
          if (activeStressTestCrisis && activeStressTestCrisis.name === selected.name) {
            activeStressTestCrisis = null;
          } else {
            activeStressTestCrisis = selected;
            setChartView("wealth");
            if (chart) chart.scrollIntoView({ behavior: "smooth", block: "nearest" });
          }
          renderStressTests(inputs, true);
          if (latestCalculation && latestInputs) {
            renderActiveChart(latestCalculation, latestInputs, latestMonteCarlo);
          }
        } else if (action === "modal") {
          openDeepDiveDetailModal("crisis", idx);
        } else if (action === "table") {
          selectedTableCrisisIdx = idx;
          if (tableCrisisSelect) tableCrisisSelect.value = String(idx);
          mcTableScenario = "crisis";
          syncMonteCarloButtons();
          update();
          if (projectionDetailsCard) {
            projectionDetailsCard.open = true;
            projectionDetailsCard.scrollIntoView({ behavior: "smooth", block: "start" });
          }
        }
      });
    });
  }

  function hasActiveTornadoOffsets() {
    return (
      Math.abs(tornadoOffsets.spendingPct) > 0.001 ||
      Math.abs(tornadoOffsets.returnPts) > 0.001 ||
      Math.abs(tornadoOffsets.savingsPct) > 0.001 ||
      Math.abs(tornadoOffsets.inflationPts) > 0.001
    );
  }

  function buildModifiedInputsFromOffsets(base, offsets) {
    const next = { ...base };
    if (Math.abs(offsets.spendingPct) > 0.001) {
      next.desiredAnnualWithdrawal = Math.max(
        0,
        Math.round(base.desiredAnnualWithdrawal * (1 + offsets.spendingPct / 100)),
      );
    }
    if (Math.abs(offsets.returnPts) > 0.001) {
      next.returnRate = Math.max(
        0.005,
        Number(((base.returnRate || 0.07) + offsets.returnPts / 100).toFixed(4)),
      );
    }
    if (Math.abs(offsets.savingsPct) > 0.001) {
      const mult = 1 + offsets.savingsPct / 100;
      next.annualFreeFundsContribution = Math.max(
        0,
        Math.round((base.annualFreeFundsContribution || 0) * mult),
      );
      next.annualRatePensionContribution = Math.max(
        0,
        Math.round((base.annualRatePensionContribution || 0) * mult),
      );
      next.annualAskContribution = Math.max(
        0,
        Math.round((base.annualAskContribution || 0) * mult),
      );
    }
    if (Math.abs(offsets.inflationPts) > 0.001) {
      next.inflationRate = Math.max(
        0,
        Number(((base.inflationRate || 0.02) + offsets.inflationPts / 100).toFixed(4)),
      );
    }
    return next;
  }

  function formatTornadoOffsetLabel(key, val) {
    if (Math.abs(val) < 0.001) return "0 (Basisplan)";
    const sign = val > 0 ? "+" : "";
    if (key === "returnPts" || key === "inflationPts") {
      return `${sign}${val.toFixed(1).replace(".", ",")} %-pt`;
    }
    return `${sign}${Math.round(val)} %`;
  }

  function applyTornadoOffsetsToCalculator() {
    if (!baseTornadoInputs) {
      baseTornadoInputs = readInputs();
    }
    const active = hasActiveTornadoOffsets();
    const targetInputs = active
      ? buildModifiedInputsFromOffsets(baseTornadoInputs, tornadoOffsets)
      : { ...baseTornadoInputs };

    const activeParts = [];
    if (Math.abs(tornadoOffsets.spendingPct) > 0.001)
      activeParts.push(`Forbrug ${formatTornadoOffsetLabel("spendingPct", tornadoOffsets.spendingPct)}`);
    if (Math.abs(tornadoOffsets.returnPts) > 0.001)
      activeParts.push(`Afkast ${formatTornadoOffsetLabel("returnPts", tornadoOffsets.returnPts)}`);
    if (Math.abs(tornadoOffsets.savingsPct) > 0.001)
      activeParts.push(`Opsparing ${formatTornadoOffsetLabel("savingsPct", tornadoOffsets.savingsPct)}`);
    if (Math.abs(tornadoOffsets.inflationPts) > 0.001)
      activeParts.push(`Inflation ${formatTornadoOffsetLabel("inflationPts", tornadoOffsets.inflationPts)}`);

    activeTornadoPreset = active ? { label: activeParts.join(" · ") } : null;

    isApplyingTornadoSliders = true;
    try {
      applyPlanInputs(targetInputs);
    } finally {
      isApplyingTornadoSliders = false;
    }
  }

  function renderTornadoAnalysis(inputs) {
    const container = document.querySelector("#sensitivity-tornado-container");
    if (!container || !window.FireMonteCarlo?.calculateSensitivityAnalysis)
      return;

    if (!baseTornadoInputs && !hasActiveTornadoOffsets()) {
      baseTornadoInputs = { ...inputs };
    }
    const anchorInputs = baseTornadoInputs || inputs;
    const factors = window.FireMonteCarlo.calculateSensitivityAnalysis(anchorInputs);
    const active = hasActiveTornadoOffsets();

    const activeBannerHtml = active
      ? `<div class="tornado-banner">
          <span>🎛️ <strong>Aktiv sensitivitets-test:</strong> ${activeTornadoPreset?.label || "Tilpasset"} (Beregnes altid ud fra din oprindelige basisplan)</span>
          <div class="tornado-banner-actions">
            <button type="button" class="tornado-banner-btn-secondary" id="open-tornado-modal-btn">🔍 År-for-år vindue</button>
            <button type="button" class="tornado-banner-btn-secondary" id="open-tornado-table-btn">📋 Vis i hovedtabel</button>
            <button type="button" class="tornado-banner-btn" id="reset-tornado-preset-btn">↺ Nulstil alle til basisplan</button>
          </div>
        </div>`
      : `<div class="tornado-banner" style="background:#f8fafc;border-color:var(--line);color:var(--ink);">
          <span>💡 <strong>Dynamisk sensitivitet:</strong> Træk i sliderne (eller klik på bjælkerne) for at teste kontinuerte ændringer i forhold til din basisplan. Du kan kombinere flere slidere på én gang.</span>
          <div class="tornado-banner-actions">
            <button type="button" class="tornado-banner-btn-secondary" id="open-tornado-modal-btn">🔍 Se år-for-år vindue</button>
          </div>
        </div>`;

    container.innerHTML =
      activeBannerHtml +
      factors
        .map((f, idx) => {
          const leftShare = Math.max(
            0.1,
            (f.baseAge - f.bestAge) / Math.max(1, f.swing),
          );
          const rightShare = Math.max(
            0.1,
            (f.worstAge - f.baseAge) / Math.max(1, f.swing),
          );
          const total = leftShare + rightShare;
          const leftPct = Math.round((leftShare / total) * 100);
          const rightPct = 100 - leftPct;
          const currentOffset = Number(tornadoOffsets[f.key] || 0);
          const isModified = Math.abs(currentOffset) > 0.001;
          const singleModInputs = buildModifiedInputsFromOffsets(anchorInputs, {
            spendingPct: 0,
            returnPts: 0,
            savingsPct: 0,
            inflationPts: 0,
            [f.key]: currentOffset,
          });
          const singleCalc = calculateFire(singleModInputs);
          const singleAge = singleCalc.fireRow
            ? singleCalc.fireRow.age
            : anchorInputs.retirementAge;

          return `
            <div class="tornado-row">
              <div class="tornado-factor-info">
                <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;">
                  <strong>${f.name}</strong>
                  <span class="tornado-live-badge${isModified ? " is-modified" : ""}" data-live-badge="${f.key}">
                    ${formatTornadoOffsetLabel(f.key, currentOffset)} → ${singleAge} år
                  </span>
                  ${isModified ? `<button type="button" class="tornado-single-reset" data-reset-key="${f.key}" title="Nulstil kun denne slider">↺</button>` : ""}
                </div>
                <small>${f.desc}</small>
              </div>
              <div style="display:flex;flex-direction:column;gap:4px;">
                <div class="tornado-visual">
                  <button type="button" class="tornado-endpoint-btn" style="width:82px;text-align:right;" data-factor-idx="${idx}" data-side="low" title="Klik for ${f.lowLabel}">${f.lowLabel}</button>
                  <div class="tornado-bar-wrap" title="Klik på en side eller træk slideren nedenfor (${f.bestAge} år til ${f.worstAge} år)">
                    <div class="tornado-bar-left" style="width:${leftPct}%;" data-factor-idx="${idx}" data-side="low">
                      <span>${f.bestAge} år</span>
                    </div>
                    <div class="tornado-bar-right" style="width:${rightPct}%;" data-factor-idx="${idx}" data-side="high">
                      <span>${f.worstAge} år</span>
                    </div>
                  </div>
                  <button type="button" class="tornado-endpoint-btn" style="width:82px;text-align:left;" data-factor-idx="${idx}" data-side="high" title="Klik for ${f.highLabel}">${f.highLabel}</button>
                </div>
                <div class="tornado-slider-track-wrap">
                  <span style="font-size:10px;color:var(--muted);width:82px;text-align:right;">${f.sliderMin > 0 ? "+" : ""}${f.sliderMin} ${f.unit}</span>
                  <input
                    type="range"
                    class="tornado-range-slider"
                    data-slider-key="${f.key}"
                    min="${f.sliderMin}"
                    max="${f.sliderMax}"
                    step="${f.sliderStep}"
                    value="${currentOffset}"
                    aria-label="Juster ${f.name}"
                  />
                  <span style="font-size:10px;color:var(--muted);width:82px;">+${f.sliderMax} ${f.unit}</span>
                </div>
              </div>
              <div class="tornado-swing-badge">
                <span>± ${f.swing} års forskel</span>
              </div>
            </div>`;
        })
        .join("");

    const resetBtn = container.querySelector("#reset-tornado-preset-btn");
    if (resetBtn) {
      resetBtn.addEventListener("click", () => {
        tornadoOffsets = {
          spendingPct: 0,
          returnPts: 0,
          savingsPct: 0,
          inflationPts: 0,
        };
        applyTornadoOffsetsToCalculator();
      });
    }

    const modalBtn = container.querySelector("#open-tornado-modal-btn");
    if (modalBtn) {
      modalBtn.addEventListener("click", () => {
        openDeepDiveDetailModal("sensitivity");
      });
    }

    const tableBtn = container.querySelector("#open-tornado-table-btn");
    if (tableBtn) {
      tableBtn.addEventListener("click", () => {
        mcTableScenario = "sensitivity";
        syncMonteCarloButtons();
        update();
        if (projectionDetailsCard) {
          projectionDetailsCard.open = true;
          projectionDetailsCard.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      });
    }

    container.querySelectorAll("[data-reset-key]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const k = btn.dataset.resetKey;
        if (k && k in tornadoOffsets) {
          tornadoOffsets[k] = 0;
          applyTornadoOffsetsToCalculator();
        }
      });
    });

    container.querySelectorAll("[data-factor-idx]").forEach((bar) => {
      bar.addEventListener("click", () => {
        const idx = Number(bar.dataset.factorIdx);
        const side = bar.dataset.side;
        const factor = factors[idx];
        if (!factor) return;
        const targetVal = side === "low" ? factor.leftVal : factor.rightVal;
        tornadoOffsets[factor.key] = targetVal;
        applyTornadoOffsetsToCalculator();
      });
    });

    container.querySelectorAll(".tornado-range-slider").forEach((slider) => {
      slider.addEventListener("input", () => {
        const key = slider.dataset.sliderKey;
        const val = Number(slider.value);
        const badge = container.querySelector(`[data-live-badge="${key}"]`);
        if (badge) {
          badge.textContent = `${formatTornadoOffsetLabel(key, val)}`;
          badge.classList.toggle("is-modified", Math.abs(val) > 0.001);
        }
      });
      slider.addEventListener("change", () => {
        const key = slider.dataset.sliderKey;
        const val = Number(slider.value);
        tornadoOffsets[key] = val;
        applyTornadoOffsetsToCalculator();
      });
    });
  }

  function openDeepDiveDetailModal(mode, crisisIdx = 0) {
    if (!deepDiveDetailDialog || !deepDiveModalTbody) return;
    const anchorInputs = baseTornadoInputs || latestInputs || readInputs();
    const baseCalc = calculateFire(anchorInputs);
    let scenCalc = latestCalculation || baseCalc;

    if (mode === "crisis") {
      if (!latestStressResults.length && window.FireMonteCarlo?.runHistoricalStressTests) {
        latestStressResults = window.FireMonteCarlo.runHistoricalStressTests(anchorInputs);
      }
      const crisis = latestStressResults[crisisIdx] || latestStressResults[0];
      if (!crisis || !crisis.calculation) return;
      scenCalc = crisis.calculation;
      if (deepDiveDialogTitle) deepDiveDialogTitle.textContent = `Krise-test: ${crisis.name}`;
      if (deepDiveDialogSubtitle) deepDiveDialogSubtitle.textContent = `${crisis.desc} · Sammenlignet år-for-år mod din basisplan.`;
    } else {
      const label = activeTornadoPreset?.label || "Basisplan (Ingen aktive ændringer)";
      if (deepDiveDialogTitle) deepDiveDialogTitle.textContent = `Sensitivitets-analyse: ${label}`;
      if (deepDiveDialogSubtitle) deepDiveDialogSubtitle.textContent = "Detaljeret år-for-år sammenligning af det valgte sensitivitets-scenarie mod din oprindelige basisplan.";
    }

    const baseEnd = baseCalc.finalRow?.totalBalance ?? 0;
    const scenEnd = scenCalc.finalRow?.totalBalance ?? 0;
    const diffEnd = scenEnd - baseEnd;
    const minWealth = Math.min(...(scenCalc.planRows || []).map((r) => r.totalBalance));
    const scenFire = scenCalc.fireRow ? `${ages.format(scenCalc.fireRow.age)} år` : "Ikke nået";

    if (deepDiveDialogSummary) {
      deepDiveDialogSummary.innerHTML = `
        <div class="deep-dive-kpi-card"><span class="deep-dive-kpi-label">Start FIRE (Scenarie)</span><strong class="deep-dive-kpi-val">${scenFire}</strong></div>
        <div class="deep-dive-kpi-card"><span class="deep-dive-kpi-label">Laveste formue undervejs</span><strong class="deep-dive-kpi-val ${minWealth <= 0 ? "is-neg" : ""}">${currency.format(minWealth)}</strong></div>
        <div class="deep-dive-kpi-card"><span class="deep-dive-kpi-label">Slutreserve (Basisplan)</span><strong class="deep-dive-kpi-val">${currency.format(baseEnd)}</strong></div>
        <div class="deep-dive-kpi-card"><span class="deep-dive-kpi-label">Slutreserve (Scenarie)</span><strong class="deep-dive-kpi-val">${currency.format(scenEnd)}</strong></div>
        <div class="deep-dive-kpi-card"><span class="deep-dive-kpi-label">Forskel ved 90 år</span><strong class="deep-dive-kpi-val ${diffEnd >= 0 ? "is-pos" : "is-neg"}">${diffEnd >= 0 ? "+" : ""}${currency.format(diffEnd)}</strong></div>
      `;
    }

    const baseByAge = new Map((baseCalc.planRows || []).map((r) => [r.age, r]));
    deepDiveModalTbody.innerHTML = (scenCalc.planRows || []).map((row) => {
      const bRow = baseByAge.get(row.age);
      const bBal = bRow ? bRow.totalBalance : row.totalBalance;
      const diff = row.totalBalance - bBal;
      const diffColor = diff > 0 ? "#166534" : diff < 0 ? "#b91c1c" : "inherit";
      const retText = row.EffectiveReturnRate !== undefined ? percent.format(row.EffectiveReturnRate) : "—";
      const totalPension = row.ratePension + row.lifeAnnuity + row.ageSavings;
      return `<tr>
        <td>${ages.format(row.age)} år</td>
        <td><span class="phase-pill ${phaseClass(row.phase)}">${row.phase}</span></td>
        <td>${retText}</td>
        <td data-col-group="pension">${currency.format(row.ratePension)}</td>
        <td data-col-group="pension">${currency.format(row.lifeAnnuity)}</td>
        <td data-col-group="pension">${currency.format(row.ageSavings)}</td>
        <td data-col-group="pension"><strong>${currency.format(totalPension)}</strong></td>
        <td data-col-group="free">${currency.format(row.freeFunds)}</td>
        <td data-col-group="free">${currency.format(row.ask)}</td>
        <td><strong>${currency.format(row.totalBalance)}</strong></td>
        <td data-col-group="cashflow">${currency.format(row.totalContribution)}</td>
        <td data-col-group="cashflow">${currency.format(row.netSpendingNeed)}</td>
        <td data-col-group="cashflow">${currency.format(row.publicPensionNet)}</td>
        <td data-col-group="cashflow">${currency.format(row.privatePensionNet)}</td>
        <td data-col-group="cashflow">${currency.format(row.freePhaseWithdrawalNet)}</td>
        <td data-col-group="comparison">${currency.format(bBal)}</td>
        <td data-col-group="comparison"><strong>${currency.format(row.totalBalance)}</strong></td>
        <td data-col-group="comparison" style="color:${diffColor};font-weight:700;">${diff >= 0 ? "+" : ""}${currency.format(diff)}</td>
      </tr>`;
    }).join("");

    if (typeof deepDiveDetailDialog.showModal === "function") {
      deepDiveDetailDialog.showModal();
    } else {
      deepDiveDetailDialog.setAttribute("open", "true");
    }
  }

  function updateScenarioButtons() {
    if (loadPlanABtn) loadPlanABtn.disabled = !scenarioPlanA;
    if (loadPlanBBtn) loadPlanBBtn.disabled = !scenarioPlanB;
  }

  function saveAsPlanA() {
    const inputs = readInputs();
    scenarioPlanA = {
      name: "Plan A",
      savedAt: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
      inputs,
    };
    try {
      localStorage.setItem("fire_scenario_plan_a", JSON.stringify(scenarioPlanA));
    } catch (_e) {}
    updateScenarioButtons();
    renderScenarioComparison();
  }

  function saveAsPlanB() {
    const inputs = readInputs();
    scenarioPlanB = {
      name: "Plan B",
      savedAt: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
      inputs,
    };
    try {
      localStorage.setItem("fire_scenario_plan_b", JSON.stringify(scenarioPlanB));
    } catch (_e) {}
    updateScenarioButtons();
    renderScenarioComparison();
  }

  function loadPlanA() {
    if (!scenarioPlanA) return;
    applyPlanInputs(scenarioPlanA.inputs);
    if (scenarioDialog) scenarioDialog.close();
  }

  function loadPlanB() {
    if (!scenarioPlanB) return;
    applyPlanInputs(scenarioPlanB.inputs);
    if (scenarioDialog) scenarioDialog.close();
  }

  function renderScenarioComparison() {
    if (!scenarioContent) return;

    if (!scenarioPlanA && !scenarioPlanB) {
      scenarioContent.innerHTML = `
        <div style="text-align:center;padding:32px 16px;color:var(--muted);">
          <p style="font-size:15px;margin-bottom:8px;color:var(--ink);font-weight:600;">Ingen planer er gemt endnu</p>
          <p style="max-width:480px;margin:0 auto 16px;line-height:1.5;">
            Klik på knappen <strong>"Gem aktuelt input som Plan A"</strong> ovenfor for at fastfryse dine nuværende tal. Justér derefter parametrene (f.eks. pensionsalder, indbetaling eller bolig) og gem som <strong>Plan B</strong>.
          </p>
        </div>`;
      return;
    }

    const calcA = scenarioPlanA ? calculateFire(scenarioPlanA.inputs) : null;
    const calcB = scenarioPlanB ? calculateFire(scenarioPlanB.inputs) : null;
    const mcA = scenarioPlanA
      ? computeMonteCarlo(scenarioPlanA.inputs, false)
      : null;
    const mcB = scenarioPlanB
      ? computeMonteCarlo(scenarioPlanB.inputs, false)
      : null;

    function getAnnualSavings(inp) {
      return (
        (inp.annualRatePensionContribution || 0) +
        (inp.annualLifeAnnuityContribution || 0) +
        (inp.annualAgeSavingsContribution || 0) +
        (inp.annualFreeFundsContribution || 0) +
        (inp.annualAskContribution || 0)
      );
    }

    function getTotalTax(calc) {
      if (!calc?.planRows) return 0;
      return calc.planRows.reduce(
        (sum, r) =>
          sum +
          (r.withdrawalTax || 0) +
          (r.annualFreeFundsTax || 0) +
          (r.pensionWithdrawalTax || 0),
        0,
      );
    }

    function getTotalPublicPension(calc) {
      if (!calc?.planRows) return 0;
      return calc.planRows.reduce(
        (sum, r) => sum + (r.publicPensionGross || 0),
        0,
      );
    }

    const rows = [
      {
        metric: "Tidligste FIRE-alder",
        valA: calcA?.fireRow
          ? `${ages.format(calcA.fireRow.age)} år`
          : calcA
            ? "Ikke nået"
            : "—",
        valB: calcB?.fireRow
          ? `${ages.format(calcB.fireRow.age)} år`
          : calcB
            ? "Ikke nået"
            : "—",
        delta: () => {
          if (!calcA?.fireRow || !calcB?.fireRow) return null;
          const diff = calcB.fireRow.age - calcA.fireRow.age;
          if (diff === 0)
            return { text: "Samme alder", cls: "scenario-delta-neutral" };
          if (diff > 0)
            return {
              text: `Plan A er ${diff} år hurtigere`,
              cls: "scenario-delta-better",
            };
          return {
            text: `Plan B er ${Math.abs(diff)} år hurtigere`,
            cls: "scenario-delta-better",
          };
        },
      },
      {
        metric: "Ønsket årligt forbrug (netto)",
        valA: scenarioPlanA
          ? currency.format(scenarioPlanA.inputs.desiredAnnualWithdrawal)
          : "—",
        valB: scenarioPlanB
          ? currency.format(scenarioPlanB.inputs.desiredAnnualWithdrawal)
          : "—",
        delta: () => {
          if (!scenarioPlanA || !scenarioPlanB) return null;
          const diff =
            scenarioPlanB.inputs.desiredAnnualWithdrawal -
            scenarioPlanA.inputs.desiredAnnualWithdrawal;
          if (diff === 0)
            return { text: "Ens forbrug", cls: "scenario-delta-neutral" };
          return {
            text: `${diff > 0 ? "+" : ""}${currency.format(diff)}`,
            cls: "scenario-delta-neutral",
          };
        },
      },
      {
        metric: "Årlig samlet opsparing",
        valA: scenarioPlanA
          ? currency.format(getAnnualSavings(scenarioPlanA.inputs))
          : "—",
        valB: scenarioPlanB
          ? currency.format(getAnnualSavings(scenarioPlanB.inputs))
          : "—",
        delta: () => {
          if (!scenarioPlanA || !scenarioPlanB) return null;
          const diff =
            getAnnualSavings(scenarioPlanB.inputs) -
            getAnnualSavings(scenarioPlanA.inputs);
          if (diff === 0)
            return { text: "Ens indbetaling", cls: "scenario-delta-neutral" };
          return {
            text: `${diff > 0 ? "+" : ""}${currency.format(diff)}`,
            cls: "scenario-delta-neutral",
          };
        },
      },
      {
        metric: "Slutreserve ved 90 år",
        valA: calcA ? currency.format(calcA.finalRow.totalBalance) : "—",
        valB: calcB ? currency.format(calcB.finalRow.totalBalance) : "—",
        delta: () => {
          if (!calcA || !calcB) return null;
          const diff = calcB.finalRow.totalBalance - calcA.finalRow.totalBalance;
          if (diff === 0)
            return { text: "Ens reserve", cls: "scenario-delta-neutral" };
          if (diff > 0)
            return {
              text: `+${currency.format(diff)} i Plan B`,
              cls: "scenario-delta-better",
            };
          return {
            text: `+${currency.format(Math.abs(diff))} i Plan A`,
            cls: "scenario-delta-better",
          };
        },
      },
      {
        metric: "Samlet skat & afgifter",
        valA: calcA ? currency.format(getTotalTax(calcA)) : "—",
        valB: calcB ? currency.format(getTotalTax(calcB)) : "—",
        delta: () => {
          if (!calcA || !calcB) return null;
          const diff = getTotalTax(calcB) - getTotalTax(calcA);
          if (diff === 0)
            return { text: "Ens skat", cls: "scenario-delta-neutral" };
          if (diff > 0)
            return {
              text: `${currency.format(diff)} sparet i Plan A`,
              cls: "scenario-delta-better",
            };
          return {
            text: `${currency.format(Math.abs(diff))} sparet i Plan B`,
            cls: "scenario-delta-better",
          };
        },
      },
      {
        metric: "Folkepension modtaget i alt",
        valA: calcA ? currency.format(getTotalPublicPension(calcA)) : "—",
        valB: calcB ? currency.format(getTotalPublicPension(calcB)) : "—",
        delta: () => {
          if (!calcA || !calcB) return null;
          const diff =
            getTotalPublicPension(calcB) - getTotalPublicPension(calcA);
          if (diff === 0)
            return { text: "Ens folkepension", cls: "scenario-delta-neutral" };
          if (diff > 0)
            return {
              text: `+${currency.format(diff)} i Plan B`,
              cls: "scenario-delta-better",
            };
          return {
            text: `+${currency.format(Math.abs(diff))} i Plan A`,
            cls: "scenario-delta-better",
          };
        },
      },
      {
        metric: "Monte Carlo succesrate (Solvens)",
        valA:
          mcA?.successRate != null ? `${percent.format(mcA.successRate)}` : "—",
        valB:
          mcB?.successRate != null ? `${percent.format(mcB.successRate)}` : "—",
        delta: () => {
          if (mcA?.successRate == null || mcB?.successRate == null) return null;
          const diff =
            Math.round((mcB.successRate - mcA.successRate) * 1000) / 10;
          if (diff === 0)
            return { text: "Ens solvens", cls: "scenario-delta-neutral" };
          if (diff > 0)
            return {
              text: `+${diff} %-point i Plan B`,
              cls: "scenario-delta-better",
            };
          return {
            text: `+${Math.abs(diff)} %-point i Plan A`,
            cls: "scenario-delta-better",
          };
        },
      },
      {
        metric: "Monte Carlo Median reserve (P50)",
        valA: mcA ? currency.format(mcA.totalBalancePercentiles.p50) : "—",
        valB: mcB ? currency.format(mcB.totalBalancePercentiles.p50) : "—",
        delta: () => {
          if (!mcA || !mcB) return null;
          const diff =
            mcB.totalBalancePercentiles.p50 - mcA.totalBalancePercentiles.p50;
          if (diff === 0)
            return { text: "Ens median", cls: "scenario-delta-neutral" };
          if (diff > 0)
            return {
              text: `+${currency.format(diff)} i Plan B`,
              cls: "scenario-delta-better",
            };
          return {
            text: `+${currency.format(Math.abs(diff))} i Plan A`,
            cls: "scenario-delta-better",
          };
        },
      },
    ];

    const rowsHtml = rows
      .map((r) => {
        const deltaObj = r.delta();
        const deltaHtml = deltaObj
          ? `<span class="scenario-delta-badge ${deltaObj.cls}">${deltaObj.text}</span>`
          : '<span style="color:var(--muted)">—</span>';
        return `
          <tr>
            <td class="scenario-metric-name">${r.metric}</td>
            <td class="val-plan-a">${r.valA}</td>
            <td class="val-plan-b">${r.valB}</td>
            <td>${deltaHtml}</td>
          </tr>`;
      })
      .join("");

    scenarioContent.innerHTML = `
      <table class="scenario-table">
        <thead>
          <tr>
            <th style="width:28%">Parameter / Nøgletal</th>
            <th class="col-plan-a" style="width:24%">
              Plan A ${scenarioPlanA ? `<small style="font-weight:normal;opacity:0.8;">(${scenarioPlanA.savedAt})</small>` : ""}
            </th>
            <th class="col-plan-b" style="width:24%">
              Plan B ${scenarioPlanB ? `<small style="font-weight:normal;opacity:0.8;">(${scenarioPlanB.savedAt})</small>` : ""}
            </th>
            <th style="width:24%">Forskel (Delta)</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml}
        </tbody>
      </table>`;
  }

  let deepDiveTimeout = null;
  function scheduleDeepDive(inputs) {
    if (deepDiveTimeout) {
      window.clearTimeout(deepDiveTimeout);
    }
    deepDiveTimeout = window.setTimeout(() => {
      deepDiveTimeout = null;
      renderStressTests(inputs);
      renderTornadoAnalysis(inputs);
    }, 120);
  }

  function renderActiveChart(calculation, inputs, mc) {
    if (!calculation || !inputs) return;
    const activeMc = mc || latestMonteCarlo;
    switch (currentChartView) {
      case "cashflow":
        renderCashflowChart(calculation, inputs);
        break;
      case "tax":
        renderTaxChart(calculation, inputs);
        break;
      case "solvency":
        renderSolvencyChart(calculation, inputs, activeMc);
        break;
      case "wealth":
      default:
        renderChart(calculation, inputs, activeMc);
        break;
    }
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

    const mc = latestMonteCarlo;

    renderPhases(calculation, inputs);
    renderMonteCarloComparison(calculation, inputs, mc);
    renderActiveChart(calculation, inputs, mc);
    renderFolkepensionOptimizer(calculation, inputs);
    scheduleDeepDive(inputs);

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
    if (housingColPill) {
      housingColPill.hidden = !calculation.includeHousing;
    }

    if (tableCrisisPickerWrap) {
      tableCrisisPickerWrap.hidden = mcTableScenario !== "crisis";
    }
    const baseCalcForTable =
      mcTableScenario === "sensitivity" && baseTornadoInputs
        ? calculateFire(baseTornadoInputs)
        : calculation;

    let activeTableCalc = calculation;
    if (mcTableScenario === "crisis") {
      if (!latestStressResults.length && window.FireMonteCarlo?.runHistoricalStressTests) {
        latestStressResults = window.FireMonteCarlo.runHistoricalStressTests(baseTornadoInputs || inputs);
      }
      activeTableCalc = latestStressResults[selectedTableCrisisIdx]?.calculation || calculation;
    } else if (mcTableScenario === "sensitivity") {
      activeTableCalc = calculation;
    } else if (mc && mcTableScenario !== "baseline" && mc.scenarios?.[mcTableScenario]) {
      activeTableCalc = mc.scenarios[mcTableScenario].calculation;
    }
    latestActiveTableCalc = activeTableCalc;

    const isMcScenario = ["p10", "p50", "p90"].includes(mcTableScenario);
    const isScenScenario = mcTableScenario === "crisis" || mcTableScenario === "sensitivity";
    const showCompCols =
      Boolean(mc) && Boolean(mcTableShowComparisonInput?.checked) && !isScenScenario;
    const showScenCompCols =
      Boolean(mcTableShowComparisonInput?.checked) && isScenScenario;

    const bandsByAge = new Map(
      (mc?.percentileBands ?? []).map((band) => [band.age, band]),
    );
    const baseRowsByAge = new Map(
      (baseCalcForTable.planRows ?? []).map((r) => [r.age, r]),
    );
    mcComparisonThs.forEach((th) => {
      th.hidden = !showCompCols;
    });
    scenComparisonThs.forEach((th) => {
      th.hidden = !showScenCompCols;
    });

    if (mcTableActiveBanner && mcTableActivePill && mcTableActiveDesc) {
      const scenarioStop = activeTableCalc.pensionStopRow
        ? `${ages.format(activeTableCalc.pensionStopRow.age)} år`
        : "Ikke nået";
      const scenarioFire = activeTableCalc.fireRow
        ? `${ages.format(activeTableCalc.fireRow.age)} år`
        : "Ikke nået";
      const scenarioReserve = currency.format(
        calculation.includeHousing
          ? (activeTableCalc.finalReserveAfterTaxWithHousing ??
              activeTableCalc.finalRow.totalWealthWithHousing ??
              activeTableCalc.finalRow.totalBalance)
          : activeTableCalc.finalRow.totalBalance,
      );
      if (mcTableScenario === "crisis") {
        const crisis = latestStressResults[selectedTableCrisisIdx] || latestStressResults[0];
        mcTableActiveBanner.className = "mc-table-active-banner is-with";
        mcTableActivePill.className = "mc-mode-pill mc-mode-pill-with";
        mcTableActivePill.textContent = `AKTIV TABEL: HISTORISK KRISE-TEST · ${(crisis?.name || "1929").toUpperCase()}`;
        mcTableActiveDesc.textContent = `${crisis?.desc || "Simuleret historisk krise ved FIRE-start."} Start FIRE: ${scenarioFire} · Slutreserve: ${scenarioReserve}. Se de 3 sammenligningskolonner længst til højre for forskel mod basisplanen.`;
      } else if (mcTableScenario === "sensitivity") {
        const label = activeTornadoPreset?.label || "Basisplan (Ingen aktive slider-ændringer)";
        mcTableActiveBanner.className = "mc-table-active-banner is-with";
        mcTableActivePill.className = "mc-mode-pill mc-mode-pill-with";
        mcTableActivePill.textContent = `AKTIV TABEL: SENSITIVITET · ${label.toUpperCase()}`;
        mcTableActiveDesc.textContent = `Tabellen viser år-for-år beregningen for dit valgte sensitivitets-scenarie sammenlignet med din oprindelige basisplan. Start FIRE: ${scenarioFire} · Slutreserve: ${scenarioReserve}.`;
      } else if (mcTableScenario === "baseline" || !mc || !isMcScenario) {
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
          baseRowsByAge.get(row.age),
          showScenCompCols,
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
    hasUncalculatedChanges = false;
    if (uncalculatedBadge) {
      uncalculatedBadge.hidden = true;
    }

    try {
      const inputs = readInputs();
      const calculation = calculateFire(inputs);
      latestInputs = inputs;
      latestCalculation = calculation;
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

  let inputDebounceTimer = null;
  function scheduleUpdate() {
    if (inputDebounceTimer) {
      window.clearTimeout(inputDebounceTimer);
    }
    inputDebounceTimer = window.setTimeout(() => {
      inputDebounceTimer = null;
      update();
    }, 160);
  }

  form.addEventListener("submit", update);
  form.addEventListener("input", (event) => {
    if (!isApplyingTornadoSliders) {
      baseTornadoInputs = null;
      activeTornadoPreset = null;
      tornadoOffsets = {
        spendingPct: 0,
        returnPts: 0,
        savingsPct: 0,
        inflationPts: 0,
      };
    }
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

    if (!autoCalculateEnabled) {
      hasUncalculatedChanges = true;
      if (uncalculatedBadge) {
        uncalculatedBadge.hidden = false;
      }
      return;
    }

    const isTextOrNumberInput =
      event.target.type === "text" ||
      event.target.type === "number" ||
      event.target.tagName === "TEXTAREA";

    if (isTextOrNumberInput) {
      scheduleUpdate();
    } else {
      if (inputDebounceTimer) {
        window.clearTimeout(inputDebounceTimer);
        inputDebounceTimer = null;
      }
      update(event);
    }
  });

  if (autoCalculateToggle) {
    autoCalculateToggle.addEventListener("change", () => {
      autoCalculateEnabled = autoCalculateToggle.checked;
      try {
        localStorage.setItem(
          "fire_auto_calculate",
          String(autoCalculateEnabled),
        );
      } catch (_e) {}
      updateCalcModeUi();
      if (autoCalculateEnabled && hasUncalculatedChanges) {
        update();
      }
    });
  }

  if (manualRecalculateBtn) {
    manualRecalculateBtn.addEventListener("click", () => {
      update();
    });
  }

  optimizeButton.addEventListener("click", runContributionOptimization);
  applyOptimizationButton.addEventListener("click", applyOptimization);
  if (runMonteCarloButton) {
    runMonteCarloButton.addEventListener("click", runMonteCarloSimulation);
  }
  mcChartModeButtons.forEach((button) => {
    button.addEventListener("click", () => {
      mcChartMode = button.dataset.mcChartMode || "without";
      if (mcChartMode !== "without" && !latestMonteCarlo) {
        computeMonteCarlo(latestInputs || readInputs(), false);
      }
      syncMonteCarloButtons();
      update();
    });
  });
  mcTableScenarioButtons.forEach((button) => {
    button.addEventListener("click", () => {
      mcTableScenario = button.dataset.mcTableScenario || "baseline";
      const isMc = ["p10", "p50", "p90"].includes(mcTableScenario);
      if (isMc && mcChartMode === "without") {
        mcChartMode = "compare";
      }
      if (isMc && !latestMonteCarlo) {
        computeMonteCarlo(latestInputs || readInputs(), false);
      }
      syncMonteCarloButtons();
      update();
    });
  });
  if (tableCrisisSelect) {
    tableCrisisSelect.addEventListener("change", () => {
      selectedTableCrisisIdx = Number(tableCrisisSelect.value) || 0;
      update();
    });
  }
  colGroupPills.forEach((pill) => {
    pill.addEventListener("click", () => {
      const grp = pill.dataset.toggleColGroup;
      if (!grp || !mainProjectionTableWrap) return;
      const isCurrentlyExpanded = pill.classList.contains("is-expanded");
      const nextExpanded = !isCurrentlyExpanded;
      pill.classList.toggle("is-expanded", nextExpanded);
      pill.setAttribute("aria-pressed", nextExpanded ? "true" : "false");
      mainProjectionTableWrap.setAttribute(
        `data-collapsed-${grp}`,
        nextExpanded ? "false" : "true",
      );
    });
  });
  if (colGroupToggleAllBtn && mainProjectionTableWrap) {
    colGroupToggleAllBtn.addEventListener("click", () => {
      const anyCollapsed = Array.from(colGroupPills).some(
        (p) => !p.hidden && !p.classList.contains("is-expanded"),
      );
      colGroupPills.forEach((p) => {
        const grp = p.dataset.toggleColGroup;
        if (!grp) return;
        p.classList.toggle("is-expanded", anyCollapsed);
        p.setAttribute("aria-pressed", anyCollapsed ? "true" : "false");
        mainProjectionTableWrap.setAttribute(
          `data-collapsed-${grp}`,
          anyCollapsed ? "false" : "true",
        );
      });
    });
  }
  modalColGroupPills.forEach((pill) => {
    pill.addEventListener("click", () => {
      const grp = pill.dataset.modalColGroup;
      if (!grp || !deepDiveModalTableWrap) return;
      const isCurrentlyExpanded = pill.classList.contains("is-expanded");
      const nextExpanded = !isCurrentlyExpanded;
      pill.classList.toggle("is-expanded", nextExpanded);
      pill.setAttribute("aria-pressed", nextExpanded ? "true" : "false");
      deepDiveModalTableWrap.setAttribute(
        `data-collapsed-${grp}`,
        nextExpanded ? "false" : "true",
      );
    });
  });
  if (closeDeepDiveDialogBtn && deepDiveDetailDialog) {
    closeDeepDiveDialogBtn.addEventListener("click", () => {
      deepDiveDetailDialog.close();
    });
    deepDiveDetailDialog.addEventListener("click", (e) => {
      if (e.target === deepDiveDetailDialog) {
        deepDiveDetailDialog.close();
      }
    });
  }
  chartScaleButtons.forEach((button) => {
    button.addEventListener("click", () => {
      chartScaleMode = button.dataset.chartScale || "linear";
      syncChartScaleButtons();
      update();
    });
  });
  function setChartView(viewName) {
    currentChartView = viewName;
    chartViewTabs.forEach((tab) => {
      const isActive = tab.dataset.chartView === viewName;
      tab.classList.toggle("is-active", isActive);
      tab.setAttribute("aria-selected", isActive ? "true" : "false");
    });
    Object.entries(chartViewPanes).forEach(([name, pane]) => {
      if (pane) {
        if (name === viewName) {
          pane.removeAttribute("hidden");
        } else {
          pane.setAttribute("hidden", "");
        }
      }
    });
    if (latestCalculation && latestInputs) {
      renderActiveChart(latestCalculation, latestInputs, latestMonteCarlo);
    }
  }
  chartViewTabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      setChartView(tab.dataset.chartView || "wealth");
    });
  });
  if (runSolvencyMcBtn) {
    runSolvencyMcBtn.addEventListener("click", runMonteCarloSimulation);
  }

  if (exportPdfTrigger) {
    exportPdfTrigger.addEventListener("click", () => window.print());
  }
  if (compareScenariosTrigger && scenarioDialog) {
    compareScenariosTrigger.addEventListener("click", () => {
      updateScenarioButtons();
      renderScenarioComparison();
      scenarioDialog.showModal();
    });
  }
  if (closeScenarioDialogBtn && scenarioDialog) {
    closeScenarioDialogBtn.addEventListener("click", () =>
      scenarioDialog.close(),
    );
  }
  scenarioDialog?.addEventListener("click", (event) => {
    if (event.target === scenarioDialog) {
      scenarioDialog.close();
    }
  });
  if (saveAsPlanABtn) {
    saveAsPlanABtn.addEventListener("click", saveAsPlanA);
  }
  if (saveAsPlanBBtn) {
    saveAsPlanBBtn.addEventListener("click", saveAsPlanB);
  }
  if (loadPlanABtn) {
    loadPlanABtn.addEventListener("click", loadPlanA);
  }
  if (loadPlanBBtn) {
    loadPlanBBtn.addEventListener("click", loadPlanB);
  }

  const deepDiveTabs = [...document.querySelectorAll("[data-deep-tab]")];
  const deepDivePanes = {
    stress: document.querySelector("#deep-dive-stress-pane"),
    tornado: document.querySelector("#deep-dive-tornado-pane"),
  };

  deepDiveTabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      const targetTab = tab.dataset.deepTab;
      deepDiveTabs.forEach((t) => {
        const isActive = t.dataset.deepTab === targetTab;
        t.classList.toggle("is-active", isActive);
        t.setAttribute("aria-selected", isActive ? "true" : "false");
      });
      Object.entries(deepDivePanes).forEach(([name, pane]) => {
        if (pane) {
          if (name === targetTab) {
            pane.removeAttribute("hidden");
          } else {
            pane.setAttribute("hidden", "");
          }
        }
      });
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

  function resolveExplanation(targetEl) {
    if (!window.FireMathExplainer) return null;
    const colKey = targetEl.dataset.colKey;
    if (colKey && latestActiveTableCalc) {
      const targetAge = Number(targetEl.dataset.rowAge);
      const rows = latestActiveTableCalc.planRows;
      const rowIndex = rows.findIndex((r) => r.age === targetAge);
      if (rowIndex !== -1) {
        const row = rows[rowIndex];
        const prevRow = rowIndex > 0 ? rows[rowIndex - 1] : null;
        return window.FireMathExplainer.explainTableCell({
          colKey,
          row,
          prevRow,
          calculation: latestActiveTableCalc,
          inputs: latestInputs,
          scenario: mcTableScenario,
        });
      }
    }
    const metricKey = targetEl.dataset.metricKey;
    if (metricKey && latestCalculation && latestInputs) {
      return window.FireMathExplainer.explainKeyMetric({
        metricKey,
        calculation: latestCalculation,
        inputs: latestInputs,
      });
    }
    return null;
  }

  let activeTooltipTarget = null;

  function showMathTooltip(targetEl, clientX, clientY) {
    if (!mathHoverTooltip) return;
    const exp = resolveExplanation(targetEl);
    if (!exp) {
      hideMathTooltip();
      return;
    }
    activeTooltipTarget = targetEl;
    if (mathTooltipBadge) mathTooltipBadge.textContent = exp.badge;
    if (mathTooltipTitle) mathTooltipTitle.textContent = exp.title;
    if (mathTooltipMath) mathTooltipMath.textContent = exp.quickMath;
    mathHoverTooltip.hidden = false;
    mathHoverTooltip.classList.add("is-visible");
    positionMathTooltip(clientX, clientY);
  }

  function positionMathTooltip(clientX, clientY) {
    if (!mathHoverTooltip || mathHoverTooltip.hidden) return;
    const padding = 14;
    const rect = mathHoverTooltip.getBoundingClientRect();
    let left = clientX + padding;
    let top = clientY + padding;

    if (left + rect.width > window.innerWidth - 12) {
      left = Math.max(12, clientX - rect.width - padding);
    }
    if (top + rect.height > window.innerHeight - 12) {
      top = Math.max(12, clientY - rect.height - padding);
    }

    mathHoverTooltip.style.left = `${left}px`;
    mathHoverTooltip.style.top = `${top}px`;
  }

  function hideMathTooltip() {
    activeTooltipTarget = null;
    if (mathHoverTooltip) {
      mathHoverTooltip.classList.remove("is-visible");
      mathHoverTooltip.hidden = true;
    }
  }

  function openMathInspector(targetEl) {
    if (!mathInspectorDialog) return;
    hideMathTooltip();
    const exp = resolveExplanation(targetEl);
    if (!exp) return;

    if (mathInspectorBadge) mathInspectorBadge.textContent = exp.badge;
    if (mathInspectorTitle) mathInspectorTitle.textContent = exp.title;
    if (mathInspectorDescription)
      mathInspectorDescription.textContent = exp.description;
    if (mathInspectorFormula) mathInspectorFormula.textContent = exp.formula;
    if (mathInspectorFormulaDetails)
      mathInspectorFormulaDetails.textContent = exp.formulaDetails || "";

    if (mathInspectorCalcCard && mathInspectorCalcExample) {
      if (exp.returnExample) {
        if (mathInspectorCalcTitle) {
          mathInspectorCalcTitle.textContent =
            exp.calcTitle || "Gennemført regneeksempel for afkast";
        }
        mathInspectorCalcExample.textContent = exp.returnExample;
        if (mathInspectorCalcNote) {
          mathInspectorCalcNote.textContent = exp.returnExampleNote || "";
          mathInspectorCalcNote.hidden = !exp.returnExampleNote;
        }
        mathInspectorCalcCard.hidden = false;
      } else {
        mathInspectorCalcCard.hidden = true;
      }
    }

    if (mathInspectorSteps) {
      mathInspectorSteps.innerHTML = (exp.steps || [])
        .map(
          (step) => `
          <tr class="${step.isResult ? "math-step-result" : ""} ${step.isSub ? "math-step-sub" : ""}">
            <td class="math-step-label">
              ${step.label}
              ${step.note ? `<small class="math-step-note">${step.note}</small>` : ""}
            </td>
            <td class="math-step-value">${step.value}</td>
          </tr>`,
        )
        .join("");
    }

    if (mathInspectorAssumptions) {
      mathInspectorAssumptions.innerHTML = (exp.assumptions || [])
        .map(
          (item) => `
          <div class="math-assumption-item">
            <small>${item.label}</small>
            <strong>${item.value}</strong>
          </div>`,
        )
        .join("");
    }

    mathInspectorDialog.showModal();
  }

  function closeMathInspector() {
    if (mathInspectorDialog && mathInspectorDialog.open) {
      mathInspectorDialog.close();
    }
  }

  document.addEventListener("pointermove", (event) => {
    const el = event.target.closest(".explainable-val");
    if (el) {
      if (activeTooltipTarget !== el) {
        showMathTooltip(el, event.clientX, event.clientY);
      } else {
        positionMathTooltip(event.clientX, event.clientY);
      }
    } else if (activeTooltipTarget) {
      hideMathTooltip();
    }
  });

  document.addEventListener("pointerleave", () => hideMathTooltip());
  window.addEventListener("scroll", () => hideMathTooltip(), { passive: true });

  document.addEventListener("contextmenu", (event) => {
    const el = event.target.closest(".explainable-val");
    if (el) {
      event.preventDefault();
      openMathInspector(el);
    }
  });

  document.addEventListener("keydown", (event) => {
    if (
      (event.key === "Enter" || event.key === " ") &&
      event.target.matches?.(".explainable-val")
    ) {
      event.preventDefault();
      openMathInspector(event.target);
    }
  });

  let touchTimer = null;
  document.addEventListener(
    "touchstart",
    (event) => {
      const el = event.target.closest(".explainable-val");
      if (el) {
        touchTimer = setTimeout(() => {
          openMathInspector(el);
          touchTimer = null;
        }, 450);
      }
    },
    { passive: true },
  );

  document.addEventListener(
    "touchend",
    () => {
      if (touchTimer) {
        clearTimeout(touchTimer);
        touchTimer = null;
      }
    },
    { passive: true },
  );

  document.addEventListener(
    "touchmove",
    () => {
      if (touchTimer) {
        clearTimeout(touchTimer);
        touchTimer = null;
      }
    },
    { passive: true },
  );

  if (mathInspectorClose) {
    mathInspectorClose.addEventListener("click", closeMathInspector);
  }
  if (mathInspectorOk) {
    mathInspectorOk.addEventListener("click", closeMathInspector);
  }
  if (mathInspectorDialog) {
    mathInspectorDialog.addEventListener("click", (event) => {
      if (event.target === mathInspectorDialog) {
        closeMathInspector();
      }
    });
  }

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

  updateCalcModeUi();
  update();
})();
