-- Playting onboarding profile table
-- 이미 이 테이블을 생성한 적이 있다면 아래 한 줄만 추가로 실행하면 된다:
-- alter table onboarding_profiles add column if not exists preferred_people text[] not null default '{}';
create table if not exists onboarding_profiles (
  id uuid primary key default gen_random_uuid(),
  client_id text unique not null,
  age smallint not null,
  subscribed_ott text[] not null default '{}',
  preferred_genres text[] not null default '{}',
  preferred_people text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table onboarding_profiles enable row level security;

-- MVP 단계에서는 Supabase Auth 없이 브라우저에 저장된 client_id로만 사용자를 구분한다.
-- client_id는 사용자가 조작 가능한 값이므로, 실제 로그인(Auth) 도입 전까지는
-- 이 테이블에 민감 정보를 저장하지 않아야 한다.
create policy "anon can insert own profile"
  on onboarding_profiles for insert
  to anon
  with check (true);

create policy "anon can update own profile"
  on onboarding_profiles for update
  to anon
  using (true);

create policy "anon can read own profile"
  on onboarding_profiles for select
  to anon
  using (true);
