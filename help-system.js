/**
 * FIRE-beregner: Interaktivt Hjælpesystem, Guidet Rundvisning & Videnscenter
 * Modulært og selvstændigt script (kan tilføjes/fjernes uden påvirkning af beregnerens kerne).
 */

(function (global) {
  "use strict";

  // Vidensbase med kategoriserede emner og felt-forklaringer
  const HELP_DB = {
    categories: [
      {
        id: "fire",
        title: "🔥 FIRE & Økonomisk Frihed",
        items: [
          {
            id: "what-is-fire",
            title: "Hvad betyder FIRE?",
            tags: ["begreb"],
            content: "<strong>FIRE</strong> står for <em>Financial Independence, Retire Early</em> (Økonomisk Uafhængighed, Tidlig Pension). Målet er at opbygge en investeret formue og pensionsmidler, der kaster nok afkast af sig til at dække dine leveomkostninger resten af livet."
          },
          {
            id: "fire-bridge",
            title: "Hvad er 'FIRE-broen'?",
            tags: ["strategi"],
            content: "FIRE-broen er perioden fra du stopper med at arbejde (fx som 55- eller 60-årig) og indtil du kan få udbetalt dine pensioner og folkepension (typisk 67–70 år). I denne bro-fase lever du primært af <strong>frie midler, Aktiesparekonto og eventuelt friværdi</strong>."
          },
          {
            id: "swr-rule",
            title: "Hvad er 4%-reglen (SWR)?",
            tags: ["matematik"],
            content: "4%-reglen stammer fra den berømte <em>Trinity Study</em> og angiver, at man historisk har kunnet hæve 4 % af sin startformue (inflationskorrigeret) hvert år over 30 år uden at løbe tør. I denne beregner bruges i stedet en <strong>dynamisk likviditetsmodel</strong>, der tager højde for skat, modregning og ændrede forbrugsfaser."
          }
        ]
      },
      {
        id: "tax",
        title: "🏛️ Danske Skatteregler (2026)",
        items: [
          {
            id: "pal-tax",
            title: "PAL-skat (15,3 % på pensionsafkast)",
            tags: ["skat", "tax"],
            content: "Pensionsafkastbeskatningsloven (PAL) beskatter det årlige afkast på pensionsordninger med en fast flad sats på <strong>15,3 %</strong>. Skatten trækkes automatisk hvert år som lagerskat af pensionsselskabet."
          },
          {
            id: "stock-tax",
            title: "Aktieindkomstskat (27 % og 42 % knæk)",
            tags: ["skat", "tax"],
            content: "Gevinster og udbytter på frie aktier beskattes med <strong>27 % op til progressionsgrænsen</strong> (79.400 kr. i 2026 for enlige / 158.800 kr. for ægtepar) og <strong>42 % derover</strong>. Beregnerens skatteoptimale udbetaling udnytter systematisk 27 %-grænsen hvert eneste år."
          },
          {
            id: "ask-tax",
            title: "Aktiesparekonto (17 % lagerskat)",
            tags: ["skat", "tax"],
            content: "På en Aktiesparekonto (ASK) beskattes det årlige afkast med blot <strong>17 % som lagerskat</strong>. Indskudsloftet i 2026 er 174.200 kr. (348.400 kr. for par). Udbetalinger fra ASK er <strong>100 % skattefrie</strong> og modregnes aldrig i folkepensionen."
          },
          {
            id: "pension-payout-tax",
            title: "Udbetalingsskat på pensioner (37 %)",
            tags: ["skat", "pension"],
            content: "Udbetalinger fra ratepension og livrente beskattes som personlig indkomst uden AM-bidrag (gennemsnitlig trækprocent ca. 37 % afhængig af bopælskommune). Aldersopsparing er derimod <strong>skattefri ved udbetaling</strong>."
          }
        ]
      },
      {
        id: "pension",
        title: "👴 Folkepension & Modregning",
        items: [
          {
            id: "folkepension-rates",
            title: "Folkepensionssatser (2026)",
            tags: ["pension"],
            content: "I 2026 udgør <strong>Grundbeløbet</strong> 90.528 kr./år pr. person (uafhængigt af civilstand). <strong>Pensionstillægget</strong> udgør op til 104.772 kr./år for enlige og 107.232 kr./år samlet for par."
          },
          {
            id: "modregning-rules",
            title: "Hvordan fungerer modregning i pensionstillægget?",
            tags: ["pension", "matematik"],
            content: "Har du anden skattepligtig indkomst (fra ratepension, livrente eller ATP) over bundfradraget (98.800 kr. for enlige / 197.900 kr. for par), <strong>modregnes 30,9 % for enlige og 32,0 % for par</strong> i pensionstillægget. Frie midler, ASK og aldersopsparing modregnes <strong>0 kr.</strong>!"
          }
        ]
      },
      {
        id: "housing",
        title: "🏡 Bolig & Friværdi",
        items: [
          {
            id: "housing-equity",
            title: "Hvordan indregnes boligfriværdi?",
            tags: ["bolig"],
            content: "Friværdi beregnes som <code>(Markedsværdi − Restgæld) × Ejerandel</code>. Hvert år fremskrives boligen med forventet prisvækst, og gælden nedbringes med årlige afdrag. Ved den valgte frigørelsesalder overføres nettoprovenuet til dine likvide frie midler."
          }
        ]
      },
      {
        id: "risk",
        title: "🎲 Monte Carlo & Historiske Kriser",
        items: [
          {
            id: "monte-carlo-how",
            title: "Hvad viser Monte Carlo-simuleringen?",
            tags: ["risiko", "matematik"],
            content: "I stedet for at antage et konstant årligt afkast, kører Monte Carlo 100–1.000 forløb med tilfældige markedsudsving baseret på normalfordeling (Box-Muller). Det viser dig sandsynligheden for succes samt pessismistiske scenarier (P10) og optimistiske scenarier (P90)."
          },
          {
            id: "crisis-stress-test",
            title: "Historiske Stresstests (1929, 1973, 2000, 2008)",
            tags: ["risiko"],
            content: "Test om din opsparing overlever historiens 4 største børskrak på din første dag som pensionist. Hvis din plan overlever 1929 (-80 % fald) eller 1973 (stagflation), er den usædvanlig robust."
          }
        ]
      },
      {
        id: "cash",
        title: "💰 Kontantreserve, Rente & Glide Path",
        items: [
          {
            id: "cash-reserve-why",
            title: "Hvorfor opbygge en kontantreserve?",
            tags: ["kontant", "strategi", "risiko"],
            content: "En likvid kontantreserve i banken (eller på højrentekonto) beskytter mod <em>Sequence-of-Returns Risk</em> (sekvensrisiko). Hvis aktiemarkedet styrtdykker i dine første pensionsår, lever du af kontanterne og undgår tvangssalg af aktier i bunden."
          },
          {
            id: "cash-glide-path",
            title: "Hvad er den lineære Glide Path for kontanter?",
            tags: ["kontant", "strategi"],
            content: "En Glide Path øger gradvist kontantandelen af dine frie midler (fx fra 5 % som 50-årig til 20-30 % ved FIRE-alderen). Derved gearer du automatisk risikoen ned i årene op til arbejdsophør."
          },
          {
            id: "cash-taxation",
            title: "Hvordan beskattes bankrenter på kontanter?",
            tags: ["kontant", "skat"],
            content: "Renter af kontante bankindeståender beskattes som <strong>kapitalindkomst</strong> (typisk 25–42 % afhængig af bopælskommune og øvrig kapitalindkomst) og holdes adskilt fra aktieindkomstbeskatningen."
          }
        ]
      },
      {
        id: "cockpit",
        title: "🎛️ Cockpit & Multi-Layer Grafer",
        items: [
          {
            id: "cockpit-dashboard",
            title: "Hvad viser Cockpit Dashboardet?",
            tags: ["dashboard", "grafer"],
            content: "Cockpittet samler dine vigtigste nøgletal i et kompakt overblik: opnået FIRE-alder, overlevelsesrate (solvens), slutreserve ved 90 år, samlet levetidsskat og det månedlige rådighedsbeløb."
          },
          {
            id: "multi-layer-flow",
            title: "Multi-Layer Area Flow Streamgraphs",
            tags: ["grafer"],
            content: "Den lagdelte arealgraf viser præcis fordelingen af din samlede formue over tid: Pensioner (lilla), Frie aktier (grøn), Frie kontanter (blå) og Boligfriværdi (orange) med synkroniseret hover-koordinator."
          }
        ]
      },
      {
        id: "optimization",
        title: "🎯 Modregnings-Assistent: De 3 Strategier",
        items: [
          {
            id: "modregning-opt-3",
            title: "De 3 gyldne regler mod modregning i pensionstillæg",
            tags: ["pension", "strategi", "skat"],
            content: "<ol style='padding-left:18px; margin:0;'><li><strong>Hæv ASK og aldersopsparing først:</strong> Udbetales 100 % skattefrit og modregnes 0 kr. i folkepension.</li><li><strong>Stræk ratepension over 15–20 år:</strong> Hold den årlige udbetaling under 98.800 kr. bundfradraget (197.900 kr. for par).</li><li><strong>Udnyt 27 % aktieskattegrænsen:</strong> Realiser aktiegevinster op til 79.400 kr. (158.800 kr. for par) – aktieindkomst modregnes ikke i pensionstillægget!</li></ol>"
          }
        ]
      },
      {
        id: "inspection",
        title: "🔍 Matematisk Inspektør & Regnskabstabel",
        items: [
          {
            id: "math-accounting",
            title: "Sådan læses regnskabstabellen i højrekliksmodalen",
            tags: ["matematik", "inspektion"],
            content: "Hovedposterne summerer direkte: <code>Startsaldo + Indbetaling + Nettoafkast − Udbetaling = Slutsaldo</code>.<br><br>Underposter med <code>↳</code> viser:<br>• Bruttoafkast af primosaldo og indbetaling<br>• Heraf skat (PAL 15,3 %, ASK 17 % eller lagerskat) med minus<br>• Heraf inflationskorrektion (købekraftstab) med minus<br>Hvor bruttoafkast minus skat minus inflation summerer nøjagtigt til nettoafkastet."
          }
        ]
      },
      {
        id: "tornado",
        title: "🌪️ Følsomhedsanalyse (Tornado-diagram)",
        items: [
          {
            id: "tornado-factors",
            title: "Hvilke faktorer flytter din FIRE-alder mest?",
            tags: ["risiko", "analyse"],
            content: "Tornado-analysen tester 4 nøgleparametre og rangerer dem efter effekt på FIRE-alderen:<br>1. <strong>Forbrugsbehov (±20 %):</strong> Typisk den største enkeltfaktor (4–7 års sving).<br>2. <strong>Investeringsafkast (±1 %-point):</strong> Har enorm renters-rente effekt.<br>3. <strong>Inflation (±1 %-point):</strong> Eder købekraften over 30–40 år.<br>4. <strong>Månedlig opsparing (±20 %):</strong> Accelererer opsparingsfasen."
          }
        ]
      }
    ],

    // Mappede forklaringer til konkrete HTML input-felter
    fields: {
      "current-age": {
        title: "Nuværende Alder",
        desc: "Din alder i dag. Beregningen starter pr. dags dato og fremskriver din formue fremadrettet måned for måned."
      },
      "fire-age": {
        title: "Ønsket FIRE-alder",
        desc: "Den alder hvor du ønsker at stoppe med ordinært arbejde og overgå til at leve af din opsparing og pensioner."
      },
      "life-expectancy": {
        title: "Forventet Levealder",
        desc: "Planlægningshorisonten for din udbetaling. Standarden er 90 eller 95 år for at sikre tilstrækkelig sikkerhedsmargin."
      },
      "monthly-savings": {
        title: "Månedlig Opsparing",
        desc: "Hvor meget du lægger til side hver måned af din løn frem til FIRE-alderen. Beløbet investeres løbende."
      },
      "free-funds-balance": {
        title: "Frie midler (totalt)",
        desc: "Din samlede frie formue i dag (både frie aktier og kontanter i banken, ekskl. ASK). Fordelingen mellem aktier og kontanter allokeres med slideren under kontantreserve."
      },
      "free-funds-cost-basis": {
        title: "Samlet købspris (aktier)",
        desc: "Din oprindelige anskaffelsessum for de aktier, du ejer i frie midler (dvs. den investerede aktieværdi). Bruges til at beregne den skattepligtige kursgevinst ved fremtidige salg efter realisationsprincippet."
      },
      "display-free-stock-val": {
        title: "Værdi af aktier (frie midler)",
        desc: "Værdien af dine frie aktier og fonde (Frie midler totalt minus kontantreserve). Forrentes med dit valgte investeringsafkast og beskattes som aktieindkomst ved salg efter realisationsprincippet."
      },
      "display-free-cash-val": {
        title: "Værdi af kontanter (frie midler)",
        desc: "Værdien af din likvide kontantreserve i banken (beregnet ud fra din valgte kontantandel). Forrentes med din valgte bankrente og sikrer dig likviditet uden kursrisiko i krisetider."
      },
      "withdrawal-strategy-select": {
        title: "Udbetalingsstrategi & Hæverækkefølge",
        desc: "Vælg om udbetalinger skal være Skatteoptimeret (27 % først, derefter kontant & ASK), Kontantreserve først (brug kontanter før aktiesalg), Bevar kontantreserve (sælg aktier før kontantreserve) eller Forholdsmæssig."
      },
      "withdrawal-strategy-opt-select": {
        title: "Udbetalingsstrategi & Hæverækkefølge (Optimering)",
        desc: "Synkroniseret med udbetalingsstrategien i grundindstillingerne. Vælger hvordan frie midler, ASK og pensioner prioriteres under FIRE- og pensionsudbetalingen."
      },
      "cash-share-strategy-select": {
        title: "Optrapningsprofil for kontantreserve (Glide Path)",
        desc: "Vælg hvordan kontantandelen udvikler sig over årene: Glidende optrapning mod folkepension (lineær), Glidende optrapning mod FIRE-start, Trinvis stigning ved folkepension, Trinvis stigning ved FIRE-start, eller Fast kontantandel alle år."
      },
      "free-savings": {
        title: "Frie Midler (Startsaldo)",
        desc: "Værdien af din eksisterende aktie- eller investeringsopsparing uden for pensionsordninger."
      },
      "tax-optimal-withdrawal": {
        title: "Skatteoptimal Udbetaling & Hæverækkefølge",
        desc: "Når dette er slået til, udnytter beregneren systematisk det lave 27 % aktieskatteknæk og tømmer skattefrie konti først for at minimere din samlede skattebetaling."
      },
      "is-couple": {
        title: "Par- / Husstandstilstand",
        desc: "Aktiverer dobbelte grænser for 27 % aktieskat (158.800 kr.), dobbelt Aktiesparekonto-loft (348.400 kr.) og gifte/samlevende folkepensionssatser."
      },
      "housing-market-value": {
        title: "Boligens Markedsværdi",
        desc: "Den anslåede salgspris for din ejer- eller andelsbolig i dag."
      },
      "housing-debt": {
        title: "Restgæld i Boligen",
        desc: "Din samlede restgæld på realkreditlån og banklån i boligen."
      }
    }
  };

  // Trin i den guidede rundvisning
  const TOUR_STEPS = [
    {
      target: ".planner-card",
      fallbackTarget: "#fire-form",
      title: "1. Velkommen til FIRE-beregneren",
      desc: "Her indtaster du dine personlige forudsætninger for at beregne, hvornår du kan opnå økonomisk frihed. Lad os tage en hurtig 1-minuts rundtur!"
    },
    {
      target: "#current-age",
      fallbackTarget: ".form-surface",
      title: "2. Alder & Tidslinje",
      desc: "Angiv din nuværende alder, din ønskede FIRE-alder og den officielle folkepensionsalder. Beregneren modellerer overgangen fra arbejdsliv til pension."
    },
    {
      target: "#free-savings",
      fallbackTarget: "#monthly-savings",
      title: "3. Frie Midler & Månedlig Opsparing",
      desc: "Indtast dine likvide investeringer og hvor meget du kan opspare hver måned. Du kan også prioritere Aktiesparekontoen op til indskudsloftet."
    },
    {
      target: "#pension-rate",
      fallbackTarget: "#housing-market-value",
      title: "4. Pensioner & Boligfriværdi",
      desc: "Angiv ratepension, livrente og aldersopsparing. Ejer du bolig, kan du medregne friværdien og vælge at frigøre den ved pension."
    },
    {
      target: "#tax-optimal-withdrawal",
      fallbackTarget: ".calc-mode-toolbar",
      title: "5. Skatteoptimal Udbetaling",
      desc: "Vælg 'Skatteoptimal' for automatisk at udnytte det årlige 27 % aktieskatteknæk og minimere modregning i din folkepension."
    },
    {
      target: "#chart-container",
      fallbackTarget: ".charts-section",
      title: "6. Interaktive Grafer & Cashflow",
      desc: "Følg din samlede formue, dit årlige cashflow (hvor pengene hæves fra), årlig skat og solvenssandsynlighed over tid."
    },
    {
      target: "#stress-test-section",
      fallbackTarget: "#scenario-container",
      title: "7. Stresstest & Monte Carlo",
      desc: "Test om din formue overlever historiens værste børskrak (fx 1929 eller 2008) og se Monte Carlo-konfidensbåndene for din fremtid."
    }
  ];

  // Intern tilstand
  let state = {
    isDrawerOpen: false,
    isTourActive: false,
    currentTourStep: 0,
    isInspecting: false,
    domElements: {}
  };

  /**
   * Bygger og injicerer hjælpesystemets DOM-elementer
   */
  function buildDOM() {
    if (document.getElementById("fire-help-container")) return;

    const container = document.createElement("div");
    container.id = "fire-help-container";
    container.innerHTML = `
      <!-- Flydende Hjælp-knap -->
      <button id="fire-help-fab" class="fire-help-fab" type="button" title="Hjælp, Rundvisning & Dokumentation" aria-label="Åbn Hjælp">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="12" cy="12" r="10"></circle>
          <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
          <line x1="12" y1="17" x2="12.01" y2="17"></line>
        </svg>
        <span class="fire-help-fab-badge">Hjælp</span>
      </button>

      <!-- Backdrop for Drawer -->
      <div id="fire-help-backdrop" class="fire-help-backdrop"></div>

      <!-- Slide-over Hjælpeskuffe -->
      <aside id="fire-help-drawer" class="fire-help-drawer" role="dialog" aria-modal="true" aria-labelledby="fire-help-title">
        <header class="fire-help-header">
          <div class="fire-help-title-wrap">
            <span style="font-size:22px;">💡</span>
            <h2 id="fire-help-title">FIRE Hjælpecenter</h2>
          </div>
          <button id="fire-help-close" class="fire-help-close-btn" type="button" aria-label="Luk hjælp">✕</button>
        </header>

        <div class="fire-help-actions-bar">
          <button id="fire-help-tour-start" class="fire-help-tour-btn" type="button">
            <span>🚀</span> Start Rundvisning
          </button>
          <button id="fire-help-inspect-btn" class="fire-help-inspect-btn" type="button">
            <span>🔍</span> Spørg om et felt
          </button>
        </div>

        <div class="fire-help-search-box">
          <svg class="fire-help-search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
          <input type="search" id="fire-help-search" class="fire-help-search-input" placeholder="Søg i begreber, skat, formler, modregning..." aria-label="Søg i hjælp">
        </div>

        <div id="fire-help-content" class="fire-help-content">
          <!-- Kategorier og artikler genereres dynamisk -->
        </div>

        <footer class="fire-help-footer">
          <a href="./docs.html" class="fire-help-docs-link" target="_blank">
            <span>📚</span> Åbn Fuld Dokumentation & Formelsandbox →
          </a>
        </footer>
      </aside>

      <!-- Guidet Rundvisning Elementer -->
      <div id="fire-tour-overlay" class="fire-tour-overlay" hidden>
        <div id="fire-tour-highlight" class="fire-tour-target-highlight"></div>
        <div id="fire-tour-popover" class="fire-tour-popover" role="dialog" aria-modal="true">
          <span id="fire-tour-step" class="fire-tour-step-badge">Trin 1 af 7</span>
          <h3 id="fire-tour-title" class="fire-tour-title"></h3>
          <p id="fire-tour-desc" class="fire-tour-desc"></p>
          <div class="fire-tour-footer">
            <button id="fire-tour-skip" class="fire-tour-skip" type="button">Spring over</button>
            <div class="fire-tour-nav">
              <button id="fire-tour-prev" class="fire-tour-prev" type="button">Forrige</button>
              <button id="fire-tour-next" class="fire-tour-next" type="button">Næste →</button>
            </div>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(container);

    // Cache element-referencer
    state.domElements = {
      fab: document.getElementById("fire-help-fab"),
      backdrop: document.getElementById("fire-help-backdrop"),
      drawer: document.getElementById("fire-help-drawer"),
      closeBtn: document.getElementById("fire-help-close"),
      search: document.getElementById("fire-help-search"),
      content: document.getElementById("fire-help-content"),
      tourStartBtn: document.getElementById("fire-help-tour-start"),
      inspectBtn: document.getElementById("fire-help-inspect-btn"),
      tourOverlay: document.getElementById("fire-tour-overlay"),
      tourHighlight: document.getElementById("fire-tour-highlight"),
      tourPopover: document.getElementById("fire-tour-popover"),
      tourStep: document.getElementById("fire-tour-step"),
      tourTitle: document.getElementById("fire-tour-title"),
      tourDesc: document.getElementById("fire-tour-desc"),
      tourPrev: document.getElementById("fire-tour-prev"),
      tourNext: document.getElementById("fire-tour-next"),
      tourSkip: document.getElementById("fire-tour-skip")
    };

    renderHelpTopics();
    attachEvents();
  }

  /**
   * Genererer hjælpeartikler og accordions i skuffen
   */
  function renderHelpTopics(filterQuery = "") {
    const content = state.domElements.content;
    if (!content) return;

    const query = filterQuery.toLowerCase().trim();
    let html = "";
    let matchesCount = 0;

    HELP_DB.categories.forEach(cat => {
      const filteredItems = cat.items.filter(item => {
        if (!query) return true;
        return (
          item.title.toLowerCase().includes(query) ||
          item.content.toLowerCase().includes(query) ||
          item.tags.some(t => t.toLowerCase().includes(query))
        );
      });

      if (filteredItems.length > 0) {
        html += `<div class="fire-help-category">`;
        html += `<div class="fire-help-category-title">${cat.title}</div>`;
        filteredItems.forEach(item => {
          matchesCount++;
          const isOpen = query.length > 0 ? "open" : "";
          html += `
            <div class="fire-help-item ${isOpen}" data-item-id="${item.id}">
              <div class="fire-help-item-header" tabindex="0" role="button" aria-expanded="${isOpen ? "true" : "false"}">
                <span>${item.title}</span>
                <svg class="fire-help-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="6 9 12 15 18 9"></polyline>
                </svg>
              </div>
              <div class="fire-help-item-body">
                ${item.content}
              </div>
            </div>
          `;
        });
        html += `</div>`;
      }
    });

    if (matchesCount === 0) {
      html = `
        <div style="text-align:center; padding: 40px 16px; color: var(--color-text-muted, #68706e);">
          <div style="font-size:32px; margin-bottom:8px;">🔍</div>
          <p>Ingen resultater matchede "<strong>${escapeHtml(filterQuery)}</strong>"</p>
          <p style="font-size:12px;">Prøv at søge efter <em>skat, PAL, modregning, bolig</em> eller <em>aktier</em>.</p>
        </div>
      `;
    }

    content.innerHTML = html;

    // Tilføj klik-håndtering på headers
    content.querySelectorAll(".fire-help-item-header").forEach(header => {
      header.addEventListener("click", () => {
        const item = header.closest(".fire-help-item");
        const isOpen = item.classList.contains("open");
        item.classList.toggle("open", !isOpen);
        header.setAttribute("aria-expanded", !isOpen ? "true" : "false");
      });
      header.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          header.click();
        }
      });
    });
  }

  function escapeHtml(str) {
    return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  /**
   * Tilknytter hændelseslyttere
   */
  function attachEvents() {
    const el = state.domElements;

    el.fab.addEventListener("click", () => toggleDrawer());
    el.backdrop.addEventListener("click", () => closeDrawer());
    el.closeBtn.addEventListener("click", () => closeDrawer());

    el.search.addEventListener("input", (e) => {
      renderHelpTopics(e.target.value);
    });

    el.tourStartBtn.addEventListener("click", () => {
      closeDrawer();
      startTour();
    });

    el.inspectBtn.addEventListener("click", () => {
      closeDrawer();
      startFieldInspector();
    });

    el.tourNext.addEventListener("click", () => nextTourStep());
    el.tourPrev.addEventListener("click", () => prevTourStep());
    el.tourSkip.addEventListener("click", () => stopTour());

    // Tastaturgenveje
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        if (state.isTourActive) stopTour();
        else if (state.isDrawerOpen) closeDrawer();
        else if (state.isInspecting) cancelFieldInspector();
      } else if (state.isTourActive) {
        if (e.key === "ArrowRight") nextTourStep();
        else if (e.key === "ArrowLeft") prevTourStep();
      }
    });

    // Tilknyt eventuel eksisterende hjælp-knap i header
    const headerHelpBtn = document.getElementById("header-help-trigger");
    if (headerHelpBtn) {
      headerHelpBtn.addEventListener("click", () => openDrawer());
    }
  }

  /**
   * Åbner hjælpeskuffen
   */
  function openDrawer(topicId = null) {
    buildDOM();
    const el = state.domElements;
    state.isDrawerOpen = true;
    el.backdrop.classList.add("active");
    el.drawer.classList.add("active");
    el.drawer.focus();

    if (topicId) {
      renderHelpTopics(topicId);
    }
  }

  /**
   * Lukker hjælpeskuffen
   */
  function closeDrawer() {
    const el = state.domElements;
    if (!el.drawer) return;
    state.isDrawerOpen = false;
    el.backdrop.classList.remove("active");
    el.drawer.classList.remove("active");
  }

  function toggleDrawer() {
    if (state.isDrawerOpen) closeDrawer();
    else openDrawer();
  }

  /**
   * Starter guidet rundvisning
   */
  function startTour() {
    buildDOM();
    state.isTourActive = true;
    state.currentTourStep = 0;
    state.domElements.tourOverlay.hidden = false;
    state.domElements.tourOverlay.classList.add("active");
    renderTourStep();
  }

  /**
   * Opdaterer popover og spotlight for aktuelt trin
   */
  function renderTourStep() {
    const step = TOUR_STEPS[state.currentTourStep];
    if (!step) {
      stopTour();
      return;
    }

    const el = state.domElements;
    el.tourStep.textContent = `Trin ${state.currentTourStep + 1} af ${TOUR_STEPS.length}`;
    el.tourTitle.textContent = step.title;
    el.tourDesc.textContent = step.desc;

    el.tourPrev.disabled = state.currentTourStep === 0;
    el.tourNext.textContent = state.currentTourStep === TOUR_STEPS.length - 1 ? "Afslut ✓" : "Næste →";

    // Find mål-element
    let target = document.querySelector(step.target);
    if (!target && step.fallbackTarget) {
      target = document.querySelector(step.fallbackTarget);
    }

    if (!target) {
      // Hvis elementet ikke findes, placer midt på skærmen
      el.tourHighlight.style.display = "none";
      el.tourPopover.style.top = "50%";
      el.tourPopover.style.left = "50%";
      el.tourPopover.style.transform = "translate(-50%, -50%)";
      return;
    }

    el.tourHighlight.style.display = "block";
    target.scrollIntoView({ behavior: "smooth", block: "center" });

    // Efter scroll justeres spotlight og popover
    setTimeout(() => {
      const rect = target.getBoundingClientRect();
      const pad = 6;

      const top = rect.top + window.scrollY - pad;
      const left = rect.left + window.scrollX - pad;
      const width = rect.width + pad * 2;
      const height = rect.height + pad * 2;

      el.tourHighlight.style.top = `${top}px`;
      el.tourHighlight.style.left = `${left}px`;
      el.tourHighlight.style.width = `${width}px`;
      el.tourHighlight.style.height = `${height}px`;

      // Placer popover ved siden af eller under elementet
      const popoverW = 360;
      let popoverLeft = left;
      let popoverTop = top + height + 14;

      if (popoverLeft + popoverW > window.innerWidth - 20) {
        popoverLeft = window.innerWidth - popoverW - 20;
      }
      if (popoverLeft < 20) popoverLeft = 20;

      // Hvis ikke plads i bunden, læg over
      if (popoverTop + 240 > window.scrollY + window.innerHeight) {
        popoverTop = Math.max(20, top - 240);
      }

      el.tourPopover.style.transform = "none";
      el.tourPopover.style.top = `${popoverTop}px`;
      el.tourPopover.style.left = `${popoverLeft}px`;
    }, 250);
  }

  function nextTourStep() {
    if (state.currentTourStep < TOUR_STEPS.length - 1) {
      state.currentTourStep++;
      renderTourStep();
    } else {
      stopTour();
    }
  }

  function prevTourStep() {
    if (state.currentTourStep > 0) {
      state.currentTourStep--;
      renderTourStep();
    }
  }

  function stopTour() {
    state.isTourActive = false;
    const el = state.domElements;
    if (el.tourOverlay) {
      el.tourOverlay.classList.remove("active");
      el.tourOverlay.hidden = true;
    }
  }

  /**
   * "Spørg om et felt" - interaktiv felt-inspektør
   */
  function startFieldInspector() {
    state.isInspecting = true;
    document.body.classList.add("fire-help-inspecting");

    const banner = document.createElement("div");
    banner.id = "fire-help-inspect-banner";
    banner.className = "fire-help-inspect-banner";
    banner.innerHTML = `
      <span>👆 Klik på et felt eller overskrift for at se hjælp</span>
      <button class="fire-help-cancel-inspect" type="button">Afbryd</button>
    `;
    document.body.appendChild(banner);

    banner.querySelector(".fire-help-cancel-inspect").addEventListener("click", cancelFieldInspector);

    const clickHandler = (e) => {
      if (e.target.closest("#fire-help-inspect-banner")) return;
      e.preventDefault();
      e.stopPropagation();

      const input = e.target.closest("input, select, textarea, label, [id]");
      cancelFieldInspector();

      if (input) {
        const id = input.id || (input.querySelector && input.querySelector("input")?.id);
        const fieldInfo = id ? HELP_DB.fields[id] : null;

        if (fieldInfo) {
          openDrawer(fieldInfo.title);
        } else {
          // Søg på feltets label-tekst
          const labelText = input.textContent.trim().split("\n")[0];
          openDrawer(labelText);
        }
      } else {
        openDrawer();
      }
    };

    document.addEventListener("click", clickHandler, { capture: true, once: true });
    state._cancelInspectHandler = () => {
      document.removeEventListener("click", clickHandler, { capture: true });
    };
  }

  function cancelFieldInspector() {
    state.isInspecting = false;
    document.body.classList.remove("fire-help-inspecting");
    const banner = document.getElementById("fire-help-inspect-banner");
    if (banner) banner.remove();
    if (state._cancelInspectHandler) state._cancelInspectHandler();
  }

  /**
   * Fuld destruktion/afmontering
   */
  function destroy() {
    stopTour();
    cancelFieldInspector();
    closeDrawer();
    const container = document.getElementById("fire-help-container");
    if (container) container.remove();
    state = {
      isDrawerOpen: false,
      isTourActive: false,
      currentTourStep: 0,
      isInspecting: false,
      domElements: {}
    };
  }

  // Offentlig API
  const FireHelp = {
    init: function () {
      if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", buildDOM);
      } else {
        buildDOM();
      }
    },
    openDrawer,
    closeDrawer,
    toggleDrawer,
    startTour,
    nextTourStep,
    prevTourStep,
    stopTour,
    startFieldInspector,
    destroy,
    getDatabase: () => HELP_DB,
    getTourSteps: () => TOUR_STEPS
  };

  global.FireHelp = FireHelp;

  // Auto-initialiser hvis scriptet inkluderes direkte i browseren
  if (typeof window !== "undefined") {
    FireHelp.init();
    try {
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get("openHelp") === "1" || urlParams.get("help") === "1") {
        setTimeout(() => FireHelp.openDrawer(), 350);
      } else if (urlParams.get("tour") === "1") {
        setTimeout(() => FireHelp.startTour(), 350);
      }
    } catch (e) {}
  }
})(typeof window !== "undefined" ? window : globalThis);
