/**
 * 공간 사진 자리 (SP-09).
 * 실사진을 확보하기 전까지 스톡 사진을 쓰지 않는다 — 이용자가 실제 공간으로
 * 오인하기 때문. 카테고리 아이콘 + "사진 준비 중"으로 정직하게 표시한다.
 */
const CATEGORY_ICON: Record<string, string> = {
  '키친·조리': 'skillet',
  '회의·교육': 'groups',
  '공방·체험': 'construction',
  '전시·공연': 'theater_comedy',
  '숙박': 'bed',
  '카페·라운지': 'local_cafe',
  '야외': 'park',
};

export default function SpacePhoto({
  category,
  className = '',
}: {
  category: string;
  className?: string;
}) {
  return (
    <div
      className={`bg-slate-100 flex flex-col items-center justify-center gap-1 text-slate-400 ${className}`}
    >
      <span className="material-symbols-outlined text-4xl" aria-hidden="true">
        {CATEGORY_ICON[category] ?? 'apartment'}
      </span>
      <span className="text-[11px] font-medium">사진 준비 중</span>
    </div>
  );
}
