const fs = require('fs').promises;
const path = require('path');
const DATA = path.join(__dirname,'../../../../../mock_data/demo.json');

module.exports = async (req,res)=>{
  try{
    const ledgerId = req.query.id || (req.method==='POST' && req.body && req.body.ledger_id);
    const j = JSON.parse(await fs.readFile(DATA,'utf8'));
    if (req.method === 'GET'){
      return res.json(j.transactions[ledgerId] || []);
    }
    if (req.method === 'POST'){
      const t = req.body;
      const newId = `t-${Date.now()}`;
      const newTxn = {
        id: newId,
        account_id: t.account_id|| (j.accounts[ledgerId] && j.accounts[ledgerId][0] && j.accounts[ledgerId][0].id),
        actor_user_id: t.actor_user_id||null,
        kind: t.kind||'expense',
        total_amount: t.total_amount||0,
        currency: t.currency||'USD',
        note: t.note||'',
        occurred_at: t.occurred_at||new Date().toISOString(),
        items: (t.items||[]).map((it,idx)=>({ id:`ti-${Date.now()}-${idx}`, user_id: it.user_id, role: it.role, amount: it.amount, currency: it.currency||t.currency }))
      };
      j.transactions[ledgerId] = j.transactions[ledgerId] || [];
      j.transactions[ledgerId].unshift(newTxn);
      await fs.writeFile(DATA, JSON.stringify(j,null,2),'utf8');
      return res.status(201).json(newTxn);
    }
    res.status(405).end();
  }catch(e){console.error(e);res.status(500).json({error:e.message})}
};
