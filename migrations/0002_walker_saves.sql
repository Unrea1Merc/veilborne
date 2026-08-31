create table if not exists walker_saves (
  user_id text primary key,
  payload text not null,
  updated_at timestamptz not null default now()
);
