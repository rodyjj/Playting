import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import BottomNav from "@/components/nav/BottomNav";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Playting — 오늘의 감상 코스",
  description: "취향에 맞는 영화·드라마·애니메이션·예능을 AI가 코스 요리처럼 구성해 추천합니다.",
};

export const viewport: Viewport = {
  themeColor: "#0a0c12",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ko"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col items-center text-foreground">
        <div className="relative min-h-dvh w-full max-w-[430px] bg-background sm:border-x sm:border-border sm:shadow-[0_0_80px_-20px_rgba(0,0,0,0.9)]">
          {children}
          <BottomNav />
        </div>
      </body>
    </html>
  );
}
