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

### AI (예정)
- OpenClaw (로컬 AI)
- 룰 기반 분석 → AI 모델로 확장

## ✨ 주요 기능

### 현재 구현
- ✅ 백엔드 기본 구조
- ✅ MongoDB Atlas 연결
- ✅ 데이터 모델 (User, Schedule, Expense)
- ✅ 프론트엔드 기본 구조

### 개발 예정
- 🔜 JWT 인증 시스템
- 🔜 일정 관리 (CRUD)
- 🔜 가계부 기능 (지출/수입 기록)
- 🔜 대시보드 (통계 시각화)
- 🔜 AI 분석
    - 일정 패턴 학습
    - 예산 추천
    - 소비 패턴 분석
    - 이상 지출 탐지

## 📁 프로젝트 구조
```
smart-budget-calendar/
├── backend/                # Express 백엔드
│   ├── src/
│   │   ├── models/        # Mongoose 모델
│   │   ├── routes/        # API 라우트
│   │   ├── controllers/   # 컨트롤러
│   │   ├── services/      # 비즈니스 로직
│   │   ├── middleware/    # 미들웨어
│   │   └── config/        # 설정 파일
│   └── package.json
│
├── frontend/              # React 프론트엔드
│   ├── src/
│   │   ├── components/    # 재사용 컴포넌트
│   │   ├── pages/         # 페이지 컴포넌트
│   │   ├── hooks/         # 커스텀 훅
│   │   ├── services/      # API 서비스
│   │   ├── types/         # TypeScript 타입
│   │   └── utils/         # 유틸리티
│   └── package.json
│
└── README.md
```

## 🚀 설치 및 실행

### 필수 요구사항
- Node.js 18+
- MongoDB Atlas 계정

### 백엔드 실행
```bash
# 백엔드 폴더로 이동
cd backend

# 의존성 설치
npm install

# 환경변수 설정
# .env 파일 생성 후 MongoDB URI 등 설정

# 개발 서버 실행
npm run dev
```

### 프론트엔드 실행
```bash
# 프론트엔드 폴더로 이동
cd frontend

# 의존성 설치
npm install

# 개발 서버 실행
npm run dev
```

## 📝 개발 진행 상황

### Phase 0: 프로젝트 초기 설정 ✅
- [x] GitHub 저장소 생성
- [x] MongoDB Atlas 설정
- [x] 백엔드 기본 구조
- [x] 프론트엔드 기본 구조
- [x] 데이터 모델 생성

### Phase 1: MVP (진행 중)
- [ ] JWT 인증 시스템
- [ ] 일정/지출 CRUD API
- [ ] 기본 UI 컴포넌트
- [ ] 간단한 통계 기능

### Phase 2: AI 기초
- [ ] 룰 기반 분석
- [ ] 대시보드 구현
- [ ] AI 인사이트 UI

### Phase 3: AI 고도화
- [ ] OpenClaw 연동
- [ ] 고급 분석 기능

### Phase 4: 배포
- [ ] AWS Lambda 배포
- [ ] CI/CD 파이프라인

## 🎨 주요 기능 스크린샷

*(개발 완료 후 추가 예정)*

## 📄 라이선스

MIT License

## 👤 개발자

- GitHub: [@Jinny0827](https://github.com/Jinny0827)

---

**⭐ 이 프로젝트가 도움이 되셨다면 Star를 눌러주세요!**