// Pure settlement plan computation.
// userBalances: { userId: number } where positive = others owe them, negative = they owe others (or supply absolute values with positive meaning net receive)

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
    // round to 4 decimals for currency amounts
    const payRounded = Number(pay.toFixed(4));
    settlements.push({ from_user_id: d.user_id, to_user_id: c.user_id, amount: payRounded });
    d.amount = Number((d.amount - pay).toFixed(8));
    c.amount = Number((c.amount - pay).toFixed(8));
    if (d.amount <= 1e-8) i++; if (c.amount <= 1e-8) j++;
  }
  return settlements;
}

module.exports = { computeSettlementPlan };
