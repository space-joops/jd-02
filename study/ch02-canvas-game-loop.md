# Chapter 2: 게임 개발의 심장 (HTML5 Canvas와 Game Loop)

웹에서 1초에 60번씩 부드럽게 움직이는 게임을 만들려면 HTML 텍스트(DOM)로는 불가능합니다. 이를 위해 사용하는 마법의 도화지가 바로 **HTML5 `<canvas>`** 입니다.

## 1. Canvas API 란?
캔버스는 말 그대로 도화지입니다. 자바스크립트의 `붓(Context)`을 이용해 픽셀 단위로 그림을 그립니다.

```tsx
const canvas = canvasRef.current;
const ctx = canvas.getContext("2d"); // 2D 그림을 그리기 위한 붓을 가져옵니다.

// 빨간색 네모 그리기
ctx.fillStyle = "red";
ctx.fillRect(10, 10, 50, 50); // (x, y, 가로, 세로)
```
우리의 펫 "우주 먼지"부터 삐죽삐죽한 "가시"까지 모두 이 붓(`ctx`)으로 그린 픽셀 아트입니다.

## 2. Game Loop (게임 루프)
게임은 애니메이션입니다. 애니메이션은 여러 장의 그림을 빠르게 넘기는 것과 같죠. 
따라서 게임은 끊임없이 **"화면 지우기 ➡️ 캐릭터 이동(상태 업데이트) ➡️ 다시 그리기"**를 반복해야 합니다. 이 무한 반복의 굴레를 **Game Loop**라고 부릅니다.

브라우저에서 이 루프를 가장 최적화된 방식으로 돌려주는 함수가 바로 **`requestAnimationFrame`** 입니다. (모니터 주사율에 맞춰 대략 1초에 60번 실행해 줍니다.)

```tsx
function gameLoop(time) {
  // 1. 상태 업데이트 (이동, 충돌 체크)
  update(); 

  // 2. 화면 초기화 (도화지를 까맣게 칠해 지우기)
  ctx.fillStyle = "black";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // 3. 다시 그리기
  drawMascot();
  drawEnemies();

  // 4. 다음 프레임 예약 (무한 반복)
  requestAnimationFrame(gameLoop);
}

// 최초 실행
requestAnimationFrame(gameLoop);
```

## 3. 델타 타임 (Delta Time, `dt`)
컴퓨터마다 성능이 다릅니다. 좋은 컴퓨터는 1초에 144번 루프를 돌고, 안 좋은 컴퓨터는 30번만 돌 수도 있습니다. 프레임마다 캐릭터를 "1픽셀씩 이동"시킨다면, 좋은 컴퓨터에서는 캐릭터가 광속으로 날아가 버릴 것입니다.

이를 막기 위해 **"이전 프레임에서 현재 프레임까지 걸린 시간차(Delta Time)"**를 곱해서 이동 거리를 구합니다.
```tsx
let lastTime = 0;

function gameLoop(time) {
  const dt = (time - lastTime) / 1000; // 밀리초를 초 단위로 변환
  lastTime = time;

  // 속도 * 시간 = 거리 (물리 법칙!)
  // 컴퓨터 성능에 상관없이 1초에 100픽셀을 이동하게 됩니다.
  mascot.x += mascot.vx * dt; 
}
```

## 4. SPACE JOOPS의 분리 설계
우리는 코드를 깔끔하게 유지하기 위해 관심사를 분리했습니다.
- `src/lib/mascot.ts`: 오직 주인공을 그리는 함수만 존재
- `src/lib/debris.ts`: 쓰레기를 그리는 함수만 존재
- `src/app/play/joops-game.tsx`: 위 함수들을 불러와 매 프레임마다 호출하는 메인 디렉터

---
💡 **다음 챕터 예고:** 
캐릭터가 화면에 그려졌으니 이제 물리 엔진(관성, 마찰력)을 적용하고 가시에 부딪혔는지 알아내는 **충돌 판정 수학**을 배워보겠습니다!
