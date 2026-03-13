"use client";

import { Sidebar } from "@/components/layout/Sidebar";
import { MainArea } from "@/components/layout/MainArea";

/**
 * 主页面 - 类似 Notability 的布局
 * 左侧：分类与标签边栏
 * 右侧：主内容区域（笔记列表 / 详情占位）
 */
export default function HomePage() {
  return (
    <div className="flex min-h-screen w-full flex-col overflow-hidden bg-[radial-gradient(circle_at_top,_rgba(99,102,241,0.12),_transparent_32%),linear-gradient(180deg,_#f8fafc_0%,_#eef2ff_100%)] lg:flex-row">
      <Sidebar />
      <MainArea />
    </div>
  );
}
