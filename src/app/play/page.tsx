import type { Metadata } from "next";
import JoopsGame from "./joops-game";

// "/play"의 얇은 껍데기 — 서버 컴포넌트.
// 게임 본체(joops-game.tsx)는 클라이언트 컴포넌트라 메타데이터를 내보낼 수
// 없으므로, 이렇게 서버 컴포넌트로 한 겹 감싸서 메타데이터를 단다.
export const metadata: Metadata = {
  title: "SPACE JOOPS · 우주 냠냠!",
};

export default function PlayPage() {
  return <JoopsGame />;
}
