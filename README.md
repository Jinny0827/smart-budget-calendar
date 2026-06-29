# 📅💰 Smart Budget Calendar

AI가 소비 패턴을 분석하고 예산을 추천해주는 스마트 가계부 서비스입니다.  
일정과 지출을 연결하여 관리하고, LLM 기반 인사이트로 소비 습관을 개선할 수 있습니다.

🌐 **서비스 URL**: [budget.bowling-manager.com](https://budget.bowling-manager.com)

---

## 📌 주요 기능

- **일정 & 지출 통합 관리**: 일정에 지출을 연결하여 이벤트 단위 소비 추적
- **카드 내역 임포트**: 삼성카드 xlsx 파일 업로드로 지출 자동 등록
- **AI 인사이트**: Groq / Gemini LLM 기반 소비 패턴 분석 및 예산 추천
  - 이상 지출 감지 (표준편차 × 2 초과)
  - 과거 유사 일정 기반 예산 추천
  - 전월 대비 소비 패턴 분석
  - 미연결 고액 지출 탐지
- **통계 시각화**: Recharts 기반 카테고리별 / 월별 지출 차트
- **공휴일 연동**: 공공데이터포털 API 기반 공휴일 자동 표시
- **JWT 인증**: 회원가입 / 로그인 기반 개인 데이터 관리

---

## 🏗️ 배포 아키텍처

```
사용자 브라우저
    ├─► budget.bowling-manager.com  ← 프론트엔드 (정적 호스팅)
    └─► AWS API Gateway (ap-northeast-2)
              └─► AWS Lambda (aws-serverless-express)
                        └─► MongoDB Atlas
```

---

## 🛠️ 기술 스택

### Frontend
| 분류 | 기술 |
|---|---|
| Framework | React 19 + TypeScript |
| Bundler | Vite |
| Routing | React Router 7 |
| Chart | Recharts |
| Calendar | react-big-calendar |
| Styling | Tailwind CSS |

### Backend
| 분류 | 기술 |
|---|---|
| Runtime | Node.js (Express 4) |
| Language | TypeScript |
| Database | MongoDB + Mongoose |
| Auth | JWT + bcryptjs |
| File Upload | Multer |
| Excel 파싱 | xlsx |
| Cloud | AWS Lambda (aws-serverless-express) |

---

## 🤖 AI 서비스 흐름

```
사용자 데이터 (지출 + 일정)
    ├─► 이상지출 탐지    → 표준편차 × 2 초과 시 high 우선순위
    ├─► 예산 추천        → 과거 유사 일정 평균 지출 기반
    ├─► 패턴 인사이트    → 전월 대비 소비 분석
    └─► 미연결 지출 탐지 → scheduleId 없는 고액 지출
           ↓
    InsightCache 조회 → 변경 없으면 캐시 반환 (TTL 1h)
           ↓ (캐시 미스 or 데이터 변경)
    LLM 선택:
    ├─► Google Gemini 2.0 Flash (1순위)
    └─► Groq Llama 3.3 70B (폴백)
           ↓
    InsightCache 저장 → 응답
```

---

## 📡 API 엔드포인트

| 분류 | Method | Path | 설명 |
|---|---|---|---|
| 인증 | POST | /api/auth/register | 회원가입 |
| 인증 | POST | /api/auth/login | 로그인 (JWT 발급) |
| 일정 | GET | /api/schedules | 일정 목록 조회 |
| 일정 | POST | /api/schedules | 일정 생성 |
| 지출 | GET | /api/expenses | 지출 목록 조회 |
| 지출 | GET | /api/expenses/stats | 카테고리/월별 통계 |
| AI | POST | /api/insights/analyze | AI 분석 트리거 |
| AI | GET | /api/insights/budget/:id | 일정별 예산 추천 |
| 임포트 | POST | /api/import/card | 카드 xlsx 업로드 |
| 공휴일 | GET | /api/holidays | 공휴일 목록 |

> 🔒 인증 엔드포인트 제외 전체 JWT 필요

---

## 🗃️ DB 스키마

```
User       email, password(bcrypt), name
Schedule   userId, title, date, category, expenses[], isRecurring, recurringPattern
Expense    userId, amount, category, date, type(income|expense), scheduleId?
InsightCache  userId(unique), insights[], analyzedAt, dataHash
```

---

## 🚀 로컬 실행

### Backend
```bash
cd backend
npm install
cp .env.example .env   # 환경변수 설정
npm run dev
```

### Frontend
```bash
cd frontend
npm install
cp .env.example .env.local
npm run dev
```

---

## 🔑 환경변수

### backend/.env
```env
PORT=5000
MONGODB_URI=your_mongodb_uri
JWT_SECRET=your_jwt_secret
JWT_EXPIRES_IN=7d
GEMINI_API_KEY=your_gemini_key
GROQ_API_KEY=your_groq_key
HOLIDAY_API_KEY=your_holiday_key
```

### frontend/.env
```env
VITE_API_URL=http://localhost:5000/api
```

---

## 📋 알려진 제한사항 / TODO

- [ ] 카드사 파서: 현재 삼성카드만 지원 → 국민/신한/현대카드 추가 예정
- [ ] 프론트엔드 상태관리: Zustand 도입 검토
- [ ] 단위 테스트 코드 추가 필요
