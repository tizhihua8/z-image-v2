import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "RyanVan Z-Image | AI 图像生成",
  description: "基于 Z-Image-Turbo 的在线 AI 图像生成服务",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body className={inter.className}>
        <div className="min-h-screen bg-gradient-radial">
          {children}
        </div>
      </body>
    </html>
  );
}
