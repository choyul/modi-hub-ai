-- ═══════════════════════════════════════════════════════════════════
-- MODI Hub — 봉화권 공간 검색 · 미충족 수요 수집
-- 0001 초기 스키마 (SB-02 · SB-03 · SB-04)
--
-- 실행: Supabase 대시보드 > SQL Editor 에 전체 붙여넣고 Run
-- 원칙: 기본은 잠금(deny), 필요한 것만 명시적으로 연다.
--       프로젝트 생성 시 "Automatically expose new tables" 설정과 무관하게
--       동일한 결과가 나오도록 REVOKE 후 GRANT 한다.
-- ═══════════════════════════════════════════════════════════════════

create extension if not exists vector;    -- SB-04 임베딩 (계층 ③)
create extension if not exists pg_trgm;   -- SB-05 대안 경로 (퍼지 서버 구현 시)


-- ───────────────────────────────────────────────────────────────────
-- 1. spaces — 공간 마스터
--    통합 스키마 4층: 존재 · 운영 · 가용 · 신뢰
-- ───────────────────────────────────────────────────────────────────
create table if not exists public.spaces (
  -- [존재]
  id                    text primary key,                    -- HA01 GR01 NB02 AG01
  sigungu               text not null default '봉화군',
  facility              text not null,
  name                  text not null,
  category              text not null,
  floor                 text,
  location              text,
  area_sqm              numeric,

  -- [가용]  확인되지 않은 값은 null 로 둔다. 채우지 않는다.
  capacity_min          int,
  capacity_max          int,
  fee_per_hour          int,
  fee_per_night         int,
  features              text[]  not null default '{}',
  specialty             text,
  reservation_lead_days int,

  -- [운영]
  owner_dept            text,
  reservation_method    text,
  contact               text,

  -- [운영] 예약 채널 — BK-08·09·10
  booking_channel  text not null default 'unknown'
                   check (booking_channel in ('self','ota','phone','unknown')),
  booking_status   text not null default 'unknown'
                   check (booking_status in ('unknown','pending','live','closed')),
  booking_links    jsonb    not null default '[]'::jsonb,  -- [{"name":"야놀자","url":"..."}]
  planned_channels text[]   not null default '{}',         -- 등록 전 예정 채널명
  open_from        date,                                   -- 개관 예정일

  -- [신뢰]  이 층이 없으면 나머지가 거짓말이 된다
  source     text,
  as_of      date,
  verified   boolean not null default false,
  trust_level text not null default 'unverified'
              check (trust_level in ('official','owner','confirmed','reported','unverified')),

  -- 쉬운 말 안내 — BA-02 생성 / BA-03 검수. approved 만 화면에 게시
  easy_summary        text,
  easy_summary_status text not null default 'none'
                      check (easy_summary_status in ('none','draft','approved')),

  -- 검색 보조 — 배치가 갱신
  search_text text,                    -- 퍼지·임베딩 대상 통합 문자열
  aliases     text[] not null default '{}',
  embedding   vector(768),             -- gemini-embedding-001, outputDimensionality=768

  updated_at timestamptz not null default now()
);

comment on column public.spaces.embedding is
  '차원 768 = gemini-embedding-001 에 outputDimensionality=768 을 지정한 값. '
  '이 모델의 기본 출력은 3072 이므로 배치에서 반드시 768 을 명시해야 한다. '
  '모델·차원을 바꾸면 이 컬럼과 match_spaces() 를 함께 고칠 것';


-- ───────────────────────────────────────────────────────────────────
-- 2. search_logs — 3종 로그 (LG-01). 원문은 마스킹 후 적재
-- ───────────────────────────────────────────────────────────────────
create table if not exists public.search_logs (
  id         bigserial primary key,
  ts         timestamptz not null default now(),
  raw_query  text not null,                       -- LG-02 마스킹 완료본만
  purpose    text,
  headcount  int,
  region     text,
  when_text  text,
  outcome    text not null check (outcome in ('success','unmet')),
  shown_space_ids text[] not null default '{}',
  unmet_type text,
  -- SR-10 축퇴: 어느 계층이 답했는가. 시연 ⓑ·비용 실측(PL-07)의 원자료
  answered_by text check (answered_by in ('filter','fuzzy','embedding','llm')),
  llm_called  boolean not null default false,
  latency_ms  int
);

create index if not exists search_logs_ts_idx      on public.search_logs (ts desc);
create index if not exists search_logs_outcome_idx on public.search_logs (outcome);


-- ───────────────────────────────────────────────────────────────────
-- 3. demands — 동의 기반 수요 등록 (UD-02·03)
-- ───────────────────────────────────────────────────────────────────
create table if not exists public.demands (
  id         bigserial primary key,
  ts         timestamptz not null default now(),
  raw_query  text not null,
  unmet_type text,
  consented  boolean not null default true,   -- 동의 없이 들어오는 경로는 없다
  contact    text,                            -- 선택. 없어도 등록 성립
  note       text
);


-- ───────────────────────────────────────────────────────────────────
-- 4. feedbacks — 이탈 사유 (UD-05·06)
-- ───────────────────────────────────────────────────────────────────
create table if not exists public.feedbacks (
  id        bigserial primary key,
  ts        timestamptz not null default now(),
  raw_query text not null,
  space_id  text references public.spaces(id) on delete set null,
  reason    text not null check (reason in ('far','time','cost','type','other')),
  note      text
);


-- ───────────────────────────────────────────────────────────────────
-- 5. reservations — 대관 신청 (BK-01~07)
--    user_id 로 Supabase Auth 계정에 귀속. 자동 확정 경로 없음
-- ───────────────────────────────────────────────────────────────────
create table if not exists public.reservations (
  id         text primary key,                       -- REV-260809-1234
  created_at timestamptz not null default now(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  space_id   text not null references public.spaces(id),
  applicant  text not null,
  use_date   date not null,
  use_time   text,
  headcount  int  not null check (headcount >= 1),
  purpose    text,
  contact    text,
  status     text not null default '승인대기'
             check (status in ('승인대기','예약확정','반려','취소'))
);

create index if not exists reservations_user_idx on public.reservations (user_id, created_at desc);


-- ───────────────────────────────────────────────────────────────────
-- 6. notify_requests — 개관 알림 대기 수요 (UD-08 · AD-14)
-- ───────────────────────────────────────────────────────────────────
create table if not exists public.notify_requests (
  id          bigserial primary key,
  ts          timestamptz not null default now(),
  space_id    text not null references public.spaces(id) on delete cascade,
  contact     text not null,
  notified_at timestamptz                              -- 발송 완료 시각. null = 대기 중
);

create index if not exists notify_pending_idx
  on public.notify_requests (space_id) where notified_at is null;


-- ═══════════════════════════════════════════════════════════════════
-- 권한 — SB-03
--
-- 설계: 브라우저 키(anon/authenticated)로는 원문 질의·연락처에
--       물리적으로 접근할 수 없다. 앱 코드가 아니라 DB 가 보증한다.
--       service_role(secret) 은 RLS 를 우회하므로 서버에서만 쓴다.
-- ═══════════════════════════════════════════════════════════════════

-- 1) 전면 회수 — 프로젝트 생성 옵션과 무관하게 동일 상태로 만든다
revoke all on all tables    in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;
revoke all on all functions in schema public from anon, authenticated;

-- 2) 앞으로 만들 테이블도 기본은 잠금
alter default privileges in schema public revoke all on tables    from anon, authenticated;
alter default privileges in schema public revoke all on sequences from anon, authenticated;

-- 3) 필요한 것만 명시적으로 개방
grant select on public.spaces       to anon, authenticated;  -- 공개 정보
grant select on public.reservations to authenticated;        -- 본인 것만 (아래 RLS)

-- 4) RLS 전면 활성화
alter table public.spaces          enable row level security;
alter table public.search_logs     enable row level security;
alter table public.demands         enable row level security;
alter table public.feedbacks       enable row level security;
alter table public.reservations    enable row level security;
alter table public.notify_requests enable row level security;

-- 5) 정책
--    search_logs / demands / feedbacks / notify_requests 는 정책을 두지 않는다.
--    RLS 활성 + 정책 없음 = anon·authenticated 전면 차단. service_role 만 접근.
drop policy if exists spaces_public_read on public.spaces;
create policy spaces_public_read
  on public.spaces for select
  to anon, authenticated
  using (true);

drop policy if exists reservations_own_read on public.reservations;
create policy reservations_own_read
  on public.reservations for select
  to authenticated
  using (auth.uid() = user_id);
-- 쓰기(INSERT/UPDATE)는 정책을 두지 않는다 — 수용인원·채널 검증이 서버에 있으므로
-- 신청·취소는 반드시 API 를 경유한다.


-- ═══════════════════════════════════════════════════════════════════
-- 임베딩 검색 — SB-04 (런타임 계층 ③)
-- ═══════════════════════════════════════════════════════════════════
create or replace function public.match_spaces(
  query_embedding vector(768),
  match_count     int   default 5,
  min_similarity  float default 0.55
)
returns table (id text, name text, similarity float)
language sql
stable
security invoker
set search_path = public
as $$
  select s.id,
         s.name,
         1 - (s.embedding <=> query_embedding) as similarity
  from   public.spaces s
  where  s.embedding is not null
    and  1 - (s.embedding <=> query_embedding) >= min_similarity
  order  by s.embedding <=> query_embedding
  limit  match_count;
$$;

revoke all on function public.match_spaces(vector, int, float) from anon, authenticated;
grant execute on function public.match_spaces(vector, int, float) to service_role;

-- 31건 규모에서는 순차 스캔이 인덱스보다 빠르다. 수백 건을 넘기면 아래를 켤 것.
-- create index spaces_embedding_idx on public.spaces
--   using hnsw (embedding vector_cosine_ops);

-- SB-05 대안 경로(서버 퍼지)를 쓸 경우에 대비한 인덱스. 현재는 Fuse.js 클라이언트 사용
create index if not exists spaces_search_trgm_idx
  on public.spaces using gin (search_text gin_trgm_ops);


-- ═══════════════════════════════════════════════════════════════════
-- 확인용 — 실행 후 아래를 돌려 권한이 의도대로인지 본다
-- ═══════════════════════════════════════════════════════════════════
-- select tablename, rowsecurity from pg_tables where schemaname='public' order by 1;
--   → 6개 테이블 모두 rowsecurity = true 여야 한다
--
-- select table_name, grantee, privilege_type
--   from information_schema.role_table_grants
--  where table_schema='public' and grantee in ('anon','authenticated')
--  order by 1,2;
--   → spaces/anon·authenticated SELECT, reservations/authenticated SELECT 만 나와야 한다
