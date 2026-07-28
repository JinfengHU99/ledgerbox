function requireFields(obj, fields) {
  const missing = [];
  for (const f of fields) {
    if (obj[f] === undefined || obj[f] === null || (typeof obj[f] === 'string' && obj[f].trim()==='')) missing.push(f);
  }
  if (missing.length) throw new Error('missing_fields: ' + missing.join(','));
}

function isValidCurrency(c) {
  return typeof c === 'string' && /^[A-Z]{3}$/i.test(c);
}

module.exports = { requireFields, isValidCurrency };
