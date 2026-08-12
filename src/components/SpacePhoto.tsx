import { useState } from 'react';

/**
 * 공간 사진 자리 (SP-09).
 *
 * 준공 전이라 실물 사진이 아직 없다. 그래서 용도별 '예시 이미지'(자유 이용
 * 라이선스)를 배경으로 쓰되, 이용자가 실제 봉화 공간으로 오인하지 않도록
 * 「예시 이미지」 라벨을 항상 함께 표시한다 — 없는 것을 있다고 안내하지 않는
 * 이 서비스의 원칙을 사진에도 적용한 것이다. 실물 사진이 확보되면 이 자리에
 * 그대로 교체된다. 이미지 출처·라이선스는 /credits 에 명시한다.
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

export default function SpacePhoto({
  category,
  className = '',
}: {
  category: string;
  className?: string;
}) {
  const [errored, setErrored] = useState(false);
  const meta = CATEGORY[category] ?? { slug: 'default', icon: 'apartment' };

  // 이미지 로드 실패 시(파일 없음 등) 정직한 아이콘 플레이스홀더로 되돌린다
  if (errored) {
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

  return (
    <div className={`relative bg-slate-100 overflow-hidden ${className}`}>
      <img
        src={`/spaces/${meta.slug}.jpg`}
        alt={`${category} 예시 이미지`}
        loading="lazy"
        onError={() => setErrored(true)}
        className="w-full h-full object-cover"
      />
      {/* 실물 사진이 아님을 항상 알린다 (정직성) */}
      <span className="absolute bottom-2 left-2 px-1.5 py-0.5 bg-black/55 text-white/95 text-[10px] font-medium rounded backdrop-blur-sm">
        예시 이미지
      </span>
    </div>
  );
}
