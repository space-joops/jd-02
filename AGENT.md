# 🤖 AGENT.md - AI 보조 개발자 가이드 및 작업 일지

이 문서는 AI 어시스턴트(Claude, Gemini 등)가 프로젝트를 파악하고, 일관된 원칙에 따라 개발을 진행하기 위해 작성되었습니다.

## 📌 공통 작업 원칙 (AI Agent Rules)
1. **직접 푸시(Push) 금지**: 모든 작업 후에는 `npm run build`로 빌드 에러가 없는지 반드시 확인하고, 문제가 없을 경우 `git commit`까지만 수행한다. `git push`는 사용자가 직접 하거나 별도로 요청할 때만 수행한다.
2. **문서 동기화**: `CLAUDE.md`, `GEMINI.md` 등 다른 AI가 읽는 문서들은 모두 이 `AGENT.md`를 참조하도록 하여 파편화를 방지한다.
3. **PWA 대응**: Vercel 빌드 환경에서는 Typescript `any` 타입과 리액트 훅 의존성 경고가 에러로 처리되므로 엄격하게 관리한다.
4. **아키텍처 대원칙**: "초당 60번 변하는 것은 Canvas에, 가끔 변하는 것만 React에". React 상태 렌더링 최소화를 유지한다.

## 🚀 지금까지 완료된 작업 내역 (Changelog)

### Phase 1: 기반 시스템 구축
- 2D Canvas 기반의 60fps 렌더링 루프 구현 (`src/app/play/joops-game.tsx`)
- 가상 조이스틱 (Virtual Joystick) 드래그 및 마우스 조작 구현
- `requestAnimationFrame` 최적화 및 캔버스 리사이즈(DPR 대응) 적용

### Phase 2: 게임 코어 로직 및 8-bit 스타일링
- `mascot`, `debris`, `backdrop` 모듈 분리로 8-bit Pixel Art 스타일 적용
- 우주 쓰레기(위성, 캔, 스프링, 볼트) 및 장애물(가시) 생성/이동/충돌 판정 추가
- 주인공 크기 성장 시스템 및 피격(무적) 시스템 도입

### Phase 3: 상점 및 업그레이드 시스템
- 먹은 쓰레기(Junk)를 모아 능력을 강화하는 업그레이드(FUEL TANK, THRUSTER, MAGNET) 시스템 적용
- `localStorage`를 이용한 최고 점수(Best Score) 및 재화, 업그레이드 수치 저장 (`src/lib/storage.ts`)
- 조이스틱 조작 시 연료(Thrust) 소모 및 관성(Friction) 물리 엔진 세밀 조정

### Phase 4: 오디오 및 PWA (Progressive Web App) 도입
- Web Audio API 기반 8-bit 레트로 사운드 이펙트(먹기, 맞기, 게임오버, 엔진음) 실시간 합성 구현 (`src/lib/sound.ts`)
- 모바일(iOS Safari 등) 자동재생 차단(Autoplay Policy) 우회를 위한 첫 터치 더미 오디오 락 해제 로직 구현
- PWA 대응을 위한 `manifest.json`, `sw.js`, 메타태그 적용
- 타이틀 화면에 사용자 환경 맞춤형 `APP INSTALL` 버튼 구현 (지원 브라우저는 네이티브 팝업, 비지원 기기 및 카카오톡 브라우저는 안내 및 사파리 강제 열기 유도)
- `package.json` 버전을 화면에 표시하여 릴리스 추적 가능성 확보

## 📅 다음 목표 (Next Steps & Backlog)
- Supabase 또는 Firebase 연동을 통한 글로벌 리더보드 구축
- 인공위성 실제 데이터 일부 연동 및 쓰레기 양 시각화 (현실성 부여)
- 내 우주펫 위치 추적 (위도/경도 기반) 기능 구현
- 쉴드, 폭탄 등 다양한 아이템 추가
