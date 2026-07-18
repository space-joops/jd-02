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
import { type Upgrades, type Identity, type Inventory } from "@/lib/storage";
import pkg from "../../../package.json";

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

export type RankResult = {
  highestRank: number;
  highestDiff: number;
  totalRank: number;
  totalDiff: number;
};

export type GameUiState = {
  phase: "title" | "playing" | "over";
  score: number;
  hearts: number;
  eaten: number;
  best: number;
  newBest: boolean;
  upgrades: Upgrades;
  onUpgrade?: (type: keyof Omit<Upgrades, "totalJunk">, cost: number) => void;
  onHome?: () => void;
  identity: Identity | null;
  onHatch?: (name: string) => Promise<string | void>;
  onEvolved?: (newLevel: number, newInventory: Inventory) => void;
  rankResult?: RankResult | "loading" | "error" | null;
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
  onHome,
  identity,
  onHatch,
  onEvolved,
  rankResult,
}: GameUiState) {
  const [hatchName, setHatchName] = useState("");
  const [hatchError, setHatchError] = useState("");
  const [isHatching, setIsHatching] = useState(false);
  const [showInventory, setShowInventory] = useState(false);
  const [isEvolving, setIsEvolving] = useState(false);
  
  const getEvolutionCost = (lvl: number) => {
    switch (lvl) {
      case 1: return { satellite: 0, can: 20, bolt: 50, spring: 0 };
      case 2: return { satellite: 0, can: 100, bolt: 0, spring: 50 };
      case 3: return { satellite: 30, can: 0, bolt: 0, spring: 150 };
      case 4: return { satellite: 100, can: 0, bolt: 0, spring: 0 };
      default: return { satellite: 99999, can: 99999, bolt: 99999, spring: 99999 };
    }
  };

  const doEvolve = async () => {
    if (!identity) return;
    setIsEvolving(true);
    try {
      const res = await fetch("/api/pets/evolve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: identity.name, secret_token: identity.secret_token })
      });
      const data = await res.json();
      if (data.success && onEvolved) {
        onEvolved(data.new_level, data.inventory);
      } else {
        alert(data.error);
      }
    } finally {
      setIsEvolving(false);
    }
  };

  const doHatch = async () => {
    if (!hatchName || !onHatch) return;
    setIsHatching(true);
    setHatchError("");
    const err = await onHatch(hatchName);
    if (err) setHatchError(err);
    setIsHatching(false);
  };
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isIosNonSafari, setIsIosNonSafari] = useState(false);

  useEffect(() => {
    // 1. iOS Non-Safari 감지
    const ua = navigator.userAgent.toLowerCase();
    const isIos = /iphone|ipad|ipod/.test(ua);
    const isSafari = /safari/.test(ua) && !/chrome|crios|fxios|opios|edgios|kakaotalk|naver|whale/.test(ua);
    if (isIos && !isSafari) {
      setIsIosNonSafari(true);
    }
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
    if (isIosNonSafari) {
      navigator.clipboard.writeText(window.location.href).catch(() => {});
      alert(
        "📱 아이폰 앱 설치 안내\\n\\n" +
        "아이폰은 '사파리(Safari)' 브라우저에서만 앱 설치가 가능합니다.\\n\\n" +
        "1. 현재 게임 주소가 클립보드에 복사되었습니다.\\n" +
        "2. 사파리 앱을 열고 주소를 붙여넣어 접속하세요.\\n" +
        "3. 사파리 하단의 [공유] 버튼 ➡️ [홈 화면에 추가]를 누르세요."
      );
      // 카카오톡 인앱 브라우저인 경우 사파리로 강제 외부 실행 시도
      if (/kakaotalk/.test(navigator.userAgent.toLowerCase())) {
        window.location.href = `kakaotalk://web/openExternal?url=${encodeURIComponent(window.location.href)}`;
      }
      return;
    }

    if (deferredPrompt) {
      deferredPrompt.prompt().catch(() => {}); // 브라우저 고유의 설치 프롬프트 띄우기
      deferredPrompt.userChoice.then((choiceResult) => {
        if (choiceResult.outcome === "accepted") {
          console.log("User accepted the install prompt");
        }
        setDeferredPrompt(null); // 한 번 물어봤으면 버튼은 유지되지만 prompt는 소진됨
      });
    } else {
      // 이벤트가 없거나 지원하지 않는 일반 기기를 위한 안내창
      alert("앱 설치 팝업이 지원되지 않는 환경입니다.\\n브라우저 하단 메뉴(공유 또는 설정)에서 '홈 화면에 추가'를 직접 선택해주세요.");
    }
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
      {/* ---- HUD: 왼쪽 점수, 가운데 홈, 오른쪽 하트 ---- */}
      {/* ---- HUD: 왼쪽 점수, 가운데 홈, 오른쪽 하트 (게임 중, 게임 오버 시에만 노출) ---- */}
      {phase !== "title" && (
        <div className="flex items-start justify-between px-5 pt-3 text-3xl tracking-widest relative z-50">
          <div className="z-10 text-white" style={{ textShadow: "2px 2px 0 #000" }}>{score}</div>
          
          <div className="absolute left-1/2 -translate-x-1/2 top-3 z-10">
            <button 
              onClick={(e) => { e.stopPropagation(); onHome?.(); }}
              className="px-3 py-1 bg-black/50 hover:bg-white hover:text-black rounded border border-gray-600 text-sm md:text-base pointer-events-auto transition-colors"
            >
              HOME
            </button>
          </div>

          <div className="z-10">
            {/* 장식용 하트 문자는 aria-hidden, 실제 정보는 sr-only 텍스트로 */}
            <span aria-hidden style={{ color: COLORS.heart, textShadow: "2px 2px 0 #000" }}>
              {"♥".repeat(hearts)}
              <span className="opacity-40">{"♡".repeat(Math.max(0, 3 - hearts))}</span>
            </span>
            <span className="sr-only">Hearts: {hearts}</span>
          </div>
        </div>
      )}

      {/* ---- 알 부화 (최초 접속) ---- */}
      {phase === "title" && !identity && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-black/90 px-6 text-center leading-loose z-50 pointer-events-auto">
          <div className="text-7xl animate-bounce mb-2">🥚</div>
          <h2 className="text-2xl text-white font-bold" style={{ textShadow: "2px 2px 0 #000" }}>우주 펫 분양소</h2>
          <p className="text-sm text-gray-300 max-w-xs leading-relaxed">
            나만의 고유한 우주 펫을 키워보세요!<br/>
            이름은 전 세계에 단 하나만 존재합니다. (최대 12자)
          </p>
          <input 
            type="text" 
            value={hatchName}
            onChange={(e) => setHatchName(e.target.value.slice(0, 12))}
            placeholder="PET NAME"
            className="mt-4 px-4 py-2 bg-gray-900 border border-gray-500 rounded text-center text-xl text-white outline-none focus:border-[#66fcf1] transition-colors"
            disabled={isHatching}
            maxLength={12}
          />
          {hatchError && <p className="text-red-400 text-sm">{hatchError}</p>}
          <button 
            onClick={doHatch}
            disabled={isHatching || !hatchName}
            className="mt-2 px-8 py-3 bg-[#66fcf1] text-black font-bold text-xl rounded hover:bg-white disabled:opacity-50 transition-colors"
          >
            {isHatching ? "부화 중..." : "HATCH!"}
          </button>
        </div>
      )}

      {/* ---- 타이틀 & 상점 ---- */}
      {phase === "title" && identity && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 px-6 text-center leading-loose">
          <div className="absolute top-6 left-6 text-xl text-[#66fcf1]" style={{ textShadow: "2px 2px 0 #000" }}>
            PET: {identity.name}
          </div>
          <div className="absolute top-6 right-6 text-xl text-[#ffd166]" style={{ textShadow: "2px 2px 0 #000" }}>
            TOTAL JUNK: {upgrades.totalJunk}
          </div>
          <h1
            className="text-4xl md:text-6xl font-bold mt-12"
            style={{ color: COLORS.accent, textShadow: "4px 4px 0 #000" }}
          >
            SPACE JOOPS
          </h1>
          
          <button
            onClick={(e) => { e.stopPropagation(); setShowInventory(true); }}
            className="mt-2 px-6 py-2 bg-purple-600/80 text-white font-bold rounded-lg border border-purple-400 hover:bg-purple-500 pointer-events-auto"
            style={{ textShadow: "2px 2px 0 #000" }}
          >
            🎒 INVENTORY & EVOLVE
          </button>
          
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

          {/* PWA 설치 버튼 (항상 표시됨) - 탭 투 스타트 아래로 이동 */}
          <button
            onClick={(e) => {
              e.stopPropagation(); // 캔버스 탭 이벤트 무시
              handleInstallClick();
            }}
            className="mt-6 animate-pulse text-xl md:text-2xl font-bold pointer-events-auto hover:opacity-70 transition-opacity"
            style={{ color: COLORS.heart, textShadow: "2px 2px 0 #000" }}
          >
            {isIosNonSafari ? "⬇️ 사파리로 열고 앱 설치" : "⬇️ APP INSTALL"}
          </button>

          <div className="mt-8 text-xs md:text-sm text-gray-500 font-mono tracking-widest">
            v{pkg.version}
          </div>
        </div>
      )}

      {/* ---- 게임오버 ---- */}
      {phase === "over" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-black/80 px-6 text-center leading-loose pointer-events-auto z-50">
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

          {/* ---- 랭킹 표시 영역 ---- */}
          <div className="mt-4 p-4 border border-gray-600 rounded-lg bg-gray-900/80 min-w-[280px]">
            {rankResult === "loading" && <p className="text-gray-400 animate-pulse">우주 랭킹 집계 중...</p>}
            {rankResult === "error" && <p className="text-red-400 text-sm">랭킹을 불러오지 못했습니다.</p>}
            {rankResult && typeof rankResult === "object" && (
              <div className="flex flex-col gap-3 text-sm md:text-base">
                <div className="flex justify-between items-center border-b border-gray-700 pb-2">
                  <span className="text-gray-300">단판 최고점</span>
                  <div className="flex items-center gap-2">
                    <span className="text-white font-bold">{rankResult.highestRank}위</span>
                    {rankResult.highestDiff > 0 && <span className="text-green-400 animate-bounce">▲ {rankResult.highestDiff}</span>}
                    {rankResult.highestDiff < 0 && <span className="text-red-400 text-xs">▼ {Math.abs(rankResult.highestDiff)}</span>}
                    {rankResult.highestDiff === 0 && <span className="text-gray-500 text-xs">-</span>}
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-300">누적 총점수</span>
                  <div className="flex items-center gap-2">
                    <span className="text-[#ffd166] font-bold">{rankResult.totalRank}위</span>
                    {rankResult.totalDiff > 0 && <span className="text-green-400 animate-bounce">▲ {rankResult.totalDiff}</span>}
                    {rankResult.totalDiff < 0 && <span className="text-red-400 text-xs">▼ {Math.abs(rankResult.totalDiff)}</span>}
                    {rankResult.totalDiff === 0 && <span className="text-gray-500 text-xs">-</span>}
                  </div>
                </div>
              </div>
            )}
          </div>

          <p
            className="mt-6 animate-pulse text-2xl md:text-3xl"
            style={{ color: COLORS.accent }}
          >
            TAP TO RESTART
          </p>
        </div>
      )}

      {/* ---- 인벤토리 & 진화 모달 ---- */}
      {showInventory && identity && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/90 px-4 z-50 pointer-events-auto">
          <div className="bg-gray-800 border-2 border-gray-500 rounded-xl p-6 w-full max-w-sm flex flex-col items-center">
            <h2 className="text-2xl text-white mb-4">INVENTORY</h2>
            
            <div className="grid grid-cols-2 gap-4 w-full mb-6">
              <div className="bg-gray-900 p-3 rounded text-center">
                <div className="text-gray-400 text-xs mb-1">BOLT 🔩</div>
                <div className="text-xl text-white">{identity.inventory?.bolt || 0}</div>
              </div>
              <div className="bg-gray-900 p-3 rounded text-center">
                <div className="text-gray-400 text-xs mb-1">CAN 🥫</div>
                <div className="text-xl text-white">{identity.inventory?.can || 0}</div>
              </div>
              <div className="bg-gray-900 p-3 rounded text-center">
                <div className="text-gray-400 text-xs mb-1">SPRING 🌀</div>
                <div className="text-xl text-white">{identity.inventory?.spring || 0}</div>
              </div>
              <div className="bg-gray-900 p-3 rounded text-center">
                <div className="text-gray-400 text-xs mb-1">SAT 🛰️</div>
                <div className="text-xl text-[#ffd166]">{identity.inventory?.satellite || 0}</div>
              </div>
            </div>

            <div className="bg-black/50 w-full p-4 rounded-lg mb-6 text-center">
              <h3 className="text-sm text-[#66fcf1] mb-2">
                EVOLUTION LV.{identity.evolution_lvl || 1} ➡️ LV.{(identity.evolution_lvl || 1) + 1}
              </h3>
              {(() => {
                const cost = getEvolutionCost(identity.evolution_lvl || 1);
                const inv = identity.inventory || { satellite: 0, can: 0, bolt: 0, spring: 0 };
                const canEvolve = (inv.satellite||0) >= cost.satellite && (inv.can||0) >= cost.can && (inv.bolt||0) >= cost.bolt && (inv.spring||0) >= cost.spring;
                
                return (
                  <>
                    <div className="text-xs text-gray-300 space-y-1 mb-4">
                      {cost.bolt > 0 && <div>BOLT: {inv.bolt||0} / {cost.bolt}</div>}
                      {cost.can > 0 && <div>CAN: {inv.can||0} / {cost.can}</div>}
                      {cost.spring > 0 && <div>SPRING: {inv.spring||0} / {cost.spring}</div>}
                      {cost.satellite > 0 && <div>SAT: {inv.satellite||0} / {cost.satellite}</div>}
                    </div>
                    <button 
                      onClick={doEvolve}
                      disabled={!canEvolve || isEvolving}
                      className={`w-full py-2 rounded font-bold transition-colors ${canEvolve ? 'bg-purple-600 text-white hover:bg-purple-500' : 'bg-gray-700 text-gray-500'}`}
                    >
                      {isEvolving ? "진화 중..." : canEvolve ? "EVOLVE!" : "재료 부족"}
                    </button>
                  </>
                );
              })()}
            </div>

            <button 
              onClick={() => setShowInventory(false)}
              className="px-6 py-2 bg-gray-600 text-white rounded hover:bg-gray-500"
            >
              닫기
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
