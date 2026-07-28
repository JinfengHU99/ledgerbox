const QRCode = require('qrcode');
const fs = require('fs');
const url = process.argv[2] || 'http://localhost:3000/download/ledgerbox-wxapp.zip';
const out = process.argv[3] || 'dist/preview-zip-qr.png';

QRCode.toFile(out, url, { type: 'png', width: 400 }, function (err) {
  if (err) return console.error('QR gen error', err);
  console.log('QR generated at', out, 'for', url);
});
