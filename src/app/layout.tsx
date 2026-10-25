import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "영화 박스오피스 인사이트",
  description: "KOBIS 기반 영화 박스오피스 조회와 인사이트 대시보드",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
