import { useState } from 'react';

/**
 * 공간 사진 (SP-09).
 *
 * 표시 우선순위
 *   ① 담당자가 올린 실제 사진 (space-photos/{공간ID}.jpg)
 *   ② 용도별 예시 사진 (/spaces/{용도}.jpg) — 「예시 이미지」 라벨을 붙인다
 *   ③ 아이콘 자리표시 (둘 다 실패했을 때)
 *
 * 사진 유무를 DB 에 따로 기록하지 않는다. 파일이 있으면 ①, 없으면 자연히 ②로
 * 내려간다 — 스키마를 건드리지 않고도 담당자가 올린 순간 바로 바뀐다.
 * ②에만 라벨을 붙이는 이유는 실제 봉화 공간으로 오인하지 않게 하기 위함이다.
 */
const CATEGORY: Record<string, { slug: string; icon: string }> = {
  '카페·라운지': { slug: 'cafe', icon: 'local_cafe' },
  '회의·교육': { slug: 'meeting', icon: 'groups' },
  '공방·체험': { slug: 'workshop', icon: 'construction' },
  '전시·공연': { slug: 'gallery', icon: 'theater_comedy' },
  '숙박': { slug: 'stay', icon: 'bed' },
  '키친·조리': { slug: 'kitchen', icon: 'skillet' },
  '돌봄': { slug: 'care', icon: 'volunteer_activism' },
};

const PHOTO_BASE = `${import.meta.env.VITE_SUPABASE_URL ?? ''}/storage/v1/object/public/space-photos`;

export default function SpacePhoto({
  category,
  spaceId,
  version,
  className = '',
}: {
  category: string;
  /** 있으면 이 공간의 실제 사진을 먼저 찾는다 */
  spaceId?: string;
  /** 사진 교체 직후 캐시를 건너뛰기 위한 값 */
  version?: string | number;
  className?: string;
}) {
  const meta = CATEGORY[category] ?? { slug: 'default', icon: 'apartment' };

  // real → sample → icon 순으로 내려간다
  const [stage, setStage] = useState<'real' | 'sample' | 'icon'>(
    spaceId && import.meta.env.VITE_SUPABASE_URL ? 'real' : 'sample'
  );

  if (stage === 'icon') {
    return (
      <div
        className={`bg-slate-100 flex flex-col items-center justify-center gap-1 text-slate-400 ${className}`}
      >
        <span className="material-symbols-outlined text-4xl" aria-hidden="true">
          {meta.icon}
        </span>
        <span className="text-[11px] font-medium">사진 준비 중</span>
      </div>
    );
  }

  const isReal = stage === 'real';
  const src = isReal
    ? `${PHOTO_BASE}/${spaceId}.jpg${version ? `?v=${version}` : ''}`
    : `/spaces/${meta.slug}.jpg`;

  return (
    <div className={`relative bg-slate-100 overflow-hidden ${className}`}>
      <img
        key={src}
        src={src}
        alt={isReal ? `${category} 공간 사진` : `${category} 예시 이미지`}
        loading="lazy"
        onError={() => setStage(isReal ? 'sample' : 'icon')}
        className="w-full h-full object-cover"
      />
      {!isReal && (
        <span className="absolute bottom-2 left-2 px-1.5 py-0.5 bg-black/55 text-white/95 text-[10px] font-medium rounded backdrop-blur-sm">
          예시 이미지
        </span>
      )}
    </div>
  );
}
