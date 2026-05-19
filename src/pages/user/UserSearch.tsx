import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router';
import spacesData from '../../data/spaces.json';
import { getCategoryImageUrl } from './UserSpaces';
import { useAuth } from '../../contexts/AuthContext';

interface RecommendedSpace {
  id: string;
  matchScore: number;
  reasoning: string;
}

interface ApiResponse {
  recommendedSpaces: RecommendedSpace[];
  suggestedFollowUps: string[];
}

export default function UserSearch() {
  const [searchParams] = useSearchParams();
  const query = searchParams.get('q') || '';
  const navigate = useNavigate();
  const { isLoggedIn } = useAuth();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ApiResponse | null>(null);

  useEffect(() => {
    if (!query) {
      navigate('/');
      return;
    }

    const fetchRecommendations = async () => {
      setLoading(true);
      setError(null);
      try {
        const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
        if (!API_KEY) {
          throw new Error("Gemini API Key가 설정되지 않았습니다.");
        }

        const lightweightSpaces = spacesData.spaces.map(s => ({
          id: s.id,
          name: s.name,
          category: s.category,
          capacity: `${s.capacity_min}~${s.capacity_max}명`,
          specialty: s.specialty || ''
        }));

        const prompt = `사용자의 다음 요청에 가장 적합한 거점 시설 공간을 최대 3개 추천해주세요.
요청: "${query}"

제공되는 공간 데이터:
${JSON.stringify({ spaces: lightweightSpaces }, null, 2)}

응답은 반드시 아래 JSON 형식으로만 해주세요:
{
  "recommendedSpaces": [
    {
      "id": "공간ID",
      "matchScore": 85,
      "reasoning": "추천 이유 (1-2문장)"
    }
  ],
  "suggestedFollowUps": [
    "추가로 제안할만한 관련 질문 1",
    "추가로 제안할만한 관련 질문 2"
  ]
}`;

        const response = await fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=" + API_KEY, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { 
              response_mime_type: "application/json",
              maxOutputTokens: 800
            }
          })
        });

        if (!response.ok) {
          if (response.status === 429) {
            setError('잠시 후 다시 시도해주세요 (AI 요청이 일시적으로 많아졌습니다)');
            setTimeout(() => {
              if (window.location.pathname.includes('/search')) {
                fetchRecommendations();
              }
            }, 3000);
            return; // Skip json parsing and finally block handles loading
          }
          throw new Error('데이터를 불러오는데 실패했습니다.');
        }

        const data = await response.json();
        const textResponse = data.candidates[0].content.parts[0].text;
        const parsedData: ApiResponse = JSON.parse(textResponse);
        setResult(parsedData);
      } catch (err: any) {
        setError(err.message || '오류가 발생했습니다.');
      } finally {
        setLoading(false);
      }
    };

    fetchRecommendations();
  }, [query, navigate]);

  return (
    <div className="bg-slate-50 min-h-[calc(100vh-80px)] pb-20">
      {/* Search Header */}
      <div className="bg-indigo-900 text-white py-12 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-3 text-indigo-300 mb-4">
            <span className="material-symbols-outlined text-indigo-400">auto_awesome</span>
            <span className="font-semibold text-sm tracking-wide">AI 추천 분석 중...</span>
          </div>
          <h1 className="text-3xl font-bold leading-relaxed tracking-tight">"{query}"</h1>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 -mt-8">
        {loading && (
          <div className="bg-white p-12 rounded-2xl shadow-sm border border-slate-200 text-center flex flex-col items-center justify-center space-y-4">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-slate-100 border-t-indigo-600"></div>
            <p className="text-slate-500 font-medium">MODI Hub의 30개 공간을 검색 중입니다...</p>
          </div>
        )}

        {error && (
          <div className="bg-white p-8 rounded-2xl shadow-sm border border-red-200 flex flex-col items-center justify-center">
            <span className="material-symbols-outlined text-4xl text-red-500 mb-4">error</span>
            <h2 className="text-lg font-bold mb-2">오류가 발생했습니다</h2>
            <p className="text-slate-500">{error}</p>
            <button onClick={() => navigate('/')} className="mt-6 px-6 py-2 bg-slate-900 text-white rounded-lg">돌아가기</button>
          </div>
        )}

        {result && !loading && !error && (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-indigo-200">
              <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                <span className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center">
                  <span className="material-symbols-outlined text-sm">check</span>
                </span>
                가장 추천하는 공간입니다
              </h2>

              <div className="space-y-6">
                {result.recommendedSpaces.length > 0 && (() => {
                  const rec = result.recommendedSpaces[0];
                  const spaceInfo = spacesData.spaces.find(s => s.id === rec.id);
                  if (!spaceInfo) return null;

                  return (
                    <div key={rec.id} className="relative border border-slate-200 rounded-xl overflow-hidden group hover:border-indigo-300 transition-colors bg-slate-50/50">
                      <div className="absolute top-4 right-4 bg-indigo-600 text-white px-3 py-1 rounded-full text-xs font-bold font-mono z-10 shadow-sm border border-indigo-700">
                        BEST MATCH {rec.matchScore}%
                      </div>
                      
                      <div className="md:flex">
                        <div className="md:w-1/3 bg-slate-200 h-48 md:h-auto relative overflow-hidden flex items-center justify-center">
                          <img src={getCategoryImageUrl(spaceInfo.category)} alt={spaceInfo.name} className="w-full h-full object-cover" />
                          <div className="absolute bottom-2 left-2 flex gap-1">
                            <span className="px-2 py-0.5 bg-black/50 text-white text-[10px] rounded backdrop-blur-sm">{spaceInfo.facility}</span>
                            <span className="px-2 py-0.5 bg-black/50 text-white text-[10px] rounded backdrop-blur-sm">{spaceInfo.floor}</span>
                          </div>
                        </div>
                        
                        <div className="p-6 md:w-2/3 flex flex-col justify-between bg-white relative">
                          <div>
                            <div className="text-xs font-bold text-indigo-600 mb-1">{spaceInfo.category}</div>
                            <h3 className="text-2xl font-bold text-slate-900 mb-2">{spaceInfo.name}</h3>
                            
                            <div className="bg-indigo-50 rounded-lg p-3 my-4">
                              <p className="text-sm text-slate-700 leading-relaxed font-medium">
                                <span className="font-bold text-indigo-700 mr-2">AI 분석:</span>
                                {rec.reasoning}
                              </p>
                            </div>

                            <div className="grid grid-cols-2 gap-y-2 mt-4">
                              <div className="flex items-center gap-2 text-sm text-slate-600">
                                <span className="material-symbols-outlined text-[18px] text-slate-400">group</span>
                                {spaceInfo.capacity_min} ~ {spaceInfo.capacity_max}명
                              </div>
                              <div className="flex items-center gap-2 text-sm text-slate-600">
                                <span className="material-symbols-outlined text-[18px] text-slate-400">payments</span>
                                {spaceInfo.fee_per_hour ? `${spaceInfo.fee_per_hour.toLocaleString()}원/시간` : spaceInfo.fee_per_night ? `${spaceInfo.fee_per_night.toLocaleString()}원/1박` : '무료'}
                              </div>
                            </div>
                            
                            <div className="mt-4 flex flex-wrap gap-1">
                              {spaceInfo.features.map(f => (
                                <span key={f} className="px-2 py-1 bg-slate-100 text-slate-600 text-[11px] rounded-full">{f}</span>
                              ))}
                            </div>
                          </div>
                          
                          <div className="mt-6 flex gap-2">
                            <button 
                              onClick={() => {
                                if (!isLoggedIn) {
                                  alert("예약하려면 로그인이 필요합니다.");
                                  navigate("/login");
                                } else {
                                  alert("예정 모달: 예약 확인 화면이 표시됩니다.");
                                }
                              }}
                              className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white py-2.5 rounded-lg font-bold text-sm transition-colors shadow-sm"
                            >
                              예약 신청
                            </button>
                            <button className="px-4 border border-slate-200 hover:bg-slate-50 text-slate-600 py-2.5 rounded-lg font-bold text-sm transition-colors flex items-center justify-center">
                              <span className="material-symbols-outlined text-[18px]">info</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* Additional Recommendations */}
                {result.recommendedSpaces.length > 1 && (
                  <div className="mt-8">
                    <h3 className="text-lg font-bold text-slate-900 mb-4 pt-4 border-t border-slate-100">이런 공간도 고려해보세요</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {result.recommendedSpaces.slice(1).map((rec) => {
                        const spaceInfo = spacesData.spaces.find(s => s.id === rec.id);
                        if (!spaceInfo) return null;

                        return (
                          <div key={rec.id} className="relative border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm flex flex-col group hover:border-indigo-200 hover:shadow-md transition-all">
                            <div className="h-36 relative overflow-hidden bg-slate-100">
                              <img src={getCategoryImageUrl(spaceInfo.category)} alt={spaceInfo.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                              <div className="absolute top-2 right-2 bg-white/90 text-indigo-700 px-2 py-0.5 rounded text-[10px] font-bold shadow-sm">
                                매칭 {rec.matchScore}%
                              </div>
                              <div className="absolute bottom-2 left-2 flex gap-1">
                                <span className="px-1.5 py-0.5 bg-black/50 text-white text-[10px] rounded backdrop-blur-sm">{spaceInfo.facility}</span>
                              </div>
                            </div>
                            <div className="p-4 flex-1 flex flex-col">
                              <div className="text-[10px] font-bold text-indigo-600 mb-1">{spaceInfo.category}</div>
                              <h4 className="text-md font-bold text-slate-900 mb-2">{spaceInfo.name}</h4>
                              <p className="text-xs text-slate-600 mb-3 line-clamp-2 bg-slate-50 p-2 rounded flex-1">
                                <span className="font-semibold text-indigo-600 mr-1">AI:</span>
                                {rec.reasoning}
                              </p>
                              <div className="mt-auto pt-3 border-t border-slate-100 flex justify-between items-center text-xs">
                                <span className="text-slate-500">{spaceInfo.capacity_max}명 수용</span>
                                <button className="text-indigo-600 font-bold hover:underline">상세보기</button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Follow-up suggestions */}
            {result.suggestedFollowUps && result.suggestedFollowUps.length > 0 && (
              <div className="bg-slate-100 p-6 rounded-2xl">
                <h3 className="text-sm font-bold text-slate-500 mb-4 px-2">이런 질문은 어떠세요?</h3>
                <div className="flex flex-col sm:flex-row gap-2">
                  {result.suggestedFollowUps.map((suggestion, idx) => (
                    <button 
                      key={idx}
                      onClick={() => navigate(`/search?q=${encodeURIComponent(suggestion)}`)}
                      className="text-left px-5 py-3 bg-white hover:bg-indigo-50 rounded-xl shadow-sm text-sm font-medium text-slate-700 transition-colors flex items-center justify-between group"
                    >
                      {suggestion}
                      <span className="material-symbols-outlined text-[16px] text-slate-300 group-hover:text-indigo-500 transition-colors">arrow_outward</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
