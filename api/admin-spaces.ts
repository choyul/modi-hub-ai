/**
 * 공간 데이터 편집 (AD-11) — 담당자 전용.
 *
 *   GET   /api/admin-spaces           목록 (편집용 전체 필드)
 *   PATCH /api/admin-spaces           { id, patch: {...} } 부분 수정
 *
 * 인증은 x-admin-token 하나로만 건다. 이 화면은 군 내부에서만 쓰고,
 * 쓰기 권한은 서버(service_role)에만 있어 브라우저에서 직접 테이블을 고칠 수 없다.
 *
 * 설계 원칙 두 가지
 *   1) 빈 값은 빈 값으로 저장한다. 빈 문자열을 null 로 바꿔 넣는다 —
 *      "모르면 모른다고 쓴다"가 데이터 층에서도 지켜져야 화면의 「확인 필요」가
 *      거짓말이 되지 않는다.
 *   2) 검색에 쓰이는 글자가 바뀌면 색인도 그 자리에서 다시 만든다. 수정과 색인이
 *      따로 놀면 담당자가 고친 내용이 검색에 안 잡히는 상태가 생긴다.
 */
import { applyCors } from '../server/cors.js';
import { supabaseAdmin } from '../server/supabase.js';
import { invalidateSpacesCache } from '../server/db.js';

/** 담당자가 고칠 수 있는 필드. id·embedding·search_text 는 여기 없다(파생값·키). */
const EDITABLE = [
  'sigungu', 'facility', 'name', 'category', 'floor', 'location', 'area_sqm',
  'capacity_min', 'capacity_max', 'fee_per_hour', 'fee_per_night',
  'features', 'specialty', 'reservation_lead_days',
  'owner_dept', 'reservation_method', 'contact',
  'booking_channel', 'booking_status', 'planned_channels', 'open_from',
  'source', 'as_of', 'verified', 'trust_level',
] as const;

const NUMERIC = new Set(['area_sqm', 'capacity_min', 'capacity_max',
  'fee_per_hour', 'fee_per_night', 'reservation_lead_days']);
const ARRAY = new Set(['features', 'planned_channels']);
const BOOL = new Set(['verified']);
const DATE = new Set(['open_from', 'as_of']);

const ENUMS: Record<string, string[]> = {
  booking_channel: ['self', 'ota', 'phone', 'unknown'],
  booking_status: ['unknown', 'pending', 'live', 'closed'],
  trust_level: ['official', 'owner', 'confirmed', 'reported', 'unverified'],
};

const LABEL: Record<string, string> = {
  name: '공간명', facility: '시설명', category: '용도', floor: '층',
  location: '위치', area_sqm: '면적', capacity_min: '최소 인원',
  capacity_max: '최대 인원', fee_per_hour: '시간당 이용료',
  fee_per_night: '1박 요금', reservation_lead_days: '신청 시기',
  open_from: '개관 예정일', as_of: '기준일',
};

/** 화면에서 온 값을 DB 타입으로 — 빈 값은 전부 null 로 모은다 */
function coerce(key: string, raw: any): { value: any } | { error: string } {
  const name = LABEL[key] ?? key;

  if (ARRAY.has(key)) {
    const arr = Array.isArray(raw)
      ? raw
      : String(raw ?? '').split(',').map((v) => v.trim()).filter(Boolean);
    return { value: arr };
  }
  if (BOOL.has(key)) return { value: Boolean(raw) };

  // 빈 문자열·공백·null → null (모르는 값은 비워 둔다)
  if (raw === null || raw === undefined || String(raw).trim() === '') {
    return { value: null };
  }
  const s = String(raw).trim();

  if (NUMERIC.has(key)) {
    const n = Number(s);
    if (!Number.isFinite(n)) return { error: `${name}은(는) 숫자로 입력해 주세요.` };
    if (n < 0) return { error: `${name}은(는) 0보다 작을 수 없습니다.` };
    return { value: key === 'area_sqm' ? n : Math.round(n) };
  }
  if (DATE.has(key)) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) {
      return { error: `${name}은(는) 2026-11-29 형식으로 입력해 주세요.` };
    }
    return { value: s };
  }
  if (ENUMS[key] && !ENUMS[key].includes(s)) {
    return { error: `${name}에 허용되지 않는 값입니다: ${s}` };
  }
  return { value: s.slice(0, 500) };
}

/** 퍼지·임베딩이 함께 보는 통합 문자열 — 색인의 원본 */
function buildSearchText(s: any) {
  return [s.name, s.facility, s.category, s.specialty, ...(s.features ?? []),
    s.sigungu, s.owner_dept].filter(Boolean).join(' ');
}

async function embed(text: string): Promise<number[] | null> {
  const key = process.env.GEMINI_API_KEY;
  const model = process.env.GEMINI_EMBED_MODEL || 'gemini-embedding-001';
  const dim = Number(process.env.GEMINI_EMBED_DIM || 768);
  if (!key) return null;
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:embedContent?key=${key}`,
    { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: `models/${model}`, content: { parts: [{ text }] },
        taskType: 'RETRIEVAL_DOCUMENT', outputDimensionality: dim,
      }) }
  );
  if (!res.ok) return null;
  const j: any = await res.json();
  return j?.embedding?.values ?? null;
}

export default async function handler(req: any, res: any) {
  if (applyCors(req, res)) return;
  const token = process.env.ADMIN_TOKEN;
  if (!token || req.headers['x-admin-token'] !== token) {
    return res.status(401).json({ error: '담당자 인증이 필요합니다.' });
  }

  const sb = supabaseAdmin();

  try {
    if (req.method === 'GET') {
      const { data, error } = await sb.from('spaces')
        .select(EDITABLE.join(',') + ',id,updated_at').order('id');
      if (error) throw new Error(error.message);

      // 어느 공간에 직접 올린 사진이 있는지 — 파일 존재가 곧 상태다
      // (사진 경로용 DB 컬럼을 따로 두지 않는다)
      const photos: Record<string, string> = {};
      const { data: files } = await sb.storage.from('space-photos').list();
      for (const f of files ?? []) {
        const sid = f.name.replace(/\.jpg$/i, '');
        const { data: pub } = sb.storage.from('space-photos').getPublicUrl(f.name);
        // 갱신 시각을 붙여 브라우저가 옛 사진을 계속 보여주지 않게 한다
        const v = f.updated_at ? new Date(f.updated_at).getTime() : Date.now();
        photos[sid] = `${pub.publicUrl}?v=${v}`;
      }

      return res.status(200).json({ spaces: data ?? [], photos, editable: EDITABLE, enums: ENUMS });
    }

    if (req.method !== 'PATCH') {
      res.setHeader('Allow', 'GET, PATCH');
      return res.status(405).json({ error: 'GET, PATCH만 허용됩니다.' });
    }

    const id = String(req.body?.id ?? '').trim();
    const patch = req.body?.patch ?? {};
    if (!id) return res.status(400).json({ error: '수정할 공간을 지정해 주세요.' });

    const { data: before, error: findErr } = await sb.from('spaces')
      .select('*').eq('id', id).maybeSingle();
    if (findErr) throw new Error(findErr.message);
    if (!before) return res.status(404).json({ error: '해당 공간이 없습니다.' });

    // 화이트리스트 밖 필드는 조용히 버리지 않고 알린다
    const unknown = Object.keys(patch).filter((k) => !(EDITABLE as readonly string[]).includes(k));
    if (unknown.length) {
      return res.status(400).json({ error: `수정할 수 없는 항목입니다: ${unknown.join(', ')}` });
    }

    const update: Record<string, any> = {};
    for (const [k, v] of Object.entries(patch)) {
      const r = coerce(k, v);
      if ('error' in r) return res.status(400).json({ error: r.error });
      update[k] = r.value;
    }

    const merged = { ...before, ...update };

    // 교차 검증 — 한 칸씩 보면 통과하지만 같이 보면 틀린 값들
    if (merged.capacity_min != null && merged.capacity_max != null &&
        merged.capacity_min > merged.capacity_max) {
      return res.status(400).json({ error: '최소 인원이 최대 인원보다 클 수 없습니다.' });
    }
    if (merged.booking_channel === 'self' &&
        (merged.reservation_method == null || merged.capacity_max == null)) {
      return res.status(400).json({
        error: '온라인 신청(self)으로 두려면 예약 방법과 최대 인원이 있어야 합니다. ' +
               '아직 확정 전이면 채널을 phone 또는 unknown 으로 두세요.',
      });
    }
    if (merged.booking_channel === 'ota' && (merged.planned_channels ?? []).length === 0 &&
        merged.booking_status === 'pending') {
      return res.status(400).json({
        error: '개관 전 외부예약(ota·pending)이면 예정 채널을 1개 이상 적어 주세요. ' +
               '이용자에게 "어디서 예약하는지"를 안내할 수 없습니다.',
      });
    }

    // 검색에 쓰이는 글자가 바뀌었으면 색인도 함께 갱신한다
    const nextText = buildSearchText(merged);
    let embedNote: string | null = null;
    if (nextText !== before.search_text) {
      update.search_text = nextText;
      const vec = await embed(nextText);
      if (vec) update.embedding = JSON.stringify(vec);
      else embedNote = '저장은 됐지만 의미검색 색인 갱신에 실패했습니다. ' +
                       'scripts/build-embeddings.mjs 로 다시 만들 수 있습니다.';
    }
    update.updated_at = new Date().toISOString();

    const { data: after, error: upErr } = await sb.from('spaces')
      .update(update).eq('id', id).select(EDITABLE.join(',') + ',id,updated_at').maybeSingle();
    if (upErr) throw new Error(upErr.message);

    // 변경 이력 — 테이블이 없으면 조용히 넘어간다(기능을 막지 않는다)
    const changed = Object.keys(update).filter((k) => !['updated_at', 'search_text', 'embedding'].includes(k));
    await sb.from('space_edits').insert({
      space_id: id,
      changes: changed.map((k) => ({ field: k, from: before[k] ?? null, to: update[k] ?? null })),
    }).then(() => {}, () => {});

    invalidateSpacesCache();
    return res.status(200).json({ space: after, changed, embedNote });
  } catch (err: any) {
    console.error('공간 수정 실패:', err);
    return res.status(500).json({ error: '저장에 실패했습니다. 잠시 후 다시 시도해 주세요.' });
  }
}
