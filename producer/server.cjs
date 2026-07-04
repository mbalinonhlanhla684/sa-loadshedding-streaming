// server.cjs
// Small backend that fetches real load-shedding data from EskomSePush
// and exposes it to our React dashboard, keeping the API token private.
//
// Run with: node server.cjs
// Requires: npm install express cors dotenv node-fetch@2

require('dotenv').config({ path: '../.env' });
const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');

const app = express();
app.use(cors());

const PORT = 4000;
const TOKEN = process.env.ESKOMSEPUSH_TOKEN;

if (!TOKEN) {
  console.error('ERROR: ESKOMSEPUSH_TOKEN not found. Check your .env file at the project root.');
  process.exit(1);
}

// Cache results so we don't burn through the daily 50-call quota.
// EskomSePush free tier: 50 calls/day, so we cache for 30 minutes.
let cache = { data: null, timestamp: 0 };
const CACHE_DURATION_MS = 30 * 60 * 1000; // 30 minutes

// A few real South African area IDs across provinces, found via the
// areas_search endpoint. These represent specific suburbs, since
// EskomSePush's free tier provides suburb-level data, not full
// province-level data — see README for details.
const AREAS = [
  { name: 'Fourways, Gauteng', id: 'za_gt_jhb_fourways_4pef', province: 'Gauteng' },
  { name: 'Sandton, Gauteng', id: 'za_gt_jhb_sandton', province: 'Gauteng' },
];

app.get('/api/status', async (req, res) => {
  try {
    const now = Date.now();
    if (cache.data && (now - cache.timestamp) < CACHE_DURATION_MS) {
      return res.json({ ...cache.data, cached: true });
    }

    const response = await fetch('https://developer.sepush.co.za/business/3.1/status', {
      headers: { token: TOKEN }
    });

    if (!response.ok) {
      const text = await response.text();
      return res.status(response.status).json({ error: 'EskomSePush API error', details: text });
    }

    const data = await response.json();
    cache = { data, timestamp: now };
    res.json({ ...data, cached: false });
  } catch (err) {
    console.error('Error fetching status:', err.message);
    res.status(500).json({ error: 'Failed to fetch load-shedding status', details: err.message });
  }
});

app.get('/api/area/:areaId', async (req, res) => {
  try {
    const { areaId } = req.params;
    const response = await fetch(`https://developer.sepush.co.za/business/3.1/area?id=${areaId}`, {
      headers: { token: TOKEN }
    });

    if (!response.ok) {
      const text = await response.text();
      return res.status(response.status).json({ error: 'EskomSePush API error', details: text });
    }

    const data = await response.json();
    res.json(data);
  } catch (err) {
    console.error('Error fetching area:', err.message);
    res.status(500).json({ error: 'Failed to fetch area data', details: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Backend server running at http://localhost:${PORT}`);
  console.log(`Try it: http://localhost:${PORT}/api/status`);
});