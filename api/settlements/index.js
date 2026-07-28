const fetch = require('node-fetch');
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.SUPABASE_DB_URL, max: process.env.SUPABASE_DB_POOL_MAX || 5 });

// POST { ledger_id, since, until }
// Returns settlement plan: [{from_user_id,to_user_id,amount,currency}]
module.exports = async (req, res) => {
  try {
    if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' });
    const { ledger_id, since, until } = req.body;
    // validate required
    const { requireFields } = require('../../lib/validate');
    try { requireFields(req.body, ['ledger_id','since','until']); } catch (e) { return res.status(400).json({ error: e.message }); }


    // 1) fetch ledger base currency
    const ledgerRes = await pool.query('SELECT base_currency FROM ledgers WHERE id=$1', [ledger_id]);
    if (ledgerRes.rowCount === 0) return res.status(404).json({ error: 'ledger_not_found' });
    const baseCurrency = ledgerRes.rows[0].base_currency.toUpperCase();

    // 2) fetch transaction items within range
    const q = `SELECT t.id AS txn_id, t.currency AS txn_currency, ti.user_id, ti.role, ti.amount, ti.currency AS item_currency, t.kind FROM transactions t JOIN transaction_items ti ON ti.transaction_id = t.id WHERE t.ledger_id = $1 AND t.occurred_at >= $2::timestamptz AND t.occurred_at <= $3::timestamptz`;
    const itemsRes = await pool.query(q, [ledger_id, since, until]);
    const items = itemsRes.rows;

    // 3) compute per-user paid and share in baseCurrency
    const userBalances = {}; // positive means others owe them

    async function convert(amount, fromCurr, toCurr) {
      if (!fromCurr || fromCurr.toUpperCase() === toCurr.toUpperCase()) return Number(amount);
      // try DB cache
      const db = await pool.query('SELECT rate FROM exchange_rates WHERE base_currency=$1 AND target_currency=$2', [fromCurr.toUpperCase(), toCurr.toUpperCase()]);
      if (db.rowCount > 0) return Number(amount) * Number(db.rows[0].rate);
      // fallback to external API
      const api = (process.env.EXCHANGE_API_URL || 'https://api.exchangerate.host/latest') + `?base=${encodeURIComponent(fromCurr)}&symbols=${encodeURIComponent(toCurr)}`;
      const r = await fetch(api);
      const j = await r.json();
      const rate = j.rates && j.rates[toCurr.toUpperCase()];
      if (!rate) throw new Error(`rate not found ${fromCurr}->${toCurr}`);
      // upsert cache
      await pool.query(`INSERT INTO exchange_rates (base_currency, target_currency, rate, source, fetched_at) VALUES ($1,$2,$3,$4,now()) ON CONFLICT (base_currency,target_currency) DO UPDATE SET rate=EXCLUDED.rate, fetched_at=EXCLUDED.fetched_at`, [fromCurr.toUpperCase(), toCurr.toUpperCase(), rate, 'exchangerate.host']);
      return Number(amount) * Number(rate);
    }

    // Aggregate: treat role 'payer' as paid, 'beneficiary' as share
    for (const it of items) {
      const uid = it.user_id || 'unknown';
      const role = it.role;
      const amt = Number(it.amount);
      const curr = (it.item_currency || it.txn_currency || baseCurrency).toUpperCase();
      const convAmt = await convert(amt, curr, baseCurrency);
      userBalances[uid] = userBalances[uid] || 0;
      if (role === 'payer') userBalances[uid] += convAmt;
      else if (role === 'beneficiary') userBalances[uid] -= convAmt;
    }

    // Use pure compute function to create plan
    const { computeSettlementPlan } = require('../../lib/settlement');
    const settlementsRaw = computeSettlementPlan(userBalances);
    // attach currency
    const settlements = settlementsRaw.map(s => ({ ...s, currency: baseCurrency }));

    // Persist settlement snapshot
    const ins = await pool.query(`INSERT INTO settlements (ledger_id, since, until, created_at, metadata) VALUES ($1,$2,$3,now(), $4) RETURNING id`, [ledger_id, since, until, JSON.stringify({ generated_at: new Date().toISOString() })]);
    const settlementId = ins.rows[0].id;
    for (const s of settlements) {
      await pool.query(`INSERT INTO settlement_items (settlement_id, from_user_id, to_user_id, amount, currency) VALUES ($1,$2,$3,$4,$5)`, [settlementId, s.from_user_id, s.to_user_id, s.amount, s.currency]);
    }

    res.json({ settlement_id: settlementId, plan: settlements });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'internal', detail: err.message });
  }
};
