// ============================================================================
// game-ui.tsx — HUD · 타이틀 · 게임오버 오버레이
//
// 순수한 "표현 컴포넌트": 받은 값을 그리기만 하고 게임 로직은 전혀 없다.
// 전체가 pointer-events-none — HTML이 터치를 삼키면 그 아래 캔버스가
// 조작 불능이 된다. 터치는 전부 캔버스로 통과시킨다 (§12).
// 정보는 HTML 텍스트로 전달 (스크린리더가 읽을 수 있게, §13).
// ============================================================================

import { COLORS } from "@/lib/constants";

export type GameUiState = {
  phase: "title" | "playing" | "over";
  score: number;
  hearts: number;
  eaten: number;
  best: number;
  newBest: boolean;
};

export function GameUi({
  phase,
  score,
  hearts,
  eaten,
  best,
  newBest,
}: GameUiState) {
  return (
    <div
      className="pointer-events-none absolute inset-0"
      style={{
        // 노치·펀치홀 기기에서 HUD가 가려지지 않게 (§13)
        paddingTop: "env(safe-area-inset-top)",
      }}
    >
      {/* ---- HUD: 왼쪽 점수, 오른쪽 하트 ---- */}
      <div className="flex items-start justify-between px-5 pt-3 text-3xl tracking-widest">
        <div>{score}</div>
        <div>
          {/* 장식용 하트 문자는 aria-hidden, 실제 정보는 sr-only 텍스트로 */}
          <span aria-hidden style={{ color: COLORS.heart }}>
            {"♥".repeat(hearts)}
            <span className="opacity-40">{"♡".repeat(Math.max(0, 3 - hearts))}</span>
          </span>
          <span className="sr-only">Hearts: {hearts}</span>
        </div>
      </div>

      {/* ---- 타이틀 ---- */}
      {phase === "title" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-6 px-6 text-center leading-loose">
          <h1
            className="text-4xl md:text-6xl font-bold"
            style={{ color: COLORS.accent, textShadow: "4px 4px 0 #000" }}
          >
            SPACE JOOPS
          </h1>
          <p className="text-xl md:text-2xl tracking-widest text-white">
            DRAG TO MOVE!<br/>EAT JUNK, AVOID SPIKES!
          </p>
          <p
            className="mt-8 animate-pulse text-2xl md:text-3xl"
            style={{ color: COLORS.accent }}
          >
            TAP TO START
          </p>
        </div>
      )}

      {/* ---- 게임오버 ---- */}
      {phase === "over" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-black/70 px-6 text-center leading-loose">
          <h2
            className="text-4xl md:text-5xl font-bold"
            style={{ color: COLORS.heart, textShadow: "4px 4px 0 #000" }}
          >
            GAME OVER
          </h2>
          <p className="mt-3 text-3xl md:text-4xl text-white">SCORE: {score}</p>
          <p className="text-lg md:text-xl text-gray-300">EATEN: {eaten} JUNK</p>
          {newBest ? (
            <p className="text-xl md:text-2xl animate-bounce mt-2" style={{ color: COLORS.accent }}>
              🎉 NEW BEST!
            </p>
          ) : (
            <p className="text-sm md:text-lg text-gray-400 mt-2">BEST: {best}</p>
          )}
          <p
            className="mt-8 animate-pulse text-2xl md:text-3xl"
            style={{ color: COLORS.accent }}
          >
            TAP TO RESTART
          </p>
        </div>
      )}
    </div>
  );
}
