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

### 9. Udvidede Visualiseringer & Grafvisninger
* **1. Formueudvikling:** Interaktiv linje- og arealgraf med lineær eller symlog-skalering (0–50+ mio. kr.), Monte Carlo-konfidensbånd (P10, P25, P50, P75, P90) og sorterede hover-tooltips.
* **2. Årligt Cashflow & Hævningskilder:** Stacket søjlediagram over likviditet år for år – skelner klart mellem opsparingsfasen (blå indbetalinger) og nedsparingsfasen (frie midler, ASK, aldersopsparing, ratepension, livrente, folkepension, ATP og boligfriværdi) med en stiplet rød mållinje for ønsket forbrug.
* **3. Skat & Afgifter over tid:** Årlig opgørelse over hvad der afleveres til Skat: PAL-skat (15,3 %), aktieavancebeskatning (27/42 %), ASK lagerskat (17 %), pensionsudbetalingsskat samt modregningstab i folkepension.
* **4. Solvens over tid (Overlevelseskurve):** Viser sandsynligheden for at formuen er intakt for hvert enkelt leveår, inddelt i grøn sikkerhedszone (90–100 %), gul opmærksomhedszone (75–90 %) og rød udtømningsrisiko (<75 %).

### 10. Scenarie-sammenligning (Plan A vs. Plan B) & PDF-Eksport
* **Side-om-side analyse:** Fastfrys dit aktuelle input som enten Plan A eller Plan B, justér derefter dine forudsætninger og få en komplet forskelstabel (FIRE-alder, forbrug, slutreserve, skattebetalinger, folkepension og solvens) med farvekodede forbedringsbadges.
* **Hurtig aktivering:** Skift og indlæs Plan A eller Plan B direkte i beregneren med ét klik.
* **Professionel PDF-rapport:** Udskriftsvisning optimeret til A4 med `@media print` – fjerner inputfelter og kontroller og præsenterer en ren to-siders rådgivningsrapport.

### 11. Folkepension Modregnings-Assistent
* Viser det præcise samlede kronetab i pensionstillæg pga. modregning fra ratepension og livrente.
* Giver 3 konkrete optimeringsstrategier:
  1. Hæv Aktiesparekonto og aldersopsparing først (modregnes 0 kr.).
  2. Stræk ratepension over 15–20 år fremfor 10 år for at forblive under modregningsbundgrænsen.
  3. Udnyt progressionsgrænsen på frie midler (27 % aktieskat).

### 12. Historisk Stress-test på Store Finanskriser
* **Sequence-of-Returns Stress Test:** Simulerer hvad der sker med din plan, hvis du ramler ind i historiens 4 værste kriser på din første dag som pensionist:
  - **1929 Wall Street Krakket & Depressionen:** -80 % nominelt fald over 3 år og langvarig genrejsning.
  - **1973 Oliekrisen & Stagflation:** To brutale tabsår (-15 %, -26 %) og tocifret inflation.
  - **2000 Dot-Com Boblen:** Tre på hinanden følgende tabsår for globale aktier (-9 %, -12 %, -22 %).
  - **2008 Den Globale Finanskrise:** -37 % chokfald efterfulgt af stærkt V-formet opsving.
* Viser øjeblikkeligt om planen overlever, den laveste formue undervejs og slutreserven ved 90 år.

### 13. Sensitivitets-analyse (Tornado-diagram)
* Rangerer automatisk hvilke faktorer der flytter din FIRE-alder mest:
  - Forbrugsbehov (±20 %)
  - Investeringsafkast (±1 %-point)
  - Inflation (±1 %-point)
  - Årlig opsparing (±20 %)
* Illustreres med et elegant visuelt Tornado-diagram, der viser svinget i år for hver faktor.


### 14. Deling via Plankoder
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
