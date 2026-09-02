# Asta Classic

Tool per fare l'asta del fantacalcio online con i tuoi amici, in tempo reale, usando
i dati del tuo foglio Excel di quotazioni (già convertiti in `server/data/players.json`,
532 giocatori su 4 ruoli).

Non è una copia del codice di FantaLab (non ci ho accesso e non lo replico) — è un'app
scritta da zero con lo stesso scopo: gestire l'asta al posto del foglio Excel.

## Come funziona

- Un solo "tavolo" d'asta condiviso, pensato per **10 squadre**.
- Regole di default (modificabili dal pannello Admin **prima** di avviare l'asta):
  500 crediti, rose da 3 P / 8 D / 8 C / 6 A (25 giocatori a squadra).
- Il tuo amico apre il link, clicca su una squadra libera, le dà un nome ed entra.
- Tu (l'organizzatore) entri come una squadra qualsiasi e poi sblocchi il **pannello
  Admin** con il codice admin (vedi sotto). Il riquadro centrale in alto è il tuo
  "tavolo di chiamata": filtra per ruolo o cerca un nome e premi "Chiama" (a caso se
  non hai cercato nulla, altrimenti quel giocatore specifico) per metterlo all'asta,
  oppure "Assegna" per darlo direttamente a una squadra a un prezzo fisso, senza asta
  live (utile per correggere errori o accordi pre-asta). Il timer parte dal pannello
  Admin e il sistema assegna automaticamente il giocatore al miglior offerente allo
  scadere del tempo.
- Timer con "soft-close": ogni nuova offerta negli ultimi 5 secondi allunga il
  countdown di altri 5 secondi, per evitare che qualcuno rubi il giocatore
  all'ultimo istante.
- Regola della riserva: non puoi offrire più di quanto ti lascia almeno 1 credito
  per ogni slot di rosa ancora da riempire (la classica regola dell'asta al fantacalcio).
- Tab "Rose Squadre": budget e rosa di tutte le squadre in tempo reale, con le
  righe per ruolo espandibili/collassabili.
- Tab "Giocatori": l'intero database, filtrabile per ruolo, cercabile per nome,
  ordinabile per ogni colonna (quotazione, prezzo consigliato, FMV, presenze, gol...).
- Tab "Fasce Giocatori": mostra la fascia (Top/Semi-Top/...) di ogni giocatore presa
  dal tuo Excel originale. Da qui l'Admin può anche **caricare altri file Excel con lo
  stesso formato** (colonne Ruolo/Nome/Squadra/Fascia) per confrontare le fasce di
  altre fonti/esperti fianco a fianco — i giocatori vengono abbinati automaticamente
  per nome e ruolo. La tabella mostra anche quotazione, prezzo consigliato, titolarità,
  affidabilità, FMV, presenze e gol/assist (per i portieri: gol subiti e rigori parati)
  direttamente in linea, senza dover aprire la scheda.
- Se un client si disconnette/aggiorna la pagina, ritrova automaticamente la propria
  squadra (l'identità è salvata nel browser).
- **Gestione rose (admin)**: dal pannello Admin puoi correggere qualsiasi cosa a mano —
  aggiungere un giocatore a una squadra al prezzo che vuoi, cambiare il prezzo pagato,
  spostare un giocatore a un'altra squadra o rimuoverlo restituendo i crediti. Vale per
  **qualsiasi** giocatore già assegnato, non solo per l'ultimo: da "Gestione rose" nel
  pannello Admin oppure cliccando il giocatore in "Giocatori"/"Fasce Giocatori"
  ("Annulla ultima assegnazione" è solo una scorciatoia). Budget,
  rose, disponibilità del giocatore e fine asta si aggiornano automaticamente, e le
  operazioni che romperebbero le regole (budget insufficiente, reparto pieno, doppia
  assegnazione) vengono rifiutate.
- Click su un giocatore (in "Giocatori", "Fasce Giocatori" o sul tavolo dell'asta)
  apre la scheda completa: statistiche stagione scorsa (presenze, minuti, MV/FMV,
  gol, assist, ammonizioni...), note di scouting e, se presente, la stellina ★ che
  indica un tuo "obiettivo" personale segnato nell'Excel originale.
- Foto dei giocatori recuperate da Wikipedia dove disponibile (277 su 532, ~52%;
  fallback all'iniziale del ruolo per gli altri) — rigenerabile con
  `node server/scripts/enrich-photos.mjs`.
- **Suggerimenti mentre scrivi**: cercando un giocatore (per chiamarlo o per
  aggiungerlo a una rosa) compare una tendina con i risultati **ordinati per
  quotazione**, navigabile con le frecce e Invio.
- **Conferma a fine asta**: quando le offerte per un giocatore si chiudono, a tutti
  compare una finestra con foto, nome, squadra aggiudicataria e prezzo (evidenziata
  se l'hai vinto tu).
- **Barra offerte sempre visibile**: durante un'asta live i pulsanti di rilancio
  (+1, +5, +10, +25, importo libero) stanno in una barra fissa in fondo allo schermo,
  con nome del giocatore, offerta corrente, budget e timer — restano raggiungibili
  comunque tu abbia scrollato la pagina.
- **La stessa scheda statistiche ovunque**: cliccando un giocatore in "Giocatori" o
  "Fasce Giocatori" si apre la scheda completa con heat map, statistiche e note; se
  sei admin, da lì puoi anche spostarlo di squadra, cambiargli il prezzo o rimuoverlo.
- **Scheda del giocatore chiamato**: sotto i pulsanti di offerta trovi indici di
  titolarità/affidabilità/integrità, tutte le statistiche della stagione scorsa e una
  **heat map** che colora ogni statistica in base al percentile nel suo ruolo (il
  numero grande resta il valore reale, così il colore è solo un aiuto visivo).

## Provarlo in locale (facoltativo, prima della serata)

```bash
npm run build        # builda il frontend
npm start             # avvia il server su http://localhost:4000
```

Apri `http://localhost:4000` in più schede del browser per simulare più partecipanti.

## Test di carico (concorrenza)

Per verificare che l'asta regga bene con 10 persone che offrono contemporaneamente
e in modo aggressivo (offerte simultanee, spesso identiche, in ordine casuale):

```bash
node server/scripts/load-test-bidding.mjs [round] [offerte-per-client-per-round]
# default: 8 round, 15 raffiche per client
```

Avvia un server isolato su una porta casuale, simula 10 "bot" che si contendono
ogni giocatore con raffiche di offerte concorrenti e verifica al termine di ogni
round che ci sia un solo vincitore, il budget sia scalato esattamente, nessun
budget sia andato negativo e il totale speso combaci con lo storico — stampa
PASS/FAIL con il dettaglio di eventuali anomalie.


## Test di resilienza (connessioni instabili, casi limite)

```bash
node server/scripts/test-resilience.mjs
```

Verifica 30 scenari che *non devono* rompere l'asta, tra cui:

- **Connessione instabile**: chi cade mentre è in testa vince comunque il
  giocatore; alla riconnessione ritrova la sua squadra e risulta di nuovo
  online; la squadra di un disconnesso non può essere rubata; un'offerta
  partita per il giocatore precedente e arrivata in ritardo viene **rifiutata**
  invece di finire sul giocatore attualmente sul tavolo; l'asta si chiude
  correttamente anche se cade la connessione dell'admin.
- **Concorrenza**: due admin che chiamano insieme, raffica di offerte a cavallo
  della scadenza del timer (un solo vincitore, contabilità coerente), reset
  mentre volano le offerte.
- **Gestione rose**: aggiunta/modifica prezzo/spostamento/rimozione con ricalcolo di
  budget e contabilità, e rifiuto di budget insufficiente, reparto pieno e doppia
  assegnazione.
- **Validazione**: codice admin errato, azioni admin da non-admin, occupare o
  rinominare la squadra altrui, offerte sotto il minimo/oltre budget/oltre la
  regola della riserva, offerte senza giocatore sul tavolo.

## Hosting per la serata dell'asta (Render, gratis)

Ho scelto Render perché ha un piano gratuito che supporta WebSocket (necessari per
la sincronizzazione in tempo reale) e non richiede carta di credito.

1. **Crea un repository GitHub** con questo codice (posso farlo io da qui se mi dai
   il via libera, oppure carica tu la cartella `asta-app` su un nuovo repo).
2. Vai su [render.com](https://render.com) → crea un account gratuito → **New +** →
   **Blueprint** → collega il repository GitHub appena creato. Render leggerà
   automaticamente `render.yaml` e configurerà tutto da solo (Dockerfile incluso).
3. Durante la creazione ti chiederà il valore della variabile d'ambiente
   `ADMIN_PASSCODE`: scegli una password segreta (sarai tu solo a doverla usare
   per sbloccare il pannello Admin) e impostala lì.
4. Deploy → dopo 2-3 minuti ottieni un URL pubblico tipo
   `https://asta-classic.onrender.com`. Mandalo ai tuoi 10 amici.

**Nota sul piano gratuito**: l'istanza gratuita si "addormenta" dopo ~15 minuti senza
traffico e, quando si riavvia, riparte da zero (i dati dell'asta in corso non sono
salvati su disco persistente in questo piano). Per la serata:
- apri tu il link 5-10 minuti prima di iniziare, così il servizio è già "sveglio" e
  resta attivo finché qualcuno lo usa attivamente;
- non serve nessun'altra accortezza durante l'asta stessa, dato che il traffico
  continuo delle offerte la tiene sveglia.

Se preferisci non rischiare nulla (niente riavvii per tutta la serata, dati salvati
su disco persistente), basta passare l'istanza Render dal piano **Free** al piano
**Starter** (a pagamento, circa $7/mese, disattivabile subito dopo l'asta) e
aggiungere un disco persistente collegato a `STATE_DIR=/data` — te lo configuro se
mi dici di procedere.

## Modificare le regole della lega

Prima di premere "Avvia asta" nel pannello Admin puoi cambiare budget, numero di
slot per ruolo, durata del timer e soft-close. Dopo l'avvio le regole sono bloccate
(per correttezza verso tutti i partecipanti).

## Struttura del progetto

```
asta-app/
  server/         Node + Express + Socket.IO, motore dell'asta, dati giocatori
  web/             Frontend React + Vite + Tailwind
  Dockerfile       Immagine unica servita da Render
  render.yaml      Blueprint di deploy
```
