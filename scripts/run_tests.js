// Simple test runner that requires each test file and executes exported runAll()
const path = require('path');
const tests = [
  './tests/settlement.test.js'
];

(async ()=>{
  try {
    for (const t of tests) {
      const mod = require(path.join(__dirname, t));
      if (mod.runAll) {
        mod.runAll();
        console.log(`OK: ${t}`);
      } else {
        console.warn(`No runAll exported from ${t}`);
      }
    }
    console.log('All tests passed');
    process.exit(0);
  } catch (e) {
    console.error('Test failed:', e && e.stack ? e.stack : e);
    process.exit(1);
  }
})();
