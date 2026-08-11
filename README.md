<img width="1305" height="870" alt="Image" src="https://github.com/user-attachments/assets/9b521e6d-93be-42ee-9310-7fbdb08ce379" />

# Life As Game — Frontend

SAO(Sword Art Online) 게임 UI에서 영감을 받은 **인생 관리 대시보드** 프론트엔드입니다.
캐릭터 스탯, 스킬, 퀘스트, 소셜, 라이프로그, 마켓 등 게임 요소로 현실 삶을 관리합니다.

---

## Tech Stack

| 분류 | 기술 |
|------|------|
| Framework | Next.js 15 (App Router) |
| UI Library | React 19 |
| Language | TypeScript |
| Styling | Tailwind CSS v4 + Inline Styles |
| Animation | Framer Motion |
| Architecture | FSD (Feature-Sliced Design) |

---

## Architecture — FSD

```
life-as-game-v2/
├── app/                     # Next.js App Router (진입점)
│   ├── page.tsx             # 메인 대시보드 (상태 오케스트레이터)
│   ├── login/page.tsx
│   └── admin/page.tsx
│
├── widgets/                 # 독립적인 대형 UI 블록
│   ├── left-context/        # 좌측 사이드바 (플레이어/소셜 정보)
│   ├── right-panels/        # 우측 패널 스택 렌더러
│   └── orb-nav/             # 중앙 원형 네비게이션
│
├── features/                # 도메인별 비즈니스 로직
│   ├── auth/                # 인증 (AuthContext, API, Mock)
│   ├── player/              # 플레이어 (자격증, 칭호, 관심사)
│   ├── skills/              # 스킬 (패시브/액티브)
│   ├── inventory/           # 인벤토리 (아이템, 장비, 우편함)
│   ├── quests/              # 퀘스트 (스토리/일일/파티/길드)
│   ├── social/              # 소셜 (파티, 길드, 친구)
│   ├── lifelog/             # 라이프로그 (컬렉션, 미디어, 운동)
│   ├── market/              # 마켓 (지갑, 상점, 거래)
│   └── system/              # 시스템 (설정, 로그아웃)
│
├── entities/                # 도메인 타입 + 공유 Nav 설정
│   └── nav/
│       ├── types.ts         # 모든 TypeScript 타입 정의
│       ├── config.ts        # Nav 구조 상수
│       └── index.ts         # 배럴 export
│
└── shared/                  # 레이어 무관 공용 코드
    ├── ui/                  # 재사용 컴포넌트 (PanelCard, SaoAlert 등)
    ├── hooks/               # 공용 훅 (useLongPress, useDoubleClick 등)
    ├── lib/                 # 유틸리티 (motion, uiConsts, reorder)
    ├── design/              # 디자인 토큰 (SAO 컬러, 타이포, 그림자)
    └── api/                 # HTTP 클라이언트 + 공용 DTO 타입
```

### FSD 레이어 의존성 규칙

```
app → widgets → features → entities → shared
```

상위 레이어는 하위 레이어만 import 가능. 동일 레이어 간 import 금지.

---

## Key Features

### 1. Orb Navigation
8개 도메인(Player, Skills, Inventory, Quests, Social, Lifelog, Market, System)을 원형 Orb로 전환.
선택된 Orb가 앞으로 이동하는 Framer Motion 레이아웃 애니메이션.

### 2. Panel Stack (계층형 패널)
메뉴 → 카테고리 → 리스트 → 상세 순서로 패널이 우측으로 누적.
도메인 전환 시 AnimatePresence로 전체 스택 교체 애니메이션.

### 3. CRUD 인터랙션
- **더블클릭**: 항목 수정 폼 열기
- **롱프레스 (600ms)**: 수정/삭제/장착/선물 액션 오버레이
- **스와이프 좌측**: 삭제 확인 UI

### 4. Social & Friend System
친구 상세 탭 UI, 친구 메모 localStorage 영속화, 메시지/선물 특수 패널.

### 5. SAO 디자인 시스템
다크 배경 + 골드 강조, 희귀도 컬러 시스템, SAO 애니메이션 SVG 아이콘 80종.

---

## Getting Started

```bash
npm install
npm run dev
```

[http://localhost:3000](http://localhost:3000) 접속

### 테스트 계정

| 역할 | 이메일 | 비밀번호 |
|------|--------|----------|
| 일반 유저 | player@lag.io | player123 |
| 어드민 | admin@lag.io | admin123 |

---

## API 연동

환경 변수가 없거나 `NEXT_PUBLIC_USE_MOCK=true`이면 Mock 데이터를 사용합니다.
실제 백엔드 연동 시 `.env.local`에 `NEXT_PUBLIC_USE_MOCK=false`와 `NEXT_PUBLIC_API_URL`을 설정합니다.

백엔드 도메인: `character`, `inventory`, `quest`, `social`, `lifelog`, `economy`, `user`
