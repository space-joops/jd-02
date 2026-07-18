# 🗄️ Supabase Schema & API Architecture (Locked)

## 📌 확정된 기획 원칙
1. **불멸의 펫**: 펫은 죽지 않고 영구적으로 성장합니다.
2. **RPG 진화 방식**: 수집한 특정 쓰레기를 직접 소모하여 진화합니다.
3. **절대적 고유 닉네임**: 영어 이름 자체가 Primary Key가 되며, 오픈런 희소성을 가집니다.
4. **결과창 랭킹 연출**: 한 판이 끝난 직후 게임오버 화면에서 순위 등락(▼/▲)을 보여줍니다.

## 🗃️ Database Schema (Supabase)

### Table: `pets`
| Column | Type | Constraints | Description |
|---|---|---|---|
| `name` | `text` | **Primary Key**, `^[A-Z0-9]+$` | 펫의 고유 이름 (오직 영대문자/숫자, 최대 12자) |
| `secret_token` | `uuid` | Not Null, Default `uuid_generate_v4()` | 클라이언트 `localStorage`에 발급할 보안 인증 키 (해킹 방지) |
| `highest_score` | `integer` | Default `0` | 단판 최고 점수 (High Score 리더보드용) |
| `total_score` | `bigint` | Default `0` | 누적 총 점수 (Cumulative 리더보드용) |
| `evolution_lvl`| `integer` | Default `1` | 펫의 현재 진화 단계 |
| `inventory` | `jsonb` | Default `{ "satellite": 0, "can": 0, "bolt": 0, "spring": 0 }` | 획득한 아이템(쓰레기) 보관함 |
| `stats` | `jsonb` | Default `{ "fuelLvl": 0, "thrustLvl": 0, "magnetLvl": 0 }` | 현재 업그레이드 수치 |
| `created_at` | `timestamptz` | Default `now()` | 알 부화 시점 |
| `last_played` | `timestamptz` | Default `now()` | 마지막 플레이 시점 (휴면 유저 관리용) |

## 🔌 API Routes (Next.js Edge API)

### 1. `POST /api/pets/hatch`
- **역할**: 새로운 알을 부화시키고 이름을 선점합니다.
- **Request**: `{ "name": "TOM" }`
- **Response (Success)**: `{ "success": true, "name": "TOM", "secret_token": "abc-123..." }`
- **Response (Fail)**: `{ "success": false, "error": "이미 존재하는 이름입니다." }` (중복 방지)

### 2. `POST /api/pets/sync`
- **역할**: 게임 한 판이 끝난 후(Game Over 시점), 서버에 점수와 먹은 쓰레기를 동기화하고 랭킹 변동을 계산합니다.
- **Request**: `{ "name": "TOM", "secret_token": "abc-123", "run_score": 1500, "eaten_junk": { "can": 5, "bolt": 10 } }`
- **Response**: 
  ```json
  {
    "highest_score_rank": { "current": 14, "diff": 2 }, // 2계단 상승 ▲
    "total_score_rank": { "current": 5, "diff": 0 }, // 변동 없음 -
    "inventory": { "can": 15, "bolt": 30 } // 동기화된 최신 인벤토리
  }
  ```

### 3. `POST /api/pets/evolve`
- **역할**: 인벤토리의 쓰레기를 소모하여 펫을 다음 단계로 진화시킵니다.
- **Request**: `{ "name": "TOM", "secret_token": "abc-123" }`
- **Logic**: 서버에서 `inventory` 수량을 검증하고, 충분하면 깎은 뒤 `evolution_lvl`을 +1 합니다.
- **Response**: `{ "success": true, "new_level": 2, "inventory": {...} }`

## 🚀 Next Steps for Development
1. [ ] Supabase 프로젝트 생성 및 위 스키마 적용 (SQL Query 작성).
2. [ ] Next.js 내부에 `/api/pets/*` 라우트 구축.
3. [ ] 메인 화면에 알(Egg) 부화 및 닉네임 입력 UI 컴포넌트 개발.
4. [ ] 인게임 게임오버 화면 로직에 `sync` API 호출 및 순위 등락 애니메이션 추가.
