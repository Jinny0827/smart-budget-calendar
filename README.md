# 📅💰 Smart Budget Calendar

일정과 지출을 연동한 AI 기반 스마트 가계부

## 🎯 프로젝트 소개

일정 등록 시 과거 유사 일정의 지출 패턴을 분석하여 예산을 추천하고,
소비 패턴을 학습하여 재정 관리를 돕는 스마트 가계부 애플리케이션입니다.

## 🛠️ 기술 스택

### Frontend
- **React 18** + **TypeScript**
- **Vite** (빌드 도구)
- **Tailwind CSS** (스타일링)
- **React Router** (라우팅)
- **Axios** (API 통신)
- **Recharts** (차트/통계)

### Backend
- **Node.js** + **Express.js**
- **TypeScript**
- **MongoDB Atlas** (데이터베이스)
- **Mongoose** (ODM)
- **JWT** (인증)

### Infrastructure (예정)
- AWS Lambda (서버리스)
- API Gateway
- S3 + CloudFront (정적 호스팅)

### AI
- 룰 기반 통계 분석 (현재 구현)
- OpenClaw 로컬 AI (확장 예정)

## ✨ 구현된 기능

### 백엔드 API
- ✅ JWT 인증 (회원가입 / 로그인 / 내정보)
- ✅ 일정 CRUD (`/api/schedules`)
- ✅ 일정 반복 패턴 조회 (`/api/schedules/patterns`)
- ✅ 지출 CRUD + 카테고리 필터 (`/api/expenses`)
- ✅ 지출 통계 집계 (`/api/expenses/stats`)
- ✅ AI 인사이트 분석 (`/api/insights`)
    - 이상 지출 탐지 (표준편차 기반)
    - 예산 추천 (과거 유사 일정 평균)
    - 소비 패턴 분석 (전월 대비)
    - 미계획 고액 지출 알림

### 프론트엔드
- ✅ 로그인 / 회원가입 페이지
- ✅ 대시보드 (이번 달 지출 요약, AI 인사이트 카드)
- ✅ 일정 관리 페이지 (CRUD + 반복 일정 설정)
- ✅ 지출 관리 페이지 (CRUD + 카테고리 필터 + 일정 연동)

## 🔜 개발 예정

- [ ] Recharts 차트 시각화 (대시보드)
- [ ] OpenClaw 연동
- [ ] AWS Lambda 배포
- [ ] CI/CD 파이프라인

## 📁 프로젝트 구조

```
smart-budget-calendar/
├── backend/
│   └── src/
│       ├── config/         # DB 연결
│       ├── controllers/    # auth / schedule / expense / insight
│       ├── models/         # User / Schedule / Expense
│       ├── routes/         # API 라우터
│       ├── services/
│       │   └── ai-service.ts   # 룰 기반 AI 분석
│       ├── middleware/     # JWT 인증
│       ├── utils/
│       └── index.ts
│
├── frontend/
│   └── src/
│       ├── pages/          # Dashboard / Schedules / Expenses / Login / Register
│       ├── services/       # auth / schedule / expense / insight service
│       ├── types/          # TypeScript 인터페이스
│       └── App.tsx
│
└── README.md
```

## 🚀 실행 방법

### 백엔드
```bash
cd backend
npm install
# .env 파일 설정 (MONGODB_URI, JWT_SECRET 등)
npm run dev
```

### 프론트엔드
```bash
cd frontend
npm install
npm run dev
```

## 📝 API 엔드포인트

| Method | Path | 설명 |
|--------|------|------|
| POST | /api/auth/register | 회원가입 |
| POST | /api/auth/login | 로그인 |
| GET | /api/schedules | 일정 목록 |
| GET | /api/schedules/patterns | 반복 패턴 조회 |
| POST | /api/schedules | 일정 생성 |
| PUT | /api/schedules/:id | 일정 수정 |
| DELETE | /api/schedules/:id | 일정 삭제 |
| GET | /api/expenses | 지출 목록 |
| GET | /api/expenses/stats | 지출 통계 |
| POST | /api/expenses | 지출 생성 |
| PUT | /api/expenses/:id | 지출 수정 |
| DELETE | /api/expenses/:id | 지출 삭제 |
| GET | /api/insights | AI 인사이트 조회 |
| POST | /api/insights/analyze | 수동 분석 트리거 |
| GET | /api/insights/budget/:scheduleId | 일정별 예산 추천 |

## 👤 개발자

- GitHub: [@Jinny0827](https://github.com/Jinny0827)