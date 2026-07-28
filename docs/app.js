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
  let demoData = null; // will hold fetched demo JSON locally

  function computeSettlementPlan(userBalances) {
    const creditors = [];
    const debtors = [];
    for (const [uid, bal] of Object.entries(userBalances)) {
      const v = Number(bal);
      if (v > 0.0001) creditors.push({ user_id: uid, amount: Number(v.toFixed(8)) });
      else if (v < -0.0001) debtors.push({ user_id: uid, amount: Number((-v).toFixed(8)) });
    }
    creditors.sort((a,b)=>b.amount-a.amount);
    debtors.sort((a,b)=>b.amount-a.amount);
    const settlements = [];
    let i=0,j=0;
    while(i<debtors.length && j<creditors.length) {
      const d = debtors[i];
      const c = creditors[j];
      const pay = Math.min(d.amount, c.amount);
      const payRounded = Number(pay.toFixed(4));
      settlements.push({ from_user_id: d.user_id, to_user_id: c.user_id, amount: payRounded });
      d.amount = Number((d.amount - pay).toFixed(8));
      c.amount = Number((c.amount - pay).toFixed(8));
      if (d.amount <= 1e-8) i++; if (c.amount <= 1e-8) j++;
    }
    return settlements;
  }

  async function fetchLedgers(){
    const r = await fetch(RAW_JSON);
    const j = await r.json();
    demoData = j;
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
    // use demoData cached
    const j = demoData || (await (await fetch(RAW_JSON)).json());
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
    // Add to local demoData (non-persistent)
    if (!demoData) demoData = await (await fetch(RAW_JSON)).json();
    const ledgerTxs = demoData.transactions[currentLedger] = demoData.transactions[currentLedger] || [];
    const newTxn = { id: 'local-' + Date.now(), account_id: (demoData.accounts[currentLedger] && demoData.accounts[currentLedger][0] && demoData.accounts[currentLedger][0].id) || null, actor_user_id: null, kind: 'expense', total_amount: amount, currency: 'USD', note, occurred_at: new Date().toISOString(), items: [ { id: 'local-item-' + Date.now(), user_id: (demoData.participants[currentLedger] && demoData.participants[currentLedger][0] && demoData.participants[currentLedger][0].user_id) || 'u1', role: 'payer', amount, currency: 'USD' } ] };
    ledgerTxs.unshift(newTxn);
    openLedger(currentLedger);
    alert('已在本地添加（非持久化）');
  };

  settleBtn.onclick = async ()=>{
    if (!currentLedger) return alert('请选择账本');
    if (!demoData) demoData = await (await fetch(RAW_JSON)).json();
    const txs = demoData.transactions[currentLedger] || [];
    const balances = {};
    for (const t of txs){
      for (const it of (t.items||[])){
        const uid = it.user_id || 'unknown';
        balances[uid] = balances[uid] || 0;
        if (it.role === 'payer') balances[uid] += Number(it.amount);
        else if (it.role === 'beneficiary') balances[uid] -= Number(it.amount);
      }
    }
    const plan = computeSettlementPlan(balances).map(p=>({ ...p, currency: (demoData.ledgers.find(l=>l.id===currentLedger) || {}).base_currency || 'USD' }));
    planEl.innerHTML = '';
    plan.forEach(p=>{ const li=document.createElement('li'); li.textContent = `${p.from_user_id} → ${p.to_user_id} : ${p.amount} ${p.currency}`; planEl.appendChild(li); });
  };

  // init
  fetchLedgers().catch(e=>{ console.error(e); ledgerListEl.innerHTML = '<li>无法加载账本</li>'; });
})();
