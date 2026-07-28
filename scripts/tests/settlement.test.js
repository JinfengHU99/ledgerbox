const assert = require('assert');
const { computeSettlementPlan } = require('../../lib/settlement');

function testExplicitBalances() {
  // A should receive 40, B owes 10, C owes 30 => B pays A 10, C pays A 30
  const balances = { A: 40, B: -10, C: -30 };
  const plan = computeSettlementPlan(balances);
  assert.strictEqual(plan.length, 2, 'should produce two settlement items');
  // amounts sum
  const total = plan.reduce((s,it)=>s+it.amount,0);
  assert.strictEqual(total, 40);
  // check exact matches
  const p1 = plan.find(p=>p.from_user_id==='B');
  const p2 = plan.find(p=>p.from_user_id==='C');
  assert(p1 && p2, 'both debtors should appear');
  assert(p1.amount === 10);
  assert(p2.amount === 30);
}

function testRounding() {
  // ensure rounding doesn't leave tiny residues
  const balances = { A: 0.3333, B: -0.1111, C: -0.2222 };
  const plan = computeSettlementPlan(balances);
  const total = plan.reduce((s,it)=>s+it.amount,0);
  // totals rounded to 4 decimals should equal A (within small epsilon)
  if (Math.abs(total - 0.3333) >= 0.0002) throw new Error('rounding error too large');
}

function runAll() {
  testExplicitBalances();
  testRounding();
}

module.exports = { runAll };
