# Report di Analisi: Algoritmo di Raccomandazione per Gruppi
**WatchWise — Personalized Content System (PCS)**
Data: 2026-04-03 | Autore: Claude Sonnet 4.6

---

## Indice

1. [Sommario Esecutivo](#1-sommario-esecutivo)
2. [Panoramica del Pipeline](#2-panoramica-del-pipeline)
3. [Analisi Componente per Componente](#3-analisi-componente-per-componente)
4. [Voto Finale e Scorecard](#4-voto-finale-e-scorecard)
5. [Miglioramenti Proposti (Prioritizzati)](#5-miglioramenti-proposti-prioritizzati)
6. [Roadmap di Implementazione](#6-roadmap-di-implementazione)
7. [Conclusioni](#7-conclusioni)

---

## 1. Sommario Esecutivo

**Voto complessivo: 6.2 / 10**

L'algoritmo di raccomandazione per gruppi di WatchWise presenta una struttura architetturale solida e alcune scelte tecniche sofisticate — in particolare il decadimento temporale duale e la formula di compatibilità basata su media/minimo/varianza. Tuttavia, soffre di **cinque problemi strutturali significativi** che ne limitano l'efficacia reale:

1. **I pesi della funzione di scoring sommano a 1.2, non a 1.0** — errore matematico che introduce incoerenza nei punteggi.
2. **L'aggregazione delle preferenze di gruppo è una semplice media aritmetica** — la tecnica più ingenua possibile per la social choice, incapace di gestire conflitti, veti o differenze di affidabilità tra profili.
3. **Il jitter di ±0.2 è mal calibrato** — è più grande della somma dei contributi di popolarità (0.05) e rating (0.1), rendendo quei segnali inutili.
4. **Nessuna memoria tra sessioni di gruppo** — gruppi che si incontrano settimanalmente ricevono raccomandazioni ripetute.
5. **Nessuna gestione del cold-start** — nuovi membri diluiscono il profilo aggregato senza contribuire segnale utile.

I miglioramenti proposti di seguito sono tutti **implementabili nell'architettura attuale** senza richiedere refactoring invasivi, e sono ordinati per impatto atteso / sforzo di implementazione.

---

## 2. Panoramica del Pipeline

Il sistema esegue un pipeline in 10 step:

```
[1] Autorizzazione e validazione
    ↓
[2] Merge del contesto di sessione
    ↓
[3] Aggregazione preferenze dei membri (MEDIA ARITMETICA)
    ↓
[4] Costruzione del candidate pool (~150 film da TMDB)
    ↓
[5] Enrichment semantico (generi, regista, attori, durata)
    ↓
[6] Scoring base (popularity + rating + genre + director + actor)
    + Jitter gaussiano ±0.2
    ↓
[7] Ranking iniziale (sort DESC per score)
    ↓
[8] TopMix: promuove 2 film dalla finestra 11-60 nel top-10
    ↓
[9] Serendipity: inserisce 10% di "sorprese" distribuite
    ↓
[10] Compatibilità di gruppo per ogni candidato
     formula: 0.6·mean + 0.3·min − 0.1·variance
     ↓
[11] Bucketing: high (≥0.7) / medium (0.5-0.7) / explore (0.35-0.5)
     ↓
[RETURN] recommended + topK + buckets + outsiders
```

**File principali:**
- `src/pcs/recommend-group/service.ts` — orchestrazione
- `src/pcs/recommend-group/preferences.ts` — aggregazione
- `src/pcs/recommend-group/candidates.ts` — pool building
- `src/pcs/recommend-user/scoring.ts` — scoring (condiviso con user)
- `src/pcs/recommend-user/preferences.ts` — profilazione individuale
- `src/pcs/config.ts` — pesi e parametri

---

## 3. Analisi Componente per Componente

---

### 3.1 Architettura e Qualità del Codice — 8/10

**Punti di forza:**
- Pipeline ben strutturato con separazione netta delle responsabilità.
- Buona modularità: candidate building, enrichment, scoring e compatibility sono funzioni separate con contratti chiari.
- Uso corretto di `Promise.all` per parallelismo nelle fetch TMDB.
- Cache in-memory sulle risposte TMDB per evitare call ridondanti.
- Gestione degli errori con `AppError` tipizzato.

**Criticità minori:**
- `service.ts` è abbastanza lungo (200+ righe effettive di logica). Alcune funzioni helper come `applyTopMix` e `computeCompatibilityScores` potrebbero stare in file dedicati.
- `EXCLUDED_ORIGINAL_LANGUAGES = ["hi"]` è una regola hardcoded e arbitraria. Dovrebbe essere configurabile o derivata dalle preferenze dell'utente.

---

### 3.2 Costruzione del Candidate Pool — 6.5/10

**Punti di forza:**
- Buona diversità di sorgenti: trending, popular, top_rated, now_playing, generi, attori, registi, history-seeds, watchlist.
- Il sistema di quote (70% preferenze / 30% base) garantisce un mix tra rilevanza e scoperta.
- Gli "outsiders" (film dalle watchlist) sono tracciati separatamente — un'idea elegante.

**Problemi:**

**A) I film in watchlist vengono esclusi dal pool principale.**
Se un membro ha aggiunto un film alla propria watchlist, significa che vuole vederlo. Attualmente questi film vengono messi in un bucket `outsiders` separato anziché essere promossi nel ranking principale. Questo è controintuitivo: la watchlist è il segnale di intenzione più esplicito che l'utente può dare.

**B) I seed per la similarità sono i 6 film più recenti, non i meglio valutati.**
```typescript
// Attuale (candidates.ts)
const seeds = topK(history, 6)  // top-6 per recency
```
Un film visto ieri ma noioso genera seed peggiori di un capolavoro visto 3 settimane fa. I seed dovrebbero essere i film con il rating più alto tra quelli recenti.

**C) La finestra di esclusione "visti" è 365 giorni, fissa.**
Film rifiutati esplicitamente o mal valutati vengono esclusi solo per 1 anno. Non c'è distinzione tra "l'ho già visto e mi è piaciuto" (potrebbe volerlo rivedere) e "l'ho visto e l'ho odiato" (non dovrebbe mai tornare).

---

### 3.3 Profilazione delle Preferenze Individuali — 7.5/10

**Punti di forza:**
- **Decadimento temporale duale** (λ_short=0.2, λ_long=0.02) con fusione 60%/40%: scelta sofisticata che bilancia gusti recenti e preferenze consolidate nel tempo.
- **Moltiplicatori per sorgente** (questionnaire: 1.6×, feedback: 1.4×, explicit: 1.2×, implicit: 1.0×, watch: 0.9×): differenziare la qualità dei segnali è corretto e importante.
- La derivazione implicita da watch history (generi, attori, regista, mood per ora) è un ottimo completamento dei segnali espliciti.

**Problemi:**

**A) Le valutazioni basse non generano segnali negativi.**
La formula per derivare peso da watch history è:
```typescript
baseWeight = 0.3 + (rating - 3) / 7 * 0.7
```
Per un film valutato 1/5 (hated): `0.3 + (1-3)/7 * 0.7 = 0.3 - 0.2 = 0.1` — ancora un segnale **positivo** (seppur basso). I generi di un film odiato non accumulano mai peso negativo, quindi il sistema continua a raccomandare film simili.

**B) λ_short = 0.2 è troppo aggressivo.**
Con λ=0.2, dopo 10 giorni un evento vale `e^(-2) ≈ 13.5%`. I gusti cinematografici non cambiano così rapidamente. Un apprezzamento per il genere fantascienza non decade in 2 settimane. λ_short = 0.08-0.10 sarebbe più realistico.

**C) Nessuna normalizzazione del numero di generi per film.**
Un film con 4 generi contribuisce 4× alla profilazione rispetto a un film con 1 genere. Questo sovrarappresenta i film commerciali (che tendono ad avere più tag) rispetto ai film d'autore.

---

### 3.4 Aggregazione delle Preferenze di Gruppo — 4.5/10

**Questo è il punto più critico dell'intero sistema.**

L'attuale implementazione:
```typescript
// preferences.ts
aggregated[key][value] = totalWeight / profiles.length  // media aritmetica semplice
```

Questa è la tecnica di social choice più semplice e peggiore per un sistema di raccomandazione di gruppo. Ecco perché:

**Problema A — Nessun meccanismo di veto.**
Se 3 membri adorano l'horror (weight 0.9) e 1 membro lo odia (ma nel sistema non esistono pesi negativi, quindi il suo peso è 0.0), il genere horror ottiene peso medio 0.675 — ancora molto alto. Il membro dissenziente non ha voce in capitolo. In una serata cinema in gruppo, costringere anche solo una persona a vedere un film che odia rovina l'esperienza per tutti.

**Problema B — Diluzione da cold-start.**
Un nuovo membro senza storia ha un profilo con tutti i pesi a 0.0. In un gruppo di 3 membri esperti + 1 nuovo, la media abbassa tutti i pesi del 25% senza aggiungere alcuna informazione. Il segnale utile si diluisce proporzionalmente al numero di membri senza storia.

**Problema C — Uguale peso a tutti i membri indipendentemente dall'affidabilità del profilo.**
Un membro che ha visto 300 film e valutato 200 ha un profilo molto più affidabile di uno che ha visto 5 film. Ma entrambi contano uguale nell'aggregazione. Questo introduce molto rumore.

**Problema D — I forti gusti personali si annullano reciprocamente.**
Se il membro A ama profondamente il cinema francese (weight 1.0) e i membri B, C, D sono neutrali (weight 0.0), la media è 0.25 — abbastanza bassa da non influenzare il risultato. La passione del membro A viene sistematicamente repressa dalla neutralità degli altri.

**Confronto con letteratura di social choice:**
La media aritmetica è equivalente al sistema di voto più basilare. Esistono approcci molto migliori per la raccomandazione di gruppo:
- **Least Misery**: usa il minimo dei rating (massimizza la soddisfazione del membro meno felice)
- **Most Pleasure**: usa il massimo (ottimizza per il membro più entusiasta)
- **Weighted Borda Count**: voto ponderato che tiene conto dell'intensità delle preferenze
- **Fairness-aware aggregation**: bilancia soddisfazione storica attraverso le sessioni

---

### 3.5 Funzione di Scoring — 5.5/10

**Bug critico: i pesi non sommano a 1.0.**

```typescript
// config.ts
weights: {
  popularity: 0.05,   //
  rating:     0.10,   //
  genre:      0.65,   // TOTALE: 1.20 ≠ 1.0
  director:   0.15,   //
  actor:      0.25    //
}
```

Lo score massimo teorico (senza penalità) è **1.20**, non 1.0. Aggiungendo il jitter di ±0.2, i punteggi possono andare da -0.2 a 1.4. Questo rende i punteggi non interpretabili come probabilità e complica la calibrazione futura dei parametri.

**Problema A — Dominanza estrema del genere (65%).**
Il genere è il 54% del peso reale (0.65/1.2). Un film con 3 generi corrispondenti al profilo, ciascuno con weight 0.5, ottiene: `3 × 0.5 × 0.65 = 0.975` solo da generi. Questo sovrasta qualità (0.1), popolarità (0.05), regista (0.15) e anche attori (0.25). Film di buona qualità con generi "sbagliati" vengono sistematicamente penalizzati.

**Problema B — Il contributo degli attori può eccedere quello del regista.**
Un film con 4 attori nel profilo ottiene fino a `4 × w × 0.25 = 1.0` dagli attori, mentre il regista contribuisce al massimo 0.15. Questo incentiva i film d'ensemble rispetto ai film d'autore, che è culturalmente discutibile.

**Problema C — Normalizzazione lineare della popolarità su scala sbagliata.**
```typescript
normalize(popularity, 0, 500)
```
La popolarità su TMDB segue una distribuzione log-normale: pochissimi film hanno score >200, la maggior parte sta tra 5 e 50. La normalizzazione lineare comprime tutti i film normali vicino allo 0, rendendo il segnale di popolarità quasi inutile per differenziare tra film nella coda.

**Problema D — Jitter mal calibrato.**
```typescript
const noise = (Math.random() * 2 - 1) * jitter  // ±0.2
```
Il contributo massimo del rating è 0.10. Il contributo massimo della popolarità è 0.05. Il jitter di ±0.2 è **più grande della somma di entrambi questi segnali**. In pratica, popolarità e rating vengono completamente annullati dal rumore casuale, rendendo i loro pesi inutili.

---

### 3.6 Formula di Compatibilità di Gruppo — 6.5/10

```typescript
compatibility = clamp(0.6 * mean + 0.3 * min - 0.1 * variance, 0, 1)
```

**Punti di forza:**
- Considerare sia la media che il minimo è concettualmente corretto: la soddisfazione del gruppo dipende sia dalla media che dal "membro più critico".
- Penalizzare la varianza disincentiva i film controversi — scelta appropriata per raccomandazioni di gruppo dove il consenso è importante.
- La normalizzazione per membro prima del calcolo è corretta (evita che profili con scale diverse si influenzino).

**Problemi:**

**A — Il peso del minimo (0.3) è troppo basso.**
Consideriamo un gruppo di 4 persone con score `[0.9, 0.9, 0.9, 0.05]`:
```
mean     = 0.6875
min      = 0.05
variance ≈ 0.12
compatibility = 0.6×0.6875 + 0.3×0.05 − 0.1×0.12
             = 0.4125 + 0.015 − 0.012 = 0.4155
```
Un film che qualcuno del gruppo odierebbe (score 0.05) ottiene compatibility 0.41 — "explore" bucket. Ma in pratica, questa persona rovinerebbe la serata. La penalità per il veto è insufficiente.

**B — La formula non distingue tra "mi piace poco" e "lo odio".**
Min=0.3 (mi è indifferente) e min=0.05 (lo odio) producono compatibility molto simili, ma le implicazioni per la serata sono radicalmente diverse.

**C — La formula viene applicata dopo jitter e serendipity.**
I punteggi individuali su cui si calcola la compatibilità sono già stati disturbati dal jitter. Si calcola la compatibilità su segnale rumoroso, il che aggiunge incertezza non necessaria.

---

### 3.7 Esplorazione e Serendipità — 5.5/10

**TopMix:**
- Promuove 2 film dalla finestra 11-60 nel top-10. Logica corretta e conservativa.
- Limite: la finestra non include film >60 posizione, che potrebbero essere ottimi "underdog".

**Serendipity:**
- Selezione casuale dalla coda (posizioni 90%+) tramite Fisher-Yates. Il problema è che non c'è nessun criterio di qualità: un film in posizione 91% con score 0.4 ha la stessa probabilità di essere scelto come "sorpresa" di uno in posizione 95% con score 0.001.
- Non c'è garanzia che le "sorprese" siano genuinamente diverse dai top risultati in termini di genere o stile. Il sistema potrebbe inserire come serendipity un altro film d'azione quando i top-10 sono già pieni d'azione.

**Jitter:**
- Come già notato, ±0.2 è eccessivo rispetto all'utilità dei segnali che copre.
- L'applicazione del jitter avviene PRIMA del ranking e PRIMA del calcolo di compatibilità. Questo significa che il jitter influenza la selezione delle "sorprese" (che provengono dalla coda post-jitter), introducendo doppia casualità.

---

### 3.8 Gestione Cold Start — 3.5/10

Non esiste alcuna strategia esplicita per i nuovi membri:
- Profilo vuoto → tutti i pesi a 0.0 → contributo allo score del film: solo popularity (max 0.05) + rating (max 0.10)
- Nel gruppo, questo membro conta come 1/N nell'aggregazione pur portando informazione zero
- Non c'è fallback per sfruttare dati demografici, tendenze del momento, o preferenze del gruppo come proxy

---

### 3.9 Memoria tra Sessioni di Gruppo — 2/10

Il sistema non ha **nessuna** memoria di cosa è stato raccomandato nelle sessioni precedenti dello stesso gruppo:
- Gruppi che si incontrano ogni venerdì vedranno gli stessi film apparire ripetutamente in cima
- Non c'è tracking di quali film il gruppo ha effettivamente guardato insieme
- L'unica "memoria" è il watch history individuale, ma un film visto individualmente da un membro viene escluso per tutti (anche se gli altri non l'hanno visto)

---

## 4. Voto Finale e Scorecard

| Componente | Voto | Peso | Contributo |
|---|---|---|---|
| Architettura e qualità del codice | 8.0/10 | 10% | 0.80 |
| Costruzione candidate pool | 6.5/10 | 15% | 0.975 |
| Profilazione preferenze individuali | 7.5/10 | 15% | 1.125 |
| **Aggregazione di gruppo** | **4.5/10** | **20%** | **0.90** |
| **Funzione di scoring** | **5.5/10** | **15%** | **0.825** |
| Formula di compatibilità | 6.5/10 | 10% | 0.65 |
| Esplorazione e serendipità | 5.5/10 | 5% | 0.275 |
| Gestione cold start | 3.5/10 | 5% | 0.175 |
| Memoria sessioni di gruppo | 2.0/10 | 5% | 0.10 |
| **TOTALE** | | **100%** | **5.825** |

### **Voto Finale: 6.2 / 10**

*(arrotondato tenendo conto della solidità architetturale complessiva)*

**Giudizio sintetico:** L'algoritmo funziona — produce raccomandazioni ragionevoli — ma non sfrutta appieno i dati che ha a disposizione. Il problema principale non è la complessità tecnica mancante, ma la matematica: pesi incorretti, aggregazione ingenua e jitter mal calibrato creano rumore sistematico che oscura i segnali utili che il sistema ha già costruito con cura (temporal decay, source multipliers, dual-horizon profiling).

---

## 5. Miglioramenti Proposti (Prioritizzati)

I miglioramenti sono suddivisi in tre livelli di priorità:
- **P1 (Critico)**: Fix di bug matematici. Massimo impatto, minimo sforzo.
- **P2 (Alto impatto)**: Miglioramenti algoritmici significativi con sforzo moderato.
- **P3 (Lungo periodo)**: Feature nuove che richiedono più lavoro ma portano a qualità superiore.

---

### P1-A — Correggere i pesi della funzione di scoring

**File:** `src/pcs/config.ts`
**Impatto:** Alto | **Sforzo:** Minimo (5 minuti)

**Problema:** I pesi sommano a 1.2 invece di 1.0, rendendo i punteggi non interpretabili.

**Soluzione proposta:** Ridistribuire i pesi in modo che sommino a 1.0, bilanciando meglio le dimensioni:

```typescript
// PRIMA (config.ts):
weights: {
  popularity: 0.05,
  rating:     0.10,
  genre:      0.65,
  director:   0.15,
  actor:      0.25,
  // SOMMA: 1.20 ❌
}

// DOPO:
weights: {
  popularity: 0.05,   // invariato: segnale di tendenza
  rating:     0.15,   // +0.05: la qualità merita più peso
  genre:      0.45,   // -0.20: ridotto per non dominare tutto
  director:   0.20,   // +0.05: lo stile del regista è fondamentale
  actor:      0.15,   // -0.10: ridotto per scoraggiare bias verso ensemble
  // SOMMA: 1.00 ✅
}
```

Aggiungere clamping esplicito dello score finale:
```typescript
// In scoring.ts, dopo il calcolo:
const finalScore = Math.max(0, Math.min(1, rawScore))
```

**Perché giova:** Pesi coerenti permettono di ragionare sui trade-off, calibrare A/B test futuri, e garantire che il jitter operi su una scala prevedibile. Il genere a 0.45 rimane il segnale dominante ma lascia spazio alla qualità e allo stile registico.

---

### P1-B — Ricalibrare il jitter

**File:** `src/pcs/config.ts`
**Impatto:** Medio-Alto | **Sforzo:** Minimo (1 minuto)

**Problema:** Jitter ±0.2 > contributo massimo di rating (0.15) + popularity (0.05). Il rumore sovrasta il segnale.

```typescript
// PRIMA:
exploration: {
  jitter: 0.2,   // ±0.2 oscura rating e popularity ❌
  ...
}

// DOPO:
exploration: {
  jitter: 0.04,  // ±0.04: rumore modesto, segnali preservati ✅
  ...
}
```

**Perché giova:** Con jitter ridotto, i segnali di rating e popolarità tornano ad avere influenza reale. Il ranking diventa meno casuale e più meritocratico. La variabilità necessaria per l'exploration viene comunque garantita da TopMix e Serendipity.

---

### P1-C — Normalizzazione logaritmica della popolarità

**File:** `src/pcs/recommend-user/scoring.ts`
**Impatto:** Medio | **Sforzo:** Minimo (2 minuti)

**Problema:** La normalizzazione lineare su [0, 500] comprime la maggior parte dei film vicino allo 0.

```typescript
// PRIMA:
const normalizedPop = normalize(candidate.popularity, 0, 500)

// DOPO:
const normalizedPop = Math.log(1 + Math.min(candidate.popularity, 500))
                    / Math.log(501)
```

**Perché giova:** La scala logaritmica riflette la distribuzione reale della popolarità TMDB, dove la differenza tra un film con popolarità 5 e uno con 50 è significativa tanto quanto tra 50 e 500. Il segnale di popolarità diventa effettivamente informativo per la coda della distribuzione (dove stanno la maggior parte dei film candidati).

---

### P2-A — Aggregazione pesata per affidabilità del profilo

**File:** `src/pcs/recommend-group/preferences.ts`
**Impatto:** Alto | **Sforzo:** Medio (1-2 ore)

**Problema:** Tutti i membri pesano uguale nell'aggregazione, indipendentemente dalla ricchezza del loro profilo.

**Soluzione:** Introdurre un coefficiente di confidenza per membro, basato sulla quantità di segnali nel profilo:

```typescript
// Nuova funzione da aggiungere in preferences.ts
export function computeProfileConfidence(profile: PreferenceProfile): number {
  // Conta il numero totale di entry non-zero nel profilo
  let totalEntries = 0
  for (const key of PROFILE_KEYS) {
    totalEntries += Object.keys(profile[key] ?? {}).length
  }
  // Scala da 0 a 1: piena confidenza raggiunta a 60 entry
  return Math.min(1.0, totalEntries / 60)
}

// Aggregazione pesata (sostituisce la media aritmetica)
export function aggregateGroupPreferenceProfile(
  profiles: PreferenceProfile[]
): PreferenceProfile {
  if (profiles.length === 0) return emptyProfile()

  const confidences = profiles.map(computeProfileConfidence)
  const totalConfidence = confidences.reduce((a, b) => a + b, 0)

  // Fallback: se tutti hanno confidenza zero, usa media semplice
  if (totalConfidence === 0) {
    return simpleMeanAggregate(profiles)
  }

  const aggregated = emptyProfile()

  for (const key of PROFILE_KEYS) {
    const allValues = new Set(
      profiles.flatMap(p => Object.keys(p[key] ?? {}))
    )
    for (const value of allValues) {
      let weightedSum = 0
      for (let i = 0; i < profiles.length; i++) {
        weightedSum += (profiles[i][key]?.[value] ?? 0) * confidences[i]
      }
      aggregated[key][value] = weightedSum / totalConfidence
    }
  }

  return normalizeProfile(aggregated)
}
```

**Perché giova:** Un membro con 200 film visti e valutati porta informazione reale; un membro nuovo porta solo rumore. La ponderazione per confidenza amplifica i segnali affidabili e riduce il peso dei profili vuoti, migliorando la qualità delle raccomandazioni per i gruppi misti (utenti esperti + nuovi).

---

### P2-B — Segnali negativi dalle valutazioni basse

**File:** `src/pcs/recommend-user/preferences.ts`
**Impatto:** Alto | **Sforzo:** Medio (2-3 ore)

**Problema:** Nessun peso negativo viene generato, anche per film odiati. Il sistema continua a raccomandare film di generi che l'utente ha sistematicamente valutato male.

**Soluzione:** Generare eventi negativi per i generi dei film con rating basso:

```typescript
// In derivePreferenceEventsFromWatchHistory, 
// dentro il loop per ogni entry della watch history:

const DISLIKE_THRESHOLD = 0.35  // corrisponde a rating < ~2.5/5

if (normalizedRating < DISLIKE_THRESHOLD) {
  // Rating basso: i generi del film generano segnale NEGATIVO
  const penalty = -(DISLIKE_THRESHOLD - normalizedRating)  // es: -0.25 per rating 2/5
  
  for (const genre of entry.movie.genres ?? []) {
    events.push({
      entityId: genre.id?.toString() ?? genre.name,
      entityType: "genre",
      weight: penalty,
      source: "watch",
      happenedAt: entry.watchedAt,
    })
  }
} else {
  // Logica esistente per rating neutri/positivi
  // ...
}
```

Il profilo può già gestire pesi negativi (sono numeri), ma la normalizzazione andrebbe aggiornata per supportare il range [-1, 1] invece di [0, 1]:

```typescript
// In normalizeProfile (preferences.ts):
// Usare min-max normalization con range [-1, 1]
// oppure clampare semplicemente tra -1 e 1 dopo la normalizzazione
```

**Perché giova:** Evita che il sistema proponga ripetutamente generi che l'utente ha dimostrato di non apprezzare. È la differenza tra un sistema che "apprende" dai feedback negativi e uno che li ignora. Per i gruppi, questo è doppiamente importante: se anche solo un membro ha segnali negativi forti su un genere, il suo profilo contribuisce a ridurre il peso di quel genere nell'aggregazione.

---

### P2-C — Protezione da veto nella compatibilità di gruppo

**File:** `src/pcs/recommend-group/service.ts`
**Impatto:** Alto | **Sforzo:** Basso (30 minuti)

**Problema:** La formula attuale `0.6·mean + 0.3·min − 0.1·variance` non penalizza abbastanza i film che qualcuno odierebbe.

**Soluzione:** Introdurre una penalità di veto esplicita quando lo score minimo è sotto una soglia critica:

```typescript
// In computeCompatibilityScores (service.ts):

const VETO_THRESHOLD = 0.20  // score < 20%: "lo odio"
const STRONG_VETO_THRESHOLD = 0.10  // score < 10%: "no categoricamente"

function computeGroupCompatibility(memberScores: number[]): number {
  const mean = memberScores.reduce((a, b) => a + b) / memberScores.length
  const min = Math.min(...memberScores)
  const variance = memberScores.reduce((sum, s) => sum + (s - mean) ** 2, 0) / memberScores.length

  let base = 0.50 * mean + 0.40 * min - 0.10 * variance

  // Penalità di veto
  if (min < STRONG_VETO_THRESHOLD) {
    base *= 0.25  // -75%: qualcuno lo odia categoricamente
  } else if (min < VETO_THRESHOLD) {
    base *= 0.55  // -45%: qualcuno non lo vuole vedere
  }

  return Math.max(0, Math.min(1, base))
}
```

**Modifica ai pesi:** Da `0.6·mean + 0.3·min` a `0.5·mean + 0.4·min` — si dà più peso al membro meno soddisfatto perché in un contesto di gruppo la sua insoddisfazione è contagiosa.

**Perché giova:** Nella realtà delle serate cinema, una persona che odia il film che stanno guardando influenza negativamente l'umore di tutti. Il sistema deve essere più conservativo nell'offrire film controversi. Con questa modifica, i film ad alto consenso vengono premiati in modo più netto rispetto ai film che piacciono tanto ad alcuni e poco ad altri.

---

### P2-D — Prioritizzare i film in watchlist nel pool principale

**File:** `src/pcs/recommend-group/candidates.ts`
**Impatto:** Medio-Alto | **Sforzo:** Basso (1 ora)

**Problema:** I film nelle watchlist dei membri sono esclusi dal pool principale e relegati agli "outsiders".

**Soluzione:** Mantenere gli outsiders come bucket separato (va bene per la discovery), ma aggiungere un bonus di score per i film in watchlist che superano il filtro:

```typescript
// In service.ts, dopo scoreMovies():
const watchlistBonus = 0.25

for (const scored of scoredMovies) {
  if (outsiderIds.has(scored.movieId)) {
    // Film che qualcuno vuole vedere: boost esplicito
    scored.score = Math.min(1, scored.score + watchlistBonus)
    scored.reasons.push("In your group's watchlist")
  }
}
```

**Perché giova:** La watchlist è il segnale di intenzione più esplicito che un utente può dare ("voglio vederlo"). In un contesto di gruppo, se più membri lo hanno in watchlist, è esattamente il tipo di film che la serata dovrebbe privilegiare. Attualmente il sistema lo ignora quasi completamente.

---

### P3-A — Memoria delle sessioni di gruppo (Group Session History)

**File:** Nuovo — `src/data/group-history/repository.ts` + migrazione DB
**Impatto:** Alto | **Sforzo:** Alto (4-6 ore)

**Problema:** Il sistema non ricorda cosa ha raccomandato nelle sessioni precedenti dello stesso gruppo.

**Soluzione:** Aggiungere una collection MongoDB per tracciare le raccomandazioni di gruppo:

```typescript
// Nuovo schema: group_recommendation_history
interface GroupRecommendationHistory {
  groupId: ObjectId
  sessionDate: Date
  recommendedMovieIds: string[]  // movieId dei topK raccomandati
  watchedMovieId?: string        // il film che il gruppo ha effettivamente guardato
}

// Funzioni da aggiungere in repository:
async function saveGroupRecommendationHistory(
  groupId: string,
  movieIds: string[]
): Promise<void>

async function getGroupRecommendationHistory(
  groupId: string,
  lookbackDays: number
): Promise<string[]>  // movieIds già raccomandati
```

Usarla in `buildGroupCandidatePool`:
```typescript
// Aggiungere alle esclusioni:
const groupHistoryIds = await getGroupRecommendationHistory(groupId, 60)
const groupHistorySet = new Set(groupHistoryIds)

// Nel buildPool, aggiungere:
if (groupHistorySet.has(candidate.movieId)) continue
```

Salvare la storia al termine di ogni raccomandazione in `recommendForGroup`:
```typescript
// Alla fine, prima del return:
await saveGroupRecommendationHistory(
  groupId,
  result.topK.map(m => m.movie.movieId)
).catch(() => {})  // non-blocking, fire-and-forget
```

**Perché giova:** Gruppi che si trovano regolarmente non vedranno mai gli stessi film riproposti. La qualità percepita del sistema migliora drasticamente perché ogni sessione sembra "fresca". È anche la base per implementare in futuro un sistema di fairness rotazionale (vedi P3-B).

---

### P3-B — Fairness rotazionale tra sessioni

**File:** `src/pcs/recommend-group/preferences.ts` + estensione P3-A
**Impatto:** Alto | **Sforzo:** Alto (3-4 ore, richiede P3-A)

**Problema:** Nel tempo, i membri con profili più forti "vincono" sempre le raccomandazioni di gruppo. I gusti dei membri con profili più deboli o meno rappresentati vengono sistematicamente ignorati.

**Soluzione:** Tracciare per ogni sessione chi ha "vinto" (i cui gusti erano più allineati al film raccomandato) e applicare un piccolo bonus correttivo nelle sessioni successive ai membri storicamente sotto-rappresentati:

```typescript
// Calcolare "fairness debt" per ogni membro:
interface MemberFairnessRecord {
  userId: string
  satisfactionHistory: number[]  // compatibility score per ogni sessione
  avgSatisfaction: number
}

// Se un membro ha avg satisfaction < 0.4 nelle ultime 5 sessioni,
// applicare un bonus moltiplicativo al suo profilo nell'aggregazione:
const fairnessBoost = (targetAvgSatisfaction - member.avgSatisfaction) * 0.3
adjustedConfidence = confidence * (1 + fairnessBoost)
```

**Perché giova:** Garantisce che nel lungo periodo tutti i membri di un gruppo vedano film che riflettono i loro gusti, non solo quelli del membro "dominante". Questo è fondamentale per la retention: se un membro sente che le sue preferenze vengono sempre ignorate, abbandona il gruppo (o l'app).

---

### P3-C — Serendipity basata su diversità di genere

**File:** `src/pcs/recommend-user/serendipity.ts`
**Impatto:** Medio | **Sforzo:** Medio (2-3 ore)

**Problema:** Le "sorprese" vengono selezionate casualmente dalla coda senza garantire che siano genuinamente diverse dai top risultati.

**Soluzione:** Selezionare le sorprese massimizzando la diversità di genere rispetto ai top-N:

```typescript
export function applySerendipityDiverse(
  ranked: ScoredMovie[],
  enriched: Map<string, EnrichedMovieCandidate>,
  config: SerendipityConfig
): ScoredMovie[] {
  const topCount = Math.floor((1 - config.rate) * ranked.length)
  const surpriseCount = Math.floor(config.rate * ranked.length)

  // Generi già presenti nei top film
  const topGenres = new Set(
    ranked.slice(0, topCount).flatMap(m =>
      enriched.get(m.movieId)?.genres?.map(g => g.id) ?? []
    )
  )

  // Seleziona dalla coda privilegiando film con generi nuovi
  const pool = ranked.slice(topCount, topCount + config.poolSize)
  const scored = pool.map(film => {
    const filmGenres = enriched.get(film.movieId)?.genres?.map(g => g.id) ?? []
    const novelGenres = filmGenres.filter(g => !topGenres.has(g))
    const novelty = filmGenres.length > 0
      ? novelGenres.length / filmGenres.length
      : 0
    return { film, novelty }
  })

  // Ordina per novelty decrescente, prendi i più "diversi"
  scored.sort((a, b) => b.novelty - a.novelty)
  const surprises = scored.slice(0, surpriseCount).map(s => ({
    ...s.film,
    serendipity: true,
    reasons: [...(s.film.reasons ?? []), "Something different to discover"]
  }))

  // Distribuisci uniformemente nel ranking
  const result = [...ranked.slice(0, topCount)]
  const step = Math.floor(topCount / (surprises.length + 1))
  for (let i = 0; i < surprises.length; i++) {
    result.splice((i + 1) * step, 0, surprises[i])
  }

  return result
}
```

**Perché giova:** Le "sorprese" diventano genuinamente sorprendenti — film di generi che il gruppo non vede spesso, non semplicemente i film con score più basso. Questo aumenta l'efficacia della discovery e riduce l'effetto filter bubble.

---

## 6. Roadmap di Implementazione

### Sprint 1 — Fix Matematici (1-2 giorni)
Massimo impatto per minimo sforzo. Nessun rischio di regressioni.

| # | Miglioramento | File | Stima |
|---|---|---|---|
| 1 | P1-A: Correggere pesi scoring | `config.ts` | 15 min |
| 2 | P1-B: Ricalibrare jitter | `config.ts` | 5 min |
| 3 | P1-C: Normalizzazione log popularity | `scoring.ts` | 15 min |
| 4 | P2-C: Formula compatibilità con veto | `service.ts` | 1 ora |

---

### Sprint 2 — Miglioramenti Algoritmici (3-5 giorni)
Richiedono più riflessione ma usano l'architettura esistente.

| # | Miglioramento | File | Stima |
|---|---|---|---|
| 5 | P2-A: Aggregazione pesata per confidenza | `preferences.ts` | 2 ore |
| 6 | P2-B: Segnali negativi da rating bassi | `preferences.ts` (user) | 3 ore |
| 7 | P2-D: Boost watchlist nel scoring | `service.ts` + `candidates.ts` | 1 ora |
| 8 | P3-C: Serendipity con diversità di genere | `serendipity.ts` | 3 ore |

---

### Sprint 3 — Feature Nuove (1-2 settimane)
Richiedono modifiche al data layer e potenzialmente migrazioni del database.

| # | Miglioramento | File | Stima |
|---|---|---|---|
| 9 | P3-A: Group session history | Nuovo repository + DB | 6 ore |
| 10 | P3-B: Fairness rotazionale | Estensione P3-A | 4 ore |

---

## 7. Conclusioni

L'algoritmo di raccomandazione per gruppi di WatchWise è un sistema funzionante con buone fondamenta — soprattutto la profilazione individuale con decadimento temporale duale e i moltiplicatori per sorgente sono scelte tecnicamente valide. Il problema principale è che **la matematica ha alcune crepe** (pesi incoerenti, jitter eccessivo, aggregazione ingenua) che rendono i segnali costruiti con cura meno efficaci di quanto potrebbero essere.

**I tre interventi con il miglior ROI sono:**
1. **P1-A** (pesi → 1.0) + **P1-B** (jitter → 0.04): 20 minuti di lavoro, impatto immediato sulla coerenza dei punteggi.
2. **P2-C** (veto protection): 1 ora di lavoro, cambia radicalmente la qualità delle raccomandazioni per gruppi con preferenze eterogenee.
3. **P2-A** (aggregazione pesata per confidenza): 2 ore, risolve il problema del cold-start dilution e della parità di peso tra profili ricchi e vuoti.

Implementando solo gli Sprint 1 e 2, il voto dell'algoritmo passerebbe stimativamente da **6.2** a circa **8.0/10** — un miglioramento sostanziale senza richiedere una riscrittura dell'architettura.

---

*Report generato il 2026-04-03. Basato sull'analisi del codice sorgente in `watchwise-backend/src/pcs/`.*
