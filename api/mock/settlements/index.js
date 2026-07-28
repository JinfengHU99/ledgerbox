const fs = require('fs').promises;
const path = require('path');
const DATA = path.join(__dirname,'../../../mock_data/demo.json');
const { computeSettlementPlan } = require('../../../lib/settlement');

// Simple mock settlement: compute net balances from transactions (same-currency demo)
module.exports = async (req,res)=>{
  try{
    if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' });
    const { ledger_id, since, until } = req.body;
    if (!ledger_id) return res.status(400).json({ error: 'ledger_id required' });
    const j = JSON.parse(await fs.readFile(DATA,'utf8'));
    const txns = j.transactions[ledger_id] || [];
    const tb = {};
    for (const t of txns) {
      // filter by time if provided
      if (since && new Date(t.occurred_at) < new Date(since)) continue;
      if (until && new Date(t.occurred_at) > new Date(until)) continue;
      for (const it of t.items || []){
        const uid = it.user_id || 'unknown';
        tb[uid] = tb[uid] || 0;
        if (it.role === 'payer') tb[uid] += Number(it.amount);
        else if (it.role === 'beneficiary') tb[uid] -= Number(it.amount);
      }
    }
    const l = (j.ledgers || []).find(l=>l.id===ledger_id) || { base_currency: 'USD' };
    const plan = computeSettlementPlan(tb).map(p=>({ ...p, currency: l.base_currency || 'USD' }));
    res.json({ plan, rawBalances: tb });
  }catch(e){console.error(e);res.status(500).json({error:e.message})}
};
