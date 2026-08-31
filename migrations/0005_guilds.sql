create table if not exists guilds (
  code text primary key,
  name text not null,
  city_id text not null,
  motd text not null default '',
  created_by text not null,
  created_at timestamptz not null default now()
);

create table if not exists guild_members (
  code text not null,
  user_id text not null,
  name text not null,
  rank text not null,
  joined_at timestamptz not null default now(),
  primary key (code, user_id)
);
create index if not exists guild_members_user_idx on guild_members (user_id);
