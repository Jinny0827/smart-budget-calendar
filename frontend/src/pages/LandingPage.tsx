import { Link } from 'react-router-dom';

function LandingPage() {
    return (
        <div className="min-h-screen bg-white">

            {/* 헤더 */}
            <header className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                <div className="flex items-center gap-2">
                    <span className="text-2xl">📅💰</span>
                    <span className="text-lg font-bold text-gray-800">Smart Budget Calendar</span>
                </div>
                <div className="flex items-center gap-3">
                    <Link
                        to="/login"
                        className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900"
                    >
                        로그인
                    </Link>
                    <Link
                        to="/register"
                        className="px-4 py-2 text-sm bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                    >
                        회원가입
                    </Link>
                </div>
            </header>

            {/* 히어로 섹션 */}
            <section className="flex flex-col items-center justify-center text-center px-6 py-24 bg-gradient-to-b from-blue-50 to-white">
                <h1 className="text-4xl font-bold text-gray-900 mb-4 leading-tight">
                    일정과 지출을 함께 관리하고<br />
                    <span className="text-blue-500">AI로 소비 패턴을 분석</span>하세요
                </h1>
                <p className="text-lg text-gray-500 mb-8 max-w-xl">
                    "왜 이 돈을 썼는가"를 파악하고, 개인화된 예산 추천을 받아보세요.
                </p>
                <div className="flex gap-3">
                    <Link
                        to="/register"
                        className="px-6 py-3 bg-blue-500 text-white font-medium rounded-lg hover:bg-blue-600 transition"
                    >
                        무료로 시작하기
                    </Link>
                    <Link
                        to="/login"
                        className="px-6 py-3 bg-white text-gray-700 font-medium rounded-lg border border-gray-300 hover:bg-gray-50 transition"
                    >
                        로그인
                    </Link>
                </div>
            </section>

            {/* 핵심 기능 */}
            <section className="px-6 py-20 max-w-5xl mx-auto">
                <h2 className="text-2xl font-bold text-center text-gray-800 mb-12">핵심 기능</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[
                        { icon: '📆', title: '일정·지출 연동', desc: '특정 일정에 지출을 매핑해 이벤트별 비용을 추적합니다.' },
                        { icon: '🤖', title: 'AI 소비 인사이트', desc: 'Llama 3.3 기반으로 소비 패턴을 분석하고 예산을 추천합니다.' },
                        { icon: '📊', title: '통계 대시보드', desc: '월별 요약과 카테고리별 지출 비중을 한눈에 확인합니다.' },
                        { icon: '💳', title: '카드 내역 임포트', desc: '엑셀 카드 명세서를 업로드하면 자동으로 파싱·등록됩니다.' },
                        { icon: '👥', title: '그룹 가계부', desc: '그룹을 만들어 일정·지출을 공유하고 함께 분석합니다.' },
                        { icon: '📈', title: '재무 분석', desc: '국내·미국 기업 재무제표, 주가, AI 인사이트와 내 포트폴리오를 한눈에 관리합니다.' },
                        { icon: '🔐', title: '2단계 인증', desc: 'Google Authenticator OTP로 계정을 안전하게 보호합니다.' },
                    ].map(({ icon, title, desc }) => (
                        <div key={title} className="bg-gray-50 rounded-xl p-6">
                            <span className="text-3xl">{icon}</span>
                            <h3 className="text-base font-semibold text-gray-800 mt-3 mb-2">{title}</h3>
                            <p className="text-sm text-gray-500">{desc}</p>
                        </div>
                    ))}
                </div>
            </section>

            {/* 재무 분석 소개 */}
            <section className="px-6 py-20 bg-gray-950">
                <div className="max-w-5xl mx-auto">
                    <div className="flex flex-col md:flex-row items-center gap-12">

                        {/* 텍스트 */}
                        <div className="flex-1">
                            <span className="text-blue-400 text-sm font-semibold uppercase tracking-widest">New Feature</span>
                            <h2 className="text-3xl font-bold text-white mt-2 mb-4 leading-tight">
                                기업 재무 분석부터<br />내 포트폴리오까지
                            </h2>
                            <p className="text-gray-400 mb-6 leading-relaxed">
                                국내(DART)·미국(SEC) 기업의 3개년 재무제표와 실시간 주가를 조회하고,
                                AI가 MZ식으로 분석해드립니다. 관심 종목과 보유 종목을 등록하면
                                포트폴리오 종합 인사이트도 받아볼 수 있습니다.
                            </p>
                            <div className="flex flex-wrap gap-2 mb-8">
                                {['3개년 재무제표', '실시간 주가', 'AI 종목 분석', '관심 종목', '보유 종목 수익률', '포트폴리오 인사이트'].map(tag => (
                                    <span key={tag} className="bg-gray-800 text-gray-300 text-xs px-3 py-1 rounded-full border border-gray-700">
                            {tag}
                        </span>
                                ))}
                            </div>
                            <Link
                                to="/register"
                                className="inline-block px-6 py-3 bg-blue-500 text-white font-semibold rounded-lg hover:bg-blue-600 transition"
                            >
                                시작하기
                            </Link>
                        </div>

                        {/* 미리보기 카드 */}
                        <div className="flex-1 w-full">
                            <div className="bg-gray-900 rounded-2xl p-5 border border-gray-800">
                                <div className="flex items-center justify-between mb-4">
                                    <span className="text-white font-semibold text-sm">삼성전자 분석</span>
                                    <span className="text-green-400 text-xs">▲ 2.4%</span>
                                </div>
                                <div className="grid grid-cols-3 gap-3 mb-4">
                                    {[
                                        { label: '매출', value: '300조' },
                                        { label: '영업이익', value: '32조' },
                                        { label: '순이익', value: '26조' },
                                    ].map(({ label, value }) => (
                                        <div key={label} className="bg-gray-800 rounded-lg p-3 text-center">
                                            <p className="text-gray-400 text-xs mb-1">{label}</p>
                                            <p className="text-white text-sm font-bold">{value}</p>
                                        </div>
                                    ))}
                                </div>
                                <div className="bg-gray-800 rounded-lg p-3 text-sm text-gray-300 leading-relaxed">
                                    <span className="text-blue-400 font-semibold">AI 인사이트</span><br />
                                    23년 어닝쇼크 맞았지만 24년 극적 반등.
                                    HBM 수혜 기대감에 거래량도 살아나는 중.
                                </div>
                                <div className="mt-3 flex gap-2">
                                    <div className="flex-1 bg-gray-800 rounded-lg p-3">
                                        <p className="text-gray-400 text-xs mb-1">관심 종목</p>
                                        <p className="text-white text-xs">삼성전자, 애플, 엔비디아</p>
                                    </div>
                                    <div className="flex-1 bg-gray-800 rounded-lg p-3">
                                        <p className="text-gray-400 text-xs mb-1">포트폴리오 수익률</p>
                                        <p className="text-green-400 text-xs font-bold">+12.4%</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                    </div>
                </div>
            </section>


            {/* CTA */}
            <section className="bg-blue-500 py-16 text-center px-6">
                <h2 className="text-2xl font-bold text-white mb-3">지금 바로 시작해보세요</h2>
                <p className="text-blue-100 mb-6">관리자 승인 후 모든 기능을 무료로 이용할 수 있습니다.</p>
                <Link
                    to="/register"
                    className="inline-block px-8 py-3 bg-white text-blue-500 font-semibold rounded-lg hover:bg-blue-50 transition"
                >
                    회원가입
                </Link>
            </section>

            {/* 푸터 */}
            <footer className="text-center py-6 text-sm text-gray-400 border-t border-gray-100">
                © 2026 Smart Budget Calendar · 개발자: 정원진
            </footer>

        </div>
    );
}

export default LandingPage;
