require('dotenv').config();
const express = require('express');
const { Pool } = require('pg');

const app = express();
const port = process.env.PORT || 3000;

let db = null;
let dbKind = 'memory';

const memory = {
  campaigns: [
    { id: 1, name: 'Curse of Strahd', description: 'Barovia adventure', created_at: new Date().toISOString() },
    { id: 2, name: 'Tomb of Annihilation', description: 'Chult jungle crawl', created_at: new Date().toISOString() },
  ],
  pcs: [
    { id: 1, name: 'Thalin', race: 'Dwarf', class: 'Fighter', campaign_id: 1 },
    { id: 2, name: 'Lyra', race: 'Elf', class: 'Wizard', campaign_id: 2 },
  ],
  nextCampaignId: 3,
  nextPCId: 3,
};

if (process.env.DATABASE_URL) {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 3000,
  });

  pool.on('connect', () => {
    db = pool;
    dbKind = 'postgres';
    console.log('[db] PostgreSQL connected');
  });
  pool.on('error', (err) => {
    console.error('[db] PostgreSQL error:', err.message);
    console.log('[db] falling back to in-memory store');
  });

  pool.query('SELECT 1').then(
    () => { db = pool; dbKind = 'postgres'; console.log('[db] PostgreSQL probe ok'); },
    () => { console.log('[db] PostgreSQL probe failed; using in-memory store'); }
  );
} else {
  console.log('[db] no DATABASE_URL; using in-memory store');
}

async function query(sql, params = []) {
  if (dbKind === 'postgres') {
    const { rows } = await db.query(sql, params);
    return rows;
  }
  return null; 
}

app.get('/api/db', async (_req, res) => {
  try {
    if (dbKind === 'postgres') {
      const rows = await query('SELECT NOW() AS now, VERSION() AS version');
      res.json({ ok: true, db: 'postgres', data: rows[0] });
    } else {
      res.json({ ok: true, db: 'memory', data: { now: new Date().toISOString(), note: 'PostgreSQL unreachable; using in-memory store' } });
    }
  } catch (err) {
    res.json({ ok: false, db: dbKind, error: err.message });
  }
});

app.get('/api/campaigns', async (_req, res) => {
  try {
    const rows = await query('SELECT * FROM campaigns ORDER BY id DESC LIMIT 50');
    if (rows !== null) {
      res.json({ ok: true, db: 'postgres', data: rows });
      return;
    }
    res.json({ ok: true, db: 'memory', data: memory.campaigns });
  } catch (err) {
    res.status(500).json({ ok: false, db: dbKind, error: err.message });
  }
});

app.post('/api/campaigns', express.json(), async (req, res) => {
  try {
    const { name, description } = req.body;
    if (dbKind === 'postgres') {
      const { rows } = await db.query(
        'INSERT INTO campaigns (name, description) VALUES ($1, $2) RETURNING *',
        [name, description]
      );
      res.status(201).json({ ok: true, db: 'postgres', data: rows[0] });
      return;
    }
    const campaign = { id: memory.nextCampaignId++, name, description, created_at: new Date().toISOString() };
    memory.campaigns.push(campaign);
    res.status(201).json({ ok: true, db: 'memory', data: campaign });
  } catch (err) {
    res.status(500).json({ ok: false, db: dbKind, error: err.message });
  }
});

app.get('/api/pcs', async (_req, res) => {
  try {
    const rows = await query('SELECT * FROM player_characters ORDER BY id DESC LIMIT 50');
    if (rows !== null) {
      res.json({ ok: true, db: 'postgres', data: rows });
      return;
    }
    res.json({ ok: true, db: 'memory', data: memory.pcs });
  } catch (err) {
    res.status(500).json({ ok: false, db: dbKind, error: err.message });
  }
});

app.use(express.static('views'));
app.use('/styles', express.static('styles'));
app.use('/js', express.static('js'));
app.use('/partials', express.static('partials'));

app.listen(port, () => {
  console.log(`\nServer is running on http://localhost:${port}\nDB mode: ${dbKind}\nPress Ctrl+C (or Cmd+C) to stop the server.\n`);
});
