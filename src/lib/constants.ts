// ============================================================================
// constants.ts — 게임 "분위기"의 원본
// 색·낙하물 종류·대사는 전부 여기서만 정의한다 (CLAUDE.md §11).
// 흩어져 있으면 톤이 어긋나기 시작하므로, 분위기에 관한 값은 이 파일 밖에서
// 하드코딩하지 않는 것이 규칙이다.
// ============================================================================

/** 팔레트 — 캔버스 그림은 전부 이 색만 쓴다. */
export const COLORS = {
  space: "#141838", // 우주 배경 (HTML 쪽 배경·themeColor도 이 값의 거울)
  mascot: "#7ee8b2", // 마스코트 민트
  accent: "#ffd166", // 포인트 노랑
  danger: "#ff8080", // 위험 빨강
  heart: "#ff8fab", // 하트 분홍
  ink: "#f4f6ff", // 밝은 글자색
} as const;

/**
 * 낙하물 종류.
 * "star"(별 보너스)는 백로그(§16)라 아직 없지만, 종류를 문자열 유니온으로 둔
 * 이유가 바로 확장이다 — 종류를 추가할 때 이 타입과 아래 표만 늘리면 된다.
 */
export type JunkKind = "satellite" | "bolt" | "can" | "spring" | "hazard" | "fuel";

/** 먹이 4종 — 스폰 확률 계산에서 "가시가 아닌 나머지 균등"에 쓰인다 (§9). */
export const FOOD_KINDS = ["satellite", "bolt", "can", "spring", "fuel"] as const;

/** 종류별 대표색 (§5 표의 원본). */
export const JUNK_COLORS: Record<JunkKind, string> = {
  satellite: "#8ecbff", // 하늘
  bolt: "#cfd8e6", // 은색
  can: "#f9a8d4", // 분홍
  spring: "#c4b5fd", // 보라
  hazard: "#ff8080", // 빨강 (COLORS.danger와 같은 값)
  fuel: "#66fcf1", // 연료 아이템 네온 민트
};

// ----------------------------------------------------------------------------
// 대사 — 전부 한글 구어체 (§2 톤 앤 매너). 죽음/폭발 같은 어휘는 쓰지 않는다.
// ----------------------------------------------------------------------------

/** 먹이를 먹었을 때 랜덤으로 하나 뽑아 띄우는 팝업 문구. */
export const EAT_WORDS = ["YUM!", "GULP!", "TASTY!", "DELISH!", "NICE!"];

/** 가시에 찔렸을 때의 팝업 문구. */
export const HIT_WORDS = ["OUCH!", "YIKES!", "BOO!", "ARGH!"];

/**
 * 캔버스 글자용 폰트 스택.
 * 레트로 감성을 위한 픽셀 폰트로 교체.
 */
export const CANVAS_FONT = `"Press Start 2P", monospace`;
