-- ─────────────────────────────────────────────────────────────
-- 0002 · 관리자 계정 체계
--
-- 지금까지는 ADMIN_TOKEN 문자열 하나를 아는 사람이 곧 담당자였다.
-- 누가 무엇을 했는지 알 수 없고, 한 사람이 그만두면 토큰을 통째로 바꿔야 한다.
-- 실제 운영으로 가려면 사람마다 계정이 있어야 한다.
--
-- 설계
--   · 계정 자체는 Supabase Auth 가 갖고, 이 표는 '누가 관리자인가'만 기록한다.
--     비밀번호·세션을 우리가 다시 만들지 않는다.
--   · master 는 관리자를 늘리고 줄일 수 있고, admin 은 공간·예약만 다룬다.
--   · 첫 master 는 ADMIN_TOKEN 을 아는 사람이 지정한다(부트스트랩). 그 뒤로는
--     master 가 사람을 추가한다.
--
-- 여러 번 실행해도 안전하다.
-- ─────────────────────────────────────────────────────────────

create table if not exists public.admin_users (
  user_id     uuid primary key references auth.users(id) on delete cascade,
  email       text not null,
  name        text,
  role        text not null default 'admin' check (role in ('master', 'admin')),
  created_at  timestamptz not null default now(),
  created_by  uuid references auth.users(id) on delete set null,
  last_seen_at timestamptz
);

comment on table public.admin_users is
  '관리자 명단. 계정·비밀번호는 auth.users 가 갖고 여기는 권한만 기록한다.';

-- 관리자 행동 기록 — 누가 무엇을 바꿨는지 남긴다.
-- 공공 서비스에서 "언제 누가 승인했는가"는 나중에 반드시 필요해진다.
create table if not exists public.admin_actions (
  id         bigserial primary key,
  ts         timestamptz not null default now(),
  actor_id   uuid references auth.users(id) on delete set null,
  actor_email text,
  action     text not null,           -- reservation.approve, admin.invite …
  target     text,                    -- REV-260812-0001, user@example.com …
  detail     jsonb not null default '{}'::jsonb
);

create index if not exists admin_actions_ts_idx on public.admin_actions (ts desc);

-- ── 권한 ──────────────────────────────────────────────────────
-- 이 두 표는 서버(service_role)만 만진다. 브라우저에 열어 줄 이유가 없다.
alter table public.admin_users   enable row level security;
alter table public.admin_actions enable row level security;

revoke all on public.admin_users   from anon, authenticated;
revoke all on public.admin_actions from anon, authenticated;

-- 정책을 하나도 두지 않으면 anon·authenticated 는 아무것도 읽지 못한다.
-- service_role 은 RLS 를 우회하므로 서버에서는 그대로 동작한다.
