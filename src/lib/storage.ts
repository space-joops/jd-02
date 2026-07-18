// ============================================================================
// storage.ts — 최고 기록 저장 (localStorage)
//
// localStorage는 시크릿 모드·저장공간 부족·일부 웹뷰에서 예외를 던질 수 있다.
// 최고 기록은 "있으면 좋은" 부가 기능이지 게임의 필수 요소가 아니므로,
// 전부 try-catch로 감싸 실패해도 게임이 계속 굴러가게 한다 (§12).
// ============================================================================

/** 저장 키 — CLAUDE.md §8에 명세된 값. 바꾸면 기존 기록이 사라지니 주의. */
const BEST_KEY = "sjs-best";

/** 저장된 최고 기록을 읽는다. 없거나 실패하면 0. */
export function loadBest(): number {
  try {
    const raw = localStorage.getItem(BEST_KEY);
    const n = raw === null ? 0 : Number(raw);
    // 손으로 조작된 이상한 값(NaN, 음수)이 게임 UI를 깨지 않게 걸러 준다.
    return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
  } catch {
    return 0;
  }
}

/** 최고 기록을 저장한다. 실패해도 조용히 넘어간다. */
export function saveBest(score: number): void {
  try {
    localStorage.setItem(BEST_KEY, String(Math.floor(score)));
  } catch {
    // 저장 실패는 게임 진행에 영향을 주지 않는다.
  }
}

const UPGRADES_KEY = "sjs-upgrades";

export type Upgrades = {
  totalJunk: number;
  maxFuelLvl: number;
  thrustLvl: number;
  magnetLvl: number;
};

export function loadUpgrades(): Upgrades {
  try {
    const raw = localStorage.getItem(UPGRADES_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (typeof parsed.totalJunk === "number") return parsed;
    }
  } catch {}
  return { totalJunk: 0, maxFuelLvl: 0, thrustLvl: 0, magnetLvl: 0 };
}

export function saveUpgrades(u: Upgrades): void {
  try {
    localStorage.setItem(UPGRADES_KEY, JSON.stringify(u));
  } catch {}
}

const IDENTITY_KEY = "sjs-identity";

export type Identity = {
  name: string;
  secret_token: string;
};

export function loadIdentity(): Identity | null {
  try {
    const raw = localStorage.getItem(IDENTITY_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return null;
}

export function saveIdentity(id: Identity): void {
  try {
    localStorage.setItem(IDENTITY_KEY, JSON.stringify(id));
  } catch {}
}

