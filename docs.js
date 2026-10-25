/**
 * FIRE-beregner: Interaktiv Dokumentations-Hub & Formelsandbox
 * Live beregningsmoduler for PAL-skat, aktieindkomstskat, folkepension og Monte Carlo.
 */

(function () {
  "use strict";

  // Dansk valutaformatering
  function formatDKK(num) {
    return Math.round(num).toLocaleString("da-DK") + " kr.";
  }

  function formatPct(num) {
    return (num * 100).toFixed(1).replace(".", ",") + " %";
  }

  // --------------------------------------------------------------------------
  // 1. Sandbox: PAL-skat (15,3 %)
  // --------------------------------------------------------------------------
  function initPalSandbox() {
    const startInput = document.getElementById("pal-start");
    const returnInput = document.getElementById("pal-return");
    const yearsInput = document.getElementById("pal-years");

    const startVal = document.getElementById("pal-start-val");
    const returnVal = document.getElementById("pal-return-val");
    const yearsVal = document.getElementById("pal-years-val");

    const grossRes = document.getElementById("pal-res-gross");
    const taxRes = document.getElementById("pal-res-tax");
    const netRes = document.getElementById("pal-res-net");
    const balanceRes = document.getElementById("pal-res-balance");

    if (!startInput) return;

    function calc() {
      const start = parseFloat(startInput.value);
      const r = parseFloat(returnInput.value) / 100;
      const years = parseInt(yearsInput.value, 10);

      startVal.textContent = formatDKK(start);
      returnVal.textContent = (r * 100).toFixed(1) + " %";
      yearsVal.textContent = years + (years === 1 ? " år" : " år");

      // År-for-år fremskrivning med 15,3% lagerskat
      let balance = start;
      let totalGross = 0;
      let totalTax = 0;

      for (let i = 0; i < years; i++) {
        const grossReturn = balance * r;
        const palTax = Math.max(0, grossReturn * 0.153);
        const netReturn = grossReturn - palTax;

        totalGross += grossReturn;
        totalTax += palTax;
        balance += netReturn;
      }

      grossRes.textContent = formatDKK(totalGross);
      taxRes.textContent = "− " + formatDKK(totalTax);
      netRes.textContent = formatDKK(totalGross - totalTax);
      balanceRes.textContent = formatDKK(balance);
    }

    startInput.addEventListener("input", calc);
    returnInput.addEventListener("input", calc);
    yearsInput.addEventListener("input", calc);
    calc();
  }

  // --------------------------------------------------------------------------
  // 2. Sandbox: Aktieindkomstskat (27 % vs. 42 %)
  // --------------------------------------------------------------------------
  function initStockTaxSandbox() {
    const gainInput = document.getElementById("stock-gain");
    const coupleSelect = document.getElementById("stock-couple");

    const gainVal = document.getElementById("stock-gain-val");
    const thresholdRes = document.getElementById("stock-res-threshold");
    const tax27Res = document.getElementById("stock-res-27");
    const tax42Res = document.getElementById("stock-res-42");
    const totalTaxRes = document.getElementById("stock-res-total-tax");
    const effPctRes = document.getElementById("stock-res-eff-pct");
    const netRes = document.getElementById("stock-res-net");

    if (!gainInput) return;

    function calc() {
      const gain = parseFloat(gainInput.value);
      const isCouple = coupleSelect.value === "couple";
      const threshold = isCouple ? 158800 : 79400; // 2026-satser

      gainVal.textContent = formatDKK(gain);
      thresholdRes.textContent = formatDKK(threshold);

      const part27 = Math.min(gain, threshold);
      const part42 = Math.max(0, gain - threshold);

      const tax27 = part27 * 0.27;
      const tax42 = part42 * 0.42;
      const totalTax = tax27 + tax42;
      const netGain = gain - totalTax;
      const effPct = gain > 0 ? (totalTax / gain) * 100 : 0;

      tax27Res.textContent = `${formatDKK(tax27)} (af ${formatDKK(part27)})`;
      tax42Res.textContent = `${formatDKK(tax42)} (af ${formatDKK(part42)})`;
      totalTaxRes.textContent = formatDKK(totalTax);
      effPctRes.textContent = effPct.toFixed(1).replace(".", ",") + " %";
      netRes.textContent = formatDKK(netGain);
    }

    gainInput.addEventListener("input", calc);
    coupleSelect.addEventListener("change", calc);
    calc();
  }

  // --------------------------------------------------------------------------
  // 3. Sandbox: Folkepension & Modregning i Pensionstillæg (2026)
  // --------------------------------------------------------------------------
  function initFolkepensionSandbox() {
    const incomeInput = document.getElementById("fp-income");
    const coupleSelect = document.getElementById("fp-couple");

    const incomeVal = document.getElementById("fp-income-val");
    const baseRes = document.getElementById("fp-res-base");
    const maxTillægRes = document.getElementById("fp-res-max-tillæg");
    const thresholdRes = document.getElementById("fp-res-threshold");
    const offsetRes = document.getElementById("fp-res-offset");
    const paidTillægRes = document.getElementById("fp-res-paid-tillæg");
    const totalFpRes = document.getElementById("fp-res-total");

    if (!incomeInput) return;

    function calc() {
      const income = parseFloat(incomeInput.value);
      const isCouple = coupleSelect.value === "couple";

      // 2026 Satser
      const basePension = isCouple ? 181056 : 90528;
      const maxTillæg = isCouple ? 107232 : 104772;
      const threshold = isCouple ? 197900 : 98800;
      const offsetRate = isCouple ? 0.32 : 0.309;

      incomeVal.textContent = formatDKK(income);
      baseRes.textContent = formatDKK(basePension);
      maxTillægRes.textContent = formatDKK(maxTillæg);
      thresholdRes.textContent = formatDKK(threshold);

      const excessIncome = Math.max(0, income - threshold);
      const offsetAmount = Math.min(maxTillæg, excessIncome * offsetRate);
      const paidTillæg = Math.max(0, maxTillæg - offsetAmount);
      const totalFp = basePension + paidTillæg;

      offsetRes.textContent = "− " + formatDKK(offsetAmount) + ` (${(offsetRate * 100).toFixed(1)} % af overskydende)`;
      paidTillægRes.textContent = formatDKK(paidTillæg);
      totalFpRes.textContent = formatDKK(totalFp) + " / år";
    }

    incomeInput.addEventListener("input", calc);
    coupleSelect.addEventListener("change", calc);
    calc();
  }

  // --------------------------------------------------------------------------
  // 4. Sandbox: Boligfriværdi & FIRE-provenu
  // --------------------------------------------------------------------------
  function initHousingSandbox() {
    const marketInput = document.getElementById("housing-market");
    const debtInput = document.getElementById("housing-debt");
    const growthInput = document.getElementById("housing-growth");
    const yearsInput = document.getElementById("housing-years");

    const marketVal = document.getElementById("housing-market-val");
    const debtVal = document.getElementById("housing-debt-val");
    const growthVal = document.getElementById("housing-growth-val");
    const yearsVal = document.getElementById("housing-years-val");

    const todayEquityRes = document.getElementById("housing-res-today");
    const futureMarketRes = document.getElementById("housing-res-future-market");
    const futureEquityRes = document.getElementById("housing-res-future-equity");
    const monthlyPayoutRes = document.getElementById("housing-res-monthly");

    if (!marketInput) return;

    function calc() {
      const market = parseFloat(marketInput.value);
      const debt = Math.min(market, parseFloat(debtInput.value));
      const g = parseFloat(growthInput.value) / 100;
      const years = parseInt(yearsInput.value, 10);

      marketVal.textContent = formatDKK(market);
      debtVal.textContent = formatDKK(debt);
      growthVal.textContent = (g * 100).toFixed(1) + " %";
      yearsVal.textContent = years + " år";

      const todayEquity = market - debt;
      const futureMarket = market * Math.pow(1 + g, years);
      // Simpelt lineært afdrag over 30 år
      const yearlyAmortization = debt > 0 ? debt / 30 : 0;
      const futureDebt = Math.max(0, debt - yearlyAmortization * years);
      const futureEquity = futureMarket - futureDebt;

      // Hvis friværdien udbetales over en 10-årig FIRE-bro
      const monthlyPayout = (futureEquity / 10) / 12;

      todayEquityRes.textContent = formatDKK(todayEquity);
      futureMarketRes.textContent = formatDKK(futureMarket);
      futureEquityRes.textContent = formatDKK(futureEquity);
      monthlyPayoutRes.textContent = formatDKK(monthlyPayout) + " / md. (over 10 år)";
    }

    marketInput.addEventListener("input", calc);
    debtInput.addEventListener("input", calc);
    growthInput.addEventListener("input", calc);
    yearsInput.addEventListener("input", calc);
    calc();
  }

  // --------------------------------------------------------------------------
  // 5. Sandbox: Monte Carlo Box-Muller Visualisering
  // --------------------------------------------------------------------------
  function initMonteCarloSandbox() {
    const meanInput = document.getElementById("mc-mean");
    const volInput = document.getElementById("mc-vol");
    const countInput = document.getElementById("mc-count");

    const meanVal = document.getElementById("mc-mean-val");
    const volVal = document.getElementById("mc-vol-val");
    const countVal = document.getElementById("mc-count-val");

    const p10Res = document.getElementById("mc-res-p10");
    const p50Res = document.getElementById("mc-res-p50");
    const p90Res = document.getElementById("mc-res-p90");
    const canvas = document.getElementById("mc-canvas");

    if (!meanInput || !canvas) return;

    // Box-Muller algoritme
    function randomLogNormal(mu, sigma) {
      let u1 = Math.random();
      let u2 = Math.random();
      while (u1 === 0) u1 = Math.random();
      while (u2 === 0) u2 = Math.random();
      const z = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
      return Math.exp(mu + sigma * z) - 1.0;
    }

    function runSimulation() {
      const mean = parseFloat(meanInput.value) / 100;
      const vol = parseFloat(volInput.value) / 100;
      const n = parseInt(countInput.value, 10);

      meanVal.textContent = (mean * 100).toFixed(1) + " %";
      volVal.textContent = (vol * 100).toFixed(1) + " %";
      countVal.textContent = n.toLocaleString("da-DK") + " forløb";

      // Mu-justering for log-normalitet
      const logMu = Math.log(1 + mean) - 0.5 * Math.pow(vol, 2);

      const ctx = canvas.getContext("2d");
      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);

      // Simuler 30 år med 1 mio. kr. startformue og 40.000 kr. årligt træk (4% SWR)
      const startCapital = 1000000;
      const annualWithdrawal = 40000;
      const allFinalReserves = [];

      ctx.lineWidth = 1;
      ctx.strokeStyle = "rgba(47, 112, 157, 0.15)";

      // Tegn op til 100 kurver på lærredet
      const curvesToDraw = Math.min(n, 80);

      for (let s = 0; s < n; s++) {
        let cap = startCapital;
        const trajectory = [cap];

        for (let y = 1; y <= 30; y++) {
          const ret = randomLogNormal(logMu, vol);
          cap = Math.max(0, cap * (1 + ret) - annualWithdrawal);
          trajectory.push(cap);
        }

        allFinalReserves.push(cap);

        if (s < curvesToDraw) {
          ctx.beginPath();
          trajectory.forEach((val, idx) => {
            const x = (idx / 30) * (w - 40) + 20;
            const yPos = h - 20 - (val / 3500000) * (h - 40);
            if (idx === 0) ctx.moveTo(x, yPos);
            else ctx.lineTo(x, Math.max(10, Math.min(h - 20, yPos)));
          });
          ctx.stroke();
        }
      }

      // Sorter for percentiler
      allFinalReserves.sort((a, b) => a - b);
      const p10 = allFinalReserves[Math.floor(n * 0.1)];
      const p50 = allFinalReserves[Math.floor(n * 0.5)];
      const p90 = allFinalReserves[Math.floor(n * 0.9)];

      p10Res.textContent = formatDKK(p10);
      p50Res.textContent = formatDKK(p50);
      p90Res.textContent = formatDKK(p90);

      // Tegn P50 median-linje
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = "#164b39";
      ctx.beginPath();
      // Indikator
      ctx.stroke();
    }

    meanInput.addEventListener("input", runSimulation);
    volInput.addEventListener("input", runSimulation);
    countInput.addEventListener("input", runSimulation);
    runSimulation();
  }

  // --------------------------------------------------------------------------
  // 6. Docs Navigation & Søgning
  // --------------------------------------------------------------------------
  function initDocsNav() {
    const searchInput = document.getElementById("docs-search-input");
    const navLinks = document.querySelectorAll(".docs-nav-link");

    // Aktiv link tracking ved scroll
    window.addEventListener("scroll", () => {
      const sections = document.querySelectorAll(".docs-section");
      let currentSection = "";

      sections.forEach(sec => {
        const top = sec.offsetTop - 80;
        if (window.scrollY >= top) {
          currentSection = sec.id;
        }
      });

      navLinks.forEach(link => {
        link.classList.toggle("active", link.getAttribute("href") === `#${currentSection}`);
      });
    }, { passive: true });

    // Søgning i dokumentationen
    if (searchInput) {
      searchInput.addEventListener("input", (e) => {
        const query = e.target.value.toLowerCase().trim();
        const cards = document.querySelectorAll(".docs-card, .docs-sandbox-card, .docs-section");

        if (!query) {
          cards.forEach(c => (c.style.display = ""));
          return;
        }

        cards.forEach(c => {
          const text = c.textContent.toLowerCase();
          c.style.display = text.includes(query) ? "" : "none";
        });
      });
    }
  }

  // Initialiser når DOM er klar
  document.addEventListener("DOMContentLoaded", () => {
    initPalSandbox();
    initStockTaxSandbox();
    initFolkepensionSandbox();
    initHousingSandbox();
    initMonteCarloSandbox();
    initDocsNav();
  });
})();
