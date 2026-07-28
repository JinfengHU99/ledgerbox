const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');

const app = express();
app.use(bodyParser.json());
app.use((req,res,next)=>{ res.setHeader('Access-Control-Allow-Origin','*'); res.setHeader('Access-Control-Allow-Headers','Content-Type'); if (req.method==='OPTIONS') return res.sendStatus(200); next(); });

const root = path.join(__dirname,'..');

function mountHandler(routePath, modulePath) {
  try {
    const mod = require(modulePath);
    app.all(routePath, async (req,res)=>{
      try { await mod(req,res); } catch(e){ console.error('handler error',modulePath,e); res.status(500).json({error:e.message}); }
    });
  } catch(e){ console.warn('no module', modulePath, e.message); }
}

// Mock endpoints
mountHandler('/api/mock/ledgers', path.join(root,'api/mock/ledgers/index.js'));
mountHandler('/api/mock/data', path.join(root,'api/mock/data/index.js'));
// dynamic transactions for ledger id
app.all('/api/mock/ledgers/:id/transactions', async (req,res)=>{
  req.query.id = req.params.id;
  try { const mod = require(path.join(root,'api/mock/ledgers/[id]/transactions/index.js')); await mod(req,res); } catch(e){ console.error(e); res.status(500).json({error:e.message}); }
});
mountHandler('/api/mock/settlements', path.join(root,'api/mock/settlements/index.js'));
mountHandler('/api/mock/raw', path.join(root,'api/mock/raw/index.js'));

// Mount some real API handlers if present (they may require DB; they'll error if DB not configured)
mountHandler('/api/exchange_rates', path.join(root,'api/exchange_rates/index.js'));
mountHandler('/api/transactions', path.join(root,'api/transactions/index.js'));
mountHandler('/api/settlements', path.join(root,'api/settlements/index.js'));

app.get('/', (req,res)=>res.send('LedgerBox dev server running'));

// serve distribution downloads
app.use('/download', express.static(path.join(root,'dist')));

const port = process.env.PORT || 3000;
app.listen(port, ()=>console.log(`dev server listening on ${port}`));
