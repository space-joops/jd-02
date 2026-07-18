// ============================================================================
// mascot.ts — 주인공(입 큰 민트색 우주 친구) 그리기
//
// MVP 버전: 민트 원 + 눈 2개 + 벌린 입 (§6-3).
// 생명력 연출(시선 추적·깜빡임·입벌림·볼터치·안테나)은 백로그(§16)이며,
// 그때 이 파일만 갈아 끼우면 되도록 그리기를 여기에 격리해 둔다.
// ============================================================================

import { COLORS } from "./constants";

/**
 * 주인공을 그린다. draw 단계 전용 — 상태를 바꾸지 않는다 (§12).
 *
 * @param r 몸 반지름(px) — 성장 시스템(§6-2)이 이 값을 키운다
 * @param alpha 무적 깜빡임용 투명도. globalAlpha에 "곱해서" 적용한다 (§12)
 */
export function drawMascot(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  alpha = 1,
  level = 1
): void {
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.translate(x, y);
  ctx.imageSmoothingEnabled = false;

  // Pixel scaling base on radius
  const scale = r / 4;
  ctx.scale(scale, scale);

  if (level === 1) {
    // Lv.1: Space Dust (Slime)
    ctx.fillStyle = COLORS.mascot;
    ctx.fillRect(-2, -4, 4, 1);
    ctx.fillRect(-3, -3, 6, 1);
    ctx.fillRect(-4, -2, 8, 5);
    ctx.fillRect(-3, 3, 2, 1);
    ctx.fillRect(1, 3, 2, 1);
    ctx.fillStyle = COLORS.space;
    ctx.fillRect(-2, -1, 1, 1);
    ctx.fillRect(1, -1, 1, 1);
    ctx.fillRect(-1, 1, 2, 2); // Mouth
  } else if (level === 2) {
    // Lv.2: Chubby Blackhole
    ctx.fillStyle = COLORS.mascot;
    ctx.fillRect(-3, -4, 6, 1);
    ctx.fillRect(-4, -3, 8, 2);
    ctx.fillRect(-5, -1, 10, 5);
    ctx.fillRect(-4, 4, 8, 1);
    ctx.fillStyle = COLORS.space;
    ctx.fillRect(-2, 0, 4, 3); // Huge mouth
    ctx.fillRect(-3, -2, 1, 1); // Eyes
    ctx.fillRect(2, -2, 1, 1);
  } else if (level === 3) {
    // Lv.3: Cyborg Jaws
    ctx.fillStyle = COLORS.mascot;
    ctx.fillRect(-1, -6, 2, 2); // Fin
    ctx.fillRect(-2, -4, 4, 1);
    ctx.fillRect(-4, -3, 8, 3);
    ctx.fillRect(-5, 0, 10, 2);
    ctx.fillStyle = "#888"; // Metal Jaw
    ctx.fillRect(-4, 2, 8, 3);
    ctx.fillStyle = COLORS.space; // Eyes
    ctx.fillRect(-3, -1, 1, 1);
    ctx.fillStyle = COLORS.danger;
    ctx.fillRect(2, -1, 1, 1);
    ctx.fillStyle = "#fff"; // Teeth
    ctx.fillRect(-3, 2, 1, 1);
    ctx.fillRect(-1, 2, 1, 1);
    ctx.fillRect(1, 2, 1, 1);
    ctx.fillRect(3, 2, 1, 1);
    ctx.fillStyle = COLORS.space; // Mouth inside
    ctx.fillRect(-2, 3, 4, 1);
  } else if (level === 4) {
    // Lv.4: Mecha Behemoth
    ctx.fillStyle = "#555"; 
    ctx.fillRect(-5, -4, 10, 8);
    ctx.fillStyle = COLORS.mascot;
    ctx.fillRect(-4, -3, 8, 6);
    ctx.fillStyle = "#888"; // Thrusters
    ctx.fillRect(-6, -2, 2, 4);
    ctx.fillRect(4, -2, 2, 4);
    ctx.fillStyle = "#aaa"; // Armor
    ctx.fillRect(-3, -4, 6, 2);
    ctx.fillRect(-4, 2, 8, 2);
    ctx.fillStyle = "#66fcf1"; // Visor
    ctx.fillRect(-3, -1, 6, 2);
    ctx.fillStyle = COLORS.space; // Intake
    ctx.fillRect(-2, 3, 4, 2);
    ctx.fillStyle = "#ff8080"; // Core
    ctx.fillRect(-1, 3, 2, 1);
  } else {
    // Lv.5: Galactic Leviathan
    ctx.fillStyle = "#2b00ff"; // Dark aura
    ctx.fillRect(-6, -5, 12, 10);
    ctx.fillStyle = "#4c00ff";
    ctx.fillRect(-5, -4, 10, 8);
    ctx.fillStyle = COLORS.mascot;
    ctx.fillRect(-4, -3, 8, 6);
    ctx.fillStyle = "#ffd166"; // Horns
    ctx.fillRect(-5, -7, 2, 3);
    ctx.fillRect(3, -7, 2, 3);
    ctx.fillRect(-6, -8, 1, 2);
    ctx.fillRect(5, -8, 1, 2);
    ctx.fillStyle = "#ff0044"; // 6 Eyes
    ctx.fillRect(-3, -2, 1, 1);
    ctx.fillRect(2, -2, 1, 1);
    ctx.fillRect(-4, -1, 1, 1);
    ctx.fillRect(3, -1, 1, 1);
    ctx.fillRect(-3, 0, 1, 1);
    ctx.fillRect(2, 0, 1, 1);
    ctx.fillStyle = COLORS.space; // Maw
    ctx.fillRect(-3, 2, 6, 4);
    ctx.fillStyle = "#fff"; // Teeth
    ctx.fillRect(-3, 2, 1, 2);
    ctx.fillRect(-1, 2, 1, 1);
    ctx.fillRect(1, 2, 1, 1);
    ctx.fillRect(2, 2, 1, 2);
    ctx.fillRect(-2, 5, 1, 1);
    ctx.fillRect(1, 5, 1, 1);
  }

  ctx.restore();
}
