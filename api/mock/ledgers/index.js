const fs = require('fs').promises;
const path = require('path');
const DATA = path.join(__dirname,'../../../mock_data/demo.json');
module.exports = async (req,res)=>{
  try{
    const j = JSON.parse(await fs.readFile(DATA,'utf8'));
    res.json(j.ledgers || []);
  }catch(e){console.error(e);res.status(500).json({error:e.message})}
};
