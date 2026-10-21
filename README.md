# 🔥 Fireberegner

> **Avanceret, 100% klientside dansk FIRE- og pensionsberegner med 2026-regler, folkepension med modregning, skatteoptimal udbetaling, bolig & friværdi, Monte Carlo-risikosimulering og fuld interaktiv matematisk inspektion.**

Beregneren bygger på den matematiske arkitektur fra [heymartin.net/fireberegner](https://heymartin.net/fireberegner/) og udvider den med avancerede funktioner tilpasset danske skatte-, bolig- og pensionsforhold.

For en dybdegående gennemgang af den underliggende matematik, skatteregler og formler henvises til [MATEMATISK_DOKUMENTATION.md](MATEMATISK_DOKUMENTATION.md).

---

## 🚀 Funktioner & Forbedringer

### 1. Folkepension, ATP & Efterløn med modregning
* **2026-satser:** Grundbeløb (90.528 kr./år for enlige / 181.056 kr./år for par) og pensionstillæg (104.772 kr./år for enlige / 107.232 kr./år for par).
* **Dynamisk modregning:** Automatisk modregning i pensionstillægget over bundfradraget (98.800 kr. for enlige / 197.900 kr. for par) fra skattepligtige pensionsudbetalinger (ratepension, livrente) og ATP.
* **Efterlønsbro:** Modellerer overgangsindkomst frem til folkepensionsalderen.

### 2. Skatteoptimal udbetalingsrækkefølge (`taxOptimal`)
* Vælg mellem standard proportional udbetaling eller en skatteoptimeret algoritme.
* Udnytter systematisk 27 % aktieindkomst-knækket (79.400 kr. for enlige / 158.800 kr. for par), tømmer derefter 0 %-udbetalingsbeskattede midler (lagerbeskattede frie midler, ASK og efter pensionsalderen aldersopsparing), og minimerer unødig 42 % aktieindkomstbeskatning.

### 3. Par- / Husstandstilstand (`isCouple`)
* Dobbelt 27 % aktieindkomstgrænse (158.800 kr.).
* Dobbelte indskudslofter på Aktiesparekonto (348.400 kr.) og pensionsordninger.
* Automatisk skift til gifte/samlevende folkepensionssatser og modregningsprocenter (32,0 % vs. 30,9 %).

### 4. Bolig & Friværdi (Housing & Home Equity)
* **Dynamisk friværdi:** Beregnes som `(Markedsværdi − Restgæld) × Ejerandel`.
* **Prisvækst & Afdrag:** Årlig forventet boligprisvækst og årlige afdrag på realkredit- eller bankgæld.
* **Frigørelse ved milepæle:** Vælg at frigøre friværdi ved FIRE-alder (friværdisalg / nedkonvertering til FIRE-broen) eller ved folkepension, eller behold boligen intakt.
* **Fuld integration:** Vises i den samlede formuegraf, op- og nedsparingstabellen år-for-år samt i Monte Carlo-simuleringen.

### 5. Årlig indbetaling på Aktiesparekonto (ASK)
* Prioriter årlig opsparing på Aktiesparekontoen op til indskudsloftet (174.200 kr. for enlige / 348.400 kr. for par).
* Automatisk omdirigering af overskydende midler til frie investeringsmidler, når loftet nås.

### 6. Forbrugsfaser & engangshændelser
* Aldersbetinget forbrugsændring (fx lavere forbrug fra 75 år, "Go-Go / Slow-Go / No-Go"-faser).
* Positiv eller negativ engangshændelse ved en given alder (arv, boligforbedring, gældsindfrielse osv.).

### 7. Monte Carlo-stokastisk simulering
* Kører 100–1.000 stokastiske markedsforløb med log-normal afkastfordeling (Box-Muller algoritme) og årlig volatilitet (risiko).
* Rapporterer solvenssandsynlighed (% chance for ikke at løbe tør), median slutopsparing (P50) samt P10-, P25-, P75- og P90-percentiler direkte i brugerfladen med eller uden boligfriværdi.

### 8. Interaktiv Matematisk Hjælp & Inspektion
* **Hover tooltips:** Hold markøren over et vilkårligt tal i tabellen eller på et nøgletalskort for at se en hurtig formel og udregning.
* **Højrekliks-inspektion (modal dialog):**
  - **Hvad er dette tal?** Enkel og intuitiv forklaring i logiske termer.
  - **Matematisk formel:** Den præcise matematiske ligning bag beregningen.
  - **Gennemført regneeksempel:** Fuldstændig trin-for-trin beregning med brugerens egne tal.
  - **Konkret regnestykke (regnskabstabel):**
    - Hovedposter summerer direkte: `Startsaldo + Indbetaling + Nettoafkast − Udbetaling = Slutsaldo`.
    - Underposter er indrykket med `↳` under nettoafkast:
      - `Nominelt bruttoafkast af primosaldo`
      - `Nominelt bruttoafkast af indbetaling`
      - `Heraf skat (PAL 15,3 %, ASK 17 % eller lagerskat)` med negativt fortegn (`− X kr.`)
      - `Heraf inflationskorrektion (2,0 % købekraftstab)` med negativt fortegn (`− X kr.`)
      - Hvor bruttoafkast minus skat minus inflation summerer nøjagtigt til nettoafkastet.
    - For udbetalinger: Forklarer præcist, hvorfor bruttobeløbet skal hæves for at give det ønskede nettobeløb efter skat, hvilke konti pengene hæves fra (frie midler, pensioner), ubeskattet anskaffelsessum vs. aktiegevinst, samt den trinvise beregning af aktieskat (27 % / 42 %) og pensionsskat (37 %).
  - **Gældende satser og forudsætninger:** Oversigt over skattesatser, modregningslofter og civilstand.

### 9. Deling via Plankoder
* Gem og del din plan via URL-venlige Base64URL-koder med fuld fremad- og bagudkompatibilitet til ældre plankoder.

---

## 🛠️ Hurtig start

Projektet er helt uden tunge frameworks eller eksterne build-trin. Det kører direkte i enhver moderne webbrowser.

### Start lokal udviklingsserver

```bash
npm start
```

Serveren starter på [http://localhost:8088/](http://localhost:8088/).

### Kør automatiserede tests

```bash
npm test
```

Kører samtlige 11 verifikationssuiter (baseline-beregning, par-tilstand, skatteoptimal udbetaling, folkepension og modregning, forbrugsfaser, Monte Carlo, plankode-kompatibilitet, bolig & friværdi, Monte Carlo med bolig, samt samtlige interaktive matematiske forklaringer).

---

## 📁 Filstruktur

```
Fireberegner/
├── index.html                   # Komplet HTML-brugerflade med formularer, inspektionsmodal og SVG-graf
├── styles.css                   # CSS-tokens, responsivt grid, kort-layout og inspektortabeller
├── app.js                       # UI-controller, event listeners, visualisering og inspektor-styring
├── calculations.js              # Beregningsmotor i nutidskroner (real DKK), skat og optimering
├── math-explainer.js            # Interaktiv forklaringsmotor (hover tooltips & højrekliksinspektor)
├── life-annuity.js              # Finanstilsynets levetidsmodel 2024 for livrente
├── monte-carlo.js               # Stokastisk simuleringsmodul (Box-Muller algoritme)
├── plan-code.js                 # Base64URL JSON-codec til deling og lagring af planer
├── optimization-worker.js       # Web Worker til parallel grov-til-fin indbetalingsoptimering
├── test-verification.mjs        # 11-suite regressions- og beregningstest
├── MATEMATISK_DOKUMENTATION.md  # Dybdegående matematisk og skattemæssig dokumentation
├── server.js                    # Letvægts lokal server uden eksterne afhængigheder
└── package.json
```

---

## 📄 Licens

MIT
