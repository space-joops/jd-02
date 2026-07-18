// ============================================================================
// debris.ts — 낙하물(우주쓰레기) 데이터 + 물리 + 종류별 그림
//
// 클래스/상속 없이 "평범한 객체 + 순수 함수(make/step/draw)" 구조 (§12).
// - makeJunk: 데이터 만들기
// - stepJunk: 물리 한 걸음 (상태만 바꾸고 캔버스는 안 건드림)
// - drawJunk: 그리기 (읽기만 하고 상태는 안 바꿈)
// ============================================================================

import { COLORS, FOOD_KINDS, JUNK_COLORS, type JunkKind } from "./constants";

/** 낙하물 하나. */
export type Junk = {
  kind: JunkKind;
  /**
   * x는 "매 프레임 x0 + sin 흔들림"으로 다시 계산되는 파생값이다.
   * 자석 효과 등으로 낙하물을 옮기고 싶으면 x가 아니라 중심축 x0를 옮겨야
   * 한다 — x를 옮겨봐야 다음 프레임에 도로 튕겨 돌아온다 (§7 ⚠️).
   */
  x: number;
  x0: number; // 좌우 흔들림의 중심축
  y: number;
  vy: number; // 낙하 속도(px/s)
  size: number; // 판정·그림의 기준 크기(px)
  sway: number; // 흔들림 진폭(px)
  swayT: number; // 흔들림 위상(누적 시간)
  swaySpeed: number; // 흔들림 각속도
  rot: number; // 자체 회전 각(rad)
  rotSpeed: number; // 회전 속도(rad/s)
  /** -1이면 평소. 0 이상이면 "꿀꺽"(입으로 빨려 들어가는 중) 경과 시간(초). */
  eatT: number;
};

/** 먹이인가? (가시만 위험물이고 나머지는 전부 먹이) */
export function isFood(j: Junk): boolean {
  return j.kind !== "hazard";
}

/**
 * 이번에 스폰할 종류를 고른다 (§9).
 * 가시 확률은 10%에서 시작해 난이도에 비례해 최대 23%까지 오르고,
 * 나머지 확률은 먹이 4종이 균등하게 나눠 갖는다.
 *
 * @param allowHazard 타이틀 데모에서는 false — 구경 중 찔리는 연출 방지 (§4)
 */
export function pickKind(difficulty: number, allowHazard: boolean): JunkKind {
  const hazardChance = allowHazard ? 0.1 + 0.13 * difficulty : 0;
  if (Math.random() < hazardChance) return "hazard";
  return FOOD_KINDS[Math.floor(Math.random() * FOOD_KINDS.length)];
}

/**
 * 낙하물을 하나 만든다. 화면 위 바깥(y=-60)에서 등장한다 (§5).
 *
 * @param w 화면 너비 — 등장 x 범위를 정하는 데 쓴다
 * @param speedScale 낙하 속도 배율 (난이도 반영 값, 데모는 0.6배)
 */
export function makeJunk(kind: JunkKind, w: number, speedScale: number): Junk {
  // 먹이 13~19px, 가시 16~24px (§5)
  const size =
    kind === "hazard" ? 16 + Math.random() * 8 : 13 + Math.random() * 6;
  const x0 = 20 + Math.random() * Math.max(1, w - 40); // 가장자리 20px는 피해서
  return {
    kind,
    x: x0,
    x0,
    y: -60,
    vy: (55 + Math.random() * 45) * speedScale, // 기본 55~100px/s (§9)
    size,
    sway: 10 + Math.random() * 18,
    swayT: Math.random() * Math.PI * 2, // 위상을 흩어 놓아야 군무가 안 된다
    swaySpeed: 1 + Math.random() * 1.4,
    rot: Math.random() * Math.PI * 2,
    rotSpeed: (Math.random() * 2 - 1) * 1.6, // 시계/반시계 랜덤
    eatT: -1,
  };
}

/**
 * 물리 한 걸음: 낙하 + 좌우 sin 흔들림 + 자체 회전 (§5).
 * 모든 이동은 ×dt — 프레임레이트가 달라도 같은 속도 (§12).
 * "꿀꺽" 중의 이동(입으로 빨려 들어가기)은 게임 본체가 담당한다.
 */
export function stepJunk(j: Junk, dt: number): void {
  j.y += j.vy * dt;
  j.swayT += j.swaySpeed * dt;
  j.rot += j.rotSpeed * dt;
  j.x = j.x0 + Math.sin(j.swayT) * j.sway; // x는 언제나 x0에서 파생
}

/**
 * 낙하물 그리기. MVP는 단순 도형 — 종류는 색+실루엣으로만 구분한다 (§11).
 * 그리기 함수를 이 파일에 격리해 두었으므로, 이후 두들 엔진을 도입할 때
 * 여기만 갈아 끼우면 된다.
 *
 * @param scale "꿀꺽" 연출용 축소 배율 (1이 원래 크기)
 */
export function drawJunk(
  ctx: CanvasRenderingContext2D,
  j: Junk,
  scale = 1,
): void {
  const s = j.size;
  ctx.save();
  ctx.translate(j.x, j.y);
  ctx.rotate(j.rot);
  
  // Pixel grid scaling
  ctx.scale(scale * (s / 4), scale * (s / 4));
  ctx.imageSmoothingEnabled = false;

  switch (j.kind) {
    case "satellite": {
      ctx.fillStyle = JUNK_COLORS.satellite;
      ctx.fillRect(-4, -1, 3, 2); // left panel
      ctx.fillRect(1, -1, 3, 2); // right panel
      ctx.fillStyle = COLORS.space;
      ctx.fillRect(-1, -2, 2, 4); // body gap
      ctx.fillStyle = JUNK_COLORS.satellite;
      ctx.fillRect(-2, -3, 4, 6); // main body
      break;
    }
    case "bolt": {
      ctx.fillStyle = JUNK_COLORS.bolt;
      ctx.fillRect(-2, -3, 4, 6);
      ctx.fillRect(-3, -2, 6, 4);
      ctx.fillStyle = COLORS.space;
      ctx.fillRect(-1, -1, 2, 2); // Hole
      break;
    }
    case "can": {
      ctx.fillStyle = JUNK_COLORS.can;
      ctx.fillRect(-2, -3, 4, 6);
      ctx.fillStyle = COLORS.space;
      ctx.fillRect(-2, -2, 4, 1);
      ctx.fillRect(-2, 2, 4, 1);
      break;
    }
    case "spring": {
      ctx.fillStyle = JUNK_COLORS.spring;
      ctx.fillRect(-2, -4, 2, 1);
      ctx.fillRect(0, -3, 2, 1);
      ctx.fillRect(-2, -2, 2, 1);
      ctx.fillRect(0, -1, 2, 1);
      ctx.fillRect(-2, 0, 2, 1);
      ctx.fillRect(0, 1, 2, 1);
      ctx.fillRect(-2, 2, 2, 1);
      ctx.fillRect(0, 3, 2, 1);
      break;
    }
    case "hazard": {
      ctx.fillStyle = JUNK_COLORS.hazard;
      ctx.fillRect(-1, -4, 2, 8); // Vert
      ctx.fillRect(-4, -1, 8, 2); // Horiz
      ctx.fillRect(-2, -2, 4, 4); // Core
      ctx.fillStyle = COLORS.space;
      ctx.fillRect(-1, -1, 2, 2);
      break;
    }
    case "fuel": {
      ctx.fillStyle = JUNK_COLORS.fuel;
      ctx.fillRect(-2, -3, 4, 6); // Battery body
      ctx.fillRect(-1, -4, 2, 1); // Tip
      ctx.fillStyle = COLORS.space;
      ctx.fillRect(-1, -1, 2, 2); // F symbol
      break;
    }
  }

  ctx.restore();
}
