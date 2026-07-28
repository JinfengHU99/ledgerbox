App({
  onLaunch() {
    this.globalData = { apiBase: process.env && process.env.API_BASE || 'http://localhost:3000' };
  }
});
