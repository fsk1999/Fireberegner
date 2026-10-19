(function (root, factory) {
  const api = factory();

  if (typeof module === "object" && module.exports) {
    module.exports = api;
  }

  root.FirePlanCode = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  const NUMBER_FIELDS = Object.freeze([
    "currentAge",
    "retirementAge",
    "payoutYears",
    "desiredAnnualWithdrawal",
    "ratePensionBalance",
    "lifeAnnuityBalance",
    "ratePensionNonDeductibleBasis",
    "ageSavingsBalance",
    "freeFundsBalance",
    "freeFundsCostBasis",
    "askBalance",
    "annualRatePensionContribution",
    "annualLifeAnnuityContribution",
    "annualAgeSavingsContribution",
    "annualFreeFundsContribution",
    "annualAskContribution",
    "ageSavingsContributionLimit",
    "pensionTax",
    "ratePensionContributionTaxRelief",
    "pensionWithdrawalTax",
    "askTax",
    "freeFundsInventoryShare",
    "returnRate",
    "inflationRate",
    "lifeAnnuityPayoutRate",
    "defensiveReturnRate",
    "returnDeclineYears",
    "returnRecoveryYears",
    "folkepensionAge",
    "atpAnnualIncome",
    "efterloenAnnualIncome",
    "efterloenYears",
    "spendingStepAge",
    "spendingStepPercent",
    "oneOffEventAge",
    "oneOffEventAmount",
    "returnVolatility",
    "monteCarloRuns",
    "housingValue",
    "housingDebt",
    "housingAnnualAmortization",
    "housingPriceGrowth",
    "housingOwnershipShare",
    "housingUnlockShare",
    "housingUnlockAge",
  ]);
  const STRING_FIELDS = Object.freeze([
    "returnStrategy",
    "withdrawalStrategy",
    "housingType",
    "housingUnlockAgeType",
  ]);
  const BOOLEAN_FIELDS = Object.freeze([
    "withdrawalAfterTax",
    "contributionsFollowInflation",
    "redirectPensionContributionsToFreeFunds",
    "isCouple",
    "includeFolkepension",
    "includeHousing",
    "housingUnlock",
  ]);
  const INPUT_FIELDS = Object.freeze([
    ...NUMBER_FIELDS,
    ...STRING_FIELDS,
    ...BOOLEAN_FIELDS,
  ]);

  const EXTENDED_DEFAULTS = Object.freeze({
    lifeAnnuityPayoutRate: 0.0322,
    annualAskContribution: 0,
    folkepensionAge: 69,
    atpAnnualIncome: 0,
    efterloenAnnualIncome: 0,
    efterloenYears: 0,
    spendingStepAge: 0,
    spendingStepPercent: 0,
    oneOffEventAge: 0,
    oneOffEventAmount: 0,
    returnVolatility: 0.15,
    monteCarloRuns: 500,
    withdrawalStrategy: "proportional",
    isCouple: false,
    includeFolkepension: false,
    includeHousing: false,
    housingType: "owner",
    housingValue: 8500000,
    housingDebt: 1600000,
    housingAnnualAmortization: 0,
    housingPriceGrowth: 0.02,
    housingOwnershipShare: 0.5,
    housingUnlock: true,
    housingUnlockShare: 0.5,
    housingUnlockAgeType: "fire",
    housingUnlockAge: 60,
  });

  function invalidFormat() {
    return new Error("Koden har et ugyldigt format.");
  }

  function isPlainObject(value) {
    return value !== null && typeof value === "object" && !Array.isArray(value);
  }

  function hasExactKeys(value, expectedKeys) {
    if (!isPlainObject(value)) {
      return false;
    }

    const keys = Object.keys(value).sort();
    const expected = [...expectedKeys].sort();
    return (
      keys.length === expected.length &&
      keys.every((key, index) => key === expected[index])
    );
  }

  function utf8Bytes(value) {
    if (typeof TextEncoder === "function") {
      return new TextEncoder().encode(value);
    }
    if (typeof Buffer !== "undefined") {
      return Uint8Array.from(Buffer.from(value, "utf8"));
    }
    throw invalidFormat();
  }

  function utf8Text(bytes) {
    if (typeof TextDecoder === "function") {
      return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    }
    if (typeof Buffer !== "undefined") {
      return Buffer.from(bytes).toString("utf8");
    }
    throw invalidFormat();
  }

  function bytesToBase64Url(bytes) {
    let base64;

    if (typeof btoa === "function") {
      let binary = "";
      bytes.forEach((byte) => {
        binary += String.fromCharCode(byte);
      });
      base64 = btoa(binary);
    } else if (typeof Buffer !== "undefined") {
      base64 = Buffer.from(bytes).toString("base64");
    } else {
      throw invalidFormat();
    }

    return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
  }

  function base64UrlToBytes(code) {
    if (!/^[A-Za-z0-9_-]+$/.test(code) || code.length % 4 === 1) {
      throw invalidFormat();
    }

    const padding = "=".repeat((4 - (code.length % 4)) % 4);
    const base64 = code.replace(/-/g, "+").replace(/_/g, "/") + padding;
    let bytes;

    try {
      if (typeof atob === "function") {
        const binary = atob(base64);
        bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
      } else if (typeof Buffer !== "undefined") {
        bytes = Uint8Array.from(Buffer.from(base64, "base64"));
      } else {
        throw invalidFormat();
      }
    } catch (_error) {
      throw invalidFormat();
    }

    if (bytesToBase64Url(bytes) !== code) {
      throw invalidFormat();
    }

    return bytes;
  }

  function validatedInputs(rawInputs) {
    if (!isPlainObject(rawInputs)) {
      throw new Error("Koden indeholder ikke alle FIRE-input.");
    }
    const inputs = {};
    for (const field of INPUT_FIELDS) {
      inputs[field] =
        rawInputs[field] !== undefined
          ? rawInputs[field]
          : EXTENDED_DEFAULTS[field];
    }
    if (!hasExactKeys(inputs, INPUT_FIELDS)) {
      throw new Error("Koden indeholder ikke alle FIRE-input.");
    }

    const invalidNumber = NUMBER_FIELDS.some(
      (field) =>
        typeof inputs[field] !== "number" || !Number.isFinite(inputs[field]),
    );
    const invalidBoolean = BOOLEAN_FIELDS.some(
      (field) => typeof inputs[field] !== "boolean",
    );
    const invalidStrategy = !["none", "declining", "riskTent"].includes(
      inputs.returnStrategy,
    );
    const invalidWithdrawalStrategy = !["proportional", "taxOptimal"].includes(
      inputs.withdrawalStrategy,
    );
    const invalidHousingType = !["owner", "coop", "rent"].includes(
      inputs.housingType,
    );
    const invalidHousingUnlockAgeType = !["fire", "custom"].includes(
      inputs.housingUnlockAgeType,
    );

    if (
      invalidNumber ||
      invalidBoolean ||
      invalidStrategy ||
      invalidWithdrawalStrategy ||
      invalidHousingType ||
      invalidHousingUnlockAgeType
    ) {
      throw new Error("Koden indeholder ugyldige FIRE-input.");
    }

    return Object.fromEntries(
      INPUT_FIELDS.map((field) => [field, inputs[field]]),
    );
  }

  function encodePlan(inputs) {
    const payload = {
      calculator: "fire",
      inputs: validatedInputs(inputs || {}),
    };

    return bytesToBase64Url(utf8Bytes(JSON.stringify(payload)));
  }

  function decodePlan(value) {
    const code = String(value ?? "").trim();
    let payload;

    if (!code) {
      throw new Error("Indsæt en kode, før du indlæser input.");
    }

    try {
      payload = JSON.parse(utf8Text(base64UrlToBytes(code)));
    } catch (error) {
      if (error.message.startsWith("Koden ") || error.message.startsWith("Indsæt ")) {
        throw error;
      }
      throw invalidFormat();
    }

    if (!hasExactKeys(payload, ["calculator", "inputs"])) {
      throw invalidFormat();
    }
    if (payload.calculator !== "fire") {
      throw new Error("Koden er ikke oprettet af FIRE-beregneren.");
    }

    return validatedInputs(payload.inputs);
  }

  return { encodePlan, decodePlan };
});
