# 📐 Matematisk & Skattemæssig Dokumentation — Fireberegner

Denne dokumentation beskriver den matematiske arkitektur, de skattemæssige beregningsregler og den interaktive inspektionsmotor, der driver **Fireberegner**.

---

## 1. Grundlæggende Beregningsprincip: Faste Priser (Købekraft)

Beregneren fremskriver alle formuer, indbetalinger og udbetalinger i **faste priser** (nutidskroner / real DKK) korrigeret for inflation ($i = 2,0\ \%$\ som standard).

Dette sikrer, at et ønsket årligt forbrug på f.eks. 400.000 kr. ved 80 år repræsenterer præcis den samme mængde varer og ydelser som 400.000 kr. i dag, uden at brugeren skal gætte på fremtidige nominelle prisniveauer.

### Formel for Realafkast (Udvidet Fisher-ligning)
Når et aktiv giver et nominelt afkast på $R_{\text{nom}}$, beskattes med skattesatsen $t$ (f.eks. PAL-skat på 15,3 %, ASK-skat på 17,0 % eller aktieindkomstskat), og der er en inflation på $i$:

$$r_{\text{real}} = \frac{1 + R_{\text{nom}} \times (1 - t)}{1 + i} - 1$$

### Midtårsfaktor for Løbende Indbetalinger
Opsparingsindskud forudsættes indbetalt jævnt over året (svarende til midt på året). Afkastet på årets indbetaling beregnes derfor med kvadratrodsfaktoren:

$$f_{\text{midt,real}} = \sqrt{1 + r_{\text{real}}} - 1 \qquad \text{og} \qquad f_{\text{midt,nom}} = \sqrt{1 + R_{\text{nom}}} - 1$$

---

## 2. Afkast- og Skatteopgørelse på Kontotyper

For enhver opsparingskonto med primosaldo $S$, årlig indbetaling $C$, nominelt afkast $R_{\text{nom}}$, skattesats $t$ og inflation $i$:

### Nøjagtig Regnskabsmæssig Identitet
For at alle underpunkter i den interaktive hjælp summerer 100 % præcist, opgøres afkastet som:

$$\mathbf{Nettoafkast} = \text{Bruttoafkast (primo)} + \text{Bruttoafkast (indbetaling)} - \text{Skat} - \text{Inflationskorrektion}$$

Hvor:
1. **Bruttoafkast (primo):**
   $$\text{grossPrimo} = \text{round}(S \times R_{\text{nom}})$$
2. **Bruttoafkast af ny indbetaling:**
   $$\text{grossContrib} = C > 0 \;?\; \text{round}(C \times (\sqrt{1 + R_{\text{nom}}} - 1)) : 0$$
3. **Samlet nominelt bruttoafkast:**
   $$\text{grossTotal} = \text{grossPrimo} + \text{grossContrib}$$
4. **Skat:**
   $$\text{taxAmount} = \text{grossTotal} > 0 \;?\; \text{round}(\text{grossTotal} \times t) : 0$$
5. **Inflationskorrektion (købekraftstab):**
   $$\text{inflationAmount} = (\text{grossTotal} - \text{taxAmount}) - \text{afkast}$$
   Dermed er $\text{grossPrimo} + \text{grossContrib} - \text{taxAmount} - \text{inflationAmount} \equiv \text{afkast}$ identisk på kronen.

### Kontospecifikke Regler:
* **Ratepension & Livrente:**
  - Lempelig PAL-skat på $t = 15,3\ \%$ af det årlige afkast.
  - Indbetalinger på ratepension er fradragsberettigede op til 2026-loftet (63.100 kr.).
  - Udbetalinger beskattes som personlig indkomst ($t_{\text{udb}} \approx 37\ \%$ uden AM-bidrag).
* **Aldersopsparing:**
  - PAL-skat på $t = 15,3\ \%$.
  - 100 % skattefri ved udbetaling.
  - Ingen modregning i folkepensionens pensionstillæg.
* **Aktiesparekonto (ASK):**
  - Flad lagerskat på $t = 17,0\ \%$.
  - Indskudsloft i 2026: 174.200 kr. (enlig) / 348.400 kr. (par).
  - Skattefri ved hævning (skatten afregnes løbende af afkastet).
* **Frie midler (Realisations- vs. Lagerbeskattet):**
  - **Realisationsbeskattet:** Ingen årlig skattebetaling i opsparingsfasen ($t = 0$ årligt). Formuen vokser ubeskattet frem til hævning. Ved salg beskattes realiseret gevinst som aktieindkomst med 27 % op til 79.400 kr. (enlig) / 158.800 kr. (par) og 42 % af resten.
  - **Lagerbeskattet (ETF'er / fonde på Skats positivliste):** Afkast beskattes årligt med aktieindkomstskat og trækkes direkte fra depotet.

---

## 3. Udbetalingslogik & Skat ved Hævning (FIRE-bro og Pension)

Når brugeren ønsker et årligt nettobeløb til privatforbrug $N$ efter skat, skal der hæves et bruttobeløb $B$ fra depoterne, som modsvarer skatten $T$:

$$B = N + T$$

### Udbetaling fra Frie Midler (Gennemsnitsmetoden for Anskaffelsessum)
Ved hævning af beløbet $B_{\text{frie}}$ fra en fri formue med saldo $V$ og samlet anskaffelsessum $K$:
1. **Solgt andel af depotet:**
   $$s = \min\left(1, \frac{B_{\text{frie}}}{V}\right)$$
2. **Ubeskattet anskaffelsessum (hovedstol):**
   $$K_{\text{solgt}} = K \times s \quad (\text{beskattes med 0 \%})$$
3. **Skattepligtig aktiegevinst:**
   $$G = \max(0, B_{\text{frie}} - K_{\text{solgt}})$$
4. **Aktieindkomstskat ($T_{\text{aktie}}$):**
   - 27 % af gevinst op til progressionsgrænsen ($P = 79.400\text{ kr.}$ for enlig / $158.800\text{ kr.}$ for par):
     $$G_{27} = \min(G, P) \implies T_{27} = \text{round}(G_{27} \times 0,27)$$
   - 42 % af resterende gevinst:
     $$G_{42} = \max(0, G - P) \implies T_{42} = \text{round}(G_{42} \times 0,42)$$
   - Samlet skat: $T_{\text{aktie}} = T_{27} + T_{42}$.

### Udbetaling fra Pensioner
* **Ratepension & Livrente:**
  $$T_{\text{pension}} = B_{\text{pension,skattepligtig}} \times t_{\text{pension}} \quad (\text{hvor } t_{\text{pension}} \approx 37\ \%)$$
* **Aldersopsparing:**
  $$T_{\text{aldersopsparing}} = 0\text{ kr.}$$

---

## 4. Bolig og Friværdi (Housing & Home Equity)

Ejerboligens friværdi modelleres som en integreret del af den samlede formue:

$$\text{Friværdi}_t = (V_{\text{bolig},t} - G_{\text{gæld},t}) \times \text{Ejerandel}$$

Hvor:
* Boligværdien opskrives årligt med forventet prisvækst $g_{\text{bolig}}$:
  $$V_{\text{bolig},t} = V_{\text{bolig},t-1} \times (1 + g_{\text{bolig}})$$
* Gælden reduceres med det årlige afdrag $A$:
  $$G_{\text{gæld},t} = \max(0, G_{\text{gæld},t-1} - A)$$
* **Frigørelsesstrategi:** Ved salg eller nedkonvertering (ved FIRE-start eller folkepension) kan provenuet overføres til frie midler og indgå i FIRE-broen, eller boligen kan fastholdes som en fast formuepost.

---

## 5. Monte Carlo-risikosimulering & Volatilitetsslæb

For at stressteste planen mod markedsudsving køres 100–1.000 simulerede forløb med log-normal afkastfordeling via Box-Muller transformation:

$$R_{\text{sim}} = \exp\left(\left(\mu - \frac{\sigma^2}{2}\right) + \sigma \cdot Z\right) - 1$$

Hvor $Z \sim \mathcal{N}(0, 1)$ er en standard normalfordelt variabel, $\mu$ er det forventede årlige log-afkast, og $\sigma$ er den årlige volatilitet (standardafvigelse, standard 15 %).

### Volatilitetsslæb (Volatility Drag):
I virkelighedens markeder giver et fald på 50 % efterfulgt af en stigning på 50 % et nettotab på 25 % ($0,5 \times 1,5 = 0,75$).
Monte Carlo-modulet rapporterer:
* **P10 (Pessimistisk):** Kun 10 % af markedsforløbene klarer sig dårligere. Viser robustheden over for sekvensrisiko (Sequence of Returns Risk / tidlige krak).
* **P50 (Median):** Det mest typiske udfald.
* **P90 (Optimistisk):** Stærkt bull-marked.
* **Solvenssandsynlighed:** Procentdel af simuleringer, hvor formuen ikke løber tør før planens ophør.

---

## 6. Den Interaktive Inspektionsmotor (`math-explainer.js`)

Beregneren indeholder to niveauer af gennemsigtighed for samtlige tal i tabellen og på nøgletalskortene:

1. **Hover Tooltip:** Viser en kompakt popup ved markøren med den umiddelbare beregningsformel og hovedtal.
2. **Højrekliks-Inspektor (Modal Vindue):**
   * **Hvad er dette tal?** Forklaring i klare, logiske termer af begrebet.
   * **Matematisk formel:** Den formelle ligning bag feltet.
   * **Gennemført regneeksempel:** Trin-for-trin gennemregning med brugerens egne tal.
   * **Konkret regnestykke:** Struktureret regnskabstabel:
     - Hovedelementer summerer direkte:
       $$\text{Startsaldo} + \text{Indbetaling} + \text{Nettoafkast} - \text{Udbetaling} = \text{Slutsaldo}$$
     - Underpunkter er indrykket mod højre med `↳` (`.math-step-sub`):
       - `Nominelt bruttoafkast af primosaldo`
       - `Nominelt bruttoafkast af indbetaling`
       - `Heraf skat (− X kr.)`
       - `Heraf inflationskorrektion (− X kr.)`
     - For udbetalinger: Fordeling på konti (frie midler, pensioner), ubeskattet anskaffelsessum vs. aktiegevinst, og trinvist regnestykke for 27 % / 42 % aktieskat.
   * **Gældende satser og forudsætninger:** Oversigt over skattesatser, lofter og civilstand.
