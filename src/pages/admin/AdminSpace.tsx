import { useCallback, useEffect, useMemo, useState } from 'react';
import { ADMIN_TOKEN_KEY } from '../../hooks/useStats';

/**
 * 공간 관리 (AD-11) — 조회 + 편집.
 *
 * 이 화면의 목적은 「빈 칸을 채우는 것」이 아니라 「빈 칸이 어디인지 보이게 하고,
 * 값을 확인한 사람이 그 자리에서 채우게 하는 것」이다. 그래서
 *   · 비어 있는 값은 그럴듯하게 채우지 않고 비어 있다고 표시한다
 *   · 입력란을 비우면 null 로 저장된다 — "모른다"를 그대로 저장할 수 있어야 한다
 *   · 값을 채우면 출처·기준일을 함께 적도록 한 묶음으로 배치했다
 *     (근거 없이 채운 값은 이 서비스에서 가장 위험한 데이터다)
 */

const REQUIRED: { key: string; label: string }[] = [
  { key: 'capacity_max', label: '수용인원' },
  { key: 'area_sqm', label: '면적' },
  { key: 'reservation_method', label: '예약방법' },
  { key: 'location', label: '위치' },
  { key: 'contact', label: '연락처' },
];

const CATEGORIES = ['카페·라운지', '회의·교육', '공방·체험', '전시·공연', '숙박', '키친·조리', '돌봄', '미정'];
const CHANNEL_HELP: Record<string, string> = {
  self: '이 시스템에서 온라인 신청을 받습니다 (예약방법·최대인원 필수)',
  ota: '야놀자·여기어때 등 외부 사이트에서 예약합니다',
  phone: '전화·방문 등 시스템 밖에서 처리합니다',
  unknown: '이용 조건이 아직 확인되지 않았습니다 — 신청이 차단됩니다',
};
const STATUS_HELP: Record<string, string> = {
  live: '지금 이용할 수 있습니다',
  pending: '개관 준비 중 — 개관 알림만 받습니다',
  closed: '운영하지 않습니다 (검색에서 제외)',
  unknown: '운영 여부를 확인하지 못했습니다',
};
const TRUST = [
  ['official', '공식 대장'], ['owner', '운영자 직접 확인'], ['confirmed', '확인됨'],
  ['reported', '주민 제보'], ['unverified', '확인 전'],
];

type Space = Record<string, any>;

const missingFields = (s: Space) =>
  REQUIRED.filter((f) => s[f.key] == null || s[f.key] === '').map((f) => f.label);

export default function AdminSpace() {
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [onlyIncomplete, setOnlyIncomplete] = useState(false);
  const [facility, setFacility] = useState('all');
  const [editing, setEditing] = useState<Space | null>(null);
  // 공간 ID → 올린 사진 URL. 파일 존재가 곧 상태라 DB 컬럼이 없다.
  const [photos, setPhotos] = useState<Record<string, string>>({});

  const token = () => localStorage.getItem(ADMIN_TOKEN_KEY) || '';

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin-spaces', { headers: { 'x-admin-token': token() } });
      const body = await res.json();
      if (!res.ok) throw new Error(body?.error || '불러오지 못했습니다.');
      setSpaces(body.spaces);
      setPhotos(body.photos ?? {});
      setErr(null);
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const facilities = useMemo(() => [...new Set(spaces.map((s) => s.facility))], [spaces]);
  const rows = spaces.filter((s) => {
    if (facility !== 'all' && s.facility !== facility) return false;
    if (onlyIncomplete && missingFields(s).length === 0) return false;
    return true;
  });
  const incompleteCount = spaces.filter((s) => missingFields(s).length > 0).length;
  const unverifiedCount = spaces.filter((s) => !s.verified).length;

  if (loading) {
    return <div className="p-8 text-slate-500">불러오는 중…</div>;
  }
  if (err) {
    return (
      <div className="p-8">
        <div className="bg-red-50 border border-red-200 rounded-2xl p-6 max-w-lg">
          <p className="font-bold text-red-900 mb-1">공간 정보를 불러오지 못했습니다</p>
          <p className="text-sm text-red-800 mb-3">{err}</p>
          <button onClick={load} className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-bold">
            다시 시도
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 pb-20">
      <div className="mb-6 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">공간 관리</h1>
          <p className="text-slate-500 mt-1">
            등록 {spaces.length}건 · 필드 누락 {incompleteCount}건 · 실측 확인 전 {unverifiedCount}건
          </p>
        </div>
        <button onClick={load} className="px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-600">
          새로고침
        </button>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 mb-6 text-[13px] text-slate-700 leading-relaxed">
        <b className="text-slate-900">데이터 상태</b> — 봉화읍 도시재생 인정사업 거점시설
        운영계획서 v3(2026.8.11 확정) 기준입니다. 4·5층은 협의가 끝나 세부값이 있고,
        2층(돌봄 소관)과 해오름센터 1~3층은 아직 자료가 없습니다.
        <b> 정보가 부서 경계에서 막히는 것이 이 서비스가 푸는 문제 그 자체</b>이므로,
        모르는 값은 빈 칸으로 두십시오. 빈 칸은 이용자 화면에 「확인 필요」로 나갑니다.
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        <select
          value={facility}
          onChange={(e) => setFacility(e.target.value)}
          className="px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-600 outline-none"
        >
          <option value="all">모든 시설</option>
          {facilities.map((f) => <option key={f} value={f}>{f}</option>)}
        </select>
        <button
          onClick={() => setOnlyIncomplete(!onlyIncomplete)}
          className={`px-4 py-2.5 rounded-xl text-sm font-bold transition-colors ${
            onlyIncomplete ? 'bg-amber-500 text-white' : 'bg-white border border-slate-200 text-slate-600'
          }`}
        >
          누락 항목만 보기
        </button>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-500 text-xs">
            <tr>
              <th className="px-4 py-3 text-left font-bold w-[76px]">사진</th>
              <th className="px-4 py-3 text-left font-bold">시설 · 공간</th>
              <th className="px-4 py-3 text-left font-bold">소관</th>
              <th className="px-4 py-3 text-left font-bold">수용인원</th>
              <th className="px-4 py-3 text-left font-bold">예약 채널</th>
              <th className="px-4 py-3 text-left font-bold">누락 필드</th>
              <th className="px-4 py-3 text-right font-bold whitespace-nowrap">편집</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((s) => {
              const missing = missingFields(s);
              return (
                <tr key={s.id} className={missing.length ? 'bg-amber-50/40' : ''}>
                  <td className="px-4 py-3">
                    {photos[s.id] ? (
                      <img src={photos[s.id]} alt=""
                        className="w-14 h-10 object-cover rounded-md border border-slate-200" />
                    ) : (
                      <div className="w-14 h-10 rounded-md bg-slate-100 border border-slate-200
                        flex items-center justify-center text-[9px] text-slate-400 text-center leading-tight">
                        예시<br />사진
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-bold text-slate-900">{s.name}</div>
                    <div className="text-xs text-slate-500">{s.facility} · {s.floor} · {s.category}</div>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-600">{s.owner_dept ?? '—'}</td>
                  <td className="px-4 py-3 text-xs text-slate-600">
                    {s.capacity_max == null ? '확인 필요'
                      : `${s.capacity_min ?? 1}~${s.capacity_max}명`}
                  </td>
                  <td className="px-4 py-3 text-xs">
                    <span className={`px-2 py-0.5 rounded font-bold ${
                      s.booking_channel === 'self' ? 'bg-emerald-50 text-emerald-700'
                        : s.booking_channel === 'unknown' ? 'bg-amber-50 text-amber-700'
                        : 'bg-slate-100 text-slate-600'
                    }`}>
                      {s.booking_channel}/{s.booking_status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {missing.length === 0 ? (
                      <span className="text-xs text-emerald-600 font-bold">완비</span>
                    ) : (
                      <div className="flex flex-wrap gap-1">
                        {missing.map((m) => (
                          <span key={m} className="px-2 py-0.5 bg-amber-100 text-amber-800 text-[11px] font-bold rounded">
                            {m}
                          </span>
                        ))}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    <button
                      onClick={() => setEditing(s)}
                      className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold whitespace-nowrap"
                    >
                      수정
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {editing && (
        <EditPanel
          space={editing}
          photoUrl={photos[editing.id] ?? null}
          onPhotoChange={(url) =>
            setPhotos((prev) => {
              const next = { ...prev };
              if (url) next[editing.id] = url;
              else delete next[editing.id];
              return next;
            })
          }
          onClose={() => setEditing(null)}
          onSaved={(updated, note) => {
            setSpaces((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
            setEditing(null);
            if (note) alert(note);
          }}
        />
      )}
    </div>
  );
}

// ── 편집 패널 ────────────────────────────────────────────────
function EditPanel({ space, photoUrl, onPhotoChange, onClose, onSaved }: {
  space: Space;
  photoUrl: string | null;
  onPhotoChange: (url: string | null) => void;
  onClose: () => void;
  onSaved: (s: Space, note: string | null) => void;
}) {
  const [form, setForm] = useState<Space>({
    ...space,
    features: (space.features ?? []).join(', '),
    planned_channels: (space.planned_channels ?? []).join(', '),
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [photo, setPhoto] = useState<string | null>(photoUrl);
  const [photoBusy, setPhotoBusy] = useState(false);

  /**
   * 올리기 전에 브라우저에서 줄인다 — 휴대폰 사진은 5MB 를 훌쩍 넘는 경우가
   * 많아 그대로 보내면 실패한다. 가로 1600px·품질 0.82 면 카드·상세 어디에
   * 써도 충분하면서 대개 300KB 안쪽으로 떨어진다.
   */
  function shrink(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error('파일을 읽지 못했습니다.'));
      reader.onload = () => {
        const img = new Image();
        img.onerror = () => reject(new Error('이미지를 열지 못했습니다.'));
        img.onload = () => {
          const scale = Math.min(1, 1600 / img.width);
          const c = document.createElement('canvas');
          c.width = Math.round(img.width * scale);
          c.height = Math.round(img.height * scale);
          c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height);
          resolve(c.toDataURL('image/jpeg', 0.82));
        };
        img.src = String(reader.result);
      };
      reader.readAsDataURL(file);
    });
  }

  async function uploadPhoto(file: File) {
    setPhotoBusy(true);
    setError(null);
    try {
      const dataUrl = await shrink(file);
      const res = await fetch('/api/admin-photo', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-token': localStorage.getItem(ADMIN_TOKEN_KEY) || '',
        },
        body: JSON.stringify({ id: space.id, dataUrl }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body?.error || '사진을 올리지 못했습니다.');
      // 방금 올린 사진이 바로 보이도록 캐시를 건너뛴다
      const url = `${body.photoUrl}?v=${Date.now()}`;
      setPhoto(url);
      onPhotoChange(url);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setPhotoBusy(false);
    }
  }

  async function removePhoto() {
    setPhotoBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/admin-photo', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-token': localStorage.getItem(ADMIN_TOKEN_KEY) || '',
        },
        body: JSON.stringify({ id: space.id }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body?.error || '사진을 내리지 못했습니다.');
      setPhoto(null);
      onPhotoChange(null);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setPhotoBusy(false);
    }
  }

  const set = (k: string, v: any) => setForm((f) => ({ ...f, [k]: v }));
  const val = (k: string) => (form[k] ?? '') as any;

  async function save() {
    setSaving(true);
    setError(null);
    const patch: Record<string, any> = {};
    const keys = ['name', 'facility', 'category', 'floor', 'location', 'area_sqm',
      'capacity_min', 'capacity_max', 'fee_per_hour', 'fee_per_night', 'features',
      'specialty', 'reservation_lead_days', 'owner_dept', 'reservation_method', 'contact',
      'booking_channel', 'booking_status', 'planned_channels', 'open_from',
      'source', 'as_of', 'verified', 'trust_level'];
    for (const k of keys) patch[k] = form[k];
    try {
      const res = await fetch('/api/admin-spaces', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-token': localStorage.getItem(ADMIN_TOKEN_KEY) || '',
        },
        body: JSON.stringify({ id: space.id, patch }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body?.error || '저장에 실패했습니다.');
      onSaved(body.space, body.embedNote);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  const Field = ({ k, label, hint, type = 'text' }: any) => (
    <label className="block">
      <span className="block text-xs font-bold text-slate-600 mb-1">{label}</span>
      <input
        type={type}
        value={val(k)}
        onChange={(e) => set(k, e.target.value)}
        placeholder="모르면 비워 두세요"
        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-indigo-400"
      />
      {hint && <span className="block text-[11px] text-slate-400 mt-1">{hint}</span>}
    </label>
  );

  return (
    <div className="fixed inset-0 bg-slate-900/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[92vh] flex flex-col">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between shrink-0">
          <div>
            <h2 className="font-bold text-slate-900">{space.name} 수정</h2>
            <p className="text-xs text-slate-500">{space.id} · {space.facility}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 text-sm font-bold">닫기</button>
        </div>

        <div className="p-6 space-y-6 overflow-y-auto grow">
          <p className="text-[13px] bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-600">
            <b className="text-slate-800">비우면 「확인 필요」로 저장됩니다.</b> 확인하지 못한 값을
            짐작으로 채우지 마세요 — 이용자가 그 값을 믿고 헛걸음합니다.
          </p>

          <section>
            <h3 className="text-sm font-bold text-slate-800 mb-3">사진</h3>
            <div className="flex items-start gap-4">
              <div className="w-44 h-32 rounded-xl overflow-hidden border border-slate-200 bg-slate-100 shrink-0 relative">
                {photo ? (
                  <img src={photo} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 gap-1">
                    <span className="material-symbols-outlined text-2xl" aria-hidden="true">image</span>
                    <span className="text-[11px] font-medium">용도별 예시 사진</span>
                  </div>
                )}
                {photoBusy && (
                  <div className="absolute inset-0 bg-white/70 flex items-center justify-center text-xs font-bold text-slate-600">
                    처리 중…
                  </div>
                )}
              </div>
              <div className="flex-1">
                <div className="flex flex-wrap gap-2 mb-2">
                  <label className={`px-4 py-2 rounded-lg text-sm font-bold cursor-pointer ${
                    photoBusy ? 'bg-slate-200 text-slate-400' : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                  }`}>
                    {photo ? '사진 바꾸기' : '사진 올리기'}
                    <input
                      type="file" accept="image/jpeg,image/png,image/webp" className="hidden"
                      disabled={photoBusy}
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) uploadPhoto(f);
                        e.target.value = '';
                      }}
                    />
                  </label>
                  {photo && (
                    <button
                      type="button" onClick={removePhoto} disabled={photoBusy}
                      className="px-4 py-2 rounded-lg text-sm font-bold text-slate-600 border border-slate-200 disabled:opacity-50"
                    >
                      사진 내리기
                    </button>
                  )}
                </div>
                <p className="text-[11.5px] text-slate-500 leading-relaxed">
                  실제 공간 사진을 올리면 이용자 화면에 바로 반영됩니다. 올리지 않으면
                  용도별 예시 사진이 「예시 이미지」 표시와 함께 나갑니다.
                  <span className="block text-slate-400 mt-0.5">
                    JPG·PNG·WebP · 올릴 때 자동으로 줄여 저장합니다 · 사진은 저장 버튼과 무관하게 즉시 적용됩니다
                  </span>
                </p>
              </div>
            </div>
          </section>

          <section>
            <h3 className="text-sm font-bold text-slate-800 mb-3">기본</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field k="name" label="공간명" />
              <label className="block">
                <span className="block text-xs font-bold text-slate-600 mb-1">용도</span>
                <select value={val('category')} onChange={(e) => set('category', e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none">
                  {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </label>
              <Field k="facility" label="시설명" />
              <Field k="floor" label="층" hint="예: 4F" />
              <Field k="location" label="위치" />
              <Field k="owner_dept" label="소관 부서" hint="값을 모르는 이유가 여기 있는 경우가 많습니다" />
              <Field k="area_sqm" label="면적 (㎡)" />
              <Field k="specialty" label="한 줄 설명" hint="검색에 쓰입니다" />
            </div>
          </section>

          <section>
            <h3 className="text-sm font-bold text-slate-800 mb-3">이용 조건</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field k="capacity_min" label="최소 인원" hint="좌석 수가 아니라 '몇 명부터 쓸 수 있는가'" />
              <Field k="capacity_max" label="최대 인원" />
              <Field k="fee_per_hour" label="시간당 이용료 (원)" hint="무료면 0" />
              <Field k="fee_per_night" label="1박 요금 (원)" />
              <Field k="reservation_lead_days" label="신청 시기 (며칠 전)" />
              <Field k="contact" label="연락처" />
              <div className="sm:col-span-2">
                <Field k="reservation_method" label="예약 방법" hint="이용자가 이 문장 그대로 읽습니다" />
              </div>
              <div className="sm:col-span-2">
                <Field k="features" label="특징 (쉼표로 구분)" hint="예: 프로젝터, 주차 가능" />
              </div>
            </div>
          </section>

          <section>
            <h3 className="text-sm font-bold text-slate-800 mb-3">예약 채널</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <label className="block">
                <span className="block text-xs font-bold text-slate-600 mb-1">채널</span>
                <select value={val('booking_channel')} onChange={(e) => set('booking_channel', e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none">
                  {Object.keys(CHANNEL_HELP).map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
                <span className="block text-[11px] text-slate-500 mt-1">{CHANNEL_HELP[val('booking_channel')]}</span>
              </label>
              <label className="block">
                <span className="block text-xs font-bold text-slate-600 mb-1">운영 상태</span>
                <select value={val('booking_status')} onChange={(e) => set('booking_status', e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none">
                  {Object.keys(STATUS_HELP).map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
                <span className="block text-[11px] text-slate-500 mt-1">{STATUS_HELP[val('booking_status')]}</span>
              </label>
              <Field k="planned_channels" label="예정 예약처 (쉼표로 구분)" hint="개관 전 외부예약일 때 필수 — 예: 야놀자, 여기어때" />
              <Field k="open_from" label="개관 예정일" hint="2026-11-29 형식" />
            </div>
          </section>

          <section>
            <h3 className="text-sm font-bold text-slate-800 mb-3">
              근거 <span className="font-normal text-slate-400">— 값을 채웠다면 어디서 확인했는지 남겨 주세요</span>
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <Field k="source" label="출처" hint="예: 운영계획서 v3 · 2026.8.11 협의 확정" />
              </div>
              <Field k="as_of" label="기준일" hint="2026-08-11 형식" />
              <label className="block">
                <span className="block text-xs font-bold text-slate-600 mb-1">신뢰 등급</span>
                <select value={val('trust_level')} onChange={(e) => set('trust_level', e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none">
                  {TRUST.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </label>
              <label className="flex items-center gap-2 sm:col-span-2">
                <input type="checkbox" checked={Boolean(form.verified)}
                  onChange={(e) => set('verified', e.target.checked)} className="w-4 h-4" />
                <span className="text-sm text-slate-700">
                  현장에서 실측·확인함 <span className="text-slate-400">(체크하면 이용자 화면에 「확인됨」으로 표시)</span>
                </span>
              </label>
            </div>
          </section>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-800">
              {error}
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-slate-200 flex gap-2 justify-end shrink-0 bg-white rounded-b-2xl">
          <button onClick={onClose} className="px-5 py-2.5 text-sm font-bold text-slate-600">취소</button>
          <button onClick={save} disabled={saving}
            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-sm font-bold">
            {saving ? '저장 중…' : '저장'}
          </button>
        </div>
      </div>
    </div>
  );
}
