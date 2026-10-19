# 🔥 Fireberegner

> **Avanceret, 100% klientside dansk FIRE- og pensionsberegner med 2026-regler, folkepension med modregning, skatteoptimal udbetaling og Monte Carlo-risikosimulering.**

Beregneren bygger på den matematiske arkitektur fra [heymartin.net/fireberegner](https://heymartin.net/fireberegner/) og udvider den med 6 centrale funktioner tilpasset danske skatte- og pensionsforhold.

---

## 🚀 Funktioner & Forbedringer

1. **Folkepension, ATP & Efterløn med modregning**:
   - 2026-satser for grundbeløb (90.528 kr./år enlig / 181.056 kr./år par) og pensionstillæg (104.772 kr./år enlig / 107.232 kr./år par).
   - Dynamisk modregning i pensionstillægget over bundfradraget (98.800 kr. enlig / 197.900 kr. par) fra skattepligtige udbetalinger (ratepension, livrente) og ATP.
   - Efterlønsbro frem til folkepensionsalderen.

2. **Skatteoptimal udbetalingsrækkefølge (`taxOptimal`)**:
   - Vælg mellem standard proportional udbetaling eller skatteoptimal rækkefølge.
   - Udnytter systematisk 27 % aktieindkomst-knækket (79.400 kr. enlig / 158.800 kr. par), tømmer derefter 0 %-udbetalingsbeskattede midler (lagerbeskattede frie midler, ASK og efter pensionsalder aldersopsparing), og minimerer unødig 42 % aktieindkomstbeskatning.

3. **Par- / Husstandstilstand (`isCouple`)**:
   - Dobbelt 27 % aktieindkomstgrænse (158.800 kr.).
   - Dobbelte indskudslofter på aktiesparekonto (348.400 kr.) og pensionsordninger.
   - Automatisk skift til gifte/samlevende folkepensionssatser og modregningsprocenter (32,0 % vs. 30.9 %).

4. **Årlig indbetaling på Aktiesparekonto (ASK)**:
   - Mulighed for at prioritere årlig indbetaling på ASK op til det gældende indskudsloft (174.200 kr. enlig / 348.400 kr. par).
   - Automatisk omdirigering af overskydende opsparing til frie midler, når loftet nås.

5. **Forbrugsfaser & engangshændelser**:
   - Aldersbetinget forbrugsændring (fx lavere forbrug fra 75 år, "Go-Go / Slow-Go / No-Go"-faser).
   - Positiv eller negativ engangshændelse ved en given alder (arv, friværdisalg, boligforbedring, gældsindfrielse).

6. **Monte Carlo-stokastisk simulering**:
   - Kører 100–1.000 stokastiske markedsforløb med log-normal afkastfordeling og årlig volatilitet (risiko).
   - Rapporterer solvenssandsynlighed (% chance for ikke at løbe tør), median slutopsparing samt P10-, P25-, P75- og P90-percentiler direkte i brugerfladen.

7. **Deling via Plankoder**:
   - Gem og del din plan via URL-venlige Base64URL-koder med fuld bagudkompatibilitet til ældre plankoder.

---

## 🛠️ Hurtig start

Projektet er helt uden tunge frameworks eller eksterne build-trin. Det kører direkte i browseren.

### Start lokal udviklingsserver

```bash
npm start
```

Serveren starter på [http://localhost:8088/](http://localhost:8088/).

### Kør automatiserede tests

```bash
npm test
```

Validerer samtlige 8 beregningssuiter, par-tilstand, modregning, Monte Carlo og plankode-kompatibilitet.

---

## 📁 Filstruktur

```
Fireberegner/
├── index.html                # Komplet HTML-brugerflade med formularer og SVG-graf
├── styles.css                # CSS-tokens, responsivt grid og kort-layout
├── app.js                    # UI-controller, event listeners, visualisering og worker-styring
├── calculations.js           # Beregningsmotor i nutidskroner (real DKK), skat og optimering
├── life-annuity.js           # Finanstilsynets levetidsmodel 2024 for livrente
├── monte-carlo.js            # Stokastisk simuleringsmodul (Box-Muller algoritme)
├── plan-code.js              # Base64URL JSON-codec til deling og lagring af planer
├── optimization-worker.js    # Web Worker til parallel grov-til-fin indbetalingsoptimering
├── test-verification.mjs     # 8-suite regressions- og beregningstest
├── server.js                 # Letvægts lokal server uden afhængigheder
└── package.json
```

---

## 📄 Licens

MIT
