import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "OmniNote - 个人智能知识库",
  description: "多模态输入、AI 提取与总结",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
