-- 001_init.sql
-- Core schema for multi-ledger, multi-currency bookkeeping app

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Users
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT UNIQUE,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Ledgers (personal / couple / family)
CREATE TYPE ledger_type AS ENUM ('personal','couple','family');
CREATE TABLE ledgers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type ledger_type NOT NULL,
  base_currency CHAR(3) NOT NULL,
  owner_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Participants in a ledger
CREATE TABLE ledger_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ledger_id UUID REFERENCES ledgers(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  display_name TEXT,
  is_admin BOOLEAN DEFAULT FALSE,
  joined_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(ledger_id, user_id)
);

-- Accounts (cash, bank card, wechat, alipay, saving products)
CREATE TYPE account_type AS ENUM ('cash','bank_card','wechat','alipay','saving','other');
CREATE TABLE accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ledger_id UUID REFERENCES ledgers(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type account_type NOT NULL,
  currency CHAR(3) NOT NULL,
  provider JSONB, -- bank metadata or service info
  current_balance NUMERIC(20,4) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Transactions: single logical event (may have multiple split items)
CREATE TYPE txn_kind AS ENUM ('expense','income','transfer');
CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ledger_id UUID REFERENCES ledgers(id) ON DELETE CASCADE,
  account_id UUID REFERENCES accounts(id) ON DELETE SET NULL,
  actor_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  kind txn_kind NOT NULL,
  total_amount NUMERIC(20,4) NOT NULL,
  currency CHAR(3) NOT NULL,
  note TEXT,
  occurred_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Transaction items: how the txn is split among participants and payers
CREATE TYPE txn_role AS ENUM ('payer','beneficiary');
CREATE TABLE transaction_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id UUID REFERENCES transactions(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  role txn_role NOT NULL,
  amount NUMERIC(20,4) NOT NULL,
  currency CHAR(3) NOT NULL,
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Exchange rates cache
CREATE TABLE exchange_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  base_currency CHAR(3) NOT NULL,
  target_currency CHAR(3) NOT NULL,
  rate DOUBLE PRECISION NOT NULL,
  source TEXT,
  fetched_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(base_currency, target_currency)
);

-- Saving goals (per-user or shared when user_id IS NULL)
CREATE TABLE goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ledger_id UUID REFERENCES ledgers(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  target_amount NUMERIC(20,4) NOT NULL,
  currency CHAR(3) NOT NULL,
  current_amount NUMERIC(20,4) DEFAULT 0,
  due_date DATE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- AA settlements: snapshot between two dates
CREATE TABLE settlements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ledger_id UUID REFERENCES ledgers(id) ON DELETE CASCADE,
  since TIMESTAMPTZ NOT NULL,
  until TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  metadata JSONB
);

CREATE TABLE settlement_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  settlement_id UUID REFERENCES settlements(id) ON DELETE CASCADE,
  from_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  to_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  amount NUMERIC(20,4) NOT NULL,
  currency CHAR(3) NOT NULL,
  settled BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Useful indexes
CREATE INDEX ON transactions (ledger_id, occurred_at);
CREATE INDEX ON accounts (ledger_id);
CREATE INDEX ON ledger_participants (ledger_id);
CREATE INDEX ON exchange_rates (base_currency, target_currency);

-- Notes on usage:
-- - Keep transactions immutable; update account.current_balance via reliable background job or DB triggers if desired.
-- - transaction_items records who paid (role='payer') and who benefited (role='beneficiary'). Use these to compute AA settlements across currencies by converting via exchange_rates.

COMMIT;
