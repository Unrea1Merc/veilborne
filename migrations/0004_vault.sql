create table if not exists vault_orders (
  id serial primary key,
  user_id text not null,
  sku text not null,
  usd_cents integer not null,
  gold integer not null default 0,
  veilmarks integer not null default 0,
  revives integer not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists vault_orders_user_idx on vault_orders (user_id, created_at desc);
