(function(){
  // Use GitHub raw demo JSON so webapp can be served statically via GitHub Pages
  const RAW_JSON = 'https://raw.githubusercontent.com/JinfengHU99/ledgerbox/main/mock_data/demo.json';
  const apiRoot = null;
  const el = id => document.getElementById(id);
  const ledgerListEl = el('ledgerList');
  const ledgerPanel = el('ledgerPanel');
  const ledgerName = el('ledgerName');
  const participantsEl = el('participants');
  const accountsEl = el('accounts');
  const txListEl = el('txList');
  const planEl = el('plan');
  const backBtn = el('backBtn');
  const createBtn = el('createBtn');
  const noteInput = el('note');
  const amountInput = el('amount');
  const settleBtn = el('settleBtn');

  let currentLedger = null;

  async function fetchLedgers(){
    const r = await fetch(RAW_JSON);
    const j = await r.json();
    const data = j.ledgers || [];
    ledgerListEl.innerHTML = '';
    data.forEach(l=>{
      const li = document.createElement('li');
      const a = document.createElement('a'); a.href='#'; a.textContent = `${l.name} (${l.type})`; a.onclick = (e)=>{ e.preventDefault(); openLedger(l.id); };
      li.appendChild(a); ledgerListEl.appendChild(li);
    });
  }

  async function openLedger(id){
    currentLedger = id;
    // fetch ledger meta and transactions from raw demo.json
    const r = await fetch(RAW_JSON);
    const j = await r.json();
    const ledger = (j.ledgers||[]).find(x=>x.id===id) || {name:id};
    ledgerName.textContent = ledger.name;
    participantsEl.textContent = (j.participants && j.participants[id] || []).map(p=>p.name).join(', ');
    accountsEl.textContent = (j.accounts && j.accounts[id] || []).map(a=>`${a.name}:${a.current_balance}${a.currency}`).join(' | ');
    const txs = (j.transactions && j.transactions[id]) || [];
    txListEl.innerHTML = '';
    txs.forEach(t=>{ const li=document.createElement('li'); li.textContent = `${t.occurred_at} - ${t.note} - ${t.total_amount} ${t.currency}`; txListEl.appendChild(li); });
    ledgerPanel.classList.remove('hidden');
    document.getElementById('ledgers').classList.add('hidden');
  }

  backBtn.onclick = ()=>{ ledgerPanel.classList.add('hidden'); document.getElementById('ledgers').classList.remove('hidden'); };

  createBtn.onclick = async ()=>{
    const note = noteInput.value; const amount = Number(amountInput.value||0);
    if (!currentLedger) return alert('请选择账本');
    const body = { ledger_id: currentLedger, total_amount: amount, currency: 'USD', items: [ { user_id: (window.__demo_first_user || 'u1'), role: 'payer', amount } ], note };
    const r = await fetch(apiRoot.replace('/api/mock','') + `/api/mock/ledgers/${currentLedger}/transactions`, { method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify(body) });
    if (r.status===201){ alert('已创建'); openLedger(currentLedger); } else { const t = await r.text(); alert('创建失败: '+t); }
  };

  settleBtn.onclick = async ()=>{
    if (!currentLedger) return alert('请选择账本');
    const since = new Date(Date.now()-30*24*3600*1000).toISOString();
    const until = new Date().toISOString();
    const r = await fetch(apiRoot.replace('/api/mock','') + '/api/mock/settlements', { method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify({ ledger_id: currentLedger, since, until })});
    const j = await r.json();
    planEl.innerHTML = '';
    (j.plan||[]).forEach(p=>{ const li=document.createElement('li'); li.textContent = `${p.from_user_id} → ${p.to_user_id} : ${p.amount} ${p.currency}`; planEl.appendChild(li); });
  };

  // init
  fetchLedgers().catch(e=>{ console.error(e); ledgerListEl.innerHTML = '<li>无法加载账本</li>'; });
})();
