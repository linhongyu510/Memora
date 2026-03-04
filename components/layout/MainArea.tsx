"use client";

/**
 * 主内容区域 - 笔记列表与详情的占位
 * Phase 2 将实现笔记卡片流、列表视图
 * Phase 4 将实现详情视图（多模态预览 + Markdown）
 */
export function MainArea() {
  return (
    <main className="flex flex-1 flex-col overflow-hidden">
      {/* 顶部占位（预留上传入口等） */}
      <header className="flex-shrink-0 border-b border-slate-200 bg-white px-6 py-4">
        <h2 className="text-base font-medium text-slate-700">笔记</h2>
        <p className="text-sm text-slate-500">选择分类以查看笔记列表</p>
      </header>

      {/* 主视图占位 */}
      <div className="flex-1 overflow-auto p-6">
        <div className="flex h-full min-h-[200px] items-center justify-center rounded-lg border-2 border-dashed border-slate-200 bg-slate-50/50">
          <div className="text-center text-slate-500">
            <p className="mb-2 text-base font-medium">主内容区域</p>
            <p className="text-sm">Phase 2 将展示笔记卡片 / 列表视图</p>
          </div>
        </div>
      </div>
    </main>
  );
}
