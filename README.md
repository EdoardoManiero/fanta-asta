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
  per nome e ruolo.
- Se un client si disconnette/aggiorna la pagina, ritrova automaticamente la propria
  squadra (l'identità è salvata nel browser).

## Provarlo in locale (facoltativo, prima della serata)

```bash
npm run build        # builda il frontend
npm start             # avvia il server su http://localhost:4000
```

Apri `http://localhost:4000` in più schede del browser per simulare più partecipanti.

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
