(function () {
  "use strict";

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

  const yearsFormat = new Intl.NumberFormat("da-DK", {
    maximumFractionDigits: 1,
  });

  const ages = new Intl.NumberFormat("da-DK", {
    maximumFractionDigits: 0,
  });

  const percentPrecise = new Intl.NumberFormat("da-DK", {
    style: "percent",
    minimumFractionDigits: 2,
    maximumFractionDigits: 3,
  });

  function formatDiffCurrency(diff) {
    if (!Number.isFinite(diff)) return "—";
    const prefix = diff > 0 ? "+" : "";
    return `${prefix}${currency.format(diff)}`;
  }

  function calculateReturnBreakdown({ nominalReturn, taxRate, inflRate, start, contrib, afkast }) {
    const netNominalRate = nominalReturn >= 0 ? nominalReturn * (1 - taxRate) : nominalReturn * (1 - taxRate);
    const realRate = (1 + netNominalRate) / (1 + inflRate) - 1;
    const midyearFactor = Math.sqrt(Math.max(0, 1 + realRate)) - 1;
    const primoReturn = Math.round(start * realRate);
    const contribReturn = contrib > 0 ? afkast - primoReturn : 0;

    const grossPrimo = Math.round(start * nominalReturn);
    const midyearNominal = Math.sqrt(Math.max(0, 1 + nominalReturn)) - 1;
    const grossContrib = contrib > 0 ? Math.round(contrib * midyearNominal) : 0;
    const grossTotal = grossPrimo + grossContrib;

    const taxAmount = grossTotal > 0 ? Math.round(grossTotal * taxRate) : 0;
    const netNominalTotal = grossTotal - taxAmount;
    const inflationAmount = netNominalTotal - afkast;

    return {
      netNominalRate,
      realRate,
      midyearFactor,
      primoReturn,
      contribReturn,
      grossPrimo,
      grossContrib,
      grossTotal,
      taxAmount,
      inflationAmount
    };
  }

  function buildPensionReturnExample({ nominalReturn, palTaxRate, inflRate, start, contrib, afkast, accountName }) {
    const b = calculateReturnBreakdown({ nominalReturn, taxRate: palTaxRate, inflRate, start, contrib, afkast });

    let text = `1. Nominelt bruttoafkast (${percent.format(nominalReturn)}):\n`;
    text += `   • Afkast af investeret primosaldo (${currency.format(start)}): ${b.grossPrimo >= 0 ? "+" : "−"} ${currency.format(Math.abs(b.grossPrimo))}\n`;
    if (contrib > 0) {
      text += `   • Afkast af årets indbetaling (${currency.format(contrib)}): ${b.grossContrib >= 0 ? "+" : "−"} ${currency.format(Math.abs(b.grossContrib))}\n`;
    }
    text += `   = Samlet bruttoafkast før skat: ${b.grossTotal >= 0 ? "+" : "−"} ${currency.format(Math.abs(b.grossTotal))}\n\n`;

    text += `2. PAL-skat (${percent.format(palTaxRate)} af bruttoafkast):\n`;
    text += `   − ${currency.format(Math.abs(b.taxAmount))} (PAL-skat afregnes af årets positive afkast; tab modregnes)\n`;
    text += `   = Nominelt afkast efter PAL (${percentPrecise.format(b.netNominalRate)}): ${b.grossTotal - b.taxAmount >= 0 ? "+" : "−"} ${currency.format(Math.abs(b.grossTotal - b.taxAmount))}\n\n`;

    text += `3. Inflationskorrektion (${percent.format(inflRate)} årlig inflation):\n`;
    text += `   − ${currency.format(Math.abs(b.inflationAmount))} (købekraftstab af formue & afkast)\n`;
    text += `   = Reelt købekraftsafkast (${percentPrecise.format(b.realRate)}): ${afkast >= 0 ? "+" : "−"} ${currency.format(Math.abs(afkast))}\n\n`;

    text += `4. Samlet nettoafkast tilskrevet ${accountName}:\n`;
    text += `   ${b.grossTotal >= 0 ? "" : "− "}${currency.format(Math.abs(b.grossTotal))} (brutto) − ${currency.format(Math.abs(b.taxAmount))} (PAL) − ${currency.format(Math.abs(b.inflationAmount))} (inflation) = ${afkast >= 0 ? "" : "− "}${currency.format(Math.abs(afkast))}`;

    return text;
  }

  function buildAskReturnExample({ nominalReturn, askTaxRate, inflRate, start, contrib, afkast }) {
    const b = calculateReturnBreakdown({ nominalReturn, taxRate: askTaxRate, inflRate, start, contrib, afkast });

    let text = `1. Nominelt bruttoafkast (${percent.format(nominalReturn)}):\n`;
    text += `   • Afkast af investeret primosaldo (${currency.format(start)}): ${b.grossPrimo >= 0 ? "+" : "−"} ${currency.format(Math.abs(b.grossPrimo))}\n`;
    if (contrib > 0) {
      text += `   • Afkast af årets indskud (${currency.format(contrib)}): ${b.grossContrib >= 0 ? "+" : "−"} ${currency.format(Math.abs(b.grossContrib))}\n`;
    }
    text += `   = Samlet bruttoafkast før skat: ${b.grossTotal >= 0 ? "+" : "−"} ${currency.format(Math.abs(b.grossTotal))}\n\n`;

    text += `2. Flad lagerskat på ASK (${percent.format(askTaxRate)}):\n`;
    text += `   − ${currency.format(Math.abs(b.taxAmount))} (fratrækkes årligt i skat)\n`;
    text += `   = Nominelt afkast efter skat (${percentPrecise.format(b.netNominalRate)}): ${b.grossTotal - b.taxAmount >= 0 ? "+" : "−"} ${currency.format(Math.abs(b.grossTotal - b.taxAmount))}\n\n`;

    text += `3. Inflationskorrektion (${percent.format(inflRate)} årlig inflation):\n`;
    text += `   − ${currency.format(Math.abs(b.inflationAmount))} (købekraftstab af formue & afkast)\n`;
    text += `   = Reelt købekraftsafkast (${percentPrecise.format(b.realRate)}): ${afkast >= 0 ? "+" : "−"} ${currency.format(Math.abs(afkast))}\n\n`;

    text += `4. Samlet nettoafkast tilskrevet Aktiesparekontoen:\n`;
    text += `   ${b.grossTotal >= 0 ? "" : "− "}${currency.format(Math.abs(b.grossTotal))} (brutto) − ${currency.format(Math.abs(b.taxAmount))} (skat) − ${currency.format(Math.abs(b.inflationAmount))} (inflation) = ${afkast >= 0 ? "" : "− "}${currency.format(Math.abs(afkast))}`;

    return text;
  }

  function buildFreeFundsReturnExample({ nominalReturn, inflRate, inventoryShare, start, contrib, withdrawal, afkast, annualTax }) {
    const netBase = Math.max(0, start - (withdrawal ?? 0));
    const grossPrimo = Math.round(netBase * nominalReturn);
    const midyearNominal = Math.sqrt(Math.max(0, 1 + nominalReturn)) - 1;
    const grossContrib = contrib > 0 ? Math.round(contrib * midyearNominal) : 0;
    const grossTotal = grossPrimo + grossContrib;
    const taxAmount = annualTax ?? 0;
    const grossRealRate = (1 + nominalReturn) / (1 + inflRate) - 1;
    const inflationAmount = (grossTotal - taxAmount) - afkast;

    let text = `1. Nominelt bruttoafkast før skat (${percent.format(nominalReturn)}):\n`;
    text += `   • Afkast af investeret primosaldo (${currency.format(netBase)}): ${grossPrimo >= 0 ? "+" : "−"} ${currency.format(Math.abs(grossPrimo))}\n`;
    if (contrib > 0) {
      text += `   • Afkast af årets indbetaling (${currency.format(contrib)}): ${grossContrib >= 0 ? "+" : "−"} ${currency.format(Math.abs(grossContrib))}\n`;
    }
    text += `   = Samlet bruttoafkast: ${grossTotal >= 0 ? "+" : "−"} ${currency.format(Math.abs(grossTotal))}\n\n`;

    if (inventoryShare > 0) {
      text += `2. Lagerskat (${percent.format(inventoryShare)} lagerbeskattet):\n`;
      text += `   − ${currency.format(taxAmount)} (afregnes årligt direkte af afkastet)\n`;
      text += `   = Nominelt afkast efter lagerskat: ${currency.format(grossTotal - taxAmount)}\n\n`;
    } else {
      text += `2. Beskatning (100 % realisationsbeskattet):\n`;
      text += `   0 kr. i årlig skat (skatten udskydes til midlerne realiseres/hæves)\n\n`;
    }

    text += `3. Inflationskorrektion (${percent.format(inflRate)} årlig inflation):\n`;
    text += `   − ${currency.format(Math.abs(inflationAmount))} (købekraftstab af formue & afkast)\n`;
    text += `   = Reelt købekraftsafkast (${percentPrecise.format(grossRealRate)}): ${afkast >= 0 ? "+" : "−"} ${currency.format(Math.abs(afkast))}\n\n`;

    text += `4. Nettoafkast tilskrevet frie midler i faste priser:\n`;
    text += `   ${grossTotal >= 0 ? "" : "− "}${currency.format(Math.abs(grossTotal))} (brutto) ${taxAmount > 0 ? `− ${currency.format(taxAmount)} (skat) ` : ""}− ${currency.format(Math.abs(inflationAmount))} (inflation) = ${afkast >= 0 ? "" : "− "}${currency.format(Math.abs(afkast))}`;

    return text;
  }

  function buildReturnRateExample({ nominalReturn, palTaxRate, inflRate }) {
    const palTaxShare = nominalReturn * palTaxRate;
    const netPal = nominalReturn * (1 - palTaxRate);
    const realPension = (1 + netPal) / (1 + inflRate) - 1;
    const inflPensionShare = netPal - realPension;

    const askTaxShare = nominalReturn * 0.17;
    const netAsk = nominalReturn * (1 - 0.17);
    const realAsk = (1 + netAsk) / (1 + inflRate) - 1;
    const inflAskShare = netAsk - realAsk;

    const realGross = (1 + nominalReturn) / (1 + inflRate) - 1;
    const inflGrossShare = nominalReturn - realGross;

    let text = `1. Nominelt formuevægtet afkast før skat:\n   ${percent.format(nominalReturn)}\n\n`;
    text += `2. Pensionsmidler (Ratepension & Aldersopsparing m. 15,3 % PAL-skat):\n   • PAL-skat (15,3 %): − ${percentPrecise.format(palTaxShare)}\n   • Efter PAL: ${percentPrecise.format(netPal)}\n   • Inflationskorrektion (2,0 %): − ${percentPrecise.format(inflPensionShare)}\n   = Reelt købekraftsafkast: ${percentPrecise.format(realPension)}\n\n`;
    text += `3. Aktiesparekonto (17,0 % flad lagerskat):\n   • ASK-skat (17,0 %): − ${percentPrecise.format(askTaxShare)}\n   • Efter ASK-skat: ${percentPrecise.format(netAsk)}\n   • Inflationskorrektion (2,0 %): − ${percentPrecise.format(inflAskShare)}\n   = Reelt købekraftsafkast: ${percentPrecise.format(realAsk)}\n\n`;
    text += `4. Frie midler (Realisationsbeskattet):\n   • Årlig skat: 0 kr. (udskydes til realisation)\n   • Inflationskorrektion (2,0 %): − ${percentPrecise.format(inflGrossShare)}\n   = Brutto realafkast før skat: ${percentPrecise.format(realGross)}\n   • Skat udskydes til realisation/hævning (27 % / 42 %).`;
    return text;
  }

  function buildWithdrawalExample({ row, prevRow, inputs, calculation }) {
    const gross = row.withdrawal ?? 0;
    const tax = row.totalWithdrawalTax ?? 0;
    const net = row.netWithdrawal ?? (gross - tax);
    const desired = row.desiredWithdrawal ?? inputs.desiredAnnualWithdrawal ?? 0;
    const isCouple = inputs.isCouple ?? false;
    const shareThreshold = isCouple ? 158800 : 79400;
    const pensionTaxRate = inputs.pensionWithdrawalTax ?? 0.37;

    const freeWithdrawal = row.freeFundsWithdrawal ?? 0;
    const freeGain = row.realizedFreeFundsGain ?? 0;
    const freeCostBasis = Math.max(0, freeWithdrawal - freeGain);
    const freeTax = row.withdrawalTax ?? 0;
    const gain27 = Math.min(freeGain, shareThreshold);
    const tax27 = Math.round(gain27 * 0.27);
    const gain42 = Math.max(0, freeGain - shareThreshold);
    const tax42 = Math.round(gain42 * 0.42);

    const taxableRate = row.taxableRatePensionWithdrawal ?? 0;
    const taxFreeRate = row.taxFreeRatePensionWithdrawal ?? 0;
    const rateTotal = taxableRate + taxFreeRate;
    const rateTax = Math.round(taxableRate * pensionTaxRate);

    const lifeTotal = row.lifeAnnuityWithdrawal ?? 0;
    const lifeTax = Math.round(lifeTotal * pensionTaxRate);

    const ageSavingsWithdrawal = row.ageSavingsWithdrawal ?? 0;
    const askWithdrawal = row.askWithdrawal ?? Math.max(0, gross - (freeWithdrawal + rateTotal + lifeTotal + ageSavingsWithdrawal));

    let text = `1. Ønsket årligt forbrug:\n`;
    text += `   ${currency.format(desired)} (${inputs.withdrawalAfterTax ? "efter skat i faste priser" : "før skat"})\n\n`;

    text += `2. Hvorfor skal der hæves ${currency.format(gross)} brutto fra depoterne?\n`;
    if (row.phase === "FIRE") {
      text += `   I FIRE-fasen dækkes dit forbrug primært af dine frie investeringsmidler.\n`;
      text += `   Ved salg af frie midler beskattes den realiserede aktiegevinst som aktieindkomst (27 % / 42 %).\n`;
      text += `   For at du kan få udbetalt præcis ${currency.format(net)} rent til forbrug, skal der hæves nok til både at dække dit forbrug og den udløste aktieskat:\n`;
      text += `   ${currency.format(net)} (netto til forbrug) + ${currency.format(tax)} (skat) = ${currency.format(gross)} (brutto hævning).\n\n`;
    } else {
      text += `   For at dække dit forbrugsbehov efter skat på ${currency.format(net)}, skal der hæves ${currency.format(gross)} brutto fra dine depoter for at modsvare skatten på ${currency.format(tax)}:\n`;
      text += `   ${currency.format(net)} (netto til forbrug) + ${currency.format(tax)} (skat) = ${currency.format(gross)} (brutto hævning).\n\n`;
    }

    text += `3. Fordeling af hævningen på konti (${currency.format(gross)} i alt):\n`;
    if (freeWithdrawal > 0) {
      text += `   • Frie midler: ${currency.format(freeWithdrawal)}\n`;
      text += `     - Heraf ubeskattet købesum (hovedstol): ${currency.format(freeCostBasis)} (0 % skat — dine egne indskud)\n`;
      text += `     - Heraf skattepligtig aktiegevinst: ${currency.format(freeGain)}\n`;
    }
    if (rateTotal > 0) {
      text += `   • Ratepension: ${currency.format(rateTotal)}\n`;
      if (taxFreeRate > 0) {
        text += `     - Heraf skattefri udbetaling: ${currency.format(taxFreeRate)}\n`;
        text += `     - Heraf skattepligtig udbetaling: ${currency.format(taxableRate)}\n`;
      }
    }
    if (lifeTotal > 0) {
      text += `   • Livrente: ${currency.format(lifeTotal)} (udbetalt livsvarigt)\n`;
    }
    if (ageSavingsWithdrawal > 0) {
      text += `   • Aldersopsparing: ${currency.format(ageSavingsWithdrawal)} (100 % skattefri ved udbetaling)\n`;
    }
    if (askWithdrawal > 0) {
      text += `   • Aktiesparekonto: ${currency.format(askWithdrawal)} (skattefri ved hævning — løbende lagerbeskattet)\n`;
    }

    text += `\n4. Sådan beregnes den samlede skat på ${currency.format(tax)}:\n`;
    if (freeTax > 0) {
      text += `   • Aktieindkomstskat af frie midler (${currency.format(freeTax)}):\n`;
      text += `     - 27 % af gevinst op til progressionsgrænsen (${currency.format(gain27)}): ${currency.format(tax27)}\n`;
      if (gain42 > 0) {
        text += `     - 42 % af overskydende gevinst over progressionsgrænsen (${currency.format(gain42)}): ${currency.format(tax42)}\n`;
      }
    }
    if (rateTax > 0 || lifeTax > 0) {
      text += `   • Indkomstskat af pensionsudbetalinger (${percent.format(pensionTaxRate)}):\n`;
      if (rateTax > 0) {
        text += `     - Skat af ratepension (${currency.format(taxableRate)} × ${percent.format(pensionTaxRate)}): ${currency.format(rateTax)}\n`;
      }
      if (lifeTax > 0) {
        text += `     - Skat af livrente (${currency.format(lifeTotal)} × ${percent.format(pensionTaxRate)}): ${currency.format(lifeTax)}\n`;
      }
    }
    text += `   = Samlet beregnet skat på hævningen: ${currency.format(tax)}`;

    return text;
  }

  function explainTableCell({ colKey, row, prevRow, calculation, inputs, scenario }) {
    const age = row.age;
    const yearDate = row.date.getFullYear();
    const isFirstYear = !prevRow;
    const palTaxRate = inputs.pensionTax ?? 0.153;
    const askTaxRate = inputs.askTax ?? 0.17;
    const nominalReturn = Number.isFinite(row.averageReturnRate) ? row.averageReturnRate : inputs.returnRate;
    const inflRate = inputs.inflationRate ?? 0.02;

    switch (colKey) {
      case "returnRate": {
        const netNominal = nominalReturn * (1 - palTaxRate);
        const real = (1 + netNominal) / (1 + inflRate) - 1;
        const returnExample = buildReturnRateExample({ nominalReturn, palTaxRate, inflRate });
        return {
          title: `Forventet afkast (${yearDate} · ${age} år)`,
          badge: "Afkast & Rente",
          quickMath: `Nominelt: ${percent.format(nominalReturn)} før skat · ${percentPrecise.format(netNominal)} e. PAL · ${percentPrecise.format(real)} reelt`,
          description: "Viser årets formuevægtede gennemsnitlige afkast på tværs af dine investerede depoter (pension, ASK og frie midler) frem mod næste år.",
          formula: "Realafkast (r) = (1 + Nominelt afkast × (1 − Skat)) / (1 + Inflation) − 1",
          formulaDetails: "Efter PAL-skat (15,3 %) og inflation (2,0 %) opnås et reelt købekraftsafkast i faste priser.",
          returnExample,
          returnExampleNote: "Ovenstående viser hvordan afkastet efter skat og inflation omsættes til reel købekraft på tværs af kontotyper.",
          steps: [
            { label: "Forventet nominelt afkast før skat", value: percent.format(nominalReturn) },
            { label: `Heraf PAL-skat (${percent.format(palTaxRate)})`, value: `− ${percentPrecise.format(nominalReturn * palTaxRate)}`, isSub: true },
            { label: "Pensionsafkast efter PAL-skat", value: percentPrecise.format(netNominal) },
            { label: `Heraf forventet inflation (${percent.format(inflRate)} købekraftstab)`, value: `− ${percentPrecise.format(netNominal - real)}`, isSub: true },
            { label: "Beregnet realafkast på pension", value: percentPrecise.format(real), isResult: true }
          ],
          assumptions: [
            { label: "Grundafkast", value: percent.format(inputs.returnRate) },
            { label: "Defensivt afkast ved pension", value: percent.format(inputs.defensiveReturnRate ?? inputs.returnRate) },
            { label: "Nedtrapningsstrategi", value: calculation.returnStrategy === "none" ? "Ingen (konstant afkast)" : "Glidende nedtrapning" }
          ]
        };
      }

      case "ratePension": {
        const start = row.ratePension;
        if (!prevRow) {
          return {
            title: `Ratepension (${yearDate} · ${age} år)`,
            badge: "Startopsparing",
            quickMath: `Startsaldo: ${currency.format(start)} ved planens start (${age} år)`,
            description: "Din indtastede startopsparing på ratepension ved beregningens begyndelse.",
            formula: "Startsaldo (primo)",
            formulaDetails: "Danner udgangspunkt for videre opsparing, afkast og PAL-beskatning.",
            steps: [
              { label: "Startsaldo indtastet i beregneren", value: currency.format(start), isResult: true }
            ],
            assumptions: [
              { label: "PAL-skat", value: "15,3 %" },
              { label: "Fradragsværdi", value: percent.format(inputs.ratePensionContributionTaxRelief ?? 0.528) }
            ]
          };
        }

        const rows = calculation?.planRows || calculation?.rows;
        let nextRowToUse = null;
        if (Array.isArray(rows)) {
          const idx = rows.findIndex((r) => r.age === row.age && r.date?.getFullYear() === row.date?.getFullYear());
          if (idx >= 0 && idx < rows.length - 1) {
            nextRowToUse = rows[idx + 1];
          }
        }

        const isPensionActive = row.phase === "Opsparing" && row.contribution > 0 && (!calculation.pensionStopRow || row.age <= calculation.pensionStopRow.age);
        const contrib = isPensionActive ? ((calculation.annualDeductibleRatePensionContribution ?? 0) + (calculation.annualNonDeductibleRatePensionContribution ?? 0)) : 0;
        const withdrawal = (row.taxableRatePensionWithdrawal ?? 0) + (row.taxFreeRatePensionWithdrawal ?? 0);
        const netBase = Math.max(0, start - withdrawal);

        const pensionNominal = row.pensionReturnRate ?? nominalReturn;
        const netNominalRate = pensionNominal * (1 - palTaxRate);
        const realRate = (1 + netNominalRate) / (1 + inflRate) - 1;
        const primoReturn = Math.round(netBase * realRate);
        const midyearReal = Math.sqrt(Math.max(0, 1 + realRate)) - 1;
        const contribReturn = contrib > 0 ? Math.round(contrib * midyearReal) : 0;
        const afkast = primoReturn + contribReturn;

        const end = nextRowToUse ? nextRowToUse.ratePension : Math.max(0, Math.round(netBase + contrib + afkast));

        const b = calculateReturnBreakdown({
          nominalReturn: pensionNominal,
          taxRate: palTaxRate,
          inflRate,
          start: netBase,
          contrib,
          afkast
        });

        const returnExample = buildPensionReturnExample({
          nominalReturn: pensionNominal,
          palTaxRate,
          inflRate,
          start: netBase,
          contrib,
          afkast,
          accountName: "ratepensionen"
        });

        const quickMathParts = [`${currency.format(start)} (primo)`];
        if (withdrawal > 0) quickMathParts.push(`− ${currency.format(withdrawal)} (udb.)`);
        if (contrib > 0) quickMathParts.push(`+ ${currency.format(contrib)} (indb.)`);
        quickMathParts.push(afkast >= 0 ? `+ ${currency.format(afkast)} (${percent.format(b.realRate)} realafkast)` : `− ${currency.format(Math.abs(afkast))} (${percent.format(b.realRate)} realtab)`);
        quickMathParts.push(`= ${currency.format(end)} (ultimo)`);

        const steps = [
          { label: `Startsaldo (primo 1. jan ${yearDate})`, value: currency.format(start), note: "Saldo ved årets start (før årets afkast og udbetaling)" }
        ];
        if (withdrawal > 0) {
          steps.push({ label: "Årets ratepensionsudbetaling", value: `− ${currency.format(withdrawal)}`, note: "Udbetales over den valgte udbetalingsperiode" });
        }
        if (contrib > 0) {
          steps.push({ label: "Årets indbetaling", value: `+ ${currency.format(contrib)}`, note: "Fradragsberettiget indbetaling" });
        }
        steps.push({ label: `Nettoafkast e. PAL & inflation (${percent.format(b.realRate)})`, value: afkast >= 0 ? `+ ${currency.format(afkast)}` : `− ${currency.format(Math.abs(afkast))}`, note: pensionNominal < 0 ? "Både negativt kursafkast og inflation reducerer saldoen" : "Krediteret saldoen" });
        steps.push({ label: `Nominelt bruttoafkast (${percent.format(pensionNominal)})`, value: b.grossPrimo >= 0 ? `+ ${currency.format(b.grossPrimo)}` : `− ${currency.format(Math.abs(b.grossPrimo))}`, isSub: true });
        if (contrib > 0) {
          steps.push({ label: "Nominelt bruttoafkast af indbetaling (midtårs)", value: b.grossContrib >= 0 ? `+ ${currency.format(b.grossContrib)}` : `− ${currency.format(Math.abs(b.grossContrib))}`, isSub: true });
        }
        steps.push({ label: `Heraf PAL-skat (${percent.format(palTaxRate)})`, value: b.taxAmount > 0 ? `− ${currency.format(b.taxAmount)}` : "0 kr. (skatteværdi fremføres)", isSub: true });
        steps.push({ label: `Heraf inflationskorrektion (${percent.format(inflRate)} købekraftstab)`, value: `− ${currency.format(Math.abs(b.inflationAmount))}`, isSub: true });
        steps.push({ label: `Slutsaldo (ultimo 31. dec ${yearDate})`, value: `= ${currency.format(end)}`, isResult: true, note: nextRowToUse ? `Overføres som primosaldo til ${yearDate + 1} (${age + 1} år)` : "Slutsaldo ved planens ophør" });

        return {
          title: `Ratepension (${yearDate} · ${age} år)`,
          badge: "Primosaldo (Startsaldo)",
          quickMath: quickMathParts.join(" "),
          description: `Beløbet på ${currency.format(start)} er din primosaldo på ratepension ved årets start (1. januar ${yearDate}). Dette viser saldoen FØR årets forventede afkast (${percent.format(pensionNominal)}) og årets udbetaling (${currency.format(withdrawal)}) finder sted. Resultatet slår igennem ved årets slutning og videreføres som primosaldo til næste række (${yearDate + 1} · ${age + 1} år).`,
          formula: "Ultimo = Primo − Udbetaling + Indbetaling + Nettoafkast (e. PAL & inflation)",
          formulaDetails: `Hvor realafkastet er (${percent.format(pensionNominal)} × (1 − 15,3 %) efter PAL) korrigeret for 2,0 % inflation = ${percentPrecise.format(b.realRate)}.`,
          returnExample,
          returnExampleNote: "Regneeksemplet viser nøjagtigt hvordan afkastet efter PAL-skat og inflation er fremkommet for dette år.",
          steps,
          assumptions: [
            { label: "PAL-skattesats", value: "15,3 %" },
            { label: "Fradragsværdi ved indbetaling", value: percent.format(inputs.ratePensionContributionTaxRelief ?? 0.528) },
            { label: "Skat ved udbetaling", value: percent.format(inputs.pensionWithdrawalTax ?? 0.37) }
          ]
        };
      }

      case "lifeAnnuityDepotValue": {
        const start = row.lifeAnnuityDepotValue;
        const income = row.lifeAnnuityWithdrawal ?? 0;
        if (!prevRow) {
          return {
            title: `Livrentedepot (${yearDate} · ${age} år)`,
            badge: "Livsvarig pension",
            quickMath: `Startsaldo: ${currency.format(start)} ved planens start (${age} år)`,
            description: "Din indtastede startopsparing på livrente ved beregningens begyndelse.",
            formula: "Startsaldo (primo)",
            formulaDetails: "Giver livsvarige udbetalinger fra pensionsalderen.",
            steps: [
              { label: "Startsaldo indtastet i beregneren", value: currency.format(start), isResult: true }
            ],
            assumptions: [
              { label: "Pensionsalder", value: `${inputs.retirementAge} år` }
            ]
          };
        }

        const rows = calculation?.planRows || calculation?.rows;
        let nextRowToUse = null;
        if (Array.isArray(rows)) {
          const idx = rows.findIndex((r) => r.age === row.age && r.date?.getFullYear() === row.date?.getFullYear());
          if (idx >= 0 && idx < rows.length - 1) {
            nextRowToUse = rows[idx + 1];
          }
        }

        const isPensionActive = row.phase === "Opsparing" && row.contribution > 0 && (!calculation.pensionStopRow || row.age <= calculation.pensionStopRow.age);
        const contrib = isPensionActive ? (calculation.annualLifeAnnuityContribution ?? inputs.annualLifeAnnuityContribution ?? 0) : 0;
        const pensionNominal = row.pensionReturnRate ?? nominalReturn;
        const netNominalRate = pensionNominal * (1 - palTaxRate);
        const realRate = (1 + netNominalRate) / (1 + inflRate) - 1;
        const primoReturn = Math.round(start * realRate);
        const midyearReal = Math.sqrt(Math.max(0, 1 + realRate)) - 1;
        const contribReturn = contrib > 0 ? Math.round(contrib * midyearReal) : 0;
        const afkast = primoReturn + contribReturn;

        const end = nextRowToUse ? nextRowToUse.lifeAnnuityDepotValue : (row.phase === "Pension" ? start : Math.max(0, Math.round(start + contrib + afkast)));

        const b = calculateReturnBreakdown({
          nominalReturn: pensionNominal,
          taxRate: palTaxRate,
          inflRate,
          start,
          contrib,
          afkast
        });

        let returnExample = null;
        if (row.phase === "Opsparing") {
          returnExample = buildPensionReturnExample({
            nominalReturn: pensionNominal,
            palTaxRate,
            inflRate,
            start,
            contrib,
            afkast,
            accountName: "livrentedepotet"
          });
        }

        const steps = [
          { label: `Startsaldo (primo 1. jan ${yearDate})`, value: currency.format(start), note: "Saldo ved årets start" }
        ];
        if (contrib > 0) {
          steps.push({ label: "Årets indbetaling", value: `+ ${currency.format(contrib)}`, note: "Indskud på livrente" });
        }
        if (row.phase === "Opsparing") {
          steps.push({ label: `Nettoafkast e. PAL & inflation (${percent.format(b.realRate)})`, value: afkast >= 0 ? `+ ${currency.format(afkast)}` : `− ${currency.format(Math.abs(afkast))}`, note: pensionNominal < 0 ? "Både negativt kursafkast og inflation reducerer saldoen" : "Krediteret saldoen" });
          steps.push({ label: `Nominelt bruttoafkast af primosaldo (${percent.format(pensionNominal)})`, value: b.grossPrimo >= 0 ? `+ ${currency.format(b.grossPrimo)}` : `− ${currency.format(Math.abs(b.grossPrimo))}`, isSub: true });
          if (contrib > 0) {
            steps.push({ label: "Nominelt bruttoafkast af indbetaling (midtårs)", value: b.grossContrib >= 0 ? `+ ${currency.format(b.grossContrib)}` : `− ${currency.format(Math.abs(b.grossContrib))}`, isSub: true });
          }
          steps.push({ label: `Heraf PAL-skat (${percent.format(palTaxRate)})`, value: b.taxAmount > 0 ? `− ${currency.format(b.taxAmount)}` : "0 kr. (skatteværdi fremføres)", isSub: true });
          steps.push({ label: `Heraf inflationskorrektion (${percent.format(inflRate)} købekraftstab)`, value: `− ${currency.format(Math.abs(b.inflationAmount))}`, isSub: true });
        } else {
          steps.push({ label: "Årlig livrenteudbetaling", value: income > 0 ? `− ${currency.format(income)}` : "0 kr." });
          steps.push({ label: "Aktuarmæssig regulering (afkast & restlevetid)", value: (end - start + income) >= 0 ? `+ ${currency.format(end - start + income)}` : `− ${currency.format(Math.abs(end - start + income))}` });
        }
        steps.push({ label: `Slutsaldo (ultimo 31. dec ${yearDate})`, value: `= ${currency.format(end)}`, isResult: true, note: nextRowToUse ? `Overføres som primosaldo til ${yearDate + 1} (${age + 1} år)` : "Slutværdi ved planens ophør" });

        return {
          title: `Livrentedepot (${yearDate} · ${age} år)`,
          badge: "Primosaldo (Startsaldo)",
          quickMath: income > 0 ? `Beregnet depotværdi: ${currency.format(start)} · Giver ${currency.format(income)}/år livsvarigt` : `${currency.format(start)} ${contrib > 0 ? `+ ${currency.format(contrib)} (indb.) ` : ""}${afkast >= 0 ? `+ ${currency.format(afkast)} (${percent.format(b.realRate)} realafkast)` : `− ${currency.format(Math.abs(afkast))} (${percent.format(b.realRate)} realtab)`} = ${currency.format(end)}`,
          description: row.phase === "Pension" ? "Livrenten udbetales livsvarigt fra pensionsalderen uanset alder. Depotværdien viser den aktuarmæssige nutidsværdi af de resterende livsvarige udbetalinger." : `Beløbet på ${currency.format(start)} er din primosaldo på livrentedepotet ved årets start (1. januar ${yearDate}). Dette viser saldoen FØR årets forventede afkast (${percent.format(pensionNominal)}) og eventuelle indskud finder sted.`,
          formula: row.phase === "Pension" ? "Nutidsværdi = Årlig udbetaling × Aktuarmæssig annuitetsfaktor for restlevetid" : "Ultimo = Primo + Indskud + Nettoafkast (e. PAL & inflation)",
          formulaDetails: `Hvor realafkastet er (${percent.format(pensionNominal)} × (1 − 15,3 %) efter PAL) korrigeret for 2,0 % inflation = ${percentPrecise.format(b.realRate)}.`,
          returnExample,
          returnExampleNote: row.phase === "Opsparing" ? "Regneeksemplet viser nøjagtigt hvordan afkastet er tilskrevet i opsparingsfasen." : "I udbetalingsfasen opgøres depotet ud fra levetidsmodellen.",
          steps,
          assumptions: [
            { label: "PAL-skattesats", value: "15,3 %" },
            { label: "Skat ved udbetaling", value: percent.format(inputs.pensionWithdrawalTax ?? 0.37) },
            { label: "Udbetalingsprincip", value: "Livsvarig udbetaling (ophører ved død)" }
          ]
        };
      }

      case "lifeAnnuityWithdrawal": {
        const val = row.lifeAnnuityWithdrawal ?? 0;
        return {
          title: `Livrenteudbetaling (${yearDate} · ${age} år)`,
          badge: "Pensionsudbetaling",
          quickMath: val > 0 ? `${currency.format(val)} før skat (${currency.format(val * (1 - (inputs.pensionWithdrawalTax ?? 0.37)))} efter skat)` : "Ingen udbetaling før pensionsalder",
          description: "Den garanterede/forventede livsvarige årlige indtægt fra din livrente. Udbetales hver måned/år fra folkepensionsalderen så længe du lever.",
          formula: "Netto livrente = Brutto livrente × (1 − Personlig trækprocent)",
          formulaDetails: "Beskattes som personlig indkomst (typisk ca. 37 % uden AM-bidrag).",
          steps: [
            { label: "Brutto udbetaling", value: currency.format(val) },
            { label: `Beregnet indkomstskat (${percent.format(inputs.pensionWithdrawalTax ?? 0.37)})`, value: `− ${currency.format(val * (inputs.pensionWithdrawalTax ?? 0.37))}` },
            { label: "Udbetalt til forbrug efter skat", value: `= ${currency.format(val * (1 - (inputs.pensionWithdrawalTax ?? 0.37)))}`, isResult: true }
          ],
          assumptions: [
            { label: "Pensionsskat", value: percent.format(inputs.pensionWithdrawalTax ?? 0.37) },
            { label: "Folkepensionsalder", value: `${inputs.retirementAge} år` }
          ]
        };
      }

      case "ageSavings": {
        const start = row.ageSavings;
        if (!prevRow) {
          return {
            title: `Aldersopsparing (${yearDate} · ${age} år)`,
            badge: "Startopsparing",
            quickMath: `Startsaldo: ${currency.format(start)} ved planens start (${age} år)`,
            description: "Din indtastede startopsparing på aldersopsparing ved beregningens begyndelse.",
            formula: "Startsaldo (primo)",
            formulaDetails: "Opsparing med skattefri udbetaling og 15,3 % PAL-skat.",
            steps: [
              { label: "Startsaldo indtastet i beregneren", value: currency.format(start), isResult: true }
            ],
            assumptions: [
              { label: "PAL-skat", value: "15,3 %" },
              { label: "Beskatning ved udbetaling", value: "0 kr. (100 % skattefri)" }
            ]
          };
        }

        const rows = calculation?.planRows || calculation?.rows;
        let nextRowToUse = null;
        if (Array.isArray(rows)) {
          const idx = rows.findIndex((r) => r.age === row.age && r.date?.getFullYear() === row.date?.getFullYear());
          if (idx >= 0 && idx < rows.length - 1) {
            nextRowToUse = rows[idx + 1];
          }
        }

        const isPensionActive = row.phase === "Opsparing" && row.contribution > 0 && (!calculation.pensionStopRow || row.age <= calculation.pensionStopRow.age);
        const contrib = isPensionActive ? (calculation.effectiveAnnualAgeSavingsContribution ?? inputs.annualAgeSavingsContribution ?? 0) : 0;
        const withdrawal = row.ageSavingsWithdrawal ?? ((row.phase === "Pension" && nextRowToUse && nextRowToUse.ageSavings < start) ? Math.max(0, start - nextRowToUse.ageSavings) : 0);
        const netBase = Math.max(0, start - withdrawal);

        const pensionNominal = row.pensionReturnRate ?? nominalReturn;
        const netNominalRate = pensionNominal * (1 - palTaxRate);
        const realRate = (1 + netNominalRate) / (1 + inflRate) - 1;
        const primoReturn = Math.round(netBase * realRate);
        const midyearReal = Math.sqrt(Math.max(0, 1 + realRate)) - 1;
        const contribReturn = contrib > 0 ? Math.round(contrib * midyearReal) : 0;
        const afkast = primoReturn + contribReturn;

        const end = nextRowToUse ? nextRowToUse.ageSavings : Math.max(0, Math.round(netBase + contrib + afkast));

        const b = calculateReturnBreakdown({
          nominalReturn: pensionNominal,
          taxRate: palTaxRate,
          inflRate,
          start: netBase,
          contrib,
          afkast
        });

        const returnExample = buildPensionReturnExample({
          nominalReturn: pensionNominal,
          palTaxRate,
          inflRate,
          start: netBase,
          contrib,
          afkast,
          accountName: "aldersopsparingen"
        });

        const quickMathParts = [`${currency.format(start)} (primo)`];
        if (withdrawal > 0) quickMathParts.push(`− ${currency.format(withdrawal)} (udb.)`);
        if (contrib > 0) quickMathParts.push(`+ ${currency.format(contrib)} (indb.)`);
        quickMathParts.push(afkast >= 0 ? `+ ${currency.format(afkast)} (${percent.format(b.realRate)} realafkast)` : `− ${currency.format(Math.abs(afkast))} (${percent.format(b.realRate)} realtab)`);
        quickMathParts.push(`= ${currency.format(end)} (ultimo)`);

        const steps = [
          { label: `Startsaldo (primo 1. jan ${yearDate})`, value: currency.format(start), note: "Saldo ved årets start (før årets afkast og udbetaling)" }
        ];
        if (withdrawal > 0) {
          steps.push({ label: "Årets aldersopsparingsudbetaling", value: `− ${currency.format(withdrawal)}`, note: "100 % skattefri udbetaling" });
        }
        if (contrib > 0) {
          steps.push({ label: "Årets indbetaling", value: `+ ${currency.format(contrib)}`, note: "Indskud på aldersopsparing" });
        }
        steps.push({ label: `Nettoafkast e. PAL & inflation (${percent.format(b.realRate)})`, value: afkast >= 0 ? `+ ${currency.format(afkast)}` : `− ${currency.format(Math.abs(afkast))}`, note: pensionNominal < 0 ? "Både negativt kursafkast og inflation reducerer saldoen" : "Krediteret saldoen" });
        steps.push({ label: `Nominelt bruttoafkast (${percent.format(pensionNominal)})`, value: b.grossPrimo >= 0 ? `+ ${currency.format(b.grossPrimo)}` : `− ${currency.format(Math.abs(b.grossPrimo))}`, isSub: true });
        if (contrib > 0) {
          steps.push({ label: "Nominelt bruttoafkast af indbetaling (midtårs)", value: b.grossContrib >= 0 ? `+ ${currency.format(b.grossContrib)}` : `− ${currency.format(Math.abs(b.grossContrib))}`, isSub: true });
        }
        steps.push({ label: `Heraf PAL-skat (${percent.format(palTaxRate)})`, value: b.taxAmount > 0 ? `− ${currency.format(b.taxAmount)}` : "0 kr. (skatteværdi fremføres)", isSub: true });
        steps.push({ label: `Heraf inflationskorrektion (${percent.format(inflRate)} købekraftstab)`, value: `− ${currency.format(Math.abs(b.inflationAmount))}`, isSub: true });
        steps.push({ label: `Slutsaldo (ultimo 31. dec ${yearDate})`, value: `= ${currency.format(end)}`, isResult: true, note: nextRowToUse ? `Overføres som primosaldo til ${yearDate + 1} (${age + 1} år)` : "Slutsaldo ved planens ophør" });

        return {
          title: `Aldersopsparing (${yearDate} · ${age} år)`,
          badge: "Primosaldo (Startsaldo)",
          quickMath: quickMathParts.join(" "),
          description: `Beløbet på ${currency.format(start)} er din primosaldo på aldersopsparing ved årets start (1. januar ${yearDate}). Dette viser saldoen FØR årets forventede afkast (${percent.format(pensionNominal)}) og eventuelle udbetalinger finder sted. Resultatet slår igennem ved årets slutning og videreføres som primosaldo til næste række (${yearDate + 1} · ${age + 1} år).`,
          formula: "Ultimo = Primo − Udbetaling + Indskud + Nettoafkast (e. PAL & inflation)",
          formulaDetails: `Hvor realafkastet er (${percent.format(pensionNominal)} × (1 − 15,3 %) efter PAL) korrigeret for 2,0 % inflation = ${percentPrecise.format(b.realRate)}.`,
          returnExample,
          returnExampleNote: "Regneeksemplet viser nøjagtigt hvordan afkastet på hhv. startformue og indbetaling er fremkommet for dette år.",
          steps,
          assumptions: [
            { label: "PAL-skat", value: "15,3 %" },
            { label: "Beskatning ved hævning", value: "0 kr. (100 % skattefri)" },
            { label: "Modregning i folkepension", value: "Ingen modregning" }
          ]
        };
      }

      case "freeFunds": {
        const stockVal = row.freeFunds;
        const cashBal = row.cash ?? 0;
        const totalLiquid = stockVal + cashBal;
        const cashShare = row.cashShare ?? (totalLiquid > 0 ? cashBal / totalLiquid : 0);
        const cashSharePct = (cashShare * 100).toFixed(1).replace(/\.0$/, "");
        const stockSharePct = ((1 - cashShare) * 100).toFixed(1).replace(/\.0$/, "");
        const hasCashAllocation = cashBal > 0 || cashShare > 0.0001;

        if (!prevRow) {
          if (hasCashAllocation) {
            return {
              title: `Frie midler (Aktiedepot) (${yearDate} · ${age} år)`,
              badge: "Investeret aktiedel",
              quickMath: `Aktiedepot: ${currency.format(stockVal)} (${stockSharePct} % af samlede frie midler ${currency.format(totalLiquid)})`,
              description: `Dine investerede frie midler på aktiedepotet ved planens start. Ud af dine samlede frie midler på ${currency.format(totalLiquid)} er ${stockSharePct} % (${currency.format(stockVal)}) investeret i aktier for at opnå investeringsafkast, mens de resterende ${cashSharePct} % (${currency.format(cashBal)}) er allokeret til en sikker kontantreserve i banken (se kolonnen 'Kontantreserve'). Tilsammen giver de to beløb præcis dine indtastede frie midler på ${currency.format(totalLiquid)}.`,
              formula: `Aktiedepot = Samlede frie midler − Kontantreserve i banken\n= ${currency.format(totalLiquid)} − ${currency.format(cashBal)} (${cashSharePct} %) = ${currency.format(stockVal)} (${stockSharePct} %)`,
              formulaDetails: `Dine indtastede frie midler (${currency.format(totalLiquid)}) opdeles automatisk i en investeret aktiedel (${currency.format(stockVal)}) og en likvid kontantreserve i banken (${currency.format(cashBal)}).`,
              steps: [
                { label: "Indtastede samlede frie midler", value: currency.format(totalLiquid) },
                { label: `Fratrukket kontantreserve i banken (${cashSharePct} %)`, value: `− ${currency.format(cashBal)}`, note: "Placeret i kolonnen 'Kontantreserve' som likviditetsbuffer" },
                { label: `Investeret i aktiedepot (${stockSharePct} %)`, value: `= ${currency.format(stockVal)}`, isResult: true }
              ],
              assumptions: [
                { label: "Indtastede frie midler", value: currency.format(totalLiquid) },
                { label: "Kontantreserve i banken (start)", value: `${currency.format(cashBal)} (${cashSharePct} %)` },
                { label: "Investeret i aktier (start)", value: `${currency.format(stockVal)} (${stockSharePct} %)` },
                { label: "Beskatningsform", value: inputs.freeFundsInventoryShare > 0 ? `${percent.format(inputs.freeFundsInventoryShare)} lagerbeskattet` : "Realisationsbeskattet" },
                { label: "Aktieskattesatser", value: "27 % / 42 %" }
              ]
            };
          }

          return {
            title: `Frie midler (${yearDate} · ${age} år)`,
            badge: "Likvid formue",
            quickMath: `Startsaldo: ${currency.format(stockVal)} ved planens start (${age} år)`,
            description: "Din indtastede startopsparing i frie midler ved beregningens begyndelse.",
            formula: "Startsaldo (primo)",
            formulaDetails: "Likvide midler der kan investeres og hæves frit til FIRE-broen.",
            steps: [
              { label: "Startsaldo indtastet i beregneren", value: currency.format(stockVal), isResult: true }
            ],
            assumptions: [
              { label: "Beskatningsform", value: inputs.freeFundsInventoryShare > 0 ? `${percent.format(inputs.freeFundsInventoryShare)} lagerbeskattet` : "Realisationsbeskattet" },
              { label: "Aktieskattesatser", value: "27 % / 42 %" }
            ]
          };
        }
        // For all subsequent projection years:
        // row.freeFunds is the PRIMOSALDO (start of year yearDate, e.g. 1. jan 2027)
        const start = row.freeFunds;
        const rows = calculation?.planRows || calculation?.rows;
        let nextRowToUse = null;
        if (Array.isArray(rows)) {
          const idx = rows.findIndex((r) => r.age === row.age && r.date?.getFullYear() === row.date?.getFullYear());
          if (idx >= 0 && idx < rows.length - 1) {
            nextRowToUse = rows[idx + 1];
          }
        }

        const isPensionActive = row.phase === "Opsparing" && row.contribution > 0 && (!calculation.pensionStopRow || row.age <= calculation.pensionStopRow.age);
        const rateContrib = isPensionActive ? ((calculation.annualDeductibleRatePensionContribution ?? 0) + (calculation.annualNonDeductibleRatePensionContribution ?? 0)) : 0;
        const lifeContrib = isPensionActive ? (calculation.annualLifeAnnuityContribution ?? inputs.annualLifeAnnuityContribution ?? 0) : 0;
        const ageContrib = isPensionActive ? (calculation.effectiveAnnualAgeSavingsContribution ?? inputs.annualAgeSavingsContribution ?? 0) : 0;
        const askCap = calculation.askDepositCap ?? 174200;
        const askContrib = (row.phase === "Opsparing" && row.contribution > 0 && row.ask < askCap) ? Math.min(inputs.annualAskContribution ?? 0, Math.max(0, askCap - row.ask)) : 0;
        const contrib = row.phase === "Opsparing" && row.contribution > 0 ? Math.max(0, row.contribution - (rateContrib + lifeContrib + ageContrib + askContrib)) : 0;
        const withdrawal = row.freeFundsWithdrawal ?? (row.phase !== "Opsparing" ? Math.max(0, row.withdrawal - ((row.taxableRatePensionWithdrawal ?? 0) + (row.taxFreeRatePensionWithdrawal ?? 0) + (row.lifeAnnuityWithdrawal ?? 0))) : 0);

        const freeNominal = row.freeFundsReturnRate ?? nominalReturn;
        const grossRealRate = (1 + freeNominal) / (1 + inflRate) - 1;
        const netBase = Math.max(0, start - withdrawal);
        const primoReturn = Math.round(netBase * grossRealRate);
        const midyearReal = Math.sqrt(Math.max(0, 1 + grossRealRate)) - 1;
        const contribReturn = contrib > 0 ? Math.round(contrib * midyearReal) : 0;
        const afkast = primoReturn + contribReturn;
        const annualTax = row.annualFreeFundsTax ?? 0;
        const inventoryShare = inputs.freeFundsInventoryShare ?? 0;

        const grossPrimo = Math.round(netBase * freeNominal);
        const midyearNominal = Math.sqrt(Math.max(0, 1 + freeNominal)) - 1;
        const grossContrib = contrib > 0 ? Math.round(contrib * midyearNominal) : 0;
        const grossTotal = grossPrimo + grossContrib;
        const taxAmount = annualTax;
        const inflationAmount = (grossTotal - taxAmount) - afkast;

        const end = nextRowToUse ? nextRowToUse.freeFunds : Math.max(0, Math.round(netBase + contrib + afkast));

        const returnExample = buildFreeFundsReturnExample({
          nominalReturn: freeNominal,
          inflRate,
          inventoryShare,
          start,
          contrib,
          withdrawal,
          afkast,
          annualTax
        });

        const quickMathParts = [`${currency.format(start)} (primo)`];
        if (withdrawal > 0) quickMathParts.push(`− ${currency.format(withdrawal)} (hævning)`);
        if (contrib > 0) quickMathParts.push(`+ ${currency.format(contrib)} (indb.)`);
        quickMathParts.push(afkast >= 0 ? `+ ${currency.format(afkast)} (${percent.format(grossRealRate)} realafkast)` : `− ${currency.format(Math.abs(afkast))} (${percent.format(grossRealRate)} realtab)`);
        quickMathParts.push(`= ${currency.format(end)} (ultimo)`);

        const steps = [
          { label: `Startsaldo (primo 1. jan ${yearDate})`, value: currency.format(start), note: "Saldo ved årets start (før årets afkast og hævning)" }
        ];
        if (withdrawal > 0) {
          steps.push({ label: "Hævet til forbrug (FIRE-bro)", value: `− ${currency.format(withdrawal)}`, note: "Hæves til årets forbrug" });
        }
        if (contrib > 0) {
          steps.push({ label: "Nettobidrag til frie midler", value: `+ ${currency.format(contrib)}`, note: "Indbetaling i opsparingsfasen" });
        }
        steps.push({ label: `Nettoafkast i faste priser (${percent.format(grossRealRate)})`, value: afkast >= 0 ? `+ ${currency.format(afkast)}` : `− ${currency.format(Math.abs(afkast))}`, note: freeNominal < 0 ? "Både negativt kursafkast og inflation reducerer købekraften" : "I faste købekraftspriser" });
        steps.push({ label: `Nominelt bruttoafkast (${percent.format(freeNominal)})`, value: grossPrimo >= 0 ? `+ ${currency.format(grossPrimo)}` : `− ${currency.format(Math.abs(grossPrimo))}`, isSub: true });
        if (contrib > 0) {
          steps.push({ label: "Nominelt bruttoafkast af indbetaling (midtårs)", value: grossContrib >= 0 ? `+ ${currency.format(grossContrib)}` : `− ${currency.format(Math.abs(grossContrib))}`, isSub: true });
        }
        if (taxAmount > 0) {
          steps.push({ label: `Heraf lagerskat (${percent.format(inventoryShare)} lagerbeskattet)`, value: `− ${currency.format(taxAmount)}`, isSub: true });
        } else if (inventoryShare === 0) {
          steps.push({ label: "Heraf skat (100 % realisationsbeskattet)", value: "0 kr.", note: "Udskydes til realisation", isSub: true });
        }
        steps.push({ label: `Heraf inflationskorrektion (${percent.format(inflRate)} købekraftstab)`, value: `− ${currency.format(Math.abs(inflationAmount))}`, isSub: true });

        const rebalance = nextRowToUse ? Math.round(end - (netBase + contrib + afkast)) : 0;
        if (Math.abs(rebalance) > 50) {
          steps.push({
            label: rebalance > 0 ? "Tilført fra kontantreserve (rebalancering)" : "Overført til kontantreserve (rebalancering)",
            value: rebalance > 0 ? `+ ${currency.format(rebalance)}` : `− ${currency.format(Math.abs(rebalance))}`,
            note: "Justering mod målsat kontantandel ved årets afslutning"
          });
        }

        steps.push({
          label: `Slutsaldo (ultimo 31. dec ${yearDate})`,
          value: `= ${currency.format(end)}`,
          isResult: true,
          note: nextRowToUse ? `Overføres som primosaldo til ${yearDate + 1} (${age + 1} år)` : "Slutreserve ved planens afslutning"
        });

        return {
          title: `Frie midler (${yearDate} · ${age} år)`,
          badge: "Primosaldo (Startsaldo)",
          quickMath: quickMathParts.join(" "),
          description: `Beløbet på ${currency.format(start)} er din primosaldo ved årets start (1. januar ${yearDate}). Dette viser formuen FØR årets forventede afkast (${percent.format(freeNominal)}) og årets udbetaling (${currency.format(withdrawal)}) finder sted. Resultatet af årets afkast og hævninger slår igennem ved årets slutning og videreføres som primosaldo til næste række (${yearDate + 1} · ${age + 1} år).`,
          formula: "Ultimo = Primo − Hævning + Indbetaling + Nettoafkast (e. skat & inflation) ± Rebalancering",
          formulaDetails: `Hvor brutto realafkast er (${percent.format(freeNominal)} korrigeret for 2,0 % inflation) = ${percentPrecise.format(grossRealRate)}.`,
          returnExample,
          returnExampleNote: "Regneeksemplet viser forrentningen og inflationskorrektionen for dette specifikke år.",
          steps,
          assumptions: [
            ...(row.cash > 0 ? [{ label: "Samlet fri formue primo (aktier + bank)", value: `${currency.format(start + row.cash)} (heraf ${currency.format(row.cash)} kontant)` }] : []),
            { label: "Beskatningsform", value: inputs.freeFundsInventoryShare > 0 ? `${percent.format(inputs.freeFundsInventoryShare)} lagerbeskattet` : "Realisationsbeskattet" },
            { label: "Aktieskattesatser", value: "27 % / 42 %" },
            { label: "Status for par", value: inputs.isCouple ? "Gift/Samlevende (Dobbelt bundgrænse)" : "Enlig" }
          ]
        };
      }

      case "ask": {
        if (!prevRow) {
          const end = row.ask;
          return {
            title: `Aktiesparekonto (${yearDate} · ${age} år)`,
            badge: "Lav skat (17 %)",
            quickMath: `Startsaldo: ${currency.format(end)} ved planens start (${age} år)`,
            description: "Din indtastede startopsparing på Aktiesparekontoen ved beregningens begyndelse.",
            formula: "Startsaldo (primo)",
            formulaDetails: "Beskattes med 17 % flad lagerskat.",
            steps: [
              { label: "Startsaldo indtastet i beregneren", value: currency.format(end), isResult: true }
            ],
            assumptions: [
              { label: "Skattesats", value: "17,0 % (flad lagerskat)" },
              { label: "Indskudsloft (2026)", value: inputs.isCouple ? "348.400 kr. (Par)" : "174.200 kr. (Enlig)" }
            ]
          };
        }

        // For all subsequent projection years:
        // row.ask is the PRIMOSALDO (start of year yearDate, e.g. 1. jan 2027)
        const start = row.ask;
        const rows = calculation?.planRows || calculation?.rows;
        let nextRowToUse = null;
        if (Array.isArray(rows)) {
          const idx = rows.findIndex((r) => r.age === row.age && r.date?.getFullYear() === row.date?.getFullYear());
          if (idx >= 0 && idx < rows.length - 1) {
            nextRowToUse = rows[idx + 1];
          }
        }

        const askCap = calculation.askDepositCap ?? (inputs.isCouple ? 348400 : 174200);
        const contrib = (row.phase === "Opsparing" && row.contribution > 0 && start < askCap)
          ? Math.min(inputs.annualAskContribution ?? 0, Math.max(0, askCap - start))
          : 0;
        const withdrawal = row.askWithdrawal ?? (row.phase !== "Opsparing" && nextRowToUse && nextRowToUse.ask < start ? Math.max(0, start - nextRowToUse.ask) : 0);

        const freeNominal = row.freeFundsReturnRate ?? nominalReturn;
        const askRealRate = (1 + freeNominal * (1 - askTaxRate)) / (1 + inflRate) - 1;
        const netBase = Math.max(0, start - withdrawal);
        const primoReturn = Math.round(netBase * askRealRate);
        const midyearReal = Math.sqrt(Math.max(0, 1 + askRealRate)) - 1;
        const contribReturn = contrib > 0 ? Math.round(contrib * midyearReal) : 0;
        const afkast = primoReturn + contribReturn;

        const end = nextRowToUse ? nextRowToUse.ask : Math.max(0, Math.round(netBase + contrib + afkast));

        const b = calculateReturnBreakdown({
          nominalReturn: freeNominal,
          taxRate: askTaxRate,
          inflRate,
          start: netBase,
          contrib,
          afkast
        });
        const returnExample = buildAskReturnExample({
          nominalReturn: freeNominal,
          askTaxRate,
          inflRate,
          start: netBase,
          contrib,
          afkast
        });

        const quickMathParts = [`${currency.format(start)} (primo)`];
        if (withdrawal > 0) quickMathParts.push(`− ${currency.format(withdrawal)} (hævning)`);
        if (contrib > 0) quickMathParts.push(`+ ${currency.format(contrib)} (indb.)`);
        quickMathParts.push(afkast >= 0 ? `+ ${currency.format(afkast)} (${percent.format(askRealRate)} realafkast)` : `− ${currency.format(Math.abs(afkast))} (${percent.format(askRealRate)} realtab)`);
        quickMathParts.push(`= ${currency.format(end)} (ultimo)`);

        const steps = [
          { label: `Startsaldo (primo 1. jan ${yearDate})`, value: currency.format(start), note: "Saldo ved årets start (før årets afkast og hævning)" }
        ];
        if (withdrawal > 0) {
          steps.push({ label: "Hævet til forbrug (FIRE-bro)", value: `− ${currency.format(withdrawal)}` });
        }
        if (contrib > 0) {
          steps.push({ label: "Årets indbetaling", value: `+ ${currency.format(contrib)}`, note: "Indskud op til indskudsloft" });
        }
        steps.push({
          label: `Nettoafkast e. 17 % skat & inflation (${percent.format(askRealRate)})`,
          value: afkast >= 0 ? `+ ${currency.format(afkast)}` : `− ${currency.format(Math.abs(afkast))}`,
          note: freeNominal < 0 ? "Både negativt kursafkast og inflation reducerer købekraften" : "Krediteret saldoen"
        });
        steps.push({ label: `Nominelt bruttoafkast (${percent.format(freeNominal)})`, value: b.grossTotal >= 0 ? `+ ${currency.format(b.grossTotal)}` : `− ${currency.format(Math.abs(b.grossTotal))}`, isSub: true });
        steps.push({ label: `Heraf ASK-lagerskat (${percent.format(askTaxRate)} af bruttoafkast)`, value: b.taxAmount > 0 ? `− ${currency.format(b.taxAmount)}` : "0 kr.", isSub: true });
        steps.push({ label: `Heraf inflationskorrektion (${percent.format(inflRate)} købekraftstab)`, value: `− ${currency.format(Math.abs(b.inflationAmount))}`, isSub: true });
        steps.push({
          label: `Slutsaldo (ultimo 31. dec ${yearDate})`,
          value: `= ${currency.format(end)}`,
          isResult: true,
          note: nextRowToUse ? `Overføres som primosaldo til ${yearDate + 1} (${age + 1} år)` : "Slutreserve ved planens afslutning"
        });

        return {
          title: `Aktiesparekonto (${yearDate} · ${age} år)`,
          badge: "Primosaldo (Startsaldo)",
          quickMath: quickMathParts.join(" "),
          description: `Beløbet på ${currency.format(start)} er din saldo ved årets start (1. januar ${yearDate}). Dette viser formuen FØR årets afkast (${percent.format(freeNominal)}) og eventuelle hævninger finder sted. Resultatet efter 17 % flad lagerskat og inflation videreføres som primosaldo til næste række (${yearDate + 1} · ${age + 1} år).`,
          formula: "Ultimo = Primo − Hævning + Indskud + Nettoafkast (e. 17 % skat & inflation)",
          formulaDetails: `Hvor realafkastet er (${percent.format(freeNominal)} × (1 − 17,0 %) efter skat) korrigeret for 2,0 % inflation = ${percentPrecise.format(askRealRate)}.`,
          returnExample,
          returnExampleNote: "Regneeksemplet viser nøjagtigt hvordan afkastet efter 17 % flad lagerskat og inflation er fremkommet.",
          steps,
          assumptions: [
            { label: "Skattesats", value: "17,0 % (flad lagerskat)" },
            { label: "Indskudsloft (2026)", value: inputs.isCouple ? "348.400 kr. (Par)" : "174.200 kr. (Enlig)" }
          ]
        };
      }

      case "cash": {
        const start = row.cash ?? 0;
        const totalLiquidFree = (row.freeFunds ?? 0) + start;
        const cashSharePct = ((row.cashShare ?? (totalLiquidFree > 0 ? start / totalLiquidFree : 0)) * 100).toFixed(1);
        const cashRate = row.cashInterestRate ?? inputs.cashInterestRate ?? 0.015;
        const cashTax = inputs.cashInterestTax ?? 0.37;
        const hasGlide = Number.isFinite(inputs.cashShareStart) || (Array.isArray(inputs.annualCashShares) && inputs.annualCashShares.some((s) => Number.isFinite(s)));
        const rowYear = Math.max(0, age - inputs.currentAge);
        const isCustomCash = (Array.isArray(inputs.annualCashShares) && Number.isFinite(inputs.annualCashShares[rowYear])) || (Array.isArray(inputs.annualCashInterestRates) && Number.isFinite(inputs.annualCashInterestRates[rowYear]));

        if (!prevRow) {
          return {
            title: `Kontantreserve / Bank (${yearDate} · ${age} år)`,
            badge: isCustomCash ? "Justeret i matrix" : "Sikker likviditet",
            quickMath: `Startsaldo: ${currency.format(start)} (${cashSharePct} % af frie midler)`,
            description: hasGlide
              ? `Din kontantreserve udgør ${cashSharePct} % af dine samlede frie midler (${currency.format(totalLiquidFree)}). Den er konfigureret til at starte på ${inputs.cashShareStart ?? cashSharePct} % og stige mod ${inputs.cashShareTarget ?? cashSharePct} % ved pension.`
              : "Din indtastede startopsparing i kontantreserve/bankindestående. Forrentes med en fast bankrente og fungerer som sikker buffer.",
            formula: hasGlide ? `Startsaldo = Frie midler × Kontantandel (${cashSharePct} %)` : "Startsaldo (primo)",
            formulaDetails: `Forrentes med ${percent.format(cashRate)} før skat. Renteindtægter beskattes med ${percent.format(cashTax)} som kapitalindkomst.`,
            steps: [
              { label: "Samlede frie midler (aktier + bank)", value: currency.format(totalLiquidFree) },
              ...(hasGlide ? [{ label: `Kontantandel ved start (${inputs.cashShareStart ?? cashSharePct} %)`, value: `${cashSharePct} %`, isSub: true }] : []),
              { label: "Startsaldo i kontantreserve", value: currency.format(start), isResult: true }
            ],
            assumptions: [
              { label: "Kontantandel ved start", value: `${inputs.cashShareStart ?? cashSharePct} %` },
              { label: "Rente på kontantreserve", value: percent.format(cashRate) },
              { label: "Beskatning (kapitalindkomst)", value: percent.format(cashTax) },
              ...(isCustomCash ? [{ label: "Matrix-justering", value: "Brugerdefineret år-for-år overstyring" }] : [])
            ]
          };
        }

        // For subsequent projection years:
        const rows = calculation?.planRows || calculation?.rows;
        let nextRowToUse = null;
        if (Array.isArray(rows)) {
          const idx = rows.findIndex((r) => r.age === row.age && r.date?.getFullYear() === row.date?.getFullYear());
          if (idx >= 0 && idx < rows.length - 1) {
            nextRowToUse = rows[idx + 1];
          }
        }

        const contrib = (row.phase === "Opsparing" && row.contribution > 0) ? (inputs.annualCashContribution ?? 0) : 0;
        const withdrawal = row.cashWithdrawal ?? (row.phase !== "Opsparing" && nextRowToUse && nextRowToUse.cash < start ? Math.max(0, start - nextRowToUse.cash) : 0);
        const realCashRate = (1 + cashRate * (1 - cashTax)) / (1 + inflRate) - 1;
        const netBase = Math.max(0, start - withdrawal);
        const interestReturn = Math.round(netBase * realCashRate);
        const end = nextRowToUse ? nextRowToUse.cash : Math.max(0, Math.round(netBase + contrib + interestReturn));
        const rebalance = nextRowToUse ? Math.round(end - (netBase + contrib + interestReturn)) : 0;

        const quickMathParts = [`${currency.format(start)} (primo)`];
        if (withdrawal > 0) quickMathParts.push(`− ${currency.format(withdrawal)} (hævning)`);
        if (contrib > 0) quickMathParts.push(`+ ${currency.format(contrib)} (indskud)`);
        if (interestReturn !== 0) quickMathParts.push(interestReturn >= 0 ? `+ ${currency.format(interestReturn)} (netto rente)` : `− ${currency.format(Math.abs(interestReturn))} (inflationsfald)`);
        if (rebalance !== 0) quickMathParts.push(rebalance > 0 ? `+ ${currency.format(rebalance)} (rebalancering)` : `− ${currency.format(Math.abs(rebalance))} (rebalancering)`);
        quickMathParts.push(`= ${currency.format(end)} (ultimo)`);

        const steps = [
          { label: `Startsaldo (primo 1. jan ${yearDate})`, value: currency.format(start), note: `Udgør ${cashSharePct} % af samlede frie midler ved årets start` }
        ];
        if (withdrawal > 0) {
          steps.push({ label: "Hævet skattefrit til forbrug", value: `− ${currency.format(withdrawal)}` });
        }
        if (contrib > 0) {
          steps.push({ label: "Årets kontantindbetaling", value: `+ ${currency.format(contrib)}` });
        }
        steps.push({
          label: `Netto rente efter skat & inflation (${percent.format(realCashRate)})`,
          value: interestReturn >= 0 ? `+ ${currency.format(interestReturn)}` : `− ${currency.format(Math.abs(interestReturn))}`,
          note: `Nominel rente ${percent.format(cashRate)} fratrukket ${percent.format(cashTax)} skat og ${percent.format(inflRate)} inflation`
        });
        if (Math.abs(rebalance) > 50) {
          steps.push({
            label: rebalance > 0 ? "Tilført ved rebalancering" : "Flyttet til aktier ved rebalancering",
            value: rebalance > 0 ? `+ ${currency.format(rebalance)}` : `− ${currency.format(Math.abs(rebalance))}`,
            note: "Justering iht. optrapningsprofil mod pension"
          });
        }
        steps.push({
          label: `Slutsaldo (ultimo 31. dec ${yearDate})`,
          value: `= ${currency.format(end)}`,
          isResult: true,
          note: nextRowToUse ? `Overføres som primosaldo til ${yearDate + 1} (${age + 1} år)` : "Slutreserve ved planens afslutning"
        });

        return {
          title: `Kontantreserve / Bank (${yearDate} · ${age} år)`,
          badge: isCustomCash ? "Justeret i matrix" : "Primosaldo (Startsaldo)",
          quickMath: quickMathParts.join(" "),
          description: `Beløbet på ${currency.format(start)} er din kontantreserve/bankkonto ved årets start (1. januar ${yearDate}). Dette viser reserven FØR årets rente og eventuelle hævninger finder sted. Resultatet videreføres til næste række (${yearDate + 1} · ${age + 1} år).`,
          formula: hasGlide
            ? `Kontantreserve = Frie midler (${currency.format(totalLiquidFree)}) × ${cashSharePct} %`
            : "Ultimo = Primo − Hævning + Indbetaling + Netto bankrente ± Rebalancering",
          formulaDetails: `Nominel rente ${percent.format(cashRate)} fratrukket ${percent.format(cashTax)} skat og korrigeret for ${percent.format(inflRate)} inflation.`,
          steps,
          assumptions: [
            { label: "Kontantandel (dette år)", value: `${cashSharePct} % af frie midler` },
            { label: "Rente på kontantreserve", value: percent.format(cashRate) },
            { label: "Beskatning (kapitalindkomst)", value: percent.format(cashTax) },
            ...(isCustomCash ? [{ label: "Matrix-justering", value: "Brugerdefineret år-for-år overstyring" }] : [])
          ]
        };
      }

      case "totalDepotValue": {
        const depot = row.totalDepotValue;
        const rows = calculation?.planRows || calculation?.rows;
        let nextRowToUse = null;
        if (Array.isArray(rows)) {
          const idx = rows.findIndex((r) => r.age === row.age && r.date?.getFullYear() === row.date?.getFullYear());
          if (idx >= 0 && idx < rows.length - 1) {
            nextRowToUse = rows[idx + 1];
          }
        }

        const parts = [
          `${currency.format(row.ratePension)} (rate)`,
          `${currency.format(row.lifeAnnuityDepotValue)} (livrente)`,
          `${currency.format(row.ageSavings)} (aldersops.)`,
          `${currency.format(row.freeFunds)} (frie)`,
          `${currency.format(row.ask)} (ASK)`
        ];
        if (row.cash > 0) parts.push(`${currency.format(row.cash)} (kontant)`);

        const steps = [
          { label: "Ratepension (primo)", value: currency.format(row.ratePension) },
          { label: "Livrentedepot (primo aktuarmæssig værdi)", value: currency.format(row.lifeAnnuityDepotValue) },
          { label: "Aldersopsparing (primo)", value: currency.format(row.ageSavings) },
          { label: "Frie midler (primo investeret)", value: currency.format(row.freeFunds) },
          { label: "Aktiesparekonto (primo)", value: currency.format(row.ask) }
        ];
        if (row.cash > 0) {
          steps.push({ label: "Kontantreserve / Bank (primo)", value: currency.format(row.cash) });
        }
        steps.push({ label: `Samlet depotværdi (primo 1. jan ${yearDate})`, value: `= ${currency.format(depot)}`, isResult: true });

        if (nextRowToUse) {
          const change = nextRowToUse.totalDepotValue - depot;
          const returnRate = row.pensionReturnRate ?? nominalReturn;
          steps.push({
            label: "Årets samlede udvikling (afkast & hævninger)",
            value: change >= 0 ? `+ ${currency.format(change)}` : `− ${currency.format(Math.abs(change))}`,
            note: `Bruttoafkast ${percent.format(returnRate)}, udbetalt ${currency.format(row.withdrawal)}`
          });
          steps.push({
            label: `Samlet depotværdi (ultimo 31. dec ${yearDate})`,
            value: `= ${currency.format(nextRowToUse.totalDepotValue)}`,
            isResult: true,
            note: `Videreføres som primosaldo til næste række (${yearDate + 1} · ${age + 1} år)`
          });
        }

        const endDepot = nextRowToUse ? nextRowToUse.totalDepotValue : depot;
        const quickMath = nextRowToUse
          ? `${currency.format(depot)} (primo 1. jan) ➔ ${currency.format(endDepot)} (ultimo 31. dec efter årets afkast og hævning)`
          : `${parts.join(" + ")} = ${currency.format(depot)}`;

        return {
          title: `Samlet depotværdi (${yearDate} · ${age} år)`,
          badge: "Primosaldo (Startsaldo)",
          quickMath,
          description: `Beløbet på ${currency.format(depot)} er din samlede finansielle depotværdi ved årets start (1. januar ${yearDate}). Dette er formuen FØR årets afkast (${percent.format(row.pensionReturnRate ?? nominalReturn)}) og årets udbetaling (${currency.format(row.withdrawal)}) finder sted.${nextRowToUse ? ` Efter årets afkast og hævning ender depotet på ${currency.format(nextRowToUse.totalDepotValue)} (ultimo), hvilket vises som primosaldo i næste række (${yearDate + 1} · ${age + 1} år).` : ""}`,
          formula: "Samlet depotværdi (primo) = Ratepension + Livrentedepot + Aldersopsparing + Frie midler + ASK + Kontantreserve",
          formulaDetails: "Viser primosaldoen ved årets start. Inkluderer alle finansielle depoter, pensionskonti og kontantbeholdninger eksklusive fast ejendom.",
          steps,
          assumptions: [
            { label: "Status i tabellen", value: "Primosaldo (1. januar)" },
            { label: "Inkluderer bolig", value: "Nej (kun finansielle depoter og kontanter)" }
          ]
        };
      }

      case "housingEquity": {
        const val = row.housingValue ?? 0;
        const debt = row.housingDebt ?? 0;
        const equity = row.housingEquity ?? 0;
        const share = inputs.housingOwnershipShare ?? 1;
        return {
          title: `Friværdi i bolig (${yearDate} · ${age} år)`,
          badge: "Fast ejendom",
          quickMath: `Boligværdi (${currency.format(val)}) − Gæld (${currency.format(debt)}) = ${currency.format(val - debt)} · Din andel (${percent.format(share)}) = ${currency.format(equity)}`,
          description: "Din andel af boligens friværdi beregnet som estimeret markedsværdi fratrukket restgæld, reguleret for årlig værdistigning og afdrag.",
          formula: "Friværdi = (Boligmarkedsværdi − Restgæld) × Ejerandel",
          formulaDetails: "Boligværdien opskrives årligt med den valgte prisvækst. Gælden reduceres med årlige afdrag.",
          steps: [
            { label: "Estimeret boligværdi", value: currency.format(val) },
            { label: "Restgæld på realkredit/banklån", value: `− ${currency.format(debt)}` },
            { label: "Samlet friværdi i ejendommen", value: `= ${currency.format(val - debt)}` },
            { label: "Din ejerandel", value: `× ${percent.format(share)}` },
            { label: "Din nettofriværdi", value: `= ${currency.format(equity)}`, isResult: true }
          ],
          assumptions: [
            { label: "Forventet årlig boligprisvækst", value: percent.format(inputs.housingPriceGrowth ?? 0.02) },
            { label: "Årligt afdrag på gæld", value: currency.format(inputs.housingAnnualAmortization ?? 0) }
          ]
        };
      }

      case "totalWealthWithHousing": {
        const depot = row.totalDepotValue;
        const equity = row.housingEquity ?? 0;
        const total = row.totalWealthWithHousing ?? (depot + equity);
        return {
          title: `Samlet formue inkl. bolig (${yearDate} · ${age} år)`,
          badge: "Samlet nettoformue",
          quickMath: `Depotværdi (${currency.format(depot)}) + Friværdi (${currency.format(equity)}) = ${currency.format(total)}`,
          description: "Det samlede overblik over din samlede økonomiske nettoformue inklusive både finansielle depoter, pensioner og ejerboligens friværdi.",
          formula: "Samlet formue = Samlet depotværdi + Friværdi i bolig",
          formulaDetails: "Afspejler den fulde formuemæssige rygdækning for din FIRE- og pensionsplan.",
          steps: [
            { label: "Finansielle depoter og pensioner", value: currency.format(depot) },
            { label: "Nettofriværdi i ejerbolig", value: `+ ${currency.format(equity)}` },
            { label: "Samlet økonomisk formue", value: `= ${currency.format(total)}`, isResult: true }
          ],
          assumptions: [
            { label: "Boligformue medregnet", value: "Ja" }
          ]
        };
      }

      case "contribution": {
        const val = row.contribution ?? 0;
        if (val <= 0) {
          return {
            title: `Årlig indbetaling (${yearDate} · ${age} år)`,
            badge: "Opsparing",
            quickMath: "0 kr. — Ingen nye indbetalinger (Opsparingsstop / nedsparingsfase)",
            description: "Der foretages ingen nye indbetalinger i dette år, da du enten har nået dit pensionsmål (Coast-FIRE), er trådt ind i FIRE-fasen, eller er gået på folkepension.",
            formula: "Indbetaling = 0 kr.",
            formulaDetails: "Opsparingen er stoppet, og formuen vokser alene via afkast eller nedbringes via udbetalinger.",
            steps: [
              { label: "Samlet årlig indbetaling", value: "0 kr.", isResult: true }
            ],
            assumptions: [
              { label: "Pensionsindbetaling", value: "Stoppet" }
            ]
          };
        }
        const isPensionActive = row.phase === "Opsparing" && (!calculation.pensionStopRow || row.age <= calculation.pensionStopRow.age);
        const rate = isPensionActive ? ((calculation.annualDeductibleRatePensionContribution ?? 0) + (calculation.annualNonDeductibleRatePensionContribution ?? 0)) : 0;
        const life = isPensionActive ? (calculation.annualLifeAnnuityContribution ?? inputs.annualLifeAnnuityContribution ?? 0) : 0;
        const ageSavings = isPensionActive ? (calculation.effectiveAnnualAgeSavingsContribution ?? inputs.annualAgeSavingsContribution ?? 0) : 0;
        const askCap = calculation.askDepositCap ?? (inputs.isCouple ? 348400 : 174200);
        const askStart = prevRow ? prevRow.ask : (inputs.askBalance ?? 0);
        const ask = (askStart < askCap) ? Math.min(inputs.annualAskContribution ?? 0, Math.max(0, askCap - askStart)) : 0;
        const free = Math.max(0, val - (rate + life + ageSavings + ask));

        const breakdown = [];
        if (free > 0) breakdown.push({ label: "Frie midler (inkl. omdirigering)", value: currency.format(free), tag: `${currency.format(free)} (frie)` });
        if (rate > 0) breakdown.push({ label: "Ratepension", value: currency.format(rate), tag: `${currency.format(rate)} (rate)` });
        if (life > 0) breakdown.push({ label: "Livrente", value: currency.format(life), tag: `${currency.format(life)} (livrente)` });
        if (ageSavings > 0) breakdown.push({ label: "Aldersopsparing", value: currency.format(ageSavings), tag: `${currency.format(ageSavings)} (aldersops.)` });
        if (ask > 0) breakdown.push({ label: "Aktiesparekonto", value: currency.format(ask), tag: `${currency.format(ask)} (ASK)` });

        const quickMathStr = breakdown.length > 0
          ? `${breakdown.map((b) => b.tag).join(" + ")} = ${currency.format(val)}`
          : `${currency.format(val)} indbetalt i alt dette år`;

        const steps = breakdown.map((b) => ({ label: b.label, value: b.value }));
        steps.push({ label: "Samlet årlig indbetaling", value: `= ${currency.format(val)}`, isResult: true });

        return {
          title: `Årlig indbetaling (${yearDate} · ${age} år)`,
          badge: "Opsparing",
          quickMath: quickMathStr,
          description: "Den samlede bruttosum indbetalt på tværs af ratepension, livrente, aldersopsparing, aktiesparekonto og frie midler i det pågældende år.",
          formula: "Indbetaling = Frie midler + Ratepension + Livrente + Aldersopsparing + ASK",
          formulaDetails: "Reguleres årligt med inflationen hvis dette er tilvalgt. Beløb vises i faste priser.",
          steps,
          assumptions: [
            { label: "Inflationsregulering", value: inputs.contributionsFollowInflation ? "Ja (følger inflation)" : "Nej (fast beløb)" }
          ]
        };
      }

      case "withdrawal": {
        const gross = row.withdrawal ?? 0;
        const tax = row.totalWithdrawalTax ?? 0;
        const net = row.netWithdrawal ?? (gross - tax);
        if (gross <= 0) {
          return {
            title: `Brutto-udbetaling (${yearDate} · ${age} år)`,
            badge: "Hævning",
            quickMath: "0 kr. — Ingen udbetalinger i opsparingsfasen",
            description: "Du er i opsparingsfasen og trækker endnu ikke på dine depoter til privatforbrug.",
            formula: "Brutto-udbetaling = 0 kr.",
            formulaDetails: "Udbetalinger påbegyndes først ved FIRE-start eller folkepensionsalder.",
            steps: [
              { label: "Brutto hævet fra depoter", value: "0 kr.", isResult: true }
            ],
            assumptions: [
              { label: "Fase", value: row.phase }
            ]
          };
        }

        const freeWithdrawal = row.freeFundsWithdrawal ?? 0;
        const freeGain = row.realizedFreeFundsGain ?? 0;
        const freeCostBasis = Math.max(0, freeWithdrawal - freeGain);
        const freeTax = row.withdrawalTax ?? 0;

        const taxableRate = row.taxableRatePensionWithdrawal ?? 0;
        const taxFreeRate = row.taxFreeRatePensionWithdrawal ?? 0;
        const rateTotal = taxableRate + taxFreeRate;
        const pensionTaxRate = inputs.pensionWithdrawalTax ?? 0.37;
        const pensionTaxAmount = row.pensionWithdrawalTax ?? Math.round((taxableRate + (row.lifeAnnuityWithdrawal ?? 0)) * pensionTaxRate);

        const lifeTotal = row.lifeAnnuityWithdrawal ?? 0;
        const ageSavingsWithdrawal = row.ageSavingsWithdrawal ?? 0;
        const askWithdrawal = row.askWithdrawal ?? Math.max(0, gross - (freeWithdrawal + rateTotal + lifeTotal + ageSavingsWithdrawal));

        const returnExample = buildWithdrawalExample({ row, prevRow, inputs, calculation });

        const steps = [
          { label: "Brutto hævet fra depoter", value: currency.format(gross) }
        ];
        if (freeWithdrawal > 0) {
          steps.push({ label: "Hævet fra frie midler", value: currency.format(freeWithdrawal), isSub: true });
          steps.push({ label: "Heraf ubeskattet købesum (0 % skat)", value: currency.format(freeCostBasis), isSub: true });
          steps.push({ label: "Heraf skattepligtig aktiegevinst", value: currency.format(freeGain), isSub: true });
        }
        if (rateTotal > 0) {
          steps.push({ label: "Hævet fra ratepension", value: currency.format(rateTotal), isSub: true });
          if (taxFreeRate > 0) {
            steps.push({ label: "Heraf skattefri udbetaling", value: currency.format(taxFreeRate), isSub: true });
          }
        }
        if (lifeTotal > 0) {
          steps.push({ label: "Udbetalt fra livrente", value: currency.format(lifeTotal), isSub: true });
        }
        if (ageSavingsWithdrawal > 0) {
          steps.push({ label: "Hævet fra aldersopsparing (100 % skattefri)", value: currency.format(ageSavingsWithdrawal), isSub: true });
        }
        if (askWithdrawal > 0) {
          steps.push({ label: "Hævet fra Aktiesparekonto (skattefri ved hævning)", value: currency.format(askWithdrawal), isSub: true });
        }

        steps.push({ label: "Beregnet samlet skat", value: `− ${currency.format(tax)}` });
        if (freeTax > 0) {
          steps.push({ label: "Aktieskat af frie midler (27 % / 42 %)", value: `− ${currency.format(freeTax)}`, isSub: true });
        }
        if (pensionTaxAmount > 0) {
          steps.push({ label: `Indkomstskat af pensioner (${percent.format(pensionTaxRate)})`, value: `− ${currency.format(pensionTaxAmount)}`, isSub: true });
        }
        steps.push({ label: "Netto udbetalt til forbrug", value: `= ${currency.format(net)}`, isResult: true });

        return {
          title: `Brutto-udbetaling (${yearDate} · ${age} år)`,
          badge: "Hævning",
          quickMath: `${currency.format(gross)} før skat − ${currency.format(tax)} (skat) = ${currency.format(net)} udbetalt til forbrug`,
          description: "Det samlede hævede beløb fra pensioner og frie midler før skat til dækning af dit ønskede årlige forbrug.",
          formula: "Brutto-udbetaling = Hævning fra frie midler + Pensionsudbetalinger",
          formulaDetails: "Bruttobeløbet hæves så det efter kildeskat/aktieskat præcis dækker dit ønskede rådighedsbeløb.",
          calcTitle: "Gennemført regneeksempel for udbetaling og skat",
          returnExample,
          returnExampleNote: "Regneeksemplet viser nøjagtigt hvordan det nødvendige bruttobeløb fremkommer, og hvordan skatten beregnes på tværs af kontotyper.",
          steps,
          assumptions: [
            { label: "Ønsket årligt forbrug", value: currency.format(inputs.desiredAnnualWithdrawal) },
            { label: "Angivet beløb", value: inputs.withdrawalAfterTax ? "Efter skat (købekraft)" : "Før skat" }
          ]
        };
      }

      case "netWithdrawal": {
        const net = row.netWithdrawal ?? 0;
        const otherNet = (row.publicPensionNet ?? 0) + (row.atpGross ? row.atpGross * 0.63 : 0);
        const totalNet = net + otherNet;
        if (totalNet <= 0) {
          return {
            title: `Netto-udbetaling (${yearDate} · ${age} år)`,
            badge: "Rådighedsbeløb",
            quickMath: "0 kr. — Ingen udbetalinger i opsparingsfasen",
            description: "Du modtager ingen udbetalinger fra porteføljen eller det offentlige i dette år.",
            formula: "Netto = 0 kr.",
            formulaDetails: "Udbetaling til forbrug starter ved FIRE eller pension.",
            steps: [
              { label: "Samlet udbetalt til forbrug", value: "0 kr.", isResult: true }
            ],
            assumptions: [
              { label: "Fase", value: row.phase }
            ]
          };
        }
        return {
          title: `Netto-udbetaling (${yearDate} · ${age} år)`,
          badge: "Rådighedsbeløb",
          quickMath: otherNet > 0 ? `${currency.format(net)} (depoter) + ${currency.format(otherNet)} (off.) = ${currency.format(totalNet)} efter skat` : `${currency.format(net)} udbetalt efter skat fra porteføljen`,
          description: "Det faktiske kontante beløb, der går ind på din konto til forbrug efter afregning af al skat.",
          formula: "Netto = Brutto-udbetaling − Kildeskat/Aktieskat + Offentlige ydelser",
          formulaDetails: "Sikrer at dit månedlige/årlige rådighedsbeløb matcher din FIRE-målsætning.",
          steps: [
            { label: "Netto fra opsparingsdepoter", value: currency.format(net) },
            { label: "Netto fra folkepension & ATP", value: otherNet > 0 ? `+ ${currency.format(otherNet)}` : "0 kr." },
            { label: "Samlet udbetalt til forbrug", value: `= ${currency.format(totalNet)}`, isResult: true }
          ],
          assumptions: [
            { label: "Købekraftsjustering", value: "Følger den forventede inflation på 2,0 %" }
          ]
        };
      }

      case "lagerskat": {
        const tax = row.annualFreeFundsTax ?? 0;
        return {
          title: `Lagerskat (${yearDate} · ${age} år)`,
          badge: "Årlig skat",
          quickMath: tax > 0 ? `${currency.format(tax)} afregnet i lagerskat af årets afkast` : "Ingen lagerskat dette år",
          description: "Årlig skat af positivt afkast på lagerbeskattede frie midler (f.eks. ETF'er på skats positivliste eller investeringsfonde). Skatten trækkes direkte fra formuen frem mod næste år.",
          formula: "Lagerskat = Positivt afkast på lagerbeskattet andel × Aktieindkomstskat",
          formulaDetails: "Beskattes med 27 % op til progressionsgrænsen og derefter 42 %.",
          steps: [
            { label: "Afregnet lagerskat", value: currency.format(tax), isResult: true }
          ],
          assumptions: [
            { label: "Lagerbeskattet andel", value: percent.format(inputs.freeFundsInventoryShare ?? 0) }
          ]
        };
      }

      case "effectiveWithdrawalTaxRate": {
        const rate = row.effectiveWithdrawalTaxRate ?? 0;
        return {
          title: `Effektiv skat på udbetaling (${yearDate} · ${age} år)`,
          badge: "Skatteprocent",
          quickMath: `${percent.format(rate)} af årets udbetaling betales i skat`,
          description: "Den gennemsnitlige skatteprocent på tværs af alle årets hævninger. En blanding af skattefri aldersopsparing, frie midler (kun skat af gevinst) og pensionsmidler giver ofte en effektiv skat langt under topskatten.",
          formula: "Effektiv skat = Samlet udbetalingsskat / Samlet brutto-udbetaling",
          formulaDetails: "Viser hvor skatteeffektivt din portefølje udbetales i praksis.",
          steps: [
            { label: "Effektiv gennemsnitlig skatteprocent", value: percent.format(rate), isResult: true }
          ],
          assumptions: [
            { label: "Pensionsskat", value: percent.format(inputs.pensionWithdrawalTax ?? 0.37) }
          ]
        };
      }

      case "baseTotal": {
        const val = row.totalWealthWithHousing ?? row.totalBalance;
        return {
          title: `Formue uden Monte Carlo · Fast afkast (${yearDate})`,
          badge: "Deterministisk",
          quickMath: `${currency.format(val)} ved fast årligt afkast (${percent.format(inputs.returnRate)})`,
          description: "Planens forventede formue hvis markedsafkastet hvert evig eneste år er præcis det samme som dit valgte gennemsnitsafkast uden udsving.",
          formula: "Fast forløb = Årlig fremskrivning med konstant afkast",
          formulaDetails: "Bruges som benchmark mod Monte Carlo-simuleringerne.",
          steps: [
            { label: "Deterministisk formue", value: currency.format(val), isResult: true }
          ],
          assumptions: [
            { label: "Fast afkast før skat", value: percent.format(inputs.returnRate) }
          ]
        };
      }

      case "p50": {
        return {
          title: `P50 Median-formue (${yearDate} · ${age} år)`,
          badge: "Monte Carlo P50",
          quickMath: "50 % af alle 500 simulerede markedsforløb klarer sig bedre end dette tal",
          description: "Medianen repræsenterer det mest typiske udfald i en virkelighed med volatile finansielle markeder.",
          formula: "P50 = Midterste værdi blandt alle simulerede forløb",
          formulaDetails: "Modellerer aktie- og obligationsmarkedernes historiske standardafvigelse (volatilitet).",
          steps: [
            { label: "P50 Medianværdi", value: "Beregnet ud fra simuleringen", isResult: true }
          ],
          assumptions: [
            { label: "Årlig volatilitet", value: percent.format(inputs.returnVolatility ?? 0.15) }
          ]
        };
      }

      case "p10": {
        return {
          title: `P10 Pessimistisk formue (${yearDate} · ${age} år)`,
          badge: "Monte Carlo P10",
          quickMath: "90 % af simuleringerne klarer sig bedre (kun 10 % værre)",
          description: "Modellerer et langvarigt bjørnemarked, tidlige krak eller hård sequence-of-returns risiko i starten af din FIRE-periode.",
          formula: "P10 = 10. percentil blandt 500 stokastiske afkastforløb",
          formulaDetails: "Hvis planen overlever ved P10, er din FIRE-plan overordentlig robust over for børskrak.",
          steps: [
            { label: "P10 Pessimistisk værdi", value: "Beregnet ud fra simuleringen", isResult: true }
          ],
          assumptions: [
            { label: "Simulerede forløb", value: "500" }
          ]
        };
      }

      case "p90": {
        return {
          title: `P90 Optimistisk formue (${yearDate} · ${age} år)`,
          badge: "Monte Carlo P90",
          quickMath: "Kun 10 % af simuleringerne klarer sig bedre end dette tal",
          description: "Modellerer et stærkt bull-marked med høje afkast og lav inflation.",
          formula: "P90 = 90. percentil blandt alle simulerede markedsforløb",
          formulaDetails: "Viser potentialet ved stærke markedsår.",
          steps: [
            { label: "P90 Optimistisk værdi", value: "Beregnet ud fra simuleringen", isResult: true }
          ],
          assumptions: [
            { label: "Simuleringer", value: "500" }
          ]
        };
      }

      case "diff": {
        return {
          title: `Forskel: Monte Carlo P50 vs. Fast afkast (${yearDate})`,
          badge: "Afkastvolatilitet",
          quickMath: "Afvigelsen skyldes volatilitetsslæb (volatility drag) over tid",
          description: "I virkelighedens markeder giver et fald på 50 % efterfulgt af en stigning på 50 % et nettotab på 25 %. Derfor afviger et stokastisk forløb fra et simpelt fast gennemsnit.",
          formula: "Forskel = MC P50 Medianformue − Fast baselineformue",
          formulaDetails: "Forskellen illustrerer den reelle indvirkning af markedsudsving.",
          steps: [
            { label: "Forskel", value: "Beregnet forskel", isResult: true }
          ],
          assumptions: [
            { label: "Geometrisk vs. aritmetisk afkast", value: "Eksplicit simuleret" }
          ]
        };
      }

      default:
        return null;
    }
  }

  function explainKeyMetric({ metricKey, calculation, inputs }) {
    switch (metricKey) {
      case "result-heading":
      case "result-fire-milestone-age": {
        const fire = calculation.fireRow;
        const fireAge = fire ? fire.age : null;
        return {
          title: fire ? `FIRE-alder: ${fireAge} år` : "FIRE ikke opnået før pension",
          badge: "Hovedmilepæl",
          quickMath: fire ? `Arbejdsophør ved ${fireAge} år (${fire.date.getFullYear()}) · Broperiode: ${yearsFormat.format(fire.bridgeYears)} år` : "Formuen rækker ikke til tidlig pension",
          description: "Den tidligste alder, hvor dine frie midler er tilstrækkelige til at finansiere dit ønskede forbrug frem til pensionsalderen uden yderligere lønindkomst.",
          formula: "FIRE opnås når: Frie midler ≥ Nuværdien af ønsket forbrug frem til folkepension",
          formulaDetails: "Fra FIRE-alderen stopper lønindkomst og opsparing, og nedsparingen påbegyndes.",
          steps: [
            { label: "Nuværende alder", value: `${calculation.currentAge} år` },
            { label: "Beregnet FIRE-alder", value: fire ? `${fireAge} år` : "Ikke nået", isResult: true },
            { label: "Varighed af FIRE-bro til pension", value: fire ? `${yearsFormat.format(fire.bridgeYears)} år` : "—" },
            { label: "Folkepensionsalder", value: `${inputs.retirementAge} år` }
          ],
          assumptions: [
            { label: "Årlig ønsket udbetaling", value: currency.format(inputs.desiredAnnualWithdrawal) },
            { label: "Udbetalingsstrategi", value: inputs.withdrawalStrategy === "taxOptimal" ? "Skatteoptimal" : "Proportional" }
          ]
        };
      }

      case "result-withdrawal": {
        const annual = inputs.desiredAnnualWithdrawal ?? 0;
        const monthly = Math.round(annual / 12);
        const isNet = Boolean(inputs.withdrawalAfterTax);
        return {
          title: `Ønsket udbetaling: ${currency.format(annual)}/år (${currency.format(monthly)}/md.)`,
          badge: isNet ? "Netto (efter skat)" : "Brutto (før skat)",
          quickMath: `${currency.format(monthly)} kr./måned (${currency.format(annual)} kr./år i faste priser)`,
          description: `Dit valgte månedlige forbrugsbehov under FIRE og pension. Beløbet er angivet i faste købekraftspriser (i dagens penge) og fremskrives automatisk med inflationen (${percent.format(inputs.inflationRate ?? 0.02)}), så din reelle købekraft bevares uændret gennem hele livet.`,
          formula: isNet ? "Årligt udbetalingsbehov = Månedligt nettobehov × 12 (inflationssikret)" : "Årligt brutto-udbetalingsbehov = Månedligt bruttobehov × 12",
          formulaDetails: "Porteføljen hæver det nødvendige beløb hvert år for at levere præcis dette rådighedsbeløb efter modregning af skat og eventuelle offentlige ydelser.",
          steps: [
            { label: "Månedligt forbrugsbehov", value: `${currency.format(monthly)}/md.` },
            { label: "Årligt udbetalingsbehov", value: currency.format(annual), isResult: true },
            { label: "Skattegrundlag", value: isNet ? "Efter skat (netto rådighedsbeløb)" : "Før skat (brutto)" }
          ],
          assumptions: [
            { label: "Købekraftssikring", value: `Korrigeres for ${percent.format(inputs.inflationRate ?? 0.02)} årlig inflation` },
            { label: "Udbetalingsstrategi", value: inputs.withdrawalStrategy === "taxOptimal" ? "Skatteoptimal" : "Proportional" }
          ]
        };
      }

      case "result-pension-stop-age": {
        const stop = calculation.pensionStopRow;
        return {
          title: stop ? `Stop pensionsindbetaling: ${stop.age} år` : "Pensionsindbetaling fortsætter",
          badge: "Coast-FIRE",
          quickMath: stop ? `Nået ved ${stop.age} år (${stop.date.getFullYear()}) · Eksisterende pension vokser tilstrækkeligt alene` : "Målet kræver indbetaling frem til pension",
          description: "Det tidspunkt hvor din pensionsformue er stor nok til, at rentes rente-effekten alene kan få den til at vokse til det nødvendige beløb ved pensionsalderen (Coast-FIRE). Herefter kan alle nye opsparingskroner omdirigeres til frie midler for at fremskynde FIRE.",
          formula: "Pensionsmål i dag = Nødvendig pensionsformue / (1 + realt afkast)^(år til pension)",
          formulaDetails: "Når din aktuelle pension rammer dette mål, er yderligere pensionsindskud overflødige for at dække pensionsperioden.",
          steps: [
            { label: "Nødvendig pension ved folkepension", value: calculation.requiredAtRetirement ? currency.format(calculation.requiredAtRetirement) : "—" },
            { label: "Alder hvor pensionen kan stoppe", value: stop ? `${stop.age} år` : "Ikke nået før FIRE", isResult: true }
          ],
          assumptions: [
            { label: "Omdirigering til frie midler", value: inputs.redirectPensionContributionsToFreeFunds ? "Aktiveret" : "Deaktiveret" }
          ]
        };
      }

      case "result-final-balance": {
        const res = calculation.includeHousing
          ? (calculation.finalReserveAfterTaxWithHousing ?? calculation.finalRow.totalWealthWithHousing ?? calculation.finalRow.totalBalance)
          : calculation.finalRow.totalBalance;
        return {
          title: `Forventet slutreserve: ${currency.format(res)}`,
          badge: "Slutformue",
          quickMath: `Resterende formue ved planens udløb (${ages.format(calculation.finalRow.age)} år)`,
          description: "Den forventede tilbageværende formue (buffer/arv) efter skat og alle planlagte udbetalinger, når udbetalingsperioden udløber.",
          formula: "Slutreserve = Startformue + Alle indbetalinger + Alt afkast − Al skat − Alle hævninger",
          formulaDetails: "Inkluderer friværdi i bolig hvis denne er medregnet i dine indstillinger.",
          steps: [
            { label: "Slutalder i planen", value: `${calculation.finalRow.age} år` },
            { label: "Forventet samlet slutreserve", value: currency.format(res), isResult: true }
          ],
          assumptions: [
            { label: "Udbetalingsår i pension", value: `${inputs.payoutYears} år` },
            { label: "Inkluderer boligformue", value: calculation.includeHousing ? "Ja" : "Nej" }
          ]
        };
      }

      case "life-annuity-conversion-rate": {
        return {
          title: "Livrentens omregningssats",
          badge: "Aktuarberegning",
          quickMath: `${percent.format(calculation.lifeAnnuityConversionRate ?? 0.045)} af depotet udbetales årligt ved start`,
          description: "Den procentsats af livrentedepotet, der udbetales som årlig livrente fra pensionsalderen. Satsen fastsættes af pensionsselskabet ud fra din forventede restlevetid og grundlagsrente.",
          formula: "Omregningssats = 1 / Livsvarig annuitetsværdi ud fra levetid",
          formulaDetails: "Beregnet med Finanstilsynets levetidsmodel (D2024 / unisex).",
          steps: [
            { label: "Forventet omregningssats", value: percent.format(calculation.lifeAnnuityConversionRate ?? 0.045), isResult: true },
            { label: "Forventet levealder", value: `${yearsFormat.format(calculation.lifeAnnuityExpectedAgeAtDeath ?? 88)} år` }
          ],
          assumptions: [
            { label: "Pensionsalder", value: `${inputs.retirementAge} år` }
          ]
        };
      }

      case "cash-balance-today": {
        const totalFree = (inputs.freeFundsBalance ?? 0) > 0 ? inputs.freeFundsBalance : (inputs.cashBalance ?? 0);
        const startShare = Number.isFinite(inputs.cashShareStart) ? inputs.cashShareStart : 5;
        const cashBalance = Math.round(totalFree * (startShare / 100));
        const freeStock = totalFree - cashBalance;
        const cashRate = inputs.cashInterestRate ?? 0.015;
        const cashTax = inputs.cashInterestTax ?? 0.37;
        const netInterestPct = (cashRate * (1 - cashTax) * 100).toFixed(2);

        return {
          title: "Kontantreserve i dag (Likviditetsbuffer)",
          badge: "Startbuffer",
          quickMath: `${currency.format(cashBalance)} (${startShare} % af samlede frie midler ${currency.format(totalFree)})`,
          description: `Din kontantreserve i banken ved beregningens start. Den udgør præcis ${startShare} % af dine samlede frie midler (${currency.format(totalFree)}). De resterende ${100 - startShare} % (${currency.format(freeStock)}) er investeret i aktier på dit frie depot som afkastsøgende formue.`,
          formula: `Kontantreserve i dag = Samlede frie midler × Kontantandel ved start\n= ${currency.format(totalFree)} × ${startShare} % = ${currency.format(cashBalance)}`,
          formulaDetails: `Kronebeløb og procentdel synkroniseres automatisk. Kontantreserven forrentes med ${percent.format(cashRate)} p.a. i banken. Renteindtægter beskattes med ${percent.format(cashTax)} som kapitalindkomst (effektiv nettotilskrivning ca. ${netInterestPct} % før inflation).`,
          steps: [
            { label: "Samlede frie midler (Frie midler i dag)", value: currency.format(totalFree) },
            { label: "Valgt kontantandel ved start", value: `${startShare} %` },
            { label: "Investeret i aktier (frie midler depot)", value: `${currency.format(freeStock)} (${100 - startShare} %)` },
            { label: "Kontantreserve i dag (sikker bankkonto)", value: currency.format(cashBalance), isResult: true }
          ],
          assumptions: [
            { label: "Samlede frie midler", value: currency.format(totalFree) },
            { label: "Startandel", value: `${startShare} %` },
            { label: "Bankrente", value: percent.format(cashRate) },
            { label: "Renteskat", value: percent.format(cashTax) }
          ]
        };
      }

      case "cash-share-start": {
        const totalFree = (inputs.freeFundsBalance ?? 0) > 0 ? inputs.freeFundsBalance : (inputs.cashBalance ?? 0);
        const startShare = Number.isFinite(inputs.cashShareStart) ? inputs.cashShareStart : 5;
        const cashBalance = Math.round(totalFree * (startShare / 100));

        return {
          title: "Kontantandel ved start (%)",
          badge: "Startallokering",
          quickMath: `${startShare} % af frie midler (${currency.format(totalFree)}) = ${currency.format(cashBalance)}`,
          description: "Hvor stor en procentdel af dine samlede frie midler, der placeres risikofrit som kontanter i banken ved start. Dette giver en likviditetsbuffer til uforudsete udgifter og beskytter mod at skulle sælge aktier under markedsuro.",
          formula: `Kontantandel = Kontantreserve / Samlede frie midler\n= ${currency.format(cashBalance)} / ${currency.format(totalFree)} = ${startShare} %`,
          formulaDetails: "Træk i skyderen eller indtast procenten direkte. Det tilsvarende kronebeløb i kontantreserve-feltet opdateres automatisk.",
          steps: [
            { label: "Samlede frie midler", value: currency.format(totalFree) },
            { label: "Kontantreserve i dag", value: currency.format(cashBalance) },
            { label: "Kontantandel ved start", value: `${startShare} %`, isResult: true }
          ],
          assumptions: [
            { label: "Startandel", value: `${startShare} %` },
            { label: "Målandel ved pension", value: `${inputs.cashShareTarget ?? 20} %` }
          ]
        };
      }

      case "cash-share-target": {
        const startShare = Number.isFinite(inputs.cashShareStart) ? inputs.cashShareStart : 5;
        const targetShare = Number.isFinite(inputs.cashShareTarget) ? inputs.cashShareTarget : 20;
        const targetAge = inputs.retirementAge ?? 69;

        return {
          title: "Kontantandel ved pension / FIRE (%)",
          badge: "Målallokering",
          quickMath: `Mål: ${targetShare} % i kontanter ved pension (${targetAge} år)`,
          description: "Mål-allokeringen for kontantreserven, når du når pension eller FIRE. Mange investorer øger kontantandelen op til pension (f.eks. til 15-25 %) for at dække 1-3 års leveomkostninger (Sequence of Returns Risk buffer), så man undgår tvangssalg af aktier under et børskrak i de første udbetalingsår.",
          formula: `Mål-kontantandel = ${targetShare} % af frie midler ved ${targetAge} år`,
          formulaDetails: "Andelen optrappes gradvist fra startandelen frem mod måldatoen baseret på din valgte optrapningsprofil.",
          steps: [
            { label: "Startandel i dag", value: `${startShare} %` },
            { label: "Målandel ved pension/FIRE", value: `${targetShare} %`, isResult: true },
            { label: "Samlet stigning", value: `${targetShare >= startShare ? "+" : ""}${(targetShare - startShare).toFixed(1)} %-point` },
            { label: "Målalder", value: `${targetAge} år` }
          ],
          assumptions: [
            { label: "Startandel", value: `${startShare} %` },
            { label: "Målandel", value: `${targetShare} %` },
            { label: "Optrapningsstrategi", value: inputs.cashShareStrategy || "glidePath" }
          ]
        };
      }

      case "cash-share-strategy": {
        const strategy = inputs.cashShareStrategy || "glidePath";
        const strategyNames = {
          glidePath: "Glidende optrapning mod folkepension (Lineær)",
          glidePathFire: "Glidende optrapning mod FIRE-start",
          stepAtRetirement: "Trinvis stigning ved folkepension",
          stepAtFire: "Trinvis stigning ved FIRE-start",
          constant: "Fast kontantandel (Samme % alle år)",
        };
        const strategyName = strategyNames[strategy] || strategy;

        return {
          title: "Optrapningsprofil for kontantreserve",
          badge: "Aktivallokering",
          quickMath: `Valgt profil: ${strategyName}`,
          description: "Bestemmer hvordan kontantandelen af dine frie midler udvikler sig fra din nuværende alder og frem mod pension eller FIRE. 'Glidende' profiler øger kontantandelen jævnt år for år, 'Trinvise' springer på én gang ved målalderen, og 'Fast' fastholder samme procentdel hele livet.",
          formula: strategy === "constant"
            ? "Andel(år) = Startandel (uændret)"
            : "Andel(år) = Start + (Mål − Start) × (år / år_til_mål)",
          formulaDetails: "I op- og nedsparingsmatricen kan du desuden overstyre kontantandel og rente individuelt for specifikke år.",
          steps: [
            { label: "Valgt profil", value: strategyName, isResult: true },
            { label: "Startandel", value: `${inputs.cashShareStart ?? 5} %` },
            { label: "Målandel", value: `${inputs.cashShareTarget ?? 20} %` }
          ],
          assumptions: [
            { label: "Profil", value: strategyName }
          ]
        };
      }

      case "cash-glide-range":
      case "cash-glide-milestone": {
        const curAge = inputs.currentAge ?? 30;
        const retAge = inputs.retirementAge ?? 69;
        const fireAge = calculation.fireRow ? calculation.fireRow.age : null;
        const startShare = Number.isFinite(inputs.cashShareStart) ? inputs.cashShareStart : 5;
        const targetShare = Number.isFinite(inputs.cashShareTarget) ? inputs.cashShareTarget : 20;

        return {
          title: "Optrapningssti (Glide path)",
          badge: "Likviditetsbuffer",
          quickMath: `${startShare} % ved start (${curAge} år) → ${targetShare} % ved pension (${retAge} år)`,
          description: "Viser hvordan kontantandelen af dine frie midler tilpasses over livsfaserne. Ved at opbygge kontanter frem mod pension opnår du en sikker 'kontant-buffer' til at dække de første års forbrug uden at realisere aktier i faldende markeder.",
          formula: "Andel(alder) = Startandel + (Målandel − Startandel) × ((alder − startalder) / (målalder − startalder))",
          formulaDetails: "Hvert år i op- og nedsparingsmatricen allokeres den beregnede procentdel automatisk til bankkontoen med den gældende bankrente.",
          steps: [
            { label: `Start ved ${curAge} år`, value: `${startShare} %` },
            ...(fireAge ? [{ label: `FIRE ved ${fireAge} år`, value: `${Math.round((typeof globalThis !== "undefined" && globalThis.FireCalculations?.getTargetCashShare ? globalThis.FireCalculations.getTargetCashShare(fireAge - curAge, fireAge, inputs, fireAge || retAge) : (startShare / 100)) * 100)} %` }] : []),
            { label: `Pension ved ${retAge} år`, value: `${targetShare} %`, isResult: true }
          ],
          assumptions: [
            { label: "Startandel", value: `${startShare} %` },
            { label: "Målandel", value: `${targetShare} %` },
            { label: "Strategi", value: inputs.cashShareStrategy || "glidePath" }
          ]
        };
      }

      default:
        return null;
    }
  }

  const root = typeof globalThis !== "undefined" ? globalThis : typeof window !== "undefined" ? window : this;
  root.FireMathExplainer = {
    explainTableCell,
    explainKeyMetric,
  };
})();
