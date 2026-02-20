📅💰 Smart Budget Calendar (지출 연동 AI 스마트 가계부)
단순한 가계부를 넘어, 일정과 지출 데이터를 결합하고 AI를 통해 사용자에게 최적의 재정 인사이트를 제공하는 지능형 관리 시스템입니다.

🎯 프로젝트 핵심 가치
데이터 결합: 일정과 지출을 하나의 타임라인에서 관리하여 소비의 이유(이벤트)를 파악합니다.

AI 분석: Gemini, Groq 등의 LLM을 활용하여 개인화된 소비 패턴 분석 및 예산을 추천합니다.

자동화: 카드 내역 파싱 및 공휴일 연동을 통해 데이터 입력의 번거로움을 최소화합니다.

🛠️ 확장된 기술 스택
Frontend
Framework: React 19 + TypeScript

Routing: React Router 7

Visualization: Recharts (통계), React Big Calendar (일정/지출 시각화)

Styling: Tailwind CSS

Backend
Runtime: Node.js (Express.js) + TypeScript

Database: MongoDB Atlas (Mongoose ODM)

Auth: JWT (JSON Web Token) + bcryptjs

AI & External Services
LLM Engines: Google Gemini API, Groq Cloud API

External Data: 공휴일 정보 API 연동, Excel/Text 기반 카드 내역 파서

✨ 실제 구현된 주요 기능
1. 지능형 일정 및 지출 관리
   연동 관리: 특정 일정(scheduleId)과 지출 내역을 매핑하여 해당 이벤트에서 발생한 비용을 추적합니다.

반복 패턴 분석: 주기적으로 발생하는 일정과 그에 따른 고정 지출 패턴을 식별합니다.

공휴일 자동 반영: 외부 API를 통해 공휴일 정보를 가져와 캘린더에 자동 표시합니다.

2. AI 기반 인사이트 (/services/ai-service.ts)
   멀티 엔진 분석: 설정에 따라 Gemini 또는 Groq를 선택하여 소비 리포트를 생성합니다.

이상 지출 탐지: 표준편차 기반 로직으로 평소보다 과도한 지출이 발생했을 때 알림을 제공합니다.

맞춤형 예산 추천: 유사한 과거 일정의 데이터를 분석하여 향후 일정에 적합한 예산을 제안합니다.

3. 데이터 편의 기능
   카드 내역 임포트: 엑셀 파일(xlsx)이나 카드 결제 문자를 파싱하여 지출 내역을 일괄 등록합니다.

통계 대시보드: 월별 지출 요약, 카테고리별 비중 등을 시각화하여 제공합니다.

📁 프로젝트 구조 (Actual)
Plaintext
smart-budget-calendar/
├── backend/
│   ├── src/
│   │   ├── controllers/    # auth, expense, holiday, import, insight, schedule
│   │   ├── models/         # User, Schedule, Expense, InsightCache
│   │   ├── services/       # AI(Gemini, Groq), Card Import, Holiday 연동 로직
│   │   └── middleware/     # JWT 인증 및 에러 핸들링
├── frontend/
│   ├── src/
│   │   ├── pages/          # Dashboard, Schedules, Expenses, Auth
│   │   ├── services/       # API 클라이언트 (Axios 기반)
│   │   └── types/          # 공통 TypeScript 인터페이스
└── README.md
🚀 시작하기
환경 변수 설정 (.env)
백엔드 루트에 .env 파일을 생성하고 다음 항목을 설정해야 합니다:

MONGODB_URI: MongoDB 연결 문자열

JWT_SECRET: 토큰 암호화 키

GEMINI_API_KEY 또는 GROQ_API_KEY: AI 분석용 키

설치 및 실행
Bash
# Backend
cd backend && npm install && npm run dev

# Frontend
cd frontend && npm install && npm run dev
👤 개발자
GitHub: @Jinny0827