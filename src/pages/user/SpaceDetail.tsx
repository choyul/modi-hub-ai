import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router';
import {
  findSpace, capacityLabel, feeLabel, leadDaysLabel, bookingOf, canApply,
} from '../../lib/space';
import SpacePhoto from '../../components/SpacePhoto';

/**
 * 공간 상세 (SP-01) — 죽어 있던 「상세보기」 31장의 목적지.
 * 예약 채널 4분기(BK-08)가 이 화면에서 갈라진다:
 *   self+live → 신청 / ota+pending → 개관 알림(UD-08) / ota+live → OTA 이동(BK-09)
 *   phone → 연락처 안내 / unknown → 확인 필요 (부서 경계의 실물 증거)
 */
export default function SpaceDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const space = id ? findSpace(id) : undefined;

  const [notifyContact, setNotifyContact] = useState('');
  const [notifyState, setNotifyState] = useState<'idle' | 'sending' | 'done'>('idle');
  const [reportOpen, setReportOpen] = useState(false);
  const [reportNote, setReportNote] = useState('');
  const [reportDone, setReportDone] = useState(false);

  if (!space) {
    return (
      <div className="bg-slate-50 min-h-[calc(100vh-80px)] flex items-center justify-center px-6">
        <div className="text-center">
          <p className="font-bold text-slate-800 mb-2">해당 공간을 찾을 수 없습니다</p>
          <Link to="/spaces" className="text-indigo-600 font-bold text-sm">전체 공간 보기</Link>
        </div>
      </div>
    );
  }

  const b = bookingOf(space);

  async function requestNotify() {
    if (!space) return;
    setNotifyState('sending');
    try {
      const res = await fetch('/api/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ spaceId: space.id, contact: notifyContact }),
      });
      if (!res.ok) throw new Error((await res.json())?.error);
      setNotifyState('done');
    } catch (e: any) {
      setNotifyState('idle');
      alert(e.message || '신청에 실패했습니다.');
    }
  }

  async function sendReport() {
    if (!space) return;
    await fetch('/api/feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        rawQuery: `공간 정보 오류 신고: ${space.name}`,
        spaceId: space.id,
        reason: 'report',
        note: reportNote,
      }),
    }).catch(() => {});
    setReportDone(true);
    setReportOpen(false);
  }

  const specs: [string, string][] = [
    ['수용 인원', capacityLabel(space)],
    ['이용료', feeLabel(space)],
    ['면적', space.area_sqm != null ? `${space.area_sqm}㎡` : '확인 필요'],
    ['신청 시기', leadDaysLabel(space)],
    ['위치', (space as any).location ?? '확인 필요'],
    ['소관', (space as any).owner_dept ?? '확인 필요'],
    ['예약 방법', space.reservation_method ?? '확인 필요'],
    ['연락처', space.contact ?? '확인 필요'],
  ];

  return (
    <div className="bg-slate-50 min-h-[calc(100vh-80px)] pb-20">
      <div className="max-w-4xl mx-auto px-6 py-10">
        <button
          onClick={() => navigate(-1)}
          className="mb-5 text-sm font-bold text-slate-500 hover:text-slate-800 flex items-center gap-1"
        >
          <span className="material-symbols-outlined text-[18px]" aria-hidden="true">arrow_back</span>
          돌아가기
        </button>

        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          <SpacePhoto category={space.category} spaceId={space.id} className="h-52 w-full" />

          <div className="p-6 md:p-8">
            {/* 신뢰층 헤더 (SP-04~06 · SP-10 · LG-08) */}
            <div className="flex flex-wrap items-center gap-2 mb-3 text-[12px]">
              <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded font-bold">
                {space.facility} · {space.floor}
              </span>
              <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded">{space.category}</span>
            </div>

            <h1 className="text-3xl font-bold text-slate-900 tracking-tight mb-2">{space.name}</h1>
            {space.specialty && <p className="text-slate-500 mb-5">{space.specialty}</p>}

            {/* 스펙 표 */}
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 border border-slate-200 rounded-xl divide-y sm:divide-y-0 divide-slate-100 mb-4 overflow-hidden">
              {specs.map(([k, v]) => (
                <div key={k} className="flex px-4 py-2.5 text-sm border-b border-slate-100 last:border-b-0 sm:border-b">
                  <dt className="w-24 shrink-0 text-slate-400">{k}</dt>
                  <dd className={`font-medium ${v === '확인 필요' ? 'text-amber-600' : 'text-slate-800'}`}>{v}</dd>
                </div>
              ))}
            </dl>

            <div className="flex flex-wrap gap-1 mb-6">
              {space.features.map((f) => (
                <span key={f} className="px-2 py-1 bg-slate-100 text-slate-600 text-[11px] rounded-full">{f}</span>
              ))}
            </div>

            {/* ── 예약 채널 분기 (BK-08) ───────────────────────── */}
            {canApply(space) && (
              <button
                onClick={() => navigate(`/reservations?apply=${space.id}`)}
                className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-sm shadow-sm"
              >
                예약 신청하기
                <span className="font-normal text-indigo-200 ml-1 text-xs">(담당자 승인 후 확정)</span>
              </button>
            )}

            {b.channel === 'self' && !canApply(space) && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-5">
                <p className="text-sm font-bold text-amber-900 mb-1">대관 신청을 곧 열 예정입니다</p>
                <p className="text-[13px] text-amber-800">
                  다목적 대관 공간입니다. 정원·대관료 등 이용 조건이 확정되면 이 화면에서
                  온라인 신청이 열립니다. 급하신 경우 {(space as any).owner_dept ?? '조합 사무국'}으로
                  문의해 주세요.
                </p>
              </div>
            )}

            {b.channel === 'ota' && b.status === 'pending' && (
              <div className="rounded-xl border-2 border-indigo-100 bg-indigo-50/50 p-5">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="px-2 py-0.5 bg-indigo-600 text-white text-[10px] font-bold rounded">외부 예약</span>
                  <span className="text-sm font-bold text-slate-800">개관 준비 중입니다</span>
                </div>
                <p className="text-[13px] text-slate-600 mb-1">
                  개관({b.openFrom ?? '일정 확정 전'}) 후 <b>{b.plannedChannels.join(' · ')}</b>에서
                  예약하실 수 있습니다.
                </p>
                <p className="text-[12px] text-slate-400 mb-4">
                  표시된 요금은 준공 전 계획값이며, 실제 요금·예약은 개관 후 예약 사이트 기준입니다.
                </p>

                {notifyState === 'done' ? (
                  <div className="flex items-center gap-2 text-sm font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-lg px-3 py-2.5">
                    <span className="material-symbols-outlined text-[18px]" aria-hidden="true">check_circle</span>
                    개관하면 알려드릴게요. 신청이 접수됐습니다.
                  </div>
                ) : (
                  <div className="flex flex-col sm:flex-row gap-2">
                    <label htmlFor="notify-contact" className="sr-only">연락받으실 번호 또는 이메일</label>
                    <input
                      id="notify-contact"
                      type="text"
                      value={notifyContact}
                      onChange={(e) => setNotifyContact(e.target.value)}
                      placeholder="휴대폰 번호 또는 이메일"
                      className="flex-1 px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-indigo-500"
                    />
                    <button
                      onClick={requestNotify}
                      disabled={notifyState === 'sending' || !notifyContact.trim()}
                      className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white rounded-xl font-bold text-sm whitespace-nowrap"
                    >
                      개관하면 알려주세요
                    </button>
                  </div>
                )}
              </div>
            )}

            {b.channel === 'ota' && b.status === 'live' && (
              <div className="rounded-xl border border-slate-200 p-5">
                <p className="text-sm font-bold text-slate-800 mb-1">외부 예약 사이트에서 예약합니다</p>
                <p className="text-[12px] text-slate-400 mb-3">
                  버튼을 누르면 해당 사이트가 새 탭으로 열립니다. 요금·잔여 객실은 그쪽 기준입니다.
                </p>
                <div className="flex flex-wrap gap-2">
                  {b.links.map((l) => (
                    <a
                      key={l.name} href={l.url} target="_blank" rel="noopener noreferrer"
                      className="px-4 py-2.5 border border-slate-300 rounded-xl text-sm font-bold text-slate-700 hover:bg-slate-50"
                    >
                      {l.name}로 이동 ↗
                    </a>
                  ))}
                </div>
              </div>
            )}

            {b.channel === 'phone' && (
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-5 text-sm text-slate-700">
                <b>이용 안내</b>{' '}
                {space.reservation_method ??
                  space.contact ??
                  `${(space as any).owner_dept ?? '소관 부서'}로 문의해 주세요.`}
              </div>
            )}

            {b.channel === 'unknown' && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-5">
                <p className="text-sm font-bold text-amber-900 mb-1">온라인 신청을 아직 열 수 없는 공간입니다</p>
                <p className="text-[13px] text-amber-800">
                  {(space as any).owner_dept ?? '소관 부서'} 소관으로, 이용 조건과 신청 절차가
                  확인되지 않았습니다. 확인되는 대로 이 화면에서 신청이 열립니다.
                </p>
              </div>
            )}

            {/* 오류 신고 (PL-14) */}
            <div className="mt-6 pt-5 border-t border-slate-100">
              {reportDone ? (
                <p className="text-[13px] text-emerald-700 font-bold">
                  알려주셔서 감사합니다. 담당자가 확인 후 바로잡겠습니다.
                </p>
              ) : reportOpen ? (
                <div className="flex flex-col sm:flex-row gap-2">
                  <label htmlFor="report-note" className="sr-only">어떤 정보가 틀렸나요</label>
                  <input
                    id="report-note"
                    type="text"
                    value={reportNote}
                    onChange={(e) => setReportNote(e.target.value)}
                    placeholder="어떤 정보가 틀렸나요? (예: 이용료가 다릅니다)"
                    className="flex-1 px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-indigo-500"
                  />
                  <button
                    onClick={sendReport}
                    disabled={!reportNote.trim()}
                    className="px-4 py-2.5 bg-slate-900 disabled:bg-slate-300 text-white rounded-xl text-sm font-bold whitespace-nowrap"
                  >
                    보내기
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setReportOpen(true)}
                  className="text-[13px] font-bold text-slate-400 hover:text-slate-600 flex items-center gap-1"
                >
                  <span className="material-symbols-outlined text-[16px]" aria-hidden="true">flag</span>
                  이 정보가 틀렸나요?
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
