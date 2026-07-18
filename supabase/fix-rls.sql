-- RLS(Row Level Security) 문제 해결을 위한 권한 허용 정책
-- (우리 백엔드 API에서 secret_token으로 검증하므로 DB단에서는 통과시킵니다)

ALTER TABLE pets ENABLE ROW LEVEL SECURITY;

-- 1. 누구나 알을 부화(Insert)할 수 있도록 허용
CREATE POLICY "Allow public insert" ON pets FOR INSERT WITH CHECK (true);

-- 2. 누구나 자신의 펫 정보를 동기화(Update)할 수 있도록 허용
CREATE POLICY "Allow public update" ON pets FOR UPDATE USING (true) WITH CHECK (true);

-- 3. 누구나 랭킹 정보를 조회(Select)할 수 있도록 허용
CREATE POLICY "Allow public select" ON pets FOR SELECT USING (true);
