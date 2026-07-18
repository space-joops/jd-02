# Chapter 1: 웹 개발의 기초 (React와 Next.js)

환영합니다! 이 문서는 "SPACE JOOPS" 게임을 만들면서 사용된 핵심 웹 기술들을 초급 개발자 눈높이에 맞춰 친절하게 설명하는 스터디 가이드입니다. 첫 번째 시간은 우리가 딛고 있는 땅, **Next.js와 React**에 대해 알아봅니다.

## 1. React: "상태"가 변하면 "화면"이 바뀐다
React의 핵심 철학은 **"UI는 상태(State)의 투영이다"**라는 점입니다.
게임에서 `score`(점수)나 `hearts`(하트)가 변할 때, 개발자가 직접 HTML의 숫자를 지우고 새로 쓰지 않습니다. React에게 "점수가 올랐어!"라고 알려주기만 하면, React가 알아서 화면을 새로 그립니다.

```tsx
// React의 useState 훅 사용 예시
import { useState } from 'react';

function ScoreBoard() {
  // score라는 상태(데이터)와, 이를 변경하는 setScore 함수를 만듭니다.
  const [score, setScore] = useState(0);

  return (
    <div>
      <p>현재 점수: {score}</p>
      {/* 버튼을 누르면 setScore를 통해 점수를 100점 올립니다 */}
      <button onClick={() => setScore(score + 100)}>점수 획득!</button>
    </div>
  );
}
```

**SPACE JOOPS에서의 활용:**
우리는 `GameUi` 컴포넌트에서 체력, 점수, 인벤토리 등의 상태를 관리하고, 이 값들이 변할 때마다 예쁜 팝업창이나 HUD(화면 UI)가 자동으로 업데이트 되도록 React를 활용했습니다.

## 2. useRef: 화면을 다시 그리지 않는 비밀 주머니
React에서 상태(`useState`)가 변하면 화면이 새로 그려집니다. 하지만 게임에서는 1초에 60번씩 주인공의 X, Y 좌표가 변합니다. 좌표가 변할 때마다 React가 HTML 전체를 다시 그리면 컴퓨터가 버티지 못하겠죠? 
이럴 때 쓰는 것이 **`useRef`**입니다.

- `useState`: 값이 바뀌면 화면을 새로 고침 (UI 업데이트용)
- `useRef`: 값이 바뀌어도 화면을 새로 고치지 않음 (게임 데이터, 캔버스 접근용)

```tsx
const canvasRef = useRef<HTMLCanvasElement>(null);
// HTML의 <canvas ref={canvasRef}> 태그와 연결되어, 
// 자바스크립트에서 캔버스를 직접 조종할 수 있게 해줍니다.
```

## 3. Next.js와 서버 사이드 렌더링 (SSR)
React만 쓰면 빈 HTML을 먼저 다운받고 나중에 화면을 그립니다(CSR). 하지만 **Next.js**는 서버에서 미리 완성된 HTML을 만들어서 보내줍니다(SSR). 

하지만 "SPACE JOOPS"는 브라우저의 로컬 저장소(`localStorage`)를 읽어야 시작할 수 있는 게임입니다. 서버는 사용자의 브라우저 로컬 저장소에 접근할 수 없기 때문에, 서버가 그린 화면과 브라우저가 막상 열어본 화면이 다르면 Next.js는 혼란에 빠집니다. 이를 **Hydration Mismatch(수화 불일치)** 에러라고 합니다.

**우리의 해결책:**
컴포넌트가 브라우저에 완전히 장착(Mount)된 이후에만 게임을 그리도록 처리했습니다.
```tsx
const [mounted, setMounted] = useState(false);

useEffect(() => {
  setMounted(true); // 브라우저에 렌더링이 완료되면 true로 변경!
}, []);

if (!mounted) {
  return <div className="loading">로딩 중...</div>; 
  // 서버에서는 로딩 화면만 그리고, 브라우저가 켜진 후에 게임 화면을 엽니다.
}
```

---
💡 **다음 챕터 예고:** 
UI와 버튼은 React로 만들었지만, 실제 우주 공간을 날아다니는 주인공은 HTML로는 한계가 있습니다. 다음 챕터에서는 마법의 도화지 **Canvas API**에 대해 알아봅니다!
