-- minted database schema. Paste into the Supabase SQL editor (or psql) once.
create extension if not exists pgcrypto;

create table if not exists creators (
  id                 uuid primary key default gen_random_uuid(),
  x_user_id          text not null unique,          -- permanent X id; handles can change
  handle             text not null,
  display_name       text not null,
  bio                text not null default '',
  avatar_url         text,
  followers          integer not null default 0,
  x_created_at       timestamptz,
  handle_changed_at  timestamptz,
  status             text not null default 'active' check (status in ('active','unavailable','delisted')),
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);
create index if not exists creators_handle_idx on creators (lower(handle));
-- X Premium status: 'blue' (Premium), 'business', 'government' or 'none'
alter table creators add column if not exists verified_type text not null default 'none';

create table if not exists wallet_nonces (
  id          uuid primary key default gen_random_uuid(),
  creator_id  uuid not null references creators(id) on delete cascade,
  wallet      text not null,
  message     text not null,
  expires_at  timestamptz not null,
  used_at     timestamptz,
  created_at  timestamptz not null default now()
);
create index if not exists wallet_nonces_lookup_idx on wallet_nonces (creator_id, wallet, created_at desc);

create table if not exists wallet_links (
  creator_id   uuid primary key references creators(id) on delete cascade,  -- one wallet per creator
  wallet       text not null unique,                                        -- one creator per wallet
  message      text not null,
  signature    text not null,
  verified_at  timestamptz not null default now()
);

create table if not exists launches (
  id                       uuid primary key default gen_random_uuid(),
  creator_id               uuid not null references creators(id) on delete cascade,
  wallet                   text not null,
  mint                     text not null unique,
  name                     text not null,
  symbol                   text not null,
  description              text not null,
  image_uri                text not null,
  metadata_uri             text not null,
  initial_buy_lamports     bigint not null default 0,
  blockhash                text not null,
  last_valid_block_height  bigint not null,
  tx_signature             text unique,
  state                    text not null default 'built' check (state in ('built','confirmed','expired','failed')),
  error                    text,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now()
);
create index if not exists launches_creator_idx on launches (creator_id, created_at desc);

create table if not exists tokens (
  mint                  text primary key,
  creator_id            uuid not null unique references creators(id) on delete cascade,  -- one coin per X account
  creator_wallet        text not null unique,                                            -- one coin per wallet
  launch_id             uuid references launches(id),
  name                  text not null,
  symbol                text not null,
  image_uri             text not null,
  initial_buy_lamports  bigint not null default 0,
  followers_at_launch   integer not null default 0,
  market_cap_sol        numeric,
  market_cap_usd        numeric,
  creator_balance       numeric,
  graduated             boolean not null default false,
  delisted              boolean not null default false,
  launched_at           timestamptz not null default now(),
  verified_at           timestamptz not null default now(),
  stats_updated_at      timestamptz
);
create index if not exists tokens_launched_idx on tokens (launched_at desc);
create index if not exists tokens_mcap_idx on tokens (market_cap_usd desc nulls last);
