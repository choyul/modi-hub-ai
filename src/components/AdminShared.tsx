import type { ReactNode } from 'react';

/**
 * 담당자 화면 공통 조각.
 *
 * 원칙: 데이터가 없으면 없다고 쓴다. 그럴듯한 숫자로 화면을 채우지 않는다.
 * (평가기준 심사 전제 2 — 전시형 목업 배제)
 */

export function StorageBadge({ persisted }: { persisted: boolean }) {
  if (persisted) {
    return (
      <span className="inline-flex items-center gap-1.5 text-[12px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-full px-3 py-1">
        <span className="material-symbols-outlined text-[14px]">database</span>
        영구 저장소 연결됨
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-[12px] font-bold text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-3 py-1">
      <span className="material-symbols-outlined text-[14px]">warning</span>
      임시 저장소 — 재배포 시 로그가 사라집니다
    </span>
  );
}

export function EmptyState({
  icon = 'inbox',
  title,
  desc,
}: {
  icon?: string;
  title: string;
  desc?: string;
}) {
  return (
    <div className="py-12 text-center">
      <span className="material-symbols-outlined text-4xl text-slate-300 mb-2 block">{icon}</span>
      <p className="text-slate-600 font-bold text-sm">{title}</p>
      {desc && <p className="text-slate-400 text-xs mt-1">{desc}</p>}
    </div>
  );
}

export function Panel({
  title,
  subtitle,
  children,
  accent,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  accent?: 'red' | 'emerald';
}) {
  const border =
    accent === 'red'
      ? 'border-l-4 border-l-red-400'
      : accent === 'emerald'
      ? 'border-l-4 border-l-emerald-500'
      : '';
  return (
    <div className={`bg-white border border-slate-200 rounded-2xl p-6 shadow-sm ${border}`}>
      <h3 className="font-bold text-slate-800">{title}</h3>
      {subtitle && <p className="text-xs text-slate-400 mt-1 mb-4">{subtitle}</p>}
      <div className={subtitle ? '' : 'mt-4'}>{children}</div>
    </div>
  );
}

export function BarList({
  items,
  emptyTitle,
  emptyDesc,
  color = 'emerald',
  labelMap,
}: {
  items: { label: string; count: number }[];
  emptyTitle: string;
  emptyDesc?: string;
  color?: 'emerald' | 'red';
  labelMap?: (label: string) => string;
}) {
  if (items.length === 0) {
    return <EmptyState title={emptyTitle} desc={emptyDesc} />;
  }
  const max = Math.max(...items.map((i) => i.count));
  const bar = color === 'red' ? 'bg-red-400' : 'bg-emerald-400';
  return (
    <div className="space-y-3">
      {items.slice(0, 10).map((item) => (
        <div key={item.label} className="flex items-center gap-3">
          <div className="w-40 text-xs font-medium text-slate-600 truncate text-right">
            {labelMap ? labelMap(item.label) : item.label}
          </div>
          <div className="flex-1 h-2.5 bg-slate-100 rounded-full overflow-hidden">
            <div
              className={`h-full ${bar} rounded-full`}
              style={{ width: `${(item.count / max) * 100}%` }}
            />
          </div>
          <div className="w-10 text-xs font-bold text-slate-800 text-right">{item.count}건</div>
        </div>
      ))}
    </div>
  );
}
