# Chapter 5: 백엔드 서버와 데이터베이스 연동 (Supabase)

아무리 훌륭한 게임도 내 컴퓨터에서만 저장된다면 아쉽겠죠? 전 세계 유저와 점수를 겨루고, 내가 수집한 쓰레기와 진화 단계를 영구 보존하기 위해 **Supabase**라는 백엔드 서비스(BaaS)를 도입했습니다.

## 1. Supabase란?
"오픈소스 Firebase"라고 불리며, 프론트엔드 개발자가 복잡한 백엔드 서버를 직접 구축하지 않아도 **PostgreSQL 데이터베이스**와 **인증 API**를 쉽게 사용할 수 있게 해주는 서비스입니다.

## 2. 데이터베이스 스키마와 RLS (보안 정책)
우리는 `pets`라는 테이블을 만들었습니다.
- `id`, `name`(펫 이름, 중복 불가), `secret_token`(내 펫이라는 암호), `best_score`(최고점), `total_score`(누적점), `inventory`(보유 쓰레기 JSON), `evolution_lvl`(진화 단계)

**RLS (Row Level Security):**
데이터베이스는 해커가 점수를 마음대로 조작하는 것을 막아야 합니다. Supabase는 RLS 정책을 통해 "이 줄(Row)을 수정하려면 올바른 `secret_token`을 가져와야만 허락해 줌"이라는 엄격한 문지기 역할을 수행합니다.

## 3. Next.js API Routes (`src/app/api/...`)
Next.js는 클라이언트(브라우저)뿐만 아니라, 스스로 백엔드 서버 역할도 할 수 있습니다! 브라우저에서 Supabase로 직접 통신하면 해킹 위험이 높아지므로, 중간에 Next.js API 서버를 둡니다.

**진행 과정:**
1. 유저 브라우저: "나 방금 캔 5개 먹고 끝남!" -> `/api/pets/sync` 로 전송
2. Next.js API: "어디 보자, 올바른 유저가 맞네. 기존 인벤토리 값에서 캔 5개 추가하고, 점수도 누적시킬게!"
3. Supabase DB: (저장 완료)
4. Next.js API: "저장 완료! 현재 네 순위는 2위야!" -> 브라우저로 응답

## 4. 메타 프로그레션 (진화 시스템 로직)
우리는 단순히 아케이드 게임에 그치지 않고 RPG적 요소를 넣었습니다.
유저가 모은 쓰레기 4종류(Bolt, Can, Spring, Satellite)를 모아서 서버의 `/api/pets/evolve`로 요청을 보냅니다.

```typescript
// 서버 코드 (보안을 위해 클라이언트가 아닌 서버에서 조건을 검사합니다!)
const cost = getCost(current_lvl);
if (inv.bolt >= cost.bolt && inv.can >= cost.can ...) {
  // 재료 차감 후 레벨 1 증가
  inv.bolt -= cost.bolt;
  current_lvl += 1;
  // DB 업데이트 후 유저에게 성공 알림!
} else {
  return error("재료가 부족합니다!");
}
```
서버에서 검증이 끝나면, 프론트엔드에서는 레벨 숫자를 받아 화면에 그려진 펫의 외형(`Lv.5 은하 포식자`)을 바꾸고 강력한 패시브 스킬(가시 방어막 등)을 발동시킵니다.

## 🎓 맺음말
축하합니다! 당신은 순수한 브라우저 API(Canvas)로 게임 엔진을 밑바닥부터 설계하고, React로 상태 기반의 UI를 짜고, PWA로 앱 형태로 배포하며, Next.js API와 PostgreSQL로 안전한 서버 로직까지 관통하는 "Full-Stack Web Game" 개발을 완주하셨습니다! 

이 문서를 뼈대 삼아, 더 재미있고 혁신적인 나만의 웹 서비스와 게임을 개발해 보시길 응원합니다! 🚀
