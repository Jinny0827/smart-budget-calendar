# 📅💰 Smart Budget Calendar

> 일정과 지출을 연동하여 **"왜 이 돈을 썼는가"** 를 파악하고, AI를 통해 개인화된 소비 패턴 분석 및 예산을 추천하는 지능형 가계부 시스템

**배포 URL:** https://budget.bowling-manager.com

---

## 🎯 핵심 기능

| 기능 | 설명 |
|------|------|
| 📆 일정·지출 연동 | 특정 일정에 지출을 매핑하여 이벤트별 비용 추적 |
| 🤖 AI 인사이트 | Groq Llama 3.3 70B 기반 소비 패턴 분석·예산 추천 |
| 📊 통계 대시보드 | 월별 요약, 카테고리별 비중 시각화 (Recharts) |
| 💳 카드 내역 임포트 | 엑셀(.xlsx) 카드 명세서 자동 파싱·등록 |
| 🎌 공휴일 연동 | 공공데이터포탈 API로 한국 공휴일 자동 표시 |
| 👥 그룹 기능 | 그룹 생성·초대·참가, 일정·지출 공유, 통합 AI 인사이트 |
| 🔐 2단계 인증 | Google Authenticator OTP(TOTP) 기반 2FA 지원 |
| 🛡️ 관리자 기능 | 회원·그룹 승인/거절, 관리자 대시보드 |

---

## 🛠️ 기술 스택

**Frontend**
- React 19 + TypeScript / Vite
- React Router 7, Tailwind CSS
- Recharts (통계), React Big Calendar (일정)
- Axios (HTTP 클라이언트, JWT 인터셉터)

**Backend**
- Node.js + Express.js + TypeScript
- MongoDB Atlas (Mongoose ODM)
- JWT 인증 (jsonwebtoken + bcryptjs)
- speakeasy + qrcode (TOTP 2단계 인증)

**AI & 외부 서비스**
- Groq Llama 3.3 70B API (소비 패턴 분석)
- 공공데이터포탈 공휴일 API

**인프라 (AWS)**
- AWS Lambda + API Gateway (서울 리전, ap-northeast-2)
- AWS S3 (프론트엔드 정적 호스팅)
- AWS CloudFront (CDN + HTTPS)
- AWS ACM (SSL 인증서)
- AWS Route 53 (도메인 관리, budget.bowling-manager.com)
- AWS SAM CLI (백엔드 배포 자동화)

---

## 📁 프로젝트 구조

```
smart-budget-calendar/
├── backend/
│   └── src/
│       ├── controllers/    # auth, expense, holiday, import, insight, schedule, group, admin, user
│       ├── models/         # User, Schedule, Expense, InsightCache, Group
│       ├── routes/         # auth, schedule, expense, insight, holiday, import, group, admin, user
│       ├── services/       # AI, 카드 임포트, 공휴일 비즈니스 로직
│       ├── middleware/     # JWT 인증, 관리자 권한 검사
│       ├── utils/          # JWT 유틸
│       ├── config/         # DB 연결 설정
│       └── lambda.ts       # AWS Lambda 핸들러
└── frontend/
    └── src/
        ├── pages/          # Dashboard, Schedules, Expenses, Login, Register, Groups, Admin, Account
        ├── services/       # API 클라이언트 (Axios 기반, 9개 모듈)
        ├── components/     # 재사용 컴포넌트
        ├── hooks/          # 커스텀 훅
        └── types/          # 공통 TypeScript 인터페이스
```

---

## 🚀 시작하기

### 1. 환경변수 설정

`backend/.env` 파일 생성:

```env
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb+srv://<user>:<password>@cluster.mongodb.net/smart-budget
JWT_SECRET=<랜덤 시크릿 키>
JWT_EXPIRES_IN=7d
CORS_ORIGIN=http://localhost:5173
GROQ_API_KEY=<Groq Cloud 키>
HOLIDAY_API_KEY=<공공데이터포탈 인증키>
```

`frontend/.env` 파일 생성:

```env
VITE_API_URL=http://localhost:5000/api
```

### 2. 설치 및 실행

```bash
# Backend (포트 5000)
cd backend
npm install
npm run dev

# Frontend (포트 5173)
cd frontend
npm install
npm run dev
```

### 3. 프로덕션 빌드

```bash
cd backend && npm run build
cd frontend && npm run build
```

---

## 📡 API 구조

| 모듈 | Base Path | 주요 기능 |
|------|-----------|-----------|
| 인증 | `/api/auth` | 회원가입, 로그인, OTP 2FA |
| 일정 | `/api/schedules` | CRUD + 반복 패턴 조회 |
| 지출 | `/api/expenses` | CRUD + 카테고리별 통계 |
| 인사이트 | `/api/insights` | AI 분석 조회/트리거, 일정별 예산 추천 |
| 임포트 | `/api/import` | 카드 명세서 엑셀 파일 업로드 |
| 공휴일 | `/api/holidays` | 한국 공휴일 목록 |
| 그룹 | `/api/groups` | 그룹 CRUD, 초대, 참가, 멤버 관리 |
| 관리자 | `/api/admin` | 회원·그룹 승인/거절 |
| 사용자 | `/api/users` | 닉네임 변경, 비밀번호 변경 |

모든 인증이 필요한 엔드포인트는 `Authorization: Bearer <JWT>` 헤더 필요.

---

## 🗃️ 데이터 모델

**User** — 사용자 (`email, password, name, nickname, role, status, otpSecret, otpEnabled`)

**Schedule** — 일정 (`업무 | 개인 | 운동 | 여행 | 식사 | 쇼핑 | 기타`)

**Expense** — 지출/수입 (`식비 | 교통 | 쇼핑 | ... | 급여 | 부업 | ...`), `scheduleId`로 일정과 연결

**InsightCache** — AI 분석 결과 캐시 (1시간 TTL, 데이터 해시 기반 무효화)

**Group** — 그룹 (`name, leaderId, members[], settings, inviteCode, status`)

---

## 🏗️ 배포 방법

### 프론트엔드 (S3 + CloudFront)

```bash
cd frontend
npm run build
aws s3 sync dist/ s3://smart-budget-calendar
aws cloudfront create-invalidation --distribution-id <ID> --paths "/*"
```

### 백엔드 (AWS SAM)

```bash
cd backend
sam build
sam deploy
```

> `samconfig.toml`은 민감 정보가 포함되어 있어 `.gitignore`에 등록되어 있습니다.

---

## 🔜 차후 개발 계획

| 기능 | 설명 |
|------|------|
| 💬 그룹 채팅 | 그룹 내 실시간 단체 채팅 (WebSocket) |
| 📩 1:1 채팅 | 사용자 간 개인 메시지 기능 |
| 📋 게시판 | 공지사항 게시판 (관리자 작성), 자유게시판 (사용자 소통) |
| 📱 PWA 지원 | 모바일 앱처럼 설치·사용 가능하도록 PWA 적용 |
| 🔔 알림 기능 | 초대·승인·예산 초과 등 푸시 알림 |

---

## 👤 개발자

**정원진** — GitHub: [@Jinny0827](https://github.com/Jinny0827)
