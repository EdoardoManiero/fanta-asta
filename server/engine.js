import { DEFAULT_CONFIG, ROLES } from './config.js';
import { loadPlayers, loadState, saveState } from './persist.js';

function makeTeams(count, budget) {
  const teams = {};
  for (let i = 1; i <= count; i++) {
    const id = `team-${i}`;
    teams[id] = {
      id,
      name: `Squadra ${i}`,
      ownerClientId: null,
      ownerLabel: null,
      budget,
      roster: { P: [], D: [], C: [], A: [] },
      connected: false,
    };
  }
  return teams;
}

function freshState() {
  return {
    config: { ...DEFAULT_CONFIG },
    phase: 'lobby', // lobby | live | finished
    teams: makeTeams(DEFAULT_CONFIG.teamsCount, DEFAULT_CONFIG.budget),
    players: loadPlayers(),
    currentAuction: null, // { playerId, currentBid, currentBidderTeamId, timerEndsAt, log: [] }
    history: [], // { playerId, playerName, teamId, price, ts }
    log: [], // free-text event log for the admin/spectators
    fasceSources: [], // [{ id, label, uploadedAt, matchedCount, unmatchedCount, values: { [playerId]: fascia } }]
  };
}

export class AuctionEngine {
  constructor(onChange) {
    this.onChange = onChange || (() => {});
    this.state = loadState() || freshState();
    if (!this.state.fasceSources) this.state.fasceSources = [];
    // never resume mid-countdown across a restart; require admin to resume it
    if (this.state.currentAuction) this.state.currentAuction.timerEndsAt = null;
    // rebuild derived data from history so a restored state can never be stale
    this._rebuildFromHistory();
    this._persist();
    setInterval(() => this._tick(), 250);
  }

  _persist() {
    saveState(this.state);
    this.onChange(this.getPublicState());
  }

  _pushLog(message) {
    this.state.log.unshift({ message, ts: Date.now() });
    this.state.log = this.state.log.slice(0, 200);
  }

  getPublicState() {
    return this.state;
  }

  // ---- connection / identity ----

  claimTeam(clientId, teamId, label) {
    const team = this.state.teams[teamId];
    if (!team) return { ok: false, error: 'Squadra inesistente.' };
    if (team.ownerClientId && team.ownerClientId !== clientId) {
      return { ok: false, error: 'Squadra già occupata da un altro giocatore.' };
    }
    // release any other team this client held
    for (const t of Object.values(this.state.teams)) {
      if (t.ownerClientId === clientId && t.id !== teamId) {
        t.ownerClientId = null;
        t.connected = false;
      }
    }
    team.ownerClientId = clientId;
    team.connected = true;
    if (label) team.name = label.slice(0, 40);
    this._pushLog(`${team.name} è entrato in aula.`);
    this._persist();
    return { ok: true };
  }

  renameTeam(clientId, teamId, name) {
    const team = this.state.teams[teamId];
    if (!team || team.ownerClientId !== clientId) return { ok: false, error: 'Non autorizzato.' };
    if (!name || !name.trim()) return { ok: false, error: 'Nome non valido.' };
    team.name = name.trim().slice(0, 40);
    this._persist();
    return { ok: true };
  }

  setConnected(clientId, connected) {
    let changed = false;
    for (const t of Object.values(this.state.teams)) {
      if (t.ownerClientId === clientId) {
        t.connected = connected;
        changed = true;
      }
    }
    if (changed) this._persist();
  }

  // ---- admin actions ----

  // Timing rules (countdown, soft-close, minimum raise) can be tuned at any
  // point - they don't invalidate anything already sold. Budget and roster
  // slots stay locked once the auction is live, since changing them would
  // rewrite the terms everyone has already been bidding under.
  adminSetConfig({ budget, slots, timerSeconds, softCloseSeconds, minIncrement }) {
    if ((budget != null || slots != null) && this.state.phase !== 'lobby') {
      return { ok: false, error: 'Budget e slot si possono modificare solo prima di iniziare.' };
    }
    if (budget) this.state.config.budget = budget;
    if (slots) this.state.config.slots = slots;
    if (timerSeconds) this.state.config.timerSeconds = timerSeconds;
    if (softCloseSeconds) this.state.config.softCloseSeconds = softCloseSeconds;
    if (minIncrement) this.state.config.minIncrement = minIncrement;
    this._rebuildFromHistory();
    this._persist();
    return { ok: true };
  }

  adminStart() {
    if (this.state.phase === 'live') return { ok: false, error: 'Asta già avviata.' };
    this.state.phase = 'live';
    this._pushLog("L'asta è iniziata!");
    this._persist();
    return { ok: true };
  }

  totalRequiredSlots() {
    return Object.values(this.state.config.slots).reduce((a, b) => a + b, 0);
  }

  teamRosterCount(team, role) {
    return role ? team.roster[role].length : ROLES.reduce((n, r) => n + team.roster[r].length, 0);
  }

  teamIsFull(team) {
    return ROLES.every((r) => team.roster[r].length >= this.state.config.slots[r]);
  }

  nominate(playerId) {
    if (this.state.phase !== 'live') return { ok: false, error: "L'asta non è in corso." };
    if (this.state.currentAuction) return { ok: false, error: 'C\'è già un giocatore sul tavolo.' };
    const player = this.state.players.find((p) => p.id === playerId);
    if (!player) return { ok: false, error: 'Giocatore non trovato.' };
    if (player.status !== 'available') return { ok: false, error: 'Giocatore già assegnato.' };
    this.state.nextAuctionId = (this.state.nextAuctionId || 0) + 1;
    this.state.currentAuction = {
      // Identifies this specific round. A bid delayed by a slow connection
      // carries the id of the round it was made in, so it can be rejected
      // instead of silently landing on whoever is on the table now.
      auctionId: this.state.nextAuctionId,
      playerId,
      currentBid: 0,
      currentBidderTeamId: null,
      timerEndsAt: null,
      startedAt: Date.now(),
    };
    this._pushLog(`${player.nome} (${player.ruolo}, ${player.squadra}) è sul tavolo.`);
    this._persist();
    return { ok: true };
  }

  nominateRandom(role) {
    const pool = this.state.players.filter((p) => p.status === 'available' && (!role || p.ruolo === role));
    if (pool.length === 0) return { ok: false, error: 'Nessun giocatore disponibile per questo ruolo.' };
    const pick = pool[Math.floor(Math.random() * pool.length)];
    return this.nominate(pick.id);
  }

  adminStartTimer(seconds) {
    if (!this.state.currentAuction) return { ok: false, error: 'Nessun giocatore sul tavolo.' };
    const s = seconds || this.state.config.timerSeconds;
    this.state.currentAuction.timerEndsAt = Date.now() + s * 1000;
    this._persist();
    return { ok: true };
  }

  // Add or remove seconds from the countdown already running.
  adminAdjustTimer(deltaSeconds) {
    const ca = this.state.currentAuction;
    if (!ca) return { ok: false, error: 'Nessun giocatore sul tavolo.' };
    if (!ca.timerEndsAt) return { ok: false, error: 'Il timer non è in corso: avvialo prima.' };
    const delta = Number(deltaSeconds) || 0;
    // never let an adjustment close the auction instantly
    ca.timerEndsAt = Math.max(Date.now() + 1000, ca.timerEndsAt + delta * 1000);
    this._pushLog(`Timer ${delta >= 0 ? '+' : ''}${delta}s.`);
    this._persist();
    return { ok: true };
  }

  adminPauseTimer() {
    if (!this.state.currentAuction) return { ok: false, error: 'Nessun giocatore sul tavolo.' };
    this.state.currentAuction.timerEndsAt = null;
    this._persist();
    return { ok: true };
  }

  adminSkip() {
    // no winner: return player to pool, clear table
    if (!this.state.currentAuction) return { ok: false, error: 'Nessun giocatore sul tavolo.' };
    const { playerId } = this.state.currentAuction;
    const player = this.state.players.find((p) => p.id === playerId);
    if (player) this._pushLog(`${player.nome} non assegnato.`);
    this.state.currentAuction = null;
    this._persist();
    return { ok: true };
  }

  adminUndoLast() {
    const last = this.state.history[this.state.history.length - 1];
    if (!last) return { ok: false, error: 'Nessuna assegnazione da annullare.' };
    this.state.history.pop();
    this._rebuildFromHistory();
    this._pushLog(`Annullata l'assegnazione di ${last.playerName} a ${this.state.teams[last.teamId]?.name || '—'}.`);
    this._persist();
    return { ok: true };
  }

  // ---- roster management (admin) ----
  //
  // `history` is the single source of truth for who owns what and for how
  // much. Every roster edit just rewrites history and lets everything else -
  // budgets, rosters, player status, end-of-auction - be recomputed from it,
  // so the state can never drift out of sync.

  _rebuildFromHistory() {
    for (const t of Object.values(this.state.teams)) {
      t.budget = this.state.config.budget;
      t.roster = { P: [], D: [], C: [], A: [] };
    }
    for (const p of this.state.players) {
      p.status = 'available';
      p.soldTo = null;
      p.soldPrice = null;
    }
    for (const h of this.state.history) {
      const team = this.state.teams[h.teamId];
      const player = this.state.players.find((p) => p.id === h.playerId);
      if (!team || !player) continue;
      team.budget -= h.price;
      team.roster[player.ruolo].push({ playerId: player.id, name: player.nome, price: h.price });
      player.status = 'sold';
      player.soldTo = team.id;
      player.soldPrice = h.price;
    }
    if (this.state.phase !== 'lobby') {
      const allFull = Object.values(this.state.teams).every((t) => this.teamIsFull(t));
      if (allFull && this.state.phase !== 'finished') {
        this.state.phase = 'finished';
        this._pushLog('Tutte le rose sono complete. Asta terminata!');
      } else if (!allFull && this.state.phase === 'finished') {
        this.state.phase = 'live';
      }
    }
  }

  // Dry-run a candidate history and refuse it if it would break an invariant.
  _validateHistory(history) {
    const budgets = {};
    const counts = {};
    for (const t of Object.values(this.state.teams)) {
      budgets[t.id] = this.state.config.budget;
      counts[t.id] = { P: 0, D: 0, C: 0, A: 0 };
    }
    const seen = new Set();
    for (const h of history) {
      const team = this.state.teams[h.teamId];
      const player = this.state.players.find((p) => p.id === h.playerId);
      if (!team) return { ok: false, error: 'Squadra inesistente.' };
      if (!player) return { ok: false, error: 'Giocatore inesistente.' };
      if (seen.has(h.playerId)) return { ok: false, error: `${player.nome} risulterebbe assegnato due volte.` };
      seen.add(h.playerId);
      if (!Number.isFinite(h.price) || h.price < 0) return { ok: false, error: 'Prezzo non valido.' };
      budgets[team.id] -= h.price;
      counts[team.id][player.ruolo]++;
      if (budgets[team.id] < 0) {
        return { ok: false, error: `Budget insufficiente per ${team.name}.` };
      }
      if (counts[team.id][player.ruolo] > this.state.config.slots[player.ruolo]) {
        return { ok: false, error: `Reparto ${player.ruolo} già completo per ${team.name}.` };
      }
    }
    return { ok: true };
  }

  _commitHistory(candidate, logMessage) {
    const check = this._validateHistory(candidate);
    if (!check.ok) return check;
    this.state.history = candidate;
    this._rebuildFromHistory();
    if (logMessage) this._pushLog(logMessage);
    this._persist();
    return { ok: true };
  }

  adminAddAssignment(playerId, teamId, price) {
    const player = this.state.players.find((p) => p.id === playerId);
    const team = this.state.teams[teamId];
    if (!player) return { ok: false, error: 'Giocatore non trovato.' };
    if (!team) return { ok: false, error: 'Squadra non trovata.' };
    if (this.state.currentAuction?.playerId === playerId) {
      return { ok: false, error: 'Questo giocatore è in asta in questo momento.' };
    }
    if (this.state.history.some((h) => h.playerId === playerId)) {
      return { ok: false, error: `${player.nome} è già assegnato a una squadra.` };
    }
    const candidate = [
      ...this.state.history,
      {
        playerId, playerName: player.nome, role: player.ruolo,
        teamId, teamName: team.name, price: Number(price), ts: Date.now(), manual: true,
      },
    ];
    return this._commitHistory(candidate, `${player.nome} assegnato manualmente a ${team.name} per ${price} crediti.`);
  }

  adminRemoveAssignment(playerId) {
    const entry = this.state.history.find((h) => h.playerId === playerId);
    if (!entry) return { ok: false, error: 'Questo giocatore non è assegnato a nessuno.' };
    const candidate = this.state.history.filter((h) => h.playerId !== playerId);
    const teamName = this.state.teams[entry.teamId]?.name || '—';
    return this._commitHistory(candidate, `${entry.playerName} rimosso da ${teamName} (${entry.price} crediti restituiti).`);
  }

  adminUpdateAssignment(playerId, { teamId, price }) {
    const entry = this.state.history.find((h) => h.playerId === playerId);
    if (!entry) return { ok: false, error: 'Questo giocatore non è assegnato a nessuno.' };
    const newTeamId = teamId || entry.teamId;
    const newTeam = this.state.teams[newTeamId];
    if (!newTeam) return { ok: false, error: 'Squadra non trovata.' };
    const newPrice = price == null ? entry.price : Number(price);
    const candidate = this.state.history.map((h) =>
      h.playerId === playerId
        ? { ...h, teamId: newTeamId, teamName: newTeam.name, price: newPrice, manual: true }
        : h
    );
    const changes = [];
    if (newTeamId !== entry.teamId) changes.push(`spostato a ${newTeam.name}`);
    if (newPrice !== entry.price) changes.push(`prezzo ${entry.price} → ${newPrice}`);
    if (changes.length === 0) return { ok: true };
    return this._commitHistory(candidate, `${entry.playerName}: ${changes.join(', ')}.`);
  }

  // Nominate and finalize in one step, without a live bidding round (e.g. to
  // fix a mistake or honor a pre-arranged deal).
  adminQuickAssign(playerId, teamId, price) {
    if (this.state.currentAuction) return { ok: false, error: "C'è già un giocatore sul tavolo." };
    const nom = this.nominate(playerId);
    if (!nom.ok) return nom;
    return this.adminForceAssign(teamId, price);
  }

  adminForceAssign(teamId, price) {
    if (!this.state.currentAuction) return { ok: false, error: 'Nessun giocatore sul tavolo.' };
    const check = this._validateBid(teamId, price, { ignoreCurrentBid: true });
    if (!check.ok) return check;
    this.state.currentAuction.currentBid = price;
    this.state.currentAuction.currentBidderTeamId = teamId;
    return this._finalizeSale();
  }

  adminReset() {
    this.state = freshState();
    this._pushLog('Asta azzerata.');
    this._persist();
    return { ok: true };
  }

  // ---- fasce sources ----

  addFasceSource(label, matchResult) {
    const source = {
      id: `fasce-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      label: (label || 'Fonte').slice(0, 60),
      uploadedAt: Date.now(),
      matchedCount: matchResult.matchedCount,
      unmatchedCount: matchResult.unmatchedCount,
      values: matchResult.values,
    };
    this.state.fasceSources.push(source);
    this._pushLog(`Caricate nuove fasce: "${source.label}" (${source.matchedCount} giocatori abbinati).`);
    this._persist();
    return { ok: true, source };
  }

  removeFasceSource(id) {
    const before = this.state.fasceSources.length;
    this.state.fasceSources = this.state.fasceSources.filter((s) => s.id !== id);
    if (this.state.fasceSources.length === before) return { ok: false, error: 'Fonte non trovata.' };
    this._persist();
    return { ok: true };
  }

  // ---- bidding ----

  _validateBid(teamId, amount, { ignoreCurrentBid = false } = {}) {
    const team = this.state.teams[teamId];
    if (!team) return { ok: false, error: 'Squadra inesistente.' };
    if (!this.state.currentAuction) return { ok: false, error: 'Nessun giocatore sul tavolo.' };
    const player = this.state.players.find((p) => p.id === this.state.currentAuction.playerId);
    if (!player) return { ok: false, error: 'Giocatore non trovato.' };

    const role = player.ruolo;
    if (team.roster[role].length >= this.state.config.slots[role]) {
      return { ok: false, error: `Reparto ${role} già completo.` };
    }
    if (!ignoreCurrentBid) {
      const min = this.state.currentAuction.currentBid + this.state.config.minIncrement;
      if (amount < min) return { ok: false, error: `Offerta minima: ${min}.` };
    }
    if (amount > team.budget) return { ok: false, error: 'Budget insufficiente.' };

    const remainingSlotsAfterThis = this.totalRequiredSlots() - 1 - this.teamRosterCount(team);
    const reserveNeeded = Math.max(0, remainingSlotsAfterThis);
    if (team.budget - amount < reserveNeeded) {
      return { ok: false, error: `Devi lasciare almeno 1 credito per ciascuno dei ${reserveNeeded} slot rimanenti.` };
    }
    return { ok: true, team, player, role };
  }

  // `ctx` carries which round the bidder believed they were bidding on.
  // On a laggy connection the packet can arrive after that round ended, so a
  // mismatch means the bid is stale and must never be applied to the player
  // currently on the table.
  bid(teamId, amount, ctx = {}) {
    const ca0 = this.state.currentAuction;
    if (!ca0) return { ok: false, error: 'Nessun giocatore sul tavolo.' };
    if (ctx.auctionId != null && ctx.auctionId !== ca0.auctionId) {
      return { ok: false, error: 'Offerta scaduta: il giocatore sul tavolo è cambiato.' };
    }
    if (ctx.playerId != null && ctx.playerId !== ca0.playerId) {
      return { ok: false, error: 'Offerta scaduta: il giocatore sul tavolo è cambiato.' };
    }
    const check = this._validateBid(teamId, amount);
    if (!check.ok) return check;
    const ca = this.state.currentAuction;
    ca.currentBid = amount;
    ca.currentBidderTeamId = teamId;
    if (!ca.timerEndsAt) {
      ca.timerEndsAt = Date.now() + this.state.config.timerSeconds * 1000;
    } else {
      const remainingMs = ca.timerEndsAt - Date.now();
      const softMs = this.state.config.softCloseSeconds * 1000;
      if (remainingMs < softMs) ca.timerEndsAt = Date.now() + softMs;
    }
    this._pushLog(`${check.team.name} offre ${amount} per ${check.player.nome}.`);
    this._persist();
    return { ok: true };
  }

  _finalizeSale() {
    const ca = this.state.currentAuction;
    const player = this.state.players.find((p) => p.id === ca.playerId);
    const team = this.state.teams[ca.currentBidderTeamId];
    const price = Math.max(1, ca.currentBid);

    this.state.history.push({
      playerId: player.id,
      playerName: player.nome,
      role: player.ruolo,
      teamId: team.id,
      teamName: team.name,
      price,
      ts: Date.now(),
    });
    this._rebuildFromHistory();
    this._pushLog(`${player.nome} assegnato a ${team.name} per ${price} crediti.`);
    this.state.currentAuction = null;
    this._persist();
    return { ok: true };
  }

  _tick() {
    const ca = this.state.currentAuction;
    if (!ca || !ca.timerEndsAt) return;
    if (Date.now() < ca.timerEndsAt) return;
    if (ca.currentBidderTeamId) {
      this._finalizeSale();
    } else {
      // timer ran out with no bids: send back to pool silently
      this.state.currentAuction = null;
      this._persist();
    }
  }
}
