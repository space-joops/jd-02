"use client";

// ============================================================================
// game-ui.tsx — HUD · 타이틀 · 게임오버 오버레이
//
// 순수한 "표현 컴포넌트": 받은 값을 그리기만 하고 게임 로직은 전혀 없다.
// 전체가 pointer-events-none — HTML이 터치를 삼키면 그 아래 캔버스가
// 조작 불능이 된다. 터치는 전부 캔버스로 통과시킨다 (§12).
// 정보는 HTML 텍스트로 전달 (스크린리더가 읽을 수 있게, §13).
// ============================================================================

import { useState, useEffect } from "react";
import { COLORS } from "@/lib/constants";
import { type Upgrades } from "@/lib/storage";

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
  prompt(): Promise<void>;
}

declare global {
  interface Window {
    deferredPrompt?: BeforeInstallPromptEvent | null;
  }
}

export type GameUiState = {
  phase: "title" | "playing" | "over";
  score: number;
  hearts: number;
  eaten: number;
  best: number;
  newBest: boolean;
  upgrades: Upgrades;
  onUpgrade?: (type: keyof Omit<Upgrades, "totalJunk">, cost: number) => void;
};

export function GameUi({
  phase,
  score,
  hearts,
  eaten,
  best,
  newBest,
  upgrades,
  onUpgrade,
}: GameUiState) {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    const handleReady = () => {
      if (window.deferredPrompt) {
        setDeferredPrompt(window.deferredPrompt);
      }
    };
    
    // React가 마운트되기 전에 이미 이벤트가 발생했다면 바로 가져옵니다.
    if (window.deferredPrompt) {
      handleReady();
    }
    
    // 아직 발생하지 않았다면 이벤트를 기다립니다.
    window.addEventListener("installPromptReady", handleReady);
    return () => window.removeEventListener("installPromptReady", handleReady);
  }, []);

  const handleInstallClick = () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt().catch(() => {}); // 브라우저 고유의 설치 프롬프트 띄우기
    deferredPrompt.userChoice.then((choiceResult) => {
      if (choiceResult.outcome === "accepted") {
        console.log("User accepted the install prompt");
      }
      setDeferredPrompt(null); // 한 번 물어봤으면 버튼 숨기기
    });
  };

  const renderUpgrade = (type: keyof Omit<Upgrades, "totalJunk">, name: string, maxLvl: number, baseCost: number) => {
    const lvl = upgrades[type];
    const cost = baseCost * (lvl + 1);
    const isMax = lvl >= maxLvl;
    const canAfford = upgrades.totalJunk >= cost;
    
    return (
      <div className="flex justify-between items-center bg-black/60 p-3 rounded-lg border border-gray-600 w-full max-w-sm pointer-events-auto text-sm md:text-base">
        <div className="flex flex-col items-start gap-1">
          <span className="text-white">{name} LV.{lvl}</span>
          {!isMax && <span className={canAfford ? "text-[#ffd166]" : "text-gray-400"}>COST: {cost} JUNK</span>}
          {isMax && <span className="text-gray-400">MAX LEVEL</span>}
        </div>
        <button
          className={`px-3 py-2 rounded ${isMax || !canAfford ? 'bg-gray-700 text-gray-500' : 'bg-[#66fcf1] text-black hover:bg-white'}`}
          disabled={isMax || !canAfford}
          onClick={(e) => { e.stopPropagation(); onUpgrade?.(type, cost); }}
        >
          {isMax ? 'MAX' : 'UPG'}
        </button>
      </div>
    );
  };
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

      {/* ---- 타이틀 & 상점 ---- */}
      {phase === "title" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 px-6 text-center leading-loose">
          {/* PWA 설치 버튼 (지원되는 환경이고 아직 설치되지 않았을 때만 표시됨) */}
          {deferredPrompt && (
            <button
              onClick={(e) => {
                e.stopPropagation(); // 캔버스 탭 이벤트 무시
                handleInstallClick();
              }}
              className="absolute top-6 left-6 px-3 py-2 bg-[#ff8080] text-black text-xs md:text-sm font-bold rounded shadow-lg pointer-events-auto hover:bg-white transition-colors"
            >
              ⬇️ APP INSTALL
            </button>
          )}

          <div className="absolute top-6 right-6 text-xl text-[#ffd166]" style={{ textShadow: "2px 2px 0 #000" }}>
            TOTAL JUNK: {upgrades.totalJunk}
          </div>
          <h1
            className="text-4xl md:text-6xl font-bold mt-12"
            style={{ color: COLORS.accent, textShadow: "4px 4px 0 #000" }}
          >
            SPACE JOOPS
          </h1>
          
          <div className="flex flex-col gap-2 w-full items-center z-10 my-2">
            {renderUpgrade("maxFuelLvl", "FUEL TANK", 5, 50)}
            {renderUpgrade("thrustLvl", "THRUSTER", 5, 50)}
            {renderUpgrade("magnetLvl", "MAGNET", 5, 50)}
          </div>

          <p
            className="mt-2 animate-pulse text-2xl md:text-3xl"
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
