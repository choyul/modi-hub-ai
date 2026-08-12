import { useEffect, useState } from 'react';
import { Link } from 'react-router';

/**
 * 이미지 출처 (SP-09 부속).
 *
 * 카드·상세의 「예시 이미지」는 준공 전 임시로 쓰는 자유 이용 라이선스 사진이다.
 * CC BY 사진은 출처 표시가 의무이므로 여기에 원작자·라이선스·원본 링크를 밝힌다.
 * 실물 사진으로 교체되면 이 페이지는 자연히 비게 된다.
 */
const LICENSE_LABEL: Record<string, { name: string; url: string }> = {
  by: { name: 'CC BY 2.0', url: 'https://creativecommons.org/licenses/by/2.0/' },
  'by-sa': { name: 'CC BY-SA 2.0', url: 'https://creativecommons.org/licenses/by-sa/2.0/' },
  cc0: { name: 'CC0 (퍼블릭 도메인)', url: 'https://creativecommons.org/publicdomain/zero/1.0/' },
  pdm: { name: '퍼블릭 도메인', url: 'https://creativecommons.org/publicdomain/mark/1.0/' },
};

type Credit = {
  category: string;
  license: string | null;
  creator: string | null;
  source_page: string | null;
  image_url: string | null;
  title: string | null;
};

export default function Credits() {
  const [credits, setCredits] = useState<Record<string, Credit>>({});
  useEffect(() => {
    fetch('/spaces/CREDITS.json')
      .then((r) => r.json())
      .then(setCredits)
      .catch(() => setCredits({}));
  }, []);
  const items = Object.entries(credits) as [string, Credit][];

  return (
    <div className="bg-slate-50 min-h-[calc(100vh-80px)] pb-20">
      <div className="max-w-3xl mx-auto px-6 py-12">
        <Link to="/spaces" className="text-sm font-bold text-slate-500 hover:text-slate-800">
          ← 공간 안내로
        </Link>
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight mt-4 mb-2">이미지 출처</h1>
        <p className="text-slate-500 mb-8 leading-relaxed">
          공간 카드에 보이는 사진은 <b className="text-slate-700">준공 전 임시로 쓰는 용도별 예시 이미지</b>로,
          실제 봉화 공간 사진이 아닙니다. 모두 자유 이용 라이선스(CC BY·CC0) 사진이며,
          원작자와 출처를 아래에 밝힙니다. 준공 후 실물 사진으로 교체됩니다.
        </p>

        <div className="bg-white border border-slate-200 rounded-2xl divide-y divide-slate-100 overflow-hidden">
          {items.map(([slug, c]) => {
            const lic = c.license ? LICENSE_LABEL[c.license] : null;
            return (
              <div key={slug} className="flex items-center gap-4 px-5 py-4">
                <img
                  src={`/spaces/${slug}.jpg`}
                  alt=""
                  className="w-20 h-14 object-cover rounded-lg shrink-0 bg-slate-100"
                />
                <div className="min-w-0 flex-1">
                  <div className="font-bold text-slate-800 text-sm">{c.category}</div>
                  <div className="text-xs text-slate-500 truncate">
                    {c.title || '(제목 없음)'}
                    {c.creator && <> · {c.creator}</>}
                  </div>
                  <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1 text-[11px]">
                    {lic && (
                      <a href={lic.url} target="_blank" rel="noreferrer"
                        className="text-indigo-600 hover:underline font-medium">
                        {lic.name}
                      </a>
                    )}
                    {c.source_page && (
                      <a href={c.source_page} target="_blank" rel="noreferrer"
                        className="text-slate-400 hover:text-slate-600 hover:underline">
                        원본 보기 ↗
                      </a>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <p className="text-xs text-slate-400 mt-6 leading-relaxed">
          출처는 Openverse(openverse.org)를 통해 확인한 CC BY·CC0 이미지입니다. CC BY 사진은
          라이선스에 따라 원작자와 출처를 표시했습니다. 이미지에 대한 문의는 도시재생팀으로 연락 주세요.
        </p>
      </div>
    </div>
  );
}
