import SpaceBrowser from '../../components/SpaceBrowser';

/**
 * 공간 안내 (/spaces).
 *
 * 목록 본체는 홈과 같은 SpaceBrowser 를 쓴다. 홈에 이미 같은 목록이 있으므로
 * 네비게이션 메뉴에서는 빼 두었지만, 카테고리 링크·기존 북마크·구 /filter
 * 리다이렉트가 이 주소로 들어오므로 화면 자체는 유지한다.
 */
export default function UserSpaces() {
  return (
    <div className="bg-slate-50 min-h-[calc(100vh-80px)] pb-20">
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">공간 안내</h1>
          <p className="text-slate-500 mt-2">원하는 공간을 찾아 바로 예약을 신청하세요.</p>
        </div>
        <SpaceBrowser />
      </div>
    </div>
  );
}
