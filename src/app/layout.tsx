import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "축의대 접수 관리",
  description: "결혼식 축의대 접수와 정산을 빠르게 관리하는 현장용 웹앱",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
