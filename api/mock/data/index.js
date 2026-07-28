const fs = require('fs').promises;
const path = require('path');
const DATA = path.join(__dirname,'../../../mock_data/demo.json');
module.exports = async (req,res)=>{
  try{
    const q = req.query;
    const j = JSON.parse(await fs.readFile(DATA,'utf8'));
    if (q.kind === 'meta' && q.ledger_id) {
      return res.json({ participants: j.participants[q.ledger_id] || [], accounts: j.accounts[q.ledger_id] || [] });
    }
    res.json({});
  }catch(e){console.error(e);res.status(500).json({error:e.message})}
};
