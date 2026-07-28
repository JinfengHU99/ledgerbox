const fetch = require('node-fetch');
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.SUPABASE_DB_URL, max: process.env.SUPABASE_DB_POOL_MAX || 5 });

module.exports = async (req, res) => {
  try {
    const { base = 'USD', target } = req.query;
    if (!target) return res.status(400).json({ error: 'target query required' });

    // Try DB cache first
    const dbRes = await pool.query('SELECT rate, fetched_at FROM exchange_rates WHERE base_currency=$1 AND target_currency=$2', [base.toUpperCase(), target.toUpperCase()]);
    if (dbRes.rowCount > 0) {
      return res.json({ base: base.toUpperCase(), target: target.toUpperCase(), rate: dbRes.rows[0].rate, source: 'db_cache', fetched_at: dbRes.rows[0].fetched_at });
    }

    // Fetch from external API
    const apiUrl = (process.env.EXCHANGE_API_URL || 'https://api.exchangerate.host/latest') + `?base=${encodeURIComponent(base)}&symbols=${encodeURIComponent(target)}`;
    const r = await fetch(apiUrl);
    const j = await r.json();
    const rate = j.rates && j.rates[target.toUpperCase()];
    if (!rate) return res.status(500).json({ error: 'rate_not_found', detail: j });

    // Upsert to DB
    await pool.query(`INSERT INTO exchange_rates (base_currency, target_currency, rate, source, fetched_at) VALUES ($1,$2,$3,$4,now()) ON CONFLICT (base_currency,target_currency) DO UPDATE SET rate=EXCLUDED.rate, fetched_at=EXCLUDED.fetched_at`, [base.toUpperCase(), target.toUpperCase(), rate, 'exchangerate.host']);

    res.json({ base: base.toUpperCase(), target: target.toUpperCase(), rate, source: 'external' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'internal', detail: err.message });
  }
};
