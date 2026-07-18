// ============================================================================
// sound.ts — Web Audio 신시사이저
//
// 오디오 파일 0개: 모든 소리는 오실레이터로 즉석에서 합성한다 (§12).
// 사운드 문법(§10): 음이 올라가면 긍정, 내려가면 부정.
//                  부드러운 파형(triangle)은 좋은 일, 거친 파형(sawtooth)은 나쁜 일.
//
// 브라우저는 사용자 제스처(탭/클릭) 없이 소리를 못 내게 막는다(자동재생 정책).
// 그래서 AudioContext 생성/재개는 반드시 포인터 이벤트 핸들러 안에서
// ensureAudio()로 한다. 실패하면 조용히 무음으로 — 게임을 절대 막지 않는다.
// ============================================================================

let audio: AudioContext | null = null;

/** 사용자 제스처 핸들러 안에서 호출: 오디오를 켜거나(1회) 잠든 컨텍스트를 깨운다. */
export function ensureAudio(): void {
  try {
    if (!audio) audio = new AudioContext();
    // 모바일에서 탭 전환 등으로 suspended가 되면 다시 깨워 준다.
    if (audio.state === "suspended") void audio.resume();
  } catch {
    audio = null; // 미지원 환경 — 이후 재생 함수들이 전부 조용히 빠져나간다.
  }
}

/** useEffect 정리 단계에서 호출: 컨텍스트를 닫아 리소스를 돌려준다 (§12). */
export function disposeAudio(): void {
  try {
    void audio?.close();
  } catch {
    // 이미 닫혔어도 상관없다.
  }
  audio = null;
}

/**
 * 짧은 "삐" 하나를 합성한다.
 * 주파수를 from→to로 지수 곡선으로 미끄러뜨리고, 음량도 지수로 감쇠시킨다
 * (귀는 로그 스케일로 듣기 때문에 선형보다 지수 쪽이 자연스럽다).
 *
 * @param delay 시작을 늦출 시간(초) — 여러 음을 이어 멜로디를 만들 때 사용.
 */
function chirp(
  type: OscillatorType,
  from: number,
  to: number,
  dur: number,
  gain = 0.08,
  delay = 0,
): void {
  if (!audio) return;
  try {
    const t0 = audio.currentTime + delay;
    const osc = audio.createOscillator();
    const g = audio.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(from, t0);
    // exponentialRamp는 0을 못 다루므로 최소 1Hz로 방어한다.
    osc.frequency.exponentialRampToValueAtTime(Math.max(1, to), t0 + dur);

    g.gain.setValueAtTime(gain, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);

    osc.connect(g).connect(audio.destination);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02); // 감쇠가 끝난 직후 정지 — 오실레이터 누수 방지
  } catch {
    // 어떤 이유로든 실패하면 그냥 무음.
  }
}

/** 먹이 먹음: 8-bit 코인 획득 사운드 (짧은 간격으로 음이 2번 오름) */
export function playEat(): void {
  chirp("square", 988, 988, 0.05, 0.05); // B5
  chirp("square", 1318, 1318, 0.15, 0.05, 0.05); // E6
}

/** 연료/아이템 획득: 8-bit 파워업 사운드 (빠른 아르페지오 상승) */
export function playFuelUp(): void {
  const notes = [261, 329, 392, 523, 659, 783]; // C4, E4, G4, C5, E5, G5
  notes.forEach((freq, i) => {
    chirp("square", freq, freq, 0.1, 0.04, i * 0.04);
  });
}

/** 상점 업그레이드 획득 사운드 */
export function playUpgrade(): void {
  chirp("triangle", 1000, 1500, 0.1, 0.05);
  chirp("square", 1500, 2000, 0.2, 0.05, 0.1);
}

/** 가시 피격: 8-bit 데미지 사운드 (빠르게 곤두박질치는 두 개의 파형 믹스) */
export function playHit(): void {
  chirp("sawtooth", 150, 40, 0.2, 0.1);
  chirp("square", 200, 50, 0.25, 0.08);
}

/** 게임 오버: 고전적인 "빰-빰-빠아아앙" 하강음 */
export function playGameOver(): void {
  chirp("square", 392, 392, 0.2, 0.05, 0);
  chirp("square", 330, 330, 0.2, 0.05, 0.2);
  chirp("square", 262, 262, 0.4, 0.05, 0.4);
}

let thrustNode: OscillatorNode | null = null;
let thrustGain: GainNode | null = null;

/** 엔진 소리(추진기): 낮은 주파수의 사각파로 레트로한 우주선 엔진음 구현 */
export function updateThrustSound(level: number): void {
  if (!audio) return;
  if (!thrustNode || !thrustGain) {
    if (level === 0) return; // 아직 시작할 필요 없음
    thrustGain = audio.createGain();
    thrustGain.gain.value = 0;
    thrustGain.connect(audio.destination);
    
    thrustNode = audio.createOscillator();
    thrustNode.type = "square";
    thrustNode.frequency.value = 50; // 부릉거리는 베이스
    thrustNode.connect(thrustGain);
    thrustNode.start();
  }
  
  // 레벨에 따라 음량과 피치 조절 (level 0: 정지, 1~3: 추진)
  const targetGain = level > 0 ? 0.015 + (level * 0.015) : 0;
  const targetFreq = 40 + (level * 20); // 40Hz ~ 100Hz
  
  thrustGain.gain.setTargetAtTime(targetGain, audio.currentTime, 0.1);
  thrustNode.frequency.setTargetAtTime(targetFreq, audio.currentTime, 0.1);
}
