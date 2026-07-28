Page({
  data: {},
  openLedger(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({ url: `/pages/ledger/ledger?id=${id}` });
  },
  createLedger() {
    wx.showToast({ title: '示例：请在后台创建 ledger 并刷新', icon: 'none' });
  }
});
