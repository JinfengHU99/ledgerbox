Page({
  data: { plan: [], transactions: [], participants: [], accounts: [], ledger: {}, showCreate: false, note: '', amount: '' },
  onLoad(opts) {
    this.ledger_id = opts.id;
    this.fetchAll();
  },
  fetchAll() {
    const base = (getApp().globalData && getApp().globalData.apiBase) || 'http://localhost:3000';
    wx.request({ url: `${base}/api/mock/ledgers`, success: (r)=>{
      const l = (r.data||[]).find(x=>x.id===this.ledger_id) || { name: this.ledger_id, base_currency: 'USD' };
      this.setData({ ledger: l });
    }});
    // fetch raw demo data and extract things (works around mock transactions handler)
    wx.request({ url: `${base}/api/mock/raw`, success: (r)=>{ const d = r.data||{}; this.setData({ transactions: (d.transactions && d.transactions[this.ledger_id]) || [], participants: d.participants && d.participants[this.ledger_id] || [], accounts: d.accounts && d.accounts[this.ledger_id] || [] }); } });
  },
  openCreate() { this.setData({ showCreate: true }); },
  cancelCreate() { this.setData({ showCreate: false }); },
  onNote(e) { this.setData({ note: e.detail.value }); },
  onAmount(e) { this.setData({ amount: e.detail.value }); },
  submitTxn() {
    const base = (getApp().globalData && getApp().globalData.apiBase) || 'http://localhost:3000';
    const body = { ledger_id: this.ledger_id, kind: 'expense', total_amount: Number(this.data.amount||0), currency: this.data.ledger.base_currency||'USD', note: this.data.note, items: [ { user_id: this.data.participants[0] && this.data.participants[0].user_id || 'u1', role: 'payer', amount: Number(this.data.amount||0) } ] };
    wx.request({ url: `${base}/api/mock/ledgers/${this.ledger_id}/transactions`, method: 'POST', data: body, header: {'content-type':'application/json'}, success: (r)=>{ wx.showToast({ title: '已创建' }); this.setData({ showCreate:false }); this.fetchAll(); } });
  },
  runSettlement() {
    wx.showLoading({ title: '计算中' });
    const since = new Date(Date.now()-30*24*3600*1000).toISOString();
    const until = new Date().toISOString();
    const base = (getApp().globalData && getApp().globalData.apiBase) || 'http://localhost:3000';
    wx.request({ url: `${base}/api/mock/settlements`, method: 'POST', data: { ledger_id: this.ledger_id, since, until }, header: {'content-type':'application/json'}, success: (r)=>{ this.setData({ plan: r.data.plan || [], rawBalances: r.data.rawBalances }); }, complete: ()=>wx.hideLoading() });
  }
});
