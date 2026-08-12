/**
 * 공간 사진 관리 (AD-11 부속) — 담당자 전용.
 *
 *   POST   { id, dataUrl }   사진 올리기 (덮어쓰기)
 *   DELETE { id }            사진 내리기 → 용도별 기본 사진으로 돌아간다
 *
 * 파일 이름은 공간 ID 를 그대로 쓴다(GL4.jpg). "파일이 있으면 그 사진, 없으면
 * 용도별 기본 사진"이라는 규칙이라 DB 에 경로 컬럼을 두지 않는다 — 스키마를
 * 건드리지 않고도 사진 유무가 그 자체로 상태가 된다.
 *
 * 업로드는 서버(service_role)만 할 수 있다. 버킷은 공개 읽기이지만 쓰기 권한이
 * 브라우저에 없으므로, 토큰 없는 사람이 사진을 바꿔치기할 수 없다.
 */
import { supabaseAdmin } from '../server/supabase.js';

const BUCKET = 'space-photos';
const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'jpg',      // 저장은 확장자를 jpg 로 통일 (조회 경로를 하나로)
  'image/webp': 'jpg',
};

export default async function handler(req: any, res: any) {
  const token = process.env.ADMIN_TOKEN;
  if (!token || req.headers['x-admin-token'] !== token) {
    return res.status(401).json({ error: '담당자 인증이 필요합니다.' });
  }

  const sb = supabaseAdmin();
  const id = String(req.body?.id ?? '').trim();
  if (!id || !/^[A-Za-z0-9_-]{1,20}$/.test(id)) {
    return res.status(400).json({ error: '공간을 지정해 주세요.' });
  }
  const path = `${id}.jpg`;

  try {
    // 존재하는 공간인지 먼저 확인 — 아무 이름으로나 파일을 만들지 못하게
    const { data: space } = await sb.from('spaces').select('id').eq('id', id).maybeSingle();
    if (!space) return res.status(404).json({ error: '해당 공간이 없습니다.' });

    if (req.method === 'DELETE') {
      const { error } = await sb.storage.from(BUCKET).remove([path]);
      if (error) throw new Error(error.message);
      return res.status(200).json({ ok: true, photoUrl: null });
    }

    if (req.method !== 'POST') {
      res.setHeader('Allow', 'POST, DELETE');
      return res.status(405).json({ error: 'POST, DELETE만 허용됩니다.' });
    }

    // data URL 로 받는다 (multipart 파서 없이 처리)
    const dataUrl = String(req.body?.dataUrl ?? '');
    const m = dataUrl.match(/^data:([\w/+-]+);base64,(.+)$/);
    if (!m) return res.status(400).json({ error: '이미지 형식을 확인해 주세요.' });

    const mime = m[1].toLowerCase();
    if (!ALLOWED[mime]) {
      return res.status(400).json({ error: 'JPG·PNG·WebP 이미지만 올릴 수 있습니다.' });
    }
    const buf = Buffer.from(m[2], 'base64');
    if (buf.length === 0) return res.status(400).json({ error: '빈 이미지입니다.' });
    if (buf.length > MAX_BYTES) {
      return res.status(400).json({
        error: `이미지가 너무 큽니다 (${Math.round(buf.length / 1024 / 1024 * 10) / 10}MB). 5MB 이하로 올려 주세요.`,
      });
    }

    const { error } = await sb.storage.from(BUCKET).upload(path, buf, {
      contentType: mime,
      upsert: true,             // 같은 공간에 다시 올리면 교체
      cacheControl: '300',      // 5분 — 바꾼 사진이 오래 남지 않도록 짧게
    });
    if (error) throw new Error(error.message);

    const { data: pub } = sb.storage.from(BUCKET).getPublicUrl(path);
    return res.status(200).json({ ok: true, photoUrl: pub.publicUrl, bytes: buf.length });
  } catch (err: any) {
    console.error('사진 처리 실패:', err);
    return res.status(500).json({ error: '사진 처리에 실패했습니다. 잠시 후 다시 시도해 주세요.' });
  }
}
