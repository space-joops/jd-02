// ============================================================================
// backdrop.ts — 우주 배경 (MVP: 배경색 + 모눈 격자 + 정적 별)
//
// 별의 위치는 매 프레임 똑같아야 한다. Math.random을 프레임마다 부르면
// 별이 지지직거리며 온 화면을 뛰어다닌다. 그래서 인덱스에서 항상 같은 값이
// 나오는 결정론적 유사난수(hash)를 쓴다 — 같은 씨앗은 항상 같은 결과 (§11).
// 반짝임·잠자는 달 같은 디테일은 백로그(§16).
// ============================================================================

import { COLORS } from "./constants";

/** 모눈 격자 간격(px)과 투명도 — "모눈종이 노트" 컨셉의 뼈대 (§11). */
const GRID_GAP = 48;
const GRID_ALPHA = 0.045;

/** 별 개수. */
const STAR_COUNT = 40;

/**
 * 0~1 사이 결정론적 유사난수. 같은 i에는 언제나 같은 값이 나온다.
 * (sin을 크게 튀겨서 소수부만 취하는 고전적인 해시 트릭.)
 */
function hash(i: number): number {
  const x = Math.sin(i * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

/** 배경 전체를 그린다. draw 단계 전용 — 상태를 바꾸지 않는다 (§12). */
export function drawBackdrop(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
): void {
  // 1) 우주색 바탕
  ctx.fillStyle = COLORS.space;
  ctx.fillRect(0, 0, w, h);

  // 2) 모눈 격자 — 아주 연하게 (진하면 노트가 아니라 감옥이 된다)
  ctx.save();
  ctx.globalAlpha *= GRID_ALPHA; // 대입이 아니라 곱하기 (§12)
  ctx.strokeStyle = COLORS.ink;
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let x = GRID_GAP; x < w; x += GRID_GAP) {
    ctx.moveTo(x, 0);
    ctx.lineTo(x, h);
  }
  for (let y = GRID_GAP; y < h; y += GRID_GAP) {
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
  }
  ctx.stroke();
  ctx.restore();

  // 3) 정적 별 — 위치·크기·밝기를 전부 해시로 뽑아 매 프레임 동일하게
  ctx.save();
  ctx.fillStyle = COLORS.ink;
  for (let i = 0; i < STAR_COUNT; i++) {
    const x = hash(i * 3 + 1) * w;
    const y = hash(i * 3 + 2) * h;
    const size = Math.floor(1 + hash(i * 3 + 3) * 1.6) * 2;
    ctx.save();
    ctx.globalAlpha *= 0.25 + hash(i * 7 + 5) * 0.5; // 별마다 밝기를 다르게
    ctx.fillRect(Math.floor(x), Math.floor(y), size, size); // Pixel star
    ctx.restore();
  }
  ctx.restore();
}
