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

  function formatDiffCurrency(diff) {
    if (!Number.isFinite(diff)) return "—";
    const prefix = diff > 0 ? "+" : "";
    return `${prefix}${currency.format(diff)}`;
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
        return {
          title: `Forventet afkast (${yearDate} · ${age} år)`,
          badge: "Afkast & Rente",
          quickMath: `Nominelt: ${percent.format(nominalReturn)} før skat · ${percent.format(netNominal)} efter PAL`,
          description: "Viser årets formuevægtede gennemsnitlige afkast på tværs af dine investerede depoter (pension, ASK og frie midler) frem mod næste år.",
          formula: "Nominelt afkast = Vægtet gennemsnit af aktivernes forventede afkast",
          formulaDetails: "Efter PAL-skat (15,3 %) og inflation (2,0 %) opnås et reelt købekraftsafkast.",
          steps: [
            { label: "Forventet nominelt afkast før skat", value: percent.format(nominalReturn) },
            { label: "Pensionsafkast efter PAL-skat (15,3 %)", value: percent.format(netNominal) },
            { label: "Forventet årlig inflation", value: percent.format(inflRate) },
            { label: "Beregnet realafkast på pension", value: percent.format(real), isResult: true }
          ],
          assumptions: [
            { label: "Grundafkast", value: percent.format(inputs.returnRate) },
            { label: "Defensivt afkast ved pension", value: percent.format(inputs.defensiveReturnRate ?? inputs.returnRate) },
            { label: "Nedtrapningsstrategi", value: calculation.returnStrategy === "none" ? "Ingen (konstant afkast)" : "Glidende nedtrapning" }
          ]
        };
      }

      case "ratePension": {
        const start = prevRow ? prevRow.ratePension : inputs.ratePensionBalance;
        const contrib = row.contribution > 0 ? (calculation.annualRatePensionContribution ?? 0) : 0;
        const grossReturn = start * (row.pensionReturnRate ?? nominalReturn);
        const pal = grossReturn > 0 ? grossReturn * palTaxRate : 0;
        const withdrawal = row.taxableRatePensionWithdrawal ?? 0;
        const end = row.ratePension;
        return {
          title: `Ratepension (${yearDate} · ${age} år)`,
          badge: "Pensionsdepot",
          quickMath: `${currency.format(start)} (start) + ${currency.format(contrib)} (indb.) + ${currency.format(grossReturn - pal)} (afkast e. PAL) − ${currency.format(withdrawal)} (udb.) = ${currency.format(end)}`,
          description: "Ratepensionen investeres med lempelig PAL-beskatning (15,3 % af årligt afkast). Indbetalinger er fradragsberettigede op til det årlige loft, og udbetalinger beskattes som personlig indkomst.",
          formula: "Ultimo = Primo + Indbetaling + Afkast før skat − PAL-skat (15,3 %) − Udbetaling",
          formulaDetails: "PAL-skatten trækkes løbende hvert år af det positive afkast.",
          steps: [
            { label: "Startsaldo (primo)", value: currency.format(start) },
            { label: "Årets indbetaling", value: `+ ${currency.format(contrib)}`, note: contrib > 0 ? "Indbetaling i opsparingsfasen" : "Pensionsindbetaling stoppet" },
            { label: `Afkast før skat (${percent.format(row.pensionReturnRate ?? nominalReturn)})`, value: `+ ${currency.format(grossReturn)}` },
            { label: "PAL-skat (15,3 % af positivt afkast)", value: `− ${currency.format(pal)}` },
            { label: "Årets ratepensionsudbetaling", value: withdrawal > 0 ? `− ${currency.format(withdrawal)}` : "0 kr." },
            { label: "Slutsaldo (ultimo)", value: `= ${currency.format(end)}`, isResult: true }
          ],
          assumptions: [
            { label: "PAL-skattesats", value: "15,3 %" },
            { label: "Fradragsværdi ved indbetaling", value: percent.format(inputs.ratePensionContributionTaxRelief ?? 0.528) },
            { label: "Skat ved udbetaling", value: percent.format(inputs.pensionWithdrawalTax ?? 0.37) }
          ]
        };
      }

      case "lifeAnnuityDepotValue": {
        const depot = row.lifeAnnuityDepotValue;
        const income = row.lifeAnnuityWithdrawal;
        return {
          title: `Livrentedepot (${yearDate} · ${age} år)`,
          badge: "Livsvarig pension",
          quickMath: income > 0 ? `Beregnet depotværdi: ${currency.format(depot)} · Giver ${currency.format(income)}/år livsvarigt` : `Opsparet depot: ${currency.format(depot)}`,
          description: "Livrenten udbetales livsvarigt fra pensionsalderen uanset alder. Efter pensionsstart repræsenterer livrentedepotet den aktuarmæssige nutidsværdi af de resterende forventede udbetalinger baseret på Finanstilsynets levetidsmodel.",
          formula: row.phase === "Pension" ? "Nutidsværdi = Årlig udbetaling × Aktuarmæssig annuitetsfaktor for restlevetid" : "Ultimo = Primo + Indskud + Afkast efter PAL-skat",
          formulaDetails: "Udbetalingen reguleres årligt med det opnåede afkast fratrukket PAL og grundlagsrente.",
          steps: [
            { label: "Livrentedepot ved årets udgang", value: currency.format(depot) },
            { label: "Årlig livsvarig udbetaling før skat", value: income > 0 ? currency.format(income) : "0 kr. (Udbetales fra pension)" },
            { label: "Forventet levealder", value: `${yearsFormat.format(calculation.lifeAnnuityExpectedAgeAtDeath ?? 88)} år` },
            { label: "Estimeret omregningssats ved start", value: percent.format(calculation.lifeAnnuityConversionRate ?? 0.045), isResult: true }
          ],
          assumptions: [
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
        const start = prevRow ? prevRow.ageSavings : inputs.ageSavingsBalance;
        const contrib = row.contribution > 0 ? (calculation.annualAgeSavingsContribution ?? 0) : 0;
        const grossReturn = start * (row.pensionReturnRate ?? nominalReturn);
        const pal = grossReturn > 0 ? grossReturn * palTaxRate : 0;
        const end = row.ageSavings;
        return {
          title: `Aldersopsparing (${yearDate} · ${age} år)`,
          badge: "Skattefri udbetaling",
          quickMath: `${currency.format(start)} + ${currency.format(contrib)} (indb.) + ${currency.format(grossReturn - pal)} (afkast e. PAL) = ${currency.format(end)}`,
          description: "Aldersopsparing er skattefri ved udbetaling og modregnes IKKE i folkepensionens tillægsbeløb. Afkast beskattes med den lave PAL-skat på 15,3 %.",
          formula: "Ultimo = Primo + Indskud + Afkast efter PAL-skat (15,3 %) − Udbetaling",
          formulaDetails: "Ingen fradrag ved indbetaling, men 0 % i skat ved udbetaling.",
          steps: [
            { label: "Startsaldo (primo)", value: currency.format(start) },
            { label: "Årets indbetaling", value: `+ ${currency.format(contrib)}` },
            { label: "Afkast efter 15,3 % PAL-skat", value: `+ ${currency.format(grossReturn - pal)}` },
            { label: "Slutsaldo (ultimo)", value: `= ${currency.format(end)}`, isResult: true }
          ],
          assumptions: [
            { label: "PAL-skat", value: "15,3 %" },
            { label: "Beskatning ved hævning", value: "0 kr. (100 % skattefri)" },
            { label: "Modregning i folkepension", value: "Ingen modregning" }
          ]
        };
      }

      case "freeFunds": {
        const start = prevRow ? prevRow.freeFunds : inputs.freeFundsBalance;
        const contrib = row.contribution > 0 ? (calculation.annualFreeFundsContribution ?? 0) : 0;
        const grossReturn = start * (row.freeFundsReturnRate ?? nominalReturn);
        const lagerskat = row.annualFreeFundsTax ?? 0;
        const end = row.freeFunds;
        return {
          title: `Frie midler (${yearDate} · ${age} år)`,
          badge: "Likvid formue",
          quickMath: `${currency.format(start)} + ${currency.format(contrib)} (indb.) + ${currency.format(grossReturn)} (afkast) − ${currency.format(lagerskat)} (skat) = ${currency.format(end)}`,
          description: "Frie investeringsmidler er fuldt fleksible og tilgængelige før pensionsalderen. De danner grundlaget for broen fra FIRE-start frem til folkepensionen.",
          formula: "Ultimo = Primo + Indbetaling + Afkast − Lagerskat/Realisationsskat − Hævning",
          formulaDetails: "Afkast beskattes som aktieindkomst (27 % op til progressionsgrænsen på 79.400 kr. / 158.800 kr. for par, derefter 42 %).",
          steps: [
            { label: "Startsaldo (primo)", value: currency.format(start) },
            { label: "Nettobidrag til frie midler", value: `+ ${currency.format(contrib)}` },
            { label: "Beregnet afkast før skat", value: `+ ${currency.format(grossReturn)}` },
            { label: "Lagerskat af årets afkast", value: lagerskat > 0 ? `− ${currency.format(lagerskat)}` : "0 kr. (eller udskudt realisationsskat)" },
            { label: "Slutsaldo (ultimo)", value: `= ${currency.format(end)}`, isResult: true }
          ],
          assumptions: [
            { label: "Beskatningsform", value: inputs.freeFundsInventoryShare > 0 ? `${percent.format(inputs.freeFundsInventoryShare)} lagerbeskattet` : "Realisationsbeskattet" },
            { label: "Aktieskattesatser", value: "27 % / 42 %" },
            { label: "Status for par", value: inputs.isCouple ? "Gift/Samlevende (Dobbelt bundgrænse)" : "Enlig" }
          ]
        };
      }

      case "ask": {
        const start = prevRow ? prevRow.ask : inputs.askBalance;
        const grossReturn = start * (row.freeFundsReturnRate ?? nominalReturn);
        const tax = grossReturn > 0 ? grossReturn * askTaxRate : 0;
        const end = row.ask;
        return {
          title: `Aktiesparekonto (${yearDate} · ${age} år)`,
          badge: "Lav skat (17 %)",
          quickMath: `${currency.format(start)} + ${currency.format(grossReturn)} (afkast) − ${currency.format(tax)} (17 % skat) = ${currency.format(end)}`,
          description: "Aktiesparekontoen beskattes efter lagerprincippet med en attraktiv flad skat på kun 17 %. Midlerne kan frit hæves til forbrug i FIRE.",
          formula: "Ultimo = Primo + Indskud + Afkast − 17 % lagerskat − Hævning",
          formulaDetails: "Lagerskatten afregnes automatisk én gang årligt i starten af det efterfølgende år.",
          steps: [
            { label: "Startsaldo (primo)", value: currency.format(start) },
            { label: `Afkast før skat (${percent.format(row.freeFundsReturnRate ?? nominalReturn)})`, value: `+ ${currency.format(grossReturn)}` },
            { label: "Lagerskat (17 %)", value: `− ${currency.format(tax)}` },
            { label: "Slutsaldo (ultimo)", value: `= ${currency.format(end)}`, isResult: true }
          ],
          assumptions: [
            { label: "Skattesats", value: "17,0 % (flad lagerskat)" },
            { label: "Indskudsloft (2026)", value: inputs.isCouple ? "348.400 kr. (Par)" : "174.200 kr. (Enlig)" }
          ]
        };
      }

      case "totalDepotValue": {
        const depot = row.totalDepotValue;
        return {
          title: `Samlet depotværdi (${yearDate} · ${age} år)`,
          badge: "Finansiel formue",
          quickMath: `Ratepension (${currency.format(row.ratePension)}) + Livrente (${currency.format(row.lifeAnnuityDepotValue)}) + Aldersops. (${currency.format(row.ageSavings)}) + Frie midler (${currency.format(row.freeFunds)}) + ASK (${currency.format(row.ask)}) = ${currency.format(depot)}`,
          description: "Den samlede finansielle investeringsportefølje eksklusive fast ejendom. Omfatter alle likvide depoter og pensionskonti.",
          formula: "Samlet depotværdi = Ratepension + Livrentedepot + Aldersopsparing + Frie midler + ASK",
          formulaDetails: "Inkluderer den aktuarmæssige værdi af livrenten.",
          steps: [
            { label: "Ratepension", value: currency.format(row.ratePension) },
            { label: "Livrentedepot", value: currency.format(row.lifeAnnuityDepotValue) },
            { label: "Aldersopsparing", value: currency.format(row.ageSavings) },
            { label: "Frie midler", value: currency.format(row.freeFunds) },
            { label: "Aktiesparekonto", value: currency.format(row.ask) },
            { label: "Samlet depotværdi", value: `= ${currency.format(depot)}`, isResult: true }
          ],
          assumptions: [
            { label: "Inkluderer bolig", value: "Nej (kun finansielle depoter)" }
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
        return {
          title: `Årlig indbetaling (${yearDate} · ${age} år)`,
          badge: "Opsparing",
          quickMath: val > 0 ? `${currency.format(val)} indbetalt i alt dette år` : "Ingen nye indbetalinger (Opsparingsstop)",
          description: "Den samlede bruttosum indbetalt på tværs af ratepension, livrente, aldersopsparing, aktiesparekonto og frie midler i det pågældende år.",
          formula: "Indbetaling = Ratepension + Livrente + Aldersopsparing + ASK + Frie midler",
          formulaDetails: "Reguleres årligt med inflationen hvis dette er tilvalgt.",
          steps: [
            { label: "Ratepension", value: currency.format(calculation.annualRatePensionContribution ?? 0) },
            { label: "Livrente", value: currency.format(calculation.annualLifeAnnuityContribution ?? 0) },
            { label: "Aldersopsparing", value: currency.format(calculation.annualAgeSavingsContribution ?? 0) },
            { label: "Frie midler", value: currency.format(calculation.annualFreeFundsContribution ?? 0) },
            { label: "Samlet årlig indbetaling", value: `= ${currency.format(val)}`, isResult: true }
          ],
          assumptions: [
            { label: "Inflationsregulering", value: inputs.contributionsFollowInflation ? "Ja (følger inflation)" : "Nej (fast beløb)" }
          ]
        };
      }

      case "withdrawal": {
        const gross = row.withdrawal ?? 0;
        const tax = row.totalWithdrawalTax ?? 0;
        const net = row.netWithdrawal ?? (gross - tax);
        return {
          title: `Brutto-udbetaling (${yearDate} · ${age} år)`,
          badge: "Hævning",
          quickMath: `${currency.format(gross)} før skat − ${currency.format(tax)} (skat) = ${currency.format(net)} udbetalt til forbrug`,
          description: "Det samlede hævede beløb fra pensioner og frie midler før skat til dækning af dit ønskede årlige forbrug.",
          formula: "Brutto-udbetaling = Hævning fra frie midler + Pensionsudbetalinger",
          formulaDetails: "Kombineres med eventuel folkepension, ATP og efterløn.",
          steps: [
            { label: "Brutto hævet fra depoter", value: currency.format(gross) },
            { label: "Beregnet samlet skat", value: `− ${currency.format(tax)}` },
            { label: "Netto udbetalt til forbrug", value: `= ${currency.format(net)}`, isResult: true }
          ],
          assumptions: [
            { label: "Ønsket årligt forbrug", value: currency.format(inputs.desiredAnnualWithdrawal) },
            { label: "Angivet beløb", value: inputs.withdrawalAfterTax ? "Efter skat (købekraft)" : "Før skat" }
          ]
        };
      }

      case "netWithdrawal": {
        const net = row.netWithdrawal ?? 0;
        const otherNet = (row.publicPensionNet ?? 0) + (row.atpGross ? row.atpGross * 0.63 : 0);
        return {
          title: `Netto-udbetaling (${yearDate} · ${age} år)`,
          badge: "Rådighedsbeløb",
          quickMath: `${currency.format(net)} udbetalt efter skat fra porteføljen`,
          description: "Det faktiske kontante beløb, der går ind på din konto til forbrug efter afregning af al skat.",
          formula: "Netto = Brutto-udbetaling − Kildeskat/Aktieskat",
          formulaDetails: "Sikrer at dit månedlige/årlige rådighedsbeløb matcher din FIRE-målsætning.",
          steps: [
            { label: "Netto fra opsparingsdepoter", value: currency.format(net) },
            { label: "Netto fra folkepension & ATP", value: otherNet > 0 ? `+ ${currency.format(otherNet)}` : "0 kr." },
            { label: "Samlet udbetalt til forbrug", value: `= ${currency.format(net + otherNet)}`, isResult: true }
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
