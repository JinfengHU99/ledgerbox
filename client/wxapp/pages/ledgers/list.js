Page({
  data: { ledgers: [] },
  onLoad() { this.fetch(); },
  fetch() {
    wx.request({ url: (getApp().globalData && getApp().globalData.apiBase||'http://localhost:3000') + '/api/mock/ledgers', success: (r)=>{ this.setData({ ledgers: r.data }); } });
  },
  refresh() { this.fetch(); },
  open(e) { const id = e.currentTarget.dataset.id; wx.navigateTo({ url: `/pages/ledger/ledger?id=${id}` }); }
});
