/**
 * 공간 사진 저장소 준비 — 한 번만 실행하면 된다 (여러 번 실행해도 안전).
 *   node scripts/setup-storage.mjs
 *
 * 버킷은 공개(public)로 만든다. 공간 사진은 누구나 보는 정보이고, 쓰기는
 * 서버(service_role)를 거쳐야만 가능하므로 공개해도 위험하지 않다.
 *
 * 파일 이름은 공간 ID 를 그대로 쓴다 (GL4.jpg). DB 에 경로 컬럼을 따로 두지
 * 않아도 "파일이 있으면 그 사진, 없으면 용도별 기본 사진"으로 결정되므로
 * 스키마 변경 없이 동작한다.
 */
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const BUCKET = 'space-photos';
const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, {
  auth: { persistSession: false },
});

const { data: buckets, error: listErr } = await sb.storage.listBuckets();
if (listErr) {
  console.error('버킷 목록 조회 실패:', listErr.message);
  process.exit(1);
}

if (buckets.some((b) => b.name === BUCKET)) {
  console.log(`이미 있음: ${BUCKET}`);
} else {
  const { error } = await sb.storage.createBucket(BUCKET, {
    public: true,
    fileSizeLimit: 5 * 1024 * 1024,          // 5MB — 사진 한 장으로 충분
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
  });
  if (error) {
    console.error('버킷 생성 실패:', error.message);
    process.exit(1);
  }
  console.log(`생성 완료: ${BUCKET} (공개 · 최대 5MB · jpeg/png/webp)`);
}

const { data: files } = await sb.storage.from(BUCKET).list();
console.log(`현재 업로드된 사진 ${files?.length ?? 0}건`);
console.log(`공개 URL 형식: ${process.env.SUPABASE_URL}/storage/v1/object/public/${BUCKET}/<공간ID>.jpg`);
