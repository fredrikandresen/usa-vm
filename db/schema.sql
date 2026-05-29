create table if not exists companies (
  id text primary key,
  name text not null unique
);

create table if not exists users (
  id uuid primary key,
  email text not null unique,
  name text not null,
  company text not null references companies(id),
  is_admin boolean not null default false,
  auth_provider text not null default 'magic_link',
  created_at timestamptz not null default now()
);

create table if not exists teams (
  id text primary key,
  name text not null,
  group_name text not null,
  flag_url text
);

create table if not exists matches (
  id text primary key,
  home_team text not null references teams(id),
  away_team text not null references teams(id),
  kickoff_at timestamptz not null,
  group_name text,
  stage text not null,
  home_score int,
  away_score int,
  status text not null default 'scheduled'
);

create table if not exists match_goals (
  id bigserial primary key,
  match_id text not null references matches(id) on delete cascade,
  scorer text,
  assist text
);

create table if not exists predictions (
  id uuid primary key,
  user_id uuid not null references users(id) on delete cascade,
  match_id text not null references matches(id) on delete cascade,
  predicted_home int not null,
  predicted_away int not null,
  locked_at timestamptz not null,
  unique(user_id, match_id)
);

create table if not exists prediction_scorers (
  id bigserial primary key,
  prediction_id uuid not null references predictions(id) on delete cascade,
  team_side text not null,
  player_name text not null,
  is_assist boolean not null default false
);

create table if not exists group_predictions (
  id uuid primary key,
  user_id uuid not null references users(id) on delete cascade,
  group_name text not null,
  winner_team text not null references teams(id),
  runner_up_team text not null references teams(id),
  unique(user_id, group_name)
);

create table if not exists scores (
  id uuid primary key,
  user_id uuid not null references users(id) on delete cascade,
  match_id text references matches(id) on delete set null,
  points_awarded int not null,
  breakdown_json jsonb not null,
  created_at timestamptz not null default now()
);

create table if not exists magic_link_tokens (
  id bigserial primary key,
  email text not null,
  hashed_token text not null unique,
  created_at timestamptz not null default now(),
  used boolean not null default false
);

create table if not exists sessions (
  token text primary key,
  user_id uuid not null references users(id) on delete cascade,
  created_at timestamptz not null default now()
);
