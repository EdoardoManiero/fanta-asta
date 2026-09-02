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
  };
}

export class AuctionEngine {
  constructor(onChange) {
    this.onChange = onChange || (() => {});
    this.state = loadState() || freshState();
    // never resume mid-countdown across a restart; require admin to resume it
    if (this.state.currentAuction) this.state.currentAuction.timerEndsAt = null;
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

  adminSetConfig({ budget, slots, timerSeconds, softCloseSeconds, minIncrement }) {
    if (this.state.phase !== 'lobby') {
      return { ok: false, error: 'Le regole si possono modificare solo prima di iniziare.' };
    }
    if (budget) this.state.config.budget = budget;
    if (slots) this.state.config.slots = slots;
    if (timerSeconds) this.state.config.timerSeconds = timerSeconds;
    if (softCloseSeconds) this.state.config.softCloseSeconds = softCloseSeconds;
    if (minIncrement) this.state.config.minIncrement = minIncrement;
    for (const t of Object.values(this.state.teams)) t.budget = this.state.config.budget;
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
    this.state.currentAuction = {
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
    const last = this.state.history.pop();
    if (!last) return { ok: false, error: 'Nessuna assegnazione da annullare.' };
    const player = this.state.players.find((p) => p.id === last.playerId);
    const team = this.state.teams[last.teamId];
    if (player) {
      player.status = 'available';
      player.soldTo = null;
      player.soldPrice = null;
    }
    if (team) {
      team.budget += last.price;
      team.roster[last.role] = team.roster[last.role].filter((p) => p.playerId !== last.playerId);
      this._pushLog(`Annullata l'assegnazione di ${last.playerName} a ${team.name}.`);
    }
    this._persist();
    return { ok: true };
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

  bid(teamId, amount) {
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

    player.status = 'sold';
    player.soldTo = team.id;
    player.soldPrice = price;
    team.budget -= price;
    team.roster[player.ruolo].push({ playerId: player.id, name: player.nome, price });

    this.state.history.push({
      playerId: player.id,
      playerName: player.nome,
      role: player.ruolo,
      teamId: team.id,
      teamName: team.name,
      price,
      ts: Date.now(),
    });
    this._pushLog(`${player.nome} assegnato a ${team.name} per ${price} crediti.`);
    this.state.currentAuction = null;

    if (Object.values(this.state.teams).every((t) => this.teamIsFull(t))) {
      this.state.phase = 'finished';
      this._pushLog('Tutte le rose sono complete. Asta terminata!');
    }
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
