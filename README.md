# LedgerBox

Multi-ledger, multi-currency bookkeeping demo (WeChat 小程序 front-end + Node mock backend / Supabase-ready schema).

Quick overview
- Ledgers: personal / couple / family
- Multi-currency support with cached exchange rates
- Features: transactions (split items), accounts, goals, AA settlement algorithm

Quick start (dev)
1. Install deps: npm install
2. Start dev server: node server/dev_server.js
   - Serves mock APIs at http://localhost:3000/api/mock/*
   - Serves download at http://localhost:3000/download/
3. Run tests: npm test
4. Mini-program:
   - Unzip dist/ledgerbox-wxapp.zip or open client/wxapp in WeChat DevTools
   - Set request base to http://localhost:3000 and run/preview

Files of interest
- db/migrations/001_init.sql  — Postgres schema for production (Supabase)
- api/                       — serverless / API handlers (PG-backed and mock)
- server/dev_server.js       — local express wrapper to host api/* endpoints
- client/wxapp/              — WeChat 小程序 starter
- lib/settlement.js          — pure AA settlement algorithm (unit-tested)
- mock_data/demo.json        — mock dataset used by mock APIs

Testing
- Lightweight tests: npm test runs scripts/run_tests.js which checks settlement logic.

Deploy
- Recommended stack: Supabase (Postgres, auth) + Vercel (serverless) for API
- Replace mock handlers with PG-backed handlers in api/ and configure SUPABASE_DB_URL

Notes
- This repo is a starter scaffold. Security, auth, validations, and production hardening are minimal and must be added before public deployment.

Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>

