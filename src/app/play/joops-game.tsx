"use client";

// ============================================================================
// joops-game.tsx — ★ 게임 본체
//
// 대원칙 (§12): "초당 60번 변하는 것은 캔버스에, 가끔 변하는 것만 React에."
// - 게임 상태(주인공 위치, 낙하물 배열…)는 전부 useEffect 클로저의 지역 변수.
// - React state는 `ui` 객체 하나뿐이고, 점수/하트/phase가 실제로 바뀔 때만
//   pushUi()로 알린다. 매 프레임 setState는 금지 — 60fps로 리렌더가 돌면
//   게임이 아니라 벤치마크가 된다.
// - update(dt)는 상태만 바꾸고, draw()는 읽기만 한다. 섞이는 순간 디버깅 지옥.
// ============================================================================

import { useEffect, useRef, useState } from "react";
import { fitCanvas } from "@/lib/canvas";
import { EAT_WORDS, HIT_WORDS, COLORS } from "@/lib/constants";
import { drawBackdrop } from "@/lib/backdrop";
import { drawMascot } from "@/lib/mascot";
import {
  type Junk,
  drawJunk,
  isFood,
  makeJunk,
  pickKind,
  stepJunk,
} from "@/lib/debris";
import { type Popup, drawPopup, makePopup, stepPopup } from "@/lib/effects";
import { loadBest, saveBest, loadUpgrades, saveUpgrades, loadIdentity, saveIdentity, loadRank, saveRank, type Upgrades, type Identity } from "@/lib/storage";
import {
  disposeAudio,
  ensureAudio,
  initAudioListener,
  playEat,
  playGameOver,
  playHit,
  playFuelUp,
  playUpgrade,
  updateThrustSound,
} from "@/lib/sound";
import { GameUi, type GameUiState, type RankResult } from "./game-ui";

// ----------------------------------------------------------------------------
// TUNE — 손맛·판정·성장의 튜닝 상수 (숫자의 최종 원본, CLAUDE.md §15)
// 밸런스를 바꿀 때는 로직이 아니라 여기부터 만진다.
// ----------------------------------------------------------------------------
const TUNE = {
  followSpeed: 7, // 포인터 추적 감쇠 계수 — 클수록 즉각, 작을수록 미끄덩 (§6-1)
  touchOffsetY: 72, // 터치일 때 목표점을 위로 올리는 양 — 손가락이 캐릭터를 가리니까
  hudClearance: 64, // 상단 HUD 영역 침범 금지선 (y < r + 이 값 불가)

  startR: 24, // 시작 반지름 (§6-2)
  maxR: 38, // 성장 상한 — 무한히 쉬워지지 않게
  growPerEat: 0.45, // 하나 먹을 때 커지는 양
  shrinkOnHit: 3, // 가시 맞으면 작아지는 양 ("아프면 살짝 작아진다")

  eatJudge: 0.65, // 획득 판정 배율 — 보이는 것보다 크게 (§7 황금률)
  hitJudge: 0.75, // 피격 판정 배율 — 보이는 것(1.5)보다 작게
  magnetRange: 70, // 자석 발동 범위 (주인공 반지름 + 이 값)
  magnetPull: 80, // 자석 끌어당김 속도(px/s) — 눈치 못 챌 강도로
  eatAnimTime: 0.16, // "꿀꺽" 연출 시간 (§7)

  hearts: 3, // 시작 하트 (§8)
  invincibleTime: 1.4, // 피격 후 무적 — 없으면 하트가 연달아 증발한다
  blinkHz: 8, // 무적 중 초당 깜빡임 횟수

  shakeTime: 0.35, // 피격 화면 흔들림 지속 (§10)
  shakeAmp: 7, // 흔들림 최대 진폭(px)

  restartDebounce: 0.6, // 게임오버 후 재시작 입력 무시 시간 (§4)
  demoSpeed: 0.6, // 타이틀 데모 낙하 속도 배율 (§9)
  demoInterval: 1.5, // 타이틀 데모 스폰 간격(초) — 지터 없음
  maxDt: 0.05, // dt 상한 — 백그라운드 탭 복귀 시 순간이동 방지 (§12)

  // --- Joystick & Thrust ---
  joystickMaxRadius: 60,
  maxFuel: 3000,
  fuelRegen: 600,
  thrustSpeeds: [150, 375, 675], // 기존 대비 50% 향상 (100, 250, 450 -> 150, 375, 675)
  thrustCosts: [20, 80, 200], // 소모량 기존 대비 4배 (방금 2배에서 2배 더)
  friction: 1.2, // 우주 관성: 천천히 감소하는 마찰
  minSpeed: 67.5, // 최소 유지 속도 (기존 45에서 50% 향상)
} as const;

type Phase = "title" | "playing" | "over";

export default function JoopsGame() {
  const [mounted, setMounted] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [upgrades, setUpgrades] = useState<Upgrades>(loadUpgrades());
  const upgradesRef = useRef(upgrades);
  upgradesRef.current = upgrades;
  
  const [identity, setIdentity] = useState<Identity | null>(loadIdentity());
  const identityRef = useRef(identity);
  identityRef.current = identity;

  const goHomeRef = useRef<(() => void) | null>(null);

  const handleHatch = async (name: string): Promise<string | void> => {
    try {
      const res = await fetch("/api/pets/hatch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const data = await res.json();
      if (!data.success) return data.error || "부화 실패";
      
      const newIdentity = { 
        name: data.pet.name, 
        secret_token: data.pet.secret_token,
        inventory: data.pet.inventory || { satellite: 0, can: 0, bolt: 0, spring: 0 },
        evolution_lvl: data.pet.evolution_lvl || 1
      };
      saveIdentity(newIdentity);
      setIdentity(newIdentity);
    } catch {
      return "네트워크 오류가 발생했습니다.";
    }
  };

  const handleUpgrade = (type: keyof Omit<Upgrades, "totalJunk">, cost: number) => {
    ensureAudio(); // 클릭 시 오디오 활성화 보장
    if (upgrades.totalJunk >= cost) {
      const next = { ...upgrades, totalJunk: upgrades.totalJunk - cost, [type]: upgrades[type] + 1 };
      setUpgrades(next);
      saveUpgrades(next);
      setUi(prev => ({ ...prev, upgrades: next }));
      playUpgrade();
    }
  };

  // React가 아는 유일한 게임 상태. HUD·오버레이가 이걸 그린다.
  const [ui, setUi] = useState<Omit<GameUiState, "onUpgrade" | "onHome" | "identity" | "onHatch">>({
    phase: "title",
    score: 0,
    hearts: TUNE.hearts,
    eaten: 0,
    best: 0,
    newBest: false,
    upgrades,
    rankResult: null,
  });

  useEffect(() => {
    setMounted(true);
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    initAudioListener(); // 모바일 사운드 잠금 해제

    let { w, h } = fitCanvas(canvas);

    // ---- 게임 상태 (전부 클로저 지역 변수 — React는 모른다) ----
    let phase: Phase = "title";
    let score = 0;
    let eaten = 0;
    let hearts = TUNE.hearts;
    let best = loadBest();
    let newBest = false;
    let eatenJunkRun = { satellite: 0, can: 0, bolt: 0, spring: 0 };

    // --- Joystick State ---
    let joyActive = false;
    let joyOx = 0;
    let joyOy = 0;
    let joyCx = 0;
    let joyCy = 0;
    let thrustLevel = 0;
    // number 명시: as const 리터럴 타입(3000)이 그대로 옮으면 재대입이 막힌다
    let fuel: number = TUNE.maxFuel;
    let vx = 0;
    let vy = 0;

    const getEvolutionLvl = () => identityRef.current?.evolution_lvl || 1;

    const getDynamicMaxFuel = () => {
      let base = TUNE.maxFuel + upgradesRef.current.maxFuelLvl * 1000;
      if (getEvolutionLvl() >= 3) base += 2000;
      return base;
    };
    const getDynamicThrustSpeed = (lvl: number) => {
      let speed = TUNE.thrustSpeeds[lvl] * (1 + upgradesRef.current.thrustLvl * 0.15);
      if (getEvolutionLvl() >= 4) speed *= 1.2;
      return speed;
    };
    const getDynamicMagnet = () => {
      let range = TUNE.magnetRange + upgradesRef.current.magnetLvl * 40;
      if (getEvolutionLvl() >= 2) range *= 1.3;
      return range;
    };

    // 타입을 명시하는 이유: TUNE은 as const라 startR이 리터럴 타입(24)이 되는데,
    // 그대로 두면 r에 다른 숫자를 대입할 수 없게 된다.
    const mascot: { x: number; y: number; r: number } = {
      x: w / 2,
      y: h * 0.72,
      r: TUNE.startR,
    };
    let junks: Junk[] = [];
    const popups: Popup[] = [];

    let elapsed = 0; // 누적 시간(초) — 둥둥 떠다니기·깜빡임의 시계
    let spawnTimer = 0; // 다음 스폰까지 남은 시간
    let invincible = 0; // 남은 무적 시간
    let shake = 0; // 남은 화면 흔들림 시간
    let overAt = 0; // 게임오버 시각 — 재시작 디바운스용
    let shieldCooldown = 0;
    let hasShield = false;

    /** React에 "지금 보여줄 값이 바뀌었어"라고 알린다. 바뀔 때만 부를 것. */
    const pushUi = (rankResult: RankResult | "loading" | "error" | null = null) => setUi(prev => ({ 
      ...prev, 
      phase, score, hearts, eaten, best, newBest, upgrades: upgradesRef.current,
      ...(rankResult !== null ? { rankResult } : {})
    }));

    // ------------------------------------------------------------------
    // 사건들
    // ------------------------------------------------------------------

    /**
     * 새 판 시작. 떠 있던 먹이는 그대로 둬서 화면이 이어지게 하되,
     * 가시만은 치운다 — 재도전하자마자 이전 판의 가시에 찔리면 억울하다 (§7).
     */
    const start = () => {
      junks = junks.filter(isFood);
      phase = "playing";
      window.history.pushState(null, "", "/play");
      score = 0;
      eaten = 0;
      eatenJunkRun = { satellite: 0, can: 0, bolt: 0, spring: 0 };
      hearts = TUNE.hearts;
      newBest = false;
      mascot.r = TUNE.startR;
      vx = 0;
      vy = 0;
      fuel = getDynamicMaxFuel();
      joyActive = false;
      invincible = 0;
      shake = 0;
      spawnTimer = 0;
      shieldCooldown = 0;
      hasShield = getEvolutionLvl() >= 5;
      pushUi(null); // Reset rank result on new game
    };

    const gameOver = () => {
      phase = "over";
      window.history.pushState(null, "", "/");
      overAt = elapsed;
      newBest = score > best;
      if (newBest) {
        best = score;
        saveBest(best);
      }
      setUpgrades(upgradesRef.current);
      saveUpgrades(upgradesRef.current);
      updateThrustSound(0); // 엔진음 정지
      playGameOver();
      
      const currentId = identityRef.current;
      if (currentId) {
        pushUi("loading");
        const prevRank = loadRank();
        
        fetch("/api/pets/sync", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: currentId.name,
            secret_token: currentId.secret_token,
            run_score: score,
            eaten_junk: eatenJunkRun
          }),
        })
        .then(res => res.json())
        .then(data => {
          if (!data.success) {
            pushUi("error");
            return;
          }
          
          const currentId = identityRef.current;
          if (currentId) {
            const updated = { ...currentId, inventory: data.inventory };
            saveIdentity(updated);
            setIdentity(updated);
          }
          
          const newHighest = data.highest_score_rank;
          const newTotal = data.total_score_rank;
          
          const highestDiff = prevRank.highestRank ? prevRank.highestRank - newHighest : 0;
          const totalDiff = prevRank.totalRank ? prevRank.totalRank - newTotal : 0;
          
          saveRank({ highestRank: newHighest, totalRank: newTotal });
          
          pushUi({
            highestRank: newHighest,
            highestDiff,
            totalRank: newTotal,
            totalDiff
          });
        })
        .catch(e => {
          console.error("Sync failed:", e);
          pushUi("error");
        });
      } else {
        pushUi(null);
      }
    };

    /** 게임 중 메인 화면(타이틀)으로 돌아가기 */
    const goHome = () => {
      if (score > best) {
        best = score;
        saveBest(best);
      }
      setUpgrades(upgradesRef.current);
      saveUpgrades(upgradesRef.current);
      updateThrustSound(0); // 엔진음 정지
      
      phase = "title";
      window.history.pushState(null, "", "/");
      spawnTimer = TUNE.demoInterval; // 데모 모드를 위해 스폰 타이머 리셋
      pushUi();
    };
    goHomeRef.current = goHome;

    /** 먹이 획득: 점수 + 성장 + "꿀꺽" 시작 + 팝업 + 소리 (§10 다중 피드백). */
    const eat = (j: Junk) => {
      j.eatT = 0; // 이제부터 update가 입으로 빨아들인다
      if (j.kind === "fuel") {
        fuel = Math.min(getDynamicMaxFuel(), fuel + 800);
        popups.push(makePopup("FUEL UP!", j.x, j.y, COLORS.mascot));
        playFuelUp();
      } else {
        score += 10;
        eaten += 1;
        if (j.kind === "satellite" || j.kind === "can" || j.kind === "bolt" || j.kind === "spring") {
          eatenJunkRun[j.kind]++;
        }
        
        const u = upgradesRef.current;
        upgradesRef.current = { ...u, totalJunk: u.totalJunk + 1 };
        
        mascot.r = Math.min(TUNE.maxR, mascot.r + TUNE.growPerEat);
        popups.push(
          makePopup(EAT_WORDS[Math.floor(Math.random() * EAT_WORDS.length)], j.x, j.y),
        );
        playEat();
      }
      pushUi();
    };

    /** 가시 피격: 하트 -1 + 무적 + 흔들림 + 축소 + 팝업 + 소리. */
    const hit = () => {
      if (hasShield) {
        hasShield = false;
        shieldCooldown = 45;
        invincible = TUNE.invincibleTime;
        popups.push(makePopup("SHIELD BLOCK!", mascot.x, mascot.y - mascot.r - 14, "#66fcf1"));
        playHit();
        return;
      }
      hearts -= 1;
      invincible = TUNE.invincibleTime;
      shake = TUNE.shakeTime;
      mascot.r = Math.max(TUNE.startR, mascot.r - TUNE.shrinkOnHit);
      popups.push(
        makePopup(
          HIT_WORDS[Math.floor(Math.random() * HIT_WORDS.length)],
          mascot.x,
          mascot.y - mascot.r - 14,
          COLORS.danger,
        ),
      );
      playHit();
      if (hearts <= 0) gameOver();
      else pushUi();
    };

    /** 낙하물 하나 스폰 (§9). 데모(title)는 가시 없음 + 60% 속도. */
    const spawn = () => {
      const demo = phase === "title";
      const difficulty = Math.min(1, score / 400);
      const kind = pickKind(difficulty, !demo);
      const speedScale = (1 + difficulty * 1.1) * (demo ? TUNE.demoSpeed : 1);
      junks.push(makeJunk(kind, w, speedScale));
    };

    // ------------------------------------------------------------------
    // update — 상태만 바꾼다. 캔버스는 절대 건드리지 않는다.
    // ------------------------------------------------------------------
    const update = (dt: number) => {
      elapsed += dt;
      if (invincible > 0) invincible -= dt;
      if (shake > 0) shake -= dt;

      if (getEvolutionLvl() >= 5 && !hasShield && phase === "playing") {
        shieldCooldown -= dt;
        if (shieldCooldown <= 0) {
          hasShield = true;
          popups.push(makePopup("SHIELD READY!", mascot.x, mascot.y - mascot.r - 20, "#66fcf1"));
        }
      }

      // --- 스폰 (over에서는 새로 안 뿌리고, 남은 것만 마저 떨어진다) ---
      if (phase !== "over") {
        spawnTimer -= dt;
        if (spawnTimer <= 0) {
          spawn();
          if (phase === "title") {
            spawnTimer = TUNE.demoInterval; // 데모는 느긋하게 일정 간격
          } else {
            // 점수 비례로 좁아지되 바닥 0.42초, ±30% 지터 — 리듬이 외워지면
            // 지루해지므로 불규칙성도 설계다 (§9)
            const base = Math.max(0.42, 1.05 - score / 900);
            spawnTimer = base * (0.7 + Math.random() * 0.6);
          }
        }
      }

      // --- 주인공 이동 ---
      if (phase === "playing") {
        let actualThrust = 0; // 현재 프레임의 실제 추진 단계 (사운드용)
        if (joyActive && fuel > 0) {
          const dx = joyCx - joyOx;
          const dy = joyCy - joyOy;
          const dist = Math.hypot(dx, dy);
          
          if (dist > 5) {
            if (dist < 25) thrustLevel = 0;
            else if (dist < 45) thrustLevel = 1;
            else thrustLevel = 2;
            
            const cost = TUNE.thrustCosts[thrustLevel] * dt;
            if (fuel >= cost) {
              fuel -= cost;
              const speed = getDynamicThrustSpeed(thrustLevel);
              vx += (dx / dist) * speed * dt;
              vy += (dy / dist) * speed * dt;
              actualThrust = thrustLevel + 1; // 사운드는 1~3단계로 전달
            } else {
              fuel = 0;
            }
          }
        } else {
          fuel = Math.min(getDynamicMaxFuel(), fuel + TUNE.fuelRegen * dt);
        }
        
        // 추진 사운드 업데이트
        updateThrustSound(actualThrust);
        
        vx -= vx * TUNE.friction * dt;
        vy -= vy * TUNE.friction * dt;
        
        // 최소 유지 속도 보정 (항상 우주를 떠다니게 함)
        const currentSpeed = Math.hypot(vx, vy);
        if (currentSpeed > 0 && currentSpeed < TUNE.minSpeed) {
          vx = (vx / currentSpeed) * TUNE.minSpeed;
          vy = (vy / currentSpeed) * TUNE.minSpeed;
        }
        
        mascot.x += vx * dt;
        mascot.y += vy * dt;
        
        // 화면 밖·HUD 영역 침범 금지 (벽에 튕김)
        if (mascot.x < mascot.r) { mascot.x = mascot.r; vx *= -0.8; }
        if (mascot.x > w - mascot.r) { mascot.x = w - mascot.r; vx *= -0.8; }
        if (mascot.y < mascot.r + TUNE.hudClearance) { mascot.y = mascot.r + TUNE.hudClearance; vy *= -0.8; }
        if (mascot.y > h - mascot.r) { mascot.y = h - mascot.r; vy *= -0.8; }
      } else {
        // 타이틀/게임오버: 화면 중앙 아래에서 sin 곡선으로 둥둥 (§6-1)
        mascot.x += (w / 2 - mascot.x) * Math.min(1, dt * 2);
        mascot.y = h * 0.72 + Math.sin(elapsed * 1.6) * 10;
      }

      // --- 낙하물: 역순 순회 + splice (§12 — 정방향 순회 중 삭제는 건너뛰기 버그) ---
      for (let i = junks.length - 1; i >= 0; i--) {
        const j = junks[i];

        // "꿀꺽" 중: 입을 향해 빨려 들어가며 시간이 다 되면 소멸
        if (j.eatT >= 0) {
          j.eatT += dt;
          const suck = Math.min(1, dt * 18);
          j.x0 += (mascot.x - j.x0) * suck;
          j.x = j.x0;
          j.y += (mascot.y - j.y) * suck;
          j.rot += 25 * dt; // 고속 회전 (§7)
          if (j.eatT >= TUNE.eatAnimTime) junks.splice(i, 1);
          continue;
        }

        stepJunk(j, dt);

        // 자석 (§7): 먹이가 가까우면 슬쩍 끌려온다.
        // 반드시 흔들림 중심축 x0를 옮긴다 — x는 매 프레임 재계산되는 파생값.
        if (phase === "playing" && isFood(j)) {
          const dx = mascot.x - j.x;
          const dy = mascot.y - j.y;
          const dist = Math.hypot(dx, dy);
          if (dist > 1 && dist < mascot.r + getDynamicMagnet()) {
            const pull = (TUNE.magnetPull * dt) / dist;
            j.x0 += dx * pull;
            j.y += dy * pull;
          }
        }

        // 충돌 판정은 playing에서만 (§4)
        if (phase === "playing") {
          const dist = Math.hypot(mascot.x - j.x, mascot.y - j.y);
          if (isFood(j)) {
            // 획득 판정은 후하게 — "아슬아슬하게 먹었다"로 느껴져야 (§7)
            if (dist < mascot.r + j.size * TUNE.eatJudge) eat(j);
          } else if (invincible <= 0 && dist < mascot.r + j.size * TUNE.hitJudge) {
            junks.splice(i, 1); // 찌른 가시는 소멸 — 무적 끝나자마자 또 찌르는 억울함 방지
            hit();
            continue;
          }
        }

        // 화면 밖 제거 — 배열이 무한히 쌓이면 성능이 샌다 (§13).
        // 놓친 먹이 페널티는 없다 (캐주얼 지향, §5).
        if (j.y > h + 70) junks.splice(i, 1);
      }

      // --- 팝업 글자 ---
      for (let i = popups.length - 1; i >= 0; i--) {
        const p = popups[i];
        stepPopup(p, dt);
        if (p.age >= p.life) popups.splice(i, 1);
      }
    };

    // ------------------------------------------------------------------
    // draw — 읽기만 한다. 상태는 절대 바꾸지 않는다.
    // ------------------------------------------------------------------
    const draw = () => {
      ctx.save();

      // 화면 흔들림: 개별 오브젝트가 아니라 좌표계 전체를 흔들고,
      // 남은 시간에 비례해 잦아든다 (§10)
      if (shake > 0) {
        const power = (shake / TUNE.shakeTime) * TUNE.shakeAmp;
        ctx.translate(
          (Math.random() * 2 - 1) * power,
          (Math.random() * 2 - 1) * power,
        );
      }

      drawBackdrop(ctx, w, h);

      for (const j of junks) {
        // "꿀꺽" 진행도만큼 축소 — 입으로 사라지는 연출
        const scale = j.eatT >= 0 ? Math.max(0, 1 - j.eatT / TUNE.eatAnimTime) : 1;
        drawJunk(ctx, j, scale);
      }

      // --- Thrust Exhaust Animation ---
      if (joyActive && phase === "playing" && fuel > 0) {
        const dx = joyCx - joyOx;
        const dy = joyCy - joyOy;
        const dist = Math.hypot(dx, dy);
        if (dist > 5) {
          ctx.save();
          ctx.translate(mascot.x, mascot.y);
          ctx.rotate(Math.atan2(dy, dx)); // 이동 방향을 바라보게 회전
          
          // 픽셀 아트 스타일의 도트 불꽃 (사각형)
          const ps = mascot.r / 4; // 픽셀 1칸 크기
          const thrustColors = ["#8ecbff", "#ffd166", "#ff8080"];
          ctx.fillStyle = thrustColors[thrustLevel];
          ctx.globalAlpha = 0.8;
          
          const flicker = Math.random() > 0.4 ? 0 : ps; // 떨림 효과용 픽셀 시프트
          
          // 1단계 불꽃 (몸통에 붙은 기본 픽셀 블록)
          ctx.fillRect(-mascot.r - ps + flicker, -ps, ps * 2, ps * 2);
          
          // 2단계 불꽃 (더 길게 늘어지는 픽셀 블록)
          if (thrustLevel >= 1) {
            ctx.fillRect(-mascot.r - ps * 3.5 + flicker, -ps * 0.8, ps * 1.6, ps * 1.6);
          }
          
          // 3단계 불꽃 (강한 추진 시 끝부분에 튀는 픽셀 파티클)
          if (thrustLevel >= 2) {
            ctx.fillRect(-mascot.r - ps * 5.5 + flicker, -ps * 0.5, ps, ps);
            // 흩날리는 서브 픽셀 파티클
            if (Math.random() > 0.5) {
              ctx.fillRect(-mascot.r - ps * 4, ps, ps, ps);
            }
            if (Math.random() > 0.5) {
              ctx.fillRect(-mascot.r - ps * 4, -ps * 2, ps, ps);
            }
          }
          ctx.restore();
        }
      }

      // 무적 중 초당 8회 반투명 깜빡임 — "지금은 안 맞아요"의 시각적 전달 (§8)
      const blinking =
        invincible > 0 && Math.floor(elapsed * TUNE.blinkHz * 2) % 2 === 1;
      drawMascot(ctx, mascot.x, mascot.y, mascot.r, blinking ? 0.3 : 1, getEvolutionLvl());

      // Draw shield
      if (hasShield && phase === "playing") {
        ctx.save();
        ctx.beginPath();
        ctx.arc(mascot.x, mascot.y, mascot.r + 5, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(102, 252, 241, ${0.4 + Math.sin(elapsed * 4) * 0.2})`;
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.restore();
      }

      for (const p of popups) drawPopup(ctx, p);

      // --- Virtual Joystick Draw ---
      if (joyActive && phase === "playing") {
        ctx.save();
        ctx.globalAlpha = 0.2;
        ctx.beginPath();
        ctx.arc(joyOx, joyOy, TUNE.joystickMaxRadius, 0, Math.PI * 2);
        ctx.fillStyle = "#fff";
        ctx.fill();
        
        ctx.globalAlpha = 0.8;
        ctx.beginPath();
        ctx.arc(joyCx, joyCy, 15, 0, Math.PI * 2);
        const thrustColors = ["#8ecbff", "#ffd166", "#ff8080"];
        ctx.fillStyle = fuel > 0 ? thrustColors[thrustLevel] : "#555";
        ctx.fill();
        ctx.restore();
      }

      // --- Fuel Bar Draw ---
      if (phase === "playing") {
        ctx.save();
        const barW = 100;
        const barH = 8;
        const barX = w / 2 - barW / 2;
        const barY = TUNE.hudClearance - 15;
        
        ctx.fillStyle = "rgba(0,0,0,0.5)";
        ctx.fillRect(barX, barY, barW, barH);
        
        const dynMax = getDynamicMaxFuel();
        ctx.fillStyle = fuel > (dynMax * 0.2) ? "#66fcf1" : "#ff8080";
        ctx.fillRect(barX, barY, barW * (fuel / dynMax), barH);
        
        ctx.strokeStyle = "rgba(255,255,255,0.8)";
        ctx.lineWidth = 2;
        ctx.strokeRect(barX, barY, barW, barH);
        ctx.restore();
      }

      ctx.restore();
    };

    // ------------------------------------------------------------------
    // 게임 루프 (requestAnimationFrame)
    // ------------------------------------------------------------------
    let raf = 0;
    let last = performance.now();
    const frame = (now: number) => {
      // dt 상한: 백그라운드 탭에 다녀오면 dt가 수십 초가 되어
      // 낙하물이 화면을 뚫고 순간이동한다(터널링). 0.05초로 자른다 (§12).
      const dt = Math.min(TUNE.maxDt, (now - last) / 1000);
      last = now;
      update(dt);
      draw();
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);

    // ------------------------------------------------------------------
    // 입력 (버추얼 조이스틱)
    // ------------------------------------------------------------------
    const onPointerDown = (e: PointerEvent) => {
      // 오디오는 반드시 사용자 제스처 안에서 깨운다 (브라우저 자동재생 정책, §12)
      ensureAudio();
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      if (phase === "title") {
        if (!identityRef.current) return; // 이름 짓기 전에는 터치 무시
        start();
      } else if (phase === "over") {
        // 죽는 순간 누르고 있던 손가락이 결과 화면을 스킵하는 사고 방지 (§4)
        if (elapsed - overAt >= TUNE.restartDebounce) {
          start();
        }
      } else {
        // 조이스틱 활성화
        joyOx = x;
        joyOy = y;
        joyCx = x;
        joyCy = y;
        joyActive = true;
      }
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    };

    const onPointerMove = (e: PointerEvent) => {
      if (phase === "playing" && joyActive) {
        const rect = canvas.getBoundingClientRect();
        let cx = e.clientX - rect.left;
        let cy = e.clientY - rect.top;
        
        const dx = cx - joyOx;
        const dy = cy - joyOy;
        const dist = Math.hypot(dx, dy);
        
        // 반경 제한
        if (dist > TUNE.joystickMaxRadius) {
          cx = joyOx + (dx / dist) * TUNE.joystickMaxRadius;
          cy = joyOy + (dy / dist) * TUNE.joystickMaxRadius;
        }
        joyCx = cx;
        joyCy = cy;
      }
    };

    const onPointerUp = (e: PointerEvent) => {
      joyActive = false;
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    };

    /** 길게 누르기/우클릭 메뉴가 게임을 끊지 않게 (§13). */
    const onContextMenu = (e: Event) => e.preventDefault();

    const onResize = () => {
      ({ w, h } = fitCanvas(canvas));
    };

    canvas.addEventListener("pointerdown", onPointerDown);
    canvas.addEventListener("pointermove", onPointerMove);
    canvas.addEventListener("pointerup", onPointerUp);
    canvas.addEventListener("pointercancel", onPointerUp);
    canvas.addEventListener("contextmenu", onContextMenu);
    window.addEventListener("resize", onResize);

    // 정리: rAF·리스너·오디오를 전부 해제 (§12) — 안 하면 페이지를 떠나도
    // 유령 게임 루프가 계속 돈다.
    return () => {
      cancelAnimationFrame(raf);
      canvas.removeEventListener("pointerdown", onPointerDown);
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("pointerup", onPointerUp);
      canvas.removeEventListener("pointercancel", onPointerUp);
      canvas.removeEventListener("contextmenu", onContextMenu);
      window.removeEventListener("resize", onResize);
      disposeAudio();
    };
  }, []);

  if (!mounted) {
    return <div className="fixed inset-0 bg-black"></div>;
  }

  return (
    <div className="fixed inset-0">
      {/* touch-none 필수: 없으면 드래그를 브라우저가 스크롤로 가로챈다 (§12) */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 h-full w-full touch-none"
        aria-label="스페이스 죽스 게임 화면"
      />
      <GameUi 
        {...ui} 
        onUpgrade={handleUpgrade} 
        onHome={() => goHomeRef.current?.()} 
        identity={identity}
        onHatch={handleHatch}
        onEvolved={(newLevel, newInventory) => {
          if (identityRef.current) {
            const updated = { ...identityRef.current, evolution_lvl: newLevel, inventory: newInventory };
            saveIdentity(updated);
            setIdentity(updated);
          }
        }}
      />
    </div>
  );
}
