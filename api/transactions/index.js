const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.SUPABASE_DB_URL, max: process.env.SUPABASE_DB_POOL_MAX || 5 });

// Simple REST handler: POST to create transaction + items, GET to list by ledger
module.exports = async (req, res) => {
  try {
    if (req.method === 'POST') {
      const t = req.body;
      const { requireFields, isValidCurrency } = require('../../lib/validate');
      try {
        requireFields(t, ['ledger_id','kind','total_amount','currency','items']);
        if (!Array.isArray(t.items) || t.items.length===0) throw new Error('items must be non-empty array');
        if (!isValidCurrency(t.currency)) throw new Error('invalid currency');
      } catch (e) {
        return res.status(400).json({ error: e.message });
      }
      await pool.query('BEGIN');
      const insertTxn = await pool.query(`INSERT INTO transactions (ledger_id, account_id, actor_user_id, kind, total_amount, currency, note, occurred_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id`, [t.ledger_id, t.account_id, t.actor_user_id, t.kind, t.total_amount, t.currency, t.note || null, t.occurred_at || new Date()]);
      const txnId = insertTxn.rows[0].id;
      for (const it of t.items || []) {
        // basic validation for each item
        if (!it.user_id || !it.role || it.amount===undefined) { await pool.query('ROLLBACK').catch(()=>{}); return res.status(400).json({ error: 'item missing fields' }); }
        await pool.query(`INSERT INTO transaction_items (transaction_id, user_id, role, amount, currency, note) VALUES ($1,$2,$3,$4,$5,$6)`, [txnId, it.user_id, it.role, it.amount, it.currency || t.currency, it.note || null]);
      }
      await pool.query('COMMIT');
      return res.status(201).json({ id: txnId });
    }

    // GET ?ledger_id=...&since=...&until=...
    if (req.method === 'GET') {
      const { ledger_id, since, until } = req.query;
      if (!ledger_id) return res.status(400).json({ error: 'ledger_id required' });
      const q = `SELECT t.*, json_agg(json_build_object('id',ti.id,'user_id',ti.user_id,'role',ti.role,'amount',ti.amount,'currency',ti.currency)) AS items FROM transactions t LEFT JOIN transaction_items ti ON ti.transaction_id = t.id WHERE t.ledger_id = $1 ${since ? "AND t.occurred_at >= $2" : ''} ${until ? (since ? "AND t.occurred_at <= $3" : "AND t.occurred_at <= $2") : ''} GROUP BY t.id ORDER BY t.occurred_at DESC LIMIT 200`;
      const params = [ledger_id];
      if (since) params.push(since);
      if (until) params.push(until);
      const r = await pool.query(q, params);
      return res.json(r.rows);
    }

    res.status(405).json({ error: 'method_not_allowed' });
  } catch (err) {
    await pool.query('ROLLBACK').catch(()=>{});
    console.error(err);
    res.status(500).json({ error: 'internal', detail: err.message });
  }
};
