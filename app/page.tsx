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
    <div className="flex h-screen w-full overflow-hidden bg-slate-50">
      {/* 左侧边栏 */}
      <Sidebar />
      {/* 主内容区 */}
      <MainArea />
    </div>
  );
}
