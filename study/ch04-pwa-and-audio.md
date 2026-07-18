# Chapter 4: 네이티브 앱처럼 만들기 (PWA와 Web Audio)

웹 브라우저에서 실행되는 게임이지만, 유저들에게는 스마트폰 앱처럼 보이게 만드는 마법들이 있습니다.

## 1. PWA (Progressive Web App)
웹사이트를 스마트폰의 홈 화면에 설치하고, 오프라인에서도 작동하게 만들며, 상단 주소창을 숨겨서 진짜 앱처럼 보이게 하는 기술을 **PWA**라고 합니다.

PWA가 되기 위한 두 가지 필수 요소:
1. **Manifest (`manifest.json`)**: 앱의 이름, 바탕화면 아이콘 이미지, 실행 시 화면 방향 등을 정의하는 설정 파일입니다.
2. **Service Worker (`sw.js`)**: 브라우저 백그라운드에서 도는 자바스크립트로, 오프라인 접속을 위한 파일 캐싱(저장)을 담당합니다.

**SPACE JOOPS의 캐시 전략:**
우리는 Next.js 빌드 파일들을 서비스 워커가 낚아채서 저장해 둡니다. 코드가 업데이트(버전업)되면 `Network-First` 전략을 사용하여, 일단 인터넷에서 최신 파일을 받아오고 실패할 경우에만 예전 캐시를 보여주도록 설정했습니다.

## 2. Web Audio API (사운드 합성)
보통 게임 효과음을 넣을 때는 `.mp3`나 `.wav` 파일을 불러와서 재생합니다. 하지만 우리 게임은 완전히 레트로한 8-bit 스타일이므로, 옛날 팩 게임기처럼 **"코드만으로 소리를 실시간 합성"**해서 만들어 냈습니다! 이것이 `Web Audio API`입니다.

```tsx
const audioCtx = new AudioContext(); // 오디오 카드 장치 가져오기

function playBeep() {
  const osc = audioCtx.createOscillator(); // 소리 발생기
  osc.type = "square"; // 8-bit 팩 게임 특유의 찌그러진 사각파 소리!
  osc.frequency.value = 440; // 440Hz (음계 '라')
  
  osc.connect(audioCtx.destination); // 스피커에 연결
  osc.start(); // 삐-
  osc.stop(audioCtx.currentTime + 0.1); // 0.1초 뒤에 멈춤
}
```
**SPACE JOOPS 적용:**
아이템을 먹을 때(`playCoin`), 부스터를 쓸 때(`playThrust`), 가시에 맞았을 때(`playHit`) 각기 다른 주파수와 파형(Square, Sawtooth, White Noise)을 조합하여 용량 0byte짜리 완벽한 레트로 효과음을 만들어 냈습니다.

## 3. 모바일 자동재생 정책 대응
모바일 브라우저(특히 iOS Safari)는 유저가 화면을 "터치"하기 전에는 소리가 나는 것을 법적으로(?) 엄격히 막아둡니다.
그래서 사용자가 "TAP TO START"를 누르기 위해 화면을 처음 클릭하는 순간! 몰래 오디오 컨텍스트를 깨우는(`resume()`) 코드를 넣어야만 이후에 원활하게 소리가 납니다.

```tsx
const onPointerDown = () => {
  if (audioCtx.state === "suspended") {
    audioCtx.resume(); // 잠들어 있는 오디오 깨우기!
  }
}
```

---
💡 **다음 챕터 예고:** 
지금까지는 내 폰에만 저장되는 싱글 플레이 게임이었습니다. 마지막으로 Supabase를 이용해 서버에 데이터를 저장하고, 전 세계 랭킹과 펫 진화 시스템을 만드는 백엔드 연동을 알아봅니다!
