# 프론트엔드 코드 상세 가이드

> 백엔드 개발만 해온 신입 개발자를 위한 Life As Game 프론트 코드 해설  
> 백엔드 개념과 1:1 대응시켜 설명합니다

---

## 목차

1. [프레임워크 기본 구조](#1-프레임워크-기본-구조)
2. [컴포넌트 = 함수형 클래스](#2-컴포넌트)
3. [상태(State) = 인스턴스 변수](#3-상태state)
4. [Props = 메서드 파라미터](#4-props)
5. [렌더링 = 뷰 직렬화](#5-렌더링)
6. [useEffect = 라이프사이클](#6-useeffect)
7. [useMemo / useRef = 캐싱](#7-usememo--useref)
8. [Context = DI 컨테이너](#8-context)
9. [핵심: Panel Stack 시스템](#9-panel-stack-시스템)
10. [Framer Motion 애니메이션](#10-framer-motion)
11. [제스처 처리 (롱프레스, 스와이프)](#11-제스처-처리)
12. [폼 시스템과 더블클릭 편집](#12-폼-시스템)
13. [FSD 아키텍처 왜 이렇게?](#13-fsd-아키텍처)
14. [파일별 핵심 코드 해설](#14-파일별-핵심-코드)

---

## 1. 프레임워크 기본 구조

### Next.js App Router

백엔드로 비유하면 **라우팅 프레임워크 + SSR 엔진**입니다.

```
app/page.tsx       → GET /          (메인 대시보드)
app/login/page.tsx → GET /login     (로그인)
app/admin/page.tsx → GET /admin     (어드민)
```

`app/layout.tsx`는 모든 페이지를 감싸는 **서블릿 필터** 역할입니다.
`AuthProvider`(인증 컨텍스트)를 여기서 주입합니다.

```tsx
// app/layout.tsx — 모든 페이지의 공통 래퍼
export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <AuthProvider>   {/* 모든 페이지에 인증 컨텍스트 주입 */}
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
```

### "use client" 지시어

Next.js 15는 기본적으로 서버에서 렌더링합니다.
브라우저 API(클릭, 스크롤, localStorage)가 필요한 컴포넌트는 파일 최상단에 선언합니다.

```tsx
"use client";   // 이 파일은 클라이언트(브라우저)에서 실행

import { useState } from "react";
```

**백엔드 비유**: 클라이언트 컴포넌트는 사용자 인터랙션이 있는 Controller 역할.

---

## 2. 컴포넌트

React 컴포넌트는 **JSX를 반환하는 함수**입니다.

```tsx
// 백엔드: class PanelCard { String render(String label) { return html; } }
// 프론트:
function PanelCard({ label, subtitle, onClick }) {
  return (
    <div onClick={onClick}>
      <span>{label}</span>
      <span>{subtitle}</span>
    </div>
  );
}
```

JSX는 `React.createElement()` 호출의 문법적 설탕입니다.
HTML처럼 생겼지만 실제로는 JavaScript 함수 호출입니다.

```tsx
// 이것과
<div className="container">Hello</div>

// 이것은 동일합니다
React.createElement("div", { className: "container" }, "Hello")
```

**중요**: HTML의 `class`는 JSX에서 `className`입니다 (JS 예약어 충돌 회피).

---

## 3. 상태(State)

`useState`는 컴포넌트의 **가변 인스턴스 변수**입니다.
값이 바뀌면 컴포넌트가 자동으로 재렌더링됩니다.

```tsx
// 백엔드 개념:
// String selectedMain = "player";
// void setSelectedMain(String value) { this.selectedMain = value; rerender(); }

// 프론트:
const [selectedMain, setSelectedMain] = useState<MainNavId>("player");
//     읽기 전용 현재값      변경 함수 (이걸 호출해야 리렌더링 발생)
```

**핵심 규칙**: 상태는 항상 setter 함수로만 변경해야 합니다.
직접 변경 `selectedMain = "skills"` 하면 리렌더링이 발생하지 않습니다.

### app/page.tsx의 상태 트리

```
selectedMain                    현재 선택된 메인 도메인 (player/skills/...)
selectedSubByMain               각 도메인의 선택된 서브메뉴
selectedInventoryGearPartId     장비 부위 선택
selectedMarketShopSectionId     마켓 상점 섹션 선택
selectedDetailByKey             13종류의 상세 항목 선택
selectedPlayerCategoryBySub     Player 도메인 카테고리 선택
selectedLifelogCategoryBySub    Lifelog 도메인 카테고리 선택
activeFormPanel                 현재 열린 폼 패널
editingItemId                   편집 중인 항목 ID
activeSpecialPanel              메시지/선물 특수 패널
pendingAction                   SaoAlert 대기 중인 액션
friendMemos                     친구 메모 (localStorage 영속화)
```

이 상태들이 `buildPanels()` 함수에 입력으로 들어가 패널 스택을 결정합니다.

---

## 4. Props

컴포넌트에 데이터를 전달하는 방법입니다.
백엔드의 **메서드 파라미터**와 동일합니다.

```tsx
// 타입 정의 (받는 쪽)
type PanelCardProps = {
  label: string;
  subtitle?: string;        // ? = 선택적 파라미터
  onClick: () => void;      // 콜백 함수 = 함수형 인터페이스
  onLongPress?: () => void;
};

function PanelCard({ label, subtitle, onClick }: PanelCardProps) {
  // ...
}

// 사용 (전달하는 쪽)
<PanelCard
  label="Elucidator"
  subtitle="Legendary | Sword"
  onClick={() => handleSelect(item.id)}
/>
```

**콜백 함수 패턴**: 하위 컴포넌트가 상위 컴포넌트의 상태를 변경하려면
상위에서 함수를 내려보내고, 하위는 그 함수를 호출합니다.

```
app/page.tsx (상태 소유)
  ↓ onPanelItemSelect={handlePanelItemSelect}    prop으로 함수 전달
  RightPanels (상태 없음)
    ↓ onClick={() => onPanelItemSelect(index, item.id)}  함수 호출
    PanelCard (상태 없음)
```

---

## 5. 렌더링

React는 상태가 바뀔 때마다 컴포넌트 함수를 다시 실행하고,
이전 결과와 비교(Virtual DOM diff)해서 실제로 변경된 DOM만 업데이트합니다.

```tsx
export default function Home() {
  const [selectedMain, setSelectedMain] = useState("player");

  // selectedMain이 바뀔 때마다 buildPanels()도 다시 계산
  const { panelStack } = useMemo(
    () => buildPanels(selectedMain, ...),
    [selectedMain, ...]  // 의존성 배열: 이 값들이 바뀔 때만 재계산
  );

  return <RightPanels panelStack={panelStack} />;
}
```

**백엔드 비유**: HTTP 요청마다 Controller 메서드가 실행되고 뷰 템플릿을 렌더링하는 것과 같습니다.
차이점은 React는 브라우저 안에서 이 사이클이 반복됩니다.

---

## 6. useEffect

`useEffect`는 렌더링 이후에 실행되는 사이드이펙트입니다.

```tsx
// 패턴 1: 마운트 시 1회 실행 (의존성 배열이 빈 배열)
useEffect(() => {
  console.log("컴포넌트가 DOM에 추가됐습니다");
  return () => console.log("컴포넌트가 DOM에서 제거됐습니다");  // cleanup
}, []);   // @PostConstruct / @PreDestroy 와 유사

// 패턴 2: 특정 값이 바뀔 때마다 실행
useEffect(() => {
  if (!isLoading && !currentUser) router.push("/login");
}, [currentUser, isLoading, router]);

// 패턴 3: 패널 스택이 길어지면 오른쪽으로 자동 스크롤 (app/page.tsx)
useEffect(() => {
  if (panelStack.length > prevPanelLengthRef.current) {
    viewportRef.current?.scrollTo({ left: viewportRef.current.scrollWidth, behavior: "smooth" });
  }
  prevPanelLengthRef.current = panelStack.length;
}, [panelStack.length]);
```

**백엔드 비유**:
- 의존성 `[]` = `@PostConstruct` (초기화 시 1회)
- 의존성 `[value]` = 특정 이벤트 구독 (값이 바뀔 때)
- cleanup 함수 = `@PreDestroy` (소멸 시)

---

## 7. useMemo / useRef

### useMemo — 계산 결과 캐싱

```tsx
// buildPanels()는 대량의 nav 데이터를 순회합니다. 매 렌더마다 실행하면 낭비.
const { panelStack, socialContext } = useMemo(
  () => buildPanels(selectedMain, selectedSubByMain, ...),
  [selectedMain, selectedSubByMain, ...]  // 이 값들이 바뀔 때만 재계산
);
```

**백엔드 비유**: `@Cacheable`. 의존성이 바뀌면 캐시 무효화.

### useRef — DOM 참조 / 렌더링 무관 가변값

```tsx
const viewportRef = useRef<HTMLDivElement>(null);  // DOM 노드 직접 참조
const formOpenCountRef = useRef(0);                // 렌더링 유발 없이 값 추적

// DOM 조작
viewportRef.current?.scrollTo({ left: 0 });
```

`useRef`는 변경해도 리렌더링이 발생하지 않습니다.
DB 트랜잭션 외부의 임시 변수처럼 동작합니다.

---

## 8. Context

`Context`는 **전역 의존성 주입**입니다.
Prop Drilling(여러 단계로 props를 전달)을 피하기 위해 사용합니다.

```tsx
// features/auth/AuthContext.tsx

// 1. Context 생성 (인터페이스 정의)
const AuthContext = createContext<AuthContextType | null>(null);

// 2. Provider (DI 컨테이너 등록)
export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const login = async (email: string, password: string) => { /* ... */ };
  const logout = () => { /* ... */ };

  return (
    <AuthContext.Provider value={{ currentUser, login, logout }}>
      {children}   {/* 이 아래의 모든 컴포넌트에서 사용 가능 */}
    </AuthContext.Provider>
  );
}

// 3. 커스텀 훅으로 노출
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("AuthProvider 하위에서만 사용 가능");
  return ctx;
}

// 4. 어떤 컴포넌트에서든 즉시 사용 (@Autowired 와 동일)
function SomePage() {
  const { currentUser, logout } = useAuth();
}
```

---

## 9. Panel Stack 시스템

이 프로젝트의 핵심입니다. **상태 → buildPanels() → 렌더링**의 단방향 흐름입니다.

### buildPanels() — 순수 함수

```
입력: 현재 선택 상태들 (selectedMain, selectedSub, selectedDetail, ...)
출력: PanelStackItem[] (렌더링할 패널 목록)
사이드이펙트: 없음 (순수 함수)
```

```tsx
// app/page.tsx
function buildPanels(selectedMain, selectedSubByMain, ...): { panelStack } {
  const panelStack = [];

  // 1단계: 항상 메인 메뉴 패널 추가
  panelStack.push({ kind: "menu", title: "Player", items: submenus });

  // 2단계: 서브메뉴가 선택되면 다음 패널 추가
  if (!selectedSub) return { panelStack };

  if (selectedMain === "player") {
    // 카테고리 패널 추가
    panelStack.push({ kind: "menu", title: "Category", items: categories });

    if (!selectedCategory) return { panelStack };

    // 리스트 패널 추가
    panelStack.push({ kind: "list", title: "Credentials List", items: filtered });

    // editingItemId 가 있으면 상세 패널 생략 (폼 패널이 대신 표시됨)
    if (selectedItem && selectedItem.id !== editingItemId) {
      panelStack.push({ kind: "placeholder", title: "Detail", ... });
    }
  }

  return { panelStack };
}
```

### PanelStackItem 타입 유니온

```typescript
// entities/nav/types.ts
type PanelStackItem =
  | { kind: "menu";        items: PanelMenuItem[] }
  | { kind: "list";        items: PanelDataItem[] }
  | { kind: "placeholder"; description: string; rows: string[] }
  | { kind: "form";        fields: FormFieldSpec[] }
  | { kind: "modal";       confirmLabel: string }
  | { kind: "message";     friendId: string }
  | { kind: "gift";        friendId: string };
```

TypeScript 유니온 타입입니다. 백엔드의 상속 계층 없이 타입을 구분합니다.

```tsx
// widgets/right-panels/RightPanels.tsx
function renderPanel(panel: PanelStackItem) {
  switch (panel.kind) {   // kind로 타입 가드
    case "menu": return <MenuPanel items={panel.items} />;
    case "list": return <ListPanel items={panel.items} />;
    case "form": return <FormPanel fields={panel.fields} />;
    // TypeScript가 각 case에서 panel의 타입을 정확히 추론합니다
  }
}
```

---

## 10. Framer Motion

Framer Motion은 선언적 애니메이션 라이브러리입니다.
"어떻게" 움직일지가 아니라 "어디에 있어야 하는지"를 선언합니다.

### 기본 패턴

```tsx
import { motion } from "framer-motion";

// motion.div = 애니메이션 가능한 div
<motion.div
  initial={{ opacity: 0, x: 20 }}    // 시작 상태
  animate={{ opacity: 1, x: 0 }}     // 목표 상태
  exit={{ opacity: 0, x: -20 }}      // 제거될 때 상태
  transition={{ duration: 0.2 }}     // 전환 설정
>
```

### AnimatePresence — 컴포넌트 등장/소멸 애니메이션

```tsx
import { AnimatePresence } from "framer-motion";

// key가 바뀌면 이전 컴포넌트를 exit 애니메이션으로 제거하고
// 새 컴포넌트를 initial로 등장시킵니다
<AnimatePresence mode="wait">
  <motion.div key={selectedMain}>
    <PanelStack />
  </motion.div>
</AnimatePresence>
```

### layoutId — 공유 레이아웃 전환

같은 `layoutId`를 가진 두 컴포넌트는 자동으로 위치 전환 애니메이션이 됩니다.

```tsx
// 탭 밑줄 인디케이터가 탭 간 이동 시 자연스럽게 슬라이드
{selectedTab === tab.id && (
  <motion.div
    layoutId="tab-underline"    // 이 ID를 공유하는 div가 위치 보간됨
    className="absolute bottom-0 h-0.5"
  />
)}
```

### MOTION 프리셋 (shared/lib/motion.ts)

```typescript
export const MOTION = {
  panelReset: {
    initial: { opacity: 0, x: 12 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -8 },
    transition: { duration: 0.18 },
  },
};
```

---

## 11. 제스처 처리

### useLongPress (shared/hooks/useLongPress.ts)

```typescript
export function useLongPress(onLongPress: () => void, delay = 600) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const didLongPressRef = useRef(false);

  const start = () => {
    timerRef.current = setTimeout(() => {
      didLongPressRef.current = true;
      onLongPress();    // 600ms 후 콜백 실행
    }, delay);
  };

  const cancel = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
  };

  // 롱프레스 발생 여부 반환 — 일반 클릭 이벤트 억제용
  const didLongPress = () => {
    const val = didLongPressRef.current;
    didLongPressRef.current = false;
    return val;
  };

  return { onPointerDown: start, onPointerUp: cancel, onPointerLeave: cancel, didLongPress };
}
```

### 스와이프 감지 (shared/ui/PanelCard.tsx)

```tsx
// 포인터 이벤트로 스와이프 구현
const handlePointerDown = (e: React.PointerEvent) => {
  dragStartX.current = e.clientX;
  isDragging.current = true;
  e.currentTarget.setPointerCapture(e.pointerId);  // 포인터 추적 유지
};

const handlePointerMove = (e: React.PointerEvent) => {
  if (!isDragging.current) return;
  const delta = e.clientX - dragStartX.current;
  if (delta < 0) setSwipeOffset(delta);  // 왼쪽 스와이프만
};

const handlePointerUp = () => {
  if (swipeOffset < -80) triggerDelete();   // 80px 임계값 초과 시 삭제
  else setSwipeOffset(0);                   // 미달 시 복원
};
```

---

## 12. 폼 시스템

### FormFieldSpec — 동적 폼 렌더링

```typescript
// entities/nav/types.ts
type FormFieldSpec = {
  key: string;
  label: string;
  type: "text" | "number" | "select" | "date" | "textarea";
  options?: { value: string; label: string }[];
  placeholder?: string;
  required?: boolean;
};

// features/player/model.ts — 폼 스펙 정의
export const CERTIFICATION_FORM_FIELDS: FormFieldSpec[] = [
  { key: "name",     label: "Name",     type: "text",   required: true },
  { key: "issuer",   label: "Issuer",   type: "text",   required: true },
  { key: "category", label: "Category", type: "select", options: [
    { value: "Cloud",    label: "Cloud" },
    { value: "Frontend", label: "Frontend" },
  ]},
  { key: "expiresDate", label: "Expires", type: "date" },
];
```

`RightPanels`에서 `FormFieldSpec[]`을 받아 동적으로 폼 필드를 렌더링합니다.
백엔드 리플렉션 기반 폼 생성과 유사한 방식입니다.

### 더블클릭 편집 흐름

```
1. 유저가 항목을 더블클릭
     ↓
2. handlePanelItemDoubleClick() 호출
     ↓
3. editingItemId = 항목 ID  (상세 패널 억제 플래그 설정)
   activeFormPanel = 편집 폼 스펙
     ↓
4. buildPanels() 에서 editingItemId 가 있으면
   해당 항목의 상세(placeholder) 패널을 생략
     ↓
결과: [메뉴 패널, 카테고리 패널, 리스트 패널, 편집 폼 패널]
                                             상세 패널 없음
```

```typescript
// app/page.tsx
const handlePanelItemDoubleClick = (panelIndex: number, itemId: string) => {
  const item = PLAYER_LISTS.credentials.find(i => i.id === itemId);
  updateDetailSelections({ player: itemId });  // 리스트에서 선택 상태 유지
  setEditingItemId(itemId);                    // 상세 패널 억제 플래그
  openForm("credential-edit", "Edit Credential", CERTIFICATION_FORM_FIELDS, "수정하기",
    { name: item?.label, ... });               // 기존 값 pre-fill
};
```

---

## 13. FSD 아키텍처

### 기존 구조의 문제

```
components/LeftContext.tsx  945줄  (너무 큰 파일, 도메인 혼재)
lib/nav.ts                  1164줄 (모든 도메인 데이터 한 파일)
```

### FSD로 해결된 것

**도메인 데이터 격리**

```
lib/nav.ts (1164줄, 8개 도메인 혼재)
  ↓ 분리
features/player/model.ts    player 데이터만
features/social/model.ts    social 데이터만
entities/nav/types.ts       공유 타입만
```

**의존성 방향 명확화**

```
Before: components/ → lib/  (방향 불명확, 순환 의존성 위험)
After:  widgets/ → features/ → entities/ → shared/  (단방향)
```

**신입 개발자 온보딩**

```
"social 기능 수정해주세요"
  → features/social/ 폴더만 보면 됩니다
  → model.ts (데이터), api.ts (API 호출), mock.ts (목 데이터)
```

### 레이어별 역할

| 레이어 | 역할 | 수정 빈도 |
|--------|------|-----------|
| shared | 프레임워크 무관 공용 코드 | 낮음 |
| entities | 도메인 타입 + Nav 구조 | 낮음 |
| features | 도메인별 비즈니스 로직 | 높음 |
| widgets | 페이지 섹션 (feature 조합) | 중간 |
| app | 라우팅 + 상태 조율 | 낮음 |

---

## 14. 파일별 핵심 코드

### [app/page.tsx](app/page.tsx) — 상태 오케스트레이터

오케스트레이터 패턴으로 설계됐습니다.
모든 상태를 소유하지만 UI 렌더링 로직은 위젯에 위임합니다.

```
상태 관리 → buildPanels() → 3개 widget에 props 전달
```

`buildPanels()`은 순수 함수입니다. 사이드이펙트 없음 = 테스트하기 쉬움.

### [widgets/right-panels/RightPanels.tsx](widgets/right-panels/RightPanels.tsx) — 패널 렌더러

```
PanelStackItem[] 배열을 받아서
각 kind에 따라 올바른 UI 컴포넌트를 렌더링
+ Framer Motion으로 등장/소멸 애니메이션
```

### [shared/ui/EdgeFadeScrollArea.tsx](shared/ui/EdgeFadeScrollArea.tsx) — 고급 스크롤

```
1. 스크롤 영역 위아래 페이드 오버레이 (CSS gradient mask)
2. 포인터 드래그 스크롤 (마우스 드래그로 스크롤)
3. 관성(inertia) 스크롤 — 드래그 속도에 따른 자연스러운 감속
4. 오버스크롤 감쇠 — 경계를 넘어가면 스프링처럼 되튀어 오기
```

`useRef` + pointer events + `requestAnimationFrame`을 조합해
브라우저 기본 스크롤 동작을 완전히 재구현합니다.

### [entities/nav/types.ts](entities/nav/types.ts) — 타입 정의

백엔드의 DTO 인터페이스 모음과 같습니다.

```typescript
// 모든 리스트 아이템의 기본형
type PanelDataItem = {
  id: string;
  label: string;             // 주 표시 텍스트
  slotLabel: string;         // 아이콘 슬롯 텍스트 (2글자)
  subtitle?: string;         // 부가 정보
  category?: string;         // 카테고리 필터용
  detailTitle?: string;      // 상세 패널 제목
  detailDescription: string;
  detailRows: string[];      // 상세 정보 행들
  actions?: PanelItemAction[];  // 롱프레스 액션 목록
};
```

### [shared/design/tokens.ts](shared/design/tokens.ts) — 디자인 토큰

```typescript
export const SAO = {
  color: {
    bg: { page: "#07090d", dark: "#0a0c11" },
    border: { subtle: "rgba(255,255,255,0.08)", gold: "rgba(248,197,78,0.5)" },
    text: { primary: "#e8eaf0", gold: "rgba(248,197,78,0.9)" },
    rarity: {
      Common: "#9ca3af",
      Uncommon: "#4ade80",
      Rare: "#60a5fa",
      Epic: "#a78bfa",
      Legendary: "rgba(248,197,78,0.95)",
    },
  },
};
```

백엔드의 enum 상수와 유사하지만 컬러/크기/그림자 등 시각적 속성을 담습니다.
모든 컴포넌트에서 동일한 스타일 값을 참조해 디자인 일관성을 유지합니다.

---

## 자주 묻는 질문

### Q: TypeScript에서 `type` vs `interface` 차이?

이 프로젝트에서는 `type`을 주로 사용합니다.
`interface`는 선언 병합(declaration merging)이 가능하지만 여기서는 불필요합니다.
기능상 대부분 동일합니다.

### Q: `?.` 와 `??` 연산자는?

```typescript
item?.label         // Optional chaining: item이 null이면 undefined 반환
value ?? "default"  // Nullish coalescing: null/undefined면 오른쪽 반환
```

### Q: 인라인 스타일이 많은 이유?

SAO 테마의 복잡한 색상 조합은 디자인 토큰(`shared/design/tokens.ts`)으로 관리합니다.
Tailwind CSS 클래스로는 표현하기 어려운 동적 rgba 값들이 많기 때문입니다.

### Q: `useRef`는 언제 `useState` 대신 쓰나요?

렌더링을 유발할 필요가 없는 값에 씁니다:
- DOM 노드 직접 참조 (`viewportRef`)
- 폼 제출 카운터 (`formOpenCountRef`) — 폼 ID 생성용, UI에 표시 안 됨
- 드래그 시작 좌표 (`dragStartX.current`) — 애니메이션 계산용, UI 영향 없음

### Q: 왜 전역 상태 라이브러리(Redux, Zustand 등)를 안 쓰나요?

현재 상태 범위가 `app/page.tsx` 한 곳에 집중되어 있고, 크로스 도메인 상태 공유 필요성이 낮기 때문입니다. 앱이 커지면 Zustand 도입을 고려할 수 있습니다.
