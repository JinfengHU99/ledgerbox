/* Fetch latest major currency pairs and store to DB cache. Run via `npm run fetch-rates` */
const fetch = require('node-fetch');
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.SUPABASE_DB_URL, max: process.env.SUPABASE_DB_POOL_MAX || 5 });

(async ()=>{
  try {
    const base = 'USD';
    const targets = ['CNY','EUR','JPY','HKD','GBP'];
    const url = (process.env.EXCHANGE_API_URL || 'https://api.exchangerate.host/latest') + `?base=${base}&symbols=${targets.join(',')}`;
    const r = await fetch(url);
    const j = await r.json();
    const now = new Date().toISOString();
    for (const t of targets) {
      const rate = j.rates && j.rates[t];
      if (!rate) continue;
      await pool.query(`INSERT INTO exchange_rates (base_currency, target_currency, rate, source, fetched_at) VALUES ($1,$2,$3,$4,now()) ON CONFLICT (base_currency,target_currency) DO UPDATE SET rate=EXCLUDED.rate, fetched_at=EXCLUDED.fetched_at`, [base, t, rate, 'exchangerate.host']);
    }
    console.log('done');
    process.exit(0);
  } catch (e) {
    console.error(e); process.exit(1);
  }
})();
