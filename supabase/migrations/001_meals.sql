-- =============================================
-- 식대 관리 테이블 및 정책
-- Supabase SQL Editor에서 실행하세요
-- =============================================

-- 1. receipts 테이블
create table if not exists public.receipts (
  id            uuid primary key default gen_random_uuid(),
  uploader_id   uuid not null references auth.users(id) on delete cascade,
  image_path    text not null,
  store_name    text,
  paid_at       timestamptz not null,
  total_amount  integer not null default 0,
  is_lunch_time boolean not null default false,
  ocr_raw_response jsonb,
  created_at    timestamptz not null default now()
);

-- 2. receipt_items 테이블
create table if not exists public.receipt_items (
  id               uuid primary key default gen_random_uuid(),
  receipt_id       uuid not null references public.receipts(id) on delete cascade,
  assigned_user_id uuid not null,
  item_name        text not null,
  unit_price       integer not null default 0,
  qty              integer not null default 1,
  price            integer not null default 0,
  created_at       timestamptz not null default now()
);

-- 3. RLS 활성화
alter table public.receipts enable row level security;
alter table public.receipt_items enable row level security;

-- 4. receipts RLS 정책
create policy "본인 영수증 조회"
  on public.receipts for select
  to authenticated
  using (uploader_id = auth.uid());

create policy "본인 영수증 등록"
  on public.receipts for insert
  to authenticated
  with check (uploader_id = auth.uid());

-- 5. receipt_items RLS 정책
create policy "본인 항목 조회"
  on public.receipt_items for select
  to authenticated
  using (
    receipt_id in (
      select id from public.receipts where uploader_id = auth.uid()
    )
  );

create policy "본인 항목 등록"
  on public.receipt_items for insert
  to authenticated
  with check (
    receipt_id in (
      select id from public.receipts where uploader_id = auth.uid()
    )
  );

-- 6. Storage 버킷 생성 (이미 있으면 건너뜀)
insert into storage.buckets (id, name, public)
  values ('receipts', 'receipts', false)
  on conflict (id) do nothing;

-- 7. Storage RLS 정책
create policy "본인 폴더 업로드"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'receipts'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "본인 파일 조회"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'receipts'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
