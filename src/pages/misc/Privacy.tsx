/**
 * 개인정보 처리 안내 (PL-13).
 * 프로토타입 단계의 정직한 고지 — 정식 처리방침은 실운영 전 총무과 검토를 거친다.
 */
export default function Privacy() {
  return (
    <div className="bg-slate-50 min-h-[calc(100vh-80px)] pb-20">
      <div className="max-w-2xl mx-auto px-6 py-12">
        <h1 className="text-3xl font-bold text-slate-900 tracking-tight mb-2">개인정보 처리 안내</h1>
        <p className="text-sm text-slate-500 mb-8">
          이 서비스는 봉화군 도시재생팀이 운영하는 시범 서비스입니다. 무엇을 수집하고
          무엇을 수집하지 않는지 그대로 적습니다.
        </p>

        <div className="space-y-5 text-[15px] leading-relaxed text-slate-700">
          <section className="bg-white border border-slate-200 rounded-2xl p-6">
            <h2 className="font-bold text-slate-900 mb-2">수집하지 않는 것</h2>
            <ul className="list-disc pl-5 space-y-1 text-sm">
              <li>IP 주소, 위치 정보, 브라우저 정보</li>
              <li>검색만 하는 이용자의 어떤 개인정보도 수집하지 않습니다 (로그인 불필요)</li>
            </ul>
          </section>

          <section className="bg-white border border-slate-200 rounded-2xl p-6">
            <h2 className="font-bold text-slate-900 mb-2">수집하는 것과 이유</h2>
            <ul className="list-disc pl-5 space-y-1.5 text-sm">
              <li><b>검색 문장</b> — 봉화에 없는 공간 수요를 파악해 유휴공간 활용 계획에 씁니다.
                문장에 전화번호·이메일이 섞여 있으면 저장 전에 자동으로 지웁니다.</li>
              <li><b>알림 연락처</b>(선택) — 「이런 공간이 생기면 알려주세요」에 동의한 경우만.
                해당 안내 외 용도로 쓰지 않습니다.</li>
              <li><b>대관 신청 정보</b>(이메일 계정·이용일·인원·목적) — 담당자의 승인 연락에 씁니다.</li>
            </ul>
          </section>

          <section className="bg-white border border-slate-200 rounded-2xl p-6">
            <h2 className="font-bold text-slate-900 mb-2">보관과 열람</h2>
            <ul className="list-disc pl-5 space-y-1 text-sm">
              <li>기록은 종류별 최근 2,000건까지만 보관하며 오래된 것부터 삭제됩니다.</li>
              <li>연락처가 포함된 내용은 도시재생팀 담당자만 열람할 수 있습니다.</li>
              <li>삭제를 원하시면 봉화군 도시계획과 도시재생팀으로 연락해 주세요. 당일 처리합니다.</li>
            </ul>
          </section>

          <p className="text-xs text-slate-400">
            시범 운영 단계의 안내문입니다. 정식 개인정보 처리방침은 실운영 전에
            관계 부서 검토를 거쳐 게시합니다.
          </p>
        </div>
      </div>
    </div>
  );
}
