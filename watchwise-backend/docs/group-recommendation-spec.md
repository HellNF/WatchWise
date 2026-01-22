# Group Recommendation — Specifica Funzionale & Tecnica (MVP)

**Obiettivo**
Funzionalità pensata per coppie/gruppi di amici in presenza. L’esperienza deve essere rapida, con onboarding leggero, e offrire suggerimenti “di compromesso” ma anche outsider intelligenti (watchlist).

---

## 1) Joining al gruppo (codice alfanumerico)

### 1.1 Requisiti UX
- **Codice alfanumerico di 8+ caratteri**, leggibile a voce.
- Visualizzato con **formato a blocchi** (es. `AB12-CD34`) per ridurre errori.
- **Copia/Condividi** su web (non QR).

### 1.2 Sicurezza e anti‑abuso
- **Scadenza** del codice (es. 30–60 minuti).
- **Rate limit** (per IP + per utente) sui tentativi di join.
- **Tentativi massimi** (es. 5/10) con backoff.
- **Rigenerazione** codice da host (invalida il precedente).

### 1.3 Modello dati (estensione)
- `Group.joinCode: string`
- `Group.joinCodeExpiresAt: Date`
- `Group.hostId: ObjectId` (opzionale, ma utile)
- `Group.status: "open" | "locked" | "closed"` (opzionale)

---

## 2) Questionario giornaliero (blocking soft)

### 2.1 Comportamento consigliato
- Se un membro **non ha compilato** il questionario del giorno:
  - Mostrare **prompt** prima del join o immediatamente dopo.
- **Soft‑start**: se non tutti rispondono entro un timeout (5–10 min),
  - il sistema **parte comunque** con chi ha risposto.
- **Override host**: pulsante “Start anyway”.

### 2.2 Dati da recuperare
- Ultimo questionario per utente: data, mood, energy, maxDuration, etc.
- Se assente: usare fallback (preferenze storiche).

---

## 3) Compatibilità a fasce (categorie)

### 3.1 Razionale
Segmentare i suggerimenti in **fasce di compatibilità** aiuta la decisione:
- “Altissima compatibilità” (80–100%)
- “Compatibilità media” (60–80%)
- “Compatibilità esplorativa” (40–60%)

### 3.2 Metodologia (fattibile in PCS)
Si calcola un **Group Compatibility Score** per ogni film: $0..1$.

**Score film per utente**
Per ogni utente $u$ calcolare uno score $s_u \in [0,1]$ con:
- preferenze (genere/attori/registi)
- contesto sessione (mood, durata)
- penalty su esclusioni

**Aggregazione per gruppo**
Per ogni film:
- **media** degli score: $\bar{s}$
- **minimo** tra utenti: $s_{min}$
- **disaccordo**: varianza $\sigma^2$

**Compatibilità finale**
$$
C = 0.6\cdot\bar{s} + 0.3\cdot s_{min} - 0.1\cdot\sigma^2
$$

Il risultato è normalizzato in $[0,1]$.

### 3.3 Fasce dinamiche (consiglio)
Per evitare categorie vuote:
- usare **percentili** sul ranking finale, se necessario.
- fallback a soglie statiche solo se la distribuzione è buona.

---

## 4) Watchlist come outsider

### 4.1 Motivazione
Nel contesto di gruppo, un film “fuori radar” può essere **accettabile** se:
- è presente in almeno 1 watchlist,
- non è già visto recentemente.

### 4.2 Implementazione
- Quota **10–20%** del ranking finale riservata a outsider.
- Etichetta visibile: **“Outsider (watchlist)”**.
- Penalità soft se il film è troppo distante dalle preferenze condivise.

---

## 5) Pipeline concreta (MVP)

1. **Join Group** (codice)
2. **Check questionario**
3. **Build group profile** (media preferenze)
4. **Candidate pool**
   - trending/popular
   - genre/actors directors
   - watchlist outsiders
5. **Scoring per utente**
6. **Aggregazione & compatibilità**
7. **Bucket per fascia**
8. **Output con motivazioni**

---

## 6) Output API consigliato

```json
{
  "recommended": { "movie": {...}, "score": 0.92, "reasons": [...] },
  "buckets": {
    "high": [ ... ],
    "medium": [ ... ],
    "explore": [ ... ]
  },
  "outsiders": [ ... ]
}
```

---

## 7) Suggerimenti pratici per efficacia

- **Transparency**: spiegare “perché” il film è lì.
- **Fairness**: garantire che ogni membro “sia rappresentato”.
- **Speed**: caching degli enrichment TMDB.
- **Robustezza**: fallback se alcuni utenti non hanno dati.

---

## 8) MVP realistico (prima milestone)

- Join con codice + expiry
- Soft start questionario
- PCS group con:
  - candidato pool base
  - preferenze aggregate
  - compatibilità bucket
  - outsider watchlist

---

## 9) Estensioni successive

- Matching multi‑sessione (consiglio “a rotazione”)
- Modalità “host guided” (priorità al host)
- Personalizzazione peso “outsider”

---

**Nota finale**
L’approccio è fattibile e coerente col contesto desktop. Il codice alfanumerico resta la scelta migliore per gruppi in presenza da PC.
