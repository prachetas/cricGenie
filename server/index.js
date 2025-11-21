import express from 'express';
import cors from 'cors';
import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import fs from 'fs';
import path from 'path';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Database Setup
let db;

const initializeDb = async () => {
    // Ensure data directory exists
    const dataDir = './data';
    if (!fs.existsSync(dataDir)){
        fs.mkdirSync(dataDir, { recursive: true });
    }

    db = await open({
        filename: './data/cricket.db',
        driver: sqlite3.Database
    });

    // Create tables if not exist
    await db.exec(`
        CREATE TABLE IF NOT EXISTS teams (id TEXT PRIMARY KEY, data TEXT);
        CREATE TABLE IF NOT EXISTS matches (id TEXT PRIMARY KEY, data TEXT);
        CREATE TABLE IF NOT EXISTS tournaments (id TEXT PRIMARY KEY, data TEXT);
    `);
    console.log('Database initialized');
};

initializeDb();

// --- Routes ---

// Get all data (Initial Load)
app.get('/api/init', async (req, res) => {
    try {
        // Defensive check if db is ready
        if (!db) {
             return res.status(503).json({ error: 'Database initializing' });
        }

        const teams = await db.all('SELECT data FROM teams');
        const matches = await db.all('SELECT data FROM matches');
        const tournaments = await db.all('SELECT data FROM tournaments');

        res.json({
            teams: teams.map(t => JSON.parse(t.data)),
            matches: matches.map(m => JSON.parse(m.data)),
            tournaments: tournaments.map(t => JSON.parse(t.data))
        });
    } catch (error) {
        console.error('Error loading init data:', error);
        res.status(500).json({ error: 'Failed to load data' });
    }
});

// Sync/Save Helpers
const syncData = async (table, items) => {
    if (!db) throw new Error('Database not initialized');
    
    await db.run('BEGIN TRANSACTION');
    try {
        await db.run(`DELETE FROM ${table}`);
        
        const stmt = await db.prepare(`INSERT INTO ${table} (id, data) VALUES (?, ?)`);
        for (const item of items) {
            await stmt.run(item.id, JSON.stringify(item));
        }
        await stmt.finalize();
        await db.run('COMMIT');
    } catch (e) {
        await db.run('ROLLBACK');
        throw e;
    }
};

// Save Teams
app.post('/api/teams', async (req, res) => {
    try {
        await syncData('teams', req.body);
        res.json({ success: true });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to save teams' });
    }
});

// Save Matches
app.post('/api/matches', async (req, res) => {
    try {
        await syncData('matches', req.body);
        res.json({ success: true });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to save matches' });
    }
});

// Save Tournaments
app.post('/api/tournaments', async (req, res) => {
    try {
        await syncData('tournaments', req.body);
        res.json({ success: true });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to save tournaments' });
    }
});

app.listen(PORT, () => {
    console.log(`Backend server running on http://localhost:${PORT}`);
});