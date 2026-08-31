create table if not exists walker_profiles (
  user_id text primary key,
  name text not null,
  level integer not null default 1,
  lat double precision,
  lng double precision,
  updated_at timestamptz not null default now()
);

create table if not exists friendships (
  from_id text not null,
  to_id text not null,
  from_name text not null,
  to_name text not null,
  status text not null,
  created_at timestamptz not null default now(),
  primary key (from_id, to_id)
);
create index if not exists friendships_to_idx on friendships (to_id, status);

create table if not exists blocks (
  user_id text not null,
  blocked_id text not null,
  created_at timestamptz not null default now(),
  primary key (user_id, blocked_id)
);

create table if not exists messages (
  id serial primary key,
  from_id text not null,
  to_id text not null,
  body text not null,
  created_at timestamptz not null default now()
);
create index if not exists messages_from_idx on messages (from_id, id);
create index if not exists messages_to_idx on messages (to_id, id);

create table if not exists parcels (
  id serial primary key,
  from_id text not null,
  to_id text not null,
  from_name text not null,
  to_name text not null,
  kind text not null,
  payload text not null,
  status text not null,
  created_at timestamptz not null default now()
);
create index if not exists parcels_to_idx on parcels (to_id, status);

insert into walker_profiles (user_id, name, level, lat, lng)
values
  ('npc:sera-vale', 'Sera Vale', 12, 35.2271, -80.8431),
  ('npc:brann-oak', 'Brann Oak', 9, 35.229, -80.84),
  ('npc:lysa-thorn', 'Lysa Thorn', 14, 35.22, -80.85),
  ('npc:calder-rune', 'Calder Rune', 11, 35.231, -80.838),
  ('npc:mirin-ash', 'Mirin Ash', 8, 35.224, -80.847),
  ('npc:tov-ember', 'Tov Ember', 10, 35.218, -80.841),
  ('npc:jace-quill', 'Jace Quill', 7, 35.233, -80.849),
  ('npc:orla-finn', 'Orla Finn', 13, 35.226, -80.836)
on conflict (user_id) do nothing;
