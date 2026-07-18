import type { Metadata, Viewport } from "next";
import "./globals.css";

// 전역 메타데이터 — 페이지별로 덮어쓸 수 있지만 기본값은 여기서.
export const metadata: Metadata = {
  title: "SPACE JOOPS · 우주 냠냠!",
  description:
    "하늘에서 떨어지는 우주쓰레기를 손가락으로 슥슥 받아먹는 모바일 캐주얼 게임",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "SPACE JOOPS",
  },
};

// 뷰포트 설정 — 게임의 몰입감과 조작감을 지키는 장치들 (§13).
export const viewport: Viewport = {
  themeColor: "#141838", // 브라우저 상단 바까지 우주색으로 (COLORS.space의 거울)
  width: "device-width",
  initialScale: 1,
  maximumScale: 1, // 핀치 줌 금지 (§12) — 더블탭 확대가 게임 조작을 방해하지 않게
  userScalable: false,
  viewportFit: "cover", // 노치 영역까지 채우고 safe-area-inset으로 대응
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body>
        {children}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js').then(
                    function(registration) {
                      console.log('ServiceWorker registration successful');
                    },
                    function(err) {
                      console.log('ServiceWorker registration failed: ', err);
                    }
                  );
                });
              }
            `,
          }}
        />
      </body>
    </html>
  );
}
