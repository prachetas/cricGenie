
import { Team, Match, Tournament, PersistenceMode } from '../types';
import { INITIAL_TEAMS, INITIAL_MATCHES, INITIAL_TOURNAMENTS } from '../constants';

const API_URL = 'http://localhost:3001/api';
const STORAGE_KEY_PREFIX = 'cricgenie_';

export const persistence = {
    // Configuration
    _mode: 'LOCAL' as PersistenceMode,

    setMode(mode: PersistenceMode) {
        this._mode = mode;
        localStorage.setItem('cricgenie_storage_mode', mode);
    },

    getMode(): PersistenceMode {
        const saved = localStorage.getItem('cricgenie_storage_mode');
        if (saved === 'LOCAL' || saved === 'BACKEND') {
            this._mode = saved;
        }
        return this._mode;
    },

    // Load All Data
    async loadAll() {
        const mode = this.getMode();
        
        if (mode === 'LOCAL') {
            return this.loadFromLocal();
        } else {
            return this.loadFromBackend();
        }
    },

    // Local Storage Implementation
    loadFromLocal() {
        try {
            const t = localStorage.getItem(`${STORAGE_KEY_PREFIX}teams`);
            const m = localStorage.getItem(`${STORAGE_KEY_PREFIX}matches`);
            const tour = localStorage.getItem(`${STORAGE_KEY_PREFIX}tournaments`);
            
            return {
                teams: t ? JSON.parse(t) : INITIAL_TEAMS,
                matches: m ? JSON.parse(m) : INITIAL_MATCHES,
                tournaments: tour ? JSON.parse(tour) : INITIAL_TOURNAMENTS
            };
        } catch (e) {
            console.error("Error loading local data", e);
            return { teams: INITIAL_TEAMS, matches: INITIAL_MATCHES, tournaments: INITIAL_TOURNAMENTS };
        }
    },

    // Backend Implementation
    async loadFromBackend() {
        try {
            const res = await fetch(`${API_URL}/init`);
            if (!res.ok) throw new Error('Failed to fetch initial data');
            const data = await res.json();
            
            if (data.teams.length === 0 && data.matches.length === 0) {
                return { teams: INITIAL_TEAMS, matches: INITIAL_MATCHES, tournaments: INITIAL_TOURNAMENTS };
            }
            return { teams: data.teams, matches: data.matches, tournaments: data.tournaments };
        } catch (error) {
            console.error("API Load Error, falling back to constants:", error);
            // Fallback but warn user
            alert("Failed to connect to Backend API. Switching to Local Storage temporarily.");
            this.setMode('LOCAL');
            return this.loadFromLocal();
        }
    },

    // Save Methods
    async saveTeams(teams: Team[]) {
        if (this._mode === 'LOCAL') {
            localStorage.setItem(`${STORAGE_KEY_PREFIX}teams`, JSON.stringify(teams));
        } else {
            try {
                await fetch(`${API_URL}/teams`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(teams)
                });
            } catch (e) { console.error("Failed to save teams", e); }
        }
    },

    async saveMatches(matches: Match[]) {
        if (this._mode === 'LOCAL') {
            localStorage.setItem(`${STORAGE_KEY_PREFIX}matches`, JSON.stringify(matches));
        } else {
            try {
                await fetch(`${API_URL}/matches`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(matches)
                });
            } catch (e) { console.error("Failed to save matches", e); }
        }
    },

    async saveTournaments(tournaments: Tournament[]) {
        if (this._mode === 'LOCAL') {
            localStorage.setItem(`${STORAGE_KEY_PREFIX}tournaments`, JSON.stringify(tournaments));
        } else {
            try {
                await fetch(`${API_URL}/tournaments`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(tournaments)
                });
            } catch (e) { console.error("Failed to save tournaments", e); }
        }
    }
};
